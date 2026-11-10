import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useApiClient } from '../context';
import { unwrap } from '../errors';
import { keys } from './keys';
import { cleanParams, infiniteListOptions } from './list';
import type { TransactionListParams } from './params';

/** Server-paginated transaction list. Call `fetchNextPage()` for more. */
export function useTransactions(params: TransactionListParams = {}) {
  const api = useApiClient();
  const query = cleanParams(params);
  return useInfiniteQuery({
    queryKey: keys.transactions.list(query),
    ...infiniteListOptions(async (cursor) =>
      unwrap(await api.GET('/transactions', { params: { query: { ...query, cursor } } })),
    ),
  });
}

export function useMatchTransaction() {
  const api = useApiClient();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, invoiceId }: { id: string; invoiceId: string }) =>
      unwrap(
        await api.POST('/transactions/{id}/match', {
          params: { path: { id } },
          body: { invoiceId },
        }),
      ),
    onSuccess: () =>
      Promise.all([
        qc.invalidateQueries({ queryKey: keys.transactions.all }),
        qc.invalidateQueries({ queryKey: keys.invoices.all }),
        qc.invalidateQueries({ queryKey: keys.dashboard }),
      ]),
  });
}
