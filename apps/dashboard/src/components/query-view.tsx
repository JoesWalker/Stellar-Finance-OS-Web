import type { ReactNode } from 'react';
import type { UseInfiniteQueryResult, UseQueryResult } from '@tanstack/react-query';
import { ApiError, isForbidden } from '@finance-os/api-client';
import { Button, EmptyState, Spinner } from '@finance-os/ui';
import { AlertTriangle, Lock, SearchX } from 'lucide-react';

export interface QueryViewProps<T> {
  query: UseQueryResult<T> | UseInfiniteQueryResult<T>;
  /** Return true when there's nothing to show. */
  isEmpty?: (data: T) => boolean;
  empty?: ReactNode;
  loading?: ReactNode;
  /** Noun for messages, e.g. "invoices". */
  resource?: string;
  children: (data: T) => ReactNode;
}

/**
 * The four states every screen must handle: loading, error, permission-denied and empty.
 * Children render only once there's data to show.
 */
export function QueryView<T>({
  query,
  isEmpty,
  empty,
  loading,
  resource = 'this page',
  children,
}: QueryViewProps<T>) {
  if (query.isPending) return <>{loading ?? <Spinner label={`Loading ${resource}`} />}</>;

  if (query.isError) {
    if (isForbidden(query.error)) {
      return (
        <EmptyState
          icon={<Lock />}
          title="You don't have access"
          description={`Your role can't view ${resource}. Ask an owner or admin if you need access.`}
        />
      );
    }
    if (query.error instanceof ApiError && query.error.isNotFound) {
      return (
        <EmptyState
          icon={<SearchX />}
          title={`We couldn't find ${resource}`}
          description="It may have been removed, or the link is wrong."
        />
      );
    }
    return (
      <EmptyState
        icon={<AlertTriangle />}
        title={`Couldn't load ${resource}`}
        description="Check your connection and try again."
        action={
          <Button variant="outline" onClick={() => query.refetch()}>
            Try again
          </Button>
        }
      />
    );
  }

  if (isEmpty?.(query.data) && empty) return <>{empty}</>;
  return <>{children(query.data)}</>;
}
