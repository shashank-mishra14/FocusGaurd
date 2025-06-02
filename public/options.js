// Options page JavaScript for FocusGuard Extension
document.addEventListener('DOMContentLoaded', async () => {
  await loadStatistics();
  setupEventListeners();
});

function setupEventListeners() {
  document.getElementById('exportSettings').addEventListener('click', exportSettings);
  document.getElementById('importSettings').addEventListener('click', () => {
    document.getElementById('importFile').click();
  });
  document.getElementById('importFile').addEventListener('change', importSettings);
  document.getElementById('clearAnalytics').addEventListener('click', clearAnalytics);
  document.getElementById('resetAll').addEventListener('click', resetAll);
  document.getElementById('openDashboard').addEventListener('click', openDashboard);
  document.getElementById('openPopup').addEventListener('click', openPopup);
}

async function loadStatistics() {
  try {
    const data = await chrome.storage.local.get(['protectedSites', 'timeTrackingData']);
    const protectedSites = data.protectedSites || [];
    const timeTrackingData = data.timeTrackingData || {};
    
    // Calculate statistics
    const totalSites = protectedSites.length;
    let totalTime = 0;
    let totalDays = 0;
    
    Object.values(timeTrackingData).forEach(siteData => {
      Object.values(siteData).forEach(dayTime => {
        totalTime += dayTime;
        if (dayTime > 0) totalDays++;
      });
    });
    
    const avgDaily = totalDays > 0 ? totalTime / totalDays : 0;
    
    // Update UI
    document.getElementById('totalSites').textContent = totalSites;
    document.getElementById('totalTime').textContent = formatTime(totalTime);
    document.getElementById('avgDaily').textContent = formatTime(avgDaily);
    
  } catch (error) {
    console.error('Error loading statistics:', error);
    showMessage('Error loading statistics', 'error');
  }
}

async function exportSettings() {
  try {
    const data = await chrome.storage.local.get(['protectedSites', 'timeTrackingData']);
    const exportData = {
      protectedSites: data.protectedSites || [],
      timeTrackingData: data.timeTrackingData || {},
      exportDate: new Date().toISOString(),
      version: '1.0.0'
    };
    
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { 
      type: 'application/json' 
    });
    
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `focusguard-settings-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    
    URL.revokeObjectURL(url);
    
    showMessage('Settings exported successfully!', 'success');
  } catch (error) {
    console.error('Error exporting settings:', error);
    showMessage('Error exporting settings. Please try again.', 'error');
  }
}

async function importSettings(event) {
  const file = event.target.files[0];
  if (!file) return;
  
  try {
    const text = await file.text();
    const importData = JSON.parse(text);
    
    // Validate import data
    if (!importData.protectedSites && !importData.timeTrackingData) {
      throw new Error('Invalid settings file format');
    }
    
    if (!confirmAction('This will overwrite your current settings. Continue?')) {
      return;
    }
    
    await chrome.storage.local.set({
      protectedSites: importData.protectedSites || [],
      timeTrackingData: importData.timeTrackingData || {}
    });
    
    showMessage('Settings imported successfully!', 'success');
    await loadStatistics();
    
  } catch (error) {
    console.error('Error importing settings:', error);
    showMessage('Error importing settings. Please check the file format.', 'error');
  }
  
  // Clear file input
  event.target.value = '';
}

async function clearAnalytics() {
  if (!confirmAction('This will permanently delete all analytics data. Continue?')) {
    return;
  }
  
  try {
    await chrome.storage.local.set({ timeTrackingData: {} });
    showMessage('Analytics data cleared successfully!', 'success');
    await loadStatistics();
  } catch (error) {
    console.error('Error clearing analytics:', error);
    showMessage('Error clearing analytics data. Please try again.', 'error');
  }
}

async function resetAll() {
  if (!confirmAction('This will permanently delete ALL extension data including protected sites and analytics. Continue?')) {
    return;
  }
  
  try {
    await chrome.storage.local.clear();
    await chrome.storage.local.set({
      protectedSites: [],
      timeTrackingData: {}
    });
    showMessage('All settings reset successfully!', 'success');
    await loadStatistics();
  } catch (error) {
    console.error('Error resetting settings:', error);
    showMessage('Error resetting settings. Please try again.', 'error');
  }
}

function openDashboard() {
  chrome.tabs.create({ url: chrome.runtime.getURL('dashboard/index.html') });
}

function openPopup() {
  chrome.tabs.create({ url: chrome.runtime.getURL('extension-popup/index.html') });
}

function formatTime(milliseconds) {
  const minutes = Math.floor(milliseconds / 60000);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) {
    return `${days}d ${hours % 24}h`;
  } else if (hours > 0) {
    return `${hours}h ${minutes % 60}m`;
  }
  return `${minutes}m`;
}

function showMessage(message, type) {
  const messagesDiv = document.getElementById('messages');
  const messageElement = document.createElement('div');
  messageElement.className = type === 'success' ? 'success-message' : 'error-message';
  messageElement.textContent = message;
  messageElement.style.display = 'block';
  
  // Clear existing messages
  messagesDiv.innerHTML = '';
  messagesDiv.appendChild(messageElement);
  
  // Auto-hide after 5 seconds
  setTimeout(() => {
    messageElement.style.display = 'none';
  }, 5000);
}

function confirmAction(message) {
  return confirm(message);
} 