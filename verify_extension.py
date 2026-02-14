#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Chrome插件安装验证脚本
"""
import webbrowser
from pathlib import Path

print("=" * 70)
print("  🔍 Chrome插件安装验证")
print("=" * 70)
print()

# 检查文件
print("📂 检查插件文件...")
print()

extension_dir = Path('extension_ready')

files_to_check = [
    ('manifest.json', '插件配置文件'),
    ('popup.html', '用户界面文件'),
    ('content.js', '内容脚本'),
    ('icons/', '图标目录（如果存在）'),
]

all_exist = True
for filename, description in files_to_check:
    file_path = extension_dir / filename
    exists = file_path.exists()
    status = "✅" if exists else "❌"
    print(f"  {status} {filename:20s} - {description}")

    if not exists and not filename.endswith('/'):
        all_exist = False

print()

if all_exist:
    print("✅ 所有必需文件都存在！")
else:
    print("⚠️  部分文件缺失，但可能不影响使用")

print()

# 验证manifest.json
manifest_file = extension_dir / 'manifest.json'
if manifest_file.exists():
    import json

    with open(manifest_file, 'r', encoding='utf-8') as f:
        manifest = json.load(f)

    print("📋 Manifest验证:")
    print(f"  ✅ 名称: {manifest.get('name')}")
    print(f"  ✅ 版本: {manifest.get('version')}")
    print(f"  ✅ 权限: {', '.join(manifest.get('permissions', []))}")
    print()

print("=" * 70)
print("  📦 安装说明")
print("=" * 70)
print()

print("方法1：拖入安装（推荐）")
print()
print("  步骤1：打开Chrome浏览器")
print("  步骤2：在地址栏输入: chrome://extensions/")
print("  步骤3：在打开的页面右上角，启用「开发者模式」")
print("  步骤4：打开Finder，找到 extension_ready 文件夹")
print("  步骤5：将 extension_ready 文件夹拖入 Chrome 的扩展程序页面")
print("  步骤6：看到「淘宝评论助手」卡片，安装成功！")
print()

print("方法2：加载已解压的扩展")
print()
print("  步骤1：打开Chrome浏览器")
print("  步骤2：在地址栏输入: chrome://extensions/")
print("  步骤3：找到「淘宝评论助手」或类似名称")
print("  步骤4：点击「加载已解压的扩展」")
print("  步骤5：选择 extension_ready 文件夹")
print("  步骤6：点击「选择文件夹」")
print()

print("=" * 70)
print("  🎯 安装后验证")
print("=" * 70)
print()

print("验证步骤：")
print()
print("  1. 检查Chrome工具栏是否有插件图标")
print("  2. 打开淘宝或天猫任意商品页面")
print("  3. 点击右上角的插件图标（应该显示为「淘宝评论助手」）")
print("  4. 应该弹出一个小窗口，显示使用说明")
print("  5. 如果看到这些，说明安装成功！")
print()

print("=" * 70)
print("  🚀 安装后的下一步")
print("=" * 70)
print()
print("1. 登录淘宝/天猫（如果还没有登录）")
print("2. 搜索并打开任意商品详情页")
print("3. 点击插件图标，等待窗口弹出")
print("4. 点击「开始爬取评论」按钮")
print("5. 等待爬取完成")
print("6. 点击「导出数据」")
print()

print("如果有任何问题，请查看：")
print("  - extension/README.md (详细使用说明)")
print("  - PROJECT_SUMMARY.md (完整项目文档)")
print()
