"""
model.py — Load model và predict
──────────────────────────────────
"""

import os
import torch
from transformers import AutoTokenizer, AutoModelForSequenceClassification

# ─── Config ───────────────────────────────────────────────────────────────────
HF_TOKEN   = os.getenv("HF_TOKEN", "")
MODEL_NAME = "LHUThacSi/phobert-mu-sentiment"
DEVICE     = torch.device("cuda" if torch.cuda.is_available() else "cpu")

ID2LABEL = {0: "negative", 1: "neutral", 2: "positive"}
LABEL_VI = {
    "negative": "Tiêu cực",
    "neutral" : "Trung tính",
    "positive": "Tích cực",
}

# Global model/tokenizer
_model     = None
_tokenizer = None


def load_model():
    """Load model từ HuggingFace — gọi 1 lần khi khởi động."""
    global _model, _tokenizer
    print(f"⏳ Loading model {MODEL_NAME}...")
    _tokenizer = AutoTokenizer.from_pretrained(MODEL_NAME, token=HF_TOKEN)
    _model     = AutoModelForSequenceClassification.from_pretrained(
        MODEL_NAME, token=HF_TOKEN
    ).to(DEVICE)
    _model.eval()
    print(f"✅ Model loaded on {DEVICE}")


def predict_one(text: str) -> dict:
    """Predict sentiment cho 1 câu."""
    enc = _tokenizer(
        str(text),
        max_length=128,
        padding="max_length",
        truncation=True,
        return_tensors="pt",
    ).to(DEVICE)

    with torch.no_grad():
        logits = _model(**enc).logits

    probs   = torch.softmax(logits, dim=1)[0].cpu().numpy()
    pred_id = int(probs.argmax())
    label   = ID2LABEL[pred_id]

    return {
        "label"   : label,
        "label_vi": LABEL_VI[label],
        "scores"  : {
            "negative": round(float(probs[0]), 4),
            "neutral" : round(float(probs[1]), 4),
            "positive": round(float(probs[2]), 4),
        },
    }


def predict_batch(texts: list[str]) -> dict:
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
