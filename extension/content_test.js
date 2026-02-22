// 测试版本 - 最简实现
console.log('🛒 淘宝评论助手测试版已启动');

// 先定义所有函数，最后再暴露到 window
function detectPlatform() {
  const url = window.location.href;
  if (url.includes('tmall.com')) return 'tmall';
  if (url.includes('taobao.com')) return 'taobao';
  return 'unknown';
}

function findReviewItems() {
  // 最简单的查找方式
  const items = document.querySelectorAll('[class*="Comment--"]');
  if (items.length > 0) return Array.from(items);
  
  // 备用方案
  const allDivs = document.querySelectorAll('div');
  const results = [];
  for (let i = 0; i < allDivs.length; i++) {
    const div = allDivs[i];
    const text = div.textContent || '';
    if (text.length > 50 && text.includes('***') && text.includes('20')) {
      results.push(div);
    }
  }
  return results;
}

// 暴露到全局
window.reviewHelper = {
  debug: function() {
    console.log('URL:', window.location.href);
    console.log('Platform:', detectPlatform());
    const items = findReviewItems();
    console.log('找到评论数:', items.length);
    return { count: items.length };
  },
  count: function() {
    return findReviewItems().length;
  }
};

console.log('✅ window.reviewHelper 已定义');
