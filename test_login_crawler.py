#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
登录版爬虫测试脚本

快速测试登录功能是否正常
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))

from src.crawler.taobao_with_login import TaobaoCrawlerWithLogin


def test_cookie_management():
    """测试Cookie管理功能"""
    print("=" * 70)
    print("  🧪 测试1: Cookie管理")
    print("=" * 70)
    print()

    crawler = TaobaoCrawlerWithLogin()

    print(f"Cookie文件路径: {crawler.cookie_file}")
    print(f"Cookie文件存在: {crawler.cookie_file.exists()}")
    print()

    if crawler.cookie_file.exists():
        print("✅ 检测到已保存的Cookie")
        if crawler.load_saved_cookies():
            print("✅ Cookie加载成功")
            print()
            return True
        else:
            print("❌ Cookie加载失败")
            print()
            return False
    else:
        print("⚠️  未找到已保存的Cookie")
        print("💡 首次使用需要登录")
        print()
        return False


def test_login_flow():
    """测试完整登录流程"""
    print("=" * 70)
    print("  🧪 测试2: 完整登录流程")
    print("=" * 70)
    print()
    print("这个测试会：")
    print("  1. 打开Chrome浏览器")
    print("  2. 等待你在浏览器中登录")
    print("  3. 检测登录并保存Cookie")
    print()
    print("⚠️  注意：这需要真实的Chrome浏览器")
    print()

    choice = input("是否继续测试？ (y/n): ").strip().lower()
    if choice != 'y':
        print("测试已跳过")
        return False

    # 使用测试URL
    test_url = "https://detail.tmall.com/item.htm?id=670501324868"

    crawler = TaobaoCrawlerWithLogin()
    success = crawler.login_and_crawl(
        product_url=test_url,
        max_pages=2  # 只爬2页作为测试
    )

    return success


def main():
    print("\n" + "=" * 70)
    print("  🧪 登录版爬虫测试")
    print("=" * 70)
    print()

    print("可用测试:")
    print("  1. Cookie管理功能测试")
    print("  2. 完整登录流程测试")
    print("  3. 全部测试")
    print()

    choice = input("请选择测试 (1-3): ").strip()

    if choice == '1':
        test_cookie_management()
    elif choice == '2':
        test_login_flow()
    elif choice == '3':
        test_cookie_management()
        print()
        test_login_flow()
    else:
        print("无效选择")

    print()
    print("=" * 70)
    print("  测试完成")
    print("=" * 70)


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print()
        print()
        print("⚠️  用户中断")
    except Exception as e:
        print()
        print(f"❌ 测试失败: {str(e)}")
        import traceback
        traceback.print_exc()
