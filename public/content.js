// Content Script for FocusGuard Extension
// This script runs on all web pages and handles communication with the background script

(function() {
  'use strict';

  // Prevent multiple injections
  if (window.focusGuardInjected) {
    console.log('🚫 FocusGuard already injected, skipping...');
    return;
  }
  window.focusGuardInjected = true;
  console.log('✅ FocusGuard content script loaded on:', window.location.href);

  // Listen for messages from the background script
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    console.log('📨 Content script received message:', request);
    
    if (request.action === 'showBlockOverlay') {
      console.log('🎭 Showing block overlay:', { reason: request.reason, domain: request.domain });
      showBlockOverlay(request.reason, request.domain);
      sendResponse({ success: true });
    } else {
      console.log('❓ Unknown message action:', request.action);
      sendResponse({ success: false, message: 'Unknown action' });
    }
    return true;
  });

  // Function to show block overlay (can be called directly by background script injection)
  function showBlockOverlay(reason, domain) {
    console.log('🎯 Content script showBlockOverlay called:', { reason, domain, reasonType: typeof reason });
    
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
    
    console.log('🔍 Checking reason condition:', { 
      reason, 
      isPasswordRequired: reason === 'PASSWORD_REQUIRED',
      isTimeLimit: reason === 'TIME_LIMIT_EXCEEDED'
    });
    
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
      
      console.log('🎨 Password UI HTML set');
      
      // Set up event handlers after DOM update
      setTimeout(() => {
        console.log('🔧 Setting up password overlay event handlers...');
        
        const passwordInput = content.querySelector('#focusguard-password');
        const unlockBtn = content.querySelector('#focusguard-unlock');
        const cancelBtn = content.querySelector('#focusguard-cancel');
        const errorDiv = content.querySelector('#focusguard-error');
        
        console.log('🔍 Password elements found:', {
          passwordInput: !!passwordInput,
          unlockBtn: !!unlockBtn,
          cancelBtn: !!cancelBtn,
          errorDiv: !!errorDiv
        });
        
        if (unlockBtn && passwordInput) {
          unlockBtn.onclick = () => {
            console.log('🔓 Password unlock button clicked');
            const password = passwordInput.value;
            if (!password) {
              showError('Please enter a password');
              return;
            }
            
            unlockBtn.disabled = true;
            unlockBtn.textContent = 'Verifying...';
            
            console.log('📤 Sending password verification message');
            chrome.runtime.sendMessage({
              action: 'verifyPassword',
              domain: domain,
              password: password
            }, (response) => {
              console.log('📥 Password verification response:', response);
              if (response && response.success) {
                showSuccess('Access granted! Reloading...');
                setTimeout(() => window.location.reload(), 1000);
              } else {
                showError('Invalid password. Please try again.');
                unlockBtn.disabled = false;
                unlockBtn.textContent = 'Unlock';
                passwordInput.value = '';
                passwordInput.focus();
              }
            });
          };
        }
        
        if (cancelBtn) {
          cancelBtn.onclick = () => {
            console.log('❌ Password cancel button clicked');
            window.history.back();
          };
        }
        
        if (passwordInput) {
          passwordInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && unlockBtn) {
              unlockBtn.click();
            }
          });
          
          // Focus password input
          setTimeout(() => passwordInput.focus(), 100);
        }
        
        function showError(message) {
          console.log('❌ Showing password error:', message);
          if (errorDiv) {
            errorDiv.textContent = message;
            errorDiv.style.display = 'block';
          }
          if (passwordInput) {
            passwordInput.style.borderColor = '#ff4444';
          }
        }
        
        function showSuccess(message) {
          console.log('✅ Showing password success:', message);
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
            console.log('🔙 Time limit close button clicked');
            window.history.back();
          };
        }
      }, 100);
      
    } else {
      console.log('❓ Unknown reason, creating generic overlay for reason:', reason);
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
    
    // Ensure overlay is added to the document
    console.log('📝 Adding overlay to document...');
    if (document.body) {
      document.body.appendChild(overlay);
      console.log('✅ Overlay added to body');
    } else {
      // If body not ready, wait for it
      document.addEventListener('DOMContentLoaded', () => {
        if (document.body) {
          document.body.appendChild(overlay);
          console.log('✅ Overlay added to body after DOMContentLoaded');
        }
      });
    }
    
    // Verify overlay was added
    setTimeout(() => {
      const addedOverlay = document.getElementById('focusguard-overlay');
      console.log('🔍 Final overlay verification:', {
        exists: !!addedOverlay,
        visible: addedOverlay ? window.getComputedStyle(addedOverlay).display : 'N/A',
        zIndex: addedOverlay ? window.getComputedStyle(addedOverlay).zIndex : 'N/A',
        hasContent: addedOverlay ? addedOverlay.innerHTML.length > 0 : false,
        contentPreview: addedOverlay ? addedOverlay.innerHTML.substring(0, 100) + '...' : 'N/A'
      });
    }, 200);
  }

  // Function to remove overlay (can be called from background script)
  function removeBlockOverlay() {
    console.log('🗑️ Removing block overlay');
    const overlay = document.getElementById('focusguard-overlay');
    if (overlay) {
      overlay.remove();
      console.log('✅ Block overlay removed');
    } else {
      console.log('❌ No overlay found to remove');
    }
  }

  // Make functions available globally for background script injection
  window.focusGuardShowOverlay = showBlockOverlay;
  window.focusGuardRemoveOverlay = removeBlockOverlay;
  
  console.log('🌟 FocusGuard content script fully initialized');

})(); 