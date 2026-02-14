// 淘宝评论提取插件 - 简化版（临时版本）

console.log('🛒 淘宝评论助手已启动（简化版）');
console.log('🔧 调试信息：content.js 已加载');
console.log('📍 当前URL:', window.location.href);

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

// 找到"用户评价"标签页的内容容器
function findReviewTabContainer() {
  console.log('🔍 查找"用户评价"标签页内容容器...');

  // 方法1：查找标签页内容容器（tab-content/tab-panel）
  const contentSelectors = [
    '[class*="tab-content"]',
    '[class*="tab-panel"]',
    '[class*="tab-body"]',
    '[id*="tab-content"]',
    '[id*="tab-panel"]',
    '[data-role="tab-content"]'
  ];

  for (const selector of contentSelectors) {
    const containers = document.querySelectorAll(selector);
    console.log(`🔊 选择器 "${selector}" 找到 ${containers.length} 个容器`);

    for (const container of containers) {
      const text = container.textContent.trim();
      // 检查容器是否包含"用户评价"相关内容
      if (text.includes('用户评价') || text.includes('累计评价') || text.includes('评价(')) {
        console.log(`✅ 找到可能的内容容器: ${container.className || container.id}`);
        console.log(`   容器内文本长度: ${text.length}`);
        return container;
      }
    }
  }

  // 方法2：查找包含"用户评价"的元素，然后查找其对应的内容区域
  console.log('🔍 方法2: 通过"用户评价"标签查找对应的内容区域...');
  const allElements = document.querySelectorAll('*');
  console.log(`🔊 正在检查 ${allElements.length} 个元素...`);

  for (const el of allElements) {
    const text = el.textContent.trim();

    // 查找包含"用户评价"的标签元素
    if (text === '用户评价' || (text.includes('用户评价') && text.length < 20)) {
      console.log(`🔍 找到"用户评价"标签元素: "${text}"`);
      console.log(`   标签: ${el.tagName}`);
      console.log(`   类名: ${el.className}`);

      // 向上查找标签页的父容器
      let tabContainer = el.parentElement;
      let depth = 0;

      while (tabContainer && depth < 10) {
        const classLower = tabContainer.className.toLowerCase();

        // 查找可能是标签页的容器（包含"tab"、"list"等关键词）
        if (classLower.includes('tab') || classLower.includes('list')) {
          console.log(`📦 深度 ${depth}: 找到标签容器: ${tabContainer.className}`);

          // 查找该标签容器的兄弟元素（内容容器）
          if (tabContainer.parentElement) {
            const siblings = tabContainer.parentElement.children;
            console.log(`📊 标签容器有 ${siblings.length} 个兄弟元素`);

            for (const sibling of siblings) {
              const siblingClass = sibling.className.toLowerCase();
              const siblingText = sibling.textContent.trim();

              // 查找可能是内容容器的兄弟元素
              if (sibling !== tabContainer &&
                  (siblingClass.includes('content') ||
                   siblingClass.includes('panel') ||
                   siblingClass.includes('body')) &&
                  siblingText.length > 100) {
                console.log(`✅ 找到可能的内容容器（兄弟元素）: ${sibling.className || sibling.id}`);
                console.log(`   内容长度: ${siblingText.length}`);
                return sibling;
              }
            }
          }
        }

        tabContainer = tabContainer.parentElement;
        depth++;
      }
    }
  }

  // 方法3：直接在整个页面查找包含"查看全部评价"的元素
  console.log('🔍 方法3: 在全页面查找"查看全部评价"元素...');
  const allLinks = document.querySelectorAll('a, button');
  console.log(`🔊 全页面有 ${allLinks.length} 个可点击元素`);

  for (const el of allLinks) {
    const text = el.textContent.trim();
    if (text.length > 3 && text.length < 80) {
      if ((text.includes('查看') || text.includes('全部')) &&
          (text.includes('评价') || text.includes('评论'))) {
        console.log(`✅ 找到"查看全部评价"按钮: "${text}"`);
        console.log(`   标签: ${el.tagName}`);
        console.log(`   类名: ${el.className}`);
        // 返回该元素的父容器
        if (el.parentElement) {
          console.log(`   父容器: ${el.parentElement.className || el.parentElement.id}`);
          return el.parentElement;
        }
      }
    }
  }

  console.log('⚠️ 所有方法都未找到"用户评价"内容容器');
  return null;
}

