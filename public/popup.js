// FocusGuard Extension Popup Script
document.addEventListener('DOMContentLoaded', async () => {
  await loadCurrentSite();
  await loadProtectedSites();
  await loadStats();
  setupEventListeners();
});

function setupEventListeners() {
  // Time limit slider
  const timeLimitSlider = document.getElementById('timeLimit');
  const timeLimitValue = document.getElementById('timeLimitValue');
  const timeLimitDisplay = document.getElementById('timeLimitDisplay');
  
  timeLimitSlider.addEventListener('input', (e) => {
    const value = e.target.value;
    timeLimitValue.textContent = value;
    timeLimitDisplay.textContent = `${value} minutes`;
  });
  
  // Password protection checkbox
  const passwordCheckbox = document.getElementById('passwordProtected');
  const passwordGroup = document.getElementById('passwordGroup');
  
  passwordCheckbox.addEventListener('change', (e) => {
    if (e.target.checked) {
      passwordGroup.classList.remove('hidden');
    } else {
      passwordGroup.classList.add('hidden');
    }
  });

  // Tab switching event listeners
  document.querySelectorAll('.tab').forEach(tab => {
    tab.addEventListener('click', (e) => {
      const targetTab = e.target.dataset.tab;
      if (targetTab) {
        showTab(targetTab, e.target);
      }
    });
  });

  // Button event listeners
  document.getElementById('addSiteBtn').addEventListener('click', addSite);
  document.getElementById('addCurrentSiteBtn').addEventListener('click', addCurrentSite);
}

async function loadCurrentSite() {
  try {
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    const tab = tabs[0];
    
    if (tab && tab.url && !tab.url.startsWith('chrome://')) {
      const domain = new URL(tab.url).hostname;
      document.getElementById('currentDomain').textContent = domain;
      document.getElementById('currentSite').classList.remove('hidden');
      
      // Get today's time for this domain
      const analytics = await chrome.runtime.sendMessage({
        action: 'getAnalytics',
        period: 1
      });
      
      if (analytics?.success && analytics.data[domain]) {
        const todayTime = Object.values(analytics.data[domain].dailyData)[0] || 0;
        const minutes = Math.floor(todayTime / 60000);
        document.getElementById('currentTime').textContent = `Today: ${formatTime(minutes)}`;
      }
    }
  } catch (error) {
    console.error('Error loading current site:', error);
  }
}

async function loadProtectedSites() {
  try {
    const { protectedSites } = await chrome.storage.local.get(['protectedSites']);
    const sites = protectedSites || [];
    
    const siteList = document.getElementById('siteList');
    
    if (sites.length === 0) {
      siteList.innerHTML = `
        <div style="text-align: center; color: #6b7280; padding: 20px;">
          <div style="font-size: 24px; margin-bottom: 8px;">🔒</div>
          <div>No protected sites yet</div>
          <div style="font-size: 12px;">Add your first site to get started!</div>
        </div>
      `;
      return;
    }
    
    siteList.innerHTML = '';
    sites.forEach(site => {
      const siteElement = document.createElement('div');
      siteElement.className = 'site-card';
      
      const hasPassword = site.password ? '🔒' : '';
      const timeLimit = site.timeLimit || 0;
      const timeUsed = 0; // TODO: Get from analytics
      const isOverLimit = timeUsed >= timeLimit;
      
      if (isOverLimit) {
        siteElement.classList.add('blocked');
      }
      
      const progressPercent = timeLimit > 0 ? Math.min((timeUsed / timeLimit) * 100, 100) : 0;
      
      siteElement.innerHTML = `
        <div class="site-header">
          <div class="site-info">
            <div class="site-name">
              ${hasPassword} ${site.domain}
              ${isOverLimit ? '<span style="color: #ef4444;">🚫</span>' : '<span style="color: #10b981;">✅</span>'}
            </div>
            <div class="site-time">
              <span>⏰</span>
              ${timeUsed}m / ${timeLimit}m
            </div>
          </div>
          <div class="site-actions">
            <button class="action-btn edit-btn" title="Edit">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
              </svg>
            </button>
            <button class="action-btn remove-btn" data-domain="${site.domain}" title="Remove">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="3,6 5,6 21,6"/>
                <path d="M19,6v14a2,2 0 0,1 -2,2H7a2,2 0 0,1 -2,-2V6m3,0V4a2,2 0 0,1 2,-2h4a2,2 0 0,1 2,2v2"/>
              </svg>
            </button>
          </div>
        </div>
        <div class="site-progress">
          <div class="site-progress-fill ${isOverLimit ? 'over-limit' : ''}" style="width: ${progressPercent}%"></div>
        </div>
      `;
      
      // Add event listener to the remove button
      const removeBtn = siteElement.querySelector('.remove-btn');
      removeBtn.addEventListener('click', () => {
        removeSite(site.domain);
      });
      
      siteList.appendChild(siteElement);
    });
  } catch (error) {
    console.error('Error loading protected sites:', error);
    showError('Failed to load protected sites');
  }
}

