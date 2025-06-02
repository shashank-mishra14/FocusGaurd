// Content Script for FocusGuard Extension
// This script runs on all web pages and handles communication with the background script

(function() {
  'use strict';

  // Prevent multiple injections
  if (window.focusGuardInjected) {
    return;
  }
  window.focusGuardInjected = true;

  // Listen for messages from the background script
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'showBlockOverlay') {
      showBlockOverlay(request.reason, request.domain);
      sendResponse({ success: true });
    }
    return true;
  });

  // Function to show block overlay (can be called directly by background script injection)
  function showBlockOverlay(reason, domain) {
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
            // Password correct, page will reload
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
        document.body.appendChild(overlay);
      });
    }
  }

  // Function to remove overlay (can be called from background script)
  function removeBlockOverlay() {
    const overlay = document.getElementById('focusguard-overlay');
    if (overlay) {
      overlay.remove();
    }
  }

  // Make functions available globally for background script injection
  window.focusGuardShowOverlay = showBlockOverlay;
  window.focusGuardRemoveOverlay = removeBlockOverlay;

})(); 