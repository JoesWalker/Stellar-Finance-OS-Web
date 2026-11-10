import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { renderApp } from '../test/render';
import { db } from '../test/server';

describe('transactions page', () => {
  it('links an unmatched payment to an invoice', async () => {
    const user = userEvent.setup();
    renderApp('/transactions?filter=unmatched', { as: 'accountant' });
    const row = (await screen.findByText('4,250.00 USDC')).closest('tr')!;
    await user.click(within(row).getByRole('button', { name: 'Match' }));
    const drawer = await screen.findByRole('dialog');
    await user.click(await within(drawer).findByRole('radio', { name: /INV-1001/ }));
    await user.click(within(drawer).getByRole('button', { name: 'Match to invoice' }));
    await screen.findByText('310.00 USDC');
    expect(screen.queryByText('4,250.00 USDC')).not.toBeInTheDocument();
    expect(db.invoices.find((i) => i.id === 'inv_1001')!.status).toBe('paid');
  });

  it('searches open invoices in the match drawer', async () => {
    const user = userEvent.setup();
    renderApp('/transactions?filter=unmatched', { as: 'accountant' });
    const row = (await screen.findByText('4,250.00 USDC')).closest('tr')!;
    await user.click(within(row).getByRole('button', { name: 'Match' }));
    const drawer = await screen.findByRole('dialog');
    await within(drawer).findByRole('radio', { name: /INV-1001/ });
    await user.type(within(drawer).getByRole('searchbox'), 'Acme');
    expect(
      await within(drawer).findByRole('radio', { name: /INV-1007 · Acme Retail/ }),
    ).toBeInTheDocument();
    await waitFor(() =>
      expect(within(drawer).queryByRole('radio', { name: /INV-1001/ })).not.toBeInTheDocument(),
    );
  });

  it('shows matched invoices and hides the match action from viewers', async () => {
    renderApp('/transactions', { as: 'viewer' });
    expect(await screen.findByRole('link', { name: 'INV-1003' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Match' })).not.toBeInTheDocument();
    const table = screen.getByRole('table', { name: 'Transactions' });
    expect(within(table).getAllByText('Unmatched')).toHaveLength(2);
  });

  it('uses plain language for activity', async () => {
    renderApp('/transactions', { as: 'viewer' });
    expect((await screen.findAllByText('Payment received')).length).toBeGreaterThan(0);
    expect(screen.getByText('Payment sent')).toBeInTheDocument();
  });
});
