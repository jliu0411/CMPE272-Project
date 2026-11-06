
import { useState } from 'react';
import { Upload, Send, CheckCircle } from 'lucide-react';
import { submitExpense } from '../services/api';

const CATEGORIES = [
  'Travel',
  'Meals',
  'Office Supplies',
  'Transportation',
  'Equipment',
  'Other',
];

export default function ExpenseForm() {
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('');
  const [date, setDate] = useState('');
  const [description, setDescription] = useState('');
  const [receipt, setReceipt] = useState(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const now = new Date();
  const today = [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, '0'),
    String(now.getDate()).padStart(2, '0'),
  ].join('-');

  function handleFileChange(event) {
    const file = event.target.files?.[0];

    setError('');
    setReceipt(null);

    if (!file) return;

    const allowedTypes = [
      'application/pdf',
      'image/jpeg',
      'image/png',
    ];

    if (!allowedTypes.includes(file.type)) {
      setError('Only PDF, JPG, and PNG files are allowed.');
      event.target.value = '';
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError('Receipt must be smaller than 5 MB.');
      event.target.value = '';
      return;
    }

    setReceipt(file);
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');
    setSuccess('');

    const numericAmount = Number(amount);

    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      setError('Please enter a valid amount greater than zero.');
      return;
    }

    if (!/^\d+(\.\d{1,2})?$/.test(amount.trim())) {
      setError('Amount must have at most two decimal places.');
      return;
    }

    if (numericAmount > 9999999999.99) {
      setError('Expense amount exceeds the supported limit.');
      return;
    }

    if (!CATEGORIES.includes(category)) {
      setError('Please select a valid category.');
      return;
    }

    if (!date || date > today) {
      setError('Please select a valid expense date.');
      return;
    }

    if (!description.trim()) {
      setError('Please enter a description.');
      return;
    }

    setLoading(true);

    try {
      await submitExpense({
        amount: numericAmount.toFixed(2),
        currency: 'USD',
        category,
        expense_date: date,
        description: description.trim(),
        receipt,
      });

      setSuccess('Expense submitted successfully!');

      setAmount('');
      setCategory('');
      setDate('');
      setDescription('');
      setReceipt(null);

      event.target.reset();
    } catch (err) {
      setError(err.message || 'Unable to submit expense.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <form className="expense-form" onSubmit={handleSubmit}>
      <div className="expense-form-header">
        <h2>Expense Details</h2>
        <p>
          Enter the information for your reimbursement request.
        </p>
      </div>

      <div className="expense-form-grid">
        <div className="form-group">
          <label htmlFor="amount">Amount (USD) *</label>
          <input
            id="amount"
            type="number"
            min="0.01"
            max="9999999999.99"
            step="0.01"
            placeholder="0.00"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="category">Category *</label>
          <select
            id="category"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            required
          >
            <option value="">Select a category</option>
            {CATEGORIES.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="form-group">
        <label htmlFor="date">Expense Date *</label>
        <input
          id="date"
          type="date"
          value={date}
          max={today}
          onChange={(e) => setDate(e.target.value)}
          required
        />
      </div>

      <div className="form-group">
        <label htmlFor="description">Description *</label>
        <textarea
          id="description"
          rows="4"
          maxLength={1000}
          placeholder="What was this expense for?"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          required
        />
        <small>{description.length}/1000 characters</small>
      </div>

      <div className="form-group">
        <label htmlFor="receipt">Receipt (Optional)</label>

        <div className="receipt-upload">
          <Upload size={28} />

          <input
            id="receipt"
            type="file"
            accept=".pdf,.jpg,.jpeg,.png"
            onChange={handleFileChange}
          />

          <small>PDF, JPG, PNG — Maximum 5 MB</small>

          {receipt && (
            <p className="selected-file">
              Selected: {receipt.name}
            </p>
          )}
        </div>
      </div>

      {error && (
        <div className="error-message" role="alert">
          {error}
        </div>
      )}

      {success && (
        <div className="success-message" role="status">
          <CheckCircle size={18} />
          {success}
        </div>
      )}

      <div className="expense-form-actions">
        <button
          type="submit"
          className="primary-button"
          disabled={loading}
        >
          <Send size={18} />
          {loading ? 'Submitting...' : 'Submit Expense'}
        </button>
      </div>
    </form>
  );
}