async function loadStats() {
  try {
    const { protectedSites, timeTrackingData } = await chrome.storage.local.get(['protectedSites', 'timeTrackingData']);
    
    const totalSites = (protectedSites || []).length;
    document.getElementById('totalSites').textContent = totalSites;
    
    // Calculate today's total time
    const today = new Date().toDateString();
    let todayTotal = 0;
    let sitesVisitedToday = 0;
    
    if (timeTrackingData) {
      Object.values(timeTrackingData).forEach(siteData => {
        const dayTime = siteData[today] || 0;
        todayTotal += dayTime;
        if (dayTime > 0) sitesVisitedToday++;
      });
    }
    
    const todayMinutes = Math.floor(todayTotal / 60000);
    const dailyLimit = 240; // 4 hours
    const progressPercent = Math.min((todayMinutes / dailyLimit) * 100, 100);
    
    // Update UI elements
    document.getElementById('todayTime').textContent = formatTime(todayMinutes);
    document.getElementById('todayUsage').textContent = formatTime(todayMinutes);
    document.getElementById('sitesVisited').textContent = `${sitesVisitedToday} sites visited`;
    document.getElementById('timeRemaining').textContent = `${Math.max(0, dailyLimit - todayMinutes)}m remaining`;
    
    // Update progress bar
    const progressBar = document.getElementById('dailyProgress');
    if (progressBar) {
      setTimeout(() => {
        progressBar.style.width = `${progressPercent}%`;
      }, 500);
    }
    
  } catch (error) {
    console.error('Error loading stats:', error);
  }
}

