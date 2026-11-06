import { NavLink, Outlet, useNavigate } from 'react-router-dom';

import {
  Wallet,
  LayoutDashboard,
  FilePlus,
  Receipt,
  ClipboardCheck,
  Settings,
  LogOut,
} from 'lucide-react';

import { useAuth } from '../context/AuthContext';

export default function AppLayout() {
  const { user, profile, signOut } = useAuth();
  const navigate = useNavigate();

  const role = profile?.role || 'employee';

  async function handleSignOut() {
    try {
      await signOut();
      navigate('/login', { replace: true });
    } catch (error) {
      alert(error.message || 'Unable to sign out.');
    }
  }

  return (
    <div className="app-layout">
      <aside className="sidebar">
        <div className="sidebar-logo">
          <Wallet size={28} />
          <h2>REMS</h2>
        </div>

        <p className="sidebar-section">WORKSPACE</p>

        <nav className="sidebar-nav">
          <NavLink to="/dashboard">
            <LayoutDashboard size={20} />
            Dashboard
          </NavLink>

          <NavLink to="/expenses/new">
            <FilePlus size={20} />
            Submit Expense
          </NavLink>

          <NavLink to="/expenses">
            <Receipt size={20} />
            Expense History
          </NavLink>

          {(role === 'manager' || role === 'admin') && (
            <NavLink to="/approvals">
              <ClipboardCheck size={20} />
              Approvals
            </NavLink>
          )}

          {role === 'admin' && (
            <NavLink to="/admin">
              <Settings size={20} />
              Administration
            </NavLink>
          )}
        </nav>

        <div className="sidebar-bottom">
          <div className="user-info">
            <strong>{profile?.full_name || 'Team Member'}</strong>
            <small>{user?.email}</small>
            <span className="role-badge">{role}</span>
          </div>

          <button className="logout-button" onClick={handleSignOut}>
            <LogOut size={18} />
            Sign Out
          </button>
        </div>
      </aside>

      <div className="main-area">
        <header className="topbar">
          <h3>Expense Management</h3>

          <span className="role-badge">{role}</span>
        </header>

        <main className="main-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}