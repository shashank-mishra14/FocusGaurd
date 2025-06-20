// FocusGuard Extension Popup Script
document.addEventListener('DOMContentLoaded', async () => {
  console.log('FocusGuard popup initializing...');
  await initializePopup();
});

async function initializePopup() {
  try {
    console.log('Starting popup initialization...');
    // Initialize all components
    await Promise.all([
      loadCurrentSite(),
      loadProtectedSites(),
      loadStats()
    ]);
    
    setupEventListeners();
    setupTabs();
    initializeBackendSync();
    
    console.log('Popup initialized successfully');
  } catch (error) {
    console.error('Error initializing popup:', error);
    showMessage('Failed to load extension data', 'error');
  }
}

function setupEventListeners() {
  console.log('Setting up event listeners...');
  
  // Tab switching
  document.querySelectorAll('.tab').forEach(tab => {
    tab.addEventListener('click', (e) => {
      const targetTab = e.target.dataset.tab;
      if (targetTab) {
        console.log('Switching to tab:', targetTab);
        showTab(targetTab, e.target);
      }
    });
  });

  // Add current site button - changed to show modal
  const addCurrentSiteBtn = document.getElementById('addCurrentSiteBtn');
  if (addCurrentSiteBtn) {
    console.log('Add site button found, attaching listener');
    addCurrentSiteBtn.addEventListener('click', (e) => {
      e.preventDefault();
      console.log('Add site button clicked');
      showAddSiteModal();
    });
  } else {
    console.error('Add site button not found!');
  }
  
  // Dashboard button (backup listener in case onclick doesn't work)
  const dashboardBtn = document.querySelector('button[onclick="openDashboard()"]');
  if (dashboardBtn) {
    dashboardBtn.addEventListener('click', (e) => {
      e.preventDefault();
      console.log('Dashboard button clicked');
      openDashboard();
    });
  }
  
  // Password protection checkbox
  const passwordCheckbox = document.getElementById('passwordProtected');
  if (passwordCheckbox) {
    passwordCheckbox.addEventListener('change', togglePasswordField);
  }
  
  const editPasswordCheckbox = document.getElementById('editPasswordProtected');
  if (editPasswordCheckbox) {
    editPasswordCheckbox.addEventListener('change', toggleEditPasswordField);
  }
  
  // Modal overlay click to close
  const addSiteModal = document.getElementById('addSiteModal');
  if (addSiteModal) {
    addSiteModal.addEventListener('click', (e) => {
      if (e.target === addSiteModal) {
        closeAddSiteModal();
      }
    });
  }
  
  const editSiteModal = document.getElementById('editSiteModal');
  if (editSiteModal) {
    editSiteModal.addEventListener('click', (e) => {
      if (e.target === editSiteModal) {
        closeEditSiteModal();
      }
    });
  }
  
  console.log('Event listeners setup complete');
  // Initialize backend synchronization
  initializeBackendSync();
}

function setupTabs() {
  // Set default active tab
  showTab('sites');
}

// Backend synchronization
async function initializeBackendSync() {
  try {
    const { sessionToken, tokenExpiry } = await chrome.storage.local.get(['sessionToken', 'tokenExpiry']);
    
    if (sessionToken && tokenExpiry && new Date() < new Date(tokenExpiry)) {
      console.log('Valid session found, syncing with backend...');
      
      chrome.runtime.sendMessage({
        action: 'syncWithBackend'
      }).catch(error => {
        console.log('Background script not available for sync:', error);
      });
    } else {
      console.log('No valid session for backend sync');
    }
  } catch (error) {
    console.error('Error initializing backend sync:', error);
  }
}

async function loadCurrentSite() {
  try {
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    const tab = tabs[0];
    
    if (tab && tab.url && !tab.url.startsWith('chrome://') && !tab.url.startsWith('edge://')) {
      const domain = new URL(tab.url).hostname;
      const currentSiteElement = document.getElementById('currentSite');
      const currentDomainElement = document.getElementById('currentDomain');
      const currentTimeElement = document.getElementById('currentTime');
      
      if (currentSiteElement && currentDomainElement && currentTimeElement) {
        currentDomainElement.textContent = domain;
        currentSiteElement.classList.remove('hidden');
        
        // Get today's time for this domain
        try {
          const analytics = await chrome.runtime.sendMessage({
            action: 'getAnalytics',
            period: 1
          });
          
          if (analytics?.success && analytics.data[domain]) {
            const todayTime = Object.values(analytics.data[domain].dailyData)[0] || 0;
            const minutes = Math.floor(todayTime / 60000);
            currentTimeElement.textContent = `Today: ${formatTime(minutes)}`;
          } else {
            currentTimeElement.textContent = 'Today: 0 minutes';
          }
        } catch (error) {
          console.log('Could not fetch analytics:', error);
          currentTimeElement.textContent = 'Today: 0 minutes';
        }
      }
      
      // Update add site button text
      await updateAddSiteButton(domain);
    } else {
      // Hide current site section for non-web pages
      const currentSiteElement = document.getElementById('currentSite');
      if (currentSiteElement) {
        currentSiteElement.classList.add('hidden');
      }
      
      // Update button for non-web pages
      const addSiteText = document.getElementById('addSiteText');
      if (addSiteText) {
        addSiteText.textContent = 'Add Current Site';
      }
    }
  } catch (error) {
    console.error('Error loading current site:', error);
  }
}

