
import os
import uuid
from datetime import date
from decimal import Decimal, InvalidOperation
from pathlib import Path

from dotenv import load_dotenv
from fastapi import (
    Depends,
    FastAPI,
    File,
    Form,
    HTTPException,
    UploadFile,
)
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from supabase import create_client


# --------------------------------------------------
# Configuration
# --------------------------------------------------

load_dotenv(Path(__file__).resolve().parents[1] / ".env")

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_SECRET_KEY = os.getenv("SUPABASE_SECRET_KEY")
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:5173")

if not SUPABASE_URL or not SUPABASE_SECRET_KEY:
    raise RuntimeError("Missing Supabase environment variables")

db = create_client(SUPABASE_URL, SUPABASE_SECRET_KEY)

app = FastAPI(title="REMS API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[FRONTEND_URL],
    allow_credentials=True,
    allow_methods=["GET", "POST"],
    allow_headers=["Authorization", "Content-Type"],
)

bearer = HTTPBearer()

CATEGORIES = {
    "Travel",
    "Meals",
    "Office Supplies",
    "Transportation",
    "Equipment",
    "Other",
}

MAX_RECEIPT_SIZE = 5 * 1024 * 1024

ALLOWED_TYPES = {
    "application/pdf": ".pdf",
    "image/jpeg": ".jpg",
    "image/png": ".png",
}


# --------------------------------------------------
# Authentication
# --------------------------------------------------

def current_user(
    credentials: HTTPAuthorizationCredentials = Depends(bearer),
):
    token = credentials.credentials

    try:
        response = db.auth.get_user(token)
        user = response.user

        if not user:
            raise HTTPException(
                status_code=401,
                detail="Invalid authentication token",
            )

        return user

    except HTTPException:
        raise
    except Exception:
        raise HTTPException(
            status_code=401,
            detail="Invalid or expired authentication token",
        )


# --------------------------------------------------
# Receipt validation
# --------------------------------------------------

def validate_receipt(receipt: UploadFile):
    if receipt.content_type not in ALLOWED_TYPES:
        raise HTTPException(
            status_code=400,
            detail="Receipt must be PDF, JPG, or PNG",
        )

    # Read at most 5 MB + 1 byte.
    content = receipt.file.read(MAX_RECEIPT_SIZE + 1)

    if not content:
        raise HTTPException(
            status_code=400,
            detail="Receipt is empty",
        )

    if len(content) > MAX_RECEIPT_SIZE:
        raise HTTPException(
            status_code=400,
            detail="Receipt exceeds 5 MB",
        )

    # Check basic file signatures instead of trusting
    # only the browser-supplied Content-Type.
    if receipt.content_type == "application/pdf":
        valid = content.startswith(b"%PDF-")
    elif receipt.content_type == "image/jpeg":
        valid = content.startswith(b"\xff\xd8\xff")
    else:
        valid = content.startswith(b"\x89PNG\r\n\x1a\n")

    if not valid:
        raise HTTPException(
            status_code=400,
            detail="Receipt contents do not match its file type",
        )

    return content


# --------------------------------------------------
# Health check
# --------------------------------------------------

@app.get("/health")
def health():
    return {"status": "ok", "service": "REMS API"}


# --------------------------------------------------
# Submit expense
# --------------------------------------------------

