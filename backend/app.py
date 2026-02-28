from flask import Flask, request, jsonify
from flask_cors import CORS
import pytesseract
from PIL import Image
import os

app = Flask(__name__)
CORS(app)

# Set Tesseract path (IMPORTANT for Windows)
pytesseract.pytesseract.tesseract_cmd = r"C:\Program Files\Tesseract-OCR\tesseract.exe"

UPLOAD_FOLDER = "uploads"
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

@app.route("/")
def home():
    return "Backend running with OCR!"
@app.route("/analyze", methods=["POST"])
def analyze():
    if "file" not in request.files:
        return jsonify({"error": "No file uploaded"}), 400

    file = request.files["file"]
    filepath = os.path.join(UPLOAD_FOLDER, file.filename)
    file.save(filepath)

    # OCR
    try:
        raw_text = pytesseract.image_to_string(Image.open(filepath))
    except Exception as e:
        os.remove(filepath)
        return jsonify({"error": str(e)}), 500

    # after creating unique_ingredients
    os.remove(filepath)

    return jsonify({
    "ingredients_list": unique_ingredients
})

    # 1️⃣ Normalize text
    text = raw_text.replace("\n", " ")
    text = text.replace("Ingredients:", "")
    text = text.replace("Shampoo", "")
    text = text.replace("Conditioner", "")

    # 2️⃣ Split by comma
    raw_ingredients = text.split(",")

    # 3️⃣ Clean each ingredient
    cleaned = []
    for item in raw_ingredients:
        item = item.strip()

        # Remove extra dots
        item = item.replace(".", "")

        # Remove double spaces
        item = " ".join(item.split())

        # Ignore very short or weird strings
        if len(item) > 3 and not item.lower().startswith("cu dove"):
            cleaned.append(item)

    # 4️⃣ Remove duplicates (case insensitive)
    unique_ingredients = []
    seen = set()

    for ing in cleaned:
        key = ing.lower()
        if key not in seen:
            seen.add(key)
            unique_ingredients.append(ing)

    return jsonify({
        "ingredients_list": unique_ingredients
    })
if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)