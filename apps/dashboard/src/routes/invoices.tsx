import { Link } from 'react-router';
import { useInvoices, type InvoiceStatus } from '@finance-os/api-client';
import {
  Button,
  DataTable,
  EmptyState,
  LoadMore,
  NoResults,
  PageHeader,
  SearchInput,
} from '@finance-os/ui';
import { FileText, Plus } from 'lucide-react';
import { Can } from '../components/can';
import { QueryView } from '../components/query-view';
import { invoiceColumns } from '../features/invoices/invoice-columns';
import { StatusFilter } from '../features/invoices/status-filter';
import { useListParams } from '../lib/use-list-params';

export function InvoicesPage() {
  const list = useListParams();
  const status = (list.params.get('status') as InvoiceStatus | null) ?? undefined;
  const filtered = Boolean(status || list.q);
  const query = useInvoices({ status, q: list.q, sort: list.sortParam });

  return (
    <>
      <PageHeader
        title="Invoices"
        description="Bill clients and get paid in USDC."
        actions={
          <Can permission="invoices:write">
            <Button asChild>
              <Link to="/invoices/new">
                <Plus /> New invoice
              </Link>
            </Button>
          </Can>
        }
      />
      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <SearchInput
          aria-label="Search invoices"
          placeholder="Number, client or amount"
          value={list.q}
          onValueChange={list.setQ}
        />
        <StatusFilter value={status} onChange={(next) => list.set({ status: next })} />
      </div>
      <QueryView
        query={query}
        resource="invoices"
        isEmpty={(page) => page.items.length === 0}
        empty={
          filtered ? (
            <NoResults resource="invoices" onClear={() => list.set({ q: null, status: null })} />
          ) : (
            <EmptyState
              icon={<FileText />}
              title="You haven't created any invoices yet"
              description="Create your first invoice to get paid."
            />
          )
        }
      >
        {(page) => (
          <>
            <DataTable
              aria-label="Invoices"
              columns={invoiceColumns}
              data={page.items}
              getRowId={(invoice) => invoice.id}
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
    </>
  );
}
