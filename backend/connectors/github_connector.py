from typing import Dict, Any, List, Optional
import httpx
import asyncio
import logging

logger = logging.getLogger(__name__)

class GitHubConnector:
    """Connector for interacting with the GitHub REST API."""
    def __init__(self, api_key: str = None):
        self.api_key = api_key
        self.base_url = "https://api.github.com"
        
    def _get_headers(self) -> Dict[str, str]:
        if not self.api_key:
            raise ValueError("GitHub API Key is not configured")
        return {
            "Accept": "application/vnd.github.v3+json",
            "Authorization": f"token {self.api_key}",
            "X-GitHub-Api-Version": "2022-11-28"
        }

    async def list_user_repos(self, limit: int = 15) -> List[Dict[str, Any]]:
        """List repositories the authenticated user has access to."""
        try:
            async with httpx.AsyncClient() as client:
                resp = await client.get(
                    f"{self.base_url}/user/repos?sort=updated&per_page={limit}",
                    headers=self._get_headers()
                )
                resp.raise_for_status()
                data = resp.json()
                return [
                    {
                        "name": r.get("name"),
                        "full_name": r.get("full_name"),
                        "private": r.get("private"),
                        "html_url": r.get("html_url"),
                        "description": r.get("description"),
                        "open_issues": r.get("open_issues_count"),
                        "updated_at": r.get("updated_at")
                    } for r in data
                ]
        except Exception as e:
            logger.error(f"GitHub list_user_repos error: {e}")
            return [{"error": str(e)}]

    async def get_issues(self, repo_full_name: str, state: str = "open", limit: int = 10) -> List[Dict[str, Any]]:
        """Fetch issues for a specific repository."""
        try:
            async with httpx.AsyncClient() as client:
                resp = await client.get(
                    f"{self.base_url}/repos/{repo_full_name}/issues?state={state}&per_page={limit}",
                    headers=self._get_headers()
                )
                resp.raise_for_status()
                data = resp.json()
                return [
                    {
                        "title": i.get("title"),
                        "number": i.get("number"),
                        "state": i.get("state"),
                        "creator": i.get("user", {}).get("login"),
                        "assignee": i.get("assignee", {}).get("login") if i.get("assignee") else None,
                        "created_at": i.get("created_at"),
                        "url": i.get("html_url")
                    } for i in data if "pull_request" not in i # Filter out PRs, github API mixes them
                ]
        except Exception as e:
            logger.error(f"GitHub get_issues error for {repo_full_name}: {e}")
            return [{"error": str(e)}]

    async def get_pull_request_diff(self, repo_full_name: str, pull_number: int) -> str:
        """Fetch the raw diff of a Pull Request for summarization."""
        try:
            headers = self._get_headers()
            headers["Accept"] = "application/vnd.github.v3.diff" # Request diff format
            async with httpx.AsyncClient() as client:
                resp = await client.get(
                    f"{self.base_url}/repos/{repo_full_name}/pulls/{pull_number}",
                    headers=headers
                )
                resp.raise_for_status()
                return resp.text # Return raw diff string
        except Exception as e:
            logger.error(f"GitHub get_pull_request_diff error for {repo_full_name}#{pull_number}: {e}")
            return f"Error fetching diff: {str(e)}"


from .registry import BaseConnector
from services.settings import SettingsService

def get_settings():
    # Helper to instantiate or fetch settings
    return SettingsService().get_all()

class GitHubToolConnector(BaseConnector):
    """Provides tools for managing GitHub repositories, PRs, and issues."""
    name = "github"
    description = "Interact with GitHub repositories, fetch issues, and summarize pull requests."

    def __init__(self):
        super().__init__()
        self.api = GitHubConnector()
        self.tools = [
            {
                "name": "list_github_repos",
                "description": "List the authenticated user's GitHub repositories.",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "limit": {"type": "integer", "description": "Maximum number of repos to fetch"}
                    }
                }
            },
            {
                "name": "get_github_issues",
                "description": "Fetch open issues for a specific repository.",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "repo_full_name": {"type": "string", "description": "Owner/Repo format (e.g., octocat/Hello-World)"},
                        "state": {"type": "string", "description": "Issue state: open or closed (default: open)"},
                        "limit": {"type": "integer", "description": "Maximum number of issues to fetch"}
                    },
                    "required": ["repo_full_name"]
                }
            },
            {
                "name": "get_pr_diff",
                "description": "Gets the raw diff of a Pull Request. Useful for code review and summarization.",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "repo_full_name": {"type": "string", "description": "Owner/Repo format"},
                        "pull_number": {"type": "integer", "description": "The PR number (e.g., 42)"}
                    },
                    "required": ["repo_full_name", "pull_number"]
                }
            }
        ]

    async def initialize(self):
        """Load API key from settings or enter mock mode."""
        settings = get_settings()
        pat = settings.get("github_api_key", "").strip()

        if pat:
            self.api.api_key = pat
            self._connected = True
            self._mock_mode = False
            logger.info("🐙 GitHub connector initialized in LIVE mode.")
        else:
            self._connected = True
            self._mock_mode = True
            logger.warning("🐙 GitHub wrapper has no PAT - using Mock Mode.")

    async def call_tool(self, tool_name: str, params: Optional[dict] = None) -> dict:
        p = params or {}
        
        if self.is_mock:
            if tool_name == "list_github_repos":
                return {"result": [{"name": "mock-ecomind-core", "full_name": "mock-org/mock-ecomind-core", "open_issues": 3}]}
            elif tool_name == "get_github_issues":
                return {"result": [{"title": "Fix authentication bypass", "number": 12, "state": "open", "creator": "mock-user"}]}
            elif tool_name == "get_pr_diff":
                return {"result": "@@ -1,5 +1,5 @@\n- old code\n+ new code\n"}

        if tool_name == "list_github_repos":
            res = await self.api.list_user_repos(limit=p.get('limit', 15))
            return {"result": res}
        
        elif tool_name == "get_github_issues":
            res = await self.api.get_issues(
                repo_full_name=p.get('repo_full_name'),
                state=p.get('state', 'open'),
                limit=p.get('limit', 10)
            )
            return {"result": res}

        elif tool_name == "get_pr_diff":
            res = await self.api.get_pull_request_diff(
                repo_full_name=p.get('repo_full_name'),
                pull_number=p.get('pull_number')
            )
            return {"result": res}

        return {"error": f"Unknown tool {tool_name}"}

# Global singleton component
github_instance = GitHubToolConnector()
