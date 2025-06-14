# FocusGuard Extension Testing Steps

## Critical Fix Applied
I found and fixed a critical issue: The manifest.json had `"type": "module"` which was preventing the background script from loading. This has been removed.

## Step-by-Step Testing Instructions

### Step 1: Reload the Extension
1. Open Chrome and go to `chrome://extensions/`
2. Find "FocusGuard - Website Blocker & Time Manager"
3. Click the **reload/refresh button** (circular arrow icon)
4. Ensure the extension shows as "Enabled"

### Step 2: Check Background Script
1. In `chrome://extensions/`, click **"Inspect views: background page"** under FocusGuard
2. This opens the background script console
3. You should see logs like:
   ```
   FocusGuard Background Script Loading...
   Creating SimpleFocusGuard instance...
   Initializing SimpleFocusGuard...
   SimpleFocusGuard initialized
   ```
4. If you see errors, note them down

### Step 3: Test with Test Page (Optional)
1. Open a new tab
2. Navigate to: `chrome-extension://[EXTENSION-ID]/test.html`
   - Replace `[EXTENSION-ID]` with your actual extension ID from chrome://extensions/
3. Click "Check Status" to verify extension is working
4. Click "Add Test Site (youtube.com)" to add YouTube as protected
5. Check the logs for any errors

### Step 4: Add YouTube Manually via Popup
1. Click the FocusGuard extension icon in the toolbar
2. Go to the "Add" tab
3. Enter: `youtube.com` (no https://, no www.)
4. Set a password: `test123`
5. Click "Add Protected Site"
6. You should see a success message

### Step 5: Test the Password Popup
1. Open a new tab
2. Navigate to: `https://youtube.com`
3. **The password popup should appear immediately**
4. Enter password: `test123`
5. Click "Unlock"
6. YouTube should load normally

### Step 6: Check Console Logs
If the popup doesn't appear, check these consoles:

**Background Script Console:**
- Go to `chrome://extensions/` → "Inspect views: background page"
- Look for logs like:
  ```
  Tab updated: https://youtube.com/
  Checking tab: [ID] https://youtube.com/
  Extracted domain: youtube.com
  Protected sites: [array with youtube.com]
  Found protected site: {domain: "youtube.com", ...}
  Site needs password protection, blocking...
  Blocking site: [ID] youtube.com
  Script injection completed
  ```

**Page Console (YouTube tab):**
- Press F12 on the YouTube tab
- Look for logs like:
  ```
  Injecting overlay for domain: youtube.com
  Overlay injected successfully
  ```

### Step 7: Troubleshooting Common Issues

#### Issue: No background script logs
**Solution:** The service worker might be inactive
- Go to `chrome://extensions/`
- Look for "Inspect views: background page" - if not visible, the worker is inactive
- Try navigating to any website to wake it up
- If still not working, reload the extension

#### Issue: "Cannot access contents of the page" error
**Solution:** Permission issue
- Check that manifest.json has `"host_permissions": ["<all_urls>"]`
- Reload the extension
- Try on a different website

#### Issue: Popup appears but disappears quickly
**Solution:** JavaScript error in injected script
- Check the page console (F12) for errors
- Look for any conflicts with website's JavaScript

#### Issue: Domain not matching
**Solution:** Check domain format
- Use exact domain: `youtube.com` not `www.youtube.com` or `https://youtube.com`
- Check background console for "Domain match" logs

### Step 8: Test Different Scenarios

1. **Test with www prefix:**
   - Add site as `youtube.com`
   - Visit `https://www.youtube.com`
   - Should still work

2. **Test password verification:**
   - Enter wrong password first
   - Should show error or stay on popup
   - Enter correct password
   - Should unlock and load page

3. **Test multiple sites:**
   - Add `facebook.com` with different password
   - Test both sites work independently

### Step 9: If Still Not Working

1. **Check Extension ID:**
   - Go to `chrome://extensions/`
   - Note the extension ID (long string under the name)
   - Ensure you're testing with the correct extension

2. **Try Incognito Mode:**
   - Enable extension in incognito mode
   - Test there to rule out conflicts

3. **Check Chrome Version:**
   - Ensure you're using Chrome 88+ for Manifest V3 support

4. **Reset Extension:**
   - Remove and re-add the extension
   - Load unpacked from the `my-app/public` folder

### Expected Working Flow:
1. User navigates to protected site
2. Background script detects tab change
3. Checks if domain is protected
4. Injects password overlay
5. User enters password
6. Background verifies password
7. If correct, reloads page without overlay

## Debug Commands

Open extension popup, right-click → Inspect, then run in console:

```javascript
// Check storage
chrome.storage.local.get(['protectedSites'], (result) => {
  console.log('Protected sites:', result.protectedSites);
});

// Test message to background
chrome.runtime.sendMessage({action: 'test'}, (response) => {
  console.log('Background response:', response);
});
```

If you follow these steps and still have issues, please share:
1. Any error messages from the consoles
2. The exact steps you took
3. What you expected vs what happened 