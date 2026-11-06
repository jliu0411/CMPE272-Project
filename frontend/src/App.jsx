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
import PlaceholderPage from './pages/PlaceholderPage';

import './index.css';

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public login page */}
          <Route path="/login" element={<LoginPage />} />

          {/* Protected application pages */}
          <Route element={<ProtectedRoute />}>
            <Route element={<AppLayout />}>
              <Route
                path="/dashboard"
                element={<DashboardPage />}
              />

              <Route
                path="/expenses/new"
                element={
                  <PlaceholderPage
                    title="Submit Expense"
                    description="Create a reimbursement request."
                  />
                }
              />

              <Route
                path="/expenses"
                element={
                  <PlaceholderPage
                    title="Expense History"
                    description="View your submitted expenses."
                  />
                }
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
                      description="Review employee expense requests."
                    />
                  }
                />
              </Route>

              {/* Admin-only page */}
              <Route
                element={
                  <ProtectedRoute allowedRoles={['admin']} />
                }
              >
                <Route
                  path="/admin"
                  element={
                    <PlaceholderPage
                      title="Administration"
                      description="Manage users, policies, and reporting."
                    />
                  }
                />
              </Route>
            </Route>
          </Route>

          <Route
            path="*"
            element={<Navigate to="/dashboard" replace />}
          />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}