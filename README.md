# Protekt - Web Protection & Analytics Platform

A comprehensive web application with browser extension for tracking browsing habits and protecting against distracting websites. Features user authentication via Clerk, personal analytics dashboards, and seamless extension-to-dashboard connectivity.

## 🚀 Features

- **User Authentication**: Secure authentication powered by Clerk
- **Personal Analytics Dashboard**: Track browsing time, site visits, and productivity metrics
- **Browser Extension Integration**: Seamless connection between extension and web dashboard
- **Site Protection**: Block distracting websites with passwords and time limits
- **Real-time Data Sync**: Extension data automatically syncs to your personal dashboard
- **Session-based Access**: Access dashboard directly from extension without repeated login

## 🛠️ Tech Stack

- **Frontend**: Next.js 15, React 19, TypeScript, Tailwind CSS
- **Authentication**: Clerk
- **Database**: PostgreSQL (Neon DB)
- **ORM**: Drizzle ORM
- **UI Components**: Radix UI, Lucide Icons
- **Charts**: Recharts

## 📋 Prerequisites

- Node.js 18+ and npm
- Clerk account and application
- Neon Database account

## ⚙️ Environment Setup

Create a `.env.local` file in the root directory:

```env
# Clerk Authentication
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_d2VsY29tZS1jYWltYW4tNDAuY2xlcmsuYWNjb3VudHMuZGV2JA
CLERK_SECRET_KEY=sk_test_your_secret_key_here

# Neon Database
DATABASE_URL=postgresql://neondb_owner:npg_tGVHncAfl3J9@ep-little-bread-a88kexhn-pooler.eastus2.azure.neon.tech/neondb?sslmode=require

# Next.js
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

## 🚀 Installation & Setup

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Set up the database**:
   ```bash
   # Generate database migrations
   npm run db:generate
   
   # Push schema to database
   npm run db:push
   ```

3. **Configure Clerk**:
   - Set up your Clerk application
   - Add your publishable and secret keys to `.env.local`
   - Configure redirect URLs in Clerk dashboard

4. **Start the development server**:
   ```bash
   npm run dev
   ```

Visit `http://localhost:3000` to see the application.

## 🏗️ Architecture Overview

### User Authentication Flow

1. **Web Application**: Users sign up/sign in via Clerk authentication
2. **Database Sync**: User data automatically synced to Neon DB upon first login
3. **Session Management**: Both web dashboard and extension access use the same user account

### Extension-Dashboard Integration

1. **Extension Installation**: Users install the browser extension after creating an account
2. **Token Generation**: Extension requests a session token from the web app API
3. **Dashboard Access**: Extension can open the dashboard with pre-authenticated session
4. **Data Sync**: Analytics data flows from extension to database to dashboard

### Database Schema

- **users**: Core user information synced from Clerk
- **protected_sites**: User's blocked websites configuration
- **time_tracking**: Browsing analytics data from extension
- **user_settings**: User preferences and limits
- **extension_sessions**: Temporary tokens for extension-dashboard connectivity

## 📊 API Endpoints

### Authentication
- `GET /api/auth/user` - Get/create user data
- `PUT /api/auth/user` - Update user information

### Extension Sessions
- `POST /api/extension/session` - Generate session token for extension
- `GET /api/extension/session?token=` - Validate session token

### Protected Sites
- `GET /api/protected-sites` - Get user's protected sites
- `POST /api/protected-sites` - Add new protected site
- `DELETE /api/protected-sites?id=` - Remove protected site

### Analytics
- `GET /api/analytics?days=` - Get analytics data for dashboard
- `POST /api/analytics?token=` - Submit analytics data from extension

## 🔧 Browser Extension Integration

### Extension Setup
1. User creates account on web application
2. User clicks "Access Dashboard" in extension
3. If not authenticated, redirected to sign-in page
4. If authenticated, session token generated automatically
5. Dashboard opens with user's personal data

### Data Flow
```
Extension → API (with session token) → Database → Dashboard
```

### Extension API Usage
```javascript
// Generate session token (extension popup)
const response = await fetch('http://localhost:3000/api/extension/session', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' }
})
const { sessionToken, dashboardUrl } = await response.json()

// Open dashboard with token
chrome.tabs.create({ url: dashboardUrl })

// Submit analytics data
await fetch(`http://localhost:3000/api/analytics?token=${sessionToken}`, {
  method: 'POST',
  body: JSON.stringify({
    domain: 'example.com',
    timeSpent: 300000, // milliseconds
    visits: 5,
    date: '2024-01-15'
  })
})
```

## 🖥️ Dashboard Features

### Analytics Views
- **Overview**: Daily usage summary, focus scores, site statistics
- **Time Tracking**: Detailed time spent per site with visualizations
- **Trends**: Weekly and monthly productivity trends
- **Site Analysis**: Top sites by time, visits, and productivity impact

### Site Protection
- **Add Sites**: Protect distracting websites with optional passwords
- **Time Limits**: Set daily time limits for specific sites
- **Status Monitoring**: View blocked sites and their current status

### User Settings
- **Daily Limits**: Configure overall daily browsing limits
- **Preferences**: Customize dashboard and extension behavior
- **Extension Token**: Generate new session tokens for extension access

## 🔒 Security Features

- **Clerk Authentication**: Enterprise-grade user authentication
- **Session Tokens**: Temporary, expiring tokens for extension access
- **User Isolation**: Each user's data completely isolated
- **Secure API**: All endpoints protected with authentication
- **Input Validation**: Comprehensive validation on all user inputs

## 🚀 Deployment

### Vercel Deployment
1. Connect your GitHub repository to Vercel
2. Add environment variables in Vercel dashboard
3. Deploy automatically on push to main branch

### Environment Variables for Production
```env
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=your_production_clerk_key
CLERK_SECRET_KEY=your_production_clerk_secret
DATABASE_URL=your_production_neon_db_url
NEXT_PUBLIC_APP_URL=https://your-domain.vercel.app
```

## 📱 Extension Deployment

1. **Manifest Update**: Update extension manifest with production URLs
2. **Chrome Web Store**: Submit extension for review
3. **User Instructions**: Provide users with extension installation guide

## 🐛 Troubleshooting

### Common Issues

1. **Database Connection Error**:
   - Verify DATABASE_URL in .env.local
   - Ensure Neon DB is accessible
   - Run `npm run db:push` to sync schema

2. **Clerk Authentication Error**:
   - Check CLERK keys in .env.local
   - Verify redirect URLs in Clerk dashboard
   - Ensure middleware.ts is properly configured

3. **Extension-Dashboard Connection**:
   - Verify NEXT_PUBLIC_APP_URL is correct
   - Check CORS settings if needed
   - Ensure session token generation works

### Development Tools

```bash
# View database schema
npm run db:studio

# Reset database
npm run db:push

# View logs
npm run dev
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🆘 Support

For support, email support@protekt.app or create an issue in the GitHub repository.

---

Built with ❤️ using Next.js, Clerk, and Neon DB
