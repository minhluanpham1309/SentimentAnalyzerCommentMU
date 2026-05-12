"""
routes.py — Định nghĩa các API endpoints
──────────────────────────────────────────
"""

import os
from datetime import datetime
from flask import request, jsonify, render_template
from model import predict_one, predict_batch as _predict_batch, MODEL_NAME

# ── Danh sách người review ────────────────────────────────────────────────────
REVIEWERS = [
    "NMPhuc",
    "PMLuan",
    "NMKhoi"
]

HF_REPO_ID   = "LHUThacSi/sentiment-analizer-comment-mu-storage"
HF_REPO_TYPE = "dataset"
DATA_DIR     = "data"


def register_routes(app):

    @app.route("/")
    def index():
        return render_template("index.html", model_name=MODEL_NAME, reviewers=REVIEWERS)

    @app.route("/predict", methods=["POST"])
    def predict():
        data = request.get_json()
        text = (data or {}).get("text", "").strip()
        if not text:
            return jsonify({"error": "Thiếu text"}), 400
        result = predict_one(text)
        result["text"] = text
        return jsonify(result)

    @app.route("/predict_batch", methods=["POST"])
    def predict_batch():
        data  = request.get_json()
        texts = (data or {}).get("texts", [])
        if not texts:
            return jsonify({"error": "Thiếu texts"}), 400
        return jsonify(_predict_batch(texts))

    # ── Sync nhãn lên HuggingFace ─────────────────────────────────────────────
    @app.route("/sync_hf", methods=["POST"])
    def sync_hf():
        payload  = request.get_json() or {}
        csv_text = payload.get("csv", "")
        reviewer = payload.get("reviewer", "unknown").strip() or "unknown"
        filename = payload.get("filename", "labeled_data.csv")

        if not csv_text:
            return jsonify({"status": "error", "message": "Không có dữ liệu CSV"}), 400

        # 1. Lưu file cục bộ vào ./data/
        os.makedirs(DATA_DIR, exist_ok=True)
        filepath = os.path.join(DATA_DIR, filename)
        with open(filepath, "w", encoding="utf-8-sig") as f:
            f.write(csv_text)

        # 2. Upload lên HuggingFace Hub
        try:
            from huggingface_hub import HfApi
            api = HfApi()
            api.upload_file(
                path_or_fileobj=filepath,
                path_in_repo=filename,
                repo_id=HF_REPO_ID,
                repo_type=HF_REPO_TYPE,
                commit_message=(
                    f"[auto-sync] reviewer={reviewer} | "
                    f"{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}"
                ),
            )
            return jsonify({
                "status": "ok",
                "message": f"✅ Đã sync {filename} lên HuggingFace (reviewer: {reviewer})",
            })
        except Exception as exc:
            return jsonify({"status": "error", "message": str(exc)}), 500
