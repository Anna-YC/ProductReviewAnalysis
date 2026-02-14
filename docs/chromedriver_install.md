# 🔧 ChromeDriver安装指南

## 问题说明

程序需要ChromeDriver来控制Chrome浏览器，但自动下载遇到了网络问题。

## 解决方案

### 方案1：手动下载ChromeDriver（推荐）

#### 步骤1：查看Chrome版本

在Chrome地址栏输入：
```
chrome://settings/help
```
查看版本号，例如：`131.0.6778.86`

#### 步骤2：下载对应ChromeDriver

访问ChromeDriver下载页面：
```
https://googlechromelabs.github.io/chrome-for-testing/
```

或直接下载：
```
https://chromedriver.chromium.org/downloads
```

选择与你的Chrome版本匹配的ChromeDriver。

#### 步骤3：解压并移动

```bash
# 解压
unzip chromedriver_mac64.zip

# 移动到PATH
sudo mv chromedriver /usr/local/bin/

# 添加执行权限
sudo chmod +x /usr/local/bin/chromedriver
```

#### 步骤4：验证安装

```bash
chromedriver --version
```

### 方案2：使用Homebrew安装

```bash
# 如果之前安装失败，先清理
brew cleanup

# 重新安装
brew install chromedriver
```

### 方案3：修改代码手动指定路径

如果你已经下载了ChromeDriver，可以修改代码指定路径。

编辑 `src/crawler/taobao_with_login.py`，找到这一行：

```python
service = Service(ChromeDriverManager().install())
```

替换为：

```python
# 使用指定的ChromeDriver路径
service = Service('/path/to/your/chromedriver')
```

例如：

```python
service = Service('/Users/你的用户名/Downloads/chromedriver')
```

### 方案4：创建软链接

如果你下载了ChromeDriver到某个目录，创建软链接：

```bash
# 假设下载到 ~/Downloads
ln -s ~/Downloads/chromedriver /usr/local/bin/chromedriver

# 添加执行权限
chmod +x ~/Downloads/chromedriver
```

## 验证安装

安装完成后，验证：

```bash
# 检查版本
chromedriver --version

# 检查位置
which chromedriver
```

## 测试程序

安装ChromeDriver后，重新运行：

```bash
python run_crawler_with_login.py https://detail.tmall.com/item.htm?id=670501324868
```

## 常见问题

### Q1: Chrome版本与ChromeDriver不匹配

**A**: 下载与Chrome版本匹配的ChromeDriver

### Q2: 提示"无法连接"

**A**:
1. 检查网络连接
2. 如果在中国，可能需要使用代理或VPN
3. 尝试手动下载

### Q3: 权限问题

**A**: 确保ChromeDriver有执行权限
```bash
chmod +x /usr/local/bin/chromedriver
```

## macOS快速安装

如果你在macOS上，可以尝试：

```bash
# 使用Homebrew
brew install --cask chromedriver

# 或使用MacPorts
sudo port install chromedriver
```

## 临时替代方案

如果暂时无法安装ChromeDriver，可以：

1. **使用现有数据分析**
   ```bash
   python main.py
   ```

2. **手动整理评论**
   - 复制评论到Excel
   - 使用系统分析

3. **等待网络改善后重试**
   - 更换网络环境
   - 使用代理/VPN
