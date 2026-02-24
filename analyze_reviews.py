#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
评论分析一键工具
将插件抓取的数据自动转换为分析报告

使用方法:
    cd /Users/AI\ 项目/Vibe\ Coding/ProductReviewAnalysis
    python3 analyze_reviews.py output/crawler/评论数据_xxx.csv
    
示例:
    python3 analyze_reviews.py output/crawler/评论数据_2026-02-22-12-00-00.csv
"""
import sys
import argparse
import pandas as pd
from pathlib import Path
from datetime import datetime

# 确定项目根目录（脚本所在目录）
SCRIPT_DIR = Path(__file__).parent.resolve()
sys.path.insert(0, str(SCRIPT_DIR / "src"))

from data_loader import ReviewDataLoader
from analyzer import ReviewAnalyzer
from reporter import MarketingReportGenerator
from opportunity_analyzer import OpportunityAnalyzer
from config import OUTPUT_DIR, REPORTS_DIR, IMAGES_DIR
import matplotlib.pyplot as plt
import matplotlib
matplotlib.rcParams['font.sans-serif'] = ['Arial Unicode MS', 'SimHei', 'STHeiti']
matplotlib.rcParams['axes.unicode_minus'] = False


def clean_illegal_chars(text):
    """清理Excel不支持的非法字符"""
    if not isinstance(text, str):
        return text
    # 移除控制字符（保留换行符和制表符）
    import re
    # 移除 ASCII 控制字符 (0-31)，保留换行(10)和制表符(9)
    text = ''.join(char for char in text if ord(char) >= 32 or char in '\n\t')
    # 移除其他特殊控制字符
    text = re.sub(r'[\x00-\x08\x0b\x0c\x0e-\x1f]', '', text)
    return text


def convert_csv_to_excel(csv_path: Path) -> Path:
    """
    将插件抓取的CSV转换为分析系统需要的Excel格式
    
    插件CSV格式: ID,平台,用户昵称,用户等级,评论内容,评分,日期,SKU,追加评论,追加日期,有图片,商家回复
    分析系统格式: 初评内容,追评内容,评论全文,评分,日期,SKU,用户昵称,商家回复
    """
    print(f"📥 读取CSV文件: {csv_path}")
    df = pd.read_csv(csv_path, encoding='utf-8-sig')
    
    print(f"✓ 读取 {len(df)} 条评论")
    
    # 字段映射转换
    new_df = pd.DataFrame()
    new_df['初评内容'] = df['评论内容'].apply(clean_illegal_chars)
    new_df['追评内容'] = df['追加评论'].fillna('').apply(clean_illegal_chars)
    new_df['评论全文'] = (new_df['初评内容'] + ' ' + new_df['追评内容']).str.strip()
    new_df['评分'] = df['评分'].fillna(5)
    new_df['日期'] = df['日期']
    new_df['SKU'] = df['SKU'].fillna('')
    new_df['用户昵称'] = df['用户昵称'].apply(clean_illegal_chars)
    new_df['商家回复'] = df['商家回复'].fillna('').apply(clean_illegal_chars)
    new_df['平台'] = df['平台'].fillna('tmall')
    
    # 保存为Excel
    timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
    excel_path = OUTPUT_DIR / f"评论数据_转换_{timestamp}.xlsx"
    excel_path.parent.mkdir(parents=True, exist_ok=True)
    
    new_df.to_excel(excel_path, index=False, engine='openpyxl')
    print(f"✓ 转换完成: {excel_path}")
    
    return excel_path


def generate_comprehensive_report(excel_path: Path):
    """
    生成综合分析报告（营销文案 + 深度分析）
    """
    print("\n" + "="*70)
    print("  📊 开始生成综合分析报告")
    print("="*70)
    
    # ========== 1. 数据加载 ==========
    print("\n【1/5】数据加载与清洗...")
    loader = ReviewDataLoader(excel_path)
    loader.load_from_excel()
    loader.clean_data()
    df = loader.processed_data
    
    print(f"✓ 有效数据: {len(df)} 条")
    
    # ========== 2. 文本分析 ==========
    print("\n【2/5】文本分析...")
    analyzer = ReviewAnalyzer()
    texts = df['评论全文'].tolist()
    
    # 关键词
    keywords = analyzer.extract_keywords(texts, topk=20)
    print(f"✓ 提取 {len(keywords)} 个高频关键词")
    
    # 方面分析
    aspects = analyzer.extract_aspect_opinions(texts)
    print(f"✓ 分析 {len(aspects)} 个维度")
    
    # 赞誉和痛点
    praises = analyzer.extract_praise_points(texts, sentiment_threshold=0.75)
    complaints = analyzer.extract_complaints(texts, sentiment_threshold=0.3)
    print(f"✓ 识别 {len(praises)} 个赞誉点, {len(complaints)} 个痛点")
    
    # ========== 3. 机会点分析 ==========
    print("\n【3/5】机会点分析...")
    opportunity_analyzer = OpportunityAnalyzer()
    opportunities = opportunity_analyzer.analyze_product_opportunities(df)
    print(f"✓ 发现 {len(opportunities)} 个机会点")
    
    # ========== 4. 生成营销文案 ==========
    print("\n【4/5】生成营销文案...")
    
    analysis_result = {
        "aspect_opinions": aspects,
        "praises": praises,
        "complaints": complaints,
        "keywords": keywords,
        "aspect_results": [
            {
                'aspect': aspect,
                'score': data['score'],
                'positive_count': len(data['positive']),
                'negative_count': len(data['negative']),
            }
            for aspect, data in aspects.items()
        ],
    }
    
    generator = MarketingReportGenerator(product_name="产品")
    copy_framework = generator.generate_landing_page_copy(analysis_result)
    sales_scripts = generator.generate_sales_scripts(analysis_result)
    
    # ========== 5. 生成综合报告 ==========
    print("\n【5/5】生成报告文件...")
    
    timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
    
    # 5.1 保存营销文案
    marketing_path = generator.save_report(copy_framework, sales_scripts)
    
    # 5.2 保存深度分析报告
    deep_report_path = REPORTS_DIR / f"产品深度分析报告_{timestamp}.md"
    generate_deep_report_file(df, opportunities, aspects, praises, complaints, deep_report_path)
    
    # 5.3 生成可视化图表
    generate_charts(analysis_result['aspect_results'], keywords, aspects, timestamp)
    
    # 5.4 生成摘要报告
    summary_path = REPORTS_DIR / f"分析报告摘要_{timestamp}.md"
    generate_summary_report(df, copy_framework, opportunities, summary_path)
    
    print("\n" + "="*70)
    print("  ✅ 分析完成！")
    print("="*70)
    print(f"\n📁 生成的报告文件：")
    print(f"  1. 营销文案报告: {marketing_path}")
    print(f"  2. 深度分析报告: {deep_report_path}")
    print(f"  3. 报告摘要: {summary_path}")
    print(f"\n📊 核心发现：")
    print(f"  • 分析样本: {len(df)} 条评论")
    print(f"  • 平均评分: {df['评分'].mean():.1f}")
    print(f"  • 核心卖点: {copy_framework['主标题']}")
    
    return {
        'marketing_path': marketing_path,
        'deep_report_path': deep_report_path,
        'summary_path': summary_path
    }


def generate_deep_report_file(df, opportunities, aspects, praises, complaints, output_path):
    """生成深度分析报告"""
    with open(output_path, 'w', encoding='utf-8') as f:
        f.write("# 🎯 产品评价深度分析报告\n\n")
        f.write(f"**生成时间**: {datetime.now().strftime('%Y年%m月%d日 %H:%M')}\n")
        f.write(f"**分析样本**: {len(df)} 条有效评论\n")
        f.write(f"**平均评分**: {df['评分'].mean():.1f}/5\n\n")
        
        f.write("---\n\n")
        
        # 一、竞品差异化机会
        f.write("## 一、🎯 竞品差异化机会\n\n")
        gaps = opportunities.get("竞品差异化机会", [])
        if gaps:
            for i, gap in enumerate(gaps[:5], 1):
                f.write(f"### {i}. {gap['维度']} - {gap['机会等级']}\n\n")
                f.write(f"**用户痛点**: {gap['用户痛点']}\n\n")
                f.write(f"**差异化策略**: {gap['差异化策略']}\n\n")
                f.write(f"**样本支持**: {gap['样本数']} 条\n\n")
                f.write("---\n\n")
        else:
            f.write("✅ 未发现明显的竞品差异化机会。\n\n")
        
        # 二、产品迭代机会
        f.write("## 二、🔧 产品迭代机会\n\n")
        improvements = opportunities.get("产品迭代机会", [])
        if improvements:
            for i, imp in enumerate(improvements[:5], 1):
                f.write(f"### {i}. {imp['问题类别']} - {imp['优先级']}\n\n")
                f.write(f"**影响用户**: {imp['影响用户数']}\n\n")
                f.write("**用户原话**:\n")
                for quote in imp['用户原话'][:3]:
                    f.write(f"> {quote}\n")
                f.write(f"\n**改进建议**: {imp['改进建议']}\n\n")
                f.write("---\n\n")
        else:
            f.write("✅ 未发现明显的产品改进需求。\n\n")
        
        # 三、用户赞誉亮点
        f.write("## 三、💖 用户赞誉亮点\n\n")
        if praises:
            for i, praise in enumerate(praises[:10], 1):
                f.write(f"{i}. {praise}\n")
        else:
            f.write("暂无显著赞誉点。\n")
        
        f.write("\n---\n\n")
        
        # 四、用户痛点反馈
        f.write("## 四、😞 用户痛点反馈\n\n")
        if complaints:
            for i, complaint in enumerate(complaints[:10], 1):
                f.write(f"{i}. {complaint}\n")
        else:
            f.write("暂无显著痛点反馈。\n")


def generate_charts(aspect_results, keywords, aspects, timestamp):
    """生成可视化图表"""
    try:
        # 方面评分图
        if aspect_results:
            fig, ax = plt.subplots(figsize=(12, 6))
            aspects_names = [r['aspect'] for r in aspect_results]
            scores = [r['score'] for r in aspect_results]
            colors = ['#2ecc69' if s > 70 else '#f39c12' if s > 50 else '#e74c3c' for s in scores]
            bars = ax.barh(aspects_names, scores, color=colors)
            ax.set_xlabel('正面率 (%)', fontsize=12)
            ax.set_title('各维度用户评价正面率', fontsize=14, fontweight='bold')
            ax.set_xlim(0, 100)
            for bar, score in zip(bars, scores):
                ax.text(bar.get_width() + 2, bar.get_y() + bar.get_height()/2,
                       f'{score}%', va='center', fontsize=10)
            plt.tight_layout()
            plt.savefig(IMAGES_DIR / f"aspect_scores_{timestamp}.png", dpi=150, bbox_inches='tight')
            plt.close()
        
        # 关键词图
        if keywords:
            fig, ax = plt.subplots(figsize=(12, 8))
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
            plt.tight_layout()
            plt.savefig(IMAGES_DIR / f"top_keywords_{timestamp}.png", dpi=150, bbox_inches='tight')
            plt.close()
    except Exception as e:
        print(f"⚠️ 图表生成失败: {e}")


def generate_summary_report(df, copy_framework, opportunities, output_path):
    """生成简洁的摘要报告"""
    with open(output_path, 'w', encoding='utf-8') as f:
        f.write("# 📊 评论分析报告摘要\n\n")
        f.write(f"**分析时间**: {datetime.now().strftime('%Y年%m月%d日 %H:%M')}\n")
        f.write(f"**数据规模**: {len(df)} 条评论\n\n")
        
        f.write("## 🎯 核心卖点\n\n")
        f.write(f"**{copy_framework['主标题']}**\n\n")
        f.write(f"{copy_framework['副标题']}\n\n")
        
        f.write("### 用户验证的卖点\n\n")
        for i, point in enumerate(copy_framework['核心卖点'][:5], 1):
            f.write(f"{i}. **{point['标题']}** ({point['正面率']})\n")
            if point.get('用户证言'):
                f.write(f"   > {point['用户证言'][0]}\n")
        
        f.write("\n## 🔧 改进建议\n\n")
        improvements = opportunities.get("产品迭代机会", [])
        if improvements:
            for i, imp in enumerate(improvements[:3], 1):
                f.write(f"{i}. **{imp['问题类别']}** ({imp['优先级']})\n")
                f.write(f"   建议: {imp['改进建议']}\n\n")
        else:
            f.write("✅ 产品整体满意度较高\n")


def main():
    parser = argparse.ArgumentParser(description="评论分析一键工具")
    parser.add_argument("csv_file", help="插件导出的CSV文件路径")
    parser.add_argument("--skip-convert", action="store_true", 
                       help="跳过转换（如果已经是Excel格式）")
    
    args = parser.parse_args()
    
    csv_path = Path(args.csv_file)
    if not csv_path.exists():
        print(f"❌ 文件不存在: {csv_path}")
        sys.exit(1)
    
    # 转换格式
    if not args.skip_convert:
        excel_path = convert_csv_to_excel(csv_path)
    else:
        excel_path = csv_path
    
    # 生成报告
    report_paths = generate_comprehensive_report(excel_path)
    
    print("\n✨ 分析流程完成！")


if __name__ == "__main__":
    main()
