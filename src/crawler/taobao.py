# -*- coding: utf-8 -*-
"""
淘宝/天猫评论爬虫

说明：
1. 淘宝评论数据通过异步接口获取
2. 需要产品ID（itemId）
3. 可能需要Cookie支持
4. 建议添加请求延迟避免被限制
"""
import re
import json
import time
from typing import List, Dict, Generator, Optional
from datetime import datetime
from urllib.parse import urlencode, urlparse
import requests

from .base import BaseCrawler, ReviewItem, CrawlerConfig


class TaobaoCrawler(BaseCrawler):
    """
    淘宝/天猫评论爬虫

    使用说明：
    1. 支持产品详情页URL（自动解析itemId）
    2. 支持直接传入itemId
    3. 支持批量爬取
    4. 支持自定义请求头和Cookie
    """

    # 淘宝评论接口
    REVIEW_API = "https://rate.tmall.com/list_detail_rate.htm"

    def __init__(self, config: Dict = None):
        # 自动加载配置文件
        if config is None:
            try:
                from crawler_config import TAOBAO_CONFIG
                config = TAOBAO_CONFIG
            except ImportError:
                config = {}

        super().__init__(config)
        self.session = requests.Session()
        self.session.headers.update(self.headers)

        # Cookie设置（提高成功率）
        if self.config.get('cookie'):
            self.session.headers.update({'Cookie': self.config['cookie']})
            print("[CONFIG] ✅ Cookie已加载")
        else:
            print("[CONFIG] ⚠️  未配置Cookie")

    def fetch_reviews(self, product_url: str, max_pages: int = None) -> Generator[List[ReviewItem], None, None]:
        """
        抓取评论

        Args:
            product_url: 产品详情页URL或itemId
            max_pages: 最大页数，默认从配置读取

        Example:
            >>> crawler = TaobaoCrawler()
            >>> for reviews in crawler.fetch_reviews("https://detail.tmall.com/item.htm?id=123456"):
            ...     for review in reviews:
            ...         print(review.content)
        """
        max_pages = max_pages or self.config.get('max_pages', CrawlerConfig.DEFAULT_MAX_PAGES)

        # 解析itemId
        item_id = self._extract_item_id(product_url)
        if not item_id:
            self._log(f"无法解析产品ID: {product_url}", "ERROR")
            return

        self._log(f"开始爬取产品评论: itemId={item_id}, 最大页数={max_pages}")

        # 获取产品基本信息
        product_info = self._get_product_info(item_id)
        sku = product_info.get('sku', '')
        self._log(f"产品信息: {product_info.get('title', 'Unknown')}")

        # 分页获取评论
        for page in range(1, max_pages + 1):
            self._log(f"正在获取第 {page} 页评论...")

            reviews = self._fetch_page(item_id, page)

            if not reviews:
                self._log(f"第 {page} 页无评论，可能已到最后一页", "WARN")
                break

            yield reviews

            self._delay()

        self._log(f"评论爬取完成，共 {page} 页")

    def _fetch_page(self, item_id: str, page: int) -> List[ReviewItem]:
        """获取单页评论"""
        params = {
            'itemId': item_id,
            'sellerId': '',  # 卖家ID，可选
            'currentPage': page,
            'pageSize': CrawlerConfig.REVIEWS_PER_PAGE,
            'rateType': '',  # 评价类型：全部/好评/中评/差评
            'callback': 'jsonp_reviews_list',  # JSONP回调
        }

        try:
            response = self.session.get(
                self.REVIEW_API,
                params=params,
                timeout=CrawlerConfig.REQUEST_TIMEOUT
            )

            if response.status_code != 200:
                self._log(f"请求失败: {response.status_code}", "ERROR")
                return []

            # 检查是否被重定向到登录页
            if 'login' in response.text.lower() or response.text.startswith('(function(win'):
                self._log("需要登录Cookie才能获取评论数据", "WARN")
                self._log("请配置crawler_config.py中的cookie字段", "WARN")
                self._log("Cookie获取方式：浏览器F12 -> Network -> 复制Cookie", "WARN")
                return []

            # 解析JSONP响应
            data = self._parse_jsonp(response.text)

            if not data or 'rateDetail' not in data:
                self._log("响应数据格式异常", "WARN")
                self._log(f"响应内容: {response.text[:200]}...", "DEBUG")
                return []

            # 解析评论列表
            reviews = self._parse_reviews(data['rateDetail'])
            self._log(f"本页获取到 {len(reviews)} 条评论")

            return reviews

        except Exception as e:
            self._log(f"请求异常: {str(e)}", "ERROR")
            return []

    def _parse_reviews(self, data: Dict) -> List[ReviewItem]:
        """解析评论数据"""
        reviews = []

        rate_list = data.get('rateList', [])
        for item in rate_list:
            try:
                review = ReviewItem(
                    id=item.get('id', ''),
                    user_name=item.get('displayUserNick', '匿名'),
                    user_level=item.get('tamllSweetLevel', '未知'),
                    content=item.get('rateContent', ''),
                    rate_time=datetime.fromtimestamp(int(item.get('rateDate', 0)) / 1000),
                    product_sku=item.get('skuInfo', ''),
                    score=int(item.get('rateScore', 5)),
                    tags=self._parse_tags(item),
                    append_content=item.get('appendComment', ''),
                    has_image=bool(item.get('pics', [])),
                    image_urls=item.get('pics', []),
                    reply_content=item.get('reply', ''),
                )

                # 处理追评时间
                if item.get('appendComment'):
                    review.append_time = datetime.fromtimestamp(int(item.get('appendDate', 0)) / 1000)

                # 处理商家回复时间（如果有）
                if item.get('reply'):
                    # 淘宝API可能不直接提供回复时间
                    pass

                reviews.append(review)

            except Exception as e:
                self._log(f"解析评论失败: {str(e)}", "WARN")
                continue

        return reviews

    def _parse_tags(self, item: Dict) -> List[str]:
        """解析评论标签"""
        tags = []
        if item.get('appendComment'):
            tags.append('追加评价')
        if item.get('pics'):
            tags.append('有图')
        if item.get('goldUser'):
            tags.append('黄金会员')
        return tags

    def _parse_jsonp(self, text: str) -> Optional[Dict]:
        """解析JSONP响应"""
        # 匹配 JSON 格式: callback({...})
        match = re.search(r'\{.*\}', text, re.DOTALL)
        if match:
            try:
                return json.loads(match.group(0))
            except json.JSONDecodeError:
                return None
        return None

    def _extract_item_id(self, url_or_id: str) -> Optional[str]:
        """从URL中提取产品ID"""
        # 如果是纯数字，直接作为ID
        if url_or_id.isdigit():
            return url_or_id

        # 从URL中提取
        patterns = [
            r'id=(\d+)',
            r'item\.htm/\?id=(\d+)',
            r'item_id=(\d+)',
        ]

        for pattern in patterns:
            match = re.search(pattern, url_or_id)
            if match:
                return match.group(1)

        return None

    def _get_product_info(self, item_id: str) -> Dict:
        """获取产品基本信息（可选）"""
        # 这里可以调用淘宝API获取产品详情
        # 简化实现，只返回基本信息
        return {
            'id': item_id,
            'title': '',
            'sku': '',
        }

    def search_products(self, keyword: str, max_results: int = 10) -> List[Dict]:
        """
        搜索产品

        Args:
            keyword: 搜索关键词
            max_results: 最大结果数

        Returns:
            [{"title": "", "url": "", "price": "", "sales": ""}, ...]
        """
        # 淘宝搜索较复杂，需要处理反爬
        # 这里提供基础框架
        self._log(f"搜索产品: {keyword}")

        # TODO: 实现搜索功能
        # 需要处理：
        # 1. 搜索接口调用
        # 2. 商品列表解析
        # 3. 分页处理
        # 4. 反爬处理

        return []

    @classmethod
    def from_config(cls, config_file: str = None) -> 'TaobaoCrawler':
        """从配置文件创建爬虫实例"""
        # TODO: 支持从配置文件加载
        return cls()


