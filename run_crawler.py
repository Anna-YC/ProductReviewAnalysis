#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
爬虫运行脚本 - 快速启动爬虫

使用方式：
    # 单产品爬取
    python run_crawler.py single <产品URL>

    # 批量爬取（多个URL）
    python run_crawler.py batch <URL1> <URL2> <URL3> ...

    # 从文件读取URL批量爬取
    python run_crawler.py file products.txt

    # 指定页数和输出文件
    python run_crawler.py single <URL> --pages 20 --output result.xlsx
"""
import sys
import argparse
from pathlib import Path

# 添加项目路径
sys.path.insert(0, str(Path(__file__).parent))

from src.crawler import (
    CrawlerEngine,
    TaobaoCrawler,
    quick_crawl,
    is_valid_taobao_url,
    extract_item_id_from_url,
)


def single_mode(args):
    """单产品爬取模式"""
    url = args.url

    # 验证URL
    if not is_valid_taobao_url(url):
        print(f"⚠️  警告: URL可能不是淘宝/天猫链接: {url}")

    # 提取产品ID
    item_id = extract_item_id_from_url(url)
    print(f"📦 产品ID: {item_id}")
    print(f"🔗 产品URL: {url}")
    print(f"📄 最大页数: {args.pages}")
    print()

    # 执行爬取
    output_path = quick_crawl(
        product_url=url,
        output_file=args.output,
        max_pages=args.pages,
    )

    return output_path


def batch_mode(args):
    """批量爬取模式"""
    urls = args.urls

    print(f"📦 待爬取产品数: {len(urls)}")
    print(f"📄 每产品最大页数: {args.pages}")
    print()

    # 创建引擎
    engine = CrawlerEngine()

    # 执行批量爬取
    engine.crawl_batch(urls, max_pages=args.pages, delay=args.delay)

    # 保存结果
    output_path = engine.save_results(args.output)

    # 显示摘要
    print("\n" + "=" * 50)
    print("  爬取摘要")
    print("=" * 50)
    for key, value in engine.get_summary().items():
        print(f"  {key}: {value}")
    print("=" * 50)

    return output_path


def file_mode(args):
    """文件模式爬取"""
    file_path = args.file

    print(f"📄 产品URL文件: {file_path}")
    print(f"📄 每产品最大页数: {args.pages}")
    print()

    # 创建引擎
    engine = CrawlerEngine()

    # 从文件读取并爬取
    engine.crawl_from_file(file_path, url_column=args.column, max_pages=args.pages)

    # 保存结果
    output_path = engine.save_results(args.output)

    # 显示摘要
    print("\n" + "=" * 50)
    print("  爬取摘要")
    print("=" * 50)
    for key, value in engine.get_summary().items():
        print(f"  {key}: {value}")
    print("=" * 50)

    return output_path


def main():
    parser = argparse.ArgumentParser(
        description="电商产品评论爬虫",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
使用示例:
  %(prog)s single <URL>                    爬取单个产品
  %(prog)s batch <URL1> <URL2> <URL3>     批量爬取多个产品
  %(prog)s file products.txt              从文件读取产品URL并爬取
  %(prog)s single <URL> --pages 50        指定最大页数
  %(prog)s single <URL> --output res.xlsx 指定输出文件
        """
    )

    parser.add_argument("mode", choices=["single", "batch", "file"],
                       help="运行模式: single(单产品) / batch(批量) / file(从文件)")

    # 通用参数
    parser.add_argument("--pages", type=int, default=10,
                       help="每个产品最大页数 (默认: 10)")
    parser.add_argument("--output", "-o",
                       help="输出文件名 (默认: 自动生成)")
    parser.add_argument("--delay", type=float, default=2.0,
                       help="请求间隔秒数 (默认: 2.0)")

    # 单产品模式参数
    parser.add_argument("--url", "-u",
                       help="产品URL (single模式)")

    # 批量模式参数
    parser.add_argument("--urls", nargs="+",
                       help="多个产品URL (batch模式)")

    # 文件模式参数
    parser.add_argument("--file", "-f",
                       help="包含产品URL的文件 (file模式)")
    parser.add_argument("--column", "-c", default="url",
                       help="URL列名 (file模式，默认: url)")

    args = parser.parse_args()

    print("=" * 50)
    print("  🕷️  电商产品评论爬虫")
    print("=" * 50)
    print()

    try:
        if args.mode == "single":
            if not args.url:
                print("❌ 单产品模式需要 --url 参数")
                return 1
            output_path = single_mode(args)

        elif args.mode == "batch":
            if not args.urls:
                print("❌ 批量模式需要提供URL列表")
                return 1
            output_path = batch_mode(args)

        elif args.mode == "file":
            if not args.file:
                print("❌ 文件模式需要 --file 参数")
                return 1
            output_path = file_mode(args)

        print("\n✅ 爬取任务完成!")
        return 0

    except KeyboardInterrupt:
        print("\n\n⚠️  用户中断")
        return 1
    except Exception as e:
        print(f"\n❌ 错误: {str(e)}")
        import traceback
        traceback.print_exc()
        return 1


if __name__ == "__main__":
    sys.exit(main())
