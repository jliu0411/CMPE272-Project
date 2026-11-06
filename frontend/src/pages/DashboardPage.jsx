import { Link } from 'react-router-dom';

import {
  FilePlus,
  Receipt,
  Clock,
  ArrowRight,
} from 'lucide-react';

import { useAuth } from '../context/AuthContext';

export default function DashboardPage() {
  const { user, profile } = useAuth();

  const name =
    profile?.full_name?.trim() ||
    user?.email?.split('@')[0] ||
    'Employee';

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <h1>Welcome back, {name}!</h1>
        <p>
          Manage your expenses and reimbursement requests.
        </p>
      </div>

      <div className="dashboard-banner">
        <h2>Expense Management Made Simple</h2>
        <p>
          Submit requests, track their status, and manage
          reimbursements in one place.
        </p>

        <Link to="/expenses/new" className="banner-button">
          Submit an Expense
          <ArrowRight size={18} />
        </Link>
      </div>

      <h2 className="section-title">Quick Actions</h2>

      <div className="dashboard-cards">
        <Link to="/expenses/new" className="dashboard-card">
          <FilePlus size={28} />
          <h3>Submit Expense</h3>
          <p>Create a new reimbursement request.</p>
        </Link>

        <Link to="/expenses" className="dashboard-card">
          <Receipt size={28} />
          <h3>Expense History</h3>
          <p>View your previous expense requests.</p>
        </Link>

        <Link to="/expenses" className="dashboard-card">
          <Clock size={28} />
          <h3>Track Status</h3>
          <p>Check pending, approved, or rejected expenses.</p>
        </Link>
      </div>

      <div className="dashboard-notice">
        <h3>Account Information</h3>

        <p><strong>Email:</strong> {user?.email}</p>
        <p><strong>Role:</strong> {profile?.role}</p>

        <p className="muted">
          Expense statistics will appear here after the
          backend API is connected.
        </p>
      </div>
    </div>
  );
}