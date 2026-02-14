# -*- coding: utf-8 -*-
"""
爬虫基类 - 定义爬虫接口规范
"""
from abc import ABC, abstractmethod
from typing import List, Dict, Generator, Optional
from dataclasses import dataclass
from datetime import datetime
import time


@dataclass
class ReviewItem:
    """评论数据项"""
    # 基本信息
    id: str                    # 评论ID
    user_name: str              # 用户昵称（脱敏）
    user_level: Optional[str]    # 用户等级
    content: str                # 评论内容
    rate_time: datetime         # 评价时间

    # 商品信息
    product_sku: Optional[str]   # SKU
    product_spec: Optional[str]  # 规格参数

    # 评分信息
    score: Optional[int]         # 评分（1-5星）
    tags: Optional[List[str]]   # 评论标签（如：'追加评价'）

    # 追加信息
    append_content: Optional[str] = None  # 追评内容
    append_time: Optional[datetime] = None  # 追评时间

    # 图片信息
    has_image: bool = False
    image_urls: Optional[List[str]] = None

    # 商家回复
    reply_content: Optional[str] = None
    reply_time: Optional[datetime] = None

    def to_dict(self) -> Dict:
        """转换为字典格式"""
        return {
            "评论ID": self.id,
            "用户昵称": self.user_name,
            "用户等级": self.user_level or "",
            "评价时间": self.rate_time.strftime("%Y-%m-%d %H:%M:%S") if self.rate_time else "",
            "SKU": self.product_sku or "",
            "规格": self.product_spec or "",
            "评分": self.score or 5,
            "初评内容": self.content,
            "追评内容": self.append_content or "",
            "追评时间": self.append_time.strftime("%Y-%m-%d %H:%M:%S") if self.append_time else "",
            "有图片": "是" if self.has_image else "否",
            "商家回复": self.reply_content or "",
            "回复时间": self.reply_time.strftime("%Y-%m-%d %H:%M:%S") if self.reply_time else "",
        }


class BaseCrawler(ABC):
    """爬虫基类"""

    def __init__(self, config: Dict = None):
        self.config = config or {}
        self.session = None
        self.headers = self._get_headers()

    def _get_headers(self) -> Dict:
        """获取默认请求头"""
        return {
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
            'Accept': 'application/json, text/plain, */*',
            'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
            'Referer': 'https://www.taobao.com/',
        }

    @abstractmethod
    def fetch_reviews(self, product_url: str, max_pages: int = None) -> Generator[List[ReviewItem], None, None]:
        """
        抓取评论

        Args:
            product_url: 产品详情页URL
            max_pages: 最大页数限制

        Yields:
            每页的评论列表
        """
        pass

    @abstractmethod
    def search_products(self, keyword: str, max_results: int = 10) -> List[Dict]:
        """
        搜索产品

        Args:
            keyword: 搜索关键词
            max_results: 最大结果数

        Returns:
            产品信息列表 [{"title": "", "url": "", "price": ""}, ...]
        """
        pass

    def _delay(self, seconds: float = None):
        """请求延迟"""
        delay = seconds or self.config.get('delay', 2.0)
        time.sleep(delay)

    def _log(self, message: str, level: str = "INFO"):
        """日志输出"""
        from datetime import datetime
        timestamp = datetime.now().strftime("%H:%M:%S")
        print(f"[{timestamp}] {level}: {message}")


class CrawlerConfig:
    """爬虫配置"""

    # 请求配置
    REQUEST_TIMEOUT = 30          # 请求超时时间（秒）
    REQUEST_DELAY = 2.0           # 请求间隔（秒）
    MAX_RETRY = 3                 # 最大重试次数

    # 爬取配置
    DEFAULT_MAX_PAGES = 50         # 默认最大页数
    REVIEWS_PER_PAGE = 20         # 每页评论数

    # 存储配置
    OUTPUT_DIR = "output/crawler"  # 输出目录
    BATCH_SIZE = 100              # 批量保存大小

    # 代理配置（可选）
    USE_PROXY = False             # 是否使用代理
    PROXY_POOL = []               # 代理池

    # 日志配置
    LOG_LEVEL = "INFO"            # 日志级别
    LOG_FILE = "output/crawler/crawler.log"  # 日志文件
