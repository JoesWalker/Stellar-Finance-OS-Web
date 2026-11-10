import { Link, useNavigate, useParams } from 'react-router';
import { useClients, useCreateInvoice, useInvoice, useUpdateInvoice } from '@finance-os/api-client';
import { Button, EmptyState, PageHeader, Spinner } from '@finance-os/ui';
import { Lock, Users } from 'lucide-react';
import { usePermission } from '../auth/use-permission';
import { QueryView } from '../components/query-view';
import { InvoiceForm } from '../features/invoices/invoice-form';
import { emptyLineItem, fromDueDateIso } from '../features/invoices/invoice-schema';

function inThirtyDays() {
  const d = new Date();
  d.setDate(d.getDate() + 30);
  return fromDueDateIso(d.toISOString());
}

function NoAccess() {
  return (
    <EmptyState
      icon={<Lock />}
      title="You can't edit invoices"
      description="Ask an owner, admin or accountant to create this invoice."
    />
  );
}

/** Pickers load one large page; a searchable combobox can replace this when lists grow. */
const PICKER = { limit: 100, sort: 'name:asc' };

export function InvoiceEditorPage() {
  const canWrite = usePermission('invoices:write');
  const clients = useClients(PICKER);
  const create = useCreateInvoice();
  const navigate = useNavigate();

  return (
    <>
      <PageHeader title="New invoice" description="Line items, currency and due date." />
      {!canWrite ? (
        <NoAccess />
      ) : (
        <QueryView
          query={clients}
          resource="clients"
          isEmpty={(list) => list.items.length === 0}
          empty={
            <EmptyState
              icon={<Users />}
              title="Add a client first"
              description="Every invoice is addressed to a client."
              action={
                <Button asChild>
                  <Link to="/clients">Go to clients</Link>
                </Button>
              }
            />
          }
        >
          {(list) => (
            <InvoiceForm
              clients={list.items}
              defaultValues={{
                clientId: '',
                assetCode: 'USDC',
                dueDate: inThirtyDays(),
                notes: '',
                lineItems: [{ ...emptyLineItem }],
              }}
              submitLabel="Save draft"
              pending={create.isPending}
              error={create.error}
              cancelTo="/invoices"
              onSubmit={(input) =>
                create.mutate(input, {
                  onSuccess: (invoice) => navigate(`/invoices/${invoice.id}`),
                })
              }
            />
          )}
        </QueryView>
      )}
    </>
  );
}

export function InvoiceEditPage() {
  const { id = '' } = useParams();
  const canWrite = usePermission('invoices:write');
  const invoice = useInvoice(id);
  const clients = useClients(PICKER);
  const update = useUpdateInvoice(id);
  const navigate = useNavigate();

  if (!canWrite) return <NoAccess />;
  if (clients.isPending) return <Spinner label="Loading clients" />;

  return (
    <>
      <PageHeader title={invoice.data ? `Edit ${invoice.data.number}` : 'Edit invoice'} />
      <QueryView query={invoice} resource="this invoice">
        {(inv) =>
          inv.status !== 'draft' ? (
            <EmptyState
              title="Only drafts can be edited"
              description="This invoice was already sent. Void it and create a new one if something changed."
            />
          ) : (
            <InvoiceForm
              clients={clients.data?.items ?? []}
              defaultValues={{
                clientId: inv.clientId,
                assetCode: inv.assetCode === 'XLM' ? 'XLM' : 'USDC',
                dueDate: fromDueDateIso(inv.dueDate),
                notes: inv.notes ?? '',
                lineItems: inv.lineItems.map(({ description, quantity, unitPrice }) => ({
                  description,
                  quantity,
                  unitPrice,
                })),
              }}
              submitLabel="Save changes"
              pending={update.isPending}
              error={update.error}
              cancelTo={`/invoices/${inv.id}`}
              onSubmit={(input) =>
                update.mutate(input, { onSuccess: () => navigate(`/invoices/${inv.id}`) })
              }
            />
          )
        }
      </QueryView>
    </>
  );
}
