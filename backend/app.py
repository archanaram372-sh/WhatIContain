import os
import json
from flask import Flask, request, jsonify
from flask_cors import CORS
from PIL import Image
from dotenv import load_dotenv
from google import genai 
from google.genai import types

# 1. Setup & Config
load_dotenv()
GEMINI_KEY = os.getenv("GEMINI_KEY")

# Initialize the new Client based on your reference
# In app.py
client = genai.Client(
    api_key=GEMINI_KEY,
    http_options={'api_version': 'v1beta'} 
)

app = Flask(__name__)
CORS(app)

UPLOAD_FOLDER = "uploads"
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

# ----------------- ROUTES -----------------

@app.route("/analyze", methods=["POST"])
def analyze():
    if "file" not in request.files:
        return jsonify({"error": "No file uploaded"}), 400

    file = request.files["file"]
    filepath = os.path.join(UPLOAD_FOLDER, file.filename)
    file.save(filepath)

    try:
        # Use 'with' so the file is automatically closed as soon as this block ends
        # ... inside the try block ...
        with Image.open(filepath) as raw_image:
            response = client.models.generate_content(
                model="gemini-3-flash-preview", 
                contents=[
                    "Read the ingredients from this product label and analyze them for skin/health risks.",
                    raw_image
                ],
                config=types.GenerateContentConfig(
                    # REMOVED: thinking=types.ThinkingConfig(...)
                    response_mime_type="application/json",
                    response_schema={
                        "type": "OBJECT",
                        "properties": {
                            "ingredients": {
                                "type": "ARRAY",
                                "items": {
                                    "type": "OBJECT",
                                    "properties": {
                                        "name": {"type": "STRING"},
                                        "risk_level": {"type": "STRING", "enum": ["Low", "Moderate", "High"]},
                                        "reason": {"type": "STRING"},
                                        "recommended_for": {"type": "STRING"},
                                        "avoid_if": {"type": "STRING"}
                                    },
                                    "required": ["name", "risk_level", "reason"]
                                }
                            },
                            "overall_product_risk": {"type": "STRING", "enum": ["Low", "Moderate", "High"]}
                        },
                        "required": ["ingredients", "overall_product_risk"]
                    }
                )
            )

        # The image file is now CLOSED. It is safe to return the response.
        return jsonify(response.parsed)

    except Exception as e:
        print(f"Detailed Error: {e}")
        return jsonify({"error": "AI Analysis failed", "details": str(e)}), 500
    finally:
        # Now that the 'with' block is done, os.remove won't trigger WinError 32
        if os.path.exists(filepath):
            try:
                os.remove(filepath)
            except Exception as e:
                print(f"Cleanup error: {e}")

    
if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)