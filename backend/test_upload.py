import requests
import json
import os

url = "http://127.0.0.1:5000/analyze"
image_path = r"C:\Users\Archana KR\Downloads\dermaco.jpeg"

# 1. Verify file exists before sending
if not os.path.exists(image_path):
    print(f"❌ Error: File not found at {image_path}")
else:
    try:
        with open(image_path, 'rb') as f:
            files = {'file': f}
            print("🚀 Sending image to Gemini 3 Flash...")
            res = requests.post(url, files=files)
            
        # 2. Check the response (Now outside the 'with', but inside the 'try')
        if res.status_code == 200:
            data = res.json()
            print(f"\n✅ ANALYSIS COMPLETE")
            print(f"Overall Product Risk: {data.get('overall_product_risk', 'Unknown')}")
            print("-" * 40)
            
            for ing in data.get('ingredients', []):
                name = ing.get('name', 'Unknown')
                risk = ing.get('risk_level', 'N/A')
                print(f"• [{risk}] {name}: {ing.get('reason', '')}")
        else:
            print(f"❌ Server Error {res.status_code}:")
            print(res.text)

    except requests.exceptions.ConnectionError:
        print("❌ Connection Error: Is your Flask server running on port 5000?")
    except Exception as e:
        print(f"❌ An unexpected error occurred: {e}")