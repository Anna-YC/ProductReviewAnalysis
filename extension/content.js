// 淘宝评论助手 - CSP 兼容版
// 由于淘宝有 CSP 限制，不能注入 inline script
// 直接在 Content Script 上下文中运行

(function() {
  'use strict';
  
  console.log('🛒 淘宝评论助手已启动 (CSP 兼容版)');
  console.log('📍 当前URL:', window.location.href);

  // ==================== 工具函数 ====================
  function detectPlatform() {
    var url = window.location.href;
    if (url.indexOf('tmall.com') > -1) return 'tmall';
    if (url.indexOf('taobao.com') > -1) return 'taobao';
    return 'unknown';
  }

  // ==================== 评论查找 ====================
  function findReviewItems() {
    // 方法1: 通过类名查找（最快）
    var selectors = [
      '[class*="Comment--"]',
      '[class*="RateItem--"]',
      '[class*="comment-item"]',
      '[class*="review-item"]',
      '.rate-item',
      '.tm-rate-item',
      '.J_RateItem',
      '[class*="rate_list"] > div',
      '[class*="rate-list"] > div'
    ];
    
    for (var i = 0; i < selectors.length; i++) {
      try {
        var items = document.querySelectorAll(selectors[i]);
        if (items.length > 5) { // 至少找到5个才算有效
          return Array.prototype.slice.call(items);
        }
      } catch (e) {}
    }
    
    // 方法2: 通过内容特征查找
    var all = document.querySelectorAll('div, li');
    var results = [];
    
    for (var j = 0; j < all.length && j < 800; j++) {
      var el = all[j];
      var cls = el.className || '';
      var id = el.id || '';
      
      // 跳过导航、页脚等非评论区域
      if (cls.indexOf('nav') > -1 || cls.indexOf('header') > -1 || 
          cls.indexOf('footer') > -1 || cls.indexOf('banner') > -1 ||
          cls.indexOf('recommend') > -1 || cls.indexOf('sidebar') > -1) {
        continue;
      }
      
      var text = el.textContent || '';
      // 评论项特征：包含中文、包含***用户名、包含日期、有子元素
      if (text.length > 80 && text.length < 5000) {
        var hasUser = text.indexOf('***') > -1 || /[\u4e00-\u9fa5]{2,4}\*{2,}/.test(text);
        var hasDate = /20[12][0-9][年/-][01]?[0-9]/.test(text);
        var hasChinese = /[\u4e00-\u9fa5]{30,}/.test(text);
        var hasChildren = el.children.length >= 2;
        
        if (hasChinese && hasUser && hasDate && hasChildren) {
          results.push(el);
        }
      }
    }
    
    return results;
  }

  // ==================== 数据提取 ====================
  function extractReviewData(item) {
    var text = item.textContent || '';
    var review = {
      user_name: '',
      content: '',
      rate_time: '',
      score: 5,
      sku: '',
      append_content: '',
      reply_content: ''
    };
    
    // 用户名
    var nameMatch = text.match(/([\u4e00-\u9fa5]*\*+[\u4e00-\u9fa5]*)/);
    if (nameMatch) review.user_name = nameMatch[1];
    
    // 日期
    var dateMatch = text.match(/(20[12][0-9][年\/-][01]?[0-9][月\/-][0123]?[0-9])/);
    if (dateMatch) review.rate_time = dateMatch[1];
    
    // 内容 - 最长的中文段落
    var paras = text.split(/[\n\r]+/);
    var longest = '';
    for (var k = 0; k < paras.length; k++) {
      var p = paras[k].trim();
      if (p.length > longest.length && p.length > 20 && /[\u4e00-\u9fa5]{20,}/.test(p)) {
        // 排除已知非内容
        if (!/20[12][0-9]/.test(p.substring(0, 10)) && 
            p.indexOf('***') === -1 && 
            p.indexOf('商家回复') === -1) {
          longest = p;
        }
      }
    }
    review.content = longest;
    
    // 商家回复
    var replyIdx = text.indexOf('商家回复');
    if (replyIdx > -1) {
      var replyText = text.substring(replyIdx + 4, replyIdx + 200);
      review.reply_content = replyText.replace(/^[：:]/, '').trim();
    }
    
    return review;
  }

  function extractAll() {
    console.log('📊 开始提取评论数据...');
    
    var items = findReviewItems();
    console.log('找到 ' + items.length + ' 个评论元素');
    
    var reviews = [];
    var seen = {};
    
    for (var i = 0; i < items.length; i++) {
      try {
        var item = items[i];
        var text = item.textContent || '';
        
        // 简单提取：找用户名、日期、内容
        var review = {
          id: 'r_' + Date.now() + '_' + i,
          platform: detectPlatform(),
          user_name: '',
          content: '',
          rate_time: '',
          score: 5
        };
        
        // 提取用户名 (***) 
        var nameMatch = text.match(/([\u4e00-\u9fa5]*\*+[\u4e00-\u9fa5]*)/);
        if (nameMatch) review.user_name = nameMatch[1];
        
        // 提取日期并统一格式为：YYYY年MM月DD日
        var datePatterns = [
          /(20[12][0-9]{3})[年\/-]([01]?[0-9])[月\/-]([0123]?[0-9])[日]?/,  // 2025年11月12日 或 2025/11/12 或 2025-11-12
          /(20[12][0-9]{3})([01][0-9])([0123][0-9])/,  // 20251112
        ];
        
        for (var d = 0; d < datePatterns.length; d++) {
          var dateMatch = text.match(datePatterns[d]);
          if (dateMatch) {
            var year = dateMatch[1];
            var month = dateMatch[2].padStart ? dateMatch[2].padStart(2, '0') : ('0' + dateMatch[2]).slice(-2);
            var day = dateMatch[3].padStart ? dateMatch[3].padStart(2, '0') : ('0' + dateMatch[3]).slice(-2);
            review.rate_time = year + '年' + month + '月' + day + '日';
            break;
          }
        }
        
        // 提取内容 - 找最长的中文段落（排除日期和用户名）
        var lines = text.split(/[\n\r]+/);
        var longest = '';
        for (var j = 0; j < lines.length; j++) {
          var line = lines[j].trim();
          // 至少20个字符，包含中文
          if (line.length > longest.length && line.length >= 20 && /[\u4e00-\u9fa5]{10,}/.test(line)) {
            // 排除日期行和用户名行
            if (!/20[12][0-9]{3}/.test(line.substring(0, 15)) && 
                line.indexOf('***') === -1 &&
                line.indexOf('商家回复') !== 0 &&
                line.indexOf('颜色分类') !== 0 &&
                line.indexOf(' days') === -1) {
              longest = line;
            }
          }
        }
        review.content = longest;
        
        // 提取商家回复（如果有）
        var replyMatch = text.match(/商家回复[：:]?\s*([^\n]+)/);
        if (replyMatch) {
          review.reply_content = replyMatch[1].trim();
        }
        
        // 提取追评（如果有）
        var appendMatch = text.match(/(\d+天[后前])?[追补]评[：:]?\s*([^\n]+)/);
        if (appendMatch) {
          review.append_content = appendMatch[2].trim();
        }
        
        // 提取SKU
        var skuMatch = text.match(/颜色分类[：:]\s*([^\n]+)/);
        if (skuMatch) {
          review.sku = skuMatch[1].trim();
        }
        
        // 保存评论（只要有内容就行）
        if (review.content.length >= 10) {
          // 去重
          var key = (review.user_name + '_' + review.content.substring(0, 20)).replace(/\s/g, '');
          if (!seen[key]) {
            seen[key] = true;
            reviews.push(review);
          }
        }
        
      } catch (e) {
        console.warn('提取第 ' + i + ' 条失败:', e);
      }
    }
    
    console.log('✅ 提取完成，共 ' + reviews.length + ' 条');
    return reviews;
  }

  // ==================== 定位到评论区 ====================
  async function navigateToReviews() {
    console.log('🔍 尝试定位到评论区...');
    
    // 先检查是否已经在评论区
    var initialCount = findReviewItems().length;
    if (initialCount > 5) {
      console.log('✅ 已经在评论区，有 ' + initialCount + ' 条评论');
      return;
    }
    
    // 方法1: 精确查找"用户评价"标签
    console.log('🔍 方法1: 查找评价标签...');
    
    // 先尝试通过更精确的选择器查找标签
    var tabContainerSelectors = [
      '[class*="tab--"]',           // 新版动态类名
      '[class*="Tabs--"]',          
      '[role="tablist"]',           // ARIA 角色
      '.tm-clear.J_TabBar',         // 旧版类名
      '.tabbar',                    
      '[class*="tabbar"]',
      '[class*="TabBar"]'
    ];
    
    var clicked = false;
    
    for (var s = 0; s < tabContainerSelectors.length; s++) {
      var container = document.querySelector(tabContainerSelectors[s]);
      if (container) {
        console.log('✅ 找到标签容器: ' + tabContainerSelectors[s]);
        
        // 在容器内查找"用户评价"标签
        var tabs = container.querySelectorAll('*');
        for (var t = 0; t < tabs.length; t++) {
          var tabText = tabs[t].textContent || '';
          
          // 精确匹配"用户评价"
          if (tabText === '用户评价' || 
              (tabText.indexOf('用户评价') > -1 && tabText.length < 20)) {
            console.log('✅ 找到"用户评价"标签，准备点击');
            
            // 滚动到标签位置
            tabs[t].scrollIntoView({ behavior: 'smooth', block: 'center' });
            await new Promise(function(r) { setTimeout(r, 1000); });
            
            // 点击标签
            tabs[t].click();
            console.log('✅ 已点击"用户评价"标签');
            clicked = true;
            
            // 等待评论区加载
            await new Promise(function(r) { setTimeout(r, 4000); });
            
            // 检查是否成功进入评论区
            var afterClickCount = findReviewItems().length;
            console.log('点击后评论数: ' + afterClickCount);
            
            if (afterClickCount > 0) {
              console.log('✅ 成功进入评论区');
              return;
            } else {
              console.log('⚠️ 点击后未找到评论，可能需要点击"查看全部评价"');
            }
            break;
          }
        }
        
        if (clicked) break;
      }
    }
    
    // 方法2: 如果没找到，尝试全页面搜索点击
    if (!clicked) {
      console.log('🔍 方法2: 全页面搜索评价标签...');
      var allElements = document.querySelectorAll('a, button, span, div, [role="tab"]');
      
      for (var i = 0; i < allElements.length && !clicked; i++) {
        var el = allElements[i];
        var text = el.textContent || '';
        
        // 严格匹配
        if (text === '用户评价' || text === '宝贝评价' || text === '商品评价') {
          console.log('✅ 找到精确匹配: "' + text + '"');
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
          await new Promise(function(r) { setTimeout(r, 1000); });
          el.click();
          clicked = true;
          await new Promise(function(r) { setTimeout(r, 4000); });
          
          if (findReviewItems().length > 0) {
            return;
          }
        }
      }
    }
    
    // 方法3: 尝试点击"查看全部评价"按钮
    console.log('🔍 方法3: 尝试点击"查看全部评价"...');
    var viewAllClicked = await clickViewAllReviews();
    
    if (viewAllClicked) {
      // 点击后再次检查
      var afterViewAll = findReviewItems().length;
      console.log('点击"查看全部评价"后评论数:', afterViewAll);
      
      if (afterViewAll > 10) {
        console.log('✅ 成功加载评论区');
        return;
      }
    }
    
    // 方法4: 直接滚动查找
    console.log('🔍 方法4: 滚动查找评论区...');
    for (var scrollNum = 0; scrollNum < 50; scrollNum++) {
      window.scrollBy(0, window.innerHeight * 0.4);
      await new Promise(function(r) { setTimeout(r, 600); });
      
      if (scrollNum % 3 === 0) {
        var count = findReviewItems().length;
        if (scrollNum % 10 === 0) {
          console.log('  滚动 ' + scrollNum + ' 次，找到 ' + count + ' 条');
        }
        if (count > 10) {
          console.log('✅ 找到评论区，有 ' + count + ' 条评论');
          return;
        }
      }
    }
    
    console.log('⚠️ 未能自动定位到评论区，当前评论数:', findReviewItems().length);
    console.log('💡 建议手动点击"用户评价"标签和"查看全部评价"按钮后再试');
  }
  
  // 点击"查看全部评价"按钮 - 改进版
  async function clickViewAllReviews() {
    console.log('🔍 查找"查看全部评价"按钮...');
    
    // 记录当前URL
    var beforeUrl = window.location.href;
    console.log('📍 当前URL:', beforeUrl);
    
    // 多种可能的按钮文本
    var buttonTexts = ['查看全部评价', '全部评价', '查看更多评价', '查看评价'];
    
    // 方法1: 通过类名查找（新版淘宝）
    var classSelectors = [
      '[class*="ShowButton--"]',
      '[class*="showButton--"]',
      '[class*="ViewAll--"]',
      '[class*="viewAll--"]',
      '[class*="showMore--"]'
    ];
    
    for (var s = 0; s < classSelectors.length; s++) {
      var btn = document.querySelector(classSelectors[s]);
      if (btn) {
        var btnText = btn.textContent || '';
        console.log('✅ 通过类名找到按钮:', btnText);
        
        // 滚动到按钮
        btn.scrollIntoView({ behavior: 'smooth', block: 'center' });
        await new Promise(function(r) { setTimeout(r, 1000); });
        
        // 使用多种方式点击
        clickElement(btn);
        console.log('✅ 已点击按钮（类名方式）');
        
        // 等待跳转
        await new Promise(function(r) { setTimeout(r, 5000); });
        
        // 检查是否跳转
        if (window.location.href !== beforeUrl || findReviewItems().length > 10) {
          console.log('✅ 页面已变化，跳转成功');
          return true;
        }
      }
    }
    
    // 方法2: 通过文本内容查找
    console.log('🔍 通过文本查找按钮...');
    var allElements = document.querySelectorAll('a, button, span, div');
    
    for (var i = 0; i < allElements.length; i++) {
      var el = allElements[i];
      var text = el.textContent || '';
      
      for (var j = 0; j < buttonTexts.length; j++) {
        // 精确匹配或包含
        if ((text === buttonTexts[j] || text.indexOf(buttonTexts[j]) > -1) && 
            text.length < 100) {
          
          // 检查可见性
          var rect = el.getBoundingClientRect();
          if (rect.width === 0 || rect.height === 0) continue;
          
          var style = window.getComputedStyle(el);
          if (style.display === 'none' || style.visibility === 'hidden') continue;
          
          console.log('✅ 找到按钮: "' + text + '"');
          console.log('   标签:', el.tagName);
          console.log('   类名:', el.className);
          
          // 滚动到按钮
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
          await new Promise(function(r) { setTimeout(r, 1000); });
          
          // 多种方式点击
          clickElement(el);
          console.log('✅ 已点击按钮（文本方式）');
          
          // 等待跳转
          await new Promise(function(r) { setTimeout(r, 5000); });
          
          // 检查是否跳转成功
          var afterUrl = window.location.href;
          var reviewCount = findReviewItems().length;
          
          console.log('📍 点击后URL:', afterUrl);
          console.log('📊 评论数:', reviewCount);
          
          if (afterUrl !== beforeUrl || reviewCount > 10) {
            console.log('✅ 跳转成功或有评论加载');
            return true;
          } else {
            console.log('⚠️ 点击后无明显变化，尝试下一个按钮');
          }
        }
      }
    }
    
    console.log('⚠️ 未找到有效的"查看全部评价"按钮');
    return false;
  }
  
  // 可靠的元素点击方式
  function clickElement(el) {
    // 方式1: 直接点击
    el.click();
    
    // 方式2: 创建并分发鼠标事件
    try {
      var mousedown = new MouseEvent('mousedown', {
        bubbles: true,
        cancelable: true,
        view: window
      });
      var mouseup = new MouseEvent('mouseup', {
        bubbles: true,
        cancelable: true,
        view: window
      });
      var click = new MouseEvent('click', {
        bubbles: true,
        cancelable: true,
        view: window
      });
      
      el.dispatchEvent(mousedown);
      el.dispatchEvent(mouseup);
      el.dispatchEvent(click);
    } catch (e) {}
    
    // 方式3: 如果是链接，尝试获取href并跳转
    if (el.tagName === 'A' && el.href && el.href !== '#') {
      console.log('   检测到链接，href:', el.href);
      // 不直接跳转，让点击事件处理
    }
  }

  // ==================== 进度回调 ====================
  var progressCallback = null;
  
  function sendProgress(scrollCount, reviewCount, status) {
    if (progressCallback) {
      try {
        progressCallback({
          scrollCount: scrollCount,
          reviewCount: reviewCount,
          status: status || 'loading'
        });
      } catch (e) {}
    }
  }
  async function scrollLoad() {
    console.log('🔄 开始滚动加载...');
    
    // 重置停止标志
    window._shouldStopExtracting = false;
    
    // 先定位到评论区
    await navigateToReviews();
    
    var last = findReviewItems().length;
    console.log('初始评论数:', last);
    
    // 发送初始进度
    sendProgress(0, last, '定位到评论区');
    
    var noChangeCount = 0;
    var consecutiveNoChange = 0;
    var lastScrollHeight = document.body.scrollHeight;
    
    for (var i = 0; i < 200; i++) {
      // 检查是否收到停止指令
      if (window._shouldStopExtracting) {
        console.log('⏸ 收到停止指令，中断滚动');
        sendProgress(i, last, '已停止');
        window._shouldStopExtracting = false;
        return last;
      }
      
      // 发送进度更新
      sendProgress(i + 1, last, '滚动加载中...');
      
      // 滚动到评论区底部（而不是页面底部）
      var reviewItems = findReviewItems();
      if (reviewItems.length > 0) {
        // 滚动到最后一个评论项
        var lastItem = reviewItems[reviewItems.length - 1];
        lastItem.scrollIntoView({ behavior: 'smooth', block: 'center' });
      } else {
        // 如果没有找到评论，向下滚动一屏
        window.scrollBy(0, window.innerHeight * 0.8);
      }
      
      // 等待懒加载触发（增加等待时间）
      await new Promise(function(r) { setTimeout(r, 3000); });
      
      // 检测评论数变化
      var curr = findReviewItems().length;
      var currentScrollHeight = document.body.scrollHeight;
      
      if (curr > last) {
        console.log('📈 评论增加: ' + last + ' -> ' + curr);
        last = curr;
        noChangeCount = 0;
        consecutiveNoChange = 0;
        lastScrollHeight = currentScrollHeight;
        // 评论增加时发送更新
        sendProgress(i + 1, curr, '加载到新评论');
      } else {
        noChangeCount++;
        // 即使评论数没变，如果页面高度变了，说明还在加载
        if (Math.abs(currentScrollHeight - lastScrollHeight) > 100) {
          console.log('📏 页面高度变化，继续加载...');
          lastScrollHeight = currentScrollHeight;
          consecutiveNoChange = 0;
        } else {
          consecutiveNoChange++;
        }
      }
      
      // 输出进度
      if (i % 5 === 0) {
        console.log('  进度: ' + i + ' 次滚动, ' + curr + ' 条评论');
      }
      
      // 停止条件：连续多次无变化
      if (consecutiveNoChange >= 10) {
        console.log('⏹️ 连续 ' + consecutiveNoChange + ' 次无变化，停止滚动');
        console.log('✅ 最终评论数: ' + last);
        sendProgress(i + 1, last, '加载完成');
        break;
      }
      
      // 尝试点击"加载更多"按钮（如果有）
      if (consecutiveNoChange >= 3 && consecutiveNoChange < 10) {
        var clicked = await clickLoadMoreButton();
        if (clicked) {
          console.log('🔘 点击了加载更多按钮');
          sendProgress(i + 1, last, '点击加载更多');
          consecutiveNoChange = 0;
          await new Promise(function(r) { setTimeout(r, 3000); });
        }
      }
    }
    
    console.log('✅ 滚动完成，共 ' + last + ' 条评论');
    return last;
  }
  
  // 点击"加载更多"按钮
  async function clickLoadMoreButton() {
    var texts = ['加载更多', '查看更多', '展开更多', '显示更多'];
    var elements = document.querySelectorAll('button, a, span, div');
    
    for (var i = 0; i < elements.length; i++) {
      var el = elements[i];
      var text = el.textContent || '';
      
      for (var j = 0; j < texts.length; j++) {
        if (text.indexOf(texts[j]) > -1 && text.length < 50) {
          var rect = el.getBoundingClientRect();
          if (rect.width > 0 && rect.height > 0 && rect.top > 0 && rect.top < window.innerHeight) {
            el.click();
            return true;
          }
        }
      }
    }
    return false;
  }

  async function runExtract() {
    console.log('🚀 开始完整提取...');
    
    // 重置停止标志
    window._shouldStopExtracting = false;
    
    // 步骤0: 确保在评论区
    await navigateToReviews();
    
    // 检查是否已停止
    if (window._shouldStopExtracting) {
      return { success: false, message: '已停止', count: 0, data: [] };
    }
    
    // 步骤1: 滚动加载所有评论
    console.log('步骤1: 滚动加载所有评论...');
    await scrollLoad();
    
    // 检查是否已停止
    if (window._shouldStopExtracting) {
      console.log('⏸ 提取已停止');
      var partialData = extractAll();
      window._lastExtractedData = partialData;
      return { success: true, message: '已停止', count: partialData.length, data: partialData };
    }
    
    // 步骤2: 提取评论数据
    console.log('步骤2: 提取评论数据...');
    var data = extractAll();
    
    console.log('✅ 完成！共 ' + data.length + ' 条');
    
    // 保存到全局变量供调试
    try {
      window._lastExtractedData = data;
    } catch (e) {}
    
    return { success: true, count: data.length, data: data };
  }

  // ==================== 手动诊断功能 ====================
  // 在控制台输入以下命令进行诊断：
  // _reviewHelper.findViewAllButton() - 查找按钮
  // _reviewHelper.testClick() - 测试点击
  
  try {
    Object.defineProperty(window, '_reviewHelper', {
      value: {
        // 查找"查看全部评价"按钮
        findViewAllButton: function() {
          console.log('🔍 诊断：查找"查看全部评价"按钮...');
          var buttons = [];
          var allElements = document.querySelectorAll('a, button, span, div');
          
          for (var i = 0; i < allElements.length; i++) {
            var el = allElements[i];
            var text = el.textContent || '';
            if (text.indexOf('查看全部评价') > -1 || text.indexOf('全部评价') > -1) {
              var rect = el.getBoundingClientRect();
              buttons.push({
                text: text,
                tag: el.tagName,
                className: el.className,
                visible: rect.width > 0 && rect.height > 0,
                element: el
              });
            }
          }
          
          console.log('找到 ' + buttons.length + ' 个候选按钮:');
          buttons.forEach(function(b, idx) {
            console.log(idx + ':', b.text, '|', b.tag, '| 可见:', b.visible);
          });
          
          return buttons;
        },
        
        // 测试点击第一个找到的按钮
        testClick: async function() {
          var buttons = this.findViewAllButton();
          if (buttons.length === 0) {
            console.log('❌ 未找到按钮');
            return false;
          }
          
          var btn = buttons[0];
          console.log('🖱️ 准备点击:', btn.text);
          
          btn.element.scrollIntoView({ behavior: 'smooth', block: 'center' });
          await new Promise(function(r) { setTimeout(r, 1000); });
          
          clickElement(btn.element);
          console.log('✅ 已点击');
          
          await new Promise(function(r) { setTimeout(r, 5000); });
          console.log('📊 点击后评论数:', findReviewItems().length);
          return true;
        },
        
        // 运行完整提取
        extract: runExtract,
        
        // 查看状态
        status: function() {
          console.log('URL:', window.location.href);
          console.log('评论数:', findReviewItems().length);
          console.log('平台:', detectPlatform());
        },
        
        // 测试提取
        testExtract: function() {
          var reviews = extractAll();
          console.log('提取结果:', reviews.slice(0, 3));
          return reviews;
        }
      },
      configurable: true
    });
    console.log('💡 诊断工具已加载，输入 _reviewHelper.findViewAllButton() 查看按钮');
  } catch (e) {}
  
  // ==================== 监听来自 popup 的消息 ====================
  chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
    console.log('📨 收到消息:', request.action);
    
    switch (request.action) {
      case 'checkPage':
        sendResponse({
          canExtract: detectPlatform() !== 'unknown',
          platform: detectPlatform(),
          url: window.location.href
        });
        break;
        
      case 'debug':
        var count = findReviewItems().length;
        sendResponse({
          platform: detectPlatform(),
          count: count,
          url: window.location.href
        });
        break;
        
      case 'extract':
        runExtract().then(function(result) {
          sendResponse(result);
        });
        return true; // 异步响应
        
      case 'scroll':
        scrollLoad().then(function(count) {
          sendResponse({ count: count });
        });
        return true;
        
      case 'test':
        var reviews = extractAll();
        sendResponse({ count: reviews.length, data: reviews.slice(0, 3) });
        break;
        
      case 'getData':
        // 返回最近一次提取的数据
        var lastData = window._lastExtractedData || [];
        console.log('📤 返回数据:', lastData.length, '条');
        sendResponse({ success: true, data: lastData });
        break;
        
      case 'setProgressCallback':
        // 设置进度回调函数（通过消息发送）
        console.log('✅ 进度回调已设置');
        // 保存 sender 以便后续发送进度消息
        progressCallback = function(data) {
          try {
            chrome.runtime.sendMessage({
              action: 'progressUpdate',
              data: data
            });
          } catch (e) {}
        };
        sendResponse({ success: true });
        break;
        
      case 'stop':
        // 停止提取
        console.log('⏸ 收到停止指令');
        window._shouldStopExtracting = true;
        sendResponse({ success: true, message: '已发送停止信号' });
        break;
        
      default:
        sendResponse({ error: '未知操作' });
    }
    
    return true;
  });

  // ==================== 暴露到 window (通过 defineProperty) ====================
  try {
    Object.defineProperty(window, '_taobaoReviewHelper', {
      value: {
        debug: function() {
          console.log('🔍 ===== 调试信息 =====');
          console.log('URL:', window.location.href);
          console.log('Platform:', detectPlatform());
          var count = findReviewItems().length;
          console.log('评论数:', count);
          return { platform: detectPlatform(), count: count };
        },
        count: function() { return findReviewItems().length; },
        scroll: scrollLoad,
        extract: runExtract,
        test: extractAll
      },
      writable: false,
      configurable: true
    });
    console.log('✅ _taobaoReviewHelper 已定义 (由于 CSP，请使用此名称)');
    console.log('💡 提示: 输入 window._taobaoReviewHelper.debug() 调试');
  } catch (e) {
    console.log('⚠️ 无法暴露到 window:', e.message);
  }

  console.log('✅ Content Script 初始化完成');

})();
