/**
 * 淘宝评论助手 - 配置文件
 * 可根据需要自定义以下配置
 */

(function() {
  'use strict';

  window.REVIEW_HELPER_CONFIG = {
    // ==================== 抓取配置 ====================
    // 最大抓取页数（0表示无限制）
    MAX_PAGES: 100,

    // 单页最大评论数
    MAX_REVIEWS_PER_PAGE: 50,

    // 滚动延迟（毫秒）- 每次滚动后等待时间
    SCROLL_DELAY: 3000,

    // 翻页延迟（毫秒）- 翻页后等待时间
    PAGE_TURN_DELAY: 2000,

    // 最大连续无变化次数（达到此值停止滚动）
    MAX_NO_CHANGE_COUNT: 10,

    // ==================== 导出配置 ====================
    // 默认下载文件名前缀
    FILE_PREFIX: '评论数据',

    // CSV文件是否添加BOM头（Excel中文兼容）
    CSV_ADD_BOM: true,

    // 日期格式化方式
    DATE_FORMAT: 'YYYY年MM月DD日',  // 或 'YYYY-MM-DD'

    // ==================== UI配置 ====================
    // 进度条基准值（用于计算百分比）
    PROGRESS_BASE: 100,

    // 超时时间（毫秒）
    EXTRACTION_TIMEOUT: 600000,  // 10分钟

    // ==================== 调试配置 ====================
    // 是否启用详细日志
    DEBUG_MODE: false,

    // 日志输出到控制台
    CONSOLE_LOG: true
  };

  // 兼容旧版本配置
  window._reviewHelperConfig = window.REVIEW_HELPER_CONFIG;

  console.log('✅ 配置已加载');
})();
