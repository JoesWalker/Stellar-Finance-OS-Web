import { useState } from 'react';
import { Link } from 'react-router';
import { useTransactions, type Transaction } from '@finance-os/api-client';
import {
  Address,
  Amount,
  Button,
  cn,
  createDataTableColumns,
  DataTable,
  EmptyState,
  LoadMore,
  NoResults,
  PageHeader,
  SearchInput,
} from '@finance-os/ui';
import { explorerUrl, formatDate } from '@finance-os/utils';
import { ArrowDownLeft, ArrowLeftRight, ArrowUpRight, ExternalLink } from 'lucide-react';
import { usePermission } from '../auth/use-permission';
import { QueryView } from '../components/query-view';
import { env } from '../env';
import { MatchDrawer } from '../features/transactions/match-drawer';
import { useListParams } from '../lib/use-list-params';

const col = createDataTableColumns<Transaction>();

export function TransactionsPage() {
  const list = useListParams();
  const unmatchedOnly = list.params.get('filter') === 'unmatched';
  const query = useTransactions({
    matchStatus: unmatchedOnly ? 'unmatched' : undefined,
    q: list.q,
    sort: list.sortParam,
  });
  const canMatch = usePermission('transactions:match');
  const [matching, setMatching] = useState<Transaction | null>(null);

  const columns = [
    col.accessor('createdAt', {
      header: 'Date',
      cell: ({ getValue }) => formatDate(getValue()),
    }),
    col.accessor('direction', {
      header: 'Activity',
      enableSorting: false,
      cell: ({ row }) =>
        row.original.direction === 'incoming' ? (
          <span className="inline-flex items-center gap-1.5">
            <ArrowDownLeft className="size-4 text-status-success" /> Payment received
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5">
            <ArrowUpRight className="size-4 text-muted-foreground" /> Payment sent
          </span>
        ),
    }),
    col.display({
      id: 'counterparty',
      header: 'From / to',
      cell: ({ row }) => (
        <Address
          value={row.original.direction === 'incoming' ? row.original.from : row.original.to}
        />
      ),
    }),
    col.accessor('memo', {
      header: 'Memo',
      enableSorting: false,
      cell: ({ getValue }) =>
        getValue() ? <code className="font-mono text-sm">{getValue()}</code> : '—',
    }),
    col.accessor('matchStatus', {
      header: 'Matched to',
      cell: ({ row }) => {
        const tx = row.original;
        if (tx.invoiceId)
          return (
            <Link className="hover:underline" to={`/invoices/${tx.invoiceId}`}>
              {tx.invoiceNumber}
            </Link>
          );
        if (tx.paymentRequestId) {
          return (
            <Link
              className="hover:underline"
              to={`/payments/outgoing?request=${tx.paymentRequestId}`}
            >
              Vendor payment
            </Link>
          );
        }
        return canMatch && tx.direction === 'incoming' ? (
          <Button size="sm" variant="outline" onClick={() => setMatching(tx)}>
            Match
          </Button>
        ) : (
          <span className="text-status-warning">Unmatched</span>
        );
      },
    }),
    col.accessor('amount', {
      header: 'Amount',
      meta: { className: 'text-right' },
      cell: ({ row }) => (
        <Amount
          value={row.original.amount}
          assetCode={row.original.assetCode}
          className={cn(row.original.direction === 'incoming' && 'text-status-success')}
        />
      ),
    }),
    col.display({
      id: 'explorer',
      header: () => <span className="sr-only">Explorer</span>,
      meta: { className: 'w-0' },
      cell: ({ row }) => (
        <a
          href={explorerUrl(env.explorerUrl, 'tx', row.original.txHash)}
          target="_blank"
          rel="noreferrer"
          className="inline-flex size-8 items-center justify-center rounded-md text-muted-foreground hover:bg-accent"
        >
          <ExternalLink className="size-4" />
          <span className="sr-only">View on explorer</span>
        </a>
      ),
    }),
  ];

  return (
    <>
      <PageHeader
        title="Transactions"
        description="Every payment in and out of your treasury accounts."
      />
      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <SearchInput
          aria-label="Search transactions"
          placeholder="Memo, amount, address or invoice"
          value={list.q}
          onValueChange={list.setQ}
        />
        <div role="group" aria-label="Filter transactions" className="flex gap-1.5">
          {[
            { label: 'All', value: false },
            { label: 'Unmatched', value: true },
          ].map((f) => (
            <Button
              key={f.label}
              size="sm"
              variant={unmatchedOnly === f.value ? 'default' : 'outline'}
              aria-pressed={unmatchedOnly === f.value}
              onClick={() => list.set({ filter: f.value ? 'unmatched' : null })}
            >
              {f.label}
            </Button>
          ))}
        </div>
      </div>
      <QueryView
        query={query}
        resource="transactions"
        isEmpty={(page) => page.items.length === 0}
        empty={
          list.q ? (
            <NoResults
              resource="transactions"
              onClear={() => list.set({ q: null, filter: null })}
            />
          ) : (
            <EmptyState
              icon={<ArrowLeftRight />}
              title={unmatchedOnly ? 'Everything is matched' : 'No transactions yet'}
              description={
                unmatchedOnly
                  ? 'Every payment received is linked to an invoice.'
                  : 'Payments will appear here as they happen.'
              }
            />
          )
        }
      >
        {(page) => (
          <>
            <DataTable
              aria-label="Transactions"
              columns={columns}
              data={page.items}
              getRowId={(t) => t.id}
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
      {matching ? <MatchDrawer transaction={matching} onClose={() => setMatching(null)} /> : null}
    </>
  );
}
