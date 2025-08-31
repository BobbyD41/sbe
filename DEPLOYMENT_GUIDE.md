# 🚀 Complete Deployment Guide - Stars to Stats

This guide will help you deploy both the backend API and frontend application to Vercel.

## Project Structure

```
├── backend/           # FastAPI backend API
│   ├── app/          # Main application code
│   ├── api/          # Vercel serverless functions
│   ├── requirements.txt
│   └── vercel.json   # Backend deployment config
├── frontend/         # React frontend application
│   ├── src/          # React source code
│   ├── public/       # Static assets
│   ├── package.json
│   └── vercel.json   # Frontend deployment config
└── deployment scripts
```

## Prerequisites

- GitHub account with your code repository
- Vercel account (free at [vercel.com](https://vercel.com))
- College Football Data API key
- Cloud database (Supabase, Railway, or similar)

## Quick Deployment

### Option 1: Deploy Everything at Once
```bash
./deploy-all.sh
```

### Option 2: Deploy Separately
```bash
# Deploy backend only
./deploy-backend.sh

# Deploy frontend only
./deploy-frontend.sh
```

## Step-by-Step Deployment

### Step 1: Prepare Your Repository
```bash
git add .
git commit -m "Restructure project with separate backend and frontend"
git push origin main
```

### Step 2: Set Up Cloud Database

Since Vercel is serverless, you need a cloud database:

#### Option A: Supabase (Recommended)
1. Go to [supabase.com](https://supabase.com)
2. Create a new project
3. Get your database URL from Settings → Database
4. Format: `postgresql://postgres:[password]@[host]:5432/postgres`

#### Option B: Railway Database
1. Go to [railway.app](https://railway.app)
2. Create a new project
3. Add a PostgreSQL database
4. Get the connection URL

### Step 3: Deploy Backend

```bash
cd backend
vercel --prod
```

**Note the backend URL** - you'll need it for the frontend configuration.

### Step 4: Configure Backend Environment Variables

In your backend Vercel project dashboard:

1. Go to Settings → Environment Variables
2. Add the following variables:

```
CFBD_API_KEY=your-college-football-data-api-key
SECRET_KEY=your-super-secret-key-here-make-it-long-and-random
DATABASE_URL=your-cloud-database-url
```

3. Click "Save"
4. Redeploy if needed

### Step 5: Deploy Frontend

```bash
cd frontend
vercel --prod
```

### Step 6: Configure Frontend Environment Variables

In your frontend Vercel project dashboard:

1. Go to Settings → Environment Variables
2. Add/Update:

```
VITE_API_BASE=https://your-backend-url.vercel.app/api
```

3. Click "Save"
4. Redeploy if needed

## Testing Your Deployment

### Test Backend
```bash
# Health check
curl https://your-backend-url.vercel.app/

# API docs
curl https://your-backend-url.vercel.app/docs

# Test new endpoints
curl https://your-backend-url.vercel.app/api/outcomes
```

### Test Frontend
```bash
# Check if frontend loads
curl -I https://your-frontend-url.vercel.app

# Test API connection through frontend
curl https://your-frontend-url.vercel.app/api/outcomes
```

### Test Full Stack
1. Visit your frontend URL in a browser
2. Test the leaderboard functionality
3. Test team links
4. Test recruit management features (requires authentication)

## Environment Variables Reference

### Backend Variables
| Variable | Description | Example |
|----------|-------------|---------|
| `CFBD_API_KEY` | College Football Data API key | `jekINaY9OrzjS7KVn3OkxubVBD2LQcu7ZP6bixw51bdO6JK25U+wNL5x+RY8AScq` |
| `SECRET_KEY` | JWT secret key for authentication | `your-super-secret-key-here-make-it-long-and-random-123456789` |
| `DATABASE_URL` | Database connection string | `postgresql://postgres:password@host:5432/postgres` |

### Frontend Variables
| Variable | Description | Example |
|----------|-------------|---------|
| `VITE_API_BASE` | Backend API base URL | `https://your-backend-project.vercel.app/api` |

## Troubleshooting

### Common Issues

#### Backend Issues
1. **Build fails**: Check `backend/requirements.txt` has all dependencies
2. **Database connection fails**: Verify `DATABASE_URL` is correct
3. **API key issues**: Check `CFBD_API_KEY` is set correctly
4. **Authentication fails**: Verify `SECRET_KEY` is set

#### Frontend Issues
1. **Build fails**: Check `frontend/package.json` dependencies
2. **API connection fails**: Verify `VITE_API_BASE` points to correct backend URL
3. **CORS errors**: Check backend CORS configuration

### Logs
- **Backend logs**: Vercel dashboard → Backend project → Functions → View logs
- **Frontend logs**: Vercel dashboard → Frontend project → Deployments → View logs

### Health Checks
```bash
# Backend health
curl https://your-backend-url.vercel.app/api/import/cfbd/status

# Frontend health
curl -I https://your-frontend-url.vercel.app
```

## Benefits of This Structure

- ✅ **Separate deployments** for backend and frontend
- ✅ **Independent scaling** of API and UI
- ✅ **Better organization** of code
- ✅ **Easier debugging** and maintenance
- ✅ **Flexible deployment** options
- ✅ **Cost optimization** (only pay for what you use)

## Your URLs

After deployment:
- **Backend API**: `https://your-backend-project.vercel.app`
- **API Docs**: `https://your-backend-project.vercel.app/docs`
- **Frontend App**: `https://your-frontend-project.vercel.app`

## Next Steps

1. **Test all functionality** thoroughly
2. **Import historical data** using the CFBD API
3. **Set up custom domains** (optional)
4. **Monitor performance** and usage
5. **Set up analytics** and error tracking
6. **Configure CI/CD** for automatic deployments

## Support

- [Vercel Documentation](https://vercel.com/docs)
- [FastAPI Documentation](https://fastapi.tiangolo.com/)
- [React Documentation](https://react.dev/)
- [Vite Documentation](https://vitejs.dev/)