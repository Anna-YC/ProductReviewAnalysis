#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
终端报告 - 直接在终端输出分析报告

自动查找最新的评论数据并输出分析结果到终端

使用方法:
    python terminal_report.py
"""
import sys
from pathlib import Path
import pandas as pd
from datetime import datetime
import tempfile
import shutil

# 添加src目录到路径
sys.path.insert(0, str(Path(__file__).parent / "src"))

from analyzer import ReviewAnalyzer
from opportunity_analyzer import OpportunityAnalyzer
from reporter import MarketingReportGenerator
from data_loader import ReviewDataLoader


def find_latest_review_file():
    """查找最近的评论数据文件"""
    downloads_path = Path.home() / "Downloads"

    # 查找评论数据文件
    patterns = ["评论数据_*.csv", "评论数据_*.xlsx"]
    files = []

    for pattern in patterns:
        files.extend(downloads_path.glob(pattern))

    if not files:
        print("❌ 未找到评论数据文件")
        print("请确保已从插件导出评论数据到 Downloads 文件夹")
        return None

    # 按修改时间排序，取最新的
    latest = max(files, key=lambda f: f.stat().st_mtime)
    print(f"📁 找到最新文件: {latest.name}")

    return latest


def print_section(title, char="="):
    """打印分隔线"""
    print(f"\n{char * 60}")
    print(f"  {title}")
    print(f"{char * 60}\n")


def convert_csv_to_df(csv_path):
    """将插件CSV转换为DataFrame格式"""
    df = pd.read_csv(csv_path, encoding='utf-8-sig')

    # 字段映射转换
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


def main():
    print("="*70)
    print("  🚀 评论数据终端分析")
    print("="*70)

    # 查找文件
    file_path = find_latest_review_file()
    if not file_path:
        sys.exit(1)

    # 读取并转换数据
    print(f"\n📊 正在加载数据...")
    try:
        if file_path.suffix == '.csv':
            df = convert_csv_to_df(file_path)
        else:
            # 假设是已转换的Excel格式
            df = pd.read_excel(file_path)

        print(f"✅ 加载成功: {len(df)} 条评论")

    except Exception as e:
        print(f"❌ 读取失败: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)

    # 使用ReviewDataLoader进行数据清洗
    print(f"\n🧹 正在清洗数据...")
    try:
        # 创建临时Excel文件用于ReviewDataLoader
        temp_dir = Path(tempfile.gettempdir())
        temp_excel = temp_dir / "temp_reviews.xlsx"
        df.to_excel(temp_excel, index=False, engine='openpyxl')

        loader = ReviewDataLoader(temp_excel)
        loader.load_from_excel()
        loader.clean_data()
        df = loader.processed_data

        print(f"✅ 清洗完成: 有效数据 {len(df)} 条")

        # 清理临时文件
        temp_excel.unlink()

    except Exception as e:
        print(f"⚠️ 数据清洗跳过: {e}")
        # 如果清洗失败，使用原始数据
        pass

    # 执行分析
    print(f"\n🔍 正在分析...")

    try:
        analyzer = ReviewAnalyzer()
        opp_analyzer = OpportunityAnalyzer()
        generator = MarketingReportGenerator(product_name="产品")

        texts = df['评论全文'].tolist()

        # 基础统计
        print_section("📊 数据概览")
        print(f"  评论总数: {len(df)} 条")
        print(f"  平均评分: {df['评分'].mean():.1f} / 5.0")
        if '平台' in df.columns:
            platform_counts = df['平台'].value_counts()
            for platform, count in platform_counts.items():
                print(f"  {platform}: {count} 条")

        # 关键词
        keywords = analyzer.extract_keywords(texts, topk=20)
        print_section("🔑 高频关键词 (Top 10)")
        for i, (word, count) in enumerate(keywords[:10], 1):
            print(f"  {i:2d}. {word:12s} ({count}次)")

        # 方面-观点分析
        aspects = analyzer.extract_aspect_opinions(texts)
        print_section("📋 维度评价")
        for aspect, data in aspects.items():
            score = data.get('score', 0)
            pos_count = len(data.get('positive', []))
            neg_count = len(data.get('negative', []))
            print(f"  {aspect:8s}: 正面率 {score:.1f}% (正面{pos_count}/负面{neg_count})")

        # 痛点
        complaints = analyzer.extract_complaints(texts, sentiment_threshold=0.3)
        print_section("⚠️ 主要痛点 (Top 5)")
        if complaints:
            for i, complaint in enumerate(complaints[:5], 1):
                print(f"  {i}. {complaint[:80]}{'...' if len(complaint) > 80 else ''}")
        else:
            print("  ✅ 未发现明显痛点")

        # 赞誉
        praises = analyzer.extract_praise_points(texts, sentiment_threshold=0.75)
        print_section("💚 用户赞誉 (Top 5)")
        if praises:
            for i, praise in enumerate(praises[:5], 1):
                print(f"  {i}. {praise[:80]}{'...' if len(praise) > 80 else ''}")
        else:
            print("  暂无显著赞誉点")

        # 机会分析
        print_section("💡 机会点分析")
        try:
            opportunities = opp_analyzer.analyze_product_opportunities(df)

            # 竞品差异化
            if "竞品差异化机会" in opportunities:
                print(f"\n  🎯 竞品差异化机会")
                for opp in opportunities["竞品差异化机会"][:3]:
                    print(f"    • {opp.get('维度', '')}: {opp.get('差异化策略', '')[:60]}...")

            # 产品迭代
            if "产品迭代机会" in opportunities:
                print(f"\n  🔧 产品迭代机会")
                for opp in opportunities["产品迭代机会"][:3]:
                    print(f"    • {opp.get('问题类别', '')} ({opp.get('优先级', '')}): {opp.get('改进建议', '')[:60]}...")

        except Exception as e:
            print(f"  ⚠️ 机会分析跳过: {e}")

        # 构建分析结果
        analysis_result = {
            "aspect_opinions": aspects,
            "praises": praises[:10] if praises else [],
            "complaints": complaints[:10] if complaints else [],
            "keywords": keywords,
            "aspect_results": [
                {
                    'aspect': aspect,
                    'score': int(data.get('score', 0)),
                    'positive_count': len(data.get('positive', [])),
                    'negative_count': len(data.get('negative', [])),
                }
                for aspect, data in aspects.items()
            ],
        }

        # 生成营销文案
        print_section("📝 营销文案")
        try:
            copy_framework = generator.generate_landing_page_copy(analysis_result)

            print(f"\n  主标题:")
            print(f"    {copy_framework.get('主标题', '')[0:70]}")

            print(f"\n  副标题:")
            print(f"    {copy_framework.get('副标题', '')[0:70]}")

            print(f"\n  核心卖点:")
            for i, point in enumerate(copy_framework.get('核心卖点', [])[:5], 1):
                if isinstance(point, dict):
                    title = point.get('标题', str(point))
                    print(f"    {i}. {title[:70]}")
                else:
                    print(f"    {i}. {str(point)[:70]}")

        except Exception as e:
            print(f"  ⚠️ 营销文案生成跳过: {e}")

    except Exception as e:
        print(f"❌ 分析失败: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)

    print("\n" + "="*70)
    print("  ✅ 分析完成！")
    print("="*70)
    print(f"\n💡 提示: 如需保存完整报告，请运行: python quick_analyze.py")


if __name__ == "__main__":
    main()
