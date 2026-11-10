import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { renderApp } from '../test/render';

describe('invoices page', () => {
  it('lists invoices with status, amount and overdue label', async () => {
    renderApp('/invoices', { as: 'accountant' });
    const row = (await screen.findByRole('link', { name: 'INV-1002' })).closest('tr')!;
    expect(within(row).getByText('Overdue')).toBeInTheDocument();
    expect(within(row).getByText('8,000.00 USDC')).toBeInTheDocument();
    expect(within(row).getByText('3 days overdue')).toBeInTheDocument();
  });

  it('filters by status via the URL', async () => {
    const user = userEvent.setup();
    const { router } = renderApp('/invoices', { as: 'accountant' });
    await screen.findByRole('link', { name: 'INV-1001' });
    await user.click(screen.getByRole('button', { name: 'Paid' }));
    expect(await screen.findByRole('link', { name: 'INV-1003' })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'INV-1001' })).not.toBeInTheDocument();
    expect(router.state.location.search).toBe('?status=paid');
  });

  it('searches on the server, keeps it in the URL and shows a distinct no-results state', async () => {
    const user = userEvent.setup();
    const { router } = renderApp('/invoices', { as: 'accountant' });
    await screen.findByRole('link', { name: 'INV-1001' });
    await user.type(screen.getByRole('searchbox', { name: 'Search invoices' }), 'Acme');
    expect(await screen.findByRole('link', { name: 'INV-1007' })).toBeInTheDocument();
    await waitFor(() =>
      expect(screen.queryByRole('link', { name: 'INV-1001' })).not.toBeInTheDocument(),
    );
    expect(router.state.location.search).toBe('?q=Acme');

    await user.clear(screen.getByRole('searchbox', { name: 'Search invoices' }));
    await user.type(screen.getByRole('searchbox', { name: 'Search invoices' }), 'zzz-nothing');
    expect(await screen.findByText('No invoices match your search')).toBeInTheDocument();
    expect(screen.queryByText("You haven't created any invoices yet")).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Clear filters' }));
    expect(await screen.findByRole('link', { name: 'INV-1001' })).toBeInTheDocument();
    expect(router.state.location.search).toBe('');
  });

  it('restores search, filter and sort from the URL and sorts on the server', async () => {
    const user = userEvent.setup();
    const { router } = renderApp('/invoices?q=INV&status=paid&sort=amount:asc', {
      as: 'accountant',
    });
    expect(await screen.findByRole('searchbox', { name: 'Search invoices' })).toHaveValue('INV');
    expect(screen.getByRole('button', { name: 'Paid' })).toHaveAttribute('aria-pressed', 'true');
    const firstAmounts = async () => {
      const rows = (await screen.findAllByRole('row')).slice(1);
      return rows.map((r) => within(r).getAllByRole('cell')[4]!.textContent);
    };
    await waitFor(async () => expect((await firstAmounts())[0]).toBe('250.00 USDC'));
    expect(screen.getByText(/Showing 25 of \d+/)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /Amount/ }));
    expect(router.state.location.search).toContain('sort=amount%3Adesc');
    await waitFor(async () => expect((await firstAmounts())[0]).not.toBe('250.00 USDC'));
  });

  it('sends a draft from the quick actions menu', async () => {
    const user = userEvent.setup();
    renderApp('/invoices', { as: 'accountant' });
    await user.click(await screen.findByRole('button', { name: 'Actions for INV-1004' }));
    await user.click(await screen.findByRole('menuitem', { name: /send invoice/i }));
    const row = (await screen.findByRole('link', { name: 'INV-1004' })).closest('tr')!;
    expect(await within(row).findByText('Sent')).toBeInTheDocument();
  });

  it('hides write actions from viewers', async () => {
    const user = userEvent.setup();
    renderApp('/invoices', { as: 'viewer' });
    await user.click(await screen.findByRole('button', { name: 'Actions for INV-1001' }));
    expect(await screen.findByRole('menuitem', { name: /copy pay link/i })).toBeInTheDocument();
    expect(screen.queryByRole('menuitem', { name: /void/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /new invoice/i })).not.toBeInTheDocument();
  });
});
