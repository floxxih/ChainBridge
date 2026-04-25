import { Activity, History, Search, Wallet, Inbox, AlertTriangle } from "lucide-react";
import { EmptyState } from "./empty-state";

interface EmptyStateAction {
  label: string;
  onClick?: () => void;
  href?: string;
  variant?: "primary" | "secondary" | "ghost" | "danger" | "outline";
}

interface PresetProps {
  action?: EmptyStateAction;
  secondaryAction?: EmptyStateAction;
  className?: string;
}

const ICON_CLASS = "h-7 w-7";

export function NoSwapsEmptyState({ action, ...rest }: PresetProps = {}) {
  return (
    <EmptyState
      icon={<History className={ICON_CLASS} />}
      title="No swaps yet"
      description="You have no historical swaps on this profile. Start a new cross-chain swap to populate activity here."
      action={action ?? { label: "Start a swap", href: "/swap" }}
      {...rest}
    />
  );
}

export function NoOrdersEmptyState({ action, ...rest }: PresetProps = {}) {
  return (
    <EmptyState
      icon={<Inbox className={ICON_CLASS} />}
      title="No orders created yet"
      description="You have not created any orders for this profile. Post your first order from the marketplace."
      action={action ?? { label: "Browse marketplace", href: "/marketplace" }}
      {...rest}
    />
  );
}

export function NoHTLCsEmptyState({ action, ...rest }: PresetProps = {}) {
  return (
    <EmptyState
      icon={<Activity className={ICON_CLASS} />}
      title="No HTLC activity yet"
      description="No HTLCs are available for the current participant and network context."
      action={action ?? { label: "Open Swap", href: "/swap" }}
      {...rest}
    />
  );
}

export function NoSearchResultsEmptyState({ action, ...rest }: PresetProps = {}) {
  return (
    <EmptyState
      icon={<Search className={ICON_CLASS} />}
      title="No matching results"
      description="Nothing matches the current filters. Try clearing or broadening the search to see more."
      action={action}
      {...rest}
    />
  );
}

export function WalletDisconnectedEmptyState({ action, ...rest }: PresetProps = {}) {
  return (
    <EmptyState
      icon={<Wallet className={ICON_CLASS} />}
      title="Connect your wallet"
      description="Connect a wallet to load and monitor activity tied to your account."
      action={action}
      {...rest}
    />
  );
}

export function GenericErrorEmptyState({ action, ...rest }: PresetProps = {}) {
  return (
    <EmptyState
      icon={<AlertTriangle className={ICON_CLASS} />}
      title="Something went wrong"
      description="We could not load the data for this view. Try again in a moment."
      action={action ?? { label: "Retry", variant: "secondary" }}
      {...rest}
    />
  );
}

export const EmptyStates = {
  NoSwaps: NoSwapsEmptyState,
  NoOrders: NoOrdersEmptyState,
  NoHTLCs: NoHTLCsEmptyState,
  NoSearchResults: NoSearchResultsEmptyState,
  WalletDisconnected: WalletDisconnectedEmptyState,
  GenericError: GenericErrorEmptyState,
} as const;
