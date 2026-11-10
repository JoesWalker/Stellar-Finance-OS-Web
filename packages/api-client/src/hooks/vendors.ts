import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useApiClient } from '../context';
import { unwrap } from '../errors';
import type { VendorInput } from '../types';
import { keys } from './keys';
import { cleanParams, infiniteListOptions } from './list';
import type { VendorListParams } from './params';

/** Server-paginated vendor list. Call `fetchNextPage()` for more. */
export function useVendors(params: VendorListParams = {}) {
  const api = useApiClient();
  const query = cleanParams(params);
  return useInfiniteQuery({
    queryKey: keys.vendors.list(query),
    ...infiniteListOptions(async (cursor) =>
      unwrap(await api.GET('/vendors', { params: { query: { ...query, cursor } } })),
    ),
  });
}

export function useCreateVendor() {
  const api = useApiClient();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: VendorInput) => unwrap(await api.POST('/vendors', { body })),
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.vendors.all }),
  });
}

export function useUpdateVendor(id: string) {
  const api = useApiClient();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: VendorInput) =>
      unwrap(await api.PATCH('/vendors/{id}', { params: { path: { id } }, body })),
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.vendors.all }),
  });
}
