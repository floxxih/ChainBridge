"use client";

import { ReactNode, useMemo } from "react";
import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";
import { Button, PaginationControls, StatusBadge } from "@/components/ui";
import { usePagination } from "@/hooks/usePagination";
import { Order, OrderStatus } from "@/types";
import { cn } from "@/lib/utils";
import { OrderCard } from "./OrderCard";

export type OrderSortKey = "price" | "amount" | "timestamp";
export type OrderSortDirection = "asc" | "desc";

export interface OrderListColumn {
  key: string;
  label: string;
  className?: string;
  sortable?: boolean;
  sortKey?: OrderSortKey;
  render: (order: Order) => ReactNode;
}

interface OrderListTableProps {
  orders: Order[];
  columns?: OrderListColumn[];
  loading?: boolean;
  emptyTitle?: string;
  emptyDescription?: string;
  pageSize?: number;
  sortKey: OrderSortKey;
  sortDirection: OrderSortDirection;
  onSort: (key: OrderSortKey) => void;
  onTakeOrder: (order: Order) => void;
  onViewDetails: (order: Order) => void;
  onClearFilters?: () => void;
  takeButtonDisabled?: (order: Order) => boolean;
}

function parseNumeric(value: string) {
  return Number(value.replace(/,/g, "")) || 0;
}

function compareOrders(
  a: Order,
  b: Order,
  sortKey: OrderSortKey,
  sortDirection: OrderSortDirection
) {
  const multiplier = sortDirection === "asc" ? 1 : -1;

  if (sortKey === "timestamp") {
    return (new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()) * multiplier;
  }

  if (sortKey === "price") {
    return (parseNumeric(a.price) - parseNumeric(b.price)) * multiplier;
  }

  return (parseNumeric(a.amount) - parseNumeric(b.amount)) * multiplier;
}

function SortIndicator({
  isActive,
  direction,
}: {
  isActive: boolean;
  direction: OrderSortDirection;
}) {
  if (!isActive) {
    return <ArrowUpDown size={12} className="text-text-muted" aria-hidden="true" />;
  }

  if (direction === "asc") {
    return <ArrowUp size={12} className="text-brand-500" aria-hidden="true" />;
  }

  return <ArrowDown size={12} className="text-brand-500" aria-hidden="true" />;
}

function defaultColumns(
  onViewDetails: (order: Order) => void,
  onTakeOrder: (order: Order) => void,
  takeButtonDisabled?: (order: Order) => boolean
): OrderListColumn[] {
  return [
    {
      key: "pair",
      label: "Pair",
      className: "px-6 py-4",
      render: (order) => (
        <div className="flex flex-col">
          <span className="font-bold text-text-primary">{order.pair}</span>
          <span className="text-[10px] text-text-muted uppercase tracking-tighter">
            {order.chainIn} ↔ {order.chainOut}
          </span>
        </div>
      ),
    },
    {
      key: "status",
      label: "Status",
      className: "px-6 py-4",
      render: (order) => <StatusBadge size="sm" showIcon={false} orderStatus={order.status} />,
    },
    {
      key: "amount",
      label: "Amount",
      sortable: true,
      sortKey: "amount",
      className: "px-6 py-4 font-mono text-sm text-text-primary",
      render: (order) => `${order.amount} ${order.tokenIn}`,
    },
    {
      key: "price",
      label: "Price",
      sortable: true,
      sortKey: "price",
      className: "px-6 py-4 font-mono text-sm text-text-secondary",
      render: (order) => order.price,
    },
    {
      key: "timestamp",
      label: "Created",
      sortable: true,
      sortKey: "timestamp",
      className: "px-6 py-4 text-xs text-text-secondary",
      render: (order) =>
        new Date(order.timestamp).toLocaleString([], {
          dateStyle: "short",
          timeStyle: "short",
        }),
    },
    {
      key: "total",
      label: "Total",
      className: "px-6 py-4 font-mono text-sm font-bold text-text-primary",
      render: (order) => `${order.total} ${order.tokenOut}`,
    },
    {
      key: "actions",
      label: "",
      className: "px-4 py-4 text-right",
      render: (order) => (
        <div className="flex justify-end gap-2">
          <Button variant="secondary" size="sm" onClick={() => onViewDetails(order)}>
            Details
          </Button>
          <Button
            variant="primary"
            size="sm"
            className="shadow-glow-sm hover:shadow-glow-md"
            onClick={() => onTakeOrder(order)}
            disabled={takeButtonDisabled?.(order)}
          >
            Take
          </Button>
        </div>
      ),
    },
  ];
}

