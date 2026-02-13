#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
产品评价分析系统 - 主程序

基于电商评论数据，分析用户需求，生成营销文案建议
"""
import sys
import argparse
from pathlib import Path

# 添加src目录到路径
sys.path.insert(0, str(Path(__file__).parent / "src"))

from data_loader import ReviewDataLoader
from analyzer import ReviewAnalyzer
from reporter import MarketingReportGenerator
from config import OUTPUT_DIR, IMAGES_DIR
import matplotlib.pyplot as plt
import matplotlib
matplotlib.rcParams['font.sans-serif'] = ['Arial Unicode MS', 'SimHei', 'STHeiti']
matplotlib.rcParams['axes.unicode_minus'] = False


def print_section(title: str):
    """打印分节标题"""
    print("\n" + "=" * 70)
    print(f"  {title}")
    print("=" * 70)


def analyze_reviews(data_file: Path = None, generate_charts: bool = True):
    """
    主分析流程

    Args:
        data_file: Excel数据文件路径
        generate_charts: 是否生成可视化图表
    """
    print_section("📊 产品评价分析系统")

    # ========== 1. 数据加载 ==========
    print_section("步骤 1/5: 数据加载与清洗")
    loader = ReviewDataLoader(data_file)
    loader.load_from_excel()
    loader.clean_data()
    loader.save_processed_data()

    df = loader.processed_data

    # 显示数据概况
    print(f"\n📈 数据概况:")
    print(f"  原始数据: {len(loader.raw_data)} 条")
    print(f"  有效数据: {len(df)} 条")
    print(f"  有效率: {len(df)/len(loader.raw_data)*100:.1f}%")

    # SKU分布
    sku_summary = loader.get_sku_summary()
    print(f"\n📦 SKU分布 (Top 5):")
    for sku, count in list(sku_summary.items())[:5]:
        print(f"  {sku}: {count} 条")

    # ========== 2. 文本分析 ==========
    print_section("步骤 2/5: 文本分析")

    analyzer = ReviewAnalyzer()
    texts = df['评论全文'].tolist()

    # 关键词提取
    print("\n🔑 高频关键词 (Top 20):")
    keywords = analyzer.extract_keywords(texts, topk=20)
    for i, (word, count) in enumerate(keywords, 1):
        print(f"  {i:2d}. {word:8s} ({count}次)")

    # ========== 3. 情感与方面分析 ==========
    print_section("步骤 3/5: 情感与方面分析")

    # 方面-观点分析
    aspects = analyzer.extract_aspect_opinions(texts)

    print("\n📊 各维度用户评价:")
    aspect_results = []
    for aspect, data in aspects.items():
        total = len(data['positive']) + len(data['negative']) + len(data['neutral'])
        if total > 5:  # 只显示样本充足的方面
            print(f"\n  【{aspect}】")
            print(f"    正面: {len(data['positive'])} | 负面: {len(data['negative'])} | 中性: {len(data['neutral'])}")
            print(f"    正面率: {data['score']}%")
            aspect_results.append({
                'aspect': aspect,
                'score': data['score'],
                'positive_count': len(data['positive']),
                'negative_count': len(data['negative']),
            })

    # 提取正面和负面评论
    print("\n💖 用户赞誉 (高情感分数评论):")
    praises = analyzer.extract_praise_points(texts, sentiment_threshold=0.75)
    for praise in praises[:5]:
        print(f"  {praise}")

    print("\n😞 用户痛点 (低情感分数评论):")
    complaints = analyzer.extract_complaints(texts, sentiment_threshold=0.3)
    for complaint in complaints[:5]:
        print(f"  {complaint}")

    # ========== 4. 生成营销文案 ==========
    print_section("步骤 4/5: 生成营销文案")

    # 构建分析结果
    analysis_result = {
        "aspect_opinions": aspects,
        "praises": praises,
        "complaints": complaints,
        "keywords": keywords,
        "aspect_results": aspect_results,
    }

    # 生成文案和话术
    generator = MarketingReportGenerator(product_name="油烟机")
    copy_framework = generator.generate_landing_page_copy(analysis_result)
    sales_scripts = generator.generate_sales_scripts(analysis_result)

    # 预览核心内容
    print("\n🎨 落地页文案预览:")
    print(f"\n  主标题: {copy_framework['主标题']}")
    print(f"  副标题: {copy_framework['副标题']}")

    print("\n  核心卖点:")
    for i, point in enumerate(copy_framework['核心卖点'], 1):
        print(f"    {i}. {point['标题']} - {point['正面率']}")

    print("\n🗣️ 推销话术预览:")
    for stage, scripts in sales_scripts.items():
        print(f"\n  【{stage}】")
        for script in scripts[:2]:
            print(f"    - {script}")

    # ========== 5. 保存报告 ==========
    print_section("步骤 5/5: 保存分析报告")

    report_path = generator.save_report(copy_framework, sales_scripts)

    print(f"\n✅ 分析完成!")
    print(f"\n📁 输出文件:")
    print(f"  - 营销文案报告: {report_path}")
    print(f"  - 清洗后数据: {loader.save_processed_data.__code__.co_consts[2] if loader.save_processed_data.__code__.co_consts else 'N/A'}")

    # ========== 6. 可视化（可选）==========
    if generate_charts:
        generate_visualizations(aspect_results, keywords, aspects)

    return analysis_result, copy_framework, sales_scripts


def generate_visualizations(aspect_results: list, keywords: list, aspects: dict):
    """生成可视化图表"""
    print_section("生成可视化图表")

    # 图1: 方面评分柱状图
    if aspect_results:
        fig, ax = plt.subplots(figsize=(12, 6))

        aspects_names = [r['aspect'] for r in aspect_results]
        scores = [r['score'] for r in aspect_results]

        colors = ['#2ecc69' if s > 70 else '#f39c12' if s > 50 else '#e74c3c' for s in scores]
        bars = ax.barh(aspects_names, scores, color=colors)

        ax.set_xlabel('正面率 (%)', fontsize=12)
        ax.set_title('各维度用户评价正面率', fontsize=14, fontweight='bold')
        ax.set_xlim(0, 100)

        # 添加数值标签
        for bar, score in zip(bars, scores):
            ax.text(bar.get_width() + 2, bar.get_y() + bar.get_height()/2,
                   f'{score}%', va='center', fontsize=10)

        plt.tight_layout()
        chart1_path = IMAGES_DIR / "aspect_scores.png"
        plt.savefig(chart1_path, dpi=150, bbox_inches='tight')
        print(f"\n✓ 图表已保存: {chart1_path}")
        plt.close()

    # 图2: 关键词云（简化版）
    if keywords:
        fig, ax = plt.subplots(figsize=(12, 8))

        # 取前15个关键词
        top_words = keywords[:15]
        words = [w[0] for w in top_words]
        counts = [w[1] for w in top_words]

        y_pos = range(len(words))
        bars = ax.barh(y_pos, counts, color='#3498db')

        ax.set_yticks(y_pos)
        ax.set_yticklabels(words)
        ax.invert_yaxis()
        ax.set_xlabel('词频', fontsize=12)
        ax.set_title('高频关键词 Top 15', fontsize=14, fontweight='bold')

        # 添加数值标签
        for bar, count in zip(bars, counts):
            ax.text(bar.get_width() + 0.5, bar.get_y() + bar.get_height()/2,
                   str(count), va='center', fontsize=10)

        plt.tight_layout()
        chart2_path = IMAGES_DIR / "top_keywords.png"
        plt.savefig(chart2_path, dpi=150, bbox_inches='tight')
        print(f"✓ 图表已保存: {chart2_path}")
        plt.close()


def main():
    """主入口"""
    parser = argparse.ArgumentParser(description="产品评价分析系统")
    parser.add_argument("--data", "-d",
                       default="/Users/AI 项目/Vibe Coding/ProductReviewAnalysis/电商产品评价-示例数据.xlsx",
                       help="Excel数据文件路径")
    parser.add_argument("--no-charts", action="store_true",
                       help="不生成可视化图表")

    args = parser.parse_args()

    # 执行分析
    analyze_reviews(
        data_file=Path(args.data),
        generate_charts=not args.no_charts
    )


if __name__ == "__main__":
    main()
