from typing import List, Dict, Any
from textblob import TextBlob
import re

TEAM_WORDS = {
    "we", "us", "team", "together", "brothers", "family", "coach", "program", "win", "work", "practice"
}
SELF_WORDS = {"i", "me", "my", "mine"}

POSITIVE_BEHAVIORS = {
    "congrats", "proud", "blessed", "grateful", "honored", "thank", "respect", "humble"
}
NEGATIVE_BEHAVIORS = {"trash", "hate", "anger", "mad", "blame"}


def _tokenize(text: str) -> List[str]:
    return re.findall(r"[A-Za-z']+", text.lower())


def analyze_text_cues(texts: List[str]) -> Dict[str, Any]:
    if not texts:
        return {"summary": "No text available.", "signals": {}, "sentiments": []}

    sentiments = []
    team_count = 0
    self_count = 0
    pos_behaviors = 0
    neg_behaviors = 0

    for t in texts:
        blob = TextBlob(t)
        sentiments.append(float(blob.sentiment.polarity))
        tokens = _tokenize(t)
        team_count += sum(1 for tok in tokens if tok in TEAM_WORDS)
        self_count += sum(1 for tok in tokens if tok in SELF_WORDS)
        pos_behaviors += sum(1 for tok in tokens if tok in POSITIVE_BEHAVIORS)
        neg_behaviors += sum(1 for tok in tokens if tok in NEGATIVE_BEHAVIORS)

    avg_sentiment = sum(sentiments) / len(sentiments)
    signals = {
        "avg_sentiment": avg_sentiment,
        "team_word_freq": team_count / max(1, len(texts)),
        "self_word_freq": self_count / max(1, len(texts)),
        "positive_behavior_freq": pos_behaviors / max(1, len(texts)),
        "negative_behavior_freq": neg_behaviors / max(1, len(texts)),
    }

    summary = (
        "Language indicates {} sentiment, {} focus, and {} behavior.".format(
            "positive" if avg_sentiment >= 0.1 else ("neutral" if avg_sentiment > -0.1 else "negative"),
            "team-first" if team_count >= self_count else "self-first",
            "constructive" if pos_behaviors >= neg_behaviors else "concerning",
        )
    )

    return {"summary": summary, "signals": signals, "sentiments": sentiments}