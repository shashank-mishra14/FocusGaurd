# FocusGuard Extension Troubleshooting Guide

## Password Popup Not Appearing Issue

If the password popup is not appearing when visiting protected websites like YouTube, follow these debugging steps:

### Step 1: Check Extension Installation

1. Open Chrome and go to `chrome://extensions/`
2. Ensure "Developer mode" is enabled (toggle in top right)
3. Verify FocusGuard extension is loaded and enabled
4. Check for any error messages in the extension card

### Step 2: Reload the Extension

1. In `chrome://extensions/`, click the refresh/reload button on FocusGuard
2. This reloads the background script and content scripts

### Step 3: Check Console Logs

1. **Background Script Logs:**
   - Go to `chrome://extensions/`
   - Click "Inspect views: background page" under FocusGuard
   - Check the console for error messages and debug logs

2. **Content Script Logs:**
   - Open the website where popup should appear (e.g., YouTube)
   - Press F12 to open Developer Tools
   - Check the Console tab for FocusGuard-related messages

3. **Popup Logs:**
   - Right-click the FocusGuard extension icon
   - Select "Inspect popup"
   - Check console for any errors

### Step 4: Test with Debug Functions

1. Click the FocusGuard extension icon to open popup
2. Right-click in the popup and select "Inspect"
3. In the console, run these debug commands:

```javascript
// Check extension status
focusGuardDebug.checkStatus()

// Add YouTube as test site
focusGuardDebug.addYouTube()

// Test password verification
focusGuardDebug.testPassword()

// Clear all data if needed
focusGuardDebug.clearData()
```

### Step 5: Manual Testing Steps

1. **Add a Protected Site:**
   - Open FocusGuard popup
   - Go to "Add" tab
   - Enter "youtube.com" as the website URL
   - Set a password (e.g., "test123")
   - Click "Add Protected Site"

2. **Navigate to Protected Site:**
   - Open a new tab
   - Go to https://youtube.com
   - The password popup should appear immediately

3. **Check Domain Matching:**
   - Ensure you're testing with the exact domain you added
   - "youtube.com" should match "www.youtube.com" and vice versa

### Step 6: Common Issues and Solutions

#### Issue: "Cannot access contents of the page"
**Solution:** The extension needs proper permissions. Check manifest.json has:
```json
"host_permissions": ["<all_urls>"]
```

#### Issue: Content script not injecting
**Solution:** 
1. Check if content script is registered in manifest.json
2. Reload the extension
3. Try refreshing the webpage

#### Issue: Background script not responding
**Solution:**
1. Check background script console for errors
2. Ensure service worker is active
3. Reload extension if service worker is inactive

#### Issue: Domain not matching
**Solution:**
- Check console logs for domain matching debug info
- Ensure domain is entered without protocol (no https://)
- Try both with and without "www." prefix

### Step 7: Expected Console Output

When working correctly, you should see logs like:
```
Tab activated: 123
Handling tab change for URL: https://youtube.com/
Extracted domain: youtube.com
Protected sites: [{domain: "youtube.com", password: "...", ...}]
Found protected site: {domain: "youtube.com", ...}
Site is protected, handling protection...
Site has password protection
Password required, blocking site
Blocking site: {tabId: 123, reason: "PASSWORD_REQUIRED", domain: "youtube.com"}
Overlay injected successfully
```

### Step 8: Reset and Retry

If all else fails:
1. Run `focusGuardDebug.clearData()` in popup console
2. Reload the extension
3. Add a test site again
4. Try navigating to the protected site

### Step 9: Check Permissions

Ensure the extension has these permissions in manifest.json:
- `"tabs"` - To detect tab changes
- `"storage"` - To store protected sites
- `"scripting"` - To inject blocking overlay
- `"declarativeNetRequest"` - For advanced blocking
- `"host_permissions": ["<all_urls>"]` - To access all websites

### Step 10: Timing Issues

If the popup appears briefly then disappears:
1. Check if there are multiple overlays being created
2. Look for JavaScript errors in the page console
3. Try increasing the delay in `blockSite()` function

## Additional Debug Information

### Key Files to Check:
- `background.js` - Main extension logic
- `content.js` - Page injection script
- `popup.js` - Extension popup interface
- `manifest.json` - Extension configuration

### Important Functions:
- `handleTabChange()` - Detects when user visits new pages
- `handleProtectedSite()` - Checks if site needs protection
- `blockSite()` - Injects password popup
- `matchesDomain()` - Compares current domain with protected domains

### Storage Structure:
```javascript
{
  protectedSites: [
    {
      id: "timestamp",
      domain: "youtube.com",
      password: "hashed_password",
      timeLimit: 30,
      lastAccess: timestamp,
      createdAt: timestamp
    }
  ],
  timeTrackingData: {
    "youtube.com": {
      "Mon Oct 28 2024": 1800000  // milliseconds
    }
  }
}
```

If you're still experiencing issues after following these steps, check the browser console for specific error messages and ensure all files are properly loaded. 