"use client";

import React from "react";
import { ChevronDown } from "lucide-react";
import { getChainIcon, FALLBACK_ICON } from "@/lib/iconRegistry";

export type Chain = "stellar" | "bitcoin" | "ethereum";

export interface ChainInfo {
  id: Chain;
  name: string;
  disabled?: boolean;
  disabledMessage?: string;
}

export interface ChainSelectorProps {
  value: Chain | null;
  onChange: (chain: Chain) => void;
  chains?: ChainInfo[];
  label?: string;
  placeholder?: string;
  disabled?: boolean;
  error?: string;
  required?: boolean;
}

const DEFAULT_CHAINS: ChainInfo[] = [
  { id: "stellar", name: "Stellar" },
  { id: "bitcoin", name: "Bitcoin" },
  { id: "ethereum", name: "Ethereum" },
];

export function ChainSelector({
  value,
  onChange,
  chains = DEFAULT_CHAINS,
  label = "Select chain",
  placeholder = "Choose a chain",
  disabled = false,
  error,
  required = false,
}: ChainSelectorProps) {
  const selectedChain = chains.find((c) => c.id === value);
  const activeChains = chains.filter((c) => !c.disabled);
  const hasDisabledChains = chains.some((c) => c.disabled);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (disabled) return;

    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      (e.target as HTMLButtonElement).click();
    }

    if (e.key === "ArrowDown" && activeChains.length > 0) {
      e.preventDefault();
      const currentIndex = activeChains.findIndex((c) => c.id === value);
      const nextIndex = currentIndex < activeChains.length - 1 ? currentIndex + 1 : 0;
      onChange(activeChains[nextIndex].id);
    }

    if (e.key === "ArrowUp" && activeChains.length > 0) {
      e.preventDefault();
      const currentIndex = activeChains.findIndex((c) => c.id === value);
      const prevIndex = currentIndex > 0 ? currentIndex - 1 : activeChains.length - 1;
      onChange(activeChains[prevIndex].id);
    }
  };

  return (
    <div className="space-y-1.5">
      <label
        id="chain-selector-label"
        className="text-xs font-semibold uppercase tracking-[0.16em] text-text-muted"
      >
        {label}
        {required && (
          <span className="text-status-error ml-1" aria-hidden="true">
            *
          </span>
        )}
      </label>

      <div className="relative">
        <button
          type="button"
          disabled={disabled}
          onClick={() => {
            if (!disabled && selectedChain && !selectedChain.disabled) {
              const currentIdx = chains.findIndex((c) => c.id === value);
              let nextIdx = currentIdx + 1;
              while (nextIdx < chains.length) {
                if (!chains[nextIdx].disabled) {
                  onChange(chains[nextIdx].id);
                  break;
                }
                nextIdx = (nextIdx + 1) % chains.length;
              }
            }
          }}
          onKeyDown={handleKeyDown}
          aria-label={label}
          aria-haspopup="listbox"
          aria-expanded={false}
          aria-describedby={
            error ? "chain-selector-error" : hasDisabledChains ? "chain-selector-note" : undefined
          }
          className={`
            flex h-11 w-full items-center justify-between rounded-xl border bg-surface-raised px-4 
            text-sm transition-colors
            focus:outline-none focus:ring-2 focus:ring-border-focus focus:ring-offset-2
            disabled:cursor-not-allowed disabled:opacity-50
            ${error ? "border-status-error" : "border-border"}
          `}
        >
          <span className="flex items-center gap-2">
            {selectedChain ? (
              <>
                {(() => {
                  const Icon = getChainIcon(selectedChain.id) ?? FALLBACK_ICON;
                  return (
                    <Icon
                      className={`h-5 w-5 ${
                        selectedChain.disabled
                          ? "text-text-muted"
                          : `text-chain-${selectedChain.id}`
                      }`}
                    />
                  );
                })()}
                <span className={selectedChain.disabled ? "text-text-muted" : "text-text-primary"}>
                  {selectedChain.name}
                  {selectedChain.disabled && " (Unavailable)"}
                </span>
              </>
            ) : (
              <span className="text-text-muted">{placeholder}</span>
            )}
          </span>

          <ChevronDown className="h-4 w-4 text-text-muted" />
        </button>

        <select
          value={value ?? ""}
          onChange={(e) => {
            const selected = chains.find((c) => c.id === e.target.value);
            if (selected && !selected.disabled) {
              onChange(selected.id);
            }
          }}
          disabled={disabled}
          aria-label={label}
          className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
          tabIndex={0}
        >
          <option value="" disabled>
            {placeholder}
          </option>
          {chains.map((chain) => (
            <option key={chain.id} value={chain.id} disabled={chain.disabled}>
              {chain.name}
              {chain.disabled ? ` - ${chain.disabledMessage || "Unavailable"}` : ""}
            </option>
          ))}
        </select>
      </div>

      {hasDisabledChains && !error && (
        <p id="chain-selector-note" className="text-xs text-text-muted">
          Some chains may be temporarily unavailable
        </p>
      )}

      {error && (
        <p id="chain-selector-error" className="text-xs text-status-error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
