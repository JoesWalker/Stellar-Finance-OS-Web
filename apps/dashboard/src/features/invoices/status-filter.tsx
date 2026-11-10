import type { InvoiceStatus } from '@finance-os/api-client';
import { cn } from '@finance-os/ui';

const FILTERS: { value: InvoiceStatus | undefined; label: string }[] = [
  { value: undefined, label: 'All' },
  { value: 'draft', label: 'Draft' },
  { value: 'sent', label: 'Sent' },
  { value: 'partially_paid', label: 'Partially paid' },
  { value: 'overdue', label: 'Overdue' },
  { value: 'paid', label: 'Paid' },
  { value: 'void', label: 'Void' },
];

export function StatusFilter({
  value,
  onChange,
}: {
  value: InvoiceStatus | undefined;
  onChange: (status: InvoiceStatus | undefined) => void;
}) {
  return (
    <div role="group" aria-label="Filter by status" className="flex flex-wrap gap-1.5">
      {FILTERS.map((f) => (
        <button
          key={f.label}
          type="button"
          aria-pressed={value === f.value}
          onClick={() => onChange(f.value)}
          className={cn(
            'rounded-full border px-3 py-1 text-sm transition-colors',
            value === f.value
              ? 'border-primary bg-primary text-primary-foreground'
              : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
          )}
        >
          {f.label}
        </button>
      ))}
    </div>
  );
}