// 在指定容器内查找并点击"查看全部评价"按钮
async function clickViewAllReviewsButton() {
  console.log('🔍 查找"查看全部评价"按钮...');

  // 【步骤0】优先通过已知类名直接搜索（根据用户控制台诊断）
  console.log('🔍 步骤 0: 通过类名直接搜索...');
  const directSelectors = [
    '.ShowButton--fMu7HZNs',           // 用户控制台确认的类名
    '[class*="ShowButton"]',            // 包含ShowButton的类
    'div[class*="ShowButton"]',         // DIV元素包含ShowButton
  ];

  for (const selector of directSelectors) {
    try {
      const button = document.querySelector(selector);
      if (button) {
        const text = button.textContent.trim();
        console.log(`✅ 通过选择器 "${selector}" 找到元素`);
        console.log(`   文本: "${text}"`);
        console.log(`   标签: ${button.tagName}`);
        console.log(`   类名: ${button.className}`);

        // 验证是否是"查看全部评价"按钮
        if (text.includes('查看') && text.includes('评价')) {
          console.log('✅ 确认是"查看全部评价"按钮，准备点击...');
          button.click();
          console.log('✅ 已点击"查看全部评价"按钮');
          await new Promise(resolve => setTimeout(resolve, 3000)); // 等待内容展开
          return true;
        }
      }
    } catch (e) {
      console.log(`⚠️ 选择器 "${selector}" 搜索失败:`, e);
    }
  }

  // 【步骤1】在整个页面通过文本搜索（不限定容器）
  console.log('🔍 步骤 1: 在全页面通过文本搜索...');
  const allClickable = document.querySelectorAll('a, button, [role="button"], [onclick], div, span');
  console.log(`🔊 全页面找到 ${allClickable.length} 个可点击元素`);

  for (const el of allClickable) {
    const text = el.textContent.trim();
    // 只检查长度合理的文本（避免匹配整个容器内容）
    if (text.length > 3 && text.length < 80) {
      // 查找包含"查看"、"全部"、"更多"的按钮
      if ((text.includes('查看') || text.includes('全部')) &&
          (text.includes('评价') || text.includes('评论'))) {
        console.log(`✅ 在全页面找到"查看全部评价"按钮: "${text}"`);
        console.log(`   标签: ${el.tagName}`);
        console.log(`   类名: ${el.className}`);

        try {
          el.click();
          console.log('✅ 已点击按钮');
          await new Promise(resolve => setTimeout(resolve, 3000));
          return true;
        } catch (e) {
          console.warn('⚠️ 点击按钮失败:', e);
        }
      }
    }
  }

  console.log('⚠️ 全页面未找到"查看全部评价"按钮');
  return false;
}

