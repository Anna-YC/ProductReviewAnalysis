# 🕷️ 电商评论爬虫使用指南

## 快速开始

### 1. 安装依赖

```bash
pip install -r requirements.txt
```

### 2. 运行爬虫

#### 单产品爬取
```bash
python run_crawler.py single <产品URL>
```

#### 批量爬取
```bash
python run_crawler.py batch <URL1> <URL2> <URL3> ...
```

#### 从文件读取URL
创建 `products.txt`（每行一个URL）：
```
https://detail.tmall.com/item.htm?id=123456
https://item.taobao.com/item.htm?id=789012
```

运行：
```bash
python run_crawler.py file products.txt
```

### 3. 查看结果

数据保存在 `output/crawler/` 目录下，格式为Excel。

## 命令行参数说明

```
python run_crawler.py <mode> [options]

运行模式:
  single     爬取单个产品
  batch      批量爬取多个产品
  file       从文件读取URL并爬取

通用参数:
  --pages, -p      最大页数 (默认: 10)
  --output, -o     输出文件名
  --delay          请求间隔秒数 (默认: 2.0)

单产品模式参数:
  --url, -u        产品URL

批量模式参数:
  --urls           多个产品URL

文件模式参数:
  --file, -f       包含URL的文件
  --column, -c     URL列名 (默认: url)
```

## 使用示例

### 示例1：爬取单个产品
```bash
python run_crawler.py single \
  "https://detail.tmall.com/item.htm?id=123456" \
  --pages 50 \
  --output my_product.xlsx
```

### 示例2：批量爬取多个产品
```bash
python run_crawler.py batch \
  "https://detail.tmall.com/item.htm?id=123456" \
  "https://detail.tmall.com/item.htm?id=789012" \
  --pages 20 \
  --delay 3.0
```

### 示例3：从Excel文件读取URL
创建 `products.xlsx`，包含 `url` 列：

| url |
|-----|
| https://detail.tmall.com/item.htm?id=123456 |
| https://detail.tmall.com/item.htm?id=789012 |

运行：
```bash
python run_crawler.py file products.xlsx --column url
```

## 配置说明

编辑 `crawler_config.py` 文件：

```python
# 请求延迟（秒）- 避免被限制
REQUEST_CONFIG = {
    'delay': 2.0,  # 建议2-5秒
}

# 淘宝Cookie（可选，但建议填写）
TAOBAO_CONFIG = {
    'cookie': 'your_cookie_here',
}
```

### 获取Cookie的方法

1. 打开浏览器，访问淘宝网
2. 按 F12 打开开发者工具
3. 切换到 Network 标签
4. 刷新页面，找到任意请求
5. 在请求头中找到 Cookie，复制完整内容
6. 粘贴到配置文件的 `cookie` 字段

## 输出格式

爬取的数据包含以下字段：

| 字段 | 说明 |
|------|------|
| 评论ID | 唯一标识 |
| 用户昵称 | 用户名称（脱敏） |
| 用户等级 | 会员等级 |
| 评价时间 | 评论时间 |
| SKU | 产品规格 |
| 评分 | 1-5星 |
| 初评内容 | 首次评价 |
| 追评内容 | 追加评价 |
| 追评时间 | 追评时间 |
| 有图片 | 是否包含图片 |
| 商家回复 | 商家回复内容 |

## 常见问题

### 1. 爬取失败/数据为空

**可能原因**：
- Cookie失效
- 请求过于频繁被限制
- 产品链接无效

**解决方法**：
- 更新Cookie
- 增加请求延迟 `--delay 5`
- 验证产品链接是否正确

### 2. 反爬限制

**应对策略**：
- 使用真实Cookie
- 增加请求间隔（建议3-5秒）
- 避免大批量同时爬取
- 使用代理IP（可选）

### 3. 只能爬取少量评论

**原因**：淘宝API限制，需要翻页

**解决方法**：
- 增加 `--pages` 参数
- 单个产品建议不超过100页

## 注意事项

⚠️ **重要提醒**：

1. 请遵守目标网站的robots.txt和使用条款
2. 合理设置请求间隔，避免对服务器造成压力
3. 爬取的数据仅供学习研究使用
4. 请勿将爬虫用于商业用途或恶意目的
5. 大规模爬取可能存在法律风险，请谨慎使用

## Python代码调用

```python
from src.crawler import CrawlerEngine, TaobaoCrawler

# 方式1：单产品爬取
crawler = TaobaoCrawler()
for reviews in crawler.fetch_reviews("https://detail.tmall.com/item.htm?id=123456"):
    for review in reviews:
        print(review.content)

# 方式2：批量爬取
engine = CrawlerEngine()
engine.crawl_batch([
    "https://detail.tmall.com/item.htm?id=123456",
    "https://detail.tmall.com/item.htm?id=789012",
], max_pages=20)

# 保存结果
engine.save_results("output.xlsx")
```

## 下一步

爬取数据后，使用分析系统进行处理：

```bash
python main.py --data output/crawler/output.xlsx
```
