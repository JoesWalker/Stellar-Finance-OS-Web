import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { createDataTableColumns, DataTable } from './data-table';

type Row = { name: string; total: number };
const helper = createDataTableColumns<Row>();
const columns = [
  helper.accessor('name', { header: 'Name' }),
  helper.accessor('total', { header: 'Total', enableSorting: false }),
];
const data: Row[] = [
  { name: 'Charlie', total: 3 },
  { name: 'alpha', total: 1 },
  { name: 'Bravo', total: 2 },
];

const names = () =>
  screen
    .getAllByRole('row')
    .slice(1)
    .map((r) => within(r).getAllByRole('cell')[0]!.textContent);

describe('DataTable', () => {
  it('renders rows and sorts by a column', async () => {
    const user = userEvent.setup();
    render(<DataTable columns={columns} data={data} aria-label="People" />);
    expect(names()).toEqual(['Charlie', 'alpha', 'Bravo']);
    await user.click(screen.getByRole('button', { name: 'Name' }));
    expect(names()).toEqual(['alpha', 'Bravo', 'Charlie']);
    expect(screen.queryByRole('button', { name: 'Total' })).not.toBeInTheDocument();
  });

  it('leaves sorting to the server when onSortChange is given', async () => {
    const user = userEvent.setup();
    const onSortChange = vi.fn();
    render(
      <DataTable
        columns={columns}
        data={data}
        sort={null}
        onSortChange={onSortChange}
        aria-label="People"
      />,
    );
    await user.click(screen.getByRole('button', { name: 'Name' }));
    expect(onSortChange).toHaveBeenCalledWith({ id: 'name', desc: false });
    expect(names()).toEqual(['Charlie', 'alpha', 'Bravo']);
  });
});
