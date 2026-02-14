// 淘宝评论提取插件 - 内容脚本 (改进版)

console.log('🛒 淘宝评论助手已启动');

// 全局变量
let isExtracting = false;
let reviewCount = 0;
let allReviews = [];

// 检测当前平台
function detectPlatform() {
  const url = window.location.href;

  // 先检查更具体的商品详情页URL
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

// 滚动到评论区并等待加载
async function scrollToReviews() {
  console.log('📍 滚动到评论区...');

  // 尝试多个可能的评论区域选择器
  const reviewSelectors = [
    '#reviews',              // 通用ID
    '[data-spm="reviews"]',   // 天猫data属性
    '.reviews',               // 通用class
    '.rate-grid',             // 天猫评分网格
    '.tm-colleps',            // 天猫折叠评论
    '#J_Reviews',             // 淘宝评论区域
    '.J_Reviews',             // 淘宝评论区域class
    '[id*="review"]',         // 包含review的ID
    '[class*="review"]',      // 包含review的class
  ];

  for (const selector of reviewSelectors) {
    const element = document.querySelector(selector);
    if (element) {
      console.log(`✅ 找到评论区域: ${selector}`);
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      await new Promise(resolve => setTimeout(resolve, 1500));
      return true;
    }
  }

  console.log('⚠️ 未找到评论区域，尝试滚动到页面底部');
  window.scrollTo(0, document.body.scrollHeight);
  await new Promise(resolve => setTimeout(resolve, 2000));
  return false;
}

// ========== 新增：自动滚动功能 ==========

/**
 * 检测是否有评论弹窗
 * @returns {Element|null} 评论弹窗元素
 */
function findReviewDialog() {
  const selectors = [
    // 淘宝/天猫弹窗选择器
    '.next-dialog',
    '.next-overlay',
    '[class*="dialog"]',
    '[class*="modal"]',
    '[class*="popup"]',

    // 评论专用弹窗
    '[class*="review"][class*="dialog"]',
    '[class*="rate"][class*="dialog"]',
    '[class*="comment"][class*="modal"]',

    // 数据属性
    '[data-role="dialog"]',
    '[data-role="modal"]',
  ];

  for (const selector of selectors) {
    const dialogs = document.querySelectorAll(selector);
    for (const dialog of dialogs) {
      if (isElementVisible(dialog)) {
        console.log(`✅ 找到评论弹窗: ${selector}`);
        return dialog;
      }
    }
  }

  console.log('⚠️ 未找到评论弹窗，使用主页面滚动');
  return null;
}

/**
 * 自动滚动页面以加载更多评论（无限滚动场景 - 增强版）
 * @param {number} maxScrolls 最大滚动次数（默认50次）
 * @param {number} scrollDelay 每次滚动间隔（默认1500ms）
 * @returns {Promise<number>} 返回实际滚动次数和评论数
 */
async function autoScrollToLoadMore(maxScrolls = 50, scrollDelay = 1500) {
  console.log(`🔄 开始自动滚动加载更多评论（最多${maxScrolls}次，间隔${scrollDelay}ms）`);

  let scrollCount = 0;
  let lastHeight = 0;
  let lastReviewCount = 0;
  let noChangeCount = 0; // 连续无变化的次数

  // 检测是否有评论弹窗
  const dialog = findReviewDialog();
  const scrollContainer = dialog || document.body;

  console.log(`📍 滚动容器: ${dialog ? '评论弹窗' : '主页面'}`);

  // 获取初始评论数（使用更宽泛的选择器）
  const initialReviews = document.querySelectorAll('.rate-grid-item, .tm-collep-item, .review-item, .comment-item, [class*="review"][class*="item"], [class*="comment"][class*="item"], [class*="rate"][class*="item"]').length;
  lastReviewCount = initialReviews;
  console.log(`📊 初始评论数: ${initialReviews}`);

  while (scrollCount < maxScrolls) {
    const currentHeight = scrollContainer.scrollHeight;

    // 方式1：使用window.scrollTo滚动到底部（主页面）
    if (scrollContainer === document.body) {
      window.scrollTo({
        top: document.body.scrollHeight,
        behavior: 'smooth'
      });
    } else {
      // 弹窗内滚动
      scrollContainer.scrollTop = scrollContainer.scrollHeight;
    }

    // 方式2：模拟鼠标滚轮事件（更自然）
    const scrollEvent = new WheelEvent('wheel', {
      deltaY: 1000,
      bubbles: true,
      cancelable: true
    });
    scrollContainer.dispatchEvent(scrollEvent);

    scrollCount++;

    // 每5次输出一次日志，避免日志过多
    if (scrollCount % 5 === 0 || scrollCount === 1) {
      console.log(`📜 滚动第 ${scrollCount}/${maxScrolls} 次，容器高度: ${currentHeight}px`);
    }

    // 等待内容加载（淘宝/天猫懒加载通常需要1-2秒）
    await new Promise(resolve => setTimeout(resolve, scrollDelay));

    // 检测页面高度是否变化
    const newHeight = scrollContainer.scrollHeight;
    const heightChanged = newHeight !== lastHeight;

    // 检测评论数量是否增加
    const currentReviews = document.querySelectorAll('.rate-grid-item, .tm-collep-item, .review-item, .comment-item, [class*="review"][class*="item"], [class*="comment"][class*="item"], [class*="rate"][class*="item"]').length;
    const reviewCountDiff = currentReviews - lastReviewCount;
    const reviewsChanged = reviewCountDiff !== 0;

    // 每10次或评论数变化时输出详细信息
    if (scrollCount % 10 === 0 || reviewsChanged || scrollCount === 1) {
      console.log(`   📊 当前评论数: ${currentReviews} (${reviewCountDiff >= 0 ? '+' : ''}${reviewCountDiff})`);
    }

    // 更新记录
    lastHeight = newHeight;
    lastReviewCount = currentReviews;

    // 判断是否还有新内容加载
    if (!heightChanged && !reviewsChanged) {
      noChangeCount++;
      console.log(`⚠️ 页面高度和评论数均未变化 (${noChangeCount}/5)`);

      // 连续5次无变化，认为已加载完毕
      if (noChangeCount >= 5) {
        console.log('✅ 页面已无更多内容加载，停止滚动');
        break;
      }
    } else {
      noChangeCount = 0; // 有变化，重置计数器
    }

    // 如果已经滚动了很多次，适当减少检测间隔，加速完成
    if (scrollCount > 30) {
      console.log('⏱️ 已滚动较多次数，降低检测频率');
      break;
    }
  }

  const finalReviews = document.querySelectorAll('.rate-grid-item, .tm-collep-item, .review-item, .comment-item, [class*="review"][class*="item"], [class*="comment"][class*="item"], [class*="rate"][class*="item"]').length;
  console.log(`🏁 滚动完成，共滚动 ${scrollCount} 次，最终评论数: ${finalReviews} (+${finalReviews - initialReviews})`);
  return scrollCount;
}

/**
 * 查找并点击"查看全部评论"按钮
 * @returns {Promise<boolean>} 是否成功点击
 */
async function clickViewAllReviews() {
  console.log('🔍 查找"查看全部评论"按钮...');

  // 多种可能的选择器
  const selectors = [
    // 淘宝/天猫标准
    'a[href*="review"]',
    'a[href*="rate"]',
    'a[href*="comment"]',

    // 按钮文本匹配
    ...Array.from(document.querySelectorAll('a, button')).filter(el => {
      const text = el.textContent.trim();
      return text.includes('查看全部评论') ||
             text.includes('全部评论') ||
             text.includes('更多评论') ||
             text.includes('评价') ||
             (text.includes('查看') && text.includes('评论')) ||
             (text.includes('全部') && text.includes('评价'));
    }),

    // CSS选择器
    '.rate-count',
    '.review-count',
    '.comment-count',
    '[data-spm="reviewCount"]',
    '[class*="review"][class*="link"]',
    '[class*="rate"][class*="link"]',

    // 天猫专用
    '.tm-count',
    '.tm-rate-count',
    '.tm-review-link',
  ];

  for (const selector of selectors) {
    try {
      const btn = typeof selector === 'string'
        ? document.querySelector(selector)
        : selector; // 直接是元素

      if (btn && isElementVisible(btn)) {
        console.log(`✅ 找到"查看全部评论"按钮: ${btn.textContent.substring(0, 30)}...`);

        // 点击按钮
        btn.click();

        // 等待弹窗/新页面加载
        console.log('⏳ 等待评论页面加载...');
        await new Promise(resolve => setTimeout(resolve, 2000));

        return true;
      }
    } catch (e) {
      // 忽略错误，继续尝试下一个选择器
    }
  }

  console.log('⚠️ 未找到"查看全部评论"按钮，尝试在当前页面查找评论...');
  return false;
}

/**
 * 滚动到评论区域底部，触发评论加载
 */
async function scrollReviewsToBottom() {
  console.log('📍 滚动到评论区域底部...');

  // 先尝试定位到评论标签
  const reviewTabSelectors = [
    'a[href*="review"]',
    'a[href*="rate"]',
    '[data-spm="reviewsTab"]',
    '.review-tab',
    '.rate-tab'
  ];

  for (const selector of reviewTabSelectors) {
    const tab = document.querySelector(selector);
    if (tab) {
      console.log(`✅ 找到评论标签: ${selector}`);
      tab.click();
      await new Promise(resolve => setTimeout(resolve, 1000));
      break;
    }
  }

  // 滚动到评论区
  await scrollToReviews();

  // 在评论区内部持续滚动
  const reviewContainer = document.querySelector('.reviews, #reviews, .rate-grid, .tm-colleps');
  if (reviewContainer) {
    console.log('✅ 找到评论容器，开始内部滚动');
    let scrollCount = 0;
    const maxScrolls = 5;

    while (scrollCount < maxScrolls) {
      const beforeHeight = reviewContainer.scrollHeight;
      reviewContainer.scrollTop = reviewContainer.scrollHeight;
      await new Promise(resolve => setTimeout(resolve, 800));
      const afterHeight = reviewContainer.scrollHeight;

      scrollCount++;
      if (beforeHeight === afterHeight) {
        console.log('✅ 评论容器已无更多内容');
        break;
      }
    }
  } else {
    // 如果没有找到评论容器，使用全页滚动
    await autoScrollToLoadMore(5, 800);
  }
}

// ========== 新增：评论数量监测 ==========

/**
 * 监测评论数量是否增加
 * @param {number} waitTime 等待时间（默认3000ms）
 * @returns {Promise<boolean>} 是否有新评论加载
 */
async function waitForNewReviews(waitTime = 3000) {
  const initialCount = document.querySelectorAll('.rate-grid-item, .tm-collep-item, .review-item, .comment-item').length;
  console.log(`📊 当前评论数: ${initialCount}，等待加载...`);

  await new Promise(resolve => setTimeout(resolve, waitTime));

  const newCount = document.querySelectorAll('.rate-grid-item, .tm-collep-item, .review-item, .comment-item').length;
  console.log(`📊 加载后评论数: ${newCount}`);

  if (newCount > initialCount) {
    console.log(`✅ 新增 ${newCount - initialCount} 条评论`);
    return true;
  } else {
    console.log('⚠️ 未检测到新评论');
    return false;
  }
}

// 提取天猫评论（增强版 - 支持更多选择器）
function extractTmallReviews() {
  console.log('🔍 开始提取天猫评论...');

  const reviews = [];

  // 尝试多种可能的评论项选择器（按优先级排序）
  const reviewItemSelectors = [
    // 天猫专用选择器
    '.tm-collep-item',           // 天猫评论项
    '.rate-grid-item',            // 评分网格项
    '.tm-rate-item',
    '.tm-item-review',

    // 通用评论选择器
    '.rate-item',                 // 通用评论项
    '[data-spm="reviewItem"]',    // data属性
    '[data-testid*="review"]',    // testid属性
    '[data-testid*="comment"]',   // testid属性（评论）
    '.review-item',               // 通用class
    '.item-review',               // 淘宝评论项
    '.comment-item',              // 通用评论项

    // 淘宝专用选择器
    '.J_Reviews .item',
    '#J_Reviews .item',
    '.review-item',
    '.rate-item',

    // 更宽泛的选择器（最后尝试）
    '[class*="review"][class*="item"]',
    '[class*="comment"][class*="item"]',
    '[class*="rate"][class*="item"]',
  ];

  let reviewItems = [];

  // 尝试每个选择器，直到找到评论
  for (const selector of reviewItemSelectors) {
    try {
      const items = document.querySelectorAll(selector);
      if (items.length > 0) {
        console.log(`✅ 使用选择器 "${selector}" 找到 ${items.length} 个评论项`);
        reviewItems = Array.from(items);
        break;
      }
    } catch (e) {
      // 忽略选择器错误，尝试下一个
    }
  }

  // 如果还是找不到，尝试使用更宽泛的匹配
  if (reviewItems.length === 0) {
    console.log('⚠️ 标准选择器未找到评论项，尝试宽泛匹配...');

    // 查找所有可能包含评论的div
    const allDivs = document.querySelectorAll('div[class*="review"], div[class*="comment"], div[class*="rate"], div[class*="tm-"], div[class*="item"]');
    console.log(`🔊 找到 ${allDivs.length} 个可能包含评论的div`);

    // 简单筛选：包含文本内容但不是叶子节点
    const potentialItems = Array.from(allDivs).filter(div => {
      const text = div.textContent.trim();
      const hasChildDivs = div.querySelectorAll('div').length > 1;
      return text.length > 20 && text.length < 2000 && !hasChildDivs;
    });

    if (potentialItems.length > 0) {
      console.log(`✅ 宽泛匹配找到 ${potentialItems.length} 个潜在评论项`);
      reviewItems = potentialItems;
    }
  }

  if (reviewItems.length === 0) {
    console.log('❌ 所有选择器都未能找到评论项');

    // 尝试查找包含评论内容的div
    const allDivs = document.querySelectorAll('div');
    const commentDivs = Array.from(allDivs).filter(div => {
      const text = div.textContent.trim();
      return text.length > 10 && text.length < 1000 &&
             !div.querySelector('div'); // 叶子节点
    });

    console.log(`🔊 页面共有 ${allDivs.length} 个div，${commentDivs.length} 个可能的评论div`);

    // 输出前5个可能包含评论的div用于调试
    commentDivs.slice(0, 5).forEach((div, i) => {
      console.log(`可能的评论 ${i + 1}:`, div.textContent.substring(0, 100));
    });

    return reviews;
  }

  // 提取评论数据
  reviewItems.forEach((item, index) => {
    try {
      const review = {
        id: `tmall_${Date.now()}_${index}`,
        platform: 'tmall',
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

      // 用户昵称 - 多种选择器
      const nameSelectors = [
        '.tm-collep-name',
        '.rate-user-info .name',
        '.nick',
        '.user-name',
        '[class*="user"][class*="name"]',
        '[class*="nick"]',
      ];
      for (const sel of nameSelectors) {
        const el = item.querySelector(sel);
        if (el && el.textContent.trim()) {
          review.user_name = el.textContent.trim();
          break;
        }
      }

      // 评论内容 - 多种选择器
      const contentSelectors = [
        '.tm-collep-detail',
        '.rate-comment-detail',
        '.comment-detail',
        '.comment-content',
        '.content',
        '[class*="comment"][class*="detail"]',
        '[class*="comment"][class*="content"]',
      ];
      for (const sel of contentSelectors) {
        const el = item.querySelector(sel);
        if (el && el.textContent.trim()) {
          review.content = el.textContent.trim();
          break;
        }
      }

      // 评分
      const scoreSelectors = [
        '.rate-score',
        '.score',
        '[data-rate]',
        '[class*="score"]',
        '[class*="star"]',
      ];
      for (const sel of scoreSelectors) {
        const el = item.querySelector(sel);
        if (el) {
          const scoreText = el.textContent || el.getAttribute('data-rate');
          const score = parseInt(scoreText);
          if (!isNaN(score) && score > 0) {
            review.score = score;
            break;
          }
        }
      }

      // 日期
      const dateSelectors = [
        '.tm-collep-date',
        '.rate-time',
        '.date',
        '.time',
        '[class*="date"]',
        '[class*="time"]',
      ];
      for (const sel of dateSelectors) {
        const el = item.querySelector(sel);
        if (el && el.textContent.trim()) {
          review.rate_time = el.textContent.trim();
          break;
        }
      }

      // 如果至少有用户名或评论内容，则添加到结果
      if (review.content || review.user_name) {
        reviews.push(review);
        console.log(`✅ 提取评论 ${index + 1}:`, review.user_name || '匿名', review.content.substring(0, 30));
      }
    } catch (e) {
      console.warn('⚠️ 提取评论时出错:', e);
    }
  });

  console.log(`📊 共提取 ${reviews.length} 条天猫评论`);
  return reviews;
}

// 提取淘宝评论（增强版）
function extractTaobaoReviews() {
  console.log('🔍 开始提取淘宝评论...');

  const reviews = [];

  // 淘宝评论选择器（与天猫类似）
  const reviewItemSelectors = [
    '.J_Reviews .item',
    '#J_Reviews .item',
    '.review-item',
    '.comment-item',
    '[class*="review"][class*="item"]',
  ];

  let reviewItems = [];

  for (const selector of reviewItemSelectors) {
    const items = document.querySelectorAll(selector);
    if (items.length > 0) {
      console.log(`✅ 使用选择器 "${selector}" 找到 ${items.length} 个评论项`);
      reviewItems = Array.from(items);
      break;
    }
  }

  if (reviewItems.length === 0) {
    console.log('❌ 所有选择器都未能找到评论项');
    return reviews;
  }

  // 提取评论（逻辑与天猫类似）
  reviewItems.forEach((item, index) => {
    try {
      const review = {
        id: `taobao_${Date.now()}_${index}`,
        platform: 'taobao',
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

      // 提取字段（使用与天猫类似的多选择器策略）
      const nameEl = item.querySelector('.user-info .name, .nick, [class*="user"][class*="name"]');
      if (nameEl) review.user_name = nameEl.textContent.trim();

      const contentEl = item.querySelector('.comment-content, .content, [class*="comment"][class*="content"]');
      if (contentEl) review.content = contentEl.textContent.trim();

      const dateEl = item.querySelector('.date, .time, [class*="date"]');
      if (dateEl) review.rate_time = dateEl.textContent.trim();

      const scoreEl = item.querySelector('.score, [data-rate], [class*="score"]');
      if (scoreEl) {
        const scoreText = scoreEl.textContent || scoreEl.getAttribute('data-rate');
        const score = parseInt(scoreText);
        if (!isNaN(score) && score > 0) {
          review.score = score;
        }
      }

      if (review.content || review.user_name) {
        reviews.push(review);
      }
    } catch (e) {
      console.warn('⚠️ 提取评论时出错:', e);
    }
  });

  console.log(`📊 共提取 ${reviews.length} 条淘宝评论`);
  return reviews;
}

// 主提取函数（改进版 - 支持自动滚动加载）
async function extractReviews() {
  const platform = detectPlatform();
  console.log('🌐 当前平台:', platform);
  console.log('🔗 当前URL:', window.location.href);

  // ========== 第一步：尝试点击"查看全部评论"按钮 ==========
  console.log('🔍 步骤 1/3: 查找并点击"查看全部评论"按钮...');
  const clicked = await clickViewAllReviews();

  if (clicked) {
    console.log('✅ 已点击"查看全部评论"按钮');
    // 等待评论页面/弹窗加载
    await new Promise(resolve => setTimeout(resolve, 2000));
  } else {
    console.log('⚠️ 未找到"查看全部评论"按钮，尝试在当前页面查找评论...');
  }

  // ========== 第二步：滚动到评论区并触发加载 ==========
  console.log('🔄 步骤 2/3: 开始自动滚动加载评论...');

  // 淘宝/天猫主要使用无限滚动，直接调用自动滚动函数
  console.log('📍 针对无限滚动场景进行智能滚动...');
  await autoScrollToLoadMore(50, 1500);

  // ========== 第三步：提取评论数据 ==========
  console.log('📊 步骤 3/3: 开始提取评论数据...');
  let reviews = [];

  if (platform === 'tmall' || platform === 'product_page') {
    // 天猫或商品详情页 - 优先使用天猫提取器
    console.log('📦 使用天猫评论提取器');
    reviews = extractTmallReviews();
  } else if (platform === 'taobao') {
    // 淘宝
    console.log('🛍️ 使用淘宝评论提取器');
    reviews = extractTaobaoReviews();
  } else {
    console.log('❌ 不支持的平台:', platform);
    return {
      success: false,
      message: '请在淘宝或天猫的商品详情页使用',
      count: 0,
      data: []
    };
  }

  // 如果没有找到评论，尝试查找所有文本内容
  if (reviews.length === 0) {
    console.log('🔊 开始备用提取策略...');

    // 查找所有包含星级的元素
    const starElements = document.querySelectorAll('[class*="star"], [class*="rate"], [class*="score"]');
    console.log(`⭐ 找到 ${starElements.length} 个星级相关元素`);

    // 查找所有可能包含评论的文本段落
    const textElements = document.querySelectorAll('p, div, span');
    const potentialComments = [];

    textElements.forEach(el => {
      const text = el.textContent.trim();
      // 过滤条件：长度合适，不包含子元素，不是常见页面元素
      if (text.length > 10 && text.length < 500 &&
          !el.querySelector('p, div, span') &&
          !el.closest('script, style, nav, header, footer')) {
        potentialComments.push({
          element: el,
          text: text
        });
      }
    });

    console.log(`💬 找到 ${potentialComments.length} 个可能的评论文本`);
  }

  return {
    success: true,
    message: reviews.length > 0
      ? `成功提取 ${reviews.length} 条评论`
      : '未找到评论，请查看控制台日志了解详情',
    count: reviews.length,
    data: reviews
  };
}

// 查找下一页按钮（增强版 - 支持更多选择器）
function findNextButton() {
  console.log('🔍 正在查找下一页按钮...');

  const selectors = [
    // 天猫新版分页
    '.next-pagination.next-pagination-next .next-btn',
    '.next-pagination .next-next',
    'button.next-next',
    '.next-pagination-next',

    // 通用分页
    '.next-pagination .next',
    '.pagination-next',
    'a.next',
    '.page-next',
    'a.page-next',

    // 淘宝分页
    '.next-pagination-next',
    '.J_Next',
    'a[trace="slp_next"]',
    'a[trace="srp_next"]',

    // 数据属性
    '[data-action="nextPage"]',
    '[data-page="next"]',
    '[data-testid*="next"]',

    // 类名匹配
    '[class*="next"][class*="page"]',
    '[class*="next"][class*="btn"]',
    '[class*="pagination"][class*="next"]',

    // 文本匹配（包含"下一页"的按钮）
    ...Array.from(document.querySelectorAll('button, a')).filter(el =>
      el.textContent.includes('下一页') ||
      el.textContent.includes('>') && el.textContent.length < 5
    ),

    // 查看更多/加载更多
    '.more',
    '[class*="more"]',
    '[class*="load-more"]',
  ];

  // 去重（因为文本匹配可能返回重复元素）
  const uniqueSelectors = [...new Set(selectors)];

  for (const selector of uniqueSelectors) {
    try {
      const btn = typeof selector === 'string'
        ? document.querySelector(selector)
        : selector; // 直接是元素

      if (btn && isElementVisible(btn)) {
        console.log(`✅ 找到下一页按钮:`, selector?.outerHTML?.substring(0, 100) || selector);
        return btn;
      }
    } catch (e) {
      // 忽略选择器错误
    }
  }

  console.log('⚠️ 未找到下一页按钮，可能使用无限滚动');

  // 尝试查找"加载更多"类型的按钮
  const loadMoreBtns = document.querySelectorAll('button, a');
  for (const btn of loadMoreBtns) {
    const text = btn.textContent.trim();
    if ((text.includes('加载更多') || text.includes('查看更多') || text.includes('展开')) && isElementVisible(btn)) {
      console.log(`✅ 找到加载更多按钮: ${text}`);
      return btn;
    }
  }

  console.log('⚠️ 未找到任何翻页按钮');
  return null;
}

// 检查元素是否可见
function isElementVisible(el) {
  if (!el) return false;

  const style = window.getComputedStyle(el);
  const rect = el.getBoundingClientRect();

  return style.display !== 'none' &&
         style.visibility !== 'hidden' &&
         style.opacity !== '0' &&
         rect.width > 0 &&
         rect.height > 0;
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

        // 异步提取评论
        extractReviews().then(async result => {
          allReviews = allReviews.concat(result.data);
          reviewCount = allReviews.length;

          console.log('✅ 本次提取完成:', result);

          // 等待2秒让页面稳定
          await new Promise(resolve => setTimeout(resolve, 2000));

          // 检测是否有更多评论（无限滚动场景）
          const hasNewReviews = await waitForNewReviews(3000);

          if (hasNewReviews) {
            // 有新评论加载，继续提取
            console.log('➡️ 检测到新评论，继续提取...');
            sendResponse({
              success: true,
              message: `检测到新评论，继续提取... (当前共 ${reviewCount} 条)`,
              count: reviewCount,
              finished: false
            });
            isExtracting = false; // 允许继续提取
            return;
          }

          // 尝试滚动加载更多评论（优先级高于翻页）
          console.log('🔄 尝试滚动加载更多评论...');
          await autoScrollToLoadMore(30, 1500);

          // 等待加载完成后再次提取
          await new Promise(resolve => setTimeout(resolve, 2000));

          const afterScrollReviews = await extractReviews();
          const newCount = afterScrollReviews.data.length;

          if (newCount > 0) {
            // 滚动后有新评论
            allReviews = allReviews.concat(afterScrollReviews.data);
            reviewCount = allReviews.length;
            console.log(`✅ 滚动加载提取到 ${newCount} 条新评论`);

            sendResponse({
              success: true,
              message: `滚动加载到新评论，继续提取... (当前共 ${reviewCount} 条)`,
              count: reviewCount,
              finished: false
            });
            isExtracting = false;
            return;
          }

          // 滚动后仍无新评论，尝试翻页（分页场景）
          await new Promise(resolve => setTimeout(resolve, 1000));
          if (clickNextPage()) {
            console.log('➡️ 已翻到下一页，等待加载...');

            sendResponse({
              success: true,
              message: `已翻到下一页，继续提取... (当前共 ${reviewCount} 条)`,
              count: reviewCount,
              finished: false
            });
            isExtracting = false; // 允许继续提取
          } else {
            console.log('🏁 所有评论提取完成');
            isExtracting = false;
            sendResponse({
              success: true,
              message: '已提取所有评论',
              count: reviewCount,
              data: allReviews,
              finished: true
            });
          }
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

    case 'debug':
      // 调试模式：输出页面结构信息
      const debugInfo = {
        url: window.location.href,
        platform: detectPlatform(),
        reviewCount: document.querySelectorAll('.rate-grid-item, .tm-collep-item, .review-item, .comment-item').length,
        buttons: Array.from(document.querySelectorAll('button, a')).slice(0, 20).map(el => ({
          tag: el.tagName,
          text: el.textContent.substring(0, 30),
          class: el.className,
          visible: isElementVisible(el)
        })),
        bodyHeight: document.body.scrollHeight,
        windowHeight: window.innerHeight
      };
      console.log('🐛 调试信息:', debugInfo);
      sendResponse({ success: true, debugInfo });
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

  return true; // 异步响应
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

// 页面DOM变化监听（用于动态加载的评论）
const observer = new MutationObserver((mutations) => {
  // 可以在这里添加评论动态加载的监听逻辑
});

observer.observe(document.body, {
  childList: true,
  subtree: true
});
