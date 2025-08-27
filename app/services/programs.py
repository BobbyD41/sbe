from typing import Dict, List, Tuple
import math

# Simple illustrative program culture profiles (weights/preferences)
# Scores are 0..100; lower Ego is better, others higher is better
PROGRAM_PROFILES: Dict[str, Dict[str, float]] = {
    "Stanford": {"Coachability": 80.0, "Leadership": 85.0, "Ego": 30.0, "Team Fit": 88.0},
    "Northwestern": {"Coachability": 78.0, "Leadership": 82.0, "Ego": 35.0, "Team Fit": 84.0},
    "Texas": {"Coachability": 70.0, "Leadership": 75.0, "Ego": 40.0, "Team Fit": 80.0},
    "Alabama": {"Coachability": 82.0, "Leadership": 88.0, "Ego": 35.0, "Team Fit": 90.0},
    "Georgia": {"Coachability": 80.0, "Leadership": 86.0, "Ego": 35.0, "Team Fit": 88.0},
    "Oklahoma State": {"Coachability": 72.0, "Leadership": 78.0, "Ego": 40.0, "Team Fit": 82.0},
}

WEIGHTS: Dict[str, float] = {
    "Coachability": 0.35,
    "Leadership": 0.30,
    "Ego": 0.15,
    "Team Fit": 0.20,
}


def _distance_program(preferred: Dict[str, float], player: Dict[str, float]) -> float:
    # Treat Ego inversely: convert to desired low value by flipping player's ego
    # But since profiles already encode desired Ego, use direct difference
    total = 0.0
    for k, w in WEIGHTS.items():
        pv = player.get(k, 50.0)
        gv = preferred.get(k, 50.0)
        d = (pv - gv)
        total += w * (d * d)
    return math.sqrt(total)


def match_program_fits(player_scores: Dict[str, float], top_k: int = 10) -> List[Dict[str, float]]:
    distances: List[Tuple[str, float]] = []
    for program, profile in PROGRAM_PROFILES.items():
        dist = _distance_program(profile, player_scores)
        distances.append((program, dist))
    # Convert distance to a similarity-style fit percentage
    # Normalize by a rough max distance scale (~100 per dim)
    results = []
    for program, dist in sorted(distances, key=lambda x: x[1]):
        fit = max(0.0, 100.0 - (dist * 2.0))
        results.append({"program": program, "fit": round(fit, 1)})
    return results[:top_k]