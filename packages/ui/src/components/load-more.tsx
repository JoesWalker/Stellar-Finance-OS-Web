import { cn } from '../lib/utils';
import { Button } from './button';

export interface LoadMoreProps {
  /** Rows currently shown. */
  shown: number;
  /** Total matching rows reported by the API. */
  total: number;
  hasMore: boolean;
  loading?: boolean;
  onLoadMore: () => void;
  className?: string;
}

/** "Showing X of Y" plus a Load more button for cursor-paginated lists. */
export function LoadMore({ shown, total, hasMore, loading, onLoadMore, className }: LoadMoreProps) {
  return (
    <div
      className={cn(
        'mt-4 flex flex-col items-center gap-2 text-sm text-muted-foreground sm:flex-row sm:justify-between',
        className,
      )}
    >
      <p aria-live="polite">
        Showing {shown} of {total}
      </p>
      {hasMore ? (
        <Button variant="outline" size="sm" disabled={loading} onClick={onLoadMore}>
          {loading ? 'Loading…' : 'Load more'}
        </Button>
      ) : null}
    </div>
  );
}
