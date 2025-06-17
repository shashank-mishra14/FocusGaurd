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
  
  timeLimitSlider.addEventListener('input', (e) => {
    timeLimitValue.textContent = e.target.value;
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
  document.querySelectorAll('.nav-tab').forEach(tab => {
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
  document.getElementById('settingsBtn').addEventListener('click', openSettings);
  document.getElementById('openDashboardBtn').addEventListener('click', openDashboard);
  document.getElementById('openSettingsBtn').addEventListener('click', openSettings);
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
      siteElement.className = 'site-item';
      
      const hasPassword = site.password ? '🔒' : '';
      const timeLimit = site.timeLimit ? `${site.timeLimit}m limit` : 'No time limit';
      
      siteElement.innerHTML = `
        <div class="site-info">
          <div class="site-domain">${hasPassword} ${site.domain}</div>
          <div class="site-details">${timeLimit}</div>
        </div>
        <button class="remove-btn" data-domain="${site.domain}">Remove</button>
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
    
    if (timeTrackingData) {
      Object.values(timeTrackingData).forEach(siteData => {
        todayTotal += siteData[today] || 0;
      });
    }
    
    const todayMinutes = Math.floor(todayTotal / 60000);
    document.getElementById('todayTime').textContent = formatTime(todayMinutes);
    
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
  // Hide all tabs
  document.querySelectorAll('.tab-content').forEach(tab => {
    tab.classList.add('hidden');
  });
  
  // Remove active class from all tab buttons
  document.querySelectorAll('.nav-tab').forEach(tab => {
    tab.classList.remove('active');
  });
  
  // Show selected tab
  const targetTab = document.getElementById(tabName + 'Tab');
  if (targetTab) {
    targetTab.classList.remove('hidden');
  }
  
  // Add active class to clicked tab button
  if (clickedElement) {
    clickedElement.classList.add('active');
  } else {
    // Fallback: find the tab button by data attribute
    document.querySelectorAll('.nav-tab').forEach(tab => {
      if (tab.dataset.tab === tabName) {
        tab.classList.add('active');
      }
    });
  }
}

function openSettings() {
  chrome.tabs.create({ url: chrome.runtime.getURL('options.html') });
  window.close();
}

function openDashboard() {
  chrome.tabs.create({ url: chrome.runtime.getURL('analytics.html') });
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