async function addSite() {
  const siteUrl = document.getElementById('siteUrl').value.trim();
  const timeLimit = parseInt(document.getElementById('timeLimit').value);
  const passwordProtected = document.getElementById('passwordProtected').checked;
  const password = document.getElementById('sitePassword').value;
  
  if (!siteUrl) {
    showError('Please enter a website URL');
    return;
  }
  
  if (passwordProtected && !password) {
    showError('Please enter a password');
    return;
  }
  
  try {
    const siteData = {
      domain: siteUrl.replace(/^https?:\/\//, '').replace(/^www\./, ''),
      timeLimit: timeLimit,
      password: passwordProtected ? password : undefined
    };
    
    const response = await chrome.runtime.sendMessage({
      action: 'addProtectedSite',
      data: siteData
    });
    
    if (response?.success) {
      showSuccess('Site added successfully!');
      
      // Clear form
      document.getElementById('siteUrl').value = '';
      document.getElementById('timeLimit').value = '60';
      document.getElementById('timeLimitValue').textContent = '60';
      document.getElementById('passwordProtected').checked = false;
      document.getElementById('sitePassword').value = '';
      document.getElementById('passwordGroup').classList.add('hidden');
      
      // Reload data
      await loadProtectedSites();
      await loadStats();
    } else {
      showError('Failed to add site: ' + (response?.error || 'Unknown error'));
    }
  } catch (error) {
    console.error('Error adding site:', error);
    showError('Failed to add site');
  }
}

async function removeSite(domain) {
  if (!confirm(`Remove ${domain} from protected sites?`)) {
    return;
  }
  
  try {
    const response = await chrome.runtime.sendMessage({
      action: 'removeProtectedSite',
      domain: domain
    });
    
    if (response?.success) {
      showSuccess('Site removed successfully!');
      await loadProtectedSites();
      await loadStats();
    } else {
      showError('Failed to remove site');
    }
  } catch (error) {
    console.error('Error removing site:', error);
    showError('Failed to remove site');
  }
}

async function addCurrentSite() {
  try {
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    const tab = tabs[0];
    
    if (tab && tab.url && !tab.url.startsWith('chrome://')) {
      const domain = new URL(tab.url).hostname;
      document.getElementById('siteUrl').value = domain;
      showTab('add');
    } else {
      showError('Cannot protect this type of page');
    }
  } catch (error) {
    console.error('Error getting current site:', error);
    showError('Failed to get current site');
  }
}

function showTab(tabName, clickedElement = null) {
  // Hide all tab panels
  document.querySelectorAll('.tab-panel').forEach(panel => {
    panel.classList.remove('active');
  });
  
  // Remove active class from all tab buttons
  document.querySelectorAll('.tab').forEach(tab => {
    tab.classList.remove('active');
  });
  
  // Show selected tab panel
  const targetTab = document.getElementById(tabName + 'Tab');
  if (targetTab) {
    targetTab.classList.add('active');
  }
  
  // Add active class to clicked tab button
  if (clickedElement) {
    clickedElement.classList.add('active');
  } else {
    // Fallback: find the tab button by data attribute
    document.querySelectorAll('.tab').forEach(tab => {
      if (tab.dataset.tab === tabName) {
        tab.classList.add('active');
      }
    });
  }
}

function openSettings() {
  // Open the authenticated Next.js settings instead of options.html
  chrome.tabs.create({ url: 'http://localhost:3000/dashboard?tab=settings' });
  window.close();
}

async function openDashboard() {
  try {
    // Try to generate a session token for seamless authentication
    const response = await fetch('http://localhost:3000/api/extension/session', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        action: 'generate',
        extensionId: chrome.runtime.id
      })
    });
    
    if (response.ok) {
      const data = await response.json();
      if (data.success && data.token) {
        // Open dashboard with session token
        chrome.tabs.create({ 
          url: `http://localhost:3000/extension-popup?token=${data.token}&redirect=dashboard` 
        });
      } else {
        // Fallback to regular dashboard
        chrome.tabs.create({ url: 'http://localhost:3000/dashboard' });
      }
    } else {
      // Fallback to regular dashboard
      chrome.tabs.create({ url: 'http://localhost:3000/dashboard' });
    }
  } catch (error) {
    console.error('Error opening dashboard:', error);
    // Fallback to regular dashboard
    chrome.tabs.create({ url: 'http://localhost:3000/dashboard' });
  }
  window.close();
}

function formatTime(minutes) {
  if (minutes < 60) {
    return `${minutes}m`;
  }
  
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  
  if (mins === 0) {
    return `${hours}h`;
  }
  
  return `${hours}h ${mins}m`;
}

function showError(message) {
  const errorElement = document.getElementById('errorMessage');
  errorElement.textContent = message;
  errorElement.classList.remove('hidden');
  
  // Hide success message
  document.getElementById('successMessage').classList.add('hidden');
  
  // Auto hide after 5 seconds
  setTimeout(() => {
    errorElement.classList.add('hidden');
  }, 5000);
}

function showSuccess(message) {
  const successElement = document.getElementById('successMessage');
  successElement.textContent = message;
  successElement.classList.remove('hidden');
  
  // Hide error message
  document.getElementById('errorMessage').classList.add('hidden');
  
  // Auto hide after 3 seconds
  setTimeout(() => {
    successElement.classList.add('hidden');
  }, 3000);
}

// Make functions available globally
window.addSite = addSite;
window.removeSite = removeSite;
window.addCurrentSite = addCurrentSite;
window.openSettings = openSettings;
window.openDashboard = openDashboard;
window.showTab = showTab; 