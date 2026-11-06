# REMS - Reimbursement & Expense Management System

**CMPE 272 Project | Team: The Incredibles**

## Project Overview

REMS is a web-based application designed to simplify employee expense tracking and reimbursement requests.

Employees can submit business expenses, upload receipts, and track reimbursement statuses. Managers and administrators can review requests, approve or reject expenses, and monitor company spending.

## Features

- User authentication and role-based access control
- Expense submission and receipt uploads
- Expense history and status tracking
- Reimbursement policy enforcement
- Manager approval and rejection workflow (planned)
- Admin dashboard and reporting (planned)
- Audit history

## Tech Stack

| Component | Technology |
|---|---|
| Frontend | React + Vite |
| Backend | Python + FastAPI |
| Database | Supabase (PostgreSQL) |
| Authentication | Supabase Auth |
| File Storage | Supabase Storage |
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
├── supabase/         # Database migrations
└── README.md
```

## How to Run the Project

### Prerequisites

Make sure you have the following installed:

- Python 3.10 or newer
- Node.js and npm (compatible with your Vite version)
- Git
- VS Code (recommended)

You also need access to the project's Supabase database.

### 1. Clone the Repository

```powershell
git clone https://github.com/jliu0411/CMPE272-Project.git
cd CMPE272-Project
```

### 2. Set Up the Frontend

Open a terminal and navigate to the frontend folder:

```powershell
cd frontend
```

Install dependencies:

```powershell
npm install
```

Create a `.env.local` file inside `frontend/`:

```dotenv
VITE_SUPABASE_URL=YOUR_SUPABASE_URL
VITE_SUPABASE_PUBLISHABLE_KEY=YOUR_SUPABASE_PUBLISHABLE_KEY
VITE_API_URL=http://localhost:8000
```

Start the frontend:

```powershell
npm run dev
```

Open the application in your browser:

**http://localhost:5173**

### 3. Set Up the Backend

Open a **second terminal** in VS Code.

From the project root, navigate to the backend folder:

```powershell
cd backend
```

Install Python dependencies:

```powershell
python -m pip install -r requirements.txt
```

Create a `.env` file inside `backend/`:

```dotenv
SUPABASE_URL=YOUR_SUPABASE_URL
SUPABASE_SECRET_KEY=YOUR_SUPABASE_SECRET_KEY
FRONTEND_URL=http://localhost:5173
```

Start the FastAPI server:

```powershell
python -m uvicorn app.main:app --reload --port 8000
```

The backend runs at:

**http://localhost:8000**

API documentation is available at:

**http://localhost:8000/docs**

### 4. Supabase Setup

The application requires a Supabase project containing the following tables:

- `profiles`
- `expenses`
- `receipts`
- `approvals`
- `policies`
- `audit_logs`

The initial database schema is stored in:

```text
supabase/migrations/
```

The application also uses a private Supabase Storage bucket named `expense-receipts`.

Create test accounts through **Supabase → Authentication → Users**.

For expense submissions, each test employee must have an assigned manager in the `profiles` table.

### 5. Run the Application

Both servers must be running simultaneously.

| Service | Command | Address |
|---|---|---|
| Frontend | `npm run dev` | http://localhost:5173 |
| Backend | `python -m uvicorn app.main:app --reload --port 8000` | http://localhost:8000 |

Once both servers are running:

1. Open the frontend in your browser.
2. Log in using a Supabase test account.
3. Navigate to the employee dashboard.
4. Select **Submit Expense** to create a reimbursement request.
5. Select **Expense History** to view submitted expenses and their statuses.

## Project Workflow

1. Employees log in through Supabase Auth.
2. Employees submit reimbursement requests with expense details and optional receipts.
3. FastAPI validates the requests and saves them in Supabase.
4. Managers review and approve or reject expenses (planned).
5. Employees track reimbursement statuses through Expense History.
6. Administrators manage reimbursement policies and reporting (planned).

## Troubleshooting

| Problem | Solution |
|---|---|
| Frontend doesn't start | Run `npm install` inside `frontend/` |
| Backend doesn't start | Install dependencies using `requirements.txt` |
| Supabase connection fails | Verify environment variables |
| Login fails | Verify the user exists in Supabase Auth |
| Expense submission fails | Ensure FastAPI is running and the employee has an assigned manager |
| Expense History is empty | Confirm expenses exist for the logged-in user |

## Security

- Do not commit `.env` or `.env.local` files.
- Never expose Supabase secret keys in frontend code.
- Use Supabase Row Level Security (RLS) to protect user information.
- Verify authentication and authorization on backend requests.

## Project Status

**Under Development**

Current development focuses on employee authentication, expense submissions, and expense history.

Manager approvals, administrative reporting, deployment, and additional testing are planned.

