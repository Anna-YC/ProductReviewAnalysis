# -*- coding: utf-8 -*-
"""
淘宝爬虫 - 带登录功能

使用Selenium自动化浏览器，用户手动登录后自动获取Cookie
"""
import json
import time
from pathlib import Path
from typing import Optional
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.chrome.options import Options
from selenium.common.exceptions import TimeoutException
from webdriver_manager.chrome import ChromeDriverManager

from .taobao import TaobaoCrawler


class TaobaoCrawlerWithLogin(TaobaoCrawler):
    """
    带登录功能的淘宝爬虫

    使用流程：
    1. 自动打开淘宝登录页面
    2. 用户在浏览器中手动登录
    3. 登录成功后，按Enter继续
    4. 自动获取Cookie并保存
    5. 开始爬取评论
    """

    def __init__(self, config: dict = None):
        super().__init__(config)
        self.driver = None
        self.cookie_file = Path("output/crawler/taobao_cookies.json")

    def open_login_page(self, headless: bool = False) -> bool:
        """
        打开淘宝登录页面

        Args:
            headless: 是否使用无头模式（不推荐，需要手动登录）

        Returns:
            是否成功打开
        """
        print("=" * 70)
        print("  🔐 淘宝登录助手")
        print("=" * 70)
        print()

        # 创建Chrome浏览器
        chrome_options = Options()
        if headless:
            chrome_options.add_argument('--headless')

        # 添加常用选项
        chrome_options.add_argument('--no-sandbox')
        chrome_options.add_argument('--disable-dev-shm-usage')
        chrome_options.add_argument('--disable-blink-features=AutomationControlled')

        try:
            # 使用webdriver-manager自动管理ChromeDriver
            service = Service(ChromeDriverManager().install())
            self.driver = webdriver.Chrome(service=service, options=chrome_options)
        except Exception as e:
            print(f"❌ 无法启动浏览器: {str(e)}")
            print()
            print("请确保已安装Chrome浏览器和ChromeDriver")
            print()
            print("安装方法：")
            print("  brew install chromedriver  # macOS")
            print("  或下载: https://chromedriver.chromium.org/")
            return False

        # 打开淘宝登录页
        login_url = "https://login.taobao.com/member/login.jhtml"
        print(f"正在打开淘宝登录页面...")
        self.driver.get(login_url)

        print("✅ 浏览器已打开")
        print()
        print("=" * 70)
        print("  请在浏览器中完成登录")
        print("=" * 70)
        print()
        print("登录方式：")
        print("  1. 账号密码登录")
        print("  2. 扫码登录（推荐）")
        print("  3. 淘宝App扫码")
        print()
        print("⏳ 等待你登录...")

        return True

    def wait_for_login(self, timeout: int = 300) -> bool:
        """
        等待用户登录

        Args:
            timeout: 超时时间（秒），默认5分钟

        Returns:
            是否登录成功
        """
        start_time = time.time()

        while time.time() - start_time < timeout:
            try:
                # 检查是否跳转到首页或个人信息页（说明登录成功）
                current_url = self.driver.current_url

                # 登录成功后的URL特征
                if 'login' not in current_url:
                    print()
                    print("=" * 70)
                    print("  ✅ 检测到登录成功!")
                    print("=" * 70)
                    print()
                    print(f"当前页面: {current_url}")
                    return True

                # 每30秒提示一次
                elapsed = int(time.time() - start_time)
                if elapsed % 30 == 0 and elapsed > 0:
                    remaining = timeout - elapsed
                    print(f"⏳ 等待登录中... (剩余 {remaining} 秒)")

                time.sleep(2)

            except:
                time.sleep(2)

        print()
        print("⏰ 等待超时")
        return False

    def save_cookies(self) -> bool:
        """
        保存Cookie到文件

        Returns:
            是否成功保存
        """
        try:
            # 获取所有Cookie
            cookies = self.driver.get_cookies()

            # 转换为字符串格式
            cookie_str = '; '.join([f"{c['name']}={c['value']}" for c in cookies])

            # 保存到文件
            self.cookie_file.parent.mkdir(parents=True, exist_ok=True)

            with open(self.cookie_file, 'w', encoding='utf-8') as f:
                json.dump({
                    'cookie': cookie_str,
                    'cookies': cookies,
                    'save_time': time.strftime('%Y-%m-%d %H:%M:%S')
                }, f, ensure_ascii=False, indent=2)

            print()
            print("=" * 70)
            print("  ✅ Cookie已保存")
            print("=" * 70)
            print()
            print(f"保存位置: {self.cookie_file}")
            print(f"Cookie长度: {len(cookie_str)} 字符")
            print(f"Cookie数量: {len(cookies)} 个")
            print()

            # 自动更新到配置
            print("💡 提示: Cookie已自动加载，可以开始爬取了")
            print()

            return True

        except Exception as e:
            print(f"❌ 保存Cookie失败: {str(e)}")
            return False

    def load_saved_cookies(self) -> bool:
        """
        从文件加载保存的Cookie

        Returns:
            是否成功加载
        """
        if not self.cookie_file.exists():
            print(f"⚠️  未找到保存的Cookie: {self.cookie_file}")
            return False

        try:
            with open(self.cookie_file, 'r', encoding='utf-8') as f:
                data = json.load(f)

            cookie = data['cookie']
            save_time = data.get('save_time', '未知')

            print("=" * 70)
            print("  📦 加载已保存的Cookie")
            print("=" * 70)
            print()
            print(f"保存时间: {save_time}")
            print(f"Cookie长度: {len(cookie)} 字符")
            print()

            # 更新到session
            self.session.headers.update({'Cookie': cookie})
            print("✅ Cookie已加载到爬虫")

            return True

        except Exception as e:
            print(f"❌ 加载Cookie失败: {str(e)}")
            return False

    def login_and_crawl(self, product_url: str, max_pages: int = None,
                     use_saved_cookies: bool = True, auto_scroll: bool = True) -> bool:
        """
        登录并爬取

        Args:
            product_url: 产品URL
            max_pages: 最大页数
            use_saved_cookies: 是否尝试使用已保存的Cookie
            auto_scroll: 是否自动滚动加载评论（默认True）

        Returns:
            是否成功
        """
        # 尝试使用已保存的Cookie
        if use_saved_cookies and self.load_saved_cookies():
            print()
            print("⏩ 使用已保存的Cookie，无需重新登录")
            print()

            # 直接爬取
            try:
                total = 0
                for reviews in self.fetch_reviews(product_url, max_pages=max_pages):
                    total += len(reviews)
                    print(f"✅ 已爬取 {total} 条评论")
                print()
                print("=" * 70)
                print(f"  ✅ 爬取完成! 共 {total} 条评论")
                print("=" * 70)
                return True
            except Exception as e:
                print(f"❌ 使用已保存Cookie爬取失败: {str(e)}")
                print("💡 将尝试重新登录...")

        # 需要重新登录
        if not self.open_login_page():
            return False

        if not self.wait_for_login():
            print("❌ 登录失败或超时")
            return False

        if not self.save_cookies():
            return False

        # 等待用户确认
        input("\n按 Enter 键开始爬取...")

        # 开始爬取（使用浏览器模式）
        print()
        print("=" * 70)
        print("  🕷️ 开始爬取评论")
        print("=" * 70)
        print()

        try:
            # 导航到产品页面
            print(f"📍 正在打开产品页面...")
            self.driver.get(product_url)
            WebDriverWait(self.driver, 10).until(
                EC.presence_of_element_located((By.TAG_NAME, "body"))
            )

            if auto_scroll:
                print("🔄 开始自动滚动加载评论...")
                self._auto_scroll_for_reviews()

            # 关闭浏览器
            self.driver.quit()
            self.driver = None

            # 使用API爬取（获取更多数据）
            total = 0
            for reviews in self.fetch_reviews(product_url, max_pages=max_pages):
                total += len(reviews)
                print(f"✅ 已爬取 {total} 条评论")

                # 显示前3条
                if len(reviews) > 0:
                    for i, review in enumerate(reviews[:3], 1):
                        print(f"   [{i}] {review.user_name}: {review.content[:50]}...")
                    if len(reviews) > 3:
                        print(f"   ... 还有 {len(reviews)-3} 条")
                    print()

            print()
            print("=" * 70)
            print(f"  ✅ 爬取完成! 共 {total} 条评论")
            print("=" * 70)

            return True

        except Exception as e:
            print(f"❌ 爬取失败: {str(e)}")
            import traceback
            traceback.print_exc()

            # 清理
            if self.driver:
                self.driver.quit()
                self.driver = None

            return False

    def _auto_scroll_for_reviews(self, max_scrolls: int = 10, scroll_delay: float = 1.5):
        """
        自动滚动页面以加载更多评论

        Args:
            max_scrolls: 最大滚动次数
            scroll_delay: 每次滚动延迟（秒）
        """
        import time

        print(f"📜 自动滚动加载评论（最多{max_scrolls}次）...")

        last_height = 0
        stagnant_count = 0

        for i in range(max_scrolls):
            # 滚动到页面底部
            self.driver.execute_script("window.scrollTo(0, document.body.scrollHeight);")

            current_height = self.driver.execute_script("return document.body.scrollHeight")

            print(f"   滚动 {i+1}/{max_scrolls}, 页面高度: {current_height}px")

            # 检测页面是否还有新内容加载
            if current_height == last_height:
                stagnant_count += 1
                print(f"   ⚠️ 页面高度未变化 ({stagnant_count}/2)")

                if stagnant_count >= 2:
                    print("   ✅ 页面已无更多内容加载")
                    break
            else:
                stagnant_count = 0

            last_height = current_height

            # 等待内容加载
            time.sleep(scroll_delay)

        print("   🏁 滚动完成")

    def __del__(self):
        """清理资源"""
        if self.driver:
            try:
                self.driver.quit()
            except:
                pass

    def __del__(self):
        """清理资源"""
        if self.driver:
            try:
                self.driver.quit()
            except:
                pass


