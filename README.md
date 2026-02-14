# ProductReviewAnalysis
电商产品评论分析系统 - 从用户评价中提取需求，生成营销文案

## 🌟 主要功能

| 功能模块 | 说明 |
|---------|------|
| 🕷️ **评论爬虫** | 支持淘宝/天猫平台批量爬取评论数据 |
| 📊 **数据清洗** | 过滤默认好评、去重、合并初评/追评 |
| 🔑 **关键词提取** | 识别用户最关注的核心词汇 |
| 😊 **情感分析** | 分析用户情绪，识别正面/负面评论 |
| 📈 **方面-观点挖掘** | 按维度分析用户评价（安装/噪音/清洁/吸力等） |
| 🎯 **机会点分析** | 挖掘竞品差异化和产品改进机会 |
| 🎨 **文案生成** | 自动生成落地页文案框架 |
| 🗣️ **话术生成** | 针对不同场景生成推销话术 |

## 🚀 快速开始

### 安装依赖

```bash
pip install -r requirements.txt
```

### 方案选择

#### 🎯 方案A：分析现有数据（推荐，零配置）

```bash
# 使用示例数据分析
python main.py

# 生成深度分析报告
python generate_deep_report.py
```

**优点**：无需配置，立即可用

#### 🕷️ 方案B：手动配置Cookie后爬取

1. 浏览器打开淘宝并登录
2. F12 → Network → 复制Cookie
3. 编辑 `crawler_config.py` 粘贴Cookie
4. 运行 `python run_crawler.py single <产品URL>`

**详细说明**：[替代方案文档](docs/alternative_solutions.md)

#### 🔐 方案C：登录版爬虫（需ChromeDriver）

```bash
python run_crawler_with_login.py <产品URL>
```

**注意**：需要ChromeDriver，可能遇到网络问题

**详细说明**：[登录版爬虫指南](docs/login_crawler_guide.md)

```bash
pip install -r requirements.txt
```

### 1️⃣ 爬取评论数据

#### 🆕 登录版爬虫（推荐）

```bash
python run_crawler_with_login.py <产品URL>
```

**使用说明**：
- 自动打开Chrome浏览器
- 在浏览器中登录淘宝
- 登录成功后自动保存Cookie
- 自动开始爬取评论

**详细文档**：[登录版爬虫使用指南](docs/login_crawler_guide.md)

#### 传统爬虫（需配置Cookie）

```bash
# 单产品爬取
python run_crawler.py single <产品URL>

# 批量爬取
python run_crawler.py batch <URL1> <URL2> <URL3> ...

# 从文件读取URL
python run_crawler.py file products.txt
```

### 2️⃣ 分析评论数据

```bash
# 使用默认数据文件运行
python3 main.py

# 使用自定义数据文件
python3 main.py --data /path/to/your/data.xlsx

# 不生成图表（更快）
python3 main.py --no-charts
```

### 3️⃣ 生成深度分析报告

```bash
python3 generate_deep_report.py
```

## 📁 项目结构

```
ProductReviewAnalysis/
├── main.py                 # 主程序入口（评论分析）
├── generate_deep_report.py # 深度分析报告生成
├── run_crawler.py         # 爬虫运行脚本
├── test_crawler.py        # 爬虫功能测试
├── crawler_config.py      # 爬虫配置文件
├── requirements.txt        # 依赖包列表
├── src/
│   ├── config.py          # 配置文件
│   ├── data_loader.py     # 数据加载与清洗
│   ├── analyzer.py        # 评论分析核心
│   ├── reporter.py        # 报告生成器
│   ├── opportunity_analyzer.py  # 机会点分析
│   └── crawler/          # 爬虫模块
│       ├── base.py        # 爬虫基类
│       ├── taobao.py      # 淘宝爬虫
│       └── engine.py     # 批量爬虫引擎
├── data/
│   └── processed_reviews.csv  # 清洗后的数据
├── output/
│   ├── reports/           # 分析报告
│   ├── crawler/           # 爬虫输出
│   └── images/            # 可视化图表
├── docs/
│   └── crawler_guide.md   # 爬虫使用指南
└── 电商产品评价-示例数据.xlsx
```

## 📊 分析结果示例

### 各维度用户评价
- **外观设计**: 73.5% 正面率 ⭐⭐⭐⭐
- **功能操作**: 73.3% 正面率 ⭐⭐⭐⭐
- **性价比**: 79.6% 正面率 ⭐⭐⭐⭐⭐

### 落地页文案框架
- **主标题**: 高颜值，让厨房更出众
- **核心卖点**: 自动提取并排序
- **用户证言**: 真实评价摘录

## 🎯 深度分析报告

深度分析报告包含：

- **竞品差异化机会** - 超越竞品的切入点
- **产品迭代机会** - 用户反馈的改进方向
- **营销场景机会** - 场景化营销切入点
- **用户群体机会** - 不同用户群体的精准画像
- **服务提升机会** - 服务流程优化建议

## 📝 数据格式要求

### 爬取的数据格式

爬虫自动生成以下格式：

| 列名 | 说明 |
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

### 导入数据的格式

如果你想导入自己的评论数据，Excel文件需包含以下列：

| 列名 | 说明 | 必填 |
|------|------|------|
| 序号 | 评论编号 | 是 |
| 用户昵称 | 用户名称 | 是 |
| 评价时间 | 评论日期 | 是 |
| SKU | 产品型号 | 是 |
| 初评内容 | 首次评价 | 是 |
| 追评内容 | 追加评价 | 否 |

## ⚠️ 重要提示

### 爬虫状态说明

**淘宝/天猫爬虫**：需要配置Cookie才能使用

- ⚠️ 直接请求会被重定向到登录页
- ✅ 数据结构完整，可正常使用
- ✅ 配置Cookie后可正常爬取
- 📖 详细说明：[爬虫状态文档](docs/taobao_crawler_status.md)

**快速开始使用系统**：
```bash
# 使用示例数据分析（无需爬虫）
python main.py

# 生成深度分析报告
python generate_deep_report.py
```

### 爬虫使用须知

1. 请遵守目标网站的robots.txt和使用条款
2. 合理设置请求间隔，避免对服务器造成压力
3. 爬取的数据仅供学习研究使用
4. 请勿将爬虫用于商业用途或恶意目的
5. 大规模爬取可能存在法律风险，请谨慎使用

### 反爬应对策略

- 使用真实Cookie（参考 `docs/crawler_guide.md`）
- 增加请求间隔（建议3-5秒）
- 避免大批量同时爬取

## 📚 文档

- [爬虫使用指南](docs/crawler_guide.md) - 详细的爬虫使用说明

## 🔄 未来计划

- [ ] 支持更多电商平台（京东、亚马逊等）
- [ ] 增加更多可视化图表（词云图、情感趋势图）
- [ ] 竞品对比分析功能
- [ ] 用户画像自动生成
- [ ] Web界面支持
