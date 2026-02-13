# -*- coding: utf-8 -*-
"""
配置文件 - 产品评价分析系统
"""
import os
from pathlib import Path

# 项目根目录
BASE_DIR = Path("/Users/AI 项目/Vibe Coding/ProductReviewAnalysis")
DATA_DIR = BASE_DIR / "data"
OUTPUT_DIR = BASE_DIR / "output"
REPORTS_DIR = OUTPUT_DIR / "reports"
IMAGES_DIR = OUTPUT_DIR / "images"

# 创建必要的目录
for dir_path in [DATA_DIR, OUTPUT_DIR, REPORTS_DIR, IMAGES_DIR]:
    dir_path.mkdir(exist_ok=True)

# 文件路径配置
RAW_DATA_FILE = BASE_DIR / "电商产品评价-示例数据.xlsx"
PROCESSED_DATA_FILE = DATA_DIR / "processed_reviews.csv"

# 停用词配置
STOPWORDS = """
的 了 是 在 我 有 就 不 人 和 都 要 一 也 他 她它 这个 我们 你们 他们
什么 怎么 哪 哪些 些 哪里 多么 多少 几 多少几
可以 能够 应该 应当 需要 必须 要 不要
很 太 更 最 比较 非常 特别 十分 极其
还 也 就 却 但 然而 而 因为 所以 因此
啊 吧 呢 吗 哦 嗯 哈哈 哇
该 用户 未 填写 评价 内容 给出 星 推荐
买 卖 店家 卖家 宝贝 东西 商品
安装 安装师傅 师傅 态度 专业 到位 服务
使用 感觉 觉得 看起来 觉得
不错 很好 优秀 满意 棒 赞 好
""".split()

# 分析配置
MIN_COMMENT_LENGTH = 5  # 最小评论长度
DEFAULT好评_PATTERNS = [
    "该用户觉得商品非常好",
    "该用户未填写评价内容",
    "默认好评",
    "系统默认好评",
]

# 产品类别配置（用于后续扩展）
PRODUCT_CONFIG = {
    "厨电": {
        "keywords": ["油烟机", "燃气灶", "烟灶", "吸油烟机"],
        "pain_points": ["噪音", "清洗", "安装", "风量"],
        "selling_points": ["静音", "易清洗", "大吸力", "智能"]
    }
}