export function OrderListTable({
  orders,
  columns,
  loading = false,
  emptyTitle = "No active orders matching filters.",
  emptyDescription = "Try adjusting or clearing filters to see more results.",
  pageSize = 8,
  sortKey,
  sortDirection,
  onSort,
  onTakeOrder,
  onViewDetails,
  onClearFilters,
  takeButtonDisabled,
}: OrderListTableProps) {
  const resolvedColumns = useMemo(
    () => columns ?? defaultColumns(onViewDetails, onTakeOrder, takeButtonDisabled),
    [columns, onViewDetails, onTakeOrder, takeButtonDisabled]
  );

  const sortedOrders = useMemo(
    () => [...orders].sort((a, b) => compareOrders(a, b, sortKey, sortDirection)),
    [orders, sortDirection, sortKey]
  );

  const pagination = usePagination(sortedOrders.length, pageSize);
  const visibleOrders = sortedOrders.slice(pagination.offset, pagination.limit);
  const loadingRows = useMemo(() => Array.from({ length: Math.min(pageSize, 5) }), [pageSize]);

  return (
    <div className="space-y-4">
      {/* Desktop View (Table) */}
      <div className="hidden md:block overflow-hidden rounded-2xl border border-border bg-background/50 backdrop-blur-sm shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-surface-overlay/50 border-b border-border">
                {resolvedColumns.map((column) => {
                  const isActiveSort = column.sortKey === sortKey;
                  const isSortable = Boolean(column.sortable && column.sortKey);

                  return (
                    <th
                      key={column.key}
                      onClick={() => (isSortable ? onSort(column.sortKey!) : undefined)}
                      className={cn(
                        "text-xs font-bold uppercase tracking-wider text-text-muted",
                        column.className,
                        isSortable && "cursor-pointer hover:text-text-primary transition-colors"
                      )}
                    >
                      <div className="flex items-center gap-2">
                        {column.label}
                        {isSortable && (
                          <SortIndicator isActive={isActiveSort} direction={sortDirection} />
                        )}
                      </div>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {loading ? (
                loadingRows.map((_, index) => (
                  <tr key={`loading-${index}`}>
                    {resolvedColumns.map((column) => (
                      <td key={`${column.key}-${index}`} className={cn(column.className, "py-5")}>
                        <div className="h-4 w-full animate-pulse rounded bg-surface-overlay/80" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : visibleOrders.length > 0 ? (
                visibleOrders.map((order) => (
                  <tr
                    key={order.id}
                    className="group hover:bg-surface-overlay/30 transition-colors"
                  >
                    {resolvedColumns.map((column) => (
                      <td key={`${order.id}-${column.key}`} className={column.className}>
                        {column.render(order)}
                      </td>
                    ))}
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={resolvedColumns.length} className="px-6 py-16 text-center">
                    <div className="space-y-2">
                      <p className="font-medium text-text-secondary">{emptyTitle}</p>
                      <p className="text-sm text-text-muted">{emptyDescription}</p>
                      {onClearFilters && (
                        <Button variant="ghost" size="sm" onClick={onClearFilters} className="mt-3">
                          Clear Filters
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobile View (Cards) */}
      <div className="flex flex-col gap-4 md:hidden">
        {loading ? (
          loadingRows.map((_, index) => (
            <div
              key={`loading-card-${index}`}
              className="h-48 w-full animate-pulse rounded-2xl bg-surface-overlay/80 border border-border"
            />
          ))
        ) : visibleOrders.length > 0 ? (
          visibleOrders.map((order) => (
            <OrderCard
              key={order.id}
              order={order}
              onTakeOrder={onTakeOrder}
              onViewDetails={onViewDetails}
              takeButtonDisabled={takeButtonDisabled?.(order)}
            />
          ))
        ) : (
          <div className="rounded-2xl border border-border bg-background/50 p-12 text-center backdrop-blur-sm shadow-xl">
            <p className="font-medium text-text-secondary">{emptyTitle}</p>
            <p className="text-sm text-text-muted">{emptyDescription}</p>
            {onClearFilters && (
              <Button variant="ghost" size="sm" onClick={onClearFilters} className="mt-4">
                Clear Filters
              </Button>
            )}
          </div>
        )}
      </div>

      {!loading && sortedOrders.length > 0 && (
        <PaginationControls
          page={pagination.page}
          totalPages={pagination.totalPages}
          hasPrevious={pagination.hasPrevious}
          hasNext={pagination.hasNext}
          onPageChange={pagination.setPage}
        />
      )}
    </div>
  );
}
