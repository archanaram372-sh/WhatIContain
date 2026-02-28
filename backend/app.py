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

# Initialize the new Client 
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
    # 1. Get the category sent from the frontend
    category_type = request.form.get("category", "general")
    
    # 2. Get the file
    if "file" not in request.files:
        return jsonify({"error": "No file"}), 400
    
    file = request.files["file"]
    filepath = os.path.join(UPLOAD_FOLDER, file.filename)
    file.save(filepath)

    try:
        # Dynamic Persona/Instructions based on Category
        prompts = {
            "cosmetics": "You are a dermatological expert. Analyze the skincare ingredients.",
            "food": "You are a clinical nutritionist. Analyze the food additives and nutritional content.",
            "healthcare": "You are a pharmacist. Analyze the medicinal compounds for safety.",
            "processed": "You are a consumer safety expert. Analyze the chemical composition."
        }
        
        selected_prompt = prompts.get(category_type, "You are a product safety expert.")

        with Image.open(filepath) as raw_image:
            response = client.models.generate_content(
                model="gemini-3-flash-preview", 
                contents=[
                    f"{selected_prompt} Read the label from this image and provide a comprehensive safety report.",
                    raw_image
                ],
                config=types.GenerateContentConfig(
                    response_mime_type="application/json",
                    response_schema={
                        "type": "OBJECT",
                        "properties": {
                            "safety_score": {"type": "INTEGER"}, # 0-100 score
                            "overall_product_risk": {"type": "STRING", "enum": ["Low", "Moderate", "High"]},
                            "high_risk_ingredients": {"type": "ARRAY", "items": {"type": "STRING"}},
                            "moderate_risk_ingredients": {"type": "ARRAY", "items": {"type": "STRING"}},
                            "low_risk_ingredients": {"type": "ARRAY", "items": {"type": "STRING"}},
                            "not_recommended_for": {"type": "ARRAY", "items": {"type": "STRING"}}, # e.g. ["Pregnant Women", "Children"]
                            "demographic_reasons": {"type": "STRING"},
                            "safer_alternatives": {
                                "type": "ARRAY", 
                                "items": {
                                    "type": "OBJECT",
                                    "properties": {
                                        "product_name": {"type": "STRING"},
                                        "why_better": {"type": "STRING"}
                                    }
                                }
                            }
                        },
                        "required": ["safety_score", "overall_product_risk", "high_risk_ingredients", "not_recommended_for", "safer_alternatives"]
                    }
                )
            )

        # Return the parsed detailed JSON
        return jsonify(response.parsed)

    except Exception as e:
        print(f"Detailed Error: {e}")
        return jsonify({"error": "AI Analysis failed", "details": str(e)}), 500
    finally:
        if os.path.exists(filepath):
            try:
                os.remove(filepath)
            except Exception as e:
                print(f"Cleanup error: {e}")

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)