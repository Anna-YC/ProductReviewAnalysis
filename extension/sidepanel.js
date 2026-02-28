/**
 * 淘宝评论助手 - 侧边栏交互脚本
 * Phase 4: 可组装性 原则优化版本
 *
 * 优化内容：
 * Phase 1: 按钮互斥显示、使用说明默认收起、状态反馈优化、空状态处理
 * Phase 2: 视觉层级清晰化、色彩对比优化、动画精简、交互自然化
 * Phase 3: 颜色系统统一、组件行为一致、字体权重规范、边框颜色统一
 * Phase 4: 设计 token 完整化、组件模块化、变体系统、原子类工具
 */

console.log('🛒 淘宝评论助手 SidePanel 已加载 - v3.1.0 可组装性优化版');

// ==================== 配置 ====================
const CONFIG = window.REVIEW_HELPER_CONFIG || {
  EXTRACTION_TIMEOUT: 600000,
  FILE_PREFIX: '评论数据',
  CSV_ADD_BOM: true,
  PROGRESS_BASE: 100,
  DEBUG_MODE: false
};

// ==================== 状态变量 ====================
let collectedReviews = [];
let isExtracting = false;
let currentTabId = null;
let scrollCount = 0;

let collectedQaData = [];
let isExtractingQa = false;
let qaScrollCount = 0;

// ==================== DOM 元素缓存 ====================
const elements = {};

// ==================== 初始化 ====================
document.addEventListener('DOMContentLoaded', async () => {
  console.log('SidePanel DOM 加载完成');
  
  cacheElements();
  bindEvents();
  
  // 获取当前标签页
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab) {
    updateStatus('error', '无法获取当前标签页', '请刷新页面重试');
    return;
  }
  
  currentTabId = tab.id;
  console.log('当前标签页:', tab.id, tab.url);
  
  // 检查页面是否支持
  const canExtract = await checkCanExtract(tab);
  if (!canExtract) {
    updateStatus('error', '页面不支持', '请在淘宝/天猫商品详情页使用');
    disableAllButtons();
  } else {
    updateStatus('success', '已连接到商品页面', '可以开始提取数据');
  }
});

// ==================== 元素缓存 ====================
function cacheElements() {
  // 状态相关
  elements.statusCard = document.getElementById('statusCard');
  elements.statusIcon = document.getElementById('statusIcon');
  elements.statusTitle = document.getElementById('statusTitle');
  elements.statusDesc = document.getElementById('statusDesc');
  
  // 指南相关
  elements.toggleGuide = document.getElementById('toggleGuide');
  elements.guidePanel = document.getElementById('guidePanel');
  
  // 标签页
  elements.tabBtns = document.querySelectorAll('.tab-btn');
  elements.tabPanels = document.querySelectorAll('.tab-panel');
  
  // 评论相关
  elements.startBtn = document.getElementById('startBtn');
  elements.stopBtn = document.getElementById('stopBtn');
  elements.exportBtn = document.getElementById('exportBtn');
  elements.analyzeBtn = document.getElementById('analyzeBtn');
  elements.reviewCount = document.getElementById('reviewCount');
  elements.progressContainer = document.getElementById('progressContainer');
  elements.progressFill = document.getElementById('progressFill');
  elements.progressText = document.getElementById('progressText');
  elements.progressPercent = document.getElementById('progressPercent');
  elements.progressDetail = document.getElementById('progressDetail');
  
  // 问答相关
  elements.startQaBtn = document.getElementById('startQaBtn');
  elements.stopQaBtn = document.getElementById('stopQaBtn');
  elements.exportQaBtn = document.getElementById('exportQaBtn');
  elements.qaCount = document.getElementById('qaCount');
  elements.qaProgressContainer = document.getElementById('qaProgressContainer');
  elements.qaProgressFill = document.getElementById('qaProgressFill');
  elements.qaProgressText = document.getElementById('qaProgressText');
  elements.qaProgressPercent = document.getElementById('qaProgressPercent');
  elements.qaProgressDetail = document.getElementById('qaProgressDetail');
  
  // 分析提示
  elements.analyzeTip = document.getElementById('analyzeTip');
  elements.savedPath = document.getElementById('savedPath');
  elements.commandBlock = document.getElementById('commandBlock');
  elements.copyCommand = document.getElementById('copyCommand');
}

