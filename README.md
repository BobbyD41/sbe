Stars to Stats - ReRank

Revamping College Recruiting Rankings. ReRank reassesses past recruiting classes using a transparent point system to show how classes actually performed.

Quick start

1) Optional: create virtual environment
   python -m venv .venv && source .venv/bin/activate

2) Install dependencies
   pip install -r requirements.txt

3) Run API server
   uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

4) Open dashboard
   http://localhost:8000

5) Test rerank endpoint
   curl -X GET http://localhost:8000/api/rerank/2002/Oklahoma%20State

Features:
- Leaderboard: View team rankings by year
- ReRank: Analyze individual team recruiting classes
- Team pages: Click on team names to view detailed class breakdowns
- Data import: Import recruiting data from College Football Data API