@app.post("/expenses", status_code=201)
def create_expense(
    amount: str = Form(...),
    currency: str = Form("USD"),
    category: str = Form(...),
    expense_date: date = Form(...),
    description: str = Form(...),
    receipt: UploadFile | None = File(None),
    user=Depends(current_user),
):
    # 1. Validate fields
    try:
        value = Decimal(amount)
    except (InvalidOperation, ValueError):
        raise HTTPException(400, "Invalid expense amount")

    if (
        not value.is_finite()
        or value <= 0
        or value > Decimal("9999999999.99")
        or value.as_tuple().exponent < -2
    ):
        raise HTTPException(
            400,
            "Amount must be positive with at most two decimal places",
        )

    if currency != "USD":
        raise HTTPException(400, "Only USD is currently supported")

    if category not in CATEGORIES:
        raise HTTPException(400, "Invalid expense category")

    if expense_date > date.today():
        raise HTTPException(400, "Expense date cannot be in the future")

    description = description.strip()

    if not description or len(description) > 1000:
        raise HTTPException(
            400,
            "Description must contain 1 to 1000 characters",
        )

    # Validate receipt before creating records.
    receipt_data = None

    if receipt is not None:
        receipt_data = validate_receipt(receipt)

    try:
        # 2. Load the authenticated employee's profile
        profile_result = (
            db.table("profiles")
            .select("id, role, manager_id")
            .eq("id", str(user.id))
            .single()
            .execute()
        )

        profile = profile_result.data

        if not profile:
            raise HTTPException(404, "Employee profile not found")

        manager_id = profile.get("manager_id")

        if not manager_id:
            raise HTTPException(
                409,
                "No manager assigned. Contact an administrator.",
            )

        # 3. Check that the assigned manager is valid
        manager_result = (
            db.table("profiles")
            .select("id, role")
            .eq("id", manager_id)
            .single()
            .execute()
        )

        manager = manager_result.data

        if not manager or manager["role"] not in ("manager", "admin"):
            raise HTTPException(
                409,
                "Assigned reviewer is not a manager or admin",
            )

        if manager_id == str(user.id):
            raise HTTPException(
                409,
                "Employees cannot approve their own expenses",
            )

        # 4. Check active reimbursement policy, if configured
        policy_result = (
            db.table("policies")
            .select("max_amount, receipt_required")
            .eq("role", profile["role"])
            .eq("category", category)
            .eq("active", True)
            .execute()
        )

        policies = policy_result.data or []

        if policies:
            policy = policies[0]

            if value > Decimal(str(policy["max_amount"])):
                raise HTTPException(
                    400,
                    "Amount exceeds reimbursement policy limit",
                )

            if policy["receipt_required"] and receipt_data is None:
                raise HTTPException(
                    400,
                    "A receipt is required for this expense",
                )

    except HTTPException:
        raise
    except Exception:
        raise HTTPException(
            500,
            "Unable to validate employee or reimbursement policy",
        )

    # 5. Save the expense
    try:
        expense_result = (
            db.table("expenses")
            .insert({
                "employee_id": str(user.id),
                "assigned_manager_id": manager_id,
                "amount": str(value),
                "currency": currency,
                "category": category,
                "expense_date": expense_date.isoformat(),
                "description": description,
                "status": "pending",
            })
            .execute()
        )

        if not expense_result.data:
            raise RuntimeError("Expense insert returned no record")

        expense = expense_result.data[0]
        expense_id = expense["id"]

    except Exception:
        raise HTTPException(
            500,
            "Unable to save expense",
        )

    # 6. Upload receipt and save metadata, if provided
    if receipt_data is not None:
        extension = ALLOWED_TYPES[receipt.content_type]
        storage_path = (
            f"{user.id}/{expense_id}/{uuid.uuid4().hex}{extension}"
        )

        try:
            db.storage.from_("expense-receipts").upload(
                path=storage_path,
                file=receipt_data,
                file_options={
                    "content-type": receipt.content_type,
                    "upsert": "false",
                },
            )

            db.table("receipts").insert({
                "expense_id": expense_id,
                "storage_path": storage_path,
                "original_name": receipt.filename or "receipt",
                "content_type": receipt.content_type,
                "size_bytes": len(receipt_data),
            }).execute()

        except Exception:
            # Best-effort cleanup. A proper transaction-based
            # workflow should replace this for production.
            try:
                db.storage.from_("expense-receipts").remove(
                    [storage_path]
                )
                db.table("expenses").delete().eq(
                    "id", expense_id
                ).execute()
            except Exception:
                pass

            raise HTTPException(
                500,
                "Receipt upload failed; please check expense history "
                "before retrying",
            )

    # 7. Record the submission in the audit log
    try:
        db.table("audit_logs").insert({
            "expense_id": expense_id,
            "actor_id": str(user.id),
            "action": "expense_submitted",
            "details": {
                "category": category,
                "amount": str(value),
                "currency": currency,
            },
        }).execute()
    except Exception:
        # Log server-side in a production implementation.
        # Do not claim the expense failed after it was saved.
        pass

    return {
        "id": expense_id,
        "status": "pending",
        "amount": str(value),
        "currency": currency,
        "category": category,
        "message": "Expense submitted successfully",
    }



# --------------------------------------------------
# Get employee expense history
# --------------------------------------------------

@app.get("/expenses")
def get_expenses(user=Depends(current_user)):
    try:
        result = (
            db.table("expenses")
            .select(
                "id, amount, currency, category, "
                "expense_date, description, status, created_at"
            )
            .eq("employee_id", str(user.id))
            .order("created_at", desc=True)
            .limit(100)
            .execute()
        )

        return {
            "expenses": result.data or []
        }

    except Exception:
        raise HTTPException(
            status_code=500,
            detail="Unable to retrieve expense history",
        )