async function updateAddSiteButton(domain) {
  try {
    const { protectedSites } = await chrome.storage.local.get(['protectedSites']);
    const sites = protectedSites || [];
    const addSiteText = document.getElementById('addSiteText');
    
    if (!addSiteText) return;
    
    if (sites.some(site => site.domain === domain)) {
      addSiteText.textContent = 'Already Protected';
    } else {
      addSiteText.textContent = `Protect ${domain}`;
    }
  } catch (error) {
    console.error('Error updating add site button:', error);
  }
}

async function loadProtectedSites() {
  try {
    const { protectedSites, timeTrackingData } = await chrome.storage.local.get(['protectedSites', 'timeTrackingData']);
    const sites = protectedSites || [];
    
    const siteList = document.getElementById('siteList');
    if (!siteList) return;
    
    if (sites.length === 0) {
      siteList.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">🔒</div>
          <div class="empty-title">No protected sites yet</div>
          <div class="empty-description">Add your first site to get started!</div>
        </div>
      `;
      return;
    }
    
    // Get today's date for time calculations
    const today = new Date().toDateString();
    
    siteList.innerHTML = '';
    sites.forEach(site => {
      const siteElement = document.createElement('div');
      siteElement.className = 'site-card';
      
      const timeLimit = site.timeLimit || 60;
      
      // Get actual time used today for this site
      let timeUsed = 0;
      if (timeTrackingData && timeTrackingData[site.domain] && timeTrackingData[site.domain][today]) {
        timeUsed = Math.floor(timeTrackingData[site.domain][today] / 60000); // Convert from ms to minutes
      }
      
      const isOverLimit = timeUsed >= timeLimit;
      const hasPassword = site.password ? '🔒 ' : '';
      
      if (isOverLimit) {
        siteElement.classList.add('blocked');
      }
      
      const progressPercent = timeLimit > 0 ? Math.min((timeUsed / timeLimit) * 100, 100) : 0;
      
      siteElement.innerHTML = `
        <div class="site-header">
          <div class="site-info">
            <div class="site-name">
              ${hasPassword}${site.domain}
              <span class="site-status ${isOverLimit ? 'blocked' : 'active'}">
                ${isOverLimit ? 'Blocked' : 'Active'}
              </span>
            </div>
            <div class="site-time">
              ⏱️ ${timeUsed}m / ${timeLimit}m daily limit
            </div>
          </div>
          <div class="site-actions">
            <button class="action-btn edit-btn" title="Edit site settings">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
              </svg>
            </button>
            <button class="action-btn remove-btn" data-domain="${site.domain}" title="Remove site">
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
      
      // Add event listeners
      const removeBtn = siteElement.querySelector('.remove-btn');
      const editBtn = siteElement.querySelector('.edit-btn');
      
      if (removeBtn) {
        removeBtn.addEventListener('click', () => removeSite(site.domain));
      }
      
      if (editBtn) {
        editBtn.addEventListener('click', () => editSite(site.domain));
      }
      
      siteList.appendChild(siteElement);
    });
    
    // Update add site button text based on current site
    try {
      const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
      const tab = tabs[0];
      if (tab && tab.url && !tab.url.startsWith('chrome://') && !tab.url.startsWith('edge://')) {
        const domain = new URL(tab.url).hostname;
        await updateAddSiteButton(domain);
      }
    } catch (error) {
      console.log('Could not update add site button:', error);
    }
    
  } catch (error) {
    console.error('Error loading protected sites:', error);
    showMessage('Failed to load protected sites', 'error');
  }
}

