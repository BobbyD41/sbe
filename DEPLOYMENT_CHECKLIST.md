# 🚀 Stars to Stats Deployment Checklist

## Pre-Deployment
- [x] Code is committed and pushed to GitHub
- [x] All dependencies are in requirements.txt
- [x] Environment variables are documented
- [x] Database models are properly configured

## Backend Deployment (Railway)
- [ ] Create Railway account at [railway.app](https://railway.app)
- [ ] Connect GitHub repository
- [ ] Deploy from GitHub repo
- [ ] Set environment variables:
  - [ ] `CFBD_API_KEY=jekINaY9OrzjS7KVn3OkxubVBD2LQcu7ZP6bixw51bdO6JK25U+wNL5x+RY8AScq`
  - [ ] `SECRET_KEY=your-super-secret-key-here-make-it-long-and-random-123456789`
  - [ ] `DATABASE_URL=sqlite:///./sbe.db`
- [ ] Get Railway URL (e.g., `https://your-project.up.railway.app`)
- [ ] Test backend health: `curl https://your-railway-url/`
- [ ] Test API endpoint: `curl https://your-railway-url/api/leaderboard/rerank/2002`

## Frontend Deployment (Vercel)
- [ ] Create Vercel account at [vercel.com](https://vercel.com)
- [ ] Import GitHub repository
- [ ] Configure project settings:
  - [ ] Framework Preset: Vite
  - [ ] Root Directory: `frontend`
  - [ ] Build Command: `npm run build`
  - [ ] Output Directory: `dist`
- [ ] Set environment variable:
  - [ ] `VITE_API_BASE=https://your-railway-url.up.railway.app/api`
- [ ] Deploy
- [ ] Get Vercel URL (e.g., `https://your-project.vercel.app`)

## Post-Deployment Testing
- [ ] Test frontend loads: Visit Vercel URL
- [ ] Test leaderboard functionality
- [ ] Test team links work
- [ ] Test API proxy through frontend
- [ ] Import some sample data using CFBD API
- [ ] Test rerank functionality

## Custom Domain (Optional)
- [ ] Add custom domain to Vercel
- [ ] Configure DNS settings
- [ ] Test custom domain

## Monitoring
- [ ] Set up Railway monitoring
- [ ] Set up Vercel analytics
- [ ] Monitor API usage
- [ ] Set up error tracking

## Your URLs
- **Backend**: `https://your-railway-url.up.railway.app`
- **Frontend**: `https://your-vercel-url.vercel.app`
- **API Docs**: `https://your-railway-url.up.railway.app/docs`

## Quick Test Commands
```bash
# Test backend
curl https://your-railway-url/
curl https://your-railway-url/api/leaderboard/rerank/2002

# Test frontend
curl -I https://your-vercel-url.vercel.app
curl https://your-vercel-url.vercel.app/api/leaderboard/rerank/2002

# Run deployment test script
./deploy-test.sh
```