// ==================== 事件绑定 ====================
function bindEvents() {
  // 指南折叠（确定性优化：默认收起，使用 expanded 类控制）
  elements.toggleGuide.addEventListener('click', () => {
    const isExpanded = elements.guidePanel.classList.contains('expanded');
    if (isExpanded) {
      elements.guidePanel.classList.remove('expanded');
      elements.toggleGuide.setAttribute('aria-expanded', 'false');
    } else {
      elements.guidePanel.classList.add('expanded');
      elements.toggleGuide.setAttribute('aria-expanded', 'true');
    }
  });

  // 标签页切换（添加 ARIA 支持）
  elements.tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const tabId = btn.dataset.tab;
      switchTab(tabId);
    });
  });

  // 评论按钮
  elements.startBtn.addEventListener('click', startExtraction);
  elements.stopBtn.addEventListener('click', stopExtraction);
  elements.exportBtn.addEventListener('click', exportReviews);
  elements.analyzeBtn.addEventListener('click', analyzeReviews);

  // 问答按钮
  elements.startQaBtn.addEventListener('click', startQaExtraction);
  elements.stopQaBtn.addEventListener('click', stopQaExtraction);
  elements.exportQaBtn.addEventListener('click', exportQaData);

  // 复制命令
  elements.copyCommand.addEventListener('click', copyCommand);

  // 首次访问检查（确定性优化：首次访问自动展开使用说明）
  checkFirstVisit();
}

// ==================== 标签页切换 ====================
function switchTab(tabId) {
  // 更新按钮状态
  elements.tabBtns.forEach(btn => {
    btn.classList.toggle('active', btn.dataset.tab === tabId);
  });
  
  // 更新面板显示
  elements.tabPanels.forEach(panel => {
    panel.classList.toggle('active', panel.id === `tab-${tabId}`);
  });
}

// ==================== 状态更新 ====================
function updateStatus(type, title, desc = '') {
  elements.statusCard.className = 'status-card';
  if (type) {
    elements.statusCard.classList.add(type);
  }
  
  const icons = {
    success: '✅',
    error: '❌',
    loading: '🔄',
    '': '🌐'
  };
  
  elements.statusIcon.textContent = icons[type] || icons[''];
  elements.statusTitle.textContent = title;
  elements.statusDesc.textContent = desc;
}

// ==================== 检查页面 ====================
async function checkCanExtract(tab) {
  try {
    const result = await chrome.tabs.sendMessage(tab.id, { action: 'checkPage' });
    return result && result.canExtract;
  } catch (error) {
    console.warn('无法与 content script 通信:', error);
    return false;
  }
}

// ==================== 评论提取 ====================
async function startExtraction() {
  if (isExtracting) return;

  // 重置状态
  collectedReviews = [];
  elements.analyzeTip.style.display = 'none';

  isExtracting = true;
  scrollCount = 0;

  // 确定性优化：使用新的按钮切换函数
  toggleActionButton('reviews', 'stop');
  elements.exportBtn.disabled = true;
  elements.analyzeBtn.disabled = true;
  elements.progressContainer.classList.add('active');
  elements.reviewCount.classList.add('active');

  updateStatus('loading', '正在提取评论...', '定位到评论区，请稍候');
  
  // 超时检测
  const timeoutId = setTimeout(() => {
    if (isExtracting) {
      finishExtraction('提取超时，请检查页面是否正常', null, false);
    }
  }, CONFIG.EXTRACTION_TIMEOUT);
  
  try {
    await chrome.tabs.sendMessage(currentTabId, { action: 'setProgressCallback' });
    const response = await chrome.tabs.sendMessage(currentTabId, { action: 'extract' });
    
    clearTimeout(timeoutId);
    
    if (response && response.success) {
      collectedReviews = response.data || [];
      
      if (response.count === 0) {
        finishExtraction('未找到评论', null, false);
      } else {
        finishExtraction(null, response.count, true);
      }
    } else {
      throw new Error(response?.message || '提取失败');
    }
  } catch (error) {
    clearTimeout(timeoutId);
    finishExtraction(`提取失败: ${error.message}`, null, false);
  }
}

