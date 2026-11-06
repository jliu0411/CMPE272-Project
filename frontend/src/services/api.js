
import { supabase } from './supabase';

const API_URL =
  import.meta.env.VITE_API_URL || 'http://localhost:8000';

export async function submitExpense(expense) {
  if (!supabase) {
    throw new Error('Supabase is not configured.');
  }

  // Get the current Supabase authentication session.
  const { data, error: sessionError } =
    await supabase.auth.getSession();

  if (sessionError || !data.session?.access_token) {
    throw new Error('Please sign in before submitting an expense.');
  }

  const token = data.session.access_token;

  // Build the request body, including any uploaded receipt.
  const formData = new FormData();

  formData.append('amount', expense.amount);
  formData.append('currency', expense.currency);
  formData.append('category', expense.category);
  formData.append('expense_date', expense.expense_date);
  formData.append('description', expense.description);

  if (expense.receipt) {
    formData.append('receipt', expense.receipt);
  }

  let response;

  try {
    response = await fetch(`${API_URL}/expenses`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: formData,
    });
  } catch {
    throw new Error(
      'Cannot connect to the REMS backend. Check that FastAPI is running.'
    );
  }

  if (!response.ok) {
    let message = `Submission failed (${response.status}).`;

    try {
      const errorData = await response.json();

      if (typeof errorData.detail === 'string') {
        message = errorData.detail;
      } else if (typeof errorData.message === 'string') {
        message = errorData.message;
      }
    } catch {
      // Keep the default error message if the response is not JSON.
    }

    throw new Error(message);
  }

  return await response.json();
}


export async function getExpenses() {
  if (!supabase) {
    throw new Error('Supabase is not configured.');
  }

  const { data, error } = await supabase.auth.getSession();

  if (error || !data.session?.access_token) {
    throw new Error('You must be signed in to view expenses.');
  }

  let response;

  try {
    response = await fetch(`${API_URL}/expenses`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${data.session.access_token}`,
      },
    });
  } catch {
    throw new Error(
      'Cannot connect to the REMS backend. Make sure FastAPI is running.'
    );
  }

  if (!response.ok) {
    if (response.status === 401 || response.status === 403) {
      throw new Error(
        'Your session is invalid or you do not have permission.'
      );
    }

    throw new Error(
      `Failed to load expenses (${response.status}).`
    );
  }

  const result = await response.json();

  return result.expenses || [];
}
