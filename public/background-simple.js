// Simplified Background Service Worker for Testing
console.log('FocusGuard Background Script Loading...');

class SimpleFocusGuard {
  constructor() {
    this.currentTab = null;
    this.init();
  }

  init() {
    console.log('Initializing SimpleFocusGuard...');
    
    // Initialize storage
    chrome.runtime.onInstalled.addListener(async () => {
      console.log('Extension installed, initializing storage...');
      const result = await chrome.storage.local.get(['protectedSites']);
      if (!result.protectedSites) {
        await chrome.storage.local.set({ protectedSites: [] });
        console.log('Storage initialized');
      }
    });

    // Listen for tab changes
    chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
      if (changeInfo.status === 'complete' && tab.url) {
        console.log('Tab updated:', tab.url);
        await this.checkTab(tabId, tab.url);
      }
    });

    chrome.tabs.onActivated.addListener(async (activeInfo) => {
      console.log('Tab activated:', activeInfo.tabId);
      const tab = await chrome.tabs.get(activeInfo.tabId);
      if (tab.url) {
        await this.checkTab(activeInfo.tabId, tab.url);
      }
    });

    // Handle messages
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      console.log('Message received:', request);
      this.handleMessage(request, sender, sendResponse);
      return true;
    });
  }

  async checkTab(tabId, url) {
    console.log('Checking tab:', tabId, url);
    
    if (!url || url.startsWith('chrome://') || url.startsWith('chrome-extension://')) {
      console.log('Skipping system URL');
      return;
    }

    const domain = this.extractDomain(url);
    console.log('Extracted domain:', domain);

    // Get protected sites
    const { protectedSites } = await chrome.storage.local.get(['protectedSites']);
    console.log('Protected sites:', protectedSites);

    const protectedSite = protectedSites?.find(site => this.matchDomain(domain, site.domain));
    console.log('Found protected site:', protectedSite);

    if (protectedSite && protectedSite.password) {
      // Check if session is still valid
      if (protectedSite.lastAccess && this.isSessionValid(protectedSite.lastAccess)) {
        console.log('Valid session found, allowing access');
        return;
      }
      
      console.log('Site needs password protection, blocking...');
      await this.blockSite(tabId, protectedSite.domain);
    }
  }

  async blockSite(tabId, domain) {
    console.log('Blocking site:', tabId, domain);
    
    try {
      // Simple approach: inject the overlay directly
      await chrome.scripting.executeScript({
        target: { tabId },
        func: (domain) => {
          console.log('Injecting overlay for domain:', domain);
          
          // Remove existing overlay
          const existing = document.getElementById('focusguard-test-overlay');
          if (existing) existing.remove();
          
          // Prevent all events on the page
          const preventEvents = (e) => {
            e.preventDefault();
            e.stopPropagation();
            e.stopImmediatePropagation();
            return false;
          };
          
          // Add event listeners to capture all input
          document.addEventListener('keydown', preventEvents, true);
          document.addEventListener('keyup', preventEvents, true);
          document.addEventListener('keypress', preventEvents, true);
          document.addEventListener('input', preventEvents, true);
          document.addEventListener('click', preventEvents, true);
          
          // Create overlay
          const overlay = document.createElement('div');
          overlay.id = 'focusguard-test-overlay';
          overlay.style.cssText = `
            position: fixed !important;
            top: 0 !important;
            left: 0 !important;
            width: 100vw !important;
            height: 100vh !important;
            background: rgba(102, 126, 234, 0.95) !important;
            z-index: 2147483647 !important;
            display: flex !important;
            justify-content: center !important;
            align-items: center !important;
            font-family: Arial, sans-serif !important;
          `;
          
          // Capture all events on overlay to prevent bubbling
          overlay.addEventListener('keydown', (e) => e.stopPropagation());
          overlay.addEventListener('keyup', (e) => e.stopPropagation());
          overlay.addEventListener('keypress', (e) => e.stopPropagation());
          overlay.addEventListener('input', (e) => e.stopPropagation());
          overlay.addEventListener('click', (e) => e.stopPropagation());
          
          const content = document.createElement('div');
          content.style.cssText = `
            background: white !important;
            padding: 30px !important;
            border-radius: 15px !important;
            text-align: center !important;
            box-shadow: 0 10px 30px rgba(0,0,0,0.3) !important;
            max-width: 400px !important;
            width: 90% !important;
          `;
          
          content.innerHTML = `
            <h2 style="margin: 0 0 15px 0 !important; color: #333 !important;">🔒 Site Protected</h2>
            <p style="margin: 0 0 20px 0 !important; color: #666 !important;">Enter password for ${domain}</p>
            <input type="password" id="fg-password" placeholder="Password" style="
              width: 100% !important;
              padding: 10px !important;
              border: 2px solid #ddd !important;
              border-radius: 5px !important;
              margin-bottom: 15px !important;
              box-sizing: border-box !important;
              font-size: 16px !important;
            ">
            <div>
              <button id="fg-unlock" style="
                background: #667eea !important;
                color: white !important;
                border: none !important;
                padding: 10px 20px !important;
                border-radius: 5px !important;
                cursor: pointer !important;
                margin-right: 10px !important;
              ">Unlock</button>
              <button id="fg-cancel" style="
                background: #ccc !important;
                color: #333 !important;
                border: none !important;
                padding: 10px 20px !important;
                border-radius: 5px !important;
                cursor: pointer !important;
              ">Cancel</button>
            </div>
          `;
          
          overlay.appendChild(content);
          document.body.appendChild(overlay);
          
          // Function to remove overlay and cleanup
          const removeOverlay = () => {
            const overlay = document.getElementById('focusguard-test-overlay');
            if (overlay) {
              overlay.remove();
            }
            // Remove event listeners
            document.removeEventListener('keydown', preventEvents, true);
            document.removeEventListener('keyup', preventEvents, true);
            document.removeEventListener('keypress', preventEvents, true);
            document.removeEventListener('input', preventEvents, true);
            document.removeEventListener('click', preventEvents, true);
          };
          
          // Add event listeners
          const passwordInput = document.getElementById('fg-password');
          const unlockBtn = document.getElementById('fg-unlock');
          const cancelBtn = document.getElementById('fg-cancel');
          
          const handleUnlock = () => {
            const password = passwordInput.value.trim();
            if (!password) {
              passwordInput.focus();
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
                unlockBtn.textContent = '✓ Success!';
                removeOverlay();
              } else {
                unlockBtn.disabled = false;
                unlockBtn.textContent = 'Unlock';
                passwordInput.value = '';
                passwordInput.style.borderColor = '#ff4444 !important';
                passwordInput.placeholder = 'Incorrect password';
                setTimeout(() => {
                  passwordInput.style.borderColor = '#ddd !important';
                  passwordInput.placeholder = 'Password';
                  passwordInput.focus();
                }, 2000);
              }
            });
          };
          
          unlockBtn.onclick = handleUnlock;
          
          cancelBtn.onclick = () => {
            removeOverlay();
            window.history.back();
          };
          
          // Handle Enter key in password field
          passwordInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              handleUnlock();
            }
          });
          
          // Focus password input with a delay
          setTimeout(() => {
            passwordInput.focus();
            passwordInput.select();
          }, 100);
          
          console.log('Overlay injected successfully');
        },
        args: [domain]
      });
      
      console.log('Script injection completed');
    } catch (error) {
      console.error('Error injecting script:', error);
    }
  }

  async handleMessage(request, sender, sendResponse) {
    console.log('Handling message:', request.action);
    
    try {
      switch (request.action) {
        case 'addProtectedSite':
          await this.addSite(request.data);
          sendResponse({ success: true });
          break;
          
        case 'verifyPassword':
          const isValid = await this.verifyPassword(request.domain, request.password);
          if (isValid) {
            console.log('Password correct, updating session and reloading tab');
            await this.updateLastAccess(request.domain);
            if (sender.tab) {
              chrome.tabs.reload(sender.tab.id);
            }
            sendResponse({ success: true });
          } else {
            console.log('Password incorrect');
            sendResponse({ success: false, error: 'Invalid password' });
          }
          break;
          
        case 'removeProtectedSite':
          await this.removeProtectedSite(request.domain);
          sendResponse({ success: true });
          break;
          
        case 'getProtectedSites':
          const { protectedSites } = await chrome.storage.local.get(['protectedSites']);
          sendResponse({ success: true, data: protectedSites || [] });
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

  async addSite(siteData) {
    console.log('Adding site:', siteData);
    
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
    console.log('Site added successfully');
  }

  async removeProtectedSite(domain) {
    console.log('Removing site:', domain);
    
    const { protectedSites } = await chrome.storage.local.get(['protectedSites']);
    const sites = protectedSites || [];
    const updatedSites = sites.filter(site => site.domain !== domain);
    
    await chrome.storage.local.set({ protectedSites: updatedSites });
    console.log('Site removed successfully');
  }

  async verifyPassword(domain, password) {
    console.log('Verifying password for:', domain);
    
    const { protectedSites } = await chrome.storage.local.get(['protectedSites']);
    const site = protectedSites?.find(s => s.domain === domain);
    
    if (!site || !site.password) {
      console.log('Site not found or no password set');
      return false;
    }
    
    const hashedInput = await this.hashPassword(password);
    const isValid = hashedInput === site.password;
    console.log('Password verification result:', isValid);
    return isValid;
  }

  extractDomain(url) {
    try {
      return new URL(url).hostname;
    } catch {
      return '';
    }
  }

  matchDomain(currentDomain, protectedDomain) {
    const clean1 = currentDomain.replace(/^www\./, '');
    const clean2 = protectedDomain.replace(/^www\./, '');
    const matches = clean1 === clean2;
    console.log('Domain match:', clean1, '===', clean2, '?', matches);
    return matches;
  }

  async updateLastAccess(domain) {
    console.log('Updating last access for domain:', domain);
    const { protectedSites } = await chrome.storage.local.get(['protectedSites']);
    const sites = protectedSites || [];
    
    const siteIndex = sites.findIndex(s => s.domain === domain);
    if (siteIndex !== -1) {
      sites[siteIndex].lastAccess = Date.now();
      await chrome.storage.local.set({ protectedSites: sites });
      console.log('Last access updated successfully');
    }
  }

  isSessionValid(lastAccess, sessionDuration = 30 * 60 * 1000) {
    const isValid = Date.now() - lastAccess <= sessionDuration;
    console.log('Session validation:', { lastAccess, now: Date.now(), isValid });
    return isValid;
  }

  async hashPassword(password) {
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  async getAnalytics(period = 7) {
    const { timeTrackingData } = await chrome.storage.local.get(['timeTrackingData']);
    const data = timeTrackingData || {};
    
    return this.calculateAnalytics(data, period);
  }

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
}

// Initialize
console.log('Creating SimpleFocusGuard instance...');
new SimpleFocusGuard();
console.log('SimpleFocusGuard initialized'); 