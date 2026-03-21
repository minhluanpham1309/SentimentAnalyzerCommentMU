"""
routes.py — Định nghĩa các API endpoints
──────────────────────────────────────────
"""

from flask import request, jsonify, render_template
from model import predict_one, predict_batch as _predict_batch, MODEL_NAME


def register_routes(app):

    @app.route("/")
    def index():
        return render_template("index.html", model_name=MODEL_NAME)

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
