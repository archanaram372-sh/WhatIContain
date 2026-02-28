import os
import json
from flask import Flask, request, jsonify
from flask_cors import CORS
from PIL import Image
from dotenv import load_dotenv
from google import genai 
from google.genai import types

# Import the modular chatbot function
# Ensure your file is named Chatbot.py (Case Sensitive)
from Chatbot import handle_chat_query

# 1. Setup & Config
load_dotenv()
GEMINI_KEY = os.getenv("GEMINI_KEY")

# Initialize the Gemini Client
client = genai.Client(
    api_key=GEMINI_KEY,
    http_options={'api_version': 'v1beta'} 
)

app = Flask(__name__)
CORS(app)

UPLOAD_FOLDER = "uploads"
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

# ----------------- HELPERS -----------------

def validate_risk_level(score):
    """Manual override to ensure the text label matches the numerical score."""
    if score >= 80:
        return "Low"
    elif score >= 50:
        return "Moderate"
    else:
        return "High"

# ----------------- ROUTES -----------------

@app.route("/analyze", methods=["POST"])
def analyze():
    # 1. Get the category sent from the frontend
    category_type = request.form.get("category", "general")
    
    # 2. Get the file
    if "file" not in request.files:
        return jsonify({"error": "No file uploaded"}), 400
    
    file = request.files["file"]
    filepath = os.path.join(UPLOAD_FOLDER, file.filename)
    file.save(filepath)

    try:
        # Strict instructions to prevent "Always Moderate" bias
        threshold_rules = """
        STRICT RULES FOR SCORING:
        - You MUST use the full range of 0-100.
        - If ingredients are hazardous, toxic, or banned, score MUST be below 50.
        - If ingredients are standard but contain common irritants, score 50-79.
        - If ingredients are clean/organic/safe, score 80-100.
        """

        prompts = {
            "cosmetics": "You are a dermatological expert. Analyze for endocrine disruptors, parabens, and allergens.",
            "food": "You are a clinical nutritionist. Analyze for ultra-processed additives, high fructose corn syrup, and harmful dyes.",
            "healthcare": "You are a pharmacist. Analyze for active ingredient safety and potential contraindications.",
            "processed": "You are a consumer safety expert. Analyze for harsh industrial chemicals and VOCs."
        }
        
        selected_prompt = prompts.get(category_type, "You are a product safety expert.")

        with Image.open(filepath) as raw_image:
            response = client.models.generate_content(
                model="gemini-3-flash-preview", 
                contents=[
                    f"{selected_prompt} {threshold_rules} Analyze this label and return a JSON report.",
                    raw_image
                ],
                config=types.GenerateContentConfig(
                    response_mime_type="application/json",
                    response_schema={
                        "type": "OBJECT",
                        "properties": {
                            "safety_score": {"type": "INTEGER"},
                            "overall_product_risk": {"type": "STRING", "enum": ["Low", "Moderate", "High"]},
                            "high_risk_ingredients": {"type": "ARRAY", "items": {"type": "STRING"}},
                            "moderate_risk_ingredients": {"type": "ARRAY", "items": {"type": "STRING"}},
                            "low_risk_ingredients": {"type": "ARRAY", "items": {"type": "STRING"}},
                            "not_recommended_for": {"type": "ARRAY", "items": {"type": "STRING"}},
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

        # 3. Parse and Re-Validate
        analysis_data = response.parsed
        
        # Apply the manual override to fix "Moderate" bias
        score = analysis_data.get("safety_score", 50)
        analysis_data["overall_product_risk"] = validate_risk_level(score)

        return jsonify(analysis_data)

    except Exception as e:
        print(f"Server Error: {e}")
        return jsonify({"error": "Analysis failed", "details": str(e)}), 500
    
    finally:
        # Cleanup uploaded file
        if os.path.exists(filepath):
            os.remove(filepath)

@app.route("/chat", methods=["POST"])
def chat():
    data = request.json
    if not data:
        return jsonify({"error": "No data provided"}), 400

    # Pass logic to modular Chatbot.py
    result = handle_chat_query(
        client, 
        data.get("query"), 
        data.get("context"), 
        data.get("category")
    )
    
    if "error" in result:
        return jsonify(result), 500
    return jsonify(result)

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)