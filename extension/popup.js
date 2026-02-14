// 淘宝评论助手 - Popup交互脚本

console.log('淘宝评论助手 Popup 已加载');

// 全局变量
let collectedReviews = [];
let isExtracting = false;
let currentTabId = null;
let extractCount = 0; // 提取次数计数器
const MAX_EXTRACT_ATTEMPTS = 50; // 最大提取次数（防止无限循环）
const EXTRACT_TIMEOUT = 300000; // 5分钟超时

// DOM元素
const startBtn = document.getElementById('startBtn');
const stopBtn = document.getElementById('stopBtn');
const exportBtn = document.getElementById('exportBtn');
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

  // 重置计数器
  extractCount = 0;

  // 更新UI状态
  isExtracting = true;
  startBtn.style.display = 'none';
  stopBtn.style.display = 'block';
  exportBtn.disabled = true;
  progressDiv.classList.add('active');
  showStatus('success', '开始提取评论...');

  // 设置超时检测
  const timeoutId = setTimeout(() => {
    if (isExtracting) {
      console.error('⏰ 提取超时');
      stopExtraction('超时，请重试');
    }
  }, EXTRACT_TIMEOUT);

  await doExtract(timeoutId);
});

// 执行提取逻辑（内部函数）
async function doExtract(timeoutId) {
  try {
    // 检查提取次数
    extractCount++;
    if (extractCount > MAX_EXTRACT_ATTEMPTS) {
      clearTimeout(timeoutId);
      stopExtraction(`达到最大提取次数 (${MAX_EXTRACT_ATTEMPTS})`);
      return;
    }

    console.log(`🔄 提取第 ${extractCount}/${MAX_EXTRACT_ATTEMPTS} 次`);

    // 向content script发送提取请求
    const response = await chrome.tabs.sendMessage(currentTabId, { action: 'extract' });
    console.log('extract 响应:', response);

    if (response && response.success) {
      // 更新进度
      updateCount(response.count);

      if (response.finished) {
        // 提取完成
        clearTimeout(timeoutId);
        stopExtraction(null, response.count, true);
      } else {
        // 继续下一页
        showStatus('success', `已提取 ${response.count} 条 (${extractCount}/${MAX_EXTRACT_ATTEMPTS})，继续...`);
        setTimeout(() => {
          doExtract(timeoutId); // 递归调用
        }, 2500); // 增加等待时间到2.5秒
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
    showStatus('success', `✅ 提取完成！共 ${finalCount} 条评论 (${extractCount} 次操作)`);
    exportBtn.disabled = false;
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
  // 更新进度条（假设目标100条）
  const percent = Math.min((count / 100) * 100, 100);
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
}

// 导出为Excel格式
async function exportToExcel(reviews) {
  // 生成Excel文件内容（CSV格式，兼容Excel）
  const headers = ['ID', '平台', '用户昵称', '用户等级', '评论内容', '评分', '日期', 'SKU', '追加评论', '追加日期', '有图片', '商家回复'];
  const rows = reviews.map(review => [
    review.id || '',
    review.platform || '',
    review.user_name || '',
    review.user_level || '',
    review.content || '',
    review.score || 5,
    review.rate_time || '',
    review.sku || '',
    review.append_content || '',
    review.append_time || '',
    review.has_image ? '是' : '否',
    review.reply_content || ''
  ]);

  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.map(cell => {
      // 处理包含逗号、引号或换行的字段
      const cellStr = String(cell);
      if (cellStr.includes(',') || cellStr.includes('"') || cellStr.includes('\n')) {
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
