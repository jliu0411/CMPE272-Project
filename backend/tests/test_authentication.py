import os
import unittest
from unittest.mock import patch

from fastapi.testclient import TestClient

with patch.dict(os.environ, {
    "SUPABASE_URL": "https://rems-test.example",
    "SUPABASE_SECRET_KEY": "sb_secret_test_placeholder",
}):
    from app import main


class AuthenticationTests(unittest.TestCase):
    def setUp(self):
        self.client = TestClient(main.app)

    def test_missing_authorization_header_is_rejected(self):
        response = self.client.get("/expenses")

        self.assertEqual(response.status_code, 401)

    def test_invalid_token_is_rejected(self):
        with patch.object(
            main.db.auth,
            "get_user",
            side_effect=Exception("Invalid token"),
        ):
            response = self.client.get(
                "/expenses",
                headers={"Authorization": "Bearer invalid-token"},
            )

        self.assertEqual(response.status_code, 401)
        self.assertEqual(
            response.json()["detail"],
            "Invalid or expired authentication token",
        )


if __name__ == "__main__":
    unittest.main()