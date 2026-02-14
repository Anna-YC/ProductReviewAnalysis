#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
简化版爬虫测试 - 避免URL解析问题
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))

from src.crawler.taobao_with_login import TaobaoCrawlerWithLogin


def main():
    print("=" * 70)
    print("  🕷️ 简化版登录爬虫测试")
    print("=" * 70)
    print()

    # 测试产品URL（硬编码避免shell问题）
    test_url = "https://detail.tmall.com/item.htm?id=670501324868"

    print("测试配置:")
    print(f"  产品URL: {test_url}")
    print(f"  最大页数: 3 (测试用)")
    print()

    crawler = TaobaoCrawlerWithLogin()

    # 检查是否有已保存的Cookie
    if crawler.cookie_file.exists():
        print("检测到已保存的Cookie，尝试使用...")
        if crawler.load_saved_cookies():
            print("✅ Cookie加载成功")
            print()
            choice = input("是否继续使用已保存的Cookie爬取? (y/n): ").lower()
            if choice == 'y':
                print("开始爬取...")
                success = crawler.login_and_crawl(test_url, max_pages=3, use_saved_cookies=True)
                return 0 if success else 1

    print()
    print("=" * 70)
    print("  📋 需要登录才能继续")
    print("=" * 70)
    print()
    print("由于ChromeDriver网络下载问题，请选择:")
    print()
    print("  1. 手动配置Cookie (推荐)")
    print("     - 打开淘宝登录")
    print("     - F12复制Cookie到crawler_config.py")
    print()
    print("  2. 使用现有数据分析")
    print("     - python main.py")
    print("     - 无需任何配置")
    print()
    print("  3. 手动安装ChromeDriver")
    print("     - 下载: https://googlechromelabs.github.io/chrome-for-testing/")
    print("     - 或参考: docs/chromedriver_install.md")
    print()

    choice = input("请选择 (1/2/3): ").strip()

    if choice == '1':
        print()
        print("请按以下步骤操作:")
        print()
        print("  1. 浏览器打开 https://www.taobao.com")
        print("  2. 登录你的账号")
        print("  3. 按F12打开开发者工具")
        print("  4. 切换到Network标签")
        print("  5. 刷新页面，点击任意请求")
        print("  6. 复制Cookie整行")
        print()
        print("然后编辑 crawler_config.py:")
        print("  TAOBAO_CONFIG = {")
        print("      'cookie': '粘贴的Cookie内容',")
        print("  }")
        print()
        input("配置完成后按Enter继续...")

        # 尝试使用新配置爬取
        print()
        print("尝试使用新配置爬取...")
        # 重新导入以加载新配置
        import importlib
        import src.crawler.taobao_with_login
        importlib.reload(src.crawler.taobao_with_login)
        from src.crawler.taobao_with_login import TaobaoCrawlerWithLogin
        crawler2 = TaobaoCrawlerWithLogin()
        crawler2.login_and_crawl(test_url, max_pages=3, use_saved_cookies=False)

    elif choice == '2':
        print()
        print("运行数据分析...")
        print()
        import subprocess
        result = subprocess.run([sys.executable, 'main.py'], cwd=Path(__file__).parent)
        return result.returncode

    elif choice == '3':
        print()
        print("请参考: docs/chromedriver_install.md")
        print("下载地址: https://googlechromelabs.github.io/chrome-for-testing/")
        print()
        print("安装完成后重新运行:")
        print("  python simple_crawl_test.py")

    else:
        print("无效选择")

    return 0


if __name__ == "__main__":
    try:
        sys.exit(main())
    except KeyboardInterrupt:
        print()
        print()
        print("⚠️  用户中断")
        sys.exit(1)
