import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useApiClient } from '../context';
import { unwrap } from '../errors';
import type { InvoiceInput } from '../types';
import { keys } from './keys';
import { cleanParams, infiniteListOptions } from './list';
import type { InvoiceListParams } from './params';

/** Server-paginated invoice list. Call `fetchNextPage()` for more. */
export function useInvoices(params: InvoiceListParams = {}) {
  const api = useApiClient();
  const { status, ...rest } = cleanParams(params);
  const query = { ...rest, status: status === undefined ? undefined : [status].flat() };
  return useInfiniteQuery({
    queryKey: keys.invoices.list(cleanParams(query)),
    ...infiniteListOptions(async (cursor) =>
      unwrap(await api.GET('/invoices', { params: { query: { ...query, cursor } } })),
    ),
  });
}

export function useInvoice(id: string) {
  const api = useApiClient();
  return useQuery({
    queryKey: keys.invoices.detail(id),
    queryFn: async () => unwrap(await api.GET('/invoices/{id}', { params: { path: { id } } })),
    enabled: Boolean(id),
  });
}

export function useCreateInvoice() {
  const api = useApiClient();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: InvoiceInput) => unwrap(await api.POST('/invoices', { body })),
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.invoices.all }),
  });
}

export function useUpdateInvoice(id: string) {
  const api = useApiClient();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: InvoiceInput) =>
      unwrap(await api.PATCH('/invoices/{id}', { params: { path: { id } }, body })),
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.invoices.all }),
  });
}

function useInvoiceAction(action: '/invoices/{id}/send' | '/invoices/{id}/void') {
  const api = useApiClient();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => unwrap(await api.POST(action, { params: { path: { id } } })),
    onSuccess: (invoice) => {
      qc.setQueryData(keys.invoices.detail(invoice.id), invoice);
      return qc.invalidateQueries({ queryKey: keys.invoices.all });
    },
  });
}

export const useSendInvoice = () => useInvoiceAction('/invoices/{id}/send');
export const useVoidInvoice = () => useInvoiceAction('/invoices/{id}/void');

/** Public pay page. Polls until the invoice is paid (or void). */
export function usePublicInvoice(publicToken: string, options: { pollMs?: number } = {}) {
  const api = useApiClient();
  return useQuery({
    queryKey: keys.invoices.public(publicToken),
    queryFn: async () =>
      unwrap(
        await api.GET('/public/invoices/{publicToken}', { params: { path: { publicToken } } }),
      ),
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      return status === 'paid' || status === 'void' ? false : (options.pollMs ?? false);
    },
  });
}
