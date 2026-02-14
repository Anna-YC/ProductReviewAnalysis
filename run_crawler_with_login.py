#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
带登录功能的爬虫运行脚本

使用方式：
    python run_crawler_with_login.py <产品URL>
    python run_crawler_with_login.py <产品URL> <最大页数>
"""
import sys
from pathlib import Path

# 添加项目路径
sys.path.insert(0, str(Path(__file__).parent))

from src.crawler.taobao_with_login import TaobaoCrawlerWithLogin


def main():
    print("=" * 70)
    print("  🕷️ 淘宝评论爬虫 - 登录版")
    print("=" * 70)
    print()
    print("使用说明：")
    print("  1. 程序会自动打开Chrome浏览器")
    print("  2. 在浏览器中完成登录（密码/扫码均可）")
    print("  3. 登录成功后，程序自动保存Cookie")
    print("  4. 自动开始爬取评论")
    print()

    # 检查参数
    if len(sys.argv) < 2:
        print("请提供产品URL")
        print()
        print("使用方法：")
        print("  python run_crawler_with_login.py <产品URL> [最大页数]")
        print()
        print("示例：")
        print("  python run_crawler_with_login.py https://detail.tmall.com/item.htm?id=670501324868")
        print("  python run_crawler_with_login.py https://detail.tmall.com/item.htm?id=670501324868 50")
        print()

        # 交互式输入
        url = input("请输入产品URL: ").strip()
        if not url:
            print("❌ 未提供产品URL")
            return 1

        pages_input = input("最大页数 (默认10): ").strip()
        max_pages = int(pages_input) if pages_input.isdigit() else 10
    else:
        url = sys.argv[1]
        max_pages = int(sys.argv[2]) if len(sys.argv) > 2 else 10

    print()
    print(f"📦 产品URL: {url}")
    print(f"📄 最大页数: {max_pages}")
    print()

    # 创建爬虫并执行
    crawler = TaobaoCrawlerWithLogin()
    success = crawler.login_and_crawl(url, max_pages=max_pages)

    print()
    if success:
        print("✅ 任务完成!")
        return 0
    else:
        print("❌ 任务失败")
        return 1


if __name__ == "__main__":
    try:
        sys.exit(main())
    except KeyboardInterrupt:
        print()
        print()
        print("⚠️  用户中断")
        sys.exit(1)
    except Exception as e:
        print()
        print(f"❌ 发生错误: {str(e)}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
