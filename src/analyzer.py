# -*- coding: utf-8 -*-
"""
评论分析器 - 核心分析模块
"""
import jieba
import jieba.analyse
from collections import Counter, defaultdict
from snownlp import SnowNLP
from typing import List, Dict, Tuple
import re
from config import STOPWORDS


class ReviewAnalyzer:
    """评论分析器"""

    def __init__(self):
        # 初始化jieba分词
        jieba.setLogLevel(jieba.logging.INFO)
        # 添加厨电领域专业词汇
        self._init_domain_words()

    def _init_domain_words(self):
        """初始化领域专业词汇"""
        domain_words = [
            # 产品相关
            "油烟机", "燃气灶", "烟灶套装", "吸力", "风量", "排风量",
            "噪音", "静音", "分贝",
            # 安装相关
            "安装师傅", "安装服务", "上门安装", "免费安装",
            # 功能相关
            "自清洗", "热清洗", "挥手智控", "智能控制",
            # 使用体验
            "易清洗", "好清洗", "拆洗", "清洁",
            # 外观相关
            "星空灰", "灰色", "颜值", "外观",
        ]
        for word in domain_words:
            jieba.add_word(word)

    def extract_keywords(self, texts: List[str], topk: int = 30) -> List[Tuple[str, int]]:
        """
        提取关键词

        Args:
            texts: 评论文本列表
            topk: 返回前K个关键词

        Returns:
            [(关键词, 词频), ...]
        """
        all_words = []
        for text in texts:
            if not isinstance(text, str):
                continue
            # 分词
            words = jieba.cut(text)
            # 过滤停用词和单字
            words = [w.strip() for w in words if len(w) > 1 and w not in STOPWORDS]
            all_words.extend(words)

        # 统计词频
        word_counts = Counter(all_words)
        return word_counts.most_common(topk)

    def analyze_sentiment(self, text: str) -> float:
        """
        情感分析

        Args:
            text: 评论文本

        Returns:
            情感分数 (0-1, 1为最正面)
        """
        if not isinstance(text, str) or len(text.strip()) == 0:
            return 0.5  # 中性

        try:
            s = SnowNLP(text)
            return s.sentiments
        except:
            return 0.5

    def extract_aspect_opinions(self, texts: List[str]) -> Dict[str, Dict]:
        """
        方面-观点挖掘

        提取用户对不同产品维度的评价

        Returns:
            {
                "方面": {
                    "positive": [正面评论],
                    "negative": [负面评论],
                    "score": 平均情感分数
                }
            }
        """
        # 定义方面关键词
        aspects = {
            "安装服务": ["安装", "师傅", "上门", "服务"],
            "噪音表现": ["噪音", "声音", "响", "静音", "吵"],
            "清洁便利": ["清洗", "清洁", "拆洗", "易洗"],
            "吸烟效果": ["吸力", "风量", "吸烟", "排烟", "油烟"],
            "外观设计": ["外观", "颜值", "颜色", "灰色", "好看", "美观"],
            "功能操作": ["功能", "操作", "智能", "控制", "挥手"],
            "性价比": ["价格", "划算", "值得", "便宜", "贵", "性价比"],
        }

        results = {}
        for aspect, keywords in aspects.items():
            results[aspect] = {
                "positive": [],
                "negative": [],
                "neutral": [],
                "score": 0.5
            }

        # 分类每条评论
        for text in texts:
            if not isinstance(text, str) or len(text) < 5:
                continue

            sentiment = self.analyze_sentiment(text)
            text_lower = text.lower()

            for aspect, keywords in aspects.items():
                if any(kw in text for kw in keywords):
                    if sentiment > 0.6:
                        results[aspect]["positive"].append(text)
                    elif sentiment < 0.4:
                        results[aspect]["negative"].append(text)
                    else:
                        results[aspect]["neutral"].append(text)

        # 计算各方面平均分数
        for aspect in results:
            total = (len(results[aspect]["positive"]) +
                     len(results[aspect]["negative"]) +
                     len(results[aspect]["neutral"]))
            if total > 0:
                positive_ratio = len(results[aspect]["positive"]) / total
                results[aspect]["score"] = round(positive_ratio * 100, 1)
            else:
                results[aspect]["score"] = 0

        return results

    def extract_use_cases(self, texts: List[str]) -> Dict[str, List[str]]:
        """
        提取使用场景

        Returns:
            {"场景": [相关评论片段]}
        """
        use_cases = {
            "新房装修": [],
            "旧房换新": [],
            "租房使用": [],
            "送父母/长辈": [],
            "小户型": [],
            "开放式厨房": [],
        }

        patterns = {
            "新房装修": ["新房", "装修", "新家"],
            "旧房换新": ["换", "旧", "原来的坏了", "升级"],
            "租房使用": ["出租房", "租房", "房东"],
            "送父母/长辈": ["爸妈", "父母", "长辈", "老人", "给爸妈"],
            "小户型": ["小户型", "小厨房", "空间小"],
            "开放式厨房": ["开放", "开放式", "连客厅"],
        }

        for text in texts:
            if not isinstance(text, str):
                continue
            for case, keywords in patterns.items():
                if any(kw in text for kw in keywords):
                    use_cases[case].append(text)

        # 移除空场景
        return {k: v for k, v in use_cases.items() if v}

    def extract_complaints(self, texts: List[str], sentiment_threshold: float = 0.3) -> List[str]:
        """
        提取用户抱怨/痛点

        Args:
            texts: 评论列表
            sentiment_threshold: 情感阈值，低于此值视为负面

        Returns:
            负面评论列表
        """
        complaints = []

        for text in texts:
            if not isinstance(text, str) or len(text) < 5:
                continue
            sentiment = self.analyze_sentiment(text)
            if sentiment < sentiment_threshold:
                complaints.append(text)

        return complaints

    def extract_praise_points(self, texts: List[str], sentiment_threshold: float = 0.7) -> List[str]:
        """
        提取用户赞誉/卖点

        Args:
            texts: 评论列表
            sentiment_threshold: 情感阈值，高于此值视为正面

        Returns:
            正面评论列表
        """
        praises = []

        for text in texts:
            if not isinstance(text, str) or len(text) < 5:
                continue
            sentiment = self.analyze_sentiment(text)
            if sentiment > sentiment_threshold:
                praises.append(text)

        return praises


if __name__ == "__main__":
    # 测试分析器
    analyzer = ReviewAnalyzer()
    test_texts = [
        "安装师傅很专业，态度很好",
        "噪音有点大，不太满意",
        "吸力很大，油烟吸得很干净",
        "颜值很高，星空灰色很漂亮"
    ]
    print("关键词提取:", analyzer.extract_keywords(test_texts))
    print("\n方面-观点分析:")
    aspects = analyzer.extract_aspect_opinions(test_texts)
    for aspect, data in aspects.items():
        if data['score'] > 0:
            print(f"  {aspect}: {data['score']}% 正面")
