# 🍪 淘宝Cookie获取详细指南

## 方法一：Chrome浏览器获取（推荐）

### 步骤1：打开淘宝并登录

1. 打开Chrome浏览器
2. 访问 https://www.taobao.com
3. 登录你的淘宝账号

### 步骤2：打开开发者工具

**方式A**：快捷键
- Mac: `Command + Option + I`
- Windows: `F12` 或 `Ctrl + Shift + I`

**方式B**：右键菜单
- 在页面任意位置点击右键
- 选择"检查"或"Inspect"

### 步骤3：切换到Network标签

在开发者工具顶部，找到并点击 `Network` 标签

### 步骤4：刷新页面或访问商品页

**方式A**：直接在当前页面刷新（`F5`或`Cmd+R`）

**方式B**：访问任意商品页面
```
https://detail.tmall.com/item.htm?id=670501324868
```

### 步骤5：找到请求并复制Cookie

1. 在Network面板中，点击任意一个请求（建议选第一个）
2. 在右侧面板，找到 `Headers` 标签并点击
3. 滚动到 `Request Headers` 部分
4. 找到 `cookie:` 或 `Cookie:` 这一行
5. 复制完整的Cookie值（整行内容）

### Cookie示例格式

```
cookie: cna=xxx; sgcookie=xxx; isg=xxx; track=xxx; ...
```

**只需要复制等号后面的内容**，例如：
```
cna=xxx; sgcookie=xxx; isg=xxx; track=xxx; ...
```

## 方法二：Firefox浏览器

### 步骤1-3：同Chrome

打开淘宝 → 登录 → 打开开发者工具(`F12`)

### 步骤4：切换到Network标签

点击开发者工具顶部的 `网络` 或 `Network` 标签

### 步骤5：获取Cookie

1. 点击任意请求
2. 选择 `标头` 或 `Headers` 标签
3. 在 `请求标头` 中找到 `Cookie`
4. 复制完整内容

## 方法三：Safari浏览器

### 启用开发者菜单（如果未启用）

Safari → 偏好设置 → 高级 → 勾选"在菜单栏中显示开发菜单"

### 获取Cookie

1. 打开淘宝并登录
2. 菜单栏 → 开发 → 显示Web检查器
3. 切换到 `网络` 标签
4. 刷新页面，点击请求
5. 找到 `Cookie` 字段并复制

## 方法四：使用浏览器插件（最简单）

### 推荐插件

**Chrome/Firefox**: "EditThisCookie"
**Safari**: "Cookies"

### 使用步骤

1. 安装插件
2. 登录淘宝
3. 点击插件图标
4. 找到 `taobao.com` 的Cookie
5. 点击导出/复制

## 配置Cookie到系统

### 步骤1：打开配置文件

编辑项目根目录下的 `crawler_config.py`

### 步骤2：粘贴Cookie

找到这一行：
```python
'cookie': '',
```

替换为：
```python
'cookie': '你复制的Cookie内容',
```

### 示例：

```python
TAOBAO_CONFIG = {
    'cookie': 'cna=xxx; sgcookie=xxx; isg=xxx; thw=xxx; v=xxx; ...',
}
```

### 步骤3：保存文件

保存并关闭 `crawler_config.py`

## 验证配置

运行测试命令：

```bash
python test_crawler.py
# 选择 2（单产品爬取测试）
```

如果看到评论数据输出，说明配置成功！

## 常见问题

### Q1: Cookie多久会失效？

**A**: 通常7-30天，具体取决于淘宝的设置。如果爬取失败，重新获取即可。

### Q2: Cookie包含哪些信息？

**A**:
- 登录凭证
- 用户标识
- 会话信息
- 安全令牌

**注意**：Cookie包含你的登录信息，请勿分享给他人！

### Q3: 必须登录才能获取吗？

**A**: 是的，需要登录状态才能获取评论数据。

### Q4: 可以用别人的Cookie吗？

**A**: 不建议。使用他人Cookie存在安全风险，且可能违反使用条款。

### Q5: 配置后仍然无法爬取？

**A**: 检查以下几点：
1. Cookie是否完整复制（不要漏掉分号）
2. 是否有多余的引号
3. Cookie是否已过期（重新获取）
4. 网络连接是否正常

## 保存Cookie的注意事项

### ⚠️ 安全提醒

1. **不要分享** - Cookie包含你的账号信息
2. **定期更新** - Cookie会过期
3. **谨慎存储** - 不要提交到公开仓库
4. **本地使用** - 仅在本地开发环境使用

### 📁 .gitignore建议

确保 `crawler_config.py` 或包含Cookie的文件不会被提交：

```
# 在 .gitignore 中添加
crawler_config.py
*_local.py
```

或者使用单独的本地配置文件：

```python
# crawler_config.py（提交到仓库）
TAOBAO_CONFIG = {
    'cookie': '',  # 空值
}

# crawler_config_local.py（不提交，本地使用）
TAOBAO_CONFIG = {
    'cookie': '你的真实Cookie',
}
```

## 快速参考

### Chrome快捷键

| 操作 | Mac | Windows |
|------|------|---------|
| 开发者工具 | Cmd+Opt+I | F12 |
| 刷新页面 | Cmd+R | F5 |
| 查找 | Cmd+F | Ctrl+F |

### 关键文件路径

```
项目根目录/
├── crawler_config.py          # 主配置文件
├── crawler_config_local.py    # 本地配置（不提交）
└── .gitignore              # Git忽略文件
```

---

获取Cookie后，运行以下命令测试：

```bash
python run_crawler.py single <产品URL>
```

祝使用顺利！
