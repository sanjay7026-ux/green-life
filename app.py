# ============================================================
# GreenLife - app.py  (FIXED)
# ============================================================

import os
import json
import logging

from flask import Flask, render_template, request, jsonify

try:
    from dotenv import load_dotenv
    load_dotenv()
except Exception as e:
    print(f"dotenv load skipped: {e}")

try:
    from groq import Groq
except Exception:
    Groq = None

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = Flask(__name__)

# FIX 1: Don't raise RuntimeError — fall back to a dev key so local dev works
# without env vars. Change this in production via FLASK_SECRET_KEY env var.
app.secret_key = os.environ.get("FLASK_SECRET_KEY", "greenlife-dev-secret-key-change-in-prod")
app.config["DEBUG"] = os.environ.get("FLASK_DEBUG", "false").lower() == "true"

# FIX 2: Resolve data dir relative to this file — works in any working directory
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(BASE_DIR, "data")

# ── Groq client ────────────────────────────────────────────
_groq_key = os.environ.get("GROQ_API_KEY")
groq_client = None

if not _groq_key:
    logger.warning("GROQ_API_KEY not set — meal analysis will use fallback.")
elif Groq is None:
    logger.warning("groq package not installed. Run: pip install groq")
else:
    try:
        groq_client = Groq(api_key=_groq_key)
        logger.info("Groq client initialised.")
    except Exception as e:
        logger.error("Groq init failed: %s", e)

# ── Page routes ────────────────────────────────────────────

@app.route("/")
def index():
    return render_template("index.html")

@app.route("/dashboard")
def dashboard():
    return render_template("dashboard.html")

@app.route("/meal")
def meal():
    return render_template("meal.html")

@app.route("/surplus")
def surplus():
    return render_template("surplus.html")

@app.route("/wallet")
def wallet():
    return render_template("wallet.html")

@app.route("/learn")
def learn():
    return render_template("learn.html")

@app.route("/restaurant")
def restaurant():
    return render_template("restaurant.html")

# ── API routes ─────────────────────────────────────────────

@app.route("/api/analyze-meal", methods=["POST"])
def analyze_meal():
    data = request.get_json(silent=True)
    if not data:
        return jsonify({"error": "Invalid JSON body"}), 400

    meal_text = data.get("meal", "").strip()
    if not meal_text:
        return jsonify({"error": "No meal provided"}), 400

    if groq_client is None:
        logger.warning("Groq unavailable — returning fallback for: %s", meal_text)
        return jsonify(get_fallback_response(meal_text))

    prompt = f"""You are a certified nutrition expert. Analyze the meal below and respond with ONLY a valid JSON object — no markdown, no code fences, no extra text whatsoever.

Meal: {meal_text}

Return exactly this JSON structure (fill in real values for THIS specific meal):
{{
    "calories": <integer — estimated total kcal for this meal>,
    "health_score": <integer 1-10>,
    "grade": "<A | B | C | D | F>",
    "summary": "<one sentence describing this specific meal>",
    "tip": "<one actionable tip to make this specific meal healthier>",
    "protein": "<estimated grams of protein, e.g. '22g'>",
    "carbs": "<estimated grams of carbohydrates, e.g. '45g'>",
    "fat": "<estimated grams of fat, e.g. '12g'>",
    "sdg_message": "By logging your meal you contributed to SDG 3 - Good Health"
}}"""

    try:
        response = groq_client.chat.completions.create(
            model="llama3-8b-8192",
            messages=[{"role": "user", "content": prompt}],
            temperature=0.2,
            max_tokens=400,
        )

        ai_text = response.choices[0].message.content.strip()
        logger.info("Groq raw response: %s", ai_text)

        if "```" in ai_text:
            ai_text = ai_text.split("```")[1]
            if ai_text.startswith("json"):
                ai_text = ai_text[4:]

        start = ai_text.find("{")
        end = ai_text.rfind("}") + 1
        if start == -1 or end == 0:
            raise ValueError("No JSON object found in Groq response")

        result = json.loads(ai_text[start:end])

        for field in ("calories", "health_score", "grade"):
            if field not in result:
                raise ValueError(f"Missing field '{field}' in Groq response")

        # FIX 3: Ensure calories is always an integer (never a nonsense string)
        result["calories"] = int(result.get("calories", 0))
        result["coins_earned"] = 15
        return jsonify(result)

    except (json.JSONDecodeError, ValueError) as e:
        logger.error("JSON parse error from Groq: %s", e)
        return jsonify(get_fallback_response(meal_text))
    except Exception as e:
        logger.error("Unexpected error in analyze_meal: %s", e)
        return jsonify(get_fallback_response(meal_text))


def get_fallback_response(meal_text: str) -> dict:
    # FIX 4: calories must be a number, not "bsdkk"
    return {
        "calories": 450,
        "health_score": 6,
        "grade": "C",
        "summary": f"Could not fully analyse '{meal_text}' — showing estimated values.",
        "tip": "For accurate results, ensure your GROQ_API_KEY env var is set and try again.",
        "protein": "~15g",
        "carbs": "~45g",
        "fat": "~12g",
        "sdg_message": "By logging your meal you contributed to SDG 3 - Good Health",
        "coins_earned": 15,
        "is_fallback": True,
    }


@app.route("/api/get-surplus", methods=["GET"])
def get_surplus():
    try:
        with open(os.path.join(DATA_DIR, "surplus_demo.json")) as f:
            return jsonify(json.load(f))
    except Exception as e:
        logger.error("get_surplus error: %s", e)
        return jsonify([])


@app.route("/api/add-surplus", methods=["POST"])
def add_surplus():
    try:
        data = request.get_json(silent=True) or {}
        item = data.get("item", "Unknown item")
        return jsonify({"success": True, "message": f"'{item}' listed successfully!", "id": 999})
    except Exception as e:
        logger.error("add_surplus error: %s", e)
        return jsonify({"success": False, "message": str(e)}), 500


@app.route("/api/get-learn-cards", methods=["GET"])
def get_learn_cards():
    try:
        with open(os.path.join(DATA_DIR, "learn_cards.json")) as f:
            return jsonify(json.load(f))
    except Exception as e:
        logger.error("get_learn_cards error: %s", e)
        return jsonify([])


@app.route("/api/get-quiz", methods=["GET"])
def get_quiz():
    try:
        with open(os.path.join(DATA_DIR, "quiz_questions.json")) as f:
            return jsonify(json.load(f))
    except Exception as e:
        logger.error("get_quiz error: %s", e)
        return jsonify([])


if __name__ == "__main__":
    app.run(debug=True, port=5000)
