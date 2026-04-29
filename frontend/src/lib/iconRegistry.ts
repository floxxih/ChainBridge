import { Network, Bitcoin, Zap, Coins, HelpCircle, Lightbulb } from "lucide-react";

export type IconComponent = React.ComponentType<{ className?: string }>;

const CHAIN_ICONS: Record<string, IconComponent> = {
  stellar: Lightbulb,
  ethereum: Zap,
  bitcoin: Bitcoin,
  solana: Network,
};

const TOKEN_ICONS: Record<string, IconComponent> = {
  xlm: Lightbulb,
  eth: Zap,
  btc: Bitcoin,
  sol: Network,
  usdt: Coins,
  usdc: Coins,
  dai: Coins,
  busd: Coins,
};

export const FALLBACK_ICON = HelpCircle;

export function getChainIcon(chain: string): IconComponent {
  const normalized = chain.toLowerCase();
  return CHAIN_ICONS[normalized] ?? FALLBACK_ICON;
}

export function getTokenIcon(token: string): IconComponent {
  const normalized = token.toLowerCase();
  return TOKEN_ICONS[normalized] ?? FALLBACK_ICON;
}

export function registerChainIcon(chain: string, icon: IconComponent): void {
  CHAIN_ICONS[chain.toLowerCase()] = icon;
}

export function registerTokenIcon(token: string, icon: IconComponent): void {
  TOKEN_ICONS[token.toLowerCase()] = icon;
}

export function isChainIconAvailable(chain: string): boolean {
  return chain.toLowerCase() in CHAIN_ICONS;
}

export function isTokenIconAvailable(token: string): boolean {
  return token.toLowerCase() in TOKEN_ICONS;
}
