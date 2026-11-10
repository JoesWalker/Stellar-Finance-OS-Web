import Big from 'big.js';
import { http, HttpResponse } from 'msw';
import { paginate } from '../list';
import type { InvoiceDetail, InvoiceInput, InvoiceStatus } from '../../types';
import { authenticate, error, newId, requireRole, WRITE_ROLES, type MockContext } from '../context';
import { paymentReference, sum, type MockDb } from '../db';

/** Strip detail-only fields for list responses. */
const summary = ({ lineItems: _l, payment: _p, matches: _m, ...rest }: InvoiceDetail) => rest;

function applyInput(db: MockDb, input: InvoiceInput) {
  const client = db.clients.find((c) => c.id === input.clientId);
  const lineItems = input.lineItems.map((li) => ({
    ...li,
    total: new Big(li.quantity).times(li.unitPrice).toFixed(2),
  }));
  return {
    clientId: input.clientId,
    clientName: client?.name ?? 'Unknown client',
    assetCode: input.assetCode,
    dueDate: input.dueDate,
    notes: input.notes ?? '',
    lineItems,
    amount: sum(lineItems.map((l) => l.total)),
  };
}

export const invoiceHandlers = ({ db, base }: MockContext) => [
  http.get(`${base}/invoices`, ({ request }) => {
    const caller = authenticate(db, request);
    if (caller instanceof Response) return caller;
    const url = new URL(request.url);
    const statuses = url.searchParams.getAll('status') as InvoiceStatus[];
    const clientId = url.searchParams.get('clientId');
    const assetCode = url.searchParams.get('assetCode');
    const rows = db.invoices.filter(
      (i) =>
        (statuses.length === 0 || statuses.includes(i.status)) &&
        (!clientId || i.clientId === clientId) &&
        (!assetCode || i.assetCode === assetCode),
    );
    const page = paginate(rows, url, {
      search: (i) => [i.number, i.clientName, i.amount],
      sortable: {
        issueDate: { get: (i) => i.issueDate },
        dueDate: { get: (i) => i.dueDate },
        number: { get: (i) => i.number },
        clientName: { get: (i) => i.clientName },
        status: { get: (i) => i.status },
        amount: { get: (i) => i.amount, decimal: true },
      },
      defaultSort: 'issueDate:desc',
      dateField: (i) => i.issueDate,
    });
    if (page instanceof Response) return page;
    return HttpResponse.json({ ...page, data: page.data.map(summary) });
  }),

  http.get(`${base}/invoices/:id`, ({ request, params }) => {
    const caller = authenticate(db, request);
    if (caller instanceof Response) return caller;
    const invoice = db.invoices.find((i) => i.id === params.id);
    return invoice ? HttpResponse.json(invoice) : error(404, 'not_found', 'Invoice not found.');
  }),

  http.post(`${base}/invoices`, async ({ request }) => {
    const caller = authenticate(db, request);
    if (caller instanceof Response) return caller;
    const denied = requireRole(caller, WRITE_ROLES);
    if (denied) return denied;
    const input = (await request.json()) as InvoiceInput;
    const n = db.nextInvoiceNumber++;
    const invoice: InvoiceDetail = {
      id: newId('inv'),
      number: `INV-${n}`,
      status: 'draft',
      amountPaid: '0.00',
      issueDate: new Date().toISOString(),
      publicToken: `pub_${n}`,
      payment: paymentReference(n),
      matches: [],
      ...applyInput(db, input),
    };
    db.invoices.push(invoice);
    return HttpResponse.json(invoice, { status: 201 });
  }),

  http.patch(`${base}/invoices/:id`, async ({ request, params }) => {
    const caller = authenticate(db, request);
    if (caller instanceof Response) return caller;
    const denied = requireRole(caller, WRITE_ROLES);
    if (denied) return denied;
    const invoice = db.invoices.find((i) => i.id === params.id);
    if (!invoice) return error(404, 'not_found', 'Invoice not found.');
    if (invoice.status !== 'draft') return error(409, 'not_draft', 'Only drafts can be edited.');
    Object.assign(invoice, applyInput(db, (await request.json()) as InvoiceInput));
    return HttpResponse.json(invoice);
  }),

  http.post(`${base}/invoices/:id/send`, ({ request, params }) => {
    const caller = authenticate(db, request);
    if (caller instanceof Response) return caller;
    const denied = requireRole(caller, WRITE_ROLES);
    if (denied) return denied;
    const invoice = db.invoices.find((i) => i.id === params.id);
    if (!invoice) return error(404, 'not_found', 'Invoice not found.');
    if (invoice.status !== 'draft')
      return error(409, 'not_draft', 'This invoice was already sent.');
    invoice.status = 'sent';
    invoice.issueDate = new Date().toISOString();
    return HttpResponse.json(invoice);
  }),

  http.post(`${base}/invoices/:id/void`, ({ request, params }) => {
    const caller = authenticate(db, request);
    if (caller instanceof Response) return caller;
    const denied = requireRole(caller, WRITE_ROLES);
    if (denied) return denied;
    const invoice = db.invoices.find((i) => i.id === params.id);
    if (!invoice) return error(404, 'not_found', 'Invoice not found.');
    if (invoice.status === 'paid') return error(409, 'paid', "Paid invoices can't be voided.");
    invoice.status = 'void';
    return HttpResponse.json(invoice);
  }),

  http.get(`${base}/public/invoices/:token`, ({ params }) => {
    const invoice = db.invoices.find((i) => i.publicToken === params.token);
    if (!invoice || invoice.status === 'draft')
      return error(404, 'not_found', 'Invoice not found.');
    const org = db.orgs[0]!;
    return HttpResponse.json({
      businessName: org.name,
      number: invoice.number,
      status: invoice.status,
      amount: invoice.amount,
      amountPaid: invoice.amountPaid,
      amountDue: Big(invoice.amount).minus(invoice.amountPaid).toFixed(2),
      assetCode: invoice.assetCode,
      dueDate: invoice.dueDate,
      lineItems: invoice.lineItems,
      payment: invoice.payment,
    });
  }),
];
