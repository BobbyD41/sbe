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

# Static dashboard
static_dir = os.path.join(os.path.dirname(__file__), "static")
if not os.path.isdir(static_dir):
    os.makedirs(static_dir, exist_ok=True)

@app.get("/")
async def dashboard_index():
    index_path = os.path.join(static_dir, "index.html")
    return FileResponse(index_path)

app.mount("/static", StaticFiles(directory=static_dir), name="static")