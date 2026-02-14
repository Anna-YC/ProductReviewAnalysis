// 淘宝评论提取插件 - 简化版（临时版本）

console.log('🛒 淘宝评论助手已启动（简化版）');

// 全局变量
let isExtracting = false;
let reviewCount = 0;
let allReviews = [];

// 检测当前平台
function detectPlatform() {
  const url = window.location.href;
  if (url.includes('detail.tmall.com') || url.includes('item.taobao.com')) {
    return 'product_page';
  } else if (url.includes('tmall.com')) {
    return 'tmall';
  } else if (url.includes('taobao.com')) {
    return 'taobao';
  }
  return 'unknown';
}

// 检测是否在商品详情页
function isProductPage() {
  const platform = detectPlatform();
  return platform === 'product_page' || platform === 'tmall' || platform === 'taobao';
}

// 查找并点击"查看全部评论"按钮
async function clickViewAllReviews() {
  console.log('🔍 查找"查看全部评论"按钮...');

  // 方法1：通过文本查找
  const allElements = document.querySelectorAll('a, button');
  for (const el of allElements) {
    const text = el.textContent.trim();
    if (text.includes('查看全部评论') ||
        text.includes('全部评论') ||
        text.includes('更多评论') ||
        (text.includes('查看') && text.includes('评论'))) {
      console.log(`✅ 找到按钮: ${text.substring(0, 30)}`);
      el.click();
      await new Promise(resolve => setTimeout(resolve, 2000));
      return true;
    }
  }

  // 方法2：通过链接查找
  const linkSelectors = [
    'a[href*="review"]',
    'a[href*="rate"]',
    'a[href*="comment"]'
  ];

  for (const selector of linkSelectors) {
    const link = document.querySelector(selector);
    if (link) {
      console.log(`✅ 找到评论链接: ${selector}`);
      link.click();
      await new Promise(resolve => setTimeout(resolve, 2000));
      return true;
    }
  }

  console.log('⚠️ 未找到"查看全部评论"按钮');
  return false;
}

// 自动滚动加载更多评论
async function autoScrollToLoadMore() {
  console.log('🔄 开始自动滚动加载评论...');

  let scrollCount = 0;
  let lastReviewCount = 0;
  let noChangeCount = 0;

  const countReviews = () => {
    return document.querySelectorAll('.rate-grid-item, .tm-collep-item, .review-item, .comment-item').length;
  };

  lastReviewCount = countReviews();
  console.log(`📊 初始评论数: ${lastReviewCount}`);

  for (let i = 0; i < 50; i++) {
    // 滚动到底部
    window.scrollTo(0, document.body.scrollHeight);

    scrollCount++;

    // 每5次输出一次
    if (scrollCount % 5 === 0) {
      console.log(`📜 滚动进度: ${scrollCount}/50`);
    }

    // 等待加载
    await new Promise(resolve => setTimeout(resolve, 1500));

    // 检测评论数变化
    const currentReviews = countReviews();
    if (currentReviews !== lastReviewCount) {
      console.log(`📊 评论数变化: ${lastReviewCount} → ${currentReviews}`);
      lastReviewCount = currentReviews;
      noChangeCount = 0;
    } else {
      noChangeCount++;
      if (noChangeCount >= 3) {
        console.log('✅ 评论数不再变化，停止滚动');
        break;
      }
    }
  }

  const finalReviews = countReviews();
  console.log(`🏁 滚动完成，最终评论数: ${finalReviews}`);
  return finalReviews;
}

// 提取评论数据
function extractReviewsFromPage() {
  console.log('📊 开始提取评论数据...');

  const reviews = [];
  const reviewItems = document.querySelectorAll('.rate-grid-item, .tm-collep-item, .review-item, .comment-item');

  console.log(`🔍 找到 ${reviewItems.length} 个评论项`);

  reviewItems.forEach((item, index) => {
    try {
      const review = {
        id: `review_${Date.now()}_${index}`,
        platform: detectPlatform(),
        user_name: '',
        user_level: '',
        content: '',
        rate_time: '',
        score: 5,
        sku: '',
        append_content: '',
        append_time: '',
        has_image: false,
        images: [],
        reply_content: ''
      };

      // 用户昵称
      const nameEl = item.querySelector('.tm-user-name, .rate-user-name, .user-name, [class*="user"][class*="name"]');
      if (nameEl) review.user_name = nameEl.textContent.trim();

      // 评论内容
      const contentEl = item.querySelector('.tm-collep-detail, .rate-comment-detail, .comment-content, .content');
      if (contentEl) review.content = contentEl.textContent.trim();

      // 评分
      const scoreEl = item.querySelector('.rate-score, .score, [data-rate]');
      if (scoreEl) {
        const scoreText = scoreEl.textContent || scoreEl.getAttribute('data-rate');
        const score = parseInt(scoreText);
        if (!isNaN(score) && score > 0) {
          review.score = score;
        }
      }

      // 日期
      const dateEl = item.querySelector('.tm-collep-date, .rate-time, .date, .time');
      if (dateEl) review.rate_time = dateEl.textContent.trim();

      if (review.content || review.user_name) {
        reviews.push(review);
      }
    } catch (e) {
      console.warn('⚠️ 提取评论时出错:', e);
    }
  });

  console.log(`📊 共提取 ${reviews.length} 条评论`);
  return reviews;
}

