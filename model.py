"""
model.py — Gọi HuggingFace Inference API
─────────────────────────────────────────
Không load model local → chỉ cần ~50MB RAM
Phù hợp deploy lên Koyeb free tier
"""

import os
import time
import requests

# ─── Config ───────────────────────────────────────────────────────────────────
HF_TOKEN   = os.getenv("HF_TOKEN", "hf_...")
MODEL_NAME = "LHUThacSi/phobert-mu-sentiment"
API_URL    = f"https://api-inference.huggingface.co/models/{MODEL_NAME}"
HEADERS    = {"Authorization": f"Bearer {HF_TOKEN}"}

LABEL_VI = {
    "negative": "Tiêu cực",
    "neutral" : "Trung tính",
    "positive": "Tích cực",
}


def load_model():
    """Warm up model — gọi 1 lần khi khởi động để tránh cold start."""
    print(f"⏳ Warming up HF Inference API: {MODEL_NAME}...")
    try:
        res = requests.post(API_URL, headers=HEADERS,
                            json={"inputs": "test"}, timeout=30)
        if res.status_code == 503:
            # Model đang load trên HF server — chờ
            print("   Model đang khởi động trên HF, chờ 20s...")
            time.sleep(20)
        print("✅ HF Inference API sẵn sàng!")
    except Exception as e:
        print(f"⚠️  Warm up lỗi (bỏ qua): {e}")


def _call_api(text: str, retries: int = 3) -> list:
    """Gọi HF API với retry nếu model đang load (503)."""
    for attempt in range(retries):
        res = requests.post(
            API_URL,
            headers=HEADERS,
            json={"inputs": str(text)},
            timeout=30,
        )
        if res.status_code == 200:
            return res.json()
        if res.status_code == 503:
            wait = 10 * (attempt + 1)
            print(f"   Model đang load, chờ {wait}s...")
            time.sleep(wait)
        else:
            raise Exception(f"HF API lỗi {res.status_code}: {res.text}")
    raise Exception("HF API không phản hồi sau nhiều lần thử")


def predict_one(text: str) -> dict:
    """Predict sentiment cho 1 câu."""
    result = _call_api(text)

    # HF trả về: [[{"label": "negative", "score": 0.8}, ...]]
    scores_raw = result[0] if isinstance(result[0], list) else result
    scores = {item["label"].lower(): item["score"] for item in scores_raw}

    label = max(scores, key=scores.get)

    return {
        "label"   : label,
        "label_vi": LABEL_VI.get(label, label),
        "scores"  : {
            "negative": round(scores.get("negative", 0), 4),
            "neutral" : round(scores.get("neutral",  0), 4),
            "positive": round(scores.get("positive", 0), 4),
        },
    }


def predict_batch(texts: list) -> dict:
    """Predict sentiment cho danh sách câu."""
    results = []
    counts  = {"negative": 0, "neutral": 0, "positive": 0}

    for text in texts:
        r = predict_one(str(text))
        r["text"] = str(text)
        results.append(r)
        counts[r["label"]] += 1

    return {
        "results": results,
        "counts" : counts,
        "total"  : len(results),
    }