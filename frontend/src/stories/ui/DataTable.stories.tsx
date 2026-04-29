import type { Meta, StoryObj } from "@storybook/react";
import { useState } from "react";
import { DataTable, type ColumnDef, type SortState } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { Inbox } from "lucide-react";

interface Order {
  id: string;
  pair: string;
  side: "buy" | "sell";
  amount: number;
  price: number;
  createdAt: Date;
}

const sampleOrders: Order[] = [
  { id: "ord-1", pair: "XLM/BTC", side: "buy", amount: 1000, price: 0.00001, createdAt: new Date("2026-04-12T10:00:00Z") },
  { id: "ord-2", pair: "ETH/USDC", side: "sell", amount: 2.5, price: 3450, createdAt: new Date("2026-04-21T14:30:00Z") },
  { id: "ord-3", pair: "BTC/USDT", side: "buy", amount: 0.15, price: 64000, createdAt: new Date("2026-04-08T07:15:00Z") },
  { id: "ord-4", pair: "SOL/USDC", side: "sell", amount: 80, price: 165, createdAt: new Date("2026-04-25T18:45:00Z") },
];

const columns: ColumnDef<Order, keyof Order>[] = [
  { key: "pair", header: "Pair", accessor: "pair", sortable: true, filterable: true },
  {
    key: "side",
    header: "Side",
    accessor: "side",
    sortable: true,
    cell: (_, value) => (
      <span className={value === "buy" ? "text-emerald-500" : "text-red-500"}>
        {String(value).toUpperCase()}
      </span>
    ),
  },
  { key: "amount", header: "Amount", accessor: "amount", sortable: true, align: "right" },
  { key: "price", header: "Price", accessor: "price", sortable: true, align: "right" },
  {
    key: "createdAt",
    header: "Created",
    accessor: "createdAt",
    sortable: true,
    hideOnMobile: true,
    cell: (_, value) => (value as Date).toISOString().slice(0, 10),
  },
];

const meta: Meta<typeof DataTable<Order>> = {
  title: "UI/DataTable",
  component: DataTable<Order>,
  parameters: {
    layout: "padded",
    docs: {
      description: {
        component:
          "Strongly-typed, accessible data-table primitive. Supports client and server sorting, " +
          "built-in loading/empty/error states, and roving-tabindex keyboard navigation.",
      },
    },
  },
  tags: ["autodocs"],
};
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    columns,
    data: sampleOrders,
    rowKey: (row: Order) => row.id,
  },
};

export const Loading: Story = {
  args: {
    columns,
    data: [],
    rowKey: (row: Order) => row.id,
    loading: true,
    loadingRowCount: 5,
  },
};

export const Empty: Story = {
  args: {
    columns,
    data: [],
    rowKey: (row: Order) => row.id,
    emptyMessage: "No orders match your filters yet.",
  },
};

export const CustomEmptyState: Story = {
  args: {
    columns,
    data: [],
    rowKey: (row: Order) => row.id,
    emptyState: (
      <EmptyState
        icon={<Inbox className="h-7 w-7" />}
        title="No orders"
        description="Open orders you create or match will appear here."
      />
    ),
  },
};

export const ErrorState: Story = {
  args: {
    columns,
    data: sampleOrders,
    rowKey: (row: Order) => row.id,
    errorState: (
      <div className="text-sm text-red-500">
        Failed to load orders. <button className="underline">Retry</button>
      </div>
    ),
  },
};

export const ServerSorting: Story = {
  render: () => {
    const [sort, setSort] = useState<SortState | null>({ key: "createdAt", direction: "desc" });
    return (
      <div className="space-y-2">
        <p className="text-xs text-text-muted">
          Server mode — the table never reorders rows itself; it just calls{" "}
          <code>onSortChange</code> so the parent can refetch.
        </p>
        <p className="text-xs">
          current sort: <code>{sort ? `${sort.key} ${sort.direction}` : "none"}</code>
        </p>
        <DataTable<Order>
          columns={columns}
          data={sampleOrders}
          rowKey={(row) => row.id}
          sortMode="server"
          sort={sort}
          onSortChange={setSort}
        />
      </div>
    );
  },
};

export const Filtering: Story = {
  render: () => {
    const [filter, setFilter] = useState("");
    return (
      <div className="space-y-3">
        <input
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder="Filter pair…"
          className="w-64 rounded border border-border bg-surface-overlay px-3 py-2 text-sm"
        />
        <DataTable<Order>
          columns={columns}
          data={sampleOrders}
          rowKey={(row) => row.id}
          filterValue={filter}
        />
      </div>
    );
  },
};

export const SelectableRows: Story = {
  render: () => {
    const [selected, setSelected] = useState<string | null>(null);
    return (
      <div className="space-y-2">
        <p className="text-xs text-text-muted">
          Click a row, or use Tab → ↑/↓/Home/End → Enter.
        </p>
        <p className="text-xs">
          selected: <code>{selected ?? "none"}</code>
        </p>
        <DataTable<Order>
          columns={columns}
          data={sampleOrders}
          rowKey={(row) => row.id}
          onRowClick={(row) => setSelected(row.id)}
          isRowSelected={(row) => row.id === selected}
        />
      </div>
    );
  },
};

export const Compact: Story = {
  args: {
    columns,
    data: sampleOrders,
    rowKey: (row: Order) => row.id,
    density: "compact",
  },
};
