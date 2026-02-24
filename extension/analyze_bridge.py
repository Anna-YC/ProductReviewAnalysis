#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
插件分析桥接器
接收插件传来的数据，执行分析，返回结果

使用方法:
    python analyze_bridge.py <csv文件路径>
"""
import sys
import json
from pathlib import Path

# 添加项目路径
sys.path.insert(0, str(Path(__file__).parent.parent))

from analyze_reviews import convert_csv_to_excel, generate_comprehensive_report


def analyze_file(csv_path: str):
    """分析文件并返回结果摘要"""
    try:
        csv_file = Path(csv_path)
        if not csv_file.exists():
            return {"success": False, "error": "文件不存在"}
        
        # 转换格式
        excel_path = convert_csv_to_excel(csv_file)
        
        # 生成报告
        report_paths = generate_comprehensive_report(excel_path)
        
        # 返回摘要
        return {
            "success": True,
            "message": "分析完成",
            "reports": {
                "marketing": str(report_paths["marketing_path"]),
                "deep": str(report_paths["deep_report_path"]),
                "summary": str(report_paths["summary_path"])
            }
        }
    except Exception as e:
        return {"success": False, "error": str(e)}


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(json.dumps({"success": False, "error": "缺少文件路径"}))
        sys.exit(1)
    
    result = analyze_file(sys.argv[1])
    print(json.dumps(result, ensure_ascii=False))