function finishExtraction(message, count, success) {
  isExtracting = false;

  // 确定性优化：使用新的按钮切换函数
  toggleActionButton('reviews', 'start');
  elements.progressContainer.classList.remove('active');
  elements.reviewCount.classList.remove('active');

  if (success && count !== null) {
    updateStatus('success', `提取完成！共 ${count} 条评论`, '可以导出或分析数据');
    elements.reviewCount.textContent = `${count} 条`;
    elements.reviewCount.classList.add('active');
    updateButtonStates('reviews', false, true);
  } else {
    updateStatus('error', message || '提取失败', '请检查页面后重试');
    updateButtonStates('reviews', false, false);
  }

  fetchCollectedData();
}

async function stopExtraction() {
  try {
    await chrome.tabs.sendMessage(currentTabId, { action: 'stop' });
    isExtracting = false;

    // 确定性优化：使用新的按钮切换函数
    toggleActionButton('reviews', 'start');
    updateStatus('success', '已停止提取', '已保存已提取的数据');

    await fetchCollectedData();

    // 根据是否有数据启用/禁用按钮
    updateButtonStates('reviews', false, collectedReviews.length > 0);
  } catch (error) {
    updateStatus('error', '停止失败', error.message);
  }
}

// ==================== 问答提取 ====================
async function startQaExtraction() {
  if (isExtractingQa) return;

  collectedQaData = [];
  isExtractingQa = true;
  qaScrollCount = 0;

  // 确定性优化：使用新的按钮切换函数
  toggleActionButton('qa', 'stop');
  elements.exportQaBtn.disabled = true;
  elements.qaProgressContainer.classList.add('active');
  elements.qaCount.classList.add('active');

  updateStatus('loading', '正在提取问答...', '定位到问大家页面');
  
  const timeoutId = setTimeout(() => {
    if (isExtractingQa) {
      finishQaExtraction('提取超时', null, false);
    }
  }, CONFIG.EXTRACTION_TIMEOUT);
  
  try {
    await chrome.tabs.sendMessage(currentTabId, { action: 'setQaProgressCallback' });
    const response = await chrome.tabs.sendMessage(currentTabId, { action: 'extractQa' });
    
    clearTimeout(timeoutId);
    
    if (response && response.success) {
      collectedQaData = response.data || [];
      
      if (response.count === 0) {
        finishQaExtraction('未找到问答数据', null, false);
      } else {
        finishQaExtraction(null, response.count, true);
      }
    } else {
      throw new Error(response?.message || '提取失败');
    }
  } catch (error) {
    clearTimeout(timeoutId);
    finishQaExtraction(`提取失败: ${error.message}`, null, false);
  }
}

function finishQaExtraction(message, count, success) {
  isExtractingQa = false;

  // 确定性优化：使用新的按钮切换函数
  toggleActionButton('qa', 'start');
  elements.qaProgressContainer.classList.remove('active');
  elements.qaCount.classList.remove('active');

  if (success && count !== null) {
    updateStatus('success', `提取完成！共 ${count} 个回答`, '可以导出数据');
    elements.qaCount.textContent = `${count} 条`;
    elements.qaCount.classList.add('active');
    updateButtonStates('qa', false, true);
  } else {
    updateStatus('error', message || '提取失败', '请检查页面后重试');
    updateButtonStates('qa', false, false);
  }

  fetchCollectedQaData();
}

