// FocusGuard Extension Popup Script
let extensionToken = null;
let currentUser = null;
let isPolling = false;

document.addEventListener('DOMContentLoaded', async () => {
  console.log('FocusGuard popup initializing...');
  await initializePopup();
});

async function initializePopup() {
  try {
    console.log('Starting popup initialization...');
    
    // Check if user is authenticated first
    const isAuthenticated = await checkAuthentication();
    
    if (isAuthenticated) {
      // Initialize all components
      await Promise.all([
        loadCurrentSite(),
        loadProtectedSites(),
        loadStats()
      ]);
    }
    
    setupEventListeners();
    setupTabs();
    
    console.log('Popup initialized successfully');
  } catch (error) {
    console.error('Error initializing popup:', error);
    showMessage('Failed to load extension data', 'error');
  }
}

async function checkAuthentication() {
  try {
    // Get stored token and user
    const result = await chrome.storage.local.get(['extensionToken', 'currentUser', 'lastTokenCheck', 'authPersistence']);
    extensionToken = result.extensionToken;
    currentUser = result.currentUser;
    const lastTokenCheck = result.lastTokenCheck || 0;
    const authPersistence = result.authPersistence || false;
    
    console.log('Checking authentication...', { 
      hasToken: !!extensionToken, 
      tokenLength: extensionToken?.length,
      currentUser: currentUser,
      lastCheck: new Date(lastTokenCheck).toLocaleString(),
      authPersistence
    });
    
    // If we have cached auth data and it's recent (within 1 hour), use it
    const oneHourAgo = Date.now() - (60 * 60 * 1000);
    if (extensionToken && currentUser && lastTokenCheck > oneHourAgo) {
      console.log('Using cached authentication (recent)');
      showAuthenticatedState();
      return true;
    }
    
    // Check for token in localStorage (from web page) if no token or need refresh
    if (!extensionToken || lastTokenCheck < oneHourAgo) {
      console.log('Checking for new token from web page...');
      await checkForWebPageToken();
    }
    
    if (extensionToken) {
      // Validate token with server (but don't clear on network errors)
      console.log('Validating token with server...');
      try {
        const response = await fetch(`http://localhost:3000/api/extension/session?token=${extensionToken}`);
        const data = await response.json();
        
        console.log('Token validation response:', data);
        
        if (data.valid) {
          currentUser = data.user;
          await chrome.storage.local.set({ 
            currentUser,
            lastTokenCheck: Date.now(),
            authPersistence: true
          });
          console.log('Authentication successful, showing authenticated state');
          showAuthenticatedState();
          
          // Sync data from backend
          await syncProtectedSitesFromBackend();
          
          return true;
        } else {
          // Only clear token if we get explicit invalid response
          console.log('Token explicitly invalid, clearing storage');
          await chrome.storage.local.remove(['extensionToken', 'currentUser', 'lastTokenCheck', 'authPersistence']);
          extensionToken = null;
          currentUser = null;
        }
      } catch (networkError) {
        console.warn('Network error validating token:', networkError);
        // If we have cached user data, continue to show authenticated state
        if (currentUser && authPersistence) {
          console.log('Using cached authentication due to network error');
          showAuthenticatedState();
          return true;
        }
        // If completely offline and no cached auth, show unauthenticated but don't clear tokens
        console.log('No cached auth and network offline, showing unauthenticated but keeping tokens');
      }
    }
    
    showUnauthenticatedState();
    return false;
  } catch (error) {
    console.error('Error checking authentication:', error);
    showUnauthenticatedState();
    return false;
  }
}

async function checkForWebPageToken() {
  try {
    // Get all tabs and check for any that contain our web app
    const tabs = await chrome.tabs.query({});
    
    for (const tab of tabs) {
      if (tab.url && tab.url.includes('localhost:3000')) {
        try {
          // Execute script to check localStorage for token
          const results = await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            func: () => {
              const token = localStorage.getItem('protekt_extension_token');
              const timestamp = localStorage.getItem('protekt_extension_token_timestamp');
              
              // Check if token is recent (within last 15 minutes for more reliability)
              if (token && timestamp) {
                const tokenAge = Date.now() - parseInt(timestamp);
                const fifteenMinutes = 15 * 60 * 1000;
                
                if (tokenAge < fifteenMinutes) {
                  // Keep token for extended period to handle extension reloads
                  return { token, timestamp };
                }
              }
              return null;
            }
          });
          
          if (results && results[0] && results[0].result) {
            const { token } = results[0].result;
            console.log('Found token from web page:', token);
            
            // Store the token in extension storage
            extensionToken = token;
            await chrome.storage.local.set({ 
              extensionToken: token,
              lastTokenCheck: Date.now()
            });
            
            return true;
          }
        } catch (scriptError) {
          console.log('Could not execute script on tab:', tab.url, scriptError);
        }
      }
    }
  } catch (error) {
    console.log('Could not check for web page token:', error);
  }
  
  return false;
}

