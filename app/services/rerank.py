from typing import Dict, List, Any
import json
import os

# Point system reference (for documentation)
POINT_SYSTEM = {
    "Left Team/Little Contribution/Bust": 0,
    "4 Year Contributor": 1,
    "College Starter": 2,
    "All Conference": 3,
    "All American": 4,
    "Undrafted but made NFL Roster": 5,
    "NFL Drafted": 6,
    "NFL Starter": 7,
    "NFL Pro Bowl": 8,
}

DATA_DIR = os.path.join(os.path.dirname(__file__), "..", "data", "rerank")


def _load_class_file(year: int, team_slug: str) -> List[Dict[str, Any]]:
    path = os.path.join(DATA_DIR, f"{year}_{team_slug}.json")
    if not os.path.isfile(path):
        return []
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


def _slugify_team(team: str) -> str:
    return team.strip().lower().replace(" ", "_")


def get_class_summary(year: int, team: str) -> Dict[str, Any]:
    team_slug = _slugify_team(team)
    players = _load_class_file(year, team_slug)
    if not players:
        return {"year": year, "team": team, "players": [], "total_points": 0, "avg_points": 0.0}

    # Ensure points and sort
    for p in players:
        p["points"] = int(p.get("points", 0))
    players_sorted = sorted(players, key=lambda x: x.get("points", 0), reverse=True)

    total = sum(p.get("points", 0) for p in players_sorted)
    avg = total / max(1, len(players_sorted))
    return {
        "year": year,
        "team": team,
        "players": players_sorted,
        "total_points": total,
        "avg_points": round(avg, 2),
    }