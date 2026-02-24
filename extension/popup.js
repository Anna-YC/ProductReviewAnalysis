// 淘宝评论助手 - Popup交互脚本
// 独立封装版本 v2.0.0

console.log('淘宝评论助手 Popup 已加载');

// ==================== 配置加载 ====================
// 使用配置文件中的值，如果配置不存在则使用默认值
const CONFIG = window.REVIEW_HELPER_CONFIG || {
  EXTRACTION_TIMEOUT: 600000,
  FILE_PREFIX: '评论数据',
  CSV_ADD_BOM: true,
  DATE_FORMAT: 'YYYY年MM月DD日',
  PROGRESS_BASE: 100,
  DEBUG_MODE: false
};

// ==================== 全局变量 ====================
let collectedReviews = [];
let isExtracting = false;
let currentTabId = null;
let scrollCount = 0;

// 监听来自 content script 的进度更新
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'progressUpdate' && isExtracting) {
    const { scrollCount: sc, reviewCount, status } = request.data;
    scrollCount = sc;
    updateCount(reviewCount);
    showStatus('success', `🔄 ${status}<br>📜 滚动 ${sc} 次 | 📊 ${reviewCount} 条评论`);
  }
  return true;
});

// DOM元素
const startBtn = document.getElementById('startBtn');
const stopBtn = document.getElementById('stopBtn');
const exportBtn = document.getElementById('exportBtn');
const analyzeBtn = document.getElementById('analyzeBtn');
const analyzeTip = document.getElementById('analyzeTip');
const statusDiv = document.getElementById('status');
const progressDiv = document.getElementById('progress');
const progressFill = document.getElementById('progressFill');
const countSpan = document.getElementById('count');

// 初始化：检查当前页面
document.addEventListener('DOMContentLoaded', async () => {
  console.log('Popup DOM 加载完成');

  // 获取当前激活的标签页
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab) {
    showStatus('error', '无法获取当前标签页');
    return;
  }

  currentTabId = tab.id;
  console.log('当前标签页ID:', currentTabId, 'URL:', tab.url);

  // 检查是否在支持的页面
  const canExtract = await checkCanExtract(tab);
  if (!canExtract) {
    showStatus('error', '请在淘宝或天猫的商品详情页使用');
    disableAllButtons();
  } else {
    showStatus('success', `已连接到商品页面`);
  }
});

// 检查是否可以提取评论
async function checkCanExtract(tab) {
  try {
    const result = await chrome.tabs.sendMessage(tab.id, { action: 'checkPage' });
    console.log('checkPage 结果:', result);
    return result && result.canExtract;
  } catch (error) {
    console.warn('无法与content script通信:', error);
    // 可能是content script未加载
    return false;
  }
}

// 开始提取按钮
startBtn.addEventListener('click', async () => {
  console.log('点击开始按钮');

  if (isExtracting) {
    showStatus('error', '正在提取中，请稍候...');
    return;
  }

  // 重置状态
  collectedReviews = [];
  analyzeTip.style.display = 'none';

  // 更新UI状态
  isExtracting = true;
  startBtn.style.display = 'none';
  stopBtn.style.display = 'block';
  exportBtn.disabled = true;
  analyzeBtn.disabled = true;
  progressDiv.classList.add('active');
  showStatus('success', '🚀 开始提取评论...<br>⏳ 正在定位到评论区，请稍候...');

  // 设置超时检测（使用配置文件中的超时时间）
  const timeoutId = setTimeout(() => {
    if (isExtracting) {
      console.error('⏰ 提取超时');
      stopExtraction('提取超时，可能是评论数量太多或页面加载缓慢');
    }
  }, CONFIG.EXTRACTION_TIMEOUT);

  await doExtract(timeoutId);
});

