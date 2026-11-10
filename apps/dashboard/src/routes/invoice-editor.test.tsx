import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { renderApp } from '../test/render';

describe('invoice editor', () => {
  it('creates a draft, then sends it end to end', async () => {
    const user = userEvent.setup();
    const { router } = renderApp('/invoices/new', { as: 'accountant' });
    await user.selectOptions(await screen.findByLabelText('Client'), 'Initech');
    await user.type(screen.getByLabelText('Description for line 1'), 'Strategy session');
    await user.clear(screen.getByLabelText('Quantity for line 1'));
    await user.type(screen.getByLabelText('Quantity for line 1'), '3');
    await user.type(screen.getByLabelText('Unit price for line 1'), '0.10');
    expect(screen.getAllByText('0.30 USDC').length).toBeGreaterThan(0);

    await user.click(screen.getByRole('button', { name: 'Add line' }));
    await user.type(screen.getByLabelText('Description for line 2'), 'Travel');
    await user.type(screen.getByLabelText('Unit price for line 2'), '100');
    expect(screen.getByText('100.30 USDC')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Save draft' }));
    expect(await screen.findByRole('heading', { name: /Invoice INV-1008/ })).toBeInTheDocument();
    expect(router.state.location.pathname).toMatch(/^\/invoices\/inv_/);
    expect(screen.getByText('Send the invoice to share its pay link.')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /send invoice/i }));
    expect(await screen.findByRole('button', { name: 'Copy pay link' })).toBeInTheDocument();
    expect(screen.getByText(/\/i\/pub_1008$/)).toBeInTheDocument();
  });

  it('validates required fields', async () => {
    const user = userEvent.setup();
    renderApp('/invoices/new', { as: 'accountant' });
    await user.click(await screen.findByRole('button', { name: 'Save draft' }));
    expect(await screen.findByText('Choose a client')).toBeInTheDocument();
    expect(screen.getByText('Describe the item')).toBeInTheDocument();
  });

  it('tells viewers they cannot create invoices', async () => {
    renderApp('/invoices/new', { as: 'viewer' });
    expect(await screen.findByText("You can't edit invoices")).toBeInTheDocument();
  });
});
