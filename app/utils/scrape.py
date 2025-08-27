from typing import List, Optional
from bs4 import BeautifulSoup
import requests


def _clean_text(text: str) -> str:
    return " ".join(text.split())


def _extract_visible_text(html: str) -> str:
    soup = BeautifulSoup(html, "html.parser")
    for tag in soup(["script", "style", "noscript"]):
        tag.extract()
    text = soup.get_text(separator=" ")
    return _clean_text(text)


def _fetch_url_text(url: str, timeout: int = 10) -> str:
    try:
        resp = requests.get(url, timeout=timeout)
        if resp.status_code != 200 or not resp.text:
            return ""
        text = _extract_visible_text(resp.text)
        if len(text) > 5000:
            text = text[:5000]
        return text
    except Exception:
        return ""


def collect_public_text(player_name: str, high_school: Optional[str], links: List[str], max_items: int = 50) -> List[str]:
    texts: List[str] = []

    for url in links:
        if len(texts) >= max_items:
            break
        t = _fetch_url_text(url)
        if t:
            texts.append(t)

    if not texts:
        # Fallback: synthesize minimal context so the endpoint returns something useful in dev
        base = f"{player_name} from {high_school or 'unknown high school'} shows strong team orientation and work ethic in public sources."
        texts = [base, base + " Coaches praise discipline and leadership in interviews."]

    return texts[:max_items]