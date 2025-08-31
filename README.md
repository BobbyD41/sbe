# Stars to Stats - ReRank

Revamping College Recruiting Rankings. ReRank reassesses past recruiting classes using a transparent point system to show how classes actually performed.

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
└── docs/             # Documentation
```

## Quick Start

### Backend Development
```bash
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### Frontend Development
```bash
cd frontend
npm install
npm run dev
```

### Full Stack Development
```bash
# Terminal 1: Backend
cd backend && uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

# Terminal 2: Frontend
cd frontend && npm run dev
```

## Deployment

### Backend (Vercel)
```bash
cd backend
vercel --prod
```

### Frontend (Vercel)
```bash
cd frontend
vercel --prod
```

## Features

- **Leaderboard**: View team rankings by year
- **ReRank**: Analyze individual team recruiting classes
- **Team pages**: Click on team names to view detailed class breakdowns
- **Data import**: Import recruiting data from College Football Data API
- **Recruit Management**: Add, update, and delete recruits (requires authentication)
- **Automatic Recalculation**: Rerank updates automatically when recruits change

## API Endpoints

### Public Endpoints
- `GET /api/outcomes` - Get available outcomes and point values
- `GET /api/recruits/{year}/{team}/detailed` - Get detailed recruit info
- `GET /api/rerank/{year}/{team}` - Get rerank data for a team
- `GET /api/leaderboard/rerank/{year}` - Get leaderboard for a year

### Authentication Required
- `POST /api/recruits/add` - Add new recruits
- `PUT /api/recruits/{id}` - Update existing recruits
- `DELETE /api/recruits/{id}` - Delete manually added recruits

## Environment Variables

### Backend
- `CFBD_API_KEY` - College Football Data API key
- `SECRET_KEY` - JWT secret key
- `DATABASE_URL` - Database connection string

### Frontend
- `VITE_API_BASE` - Backend API base URL

## Documentation

- [Recruit Management API](RECRUIT_MANAGEMENT.md)
- [Vercel Deployment Guide](VERCEL_DEPLOYMENT.md)
- [Backend API Docs](https://your-backend-url.vercel.app/docs)
