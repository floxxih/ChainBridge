# ChainBridge

> **Trustless cross-chain atomic swaps on Stellar using HTLCs and Soroban**

```
   ____ _           _       ____       _     _            
  / ___| |__   __ _(_)_ __ | __ ) _ __(_) __| | __ _  ___ 
 | |   | '_ \ / _` | | '_ \|  _ \| '__| |/ _` |/ _` |/ _ \
 | |___| | | | (_| | | | | | |_) | |  | | (_| | (_| |  __/
  \____|_| |_|\__,_|_|_| |_|____/|_|  |_|\__,_|\__, |\___|
                                                |___/      
```

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![Built on Stellar](https://img.shields.io/badge/Built%20on-Stellar%20Soroban-purple)](https://soroban.stellar.org)
[![Cross-Chain](https://img.shields.io/badge/Cross--Chain-Enabled-orange)]()

## The Problem

Current cross-chain solutions have major issues:
- **Wrapped Tokens**: Require trust in bridge operators and custody
- **Centralized Bridges**: Single points of failure, hacks, and censorship
- **High Fees**: Multiple transactions and bridge fees add up
- **Slow**: Often take hours or days for cross-chain transfers
- **Complex**: Poor UX requiring multiple steps and wallets

## The Solution

ChainBridge enables **trustless atomic swaps** between Stellar and other blockchains:
- **No Wrapped Tokens**: Direct asset swaps, no intermediaries
- **Trustless**: Hash Time-Locked Contracts (HTLCs) guarantee atomicity
- **Fast**: Swaps complete in minutes, not hours
- **Cheap**: Leverage Stellar's low transaction costs
- **Multi-Chain**: Support for Bitcoin, Ethereum, Solana, and more

---

## How It Works

### Atomic Swap Protocol (HTLC)

```
Alice (Stellar XLM) ←→ Bob (Bitcoin BTC)

1. Alice generates secret S and hash H = hash(S)
2. Alice locks XLM on Stellar with HTLC (H, 24h timeout)
3. Bob locks BTC on Bitcoin with HTLC (H, 12h timeout)
4. Alice reveals S to claim BTC
5. Bob uses revealed S to claim XLM
```

**Atomicity Guaranteed:**
- Either both swaps complete or both refund
- No counterparty risk
- No trusted third party needed

---

## Features

| Feature | Description |
|---------|-------------|
| **Cross-Chain Swaps** | Swap between Stellar and BTC, ETH, SOL, USDC, and more |
| **Hash Time-Locked Contracts** | Soroban smart contracts with atomic guarantees |
| **Order Book** | Decentralized orderbook for swap requests |
| **Automated Market Making** | Optional AMM for instant swaps |
| **Relayer Network** | Decentralized relayers assist with chain monitoring |
| **Multi-Sig Support** | Enhanced security with multi-signature swaps |

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                      FRONTEND (Next.js)                          │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐       │
│  │  Create  │  │  Browse  │  │  Execute │  │   Track  │       │
│  │  Swap    │  │  Orders  │  │   Swap   │  │   Swaps  │       │
│  └────┬─────┘  └─────┬────┘  └─────┬────┘  └────┬─────┘       │
└───────┼──────────────┼─────────────┼────────────┼──────────────┘
        │              │             │            │
        ▼              ▼             ▼            ▼
┌─────────────────────────────────────────────────────────────────┐
│                   SOROBAN SMART CONTRACTS                        │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │                  ChainBridge Protocol                     │   │
│  │  • create_htlc()   • claim_htlc()    • refund_htlc()    │   │
│  │  • create_order()  • cancel_order()  • match_order()    │   │
│  │  • get_swap()      • verify_proof()  • update_status()  │   │
│  └──────────────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │                    HTLC Manager                           │   │
│  │  • Lock funds with hash • Validate secrets               │   │
│  │  • Enforce timelocks    • Handle refunds                 │   │
│  └──────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
        │
        ▼
┌─────────────────────────────────────────────────────────────────┐
│                    RELAYER NETWORK (Rust)                        │
│  ┌────────────┐  ┌─────────────┐  ┌──────────────┐             │
│  │   Chain    │  │    Proof    │  │   Event      │             │
│  │  Monitor   │  │  Generator  │  │  Indexer     │             │
│  └─────┬──────┘  └──────┬──────┘  └──────┬───────┘             │
│        ▼                ▼                ▼                      │
│  ┌──────────────────────────────────────────────────────┐      │
│  │      Bitcoin/Ethereum/Solana Light Clients           │      │
│  └──────────────────────────────────────────────────────┘      │
└─────────────────────────────────────────────────────────────────┘
        │
        ▼
┌─────────────────────────────────────────────────────────────────┐
│                      BACKEND SERVICES                            │
│  ┌────────────┐  ┌─────────────┐  ┌──────────────┐             │
│  │  Order     │  │   REST API  │  │  Analytics   │             │
│  │  Matching  │  │  (FastAPI)  │  │   Service    │             │
│  └─────┬──────┘  └──────┬──────┘  └──────┬───────┘             │
│        ▼                ▼                ▼                      │
│  ┌──────────────────────────────────────────────────────┐      │
│  │            PostgreSQL + Redis Cache                  │      │
│  └──────────────────────────────────────────────────────┘      │
└─────────────────────────────────────────────────────────────────┘
```

---

## Supported Chains

### Phase 1 (MVP)
- ✅ Stellar (native)
- ✅ Bitcoin (BTC)
- ✅ Ethereum (ETH, ERC-20 tokens)

### Phase 2
- 🔄 Solana (SOL, SPL tokens)
- 🔄 Polygon (MATIC)
- 🔄 Binance Smart Chain (BNB)

### Phase 3
- 📋 Cosmos (ATOM)
- 📋 Polkadot (DOT)
- 📋 Cardano (ADA)

---

## Use Cases

### For Users
- **Portfolio Rebalancing**: Move assets across chains without CEX
- **Arbitrage**: Take advantage of price differences across chains
- **Asset Migration**: Move holdings to Stellar's low-fee ecosystem
- **Privacy**: Swap without KYC or centralized exchanges

### For Developers
- **DeFi Composability**: Build cross-chain DeFi products
- **Multi-Chain Apps**: Create applications spanning multiple chains
- **Liquidity Aggregation**: Access liquidity from multiple networks
- **Bridge Infrastructure**: Base layer for other bridge protocols

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| **Blockchain** | Stellar Soroban (Rust) |
| **Relayer** | Rust, Bitcoin/Ethereum/Solana SDKs |
| **Frontend** | Next.js 14, TypeScript, Web3 Wallets |
| **Backend** | FastAPI (Python), PostgreSQL, Redis |
| **Cryptography** | SHA256, Schnorr, ECDSA |
| **Infrastructure** | Docker, Kubernetes |

---

## Getting Started

### Prerequisites

- Node.js v18+
- Rust & Cargo
- Soroban CLI
- Docker & Docker Compose
- Bitcoin Core (for development)
- Ethereum node or Infura key

### Installation

```bash
# Clone the repository
git clone https://github.com/floxxih/ChainBridge.git
cd ChainBridge

# Setup Smart Contracts
cd smartcontract
cargo build --release --target wasm32-unknown-unknown

# Deploy to testnet
soroban contract deploy --wasm target/wasm32-unknown-unknown/release/chainbridge.wasm --network testnet

# Setup Relayer
cd ../relayer
cargo build --release

# Setup Frontend
cd ../frontend
npm install
npm run dev

# Setup Backend (using Docker)
cd ..
docker-compose up -d
```

---

## Docker Development Environment

ChainBridge uses Docker for consistent development environments. All backend services (PostgreSQL, Redis, and the FastAPI backend) run in containers.

### Quick Start with Docker

```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop all services
docker-compose down

# Stop and remove volumes (clean slate)
docker-compose down -v
```

### Development Mode

For development with hot-reloading and optional database admin UI:

```bash
# Start development environment
docker-compose -f docker-compose.dev.yml up -d

# Start with Adminer (database admin UI)
docker-compose -f docker-compose.dev.yml --profile admin up -d

# Access Adminer at http://localhost:8080
```

### Services Overview

| Service | Port | Description |
|---------|------|-------------|
| **Backend API** | 8000 | FastAPI REST API |
| **PostgreSQL** | 5432 | Primary database |
| **Redis** | 6379 | Cache and message broker |
| **Adminer** | 8080 | Database admin UI (dev only) |

### Environment Variables

Copy `.env.example` to `.env` and customize:

```bash
cp .env.example .env
```

Key environment variables:

| Variable | Default | Description |
|----------|---------|-------------|
| `POSTGRES_USER` | chainbridge | PostgreSQL username |
| `POSTGRES_PASSWORD` | chainbridge_dev | PostgreSQL password |
| `POSTGRES_DB` | chainbridge | Database name |
| `REDIS_PASSWORD` | chainbridge_redis_dev | Redis password |
| `DEBUG` | true | Enable debug mode |
| `CORS_ORIGINS` | http://localhost:3000 | Allowed CORS origins |

### Docker Commands Reference

```bash
# Build images
docker-compose build

# Start services in background
docker-compose up -d

# View running containers
docker-compose ps

# View logs for specific service
docker-compose logs -f backend
docker-compose logs -f postgres
docker-compose logs -f redis

# Execute command in container
docker-compose exec backend bash
docker-compose exec postgres psql -U chainbridge -d chainbridge

# Restart specific service
docker-compose restart backend

# Check service health
docker-compose ps
docker inspect --format='{{.State.Health.Status}}' chainbridge-backend

# Stop all services
docker-compose down

# Remove volumes (WARNING: deletes all data)
docker-compose down -v
```

### Database Management

```bash
# Connect to PostgreSQL
docker-compose exec postgres psql -U chainbridge -d chainbridge

# Run database migrations (when implemented)
docker-compose exec backend alembic upgrade head

# Create a new migration
docker-compose exec backend alembic revision --autogenerate -m "description"

# Reset database
docker-compose down -v
docker-compose up -d
```

### Redis Management

```bash
# Connect to Redis CLI
docker-compose exec redis redis-cli

# Monitor Redis commands
docker-compose exec redis redis-cli MONITOR

# Check Redis info
docker-compose exec redis redis-cli INFO
```

### Troubleshooting

#### Container won't start
```bash
# Check logs
docker-compose logs backend

# Rebuild container
docker-compose build --no-cache backend
docker-compose up -d backend
```

#### Database connection issues
```bash
# Verify PostgreSQL is running
docker-compose ps postgres

# Check PostgreSQL logs
docker-compose logs postgres

# Test connection
docker-compose exec backend python -c "from sqlalchemy import create_engine; engine = create_engine('postgresql://chainbridge:chainbridge_dev@postgres:5432/chainbridge'); conn = engine.connect(); print('Connected!')"
```

#### Port conflicts
If ports are already in use, modify the port mappings in `.env`:
```bash
POSTGRES_PORT=5433
REDIS_PORT=6380
BACKEND_PORT=8001
```

### Health Checks

All services include health checks:

- **PostgreSQL**: `pg_isready` command
- **Redis**: `redis-cli ping`
- **Backend**: HTTP request to `/health` endpoint

Check health status:
```bash
docker-compose ps
```

---

## Atomic Swap Flow

### Creating a Swap

```bash
# Alice wants to swap 100 XLM for 0.001 BTC

1. Alice creates swap order on ChainBridge
2. Bob accepts the order
3. Alice generates secret preimage and hash
4. Alice locks 100 XLM in Stellar HTLC (24h timeout)
5. Bob verifies lock and locks 0.001 BTC (12h timeout)
6. Alice claims BTC by revealing preimage
7. Bob uses preimage to claim XLM
```

### Security Guarantees

- **Atomic**: Both swaps complete or both refund
- **Trustless**: No custody, no intermediaries
- **Time-Safe**: Timeouts prevent fund lockup
- **Verifiable**: All steps on-chain and auditable

---

## Documentation

- [Architecture Guide](./docs/ARCHITECTURE.md)
- [Smart Contract Documentation](./docs/SMARTCONTRACT.md)
- [HTLC Protocol Specification](./docs/HTLC.md)
- [Relayer Setup Guide](./docs/RELAYER.md)
- [API Reference](./docs/API.md)

---

## Security

### Audits
- Smart contracts will be audited before mainnet
- Relayer code independently verified
- Cryptographic primitives use battle-tested libraries

### Bug Bounty
- Coming soon: $50,000 bug bounty program
- Report vulnerabilities: security@chainbridge.io

---

## Roadmap

- [x] Core HTLC smart contracts
- [x] Bitcoin swap support
- [x] Ethereum swap support
- [ ] Relayer network MVP
- [ ] Mainnet launch
- [ ] Solana integration
- [ ] AMM for instant swaps
- [ ] Mobile app
- [ ] Governance DAO

---

## Contributing

We welcome contributions! See [CONTRIBUTING.md](./CONTRIBUTING.md) for guidelines.

**Areas Needing Help:**
- Light client implementations
- Cross-chain proof verification
- Frontend UX improvements
- Documentation and tutorials

---

## License

MIT License - see [LICENSE](./LICENSE) for details.

---

## Disclaimer

ChainBridge is experimental software under active development. Use at your own risk. Always test with small amounts first.

---

*Building the future of trustless cross-chain swaps on Stellar*
