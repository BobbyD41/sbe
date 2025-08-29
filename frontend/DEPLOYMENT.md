# Quick Vercel Deployment Guide

## Step 1: Prepare Your Repository
Make sure all your changes are pushed to GitHub.

## Step 2: Deploy to Vercel

### Option A: Vercel Dashboard (Recommended)
1. Go to [vercel.com](https://vercel.com)
2. Sign up/Login with your GitHub account
3. Click "New Project"
4. Import your GitHub repository (`BobbyD41/sbe`)
5. Configure the project:
   - **Framework Preset**: Vite
   - **Root Directory**: `frontend`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
6. Add Environment Variables:
   - **Name**: `VITE_API_BASE`
   - **Value**: `https://your-backend-url.com/api` (replace with your actual backend URL)
7. Click "Deploy"

### Option B: Vercel CLI
```bash
# Install Vercel CLI
npm install -g vercel

# Login to Vercel
vercel login

# Navigate to frontend directory
cd frontend

# Deploy
vercel

# Follow the prompts:
# - Set up and deploy: Yes
# - Which scope: Select your account
# - Link to existing project: No
# - Project name: sbe-frontend (or any name)
# - Directory: ./ (current directory)
# - Override settings: No
```

## Step 3: Configure Environment Variables
After deployment, go to your Vercel project dashboard:
1. Go to Settings → Environment Variables
2. Add: `VITE_API_BASE` = `https://your-backend-url.com/api`
3. Redeploy if needed

## Step 4: Custom Domain (Optional)
1. Go to your Vercel project dashboard
2. Click "Domains"
3. Add your custom domain
4. Follow DNS configuration instructions

## Benefits of Vercel
- ✅ Automatic deployments from GitHub
- ✅ Preview deployments for pull requests
- ✅ Global CDN
- ✅ Custom domains
- ✅ Environment variables management
- ✅ Analytics and performance monitoring
- ✅ Free tier available

## Your App URL
After deployment, your app will be available at:
`https://your-project-name.vercel.app`

## Backend Deployment
Remember to also deploy your FastAPI backend to a service like:
- Railway
- Render
- Heroku
- DigitalOcean App Platform

Then update the `VITE_API_BASE` environment variable with your backend URL.
