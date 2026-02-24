#!/bin/bash
# 评论分析一键运行脚本
# 使用方法: ./run_analysis.sh [csv文件名]

# 获取脚本所在目录（项目根目录）
PROJECT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$PROJECT_DIR"

# 检查参数
if [ $# -eq 0 ]; then
    # 优先查找项目目录中的文件
    LATEST_FILE=$(ls -t output/crawler/评论数据_*.csv 2>/dev/null | head -1)
    
    # 如果没有，查找 Downloads 目录
    if [ -z "$LATEST_FILE" ]; then
        DOWNLOADS_FILE=$(ls -t ~/Downloads/评论数据_*.csv 2>/dev/null | head -1)
        if [ -n "$DOWNLOADS_FILE" ]; then
            echo "📝 找到 Downloads 中的文件: $DOWNLOADS_FILE"
            echo "📋 正在复制到项目目录..."
            cp "$DOWNLOADS_FILE" output/crawler/
            LATEST_FILE="output/crawler/$(basename "$DOWNLOADS_FILE")"
            echo "✅ 已复制到: $LATEST_FILE"
        fi
    fi
    
    if [ -z "$LATEST_FILE" ]; then
        echo "❌ 未找到评论数据文件"
        echo ""
        echo "请确保："
        echo "  1. 已从插件导出数据（点击'一键分析'或'导出数据'按钮）"
        echo "  2. 文件在 Downloads 或 output/crawler/ 目录"
        echo ""
        echo "用法:"
        echo "  ./run_analysis.sh                    # 自动分析最新文件"
        echo "  ./run_analysis.sh 评论数据_xxx.csv    # 分析指定文件"
        exit 1
    fi
    
    echo "📝 分析文件: $LATEST_FILE"
    CSV_FILE="$LATEST_FILE"
else
    CSV_FILE="$1"
    # 如果路径不包含 /，自动添加 output/crawler/ 前缀
    if [[ "$CSV_FILE" != */* ]]; then
        # 先检查项目目录
        if [ -f "output/crawler/$CSV_FILE" ]; then
            CSV_FILE="output/crawler/$CSV_FILE"
        # 再检查 Downloads
        elif [ -f "$HOME/Downloads/$CSV_FILE" ]; then
            echo "📋 从 Downloads 复制文件..."
            cp "$HOME/Downloads/$CSV_FILE" output/crawler/
            CSV_FILE="output/crawler/$CSV_FILE"
        fi
    fi
fi

# 检查文件是否存在
if [ ! -f "$CSV_FILE" ]; then
    echo "❌ 文件不存在: $CSV_FILE"
    exit 1
fi

echo ""
echo "========================================"
echo "  🚀 开始分析评论数据"
echo "========================================"
echo ""
echo "📁 文件: $CSV_FILE"
echo ""

# 运行分析
python3 analyze_reviews.py "$CSV_FILE"

echo ""
echo "========================================"
echo "  ✅ 分析完成！"
echo "========================================"
echo ""
echo "📂 报告位置: output/reports/"
ls -lh output/reports/*.md 2>/dev/null | tail -3
echo ""
