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
    if (url.indexOf('tmall.hk') > -1) return 'tmall-intl';  // 天猫国际
    if (url.indexOf('world.tmall.com') > -1) return 'tmall-intl';  // 天猫国际
    if (url.indexOf('import.tmall.com') > -1) return 'tmall-intl';  // 天猫国际
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

  // 解析混合内容，分离用户ID、购买日期、SKU和纯评论
  function parseMixedContent(mixedText) {
    var result = {
      userId: '',
      purchaseDate: '',
      purchaseSku: '',
      content: mixedText
    };

    if (!mixedText) return result;

    var remaining = mixedText;

    // 1. 提取用户ID（格式如：t_12345678901 或 匿名买家）
    var userIdPatterns = [
      /^([a-z]*_\d{11,})/,           // t_14995957902 格式
      /^(匿名买家)/,                    // 匿名买家
      /^([\u4e00-\u9fa5]{1,3}\*\*[\u4e00-\u9fa5]?\d*)/  // 用**3 格式
    ];

    for (var u = 0; u < userIdPatterns.length; u++) {
      var userIdMatch = remaining.match(userIdPatterns[u]);
      if (userIdMatch) {
        result.userId = userIdMatch[1];
        remaining = remaining.substring(userIdMatch[0].length).trim();
        break;
      }
    }

    // 2. 提取购买日期（格式如：2026-01-13 或 2026年1月13日）
    var purchaseDatePatterns = [
      /(20[12][0-9]{2}-[01]?[0-9]-[0123]?[0-9])/,  // 2026-01-13
      /(20[12][0-9]{2}年[01]?[0-9]月[0123]?[0-9]日)/  // 2026年1月13日
    ];

    for (var d = 0; d < purchaseDatePatterns.length; d++) {
      var dateMatch = remaining.match(purchaseDatePatterns[d]);
      if (dateMatch) {
        result.purchaseDate = dateMatch[1];
        remaining = remaining.substring(dateMatch[0].length).trim();
        break;
      }
    }

    // 3. 提取SKU信息（格式如：已购：JPCD12E-NJ01S 14套 黑色 咨询0元免费测量）
    // SKU结构：产品型号 + 规格信息（中文）+ 促销信息（中文）
    // 示例：JPCD6E-02-B-NF1 14套 白色 白色款/咨询享8折

    // 检查是否有"已购："前缀
    var purchaseIndex = remaining.indexOf('已购');
    if (purchaseIndex === -1) {
      purchaseIndex = remaining.indexOf('已购:');
    }

    if (purchaseIndex > -1) {
      // 找到"已购："之后的内容
      var afterPurchase = remaining.substring(purchaseIndex).replace(/^已购[：:]\s*/, '');

      // SKU提取策略：
      // SKU通常包含：产品型号(字母数字) + 规格(中文短短语) + 促销信息
      // 评论内容以长中文句子开始(15字以上)或特定关键词开始

      // 定义评论开始的关键词模式（这些词之后是评论内容）
      var commentStartPatterns = [
        /东西[是为是很是很不]/,      // 东西是非常/东西很/东西是不
        /容量[大小很大较]/,          // 容量大/容量小/容量很大
        /外观[设计漂亮好看]/,       // 外观设计/外观漂亮
        /安装[师傅很快很好专业]/,   // 安装师傅/安装很快/安装很好
        /洗[碗的很得很干净]/,       // 洗碗的/洗得很/洗得干净
        /清洁[效果很很]/,            // 清洁效果/清洁很好
        /使用[效果很很方便舒心]/,   // 使用效果/使用很好/使用方便
        /商家回复/,                  // 商家回复
        /该用户未填写/,              // 该用户未填写评价内容
        /师傅[安装很很]/,            // 师傅安装/师傅很好
        /洗碗机[很是很是]/,         // 洗碗机很/洗碗机是
        /特别[好不错爱]/,            // 特别好/特别不错/特别爱
        /非常[好不错满意]/,         // 非常好/非常不错/非常满意
        /真的[好不错后悔]/,          // 真的好/真的不错/真的后悔
        /功能[很多很全]/,            // 功能很多/功能很全
        /价格[实惠便宜合适]/,        // 价格实惠/价格便宜/价格合适
        /物流[快很快]/,              // 物流快/物流很快
        /客服[好很好态度]/,          // 客服好/客服很好/客服态度
        /尺寸[正好合适大]/,          // 尺寸正好/尺寸合适/尺寸大
        /空间[大小很大够]/,          // 空间小/空间大/空间很大/空间够
        /声音[不大很小可]/,          // 声音不大/声音很小/声音可
        /颜值[高很]/,                // 颜值高/颜值很
        /效果[很好很错]/,            // 效果很好/效果很错
        /感觉[很不错挺好]/,          // 感觉不错/感觉很好/感觉挺好
        /值得[购买信赖拥有]/         // 值得购买/值得信赖/值得拥有
      ];

      var skuEndIndex = -1;

      // 方法1：查找评论开始关键词
      for (var p = 0; p < commentStartPatterns.length; p++) {
        var patternMatch = afterPurchase.search(commentStartPatterns[p]);
        if (patternMatch > 5) { // 确保前面有SKU内容
          skuEndIndex = patternMatch;
          break;
        }
      }

      // 方法2：如果没找到关键词，查找长中文句子（15字以上连续中文）
      if (skuEndIndex === -1) {
        var chars = afterPurchase.split('');
        var chineseCount = 0;
        var lastChineseStart = 0;

        for (var i = 0; i < chars.length; i++) {
          if (/[\u4e00-\u9fa5]/.test(chars[i])) {
            if (chineseCount === 0) {
              lastChineseStart = i;
            }
            chineseCount++;
          } else {
            // 遇到非中文字符
            if (chineseCount >= 15 && lastChineseStart > 5) {
              // 找到15字以上的中文，且不在开头，可能是评论开始
              skuEndIndex = lastChineseStart;
              break;
            }
            chineseCount = 0;
          }
        }
      }

      // 方法3：如果还没找到，使用正则匹配产品型号后的内容
      if (skuEndIndex === -1) {
        // 匹配：产品型号 + 可选的中文规格/促销 + 长中文评论
        var modelMatch = afterPurchase.match(/^([A-Z0-9\-]{10,50}\s*[\u4e00-\u9fa5a-zA-Z0-9\-\/\s]{0,100}?)(?=[\u4e00-\u9fa5]{15,}|$)/);
        if (modelMatch && modelMatch[1].length > 10) {
          result.purchaseSku = modelMatch[1].trim();
          remaining = afterPurchase.substring(modelMatch[1].length).trim();
        }
      } else {
        // 使用方法1或方法2找到的结束位置
        result.purchaseSku = afterPurchase.substring(0, skuEndIndex).trim();
        remaining = afterPurchase.substring(skuEndIndex).trim();
      }
    }

    // 4. 剩余部分就是纯评论内容
    result.content = remaining.trim();

    return result;
  }

  // 检查是否在"用户评价"页面（full review page）
  // 注意：点击"查看全部评价"后URL不变，需要通过DOM结构判断
  function isFullReviewPage() {
    var reviewCount = findReviewItems().length;

    console.log('🔍 当前评论数:', reviewCount);

    // 方法1: 通过评论数量判断
    // 商品详情页通常只有2-3条评论
    // 用户评价页面有10条以上评论
    if (reviewCount >= 10) {
      console.log('✅ 评论数 >= 10，判定为用户评价页面');
      return true;
    }

    // 方法2: 检查是否有用户评价页面的特征元素
    // 用户评价页面通常有：筛选按钮、分页器、排序选项等
    var filterElements = document.querySelectorAll('[class*="filter"], [class*="sort"], [class*="tab"]');
    var hasFilterUI = filterElements.length > 3;

    // 方法3: 检查是否有"全部评价"相关的tab被选中状态
    var activeTabs = document.querySelectorAll('[class*="active"], [class*="selected"]');
    var hasActiveReviewTab = false;
    for (var i = 0; i < activeTabs.length; i++) {
      var text = activeTabs[i].textContent || '';
      if (text.indexOf('全部') > -1 || text.indexOf('评价') > -1) {
        hasActiveReviewTab = true;
        break;
      }
    }

    // 方法4: 检查页面是否以评论区域为主
    // 用户评价页面的主要内容区就是评论，而商品详情页评论只占一小部分
    var bodyText = document.body.textContent || '';
    var reviewRelatedText = (bodyText.match(/评论/g) || []).length;
    var isReviewDominated = reviewRelatedText > 20;

    if (hasFilterUI || hasActiveReviewTab || isReviewDominated) {
      console.log('✅ 检测到用户评价页面特征（筛选UI/活动tab/评论主导）');
      return true;
    }

    // 商品详情页：评论数少且没有筛选UI
    console.log('⚠️ 检测到商品详情页，跳过抓取（评论数:', reviewCount, '）');
    return false;
  }

  function extractAll() {
    console.log('📊 开始提取评论数据...');

    // 检查是否在用户评价页面，避免抓取商品详情页的重复评论
    if (!isFullReviewPage()) {
      console.log('⏸️ 当前不在用户评价页面，跳过抓取（避免重复）');
      return [];
    }
    
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
        
        // 提取用户昵称 - 从 <div class="userName--KpyzGX2s"> 元素中精确提取
        // HTML: <div class="userName--KpyzGX2s"><span>用**0</span><img src="..."></div>
        try {
          var userNameElement = item.querySelector('[class*="userName"]');
          if (userNameElement) {
            // 查找span标签内的文本
            var nameSpan = userNameElement.querySelector('span');
            if (nameSpan) {
              review.user_name = nameSpan.textContent.trim();
              console.log('✅ 从userName元素提取昵称:', review.user_name);
            } else {
              // 如果没找到span，直接取整个元素的文本
              var nameText = userNameElement.textContent.trim();
              // 移除可能的emoji图标干扰
              review.user_name = nameText;
              console.log('✅ 从userName元素提取昵称（文本方式）:', review.user_name);
            }
          }
        } catch (e) {
          console.warn('从userName元素提取昵称失败:', e);
        }

        // 如果方法1没找到，使用原有的正则匹配作为备用
        if (!review.user_name) {
          var nameMatch = text.match(/([\u4e00-\u9fa5]*\*+[\u4e00-\u9fa5]*)/);
          if (nameMatch) review.user_name = nameMatch[1];
        }

        // 从 <div class="meta--PLijz6qf"> 中提取首评时间和购买SKU
        // HTML: <div class="meta--PLijz6qf">2025年12月31日<span>...</span>已购：JPCD12E-NJ01S 14套 黑色 热销款/咨询享8折</div>
        try {
          var metaElement = item.querySelector('[class*="meta"]');
          if (metaElement) {
            var metaText = metaElement.textContent || '';
            console.log('🔍 找到meta元素，内容:', metaText.substring(0, 50));

            // 提取首评时间（在"已购："之前）
            var metaParts = metaText.split('已购');
            if (metaParts.length > 0) {
              var timePart = metaParts[0].trim();
              // 匹配日期格式：2025年12月31日 或 2025-12-31 或 2025/12/31
              var timeMatch = timePart.match(/(20\d{2})[年\/-]([01]?[0-9])[月\/-]([0123]?[0-9])/);
              if (timeMatch) {
                var year = timeMatch[1];
                var month = timeMatch[2].padStart ? timeMatch[2].padStart(2, '0') : ('0' + timeMatch[2]).slice(-2);
                var day = timeMatch[3].padStart ? timeMatch[3].padStart(2, '0') : ('0' + timeMatch[3]).slice(-2);
                review.rate_time = year + '年' + month + '月' + day + '日';
                console.log('✅ 提取首评时间:', review.rate_time);
              } else {
                console.log('⚠️ 日期匹配失败，timePart:', timePart);
              }
            }

            // 提取购买SKU（"已购："后面的内容）
            if (metaParts.length > 1) {
              var skuPart = metaParts[1].trim();
              // 移除开头的冒号或空格
              skuPart = skuPart.replace(/^[：:]\s*/, '');
              review.purchase_sku = skuPart;
              console.log('✅ 提取购买SKU:', skuPart.substring(0, 30));
            }
          } else {
            console.log('⚠️ 未找到meta元素，尝试其他选择器');
            // 尝试其他选择器
            var altMetaElements = item.querySelectorAll('div');
            for (var am = 0; am < altMetaElements.length; am++) {
              var altText = altMetaElements[am].textContent || '';
              if (altText.indexOf('已购：') > -1 || altText.indexOf('年') > -1) {
                var altMatch = altText.match(/(20\d{2})[年\/-]([01]?[0-9])[月\/-]([0123]?[0-9])/);
                if (altMatch) {
                  var year = altMatch[1];
                  var month = altMatch[2].padStart ? altMatch[2].padStart(2, '0') : ('0' + altMatch[2]).slice(-2);
                  var day = altMatch[3].padStart ? altMatch[3].padStart(2, '0') : ('0' + altMatch[3]).slice(-2);
                  review.rate_time = year + '年' + month + '月' + day + '日';
                  console.log('✅ 使用备用方法提取时间:', review.rate_time);
                  break;
                }
              }
            }
          }
        } catch (e) {
          console.warn('从meta元素提取时间和SKU失败:', e);
        }

        // 如果从meta元素没提取到时间，使用原有的文本匹配方式作为备用
        if (!review.rate_time) {
          var datePatterns = [
            /(20[12][0-9]{3})[年\/-]([01]?[0-9])[月\/-]([0123]?[0-9])[日]?/,
            /(20[12][0-9]{3})([01][0-9])([0123][0-9])/,
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
        }
        
        // 提取纯评论内容 - 从 <div class="content--uonoOhaz"> 元素中精确提取
        // HTML: <div class="content--uonoOhaz " title="">精装房把消毒柜改成了洗碗机...</div>
        review.content = '';
        review.content_raw = '';

        try {
          // 方法1: 查找class包含"content"的元素
          var contentElement = item.querySelector('[class*="content"]');
          if (contentElement) {
            var contentText = contentElement.textContent || '';
            if (contentText.trim().length > 0) {
              review.content = contentText.trim();
              console.log('✅ 从content元素提取评论:', review.content.substring(0, 30));
            }
          }

          // 方法2: 如果方法1没找到，尝试其他选择器
          if (!review.content) {
            var contentSelectors = [
              '[class*="Content"]',
              '[class*="comment"]',
              '[class*="Comment"]',
              '[class*="review"]',
              '[class*="Review"]'
            ];

            for (var cs = 0; cs < contentSelectors.length; cs++) {
              var altContent = item.querySelector(contentSelectors[cs]);
              if (altContent) {
                var altText = altContent.textContent || '';
                if (altText.trim().length >= 10) {
                  review.content = altText.trim();
                  console.log('✅ 使用备用方法提取评论:', review.content.substring(0, 30));
                  break;
                }
              }
            }
          }

          // 方法3: 如果还没找到，使用原有的找最长段落的方式作为最后备用
          if (!review.content) {
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
            if (review.content) {
              console.log('✅ 使用备用方法（最长段落）提取评论');
            }
          }

          // 保存原始评论内容（整个item的文本，用于调试）
          review.content_raw = item.textContent.substring(0, 200);

        } catch (e) {
          console.warn('提取评论内容失败:', e);
          // 最后的兜底：使用整个item文本
          review.content = text.substring(0, 500);
        }

        // 提取点赞数
        // 根据HTML结构精确提取：
        // <div class="headerBtnItem--u5ZDvR8X">
        //   <i class="taobaowebicon icon-taobaoxianxing ..."></i>
        //   <div>4</div>  <-- 点赞数在这里
        // </div>
        review.like_count = '';

        try {
          // 方法1: 查找包含点赞图标的按钮
          var headerBtnItems = item.querySelectorAll('[class*="headerBtnItem"]');
          for (var bi = 0; bi < headerBtnItems.length; bi++) {
            var btnItem = headerBtnItems[bi];
            var btnHTML = btnItem.innerHTML || '';

            // 检查是否包含点赞图标（心形图标: icon-taobaoxianxing）
            if (btnHTML.indexOf('icon-taobaoxianxing') > -1 ||
                btnHTML.indexOf('taobaoxianxing') > -1 ||
                btnHTML.indexOf('xianxing') > -1) {
              // 找到点赞按钮，提取其中的数字
              var divs = btnItem.querySelectorAll('div');
              for (var di = 0; di < divs.length; di++) {
                var divText = divs[di].textContent || '';
                var numMatch = divText.match(/^\d+$/);
                if (numMatch) {
                  review.like_count = numMatch[0];
                  break;
                }
              }
              if (review.like_count) break;
            }
          }

          // 方法2: 如果方法1没找到，尝试查找类名包含"headerBtn"的元素
          if (!review.like_count) {
            var allBtns = item.querySelectorAll('[class*="headerBtn"], [class*="headerBtnsWrap"]');
            for (var b = 0; b < allBtns.length; b++) {
              var btnText = allBtns[b].textContent || '';
              // 查找纯数字
              var nums = btnText.match(/\b\d+\b/g);
              if (nums && nums.length >= 2) {
                // 通常有两个数字：评论数和点赞数，点赞数是第二个
                review.like_count = nums[1];
                break;
              }
            }
          }

          // 方法3: 如果还没找到，在整个评论项中查找所有小数字
          if (!review.like_count) {
            var allText = item.textContent || '';
            var smallNumbers = allText.match(/\b[0-9]\b|\b[1-9][0-9]\b|\b[1-9][0-9]{2}\b/g);
            if (smallNumbers && smallNumbers.length > 0) {
              // 取最后一个较小的数字（通常是点赞数）
              review.like_count = smallNumbers[smallNumbers.length - 1];
            }
          }
        } catch (e) {
          console.warn('提取点赞数失败:', e);
        }

        // 提取追评（追加评论）
        // 重要：只有红色字体的"X天后追评"或"当天追评"标识后的内容才是追加评论
        // 评论内容中提到"追评"（如"等使用了再来追评"）不是追加评论
        // HTML结构: <div class="content--uonoOhaz"><span class="appendInternal--bdb3JNSs">当天追评：</span><span>追评内容</span></div>
        review.append_content = '';
        review.append_relative_time = '';

        try {
          // 方法1: 查找包含appendInternal的元素（这是真正的追评标识，红色字体）
          var appendElements = item.querySelectorAll('[class*="appendInternal"]');
          if (appendElements.length > 0) {
            for (var ae = 0; ae < appendElements.length; ae++) {
              var appendSpan = appendElements[ae];
              var appendLabel = appendSpan.textContent || '';  // 如"当天追评："、"3天后追评："

              // 查找同一个父容器中的下一个span（实际追评内容）
              var parentContainer = appendSpan.parentElement;
              if (parentContainer) {
                var allSpans = parentContainer.querySelectorAll('span');
                for (var as = 0; as < allSpans.length; as++) {
                  if (allSpans[as] !== appendSpan) {
                    var contentText = allSpans[as].textContent || '';
                    if (contentText.trim().length > 0) {
                      review.append_content = contentText.trim();
                      console.log('✅ 从appendInternal元素提取追评:', review.append_content.substring(0, 30));

                      // 提取相对时间（如"当天追评"中的"当天"，"3天后追评"中的"3天后"）
                      var timeMatch = appendLabel.match(/(.*?)追评/);
                      if (timeMatch) {
                        review.append_relative_time = timeMatch[1];
                      }
                      break;
                    }
                  }
                }
                if (review.append_content) break;
              }
            }
          }

          // 注意：不再使用文本匹配作为备用
          // 因为评论内容中可能提到"追评"（如"等使用了再来追评"），这不应该被识别为追加评论
          // 只有真正的appendInternal标识（红色字体）才是追加评论的可靠标识
        } catch (e) {
          console.warn('提取追评失败:', e);
        }
        
        // 提取SKU
        var skuMatch = text.match(/颜色分类[：:]\s*([^\n]+)/);
        if (skuMatch) {
          review.sku = skuMatch[1].trim();
        }

        // 提取图片链接
        // HTML结构: <div class="album--sq8vrGV3"><div class="photo--ZUITAPZq"><img src="..."></div></div>
        review.images = '';
        try {
          // 查找相册容器
          var albumElements = item.querySelectorAll('[class*="album"]');
          var imageUrls = [];

          for (var ae = 0; ae < albumElements.length; ae++) {
            var album = albumElements[ae];
            // 查找相册中的所有图片
            var imgs = album.querySelectorAll('img');
            for (var im = 0; im < imgs.length; im++) {
              var src = imgs[im].getAttribute('src') || '';
              // 过滤掉placeholder图片
              if (src && src.indexOf('placeholder') === -1 && src.indexOf('img.alicdn.com') > -1) {
                // 补全URL（如果是//开头）
                if (src.startsWith('//')) {
                  src = 'https:' + src;
                }
                imageUrls.push(src);
              }
            }
          }

          // 如果用album类名没找到，尝试用photo类名
          if (imageUrls.length === 0) {
            var photoElements = item.querySelectorAll('[class*="photo"] img, [class*="album"] img');
            for (var pe = 0; pe < photoElements.length; pe++) {
              var src = photoElements[pe].getAttribute('src') || '';
              if (src && src.indexOf('placeholder') === -1 && src.indexOf('img.alicdn.com') > -1) {
                if (src.startsWith('//')) {
                  src = 'https:' + src;
                }
                if (imageUrls.indexOf(src) === -1) {
                  imageUrls.push(src);
                }
              }
            }
          }

          // 将图片URL用分号连接
          if (imageUrls.length > 0) {
            review.images = imageUrls.join(';');
          }
        } catch (e) {
          console.warn('提取图片链接失败:', e);
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
  var qaProgressCallback = null;

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

  function sendQaProgress(scrollCount, qaCount, status) {
    if (qaProgressCallback) {
      try {
        qaProgressCallback({
          scrollCount: scrollCount,
          qaCount: qaCount,
          status: status || 'loading'
        });
      } catch (e) {}
    }
  }

  // ==================== 问大家相关函数 ====================

  // 查找问答项
  function findQaItems() {
    var selectors = [
      '[class*="qaItem"]',  // 正式问答界面
      '[class*="QAItem"]',
      '.qa-item',
      '[data-component="qa-item"]'
    ];

    for (var i = 0; i < selectors.length; i++) {
      try {
        var items = document.querySelectorAll(selectors[i]);
        if (items.length > 0) {
          console.log('✅ 找到 ' + items.length + ' 个问答项 (选择器: ' + selectors[i] + ')');
          return Array.prototype.slice.call(items);
        }
      } catch (e) {}
    }
    return [];
  }

  // 统计所有回答的总数量（遍历所有问题，统计每个问题下的回答数）
  function countTotalAnswers() {
    var qaItems = findQaItems();
    var totalAnswers = 0;

    for (var i = 0; i < qaItems.length; i++) {
      try {
        // 在每个问题中查找回答项（使用与extractQaData相同的选择器）
        var answerItems = qaItems[i].querySelectorAll('[class*="answerItem"]');
        totalAnswers += answerItems.length;
      } catch (e) {
        console.warn('统计问题 ' + i + ' 的回答数失败:', e);
      }
    }

    console.log('📊 当前统计: ' + qaItems.length + ' 个问题，' + totalAnswers + ' 个回答');
    return totalAnswers;
  }

  // 提取单个问答数据（从answerItem提取单个回答）
  function extractAnswerData(answerItem, questionText) {
    var answer = {
      question: questionText || '',
      user_nick: '',
      user_tag: '',
      answer_content: '',
      answer_time: '',
      purchase_sku: '',
      user_identity: '',
      like_count: '0',
      comment_count: '0'
    };

    try {
      // 提取回答者昵称
      var nickElement = answerItem.querySelector('[class*="userNick"]');
      if (nickElement) {
        answer.user_nick = nickElement.textContent.trim();
      }

      // 提取用户标签（如"回头客"）
      var tagElement = answerItem.querySelector('[class*="userTag"]');
      if (tagElement) {
        answer.user_tag = tagElement.textContent.trim();
      }

      // 提取回答内容
      var contentElement = answerItem.querySelector('[class*="answerContent"], [class*="initContent"]');
      if (contentElement) {
        answer.answer_content = contentElement.textContent.trim();
      }

      // 提取回答时间和SKU
      var metaElement = answerItem.querySelector('[class*="answerMeta"], [class*="answerTime"]');
      if (metaElement) {
        var metaTitle = metaElement.getAttribute('title') || metaElement.textContent || '';

        console.log('🔍 提取SKU，原始title:', metaTitle);

        // 提取购买SKU（从title中提取【以及其后的所有内容）
        // 格式：2025.05.21 · 【超值组合】冰柠105*2+薄荷105*2
        // 期望输出：【超值组合】冰柠105*2+薄荷105*2
        // 查找【，然后截取从【到字符串末尾的所有内容
        var skuIndex = metaTitle.indexOf('【');
        if (skuIndex > -1) {
          // 从【开始，提取到字符串末尾的所有内容
          var skuContent = metaTitle.substring(skuIndex);
          answer.purchase_sku = skuContent;
          console.log('✅ 提取购买SKU:', answer.purchase_sku);
        } else {
          console.log('⚠️ 未找到【，metaTitle:', metaTitle);
        }

        // 提取时间（从title中提取时间部分，去除SKU部分）
        var timePart = metaTitle.split('·')[0].trim();
        var timeMatch = timePart.match(/(近\d+[天周月年]+发布|今天发布|昨天发布|\d+天前发布|\d+[周月]前发布|\d{4}\.\d{2}\.\d{2})/);
        if (timeMatch) {
          answer.answer_time = timeMatch[1];
        } else {
          answer.answer_time = timePart;
        }
        console.log('✅ 提取回答时间:', answer.answer_time);
      }

      // 提取用户身份（如"近期购买并好评"、"半年内已购"）
      var identityElement = answerItem.querySelector('[class*="timeAgo"]');
      if (identityElement) {
        answer.user_identity = identityElement.textContent.trim();
      }

      // 提取点赞数和评论数
      var btnItems = answerItem.querySelectorAll('[class*="headerBtnItem"]');
      for (var bi = 0; bi < btnItems.length; bi++) {
        var btnHTML = btnItems[bi].innerHTML || '';

        // 检查是否是点赞按钮（icon-taobaoxianxing）
        if (btnHTML.indexOf('icon-taobaoxianxing') > -1) {
          var countDiv = btnItems[bi].querySelector('[class*="headerBtnCount"], div');
          if (countDiv) {
            var countText = countDiv.textContent.trim();
            if (/^\d+$/.test(countText)) {
              answer.like_count = countText;
            }
          }
        }

        // 检查是否是评论按钮（icon-taobaopinglun）
        if (btnHTML.indexOf('icon-taobaopinglun') > -1) {
          var commentCountDiv = btnItems[bi].querySelector('[class*="headerBtnCount"], div');
          if (commentCountDiv) {
            var commentCountText = commentCountDiv.textContent.trim();
            if (/^\d+$/.test(commentCountText)) {
              answer.comment_count = commentCountText;
            }
          }
        }
      }

      return answer;
    } catch (e) {
      console.warn('提取回答数据失败:', e);
      return null;
    }
  }

  // 从qaItem提取问题下的所有回答
  function extractQaData(qaItem) {
    var answers = [];

    try {
      // 提取问题内容
      var questionElement = qaItem.querySelector('[class*="questionTitle"]');
      var questionText = '';
      if (questionElement) {
        questionText = questionElement.textContent.trim();
        console.log('✅ 问题:', questionText);
      }

      // 查找该问题下的所有回答项
      var answerItems = qaItem.querySelectorAll('[class*="answerItem"]');
      if (answerItems.length === 0) {
        console.log('⚠️ 该问题没有回答');
        return [];
      }

      console.log('📝 该问题有 ' + answerItems.length + ' 个回答');

      // 遍历每个回答，提取数据
      for (var i = 0; i < answerItems.length; i++) {
        var answer = extractAnswerData(answerItems[i], questionText);
        if (answer && answer.answer_content) {
          answers.push(answer);
          console.log('  └─ 回答' + (i + 1) + ':', answer.user_nick || '匿名', '->', answer.answer_content.substring(0, 20));
        }
      }

      return answers;
    } catch (e) {
      console.warn('提取问答数据失败:', e);
      return [];
    }
  }

  // 跳转到问大家页面
  async function navigateToQa() {
    console.log('🔍 尝试定位到问大家页面...');

    // 先检查是否已经在问大家页面
    var qaCount = findQaItems().length;
    if (qaCount > 5) {
      console.log('✅ 已经在问大家页面，有 ' + qaCount + ' 个问答');
      return true;
    }

    // 步骤1: 先点击"用户评价"标签
    console.log('🔍 步骤1: 查找"用户评价"标签...');
    var tabSelectors = [
      '[class*="tab--"]',
      '[role="tablist"]',
      '.tm-clear.J_TabBar'
    ];

    var tabClicked = false;
    for (var s = 0; s < tabSelectors.length; s++) {
      var container = document.querySelector(tabSelectors[s]);
      if (container) {
        var tabs = container.querySelectorAll('*');
        for (var t = 0; t < tabs.length; t++) {
          var tabText = tabs[t].textContent || '';

          // 精确匹配"用户评价"
          if (tabText === '用户评价' || (tabText.indexOf('用户评价') > -1 && tabText.length < 20)) {
            console.log('✅ 找到"用户评价"标签，准备点击');

            tabs[t].scrollIntoView({ behavior: 'smooth', block: 'center' });
            await new Promise(function(r) { setTimeout(r, 1000); });

            tabs[t].click();
            console.log('✅ 已点击"用户评价"标签');
            tabClicked = true;

            // 等待页面加载
            await new Promise(function(r) { setTimeout(r, 4000); });
            break;
          }
        }
        if (tabClicked) break;
      }
    }

    // 步骤2: 在用户评价页面中查找"问大家"区域和"查看全部问答"按钮
    console.log('🔍 步骤2: 查找"查看全部问答"按钮...');

    // 等待页面稳定
    await new Promise(function(r) { setTimeout(r, 2000); });

    // 方法1: 通过类名查找"查看全部问答"按钮
    var viewAllBtnSelectors = [
      '[class*="bottomBtn"]',
      '[class*="viewAll"]',
      '[class*="ViewAll"]'
    ];

    for (var bs = 0; bs < viewAllBtnSelectors.length; bs++) {
      var btns = document.querySelectorAll(viewAllBtnSelectors[bs]);
      for (var b = 0; b < btns.length; b++) {
        var btn = btns[b];
        var btnText = btn.textContent || '';

        // 精确匹配"查看全部问答"
        if (btnText === '查看全部问答' || (btnText.indexOf('查看全部问答') > -1 && btnText.length < 30)) {
          console.log('✅ 找到"查看全部问答"按钮');

          btn.scrollIntoView({ behavior: 'smooth', block: 'center' });
          await new Promise(function(r) { setTimeout(r, 1000); });

          clickElement(btn);
          console.log('✅ 已点击"查看全部问答"按钮');

          // 等待页面跳转
          await new Promise(function(r) { setTimeout(r, 5000); });

          var afterClickCount = findQaItems().length;
          console.log('点击后问答数:', afterClickCount);

          if (afterClickCount > 5) {
            console.log('✅ 成功进入问大家页面');
            return true;
          }
        }
      }
    }

    // 方法2: 通过文本搜索查找"查看全部问答"
    console.log('🔍 步骤3: 通过文本查找"查看全部问答"按钮...');
    var allElements = document.querySelectorAll('a, button, span, div');

    for (var i = 0; i < allElements.length; i++) {
      var el = allElements[i];
      var text = el.textContent || '';

      // 精确匹配"查看全部问答"
      if (text === '查看全部问答' || (text.indexOf('查看全部问答') > -1 && text.length < 30)) {

        var rect = el.getBoundingClientRect();
        if (rect.width === 0 || rect.height === 0) continue;

        var style = window.getComputedStyle(el);
        if (style.display === 'none' || style.visibility === 'hidden') continue;

        console.log('✅ 找到"查看全部问答"按钮: "' + text + '"');
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        await new Promise(function(r) { setTimeout(r, 1000); });
        clickElement(el);
        console.log('✅ 已点击"查看全部问答"按钮');

        await new Promise(function(r) { setTimeout(r, 5000); });

        var afterClickCount = findQaItems().length;
        console.log('点击后问答数:', afterClickCount);

        if (afterClickCount > 5) {
          console.log('✅ 成功进入问大家页面');
          return true;
        }
      }
    }

    // 步骤4: 滚动查找
    console.log('🔍 步骤4: 滚动查找问大家...');
    for (var scrollNum = 0; scrollNum < 30; scrollNum++) {
      window.scrollBy(0, window.innerHeight * 0.4);
      await new Promise(function(r) { setTimeout(r, 600); });

      if (scrollNum % 3 === 0) {
        var count = findQaItems().length;
        if (scrollNum % 10 === 0) {
          console.log('  滚动 ' + scrollNum + ' 次，找到 ' + count + ' 个问答');
        }
        if (count > 5) {
          console.log('✅ 找到问大家，有 ' + count + ' 个问答');
          return true;
        }
      }
    }

    console.log('⚠️ 未能自动定位到问大家页面，当前问答数:', findQaItems().length);
    console.log('💡 建议手动点击"用户评价"，然后点击"查看全部问答"按钮');
    return false;
  }

  // 问大家滚动加载
  async function scrollLoadQa() {
    console.log('🔄 开始滚动加载问答...');

    window._shouldStopExtractingQa = false;

    // 先定位到问大家页面
    var navigated = await navigateToQa();

    // 统计初始回答数量（不是问题数量）
    var lastAnswerCount = countTotalAnswers();
    var lastQuestionCount = findQaItems().length;
    console.log('初始问题数:', lastQuestionCount, '初始回答数:', lastAnswerCount);

    if (navigated) {
      sendQaProgress(0, lastAnswerCount, '✅ 成功加载问大家页面');
    } else {
      sendQaProgress(0, lastAnswerCount, '定位到问大家');
    }

    var noChangeCount = 0;

    for (var i = 0; i < 100; i++) {
      if (window._shouldStopExtractingQa) {
        console.log('⏸ 收到停止指令，中断滚动');
        sendQaProgress(i, lastAnswerCount, '已停止');
        window._shouldStopExtractingQa = false;
        return lastAnswerCount;
      }

      sendQaProgress(i + 1, lastAnswerCount, '滚动加载中...');

      // 滚动到底部
      var qaItems = findQaItems();
      if (qaItems.length > 0) {
        var lastItem = qaItems[qaItems.length - 1];
        lastItem.scrollIntoView({ behavior: 'smooth', block: 'center' });
      } else {
        window.scrollBy(0, window.innerHeight * 0.8);
      }

      await new Promise(function(r) { setTimeout(r, 2500); });

      // 每次滚动后，尝试展开所有回答
      await expandAllAnswers();

      // 统计新的回答数量
      var currQuestionCount = findQaItems().length;
      var currAnswerCount = countTotalAnswers();

      if (currAnswerCount > lastAnswerCount || currQuestionCount > lastQuestionCount) {
        console.log('📈 问答增加 - 问题: ' + lastQuestionCount + ' -> ' + currQuestionCount + ', 回答: ' + lastAnswerCount + ' -> ' + currAnswerCount);
        lastQuestionCount = currQuestionCount;
        lastAnswerCount = currAnswerCount;
        noChangeCount = 0;
        // 问答增加时发送更新（显示回答数量）
        sendQaProgress(i + 1, currAnswerCount, '加载到新问答');
      } else {
        noChangeCount++;
        if (noChangeCount >= 5) {
          console.log('✅ 连续5次无新增，滚动完成');
          break;
        }
      }
    }

    console.log('✅ 滚动完成，共 ' + lastQuestionCount + ' 个问题，' + lastAnswerCount + ' 个回答');
    return lastAnswerCount;
  }

  // 展开所有回答（点击"查看全部回答"按钮）- 模拟人类操作避免反爬
  async function expandAllAnswers() {
    try {
      // 检查是否收到停止指令
      if (window._shouldStopExtractingQa) {
        console.log('⏸ 展开操作已取消');
        return;
      }

      // 查找所有"查看全部回答"按钮
      var viewAllBtns = document.querySelectorAll('[class*="viewAllBtnWrap"], [class*="viewAllBtn"], [class*="ViewAllBtn"]');
      var clickCount = 0;

      console.log('🔍 找到 ' + viewAllBtns.length + ' 个"查看全部回答"按钮');

      for (var i = 0; i < viewAllBtns.length; i++) {
        // 每次循环前检查停止标志
        if (window._shouldStopExtractingQa) {
          console.log('⏸ 展开操作已停止，已点击 ' + clickCount + ' 个按钮');
          return;
        }

        var btn = viewAllBtns[i];
        var btnText = btn.textContent || '';

        // 确认是"查看全部回答"按钮
        if (btnText.indexOf('查看全部回答') > -1 || btnText.indexOf('展开') > -1) {
          try {
            // 滚动到按钮位置
            btn.scrollIntoView({ behavior: 'smooth', block: 'center' });

            // 随机延迟 1-3 秒，模拟人类操作
            var randomDelay = Math.floor(Math.random() * 2000) + 1000;
            await new Promise(function(r) { setTimeout(r, randomDelay); });

            // 再次检查停止标志（延迟后）
            if (window._shouldStopExtractingQa) {
              console.log('⏸ 展开操作已停止，已点击 ' + clickCount + ' 个按钮');
              return;
            }

            // 点击按钮
            btn.click();
            clickCount++;
            console.log('✅ 已点击"查看全部回答"按钮 ' + clickCount + '/' + viewAllBtns.length);

            // 点击后再延迟 2-4 秒，等待内容加载
            var afterClickDelay = Math.floor(Math.random() * 2000) + 2000;
            await new Promise(function(r) { setTimeout(r, afterClickDelay); });

            // 每点击 3 个按钮后，暂停更长时间
            if (clickCount % 3 === 0 && clickCount < viewAllBtns.length) {
              console.log('⏸ 暂停 ' + (Math.floor(Math.random() * 2000) + 2000) + 'ms，避免触发反爬');
              await new Promise(function(r) { setTimeout(r, Math.floor(Math.random() * 2000) + 2000); });
            }
          } catch (e) {
            console.warn('点击按钮失败:', e);
          }
        }
      }

      if (clickCount > 0) {
        console.log('✅ 共展开了 ' + clickCount + ' 个问题的所有回答');
      }
    } catch (e) {
      console.warn('展开回答失败:', e);
    }
  }

  // 提取所有问答数据
  function extractAllQa() {
    var qaItems = findQaItems();
    var allAnswers = [];

    console.log('🔍 开始提取问答数据，共 ' + qaItems.length + ' 个问题');

    for (var i = 0; i < qaItems.length; i++) {
      try {
        // 提取该问题下的所有回答
        var answers = extractQaData(qaItems[i]);

        // 将所有回答添加到总数组中
        for (var j = 0; j < answers.length; j++) {
          allAnswers.push(answers[j]);
        }
      } catch (e) {
        console.warn('提取第 ' + i + ' 个问答失败:', e);
      }
    }

    console.log('✅ 提取完成，共 ' + allAnswers.length + ' 个回答');
    return allAnswers;
  }

  // 运行问答提取主流程
  async function runExtractQa() {
    try {
      console.log('🚀 开始问答提取流程');

      var finalCount = await scrollLoadQa();

      // 无论是否完成，都提取当前已有的数据
      var answers = extractAllQa();

      // 保存到全局变量（确保即使停止也能导出）
      window._lastExtractedQaData = answers;

      console.log('✅ 数据已保存到全局变量，共 ' + answers.length + ' 个回答');

      return {
        success: true,
        count: answers.length,
        data: answers
      };
    } catch (error) {
      console.error('问答提取失败:', error);

      // 即使出错，也尝试提取已有数据
      try {
        var answers = extractAllQa();
        window._lastExtractedQaData = answers;
        console.log('⚠️ 提取出错，但已保存 ' + answers.length + ' 个已有数据');
        return {
          success: true,
          count: answers.length,
          data: answers
        };
      } catch (e2) {
        return {
          success: false,
          message: error.message
        };
      }
    }
  }
  async function scrollLoad() {
    console.log('🔄 开始滚动加载...');

    // 重置停止标志
    window._shouldStopExtracting = false;

    // 先定位到评论区
    await navigateToReviews();

    // 检查是否成功跳转到用户评价页面
    var reviewCount = findReviewItems().length;
    var isFullPage = isFullReviewPage();

    console.log('🔍 当前评论数:', reviewCount, '是否在用户评价页面:', isFullPage);

    if (isFullPage && reviewCount >= 10) {
      // 成功跳转到用户评价页面
      console.log('✅ 成功加载评论区');
      sendProgress(0, reviewCount, '✅ 成功加载评论区');
    } else {
      // 可能在详情页，继续执行
      console.log('⚠️ 当前页面评论数较少，继续尝试加载');
      sendProgress(0, reviewCount, '定位到评论区');
    }

    var last = reviewCount;
    
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

      // ==================== 问大家相关 ====================
      case 'extractQa':
        runExtractQa().then(function(result) {
          sendResponse(result);
        });
        return true; // 异步响应

      case 'getQaData':
        // 返回最近一次提取的问答数据
        var lastQaData = window._lastExtractedQaData || [];
        console.log('📤 返回问答数据:', lastQaData.length, '条');
        sendResponse({ success: true, data: lastQaData });
        break;

      case 'setQaProgressCallback':
        // 设置问答进度回调函数
        console.log('✅ 问答进度回调已设置');
        qaProgressCallback = function(data) {
          try {
            chrome.runtime.sendMessage({
              action: 'qaProgressUpdate',
              data: data
            });
          } catch (e) {}
        };
        sendResponse({ success: true });
        break;

      case 'stopQa':
        // 停止问答提取
        console.log('⏸ 收到停止问答提取指令');
        window._shouldStopExtractingQa = true;

        // 立即提取和保存当前已有的数据
        try {
          var answers = extractAllQa();
          window._lastExtractedQaData = answers;
          console.log('✅ 停止时已保存 ' + answers.length + ' 个已有数据到全局变量');
          sendResponse({
            success: true,
            message: '已停止，已保存 ' + answers.length + ' 个数据',
            count: answers.length
          });
        } catch (e) {
          console.warn('停止时提取数据失败:', e);
          sendResponse({ success: true, message: '已发送停止信号' });
        }
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
