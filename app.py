"""
app.py — Entry point
────────────────────
Chạy:
    pip install flask transformers torch
    python app.py
    Mở http://localhost:5000
"""

from flask import Flask
from routes import register_routes
from model import load_model

app = Flask(__name__)

# Load model khi khởi động
load_model()

# Đăng ký routes
register_routes(app)

if __name__ == "__main__":
    print("\n🌐 Mở http://localhost:5000\n")
    app.run(debug=False, host="0.0.0.0", port=7860)
