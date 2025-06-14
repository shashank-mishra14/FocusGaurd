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
      console.log('Tab activated:', activeInfo.tabId);
      await this.handleTabChange(activeInfo.tabId);
    });

    chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
      if (changeInfo.status === 'complete' && tab.url) {
        console.log('Tab updated:', tabId, tab.url);
        await this.handleTabChange(tabId);
      }
    });

    chrome.tabs.onRemoved.addListener((tabId) => {
      console.log('Tab removed:', tabId);
      this.stopTimer(tabId);
    });

    // Message listener
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      console.log('Message received:', request);
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
      console.log('Handling tab change for URL:', url);
      
      if (!url || url.startsWith('chrome://') || url.startsWith('chrome-extension://')) {
        console.log('Skipping system URL:', url);
        return;
      }
      
      const domain = this.extractDomain(url);
      console.log('Extracted domain:', domain);
      
      // Stop previous timer if exists
      if (this.currentTab && this.currentTab !== tabId) {
        this.stopTimer(this.currentTab);
      }
      
      this.currentTab = tabId;
      
      // Check if site is protected
      const { protectedSites } = await chrome.storage.local.get(['protectedSites']);
      console.log('Protected sites:', protectedSites);
      
      const protectedSite = protectedSites?.find(site => 
        this.matchesDomain(url, site.domain)
      );
      
      console.log('Found protected site:', protectedSite);
      
      if (protectedSite) {
        console.log('Site is protected, handling protection...');
        await this.handleProtectedSite(tab, protectedSite);
      } else {
        console.log('Site is not protected');
      }
      
      // Start time tracking
      this.startTimeTracking(domain, tabId);
      
    } catch (error) {
      console.error('Error handling tab change:', error);
    }
  }

  async handleProtectedSite(tab, protectedSite) {
    console.log('Handling protected site:', protectedSite);
    const today = new Date().toDateString();
    
    // Check time limits first
    if (protectedSite.timeLimit) {
      const { timeTrackingData } = await chrome.storage.local.get(['timeTrackingData']);
      const siteData = timeTrackingData?.[protectedSite.domain] || {};
      const todayTime = siteData[today] || 0;
      
      console.log('Time limit check:', {
        timeLimit: protectedSite.timeLimit,
        todayTime: todayTime,
        limitMs: protectedSite.timeLimit * 60 * 1000
      });
      
      if (todayTime >= protectedSite.timeLimit * 60 * 1000) {
        console.log('Time limit exceeded, blocking site');
        await this.blockSite(tab.id, 'TIME_LIMIT_EXCEEDED', protectedSite.domain);
        return;
      }
    }
    
    // Check password protection
    if (protectedSite.password) {
      console.log('Site has password protection');
      
      // Check if session is valid
      if (protectedSite.lastAccess && this.isSessionValid(protectedSite.lastAccess)) {
        console.log('Session is still valid, allowing access');
        return;
      }
      
      console.log('Password required, blocking site');
      await this.blockSite(tab.id, 'PASSWORD_REQUIRED', protectedSite.domain);
      return;
    }
    
    console.log('No protection needed for this site');
  }

  async blockSite(tabId, reason, domain = '') {
    console.log('Blocking site:', { tabId, reason, domain });
    try {
      // Wait a bit for the page to load
      setTimeout(async () => {
        try {
          await chrome.scripting.executeScript({
            target: { tabId },
            func: this.showBlockedOverlay,
            args: [reason, domain]
          });
          console.log('Overlay injected successfully');
        } catch (error) {
          console.error('Error injecting overlay:', error);
          // Fallback: try using content script message
          try {
            await chrome.tabs.sendMessage(tabId, {
              action: 'showBlockOverlay',
              reason: reason,
              domain: domain
            });
            console.log('Fallback message sent to content script');
          } catch (msgError) {
            console.error('Fallback message also failed:', msgError);
          }
        }
      }, 500);
    } catch (error) {
      console.error('Error blocking site:', error);
    }
  }

  // This function runs in the content script context
  showBlockedOverlay(reason, domain) {
    console.log('Showing blocked overlay:', reason, domain);
    
    // Remove existing overlay
    const existingOverlay = document.getElementById('focusguard-overlay');
    if (existingOverlay) {
      existingOverlay.remove();
    }
    
    // Create overlay
    const overlay = document.createElement('div');
    overlay.id = 'focusguard-overlay';
    overlay.style.cssText = `
      position: fixed !important;
      top: 0 !important;
      left: 0 !important;
      width: 100% !important;
      height: 100% !important;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%) !important;
      z-index: 2147483647 !important;
      display: flex !important;
      justify-content: center !important;
      align-items: center !important;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif !important;
    `;
    
    const content = document.createElement('div');
    content.style.cssText = `
      background: white !important;
      padding: 40px !important;
      border-radius: 20px !important;
      box-shadow: 0 20px 40px rgba(0,0,0,0.1) !important;
      text-align: center !important;
      max-width: 400px !important;
      box-sizing: border-box !important;
    `;
    
    if (reason === 'PASSWORD_REQUIRED') {
      content.innerHTML = `
        <h2 style="color: #333 !important; margin: 0 0 20px 0 !important; font-size: 24px !important;">🔒 Protected Site</h2>
        <p style="color: #666 !important; margin: 0 0 20px 0 !important; font-size: 16px !important;">Enter password to access ${domain}</p>
        <input type="password" id="focusguard-password" placeholder="Password" 
               style="width: 100% !important; padding: 12px !important; border: 2px solid #ddd !important; border-radius: 8px !important; margin: 0 0 20px 0 !important; font-size: 16px !important; box-sizing: border-box !important;">
        <div style="display: flex !important; gap: 10px !important; justify-content: center !important;">
          <button id="focusguard-unlock" style="background: #667eea !important; color: white !important; border: none !important; padding: 12px 24px !important; border-radius: 8px !important; cursor: pointer !important; font-size: 14px !important;">Unlock</button>
          <button id="focusguard-cancel" style="background: #ccc !important; color: #333 !important; border: none !important; padding: 12px 24px !important; border-radius: 8px !important; cursor: pointer !important; font-size: 14px !important;">Cancel</button>
        </div>
        <div id="focusguard-error" style="color: #ff4444 !important; margin-top: 10px !important; font-size: 14px !important; display: none;"></div>
      `;
      
      const passwordInput = content.querySelector('#focusguard-password');
      const unlockBtn = content.querySelector('#focusguard-unlock');
      const cancelBtn = content.querySelector('#focusguard-cancel');
      const errorDiv = content.querySelector('#focusguard-error');
      
      unlockBtn.onclick = () => {
        const password = passwordInput.value;
        if (!password) {
          showError('Please enter a password');
          return;
        }
        
        unlockBtn.disabled = true;
        unlockBtn.textContent = 'Verifying...';
        
        chrome.runtime.sendMessage({
          action: 'verifyPassword',
          domain: domain,
          password: password
        }, (response) => {
          if (response && response.success) {
            showSuccess('Access granted! Reloading...');
          } else {
            showError('Invalid password. Please try again.');
            unlockBtn.disabled = false;
            unlockBtn.textContent = 'Unlock';
            passwordInput.value = '';
            passwordInput.focus();
          }
        });
      };
      
      cancelBtn.onclick = () => {
        window.history.back();
      };
      
      passwordInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
          unlockBtn.click();
        }
      });
      
      function showError(message) {
        errorDiv.textContent = message;
        errorDiv.style.display = 'block';
        passwordInput.style.borderColor = '#ff4444';
      }
      
      function showSuccess(message) {
        errorDiv.textContent = message;
        errorDiv.style.color = '#22c55e';
        errorDiv.style.display = 'block';
      }
      
      // Focus password input
      setTimeout(() => passwordInput.focus(), 100);
      
    } else if (reason === 'TIME_LIMIT_EXCEEDED') {
      content.innerHTML = `
        <h2 style="color: #333 !important; margin: 0 0 20px 0 !important; font-size: 24px !important;">⏰ Time Limit Reached</h2>
        <p style="color: #666 !important; margin: 0 0 20px 0 !important; font-size: 16px !important;">You've reached your daily time limit for ${domain}</p>
        <p style="color: #888 !important; margin: 0 0 20px 0 !important; font-size: 14px !important;">Take a break and come back tomorrow!</p>
        <div style="display: flex !important; gap: 10px !important; justify-content: center !important;">
          <button id="focusguard-close" style="background: #667eea !important; color: white !important; border: none !important; padding: 12px 24px !important; border-radius: 8px !important; cursor: pointer !important; font-size: 14px !important;">Go Back</button>
        </div>
      `;
      
      const closeBtn = content.querySelector('#focusguard-close');
      closeBtn.onclick = () => {
        window.history.back();
      };
    }
    
    overlay.appendChild(content);
    
    // Ensure overlay is added to the document
    if (document.body) {
      document.body.appendChild(overlay);
    } else {
      // If body not ready, wait for it
      document.addEventListener('DOMContentLoaded', () => {
        if (document.body) {
          document.body.appendChild(overlay);
        }
      });
    }
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
    console.log('Domain matching:', { currentDomain, protectedDomain });
    
    // Remove www. prefix for comparison
    const cleanCurrent = currentDomain.replace(/^www\./, '');
    const cleanProtected = protectedDomain.replace(/^www\./, '');
    
    // Exact match or subdomain match
    const isMatch = cleanCurrent === cleanProtected || 
                   cleanCurrent.endsWith('.' + cleanProtected) ||
                   cleanProtected.endsWith('.' + cleanCurrent);
    
    console.log('Domain match result:', isMatch);
    return isMatch;
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