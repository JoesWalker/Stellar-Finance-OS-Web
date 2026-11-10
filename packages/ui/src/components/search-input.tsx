import * as React from 'react';
import { Search, X } from 'lucide-react';
import { cn } from '../lib/utils';
import { Input } from './input';

export interface SearchInputProps extends Omit<
  React.ComponentProps<'input'>,
  'value' | 'onChange' | 'defaultValue' | 'type'
> {
  /** The committed (debounced) search value, e.g. from the URL. */
  value: string;
  /** Called with the new value after the user stops typing for `delay` ms. */
  onValueChange: (value: string) => void;
  /** Debounce delay in ms. */
  delay?: number;
}

/** Text search box that debounces changes before reporting them. */
export function SearchInput({
  value,
  onValueChange,
  delay = 300,
  className,
  placeholder = 'Search…',
  ...props
}: SearchInputProps) {
  const [draft, setDraft] = React.useState(value);
  const [lastValue, setLastValue] = React.useState(value);
  const onChangeRef = React.useRef(onValueChange);
  React.useEffect(() => {
    onChangeRef.current = onValueChange;
  });

  // Follow external changes (e.g. "Clear filters", back button).
  if (value !== lastValue) {
    setLastValue(value);
    setDraft(value);
  }

  React.useEffect(() => {
    if (draft === value) return;
    const id = setTimeout(() => onChangeRef.current(draft), delay);
    return () => clearTimeout(id);
  }, [draft, value, delay]);

  return (
    <div className={cn('relative w-full sm:max-w-xs', className)}>
      <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        type="search"
        role="searchbox"
        value={draft}
        placeholder={placeholder}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') onChangeRef.current(draft);
        }}
        className="pr-8 pl-8 [&::-webkit-search-cancel-button]:hidden"
        {...props}
      />
      {draft ? (
        <button
          type="button"
          onClick={() => {
            setDraft('');
            onChangeRef.current('');
          }}
          className="absolute top-1/2 right-1.5 inline-flex size-6 -translate-y-1/2 items-center justify-center rounded text-muted-foreground hover:bg-accent"
        >
          <X className="size-3.5" />
          <span className="sr-only">Clear search</span>
        </button>
      ) : null}
    </div>
  );
}
