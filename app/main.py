from fastapi import FastAPI, HTTPException, Depends, Header
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

# DB and models
from .db import SessionLocal, engine, Base
from . import models
from sqlalchemy.orm import Session

# Security
from .services.security import hash_password, verify_password, create_access_token, decode_token

app = FastAPI(title="College Football Vibe Monitor (MVP)")

# Create tables
Base.metadata.create_all(bind=engine)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Dependency
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# Auth helpers
def get_current_user_db(db: Session, authorization: Optional[str]) -> Optional[models.User]:
    if not authorization or not authorization.lower().startswith("bearer "):
        return None
    token = authorization.split(" ", 1)[1]
    payload = decode_token(token)
    if not payload:
        return None
    user_id = payload.get("sub")
    if not user_id:
        return None
    return db.get(models.User, int(user_id))

class RegisterRequest(BaseModel):
    email: str
    password: str

class LoginRequest(BaseModel):
    email: str
    password: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"

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

@app.post("/api/auth/register", response_model=TokenResponse)
async def register(req: RegisterRequest, db: Session = Depends(get_db)):
    existing = db.query(models.User).filter(models.User.email == req.email).first()
    if existing:
        raise HTTPException(status_code=409, detail="Email already registered")
    user = models.User(email=req.email, password_hash=hash_password(req.password))
    db.add(user)
    db.commit()
    db.refresh(user)
    token = create_access_token({"sub": str(user.id), "email": user.email})
    return TokenResponse(access_token=token)

