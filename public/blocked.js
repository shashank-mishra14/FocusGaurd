console.log('Script starting...');

// Get URL parameters
var urlParams = new URLSearchParams(window.location.search);
var reason = urlParams.get('reason');
var domain = urlParams.get('domain') || 'this site';

console.log('Reason:', reason);
console.log('Domain:', domain);

// Get content div
var content = document.getElementById('content');

if (reason === 'PASSWORD_REQUIRED') {
    console.log('Creating password UI');
    content.innerHTML = 
        '<h1>🔒 Protected Site</h1>' +
        '<p>Enter password to access <strong>' + domain + '</strong></p>' +
        '<input type="password" id="password" placeholder="Password">' +
        '<div class="button-group">' +
        '<button id="unlock-btn">Unlock</button>' +
        '<button class="secondary" id="cancel-btn">Cancel</button>' +
        '</div>' +
        '<div id="message" style="display: none;"></div>';
        
    console.log('Password UI created');
    
    // Set up event handlers
    setTimeout(function() {
        var passwordInput = document.getElementById('password');
        var unlockBtn = document.getElementById('unlock-btn');
        var cancelBtn = document.getElementById('cancel-btn');
        var messageDiv = document.getElementById('message');
        
        if (passwordInput) {
            passwordInput.focus();
            console.log('Password input focused');
        }
        
        if (unlockBtn) {
            unlockBtn.onclick = function() {
                console.log('Unlock clicked');
                var password = passwordInput.value;
                
                if (!password) {
                    showMessage('Please enter a password', 'error');
                    return;
                }
                
                unlockBtn.disabled = true;
                unlockBtn.textContent = 'Verifying...';
                
                console.log('Sending verification message');
                chrome.runtime.sendMessage({
                    action: 'verifyPassword',
                    domain: domain,
                    password: password
                }, function(response) {
                    console.log('Response:', response);
                    
                    if (response && response.success) {
                        showMessage('Access granted! Redirecting...', 'success');
                        setTimeout(function() {
                            window.location.href = 'https://' + domain;
                        }, 1000);
                    } else {
                        showMessage('Invalid password. Please try again.', 'error');
                        passwordInput.value = '';
                        passwordInput.focus();
                    }
                    
                    unlockBtn.disabled = false;
                    unlockBtn.textContent = 'Unlock';
                });
            };
        }
        
        if (cancelBtn) {
            cancelBtn.onclick = function() {
                console.log('Cancel clicked');
                window.history.back();
            };
        }
        
        if (passwordInput) {
            passwordInput.onkeypress = function(e) {
                if (e.key === 'Enter' && unlockBtn) {
                    unlockBtn.click();
                }
            };
        }
        
        function showMessage(text, type) {
            console.log('Showing message:', text, type);
            if (messageDiv) {
                messageDiv.textContent = text;
                messageDiv.className = 'message ' + type;
                messageDiv.style.display = 'block';
                
                if (type !== 'error') {
                    setTimeout(function() {
                        messageDiv.style.display = 'none';
                    }, 3000);
                }
            }
        }
        
    }, 100);
    
} else if (reason === 'TIME_LIMIT_EXCEEDED') {
    console.log('Creating time limit UI');
    content.innerHTML = 
        '<h1>⏰ Time Limit Reached</h1>' +
        '<p>You\'ve reached your daily time limit for <strong>' + domain + '</strong></p>' +
        '<p style="color: #888; font-size: 14px; margin-bottom: 30px;">Take a break and come back tomorrow!</p>' +
        '<button onclick="window.history.back()">Go Back</button>';
        
} else {
    console.log('Creating generic UI for reason:', reason);
    content.innerHTML = 
        '<h1>🚫 Site Blocked</h1>' +
        '<p>This site is currently blocked</p>' +
        '<p style="color: #888; font-size: 14px;">Reason: ' + (reason || 'Unknown') + '</p>' +
        '<button onclick="window.history.back()">Go Back</button>';
}

console.log('Script completed'); 