#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
深度分析模块 - 挖掘机会点和改进方向
"""
import pandas as pd
from collections import Counter, defaultdict
from typing import Dict, List, Tuple
from analyzer import ReviewAnalyzer
from config import STOPWORDS


class OpportunityAnalyzer:
    """机会点和改进方向分析器"""

    def __init__(self):
        self.analyzer = ReviewAnalyzer()

    def analyze_product_opportunities(self, df: pd.DataFrame) -> Dict:
        """
        分析产品机会点

        从评论中挖掘：
        1. 竞品劣势 -> 转化为我方优势
        2. 用户未被满足的需求 -> 产品迭代方向
        3. 高频使用场景 -> 营销切入点
        4. 用户群体特征 -> 精准定位
        """
        texts = df['评论全文'].tolist()

        # 提取关键信息
        aspects = self.analyzer.extract_aspect_opinions(texts)
        complaints = self.analyzer.extract_complaints(texts, sentiment_threshold=0.35)
        use_cases = self.analyzer.extract_use_cases(texts)

        # 分析维度
        opportunities = {
            "竞品差异化机会": self._find_competitor_gaps(aspects, complaints),
            "产品迭代机会": self._find_improvement_opportunities(complaints),
            "营销场景机会": self._find_marketing_scenarios(use_cases, texts),
            "用户群体机会": self._identify_customer_segments(texts, df),
            "服务提升机会": self._find_service_gaps(texts),
        }

        return opportunities

    def _find_competitor_gaps(self, aspects: Dict, complaints: List[str]) -> List[Dict]:
        """
        竞品差异化机会

        从负面评论中找出用户对竞品/旧产品的不满
        转化为我方的差异化优势
        """
        gaps = []

        # 分析各维度的负面评价
        for aspect, data in aspects.items():
            negative_count = len(data['negative'])
            positive_count = len(data['positive'])

            # 如果负面评价多于正面，说明这是行业痛点，是机会点
            if negative_count > positive_count and negative_count > 5:
                gaps.append({
                    "维度": aspect,
                    "机会等级": "🔥 高机会" if negative_count > 20 else "⚡ 中等机会",
                    "用户痛点": self._summarize_complaints(data['negative']),
                    "差异化策略": self._generate_differentiation_strategy(aspect, data['negative']),
                    "样本数": f"{negative_count}条负面评价"
                })

        return gaps

    def _find_improvement_opportunities(self, complaints: List[str]) -> List[Dict]:
        """
        产品迭代机会

        从负面评论中提取具体的产品改进方向
        """
        import re

        opportunities = []

        # 定义问题模式
        patterns = {
            "噪音问题": {
                "keywords": ["噪音大", "声音大", "太吵", "吵人", "嗡嗡", "响声"],
                "改进方向": "优化风道设计，提升静音技术，增加变频调速"
            },
            "清洁问题": {
                "keywords": ["难清洗", "不好洗", "拆洗麻烦", "清洗困难", "油网难洗"],
                "改进方向": "增强自清洁功能，优化油网易拆设计，提供清洗服务"
            },
            "安装问题": {
                "keywords": ["安装难", "安装费", "安装贵", "尺寸不对", "装不上"],
                "改进方向": "提供免费安装，优化尺寸适配说明，增加安装视频教程"
            },
            "吸力问题": {
                "keywords": ["吸力小", "吸不干净", "油烟", "吸烟效果", "跑烟"],
                "改进方向": "提升电机功率，优化风道设计，增加变频增压功能"
            },
            "控制问题": {
                "keywords": ["难操作", "不好用", "复杂", "看不懂", "不会用"],
                "改进方向": "简化操作界面，增加语音控制，优化说明书"
            },
            "材质问题": {
                "keywords": ["材质差", "薄", "质量差", "做工差", "便宜感"],
                "改进方向": "提升材质等级，加强品控，增加质感细节"
            },
        }

        for category, config in patterns.items():
            # 统计相关问题数量
            relevant_issues = []
            for complaint in complaints:
                if any(kw in complaint for kw in config["keywords"]):
                    relevant_issues.append(complaint)

            if len(relevant_issues) >= 3:  # 至少3条相关反馈才算机会
                opportunities.append({
                    "问题类别": category,
                    "影响用户数": f"{len(relevant_issues)}条反馈",
                    "用户原话": self._extract_quotes(relevant_issues, max_quotes=3),
                    "改进建议": config["改进方向"],
                    "优先级": "🔴 高优先级" if len(relevant_issues) > 10 else "🟡 中优先级"
                })

        return opportunities

    def _find_marketing_scenarios(self, use_cases: Dict, texts: List[str]) -> List[Dict]:
        """
        营销场景机会

        识别高频使用场景，用于精准营销
        """
        scenarios = []

        for scenario, comments in use_cases.items():
            if len(comments) >= 3:
                # 分析场景的情感倾向
                sentiments = [self.analyzer.analyze_sentiment(c) for c in comments]
                avg_sentiment = sum(sentiments) / len(sentiments) if sentiments else 0.5

                scenarios.append({
                    "场景名称": scenario,
                    "用户数量": len(comments),
                    "情感倾向": f"{avg_sentiment*100:.0f}分" if avg_sentiment else "无数据",
                    "营销切入": self._generate_marketing_angle(scenario, comments),
                    "目标话术": self._generate_scenario_copy(scenario)
                })

        # 按用户数量排序
        scenarios.sort(key=lambda x: x["用户数量"], reverse=True)
        return scenarios

    def _identify_customer_segments(self, texts: List[str], df: pd.DataFrame) -> List[Dict]:
        """
        用户群体机会

        识别不同用户群体的需求特点
        """
        segments = []

        # 分析SKU对应的用户特征
        sku_analysis = defaultdict(lambda: {"count": 0, "comments": []})
        for idx, row in df.iterrows():
            sku = row.get('SKU', '未知')
            sku_analysis[sku]["count"] += 1
            if pd.notna(row.get('评论全文')):
                sku_analysis[sku]["comments"].append(row['评论全文'])

        # 找出关键用户群体
        segments_data = {
            "品质追求型": {
                "关键词": ["品质", "质量", "做工", "材质", "高端"],
                "特征": "注重产品品质和做工，愿意为品质付费"
            },
            "价格敏感型": {
                "关键词": ["便宜", "划算", "性价比", "值得", "实惠"],
                "特征": "关注性价比，希望花更少的钱买更好的产品"
            },
            "功能实用型": {
                "关键词": ["好用", "实用", "方便", "简单", "操作"],
                "特征": "重视产品功能是否实用，操作是否便捷"
            },
            "颜值导向型": {
                "关键词": ["好看", "漂亮", "颜值", "美观", "设计"],
                "特征": "产品外观是购买决策的重要因素"
            },
            "服务敏感型": {
                "关键词": ["安装", "师傅", "服务", "售后", "态度"],
                "特征": "重视售前售后的服务质量"
            },
        }

        for segment_name, config in segments_data.items():
            matching_comments = []
            for text in texts:
                if isinstance(text, str) and any(kw in text for kw in config["关键词"]):
                    matching_comments.append(text)

            if len(matching_comments) >= 5:
                segments.append({
                    "用户群体": segment_name,
                    "群体规模": f"{len(matching_comments)}条评价",
                    "群体特征": config["特征"],
                    "关注重点": self._extract_top_words(matching_comments, top_k=5),
                    "营销策略": self._generate_segment_strategy(segment_name)
                })

        return segments

    def _find_service_gaps(self, texts: List[str]) -> List[Dict]:
        """
        服务提升机会

        识别服务流程中的问题和改进空间
        """
        service_gaps = []

        # 服务维度关键词
        service_keywords = {
            "配送服务": ["配送", "快递", "物流", "送货", "发货"],
            "安装服务": ["安装", "师傅", "上门", "装机"],
            "客服服务": ["客服", "咨询", "回复", "解答"],
            "售后服务": ["售后", "维修", "保修", "问题", "故障"],
        }

        for service_type, keywords in service_keywords.items():
            relevant_comments = []
            for text in texts:
                if isinstance(text, str) and any(kw in text for kw in keywords):
                    relevant_comments.append(text)

            if relevant_comments:
                # 分析服务问题
                positive = sum(1 for c in relevant_comments if self.analyzer.analyze_sentiment(c) > 0.6)
                negative = sum(1 for c in relevant_comments if self.analyzer.analyze_sentiment(c) < 0.4)

                if negative > positive:
                    service_gaps.append({
                        "服务环节": service_type,
                        "问题数量": f"{negative}条负面反馈",
                        "主要问题": self._summarize_complaints([c for c in relevant_comments if self.analyzer.analyze_sentiment(c) < 0.4]),
                        "改进建议": self._generate_service_improvement(service_type)
                    })

        return service_gaps

    # ========== 辅助方法 ==========

    def _summarize_complaints(self, complaints: List[str]) -> str:
        """总结投诉内容"""
        if not complaints:
            return "暂无相关反馈"

        # 提取高频词汇
        all_words = []
        for complaint in complaints:
            if isinstance(complaint, str):
                words = [w.strip() for w in complaint if len(w.strip()) > 1]
                all_words.extend(words)

        word_counts = Counter(all_words)
        top_words = [w for w, c in word_counts.most_common(5) if w not in STOPWORDS]

        return "、".join(top_words[:3])

    def _generate_differentiation_strategy(self, aspect: str, complaints: List[str]) -> str:
        """生成差异化策略"""
        strategies = {
            "噪音表现": "突出静音技术优势，使用分贝对比数据，承诺'低分贝运行'",
            "清洁便利": "强调自清洁技术、易拆油网设计，对比传统清洗方式",
            "吸烟效果": "展示大风量参数，使用吸烟效果对比图/视频",
            "功能操作": "强调智能化操作（挥手控制、APP控制），降低学习成本",
            "安装服务": "承诺免费上门安装，提供安装案例和用户好评",
        }

        if aspect in strategies:
            return strategies[aspect]

        # 从投诉中提取关键词生成策略
        common_issues = self._summarize_complaints(complaints)
        return f"针对用户反馈的'{common_issues}'问题，提供行业领先解决方案"

    def _extract_quotes(self, comments: List[str], max_quotes: int = 3) -> List[str]:
        """提取代表性用户原话"""
        return [c[:80] + "..." if len(c) > 80 else c for c in comments[:max_quotes]]

    def _extract_top_words(self, texts: List[str], top_k: int = 5) -> List[str]:
        """提取高频词"""
        all_words = []
        for text in texts:
            if isinstance(text, str):
                import jieba
                words = [w.strip() for w in jieba.cut(text) if len(w.strip()) > 1 and w not in STOPWORDS]
                all_words.extend(words)

        word_counts = Counter(all_words)
        return [f"{w}({c})" for w, c in word_counts.most_common(top_k)]

    def _generate_marketing_angle(self, scenario: str, comments: List[str]) -> str:
        """生成营销切入点"""
        angles = {
            "新房装修": "针对新装修用户，强调'新厨房就该配新烟机'，推出装修套餐优惠",
            "旧房换新": "针对老房改造用户，强调'升级换代，提升厨房品质'，提供旧机回收服务",
            "小户型": "针对小户型用户，强调'小厨房也有大吸力'，突出产品尺寸优势",
            "送父母/长辈": "针对孝心购买用户，强调'给父母最好的'，突出简单易用和安全性能",
            "租房使用": "针对租房用户，强调'租房也要有品质生活'，提供可拆卸设计",
        }
        return angles.get(scenario, f"针对{scenario}场景设计专属营销方案")

    def _generate_scenario_copy(self, scenario: str) -> str:
        """生成场景化文案"""
        copies = {
            "新房装修": "新家新气象，让油烟机成为厨房的点睛之笔",
            "旧房换新": "老厨房焕新颜，一机换新，生活品质UP",
            "小户型": "小空间大作为，紧凑设计不占地方",
            "送父母/长辈": "孝心好礼，简单操作父母也能轻松使用",
        }
        return copies.get(scenario, f"为{scenario}用户量身定制")

    def _generate_segment_strategy(self, segment: str) -> str:
        """生成用户群体的营销策略"""
        strategies = {
            "品质追求型": "强调材质工艺、技术参数、品牌实力，提供高端定位",
            "价格敏感型": "突出性价比优势、促销活动、使用成本对比",
            "功能实用型": "展示实用功能、使用场景、解决问题能力",
            "颜值导向型": "突出产品颜值、设计美感、厨房搭配效果",
            "服务敏感型": "强调服务品质、安装保障、售后承诺",
        }
        return strategies.get(segment, "制定针对性营销策略")

    def _generate_service_improvement(self, service_type: str) -> str:
        """生成服务改进建议"""
        improvements = {
            "配送服务": "优化配送时效，提供预约配送服务，加强包装保护",
            "安装服务": "加强安装师傅培训，建立服务质量评价体系，提供安装进度跟踪",
            "客服服务": "提升客服专业度，优化响应速度，增加常见问题解答",
            "售后服务": "完善售后流程，明确保修政策，提高问题解决效率",
        }
        return improvements.get(service_type, "针对用户反馈优化服务流程")
