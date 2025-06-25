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
      console.log('🌍 HANDLING TAB CHANGE:', { tabId, url });
      
      if (!url || url.startsWith('chrome://') || url.startsWith('chrome-extension://')) {
        console.log('⚠️ Skipping system URL:', url);
        return;
      }
      
      const domain = this.extractDomain(url);
      console.log('🎯 Extracted domain:', domain);
      
      // Stop previous timer if exists
      if (this.currentTab && this.currentTab !== tabId) {
        this.stopTimer(this.currentTab);
      }
      
      this.currentTab = tabId;
      
      // Check if site is protected with enhanced logging
      const { protectedSites } = await chrome.storage.local.get(['protectedSites']);
      console.log('📋 All protected sites:', protectedSites);
      console.log('🔍 Looking for domain:', domain);
      
      const protectedSite = protectedSites?.find(site => {
        const matches = this.matchesDomain(url, site.domain);
        console.log('🔎 Checking site:', {
          protectedDomain: site.domain,
          currentUrl: url,
          matches: matches,
          hasPassword: !!site.password,
          instantProtect: site.instantProtect,
          timeLimit: site.timeLimit
        });
        return matches;
      });
      
      if (protectedSite) {
        console.log('🎯 FOUND PROTECTED SITE:', {
          domain: protectedSite.domain,
          hasPassword: !!protectedSite.password,
          instantProtect: protectedSite.instantProtect,
          timeLimit: protectedSite.timeLimit,
          lastAccess: protectedSite.lastAccess
        });
        
        await this.handleProtectedSite(tab, protectedSite);
        
        // Only start time tracking for protected sites
        this.startTimeTracking(domain, tabId);
      } else {
        console.log('✅ Site is not protected - no blocking or time tracking');
      }
      
    } catch (error) {
      console.error('❌ Error handling tab change:', error);
    }
  }

  async handleProtectedSite(tab, protectedSite) {
    console.log('🔒 HANDLING PROTECTED SITE:', protectedSite);
    console.log('🔑 Site password exists:', !!protectedSite.password);
    console.log('⏰ Site time limit:', protectedSite.timeLimit);
    console.log('⚡ Site instant protect:', protectedSite.instantProtect);
    console.log('🌐 Tab URL:', tab.url);
    console.log('🎯 Tab ID:', tab.id);
    
    const today = new Date().toDateString();
    const isInstantProtect = protectedSite.instantProtect || protectedSite.timeLimit === 0;
    
    console.log('📊 Protection Analysis:', {
      hasPassword: !!protectedSite.password,
      isInstantProtect,
      timeLimit: protectedSite.timeLimit,
      lastAccess: protectedSite.lastAccess
    });
    
    // Check password protection first (for both instant and time-limited protection)
    if (protectedSite.password) {
      console.log('🔐 Site has password protection - checking session...');
      
      // Check if session is valid - FIXED: Block if no lastAccess OR session expired
      if (!protectedSite.lastAccess || !this.isSessionValid(protectedSite.lastAccess)) {
        console.log('❌ Password required (no session or expired), BLOCKING SITE NOW');
        await this.blockSite(tab.id, 'PASSWORD_REQUIRED', protectedSite.domain);
        return;
      } else {
        console.log('✅ Session is still valid, allowing access');
      }
    } else {
      console.log('🔓 No password protection set for this site');
    }
    
    // Check time limits (only for non-instant protect sites)
    if (!isInstantProtect && protectedSite.timeLimit > 0) {
      console.log('⏱️ Checking time limits...');
      const { timeTrackingData } = await chrome.storage.local.get(['timeTrackingData']);
      const siteData = timeTrackingData?.[protectedSite.domain] || {};
      const todayTime = siteData[today] || 0;
      
      console.log('📈 Time limit check:', {
        timeLimit: protectedSite.timeLimit,
        todayTime: todayTime,
        limitMs: protectedSite.timeLimit * 60 * 1000,
        exceeded: todayTime >= protectedSite.timeLimit * 60 * 1000
      });
      
      if (todayTime >= protectedSite.timeLimit * 60 * 1000) {
        console.log('⏰ Time limit exceeded, blocking site');
        await this.blockSite(tab.id, 'TIME_LIMIT_EXCEEDED', protectedSite.domain);
        return;
      }
    } else if (isInstantProtect) {
      console.log('⚡ Instant protect mode - no time tracking');
    }
    
    console.log('✅ Access granted for protected site');
  }

  async blockSite(tabId, reason, domain = '') {
    console.log('🚫 BLOCKING SITE:', { tabId, reason, domain });
    try {
      // FORCE REDIRECT to blocking page immediately (most reliable method)
      console.log('🔄 FORCING redirect to blocking page');
      const blockingUrl = chrome.runtime.getURL(`blocked.html?reason=${reason}&domain=${domain}`);
      console.log('📍 Blocking URL:', blockingUrl);
      
      await chrome.tabs.update(tabId, { url: blockingUrl });
      console.log('✅ Successfully redirected to blocking page');
      return;

    } catch (error) {
      console.error('❌ Critical error blocking site:', error);
      
      // Backup: try script injection
      try {
        await chrome.scripting.executeScript({
          target: { tabId },
          func: this.showBlockedOverlay,
          args: [reason, domain]
        });
        console.log('✅ Backup: Overlay injected successfully via script');
      } catch (scriptError) {
        console.error('❌ Both blocking methods failed:', scriptError);
      }
    }
  }

  // This function runs in the content script context
  showBlockedOverlay(reason, domain) {
    console.log('🎯 SCRIPT INJECTION: Showing blocked overlay for', reason, domain);
    console.log('🔍 Parameters received:', { reason: reason, domain: domain, reasonType: typeof reason });
    
    // Remove existing overlay
    const existingOverlay = document.getElementById('focusguard-overlay');
    if (existingOverlay) {
      console.log('🗑️ Removing existing overlay');
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
    
    console.log('🧐 Checking reason condition:', reason === 'PASSWORD_REQUIRED');
    
    if (reason === 'PASSWORD_REQUIRED') {
      console.log('✅ Creating password UI...');
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
      
      console.log('🎨 Password UI HTML created');
      
      // Wait a moment for DOM to update, then set up event handlers
      setTimeout(() => {
        console.log('🔧 Setting up event handlers...');
        
        const passwordInput = content.querySelector('#focusguard-password');
        const unlockBtn = content.querySelector('#focusguard-unlock');
        const cancelBtn = content.querySelector('#focusguard-cancel');
        const errorDiv = content.querySelector('#focusguard-error');
        
        console.log('🔍 Elements found:', {
          passwordInput: !!passwordInput,
          unlockBtn: !!unlockBtn,
          cancelBtn: !!cancelBtn,
          errorDiv: !!errorDiv
        });
        
        if (unlockBtn) {
          unlockBtn.onclick = () => {
            console.log('🔓 Unlock button clicked');
            const password = passwordInput?.value;
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
              console.log('🔐 Password verification response:', response);
              if (response && response.success) {
                showSuccess('Access granted! Reloading...');
              } else {
                showError('Invalid password. Please try again.');
                unlockBtn.disabled = false;
                unlockBtn.textContent = 'Unlock';
                if (passwordInput) {
                  passwordInput.value = '';
                  passwordInput.focus();
                }
              }
            });
          };
        }
        
        if (cancelBtn) {
          cancelBtn.onclick = () => {
            console.log('❌ Cancel button clicked');
            window.history.back();
          };
        }
        
        if (passwordInput) {
          passwordInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
              if (unlockBtn) unlockBtn.click();
            }
          });
          
          // Focus the password input
          passwordInput.focus();
        }
        
        function showError(message) {
          console.log('❌ Showing error:', message);
          if (errorDiv) {
            errorDiv.textContent = message;
            errorDiv.style.display = 'block';
          }
          if (passwordInput) {
            passwordInput.style.borderColor = '#ff4444';
          }
        }
        
        function showSuccess(message) {
          console.log('✅ Showing success:', message);
          if (errorDiv) {
            errorDiv.textContent = message;
            errorDiv.style.color = '#22c55e';
            errorDiv.style.display = 'block';
          }
        }
        
      }, 100);
      
    } else if (reason === 'TIME_LIMIT_EXCEEDED') {
      console.log('⏰ Creating time limit UI...');
      content.innerHTML = `
        <h2 style="color: #333 !important; margin: 0 0 20px 0 !important; font-size: 24px !important;">⏰ Time Limit Reached</h2>
        <p style="color: #666 !important; margin: 0 0 20px 0 !important; font-size: 16px !important;">You've reached your daily time limit for ${domain}</p>
        <p style="color: #888 !important; margin: 0 0 20px 0 !important; font-size: 14px !important;">Take a break and come back tomorrow!</p>
        <div style="display: flex !important; gap: 10px !important; justify-content: center !important;">
          <button id="focusguard-close" style="background: #667eea !important; color: white !important; border: none !important; padding: 12px 24px !important; border-radius: 8px !important; cursor: pointer !important; font-size: 14px !important;">Go Back</button>
        </div>
      `;
      
      setTimeout(() => {
        const closeBtn = content.querySelector('#focusguard-close');
        if (closeBtn) {
          closeBtn.onclick = () => {
            console.log('🔙 Close button clicked');
            window.history.back();
          };
        }
      }, 100);
      
    } else {
      console.log('❓ Unknown reason, creating generic overlay');
      content.innerHTML = `
        <h2 style="color: #333 !important; margin: 0 0 20px 0 !important; font-size: 24px !important;">🚫 Site Blocked</h2>
        <p style="color: #666 !important; margin: 0 0 20px 0 !important; font-size: 16px !important;">This site is currently blocked</p>
        <p style="color: #888 !important; margin: 0 0 20px 0 !important; font-size: 14px !important;">Reason: ${reason}</p>
        <div style="display: flex !important; gap: 10px !important; justify-content: center !important;">
          <button onclick="window.history.back()" style="background: #667eea !important; color: white !important; border: none !important; padding: 12px 24px !important; border-radius: 8px !important; cursor: pointer !important; font-size: 14px !important;">Go Back</button>
        </div>
      `;
    }
    
    overlay.appendChild(content);
    
    // Force add overlay to document
    console.log('📝 Adding overlay to document. Body exists:', !!document.body);
    
    const addOverlay = () => {
      if (document.body) {
        document.body.appendChild(overlay);
        console.log('✅ Overlay added to body successfully');
        
        // Verify overlay is in DOM
        const addedOverlay = document.getElementById('focusguard-overlay');
        console.log('🔍 Overlay verification:', {
          exists: !!addedOverlay,
          visible: addedOverlay ? window.getComputedStyle(addedOverlay).display : 'N/A',
          zIndex: addedOverlay ? window.getComputedStyle(addedOverlay).zIndex : 'N/A',
          contentHTML: addedOverlay ? addedOverlay.innerHTML.substring(0, 200) + '...' : 'N/A'
        });
      } else {
        console.log('❌ Document body not available yet');
        // Try document.documentElement as fallback
        if (document.documentElement) {
          document.documentElement.appendChild(overlay);
          console.log('✅ Overlay added to documentElement as fallback');
        } else {
          console.log('❌ Neither body nor documentElement available');
        }
      }
    };
    
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', addOverlay);
    } else {
      addOverlay();
    }
  }

  async handleMessage(request, sender, sendResponse) {
    console.log('🔔 Background received message:', request);
    
    try {
      switch (request.action) {
        case 'testOverlay':
          console.log('🧪 Testing overlay for domain:', request.domain);
          if (sender.tab?.id) {
            await this.blockSite(sender.tab.id, 'PASSWORD_REQUIRED', request.domain);
            sendResponse({ success: true, message: 'Test overlay triggered' });
          } else {
            sendResponse({ success: false, message: 'No tab ID available' });
          }
          break;
          
        case 'addProtectedSite':
          console.log('➕ Adding protected site:', request.siteData);
          await this.addProtectedSite(request.siteData);
          sendResponse({ success: true });
          break;

        case 'removeProtectedSite':
          console.log('➖ Removing protected site:', request.domain);
          await this.removeProtectedSite(request.domain);
          sendResponse({ success: true });
          break;

        case 'verifyPassword':
          console.log('🔐 Verifying password for domain:', request.domain);
          console.log('🔑 Password length:', request.password?.length);
          const isValid = await this.verifyPassword(request.domain, request.password);
          console.log('✅ Password verification result:', isValid);
          if (isValid) {
            console.log('🎉 Password correct! Handling successful verification...');
            await this.handleSuccessfulPasswordVerification(request.domain);
            sendResponse({ success: true });
          } else {
            console.log('❌ Password incorrect! Handling failed verification...');
            await this.handleFailedPasswordVerification();
            sendResponse({ success: false });
          }
          break;

        case 'getAnalytics':
          console.log('📊 Getting analytics data');
          const analytics = await this.getAnalytics(request.period || 7);
          sendResponse({ success: true, data: analytics });
          break;

        case 'clearData':
          console.log('🗑️ Clearing all data');
          await chrome.storage.local.clear();
          sendResponse({ success: true });
          break;

        case 'syncProtectedSitesWithBackend':
          console.log('🔄 Syncing with backend');
          // This would sync with your backend if needed
          sendResponse({ success: true });
          break;

        case 'checkAccess':
          console.log('🚪 Checking access for:', request.domain);
          // This is called by content scripts
          sendResponse({ success: true });
          break;

        case 'forceSyncAnalytics':
          console.log('📈 Force syncing analytics');
          await this.forceSyncAllAnalyticsData();
          sendResponse({ success: true });
          break;

        case 'handleCancel':
          console.log('❌ User cancelled password entry for:', request.domain);
          // Redirect to a safe page instead of allowing access
          if (this.currentTab) {
            await chrome.tabs.update(this.currentTab, { url: 'chrome://newtab/' });
          }
          sendResponse({ success: true });
          break;

        default:
          console.log('❓ Unknown action:', request.action);
          sendResponse({ success: false, message: 'Unknown action' });
      }
    } catch (error) {
      console.error('❌ Error handling message:', error);
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
    console.log('🔍 Looking up site for domain:', domain);
    const { protectedSites } = await chrome.storage.local.get(['protectedSites']);
    console.log('📋 All protected sites:', protectedSites?.map(s => ({ domain: s.domain, hasPassword: !!s.password })));
    
    const site = protectedSites?.find(s => s.domain === domain);
    console.log('🎯 Found site:', site ? { domain: site.domain, hasPassword: !!site.password } : 'NOT FOUND');
    
    if (!site || !site.password) {
      console.log('❌ No site or no password found for domain:', domain);
      return false;
    }
    
    const hashedInput = await this.hashPassword(password);
    console.log('🔐 Password hash comparison:', {
      inputHash: hashedInput.substring(0, 20) + '...',
      storedHash: site.password.substring(0, 20) + '...',
      matches: hashedInput === site.password
    });
    
    return hashedInput === site.password;
  }

  async handleSuccessfulPasswordVerification(domain) {
    await this.updateLastAccess(domain);
    
    // Redirect to the original protected site
    if (this.currentTab) {
      const targetUrl = `https://${domain}`;
      console.log('🔄 Redirecting to:', targetUrl);
      await chrome.tabs.update(this.currentTab, { url: targetUrl });
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

  getDatesRange(period) {
    const dates = [];
    const today = new Date();
    
    for (let i = period - 1; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(today.getDate() - i);
      dates.push(date.toDateString());
    }
    
    return dates;
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

  async forceSyncAllAnalyticsData() {
    try {
      const { timeTrackingData, extensionToken } = await chrome.storage.local.get(['timeTrackingData', 'extensionToken']);
      
      if (!extensionToken) {
        console.log('No extension token, cannot sync data');
        return;
      }

      if (!timeTrackingData) {
        console.log('No local analytics data to sync');
        return;
      }

      console.log('🔄 Force syncing all analytics data:', timeTrackingData);

      // Sync all data
      for (const domain in timeTrackingData) {
        const domainData = timeTrackingData[domain];
        
        for (const date in domainData) {
          const timeSpent = domainData[date];
          
          if (timeSpent > 0) {
            console.log(`Syncing ${domain} - ${date}: ${timeSpent}ms`);
            
            try {
              const response = await fetch('http://localhost:3000/api/analytics', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${extensionToken}`
                },
                body: JSON.stringify({
                  domain: domain,
                  timeSpent: timeSpent,
                  date: date,
                  hour: new Date().getHours(),
                  timestamp: new Date().toISOString(),
                  sessionId: this.generateSessionId(),
                  url: domain
                })
              });

              if (response.ok) {
                console.log(`✅ Synced ${domain} for ${date}`);
              } else {
                console.error(`❌ Failed to sync ${domain} for ${date}:`, response.status);
              }
            } catch (error) {
              console.error(`❌ Error syncing ${domain} for ${date}:`, error);
            }
          }
        }
      }

      console.log('🎉 Force sync completed');
    } catch (error) {
      console.error('❌ Error in force sync:', error);
    }
  }
}

// Initialize the background service
new BackgroundService(); 