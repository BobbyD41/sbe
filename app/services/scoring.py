from typing import Dict, Any


def _clamp(value: float, lo: float = 0.0, hi: float = 100.0) -> float:
    return max(lo, min(hi, value))


def aggregate_scores(analysis: Dict[str, Any]) -> Dict[str, float]:
    sigs = analysis.get("signals", {})
    avg_sent = float(sigs.get("avg_sentiment", 0.0))
    team_freq = float(sigs.get("team_word_freq", 0.0))
    self_freq = float(sigs.get("self_word_freq", 0.0))
    pos_freq = float(sigs.get("positive_behavior_freq", 0.0))
    neg_freq = float(sigs.get("negative_behavior_freq", 0.0))

    coachability = 50 + (avg_sent * 30) + (pos_freq * 10) - (neg_freq * 20)
    leadership = 50 + (team_freq * 15) - (self_freq * 10)
    ego = 50 + (self_freq * 20) - (team_freq * 10)
    team_fit = 50 + (team_freq * 25) + (avg_sent * 20) - (neg_freq * 15)

    return {
        "Coachability": round(_clamp(coachability), 1),
        "Leadership": round(_clamp(leadership), 1),
        "Ego": round(_clamp(ego), 1),
        "Team Fit": round(_clamp(team_fit), 1),
    }