async function stopQaExtraction() {
  try {
    await chrome.tabs.sendMessage(currentTabId, { action: 'stopQa' });
    isExtractingQa = false;

    // 确定性优化：使用新的按钮切换函数
    toggleActionButton('qa', 'start');
    updateStatus('success', '已停止提取', '已保存已提取的数据');

    await fetchCollectedQaData();

    // 根据是否有数据启用/禁用按钮
    updateButtonStates('qa', false, collectedQaData.length > 0);
  } catch (error) {
    updateStatus('error', '停止失败', error.message);
  }
}

// ==================== 数据获取 ====================
async function fetchCollectedData() {
  try {
    const response = await chrome.tabs.sendMessage(currentTabId, { action: 'getData' });
    if (response && response.success) {
      collectedReviews = response.data || [];
      elements.reviewCount.textContent = `${collectedReviews.length} 条`;
      if (collectedReviews.length > 0) {
        elements.exportBtn.disabled = false;
        elements.analyzeBtn.disabled = false;
      }
    }
  } catch (error) {
    console.error('获取数据失败:', error);
  }
}

async function fetchCollectedQaData() {
  try {
    const response = await chrome.tabs.sendMessage(currentTabId, { action: 'getQaData' });
    if (response && response.success) {
      collectedQaData = response.data || [];
      elements.qaCount.textContent = `${collectedQaData.length} 条`;
      if (collectedQaData.length > 0) {
        elements.exportQaBtn.disabled = false;
      }
    }
  } catch (error) {
    console.error('获取问答数据失败:', error);
  }
}

// ==================== 导出功能 ====================
async function exportReviews() {
  try {
    await fetchCollectedData();
    
    if (collectedReviews.length === 0) {
      updateStatus('error', '没有可导出的数据', '请先提取评论');
      return;
    }
    
    updateStatus('loading', '正在导出...', `准备导出 ${collectedReviews.length} 条评论`);
    
    const csv = generateReviewCsv(collectedReviews);
    const filename = generateFilename('评论数据');
    await downloadCsv(csv, filename);
    
    updateStatus('success', '导出成功', `已保存 ${collectedReviews.length} 条评论`);
  } catch (error) {
    updateStatus('error', '导出失败', error.message);
  }
}

async function exportQaData() {
  try {
    await fetchCollectedQaData();
    
    if (collectedQaData.length === 0) {
      updateStatus('error', '没有可导出的数据', '请先提取问答');
      return;
    }
    
    updateStatus('loading', '正在导出...', `准备导出 ${collectedQaData.length} 个回答`);
    
    const csv = generateQaCsv(collectedQaData);
    const filename = generateFilename('问答数据');
    await downloadCsv(csv, filename);
    
    updateStatus('success', '导出成功', `已保存 ${collectedQaData.length} 个回答`);
  } catch (error) {
    updateStatus('error', '导出失败', error.message);
  }
}

function generateReviewCsv(reviews) {
  const headers = ['ID', '平台', '用户昵称', '购买SKU', '首评时间', '首评内容', '追评相对时间', '追评内容', '图片链接', '商家回复', '点赞数', '评分'];
  
  const rows = reviews.map(r => [
    r.id || '',
    r.platform || '',
    r.user_name || '',
    r.purchase_sku || '',
    formatDate(r.rate_time),
    r.content || '',
    r.append_relative_time || '',
    r.append_content || '',
    r.images || '',
    r.reply_content || '',
    r.like_count || '',
    r.score || 5
  ]);
  
  return formatCsv(headers, rows);
}

function generateQaCsv(answers) {
  const headers = ['问题内容', '回答者昵称', '用户标签', '回答内容', '回答时间', '购买SKU', '用户身份', '点赞数', '评论数'];
  
  const rows = answers.map(a => [
    a.question || '',
    a.user_nick || '',
    a.user_tag || '',
    a.answer_content || '',
    a.answer_time || '',
    a.purchase_sku || '',
    a.user_identity || '',
    a.like_count || '0',
    a.comment_count || '0'
  ]);
  
  return formatCsv(headers, rows);
}

