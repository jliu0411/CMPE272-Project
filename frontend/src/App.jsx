
import {
  BrowserRouter,
  Navigate,
  Route,
  Routes,
} from 'react-router-dom';

import { AuthProvider } from './context/AuthContext';

import ProtectedRoute from './components/ProtectedRoute';
import AppLayout from './components/AppLayout';

import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import SubmitExpensePage from './pages/SubmitExpensePage';
import PlaceholderPage from './pages/PlaceholderPage';
import ExpenseHistoryPage from './pages/ExpenseHistoryPage';

import './index.css';

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public login page */}
          <Route
            path="/login"
            element={<LoginPage />}
          />

          {/* Protected application pages */}
          <Route element={<ProtectedRoute />}>
            <Route element={<AppLayout />}>

              {/* Employee Dashboard */}
              <Route
                path="/dashboard"
                element={<DashboardPage />}
              />

              {/* Submit Expense */}
              <Route
                path="/expenses/new"
                element={<SubmitExpensePage />}
              />

              {/* Expense History */}
              <Route
                path="/expenses"
                element={<ExpenseHistoryPage />}
              />

              {/* Manager and Admin pages */}
              <Route
                element={
                  <ProtectedRoute
                    allowedRoles={['manager', 'admin']}
                  />
                }
              >
                <Route
                  path="/approvals"
                  element={
                    <PlaceholderPage
                      title="Expense Approvals"
                      description="Review and approve employee reimbursement requests."
                    />
                  }
                />
              </Route>

              {/* Admin-only page */}
              <Route
                element={
                  <ProtectedRoute
                    allowedRoles={['admin']}
                  />
                }
              >
                <Route
                  path="/admin"
                  element={
                    <PlaceholderPage
                      title="Administration"
                      description="Manage users, reimbursement policies, and reports."
                    />
                  }
                />
              </Route>

            </Route>
          </Route>

          {/* Redirect unknown URLs to dashboard */}
          <Route
            path="*"
            element={<Navigate to="/dashboard" replace />}
          />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
