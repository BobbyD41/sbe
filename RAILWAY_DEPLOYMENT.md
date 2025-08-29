# Railway Deployment Guide for FastAPI Backend

## Prerequisites

1. **GitHub Account** - Your code should be on GitHub
2. **Railway Account** - Sign up at [railway.app](https://railway.app)
3. **CollegeFootballData API Key** - You already have this

## Step 1: Prepare Your Repository

Make sure all your changes are pushed to GitHub:
```bash
git add .
git commit -m "Add Railway deployment configuration"
git push origin main
```

## Step 2: Deploy to Railway

### Option A: Railway Dashboard (Recommended)

1. **Go to [railway.app](https://railway.app)**
2. **Sign up/Login** with your GitHub account
3. **Click "New Project"**
4. **Select "Deploy from GitHub repo"**
5. **Choose your repository** (`BobbyD41/sbe`)
6. **Railway will automatically detect** it's a Python project
7. **Click "Deploy"**

### Option B: Railway CLI

```bash
# Install Railway CLI
npm install -g @railway/cli

# Login to Railway
railway login

# Initialize Railway project
railway init

# Deploy
railway up
```

## Step 3: Configure Environment Variables

After deployment, go to your Railway project dashboard:

1. **Click on your project**
2. **Go to "Variables" tab**
3. **Add the following environment variables**:

```
CFBD_API_KEY=jekINaY9OrzjS7KVn3OkxubVBD2LQcu7ZP6bixw51bdO6JK25U+wNL5x+RY8AScq
SECRET_KEY=your-secret-key-here-make-it-long-and-random
DATABASE_URL=sqlite:///./sbe.db
```

4. **Click "Add"** for each variable
5. **Redeploy** if needed

## Step 4: Get Your Backend URL

1. **Go to your Railway project dashboard**
2. **Click on your service**
3. **Copy the generated URL** (e.g., `https://your-project-name-production.up.railway.app`)
4. **This is your backend URL**

## Step 5: Update Frontend Environment Variable

Now update your frontend's `VITE_API_BASE` environment variable:

1. **If using Vercel**: Go to Vercel dashboard → Settings → Environment Variables
2. **Add/Update**: `VITE_API_BASE` = `https://your-railway-url.up.railway.app/api`
3. **Redeploy** your frontend

## Step 6: Test Your Deployment

1. **Test the health check**: Visit `https://your-railway-url.up.railway.app/api/import/cfbd/status`
2. **Should return**: `{"ok": true, "has_key": true, "reachable": true}`
3. **Test your frontend**: Make sure it can connect to the backend

## Railway Configuration Files

### `requirements.txt`
Lists all Python dependencies for Railway to install.

### `Procfile`
Tells Railway how to start your application.

### `runtime.txt`
Specifies the Python version.

### `railway.json`
Railway-specific configuration for deployment settings.

## Troubleshooting

### Common Issues:

1. **Build fails**: Check `requirements.txt` has all dependencies
2. **App won't start**: Check `Procfile` and start command
3. **Database issues**: Make sure `DATABASE_URL` is set correctly
4. **API key issues**: Verify `CFBD_API_KEY` is set correctly

### Logs:
- Go to Railway dashboard → Your service → "Deployments" tab
- Click on latest deployment → "View Logs"

### Health Check:
- Railway will automatically check `/api/import/cfbd/status`
- If it fails, Railway will restart your app

## Benefits of Railway

- ✅ **Automatic deployments** from GitHub
- ✅ **Environment variables** management
- ✅ **Custom domains** support
- ✅ **SSL certificates** included
- ✅ **Database hosting** available
- ✅ **Free tier** available
- ✅ **Easy scaling**

## Your Backend URL

After deployment, your backend will be available at:
`https://your-project-name-production.up.railway.app`

## Next Steps

1. **Test your backend** is working
2. **Update your frontend** environment variable
3. **Test the full application**
4. **Set up custom domain** (optional)

## Support

- [Railway Documentation](https://docs.railway.app/)
- [Railway Discord](https://discord.gg/railway)
- [Railway Status](https://status.railway.app/)
