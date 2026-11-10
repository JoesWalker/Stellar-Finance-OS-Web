import { useState } from 'react';
import { useVendors, type Vendor } from '@finance-os/api-client';
import {
  Address,
  Button,
  createDataTableColumns,
  DataTable,
  EmptyState,
  LoadMore,
  NoResults,
  PageHeader,
  SearchInput,
} from '@finance-os/ui';
import { Plus, Store } from 'lucide-react';
import { usePermission } from '../auth/use-permission';
import { Can } from '../components/can';
import { QueryView } from '../components/query-view';
import { env } from '../env';
import { VendorFormDialog } from '../features/vendors/vendor-form-dialog';
import { useListParams } from '../lib/use-list-params';

const col = createDataTableColumns<Vendor>();

export function VendorsPage() {
  const list = useListParams();
  const query = useVendors({ q: list.q, sort: list.sortParam });
  const canWrite = usePermission('vendors:write');
  const [dialog, setDialog] = useState<{ open: boolean; vendor?: Vendor }>({ open: false });

  const columns = [
    col.accessor('name', {
      header: 'Name',
      cell: ({ getValue }) => <span className="font-medium">{getValue()}</span>,
    }),
    col.accessor('payoutAddress', {
      header: 'Payout address',
      enableSorting: false,
      cell: ({ getValue }) => <Address value={getValue()} explorerBaseUrl={env.explorerUrl} />,
    }),
    col.accessor('requiredMemo', {
      header: 'Required memo',
      enableSorting: false,
      cell: ({ row }) =>
        row.original.requiredMemo ? (
          <code className="font-mono text-sm">{row.original.requiredMemo}</code>
        ) : (
          <span className="text-muted-foreground">None</span>
        ),
    }),
    col.display({
      id: 'actions',
      header: () => <span className="sr-only">Actions</span>,
      meta: { className: 'w-0' },
      cell: ({ row }) =>
        canWrite ? (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setDialog({ open: true, vendor: row.original })}
          >
            Edit
          </Button>
        ) : null,
    }),
  ];

  return (
    <>
      <PageHeader
        title="Vendors"
        description="People and companies you pay."
        actions={
          <Can permission="vendors:write">
            <Button onClick={() => setDialog({ open: true })}>
              <Plus /> New vendor
            </Button>
          </Can>
        }
      />
      <SearchInput
        className="mb-4"
        aria-label="Search vendors"
        placeholder="Name, email or address"
        value={list.q}
        onValueChange={list.setQ}
      />
      <QueryView
        query={query}
        resource="vendors"
        isEmpty={(page) => page.items.length === 0}
        empty={
          list.q ? (
            <NoResults resource="vendors" onClear={() => list.set({ q: null })} />
          ) : (
            <EmptyState
              icon={<Store />}
              title="No vendors yet"
              description="Add a vendor to start paying them in USDC."
            />
          )
        }
      >
        {(page) => (
          <>
            <DataTable
              aria-label="Vendors"
              columns={columns}
              data={page.items}
              getRowId={(v) => v.id}
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
      <VendorFormDialog
        open={dialog.open}
        vendor={dialog.vendor}
        onOpenChange={(open) => setDialog((d) => ({ ...d, open }))}
      />
    </>
  );
}
