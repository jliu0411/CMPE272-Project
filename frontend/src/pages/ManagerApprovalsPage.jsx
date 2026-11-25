import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../services/supabase';

function ReceiptViewer({ receipt }) {
  const [open, setOpen] = useState(false);
  const [preview, setPreview] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return;

    const controller = new AbortController();
    let objectUrl;

    async function loadReceipt() {
      try {
        const { data } = await supabase.auth.getSession();
        const token = data.session?.access_token;
        if (!token) throw new Error('Please sign in again.');

        const api = import.meta.env.VITE_API_URL || 'http://localhost:8000';
        const response = await fetch(`${api}/receipts/${receipt.id}/view`, {
          headers: { Authorization: `Bearer ${token}` },
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new Error(`Unable to open receipt (${response.status}).`);
        }

        const file = await response.blob();
        if (controller.signal.aborted) return;

        objectUrl = URL.createObjectURL(file);
        setPreview({ url: objectUrl, type: file.type });
      } catch (err) {
        if (!controller.signal.aborted) setError(err.message);
      }
    }

    loadReceipt();

    return () => {
      controller.abort();
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [open, receipt.id]);

  function toggleReceipt() {
    setPreview(null);
    setError('');
    setOpen(!open);
  }

  return (
    <div>
      <button type="button" onClick={toggleReceipt} aria-expanded={open}>
        {open ? 'Hide receipt' : 'View receipt'} · {receipt.original_name}
      </button>

      {open && !preview && !error && <p>Loading receipt…</p>}
      {error && <p role="alert">{error}</p>}

      {preview && (
        preview.type.startsWith('image/') ? (
          <p>
            <img
              src={preview.url}
              alt={`Receipt: ${receipt.original_name}`}
              style={{ maxWidth: '100%', maxHeight: 480 }}
            />
          </p>
        ) : (
          <p>
            <a href={preview.url} target="_blank" rel="noopener noreferrer">
              Open PDF receipt
            </a>
          </p>
        )
      )}
    </div>
  );
}

function DecisionControls({ expenseId, onSaved }) {
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function submitDecision(decision) {
    const note = reason.trim();
    if (decision === 'rejected' && !note) {
      setError('Enter a reason before rejecting this expense.');
      return;
    }

    setSaving(true);
    setError('');

    try {
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      if (!token) throw new Error('Please sign in again.');

      const api = import.meta.env.VITE_API_URL || 'http://localhost:8000';
      const params = new URLSearchParams({ expense_id: expenseId, decision });
      if (note) params.set('reason', note);

      const response = await fetch(`${api}/approve?${params}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const result = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          typeof result.detail === 'string'
            ? result.detail
            : `Unable to save decision (${response.status}).`
        );
      }

      onSaved(result.expense_id, result.status);
    } catch (err) {
      setError(err.message || 'Unable to save decision.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <label>
        Reason (required for rejection)
        <textarea
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          disabled={saving}
          rows={2}
        />
      </label>
      <div>
        <button type="button" disabled={saving}
          onClick={() => submitDecision('approved')}>
          Approve
        </button>
        <button type="button" disabled={saving}
          onClick={() => submitDecision('rejected')}>
          Reject
        </button>
      </div>
      {error && <p role="alert">{error}</p>}
    </div>
  );
}

export default function ManagerApprovalsPage() {
  const { user } = useAuth();
  const managerId = user?.id;
  const [requests, setRequests] = useState([]);
  const [decisionMessage, setDecisionMessage] = useState('');

  function handleDecisionSaved(expenseId, status) {
    setRequests((current) => current.filter((item) => item.id !== expenseId));
    setDecisionMessage(`Expense ${status}.`);
  }
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!managerId) return;
    let active = true;

    async function loadRequests() {
      setLoading(true);
      setError('');
      setRequests([]);

      try {
        const { data, error } = await supabase
          .from('expenses')
	  .select('id, category, description, amount, currency, expense_date, receipts(id,original_name, storage_path)')
          .eq('assigned_manager_id', managerId)
          .eq('status', 'pending')
          .order('created_at', { ascending: false });

        if (error) throw error;
        if (active) setRequests(data ?? []);
      } catch (err) {
        if (active) setError(err.message || 'Unable to load pending requests.');
      } finally {
        if (active) setLoading(false);
      }
    }

    loadRequests();
    return () => { active = false; };
  }, [managerId]);

  return (
    <main className="history-page">
      <h1>Expense Approvals</h1>
      <h2>Assigned pending requests</h2>
        <p role="status">{decisionMessage}</p>

      {loading && <p>Loading pending requests…</p>}
      {error && <p role="alert">{error}</p>}
      {!loading && !error && requests.length === 0 && (
        <p>No pending requests assigned to you.</p>
      )}

      {requests.map((request) => (
        <article key={request.id}>
          <h3>{request.category}</h3>
          <p>{request.description}</p>
	  {request.receipts?.length ? (
	    request.receipts.map((receipt) => (
	 	<ReceiptViewer key={receipt.id} receipt={receipt} />   
 	    ))
	  ) : (
   	    <p>No receipt available.</p>
	  )}
          <p>
            {request.expense_date} · {new Intl.NumberFormat('en-US', {
              style: 'currency',
              currency: request.currency,
            }).format(request.amount)}
          </p>
          <DecisionControls expenseId={request.id} onSaved={handleDecisionSaved} />
        </article>
      ))}
    </main>
  );
}
