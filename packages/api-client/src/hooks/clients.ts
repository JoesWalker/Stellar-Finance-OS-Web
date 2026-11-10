import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useApiClient } from '../context';
import { unwrap } from '../errors';
import type { ClientInput } from '../types';
import { keys } from './keys';
import { cleanParams, infiniteListOptions } from './list';
import type { ClientListParams } from './params';

/** Server-paginated client list. Call `fetchNextPage()` for more. */
export function useClients(params: ClientListParams = {}) {
  const api = useApiClient();
  const query = cleanParams(params);
  return useInfiniteQuery({
    queryKey: keys.clients.list(query),
    ...infiniteListOptions(async (cursor) =>
      unwrap(await api.GET('/clients', { params: { query: { ...query, cursor } } })),
    ),
  });
}

export function useCreateClient() {
  const api = useApiClient();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: ClientInput) => unwrap(await api.POST('/clients', { body })),
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.clients.all }),
  });
}

export function useUpdateClient(id: string) {
  const api = useApiClient();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: ClientInput) =>
      unwrap(await api.PATCH('/clients/{id}', { params: { path: { id } }, body })),
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.clients.all }),
  });
}
