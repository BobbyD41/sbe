from fastapi import FastAPI, HTTPException, Depends, Header
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
from dotenv import load_dotenv
load_dotenv()
import requests
import os
import json
import requests
from dotenv import load_dotenv
from concurrent.futures import ThreadPoolExecutor, as_completed

from .services.nlp import analyze_text_cues
from .services.scoring import aggregate_scores
from .utils.scrape import collect_public_text
from .services.programs import PROGRAM_PROFILES, match_program_fits
from .services.rerank import get_class_summary

# DB and models
from .db import SessionLocal, engine, Base
from . import models
from sqlalchemy.orm import Session
from sqlalchemy import desc

# Security
from .services.security import hash_password, verify_password, create_access_token, decode_token

# load .env early
load_dotenv()

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

# Outcome mapping
OUTCOME_POINTS: Dict[str, int] = {
    "Bust": 0,
    "4 Year Contributor": 1,
    "College Starter": 2,
    "All Conference": 3,
    "All American": 4,
    "Undrafted NFL Roster": 5,
    "NFL Drafted": 6,
    "NFL Starter": 7,
    "NFL Pro Bowl": 8,
}

# Team name normalization
def normalize_team_name(name: str) -> str:
    try:
        cleaned = str(name or "").strip()
        # Simple title-case normalization to ensure leading capitals (e.g., 'oklahoma state' -> 'Oklahoma State')
        return cleaned.title()
    except Exception:
        return str(name or "").strip()

# Dependency
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@app.get("/")
async def root():
    return {"message": "College Football Vibe Monitor API", "status": "running"}


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

class RecruitPayload(BaseModel):
    year: int
    team: str
    recruits: List[Dict[str, Any]]

class RecruitOutcomeUpdate(BaseModel):
    id: int
    outcome: str

class RecruitOutcomePayload(BaseModel):
    year: int
    team: str
    updates: List[RecruitOutcomeUpdate]

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
    team = normalize_team_name(team)
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

# Recruits: upload/list and recalc rerank from recruits
@app.post("/api/recruits/upload")
async def upload_recruits(payload: RecruitPayload, db: Session = Depends(get_db)):
    # Upsert simplistic: delete existing year/team then insert
    db.query(models.Recruit).filter(models.Recruit.year == payload.year, models.Recruit.team == payload.team).delete()
    count = 0
    for r in payload.recruits:
        name = str(r.get("name", "")).strip()
        if not name:
            continue
        rec = models.Recruit(
            year=int(payload.year),
            team=payload.team.strip(),
            name=name,
            position=str(r.get("position", "")).strip(),
            stars=int(r.get("stars", 0) or 0),
            rank=int(r.get("rank", 0) or 0),
            outcome=str(r.get("outcome", "")).strip(),
            points=int(r.get("points", 0) or 0),
            note=str(r.get("note", "")).strip(),
            source=str(r.get("source", "")).strip(),
        )
        db.add(rec)
        count += 1
    db.commit()
    return {"ok": True, "saved": count}

@app.get("/api/recruits/{year}/{team}")
async def list_recruits(year: int, team: str, db: Session = Depends(get_db)):
    team = normalize_team_name(team)
    rows = db.query(models.Recruit).filter(models.Recruit.year == year, models.Recruit.team == team).order_by(models.Recruit.rank.asc()).all()
    return [{
        "id": r.id,
        "name": r.name,
        "position": r.position,
        "stars": r.stars,
        "rank": r.rank,
        "outcome": r.outcome,
        "points": r.points,
        "note": r.note,
        "source": r.source,
    } for r in rows]

@app.post("/api/recruits/recalc/{year}/{team}")
async def recalc_rerank_from_recruits(year: int, team: str, db: Session = Depends(get_db)):
    team = normalize_team_name(team)
    rows = db.query(models.Recruit).filter(models.Recruit.year == year, models.Recruit.team == team).all()
    if not rows:
        raise HTTPException(status_code=404, detail="No recruits for year/team")
    players = [{"name": r.name, "points": int(r.points or 0), "note": r.note} for r in rows]
    total = sum(p["points"] for p in players)
    avg = round(total / max(1, len(players)), 2)

    # Enforce single snapshot per team/year: delete previous snapshots and players
    old_classes = db.query(models.RerankClass).filter(models.RerankClass.year == year, models.RerankClass.team == team).all()
    for oc in old_classes:
        db.query(models.RerankPlayer).filter(models.RerankPlayer.class_id == oc.id).delete()
        db.delete(oc)
    db.commit()

    # Persist new class snapshot
    rc = models.RerankClass(year=year, team=team, total_points=total, avg_points=avg)
    db.add(rc)
    db.commit()
    db.refresh(rc)
    for p in players:
        db.add(models.RerankPlayer(class_id=rc.id, name=p["name"], points=p["points"], note=p["note"]))
    db.commit()

    return {"ok": True, "class_id": rc.id, "total_points": total, "avg_points": avg}

