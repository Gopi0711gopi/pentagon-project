class PromptGuard:
    def validate(self, prompt):
        forbidden = ["ignore previous", "system prompt", "jailbreak"]
        if any(term in prompt.lower() for term in forbidden):
            raise ValueError("Prompt injection detected")
        return True

prompt_guard = PromptGuard()