// 自动滚动加载更多评论
async function autoScrollToLoadMore() {
  console.log('🔄 开始自动滚动加载评论...');

  let scrollCount = 0;
  let lastReviewCount = 0;
  let noChangeCount = 0;

  // 使用动态查找统计评论数
  const countReviews = () => {
    return findReviewItemsDynamically().length;
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

// 智能查找评论项（动态检测页面结构）
function findReviewItemsDynamically() {
  console.log('🔍 动态检测评论项...');

  // 【优先】直接使用已知的评论项类名
  const directSelectors = [
    '.Comment--H5QmJwe9',              // 当前页面的评论项类名
    '[class*="Comment--"]',               // 包含Comment--的类
    '.comment-item',
    '.review-item',
    '[class*="review-item"]',
    '[class*="comment-item"]',
  ];

  for (const selector of directSelectors) {
    try {
      const items = document.querySelectorAll(selector);
      if (items.length > 0) {
        console.log(`✅ 选择器 "${selector}" 找到 ${items.length} 个评论项`);

        // 验证是否确实是评论项
        let validCount = 0;
        items.forEach(item => {
          // 检查是否包含评论特征元素
          if (item.querySelector('[class*="content"]') ||
              item.querySelector('[class*="user"]') ||
              item.querySelector('[class*="header"]')) {
            validCount++;
          }
        });

        if (validCount > 0) {
          console.log(`✅ 找到 ${validCount} 个有效评论项`);
          return Array.from(items);
        }
      }
    } catch (e) {
      // 忽略无效选择器
    }
  }

  // 【备用】通过内容特征查找
  console.log('🔍 使用内容特征查找评论项...');
  const allDivs = document.querySelectorAll('div, li, article');
  console.log(`🔊 全页面有 ${allDivs.length} 个容器元素`);

  const candidateItems = [];

  for (const div of allDivs) {
    const text = div.textContent.trim();

    // 更严格的过滤：只选择具有评论结构的元素
    if (text.length > 50 && text.length < 5000) { // 合理长度范围
      // 检查是否包含用户名（***、用户、匿名等）
      const hasUserName = /[\u533f\u533a\u5316\u540d]{2,4}\*\*\*|匿名|用户_\d+/.test(text) ||
                          div.querySelector('[class*="Name"]') ||
                          div.querySelector('[class*="User"]');

      // 检查是否包含评论内容（较长的中文文本）
      const hasLongContent = /[\u4e00-\u9fa5]{30,}/.test(text);

      // 检查是否包含日期
      const hasDate = /20[12][0-9]年/.test(text);

      // 检查子元素数量（评论项通常有多个子元素）
      const hasChildren = div.children.length >= 2 && div.children.length <= 10;

      // 必须同时满足：有用户名、有内容、有子元素
      if ((hasUserName || hasDate) && hasLongContent && hasChildren) {
        // 排除已知的不相关元素
        const className = div.className || '';
        if (!className.includes('site-nav') &&
            !className.includes('tb-footer') &&
            !className.includes('Recommend') &&
            !className.includes('PurchasePanel')) {
          candidateItems.push({
            element: div,
            className: className,
            textLength: text.length,
            childCount: div.children.length
          });
        }
      }
    }
  }

  console.log(`🔊 找到 ${candidateItems.length} 个候选评论项`);

  if (candidateItems.length > 0) {
    // 输出前3个候选项供调试
    candidateItems.slice(0, 3).forEach((item, idx) => {
      console.log(`候选 ${idx + 1}: 类名="${item.className}", 子元素=${item.childCount}, 文本长度=${item.textLength}`);
    });

    // 返回候选元素
    return candidateItems.map(item => item.element);
  }

  console.log('⚠️ 未找到任何评论项');
  return [];
}

// 提取评论数据
function extractReviewsFromPage() {
  console.log('📊 开始提取评论数据...');

  const reviews = [];

  // 使用动态查找
  const reviewItems = findReviewItemsDynamically();

  console.log(`🔍 找到 ${reviewItems.length} 个评论项`);

  reviewItems.forEach((item, index) => {
    try {
      console.log(`\n🔍 处理第 ${index + 1} 个评论项...`);
      console.log(`   元素类名: ${item.className || '无类名'}`);
      console.log(`   元素标签: ${item.tagName}`);
      console.log(`   子元素数: ${item.children.length}`);
      console.log(`   文本长度: ${item.textContent.trim().length}`);

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

      // 【调试】输出所有子元素的类名
      console.log(`   子元素类名列表:`);
      Array.from(item.children).forEach((child, idx) => {
        const tag = child.tagName;
        const className = child.className || '无';
        const text = child.textContent.trim().substring(0, 30);
        console.log(`      [${idx}] ${tag} .${className} = "${text}"`);
      });

      // 扩展的选择器列表（兼容新旧页面）
      const nameSelectors = [
        '.tm-user-name',
        '.rate-user-name',
        '.user-name',
        '[class*="user"][class*="name"]',
        '[class*="User"]',
        '[class*="Name"]',
        'span[class*="user"]',
        'span[class*="nick"]',
        '[class*="userInfo"]',  // 当前页面用户信息类名
        '[class*="Name"]'       // 当前页面用户名类名
      ];

      for (const selector of nameSelectors) {
        const nameEl = item.querySelector(selector);
        if (nameEl && nameEl.textContent.trim()) {
          const text = nameEl.textContent.trim();
          // 过滤掉日期等非用户名文本
          if (!text.includes('年') && !text.includes('月') && text.length < 50) {
            review.user_name = text;
            console.log(`   ✅ 用户名: "${review.user_name}" (选择器: ${selector})`);
            break;
          }
        }
      }

      // 【评论内容】只提取评论文本，不包括商家回复
      const contentSelectors = [
        '.content--uonoOhaz',           // 当前页面评论文本类名（最准确）
        '.tm-collep-detail',
        '.rate-comment-detail',
        '.comment-content',
        '[class*="content"][class*="uono"]',  // 包含content和uono的类
        'div[class*="content"]',
        'span[class*="content"]',
        '[class*="text"]'
      ];

      for (const selector of contentSelectors) {
        const contentEl = item.querySelector(selector);
        if (contentEl && contentEl.textContent.trim()) {
          const text = contentEl.textContent.trim();
          // 过滤掉"商家回复"等前缀
          let cleanText = text.replace(/^商家回复：/, '').trim();
          if (cleanText.length > 5) { // 至少5个字符才认为是有效内容
            review.content = cleanText;
            console.log(`   ✅ 评论内容: "${review.content.substring(0, 50)}..." (选择器: ${selector})`);
            break;
          }
        }
      }

      // 【商家回复】单独提取
      const replySelectors = [
        '.reply--ERRy5ue4',              // 当前页面商家回复类名
        '[class*="reply"]',
        '[class*="Reply"]',
        'div[class*="merchant"]',
        'div[class*="seller"]'
      ];

      for (const selector of replySelectors) {
        const replyEl = item.querySelector(selector);
        if (replyEl && replyEl.textContent.trim()) {
          const text = replyEl.textContent.trim();
          // 过滤掉"商家回复："前缀
          let cleanText = text.replace(/^商家回复：/, '').trim();
          if (cleanText.length > 5) {
            review.reply_content = cleanText;
            console.log(`   ✅ 商家回复: "${review.reply_content.substring(0, 50)}..." (选择器: ${selector})`);
            break;
          }
        }
      }

      // 【追评内容】单独提取
      const appendSelectors = [
        '.append--WvlQlFdT',             // 当前页面追评类名
        '[class*="append"]',
        '[class*="Append"]',
        'div[class*="additional"]'
      ];

      for (const selector of appendSelectors) {
        const appendEl = item.querySelector(selector);
        if (appendEl && appendEl.textContent.trim()) {
          const text = appendEl.textContent.trim();
          // 过滤掉"天后追评："前缀
          let cleanText = text.replace(/^\d+天后追评：/, '').trim();
          if (cleanText.length > 5) {
            review.append_content = cleanText;
            console.log(`   ✅ 追评内容: "${review.append_content.substring(0, 50)}..." (选择器: ${selector})`);
            break;
          }
        }
      }

      const scoreSelectors = [
        '.rate-score',
        '.score',
        '[data-rate]',
        '[class*="score"]',
        '[class*="Score"]',
        '[class*="star"]'
      ];

      for (const selector of scoreSelectors) {
        const scoreEl = item.querySelector(selector);
        if (scoreEl) {
          const scoreText = scoreEl.textContent || scoreEl.getAttribute('data-rate');
          const score = parseInt(scoreText);
          if (!isNaN(score) && score > 0) {
            review.score = score;
            console.log(`   ✅ 评分: ${review.score} (选择器: ${selector})`);
            break;
          }
        }
      }

      const dateSelectors = [
        '.tm-collep-date',
        '.rate-time',
        '.date',
        '.time',
        '[class*="date"]',
        '[class*="Date"]',
        '[class*="time"]',
        '[class*="Time"]'
      ];

      for (const selector of dateSelectors) {
        const dateEl = item.querySelector(selector);
        if (dateEl && dateEl.textContent.trim()) {
          review.rate_time = dateEl.textContent.trim();
          console.log(`   ✅ 日期: "${review.rate_time}" (选择器: ${selector})`);
          break;
        }
      }

      // 如果没找到评论内容，尝试从整个元素中提取
      if (!review.content) {
        console.log(`   ⚠️ 未找到评论内容，尝试智能提取...`);
        // 查找包含较长的中文文本的元素
        const allDescendants = item.querySelectorAll('*');
        for (const el of allDescendants) {
          const text = el.textContent.trim();
          const className = el.className || '';

          // 跳过已知非内容元素
          if (className.includes('reply') ||
              className.includes('Reply') ||
              className.includes('append') ||
              className.includes('header') ||
              className.includes('footer')) {
            continue;
          }

          // 检查是否包含较长的中文内容（可能是评论文本）
          if (/[\u4e00-\u9fa5]{10,}/.test(text) && text.length > 10 && text.length < 2000) {
            // 排除已经是用户名或日期的元素
            if (text !== review.user_name && text !== review.rate_time && !text.includes('年') && !text.includes('月')) {
              review.content = text;
              console.log(`   ✅ 智能提取到内容: "${review.content.substring(0, 50)}..."`);
              break;
            }
          }
        }
      }

      if (review.content || review.user_name) {
        // 【去重】检查是否已存在相同评论
        const isDuplicate = reviews.some(r =>
          r.user_name === review.user_name &&
          r.content === review.content
        );

        if (isDuplicate) {
          console.log(`   ⚠️ 跳过重复评论: 用户=${review.user_name}`);
        } else {
          console.log(`   ✅ 保存评论: 用户=${review.user_name}, 内容长度=${review.content.length}`);
          reviews.push(review);
        }
      } else {
        console.log(`   ❌ 跳过此评论（无用户名和内容）`);
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

  // 步骤1：在"用户评价"标签页容器内查找并点击"查看全部评价"按钮
  console.log('🔍 步骤 1/3: 查找并点击"查看全部评价"按钮...');
  const clicked = await clickViewAllReviewsButton();
  if (!clicked) {
    console.log('⚠️ 未找到或未能点击"查看全部评价"按钮，尝试直接提取...');
  }

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
      const canExtractPage = isProductPage();
      console.log('🔍 页面检查结果:', canExtractPage);
      sendResponse({
        canExtract: canExtractPage,
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
