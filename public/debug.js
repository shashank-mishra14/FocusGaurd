// Debug script for FocusGuard Extension
// This script helps test and debug the extension functionality

console.log('FocusGuard Debug Script Loaded');

// Function to check extension status
async function checkExtensionStatus() {
  console.log('=== FocusGuard Extension Status ===');
  
  try {
    // Check storage
    const storage = await chrome.storage.local.get(['protectedSites', 'timeTrackingData']);
    console.log('Storage data:', storage);
    
    // Check current tab
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    const currentTab = tabs[0];
    console.log('Current tab:', currentTab);
    
    if (currentTab && currentTab.url) {
      const domain = new URL(currentTab.url).hostname;
      console.log('Current domain:', domain);
      
      // Check if current site is protected
      const protectedSite = storage.protectedSites?.find(site => {
        const cleanCurrent = domain.replace(/^www\./, '');
        const cleanProtected = site.domain.replace(/^www\./, '');
        return cleanCurrent === cleanProtected || 
               cleanCurrent.endsWith('.' + cleanProtected) ||
               cleanProtected.endsWith('.' + cleanCurrent);
      });
      
      console.log('Is current site protected?', !!protectedSite);
      if (protectedSite) {
        console.log('Protected site details:', protectedSite);
      }
    }
    
  } catch (error) {
    console.error('Error checking extension status:', error);
  }
}

// Function to add YouTube as a test protected site
async function addYouTubeTest() {
  console.log('Adding YouTube as protected site for testing...');
  
  try {
    const response = await chrome.runtime.sendMessage({
      action: 'addProtectedSite',
      data: {
        domain: 'youtube.com',
        password: 'test123',
        timeLimit: 30
      }
    });
    
    console.log('Add YouTube response:', response);
    
    if (response?.success) {
      console.log('YouTube added successfully! Try navigating to YouTube now.');
    } else {
      console.error('Failed to add YouTube:', response?.error);
    }
  } catch (error) {
    console.error('Error adding YouTube:', error);
  }
}

// Function to test password verification
async function testPasswordVerification() {
  console.log('Testing password verification...');
  
  try {
    const response = await chrome.runtime.sendMessage({
      action: 'verifyPassword',
      domain: 'youtube.com',
      password: 'test123'
    });
    
    console.log('Password verification response:', response);
  } catch (error) {
    console.error('Error testing password:', error);
  }
}

// Function to clear all data
async function clearAllData() {
  console.log('Clearing all extension data...');
  
  try {
    await chrome.storage.local.clear();
    await chrome.storage.local.set({
      protectedSites: [],
      timeTrackingData: {}
    });
    console.log('All data cleared!');
  } catch (error) {
    console.error('Error clearing data:', error);
  }
}

// Make functions available globally for console testing
window.focusGuardDebug = {
  checkStatus: checkExtensionStatus,
  addYouTube: addYouTubeTest,
  testPassword: testPasswordVerification,
  clearData: clearAllData
};

console.log('Debug functions available at window.focusGuardDebug');
console.log('Available functions:');
console.log('- focusGuardDebug.checkStatus() - Check extension status');
console.log('- focusGuardDebug.addYouTube() - Add YouTube as test site');
console.log('- focusGuardDebug.testPassword() - Test password verification');
console.log('- focusGuardDebug.clearData() - Clear all data');

// Auto-run status check
checkExtensionStatus();

// Debug script to help with extension testing

// Clear all extension storage
async function clearExtensionStorage() {
  try {
    await chrome.storage.local.clear();
    console.log('Extension storage cleared successfully');
    return true;
  } catch (error) {
    console.error('Error clearing storage:', error);
    return false;
  }
}

// Clear authentication only
async function clearAuth() {
  try {
    await chrome.storage.local.remove([
      'extensionToken', 
      'currentUser', 
      'lastTokenCheck', 
      'authPersistence'
    ]);
    console.log('Authentication data cleared');
    return true;
  } catch (error) {
    console.error('Error clearing auth:', error);
    return false;
  }
}

// Check current storage state
async function checkStorage() {
  try {
    const result = await chrome.storage.local.get();
    console.log('Current extension storage:', result);
    return result;
  } catch (error) {
    console.error('Error checking storage:', error);
    return null;
  }
}

// Export functions for console use
window.debugExtension = {
  clearStorage: clearExtensionStorage,
  clearAuth,
  checkStorage
};

console.log('Debug functions available: debugExtension.clearStorage(), debugExtension.clearAuth(), debugExtension.checkStorage()'); 