@app.post("/api/auth/login", response_model=TokenResponse)
async def login(req: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.email == req.email).first()
    if not user or not verify_password(req.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    token = create_access_token({"sub": str(user.id), "email": user.email})
    return TokenResponse(access_token=token)

@app.post("/api/analyze", response_model=AnalyzeResponse)
async def analyze_player(
    req: AnalyzeRequest,
    db: Session = Depends(get_db),
    authorization: Optional[str] = Header(default=None, alias="Authorization"),
):
    texts = collect_public_text(req.player_name, req.high_school, req.links or [], req.max_items)
    if not texts:
        raise HTTPException(status_code=404, detail="No public data found for analysis")

    analysis = analyze_text_cues(texts)
    scores = aggregate_scores(analysis)

    # Optional persistence if authenticated
    user = get_current_user_db(db, authorization)
    if user:
        result = models.AnalyzeResult(
            player_name=req.player_name,
            summary=analysis.get("summary", ""),
            scores=scores,
            signals=analysis.get("signals", {}),
            created_by=user.id,
        )
        db.add(result)
        db.commit()

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
async def save_rerank_class(
    payload: ReRankPayload,
    db: Session = Depends(get_db),
    authorization: Optional[str] = Header(default=None, alias="Authorization"),
):
    try:
        year = int(payload.year)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid year")

    # Persist to DB
    user = get_current_user_db(db, authorization)
    players_clean: List[Dict[str, Any]] = []
    total = 0
    for p in payload.players:
        name = str(p.get("name", "")).strip()
        if not name:
            continue
        points = int(p.get("points", 0))
        note = str(p.get("note", "")).strip()
        players_clean.append({"name": name, "points": points, "note": note})
        total += points
    avg = round(total / max(1, len(players_clean)), 2)

    rerank = models.RerankClass(year=year, team=payload.team.strip(), total_points=total, avg_points=avg, created_by=(user.id if user else None))
    db.add(rerank)
    db.commit()
    db.refresh(rerank)

    for p in players_clean:
        db.add(models.RerankPlayer(class_id=rerank.id, name=p["name"], points=p["points"], note=p["note"]))
    db.commit()

    # Also save to JSON for portability
    team_slug = payload.team.strip().lower().replace(" ", "_")
    data_dir = os.path.join(os.path.dirname(__file__), "data", "rerank")
    os.makedirs(data_dir, exist_ok=True)
    path = os.path.join(data_dir, f"{year}_{team_slug}.json")
    with open(path, "w", encoding="utf-8") as f:
        json.dump(players_clean, f, ensure_ascii=False, indent=2)

    return {"ok": True, "saved": len(players_clean), "total_points": total, "avg_points": avg, "class_id": rerank.id}

# Admin endpoints (MVP: no strict RBAC; if token present, allow manage own; otherwise allow read-only)
@app.get("/api/admin/analyses")
async def list_analyses(db: Session = Depends(get_db), authorization: Optional[str] = Header(default=None, alias="Authorization")):
    user = get_current_user_db(db, authorization)
    q = db.query(models.AnalyzeResult).order_by(models.AnalyzeResult.created_at.desc())
    if user:
        q = q
    rows = q.limit(200).all()
    return [{
        "id": r.id,
        "player_name": r.player_name,
        "summary": r.summary,
        "scores": r.scores,
        "created_at": r.created_at.isoformat(),
    } for r in rows]

@app.delete("/api/admin/analyses/{analysis_id}")
async def delete_analysis(analysis_id: int, db: Session = Depends(get_db), authorization: Optional[str] = Header(default=None, alias="Authorization")):
    user = get_current_user_db(db, authorization)
    row = db.get(models.AnalyzeResult, analysis_id)
    if not row:
        raise HTTPException(status_code=404, detail="Not found")
    if user and row.created_by and row.created_by != user.id:
        raise HTTPException(status_code=403, detail="Forbidden")
    db.delete(row)
    db.commit()
    return {"ok": True}

@app.get("/api/admin/classes")
async def list_classes(db: Session = Depends(get_db)):
    rows = db.query(models.RerankClass).order_by(models.RerankClass.year.desc()).limit(200).all()
    return [{
        "id": r.id,
        "year": r.year,
        "team": r.team,
        "total_points": r.total_points,
        "avg_points": r.avg_points,
        "created_at": r.created_at.isoformat(),
    } for r in rows]

@app.get("/api/admin/classes/{class_id}")
async def get_class(class_id: int, db: Session = Depends(get_db)):
    rc = db.get(models.RerankClass, class_id)
    if not rc:
        raise HTTPException(status_code=404, detail="Not found")
    players = db.query(models.RerankPlayer).filter(models.RerankPlayer.class_id == class_id).all()
    return {
        "id": rc.id,
        "year": rc.year,
        "team": rc.team,
        "total_points": rc.total_points,
        "avg_points": rc.avg_points,
        "players": [{"id": p.id, "name": p.name, "points": p.points, "note": p.note} for p in players],
    }

class UpdateClassPayload(BaseModel):
    team: Optional[str] = None
    year: Optional[int] = None
    players: Optional[List[Dict[str, Any]]] = None

@app.put("/api/admin/classes/{class_id}")
async def update_class(class_id: int, payload: UpdateClassPayload, db: Session = Depends(get_db)):
    rc = db.get(models.RerankClass, class_id)
    if not rc:
        raise HTTPException(status_code=404, detail="Not found")
    if payload.team is not None:
        rc.team = payload.team
    if payload.year is not None:
        rc.year = int(payload.year)
    if payload.players is not None:
        # replace players
        db.query(models.RerankPlayer).filter(models.RerankPlayer.class_id == class_id).delete()
        total = 0
        for p in payload.players:
            name = str(p.get("name", "")).strip()
            if not name:
                continue
            points = int(p.get("points", 0))
            note = str(p.get("note", "")).strip()
            total += points
            db.add(models.RerankPlayer(class_id=class_id, name=name, points=points, note=note))
        rc.total_points = total
        rc.avg_points = round(total / max(1, len(payload.players)), 2) if payload.players else 0
    db.commit()
    return {"ok": True}

@app.delete("/api/admin/classes/{class_id}")
async def delete_class(class_id: int, db: Session = Depends(get_db)):
    rc = db.get(models.RerankClass, class_id)
    if not rc:
        raise HTTPException(status_code=404, detail="Not found")
    db.query(models.RerankPlayer).filter(models.RerankPlayer.class_id == class_id).delete()
    db.delete(rc)
    db.commit()
    return {"ok": True}

# Static dashboard
static_dir = os.path.join(os.path.dirname(__file__), "static")
if not os.path.isdir(static_dir):
    os.makedirs(static_dir, exist_ok=True)

@app.get("/")
async def dashboard_index():
    index_path = os.path.join(static_dir, "index.html")
    return FileResponse(index_path)

app.mount("/static", StaticFiles(directory=static_dir), name="static")