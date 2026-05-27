# ContextBridge Deployment Guide

## 🚀 Quick Deploy to Railway (Recommended)

### Step 1: Create GitHub Repo
1. Go to https://github.com/new
2. Name: `contextbridge`
3. Make it Public
4. Don't initialize with README (we have one)
5. Create repository

### Step 2: Push Code
```bash
cd ~/Desktop/contextbridge
git remote add origin https://github.com/YOUR_USERNAME/contextbridge.git
git branch -M main
git push -u origin main
```

### Step 3: Deploy to Railway
1. Go to https://railway.app/new
2. Click "Deploy from GitHub repo"
3. Select your `contextbridge` repo
4. Railway will auto-detect the Node.js app
5. Click "Add PostgreSQL" to create a database
6. Railway auto-sets `DATABASE_URL`
7. Click Deploy

**Your API will be live at:** `https://contextbridge-production.up.railway.app`

---

## 🛠️ Alternative: Deploy to Render

### Step 1: Create Web Service
1. Go to https://dashboard.render.com/new/web
2. Connect your GitHub repo
3. Settings:
   - **Name:** contextbridge-api
   - **Root Directory:** `api`
   - **Build Command:** `npm install && npm run build`
   - **Start Command:** `npm run db:migrate && npm start`

### Step 2: Create PostgreSQL Database
1. Go to https://dashboard.render.com/new/database
2. Name: contextbridge-db
3. Copy the "Internal Database URL"

### Step 3: Set Environment Variables
In your Web Service settings, add:
- `DATABASE_URL` = (paste from step 2)
- `NODE_ENV` = `production`

---

## 📋 Post-Deployment Checklist

- [ ] API health check: `GET https://your-api.com/health`
- [ ] Create test account: `POST /auth/signup`
- [ ] Test remember: `POST /memories/remember`
- [ ] Test recall: `GET /memories/recall`
- [ ] Update landing page with real API URL
- [ ] Set up custom domain (optional)

---

## 🔧 Local Development

```bash
cd ~/Desktop/contextbridge/api

# Install dependencies
npm install

# Set up local PostgreSQL (or use Railway's)
cp .env.example .env
# Edit .env with your DATABASE_URL

# Run migrations
npm run db:migrate

# Start dev server
npm run dev
```

API will be at: http://localhost:3000

---

## 📝 Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `PORT` | No | Server port (default: 3000) |
| `CORS_ORIGIN` | No | Allowed origins (default: *) |
| `NODE_ENV` | No | production/development |

---

## 🐛 Troubleshooting

### Database connection errors
- Check `DATABASE_URL` is set correctly
- Ensure PostgreSQL is running
- For Railway: Use the provided `DATABASE_URL`

### Migration errors
- Run `npm run db:generate` first
- Check database user has CREATE TABLE permissions

### CORS errors
- Set `CORS_ORIGIN` to your frontend domain
- Or use `*` for development

---

## 🎯 Next Steps After Deploy

1. **Update Landing Page** - Change API URLs to your deployed endpoint
2. **Publish SDK** - `npm publish` in the `/sdk` folder
3. **Add Monitoring** - Sentry, LogRocket, etc.
4. **Set up Stripe** - For paid plans
5. **Custom Domain** - `api.contextbridge.io`

---

**Need help?** Open an issue on GitHub or email support@contextbridge.io