# ========== 便捷函数 ==========

def login_and_crawl(product_url: str, max_pages: int = 10, auto_scroll: bool = True):
    """
    便捷函数：登录并爬取

    Args:
        product_url: 产品URL
        max_pages: 最大页数
        auto_scroll: 是否自动滚动加载评论（默认True）
    """
    crawler = TaobaoCrawlerWithLogin()
    success = crawler.login_and_crawl(product_url, max_pages=max_pages, auto_scroll=auto_scroll)
    return success


# ========== 命令行工具 ==========

if __name__ == "__main__":
    import sys

    print("=" * 70)
    print("  淘宝爬虫 - 登录版（支持自动滚动）")
    print("=" * 70)
    print()

    if len(sys.argv) < 2:
        print("使用方法:")
        print()
        print("  python -m src.crawler.taobao_with_login <产品URL> [页数] [自动滚动]")
        print()
        print("示例:")
        print("  python -m src.crawler.taobao_with_login https://detail.tmall.com/item.htm?id=123456")
        print("  python -m src.crawler.taobao_with_login https://detail.tmall.com/item.htm?id=123456 50")
        print("  python -m src.crawler.taobao_with_login https://detail.tmall.com/item.htm?id=123456 50 false  # 禁用自动滚动")
        print()

        # 交互式输入
        url = input("请输入产品URL: ").strip()
        if url:
            pages = input("最大页数 (默认10): ").strip()
            max_pages = int(pages) if pages.isdigit() else 10
            auto_scroll_input = input("自动滚动加载评论? (y/n, 默认y): ").strip().lower()
            auto_scroll = auto_scroll_input != 'n'
            login_and_crawl(url, max_pages, auto_scroll)
    else:
        url = sys.argv[1]
        pages = int(sys.argv[2]) if len(sys.argv) > 2 else 10
        auto_scroll = sys.argv[3].lower() != 'false' if len(sys.argv) > 3 else True
        login_and_crawl(url, pages, auto_scroll)