async function loadStats() {
  try {
    const { protectedSites, timeTrackingData } = await chrome.storage.local.get(['protectedSites', 'timeTrackingData']);
    
    // Update total sites
    const totalSites = (protectedSites || []).length;
    updateElement('totalSites', totalSites);
    
    // Calculate today's stats
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
    const dailyLimit = 240; // 4 hours default
    const remainingMinutes = Math.max(0, dailyLimit - todayMinutes);
    const progressPercent = Math.min((todayMinutes / dailyLimit) * 100, 100);
    
    // Update UI elements
    updateElement('todayMinutes', todayMinutes);
    updateElement('sitesVisited', `${sitesVisitedToday} sites visited`);
    updateElement('timeRemaining', `${remainingMinutes}m remaining`);
    updateElement('todayTime', `${todayMinutes}m / ${dailyLimit}m`);
    updateElement('streakDays', calculateStreak(timeTrackingData));
    
    // Update progress bar
    const progressFill = document.getElementById('progressFill');
    if (progressFill) {
      progressFill.style.width = `${progressPercent}%`;
    }
    
  } catch (error) {
    console.error('Error loading stats:', error);
  }
}

function calculateStreak(timeTrackingData) {
  if (!timeTrackingData) return 0;
  
  let streak = 0;
  const today = new Date();
  
  for (let i = 0; i < 30; i++) { // Check last 30 days
    const checkDate = new Date(today);
    checkDate.setDate(today.getDate() - i);
    const dateStr = checkDate.toDateString();
    
    let dayHasActivity = false;
    Object.values(timeTrackingData).forEach(siteData => {
      if (siteData[dateStr] && siteData[dateStr] > 0) {
        dayHasActivity = true;
      }
    });
    
    if (dayHasActivity) {
      streak++;
    } else if (i > 0) { // Don't break streak on today if no activity yet
      break;
    }
  }
  
  return streak;
}

// Modal Functions
async function showAddSiteModal() {
  console.log('Show add site modal called');
  try {
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    const tab = tabs[0];
    
    console.log('Current tab:', tab?.url);
    
    if (!tab || !tab.url || tab.url.startsWith('chrome://') || tab.url.startsWith('edge://')) {
      showMessage('Cannot add browser internal pages', 'error');
      return;
    }
    
    const domain = new URL(tab.url).hostname;
    console.log('Domain to add:', domain);
    
    // Check if site is already protected
    const { protectedSites } = await chrome.storage.local.get(['protectedSites']);
    const sites = protectedSites || [];
    
    if (sites.some(site => site.domain === domain)) {
      showMessage('Site is already protected', 'error');
      return;
    }
    
    // Populate modal with current domain
    const domainInput = document.getElementById('siteDomain');
    if (domainInput) {
      domainInput.value = domain;
    }
    
    // Reset form
    document.getElementById('timeLimit').value = '60';
    document.getElementById('passwordProtected').checked = false;
    document.getElementById('sitePassword').value = '';
    document.getElementById('passwordGroup').classList.add('hidden');
    
    // Show modal
    const modal = document.getElementById('addSiteModal');
    if (modal) {
      modal.classList.add('show');
      console.log('Add site modal shown');
    } else {
      console.error('Add site modal element not found!');
    }
    
  } catch (error) {
    console.error('Error showing add site modal:', error);
    showMessage('Failed to open add site dialog', 'error');
  }
}

function closeAddSiteModal() {
  console.log('Closing add site modal');
  const modal = document.getElementById('addSiteModal');
  if (modal) {
    modal.classList.remove('show');
    console.log('Add site modal closed');
  } else {
    console.error('Add site modal not found!');
  }
}

function togglePasswordField() {
  const checkbox = document.getElementById('passwordProtected');
  const passwordGroup = document.getElementById('passwordGroup');
  
  if (checkbox && passwordGroup) {
    if (checkbox.checked) {
      passwordGroup.classList.remove('hidden');
      document.getElementById('sitePassword').focus();
    } else {
      passwordGroup.classList.add('hidden');
      document.getElementById('sitePassword').value = '';
    }
  }
}

function toggleEditPasswordField() {
  const checkbox = document.getElementById('editPasswordProtected');
  const passwordGroup = document.getElementById('editPasswordGroup');
  
  if (checkbox && passwordGroup) {
    if (checkbox.checked) {
      passwordGroup.classList.remove('hidden');
      document.getElementById('editSitePassword').focus();
    } else {
      passwordGroup.classList.add('hidden');
      document.getElementById('editSitePassword').value = '';
    }
  }
}

