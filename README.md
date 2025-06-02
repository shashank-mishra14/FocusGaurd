# FocusGuard - Website Blocker & Time Manager

A secure, robust browser extension that allows users to password-protect websites, set time limits, and track usage with detailed analytics.

## 🚀 Features

- **Password Protection**: Secure websites with hashed passwords
- **Time Limits**: Set daily time limits for specific sites
- **Real-time Blocking**: Instant blocking when limits are reached
- **Analytics Dashboard**: Detailed time tracking and usage statistics
- **Import/Export**: Backup and restore settings
- **Secure Storage**: Local encrypted storage with SHA-256 hashing
- **Beautiful UI**: Modern Next.js interface with Tailwind CSS

## 📁 Project Structure

```
my-app/
├── public/                          # Chrome Extension Files
│   ├── manifest.json               # Extension manifest (v3)
│   ├── background.js               # Background service worker
│   ├── content.js                  # Content script
│   ├── options.html                # Options page
│   ├── options.js                  # Options page script
│   ├── rules.json                  # Declarative net request rules
│   └── icons/                      # Extension icons (16, 32, 48, 128px)
├── app/                            # Next.js App Router
│   ├── extension-popup/            # Extension popup page
│   ├── dashboard/                  # Analytics dashboard
│   └── page.tsx                    # Main landing page
├── components/                     # React Components
│   ├── extension-popup.tsx         # Main popup component
│   └── ui/                         # Shadcn/ui components
├── lib/                            # Utilities
│   └── extension/                  # Extension utilities
│       ├── types.ts                # TypeScript interfaces
│       ├── utils.ts                # Utility functions
│       └── chrome-types.d.ts       # Chrome API types
└── ...
```

## 🛠️ Tech Stack

- **Frontend**: Next.js 15, React 19, TypeScript
- **UI Components**: Shadcn/ui, Tailwind CSS, Lucide React
- **Charts**: Recharts
- **Extension**: Chrome Extension Manifest V3
- **Security**: Web Crypto API (SHA-256 hashing)
- **Storage**: Chrome Storage API

## 📋 Current Status

### ✅ Completed
- ✅ Extension manifest and structure
- ✅ Background service worker with core functionality
- ✅ Content script for site blocking overlays
- ✅ TypeScript interfaces and utility functions
- ✅ Options page for settings management
- ✅ Next.js popup component with Chrome API integration
- ✅ Secure password hashing with Web Crypto API
- ✅ Time tracking and analytics foundation
- ✅ Import/export functionality

### 🚧 Next Steps Required

#### 1. **Create Extension Icons** (High Priority)
```bash
# Create these files in public/icons/
icon16.png   # 16x16 pixels
icon32.png   # 32x32 pixels  
icon48.png   # 48x48 pixels
icon128.png  # 128x128 pixels
```

**Recommendations:**
- Use a shield or lock symbol with brand colors (#667eea, #764ba2)
- Try [Favicon.io](https://www.favicon.io/) for quick generation
- Ensure good visibility at small sizes

#### 2. **Build Extension Package**
```bash
# Create extension build
npm run build:extension
```

#### 3. **Test Extension**
1. Open Chrome and go to `chrome://extensions/`
2. Enable "Developer mode"
3. Click "Load unpacked"
4. Select the `my-app/public` folder
5. Test all functionality:
   - Site blocking
   - Password protection
   - Time limits
   - Analytics dashboard
   - Options page

#### 4. **Analytics Dashboard Integration**
- Complete the analytics dashboard component
- Integrate Chart.js or update Recharts implementation
- Connect to the extension's time tracking data

#### 5. **Advanced Features (Optional)**
- Session management improvements
- Better error handling
- Cross-browser compatibility testing
- Advanced analytics views
- Export to different formats

## 🔧 Development Setup

1. **Install dependencies:**
```bash
npm install
```

2. **Start development server:**
```bash
npm run dev
```

3. **View components:**
- Main app: http://localhost:3000
- Extension popup: http://localhost:3000/extension-popup
- Dashboard: http://localhost:3000/dashboard

## 🛡️ Security Features

### Password Security
- Passwords are hashed using SHA-256 before storage
- No plain text passwords stored anywhere
- Session-based access with configurable timeout

### Storage Security
- All data stored locally using Chrome Storage API
- No external servers or data transmission
- User has full control over their data

### Content Security
- Content scripts use unique IDs to prevent conflicts
- High z-index overlays to prevent bypassing
- Secure message passing between components

## 📦 Extension Loading

### For Development:
1. Build the extension files (if needed)
2. Open Chrome → `chrome://extensions/`
3. Enable "Developer mode" (top right)
4. Click "Load unpacked"
5. Select the `my-app/public` directory

### For Production:
1. Create production build
2. Package as .zip file
3. Submit to Chrome Web Store

## 🔍 Troubleshooting

### Common Issues:

1. **Chrome API errors in development:**
   - Extension APIs only work when loaded as an extension
   - Use the demo mode for component development

2. **TypeScript errors:**
   - Chrome types are installed via `@types/chrome`
   - Some APIs may need manual type declarations

3. **Build issues:**
   - Ensure all dependencies are installed
   - Check that public folder has all required files

## 📚 API Reference

### Background Script Messages:
- `addProtectedSite` - Add a new protected site
- `removeProtectedSite` - Remove a protected site
- `verifyPassword` - Verify site password
- `getAnalytics` - Get time tracking data

### Storage Schema:
```typescript
{
  protectedSites: ProtectedSite[],
  timeTrackingData: {
    [domain: string]: {
      [date: string]: number // milliseconds
    }
  }
}
```

## 📝 Contributing

1. Follow the existing code structure
2. Use TypeScript for all new files
3. Test in actual Chrome extension environment
4. Update this README with any changes

## 📄 License

This project is for educational/personal use. Please review Chrome Web Store policies before publishing.

---

**Ready for the next phase!** The core extension functionality is implemented and ready for testing. The main remaining task is creating the icons and loading the extension in Chrome for testing.
