import os
import unittest
from types import SimpleNamespace
from unittest.mock import Mock, patch

from fastapi.testclient import TestClient

with patch.dict(os.environ, {
    "SUPABASE_URL": "https://rems-test.example",
    "SUPABASE_SECRET_KEY": "sb_secret_test_placeholder",
}):
    from app import main


class ApprovalPermissionTests(unittest.TestCase):
    def setUp(self):
        self.db = Mock()
        self.profiles = Mock()

        self.db.table.side_effect = {
            "profiles": self.profiles,
        }.__getitem__

        profile_query = (
            self.profiles
            .select.return_value
            .eq.return_value
            .limit.return_value
        )
        profile_query.execute.return_value = SimpleNamespace(
            data=[{"role": "employee"}]
        )

        self.db_patch = patch.object(main, "db", self.db)
        self.db_patch.start()

        self.auth_patch = patch.dict(
            main.app.dependency_overrides,
            {
                main.current_user: lambda: SimpleNamespace(
                    id="employee-id"
                )
            },
        )
        self.auth_patch.start()

        self.client = TestClient(main.app)

        self.addCleanup(self.auth_patch.stop)
        self.addCleanup(self.db_patch.stop)

    def test_employee_cannot_approve_expense(self):
        response = self.client.post(
            "/approve",
            params={
                "expense_id": "00000000-0000-0000-0000-000000000001",
                "decision": "approved",
            },
        )

        self.assertEqual(response.status_code, 403)
        self.assertEqual(
            response.json()["detail"],
            "Reviewer access is required.",
        )

    def test_rejection_requires_reason(self):
        response = self.client.post(
            "/approve",
            params={
                "expense_id": "00000000-0000-0000-0000-000000000001",
                "decision": "rejected",
            },
        )

        self.assertEqual(response.status_code, 422)
        self.assertEqual(
            response.json()["detail"],
            "A rejection reason is required.",
        )

if __name__ == "__main__":
    unittest.main()