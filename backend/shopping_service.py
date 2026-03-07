import requests

def get_product_prices(product_name):
    """
    Simulates fetching real-time prices for a product in the Indian market.
    Synchronized with PriceCard.jsx expectations.
    """
    # Clean the name for searching
    search_query = product_name.replace(" ", "+")
    
    # MOCK DATA: Updated to use 'source' key and INR values
    mock_results = [
        {
            "source": "Amazon India",
            "price": "1299", # Use numbers or strings without $ 
            "link": f"https://www.amazon.in/s?k={search_query}",
        },
        {
            "source": "Nykaa",
            "price": "1150",
            "link": f"https://www.nykaa.com/search/result/?q={search_query}",
        }
    ]
    
    return mock_results