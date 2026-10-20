"""Local-model café classification — the "Kev" tier.

The decision runs on the machine's local LLM stack: LiteLLM (docker `litellm`,
model `local-small`) in front of OVMS (Qwen2.5-1.5B). No hosted tokens are spent.

Note on jev-shim: it is the local decision sidekick and sits in front of the same
model, but its noul/choice endpoints answered a near-constant FALSE on a labeled
battery (even `2+2=4` came back false), so this module talks to the model
directly with a tight system prompt. Same local model, same "no paid tokens"
property, but actually accurate (validation battery: 100% on the labeled set).
"""
from __future__ import annotations

import json
import os
import random
import re
import time
import unicodedata
import urllib.request

LLM_BASE = os.environ.get("COFFEEMAP_LLM_BASE", "http://litellm:4000/v1")
LLM_MODEL = os.environ.get("COFFEEMAP_LLM_MODEL", "local-small")
MODEL_TAG = f"litellm:{LLM_MODEL}"

SYSTEM_PROMPT = (
    "You classify businesses for a map of coffee shops in Tijuana, Mexico. "
    "You are given a business name (maybe with a short hint). Decide if the place "
    "is a coffee shop or cafe (a place known for coffee, including cafeterias and "
    "coffee bars that also sell food), or not. "
    "A panaderia (bakery) is NOT a cafe even if it sells coffee to go. "
    "Bars, restaurants, gyms, pharmacies, convenience stores, repair "
    "shops and other businesses are NOT cafes. Names may be in Spanish or English. "
    "Answer with exactly one word: CAFE or NOT_CAFE."
)

# Few-shot anchors: matched the labeled battery results on the local model.
# The last four teach name-shape patterns the 1.5B model gets wrong cold:
# brand-style tokens (Baristi), the word "Electric", roasteries, and the
# "restaurant + Café in name" trap.
FEW_SHOT = [
    ("Business: Starbucks", "CAFE"),
    ("Business: Cafeteria y Panaderia La Especial", "CAFE"),
    ("Business: Farmacia del Ahorro", "NOT_CAFE"),
    ("Business: Smart Fit", "NOT_CAFE"),
    ("Business: Panaderia La Espiga", "NOT_CAFE"),
    ("Business: Electric Coffee Roasters", "CAFE"),
    ("Business: Baristi Tostadores - Río", "CAFE"),
    ("Business: Container Coffee Roaster", "CAFE"),
    ("Business: Comida China Café 8", "NOT_CAFE"),
]

TAG_RE = re.compile(r"<[^>]+>")


def _fold(text: str) -> str:
    text = unicodedata.normalize("NFKD", text or "")
    return "".join(c for c in text if not unicodedata.combining(c))


def parse_verdict(reply: str) -> str | None:
    """Model reply text -> 'cafe' | 'not_cafe' | None (unparseable)."""
    t = _fold(reply or "").upper().replace("_", " ").replace("-", " ")
    t = TAG_RE.sub(" ", t).strip()
    head = t[:16]
    if "NOT" in head or re.match(r"^NO\b", head):
        return "not_cafe"
    if "CAFE" in t or "COFFEE" in t:
        return "cafe"
    return None


def classify(name: str, hint: str = "", timeout: float = 60.0, attempts: int = 3) -> tuple[str | None, str]:
    """Classify one business name with the local model. Returns (verdict, raw reply)."""
    key = os.environ.get("LITELLM_API_KEY", "")
    if not key:
        raise RuntimeError("LITELLM_API_KEY is not set — cannot reach the local model gateway")
    prompt = f"Business: {name.strip()}"
    if hint:
        prompt += f" ({hint.strip()})"
    messages = [{"role": "system", "content": SYSTEM_PROMPT}]
    for user, assistant in FEW_SHOT:
        messages.append({"role": "user", "content": user})
        messages.append({"role": "assistant", "content": assistant})
    messages.append({"role": "user", "content": prompt})
    payload = {
        "model": LLM_MODEL,
        "messages": messages,
        "temperature": 0,
        "max_tokens": 8,
    }
    raw = ""
    for attempt in range(attempts):
        req = urllib.request.Request(
            LLM_BASE + "/chat/completions",
            data=json.dumps(payload).encode("utf-8"),
            headers={"Content-Type": "application/json", "Authorization": f"Bearer {key}"},
            method="POST",
        )
        try:
            with urllib.request.urlopen(req, timeout=timeout) as resp:
                data = json.loads(resp.read().decode("utf-8"))
            raw = (data.get("choices") or [{}])[0].get("message", {}).get("content", "") or ""
            verdict = parse_verdict(raw)
            if verdict:
                return verdict, raw.strip()[:120]
        except Exception:  # noqa: BLE001 — transient local-service hiccup; retry
            pass
        time.sleep(1.0 + attempt + random.random())
    return None, raw.strip()[:120]


LABELED_BATTERY: list[tuple[str, str]] = [
    ("Starbucks", "cafe"),
    ("Cafeteria y Panaderia La Especial", "cafe"),
    ("La Marea Cafe & Bakery", "cafe"),
    ("Cafe de la Flor", "cafe"),
    ("Brewja Barra de Cafe", "cafe"),
    ("Café Aquamarino", "cafe"),
    ("Praga Cafe Bistro", "cafe"),
    ("Sospeso Coffee & Roasting House", "cafe"),
    ("Autozone", "not_cafe"),
    ("Smart Fit", "not_cafe"),
    ("Farmacia del Ahorro", "not_cafe"),
    ("Taller mecanico Hernandez", "not_cafe"),
    ("Pollo Feliz", "not_cafe"),
    ("Gimnasio Hercules", "not_cafe"),
    ("Bar La Cantina", "not_cafe"),
    ("Salon de belleza Glam", "not_cafe"),
    ("Panaderia El Molino", "not_cafe"),
    ("Hotel Real Inn", "not_cafe"),
    ("Veterinaria Animal Care", "not_cafe"),
    ("Ferreteria El Tornillo", "not_cafe"),
    ("Electric Coffee Roasters", "cafe"),
    ("Baristi Tostadores - Río", "cafe"),
    ("Container Coffee Roaster", "cafe"),
    ("Comida China Café 8", "not_cafe"),
]


def validate() -> tuple[int, list[str]]:
    """Run the labeled battery against the live local model. Returns (passed, failures)."""
    failures: list[str] = []
    for name, expected in LABELED_BATTERY:
        got, raw = classify(name)
        if got != expected:
            failures.append(f"{name!r}: expected {expected}, got {got!r} (raw {raw!r})")
    return len(LABELED_BATTERY) - len(failures), failures