// 主提取函数
async function extractReviews() {
  const platform = detectPlatform();
  console.log('🌐 当前平台:', platform);
  console.log('🔗 当前URL:', window.location.href);

  // 步骤1：点击"查看全部评论"
  console.log('🔍 步骤 1/3: 查找并点击"查看全部评论"按钮...');
  await clickViewAllReviews();

  // 步骤2：自动滚动加载
  console.log('🔄 步骤 2/3: 自动滚动加载评论...');
  await autoScrollToLoadMore();

  // 步骤3：提取评论数据
  console.log('📊 步骤 3/3: 提取评论数据...');
  const reviews = extractReviewsFromPage();

  return {
    success: true,
    message: `成功提取 ${reviews.length} 条评论`,
    count: reviews.length,
    data: reviews,
    finished: true
  };
}

// 查找下一页按钮
function findNextButton() {
  const selectors = [
    '.next-pagination .next',
    'a.next',
    '.pagination-next',
    '[data-action="nextPage"]',
  ];

  for (const selector of selectors) {
    const btn = document.querySelector(selector);
    if (btn) {
      console.log(`✅ 找到下一页按钮: ${selector}`);
      return btn;
    }
  }

  console.log('⚠️ 未找到下一页按钮');
  return null;
}

// 点击下一页
function clickNextPage() {
  const nextBtn = findNextButton();
  if (nextBtn) {
    console.log('📄 点击下一页...');
    nextBtn.click();
    return true;
  }
  console.log('⚠️ 未找到下一页按钮');
  return false;
}

// 监听来自popup的消息
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('📨 收到消息:', request.action);

  switch (request.action) {
    case 'checkPage':
      const canExtract = isProductPage();
      console.log('🔍 页面检查结果:', canExtract);
      sendResponse({
        canExtract: canExtract,
        platform: detectPlatform(),
        url: window.location.href
      });
      break;

    case 'extract':
      if (!isExtracting) {
        isExtracting = true;

        extractReviews().then(result => {
          allReviews = allReviews.concat(result.data);
          reviewCount = allReviews.length;

          console.log('✅ 提取完成:', result);

          isExtracting = false;
          sendResponse({
            success: true,
            message: '已提取所有评论',
            count: reviewCount,
            data: allReviews,
            finished: true
          });
        }).catch(error => {
          console.error('❌ 提取出错:', error);
          isExtracting = false;
          sendResponse({
            success: false,
            message: `提取失败: ${error.message}`,
            count: 0
          });
        });
      } else {
        console.log('⚠️ 正在提取中，请稍候...');
        sendResponse({
          success: false,
          message: '正在提取中，请稍候...'
        });
      }
      break;

    case 'stop':
      isExtracting = false;
      console.log('⏸ 停止提取');
      sendResponse({ success: true, message: '已停止' });
      break;

    case 'getData':
      console.log('📤 获取数据:', allReviews.length, '条评论');
      sendResponse({
        success: true,
        data: allReviews
      });
      break;

    case 'updateCount':
      reviewCount = request.count;
      break;

    default:
      console.log('❓ 未知操作:', request.action);
      sendResponse({ success: false, message: '未知操作' });
  }

  return true;
});

// 页面加载完成后通知popup
window.addEventListener('load', () => {
  console.log('✅ 页面加载完成');
  console.log('🌐 当前URL:', window.location.href);
  console.log('🔍 平台:', detectPlatform());

  chrome.runtime.sendMessage({
    action: 'pageLoaded',
    platform: detectPlatform(),
    canExtract: isProductPage()
  }).catch(err => {
    console.log('⚠️ 无法发送消息到popup:', err);
  });
});

// 页面DOM变化监听
const observer = new MutationObserver(() => {
  // 可以在这里添加评论动态加载的监听逻辑
});

observer.observe(document.body, {
  childList: true,
  subtree: true
});
