#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
生成深度分析报告 - 机会点与改进方向
"""
import sys
import pandas as pd
from pathlib import Path
from datetime import datetime

sys.path.insert(0, str(Path(__file__).parent / "src"))

from data_loader import ReviewDataLoader
from analyzer import ReviewAnalyzer
from opportunity_analyzer import OpportunityAnalyzer
from config import REPORTS_DIR


def generate_deep_report():
    """生成深度分析报告"""

    print("=" * 70)
    print("  📊 产品评价深度分析报告")
    print("  机会点挖掘 & 改进方向建议")
    print("=" * 70)

    # 加载数据
    print("\n⏳ 正在加载数据...")
    loader = ReviewDataLoader()
    loader.load_from_excel()
    loader.clean_data()
    df = loader.processed_data

    # 执行深度分析
    print("⏳ 正在执行深度分析...")
    opportunity_analyzer = OpportunityAnalyzer()
    opportunities = opportunity_analyzer.analyze_product_opportunities(df)

    # 生成报告
    print("⏳ 正在生成报告...")
    report_path = REPORTS_DIR / f"产品深度分析报告_{datetime.now().strftime('%Y%m%d_%H%M%S')}.md"

    with open(report_path, 'w', encoding='utf-8') as f:
        f.write("# 🎯 产品评价深度分析报告\n\n")
        f.write(f"**生成时间**: {datetime.now().strftime('%Y年%m月%d日 %H:%M')}\n")
        f.write(f"**分析样本**: {len(df)} 条有效评论\n")
        f.write(f"**产品品类**: 厨电（油烟机+燃气灶）\n\n")

        f.write("---\n\n")

        # ========== 一、竞品差异化机会 ==========
        f.write("## 一、🎯 竞品差异化机会\n\n")
        f.write("### 💡 分析说明\n\n")
        f.write("基于用户对旧产品/竞品的不满反馈，挖掘我方产品的差异化优势。\n\n")

        gaps = opportunities["竞品差异化机会"]
        if gaps:
            f.write(f"共发现 **{len(gaps)}** 个高价值差异化机会点：\n\n")

            for i, gap in enumerate(gaps, 1):
                f.write(f"### {i}. {gap['维度']} - {gap['机会等级']}\n\n")
                f.write(f"**用户痛点**: {gap['用户痛点']}\n\n")
                f.write(f"**差异化策略**: {gap['差异化策略']}\n\n")
                f.write(f"**支持数据**: {gap['样本数']}\n\n")
                f.write("---\n\n")
        else:
            f.write("✅ 未发现明显的竞品差异化机会，现有产品已满足用户需求。\n\n")

        # ========== 二、产品迭代机会 ==========
        f.write("## 二、🔧 产品迭代机会\n\n")
        f.write("### 💡 分析说明\n\n")
        f.write("从用户负面评价中提取具体的产品改进方向，优先排序。\n\n")

        improvements = opportunities["产品迭代机会"]
        if improvements:
            f.write(f"共识别 **{len(improvements)}** 个产品优化方向：\n\n")

            for i, imp in enumerate(improvements, 1):
                f.write(f"### {i}. {imp['问题类别']} - {imp['优先级']}\n\n")
                f.write(f"**影响用户**: {imp['影响用户数']}\n\n")

                f.write("**用户原话**: \n")
                for quote in imp['用户原话']:
                    f.write(f"> {quote}\n")
                f.write("\n")

                f.write(f"**改进建议**: {imp['改进建议']}\n\n")
                f.write("---\n\n")
        else:
            f.write("✅ 未发现明显的产品改进需求。\n\n")

        # ========== 三、营销场景机会 ==========
        f.write("## 三、📢 营销场景机会\n\n")
        f.write("### 💡 分析说明\n\n")
        f.write("识别高频使用场景，用于精准营销和场景化文案创作。\n\n")

        scenarios = opportunities["营销场景机会"]
        if scenarios:
            f.write(f"共发现 **{len(scenarios)}** 个高价值营销场景：\n\n")

            for i, scenario in enumerate(scenarios, 1):
                f.write(f"### {i}. {scenario['场景名称']}\n\n")
                f.write(f"**用户数量**: {scenario['用户数量']} 条评价\n\n")
                f.write(f"**情感倾向**: {scenario['情感倾向']}\n\n")
                f.write(f"**营销切入**: {scenario['营销切入']}\n\n")
                f.write(f"**目标话术**: {scenario['目标话术']}\n\n")
                f.write("---\n\n")
        else:
            f.write("⚠️ 暂无场景化营销数据。\n\n")

        # ========== 四、用户群体机会 ==========
        f.write("## 四、👥 用户群体机会\n\n")
        f.write("### 💡 分析说明\n\n")
        f.write("识别不同用户群体的需求特点，实现精准定位和差异化营销。\n\n")

        segments = opportunities["用户群体机会"]
        if segments:
            f.write(f"共识别 **{len(segments)}** 类用户群体：\n\n")

            for i, segment in enumerate(segments, 1):
                f.write(f"### {i}. {segment['用户群体']}\n\n")
                f.write(f"**群体规模**: {segment['群体规模']}\n\n")
                f.write(f"**群体特征**: {segment['群体特征']}\n\n")
                f.write(f"**关注重点**: {', '.join(segment['关注重点'])}\n\n")
                f.write(f"**营销策略**: {segment['营销策略']}\n\n")
                f.write("---\n\n")
        else:
            f.write("⚠️ 用户群体分析数据不足。\n\n")

        # ========== 五、服务提升机会 ==========
        f.write("## 五、🛎️ 服务提升机会\n\n")
        f.write("### 💡 分析说明\n\n")
        f.write("识别服务流程中的问题和改进空间，提升用户满意度。\n\n")

        service_gaps = opportunities["服务提升机会"]
        if service_gaps:
            f.write(f"共发现 **{len(service_gaps)}** 个服务改进点：\n\n")

            for i, gap in enumerate(service_gaps, 1):
                f.write(f"### {i}. {gap['服务环节']}\n\n")
                f.write(f"**问题数量**: {gap['问题数量']}\n\n")
                f.write(f"**主要问题**: {gap['主要问题']}\n\n")
                f.write(f"**改进建议**: {gap['改进建议']}\n\n")
                f.write("---\n\n")
        else:
            f.write("✅ 服务质量良好，未发现明显问题。\n\n")

        # ========== 六、总结与建议 ==========
        f.write("## 六、📋 总结与行动建议\n\n")

        # 计算机会点数量
        total_opportunities = len(gaps) + len(improvements) + len(scenarios) + len(service_gaps)

        f.write(f"### 📊 分析概览\n\n")
        f.write(f"- **竞品差异化机会**: {len(gaps)} 个\n")
        f.write(f"- **产品迭代机会**: {len(improvements)} 个\n")
        f.write(f"- **营销场景机会**: {len(scenarios)} 个\n")
        f.write(f"- **服务提升机会**: {len(service_gaps)} 个\n")
        f.write(f"- **用户群体机会**: {len(segments)} 类\n")
        f.write(f"\n**总计发现机会点**: {total_opportunities} 个\n\n")

        f.write("### 🎯 优先级建议\n\n")

        # 高优先级项目
        high_priority = [imp for imp in improvements if imp.get('优先级', '') == '🔴 高优先级']
        if high_priority:
            f.write("#### 🔴 立即行动（高优先级）\n\n")
            for imp in high_priority:
                f.write(f"- **{imp['问题类别']}**: {imp['改进建议']}\n")
            f.write("\n")

        # 中等优先级
        medium_priority = [imp for imp in improvements if imp.get('优先级', '') == '🟡 中优先级']
        if medium_priority:
            f.write("#### 🟡 纳入规划（中等优先级）\n\n")
            for imp in medium_priority:
                f.write(f"- **{imp['问题类别']}**: {imp['改进建议']}\n")
            f.write("\n")

        f.write("### 📈 营销落地建议\n\n")

        # 找出最值得营销的场景
        if scenarios:
            top_scenario = scenarios[0]
            f.write(f"1. **重点营销场景**: {top_scenario['场景名称']}\n")
            f.write(f"   - 目标话术: {top_scenario['目标话术']}\n")
            f.write(f"   - 营销切入: {top_scenario['营销切入']}\n\n")

        # 找出最大用户群体
        if segments:
            top_segment = max(segments, key=lambda x: int(x['群体规模'].split('条')[0]))
            f.write(f"2. **核心用户群体**: {top_segment['用户群体']}\n")
            f.write(f"   - 群体特征: {top_segment['群体特征']}\n")
            f.write(f"   - 营销策略: {top_segment['营销策略']}\n\n")

        f.write("---\n\n")
        f.write("*本报告由 AI 分析生成，建议结合实际业务情况进行决策。*")

    print(f"\n✅ 报告生成完成: {report_path}")

    # 同时输出控制台预览
    print("\n" + "=" * 70)
    print("  📊 分析结果预览")
    print("=" * 70)

    print(f"\n🎯 竞品差异化机会: {len(gaps)} 个")
    for gap in gaps[:3]:
        print(f"  • {gap['维度']}: {gap['机会等级']}")

    print(f"\n🔧 产品迭代机会: {len(improvements)} 个")
    for imp in improvements[:3]:
        print(f"  • {imp['问题类别']}: {imp['优先级']}")

    print(f"\n📢 营销场景机会: {len(scenarios)} 个")
    for scenario in scenarios[:3]:
        print(f"  • {scenario['场景名称']}: {scenario['用户数量']}人")

    print(f"\n👥 用户群体机会: {len(segments)} 类")
    for segment in segments[:3]:
        print(f"  • {segment['用户群体']}: {segment['群体规模']}")

    print(f"\n🛎️ 服务提升机会: {len(service_gaps)} 个")
    for gap in service_gaps[:3]:
        print(f"  • {gap['服务环节']}")

    return report_path


if __name__ == "__main__":
    generate_deep_report()