function formatCsv(headers, rows) {
  const lines = [
    headers.join(','),
    ...rows.map(row => row.map(cell => {
      const str = String(cell).replace(/"/g, '""');
      if (str.includes(',') || str.includes('\n') || str.includes('"')) {
        return `"${str}"`;
      }
      return str;
    }).join(','))
  ];
  return '\uFEFF' + lines.join('\n');
}

function formatDate(dateStr) {
  if (!dateStr) return '';
  if (/^20\d{2}年\d{2}月\d{2}日$/.test(dateStr)) {
    return dateStr;
  }
  const match = dateStr.match(/(20\d{2})[年\/-](\d{1,2})[月\/-](\d{1,2})/);
  if (match) {
    return `${match[1]}年${match[2].padStart(2, '0')}月${match[3].padStart(2, '0')}日`;
  }
  return dateStr;
}

function generateFilename(prefix) {
  const now = new Date();
  const timestamp = now.toISOString().replace(/[:.]/g, '-').slice(0, 19);
  return `${prefix}_${timestamp}.csv`;
}

async function downloadCsv(csvContent, filename) {
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  
  await chrome.downloads.download({
    url: url,
    filename: filename,
    saveAs: true
  });
  
  setTimeout(() => URL.revokeObjectURL(url), 100);
}

// ==================== 分析功能 ====================
async function analyzeReviews() {
  try {
    await fetchCollectedData();
    
    if (collectedReviews.length === 0) {
      updateStatus('error', '没有可分析的数据', '请先提取评论');
      return;
    }
    
    updateStatus('loading', '正在保存数据...', '准备分析');
    
    const savedPath = await saveForAnalysis(collectedReviews);
    const command = `python3 analyze_reviews.py "${savedPath}"`;
    
    elements.savedPath.textContent = savedPath;
    elements.commandBlock.textContent = command;
    elements.analyzeTip.style.display = 'block';
    
    updateStatus('success', '数据已保存', '运行命令生成分析报告');
    
    // 滚动到提示区域
    elements.analyzeTip.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  } catch (error) {
    updateStatus('error', '保存失败', error.message);
  }
}

async function saveForAnalysis(reviews) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const filename = `评论数据_${timestamp}.csv`;
  
  const csv = generateReviewCsv(reviews);
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  
  await chrome.downloads.download({
    url: url,
    filename: `ProductReviewAnalysis/output/crawler/${filename}`,
    saveAs: false
  });
  
  URL.revokeObjectURL(url);
  return `output/crawler/${filename}`;
}

async function copyCommand() {
  const command = elements.commandBlock.textContent;
  try {
    await navigator.clipboard.writeText(command);
    elements.copyCommand.textContent = '✅ 已复制';
    setTimeout(() => {
      elements.copyCommand.textContent = '📋 复制命令';
    }, 2000);
  } catch (error) {
    // 降级方案
    const textarea = document.createElement('textarea');
    textarea.value = command;
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand('copy');
    document.body.removeChild(textarea);
    elements.copyCommand.textContent = '✅ 已复制';
    setTimeout(() => {
      elements.copyCommand.textContent = '📋 复制命令';
    }, 2000);
  }
}

// ==================== 工具函数 ====================
function disableAllButtons() {
  elements.startBtn.disabled = true;
  elements.startQaBtn.disabled = true;
  elements.exportBtn.disabled = true;
  elements.analyzeBtn.disabled = true;
  elements.exportQaBtn.disabled = true;
}

function updateProgress(count, scroll) {
  elements.reviewCount.textContent = `${count} 条`;
  const percent = Math.min((count / CONFIG.PROGRESS_BASE) * 100, 100);
  elements.progressFill.style.width = `${percent}%`;
  elements.progressPercent.textContent = `${Math.round(percent)}%`;
  elements.progressDetail.textContent = `滚动 ${scroll} 次 | ${count} 条评论`;
}

