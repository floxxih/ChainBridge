"use client";

import {
  forwardRef,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import { ChevronDown, ChevronUp, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

export type SortDirection = "asc" | "desc";

export interface SortState {
  key: string;
  direction: SortDirection;
}

/**
 * Strongly-typed column definition.
 *
 * `accessor` is a key of the row model `T`, which lets the cell renderer be
 * inferred without `any` casts. Provide either `accessor` (auto-render) or
 * `cell` (custom render); a column can also supply `sortValue` to drive
 * client-side sorting from a derived value.
 */
export type ColumnDef<T, K extends keyof T = keyof T> = {
  /** Stable identifier — used for sort state and React keys. */
  key: string;
  /** Header label or render function. */
  header: ReactNode | (() => ReactNode);
  /** Hide column at narrow widths. */
  hideOnMobile?: boolean;
  /** Tailwind class(es) applied to both `<th>` and `<td>`. */
  className?: string;
  /** ARIA-hidden header (e.g. for an actions column). */
  hideHeaderLabel?: boolean;
  /** Allow sorting — opts the column into the sort UI. */
  sortable?: boolean;
  /** Allow filtering on this column when `filterValue` is provided. */
  filterable?: boolean;
  /** Cell width (fixed). Pass any valid CSS width. */
  width?: string;
  /** Used for `text-align`. */
  align?: "left" | "center" | "right";
} & (
  | {
      accessor: K;
      cell?: (row: T, value: T[K]) => ReactNode;
      sortValue?: (row: T) => string | number | Date;
    }
  | {
      accessor?: never;
      cell: (row: T) => ReactNode;
      sortValue?: (row: T) => string | number | Date;
    }
);

export type DataTableSortMode = "client" | "server" | "none";

export interface DataTableProps<T> {
  /** Column definitions. */
  columns: ReadonlyArray<ColumnDef<T, keyof T>>;
  /** Row data. */
  data: ReadonlyArray<T>;
  /** Stable key for each row — required for selection and React reconciliation. */
  rowKey: (row: T, index: number) => string;
  /** Optional caption for screen-readers. */
  caption?: string;

  /** Sort behaviour. Defaults to `"client"` when any column is sortable. */
  sortMode?: DataTableSortMode;
  /** Controlled sort state. Required when `sortMode === "server"`. */
  sort?: SortState | null;
  /** Initial sort applied on first render (uncontrolled). */
  defaultSort?: SortState | null;
  /** Called whenever the user changes the sort. */
  onSortChange?: (next: SortState | null) => void;

  /** Free-text filter applied across `filterable` columns (client-side only). */
  filterValue?: string;

  /** Loading state shows skeleton rows. */
  loading?: boolean;
  /** Number of skeleton rows to render while loading. */
  loadingRowCount?: number;

  /** Render slot for the empty state. Falls back to `emptyMessage`. */
  emptyState?: ReactNode;
  /** Simple text shown when `data` is empty (only used if `emptyState` is omitted). */
  emptyMessage?: string;

  /** Render slot for an error state — takes precedence over data when provided. */
  errorState?: ReactNode;

  /** Optional row click handler. Enables row focus + Enter/Space activation. */
  onRowClick?: (row: T, index: number) => void;
  /** Per-row class names. */
  getRowClassName?: (row: T, index: number) => string | undefined;
  /** Per-row data attributes / a11y props. */
  getRowProps?: (row: T, index: number) => Record<string, unknown>;
  /** Mark a row as selected (for ARIA + styling). */
  isRowSelected?: (row: T, index: number) => boolean;

  /** Container class. */
  className?: string;
  /** Compact (denser) padding. */
  density?: "comfortable" | "compact";
  /** Sticky header — useful inside scroll containers. */
  stickyHeader?: boolean;
}

// ─── Internal helpers ────────────────────────────────────────────────────────

function SortIcon({ direction }: { direction: SortDirection | null }) {
  if (direction === "asc") return <ChevronUp className="h-3.5 w-3.5" aria-hidden="true" />;
  if (direction === "desc") return <ChevronDown className="h-3.5 w-3.5" aria-hidden="true" />;
  return <ChevronsUpDown className="h-3.5 w-3.5 opacity-40" aria-hidden="true" />;
}

function compareValues(a: unknown, b: unknown): number {
  if (a == null && b == null) return 0;
  if (a == null) return -1;
  if (b == null) return 1;
  if (a instanceof Date && b instanceof Date) return a.getTime() - b.getTime();
  if (typeof a === "number" && typeof b === "number") return a - b;
  return String(a).localeCompare(String(b), undefined, { numeric: true, sensitivity: "base" });
}

function nextSortState(current: SortState | null, key: string): SortState | null {
  if (!current || current.key !== key) return { key, direction: "asc" };
  if (current.direction === "asc") return { key, direction: "desc" };
  return null;
}

// ─── Component ────────────────────────────────────────────────────────────────

function DataTableInner<T>(
  {
    columns,
    data,
    rowKey,
    caption,
    sortMode,
    sort,
    defaultSort = null,
    onSortChange,
    filterValue = "",
    loading = false,
    loadingRowCount = 5,
    emptyState,
    emptyMessage = "No results found.",
    errorState,
    onRowClick,
    getRowClassName,
    getRowProps,
    isRowSelected,
    className,
    density = "comfortable",
    stickyHeader = false,
  }: DataTableProps<T>,
  ref: React.Ref<HTMLTableElement>,
) {
  const hasSortable = columns.some((c) => c.sortable);
  const resolvedSortMode: DataTableSortMode = sortMode ?? (hasSortable ? "client" : "none");

  // Sort state (controlled vs uncontrolled).
  const isSortControlled = sort !== undefined;
  const [internalSort, setInternalSort] = useState<SortState | null>(defaultSort);
  const activeSort = isSortControlled ? sort : internalSort;

  const handleSort = useCallback(
    (col: ColumnDef<T, keyof T>) => {
      if (!col.sortable || resolvedSortMode === "none") return;
      const next = nextSortState(activeSort, col.key);
      if (!isSortControlled) setInternalSort(next);
      onSortChange?.(next);
    },
    [activeSort, isSortControlled, onSortChange, resolvedSortMode],
  );

  // Filtered data (client-side, skipped when no filter is supplied).
  const filtered = useMemo(() => {
    if (!filterValue.trim()) return data;
    const q = filterValue.toLowerCase();
    const filterCols = columns.filter((c) => c.filterable);
    if (filterCols.length === 0) return data;
    return data.filter((row) =>
      filterCols.some((col) => {
        if (!col.accessor) return false;
        const value = row[col.accessor];
        return value != null && String(value).toLowerCase().includes(q);
      }),
    );
  }, [data, filterValue, columns]);

  // Sorted data — only rearrange in client mode.
  const sorted = useMemo(() => {
    if (resolvedSortMode !== "client" || !activeSort) return filtered;
    const col = columns.find((c) => c.key === activeSort.key);
    if (!col) return filtered;
    const extract = (row: T) => {
      if (col.sortValue) return col.sortValue(row);
      if (col.accessor) return row[col.accessor] as unknown;
      return null;
    };
    const out = [...filtered].sort((a, b) => compareValues(extract(a), extract(b)));
    return activeSort.direction === "desc" ? out.reverse() : out;
  }, [filtered, activeSort, columns, resolvedSortMode]);

  // ── Keyboard focus management (roving tabindex on rows) ─────────────────────
  const tbodyRef = useRef<HTMLTableSectionElement>(null);
  const [focusedRow, setFocusedRow] = useState(0);
  useEffect(() => {
    if (focusedRow > sorted.length - 1) setFocusedRow(Math.max(0, sorted.length - 1));
  }, [sorted.length, focusedRow]);

  const focusRow = useCallback((index: number) => {
    const row = tbodyRef.current?.querySelector<HTMLElement>(
      `[data-row-index="${index}"]`,
    );
    row?.focus();
  }, []);

  const onRowKeyDown = useCallback(
    (event: KeyboardEvent<HTMLTableRowElement>, row: T, index: number) => {
      const last = sorted.length - 1;
      switch (event.key) {
        case "ArrowDown": {
          event.preventDefault();
          const next = Math.min(last, index + 1);
          setFocusedRow(next);
          focusRow(next);
          break;
        }
        case "ArrowUp": {
          event.preventDefault();
          const next = Math.max(0, index - 1);
          setFocusedRow(next);
          focusRow(next);
          break;
        }
        case "Home": {
          event.preventDefault();
          setFocusedRow(0);
          focusRow(0);
          break;
        }
        case "End": {
          event.preventDefault();
          setFocusedRow(last);
          focusRow(last);
          break;
        }
        case "Enter":
        case " ": {
          if (onRowClick) {
            event.preventDefault();
            onRowClick(row, index);
          }
          break;
        }
      }
    },
    [focusRow, onRowClick, sorted.length],
  );

  const cellPadding = density === "compact" ? "px-3 py-2" : "px-4 py-3";
  const headerPadding = density === "compact" ? "px-3 py-2" : "px-4 py-3";

  // ── Render ──────────────────────────────────────────────────────────────────
  const renderBody = () => {
    if (errorState) {
      return (
        <tr>
          <td colSpan={columns.length} className="px-4 py-10 text-center">
            {errorState}
          </td>
        </tr>
      );
    }
    if (loading) {
      return Array.from({ length: loadingRowCount }).map((_, i) => (
        <tr
          key={`skeleton-${i}`}
          aria-hidden="true"
          className="border-b border-border last:border-0"
        >
          {columns.map((col) => (
            <td
              key={col.key}
              className={cn(cellPadding, col.hideOnMobile && "hidden sm:table-cell", col.className)}
            >
              <div className="h-4 rounded bg-surface-overlay animate-pulse" />
            </td>
          ))}
        </tr>
      ));
    }
    if (sorted.length === 0) {
      return (
        <tr>
          <td colSpan={columns.length} className="px-4 py-10 text-center text-sm text-text-muted">
            {emptyState ?? emptyMessage}
          </td>
        </tr>
      );
    }
    return sorted.map((row, index) => {
      const key = rowKey(row, index);
      const selected = isRowSelected?.(row, index) ?? false;
      const interactive = !!onRowClick;
      const tabIndex = interactive ? (index === focusedRow ? 0 : -1) : undefined;
      return (
        <tr
          key={key}
          data-row-index={index}
          tabIndex={tabIndex}
          aria-selected={selected || undefined}
          onClick={interactive ? () => onRowClick?.(row, index) : undefined}
          onFocus={interactive ? () => setFocusedRow(index) : undefined}
          onKeyDown={interactive ? (e) => onRowKeyDown(e, row, index) : undefined}
          className={cn(
            "border-b border-border last:border-0 transition-colors",
            interactive && "cursor-pointer hover:bg-surface-raised/60",
            interactive &&
              "focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-inset",
            selected && "bg-brand-500/5",
            getRowClassName?.(row, index),
          )}
          {...(getRowProps?.(row, index) ?? {})}
        >
          {columns.map((col) => {
            const align =
              col.align === "right"
                ? "text-right"
                : col.align === "center"
                  ? "text-center"
                  : "text-left";
            return (
              <td
                key={col.key}
                className={cn(
                  cellPadding,
                  "text-text-secondary",
                  align,
                  col.hideOnMobile && "hidden sm:table-cell",
                  col.className,
                )}
                style={col.width ? { width: col.width } : undefined}
              >
                {renderCell(col, row)}
              </td>
            );
          })}
        </tr>
      );
    });
  };

  return (
    <div className={cn("w-full overflow-x-auto rounded-xl border border-border", className)}>
      <table
        ref={ref}
        className="w-full min-w-[480px] border-collapse text-sm"
        role="grid"
        aria-rowcount={sorted.length}
        aria-busy={loading || undefined}
      >
        {caption && <caption className="sr-only">{caption}</caption>}
        <thead className={cn(stickyHeader && "sticky top-0 z-10")}>
          <tr className="border-b border-border bg-surface-raised">
            {columns.map((col) => {
              const isSorted = activeSort?.key === col.key;
              const direction = isSorted ? activeSort?.direction ?? null : null;
              const align =
                col.align === "right"
                  ? "text-right"
                  : col.align === "center"
                    ? "text-center"
                    : "text-left";
              return (
                <th
                  key={col.key}
                  scope="col"
                  className={cn(
                    headerPadding,
                    "text-xs font-semibold uppercase tracking-wider text-text-muted",
                    align,
                    col.hideOnMobile && "hidden sm:table-cell",
                    col.className,
                  )}
                  style={col.width ? { width: col.width } : undefined}
                  aria-sort={
                    isSorted
                      ? direction === "asc"
                        ? "ascending"
                        : "descending"
                      : col.sortable
                        ? "none"
                        : undefined
                  }
                >
                  {col.sortable ? (
                    <button
                      type="button"
                      onClick={() => handleSort(col)}
                      className={cn(
                        "inline-flex items-center gap-1 select-none rounded",
                        "hover:text-text-primary",
                        "focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500",
                        col.align === "right" && "ml-auto",
                      )}
                      aria-label={
                        typeof col.header === "string"
                          ? `Sort by ${col.header}${
                              direction === "asc"
                                ? " (currently ascending)"
                                : direction === "desc"
                                  ? " (currently descending)"
                                  : ""
                            }`
                          : undefined
                      }
                    >
                      <HeaderLabel col={col} />
                      <SortIcon direction={direction} />
                    </button>
                  ) : col.hideHeaderLabel ? (
                    <span className="sr-only">
                      <HeaderLabel col={col} />
                    </span>
                  ) : (
                    <HeaderLabel col={col} />
                  )}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody ref={tbodyRef}>{renderBody()}</tbody>
      </table>
    </div>
  );
}

function HeaderLabel<T>({ col }: { col: ColumnDef<T, keyof T> }) {
  if (typeof col.header === "function") return <>{col.header()}</>;
  return <>{col.header}</>;
}

function renderCell<T>(col: ColumnDef<T, keyof T>, row: T): ReactNode {
  if (col.accessor) {
    const value = row[col.accessor];
    if (col.cell) return col.cell(row, value);
    if (value == null || value === "") return "—";
    return String(value);
  }
  if (col.cell) return col.cell(row);
  return "—";
}

/**
 * Strongly-typed, accessible data-table primitive.
 *
 * - **Strong typing**: column accessors are tied to the row model `T`.
 * - **Sort modes**: `client`, `server` (controlled), or `none`.
 * - **Loading / empty / error**: built-in slots + skeleton rows.
 * - **Keyboard**: sort headers are real buttons; rows support roving tabindex
 *   with `ArrowUp`/`ArrowDown`/`Home`/`End`, and `Enter`/`Space` activates
 *   `onRowClick` when present.
 */
export const DataTable = forwardRef(DataTableInner) as <T>(
  props: DataTableProps<T> & { ref?: React.Ref<HTMLTableElement> },
) => ReturnType<typeof DataTableInner>;
