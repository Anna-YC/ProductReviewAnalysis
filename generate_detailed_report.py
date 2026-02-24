#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
生成详细产品分析报告 - 按照模板格式生成6部分完整报告

使用方法:
    python generate_detailed_report.py
"""
import sys
from pathlib import Path
import pandas as pd
from datetime import datetime
import json

# 添加src目录到路径
sys.path.insert(0, str(Path(__file__).parent / "src"))

from analyzer import ReviewAnalyzer
from opportunity_analyzer import OpportunityAnalyzer
from reporter import MarketingReportGenerator


def find_latest_review_file():
    """查找最近的评论数据文件"""
    downloads_path = Path.home() / "Downloads"
    patterns = ["评论数据_*.csv", "评论数据_*.xlsx"]
    files = []

    for pattern in patterns:
        files.extend(downloads_path.glob(pattern))

    if not files:
        print("❌ 未找到评论数据文件")
        return None

    latest = max(files, key=lambda f: f.stat().st_mtime)
    print(f"📁 找到最新文件: {latest.name}")
    return latest


def convert_csv_to_df(csv_path):
    """将插件CSV转换为DataFrame格式"""
    df = pd.read_csv(csv_path, encoding='utf-8-sig')

    new_df = pd.DataFrame()
    new_df['初评内容'] = df['评论内容']
    new_df['追评内容'] = df['追加评论'].fillna('')
    new_df['评论全文'] = new_df['初评内容'] + ' ' + new_df['追评内容']
    new_df['评论全文'] = new_df['评论全文'].str.strip()
    new_df['评分'] = df['评分'].fillna(5)
    new_df['日期'] = df['日期']
    new_df['SKU'] = df['SKU'].fillna('')
    new_df['用户昵称'] = df['用户昵称']
    new_df['商家回复'] = df['商家回复'].fillna('')
    new_df['平台'] = df['平台'].fillna('tmall')

    return new_df


def extract_marketing_scenarios(df, analyzer):
    """提取营销场景机会"""
    texts = df['评论全文'].tolist()

    scenarios = []

    # 定义场景关键词
    scenario_keywords = {
        "新房装修": ["新房", "新家", "装修", "刚装", "新厨房", "首次", "一套房", "新装修"],
        "旧房改造": ["旧房", "老房", "改造", "换新", "升级", "替换", "原来的", "旧款", "换掉"],
        "送父母/长辈": ["父母", "爸妈", "长辈", "老人", "给妈", "给爸", "孝心", "父母家"],
        "开放式厨房": ["开放", "开放式", "连客厅", "餐厅一体"],
        "小户型": ["小户型", "小厨房", "空间小", "紧凑", "小空间"],
        "租房使用": ["租房", "出租房", "公寓", "租房用"],
    }

    for scenario_name, keywords in scenario_keywords.items():
        matching_reviews = []
        for text in texts:
            for kw in keywords:
                if kw in text:
                    matching_reviews.append(text)
                    break

        if matching_reviews:
            # 计算情感分数
            sentiment_scores = []
            for text in matching_reviews[:50]:  # 限制样本数
                try:
                    score = analyzer.analyze_sentiment(text)
                    sentiment_scores.append(score)
                except:
                    sentiment_scores.append(0.5)

            avg_sentiment = sum(sentiment_scores) / len(sentiment_scores) if sentiment_scores else 0.5

            scenarios.append({
                "场景名称": scenario_name,
                "用户数量": len(matching_reviews),
                "情感分数": round(avg_sentiment * 100, 0),
                "评论样本": matching_reviews[:3]
            })

    # 按用户数量排序
    scenarios.sort(key=lambda x: x["用户数量"], reverse=True)

    return scenarios


def extract_user_segments(df, analyzer):
    """提取用户群体机会"""
    texts = df['评论全文'].tolist()

    segments = []

    # 定义用户群体关键词
    segment_keywords = {
        "品质追求型": ["品质", "质量", "做工", "材质", "工艺", "质感", "精致", "高端"],
        "价格敏感型": ["性价比", "便宜", "实惠", "价格", "划算", "值得", "超值", "优惠"],
        "功能实用型": ["实用", "功能", "好用", "方便", "操作", "简单", "易用", "便捷"],
        "颜值导向型": ["颜值", "好看", "漂亮", "美观", "外观", "设计", "时尚", "大气"],
        "服务敏感型": ["服务", "客服", "师傅", "安装", "售后", "配送", "态度", "专业"],
        "品牌忠诚型": ["方太", "品牌", "信赖", "信任", "老用户", "回头客", "再用", "回购"],
    }

    for segment_name, keywords in segment_keywords.items():
        matching_reviews = []
        for text in texts:
            for kw in keywords:
                if kw in text:
                    matching_reviews.append(text)
                    break

        if matching_reviews:
            # 提取高频关注点
            all_text = " ".join(matching_reviews[:100])
            # 简单提取高频词
            from collections import Counter
            import jieba
            words = jieba.cut(all_text)
            word_counts = Counter([w for w in words if len(w) >= 2])

            top_keywords = [f"{kw}({count})" for kw, count in word_counts.most_common(5)]

            segments.append({
                "群体名称": segment_name,
                "群体规模": len(matching_reviews),
                "关注重点": top_keywords,
            })

    # 按群体规模排序
    segments.sort(key=lambda x: x["群体规模"], reverse=True)

    return segments


def extract_service_issues(df, analyzer):
    """提取服务问题"""
    texts = df['评论全文'].tolist()

    service_issues = []

    # 定义服务类别
    service_keywords = {
        "配送服务": ["配送", "物流", "快递", "发货", "送货", "到货", "包装"],
        "安装服务": ["安装", "师傅", "改装", "厨改", "量尺寸", "上门"],
        "客服服务": ["客服", "咨询", "沟通", "回复", "响应"],
        "售后服务": ["售后", "维修", "保修", "问题", "故障", "坏了"],
    }

    for service_name, keywords in service_keywords.items():
        matching_reviews = []
        for text in texts:
            for kw in keywords:
                if kw in text:
                    matching_reviews.append(text)
                    break

        # 计算负面比例
        negative_count = 0
        for text in matching_reviews[:100]:
            try:
                score = analyzer.analyze_sentiment(text)
                if score < 0.4:
                    negative_count += 1
            except:
                pass

        if matching_reviews:
            service_issues.append({
                "服务类别": service_name,
                "问题数量": negative_count,
                "总提及数": len(matching_reviews),
            })

    # 按问题数量排序
    service_issues.sort(key=lambda x: x["问题数量"], reverse=True)

    return service_issues


def generate_detailed_report(df, output_path):
    """生成详细的产品分析报告"""

    print("🔍 开始分析...")

    analyzer = ReviewAnalyzer()
    texts = df['评论全文'].tolist()

    # 1. 基础分析
    keywords = analyzer.extract_keywords(texts, topk=20)
    aspects = analyzer.extract_aspect_opinions(texts)
    complaints = analyzer.extract_complaints(texts, sentiment_threshold=0.3)
    praises = analyzer.extract_praise_points(texts, sentiment_threshold=0.75)

    # 2. 竞品差异化机会
    diff_opportunities = []
    for aspect, data in aspects.items():
        negative_count = len(data.get('negative', []))
        if negative_count >= 10:  # 至少10条负面评价
            diff_opportunities.append({
                "维度": aspect,
                "负面数量": negative_count,
                "正面率": data.get('score', 0)
            })

    diff_opportunities.sort(key=lambda x: x["负面数量"], reverse=True)

    # 3. 产品迭代机会
    product_issues = []
    for aspect, data in aspects.items():
        negative_count = len(data.get('negative', []))
        if negative_count >= 5:
            # 获取用户原话
            negative_reviews = data.get('negative', [])[:3]

            # 根据维度生成改进建议
            improvement_suggestions = {
                "安装服务": "提供免费安装，优化尺寸适配说明，增加安装视频教程",
                "噪音表现": "优化风道设计，提升静音技术，增加变频调速",
                "清洁便利": "优化自清洁功能，简化操作流程，提升清洁效果",
                "吸烟效果": "提升吸力，优化风道设计，增加变频增压功能",
                "外观设计": "优化产品外观设计，提供更多颜色选择",
                "功能操作": "简化操作界面，增加智能控制功能",
                "性价比": "优化成本结构，提供更具竞争力的价格",
            }

            product_issues.append({
                "问题类别": aspect,
                "影响用户数": negative_count,
                "用户原话": negative_reviews,
                "改进建议": improvement_suggestions.get(aspect, "持续优化产品体验")
            })

    product_issues.sort(key=lambda x: x["影响用户数"], reverse=True)

    # 4. 营销场景机会
    marketing_scenarios = extract_marketing_scenarios(df, analyzer)

    # 5. 用户群体机会
    user_segments = extract_user_segments(df, analyzer)

    # 6. 服务问题
    service_issues = extract_service_issues(df, analyzer)

    # 生成报告
    timestamp = datetime.now().strftime('%Y年%m月%d日 %H:%M')

    report_lines = []
    report_lines.append(f"# 🎯 产品评价深度分析报告")
    report_lines.append("")
    report_lines.append(f"**生成时间**: {timestamp}")
    report_lines.append(f"**分析样本**: {len(df)} 条有效评论")
    report_lines.append(f"**产品品类**: 厨电（洗碗机）")
    report_lines.append("")
    report_lines.append("---")
    report_lines.append("")

    # 一、竞品差异化机会
    report_lines.append("## 一、🎯 竞品差异化机会")
    report_lines.append("")
    report_lines.append("### 💡 分析说明")
    report_lines.append("")
    report_lines.append("基于用户对旧产品/竞品的不满反馈，挖掘我方产品的差异化优势。")
    report_lines.append("")
    report_lines.append(f"共发现 **{len(diff_opportunities)}** 个高价值差异化机会点：")
    report_lines.append("")

    for i, opp in enumerate(diff_opportunities[:5], 1):
        level = "🔥 高机会" if opp["负面数量"] >= 30 else "⚡ 中等机会"
        report_lines.append(f"### {i}. {opp['维度']} - {level}")
        report_lines.append("")
        report_lines.append("**用户痛点**:")
        report_lines.append("")
        report_lines.append("**差异化策略**: " + {
            "安装服务": "承诺免费上门安装，提供0元厨改服务，展示安装案例",
            "噪音表现": "突出静音技术优势，使用分贝对比数据，承诺'低分贝运行'",
            "清洁便利": "强调自清洁技术、易拆设计，对比传统清洗方式",
            "吸烟效果": "突出大吸力优势，提供风量数据，对比竞品",
            "外观设计": "突出产品颜值和设计感，展示厨房搭配效果",
            "功能操作": "强调智能化操作（挥手控制、APP控制），降低学习成本",
            "性价比": "突出价格优势，对比同配置产品价格，强调使用成本",
        }.get(opp['维度'], "持续优化该维度体验"))
        report_lines.append("")
        report_lines.append(f"**支持数据**: {opp['负面数量']}条负面评价")
        report_lines.append("")
        report_lines.append("---")
        report_lines.append("")

    # 二、产品迭代机会
    report_lines.append("## 二、🔧 产品迭代机会")
    report_lines.append("")
    report_lines.append("### 💡 分析说明")
    report_lines.append("")
    report_lines.append("从用户负面评价中提取具体的产品改进方向，优先排序。")
    report_lines.append("")
    report_lines.append(f"共识别 **{len(product_issues)}** 个产品优化方向：")
    report_lines.append("")

    for i, issue in enumerate(product_issues[:5], 1):
        priority = "🔴 高优先级" if issue["影响用户数"] >= 20 else "🟡 中优先级"
        report_lines.append(f"### {i}. {issue['问题类别']} - {priority}")
        report_lines.append("")
        report_lines.append(f"**影响用户**: {issue['影响用户数']}条反馈")
        report_lines.append("")
        report_lines.append("**用户原话**:")
        for quote in issue['用户原话']:
            report_lines.append(f"> {quote[:100]}...")
        report_lines.append("")
        report_lines.append(f"**改进建议**: {issue['改进建议']}")
        report_lines.append("")
        report_lines.append("---")
        report_lines.append("")

    # 三、营销场景机会
    report_lines.append("## 三、📢 营销场景机会")
    report_lines.append("")
    report_lines.append("### 💡 分析说明")
    report_lines.append("")
    report_lines.append("识别高频使用场景，用于精准营销和场景化文案创作。")
    report_lines.append("")
    report_lines.append(f"共发现 **{len(marketing_scenarios)}** 个高价值营销场景：")
    report_lines.append("")

    for i, scenario in enumerate(marketing_scenarios[:6], 1):
        sentiment_level = "😊 正面" if scenario["情感分数"] >= 60 else "😐 中性"
        report_lines.append(f"### {i}. {scenario['场景名称']}")
        report_lines.append("")
        report_lines.append(f"**用户数量**: {scenario['用户数量']} 条评价")
        report_lines.append("")
        report_lines.append(f"**情感倾向**: {scenario['情感分数']}分 ({sentiment_level})")
        report_lines.append("")

        # 生成营销切入建议
        marketing_angles = {
            "新房装修": "针对新装修用户，强调'新厨房就该配新洗碗机'，推出装修套餐优惠",
            "旧房改造": "针对老房改造用户，强调'升级换代，提升厨房品质'，提供0元厨改服务",
            "送父母/长辈": "针对孝心购买用户，强调'给父母最好的'，突出简单易用和安全性能",
            "开放式厨房": "针对开放式厨房用户，强调'低噪静音'不影响客厅，突出颜值设计",
            "小户型": "针对小户型用户，强调'紧凑设计不占空间'，展示安装案例",
            "租房使用": "针对租房用户，强调'性价比高，搬家可带走'，突出便携安装",
        }
        report_lines.append("**营销切入**: " + marketing_angles.get(scenario['场景名称'], "针对该场景定制营销方案"))
        report_lines.append("")

        target_scripts = {
            "新房装修": "新家新气象，让洗碗机成为厨房的新标配",
            "旧房改造": "老厨房焕新颜，0元厨改轻松升级",
            "送父母/长辈": "孝心好礼，简单操作父母也能轻松使用",
            "开放式厨房": "开放式厨房的最佳选择，静音不扰邻",
            "小户型": "小巧不占地，大容量一样满足",
            "租房使用": "租房也能享受品质生活，带走你的厨房伙伴",
        }
        report_lines.append("**目标话术**: " + target_scripts.get(scenario['场景名称'], "为该场景用户量身定制"))
        report_lines.append("")
        report_lines.append("---")
        report_lines.append("")

    # 四、用户群体机会
    report_lines.append("## 四、👥 用户群体机会")
    report_lines.append("")
    report_lines.append("### 💡 分析说明")
    report_lines.append("")
    report_lines.append("识别不同用户群体的需求特点，实现精准定位和差异化营销。")
    report_lines.append("")
    report_lines.append(f"共识别 **{len(user_segments)}** 类用户群体：")
    report_lines.append("")

    for i, segment in enumerate(user_segments[:6], 1):
        report_lines.append(f"### {i}. {segment['群体名称']}")
        report_lines.append("")
        report_lines.append(f"**群体规模**: {segment['群体规模']}条评价")
        report_lines.append("")

        group_features = {
            "品质追求型": "注重产品品质和做工，愿意为品质付费",
            "价格敏感型": "关注性价比，希望花更少的钱买更好的产品",
            "功能实用型": "重视产品功能是否实用，操作是否便捷",
            "颜值导向型": "产品外观是购买决策的重要因素",
            "服务敏感型": "重视售前售后的服务质量",
            "品牌忠诚型": "对方太品牌有高度信任，多为回头客",
        }
        report_lines.append("**群体特征**: " + group_features.get(segment['群体名称'], ""))
        report_lines.append("")

        report_lines.append("**关注重点**: " + ", ".join(segment['关注重点'][:5]))
        report_lines.append("")

        marketing_strategies = {
            "品质追求型": "强调材质工艺、技术参数、品牌实力，提供高端定位",
            "价格敏感型": "突出性价比优势、促销活动、使用成本对比",
            "功能实用型": "展示实用功能、使用场景、解决问题能力",
            "颜值导向型": "突出产品颜值、设计美感、厨房搭配效果",
            "服务敏感型": "强调服务品质、安装保障、售后承诺",
            "品牌忠诚型": "强调品牌历史、用户口碑、老用户回馈",
        }
        report_lines.append("**营销策略**: " + marketing_strategies.get(segment['群体名称'], ""))
        report_lines.append("")
        report_lines.append("---")
        report_lines.append("")

    # 五、服务提升机会
    report_lines.append("## 五、🛎️ 服务提升机会")
    report_lines.append("")
    report_lines.append("### 💡 分析说明")
    report_lines.append("")
    report_lines.append("识别服务流程中的问题和改进空间，提升用户满意度。")
    report_lines.append("")
    report_lines.append(f"共发现 **{len(service_issues)}** 个服务改进点：")
    report_lines.append("")

    for i, issue in enumerate(service_issues[:4], 1):
        report_lines.append(f"### {i}. {issue['服务类别']}")
        report_lines.append("")
        report_lines.append(f"**问题数量**: {issue['问题数量']}条负面反馈 (总提及{issue['总提及数']}条)")
        report_lines.append("")

        improvement_suggestions = {
            "配送服务": "优化配送时效，提供预约配送服务，加强包装保护",
            "安装服务": "加强安装师傅培训，建立服务质量评价体系，推广0元厨改",
            "客服服务": "提升客服专业度，优化响应速度，增加常见问题解答",
            "售后服务": "完善售后流程，明确保修政策，提高问题解决效率",
        }
        report_lines.append("**改进建议**: " + improvement_suggestions.get(issue['服务类别'], ""))
        report_lines.append("")
        report_lines.append("---")
        report_lines.append("")

    # 六、总结与行动建议
    report_lines.append("## 六、📋 总结与行动建议")
    report_lines.append("")
    report_lines.append("### 📊 分析概览")
    report_lines.append("")
    report_lines.append(f"- **竞品差异化机会**: {len(diff_opportunities)} 个")
    report_lines.append(f"- **产品迭代机会**: {len(product_issues)} 个")
    report_lines.append(f"- **营销场景机会**: {len(marketing_scenarios)} 个")
    report_lines.append(f"- **服务提升机会**: {len(service_issues)} 个")
    report_lines.append(f"- **用户群体机会**: {len(user_segments)} 类")
    report_lines.append("")
    total = len(diff_opportunities) + len(product_issues) + len(marketing_scenarios) + len(service_issues) + len(user_segments)
    report_lines.append(f"**总计发现机会点**: {total} 个")
    report_lines.append("")

    report_lines.append("### 🎯 优先级建议")
    report_lines.append("")

    report_lines.append("#### 🔴 立即行动（高优先级）")
    report_lines.append("")

    # 取前3个产品问题
    for issue in product_issues[:3]:
        report_lines.append(f"- **{issue['问题类别']}**: {issue['改进建议']}")
    report_lines.append("")

    report_lines.append("### 📈 营销落地建议")
    report_lines.append("")

    if marketing_scenarios:
        top_scenario = marketing_scenarios[0]
        report_lines.append(f"1. **重点营销场景**: {top_scenario['场景名称']}")
        report_lines.append(f"   - 目标用户: {top_scenario['用户数量']}条评价")
        report_lines.append(f"   - 营销切入: 针对该场景用户推出专属优惠和服务")
    report_lines.append("")

    if user_segments:
        top_segment = user_segments[0]
        report_lines.append(f"2. **核心用户群体**: {top_segment['群体名称']}")
        report_lines.append(f"   - 群体规模: {top_segment['群体规模']}条评价")
        report_lines.append(f"   - 营销策略: 针对该群体需求定制营销话术和推广渠道")
    report_lines.append("")

    report_lines.append("---")
    report_lines.append("")
    report_lines.append("*本报告由 AI 分析生成，建议结合实际业务情况进行决策。*")

    # 写入文件
    with open(output_path, 'w', encoding='utf-8') as f:
        f.write('\n'.join(report_lines))

    print(f"✅ 报告已生成: {output_path}")


def main():
    print("="*70)
    print("  📊 生成详细产品分析报告")
    print("="*70)

    # 查找文件
    file_path = find_latest_review_file()
    if not file_path:
        sys.exit(1)

    # 读取数据
    print(f"\n📥 读取数据...")
    df = convert_csv_to_df(file_path)
    print(f"✅ 读取成功: {len(df)} 条评论")

    # 数据清洗
    print(f"\n🧹 清洗数据...")
    # 过滤默认好评
    default_patterns = ['默认好评', '该用户觉得商品非常好', '系统默认好评']
    for pattern in default_patterns:
        df = df[~df['评论全文'].str.contains(pattern, na=False)]

    # 去重
    df = df.drop_duplicates(subset=['评论全文'])

    # 过滤短评论
    df = df[df['评论全文'].str.len() >= 5]

    print(f"✅ 清洗完成: 有效数据 {len(df)} 条")

    # 生成报告
    output_dir = Path("/Users/AI 项目/Vibe Coding/ProductReviewAnalysis/output/reports")
    output_dir.mkdir(parents=True, exist_ok=True)

    timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
    output_path = output_dir / f"产品深度分析报告_完整版_{timestamp}.md"

    generate_detailed_report(df, output_path)

    print("\n" + "="*70)
    print("  ✅ 分析完成！")
    print("="*70)


if __name__ == "__main__":
    main()
