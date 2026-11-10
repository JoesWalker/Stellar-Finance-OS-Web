// Server-side list semantics for the mock backend: search, filter, sort and cursor pagination.
// Mirrors the contract in openapi.seed.json; the UI never reimplements any of this.
import Big from 'big.js';
import { error } from './context';

export const DEFAULT_LIMIT = 25;
export const MAX_LIMIT = 100;

type Value = string | number | null | undefined;

export interface ListSpec<T> {
  /** Text fields matched against `?q=` (case-insensitive substring). */
  search: (row: T) => Value[];
  /** Sortable fields → value extractor. `amount`-like fields compare as decimals. */
  sortable: Record<string, { get: (row: T) => Value; decimal?: boolean }>;
  defaultSort: `${string}:${'asc' | 'desc'}`;
  /** Date field used by `?from=&to=`. */
  dateField?: (row: T) => string;
}

const encodeCursor = (offset: number) => btoa(`o:${offset}`);
function decodeCursor(cursor: string | null) {
  if (!cursor) return 0;
  try {
    const m = /^o:(\d+)$/.exec(atob(cursor));
    return m ? Number.parseInt(m[1]!, 10) : -1;
  } catch {
    return -1;
  }
}

function compare(a: Value, b: Value, decimal?: boolean) {
  if (a == null || a === '') return b == null || b === '' ? 0 : 1;
  if (b == null || b === '') return -1;
  if (decimal) return new Big(a).cmp(new Big(b));
  return String(a).localeCompare(String(b), 'en', { numeric: true, sensitivity: 'base' });
}

/** Apply ?q, ?from, ?to, ?sort, ?limit, ?cursor to `rows`. Returns a Response on bad input. */
export function paginate<T>(rows: T[], url: URL, spec: ListSpec<T>) {
  const params = url.searchParams;
  const q = params.get('q')?.trim().toLowerCase();
  const from = params.get('from');
  const to = params.get('to');

  let out = rows;
  if (q)
    out = out.filter((r) =>
      spec.search(r).some((v) =>
        String(v ?? '')
          .toLowerCase()
          .includes(q),
      ),
    );
  if (spec.dateField && from) out = out.filter((r) => spec.dateField!(r).slice(0, 10) >= from);
  if (spec.dateField && to) out = out.filter((r) => spec.dateField!(r).slice(0, 10) <= to);

  const [field, dir] = (params.get('sort') ?? spec.defaultSort).split(':');
  const [defField, defDir] = spec.defaultSort.split(':');
  const key = field && spec.sortable[field] ? field : defField!;
  const sorter = spec.sortable[key]!;
  const sign = (field === key ? dir : defDir) === 'asc' ? 1 : -1;
  const tiebreak = spec.sortable[defField!]!;
  out = [...out].sort(
    (a, b) =>
      sign * compare(sorter.get(a), sorter.get(b), sorter.decimal) ||
      compare(tiebreak.get(b), tiebreak.get(a), tiebreak.decimal),
  );

  const rawLimit = params.get('limit');
  const limit = rawLimit ? Number.parseInt(rawLimit, 10) : DEFAULT_LIMIT;
  if (!Number.isInteger(limit) || limit < 1 || limit > MAX_LIMIT)
    return error(422, 'invalid_limit', `limit must be between 1 and ${MAX_LIMIT}.`);
  const offset = decodeCursor(params.get('cursor'));
  if (offset < 0) return error(422, 'invalid_cursor', 'That page link is no longer valid.');

  const data = out.slice(offset, offset + limit);
  const next = offset + limit;
  return { data, nextCursor: next < out.length ? encodeCursor(next) : null, total: out.length };
}
