# 🚀 Vercel Deployment Guide for Stars to Stats API

This guide will help you deploy your updated Stars to Stats API (with recruit management features) to Vercel.

## Prerequisites

- GitHub account with your code repository
- Vercel account (free at [vercel.com](https://vercel.com))
- College Football Data API key
- Cloud database (Supabase, Railway, or similar)

## Step 1: Prepare Your Repository

Make sure all your changes are committed and pushed to GitHub:

```bash
git add .
git commit -m "Add recruit management features and Vercel deployment config"
git push origin main
```

## Step 2: Set Up Cloud Database

Since Vercel is serverless, you need a cloud database. Recommended options:

### Option A: Supabase (Recommended)
1. Go to [supabase.com](https://supabase.com)
2. Create a new project
3. Get your database URL from Settings → Database
4. Format: `postgresql://postgres:[password]@[host]:5432/postgres`

### Option B: Railway Database
1. Go to [railway.app](https://railway.app)
2. Create a new project
3. Add a PostgreSQL database
4. Get the connection URL

## Step 3: Deploy to Vercel

### Option A: Vercel Dashboard (Recommended)

1. **Go to [vercel.com](https://vercel.com)**
2. **Sign up/Login** with your GitHub account
3. **Click "New Project"**
4. **Import your GitHub repository**
5. **Configure the project**:
   - **Framework Preset**: Other
   - **Root Directory**: `./` (root of repository)
   - **Build Command**: Leave empty (not needed for API)
   - **Output Directory**: Leave empty
6. **Click "Deploy"**

### Option B: Vercel CLI

```bash
# Install Vercel CLI
npm install -g vercel

# Login to Vercel
vercel login

# Deploy
vercel --prod
```

## Step 4: Configure Environment Variables

After deployment, go to your Vercel project dashboard:

1. **Go to Settings → Environment Variables**
2. **Add the following variables**:

```
CFBD_API_KEY=your-college-football-data-api-key
SECRET_KEY=your-super-secret-key-here-make-it-long-and-random
DATABASE_URL=your-cloud-database-url
```

3. **Click "Save"**
4. **Redeploy** if needed

## Step 5: Test Your Deployment

### Test Basic Functionality
```bash
# Health check
curl https://your-project-name.vercel.app/

# API docs
curl https://your-project-name.vercel.app/docs

# Test new endpoints
curl https://your-project-name.vercel.app/api/outcomes
```

### Test Recruit Management (requires auth)
```bash
# Get detailed recruits
curl https://your-project-name.vercel.app/api/recruits/2020/Alabama/detailed

# Add a recruit (requires Bearer token)
curl -X POST https://your-project-name.vercel.app/api/recruits/add \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "year": 2020,
    "team": "Alabama",
    "name": "Test Player",
    "position": "QB",
    "stars": 4,
    "outcome": "College Starter",
    "points": 2
  }'
```

## Step 6: Update Frontend Configuration

Update your frontend's environment variable to point to the new Vercel API:

1. **Go to your frontend Vercel project**
2. **Settings → Environment Variables**
3. **Update `VITE_API_BASE`** to: `https://your-api-project-name.vercel.app/api`
4. **Redeploy** the frontend

## Step 7: Database Migration

If you're using a new database, you'll need to migrate your data:

1. **Import sample data**:
```bash
curl -X POST https://your-project-name.vercel.app/api/import/cfbd/2002/Oklahoma%20State
```

2. **Test the rerank functionality**:
```bash
curl https://your-project-name.vercel.app/api/rerank/2002/Oklahoma%20State
```

## New Features Available

Your deployed API now includes:

### 🔐 Authentication Required Endpoints
- `POST /api/recruits/add` - Add new recruits
- `PUT /api/recruits/{id}` - Update existing recruits
- `DELETE /api/recruits/{id}` - Delete manually added recruits

### 📊 Public Endpoints
- `GET /api/outcomes` - Get available outcomes and point values
- `GET /api/recruits/{year}/{team}/detailed` - Get detailed recruit info

### 🔄 Automatic Features
- Auto-recalculation of rerank when recruits are added/updated/deleted
- Source tracking (API vs manual recruits)
- Comprehensive error handling

## Troubleshooting

### Common Issues:

1. **Build fails**: Check `requirements.txt` has all dependencies
2. **Database connection fails**: Verify `DATABASE_URL` is correct
3. **API key issues**: Check `CFBD_API_KEY` is set correctly
4. **Authentication fails**: Verify `SECRET_KEY` is set

### Logs:
- Go to Vercel dashboard → Your project → "Functions" tab
- Click on function → "View Function Logs"

### Health Check:
```bash
curl https://your-project-name.vercel.app/api/import/cfbd/status
```

## Benefits of Vercel Deployment

- ✅ **Automatic deployments** from GitHub
- ✅ **Global CDN** for fast response times
- ✅ **Serverless functions** for cost efficiency
- ✅ **Custom domains** support
- ✅ **SSL certificates** included
- ✅ **Environment variables** management
- ✅ **Free tier** available
- ✅ **Easy scaling**

## Your URLs

After deployment:
- **API**: `https://your-project-name.vercel.app`
- **API Docs**: `https://your-project-name.vercel.app/docs`
- **Frontend**: `https://your-frontend-project-name.vercel.app`

## Quick Test Commands

```bash
# Test basic functionality
curl https://your-project-name.vercel.app/
curl https://your-project-name.vercel.app/api/outcomes

# Test recruit management
curl https://your-project-name.vercel.app/api/recruits/2020/Alabama/detailed

# Test rerank functionality
curl https://your-project-name.vercel.app/api/rerank/2002/Oklahoma%20State
```

## Support

- [Vercel Documentation](https://vercel.com/docs)
- [Vercel Discord](https://discord.gg/vercel)
- [Vercel Status](https://vercel-status.com/)

## Next Steps

1. **Test all new recruit management features**
2. **Import historical data** using the CFBD API
3. **Set up custom domain** (optional)
4. **Monitor usage** and performance
5. **Set up analytics** and error tracking