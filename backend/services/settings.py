"""
Ecomind Settings Service — system configuration management.
"""


class SettingsService:
    """Manages Ecomind system settings and user preferences."""

    def __init__(self):
        self._filepath = 'data/settings.json'
        self._settings = self._load()

    def _load(self):
        """Load settings from disk or return defaults."""
        import json
        import os
        
        defaults = {
            'general': {
                'system_name': 'Ecomind',
                'version': '1.0.0',
                'theme': 'dark',
                'language': 'en',
                'timezone': 'UTC',
                'notifications_enabled': True,
                'auto_approve_low_risk': False,
                'daily_brief_time': '09:00',
            },
            'agents': {
                'guardian': {'enabled': True, 'auto_run': True, 'priority': 'high', 'max_concurrent': 5},
                'financier': {'enabled': True, 'auto_run': True, 'priority': 'high', 'max_concurrent': 3},
                'scout': {'enabled': True, 'auto_run': True, 'priority': 'medium', 'max_concurrent': 5},
                'operator': {'enabled': True, 'auto_run': True, 'priority': 'medium', 'max_concurrent': 4},
                'liaison': {'enabled': True, 'auto_run': True, 'priority': 'high', 'max_concurrent': 3},
            },
            'connectors': {
                'stripe': {'enabled': True, 'mode': 'mock', 'sync_interval': 300},
                'slack': {'enabled': True, 'mode': 'mock', 'sync_interval': 60},
                'gmail': {'enabled': False, 'mode': 'mock', 'sync_interval': 120},
                'google_sheets': {'enabled': True, 'mode': 'mock', 'sync_interval': 300},
                'hubspot': {'enabled': True, 'mode': 'mock', 'sync_interval': 180},
                'sendgrid': {'enabled': True, 'mode': 'mock', 'sync_interval': 120},
                'notion': {'enabled': True, 'mode': 'mock', 'sync_interval': 60},
            },
            'security': {
                'prompt_guard_enabled': True,
                'max_financial_auto_approve': 5000,
                'require_approval_above': 10000,
                'blocked_patterns': ['ignore previous', 'system prompt', 'admin override'],
                'session_timeout_minutes': 30,
                'audit_retention_days': 90,
            },
            'notifications': {
                'task_complete': True,
                'task_failed': True,
                'approval_needed': True,
                'security_alert': True,
                'daily_brief': True,
                'weekly_report': True,
                'channels': ['in_app', 'email'],
            },
            'api_keys': {
                'openai': {'configured': False, 'masked': ''},
                'stripe': {'configured': False, 'masked': ''},
                'slack': {'configured': False, 'masked': ''},
                'groq': {'configured': False, 'masked': ''},
                'github_api_key': {'configured': False, 'masked': ''},
            },
        }

        if os.path.exists(self._filepath):
            try:
                with open(self._filepath, 'r') as f:
                    saved = json.load(f)
                    # Simple recursive merge to ensure new keys in defaults are preserved
                    self._merge(defaults, saved)
                    return defaults
            except Exception as e:
                print(f"Error loading settings: {e}")
        
        return defaults

    def _merge(self, defaults, saved):
        for key, value in saved.items():
            if key in defaults and isinstance(defaults[key], dict) and isinstance(value, dict):
                self._merge(defaults[key], value)
            else:
                defaults[key] = value

    def _save(self):
        """Persist settings to disk."""
        import json
        try:
            with open(self._filepath, 'w') as f:
                json.dump(self._settings, f, indent=4)
        except Exception as e:
            print(f"Error saving settings: {e}")

    def get_all(self):
        """Return all settings."""
        return self._settings

    def get_section(self, section):
        """Get a specific settings section."""
        return self._settings.get(section)

    def update_section(self, section, updates):
        """Update a settings section."""
        if section in self._settings:
            self._settings[section].update(updates)
            self._save()
            return self._settings[section]
        return None

    def update_agent_setting(self, agent_name, key, value):
        """Update a specific agent's setting."""
        if agent_name in self._settings['agents']:
            self._settings['agents'][agent_name][key] = value
            self._save()
            return self._settings['agents'][agent_name]
        return None

    def toggle_agent(self, agent_name, enabled=True):
        """Enable or disable an agent."""
        return self.update_agent_setting(agent_name, 'enabled', enabled)

    def toggle_connector(self, connector_name, enabled=True):
        """Enable or disable a connector."""
        if connector_name in self._settings['connectors']:
            self._settings['connectors'][connector_name]['enabled'] = enabled
            self._save()
            return self._settings['connectors'][connector_name]
        return None

    def update_api_key(self, service, key):
        """Update and mask an API key."""
        if service in self._settings['api_keys']:
            masked = f"{key[:4]}...{key[-4:]}" if len(key) > 8 else "****"
            self._settings['api_keys'][service] = {
                'configured': True,
                'masked': masked,
                'key': key  # In a real app, this should be encrypted
            }
            # Also update environment-like variable for connectors
            import os
            os.environ[f"{service.upper()}_API_KEY"] = key
            self._save()
            return self._settings['api_keys'][service]
        return None

    def get_api_key(self, service):
        """Retrieve plain text API key."""
        config = self._settings['api_keys'].get(service)
        return config.get('key') if config else None
