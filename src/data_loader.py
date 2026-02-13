# -*- coding: utf-8 -*-
"""
数据加载与预处理模块
"""
import pandas as pd
from pathlib import Path
from typing import List, Dict
from config import RAW_DATA_FILE, DEFAULT好评_PATTERNS, MIN_COMMENT_LENGTH


class ReviewDataLoader:
    """评论数据加载器"""

    def __init__(self, file_path: Path = None):
        self.file_path = file_path or RAW_DATA_FILE
        self.raw_data = None
        self.processed_data = None

    def load_from_excel(self) -> pd.DataFrame:
        """从Excel加载评论数据"""
        self.raw_data = pd.read_excel(self.file_path, engine='openpyxl')
        print(f"✓ 加载原始数据: {len(self.raw_data)} 条记录")
        return self.raw_data

    def clean_data(self, df: pd.DataFrame = None) -> pd.DataFrame:
        """
        数据清洗与预处理

        处理步骤：
        1. 合并初评和追评内容
        2. 过滤默认好评和无效评论
        3. 去重
        4. 基础字段清洗
        """
        df = df.copy() if df is not None else self.raw_data.copy()

        # 合并初评和追评
        df['追评内容'] = df['追评内容'].fillna('')
        df['评论全文'] = df['初评内容'].fillna('') + ' ' + df['追评内容']
        df['评论全文'] = df['评论全文'].str.strip()

        # 过滤默认好评和无效评论
        df = self._filter_invalid_comments(df)

        # 去重
        before_dedup = len(df)
        df = df.drop_duplicates(subset=['评论全文'], keep='first')
        after_dedup = len(df)
        if before_dedup > after_dedup:
            print(f"✓ 去重: 移除 {before_dedup - after_dedup} 条重复评论")

        # 过滤过短评论
        df['评论长度'] = df['评论全文'].str.len()
        df = df[df['评论长度'] >= MIN_COMMENT_LENGTH]

        # 重置索引
        df = df.reset_index(drop=True)

        print(f"✓ 清洗后有效评论: {len(df)} 条")
        self.processed_data = df
        return df

    def _filter_invalid_comments(self, df: pd.DataFrame) -> pd.DataFrame:
        """过滤无效评论"""
        # 创建过滤条件
        conditions = df['评论全文'] != ''  # 非空

        # 排除默认好评模式
        for pattern in DEFAULT好评_PATTERNS:
            conditions &= ~df['评论全文'].str.contains(pattern, na=False)

        before_filter = len(df)
        df = df[conditions]
        after_filter = len(df)

        if before_filter > after_filter:
            print(f"✓ 过滤默认好评: 移除 {before_filter - after_filter} 条")

        return df

    def get_sku_summary(self, df: pd.DataFrame = None) -> Dict[str, int]:
        """获取SKU分布统计"""
        df = df or self.processed_data
        if df is None:
            df = self.raw_data

        sku_counts = df['SKU'].value_counts().to_dict()
        return sku_counts

    def save_processed_data(self, df: pd.DataFrame = None, output_path: Path = None):
        """保存清洗后的数据"""
        from config import PROCESSED_DATA_FILE

        output_path = output_path or PROCESSED_DATA_FILE
        df = df or self.processed_data

        df.to_csv(output_path, index=False, encoding='utf-8-sig')
        print(f"✓ 数据已保存: {output_path}")

    def load_processed_data(self, path: Path = None) -> pd.DataFrame:
        """加载已清洗的数据"""
        from config import PROCESSED_DATA_FILE

        path = path or PROCESSED_DATA_FILE
        if path.exists():
            self.processed_data = pd.read_csv(path)
            print(f"✓ 加载已清洗数据: {len(self.processed_data)} 条")
            return self.processed_data
        return None


if __name__ == "__main__":
    # 测试数据加载
    loader = ReviewDataLoader()
    loader.load_from_excel()
    loader.clean_data()
    loader.save_processed_data()
