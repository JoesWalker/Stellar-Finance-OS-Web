import { SearchX } from 'lucide-react';
import { Button } from './button';
import { EmptyState } from './empty-state';

export interface NoResultsProps {
  /** Noun for the message, e.g. "invoices". */
  resource?: string;
  onClear: () => void;
}

/** Empty state for a search or filter that matched nothing (distinct from "nothing yet"). */
export function NoResults({ resource = 'results', onClear }: NoResultsProps) {
  return (
    <EmptyState
      icon={<SearchX />}
      title={`No ${resource} match your search`}
      description="Try different words or clear the filters."
      action={
        <Button variant="outline" onClick={onClear}>
          Clear filters
        </Button>
      }
    />
  );
}