// 执行提取逻辑（优化版 - content.js 已包含完整的滚动和翻页逻辑）
async function doExtract(timeoutId) {
  try {
    console.log('🚀 开始提取评论（新版：content.js 会自动处理滚动和翻页）');
    
    // 重置滚动计数
    scrollCount = 0;
    
    // 设置进度回调
    await chrome.tabs.sendMessage(currentTabId, { action: 'setProgressCallback' });

    // 向content script发送提取请求
    // content.js 的 extractReviews 函数会：
    // 1. 自动滚动加载所有评论
    // 2. 自动翻页
    // 3. 一次性返回所有评论
    const response = await chrome.tabs.sendMessage(currentTabId, { action: 'extract' });
    console.log('extract 响应:', response);

    if (response && response.success) {
      // 保存数据到全局变量
      collectedReviews = response.data || [];
      console.log('✅ 已保存 ' + collectedReviews.length + ' 条评论到内存');
      
      // 更新进度
      updateCount(response.count);
      
      // 提取完成
      clearTimeout(timeoutId);
      
      if (response.count === 0) {
        stopExtraction('未找到评论，请确保：<br>1. 页面已加载完成<br>2. 在商品详情页<br>3. 评论区可见', null, false);
      } else {
        stopExtraction(null, response.count, true);
      }
    } else {
      throw new Error(response?.message || '提取失败');
    }
  } catch (error) {
    console.error('提取出错:', error);
    clearTimeout(timeoutId);
    stopExtraction(`❌ 提取失败：${error.message}`);
  }
}

// 停止提取（内部函数）
function stopExtraction(message, finalCount = null, isSuccess = false) {
  isExtracting = false;
  startBtn.style.display = 'block';
  stopBtn.style.display = 'none';

  if (isSuccess && finalCount !== null) {
    showStatus('success', `✅ 提取完成！共 ${finalCount} 条评论`);
    exportBtn.disabled = false;
    analyzeBtn.disabled = false;
  } else {
    showStatus('error', message || '❌ 提取失败');
  }

  // 获取当前已提取的数据
  fetchCollectedData();
}

// 停止提取按钮
stopBtn.addEventListener('click', async () => {
  console.log('点击停止按钮');

  try {
    const response = await chrome.tabs.sendMessage(currentTabId, { action: 'stop' });
    console.log('stop 响应:', response);

    // 使用统一的停止函数
    isExtracting = false;
    startBtn.style.display = 'block';
    stopBtn.style.display = 'none';
    showStatus('success', '⏸ 已停止提取');

    // 获取当前已提取的数据
    await fetchCollectedData();
  } catch (error) {
    console.error('停止失败:', error);
    showStatus('error', `停止失败：${error.message}`);
  }
});

// 导出数据按钮
exportBtn.addEventListener('click', async () => {
  console.log('点击导出按钮');

  try {
    // 获取所有已收集的数据
    await fetchCollectedData();

    if (collectedReviews.length === 0) {
      showStatus('error', '没有可导出的数据');
      return;
    }

    showStatus('success', `正在导出 ${collectedReviews.length} 条评论...`);

    // 导出为Excel
    await exportToExcel(collectedReviews);

    showStatus('success', `✅ 导出成功！共 ${collectedReviews.length} 条评论`);
  } catch (error) {
    console.error('导出失败:', error);
    showStatus('error', `❌ 导出失败：${error.message}`);
  }
});

// 一键分析按钮
analyzeBtn.addEventListener('click', async () => {
  console.log('点击分析按钮');

  try {
    // 获取所有已收集的数据
    await fetchCollectedData();

    if (collectedReviews.length === 0) {
      showStatus('error', '没有可分析的数据，请先爬取评论');
      return;
    }

    showStatus('success', `正在准备分析 ${collectedReviews.length} 条评论...`);

    // 保存到项目目录
    const savedPath = await saveForAnalysis(collectedReviews);
    
    showStatus('success', `✅ 数据已保存！<br>📁 ${savedPath}`);
    
    // 显示分析提示
    analyzeTip.style.display = 'block';
    analyzeTip.innerHTML = `
      <strong>✅ 数据已保存！</strong><br>
      文件: ${savedPath}<br><br>
      <strong>下一步：</strong><br>
      1. 打开终端<br>
      2. 运行以下命令：<br>
      <code style="background: #fff; padding: 2px 4px; border-radius: 3px; display: inline-block; margin-top: 5px;">python3 analyze_reviews.py "${savedPath}"</code>
    `;
  } catch (error) {
    console.error('准备分析失败:', error);
    showStatus('error', `❌ 准备分析失败：${error.message}`);
  }
});

