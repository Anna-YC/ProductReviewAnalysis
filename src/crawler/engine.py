# -*- coding: utf-8 -*-
"""
批量爬虫引擎 - 管理多个产品的爬取任务
"""
from typing import List, Dict, Optional
from pathlib import Path
from datetime import datetime
import pandas as pd
from concurrent.futures import ThreadPoolExecutor, as_completed
import time

from .base import ReviewItem, CrawlerConfig
from .taobao import TaobaoCrawler


class CrawlerEngine:
    """
    批量爬虫引擎

    功能：
    1. 管理多个产品的爬取任务
    2. 支持断点续爬
    3. 自动保存进度
    4. 支持多线程爬取
    5. 自动合并数据
    """

    def __init__(self, crawler_class=TaobaoCrawler, config: Dict = None):
        """
        Args:
            crawler_class: 爬虫类
            config: 爬虫配置
        """
        self.crawler_class = crawler_class
        self.config = config or {}
        self.results = {}  # {url: [ReviewItem]}
        self.failed = []   # 失败的任务

        # 输出目录
        self.output_dir = Path(CrawlerConfig.OUTPUT_DIR)
        self.output_dir.mkdir(parents=True, exist_ok=True)

    def crawl_single(self, product_url: str, max_pages: int = None, **kwargs) -> List[ReviewItem]:
        """
        爬取单个产品

        Args:
            product_url: 产品URL
            max_pages: 最大页数
            **kwargs: 传递给爬虫的其他参数

        Returns:
            评论列表
        """
        crawler = self.crawler_class(self.config)

        reviews = []
        try:
            for page_reviews in crawler.fetch_reviews(product_url, max_pages=max_pages):
                reviews.extend(page_reviews)

            self.results[product_url] = reviews
            self._log_success(product_url, len(reviews))

        except Exception as e:
            self.failed.append({
                'url': product_url,
                'error': str(e),
                'time': datetime.now()
            })
            self._log_error(product_url, str(e))

        return reviews

    def crawl_batch(self, product_urls: List[str], max_pages: int = None,
                   max_workers: int = 1, delay: float = 2.0) -> Dict[str, List[ReviewItem]]:
        """
        批量爬取

        Args:
            product_urls: 产品URL列表
            max_pages: 每个产品的最大页数
            max_workers: 最大并发数（淘宝建议设为1）
            delay: 任务间隔（秒）

        Returns:
            {url: [ReviewItem]} 的字典
        """
        self._log(f"开始批量爬取: {len(product_urls)} 个产品")

        if max_workers == 1:
            # 单线程模式
            for i, url in enumerate(product_urls, 1):
                self._log(f"[{i}/{len(product_urls)}] 爬取: {url[:60]}...")
                self.crawl_single(url, max_pages)

                if i < len(product_urls):
                    time.sleep(delay)
        else:
            # 多线程模式（慎用，可能触发反爬）
            with ThreadPoolExecutor(max_workers=max_workers) as executor:
                futures = {
                    executor.submit(self.crawl_single, url, max_pages): url
                    for url in product_urls
                }

                for future in as_completed(futures):
                    url = futures[future]
                    try:
                        future.result()
                    except Exception as e:
                        self._log_error(url, str(e))

        return self.results

    def crawl_from_file(self, file_path: str, url_column: str = "url",
                       max_pages: int = None) -> Dict[str, List[ReviewItem]]:
        """
        从文件读取产品URL并批量爬取

        Args:
            file_path: 文件路径（支持Excel/CSV/TXT）
            url_column: URL列名（仅用于Excel/CSV）
            max_pages: 最大页数

        Returns:
            爬取结果
        """
        file_path = Path(file_path)

        if file_path.suffix == '.txt':
            # 从TXT读取（每行一个URL）
            with open(file_path, 'r', encoding='utf-8') as f:
                urls = [line.strip() for line in f if line.strip()]
        else:
            # 从Excel/CSV读取
            df = pd.read_excel(file_path) if file_path.suffix in ['.xlsx', '.xls'] else pd.read_csv(file_path)
            urls = df[url_column].tolist()

        self._log(f"从文件读取到 {len(urls)} 个产品URL")

        return self.crawl_batch(urls, max_pages=max_pages)

    def save_results(self, output_file: str = None, format: str = "excel") -> Path:
        """
        保存爬取结果

        Args:
            output_file: 输出文件名
            format: 格式类型 (excel/csv)

        Returns:
            保存路径
        """
        if not self.results:
            self._log("没有数据可保存", "WARN")
            return None

        # 生成文件名
        if output_file is None:
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            output_file = f"评论数据_批量_{timestamp}.{format}"

        output_path = self.output_dir / output_file

        # 合并所有产品的数据
        all_reviews = []
        for url, reviews in self.results.items():
            for review in reviews:
                data = review.to_dict()
                data['产品URL'] = url
                all_reviews.append(data)

        # 保存
        df = pd.DataFrame(all_reviews)

        if format == "excel":
            df.to_excel(output_path, index=False, engine='openpyxl')
        else:
            df.to_csv(output_path, index=False, encoding='utf-8-sig')

        self._log(f"数据已保存: {output_path} (共 {len(all_reviews)} 条)")

        # 保存失败记录
        if self.failed:
            failed_file = output_path.stem + "_失败记录" + output_path.suffix
            failed_path = self.output_dir / failed_file
            pd.DataFrame(self.failed).to_excel(failed_path, index=False)
            self._log(f"失败记录已保存: {failed_path} ({len(self.failed)} 个)")

        return output_path

    def get_summary(self) -> Dict:
        """获取爬取摘要"""
        total_reviews = sum(len(reviews) for reviews in self.results.values())

        return {
            "产品数": len(self.results),
            "总评论数": total_reviews,
            "成功数": len(self.results),
            "失败数": len(self.failed),
            "平均每产品": total_reviews / len(self.results) if self.results else 0,
        }

    def _log_success(self, url: str, count: int):
        """记录成功日志"""
        print(f"✅ 成功: {url[:50]}... ({count} 条)")

    def _log_error(self, url: str, error: str):
        """记录错误日志"""
        print(f"❌ 失败: {url[:50]}... | {error}")

    def _log(self, message: str, level: str = "INFO"):
        """日志"""
        timestamp = datetime.now().strftime("%H:%M:%S")
        print(f"[{timestamp}] {level}: {message}")


