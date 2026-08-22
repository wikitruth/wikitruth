import json
import pathlib
import sys
import unittest
from unittest.mock import MagicMock, patch

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parents[1]))

from wikitruth_agent import WikitruthAgentClient


class ClientTests(unittest.TestCase):
    def test_job_mutation_sends_governance_headers(self):
        response = MagicMock()
        response.read.return_value = json.dumps({"success": True, "job": {"status": "queued"}}).encode()
        with patch("wikitruth_agent.client.request.urlopen", return_value=response) as urlopen:
            client = WikitruthAgentClient("https://example.test/api/v1", "wt_agent_test.secret")
            result = client.create_job(
                [{"commandId": "topic-1", "operation": "entry.create", "entryType": "topic", "payload": {}}],
                {"runId": "run-001", "model": "local-model", "sourceManifest": [{"url": "https://example.test/source"}]},
                "job-key-0001",
            )
        sent = urlopen.call_args.args[0]
        self.assertTrue(result["success"])
        self.assertEqual(sent.headers["Idempotency-key"], "job-key-0001")
        self.assertEqual(sent.headers["X-agent-run-id"], "run-001")
        self.assertIn("source", sent.headers["X-agent-source-manifest"])

    def test_cursor_iterator_reads_every_page(self):
        client = WikitruthAgentClient("https://example.test/api/v1", "wt_agent_test.secret")
        client.list_jobs = MagicMock(side_effect=[
            {"items": [{"id": "one"}], "nextCursor": "cursor-2"},
            {"items": [{"id": "two"}], "nextCursor": None},
        ])
        self.assertEqual([item["id"] for item in client.iterate_jobs()], ["one", "two"])


if __name__ == "__main__":
    unittest.main()
