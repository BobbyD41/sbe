from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
import os
import json

from .services.nlp import analyze_text_cues
from .services.scoring import aggregate_scores
from .utils.scrape import collect_public_text
from .services.programs import PROGRAM_PROFILES, match_program_fits
from .services.rerank import get_class_summary

app = FastAPI(title="College Football Vibe Monitor (MVP)")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class AnalyzeRequest(BaseModel):
    player_name: str
    high_school: Optional[str] = None
    links: Optional[List[str]] = None
    max_items: int = 50

class AnalyzeResponse(BaseModel):
    player_name: str
    summary: str
    scores: Dict[str, float]
    signals: Dict[str, Any]

class MatchRequest(BaseModel):
    scores: Dict[str, float]
    top_k: int = 5

class ReRankPayload(BaseModel):
    year: int | str
    team: str
    players: List[Dict[str, Any]]

@app.post("/api/analyze", response_model=AnalyzeResponse)
async def analyze_player(req: AnalyzeRequest):
    texts = collect_public_text(req.player_name, req.high_school, req.links or [], req.max_items)
    if not texts:
        raise HTTPException(status_code=404, detail="No public data found for analysis")

    analysis = analyze_text_cues(texts)
    scores = aggregate_scores(analysis)

    return AnalyzeResponse(
        player_name=req.player_name,
        summary=analysis.get("summary", "Preliminary personality snapshot from public data."),
        scores=scores,
        signals=analysis.get("signals", {}),
    )

@app.get("/api/programs")
async def list_programs():
    return {"programs": list(PROGRAM_PROFILES.keys())}

@app.post("/api/match")
async def match_programs(req: MatchRequest):
    fits = match_program_fits(req.scores, req.top_k)
    return {"fits": fits}

@app.get("/api/rerank/{year}/{team}")
async def rerank_class(year: int, team: str):
    summary = get_class_summary(year, team)
    if not summary.get("players"):
        raise HTTPException(status_code=404, detail="Class not found")
    return summary

@app.post("/api/rerank")
async def save_rerank_class(payload: ReRankPayload):
    try:
        year = int(payload.year)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid year")
    team_slug = payload.team.strip().lower().replace(" ", "_")
    data_dir = os.path.join(os.path.dirname(__file__), "data", "rerank")
    os.makedirs(data_dir, exist_ok=True)
    path = os.path.join(data_dir, f"{year}_{team_slug}.json")
    # Sanitize and coerce
    players = []
    for p in payload.players:
        name = str(p.get("name", "")).strip()
        if not name:
            continue
        points = int(p.get("points", 0))
        note = str(p.get("note", "")).strip()
        players.append({"name": name, "points": points, "note": note})
    with open(path, "w", encoding="utf-8") as f:
        json.dump(players, f, ensure_ascii=False, indent=2)
    return {"ok": True, "saved": len(players), "file": f"{year}_{team_slug}.json"}

# Static dashboard
static_dir = os.path.join(os.path.dirname(__file__), "static")
if not os.path.isdir(static_dir):
    os.makedirs(static_dir, exist_ok=True)

@app.get("/")
async def dashboard_index():
    index_path = os.path.join(static_dir, "index.html")
    return FileResponse(index_path)

app.mount("/static", StaticFiles(directory=static_dir), name="static")