function showAuthenticatedState() {
  const authSection = document.getElementById('authSection');
  if (authSection) {
    authSection.innerHTML = `
      <div class="auth-info">
        <div class="user-info">
          <span class="user-name">${currentUser?.firstName || 'User'}</span>
          <span class="user-email">${currentUser?.email || ''}</span>
        </div>
        <button id="logoutBtn" class="btn-logout">Logout</button>
      </div>
    `;
    
    document.getElementById('logoutBtn')?.addEventListener('click', handleLogout);
  }
  
  // Show main content
  const mainContent = document.getElementById('mainContent');
  if (mainContent) {
    mainContent.style.display = 'block';
  }
  
  // Hide auth prompt
  const authPrompt = document.getElementById('authPrompt');
  if (authPrompt) {
    authPrompt.style.display = 'none';
  }
}

function showUnauthenticatedState() {
  const authSection = document.getElementById('authSection');
  if (authSection) {
    authSection.style.display = 'none';
  }
  
  // Hide main content
  const mainContent = document.getElementById('mainContent');
  if (mainContent) {
    mainContent.style.display = 'none';
  }
  
  // Show auth prompt
  const authPrompt = document.getElementById('authPrompt');
  if (authPrompt) {
    authPrompt.style.display = 'block';
  }
}

async function handleLogin() {
  try {
    // Open the dashboard which will handle authentication
    chrome.tabs.create({
      url: 'http://localhost:3000/dashboard?extension=true'
    });
    
    // Start polling for authentication
    startAuthPolling();
  } catch (error) {
    console.error('Error during login:', error);
    showMessage('Failed to connect account', 'error');
  }
}

function startAuthPolling() {
  // Prevent multiple polling instances
  if (isPolling) {
    console.log('Authentication polling already in progress');
    return;
  }
  
  isPolling = true;
  console.log('Starting authentication polling...');
  
  let pollCount = 0;
  const maxPolls = 90; // Maximum 90 polls (3 minutes)
  
  // Poll every 2 seconds for authentication
  const pollInterval = setInterval(async () => {
    pollCount++;
    console.log(`Checking for authentication... (${pollCount}/${maxPolls})`);
    
    const authenticated = await checkForWebPageToken();
    
    if (authenticated) {
      console.log('Authentication detected! Updating UI...');
      clearInterval(pollInterval);
      isPolling = false;
      
      // Re-check authentication to update the UI
      await checkAuthentication();
      return;
    }
    
    // Stop polling after max attempts
    if (pollCount >= maxPolls) {
      clearInterval(pollInterval);
      isPolling = false;
      console.log('Authentication polling stopped - max attempts reached');
    }
  }, 2000);
}

// Setup token listener for direct messaging
chrome.runtime.onMessage.addListener(async (message, sender, sendResponse) => {
  if (message.action === 'setExtensionToken') {
    console.log('Received token from web app');
    extensionToken = message.token;
    await chrome.storage.local.set({ 
      extensionToken: message.token,
      lastTokenCheck: Date.now()
    });
    
    // Validate and get user info
    await checkAuthentication();
    
    sendResponse({ success: true });
  }
});

// Manual token injection for debugging
async function injectTokenManually() {
  const token = 'f961d14d4ed543d90a638b059ed12892c1e494badbf5f1193ca786e702a69105';
  console.log('Manually injecting token for debugging...');
  extensionToken = token;
  await chrome.storage.local.set({ extensionToken: token });
  await checkAuthentication();
  await syncProtectedSitesFromBackend();
}

// Add a debug button (temporary)
window.debugInjectToken = injectTokenManually;

