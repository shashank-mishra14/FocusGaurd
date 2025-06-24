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
      this.currentTabUrl = url;
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
      
      const protectedSite = protectedSites?.find(site => {
        const matches = this.matchesDomain(url, site.domain);
        console.log('Checking site:', site.domain, 'against URL:', url, 'matches:', matches);
        return matches;
      });
      
      console.log('Found protected site:', protectedSite);
      
      if (protectedSite) {
        console.log('Site is protected, handling protection...');
        await this.handleProtectedSite(tab, protectedSite);
        
        // Only start time tracking for protected sites
        this.startTimeTracking(domain, tabId);
      } else {
        console.log('Site is not protected - no time tracking');
      }
      
    } catch (error) {
      console.error('Error handling tab change:', error);
    }
  }

  async handleProtectedSite(tab, protectedSite) {
    console.log('Handling protected site:', protectedSite);
    console.log('Site password exists:', !!protectedSite.password);
    console.log('Site time limit:', protectedSite.timeLimit);
    console.log('Site instant protect:', protectedSite.instantProtect);
    const today = new Date().toDateString();
    
    const isInstantProtect = protectedSite.instantProtect || protectedSite.timeLimit === 0;
    
    // Check password protection first (for both instant and time-limited protection)
    if (protectedSite.password) {
      console.log('Site has password protection');
      
      // Check if session is valid
      if (protectedSite.lastAccess && this.isSessionValid(protectedSite.lastAccess)) {
        console.log('Session is still valid, allowing access');
      } else {
        console.log('Password required, blocking site');
        await this.blockSite(tab.id, 'PASSWORD_REQUIRED', protectedSite.domain);
        return;
      }
    }
    
    // Check time limits (only for non-instant protect sites)
    if (!isInstantProtect && protectedSite.timeLimit > 0) {
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
    
    console.log('Access granted for protected site');
  }

  async blockSite(tabId, reason, domain = '') {
    console.log('🚫 BLOCKING SITE:', { tabId, reason, domain });
    try {
      // First, try direct script injection
      try {
        await chrome.scripting.executeScript({
          target: { tabId },
          func: this.showBlockedOverlay,
          args: [reason, domain]
        });
        console.log('✅ Overlay injected successfully via script');
        return;
      } catch (error) {
        console.warn('Script injection failed, trying content script message:', error);
      }

      // Fallback: try using content script message
      try {
        await chrome.tabs.sendMessage(tabId, {
          action: 'showBlockOverlay',
          reason: reason,
          domain: domain
        });
        console.log('✅ Fallback message sent to content script');
        return;
      } catch (msgError) {
        console.error('❌ Both injection methods failed:', msgError);
      }

      // Last resort: try reloading with blocking page
      console.log('🔄 Last resort: navigating to blocking page');
      chrome.tabs.update(tabId, {
        url: chrome.runtime.getURL(`blocked.html?reason=${reason}&domain=${domain}`)
      });

    } catch (error) {
      console.error('❌ Critical error blocking site:', error);
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
    console.log('Handling message:', request.action);
    
    try {
      switch (request.action) {
        case 'setExtensionToken':
          await chrome.storage.local.set({ 
            extensionToken: request.token,
            currentUser: request.user 
          });
          // Sync protected sites from backend after token is set
          await this.syncProtectedSitesFromBackend();
          sendResponse({ success: true });
          break;
          
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
            sendResponse({ success: true, action: 'passwordVerified' });
          } else {
            await this.handleFailedPasswordVerification();
            sendResponse({ success: false, error: 'Invalid password' });
          }
          break;
          
        case 'getAnalytics':
          const analytics = await this.getAnalytics(request.period);
          sendResponse({ success: true, data: analytics });
          break;

        // NEW: Handle backend sync request
        case 'syncWithBackend':
          await this.syncProtectedSitesWithBackend();
          sendResponse({ success: true, message: 'Backend sync initiated' });
          break;

        case 'syncProtectedSitesWithBackend':
          await this.syncProtectedSitesWithBackend();
          sendResponse({ success: true, message: 'Protected sites sync initiated' });
          break;

        case 'generateSessionToken':
          const token = await this.generateSessionToken();
          sendResponse({ success: !!token, sessionToken: token });
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
    try {
      const { protectedSites } = await chrome.storage.local.get(['protectedSites']);
      const sites = protectedSites || [];
      
      // Check if site already exists
      const existingIndex = sites.findIndex(site => site.domain === siteData.domain);
      
      if (existingIndex !== -1) {
        // Update existing site
        sites[existingIndex] = { ...sites[existingIndex], ...siteData };
        if (siteData.password) {
          sites[existingIndex].password = await this.hashPassword(siteData.password);
        }
      } else {
        // Add new site
        sites.push({
          domain: siteData.domain,
          timeLimit: siteData.timeLimit || 0,
          password: siteData.password ? await this.hashPassword(siteData.password) : undefined,
          instantProtect: siteData.instantProtect || false
        });
      }
      
      await chrome.storage.local.set({ protectedSites: sites });
      
      // NEW: Sync with backend
      await this.syncProtectedSiteWithBackend(siteData);
      
      console.log('Protected site added:', siteData.domain);
    } catch (error) {
      console.error('Error adding protected site:', error);
      throw error;
    }
  }

  // NEW: Sync individual protected site with backend
  async syncProtectedSiteWithBackend(siteData) {
    try {
      const { extensionToken } = await chrome.storage.local.get(['extensionToken']);
      if (!extensionToken) {
        console.log('No extension token available for syncing protected site');
        return;
      }
      
      const response = await fetch(`http://localhost:3000/api/protected-sites?token=${extensionToken}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          domain: siteData.domain,
          timeLimit: siteData.timeLimit,
          password: siteData.password,
          passwordProtected: !!siteData.password
        })
      });
      
      if (response.ok) {
        console.log('Protected site synced with backend:', siteData.domain);
      } else {
        console.log('Failed to sync protected site with backend:', response.status);
      }
    } catch (error) {
      console.error('Error syncing protected site with backend:', error);
    }
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
    try {
      const now = new Date();
      const today = now.toDateString();
      const currentHour = now.getHours();
      
      // Get current tracking data
      const { timeTrackingData, extensionToken } = await chrome.storage.local.get(['timeTrackingData', 'extensionToken']);
      
      // Initialize data structures
      const updatedData = timeTrackingData || {};
      if (!updatedData[domain]) {
        updatedData[domain] = {};
      }
      if (!updatedData[domain][today]) {
        updatedData[domain][today] = 0;
      }
      
      // Add time spent
      updatedData[domain][today] += timeSpent;
      
      // Store updated data
      await chrome.storage.local.set({ timeTrackingData: updatedData });
      
      console.log(`Time tracking updated for ${domain}:`, {
        timeSpent: Math.round(timeSpent / 1000) + 's',
        dailyTotal: Math.round(updatedData[domain][today] / 1000) + 's'
      });
      
      // Sync with backend if authenticated
      if (extensionToken) {
        await this.syncWithBackend(domain, timeSpent, today, currentHour);
      }
      
      // Send analytics update to any open popups
      chrome.runtime.sendMessage({
        action: 'analyticsUpdated',
        domain: domain,
        timeSpent: timeSpent,
        date: today
      }).catch(() => {
        // Ignore errors if no popup is listening
      });
      
    } catch (error) {
      console.error('Error updating time spent:', error);
    }
  }

  async syncWithBackend(domain, timeSpent, date, hour) {
    try {
      const { extensionToken } = await chrome.storage.local.get(['extensionToken']);
      
      if (!extensionToken) {
        console.log('No auth token, skipping backend sync');
        return;
      }

      // Prepare analytics data
      const analyticsData = {
        domain: domain,
        timeSpent: Math.round(timeSpent), // milliseconds
        date: date,
        hour: hour,
        timestamp: new Date().toISOString(),
        sessionId: this.generateSessionId(),
        url: this.currentTabUrl || domain
      };

      console.log('Syncing analytics to backend:', analyticsData);

      const response = await fetch('http://localhost:3000/api/analytics', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${extensionToken}`
        },
        body: JSON.stringify(analyticsData)
      });

      if (response.ok) {
        const result = await response.json();
        console.log('Analytics synced successfully:', result);
      } else {
        const error = await response.text();
        console.error('Failed to sync analytics:', response.status, error);
      }

    } catch (error) {
      console.error('Error syncing analytics with backend:', error);
    }
  }

  generateSessionId() {
    if (!this.sessionId) {
      this.sessionId = Date.now().toString(36) + Math.random().toString(36).substr(2);
    }
    return this.sessionId;
  }

  async getAnalytics(period = 7) {
    try {
      const { timeTrackingData } = await chrome.storage.local.get(['timeTrackingData']);
      
      if (!timeTrackingData) {
        return { success: true, data: {} };
      }
      
      const analytics = this.calculateAnalytics(timeTrackingData, period);
      
      return {
        success: true,
        data: analytics
      };
    } catch (error) {
      console.error('Error getting analytics:', error);
      return { success: false, error: error.message };
    }
  }

  calculateAnalytics(timeTrackingData, period) {
    const analytics = {};
    const datesRange = this.getDatesRange(period);
    
    // Process each domain
    Object.keys(timeTrackingData).forEach(domain => {
      const domainData = timeTrackingData[domain];
      
      // Calculate totals and daily breakdown
      let totalTime = 0;
      const dailyData = {};
      const hourlyBreakdown = {};
      
      datesRange.forEach(dateString => {
        const dayTime = domainData[dateString] || 0;
        totalTime += dayTime;
        dailyData[dateString] = dayTime;
      });
      
      // Calculate averages and streaks
      const averageDaily = period > 0 ? totalTime / period : 0;
      const activeDays = datesRange.filter(date => (domainData[date] || 0) > 0).length;
      
      // Calculate productivity metrics
      const weekdayTotal = datesRange
        .filter(date => {
          const day = new Date(date).getDay();
          return day > 0 && day < 6; // Monday to Friday
        })
        .reduce((sum, date) => sum + (domainData[date] || 0), 0);
      
      const weekendTotal = datesRange
        .filter(date => {
          const day = new Date(date).getDay();
          return day === 0 || day === 6; // Saturday and Sunday
        })
        .reduce((sum, date) => sum + (domainData[date] || 0), 0);
      
      analytics[domain] = {
        totalTime,
        averageDaily,
        activeDays,
        dailyData,
        hourlyBreakdown,
        weekdayTotal,
        weekendTotal,
                 productivity: {
           focusScore: this.calculateFocusScore(domainData),
           consistency: activeDays / period,
           trend: this.calculateTrend(domainData, datesRange)
         }
      };
    });
    
    return analytics;
  }

  calculateFocusScore(domainData) {
    // Simple focus score based on consistency and time distribution
    const days = Object.keys(domainData);
    if (days.length === 0) return 0;
    
    const times = days.map(day => domainData[day]);
    const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
    const variance = times.reduce((sum, time) => sum + Math.pow(time - avgTime, 2), 0) / times.length;
    const standardDeviation = Math.sqrt(variance);
    
    // Lower deviation indicates more consistent usage (better focus)
    const consistencyScore = avgTime > 0 ? Math.max(0, 1 - (standardDeviation / avgTime)) : 0;
    
    return Math.round(consistencyScore * 100);
  }

  calculateTrend(domainData, datesRange) {
    if (datesRange.length < 2) return 0;
    
    const firstHalf = datesRange.slice(0, Math.floor(datesRange.length / 2));
    const secondHalf = datesRange.slice(Math.floor(datesRange.length / 2));
    
    const firstHalfAvg = firstHalf.reduce((sum, date) => sum + (domainData[date] || 0), 0) / firstHalf.length;
    const secondHalfAvg = secondHalf.reduce((sum, date) => sum + (domainData[date] || 0), 0) / secondHalf.length;
    
    if (firstHalfAvg === 0) return secondHalfAvg > 0 ? 1 : 0;
    
    return (secondHalfAvg - firstHalfAvg) / firstHalfAvg;
  }

  // Utility functions
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