from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
import os

from .services.nlp import analyze_text_cues
from .services.scoring import aggregate_scores
from .utils.scrape import collect_public_text

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

# Static dashboard
static_dir = os.path.join(os.path.dirname(__file__), "static")
if not os.path.isdir(static_dir):
    os.makedirs(static_dir, exist_ok=True)

@app.get("/")
async def dashboard_index():
    index_path = os.path.join(static_dir, "index.html")
    return FileResponse(index_path)

app.mount("/static", StaticFiles(directory=static_dir), name="static")