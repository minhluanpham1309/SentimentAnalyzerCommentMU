# model.py — load local, chạy được ngay
import os, torch
from transformers import AutoTokenizer, AutoModelForSequenceClassification

HF_TOKEN   = os.getenv("HF_TOKEN", "hf_...")
MODEL_NAME = "LHUThacSi/phobert-mu-sentiment"
DEVICE     = torch.device("cuda" if torch.cuda.is_available() else "cpu")
LABEL_VI   = {"negative":"Tiêu cực","neutral":"Trung tính","positive":"Tích cực"}

_model, _tokenizer = None, None

def load_model():
    global _model, _tokenizer
    print(f"⏳ Loading {MODEL_NAME}...")
    _tokenizer = AutoTokenizer.from_pretrained(MODEL_NAME, token=HF_TOKEN)
    _model     = AutoModelForSequenceClassification.from_pretrained(
                     MODEL_NAME, token=HF_TOKEN).to(DEVICE)
    _model.eval()
    print(f"✅ Loaded on {DEVICE}")

def predict_one(text: str) -> dict:
    enc   = _tokenizer(str(text), max_length=128, padding="max_length",
                       truncation=True, return_tensors="pt").to(DEVICE)
    with torch.no_grad():
        probs = torch.softmax(_model(**enc).logits, dim=1)[0].cpu().numpy()
    label = ["negative","neutral","positive"][int(probs.argmax())]
    return {
        "label": label, "label_vi": LABEL_VI[label],
        "scores": {"negative":round(float(probs[0]),4),
                   "neutral" :round(float(probs[1]),4),
                   "positive":round(float(probs[2]),4)},
    }

def predict_batch(texts: list) -> dict:
    results = []
    counts  = {"negative":0,"neutral":0,"positive":0}
    for text in texts:
        r = predict_one(str(text)); r["text"] = str(text)
        results.append(r); counts[r["label"]] += 1
    return {"results":results,"counts":counts,"total":len(results)}
