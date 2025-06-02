// Background Service Worker for FocusGuard Extension
// This script handles core extension functionality: site blocking, time tracking, and password verification

class BackgroundService {
  constructor() {
    this.activeTimers = new Map();
    this.currentTab = null;
    this.initializeExtension();
    this.setupEventListeners();
  }

  async initializeExtension() {
    chrome.runtime.onInstalled.addListener(async () => {
      await this.initializeStorage();
      console.log('FocusGuard - Website Blocker & Time Manager installed');
    });
  }

  async initializeStorage() {
    const result = await chrome.storage.local.get(['protectedSites', 'timeTrackingData']);
    
    if (!result.protectedSites) {
      await chrome.storage.local.set({ protectedSites: [] });
    }
    
    if (!result.timeTrackingData) {
      await chrome.storage.local.set({ timeTrackingData: {} });
    }
  }

  setupEventListeners() {
    // Tab event listeners
    chrome.tabs.onActivated.addListener(async (activeInfo) => {
      await this.handleTabChange(activeInfo.tabId);
    });

    chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
      if (changeInfo.status === 'complete' && tab.url) {
        await this.handleTabChange(tabId);
      }
    });

    chrome.tabs.onRemoved.addListener((tabId) => {
      this.stopTimer(tabId);
    });

    // Message listener
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      this.handleMessage(request, sender, sendResponse);
      return true; // Keep message channel open for async responses
    });
  }

  async handleTabChange(tabId) {
    try {
      const tab = await new Promise((resolve) => {
        chrome.tabs.get(tabId, resolve);
      });
      
      const url = tab.url;
      
      if (!url || url.startsWith('chrome://') || url.startsWith('chrome-extension://')) {
        return;
      }
      
      const domain = this.extractDomain(url);
      
      // Stop previous timer if exists
      if (this.currentTab && this.currentTab !== tabId) {
        this.stopTimer(this.currentTab);
      }
      
      this.currentTab = tabId;
      
      // Check if site is protected
      const { protectedSites } = await chrome.storage.local.get(['protectedSites']);
      const protectedSite = protectedSites?.find(site => 
        this.matchesDomain(url, site.domain)
      );
      
      if (protectedSite) {
        await this.handleProtectedSite(tab, protectedSite);
      }
      
      // Start time tracking
      this.startTimeTracking(domain, tabId);
      
    } catch (error) {
      console.error('Error handling tab change:', error);
    }
  }

  async handleProtectedSite(tab, protectedSite) {
    const today = new Date().toDateString();
    
    // Check time limits
    if (protectedSite.timeLimit) {
      const { timeTrackingData } = await chrome.storage.local.get(['timeTrackingData']);
      const siteData = timeTrackingData?.[protectedSite.domain] || {};
      const todayTime = siteData[today] || 0;
      
      if (todayTime >= protectedSite.timeLimit * 60 * 1000) {
        await this.blockSite(tab.id, 'TIME_LIMIT_EXCEEDED');
        return;
      }
    }
    
    // Check password protection
    if (protectedSite.password && protectedSite.lastAccess) {
      if (!this.isSessionValid(protectedSite.lastAccess)) {
        await this.blockSite(tab.id, 'PASSWORD_REQUIRED', protectedSite.domain);
        return;
      }
    } else if (protectedSite.password) {
      await this.blockSite(tab.id, 'PASSWORD_REQUIRED', protectedSite.domain);
      return;
    }
  }

  async blockSite(tabId, reason, domain = '') {
    try {
      await chrome.scripting.executeScript({
        target: { tabId },
        func: this.showBlockedOverlay,
        args: [reason, domain]
      });
    } catch (error) {
      console.error('Error blocking site:', error);
    }
  }

  // This function runs in the content script context
  showBlockedOverlay(reason, domain) {
    // Remove existing overlay
    const existingOverlay = document.getElementById('focusguard-overlay');
    if (existingOverlay) {
      existingOverlay.remove();
    }
    
    // Create overlay
    const overlay = document.createElement('div');
    overlay.id = 'focusguard-overlay';
    overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      z-index: 999999;
      display: flex;
      justify-content: center;
      align-items: center;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    `;
    
    const content = document.createElement('div');
    content.style.cssText = `
      background: white;
      padding: 40px;
      border-radius: 20px;
      box-shadow: 0 20px 40px rgba(0,0,0,0.1);
      text-align: center;
      max-width: 400px;
    `;
    
    if (reason === 'PASSWORD_REQUIRED') {
      content.innerHTML = `
        <h2 style="color: #333; margin: 0 0 20px 0;">🔒 Protected Site</h2>
        <p style="color: #666; margin: 0 0 20px 0;">Enter password to access ${domain}</p>
        <input type="password" id="site-password" placeholder="Password" 
               style="width: 100%; padding: 12px; border: 2px solid #ddd; border-radius: 8px; margin: 0 0 20px 0; font-size: 16px;">
        <div>
          <button id="unlock-btn" style="background: #667eea; color: white; border: none; padding: 12px 24px; border-radius: 8px; cursor: pointer; margin-right: 10px;">Unlock</button>
          <button id="cancel-btn" style="background: #ccc; color: #333; border: none; padding: 12px 24px; border-radius: 8px; cursor: pointer;">Cancel</button>
        </div>
      `;
      
      const passwordInput = content.querySelector('#site-password');
      const unlockBtn = content.querySelector('#unlock-btn');
      const cancelBtn = content.querySelector('#cancel-btn');
      
      unlockBtn.onclick = () => {
        const password = passwordInput.value;
        chrome.runtime.sendMessage({
          action: 'verifyPassword',
          domain: domain,
          password: password
        });
      };
      
      cancelBtn.onclick = () => {
        window.close();
      };
      
      passwordInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
          unlockBtn.click();
        }
      });
    } else if (reason === 'TIME_LIMIT_EXCEEDED') {
      content.innerHTML = `
        <h2 style="color: #333; margin: 0 0 20px 0;">⏰ Time Limit Reached</h2>
        <p style="color: #666; margin: 0 0 20px 0;">You've reached your daily time limit for ${domain}</p>
        <div>
          <button id="close-btn" style="background: #667eea; color: white; border: none; padding: 12px 24px; border-radius: 8px; cursor: pointer;">Close Tab</button>
        </div>
      `;
      
      const closeBtn = content.querySelector('#close-btn');
      closeBtn.onclick = () => {
        window.close();
      };
    }
    
    overlay.appendChild(content);
    document.body.appendChild(overlay);
  }

  async handleMessage(request, sender, sendResponse) {
    try {
      switch (request.action) {
        case 'addProtectedSite':
          await this.addProtectedSite(request.data);
          sendResponse({ success: true });
          break;
          
        case 'removeProtectedSite':
          await this.removeProtectedSite(request.domain);
          sendResponse({ success: true });
          break;
          
        case 'verifyPassword':
          const isValid = await this.verifyPassword(request.domain, request.password);
          if (isValid) {
            await this.handleSuccessfulPasswordVerification(request.domain);
            sendResponse({ success: true });
          } else {
            await this.handleFailedPasswordVerification();
            sendResponse({ success: false, error: 'Invalid password' });
          }
          break;
          
        case 'getAnalytics':
          const analytics = await this.getAnalytics(request.period || 7);
          sendResponse({ success: true, data: analytics });
          break;
          
        default:
          sendResponse({ success: false, error: 'Unknown action' });
      }
    } catch (error) {
      console.error('Error handling message:', error);
      sendResponse({ success: false, error: error.message });
    }
  }

  async addProtectedSite(siteData) {
    const { protectedSites } = await chrome.storage.local.get(['protectedSites']);
    const sites = protectedSites || [];
    
    const newSite = {
      id: Date.now().toString(),
      domain: siteData.domain,
      password: siteData.password ? await this.hashPassword(siteData.password) : null,
      timeLimit: siteData.timeLimit || null,
      createdAt: Date.now()
    };
    
    sites.push(newSite);
    await chrome.storage.local.set({ protectedSites: sites });
  }

  async removeProtectedSite(domain) {
    const { protectedSites } = await chrome.storage.local.get(['protectedSites']);
    const sites = protectedSites || [];
    const updatedSites = sites.filter(site => site.domain !== domain);
    await chrome.storage.local.set({ protectedSites: updatedSites });
  }

  async verifyPassword(domain, password) {
    const { protectedSites } = await chrome.storage.local.get(['protectedSites']);
    const site = protectedSites?.find(s => s.domain === domain);
    
    if (!site || !site.password) return false;
    
    const hashedInput = await this.hashPassword(password);
    return hashedInput === site.password;
  }

  async handleSuccessfulPasswordVerification(domain) {
    await this.updateLastAccess(domain);
    
    // Reload the current tab to allow access
    if (this.currentTab) {
      chrome.tabs.reload(this.currentTab);
    }
  }

  async handleFailedPasswordVerification() {
    // Inject error message into current tab
    if (this.currentTab) {
      try {
        await chrome.scripting.executeScript({
          target: { tabId: this.currentTab },
          func: () => {
            const passwordInput = document.getElementById('site-password');
            if (passwordInput) {
              passwordInput.style.borderColor = '#ff4444';
              passwordInput.value = '';
              passwordInput.placeholder = 'Invalid password - try again';
            }
          }
        });
      } catch (error) {
        console.error('Error showing password error:', error);
      }
    }
  }

  async updateLastAccess(domain) {
    const { protectedSites } = await chrome.storage.local.get(['protectedSites']);
    const sites = protectedSites || [];
    
    const siteIndex = sites.findIndex(s => s.domain === domain);
    if (siteIndex !== -1) {
      sites[siteIndex].lastAccess = Date.now();
      await chrome.storage.local.set({ protectedSites: sites });
    }
  }

  startTimeTracking(domain, tabId) {
    // Stop existing timer for this tab
    this.stopTimer(tabId);
    
    const timer = setInterval(() => {
      this.updateTimeSpent(domain, 1000); // Update every second
    }, 1000);
    
    this.activeTimers.set(tabId, {
      timer,
      domain,
      startTime: Date.now()
    });
  }

  stopTimer(tabId) {
    const timerData = this.activeTimers.get(tabId);
    if (timerData) {
      clearInterval(timerData.timer);
      this.activeTimers.delete(tabId);
    }
  }

  async updateTimeSpent(domain, timeSpent) {
    const today = new Date().toDateString();
    const { timeTrackingData } = await chrome.storage.local.get(['timeTrackingData']);
    const data = timeTrackingData || {};
    
    if (!data[domain]) {
      data[domain] = {};
    }
    
    if (!data[domain][today]) {
      data[domain][today] = 0;
    }
    
    data[domain][today] += timeSpent;
    
    await chrome.storage.local.set({ timeTrackingData: data });
  }

  async getAnalytics(period = 7) {
    const { timeTrackingData } = await chrome.storage.local.get(['timeTrackingData']);
    const data = timeTrackingData || {};
    
    return this.calculateAnalytics(data, period);
  }

  // Utility functions
  calculateAnalytics(timeTrackingData, period) {
    const analytics = {};
    const dates = this.getDatesRange(period);

    Object.entries(timeTrackingData).forEach(([domain, domainData]) => {
      analytics[domain] = {
        totalTime: 0,
        dailyData: {},
        averageDaily: 0
      };

      let validDays = 0;

      dates.forEach(date => {
        const dayTime = domainData[date] || 0;
        analytics[domain].dailyData[date] = dayTime;
        analytics[domain].totalTime += dayTime;

        if (dayTime > 0) validDays++;
      });

      analytics[domain].averageDaily = validDays > 0 ? 
        analytics[domain].totalTime / validDays : 0;
    });

    return analytics;
  }

  getDatesRange(days) {
    const dates = [];
    const now = new Date();

    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      dates.push(date.toDateString());
    }

    return dates;
  }

  extractDomain(url) {
    try {
      return new URL(url).hostname;
    } catch {
      console.error('Invalid URL:', url);
      return '';
    }
  }

  matchesDomain(url, protectedDomain) {
    const currentDomain = this.extractDomain(url);
    return currentDomain.includes(protectedDomain) || protectedDomain.includes(currentDomain);
  }

  isSessionValid(lastAccess, sessionDuration = 30 * 60 * 1000) {
    return Date.now() - lastAccess <= sessionDuration;
  }

  async hashPassword(password) {
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }
}

// Initialize the background service
new BackgroundService(); 