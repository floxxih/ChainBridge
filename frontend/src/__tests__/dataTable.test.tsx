import { fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { DataTable, type ColumnDef, type SortState } from "@/components/ui/data-table";

interface Order {
  id: string;
  pair: string;
  amount: number;
  createdAt: Date;
}

const orders: Order[] = [
  { id: "1", pair: "XLM/BTC", amount: 100, createdAt: new Date("2026-04-01") },
  { id: "2", pair: "ETH/USDC", amount: 25, createdAt: new Date("2026-04-15") },
  { id: "3", pair: "BTC/USDT", amount: 50, createdAt: new Date("2026-04-08") },
];

const columns: ColumnDef<Order, keyof Order>[] = [
  { key: "pair", header: "Pair", accessor: "pair", sortable: true, filterable: true },
  { key: "amount", header: "Amount", accessor: "amount", sortable: true, align: "right" },
  {
    key: "createdAt",
    header: "Created",
    accessor: "createdAt",
    sortable: true,
    cell: (_, value) => (value as Date).toISOString().slice(0, 10),
  },
];

function renderTable(props: Partial<React.ComponentProps<typeof DataTable<Order>>> = {}) {
  return render(
    <DataTable<Order>
      columns={columns}
      data={orders}
      rowKey={(row) => row.id}
      {...props}
    />,
  );
}

describe("DataTable", () => {
  test("renders headers, rows, and uses cell renderer for accessor columns", () => {
    renderTable();
    expect(screen.getByRole("columnheader", { name: /pair/i })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: /amount/i })).toBeInTheDocument();
    expect(screen.getByText("XLM/BTC")).toBeInTheDocument();
    expect(screen.getByText("2026-04-15")).toBeInTheDocument();
  });

  test("renders skeleton rows while loading", () => {
    renderTable({ loading: true, loadingRowCount: 3 });
    const grid = screen.getByRole("grid");
    expect(grid).toHaveAttribute("aria-busy", "true");
    expect(grid.querySelectorAll('tr[aria-hidden="true"]')).toHaveLength(3);
  });

  test("renders empty state when no rows", () => {
    renderTable({ data: [], emptyMessage: "Nothing here" });
    expect(screen.getByText("Nothing here")).toBeInTheDocument();
  });

  test("renders custom empty state slot", () => {
    renderTable({ data: [], emptyState: <div data-testid="custom-empty">No orders</div> });
    expect(screen.getByTestId("custom-empty")).toBeInTheDocument();
  });

  test("renders error state when supplied", () => {
    renderTable({ errorState: <div data-testid="err">Boom</div> });
    expect(screen.getByTestId("err")).toBeInTheDocument();
    // error should suppress data rows
    expect(screen.queryByText("XLM/BTC")).not.toBeInTheDocument();
  });

  test("client-side sort cycles asc → desc → none", async () => {
    const user = userEvent.setup();
    renderTable();
    const sortBtn = screen.getByRole("button", { name: /sort by amount/i });

    await user.click(sortBtn);
    let rows = screen.getAllByRole("row").slice(1); // skip header
    expect(within(rows[0]).getByText("25")).toBeInTheDocument();
    expect(within(rows[2]).getByText("100")).toBeInTheDocument();

    await user.click(sortBtn);
    rows = screen.getAllByRole("row").slice(1);
    expect(within(rows[0]).getByText("100")).toBeInTheDocument();
    expect(within(rows[2]).getByText("25")).toBeInTheDocument();

    await user.click(sortBtn);
    rows = screen.getAllByRole("row").slice(1);
    // back to original (insertion) order
    expect(within(rows[0]).getByText("100")).toBeInTheDocument();
    expect(within(rows[1]).getByText("25")).toBeInTheDocument();
  });

  test("server-mode sort calls onSortChange but does not reorder rows", async () => {
    const user = userEvent.setup();
    const onSortChange = jest.fn();
    renderTable({ sortMode: "server", sort: null, onSortChange });

    await user.click(screen.getByRole("button", { name: /sort by amount/i }));
    expect(onSortChange).toHaveBeenLastCalledWith({ key: "amount", direction: "asc" });

    // rows still in original order — server-mode does not reorder client-side
    const rows = screen.getAllByRole("row").slice(1);
    expect(within(rows[0]).getByText("100")).toBeInTheDocument();
  });

  test("aria-sort reflects current sort state", async () => {
    const sort: SortState = { key: "pair", direction: "desc" };
    renderTable({ sortMode: "server", sort, onSortChange: jest.fn() });
    const header = screen.getByRole("columnheader", { name: /pair/i });
    expect(header).toHaveAttribute("aria-sort", "descending");
  });

  test("filterValue narrows rows on filterable columns", () => {
    renderTable({ filterValue: "ETH" });
    expect(screen.getByText("ETH/USDC")).toBeInTheDocument();
    expect(screen.queryByText("XLM/BTC")).not.toBeInTheDocument();
  });

  test("sort header is keyboard-operable via Enter and Space", async () => {
    const user = userEvent.setup();
    renderTable();
    const button = screen.getByRole("button", { name: /sort by pair/i });
    button.focus();
    await user.keyboard("{Enter}");
    expect(screen.getByRole("columnheader", { name: /pair/i })).toHaveAttribute(
      "aria-sort",
      "ascending",
    );
    await user.keyboard(" ");
    expect(screen.getByRole("columnheader", { name: /pair/i })).toHaveAttribute(
      "aria-sort",
      "descending",
    );
  });

  test("rows expose roving tabindex when onRowClick is set", () => {
    renderTable({ onRowClick: jest.fn() });
    const rows = screen.getAllByRole("row").slice(1);
    expect(rows[0]).toHaveAttribute("tabindex", "0");
    expect(rows[1]).toHaveAttribute("tabindex", "-1");
  });

  test("ArrowDown / ArrowUp / Home / End move focus across rows", async () => {
    renderTable({ onRowClick: jest.fn() });
    const rows = screen.getAllByRole("row").slice(1);
    rows[0].focus();
    fireEvent.keyDown(rows[0], { key: "ArrowDown" });
    expect(rows[1]).toHaveFocus();
    fireEvent.keyDown(rows[1], { key: "End" });
    expect(rows[rows.length - 1]).toHaveFocus();
    fireEvent.keyDown(rows[rows.length - 1], { key: "Home" });
    expect(rows[0]).toHaveFocus();
    fireEvent.keyDown(rows[0], { key: "ArrowUp" });
    expect(rows[0]).toHaveFocus(); // clamped at top
  });

  test("Enter and Space activate onRowClick", () => {
    const onRowClick = jest.fn();
    renderTable({ onRowClick });
    const firstRow = screen.getAllByRole("row").slice(1)[0];
    firstRow.focus();
    fireEvent.keyDown(firstRow, { key: "Enter" });
    fireEvent.keyDown(firstRow, { key: " " });
    expect(onRowClick).toHaveBeenCalledTimes(2);
    expect(onRowClick).toHaveBeenLastCalledWith(orders[0], 0);
  });

  test("rows without onRowClick are not focusable", () => {
    renderTable();
    const rows = screen.getAllByRole("row").slice(1);
    rows.forEach((row) => expect(row).not.toHaveAttribute("tabindex"));
  });

  test("sortValue overrides accessor for client sort", async () => {
    const user = userEvent.setup();
    const cols: ColumnDef<Order, keyof Order>[] = [
      {
        key: "pair",
        header: "Pair",
        accessor: "pair",
        sortable: true,
        sortValue: (row) => row.pair.split("/")[1] ?? "",
      },
    ];
    render(
      <DataTable<Order>
        columns={cols}
        data={orders}
        rowKey={(row) => row.id}
      />,
    );
    await user.click(screen.getByRole("button", { name: /sort by pair/i }));
    const rows = screen.getAllByRole("row").slice(1);
    // Sorted by quote currency: BTC, USDC, USDT
    expect(within(rows[0]).getByText("XLM/BTC")).toBeInTheDocument();
    expect(within(rows[1]).getByText("ETH/USDC")).toBeInTheDocument();
    expect(within(rows[2]).getByText("BTC/USDT")).toBeInTheDocument();
  });

  test("isRowSelected sets aria-selected", () => {
    renderTable({ isRowSelected: (row) => row.id === "2" });
    const rows = screen.getAllByRole("row").slice(1);
    expect(rows[1]).toHaveAttribute("aria-selected", "true");
    expect(rows[0]).not.toHaveAttribute("aria-selected");
  });
});
