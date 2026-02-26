#!/bin/bash
# 打包插件用于分发

OUTPUT_DIR="dist"
EXTENSION_NAME="taobao-review-helper"
VERSION="2.9.2"

# 创建输出目录
mkdir -p "$OUTPUT_DIR"

# 打包核心文件（排除不必要的文件）
zip -r "${OUTPUT_DIR}/${EXTENSION_NAME}-v${VERSION}.zip" \
    manifest.json \
    popup.html \
    popup.js \
    content.js \
    config.js \
    styles.css \
    README.md \
    INSTALL.md \
    icons/ \
    -x "*.backup" \
    -x "*/node_modules/*" \
    -x ".gitignore"

echo "✅ 打包完成: ${OUTPUT_DIR}/${EXTENSION_NAME}-v${VERSION}.zip"
echo ""
echo "📤 发送此文件给其他人使用"
echo "📖 解压后加载到Chrome扩展程序即可"