async function handleLogout() {
  try {
    // Clear stored data
    await chrome.storage.local.remove(['extensionToken', 'currentUser']);
    extensionToken = null;
    currentUser = null;
    
    showUnauthenticatedState();
    showMessage('Logged out successfully', 'success');
  } catch (error) {
    console.error('Error during logout:', error);
    showMessage('Failed to logout', 'error');
  }
}

async function syncProtectedSitesFromBackend() {
  if (!extensionToken) return;
  
  try {
    console.log('Syncing protected sites from backend...');
    const response = await fetch(`http://localhost:3000/api/protected-sites?token=${extensionToken}`);
    const data = await response.json();
    
    if (data.sites) {
      // Convert backend format to extension format
      const protectedSites = data.sites.map(site => ({
        domain: site.domain,
        password: site.password,
        timeLimit: site.timeLimit,
        passwordProtected: site.passwordProtected,
        isActive: site.isActive,
        lastAccess: null // Reset session
      }));
      
      await chrome.storage.local.set({ protectedSites });
      console.log('Protected sites synced:', protectedSites.length);
      
      // Reload the sites display
      await loadProtectedSites();
    }
  } catch (error) {
    console.error('Error syncing protected sites:', error);
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
      e.stopPropagation();
      console.log('Add site button clicked');
      showAddSiteModal();
    });
  } else {
    console.error('Add site button not found!');
  }
  
  // Dashboard button - header button
  const headerDashboardBtn = document.querySelector('.header-btn');
  if (headerDashboardBtn) {
    console.log('Header dashboard button found, attaching listener');
    headerDashboardBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      console.log('Header dashboard button clicked');
      openDashboard();
    });
  }

  // Footer dashboard button
  const footerDashboardBtn = document.querySelector('.footer-actions .btn-secondary');
  if (footerDashboardBtn) {
    console.log('Footer dashboard button found, attaching listener');
    footerDashboardBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      console.log('Footer dashboard button clicked');
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
  
  // Modal close buttons
  const addModalCloseBtn = document.querySelector('#addSiteModal .modal-close');
  if (addModalCloseBtn) {
    console.log('Add modal close button found, attaching listener');
    addModalCloseBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      console.log('Add modal close button clicked');
      closeAddSiteModal();
    });
  }

  const editModalCloseBtn = document.querySelector('#editSiteModal .modal-close');
  if (editModalCloseBtn) {
    console.log('Edit modal close button found, attaching listener');
    editModalCloseBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      console.log('Edit modal close button clicked');
      closeEditSiteModal();
    });
  }

  // Modal action buttons
  const addModalCancelBtn = document.querySelector('#addSiteModal .btn-modal-secondary');
  if (addModalCancelBtn) {
    console.log('Add modal cancel button found, attaching listener');
    addModalCancelBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      console.log('Add modal cancel button clicked');
      closeAddSiteModal();
    });
  }

  const addModalConfirmBtn = document.querySelector('#addSiteModal .btn-modal-primary');
  if (addModalConfirmBtn) {
    console.log('Add modal confirm button found, attaching listener');
    addModalConfirmBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      console.log('Add modal confirm button clicked');
      confirmAddSite();
    });
  }

  const editModalCancelBtn = document.querySelector('#editSiteModal .btn-modal-secondary');
  if (editModalCancelBtn) {
    console.log('Edit modal cancel button found, attaching listener');
    editModalCancelBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      console.log('Edit modal cancel button clicked');
      closeEditSiteModal();
    });
  }

  const editModalConfirmBtn = document.querySelector('#editSiteModal .btn-modal-primary');
  if (editModalConfirmBtn) {
    console.log('Edit modal confirm button found, attaching listener');
    editModalConfirmBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      console.log('Edit modal confirm button clicked');
      confirmEditSite();
    });
  }
  
  // Modal overlay click to close
  const addSiteModal = document.getElementById('addSiteModal');
  if (addSiteModal) {
    addSiteModal.addEventListener('click', (e) => {
      if (e.target === addSiteModal) {
        console.log('Add modal overlay clicked');
        closeAddSiteModal();
      }
    });
  }
  
  const editSiteModal = document.getElementById('editSiteModal');
  if (editSiteModal) {
    editSiteModal.addEventListener('click', (e) => {
      if (e.target === editSiteModal) {
        console.log('Edit modal overlay clicked');
        closeEditSiteModal();
      }
    });
  }
  
  // Escape key to close modals
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      const addModal = document.getElementById('addSiteModal');
      const editModal = document.getElementById('editSiteModal');
      
      if (addModal && addModal.classList.contains('show')) {
        closeAddSiteModal();
      }
      if (editModal && editModal.classList.contains('show')) {
        closeEditSiteModal();
      }
    }
  });
  
  console.log('Event listeners setup complete');
  // Add event listener for the auth prompt button
  const connectAccountBtn = document.getElementById('connectAccountBtn');
  if (connectAccountBtn) {
    connectAccountBtn.addEventListener('click', handleLogin);
  }
}

