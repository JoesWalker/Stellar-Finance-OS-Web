import { Link } from 'react-router';
import type { Invoice } from '@finance-os/api-client';
import { Amount, createDataTableColumns, StatusBadge } from '@finance-os/ui';
import { DueLabel } from './due-label';
import { InvoiceActionsMenu } from './invoice-actions-menu';

// Column ids match the API's sort fields; the server sorts (see DataTable `onSortChange`).
const col = createDataTableColumns<Invoice>();

export const invoiceColumns = [
  col.accessor('number', {
    header: 'Number',
    cell: ({ row }) => (
      <Link className="font-medium hover:underline" to={`/invoices/${row.original.id}`}>
        {row.original.number}
      </Link>
    ),
  }),
  col.accessor('clientName', { header: 'Client' }),
  col.accessor('dueDate', {
    header: 'Due',
    cell: ({ row }) => <DueLabel dueDate={row.original.dueDate} status={row.original.status} />,
  }),
  col.accessor('status', {
    header: 'Status',
    cell: ({ row }) => <StatusBadge status={row.original.status} />,
  }),
  col.accessor('amount', {
    header: 'Amount',
    meta: { className: 'text-right' },
    cell: ({ row }) => <Amount value={row.original.amount} assetCode={row.original.assetCode} />,
  }),
  col.display({
    id: 'actions',
    header: () => <span className="sr-only">Actions</span>,
    meta: { className: 'w-0' },
    cell: ({ row }) => <InvoiceActionsMenu invoice={row.original} />,
  }),
];