# ========== 工具函数 ==========

def extract_item_id_from_url(url: str) -> Optional[str]:
    """
    从淘宝/天猫产品URL中提取产品ID

    Examples:
        >>> extract_item_id_from_url("https://detail.tmall.com/item.htm?id=123456")
        '123456'
    """
    crawler = TaobaoCrawler()
    return crawler._extract_item_id(url)


def is_valid_taobao_url(url: str) -> bool:
    """
    验证是否为有效的淘宝/天猫URL

    Examples:
        >>> is_valid_taobao_url("https://detail.tmall.com/item.htm?id=123")
        True
        >>> is_valid_taobao_url("https://www.baidu.com")
        False
    """
    valid_domains = [
        'taobao.com',
        'tmall.com',
        'detail.tmall.com',
        'item.taobao.com',
    ]

    try:
        parsed = urlparse(url)
        domain = parsed.netloc.lower()
        return any(d in domain for d in valid_domains)
    except:
        return False


# ========== 命令行工具 ==========

def quick_crawl(product_url: str, output_file: str = None, max_pages: int = 10):
    """
    快速爬取命令

    Args:
        product_url: 产品URL
        output_file: 输出文件路径（.xlsx格式）
        max_pages: 最大页数
    """
    from pathlib import Path
    import pandas as pd

    crawler = TaobaoCrawler()

    all_reviews = []
    for reviews in crawler.fetch_reviews(product_url, max_pages=max_pages):
        all_reviews.extend(reviews)

    # 转换为DataFrame
    df = pd.DataFrame([r.to_dict() for r in all_reviews])

    # 保存为Excel
    if output_file is None:
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        output_file = f"评论数据_{timestamp}.xlsx"

    output_path = Path(CrawlerConfig.OUTPUT_DIR) / output_file
    output_path.parent.mkdir(parents=True, exist_ok=True)

    df.to_excel(output_path, index=False, engine='openpyxl')

    print(f"\n✅ 爬取完成!")
    print(f"   总评论数: {len(all_reviews)}")
    print(f"   保存路径: {output_path}")

    return output_path


if __name__ == "__main__":
    # 示例用法
    import sys

    if len(sys.argv) > 1:
        url = sys.argv[1]
        quick_crawl(url)
    else:
        print("用法: python -m src.crawler.taobao <产品URL>")
