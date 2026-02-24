#!/bin/bash
# 评论分析快捷脚本

cd "$(dirname "$0")"

echo "1. 快速分析（自动模式）"
echo "2. 交互模式"
echo "3. 生成完整报告文件"
echo ""
read -p "请选择 [1-3]: " choice

case $choice in
  1)
    python3 terminal_report_v2.py
    ;;
  2)
    python3 terminal_report_v2.py --interactive
    ;;
  3)
    python3 quick_analyze.py
    ;;
  *)
    echo "无效选择"
    exit 1
    ;;
esac
