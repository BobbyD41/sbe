# College Football Vibe Monitor - Frontend

This is the React frontend for the College Football Vibe Monitor application.

## Development

To run the development server:

```bash
npm install
npm run dev
```

The app will be available at `http://localhost:5173`

## Deployment Options

This app can be deployed to either Firebase Hosting or Vercel.

### Option 1: Deploy to Vercel (Recommended)

Vercel is often easier to set up and provides automatic deployments from GitHub.

#### Prerequisites

1. Install Vercel CLI globally:
```bash
npm install -g vercel
```

2. Login to Vercel:
```bash
vercel login
```

#### Deploy

**Option A: Deploy via Vercel Dashboard (Easiest)**
1. Go to [vercel.com](https://vercel.com) and sign up/login
2. Click "New Project"
3. Import your GitHub repository
4. Set the following settings:
   - Framework Preset: Vite
   - Root Directory: `frontend`
   - Build Command: `npm run build`
   - Output Directory: `dist`
5. Add environment variable: `VITE_API_BASE` = `https://your-backend-url.com/api`
6. Click "Deploy"

**Option B: Deploy via CLI**
```bash
cd frontend
vercel
```

**Option C: Deploy with custom domain**
```bash
cd frontend
vercel --prod
```

### Option 2: Deploy to Firebase

#### Prerequisites

1. Install Firebase CLI globally:
```bash
npm install -g firebase-tools
```

2. Login to Firebase:
```bash
firebase login
```

#### Deploy

To deploy to Firebase Hosting:

```bash
npm run deploy
```

Or to deploy only hosting (if you've already built):
```bash
npm run deploy:hosting
```

#### Manual Deployment Steps

1. Build the project:
```bash
npm run build
```

2. Deploy to Firebase:
```bash
firebase deploy
```

The app will be available at: https://sbe-40.firebaseapp.com

## Environment Variables

Create a `.env` file in the frontend directory with:

```
VITE_API_BASE=https://your-backend-url.com/api
```

For local development, the API base defaults to `/api` which is proxied to `http://localhost:8000`.

## Features

- College football recruiting class analysis
- ReRank system based on player outcomes
- Team-specific color theming
- Leaderboard with automatic data fetching
- Support for years 2002-2025
- Integration with CollegeFootballData API