async function confirmAddSite() {
  console.log('Confirm add site called');
  try {
    const domain = document.getElementById('siteDomain').value;
    const timeLimit = parseInt(document.getElementById('timeLimit').value);
    const passwordProtected = document.getElementById('passwordProtected').checked;
    const password = document.getElementById('sitePassword').value;
    
    console.log('Form data:', { domain, timeLimit, passwordProtected, hasPassword: !!password });
    
    // Validation
    if (!domain) {
      showMessage('Domain is required', 'error');
      return;
    }
    
    if (!timeLimit || timeLimit < 1 || timeLimit > 1440) {
      showMessage('Time limit must be between 1 and 1440 minutes', 'error');
      return;
    }
    
    if (passwordProtected && !password) {
      showMessage('Password is required when password protection is enabled', 'error');
      return;
    }
    
    // Get existing sites
    const { protectedSites } = await chrome.storage.local.get(['protectedSites']);
    const sites = protectedSites || [];
    
    // Create new site object
    const newSite = {
      domain: domain,
      timeLimit: timeLimit,
      password: passwordProtected ? password : '',
      addedAt: new Date().toISOString()
    };
    
    sites.push(newSite);
    await chrome.storage.local.set({ protectedSites: sites });
    
    // Sync with backend if available
    try {
      chrome.runtime.sendMessage({
        action: 'syncProtectedSitesWithBackend'
      });
    } catch (error) {
      console.log('Could not sync with backend:', error);
    }
    
    const protection = passwordProtected ? ' with password protection' : '';
    showMessage(`Added ${domain} to protected sites${protection}`, 'success');
    
    closeAddSiteModal();
    await loadProtectedSites();
    await loadStats();
    
  } catch (error) {
    console.error('Error adding site:', error);
    showMessage('Failed to add site', 'error');
  }
}

async function removeSite(domain) {
  try {
    const { protectedSites } = await chrome.storage.local.get(['protectedSites']);
    const sites = protectedSites || [];
    
    const updatedSites = sites.filter(site => site.domain !== domain);
    await chrome.storage.local.set({ protectedSites: updatedSites });
    
    // Sync with backend if available
    try {
      chrome.runtime.sendMessage({
        action: 'syncProtectedSitesWithBackend'
      });
    } catch (error) {
      console.log('Could not sync with backend:', error);
    }
    
    showMessage(`Removed ${domain} from protected sites`, 'success');
    await loadProtectedSites();
    await loadStats();
    
  } catch (error) {
    console.error('Error removing site:', error);
    showMessage('Failed to remove site', 'error');
  }
}

async function editSite(domain) {
  try {
    // Get site data
    const { protectedSites } = await chrome.storage.local.get(['protectedSites']);
    const sites = protectedSites || [];
    const site = sites.find(s => s.domain === domain);
    
    if (!site) {
      showMessage('Site not found', 'error');
      return;
    }
    
    // Populate edit modal
    document.getElementById('editSiteDomain').textContent = domain;
    document.getElementById('editTimeLimit').value = site.timeLimit || 60;
    document.getElementById('editPasswordProtected').checked = !!site.password;
    document.getElementById('editSitePassword').value = '';
    
    // Show/hide password field based on current state
    const passwordGroup = document.getElementById('editPasswordGroup');
    if (site.password) {
      passwordGroup.classList.remove('hidden');
    } else {
      passwordGroup.classList.add('hidden');
    }
    
    // Store current domain for editing
    window.currentEditDomain = domain;
    
    // Show modal
    const modal = document.getElementById('editSiteModal');
    if (modal) {
      modal.classList.add('show');
    }
    
  } catch (error) {
    console.error('Error opening edit modal:', error);
    showMessage('Failed to open edit dialog', 'error');
  }
}

function closeEditSiteModal() {
  const modal = document.getElementById('editSiteModal');
  if (modal) {
    modal.classList.remove('show');
  }
  window.currentEditDomain = null;
}

