# 淘宝评论助手 安装指南

版本：v3.1.0

## 1. 环境要求

- Chrome 114 或更高版本（推荐）
- 或 Edge 114 或更高版本
- 需要支持 Manifest V3 和 Side Panel API

## 2. 安装步骤

1. 打开扩展管理页：`chrome://extensions/`
2. 打开右上角“开发者模式”
3. 点击“加载已解压的扩展程序”
4. 选择 `extension` 目录（包含 `manifest.json`）
5. 安装后点击扩展图标，浏览器会打开侧边栏

## 3. 使用方法

### 3.1 提取评论

1. 打开淘宝/天猫商品详情页
2. 点击扩展图标打开侧边栏
3. 在“评论”标签页点击“开始提取”
4. 提取完成后点击“导出 CSV”

### 3.2 提取问答

1. 切换到“问答”标签页
2. 点击“开始提取”
3. 提取完成后点击“导出问答”

### 3.3 一键分析

1. 在评论提取完成后点击“一键分析”
2. 复制界面生成的命令
3. 在项目根目录终端执行命令

## 4. 配置说明

编辑 `config.js` 中的 `window.REVIEW_HELPER_CONFIG`：

```javascript
{
  MAX_PAGES: 100,
  MAX_REVIEWS_PER_PAGE: 50,
  SCROLL_DELAY: 3000,
  PAGE_TURN_DELAY: 2000,
  MAX_NO_CHANGE_COUNT: 10,

  FILE_PREFIX: '评论数据',
  CSV_ADD_BOM: true,
  DATE_FORMAT: 'YYYY年MM月DD日',

  PROGRESS_BASE: 100,
  EXTRACTION_TIMEOUT: 600000,

  DEBUG_MODE: false,
  CONSOLE_LOG: true
}
```

## 5. 权限说明

### 5.1 基础权限

- `activeTab`：访问当前标签页
- `downloads`：导出数据文件
- `storage`：本地存储配置和状态
- `scripting`：执行页面脚本
- `sidePanel`：打开侧边栏

### 5.2 站点权限

- `https://*.taobao.com/*`
- `https://*.tmall.com/*`
- `https://*.tmall.hk/*`
- `https://*.world.tmall.com/*`
- `https://*.import.tmall.com/*`
- `https://detail.tmall.com/*`
- `https://detail.tmall.hk/*`

## 6. 常见问题

### 6.1 侧边栏无法打开

- 检查浏览器版本是否 >= 114
- 确认扩展已启用
- 刷新商品页后重试

### 6.2 页面提示不支持

- 确认当前页是商品详情页
- 确认域名属于淘宝/天猫支持范围

### 6.3 提取数量异常

- 确认已登录账号
- 等待页面评论/问答区加载完成后再开始
- 网络不稳定时重试

### 6.4 导出失败

- 检查浏览器下载权限
- 检查下载目录可写

## 7. 相关文档

- 说明文档：`README.md`
- 更新日志：`UPDATE_LOG.md`
- 结构说明：`STRUCTURE.md`
