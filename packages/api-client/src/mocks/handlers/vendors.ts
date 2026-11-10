import { http, HttpResponse } from 'msw';
import { paginate } from '../list';
import type { VendorInput } from '../../types';
import { authenticate, error, newId, requireRole, WRITE_ROLES, type MockContext } from '../context';

export const vendorHandlers = ({ db, base }: MockContext) => [
  http.get(`${base}/vendors`, ({ request }) => {
    const caller = authenticate(db, request);
    if (caller instanceof Response) return caller;
    const page = paginate(db.vendors, new URL(request.url), {
      search: (v) => [v.name, v.email, v.payoutAddress],
      sortable: { name: { get: (v) => v.name }, createdAt: { get: (v) => v.createdAt } },
      defaultSort: 'name:asc',
    });
    return page instanceof Response ? page : HttpResponse.json(page);
  }),

  http.post(`${base}/vendors`, async ({ request }) => {
    const caller = authenticate(db, request);
    if (caller instanceof Response) return caller;
    const denied = requireRole(caller, WRITE_ROLES);
    if (denied) return denied;
    const input = (await request.json()) as VendorInput;
    const vendor = { id: newId('v'), createdAt: new Date().toISOString(), ...input };
    db.vendors.push(vendor);
    return HttpResponse.json(vendor, { status: 201 });
  }),

  http.patch(`${base}/vendors/:id`, async ({ request, params }) => {
    const caller = authenticate(db, request);
    if (caller instanceof Response) return caller;
    const denied = requireRole(caller, WRITE_ROLES);
    if (denied) return denied;
    const vendor = db.vendors.find((v) => v.id === params.id);
    if (!vendor) return error(404, 'not_found', 'Vendor not found.');
    Object.assign(vendor, (await request.json()) as VendorInput);
    return HttpResponse.json(vendor);
  }),
];
