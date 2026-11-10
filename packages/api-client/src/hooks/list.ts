import { keepPreviousData, type InfiniteData } from '@tanstack/react-query';

/** Common query params every paginated list endpoint accepts. */
export interface ListParams {
  /** Free-text search (`?q=`). */
  q?: string;
  /** `field:asc` or `field:desc`. */
  sort?: string;
  /** Page size, 1–100. */
  limit?: number;
}

/** One page of a list endpoint, as the API returns it. */
export interface Page<T> {
  data: T[];
  nextCursor?: string | null;
  total: number;
}

/** Pages flattened for display. */
export interface ListResult<T> {
  items: T[];
  total: number;
}

/** Drop empty values so they don't land in the URL or the cache key. */
export function cleanParams<P extends object>(params: P): P {
  return Object.fromEntries(
    Object.entries(params).filter(
      ([, v]) => v !== undefined && v !== '' && !(Array.isArray(v) && v.length === 0),
    ),
  ) as P;
}

/** Shared useInfiniteQuery options for cursor-paginated lists. */
export function infiniteListOptions<T>(fetchPage: (cursor?: string) => Promise<Page<T>>) {
  return {
    queryFn: ({ pageParam }: { pageParam: string | undefined }) => fetchPage(pageParam),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last: Page<T>) => last.nextCursor ?? undefined,
    // Keep showing the previous results while a new search/sort loads.
    placeholderData: keepPreviousData,
    select: (data: InfiniteData<Page<T>, string | undefined>): ListResult<T> => ({
      items: data.pages.flatMap((p) => p.data),
      total: data.pages[0]?.total ?? 0,
    }),
  };
}