@app.get("/api/leaderboard/rerank/{year}")
async def rerank_leaderboard(year: int, db: Session = Depends(get_db)):
    # Latest snapshot per normalized team name for the year
    classes = db.query(models.RerankClass).filter(models.RerankClass.year == year).order_by(models.RerankClass.created_at.desc()).all()
    latest_by_team: Dict[str, models.RerankClass] = {}
    for rc in classes:
        key = normalize_team_name(rc.team)
        if key not in latest_by_team:
            latest_by_team[key] = rc
    # Build rows with commits count
    rows = []
    for team_name, rc in latest_by_team.items():
        commits = db.query(models.RerankPlayer).filter(models.RerankPlayer.class_id == rc.id).count()
        rows.append({
            "team": normalize_team_name(team_name),
            "year": rc.year,
            "class_id": rc.id,
            "total_points": rc.total_points,
            "avg_points": rc.avg_points,
            "commits": commits,
        })
    rows.sort(key=lambda r: r["total_points"], reverse=True)
    # Assign ranks (1-based, ties share same rank positionally)
    for idx, r in enumerate(rows, start=1):
        r["rank"] = idx
    return {"year": year, "count": len(rows), "rows": rows}

@app.get("/api/rerank/meta")
async def rerank_meta(year: int, team: str, db: Session = Depends(get_db)):
    team = normalize_team_name(team)
    # latest snapshot for team
    rc = (
        db.query(models.RerankClass)
        .filter(models.RerankClass.year == year, models.RerankClass.team == team)
        .order_by(models.RerankClass.created_at.desc())
        .first()
    )
    if not rc:
        raise HTTPException(status_code=404, detail="No rerank snapshot for team/year")
    commits = db.query(models.RerankPlayer).filter(models.RerankPlayer.class_id == rc.id).count()
    # Compute national rank by comparing against latest snapshots for all teams in that year
    leaderboard = await rerank_leaderboard(year, db)  # type: ignore
    rank = None
    for row in leaderboard["rows"]:
        if normalize_team_name(row["team"]) == team:
            rank = row["rank"]
            break
    return {
        "year": year,
        "team": team,
        "class_id": rc.id,
        "rank": rank,
        "total_points": rc.total_points,
        "avg_points": rc.avg_points,
        "commits": commits,
    }

@app.post("/api/recruits/outcomes")
async def update_recruit_outcomes(payload: RecruitOutcomePayload, db: Session = Depends(get_db)):
    changed = 0
    for u in payload.updates:
        row = db.get(models.Recruit, u.id)
        if not row:
            continue
        if row.year != payload.year or row.team != payload.team:
            continue
        pts = OUTCOME_POINTS.get(u.outcome.strip(), None)
        if pts is None:
            raise HTTPException(status_code=400, detail=f"Unknown outcome: {u.outcome}")
        row.outcome = u.outcome.strip()
        row.points = int(pts)
        changed += 1
    db.commit()
    return {"ok": True, "updated": changed}

@app.post("/api/import/cfbd/{year}/{team}")
async def import_cfbd(year: int, team: str, db: Session = Depends(get_db)):
    team = normalize_team_name(team)
    api_key = os.environ.get("CFBD_API_KEY", "")
    if not api_key:
        raise HTTPException(status_code=400, detail="Missing CFBD_API_KEY env var")
    url = "https://api.collegefootballdata.com/recruiting/players"
    params = {"year": year, "team": team}
    headers = {"Authorization": f"Bearer {api_key}"}
    try:
        resp = requests.get(url, params=params, headers=headers, timeout=30)
        if resp.status_code != 200:
            raise HTTPException(status_code=resp.status_code, detail=f"CFBD error: {resp.text[:200]}")
        data = resp.json() or []
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"CFBD request failed: {e}")

    # Map CFBD fields to Recruit
    db.query(models.Recruit).filter(models.Recruit.year == year, models.Recruit.team == team).delete()
    saved = 0
    for it in data:
        name = str(it.get("athleteName") or it.get("name") or "").strip()
        if not name:
            continue
        position = str(it.get("position") or "").strip()
        stars = int((it.get("stars") or 0) or 0)
        rank = int(it.get("ranking") or it.get("compositeRanking") or it.get("overallRank") or 0)
        rec = models.Recruit(
            year=year,
            team=team,
            name=name,
            position=position,
            stars=stars,
            rank=rank,
            outcome="",
            points=0,
            note="",
            source="cfbd",
        )
        db.add(rec)
        saved += 1
    db.commit()
    return {"ok": True, "imported": saved}