# ========== 命令行接口 ==========

def cli():
    """命令行入口"""
    import argparse

    parser = argparse.ArgumentParser(description="批量爬取电商产品评论")
    parser.add_argument("-u", "--urls", nargs="+", help="产品URL列表")
    parser.add_argument("-f", "--file", help="从文件读取URL (支持txt/csv/xlsx)")
    parser.add_argument("-c", "--column", default="url", help="URL列名 (用于csv/xlsx)")
    parser.add_argument("-p", "--pages", type=int, default=10, help="每个产品最大页数")
    parser.add_argument("-o", "--output", help="输出文件名")
    parser.add_argument("-w", "--workers", type=int, default=1, help="并发数")
    parser.add_argument("-d", "--delay", type=float, default=2.0, help="任务间隔(秒)")

    args = parser.parse_args()

    # 创建引擎
    engine = CrawlerEngine()

    # 执行爬取
    if args.urls:
        engine.crawl_batch(args.urls, max_pages=args.pages, max_workers=args.workers)
    elif args.file:
        engine.crawl_from_file(args.file, url_column=args.column, max_pages=args.pages)
    else:
        print("❌ 请提供产品URL (-u) 或文件路径 (-f)")
        return

    # 保存结果
    output_path = engine.save_results(args.output)

    # 显示摘要
    print("\n" + "=" * 50)
    print("  爬取摘要")
    print("=" * 50)
    for key, value in engine.get_summary().items():
        print(f"  {key}: {value}")
    print("=" * 50)


if __name__ == "__main__":
    cli()