function setupTabs() {
  // Set default active tab
  showTab('sites');
}

// Backend synchronization is now handled through the authentication flow

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
    const noSitesMessage = document.getElementById('noSitesMessage');
    if (!siteList) return;
    
    if (sites.length === 0) {
      siteList.innerHTML = '';
      if (noSitesMessage) {
        noSitesMessage.style.display = 'block';
      }
      return;
    } else {
      if (noSitesMessage) {
        noSitesMessage.style.display = 'none';
      }
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
    let protectedSitesVisitedToday = 0;
    
    if (timeTrackingData && protectedSites) {
      // Only count time from protected sites
      protectedSites.forEach(protectedSite => {
        const siteData = timeTrackingData[protectedSite.domain];
        if (siteData) {
          const dayTime = siteData[today] || 0;
          todayTotal += dayTime;
          if (dayTime > 0) protectedSitesVisitedToday++;
        }
      });
    }
    
    const todayMinutes = Math.floor(todayTotal / 60000);
    const dailyLimit = 240; // 4 hours default
    const remainingMinutes = Math.max(0, dailyLimit - todayMinutes);
    const progressPercent = Math.min((todayMinutes / dailyLimit) * 100, 100);
    
    // Update UI elements
    updateElement('todayMinutes', todayMinutes);
    updateElement('sitesVisited', `${protectedSitesVisitedToday} protected sites visited`);
    updateElement('timeRemaining', `${remainingMinutes}m remaining`);
    updateElement('todayTime', `${todayMinutes}m / ${dailyLimit}m`);
    updateElement('streakDays', calculateStreak(timeTrackingData, protectedSites));
    
    // Update analytics panel elements
    updateElement('analyticsTimeSpent', `${todayMinutes} minutes`);
    updateElement('analyticsSitesVisited', protectedSitesVisitedToday);
    updateElement('analyticsStreak', calculateStreak(timeTrackingData, protectedSites));
    
    // Update progress bar
    const progressFill = document.getElementById('progressFill');
    if (progressFill) {
      progressFill.style.width = `${progressPercent}%`;
    }
    
    // Sync with backend if authenticated
    if (extensionToken) {
      await syncAnalyticsWithBackend();
    }
    
  } catch (error) {
    console.error('Error loading stats:', error);
  }
}

async function syncAnalyticsWithBackend() {
  try {
    // Only sync if we have a valid token
    if (!extensionToken) {
      console.log('No extension token available for analytics sync');
      return;
    }

    console.log('Syncing analytics with backend...');
    const response = await fetch(`http://localhost:3000/api/analytics?period=7`, {
      headers: {
        'Authorization': `Bearer ${extensionToken}`
      }
    });
    
    if (response.ok) {
      const backendData = await response.json();
      console.log('Backend analytics data:', backendData);
      
      // Update analytics info display
      if (backendData.summary && backendData.summary.length > 0) {
        const totalBackendTime = backendData.summary.reduce((sum, site) => sum + (site.totalTime || 0), 0);
        const totalBackendMinutes = Math.floor(totalBackendTime / 60000);
        
        // Show sync status
        const syncStatus = document.getElementById('syncStatus');
        if (syncStatus) {
          syncStatus.textContent = `✅ Synced (${totalBackendMinutes}m tracked)`;
          syncStatus.className = 'sync-success';
        }
        
        console.log(`Analytics synced: ${totalBackendMinutes} minutes tracked across ${backendData.summary.length} sites`);
      } else {
        // No data yet, but sync was successful
        const syncStatus = document.getElementById('syncStatus');
        if (syncStatus) {
          syncStatus.textContent = '✅ Synced (no data yet)';
          syncStatus.className = 'sync-success';
        }
      }
    } else {
      console.warn('Failed to sync analytics with backend:', response.status, response.statusText);
      const syncStatus = document.getElementById('syncStatus');
      if (syncStatus) {
        syncStatus.textContent = '⚠️ Sync failed';
        syncStatus.className = 'sync-error';
      }
    }
  } catch (error) {
    console.warn('Error syncing analytics with backend:', error);
    const syncStatus = document.getElementById('syncStatus');
    if (syncStatus) {
      syncStatus.textContent = '⚠️ Sync offline';
      syncStatus.className = 'sync-error';
    }
  }
}

