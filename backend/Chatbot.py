from google.genai import types

def handle_chat_query(client, user_query, product_context, category):
    """
    Processes a follow-up question based on the scanned product results.
    """
    # Create a specialized prompt based on the product the user is currently viewing
    prompt = f"""
    You are an expert {category} consultant. 
    The user is viewing a report for a product with:
    - Safety Score: {product_context.get('safety_score')}/100
    - Risk Level: {product_context.get('overall_product_risk')}
    - High Risk Ingredients: {", ".join(product_context.get('high_risk_ingredients', []))}
    - Moderate Risk Ingredients: {", ".join(product_context.get('moderate_risk_ingredients', []))}
    
    User Question: {user_query}
    
    Instructions:
    1. Be concise and professional.
    2. Focus on health and safety related to the ingredients.
    3. If the question is unrelated to this product, politely redirect them.
    """

    try:
        response = client.models.generate_content(
            model="gemini-3-flash-preview",
            contents=[prompt]
        )
        return {"reply": response.text}
    except Exception as e:
        return {"error": str(e)}