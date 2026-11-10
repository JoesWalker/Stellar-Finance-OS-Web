import { useState } from 'react';
import { usePaymentRequests, type PaymentRequest } from '@finance-os/api-client';
import {
  Amount,
  Button,
  createDataTableColumns,
  DataTable,
  EmptyState,
  LoadMore,
  NoResults,
  PageHeader,
  PaymentStatusBadge,
  SearchInput,
} from '@finance-os/ui';
import { formatRelative } from '@finance-os/utils';
import { Plus, Send } from 'lucide-react';
import { Can } from '../components/can';
import { QueryView } from '../components/query-view';
import { PaymentRequestFormDialog } from '../features/payments/payment-request-form-dialog';
import { PaymentRequestSheet } from '../features/payments/payment-request-sheet';
import { useListParams } from '../lib/use-list-params';

const col = createDataTableColumns<PaymentRequest>();

export function OutgoingPaymentsPage() {
  const list = useListParams();
  const query = usePaymentRequests({ q: list.q, sort: list.sortParam });
  const [creating, setCreating] = useState(false);
  const selected = list.params.get('request');
  const open = (id: string) => list.set({ request: id }, { replace: false });

  const columns = [
    col.accessor('vendorName', {
      header: 'Vendor',
      cell: ({ row }) => (
        <button
          type="button"
          className="font-medium hover:underline"
          onClick={() => open(row.original.id)}
        >
          {row.original.vendorName}
        </button>
      ),
    }),
    col.accessor('description', {
      header: 'For',
      enableSorting: false,
      cell: ({ getValue }) => getValue() || '—',
    }),
    col.accessor('status', {
      header: 'Status',
      cell: ({ row }) => <PaymentStatusBadge status={row.original.status} />,
    }),
    col.accessor('createdAt', {
      header: 'Requested',
      cell: ({ getValue }) => formatRelative(getValue()),
    }),
    col.accessor('amount', {
      header: 'Amount',
      meta: { className: 'text-right' },
      cell: ({ row }) => <Amount value={row.original.amount} assetCode={row.original.assetCode} />,
    }),
  ];

  return (
    <>
      <PageHeader
        title="Payments"
        description="Request a payment, get it approved, then sign and send."
        actions={
          <Can permission="payments:request">
            <Button onClick={() => setCreating(true)}>
              <Plus /> New payment request
            </Button>
          </Can>
        }
      />
      <SearchInput
        className="mb-4"
        aria-label="Search payment requests"
        placeholder="Vendor, description, memo or amount"
        value={list.q}
        onValueChange={list.setQ}
      />
      <QueryView
        query={query}
        resource="payment requests"
        isEmpty={(page) => page.items.length === 0}
        empty={
          list.q ? (
            <NoResults resource="payment requests" onClear={() => list.set({ q: null })} />
          ) : (
            <EmptyState
              icon={<Send />}
              title="No payment requests yet"
              description="Create one to pay a vendor."
            />
          )
        }
      >
        {(page) => (
          <>
            <DataTable
              aria-label="Payment requests"
              columns={columns}
              data={page.items}
              getRowId={(r) => r.id}
              sort={list.sort}
              onSortChange={list.setSort}
            />
            <LoadMore
              shown={page.items.length}
              total={page.total}
              hasMore={query.hasNextPage}
              loading={query.isFetchingNextPage}
              onLoadMore={() => void query.fetchNextPage()}
            />
          </>
        )}
      </QueryView>
      <PaymentRequestFormDialog open={creating} onOpenChange={setCreating} />
      <PaymentRequestSheet id={selected} onClose={() => list.set({ request: null })} />
    </>
  );
}
