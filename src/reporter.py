# -*- coding: utf-8 -*-
"""
报告生成器 - 输出营销文案和分析报告
"""
from typing import Dict, List
from pathlib import Path
from datetime import datetime
from config import REPORTS_DIR, IMAGES_DIR, OUTPUT_DIR


class MarketingReportGenerator:
    """营销报告生成器"""

    def __init__(self, product_name: str = "油烟机"):
        self.product_name = product_name

    def generate_landing_page_copy(self, analysis_result: Dict) -> Dict:
        """
        生成落地页文案框架

        基于评论分析结果生成落地页文案建议
        """
        aspects = analysis_result.get("aspect_opinions", {})
        praises = analysis_result.get("praises", [])
        keywords = analysis_result.get("keywords", [])

        # 提取关键卖点
        top_features = []
        for aspect, data in aspects.items():
            if data["score"] > 70:  # 正面评价超过70%
                top_features.append({
                    "aspect": aspect,
                    "score": data["score"],
                    "evidence": data["positive"][:3] if data["positive"] else []
                })

        # 生成文案
        copy_framework = {
            "主标题": self._generate_headline(top_features, keywords),
            "副标题": self._generate_subheadline(top_features),
            "核心卖点": self._generate_selling_points(top_features),
            "痛点解决方案": self._generate_pain_point_solutions(aspects),
            "用户证言": self._generate_testimonials(praises),
            "购买CTA": self._generate_cta(aspects),
        }

        return copy_framework

    def _generate_headline(self, features: List[Dict], keywords: List[tuple]) -> str:
        """生成主标题"""
        # 找出最高分的特性
        if features:
            best_feature = features[0]["aspect"]
            score = features[0]["score"]

            headlines = {
                "安装服务": f"专业安装，省心到家 | {self.product_name}",
                "噪音表现": f"静音守护，厨房不喧嚣 | {self.product_name}",
                "清洁便利": f"告别清洗烦恼 | {self.product_name}",
                "吸烟效果": f"大吸力，零油烟 | {self.product_name}",
                "外观设计": f"高颜值，让厨房更出众 | {self.product_name}",
            }
            return headlines.get(best_feature, f"{self.product_name} - 用户推荐之选")

        # 使用关键词生成
        if keywords:
            top_keyword = keywords[0][0]
            return f"{top_keyword} | {self.product_name}"

        return f"{self.product_name} - 超值之选"

    def _generate_subheadline(self, features: List[Dict]) -> str:
        """生成副标题"""
        benefits = []
        for f in features[:3]:
            benefits.append(f["aspect"])

        if benefits:
            return f"{' | '.join(benefits)} - 超{len(features)}项用户认可优点"

        return "万千用户的选择，口碑见证品质"

    def _generate_selling_points(self, features: List[Dict]) -> List[Dict]:
        """生成核心卖点"""
        points = []
        for feature in features[:6]:
            evidence_text = ""
            if feature["evidence"]:
                # 取证据文本的前30字
                evidence_text = feature["evidence"][0][:30] + "..."

            points.append({
                "标题": feature["aspect"],
                "描述": self._expand_aspect(feature["aspect"]),
                "用户证言": evidence_text,
                "正面率": f"{feature['score']}%"
            })

        return points

    def _expand_aspect(self, aspect: str) -> str:
        """扩展方面描述"""
        descriptions = {
            "安装服务": "专业师傅上门安装，服务周到，让您省心省力",
            "噪音表现": "静音技术，运行平稳，厨房谈话不干扰",
            "清洁便利": "易拆易洗，自清洁功能，告别油污困扰",
            "吸烟效果": "大风量，强劲吸力，油烟瞬间吸净",
            "外观设计": "简约时尚，星空灰色系，百搭各种厨房风格",
            "功能操作": "智能控制，挥手即开，老人也能轻松操作",
            "性价比": "品质保证，价格实惠，物超所值",
        }
        return descriptions.get(aspect, "用户高度认可的核心优势")

    def _generate_pain_point_solutions(self, aspects: Dict) -> List[Dict]:
        """生成痛点解决方案"""
        solutions = []

        pain_points_map = {
            "噪音表现": {
                "问题": "传统油烟机噪音大，影响家庭生活",
                "方案": "采用静音技术，运行声音低至XX分贝",
            },
            "清洁便利": {
                "问题": "油网难清洗，清洁费时费力",
                "方案": "热清洗自清洁技术，一键自动清洗",
            },
            "吸烟效果": {
                "问题": "油烟吸不净，厨房墙壁油腻",
                "方案": "XX立方米/分钟大风量，油烟无处可逃",
            },
        }

        for aspect, config in pain_points_map.items():
            if aspect in aspects:
                data = aspects[aspect]
                if data["negative"]:
                    solutions.append({
                        "方面": aspect,
                        "用户抱怨": data["negative"][:3],
                        "解决方案": config["方案"],
                    })

        return solutions

    def _generate_testimonials(self, praises: List[str]) -> List[Dict]:
        """生成用户证言"""
        testimonials = []

        for praise in praises[:10]:
            if isinstance(praise, str) and len(praise) > 10:
                # 简单处理，提取主要观点
                testimonials.append({
                    "内容": praise[:100] + "..." if len(praise) > 100 else praise,
                    "标签": "真实用户评价"
                })

        return testimonials

    def _generate_cta(self, aspects: Dict) -> Dict:
        """生成CTA文案"""
        cta_options = {
            "primary": "立即选购",
            "secondary": "免费咨询安装",
            "urgency": "限时优惠，点击查看",
        }

        # 根据分析结果调整
        if aspects.get("性价比", {}).get("score", 0) > 70:
            cta_options["urgency"] = "超值之选，立即抢购"

        return cta_options

    def generate_sales_scripts(self, analysis_result: Dict) -> Dict[str, List[str]]:
        """
        生成推销话术

        针对不同场景的推销话术
        """
        aspects = analysis_result.get("aspect_opinions", {})

        scripts = {
            "售前咨询": self._generate_presale_scripts(aspects),
            "处理异议": self._generate_objection_handling(aspects),
            "促成交易": self._generate_closing_scripts(aspects),
            "售后服务": self._generate_aftersale_scripts(aspects),
        }

        return scripts

    def _generate_presale_scripts(self, aspects: Dict) -> List[str]:
        """生成售前话术"""
        scripts = []

        # 根据分析结果生成针对性话术
        if aspects.get("安装服务", {}).get("score", 0) > 70:
            scripts.append("我们提供专业上门安装服务，师傅经过专业培训，确保安装到位。")

        if aspects.get("噪音表现", {}).get("score", 0) > 70:
            scripts.append("这款产品采用静音技术，运行声音很小，不会影响您日常休息。")

        if aspects.get("清洁便利", {}).get("score", 0) > 70:
            scripts.append("清洁非常方便，配备了自清洗功能，再也不用担心油网难清洗了。")

        return scripts

    def _generate_objection_handling(self, aspects: Dict) -> List[str]:
        """生成异议处理话术"""
        scripts = []

        # 噪音异议
        if "噪音表现" in aspects:
            scripts.append("关于噪音问题，这款产品采用了静音技术，实际使用中很多用户反馈声音很小。")

        # 价格异议
        if "性价比" in aspects:
            scripts.append("我们的价格在同品质产品中非常有竞争力，而且包含了专业安装服务，总体来说性价比很高。")

        return scripts

    def _generate_closing_scripts(self, aspects: Dict) -> List[str]:
        """生成促成话术"""
        return [
            "现在下单的话，我们还可以为您安排优先安装。",
            "这是我们的热销款，用户满意度很高，您可以放心购买。",
        ]

    def _generate_aftersale_scripts(self, aspects: Dict) -> List[str]:
        """生成售后话术"""
        return [
            "安装后如果遇到任何问题，都可以随时联系我们，我们会尽快为您处理。",
            "我们提供专业的售后服务，确保您使用无忧。",
        ]

    def save_report(self, copy_framework: Dict, scripts: Dict, filename: str = None):
        """保存报告到文件"""
        if filename is None:
            filename = f"营销文案报告_{datetime.now().strftime('%Y%m%d_%H%M%S')}.md"

        output_path = REPORTS_DIR / filename

        with open(output_path, 'w', encoding='utf-8') as f:
            f.write("# 营销文案报告\n\n")
            f.write(f"生成时间: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n\n")

            # 落地页文案
            f.write("## 一、落地页文案框架\n\n")

            f.write(f"### 主标题\n{copy_framework['主标题']}\n\n")
            f.write(f"### 副标题\n{copy_framework['副标题']}\n\n")

            f.write("### 核心卖点\n\n")
            for i, point in enumerate(copy_framework['核心卖点'], 1):
                f.write(f"**{i}. {point['标题']}** (正面率: {point['正面率']})\n\n")
                f.write(f"- 描述: {point['描述']}\n")
                if point['用户证言']:
                    f.write(f"- 用户证言: {point['用户证言']}\n")
                f.write("\n")

            f.write("### 痛点解决方案\n\n")
            for solution in copy_framework['痛点解决方案']:
                f.write(f"**{solution['方面']}**\n\n")
                f.write(f"- 问题: {solution['用户抱怨']}\n")
                f.write(f"- 方案: {solution['解决方案']}\n\n")

            f.write("### 用户证言\n\n")
            for i, testimonial in enumerate(copy_framework['用户证言'][:5], 1):
                f.write(f"{i}. {testimonial['内容']}\n\n")

            f.write("### CTA按钮\n\n")
            f.write(f"- 主按钮: {copy_framework['购买CTA']['primary']}\n")
            f.write(f"- 次按钮: {copy_framework['购买CTA']['secondary']}\n")
            f.write(f"- 紧迫感文案: {copy_framework['购买CTA']['urgency']}\n\n")

            # 推销话术
            f.write("## 二、推销话术\n\n")

            for stage, scripts in scripts.items():
                f.write(f"### {stage}\n\n")
                for i, script in enumerate(scripts, 1):
                    f.write(f"{i}. {script}\n")
                f.write("\n")

        print(f"✓ 报告已保存: {output_path}")
        return output_path
