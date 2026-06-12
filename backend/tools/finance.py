from datetime import datetime, timedelta
import random

async def get_balance(currency: str = "usd"):
    """
    Get the current Stripe balance.
    """
    # Mock data for now
    amount = 12450.00
    if currency.lower() == "eur":
        amount = 11200.00
    
    return {
        "available": [{"amount": amount, "currency": currency, "source_types": {"card": amount}}],
        "pending": [{"amount": 2300.50, "currency": currency, "source_types": {"card": 2300.50}}],
        "timestamp": datetime.now().isoformat()
    }

async def list_transactions(limit: int = 5):
    """
    List reputable transactions.
    """
    transactions = []
    start_date = datetime.now()
    
    customers = ["Acme Corp", "Globex", "Initech", "Umbrella Corp", "Soylent Corp"]
    
    for i in range(limit):
        date = start_date - timedelta(days=i*2)
        amount = random.randint(100, 5000)
        customer = random.choice(customers)
        status = random.choice(["succeeded", "pending", "failed"])
        
        transactions.append({
            "id": f"txn_{random.randint(10000, 99999)}",
            "amount": amount,
            "currency": "usd",
            "customer": customer,
            "status": status,
            "created": date.isoformat()
        })
        
    return {"data": transactions, "has_more": True}

async def create_invoice(customer_email: str, amount: float, description: str):
    """
    Create a new invoice.
    """
    return {
        "id": f"in_{random.randint(10000, 99999)}",
        "customer_email": customer_email,
        "amount": amount,
        "currency": "usd",
        "status": "draft",
        "description": description,
        "created": datetime.now().isoformat()
    }
