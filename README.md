College Football Vibe Monitor (MVP)

Quick start

1) Optional: create virtual environment
   python -m venv .venv && source .venv/bin/activate

2) Install dependencies
   pip install -r requirements.txt

3) Run API server
   uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

4) Open dashboard
   http://localhost:8000

5) Test analyze endpoint
   curl -X POST http://localhost:8000/api/analyze \
     -H 'Content-Type: application/json' \
     -d '{"player_name":"Test Player","high_school":"Example HS"}'