function calculateStreak(timeTrackingData, protectedSites) {
  if (!timeTrackingData || !protectedSites) return 0;
  
  let streak = 0;
  const today = new Date();
  
  for (let i = 0; i < 30; i++) { // Check last 30 days
    const checkDate = new Date(today);
    checkDate.setDate(today.getDate() - i);
    const dateStr = checkDate.toDateString();
    
    let dayHasActivity = false;
    
    // Only check protected sites for streak calculation
    protectedSites.forEach(protectedSite => {
      const siteData = timeTrackingData[protectedSite.domain];
      if (siteData && siteData[dateStr] && siteData[dateStr] > 0) {
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
      domainInput.setAttribute('readonly', 'true');
    }
    
    // Reset form
    const timeLimitInput = document.getElementById('timeLimit');
    const passwordCheckbox = document.getElementById('passwordProtected');
    const passwordInput = document.getElementById('sitePassword');
    const passwordGroup = document.getElementById('passwordGroup');
    
    if (timeLimitInput) timeLimitInput.value = '60';
    if (passwordCheckbox) passwordCheckbox.checked = false;
    if (passwordInput) passwordInput.value = '';
    if (passwordGroup) passwordGroup.classList.add('hidden');
    
    // Show modal with proper display
    const modal = document.getElementById('addSiteModal');
    if (modal) {
      console.log('Showing modal with class: show');
      modal.classList.add('show');
      
      // Focus on time limit input after a short delay
      setTimeout(() => {
        if (timeLimitInput) {
          timeLimitInput.focus();
          timeLimitInput.select();
        }
      }, 100);
      
      console.log('Add site modal shown successfully');
    } else {
      console.error('Add site modal element not found!');
      showMessage('Failed to find modal element', 'error');
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
  
  // Check if user is authenticated
  if (!extensionToken) {
    showMessage('Please connect your account first', 'error');
    return;
  }
  
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
    
    // Hash password if provided
    let hashedPassword = '';
    if (passwordProtected && password) {
      // Hash the password for security
      const encoder = new TextEncoder();
      const data = encoder.encode(password);
      const hashBuffer = await crypto.subtle.digest('SHA-256', data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      hashedPassword = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    }

    // Create new site object
    const newSite = {
      id: Date.now().toString(),
      domain: domain,
      timeLimit: timeLimit,
      password: hashedPassword,
      passwordProtected: passwordProtected,
      lastAccess: null, // Will be set when password is entered
      createdAt: Date.now(),
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
      console.log('Showing edit modal');
      modal.classList.add('show');
    }
    
  } catch (error) {
    console.error('Error opening edit modal:', error);
    showMessage('Failed to open edit dialog', 'error');
  }
}

function closeEditSiteModal() {
  console.log('Closing edit site modal');
  const modal = document.getElementById('editSiteModal');
  if (modal) {
    modal.classList.remove('show');
    console.log('Edit site modal closed');
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
    
    // Hash new password if provided
    let finalPassword = '';
    if (passwordProtected) {
      if (password) {
        // Hash the new password
        const encoder = new TextEncoder();
        const data = encoder.encode(password);
        const hashBuffer = await crypto.subtle.digest('SHA-256', data);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        finalPassword = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
      } else {
        // Keep existing password
        finalPassword = sites[siteIndex].password;
      }
    }

    // Update site
    sites[siteIndex] = {
      ...sites[siteIndex],
      timeLimit: timeLimit,
      password: finalPassword,
      passwordProtected: passwordProtected,
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