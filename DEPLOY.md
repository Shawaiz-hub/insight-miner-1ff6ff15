# Deployment Guide

Complete guide for deploying SmartMine with:
- **Backend**: PythonAnywhere (Python Flask)
- **Frontend**: Vercel (React + Vite)

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Backend Deployment (PythonAnywhere)](#backend-deployment-pythonanywhere)
3. [Frontend Deployment (Vercel)](#frontend-deployment-vercel)
4. [Environment Configuration](#environment-configuration)
5. [Testing the Deployment](#testing-the-deployment)
6. [Troubleshooting](#troubleshooting)

---

## Prerequisites

Before deploying, ensure you have:

- [x] GitHub account with repository containing your code
- [x] PythonAnywhere account (free tier works)
- [x] Vercel account (free tier works)
- [x] Your Supabase project URL and anon key

---

## Backend Deployment (PythonAnywhere)

### Step 1: Create PythonAnywhere Account

1. Go to [pythonanywhere.com](https://www.pythonanywhere.com)
2. Click **"Start running Python online"** or **"Create a Beginner account"**
3. Complete registration

### Step 2: Upload Your Backend Code

**Option A: Using Git (Recommended)**

1. Open a Bash console in PythonAnywhere
2. Clone your repository:
   ```bash
   git clone https://github.com/YOUR_USERNAME/YOUR_REPO.git
   cd YOUR_REPO/backend
   ```

**Option B: Manual Upload**

1. Go to **Files** tab
2. Create a directory: `myapp`
3. Upload all files from your `backend/` folder:
   - `app.py`
   - `requirements.txt`

### Step 3: Set Up Virtual Environment

In Bash console:

```bash
cd ~/myapp  # or your project directory
mkvirtualenv --python=/usr/bin/python3.10 smartmine
pip install -r requirements.txt
```

### Step 4: Configure Web App

1. Go to **Web** tab
2. Click **"Add a new web app"**
3. Select **"Manual configuration"** (not Flask)
4. Choose **Python 3.10**

### Step 5: Configure WSGI File

1. Click on your WSGI configuration file link (e.g., `/var/www/YOUR_USERNAME_pythonanywhere_com_wsgi.py`)
2. Replace contents with:

```python
import sys
import os

# Add your project directory to the path
project_home = '/home/YOUR_USERNAME/myapp'  # Update this path
if project_home not in sys.path:
    sys.path.insert(0, project_home)

# Set environment variables
os.environ['FLASK_ENV'] = 'production'

# Import your Flask app
from app import app as application
```

### Step 6: Configure Virtual Environment Path

In the **Web** tab:
1. Find **Virtualenv** section
2. Enter: `/home/YOUR_USERNAME/.virtualenvs/smartmine`

### Step 7: Configure Static Files & CORS

Your Flask app already has CORS configured. Make sure in `app.py`:

```python
CORS(app, origins=["*"])  # Or specify your Vercel domain
```

### Step 8: Create Required Directories

In Bash console:

```bash
cd ~/myapp
mkdir -p uploads processed spmf
chmod 755 uploads processed spmf
```

### Step 9: Reload Web App

1. Go back to **Web** tab
2. Click **"Reload"** button

Your backend is now live at:
```
https://YOUR_USERNAME.pythonanywhere.com
```

---

## Frontend Deployment (Vercel)

### Step 1: Prepare Frontend Configuration

1. Create/update `src/config/api.ts`:

```typescript
export const API_BASE = import.meta.env.PROD 
  ? 'https://YOUR_USERNAME.pythonanywhere.com'
  : 'http://localhost:5000';
```

2. Update `src/hooks/useMining.ts` to use the config:

```typescript
import { API_BASE } from '@/config/api';

// Remove the hardcoded: const API_BASE = "http://localhost:5000";
// The import above now provides it
```

### Step 2: Create Vercel Account

1. Go to [vercel.com](https://vercel.com)
2. Sign up with GitHub

### Step 3: Import Project

1. Click **"Add New..."** → **"Project"**
2. Select your GitHub repository
3. Vercel auto-detects Vite configuration

### Step 4: Configure Build Settings

Vercel should auto-detect, but verify:

| Setting | Value |
|---------|-------|
| Framework Preset | Vite |
| Build Command | `npm run build` or `bun run build` |
| Output Directory | `dist` |
| Install Command | `npm install` or `bun install` |

### Step 5: Set Environment Variables

In Vercel project settings → **Environment Variables**:

| Variable | Value |
|----------|-------|
| `VITE_API_BASE_URL` | `https://YOUR_USERNAME.pythonanywhere.com` |
| `VITE_SUPABASE_URL` | Your Supabase project URL |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Your Supabase anon key |

### Step 6: Deploy

1. Click **"Deploy"**
2. Wait for build to complete
3. Your frontend is live at: `https://YOUR_PROJECT.vercel.app`

---

## Environment Configuration

### Update API URLs

Create or update `src/config/api.ts`:

```typescript
// API Configuration
export const API_BASE = import.meta.env.VITE_API_BASE_URL || 
  (import.meta.env.PROD 
    ? 'https://YOUR_USERNAME.pythonanywhere.com'
    : 'http://localhost:5000');

export const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
export const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
```

### Update useMining.ts

Replace the hardcoded API_BASE:

```typescript
// At the top of the file
const API_BASE = import.meta.env.VITE_API_BASE_URL || 
  (import.meta.env.PROD 
    ? 'https://YOUR_USERNAME.pythonanywhere.com' 
    : 'http://localhost:5000');
```

---

## Testing the Deployment

### 1. Test Backend Health

```bash
curl https://YOUR_USERNAME.pythonanywhere.com/api/health
```

Expected response:
```json
{"status": "healthy", "message": "SmartMine API is running"}
```

### 2. Test Frontend

1. Open `https://YOUR_PROJECT.vercel.app`
2. Check browser console for errors
3. Verify "Backend Connected" indicator shows green

### 3. Test Full Workflow

1. Upload a sample CSV dataset
2. Run association rule mining
3. Verify results display correctly

---

## Troubleshooting

### PythonAnywhere Issues

**Error: ModuleNotFoundError**
```bash
# Ensure virtualenv is activated
workon smartmine
pip install -r requirements.txt
```

**Error: Permission denied for uploads**
```bash
chmod 755 ~/myapp/uploads ~/myapp/processed
```

**Error: 504 Gateway Timeout**
- Mining large datasets may timeout on free tier
- Solution: Upgrade to paid tier or reduce dataset size

**CORS Errors**
Update `app.py`:
```python
CORS(app, origins=["https://YOUR_PROJECT.vercel.app"])
```

### Vercel Issues

**Build Fails**
- Check build logs in Vercel dashboard
- Ensure all dependencies in package.json
- Verify no TypeScript errors

**Environment Variables Not Loading**
- Prefix with `VITE_` for Vite projects
- Redeploy after adding variables

**API Calls Failing**
- Check browser Network tab
- Verify CORS is configured on backend
- Ensure HTTPS is used (not HTTP)

---

## Production Checklist

- [ ] Backend deployed and `/api/health` returns OK
- [ ] Frontend deployed and loads without errors
- [ ] CORS configured correctly
- [ ] Environment variables set
- [ ] Supabase authentication working
- [ ] File upload working
- [ ] Mining algorithms returning results
- [ ] Export functionality working

---

## Custom Domain (Optional)

### Vercel Custom Domain

1. Go to Project Settings → Domains
2. Add your domain
3. Configure DNS as instructed

### PythonAnywhere Custom Domain

1. Upgrade to paid tier
2. Go to Web tab → add custom domain
3. Configure CNAME record

---

## Updating Deployments

### Update Backend

```bash
# SSH or Bash console on PythonAnywhere
cd ~/myapp
git pull origin main
# Reload web app from Web tab
```

### Update Frontend

Vercel auto-deploys on push to main branch. Or:

1. Push changes to GitHub
2. Vercel detects and rebuilds automatically

---

## Support

For issues:
- PythonAnywhere: [help.pythonanywhere.com](https://help.pythonanywhere.com)
- Vercel: [vercel.com/docs](https://vercel.com/docs)
- Supabase: [supabase.com/docs](https://supabase.com/docs)
