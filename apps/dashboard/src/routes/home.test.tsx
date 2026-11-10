import { screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { renderApp } from '../test/render';

describe('dashboard home', () => {
  it('shows the numbers the API returns', async () => {
    renderApp('/', { as: 'approver' });
    const open = (await screen.findByText('Open invoices')).closest('a')!;
    // INV-1001 (4,250) + INV-1002 (8,000 − 2,500) + INV-1006 (3,000 − 1,000) + INV-1007 (1,200)
    expect(within(open).getByText('4')).toBeInTheDocument();
    expect(within(open).getByText('12,950.00 USDC')).toBeInTheDocument();
    const approvals = screen.getByText('Waiting for your approval').closest('a')!;
    expect(approvals).toHaveAttribute('href', '/approvals');
    expect(
      within(screen.getByText('Unmatched payments').closest('a')!).getByText('2'),
    ).toBeInTheDocument();
    expect(screen.getByText('48,250.75 USDC')).toBeInTheDocument();
  });

  it('offers a table view of the chart', async () => {
    renderApp('/', { as: 'viewer' });
    expect(await screen.findByText('View as table')).toBeInTheDocument();
    expect(screen.getByRole('table', { name: /money in and out per day/i })).toBeInTheDocument();
  });
});