function updateQaProgress(count, scroll) {
  elements.qaCount.textContent = `${count} 条`;
  const percent = Math.min((count / 50) * 100, 100);
  elements.qaProgressFill.style.width = `${percent}%`;
  elements.qaProgressPercent.textContent = `${Math.round(percent)}%`;
  elements.qaProgressDetail.textContent = `滚动 ${scroll} 次 | ${count} 个回答`;
}

// ==================== 确定性优化：按钮切换 ====================
/**
 * 切换开始/停止按钮的显示（使用 hidden 类）
 * @param {string} type - 'reviews' 或 'qa'
 * @param {string} action - 'start' 或 'stop'
 */
function toggleActionButton(type, action) {
  if (type === 'reviews') {
    if (action === 'start') {
      elements.startBtn.classList.remove('hidden');
      elements.stopBtn.classList.add('hidden');
    } else {
      elements.startBtn.classList.add('hidden');
      elements.stopBtn.classList.remove('hidden');
    }
  } else if (type === 'qa') {
    if (action === 'start') {
      elements.startQaBtn.classList.remove('hidden');
      elements.stopQaBtn.classList.add('hidden');
    } else {
      elements.startQaBtn.classList.add('hidden');
      elements.stopQaBtn.classList.remove('hidden');
    }
  }
}

/**
 * 检查是否首次访问（确定性优化）
 * 首次访问自动展开使用说明
 */
function checkFirstVisit() {
  const STORAGE_KEY = 'taobao-helper-has-visited';

  chrome.storage.local.get(STORAGE_KEY, (result) => {
    const hasVisited = result[STORAGE_KEY];

    if (!hasVisited) {
      // 首次访问，展开使用说明
      elements.guidePanel.classList.add('expanded');
      elements.toggleGuide.setAttribute('aria-expanded', 'true');

      // 标记已访问
      chrome.storage.local.set({ [STORAGE_KEY]: true });
    } else {
      // 已访问过，保持收起状态
      elements.guidePanel.classList.remove('expanded');
      elements.toggleGuide.setAttribute('aria-expanded', 'false');
    }
  });
}

/**
 * 更新按钮状态（确定性优化）
 * @param {string} type - 'reviews' 或 'qa'
 * @param {boolean} isWorking - 是否正在工作中
 * @param {boolean} hasData - 是否有数据
 */
function updateButtonStates(type, isWorking, hasData) {
  if (type === 'reviews') {
    // 开始/停止按钮
    toggleActionButton('reviews', isWorking ? 'stop' : 'start');

    // 导出按钮
    elements.exportBtn.disabled = !hasData;

    // 分析按钮
    elements.analyzeBtn.disabled = !hasData;

    // 更新按钮类名以显示加载状态
    if (isWorking) {
      elements.startBtn.classList.add('loading');
    } else {
      elements.startBtn.classList.remove('loading');
    }
  } else if (type === 'qa') {
    toggleActionButton('qa', isWorking ? 'stop' : 'start');
    elements.exportQaBtn.disabled = !hasData;

    if (isWorking) {
      elements.startQaBtn.classList.add('loading');
    } else {
      elements.startQaBtn.classList.remove('loading');
    }
  }
}

/**
 * 显示空状态（确定性优化）
 * @param {string} type - 'reviews' 或 'qa'
 */
function showEmptyState(type) {
  // 如果没有数据，可以在这里显示空状态提示
  console.log(`📭 ${type} 暂无数据`);
}

// ==================== 消息监听 ====================
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'progressUpdate' && isExtracting) {
    const { scrollCount: sc, reviewCount, status } = request.data;
    scrollCount = sc;
    updateProgress(reviewCount, sc);
    
    if (status) {
      updateStatus('loading', status, `滚动 ${sc} 次 | ${reviewCount} 条评论`);
    }
  }
  
  if (request.action === 'qaProgressUpdate' && isExtractingQa) {
    const { scrollCount: sc, qaCount, status } = request.data;
    qaScrollCount = sc;
    updateQaProgress(qaCount, sc);
    
    if (status) {
      updateStatus('loading', status, `滚动 ${sc} 次 | ${qaCount} 个回答`);
    }
  }
  
  return true;
});
