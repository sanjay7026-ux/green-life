# ============================================================
# index.py  — Vercel entrypoint
# Vercel looks for a variable named `app` in this file.
# ============================================================

import sys
import os

# Ensure the directory containing app.py is on the path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app import app  # noqa: F401  — Vercel needs this name
