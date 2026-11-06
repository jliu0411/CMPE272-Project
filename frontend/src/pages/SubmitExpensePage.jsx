
import ExpenseForm from '../components/ExpenseForm';

export default function SubmitExpensePage() {
  return (
    <div className="submit-expense-page">
      <div className="dashboard-header">
        <h1>Submit New Expense</h1>
        <p>
          Request reimbursement for a business-related expense.
        </p>
      </div>

      <div className="expense-form-card">
        <ExpenseForm />
      </div>
    </div>
  );
}
