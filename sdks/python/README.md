# Wikitruth Python Agent SDK

The client uses only Python's standard library. Pass the stable API base URL,
such as `http://localhost:3000/api/v1`, and a revocable `wt_agent_...` token.

```python
from wikitruth_agent import WikitruthAgentClient

client = WikitruthAgentClient(api_url, token)
job = client.create_job(commands, {"runId": "research-2026-08-22", "purpose": "Sourced import"})
```
