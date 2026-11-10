import {
  createColumnHelper,
  createSortedRowModel,
  rowSortingFeature,
  sortFn_alphanumeric,
  sortFn_datetime,
  sortFn_text,
  tableFeatures,
  useTable,
  type ColumnDef,
  type RowData,
  type SortingState,
  type Updater,
} from '@tanstack/react-table';
import { ArrowDown, ArrowUp, ArrowUpDown } from 'lucide-react';
import { cn } from '../lib/utils';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './table';

/** Features shared by every DataTable: client-side sorting. */
export const dataTableFeatures = tableFeatures({
  rowSortingFeature,
  sortedRowModel: createSortedRowModel(),
  sortFns: { alphanumeric: sortFn_alphanumeric, text: sortFn_text, datetime: sortFn_datetime },
});

export type DataTableFeatures = typeof dataTableFeatures;
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- column value types vary per column
export type DataTableColumn<TData extends RowData> = ColumnDef<DataTableFeatures, TData, any>;

/** Typed column helper for DataTable columns. */
export const createDataTableColumns = <TData extends RowData>() =>
  createColumnHelper<DataTableFeatures, TData>();

/** A single-column sort, e.g. `{ id: 'dueDate', desc: true }`. */
export interface DataTableSort {
  id: string;
  desc: boolean;
}

/** `{ id: 'dueDate', desc: true }` → `'dueDate:desc'` (the API's `?sort=` format). */
export const sortToParam = (sort: DataTableSort | null | undefined) =>
  sort ? `${sort.id}:${sort.desc ? 'desc' : 'asc'}` : undefined;

/** `'dueDate:desc'` → `{ id: 'dueDate', desc: true }`. */
export function sortFromParam(param: string | null | undefined): DataTableSort | null {
  const m = param ? /^(\w+):(asc|desc)$/.exec(param) : null;
  return m ? { id: m[1]!, desc: m[2] === 'desc' } : null;
}

export interface DataTableProps<TData extends RowData> {
  columns: DataTableColumn<TData>[];
  data: TData[];
  /** Stable row id (defaults to index). */
  getRowId?: (row: TData) => string;
  className?: string;
  /** Accessible table name. */
  'aria-label'?: string;
  /**
   * Server-side sorting: pass the current sort and a change handler, and the table stops
   * sorting rows itself — the parent refetches in the new order.
   */
  sort?: DataTableSort | null;
  onSortChange?: (sort: DataTableSort | null) => void;
}

export function DataTable<TData extends RowData>({
  columns,
  data,
  getRowId,
  className,
  'aria-label': ariaLabel,
  sort,
  onSortChange,
}: DataTableProps<TData>) {
  const serverSorting: SortingState | undefined = onSortChange ? (sort ? [sort] : []) : undefined;
  const table = useTable({
    features: dataTableFeatures,
    columns,
    data,
    getRowId: getRowId ? (row) => getRowId(row) : undefined,
    ...(onSortChange
      ? {
          manualSorting: true,
          enableMultiSort: false,
          state: { sorting: serverSorting },
          onSortingChange: (updater: Updater<SortingState>) => {
            const next = typeof updater === 'function' ? updater(serverSorting ?? []) : updater;
            onSortChange(next[0] ?? null);
          },
        }
      : {}),
  });

  return (
    <Table className={className} aria-label={ariaLabel}>
      <TableHeader>
        {table.getHeaderGroups().map((group) => (
          <TableRow key={group.id}>
            {group.headers.map((header) => {
              const sortable = header.column.getCanSort();
              const sorted = header.column.getIsSorted();
              const Icon = sorted === 'asc' ? ArrowUp : sorted === 'desc' ? ArrowDown : ArrowUpDown;
              return (
                <TableHead
                  key={header.id}
                  aria-sort={
                    sorted === 'asc' ? 'ascending' : sorted === 'desc' ? 'descending' : undefined
                  }
                  className={cn(
                    (header.column.columnDef.meta as { className?: string } | undefined)?.className,
                  )}
                >
                  {header.isPlaceholder ? null : sortable ? (
                    <button
                      type="button"
                      onClick={header.column.getToggleSortingHandler()}
                      className="inline-flex items-center gap-1 hover:text-foreground"
                    >
                      <table.FlexRender header={header} />
                      <Icon className={cn('size-3.5', !sorted && 'opacity-40')} />
                    </button>
                  ) : (
                    <table.FlexRender header={header} />
                  )}
                </TableHead>
              );
            })}
          </TableRow>
        ))}
      </TableHeader>
      <TableBody>
        {table.getRowModel().rows.map((row) => (
          <TableRow key={row.id}>
            {row.getAllCells().map((cell) => (
              <TableCell
                key={cell.id}
                className={cn(
                  (cell.column.columnDef.meta as { className?: string } | undefined)?.className,
                )}
              >
                <table.FlexRender cell={cell} />
              </TableCell>
            ))}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
