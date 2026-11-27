import os
import unittest
from types import SimpleNamespace
from unittest.mock import Mock, call, patch

from fastapi.testclient import TestClient

with patch.dict(os.environ, {
    "SUPABASE_URL": "https://rems-test.example",
    "SUPABASE_SECRET_KEY": "sb_secret_test_placeholder",
}):
    from app import main


class ExpensePolicyTests(unittest.TestCase):
    def setUp(self):
        self.profile = {"id": "submitter", "role": "employee", "manager_id": "reviewer"}
        self.profiles = Mock()
        profile_query = self.profiles.select.return_value.eq.return_value.single.return_value
        profile_query.execute.side_effect = [
            SimpleNamespace(data=self.profile),
            SimpleNamespace(data={"id": "reviewer", "role": "manager"}),
        ]

        # Fictional values for exercising the API with two roles.
        self.policy_rows = {
            ("employee", "Office Supplies", True): {"max_amount": "100.00", "receipt_required": True},
            ("manager", "Office Supplies", True): {"max_amount": "250.00", "receipt_required": False},
        }
        self.policies = Mock()
        self.policy_query = self.policies.select.return_value
        self.policy_query.eq.return_value = self.policy_query
        self.policy_query.ilike.return_value = self.policy_query
        self.policy_query.execute.side_effect = self.find_policy

        self.expenses = Mock()
        duplicate_query = self.expenses.select.return_value
        duplicate_query.eq.return_value = duplicate_query
        duplicate_query.limit.return_value.execute.return_value = SimpleNamespace(data=[])
        expense_insert = self.expenses.insert.return_value
        expense_insert.execute.return_value = SimpleNamespace(data=[{"id": "expense"}])

        self.db = Mock()
        self.db.table.side_effect = {
            "profiles": self.profiles,
            "policies": self.policies,
            "expenses": self.expenses,
            "receipts": Mock(),
            "audit_logs": Mock(),
        }.__getitem__

        self.enterContext(patch.object(main, "db", self.db))
        self.enterContext(patch.dict(main.app.dependency_overrides, {
            main.current_user: lambda: SimpleNamespace(id="submitter"),
        }))
        self.client = self.enterContext(TestClient(main.app))

    def find_policy(self):
        filters = dict(args for args, _ in self.policy_query.eq.call_args_list)
        category_filters = dict(args for args, _ in self.policy_query.ilike.call_args_list)
        category = category_filters["category"]
        rules = [
            rule for (role, stored_category, active), rule in self.policy_rows.items()
            if role == filters["role"]
            and active == filters["active"]
            and stored_category.lower() == category.lower()
        ]
        return SimpleNamespace(data=rules)

    def submit(self, amount, *, category="Office Supplies", receipt=False):
        return self.client.post(
            "/expenses",
            data={
                "amount": amount,
                "category": category,
                "expense_date": "2025-01-01",
                "description": "Policy test expense",
            },
            files={"receipt": ("receipt.pdf", b"%PDF-1.4", "application/pdf")} if receipt else None,
        )

    def test_accepts_amount_exactly_at_the_cap_with_receipt(self):
        response = self.submit("100.00", receipt=True)

        self.assertEqual(response.status_code, 201, response.text)
        self.expenses.insert.assert_called_once()
        self.db.storage.from_.return_value.upload.assert_called_once()

    def test_rejects_amount_above_the_cap(self):
        response = self.submit("100.01", receipt=True)

        self.assertEqual(response.status_code, 400)
        self.assertEqual(
            response.json()["detail"],
            "The reimbursement limit for Office Supplies is USD 100.00 per expense.",
        )
        self.assertNotIn(call("expenses"), self.db.table.call_args_list)
        self.db.storage.from_.assert_not_called()

    def test_rejects_expense_without_required_receipt(self):
        response = self.submit("100.00")

        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.json()["detail"], "Attach a receipt for Office Supplies expenses.")
        self.assertNotIn(call("expenses"), self.db.table.call_args_list)

    def test_applies_policy_when_stored_category_uses_different_case(self):
        rule = self.policy_rows.pop(("employee", "Office Supplies", True))
        self.policy_rows[("employee", "office supplies", True)] = rule

        response = self.submit("100.01", receipt=True)

        self.assertEqual(response.status_code, 400, response.text)
        self.assertEqual(
            response.json()["detail"],
            "The reimbursement limit for Office Supplies is USD 100.00 per expense.",
        )
        self.assertNotIn(call("expenses"), self.db.table.call_args_list)

    def test_applies_the_managers_rule_for_the_same_category(self):
        self.profile["role"] = "manager"

        response = self.submit("100.01")

        self.assertEqual(response.status_code, 201, response.text)
        self.expenses.insert.assert_called_once()

    def test_accepts_expense_when_no_active_rule_matches(self):
        response = self.submit("100.01", category="Meals")

        self.assertEqual(response.status_code, 201, response.text)
        self.expenses.insert.assert_called_once()

    def test_rejects_negative_amount(self):
        response = self.submit("-10.00", receipt=True)

        self.assertEqual(response.status_code, 400)
        self.assertEqual(
            response.json()["detail"],
            "Amount must be positive with at most two decimal places",
        )


    def test_rejects_invalid_category(self):
        response = self.submit(
            "25.00",
            category="Invalid Category",
            receipt=True,
        )

        self.assertEqual(response.status_code, 400)
        self.assertEqual(
            response.json()["detail"],
            "Invalid expense category",
        )


    def test_rejects_future_expense_date(self):
        response = self.client.post(
            "/expenses",
            data={
                "amount": "25.00",
                "category": "Meals",
                "expense_date": "2099-01-01",
                "description": "Future expense",
            },
        )

        self.assertEqual(response.status_code, 400)
        self.assertEqual(
            response.json()["detail"],
            "Expense date cannot be in the future",
        )
