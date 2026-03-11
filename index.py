# ============================================================
# api/index.py  — Vercel entrypoint
#
# Vercel's Python runtime looks for a variable named `app`
# in the file specified by vercel.json builds[].src.
# We simply re-export the Flask app from the root app.py.
# ============================================================

import sys
import os

# Make sure the project root is on the path so "app" can be imported
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app import app  # noqa: F401  — Vercel needs this name

# Vercel calls the WSGI app directly; no app.run() needed here.
