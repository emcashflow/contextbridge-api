# ContextBridge Deployment - Render + Supabase

## 🎯 Architecture

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Render    │────▶│   Express   │────▶│  Supabase   │
│  (Free Tier)│     │    API      │     │ PostgreSQL  │
│  512MB RAM  │     │  (Node.js)  │     │  (500MB)    │
└─────────────┘     └─────────────┘     └─────────────┘
       ▲                                         │
       └─────────────────────────────────────────┘
                    API calls
```

**Why this works:**
- ✅ Render free tier = 750 hours/month (runs 24/7)
- ✅ Supabase free = 500MB database (plenty for memories)
- ✅ No credit card required
- ✅ No time limits

---

## 🚀 Step-by-Step Deploy

### Step 1: Create Supabase Database

1. Go to https://supabase.com
2. Sign up (free, no credit card)
3. Click "New Project"
4. Name: `contextbridge`
5. Choose region closest to you
6. **Important:** Save the password they generate!
7. Wait for database to be ready (~2 min)

8. Get your database URL:
   - Go to Project Settings → Database
   - Copy "Connection string" → "URI"
   - It looks like: `postgresql://postgres:[PASSWORD]@db.xxx.supabase.co:5432/postgres`

### Step 2: Deploy to Render

1. Go to https://dashboard.render.com
2. Sign up with GitHub
3. Click "New" → "Web Service"
4. Connect your GitHub repo `contextbridge`
5. Configure:
   - **Name:** `contextbridge-api`
   - **Root Directory:** `api`
   - **Runtime:** Node
   - **Build Command:** `npm install && npm run build`
   - **Start Command:** `npm start`

6. Add Environment Variables:
   ```
   DATABASE_URL=postgresql://postgres:[PASSWORD]@db.xxx.supabase.co:5432/postgres
   NODE_ENV=production
   CORS_ORIGIN=*
   ```

7. Click "Create Web Service"

### Step 3: Run Database Migrations

Once deployed, open Render's "Shell" tab and run:
```bash
npm run db:migrate
```

### Step 4: Test

Your API will be at: `https://contextbridge-api.onrender.com`

Test it:
```bash
curl https://contextbridge-api.onrender.com/health
```

Should return: `{"status":"ok"}`

---

## 🔧 Alternative: Render PostgreSQL (Paid)

If you want everything on Render:
1. Create PostgreSQL database on Render ($7/mo)
2. Use that DATABASE_URL instead
3. Everything stays in one place

But Supabase free is better for MVP.

---

## 📋 Post-Deploy Checklist

- [ ] API health check passes
- [ ] Database migrations ran successfully
- [ ] Signup endpoint works: `POST /auth/signup`
- [ ] Update landing page with your Render URL
- [ ] Test full flow: signup → remember → recall

---

## ⚠️ Render Free Tier Limits

| Resource | Limit | ContextBridge Usage |
|----------|-------|---------------------|
| Hours | 750/mo | ~720/mo (24/7) ✅ |
| RAM | 512MB | ~100MB ✅ |
| CPU | Shared | Low usage ✅ |
| Disk | Ephemeral | No persistent files ✅ |

**Your app will sleep after 15 min of inactivity**, then wake up on next request (cold start ~30 seconds).

To keep it awake: Set up a free ping service like UptimeRobot or Pingdom.

---

## 🆘 Troubleshooting

**"Cannot connect to database"**
- Check DATABASE_URL is correct
- Ensure Supabase project is active
- Try connecting with psql locally

**"Build failed"**
- Check Node version (we use 20)
- Check `npm run build` works locally

**"Migrations failed"**
- Check database user has CREATE permissions
- Run `npm run db:generate` first if needed

---

Ready to deploy? Start with Step 1 (Supabase) above!