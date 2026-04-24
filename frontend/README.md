# ChainBridge Frontend

Next.js 14 frontend for the ChainBridge cross-chain atomic swap protocol.

## Tech Stack

- **Framework**: Next.js 14 with App Router
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Blockchain Libraries**:
  - `ethers` - Ethereum interaction
  - `bitcoinjs-lib` - Bitcoin interaction
  - `@stellar/stellar-sdk` - Stellar/Soroban interaction
  - `@stellar/freighter-api` - Freighter wallet integration

## Prerequisites

- Node.js 18.17 or later
- npm, yarn, or pnpm

## Getting Started

### 1. Install Dependencies

```bash
npm install
# or
yarn install
# or
pnpm install
```

### 2. Environment Setup

Create a `.env.local` file:

```bash
cp .env.example .env.local
```

Environment variables:

| Variable                      | Description                       | Default                 |
| ----------------------------- | --------------------------------- | ----------------------- |
| `NEXT_PUBLIC_API_URL`         | Backend API URL                   | `http://localhost:8000` |
| `NEXT_PUBLIC_STELLAR_NETWORK` | Stellar network (testnet/mainnet) | `testnet`               |
| `NEXT_PUBLIC_BITCOIN_NETWORK` | Bitcoin network                   | `testnet`               |

### 3. Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### 4. Production Build

```bash
npm run build
npm run start
```

## Project Structure

```
frontend/
├── public/              # Static assets
├── src/
│   ├── app/            # Next.js App Router pages
│   │   ├── layout.tsx  # Root layout
│   │   └── page.tsx    # Home page
│   ├── components/     # React components
│   ├── hooks/          # Custom React hooks
│   │   ├── useLocalStorage.ts
│   │   └── useAsync.ts
│   ├── lib/            # Utility libraries
│   │   ├── ethereum.ts # Ethereum wallet functions
│   │   ├── bitcoin.ts  # Bitcoin utilities
│   │   └── stellar.ts  # Stellar/Soroban functions
│   ├── styles/         # Global styles
│   │   └── globals.css
│   └── types/          # TypeScript type definitions
│       └── index.ts
├── next.config.js
├── tailwind.config.ts
├── tsconfig.json
└── package.json
```

## Scripts

| Script           | Description              |
| ---------------- | ------------------------ |
| `npm run dev`    | Start development server |
| `npm run build`  | Build for production     |
| `npm run start`  | Start production server  |
| `npm run lint`   | Run ESLint               |
| `npm run format` | Format with Prettier     |

## Code Quality

All code must pass linting and formatting checks before merging.

### ESLint

```bash
npm run lint
```

**ESLint Rules**:
- No `var` statements (use `const`/`let`)
- Prefer `const` over `let`
- No unused variables (prefix with `_` to suppress)
- Strict equality (`===` not `==`)
- No implicit type coercion
- No console.log (warn on other console methods)
- All React keys required
- No param reassignment

### Prettier

```bash
# Format all files
npm run format

# Check formatting (used in CI)
npm run format:check
```

### TypeScript

```bash
# Type check
npm run type-check
```

### Pre-commit Hooks (Optional but Recommended)

Install Husky to automatically lint and format before commits:

```bash
npm install husky lint-staged --save-dev
npx husky install
npx husky add .husky/pre-commit "npm run lint && npm run format:check"
npm set-script prepare "husky install"
```

This ensures all committed code meets team standards.

## Features

### Wallet Integration

The frontend supports multiple blockchain wallets:

- **Stellar**: Freighter wallet
- **Ethereum**: MetaMask and other Web3 wallets
- **Bitcoin**: Bitcoin wallets (manual address input)

### Key Components

- Swap creation and management
- Order book browsing
- Transaction history
- Multi-chain wallet connection

## Development Guidelines

### Component Creation

```tsx
// Use functional components with TypeScript
import { FC } from "react";

interface MyComponentProps {
  title: string;
}

export const MyComponent: FC<MyComponentProps> = ({ title }) => {
  return <div>{title}</div>;
};
```

### Styling

Use Tailwind CSS classes:

```tsx
<div className="flex items-center justify-center p-4 bg-stellar-primary text-white">Content</div>
```

### State Management

- Use React hooks for local state
- Use `useLocalStorage` for persistent state
- Context API for global state (wallet, swap data)

### Theme Tokens and Design Primitives

Global design tokens are defined in `src/styles/globals.css` and split into:

- **Primitives**: spacing (`--space-*`), typography scale (`--font-size-*`), radii (`--radius-*`), and shadows (`--shadow-*`)
- **Semantic tokens**: `--color-bg-*`, `--color-text-*`, `--color-border-*`, and component aliases like `--shadow-card`

For components, prefer semantic tokens over hardcoded values so light/dark themes can be adjusted centrally.

### Unified Wallet Provider and Reconnect Strategy

`UnifiedWalletProvider` wraps the app in `src/app/providers.tsx` and exposes typed chain-aware wallet state/actions.

- Connect actions are normalized with `connectByChain(chain)`
- Active wallet disconnect is exposed with `disconnectActiveWallet()`
- Session restore is best-effort on mount using persisted wallet metadata from `zustand` storage
- If a wallet extension is unavailable or the network changed, restore failure is non-blocking and users can reconnect manually

## Testing

```bash
# Unit tests (when implemented)
npm run test

# E2E tests (when implemented)
npm run test:e2e
```

## Deployment

### Vercel (Recommended)

1. Connect your repository to Vercel
2. Configure environment variables
3. Deploy

### Docker

```dockerfile
# Build stage
FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Run stage
FROM node:18-alpine
WORKDIR /app
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

EXPOSE 3000
CMD ["node", "server.js"]
```

## Troubleshooting

### Module Not Found

Clear Next.js cache:

```bash
rm -rf .next node_modules
npm install
```

### TypeScript Errors

Regenerate type declarations:

```bash
npm run build
```

### Wallet Connection Issues

- Ensure wallet extension is installed
- Check network configuration
- Verify wallet is unlocked

## Contributing

See [CONTRIBUTING.md](../CONTRIBUTING.md) for guidelines.

## License

MIT License - see [LICENSE](../LICENSE) for details.
