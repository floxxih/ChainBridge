"use client";

import { useState, useMemo } from "react";
import { ChainIcon } from "./ChainIcon";
import { TokenIcon } from "./TokenIcon";
import { cn } from "@/lib/utils";
import { Search, ChevronDown, Check } from "lucide-react";

export interface Asset {
  symbol: string;
  name: string;
  chain: string;
  balance?: string;
  icon?: string;
}

export interface Chain {
  id: string;
  name: string;
  assets: Asset[];
}

interface ChainAssetSelectorProps {
  chains: Chain[];
  selectedChain?: string;
  selectedAsset?: string;
  onSelect: (chain: string, asset: string) => void;
  label?: string;
  placeholder?: string;
  disabled?: boolean;
  showBalance?: boolean;
  className?: string;
}

export function ChainAssetSelector({
  chains,
  selectedChain,
  selectedAsset,
  onSelect,
  label,
  placeholder = "Select chain and asset",
  disabled = false,
  showBalance = true,
  className,
}: ChainAssetSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeChain, setActiveChain] = useState<string | null>(selectedChain || null);

  const selectedAssetData = useMemo(() => {
    if (!selectedChain || !selectedAsset) return null;
    const chain = chains.find((c) => c.id === selectedChain);
    return chain?.assets.find((a) => a.symbol === selectedAsset);
  }, [chains, selectedChain, selectedAsset]);

  const filteredChains = useMemo(() => {
    if (!searchQuery) return chains;
    const query = searchQuery.toLowerCase();
    return chains
      .map((chain) => ({
        ...chain,
        assets: chain.assets.filter(
          (asset) =>
            asset.symbol.toLowerCase().includes(query) || asset.name.toLowerCase().includes(query)
        ),
      }))
      .filter((chain) => chain.assets.length > 0 || chain.name.toLowerCase().includes(query));
  }, [chains, searchQuery]);

  const handleAssetSelect = (chain: string, asset: string) => {
    onSelect(chain, asset);
    setIsOpen(false);
    setSearchQuery("");
    setActiveChain(null);
  };

  return (
    <div className={cn("relative", className)}>
      {label && <label className="mb-2 block text-sm font-medium text-text-primary">{label}</label>}

      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-label={label ? `${label} — select chain and asset` : "Select chain and asset"}
        className={cn(
          "flex w-full items-center justify-between gap-3 rounded-xl border bg-surface px-4 py-3",
          "transition-all duration-200",
          disabled
            ? "cursor-not-allowed opacity-50"
            : "hover:border-brand-500/40 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20",
          isOpen && "border-brand-500 ring-2 ring-brand-500/20",
          !selectedAssetData && "border-border",
          selectedAssetData && "border-border"
        )}
      >
        {selectedAssetData ? (
          <div className="flex items-center gap-3">
            <div className="relative">
              <TokenIcon token={selectedAssetData.symbol} size="md" />
              <div className="absolute -bottom-1 -right-1">
                <ChainIcon chain={selectedChain!} size="sm" />
              </div>
            </div>
            <div className="flex flex-col items-start">
              <span className="font-medium text-text-primary">{selectedAssetData.symbol}</span>
              <span className="text-xs text-text-muted">
                {selectedAssetData.name} • {selectedChain}
              </span>
            </div>
            {showBalance && selectedAssetData.balance && (
              <span className="ml-auto text-sm text-text-secondary">
                {selectedAssetData.balance}
              </span>
            )}
          </div>
        ) : (
          <span className="text-text-muted">{placeholder}</span>
        )}
        <ChevronDown
          className={cn("h-5 w-5 text-text-muted transition-transform", isOpen && "rotate-180")}
        />
      </button>

      {/* Dropdown */}
      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => {
              setIsOpen(false);
              setSearchQuery("");
              setActiveChain(null);
            }}
          />
          <div
            className="absolute z-50 mt-2 w-full rounded-xl border border-border bg-surface-raised shadow-card dark:shadow-card-dark"
            role="listbox"
            aria-label={label ? `${label} — available options` : "Available chains and assets"}
          >
            {/* Search */}
            <div className="border-b border-border p-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search chains or assets..."
                  aria-label="Search chains or assets"
                  className="w-full rounded-lg border border-border bg-surface py-2 pl-10 pr-4 text-sm text-text-primary placeholder:text-text-muted focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                  autoFocus
                />
              </div>
            </div>

            {/* Chain Tabs */}
            <div className="flex gap-1 border-b border-border p-2" role="tablist" aria-label="Filter by chain">
              {filteredChains.map((chain) => (
                <button
                  key={chain.id}
                  onClick={() => setActiveChain(activeChain === chain.id ? null : chain.id)}
                  role="tab"
                  aria-selected={activeChain === chain.id}
                  className={cn(
                    "flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                    activeChain === chain.id
                      ? "bg-brand-500/10 text-brand-500"
                      : "text-text-secondary hover:bg-surface-overlay hover:text-text-primary"
                  )}
                >
                  <ChainIcon chain={chain.id} size="sm" />
                  {chain.name}
                </button>
              ))}
            </div>

            {/* Assets List */}
            <div className="max-h-80 overflow-y-auto p-2">
              {filteredChains.map((chain) => {
                if (activeChain && activeChain !== chain.id) return null;

                return (
                  <div key={chain.id} className="mb-2 last:mb-0">
                    {!activeChain && (
                      <div className="mb-1 flex items-center gap-2 px-2 py-1 text-xs font-medium text-text-muted">
                        <ChainIcon chain={chain.id} size="sm" />
                        {chain.name}
                      </div>
                    )}
                    {chain.assets.map((asset) => {
                      const isSelected =
                        selectedChain === chain.id && selectedAsset === asset.symbol;
                      return (
                        <button
                          key={`${chain.id}-${asset.symbol}`}
                          onClick={() => handleAssetSelect(chain.id, asset.symbol)}
                          role="option"
                          aria-selected={isSelected}
                          aria-label={`${asset.symbol} — ${asset.name} on ${chain.name}`}
                          className={cn(
                            "flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left transition-colors",
                            isSelected
                              ? "bg-brand-500/10 text-brand-500"
                              : "hover:bg-surface-overlay"
                          )}
                        >
                          <TokenIcon token={asset.symbol} size="md" />
                          <div className="flex-1">
                            <div className="font-medium text-text-primary">{asset.symbol}</div>
                            <div className="text-xs text-text-muted">{asset.name}</div>
                          </div>
                          {showBalance && asset.balance && (
                            <span className="text-sm text-text-secondary">{asset.balance}</span>
                          )}
                          {isSelected && <Check className="h-4 w-4 text-brand-500" />}
                        </button>
                      );
                    })}
                  </div>
                );
              })}

              {filteredChains.length === 0 && (
                <div className="py-8 text-center text-sm text-text-muted">
                  No chains or assets found
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
