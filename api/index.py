# ============================================================
# api/index.py  — Vercel serverless entrypoint
# ============================================================

import sys
import os

# Add the project root (one level up from api/) so app.py can be imported
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app import app  # noqa: F401