async function confirmEditSite() {
  try {
    const domain = window.currentEditDomain;
    if (!domain) {
      showMessage('No site selected for editing', 'error');
      return;
    }
    
    const timeLimit = parseInt(document.getElementById('editTimeLimit').value);
    const passwordProtected = document.getElementById('editPasswordProtected').checked;
    const password = document.getElementById('editSitePassword').value;
    
    // Validation
    if (!timeLimit || timeLimit < 1 || timeLimit > 1440) {
      showMessage('Time limit must be between 1 and 1440 minutes', 'error');
      return;
    }
    
    if (passwordProtected && !password) {
      // Check if site already has a password
      const { protectedSites } = await chrome.storage.local.get(['protectedSites']);
      const sites = protectedSites || [];
      const currentSite = sites.find(s => s.domain === domain);
      
      if (!currentSite?.password) {
        showMessage('Password is required when password protection is enabled', 'error');
        return;
      }
    }
    
    // Get existing sites
    const { protectedSites } = await chrome.storage.local.get(['protectedSites']);
    const sites = protectedSites || [];
    const siteIndex = sites.findIndex(s => s.domain === domain);
    
    if (siteIndex === -1) {
      showMessage('Site not found', 'error');
      return;
    }
    
    // Update site
    sites[siteIndex] = {
      ...sites[siteIndex],
      timeLimit: timeLimit,
      password: passwordProtected ? (password || sites[siteIndex].password) : '',
      updatedAt: new Date().toISOString()
    };
    
    await chrome.storage.local.set({ protectedSites: sites });
    
    // Sync with backend if available
    try {
      chrome.runtime.sendMessage({
        action: 'syncProtectedSitesWithBackend'
      });
    } catch (error) {
      console.log('Could not sync with backend:', error);
    }
    
    const protection = passwordProtected ? ' with password protection' : '';
    showMessage(`Updated ${domain} settings${protection}`, 'success');
    
    closeEditSiteModal();
    await loadProtectedSites();
    await loadStats();
    
  } catch (error) {
    console.error('Error updating site:', error);
    showMessage('Failed to update site', 'error');
  }
}

function showTab(tabName, clickedElement = null) {
  // Update tab buttons
  document.querySelectorAll('.tab').forEach(tab => {
    tab.classList.remove('active');
  });
  
  if (clickedElement) {
    clickedElement.classList.add('active');
  } else {
    const targetTab = document.querySelector(`[data-tab="${tabName}"]`);
    if (targetTab) {
      targetTab.classList.add('active');
    }
  }
  
  // Update tab panels
  document.querySelectorAll('.tab-panel').forEach(panel => {
    panel.classList.remove('active');
  });
  
  const targetPanel = document.getElementById(`${tabName}Panel`);
  if (targetPanel) {
    targetPanel.classList.add('active');
  }
}

async function openDashboard() {
  console.log('Open dashboard called');
  try {
    const { sessionToken, tokenExpiry } = await chrome.storage.local.get(['sessionToken', 'tokenExpiry']);
    
    let dashboardUrl = 'http://localhost:3000/dashboard';
    console.log('Opening dashboard with URL:', dashboardUrl);
    
    if (sessionToken && tokenExpiry && new Date() < new Date(tokenExpiry)) {
      dashboardUrl += `?token=${sessionToken}`;
    } else {
      // Try to generate a new session token
      try {
        const response = await chrome.runtime.sendMessage({
          action: 'generateSessionToken'
        });
        
        if (response?.success && response.sessionToken) {
          dashboardUrl += `?token=${response.sessionToken}`;
        }
      } catch (error) {
        console.log('Could not generate session token:', error);
        // Fallback to regular dashboard (user will need to sign in)
      }
    }
    
    chrome.tabs.create({ url: dashboardUrl });
    
  } catch (error) {
    console.error('Error opening dashboard:', error);
    // Fallback to regular dashboard
    chrome.tabs.create({ url: 'http://localhost:3000/dashboard' });
  }
}

function formatTime(minutes) {
  if (minutes < 60) {
    return `${minutes}m`;
  }
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  
  if (remainingMinutes === 0) {
    return `${hours}h`;
  }
  return `${hours}h ${remainingMinutes}m`;
}

function updateElement(id, value) {
  const element = document.getElementById(id);
  if (element) {
    element.textContent = value;
  }
}

function showMessage(message, type = 'success') {
  // Remove any existing messages
  const existingMessage = document.querySelector('.message');
  if (existingMessage) {
    existingMessage.remove();
  }
  
  // Create new message
  const messageElement = document.createElement('div');
  messageElement.className = `message ${type}`;
  messageElement.textContent = message;
  
  // Add to DOM
  document.body.appendChild(messageElement);
  
  // Auto-remove after 3 seconds
  setTimeout(() => {
    if (messageElement.parentNode) {
      messageElement.remove();
    }
  }, 3000);
}

// Make functions available globally for HTML onclick handlers
window.openDashboard = openDashboard;
window.closeAddSiteModal = closeAddSiteModal;
window.confirmAddSite = confirmAddSite;
window.closeEditSiteModal = closeEditSiteModal;
window.confirmEditSite = confirmEditSite; 