@app.post("/api/import/cfbd/class")
async def import_cfbd_class(year: int, team: str, db: Session = Depends(get_db)):
    team = normalize_team_name(team)
    api_key = os.environ.get("CFBD_API_KEY", "")
    if not api_key:
        raise HTTPException(status_code=400, detail="Missing CFBD_API_KEY env var")
    headers = {"Authorization": f"Bearer {api_key}"}

    # Team class metadata
    try:
        t_resp = requests.get(
            "https://api.collegefootballdata.com/recruiting/teams",
            params={"year": year, "team": team}, headers=headers, timeout=30
        )
        if t_resp.status_code != 200:
            raise HTTPException(status_code=t_resp.status_code, detail=f"CFBD teams error: {t_resp.text[:200]}")
        t_data = (t_resp.json() or [])
        meta = (t_data[0] if t_data else {})
        national_rank = int(meta.get("rank", 0) or 0)
        points = float(meta.get("points", 0.0) or 0.0)
        avg_rating = float(meta.get("averageRating", 0.0) or 0.0)
        avg_stars = float(meta.get("averageStars", 0.0) or 0.0)
        commits = int(meta.get("commits", 0) or 0)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"CFBD teams request failed: {e}")

    # Players
    try:
        p_resp = requests.get(
            "https://api.collegefootballdata.com/recruiting/players",
            params={"year": year, "team": team}, headers=headers, timeout=30
        )
        if p_resp.status_code != 200:
            raise HTTPException(status_code=p_resp.status_code, detail=f"CFBD players error: {p_resp.text[:200]}")
        players = (p_resp.json() or [])
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"CFBD players request failed: {e}")

    items = []
    ratings: List[float] = []
    stars_list: List[int] = []
    for it in players:
        name = str(it.get("athleteName") or it.get("name") or "").strip()
        if not name:
            continue
        rating = float(it.get("rating") or it.get("compositeRating") or 0.0)
        provided_rank = int(it.get("ranking") or it.get("compositeRanking") or it.get("overallRank") or 0)
        position = str(it.get("position") or "").strip()
        stars = int((it.get("stars") or 0) or 0)
        items.append({
            "name": name,
            "rating": rating,
            "rank": provided_rank,
            "position": position,
            "stars": stars,
        })
        if rating > 0:
            ratings.append(rating)
        if stars > 0:
            stars_list.append(stars)

    # Fallbacks if team meta lacked data
    if commits == 0:
        commits = len(items)
    if avg_rating == 0.0 and ratings:
        avg_rating = round(sum(ratings) / len(ratings), 4)
    if avg_stars == 0.0 and stars_list:
        avg_stars = round(sum(stars_list) / len(stars_list), 3)

    # Fill missing individual ranks by rating
    missing = [x for x in items if not x["rank"]]
    if missing:
        sorted_all = sorted(items, key=lambda x: x["rating"], reverse=True)
        rank_map = {x["name"]: i + 1 for i, x in enumerate(sorted_all)}
        for x in items:
            if not x["rank"]:
                x["rank"] = rank_map.get(x["name"], 0)

    # Upsert recruits
    db.query(models.Recruit).filter(models.Recruit.year == year, models.Recruit.team == team).delete()
    saved = 0
    for x in items:
        note = f"rating:{x['rating']}"
        rec = models.Recruit(
            year=year,
            team=team,
            name=x["name"],
            position=x["position"],
            stars=x["stars"],
            rank=x["rank"],
            outcome="",
            points=0,
            note=note,
            source="cfbd",
        )
        db.add(rec)
        saved += 1
    db.commit()

    # Upsert class meta
    existing = db.query(models.ClassMeta).filter(models.ClassMeta.year == year, models.ClassMeta.team == team).first()
    if existing:
        existing.national_rank = national_rank
        existing.points = points
        existing.avg_rating = avg_rating
        existing.avg_stars = avg_stars
        existing.commits = commits
    else:
        db.add(models.ClassMeta(
            year=year, team=team, national_rank=national_rank, points=points,
            avg_rating=avg_rating, avg_stars=avg_stars, commits=commits
        ))
    db.commit()

    return {"ok": True, "imported": saved, "meta": {
        "national_rank": national_rank, "points": points, "avg_rating": avg_rating, "avg_stars": avg_stars, "commits": commits
    }}