// 保存数据用于分析
async function saveForAnalysis(reviews) {
  // 生成文件名
  const now = new Date();
  const timestamp = now.toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const filename = `评论数据_${timestamp}.csv`;
  
  // 生成CSV内容
  const headers = ['ID', '平台', '用户昵称', '购买SKU', '首评时间', '首评内容', '追评相对时间', '追评内容', '图片链接', '商家回复', '点赞数', '评分'];
  const rows = reviews.map(r => [
    r.id || '',
    r.platform || '',
    r.user_name || '',
    r.purchase_sku || '',
    r.rate_time || '',
    r.content || '',
    r.append_relative_time || '',
    r.append_content || '',
    r.images || '',
    r.reply_content || '',
    r.like_count || '',
    r.score || 5
  ]);

  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.map(cell => {
      const cellStr = String(cell);
      if (cellStr.includes(',') || cellStr.includes('"') || cellStr.includes('\n') || cellStr.includes('年')) {
        return `"${cellStr.replace(/"/g, '""')}"`;
      }
      return cellStr;
    }).join(','))
  ].join('\n');

  // 添加BOM
  const BOM = '\uFEFF';
  const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
  
  // 下载文件
  const url = URL.createObjectURL(blob);
  const downloadId = await chrome.downloads.download({
    url: url,
    filename: `ProductReviewAnalysis/output/crawler/${filename}`,
    saveAs: false
  });
  
  URL.revokeObjectURL(url);
  
  return `output/crawler/${filename}`;
}

// 获取已收集的数据
async function fetchCollectedData() {
  try {
    const response = await chrome.tabs.sendMessage(currentTabId, { action: 'getData' });
    console.log('getData 响应:', response);

    if (response && response.success) {
      collectedReviews = response.data || [];
      updateCount(collectedReviews.length);
    }
  } catch (error) {
    console.error('获取数据失败:', error);
  }
}

// 更新计数显示
function updateCount(count) {
  countSpan.textContent = count;
  // 更新进度条（使用配置文件中的基准值）
  const percent = Math.min((count / CONFIG.PROGRESS_BASE) * 100, 100);
  progressFill.style.width = `${percent}%`;
}

// 显示状态信息
function showStatus(type, message) {
  statusDiv.className = `status ${type}`;
  statusDiv.innerHTML = message;
}

// 禁用所有按钮
function disableAllButtons() {
  startBtn.disabled = true;
  exportBtn.disabled = true;
  analyzeBtn.disabled = true;
}

// 导出为Excel格式
async function exportToExcel(reviews) {
  // 生成Excel文件内容（CSV格式，兼容Excel）
  const headers = ['ID', '平台', '用户昵称', '购买SKU', '首评时间', '首评内容', '追评相对时间', '追评内容', '图片链接', '商家回复', '点赞数', '评分'];

  // 格式化日期，确保统一为 YYYY年MM月DD日 格式
  function formatDate(dateStr) {
    if (!dateStr) return '';
    // 如果已经是正确格式，直接返回
    if (/^20\d{2}年\d{2}月\d{2}日$/.test(dateStr)) {
      return dateStr;
    }
    // 尝试解析其他格式
    const match = dateStr.match(/(20\d{2})[年\/-](\d{1,2})[月\/-](\d{1,2})/);
    if (match) {
      const year = match[1];
      const month = match[2].padStart(2, '0');
      const day = match[3].padStart(2, '0');
      return `${year}年${month}月${day}日`;
    }
    return dateStr;
  }

  const rows = reviews.map(review => [
    review.id || '',
    review.platform || '',
    review.user_name || '',
    review.purchase_sku || '',                      // 购买SKU
    formatDate(review.rate_time),                    // 首评时间
    review.content || '',                           // 纯评论内容
    review.append_relative_time || '',              // 追评相对时间
    review.append_content || '',                    // 追加评论
    review.images || '',                            // 图片链接（多个用分号分隔）
    review.reply_content || '',                     // 商家回复
    review.like_count || '',                        // 点赞数
    review.score || 5                               // 评分
  ]);

  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.map(cell => {
      // 处理包含逗号、引号或换行的字段
      const cellStr = String(cell);
      if (cellStr.includes(',') || cellStr.includes('"') || cellStr.includes('\n') || cellStr.includes('年')) {
        return `"${cellStr.replace(/"/g, '""')}"`;
      }
      return cellStr;
    }).join(','))
  ].join('\n');

  // 添加BOM以支持Excel正确显示中文
  const BOM = '\uFEFF';
  const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });

  // 生成文件名
  const now = new Date();
  const timestamp = now.toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const filename = `评论数据_${timestamp}.csv`;

  // 下载文件
  const url = URL.createObjectURL(blob);
  await chrome.downloads.download({
    url: url,
    filename: filename,
    saveAs: true
  });

  // 清理URL
  setTimeout(() => URL.revokeObjectURL(url), 100);
}

// 自动开始提取（内部函数）
function startClick() {
  // 触发开始按钮的点击
  startBtn.click();
}
