# 🚀 快速开始指南

## 📍 重要：先进入项目目录

**所有命令都必须在项目根目录下运行！**

```bash
cd "/Users/AI 项目/Vibe Coding/ProductReviewAnalysis"
```

---

## ⚡ 最快方式：一键分析

### 方法1：使用脚本（推荐）

```bash
# 进入项目目录
cd "/Users/AI 项目/Vibe Coding/ProductReviewAnalysis"

# 自动分析最新的评论数据
./run_analysis.sh

# 或分析指定文件
./run_analysis.sh output/crawler/评论数据_2026-02-22T12-08-36.csv
```

### 方法2：直接运行 Python

```bash
# 进入项目目录
cd "/Users/AI 项目/Vibe Coding/ProductReviewAnalysis"

# 分析最新文件
python3 analyze_reviews.py output/crawler/评论数据_xxx.csv
```

**注意：**
- ✅ 正确：`python3 analyze_reviews.py output/crawler/评论数据_xxx.csv`
- ❌ 错误：`python3 analyze_reviews.py "output/crawler/评论数据_xxx.csv"`（在其他目录运行）

---

## 📋 完整工作流程

### 第一步：插件抓取数据

1. 打开淘宝/天猫商品页
2. 点击插件图标
3. 点击 **"开始爬取评论"**
4. 等待抓取完成（如：534条）
5. 点击 **"📊 一键分析"** 按钮
6. 数据自动保存到 `output/crawler/` 目录

### 第二步：终端运行分析

```bash
# 1. 进入项目目录
cd "/Users/AI 项目/Vibe Coding/ProductReviewAnalysis"

# 2. 查看保存的文件名
ls output/crawler/

# 3. 运行分析（使用脚本）
./run_analysis.sh

# 或指定文件
./run_analysis.sh output/crawler/评论数据_2026-02-22T12-08-36.csv
```

### 第三步：查看报告

```bash
# 查看生成的报告
ls output/reports/

# 打开报告
cat output/reports/营销文案报告_xxx.md
cat output/reports/产品深度分析报告_xxx.md
```

---

## 🔧 常见问题

### Q1: 提示 "No such file or directory"

**原因：** 不在项目根目录运行

**解决：**
```bash
# 先进入项目目录
cd "/Users/AI 项目/Vibe Coding/ProductReviewAnalysis"

# 再运行命令
python3 analyze_reviews.py output/crawler/评论数据_xxx.csv
```

### Q2: 找不到 CSV 文件

**检查文件是否存在：**
```bash
ls -la output/crawler/
```

**如果没有文件：**
- 确保已点击插件的"一键分析"按钮
- 或点击"导出数据"按钮手动导出

### Q3: Windows 系统怎么运行？

**方法一：使用 PowerShell**
```powershell
cd "C:\Users\你的用户名\ProductReviewAnalysis"
python analyze_reviews.py output\crawler\评论数据_xxx.csv
```

**方法二：使用批处理脚本**
```cmd
cd "C:\Users\你的用户名\ProductReviewAnalysis"
run_analysis.bat
```

### Q4: 如何分析多个商品？

```bash
# 进入项目目录
cd "/Users/AI 项目/Vibe Coding/ProductReviewAnalysis"

# 批量分析所有评论文件
for file in output/crawler/评论数据_*.csv; do
    echo "正在分析: $file"
    python3 analyze_reviews.py "$file"
    echo ""
done
```

---

## 📁 目录结构

```
ProductReviewAnalysis/           ← 项目根目录（在这里运行命令）
├── analyze_reviews.py           ← 分析脚本
├── run_analysis.sh              ← Mac/Linux 一键脚本
├── run_analysis.bat             ← Windows 一键脚本
├── output/
│   ├── crawler/                 ← 插件保存的CSV文件
│   │   └── 评论数据_xxx.csv
│   └── reports/                 ← 生成的报告
│       ├── 营销文案报告_xxx.md
│       └── 产品深度分析报告_xxx.md
└── ...
```

---

## 💡 快捷命令

### Mac/Linux

```bash
# 添加到 .bashrc 或 .zshrc，创建快捷方式
alias review-analysis='cd "/Users/AI 项目/Vibe Coding/ProductReviewAnalysis" && ./run_analysis.sh'

# 然后只需运行
review-analysis
```

### Windows

创建一个快捷方式：
1. 右键桌面 → 新建 → 快捷方式
2. 位置：`C:\Windows\System32\cmd.exe /k "cd C:\Users\用户名\ProductReviewAnalysis && python analyze_reviews.py"`
3. 命名为"评论分析"

---

## ✅ 检查清单

运行分析前，请确认：

- [ ] 已进入项目根目录
- [ ] CSV 文件存在于 `output/crawler/` 目录
- [ ] Python 3.8+ 已安装
- [ ] 依赖已安装：`pip install -r requirements.txt`

---

## 🎯 总结

**记住两点：**
1. **先进入项目目录**：`cd "/Users/AI 项目/Vibe Coding/ProductReviewAnalysis"`
2. **使用脚本更简单**：`./run_analysis.sh`

有任何问题请检查上面的常见问题部分！
