#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
终端报告 v2 - 增强版

功能：
- 自动查找最新的评论数据
- 过滤商家回复，只分析用户评论
- 彩色输出 + 进度条
- 交互模式：选择查看特定维度

使用方法:
    python terminal_report_v2.py              # 自动模式
    python terminal_report_v2.py --interactive # 交互模式
"""
import sys
from pathlib import Path
import pandas as pd
from datetime import datetime
import tempfile
import argparse

# 颜色和进度条库
try:
    from rich.console import Console
    from rich.progress import Progress, SpinnerColumn, TextColumn, BarColumn, TaskProgressColumn
    from rich.table import Table
    from rich.panel import Panel
    from rich.text import Text
    from rich import box
    from rich.prompt import Prompt, Confirm
    from rich.layout import Layout
    from rich.columns import Columns
    RICH_AVAILABLE = True
except ImportError:
    RICH_AVAILABLE = False
    print("⚠️  建议安装 rich 库以获得更好的体验: pip install rich")

# 添加src目录到路径
sys.path.insert(0, str(Path(__file__).parent / "src"))

from analyzer import ReviewAnalyzer
from opportunity_analyzer import OpportunityAnalyzer
from reporter import MarketingReportGenerator
from data_loader import ReviewDataLoader


if RICH_AVAILABLE:
    console = Console()
else:
    console = None


def print_rich(*args, **kwargs):
    """兼容非rich环境的输出"""
    if RICH_AVAILABLE:
        console.print(*args, **kwargs)
    else:
        text = str(args[0]) if args else ""
        print(text)


def find_latest_review_file():
    """查找最近的评论数据文件"""
    downloads_path = Path.home() / "Downloads"
    patterns = ["评论数据_*.csv", "评论数据_*.xlsx"]
    files = []

    for pattern in patterns:
        files.extend(downloads_path.glob(pattern))

    if not files:
        print_rich("[red]❌ 未找到评论数据文件[/red]")
        print("请确保已从插件导出评论数据到 Downloads 文件夹")
        return None

    latest = max(files, key=lambda f: f.stat().st_mtime)
    print_rich(f"[green]📁 找到最新文件:[/green] [cyan]{latest.name}[/cyan]")
    return latest


def convert_csv_to_df(csv_path):
    """将插件CSV转换为DataFrame格式"""
    df = pd.read_csv(csv_path, encoding='utf-8-sig')

    new_df = pd.DataFrame()
    new_df['初评内容'] = df['评论内容']
    new_df['追评内容'] = df['追加评论'].fillna('')
    # 只合并用户评论，不包含商家回复
    new_df['评论全文'] = new_df['初评内容'] + ' ' + new_df['追评内容']
    new_df['评论全文'] = new_df['评论全文'].str.strip()
    new_df['评分'] = df['评分'].fillna(5)
    new_df['日期'] = df['日期']
    new_df['SKU'] = df['SKU'].fillna('')
    new_df['用户昵称'] = df['用户昵称']
    new_df['商家回复'] = df['商家回复'].fillna('')
    new_df['平台'] = df['平台'].fillna('tmall')

    return new_df


def clean_data(df):
    """数据清洗 - 过滤商家回复，只保留用户评论"""
    print_rich("\n[yellow]🧹 正在清洗数据...[/yellow]")

    # 去除空评论
    df = df[df['评论全文'].str.len() > 0].copy()

    # 过滤默认好评
    default_patterns = ['默认好评', '该用户觉得商品非常好', '系统默认好评']
    for pattern in default_patterns:
        df = df[~df['评论全文'].str.contains(pattern, na=False)]

    # 去重
    before_dedup = len(df)
    df = df.drop_duplicates(subset=['评论全文'])
    after_dedup = len(df)

    # 过滤过短评论
    before_len = len(df)
    df = df[df['评论全文'].str.len() >= 5]
    after_len = len(df)

    print_rich(f"  [green]✓[/green] 过滤默认好评")
    print_rich(f"  [green]✓[/green] 去除重复: {before_dedup - after_dedup} 条")
    print_rich(f"  [green]✓[/green] 过滤短评论: {before_len - after_len} 条")
    print_rich(f"[green]✅ 清洗完成: 有效数据 [bold]{len(df)}[/bold] 条[/green]")

    return df


def display_data_overview(df):
    """显示数据概览"""
    if RICH_AVAILABLE:
        table = Table(title="📊 数据概览", box=box.ROUNDED)
        table.add_column("指标", style="cyan", width=20)
        table.add_column("数值", style="green")

        table.add_row("评论总数", f"[bold]{len(df)}[/bold] 条")
        table.add_row("平均评分", f"[bold]{df['评分'].mean():.1f}[/bold] / 5.0")

        if '平台' in df.columns:
            for platform, count in df['平台'].value_counts().items():
                table.add_row(f"  - {platform}", f"{count} 条")

        # 评分分布
        score_dist = df['评分'].value_counts().sort_index()
        score_text = " | ".join([f"{int(s)}分:{c}" for s, c in score_dist.items()])
        table.add_row("评分分布", score_text)

        console.print(table)
    else:
        print("\n" + "="*50)
        print("  📊 数据概览")
        print("="*50)
        print(f"  评论总数: {len(df)} 条")
        print(f"  平均评分: {df['评分'].mean():.1f} / 5.0")


def display_keywords(keywords):
    """显示关键词"""
    if RICH_AVAILABLE:
        table = Table(title="🔑 高频关键词 Top 15", box=box.ROUNDED)
        table.add_column("排名", style="dim", width=6)
        table.add_column("关键词", style="cyan")
        table.add_column("词频", style="yellow")

        for i, (word, count) in enumerate(keywords[:15], 1):
            # 根据词频设置颜色
            if count >= 100:
                color = "red"
            elif count >= 50:
                color = "yellow"
            else:
                color = "white"
            table.add_row(str(i), f"[{color}]{word}[/{color}]", str(count))

        console.print(table)
    else:
        print("\n" + "="*50)
        print("  🔑 高频关键词 Top 15")
        print("="*50)
        for i, (word, count) in enumerate(keywords[:15], 1):
            print(f"  {i:2d}. {word:12s} ({count}次)")


def display_aspects(aspects):
    """显示维度评价"""
    if RICH_AVAILABLE:
        table = Table(title="📋 维度评价分析", box=box.ROUNDED)
        table.add_column("维度", style="cyan", width=12)
        table.add_column("正面率", width=10)
        table.add_column("评价分布", width=20)

        for aspect, data in aspects.items():
            score = data.get('score', 0)
            pos_count = len(data.get('positive', []))
            neg_count = len(data.get('negative', []))

            # 根据正面率设置颜色
            if score >= 70:
                score_color = "green"
            elif score >= 50:
                score_color = "yellow"
            else:
                score_color = "red"

            # 简单的条形图
            bar_len = int(score / 10)
            bar = "█" * bar_len + "░" * (10 - bar_len)

            table.add_row(
                aspect,
                f"[{score_color}]{score:.1f}%[/{score_color}]",
                f"█{pos_count}  ░{neg_count}  {bar}"
            )

        console.print(table)
    else:
        print("\n" + "="*50)
        print("  📋 维度评价")
        print("="*50)
        for aspect, data in aspects.items():
            score = data.get('score', 0)
            pos_count = len(data.get('positive', []))
            neg_count = len(data.get('negative', []))
            print(f"  {aspect:8s}: 正面率 {score:.1f}% (正面{pos_count}/负面{neg_count})")


def display_complaints(complaints):
    """显示痛点"""
    if RICH_AVAILABLE:
        panel = Panel(
            "\n".join([f"{i}. {c[:70]}..." for i, c in enumerate(complaints[:5], 1)]),
            title="⚠️  主要痛点 Top 5",
            border_style="red"
        )
        console.print(panel)
    else:
        print("\n" + "="*50)
        print("  ⚠️ 主要痛点 (Top 5)")
        print("="*50)
        for i, complaint in enumerate(complaints[:5], 1):
            print(f"  {i}. {complaint[:70]}...")


def display_praises(praises):
    """显示赞誉"""
    if RICH_AVAILABLE:
        panel = Panel(
            "\n".join([f"{i}. {p[:70]}..." for i, p in enumerate(praises[:5], 1)]),
            title="💚 用户赞誉 Top 5",
            border_style="green"
        )
        console.print(panel)
    else:
        print("\n" + "="*50)
        print("  💚 用户赞誉 (Top 5)")
        print("="*50)
        for i, praise in enumerate(praises[:5], 1):
            print(f"  {i}. {praise[:70]}...")


def display_opportunities(opportunities):
    """显示机会点"""
    if RICH_AVAILABLE:
        # 竞品差异化
        if "竞品差异化机会" in opportunities and opportunities["竞品差异化机会"]:
            diff_table = Table(title="🎯 竞品差异化机会", box=box.SIMPLE)
            diff_table.add_column("维度", style="cyan")
            diff_table.add_column("策略", style="yellow")

            for opp in opportunities["竞品差异化机会"][:3]:
                diff_table.add_row(
                    opp.get('维度', ''),
                    opp.get('差异化策略', '')[:60] + "..."
                )
            console.print(diff_table)

        # 产品迭代
        if "产品迭代机会" in opportunities and opportunities["产品迭代机会"]:
            improve_table = Table(title="🔧 产品迭代机会", box=box.SIMPLE)
            improve_table.add_column("问题", style="red")
            improve_table.add_column("优先级", style="yellow")
            improve_table.add_column("建议", style="green")

            for opp in opportunities["产品迭代机会"][:3]:
                improve_table.add_row(
                    opp.get('问题类别', ''),
                    opp.get('优先级', ''),
                    opp.get('改进建议', '')[:50] + "..."
                )
            console.print(improve_table)
    else:
        print("\n" + "="*50)
        print("  💡 机会点")
        print("="*50)
        if "竞品差异化机会" in opportunities:
            print("\n  🎯 竞品差异化机会")
            for opp in opportunities["竞品差异化机会"][:3]:
                print(f"    • {opp.get('维度', '')}: {opp.get('差异化策略', '')[:60]}...")


def display_marketing_copy(copy_framework):
    """显示营销文案"""
    if RICH_AVAILABLE:
        # 主标题
        title_panel = Panel(
            copy_framework.get('主标题', ''),
            title="📝 营销文案",
            border_style="cyan bold",
            padding=(1, 2)
        )
        console.print(title_panel)

        # 核心卖点
        selling_points = copy_framework.get('核心卖点', [])
        if selling_points:
            points_table = Table(title="💎 核心卖点", box=box.SIMPLE, show_header=False)
            points_table.add_column("序号", style="cyan", width=3)
            points_table.add_column("卖点", style="yellow")

            for i, point in enumerate(selling_points[:5], 1):
                if isinstance(point, dict):
                    title = point.get('标题', str(point))
                    points_table.add_row(str(i), title)
                else:
                    points_table.add_row(str(i), str(point))

            console.print(points_table)
    else:
        print("\n" + "="*50)
        print("  📝 营销文案")
        print("="*50)
        print(f"\n  主标题: {copy_framework.get('主标题', '')}")
        print(f"\n  核心卖点:")
        for i, point in enumerate(copy_framework.get('核心卖点', [])[:5], 1):
            if isinstance(point, dict):
                print(f"    {i}. {point.get('标题', str(point))}")
            else:
                print(f"    {i}. {point}")


def interactive_mode(df, analyzer, opp_analyzer, generator, analysis_result):
    """交互模式 - 让用户选择查看特定维度"""
    if not RICH_AVAILABLE:
        print("\n⚠️ 交互模式需要 rich 库，请运行: pip install rich")
        return

    while True:
        console.print("\n")
        console.print(Panel(
            "[bold cyan]选择要查看的详细内容:[/bold cyan]\n"
            "  [1] 🔑 关键词详细分析\n"
            "  [2] 📋 维度评价详情\n"
            "  [3] ⚠️  用户痛点（带原话）\n"
            "  [4] 💚 用户赞誉（带原话）\n"
            "  [5] 💡 机会点详情\n"
            "  [6] 📝 营销文案完整版\n"
            "  [0] 退出",
            title="交互模式",
            border_style="blue"
        ))

        choice = Prompt.ask("请选择", choices=["0", "1", "2", "3", "4", "5", "6"], default="0")

        if choice == "0":
            console.print("[green]👋 再见！[/green]")
            break

        elif choice == "1":
            # 关键词详细分析
            texts = df['评论全文'].tolist()
            keywords = analyzer.extract_keywords(texts, topk=30)
            display_keywords(keywords)

            # 显示词云提示
            console.print("\n[dim]💡 提示: 前15个关键词如上显示[/dim]")

        elif choice == "2":
            # 维度评价详情
            texts = df['评论全文'].tolist()
            aspects = analyzer.extract_aspect_opinions(texts)
            display_aspects(aspects)

            # 显示正反评论示例
            console.print("\n[bold]详细评论示例:[/bold]")
            for aspect, data in list(aspects.items())[:3]:
                console.print(f"\n[cyan]▸ {aspect}[/cyan]")

                if data.get('positive'):
                    console.print("  [green]✓ 正面:[/green]")
                    for comment in data['positive'][:2]:
                        console.print(f"    {comment[:60]}...")

                if data.get('negative'):
                    console.print("  [red]✗ 负面:[/red]")
                    for comment in data['negative'][:2]:
                        console.print(f"    {comment[:60]}...")

        elif choice == "3":
            # 痛点详细
            texts = df['评论全文'].tolist()
            complaints = analyzer.extract_complaints(texts, sentiment_threshold=0.3)

            if RICH_AVAILABLE:
                for i, complaint in enumerate(complaints[:10], 1):
                    console.print(f"\n[red]{i}.[/red] [dim]{complaint[:100]}...[/dim]")
            else:
                for i, complaint in enumerate(complaints[:10], 1):
                    print(f"\n{i}. {complaint[:100]}...")

        elif choice == "4":
            # 赞誉详细
            texts = df['评论全文'].tolist()
            praises = analyzer.extract_praise_points(texts, sentiment_threshold=0.75)

            if RICH_AVAILABLE:
                for i, praise in enumerate(praises[:10], 1):
                    console.print(f"\n[green]{i}.[/green] [dim]{praise[:100]}...[/dim]")
            else:
                for i, praise in enumerate(praises[:10], 1):
                    print(f"\n{i}. {praise[:100]}...")

        elif choice == "5":
            # 机会点详情
            opportunities = opp_analyzer.analyze_product_opportunities(df)
            display_opportunities(opportunities)

        elif choice == "6":
            # 营销文案
            copy_framework = generator.generate_landing_page_copy(analysis_result)
            display_marketing_copy(copy_framework)

            # 销售话术
            console.print("\n[bold cyan]💬 销售话术:[/bold cyan]")
            sales_scripts = generator.generate_sales_scripts(analysis_result)

            for category, scripts in sales_scripts.items():
                console.print(f"\n[cyan]▸ {category}[/cyan]")
                for script in scripts[:3]:
                    console.print(f"  • {script[:70]}...")


def main():
    parser = argparse.ArgumentParser(description="评论数据终端分析 - 增强版")
    parser.add_argument("-i", "--interactive", action="store_true",
                       help="启用交互模式")
    args = parser.parse_args()

    # 欢迎界面
    if RICH_AVAILABLE:
        console.print(Panel(
            "[bold cyan]🚀 评论数据终端分析 v2.0[/bold cyan]\n"
            "[dim]• 过滤商家回复 • 彩色输出 • 交互模式[/dim]",
            border_style="cyan bold",
            padding=(1, 2)
        ))
    else:
        print("="*50)
        print("  🚀 评论数据终端分析 v2.0")
        print("="*50)

    # 查找文件
    file_path = find_latest_review_file()
    if not file_path:
        sys.exit(1)

    # 进度条加载
    if RICH_AVAILABLE:
        with Progress(
            SpinnerColumn(),
            TextColumn("[progress.description]{task.description}"),
            BarColumn(),
            TaskProgressColumn(),
            console=console
        ) as progress:
            # 读取数据
            task1 = progress.add_task("[cyan]读取数据文件...", total=100)

            if file_path.suffix == '.csv':
                df = convert_csv_to_df(file_path)
            else:
                df = pd.read_excel(file_path)

            progress.update(task1, completed=100)

            # 清洗数据
            task2 = progress.add_task("[yellow]清洗数据...", total=100)
            df = clean_data(df)
            progress.update(task2, completed=100)

            # 分析数据
            task3 = progress.add_task("[green]执行分析...", total=100)

            analyzer = ReviewAnalyzer()
            opp_analyzer = OpportunityAnalyzer()
            generator = MarketingReportGenerator(product_name="产品")

            texts = df['评论全文'].tolist()
            keywords = analyzer.extract_keywords(texts, topk=20)
            aspects = analyzer.extract_aspect_opinions(texts)
            complaints = analyzer.extract_complaints(texts, sentiment_threshold=0.3)
            praises = analyzer.extract_praise_points(texts, sentiment_threshold=0.75)

            progress.update(task3, completed=100)
    else:
        # 非rich版本
        if file_path.suffix == '.csv':
            df = convert_csv_to_df(file_path)
        else:
            df = pd.read_excel(file_path)

        df = clean_data(df)

        analyzer = ReviewAnalyzer()
        opp_analyzer = OpportunityAnalyzer()
        generator = MarketingReportGenerator(product_name="产品")

        texts = df['评论全文'].tolist()
        keywords = analyzer.extract_keywords(texts, topk=20)
        aspects = analyzer.extract_aspect_opinions(texts)
        complaints = analyzer.extract_complaints(texts, sentiment_threshold=0.3)
        praises = analyzer.extract_praise_points(texts, sentiment_threshold=0.75)

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

    # 显示结果
    display_data_overview(df)
    display_keywords(keywords)
    display_aspects(aspects)

    if complaints:
        display_complaints(complaints)

    if praises:
        display_praises(praises)

    # 机会点分析
    if RICH_AVAILABLE:
        with console.status("[bold yellow]分析机会点..."):
            opportunities = opp_analyzer.analyze_product_opportunities(df)
    else:
        print("\n正在分析机会点...")
        opportunities = opp_analyzer.analyze_product_opportunities(df)

    display_opportunities(opportunities)

    # 营销文案
    copy_framework = generator.generate_landing_page_copy(analysis_result)
    display_marketing_copy(copy_framework)

    # 交互模式
    if args.interactive:
        interactive_mode(df, analyzer, opp_analyzer, generator, analysis_result)

    # 完成
    if RICH_AVAILABLE:
        console.print(Panel(
            "[bold green]✅ 分析完成！[/bold green]\n"
            "[dim]💡 提示: 使用 -i 参数进入交互模式查看更多详情[/dim]",
            border_style="green bold"
        ))
    else:
        print("\n" + "="*50)
        print("  ✅ 分析完成！")
        print("="*50)
        print(f"\n💡 提示: 使用 --interactive 参数进入交互模式")


if __name__ == "__main__":
    main()
