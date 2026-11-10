import { http, HttpResponse } from 'msw';
import { paginate } from '../list';
import type { ClientInput } from '../../types';
import { authenticate, error, newId, requireRole, WRITE_ROLES, type MockContext } from '../context';

export const clientHandlers = ({ db, base }: MockContext) => [
  http.get(`${base}/clients`, ({ request }) => {
    const caller = authenticate(db, request);
    if (caller instanceof Response) return caller;
    const page = paginate(db.clients, new URL(request.url), {
      search: (c) => [c.name, c.email],
      sortable: { name: { get: (c) => c.name }, createdAt: { get: (c) => c.createdAt } },
      defaultSort: 'name:asc',
    });
    return page instanceof Response ? page : HttpResponse.json(page);
  }),

  http.get(`${base}/clients/:id`, ({ request, params }) => {
    const caller = authenticate(db, request);
    if (caller instanceof Response) return caller;
    const client = db.clients.find((c) => c.id === params.id);
    return client ? HttpResponse.json(client) : error(404, 'not_found', 'Client not found.');
  }),

  http.post(`${base}/clients`, async ({ request }) => {
    const caller = authenticate(db, request);
    if (caller instanceof Response) return caller;
    const denied = requireRole(caller, WRITE_ROLES);
    if (denied) return denied;
    const input = (await request.json()) as ClientInput;
    const client = {
      id: newId('c'),
      name: input.name,
      email: input.email,
      senderAddresses: input.senderAddresses ?? [],
      createdAt: new Date().toISOString(),
    };
    db.clients.push(client);
    return HttpResponse.json(client, { status: 201 });
  }),

  http.patch(`${base}/clients/:id`, async ({ request, params }) => {
    const caller = authenticate(db, request);
    if (caller instanceof Response) return caller;
    const denied = requireRole(caller, WRITE_ROLES);
    if (denied) return denied;
    const client = db.clients.find((c) => c.id === params.id);
    if (!client) return error(404, 'not_found', 'Client not found.');
    Object.assign(client, (await request.json()) as ClientInput);
    for (const inv of db.invoices) if (inv.clientId === client.id) inv.clientName = client.name;
    return HttpResponse.json(client);
  }),
];
