import { useCallback } from 'react';
import { useSearchParams } from 'react-router';
import { sortFromParam, sortToParam, type DataTableSort } from '@finance-os/ui';

/**
 * List screen state kept in the URL (`?q=&sort=&<filters>`), so reloads, shared links and the
 * back button restore it. Filter keys are whatever the screen passes to `set`.
 */
export function useListParams() {
  const [params, setParams] = useSearchParams();
  const q = params.get('q') ?? '';
  const sort = sortFromParam(params.get('sort'));

  const set = useCallback(
    (changes: Record<string, string | null | undefined>, { replace = true } = {}) =>
      setParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          for (const [key, value] of Object.entries(changes)) {
            if (value) next.set(key, value);
            else next.delete(key);
          }
          return next;
        },
        { replace },
      ),
    [setParams],
  );

  return {
    params,
    q,
    sort,
    /** `?sort=` value for the API. */
    sortParam: sortToParam(sort),
    set,
    setQ: (value: string) => set({ q: value.trim() }),
    setSort: (value: DataTableSort | null) => set({ sort: sortToParam(value) }),
  };
}
