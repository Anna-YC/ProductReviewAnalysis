# 🔐 淘宝爬虫登录版使用指南

## 功能说明

这是一个带自动登录功能的淘宝爬虫，解决了Cookie配置复杂和过期的问题。

### 工作流程

```
1. 自动打开Chrome浏览器
   ↓
2. 用户在浏览器中登录（密码/扫码）
   ↓
3. 检测登录成功
   ↓
4. 自动获取并保存Cookie
   ↓
5. 开始爬取评论数据
```

## 快速开始

### 1. 安装依赖

```bash
pip install selenium webdriver-manager
```

### 2. 运行爬虫

#### 方式A：命令行参数

```bash
python run_crawler_with_login.py <产品URL> [最大页数]
```

#### 方式B：交互式输入

```bash
python run_crawler_with_login.py
# 然后按提示输入URL
```

### 3. 登录过程

1. **浏览器自动打开**
   - Chrome浏览器会自动启动
   - 显示淘宝登录页面

2. **完成登录**
   - 方式1：账号密码登录
   - 方式2：扫码登录（推荐）
   - 方式3：淘宝App扫码

3. **等待检测**
   - 登录成功后程序会自动检测
   - 无需手动操作

4. **保存Cookie**
   - Cookie自动保存到 `output/crawler/taobao_cookies.json`
   - 下次使用会自动加载，无需重新登录

5. **开始爬取**
   - 按Enter确认后开始爬取
   - 评论数据自动保存

## 使用示例

### 示例1：爬取单个产品

```bash
python run_crawler_with_login.py https://detail.tmall.com/item.htm?id=670501324868
```

### 示例2：指定最大页数

```bash
python run_crawler_with_login.py https://detail.tmall.com/item.htm?id=670501324868 50
```

### 示例3：交互式运行

```bash
python run_crawler_with_login.py
# 输入产品URL: https://detail.tmall.com/item.htm?id=670501324868
# 输入最大页数: 20
```

## Cookie管理

### Cookie保存位置

```
output/crawler/taobao_cookies.json
```

### Cookie自动加载

- 程序会自动检查是否存在已保存的Cookie
- 如果存在且未过期，直接使用，跳过登录
- 如果使用失败，会提示重新登录

### Cookie有效期

- 通常7-30天
- 失效后重新运行程序即可

## 输出文件

爬取的数据保存在：

```
output/crawler/评论数据_20260213_HHMMSS.xlsx
```

格式兼容现有分析系统，可直接用于：

```bash
python main.py --data output/crawler/评论数据_xxx.xlsx
```

## 常见问题

### Q1: 提示"无法启动浏览器"

**A**: 需要安装ChromeDriver

**macOS**:
```bash
brew install chromedriver
```

**或使用webdriver-manager自动下载**:
```bash
pip install webdriver-manager
```

### Q2: 浏览器打开但页面空白

**A**: 网络问题或淘宝访问限制

- 检查网络连接
- 尝试使用VPN（如果需要）

### Q3: 登录后没有自动检测到

**A**: 可能需要手动跳转

- 登录成功后，访问任意淘宝页面
- 或按Ctrl+C跳过等待，手动输入Enter继续

### Q4: Cookie保存失败

**A**: 检查输出目录权限

```bash
mkdir -p output/crawler
chmod 755 output/crawler
```

### Q5: 二次使用仍需登录

**A**: Cookie可能过期

- 淘宝Cookie有效期约7-30天
- 过期后重新登录即可

## 技术说明

### 依赖项

- **Selenium**: 浏览器自动化
- **Chrome**: 目标浏览器（需已安装）
- **ChromeDriver**: 浏览器驱动（自动或手动安装）

### 安全性

- Cookie保存在本地，不上传
- 浏览器是真实用户操作
- 不涉及第三方Cookie分享

### 与手动配置Cookie对比

| 特性 | 手动配置Cookie | 登录版 |
|------|----------------|---------|
| 配置难度 | 需要F12查找Cookie | 无需配置 |
| Cookie有效期 | 需定期更新 | 自动保存/加载 |
| 使用难度 | 需要技术知识 | 无需技术知识 |
| 安全性 | Cookie可能泄露 | 本地保存更安全 |

## 浏览器选项

### 默认配置

- 非无头模式（可见浏览器）
- 禁用自动化检测
- 禁用沙箱

### 无头模式（不推荐）

如需无头模式，修改代码：

```python
# 在 src/crawler/taobao_with_login.py 中
self.open_login_page(headless=True)
```

注意：无头模式可能增加登录难度。

## 完整工作流

```
1. 安装依赖
   pip install selenium webdriver-manager

2. 运行爬虫
   python run_crawler_with_login.py <产品URL>

3. 浏览器登录
   在自动打开的Chrome中登录

4. 等待爬取完成
   评论自动保存到 output/crawler/

5. 分析数据
   python main.py --data output/crawler/评论数据_xxx.xlsx
```

## 下一步

爬取完成后：

1. **分析评论数据**
   ```bash
   python main.py --data output/crawler/评论数据_xxx.xlsx
   ```

2. **生成深度报告**
   ```bash
   python generate_deep_report.py
   ```

3. **查看营销文案**
   - 落地页文案：`output/reports/营销文案报告_xxx.md`
   - 机会点分析：`output/reports/产品深度分析报告_xxx.md`

---

## 安全提醒

⚠️ **重要**:

1. Cookie文件包含登录凭证，请勿分享给他人
2. 建议添加 `output/crawler/` 到 `.gitignore`
3. 公开代码时删除或忽略Cookie文件
4. 仅用于学习和研究目的
