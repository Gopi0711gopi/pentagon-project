import random

async def search_leads(query: str, sector: str = "technology"):
    """
    Search for potential leads in the specified sector.
    """
    # Mock data
    leads = [
        {"company": "TechStart LLC", "sector": "technology", "size": "50-100", "location": "SF"},
        {"company": "GreenEnergy Inc", "sector": "energy", "size": "200-500", "location": "Berlin"},
        {"company": "HealthPlus", "sector": "healthcare", "size": "1000+", "location": "NY"},
        {"company": "FinTech Global", "sector": "finance", "size": "100-200", "location": "London"},
    ]
    
    # Filter (simple mock)
    results = [l for l in leads if sector.lower() in l["sector"].lower()]
    if not results:
        results = leads[:2] # Fallback
        
    return {"count": len(results), "leads": results, "query": query}

async def qualify_lead(company_name: str, criteria: str = "standard"):
    """
    Qualify a specific lead based on criteria.
    """
    score = random.randint(40, 95)
    status = "qualified" if score >= 70 else "nurture"
    
    return {
        "company": company_name,
        "score": score,
        "status": status,
        "criteria": criteria,
        "reasoning": f"Company matches {criteria} profile with {score}% confidence."
    }
