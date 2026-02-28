from flask import Flask, request, jsonify
from flask_cors import CORS
from PIL import Image
import pytesseract
import os
from dotenv import load_dotenv
import google.generativeai as genai

# ----------------- CONFIG -----------------
load_dotenv()  # Load .env file
GEMINI_KEY = os.getenv("GEMINI_KEY")  # Your Gemini API key

genai.configure(api_key=GEMINI_KEY)
model = genai.GenerativeModel("gemini-1.5-flash")

# Flask setup
app = Flask(__name__)
CORS(app)

# Tesseract path (Windows)
pytesseract.pytesseract.tesseract_cmd = r"C:\Program Files\Tesseract-OCR\tesseract.exe"

UPLOAD_FOLDER = "uploads"
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

# ----------------- ROUTES -----------------
@app.route("/")
def home():
    return "Backend running with OCR + Gemini!"

@app.route("/analyze", methods=["POST"])
def analyze():
    if "file" not in request.files:
        return jsonify({"error": "No file uploaded"}), 400

    file = request.files["file"]
    filepath = os.path.join(UPLOAD_FOLDER, file.filename)
    file.save(filepath)

    try:
        # --- OCR ---
        raw_text = pytesseract.image_to_string(Image.open(filepath))
    except Exception as e:
        os.remove(filepath)
        return jsonify({"error": str(e)}), 500
    finally:
        os.remove(filepath)

    # --- Clean Ingredients ---
    text = raw_text.replace("\n", " ").replace("Ingredients:", "")
    text = text.replace("Shampoo", "").replace("Conditioner", "")
    raw_ingredients = text.split(",")

    cleaned = []
    for item in raw_ingredients:
        item = item.strip().replace(".", "")
        item = " ".join(item.split())
        if len(item) > 3 and not item.lower().startswith("cu dove"):
            cleaned.append(item)

    # Remove duplicates
    unique_ingredients = []
    seen = set()
    for ing in cleaned:
        key = ing.lower()
        if key not in seen:
            seen.add(key)
            unique_ingredients.append(ing)

    if not unique_ingredients:
        return jsonify({"error": "No ingredients detected"}), 400

    # --- Gemini LLM Prompt ---
    prompt = f"""
    You are an expert cosmetic/medicine ingredient analyzer.

    Analyze these ingredients: {unique_ingredients}

    For each ingredient:
    - Give risk level (Low/Moderate/High)
    - Short explanation of risks
    - Suitable skin type / user group
    - Who should avoid it

    Also give overall product risk (Low/Moderate/High)

    Return ONLY JSON in this format:

    {{
      "ingredients": [
        {{
          "name": "...",
          "risk_level": "...",
          "reason": "...",
          "recommended_for": "...",
          "avoid_if": "..."
        }}
      ],
      "overall_product_risk": "..."
    }}
    """

    # --- Call Gemini API ---
    response = model.generate_content(prompt)
    analysis_json = response.text

    return analysis_json

# ----------------- RUN -----------------
if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)