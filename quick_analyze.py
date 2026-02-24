#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
快速分析入口 - 分析最近下载的评论数据

自动查找 Downloads 文件夹中最近的评论数据文件并分析

使用方法:
    python quick_analyze.py
"""
import sys
from pathlib import Path
from analyze_reviews import convert_csv_to_excel, generate_comprehensive_report


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


def main():
    print("="*70)
    print("  🚀 评论数据快速分析")
    print("="*70)
    
    # 查找文件
    file_path = find_latest_review_file()
    if not file_path:
        sys.exit(1)
    
    # 转换格式
    if file_path.suffix == '.csv':
        excel_path = convert_csv_to_excel(file_path)
    else:
        excel_path = file_path
    
    # 生成报告
    report_paths = generate_comprehensive_report(excel_path)
    
    print("\n" + "="*70)
    print("  ✅ 分析完成！")
    print("="*70)
    print(f"\n📂 报告位置: output/reports/")
    print("📄 包含文件:")
    for name, path in report_paths.items():
        print(f"  • {path.name}")


if __name__ == "__main__":
    main()