@app.post("/api/import/cfbd/all/{year}")
async def import_cfbd_all(year: int, db: Session = Depends(get_db)):
    api_key = os.environ.get("CFBD_API_KEY", "")
    if not api_key:
        raise HTTPException(status_code=400, detail="Missing CFBD_API_KEY env var")
    headers = {"Authorization": f"Bearer {api_key}"}

    # Get all teams with recruiting class for the year
    try:
        t_resp = requests.get(
            "https://api.collegefootballdata.com/recruiting/teams",
            params={"year": year}, headers=headers, timeout=30
        )
        if t_resp.status_code != 200:
            raise HTTPException(status_code=t_resp.status_code, detail=f"CFBD teams error: {t_resp.text[:200]}")
        t_data = (t_resp.json() or [])
        teams = [normalize_team_name(t.get("team") or t.get("school")) for t in t_data if (t.get("team") or t.get("school"))]
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"CFBD teams request failed: {e}")

    imported = 0
    errors: Dict[str, str] = {}
    # Run sequentially to avoid rate limiting; switch to small thread pool if desired
    for team in teams:
        try:
            _ = await import_cfbd_class(year, str(team), db)  # type: ignore
            imported += 1
        except Exception as e:  # noqa: BLE001
            errors[str(team)] = str(e)

    return {"ok": True, "year": year, "teams": len(teams), "imported": imported, "errors": errors}

@app.get("/api/class/meta")
async def get_class_meta(year: int, team: str, db: Session = Depends(get_db)):
    team = normalize_team_name(team)
    cm = db.query(models.ClassMeta).filter(models.ClassMeta.year == year, models.ClassMeta.team == team).first()
    if not cm:
        raise HTTPException(status_code=404, detail="Class metadata not found")
    return {
        "year": cm.year,
        "team": cm.team,
        "national_rank": cm.national_rank,
        "points": cm.points,
        "avg_rating": cm.avg_rating,
        "avg_stars": cm.avg_stars,
        "commits": cm.commits,
    }

@app.post("/api/find")
async def find_and_build(year: int, team: str, db: Session = Depends(get_db)):
    team = normalize_team_name(team)
    _ = await import_cfbd_class(year, team, db)  # type: ignore
    _ = await recalc_rerank_from_recruits(year, team, db)  # type: ignore
    return {"ok": True, "message": "Imported (teams+players) and recalculated"}

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

@app.get("/api/import/cfbd/status")
async def cfbd_status():
    api_key = os.environ.get("CFBD_API_KEY", "")
    if not api_key:
        return {"ok": False, "has_key": False, "reachable": False, "detail": "CFBD_API_KEY missing"}
    try:
        url = "https://api.collegefootballdata.com/recruiting/players"
        params = {"year": 2002, "team": "Oklahoma State"}
        headers = {"Authorization": f"Bearer {api_key}"}
        resp = requests.get(url, params=params, headers=headers, timeout=10)
        reachable = resp.status_code == 200
        return {"ok": reachable, "has_key": True, "reachable": reachable, "status": resp.status_code}
    except Exception as e:
        return {"ok": False, "has_key": True, "reachable": False, "detail": str(e)}


# Static dashboard
static_dir = os.path.join(os.path.dirname(__file__), "static")
if not os.path.isdir(static_dir):
    os.makedirs(static_dir, exist_ok=True)

@app.get("/")
async def dashboard_index():
    index_path = os.path.join(static_dir, "index.html")
    return FileResponse(index_path)

app.mount("/static", StaticFiles(directory=static_dir), name="static")

@app.get("/api/import/cfbd/status")
async def cfbd_status():
    api_key = os.environ.get("CFBD_API_KEY", "")
    if not api_key:
        return {"ok": False, "has_key": False, "reachable": False, "detail": "CFBD_API_KEY missing"}
    try:
        url = "https://api.collegefootballdata.com/recruiting/players"
        params = {"year": 2002, "team": "Oklahoma State"}
        headers = {"Authorization": f"Bearer {api_key}"}
        resp = requests.get(url, params=params, headers=headers, timeout=10)
        reachable = resp.status_code == 200
        return {"ok": reachable, "has_key": True, "reachable": reachable, "status": resp.status_code}
    except Exception as e:
        return {"ok": False, "has_key": True, "reachable": False, "detail": str(e)}