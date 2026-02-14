# -*- coding: utf-8 -*-
"""
爬虫配置文件

说明：
1. 复制此文件为 crawler_config_local.py
2. 填写你的配置信息
3. 敏感信息请勿提交到代码仓库
"""

# ========== 请求配置 ==========
REQUEST_CONFIG = {
    # 请求超时时间（秒）
    'timeout': 30,

    # 请求间隔（秒）- 建议设为2秒以上避免被限制
    'delay': 2.0,

    # 最大重试次数
    'max_retry': 3,
}

# ========== 爬取配置 ==========
CRAWL_CONFIG = {
    # 默认最大页数
    'max_pages': 50,

    # 每页评论数（淘宝API限制）
    'reviews_per_page': 20,

    # 批量爬取时任务间隔（秒）
    'task_delay': 5.0,

    # 是否使用代理
    'use_proxy': False,

    # 代理池列表
    'proxies': [],
}

# ========== 存储配置 ==========
STORAGE_CONFIG = {
    # 输出目录
    'output_dir': 'output/crawler',

    # 批量保存大小（条数）
    'batch_size': 100,
}

# ========== 淘宝专用配置 ==========
TAOBAO_CONFIG = {
    # Cookie（可选，但建议填写以提高成功率）
    # 获取方式：浏览器登录淘宝 -> F12 -> Network -> 复制Cookie
    'cookie': 'sca=acf0c6a7; cna=hsIVIkudtQkCAW83SYg3b54l; cnaui=1763892183; aui=1763892183; tbsa=6b5666a81d230738ad77d640_1770968789_2; atpsida=34532a8a640297905ca6e218_1770968789_4',

    # User-Agent（可选）
    'user_agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',

    # Referer
    'referer': 'https://www.taobao.com/',
}

# ========== 日志配置 ==========
LOG_CONFIG = {
    'level': 'INFO',
    'save_log': True,
    'log_file': 'output/crawler/crawler.log',
}


# ========== 使用说明 ==========
"""
配置说明：

1. Cookie获取方式：
   - 打开浏览器，访问 https://www.taobao.com
   - 按F12打开开发者工具
   - 切换到Network标签
   - 刷新页面，找到任意请求
   - 在请求头中找到Cookie，复制完整内容

2. 请求延迟建议：
   - 单产品爬取：2-5秒
   - 批量爬取：5-10秒
   - 大量爬取：10秒以上

3. 反爬应对：
   - 使用真实Cookie
   - 适当增加请求延迟
   - 避免高频请求同一IP
   - 使用代理池（可选）

4. 输出格式：
   - 默认输出为Excel格式
   - 兼容现有分析系统
"""
