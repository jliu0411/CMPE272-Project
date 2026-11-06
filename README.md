# REMS - Reimbursement & Expense Management System

**CMPE 272 Project | Team: The Incredibles**

## Project Overview

REMS is a web-based application designed to simplify employee expense tracking and reimbursement requests.

Employees can submit business expenses, upload receipts, and track reimbursement statuses. Managers and administrators can review requests, approve or reject expenses, and monitor company spending.

## Features

- User authentication and role-based access control
- Expense submission and receipt uploads
- Expense approval and rejection workflow
- Reimbursement policy enforcement
- Expense history and status tracking
- Admin dashboard and expense reporting
- Audit history

## Tech Stack

| Component | Technology |
|---|---|
| Frontend | React |
| Backend | Python / FastAPI |
| Database | Supabase |
| Frontend Hosting | Netlify |
| Backend Hosting | Render |
| CI/CD | GitHub Actions |
| Infrastructure | Terraform |

## Project Structure

```text
CMPE272-Project/
├── .github/          # GitHub Actions and issue templates
├── backend/          # FastAPI backend
├── docs/             # Project documentation
├── frontend/         # React frontend
├── infrastructure/   # Terraform configuration
├── supabase/         # Database migrations and configuration
└── README.md         # Project overview
```

## Project Workflow

1. Employees log in to the application.
2. Employees submit expense requests with supporting receipts.
3. The system validates expenses against reimbursement policies.
4. Managers review and approve or reject requests.
5. Employees track their reimbursement statuses.
6. Administrators monitor expenses and generate reports.


