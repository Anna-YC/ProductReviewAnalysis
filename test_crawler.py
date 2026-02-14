#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
爬虫功能测试脚本

用于测试爬虫基本功能是否正常
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))

from src.crawler import (
    is_valid_taobao_url,
    extract_item_id_from_url,
    TaobaoCrawler,
    CrawlerEngine,
)


def test_url_validation():
    """测试URL验证"""
    print("=" * 50)
    print("测试1: URL验证")
    print("=" * 50)

    test_urls = [
        "https://detail.tmall.com/item.htm?id=123456",
        "https://item.taobao.com/item.htm?id=789012",
        "https://www.baidu.com",
        "123456",
    ]

    for url in test_urls:
        result = is_valid_taobao_url(url)
        item_id = extract_item_id_from_url(url)
        print(f"URL: {url}")
        print(f"  有效性: {'✅' if result else '❌'}")
        print(f"  产品ID: {item_id}")
        print()


def test_single_crawl():
    """测试单产品爬取"""
    print("=" * 50)
    print("测试2: 单产品爬取")
    print("=" * 50)

    # 这里需要你提供一个真实的产品URL进行测试
    # 示例URL（请替换为真实产品）
    test_url = "https://detail.tmall.com/item.htm?id=123456"

    print(f"测试URL: {test_url}")
    print()
    print("⚠️  注意: 请将 test_url 替换为真实的产品链接")
    print("⚠️  继续测试将使用真实API请求，请确保网络连接正常")
    print()

    choice = input("是否继续测试？ (y/n): ")
    if choice.lower() != 'y':
        print("测试已跳过")
        return

    try:
        crawler = TaobaoCrawler()
        reviews_list = []

        for i, reviews in enumerate(crawler.fetch_reviews(test_url, max_pages=2), 1):
            print(f"第 {i} 页获取到 {len(reviews)} 条评论")
            reviews_list.extend(reviews)

            # 只爬2页作为测试
            if i >= 2:
                break

        print(f"\n✅ 爬取完成，共 {len(reviews_list)} 条")

        # 显示前3条
        for i, review in enumerate(reviews_list[:3], 1):
            print(f"\n评论 {i}:")
            print(f"  用户: {review.user_name}")
            print(f"  内容: {review.content[:50]}...")
            print(f"  评分: {review.score}")

    except Exception as e:
        print(f"❌ 测试失败: {str(e)}")


def test_config():
    """测试配置加载"""
    print("=" * 50)
    print("测试3: 配置检查")
    print("=" * 50)

    try:
        from crawler_config import TAOBAO_CONFIG, REQUEST_CONFIG

        print("✅ 配置文件加载成功")

        if TAOBAO_CONFIG.get('cookie'):
            print("✅ Cookie已配置")
        else:
            print("⚠️  Cookie未配置（可选）")

        print(f"✅ 请求延迟: {REQUEST_CONFIG.get('delay')}秒")

    except ImportError:
        print("❌ 配置文件不存在或加载失败")


def main():
    print("\n" + "=" * 50)
    print("  🕷️  爬虫功能测试")
    print("=" * 50)
    print()

    print("可用测试:")
    print("  1. URL验证测试")
    print("  2. 单产品爬取测试")
    print("  3. 配置检查")
    print("  4. 全部测试")
    print()

    choice = input("请选择测试 (1-4): ")

    if choice == '1':
        test_url_validation()
    elif choice == '2':
        test_single_crawl()
    elif choice == '3':
        test_config()
    elif choice == '4':
        test_url_validation()
        print()
        test_config()
        print()
        test_single_crawl()
    else:
        print("无效选择")


if __name__ == "__main__":
    main()
