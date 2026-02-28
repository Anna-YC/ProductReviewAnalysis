#!/bin/bash
# 打包插件用于分发

OUTPUT_DIR="dist"
EXTENSION_NAME="taobao-review-helper"
VERSION="3.1.0"

# 创建输出目录
mkdir -p "$OUTPUT_DIR"

# 创建临时打包目录
TEMP_DIR="${OUTPUT_DIR}/${EXTENSION_NAME}-v${VERSION}"
rm -rf "$TEMP_DIR"
mkdir -p "$TEMP_DIR"

# 复制文件到临时目录（侧边栏版本，需要包含 background.js 和侧边栏文件）
cp manifest.json background.js popup.html sidepanel.html sidepanel.js sidepanel.css popup.js content.js config.js styles.css README.md INSTALL.md "$TEMP_DIR/"
cp -r icons "$TEMP_DIR/"

# 在临时目录中打包为 zip
cd "$OUTPUT_DIR"
zip -r "${EXTENSION_NAME}-v${VERSION}.zip" "${EXTENSION_NAME}-v${VERSION}/"

# 清理临时目录
rm -rf "$TEMP_DIR"

echo "✅ 打包完成: ${OUTPUT_DIR}/${EXTENSION_NAME}-v${VERSION}.zip"
echo ""
echo "📤 使用说明："
echo "   1. 解压 zip 文件"
echo "   2. 在 Chrome 中选择解压后的文件夹: ${EXTENSION_NAME}-v${VERSION}"
echo ""
echo "🎯 点击扩展图标即可打开侧边栏！"

