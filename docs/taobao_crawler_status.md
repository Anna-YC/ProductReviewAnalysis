# 淘宝爬虫使用说明

## 当前状态

⚠️ **淘宝评论API有反爬限制**

淘宝/天猫的评论接口需要登录状态才能获取数据。直接请求会被重定向到登录页面。

## 解决方案

### 方案1：配置Cookie（推荐）

1. **获取Cookie**

   - 打开浏览器，访问 https://www.taobao.com
   - 登录你的淘宝账号
   - 按 F12 打开开发者工具
   - 切换到 Network 标签
   - 刷新页面或访问任意商品
   - 点击任意请求，找到 Request Headers
   - 复制完整的 Cookie 值

2. **配置Cookie**

   编辑 `crawler_config.py` 文件：

   ```python
   TAOBAO_CONFIG = {
       'cookie': '你复制的Cookie内容',
   }
   ```

3. **重新测试**

   ```bash
   python run_crawler.py single <产品URL>
   ```

### 方案2：使用Selenium（备用）

如果Cookie方案不稳定，可以考虑使用Selenium浏览器自动化：

```python
# 安装selenium
pip install selenium

# 示例代码
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC

driver = webdriver.Chrome()
driver.get("https://detail.tmall.com/item.htm?id=670501324868")

# 等待评论加载
# ... 需要分析页面结构

driver.quit()
```

### 方案3：使用现有数据

如果爬取困难，建议：

1. **使用示例数据测试分析功能**
   - 项目已包含示例评论数据
   - 可直接运行分析功能

2. **手动导出评论**
   - 在淘宝商家后台导出评论
   - 或使用第三方评论采集工具
   - 导出后使用本系统分析

## 测试结果

### 模拟测试
- ✅ URL解析功能正常
- ✅ 数据结构定义完整
- ✅ Excel导出格式正确

### 真实API测试
- ❌ 直接请求返回登录页面
- ⚠️ 需要配置有效Cookie

## 后续改进

- [ ] 添加Selenium支持
- [ ] 支持Cookie自动刷新
- [ ] 添加更详细的错误提示
- [ ] 支持更多电商平台（京东、拼多多等）

## 替代方案

如果你需要评论数据进行分析：

1. **使用示例数据**
   ```bash
   python main.py  # 使用内置示例数据
   ```

2. **手动整理评论**
   - 复制网页上的评论到Excel
   - 使用标准格式（参考README）

3. **等待Cookie配置**
   - 按照上述方法获取Cookie
   - 配置后重新测试爬取

## 安全提醒

⚠️ **重要**：

1. Cookie包含你的登录信息，请勿分享给他人
2. 不要将 `crawler_config.py` 提交到公开仓库
3. 建议创建配置副本：`crawler_config_local.py`
4. 定期更新Cookie（有效期约7-30天）
