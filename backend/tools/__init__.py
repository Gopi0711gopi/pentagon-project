from .registry import tool_registry, Tool
from .finance import get_balance, list_transactions, create_invoice
from .growth import search_leads, qualify_lead

def init_tools():
    """Initialize and register all available tools."""
    
    # helper
    def reg(func, name, desc, params=None):
        t = Tool(name, desc, func, params)
        tool_registry.register(t)

    # Finance Tools
    reg(get_balance, "get_balance", "Get current account balance and pending funds.",
        {"currency": "str (optional, default 'usd')"})
    
    reg(list_transactions, "list_transactions", "List recent transactions.",
        {"limit": "int (optional, default 5)"})

    reg(create_invoice, "create_invoice", "Create a new invoice draft.",
        {"customer_email": "str", "amount": "float", "description": "str"})

    # Growth Tools
    reg(search_leads, "search_leads", "Search for potential leads in a sector.",
        {"query": "str", "sector": "str (optional, default 'technology')"})
    
    reg(qualify_lead, "qualify_lead", "Qualify a company based on criteria.",
        {"company_name": "str", "criteria": "str (optional)"})
    
    # Easy verification
    print(f"✅ Registered {len(tool_registry._tools)} tools.")
