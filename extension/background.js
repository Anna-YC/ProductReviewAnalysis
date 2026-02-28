// 淘宝评论助手 - Background Service Worker
// 监听扩展图标点击事件，直接打开侧边栏

console.log('🛒 Background Service Worker 已加载 - v2.9.5');
console.log('🔍 Chrome 版本:', navigator.userAgent);
console.log('🔍 Manifest 版本:', chrome.runtime.getManifest().version);

// 检查侧边栏 API 是否可用
const hasSidePanelAPI = typeof chrome.sidePanel !== 'undefined';
console.log('📊 侧边栏 API 可用:', hasSidePanelAPI);
console.log('📊 chrome.sidePanel 对象:', chrome.sidePanel);

// 获取扩展信息
chrome.runtime.getPlatformInfo((info) => {
  console.log('💻 平台信息:', info);
});

chrome.action.onClicked.addListener((tab) => {
  console.log('🖱 扩展图标被点击');
  console.log('📍 当前标签页:', tab.id, tab.url);

  if (!hasSidePanelAPI) {
    console.error('❌ 侧边栏 API 不可用，使用降级方案');
    chrome.tabs.create({ url: chrome.runtime.getURL('sidepanel.html') });
    return;
  }

  // 直接同步调用，不使用 async/await
  console.log('📂 打开侧边栏...');

  chrome.sidePanel.open({ windowId: tab.windowId }, () => {
    if (chrome.runtime.lastError) {
      console.error('❌ 打开侧边栏失败:', chrome.runtime.lastError.message);
      console.warn('⚠️ 使用降级方案：在新标签页打开');
      chrome.tabs.create({ url: chrome.runtime.getURL('sidepanel.html') });
    } else {
      console.log('✅ 侧边栏已打开');
    }
  });
});

// 扩展安装时的初始化
chrome.runtime.onInstalled.addListener((details) => {
  console.log('📦 扩展事件:', details.reason);

  if (details.reason === 'install') {
    console.log('🎉 淘宝评论助手已安装');
  } else if (details.reason === 'update') {
    console.log('✅ 淘宝评论助手已更新到 v2.9.5');
  }

  // 设置侧边栏（如果 API 可用）
  if (chrome.sidePanel) {
    chrome.sidePanel.setOptions({
      enabled: true
    }).then(() => {
      console.log('✅ 侧边栏已启用');
    }).catch((err) => {
      console.warn('⚠️ 设置侧边栏失败:', err);
    });
  }
});

// 监听启动事件
chrome.runtime.onStartup.addListener(() => {
  console.log('🚀 浏览器启动，扩展已激活');
});
