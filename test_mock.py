#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
爬虫模拟测试 - 验证核心逻辑
"""
import sys
from pathlib import Path
from datetime import datetime

sys.path.insert(0, str(Path(__file__).parent))

from src.crawler.base import ReviewItem
from src.crawler import CrawlerEngine, TaobaoCrawler


def test_review_item():
    """测试ReviewItem数据结构"""
    print("=" * 50)
    print("测试: ReviewItem数据结构")
    print("=" * 50)

    # 创建测试评论
    review = ReviewItem(
        id="123456",
        user_name="测试用户",
        user_level="黄金会员",
        content="非常好的产品，安装师傅很专业！",
        rate_time=datetime.now(),
        product_sku="V1S-G 28m³·min 星空灰色",
        product_spec="28m³/min",
        score=5,
        tags=["有图"],
        append_content="用了一段时间，依然很好！",
        has_image=True,
        reply_content="感谢您的评价！",
    )

    # 转换为字典
    data = review.to_dict()

    print("✅ ReviewItem创建成功")
    print(f"   用户: {data['用户昵称']}")
    print(f"   内容: {data['初评内容']}")
    print(f"   追评: {data['追评内容']}")
    print(f"   评分: {data['评分']}")
    print()


def test_crawler_engine():
    """测试批量爬虫引擎"""
    print("=" * 50)
    print("测试: CrawlerEngine")
    print("=" * 50)

    engine = CrawlerEngine()

    # 模拟添加一些结果
    mock_reviews = [
        ReviewItem(
            id=f"test_{i}",
            user_name=f"用户{i}",
            user_level=f"等级{i}",
            content=f"测试评论{i} - 产品很好",
            rate_time=datetime.now(),
            product_sku="测试SKU",
            product_spec="标准规格",
            score=5,
            tags=[],
        )
        for i in range(1, 6)
    ]

    engine.results["https://test.com/product1"] = mock_reviews

    # 测试摘要
    summary = engine.get_summary()
    print("✅ CrawlerEngine创建成功")
    print(f"   摘要: {summary}")
    print()


def test_data_export():
    """测试数据导出"""
    print("=" * 50)
    print("测试: 数据导出为Excel")
    print("=" * 50)

    import pandas as pd

    # 创建模拟数据
    reviews = [
        ReviewItem(
            id=f"test_{i}",
            user_name=f"用户{i}",
            user_level=f"黄金会员" if i % 2 == 0 else "普通会员",
            content=f"这是第{i}条测试评论，产品非常好，值得推荐！",
            rate_time=datetime.now(),
            product_sku=f"SKU-{i%3+1}",
            product_spec="标准规格",
            score=5 if i % 2 == 0 else 4,
            tags=["有图"] if i % 3 == 0 else [],
            has_image=(i % 3 == 0),
        )
        for i in range(1, 21)
    ]

    # 转换为DataFrame
    df = pd.DataFrame([r.to_dict() for r in reviews])

    # 保存到测试文件
    output_dir = Path("output/crawler")
    output_dir.mkdir(parents=True, exist_ok=True)

    output_path = output_dir / "test_output.xlsx"
    df.to_excel(output_path, index=False, engine='openpyxl')

    print(f"✅ 数据导出成功")
    print(f"   记录数: {len(reviews)}")
    print(f"   保存路径: {output_path}")

    # 读取验证
    df_loaded = pd.read_excel(output_path)
    print(f"   验证读取: {len(df_loaded)} 条记录")
    print()


def test_url_parsing():
    """测试URL解析"""
    print("=" * 50)
    print("测试: URL解析功能")
    print("=" * 50)

    from src.crawler import is_valid_taobao_url, extract_item_id_from_url

    test_cases = [
        ("https://detail.tmall.com/item.htm?id=123456", True, "123456"),
        ("https://item.taobao.com/item.htm?id=789012", True, "789012"),
        ("123456", False, "123456"),
        ("https://www.jd.com/product/123", False, None),
    ]

    for url, expected_valid, expected_id in test_cases:
        is_valid = is_valid_taobao_url(url)
        item_id = extract_item_id_from_url(url)

        status = "✅" if is_valid == expected_valid else "❌"
        print(f"{status} URL: {url[:50]}...")
        print(f"   有效性: {is_valid} (期望: {expected_valid})")
        print(f"   产品ID: {item_id}")
        print()

    print()


def main():
    print("\n" + "=" * 50)
    print("  🧪 爬虫模块单元测试")
    print("=" * 50)
    print()

    tests = [
        ("ReviewItem数据结构", test_review_item),
        ("URL解析功能", test_url_parsing),
        ("CrawlerEngine引擎", test_crawler_engine),
        ("数据导出功能", test_data_export),
    ]

    for name, test_func in tests:
        try:
            test_func()
        except Exception as e:
            print(f"❌ {name}测试失败: {str(e)}")
            import traceback
            traceback.print_exc()
            print()

    print("=" * 50)
    print("  ✅ 所有测试完成")
    print("=" * 50)


if __name__ == "__main__":
    main()
