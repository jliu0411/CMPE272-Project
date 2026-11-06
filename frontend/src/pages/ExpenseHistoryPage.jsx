
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

import {
  Receipt,
  RefreshCw,
  FilePlus,
  Clock,
  CheckCircle,
  XCircle,
} from 'lucide-react';

import { getExpenses } from '../services/api';

const STATUSES = ['all', 'pending', 'approved', 'rejected'];

function formatAmount(amount, currency = 'USD') {
  const value = Number(amount);

  if (!Number.isFinite(value)) return '—';

  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
  }).format(value);
}

function formatDate(dateString) {
  if (!dateString) return '—';

  // Handle YYYY-MM-DD as a calendar date rather than UTC.
  const date = new Date(`${dateString.slice(0, 10)}T12:00:00`);

  if (Number.isNaN(date.getTime())) return dateString;

  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export default function ExpenseHistoryPage() {
  const [expenses, setExpenses] = useState([]);
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  async function loadExpenses() {
    setLoading(true);
    setError('');

    try {
      const data = await getExpenses();
      setExpenses(data);
    } catch (err) {
      setError(err.message || 'Failed to load expenses.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let active = true;

    async function loadInitialExpenses() {
      try {
        const data = await getExpenses();

        if (active) {
          setExpenses(data);
          setError('');
        }
      } catch (err) {
        if (active) {
          setError(err.message || 'Failed to load expenses.');
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    loadInitialExpenses();

    return () => {
      active = false;
    };
  }, []);

  const pending = expenses.filter(
    (expense) => expense.status === 'pending'
  ).length;

  const approved = expenses.filter(
    (expense) => expense.status === 'approved'
  ).length;

  const rejected = expenses.filter(
    (expense) => expense.status === 'rejected'
  ).length;

  const filteredExpenses =
    filter === 'all'
      ? expenses
      : expenses.filter(
          (expense) => expense.status === filter
        );

  return (
    <div className="history-page">
      <div className="history-header">
        <div>
          <h1>Expense History</h1>
          <p>
            View your submitted reimbursement requests
            and track their status.
          </p>
        </div>

        <Link to="/expenses/new" className="history-new-button">
          <FilePlus size={18} />
          New Expense
        </Link>
      </div>

      <div className="history-stats">
        <div className="history-stat-card">
          <Clock size={24} className="status-pending-icon" />
          <p>Pending</p>
          <h2>{pending}</h2>
        </div>

        <div className="history-stat-card">
          <CheckCircle
            size={24}
            className="status-approved-icon"
          />
          <p>Approved</p>
          <h2>{approved}</h2>
        </div>

        <div className="history-stat-card">
          <XCircle
            size={24}
            className="status-rejected-icon"
          />
          <p>Rejected</p>
          <h2>{rejected}</h2>
        </div>
      </div>

      <div className="history-table-card">
        <div className="history-toolbar">
          <div>
            <h2>My Expenses</h2>
            <p>
              {filteredExpenses.length} request(s)
            </p>
          </div>

          <button
            type="button"
            className="history-refresh"
            onClick={loadExpenses}
            disabled={loading}
          >
            <RefreshCw size={16} />
            Refresh
          </button>
        </div>

        <div className="history-filters">
          {STATUSES.map((status) => (
            <button
              key={status}
              type="button"
              className={
                filter === status
                  ? 'history-filter active'
                  : 'history-filter'
              }
              onClick={() => setFilter(status)}
            >
              {status === 'all'
                ? 'All Expenses'
                : status.charAt(0).toUpperCase() +
                  status.slice(1)}
            </button>
          ))}
        </div>

        {error && (
          <div className="error-message" role="alert">
            {error}
          </div>
        )}

        {loading ? (
          <div className="history-empty">
            Loading expenses...
          </div>
        ) : error && expenses.length === 0 ? (
          <div className="history-empty">
            Unable to display expenses.
          </div>
        ) : filteredExpenses.length === 0 ? (
          <div className="history-empty">
            <Receipt size={40} />
            <h3>No expenses found</h3>
            <p>
              {filter === 'all'
                ? 'You have not submitted any expenses yet.'
                : `You have no ${filter} expenses.`}
            </p>
            <Link to="/expenses/new" className="back-link">
              Submit an Expense
            </Link>
          </div>
        ) : (
          <div className="history-table-scroll">
            <table className="history-table">
              <thead>
                <tr>
                  <th>Expense</th>
                  <th>Date</th>
                  <th>Amount</th>
                  <th>Status</th>
                </tr>
              </thead>

              <tbody>
                {filteredExpenses.map((expense) => (
                  <tr key={expense.id}>
                    <td>
                      <div className="history-expense-cell">
                        <div className="history-expense-icon">
                          <Receipt size={20} />
                        </div>
                        <div>
                          <strong>{expense.category}</strong>
                          <p>{expense.description}</p>
                        </div>
                      </div>
                    </td>

                    <td>{formatDate(expense.expense_date)}</td>

                    <td className="history-amount">
                      {formatAmount(
                        expense.amount,
                        expense.currency
                      )}
                    </td>

                    <td>
                      <span
                        className={`history-status status-${expense.status}`}
                      >
                        {expense.status.charAt(0).toUpperCase() +
                          expense.status.slice(1)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
