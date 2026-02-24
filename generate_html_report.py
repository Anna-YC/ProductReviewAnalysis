#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
生成 HTML 可视化分析报告
将 Markdown 报告转换为交互式 HTML 页面

使用方法:
    python3 generate_html_report.py <md文件路径>
    
示例:
    python3 generate_html_report.py output/reports/产品深度分析报告_xxx.md
"""
import sys
import re
import json
from pathlib import Path
from datetime import datetime


# HTML 模板
HTML_TEMPLATE = '''<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{{title}}</title>
    <script src="https://cdn.jsdelivr.net/npm/echarts@5.4.3/dist/echarts.min.js"></script>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC', 'Microsoft YaHei', sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            padding: 20px;
        }
        
        .container {
            max-width: 1200px;
            margin: 0 auto;
            background: #fff;
            border-radius: 20px;
            box-shadow: 0 20px 60px rgba(0,0,0,0.3);
            overflow: hidden;
        }
        
        .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 40px;
            text-align: center;
        }
        
        .header h1 {
            font-size: 2.5em;
            margin-bottom: 10px;
            font-weight: 700;
        }
        
        .header .meta {
            opacity: 0.9;
            font-size: 1.1em;
        }
        
        .stats-cards {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 20px;
            padding: 30px;
            background: #f8f9fa;
        }
        
        .stat-card {
            background: white;
            padding: 25px;
            border-radius: 15px;
            text-align: center;
            box-shadow: 0 4px 15px rgba(0,0,0,0.08);
            transition: transform 0.3s;
        }
        
        .stat-card:hover {
            transform: translateY(-5px);
        }
        
        .stat-card .number {
            font-size: 2.5em;
            font-weight: 700;
            color: #667eea;
            margin-bottom: 5px;
        }
        
        .stat-card .label {
            color: #666;
            font-size: 0.95em;
        }
        
        .content {
            padding: 40px;
        }
        
        .section {
            margin-bottom: 40px;
        }
        
        .section-title {
            font-size: 1.8em;
            color: #333;
            margin-bottom: 20px;
            padding-bottom: 10px;
            border-bottom: 3px solid #667eea;
            display: flex;
            align-items: center;
            gap: 10px;
        }
        
        .section-title::before {
            content: '';
            width: 6px;
            height: 30px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            border-radius: 3px;
        }
        
        .opportunity-card {
            background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
            border-radius: 15px;
            padding: 25px;
            margin-bottom: 20px;
            border-left: 5px solid #667eea;
        }
        
        .opportunity-card h3 {
            color: #667eea;
            margin-bottom: 15px;
            font-size: 1.3em;
        }
        
        .opportunity-card .level {
            display: inline-block;
            padding: 5px 15px;
            border-radius: 20px;
            font-size: 0.85em;
            font-weight: 600;
            margin-bottom: 10px;
        }
        
        .level-high {
            background: #ff6b6b;
            color: white;
        }
        
        .level-medium {
            background: #feca57;
            color: #333;
        }
        
        .level-low {
            background: #48dbfb;
            color: white;
        }
        
        .chart-container {
            height: 400px;
            margin: 30px 0;
            background: #f8f9fa;
            border-radius: 15px;
            padding: 20px;
        }
        
        .quote-box {
            background: #fff3cd;
            border-left: 4px solid #ffc107;
            padding: 15px 20px;
            margin: 10px 0;
            border-radius: 0 8px 8px 0;
            font-style: italic;
            color: #856404;
        }
        
        .tag {
            display: inline-block;
            padding: 4px 12px;
            border-radius: 15px;
            font-size: 0.85em;
            margin: 3px;
        }
        
        .tag-positive {
            background: #d4edda;
            color: #155724;
        }
        
        .tag-negative {
            background: #f8d7da;
            color: #721c24;
        }
        
        .tag-neutral {
            background: #e2e3e5;
            color: #383d41;
        }
        
        .footer {
            background: #f8f9fa;
            padding: 30px;
            text-align: center;
            color: #666;
            border-top: 1px solid #dee2e6;
        }
        
        @media (max-width: 768px) {
            .header h1 {
                font-size: 1.8em;
            }
            .content {
                padding: 20px;
            }
        }
        
        .loading {
            text-align: center;
            padding: 40px;
            color: #666;
        }
        
        .keywords-cloud {
            display: flex;
            flex-wrap: wrap;
            gap: 10px;
            padding: 20px;
            background: #f8f9fa;
            border-radius: 15px;
            justify-content: center;
        }
        
        .keyword-item {
            padding: 8px 16px;
            background: white;
            border-radius: 20px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
            transition: all 0.3s;
        }
        
        .keyword-item:hover {
            transform: scale(1.1);
            box-shadow: 0 4px 15px rgba(0,0,0,0.15);
        }
        
        .trend-indicator {
            display: inline-flex;
            align-items: center;
            gap: 5px;
            font-weight: 600;
        }
        
        .trend-up {
            color: #28a745;
        }
        
        .trend-down {
            color: #dc3545;
        }
    </style>
</head>
<body>
    <div class="container">
        <header class="header">
            <h1>📊 产品评价深度分析报告</h1>
            <div class="meta">{{meta}}</div>
        </header>
        
        <div class="stats-cards">
            <div class="stat-card">
                <div class="number">{{total_reviews}}</div>
                <div class="label">分析样本</div>
            </div>
            <div class="stat-card">
                <div class="number">{{avg_score}}</div>
                <div class="label">平均评分</div>
            </div>
            <div class="stat-card">
                <div class="number">{{opportunities}}</div>
                <div class="label">机会点</div>
            </div>
            <div class="stat-card">
                <div class="number">{{improvements}}</div>
                <div class="label">改进建议</div>
            </div>
        </div>
        
        <div class="content">
            {{content}}
        </div>
        
        <footer class="footer">
            <p>Generated by 淘宝评论助手 AI 分析系统</p>
            <p>{{timestamp}}</p>
        </footer>
    </div>
    
    <script>
        {{charts_script}}
    </script>
</body>
</html>
'''


def parse_markdown(md_content):
    """解析 Markdown 内容"""
    data = {
        'title': '产品评价深度分析报告',
        'meta': '',
        'total_reviews': 0,
        'avg_score': 0,
        'opportunities': 0,
        'improvements': 0,
        'sections': []
    }
    
    # 提取标题
    title_match = re.search(r'^#\s+(.+)$', md_content, re.MULTILINE)
    if title_match:
        data['title'] = title_match.group(1)
    
    # 提取元信息（分析样本、平均评分等）
    meta_match = re.search(r'\*\*分析样本\*\*:\s*(\d+)', md_content)
    if meta_match:
        data['total_reviews'] = int(meta_match.group(1))
    
    score_match = re.search(r'\*\*平均评分\*\*:\s*([\d.]+)', md_content)
    if score_match:
        data['avg_score'] = float(score_match.group(1))
    
    # 统计机会点和改进建议数量
    data['opportunities'] = len(re.findall(r'###\s+\d+\.\s+.+-(高机会|⭐)', md_content))
    data['improvements'] = len(re.findall(r'###\s+\d+\.\s+.+-(🔴|🟡)', md_content))
    
    # 提取各部分
    sections = re.split(r'##\s+', md_content)[1:]  # 跳过标题
    
    for section in sections:
        lines = section.strip().split('\n')
        if not lines:
            continue
        
        section_title = lines[0].strip()
        section_content = '\n'.join(lines[1:])
        
        data['sections'].append({
            'title': section_title,
            'content': parse_section_content(section_content)
        })
    
    return data


def parse_section_content(content):
    """解析段落内容"""
    html = []
    
    # 处理机会点卡片
    opportunities = re.findall(
        r'###\s+\d+\.\s+(.+?)\s*-\s*(.+?)\n\n'
        r'\*\*用户痛点\*\*:\s*(.+?)\n\n'
        r'\*\*差异化策略\*\*:\s*(.+?)(?:\n\n|$)',
        content, re.DOTALL
    )
    
    for opp in opportunities:
        title, level, pain_point, strategy = opp
        level_class = 'level-high' if '高' in level or '⭐⭐⭐⭐⭐' in level else 'level-medium' if '中' in level or '⭐⭐⭐' in level else 'level-low'
        
        html.append(f'''
        <div class="opportunity-card">
            <h3>{title}</h3>
            <span class="level {level_class}">{level}</span>
            <p><strong>用户痛点：</strong>{pain_point}</p>
            <p><strong>差异化策略：</strong>{strategy}</p>
        </div>
        ''')
    
    # 处理改进建议卡片
    improvements = re.findall(
        r'###\s+\d+\.\s+(.+?)\s*-\s*(.+?)\n\n'
        r'\*\*影响用户\*\*:\s*(\d+).*?\n\n'
        r'\*\*用户原话\*\*:\s*(.+?)\n\n'
        r'\*\*改进建议\*\*:\s*(.+?)(?:\n\n|$)',
        content, re.DOTALL
    )
    
    for imp in improvements:
        title, priority, users, quotes, suggestion = imp
        level_class = 'level-high' if '高' in priority or '🔴' in priority else 'level-medium'
        
        quotes_html = ''.join([f'<div class="quote-box">{q.strip()}</div>' for q in quotes.split('\n') if q.strip() and not q.startswith('>')])
        
        html.append(f'''
        <div class="opportunity-card">
            <h3>{title}</h3>
            <span class="level {level_class}">{priority}</span>
            <p><strong>影响用户：</strong>{users} 人</p>
            <p><strong>用户原话：</strong></p>
            {quotes_html}
            <p><strong>改进建议：</strong>{suggestion}</p>
        </div>
        ''')
    
    # 处理普通文本
    if not html:
        # 简单的 Markdown 转 HTML
        text = content
        text = re.sub(r'\*\*(.+?)\*\*', r'<strong>\1</strong>', text)
        text = re.sub(r'\*(.+?)\*', r'<em>\1</em>', text)
        text = text.replace('\n\n', '</p><p>')
        html.append(f'<p>{text}</p>')
    
    return '\n'.join(html)


def generate_charts(data):
    """生成图表脚本"""
    charts = []
    
    # 机会点分布图
    if data['opportunities'] > 0 or data['improvements'] > 0:
        charts.append('''
        // 机会点分布饼图
        var pieChart = echarts.init(document.createElement('div'));
        var pieOption = {
            title: {
                text: '机会点分布',
                left: 'center'
            },
            tooltip: {
                trigger: 'item',
                formatter: '{b}: {c} ({d}%)'
            },
            series: [{
                type: 'pie',
                radius: ['40%', '70%'],
                avoidLabelOverlap: false,
                itemStyle: {
                    borderRadius: 10,
                    borderColor: '#fff',
                    borderWidth: 2
                },
                label: {
                    show: true,
                    formatter: '{b}\n{c}个'
                },
                data: [
                    {value: ''' + str(data['opportunities']) + ''', name: '差异化机会', itemStyle: {color: '#667eea'}},
                    {value: ''' + str(data['improvements']) + ''', name: '改进建议', itemStyle: {color: '#f093fb'}}
                ]
            }]
        };
        
        // 如果有图表容器就渲染
        var pieContainer = document.getElementById('opportunity-chart');
        if (pieContainer) {
            pieChart.resize();
            pieChart.setOption(pieOption);
            pieContainer.appendChild(pieChart.getDom());
        }
        ''')
    
    return '\n'.join(charts) if charts else '// 暂无图表数据'


def generate_html(md_path: Path):
    """生成 HTML 报告"""
    # 读取 Markdown 文件
    with open(md_path, 'r', encoding='utf-8') as f:
        md_content = f.read()
    
    # 解析内容
    data = parse_markdown(md_content)
    
    # 生成内容 HTML
    content_html = []
    for section in data['sections']:
        content_html.append(f'''
        <div class="section">
            <h2 class="section-title">{section['title']}</h2>
            {section['content']}
        </div>
        ''')
    
    # 生成图表脚本
    charts_script = generate_charts(data)
    
    # 填充模板
    html = HTML_TEMPLATE.replace('{{title}}', data['title'])
    html = html.replace('{{meta}}', f"分析样本: {data['total_reviews']} 条 | 平均评分: {data['avg_score']}")
    html = html.replace('{{total_reviews}}', str(data['total_reviews']))
    html = html.replace('{{avg_score}}', str(data['avg_score']))
    html = html.replace('{{opportunities}}', str(data['opportunities']))
    html = html.replace('{{improvements}}', str(data['improvements']))
    html = html.replace('{{content}}', '\n'.join(content_html))
    html = html.replace('{{charts_script}}', charts_script)
    html = html.replace('{{timestamp}}', datetime.now().strftime('%Y-%m-%d %H:%M:%S'))
    
    # 保存 HTML 文件
    output_path = md_path.with_suffix('.html')
    with open(output_path, 'w', encoding='utf-8') as f:
        f.write(html)
    
    return output_path


def main():
    if len(sys.argv) < 2:
        print("用法: python3 generate_html_report.py <md文件路径>")
        print("示例: python3 generate_html_report.py output/reports/产品深度分析报告_xxx.md")
        sys.exit(1)
    
    md_path = Path(sys.argv[1])
    if not md_path.exists():
        print(f"❌ 文件不存在: {md_path}")
        sys.exit(1)
    
    print(f"📄 正在转换: {md_path}")
    output_path = generate_html(md_path)
    print(f"✅ HTML 报告已生成: {output_path}")
    print(f"\n🌐 用浏览器打开查看: file://{output_path.absolute()}")


if __name__ == "__main__":
    main()
