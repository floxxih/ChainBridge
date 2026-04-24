"use client";

import React, { useState } from "react";
import { Filter, Search } from "lucide-react";
import { Button, Card, Input } from "@/components/ui";
import { AdvancedFilterDrawer } from "@/components/filters/AdvancedFilterDrawer";

export type FilterStatus = "all" | "active" | "expired" | "cancelled" | "filled";
export type RangeFilter = "all" | "24h" | "7d" | "30d" | "90d";

interface OrderFilterBarProps {
    query: string;
    onQueryChange: (query: string) => void;
    statusFilter: FilterStatus;
    onStatusChange: (status: FilterStatus) => void;
    chainFilter: string;
    onChainChange: (chain: string) => void;
    assetFilter: string;
    onAssetChange: (asset: string) => void;
    rangeFilter: RangeFilter;
    onRangeChange: (range: RangeFilter) => void;
    chainOptions: string[];
    assetOptions: string[];
    onClear: () => void;
}

export function OrderFilterBar({
    query,
    onQueryChange,
    statusFilter,
    onStatusChange,
    chainFilter,
    onChainChange,
    assetFilter,
    onAssetChange,
    rangeFilter,
    onRangeChange,
    chainOptions,
    assetOptions,
    onClear,
}: OrderFilterBarProps) {
    const [drawerOpen, setDrawerOpen] = useState(false);

    return (
        <>
            <Card variant="raised" className="p-5">
                <div className="grid gap-3 md:grid-cols-[1.3fr_auto]">
                    <Input
                        value={query}
                        onChange={(event) => onQueryChange(event.target.value)}
                        placeholder="Search pair, token, or address"
                        leftElement={<Search className="h-4 w-4" />}
                    />
                    <Button
                        variant="secondary"
                        icon={<Filter className="h-4 w-4" />}
                        onClick={() => setDrawerOpen(true)}
                    >
                        Advanced Filters
                    </Button>
                </div>
            </Card>

            <AdvancedFilterDrawer
                open={drawerOpen}
                onClose={() => setDrawerOpen(false)}
                onClear={onClear}
                title="Browse Order Filters"
            >
                <div className="space-y-5">
                    <div className="space-y-2">
                        <label className="text-xs font-semibold uppercase tracking-[0.16em] text-text-muted">
                            Status
                        </label>
                        <select
                            value={statusFilter}
                            onChange={(event) => onStatusChange(event.target.value as FilterStatus)}
                            className="h-10 w-full rounded-xl border border-border bg-surface-raised px-3 text-sm text-text-primary"
                        >
                            <option value="all">All statuses</option>
                            <option value="active">Active</option>
                            <option value="expired">Expired</option>
                            <option value="cancelled">Cancelled</option>
                            <option value="filled">Filled</option>
                        </select>
                    </div>

                    <div className="space-y-2">
                        <label className="text-xs font-semibold uppercase tracking-[0.16em] text-text-muted">
                            Chain
                        </label>
                        <select
                            value={chainFilter}
                            onChange={(event) => onChainChange(event.target.value)}
                            className="h-10 w-full rounded-xl border border-border bg-surface-raised px-3 text-sm text-text-primary"
                        >
                            <option value="all">All chains</option>
                            {chainOptions.map((chain) => (
                                <option key={chain} value={chain}>
                                    {chain}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="space-y-2">
                        <label className="text-xs font-semibold uppercase tracking-[0.16em] text-text-muted">
                            Asset
                        </label>
                        <select
                            value={assetFilter}
                            onChange={(event) => onAssetChange(event.target.value)}
                            className="h-10 w-full rounded-xl border border-border bg-surface-raised px-3 text-sm text-text-primary"
                        >
                            <option value="all">All assets</option>
                            {assetOptions.map((asset) => (
                                <option key={asset} value={asset}>
                                    {asset}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="space-y-2">
                        <label className="text-xs font-semibold uppercase tracking-[0.16em] text-text-muted">
                            Time range
                        </label>
                        <select
                            value={rangeFilter}
                            onChange={(event) => onRangeChange(event.target.value as RangeFilter)}
                            className="h-10 w-full rounded-xl border border-border bg-surface-raised px-3 text-sm text-text-primary"
                        >
                            <option value="all">All time</option>
                            <option value="24h">Last 24 hours</option>
                            <option value="7d">Last 7 days</option>
                            <option value="30d">Last 30 days</option>
                            <option value="90d">Last 90 days</option>
                        </select>
                    </div>
                </div>
            </AdvancedFilterDrawer>
        </>
    );
}
