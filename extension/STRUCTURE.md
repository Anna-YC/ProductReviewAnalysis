# 插件目录结构

```
extension/
├── manifest.json          # 插件配置文件
├── popup.html             # 弹出页面
├── popup.js               # 弹出页面逻辑
├── content.js             # 内容脚本（抓取核心）
├── config.js              # 配置文件
├── styles.css             # 样式文件
│
├── icons/                 # 图标目录
│   ├── icon16.png
│   ├── icon48.png
│   ├── icon128.png
│   └── README.md
│
├── build.js               # 构建脚本
├── package.json           # NPM配置
│
├── README.md              # 项目说明
├── INSTALL.md             # 安装指南
├── UPDATE_LOG.md          # 更新日志
├── STRUCTURE.md           # 本文件
│
└── .gitignore             # Git忽略配置
```

## 文件说明

### 核心文件

| 文件 | 大小 | 说明 |
|------|------|------|
| manifest.json | ~1KB | Chrome插件配置，定义权限和入口 |
| popup.html | ~4KB | 弹出页面结构 |
| popup.js | ~13KB | 弹出页面交互逻辑 |
| content.js | ~29KB | 内容脚本，包含所有抓取逻辑 |
| config.js | ~1KB | 可配置参数 |
| styles.css | ~4KB | 统一样式定义 |

### 文档文件

| 文件 | 用途 |
|------|------|
| README.md | 项目主文档 |
| INSTALL.md | 安装说明 |
| UPDATE_LOG.md | 版本更新记录 |
| STRUCTURE.md | 目录结构说明 |

### 构建文件

| 文件 | 用途 |
|------|------|
| package.json | NPM包配置 |
| build.js | 打包脚本 |
| .gitignore | Git忽略规则 |

## 依赖关系

```
popup.html
    ├── styles.css
    ├── config.js
    └── popup.js
            └── chrome.runtime.sendMessage → content.js
```

## 权限流程

```
用户点击popup
    ↓
popup.js 发送消息
    ↓
chrome.runtime (消息传递)
    ↓
content.js 执行抓取
    ↓
返回数据到popup.js
    ↓
生成CSV并下载
```

## 独立运行

本插件已独立封装，可脱离主项目使用：

1. **安装**：直接加载到Chrome
2. **运行**：点击图标开始抓取
3. **导出**：下载CSV/Excel文件

可选集成：
- 与主项目分析系统配合使用
- 使用 analyze_bridge.py 进行数据转换
