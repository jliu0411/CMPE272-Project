import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import ExpenseForm from './ExpenseForm';
import { submitExpense } from '../services/api';

vi.mock('../services/api', () => ({
  submitExpense: vi.fn(),
}));

describe('ExpenseForm', () => {
  it('shows an error when the API rejects the submission', async () => {
  const user = userEvent.setup();

  submitExpense.mockRejectedValue(
    new Error('Unable to submit expense.')
  );

  render(<ExpenseForm />);

  await user.type(screen.getByLabelText(/amount/i), '25.50');

  await user.selectOptions(
    screen.getByLabelText(/category/i),
    'Meals'
  );

  await user.type(
    screen.getByLabelText(/expense date/i),
    '2025-01-01'
  );

  await user.type(
    screen.getByLabelText(/description/i),
    'Team lunch'
  );

  await user.click(
    screen.getByRole('button', { name: /submit expense/i })
  );

  expect(
    await screen.findByRole('alert')
  ).toHaveTextContent(/unable to submit expense/i);
});

  it('submits a valid expense successfully', async () => {
    const user = userEvent.setup();

    submitExpense.mockResolvedValue({
      status: 'pending',
    });

    render(<ExpenseForm />);

    await user.type(screen.getByLabelText(/amount/i), '25.50');
    await user.selectOptions(
      screen.getByLabelText(/category/i),
      'Meals'
    );
    await user.type(
      screen.getByLabelText(/expense date/i),
      '2025-01-01'
    );
    await user.type(
      screen.getByLabelText(/description/i),
      'Team lunch'
    );

    await user.click(
      screen.getByRole('button', { name: /submit expense/i })
    );

    expect(submitExpense).toHaveBeenCalledWith(
      expect.objectContaining({
        amount: '25.50',
        currency: 'USD',
        category: 'Meals',
        expense_date: '2025-01-01',
        description: 'Team lunch',
        receipt: null,
      })
    );

    expect(
      await screen.findByRole('status')
    ).toHaveTextContent(/submitted successfully/i);
  });
});