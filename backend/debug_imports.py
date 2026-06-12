try:
    print("Attempting to import agents...")
    import agents
    print(f"Agents module loaded: {agents}")
    print(f"Agents dir: {dir(agents)}")
    
    print("Attempting from agents import scout...")
    from agents import scout
    print(f"Scout imported: {scout}")
except Exception as e:
    print(f"ERROR: {e}")
