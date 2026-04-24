# Contributing to ChainBridge

Thank you for your interest in contributing to ChainBridge! We welcome contributions from the community.

## Code of Conduct

Please be respectful and constructive in all interactions. We're building an inclusive community.

## How to Contribute

### Reporting Bugs

If you find a bug, please create an issue with:
- Clear description of the problem
- Steps to reproduce
- Expected vs actual behavior
- Environment details (OS, versions, etc.)

### Suggesting Features

We welcome feature suggestions! Please:
- Check existing issues first
- Provide clear use cases
- Explain why it benefits users

### Pull Requests

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes
4. Write or update tests
5. Ensure code passes linting
6. Commit with clear messages
7. Push to your fork
8. Open a Pull Request

## Development Environment Setup

### Prerequisites

Before you begin, ensure you have the following installed:
- A Unix-like operating system (Linux, macOS) or Windows with WSL2
- Git
- curl or wget
- A code editor (VS Code recommended with rust-analyzer extension)

### 1. Install Rust Toolchain

ChainBridge smart contracts are written in Rust and compiled to WebAssembly (WASM) for Soroban.

```bash
# Install rustup (Rust installer and version manager)
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

# Source the environment (or restart your terminal)
source $HOME/.cargo/env

# Verify installation
rustc --version
cargo --version

# Ensure you're on the stable channel
rustup default stable

# Update to the latest stable version
rustup update
```

### 2. Add WebAssembly Target

Soroban contracts compile to WebAssembly, so you need the wasm32 target:

```bash
# Add the wasm32-unknown-unknown target
rustup target add wasm32-unknown-unknown

# Verify the target is installed
rustup target list --installed | grep wasm32
```

### 3. Install Soroban CLI

The Soroban CLI is essential for building, deploying, and interacting with smart contracts on the Stellar network.

```bash
# Install Soroban CLI using cargo
cargo install soroban-cli --locked

# Verify installation
soroban --version

# Alternatively, if you encounter issues, you can install a specific version
# cargo install soroban-cli --version 21.0.0 --locked
```

### 4. Install Stellar CLI

The Stellar CLI provides additional tools for working with the Stellar network:

```bash
# Install stellar-cli using cargo
cargo install stellar-cli --locked

# Verify installation
stellar --version
```

### 5. Configure Soroban for Development

Set up Soroban for local development and testing:

```bash
# Add the testnet network configuration
soroban config network add --global testnet \
  --rpc-url https://soroban-testnet.stellar.org:443 \
  --network-passphrase "Test SDF Future Network ; October 2024"

# Add the futurenet network configuration (for bleeding edge features)
soroban config network add --global futurenet \
  --rpc-url https://rpc-futurenet.stellar.org:443 \
  --network-passphrase "Test SDF Future Network ; October 2024"

# Create an identity for testing (optional but recommended)
soroban config identity generate --global alice
soroban config identity generate --global bob

# Fund your test accounts on testnet
soroban config identity fund alice --network testnet
soroban config identity fund bob --network testnet
```

### 6. Build Smart Contracts

Clone the repository and build the smart contracts:

```bash
# Clone your fork
git clone https://github.com/YOUR_USERNAME/ChainBridge.git
cd ChainBridge

# Navigate to the smart contract directory
cd smartcontract

# Build the contract for WebAssembly
cargo build --target wasm32-unknown-unknown --release

# The compiled WASM file will be at:
# target/wasm32-unknown-unknown/release/chainbridge.wasm
```

### 7. Run Tests

Execute the test suite to verify your setup:

```bash
# Run all tests
cargo test

# Run tests with verbose output
cargo test -- --nocapture

# Run specific tests
cargo test test_htlc_creation
```

### 8. Optimize Contract (Optional)

For production deployments, optimize the contract size:

```bash
# Install the Soroban optimizer (if available)
# Note: soroban-optimize is part of the Stellar toolchain

# The build process in Cargo.toml already includes optimizations
# for release builds (opt-level = "z", lto = true)
```

### 9. Deploy to Testnet (Optional)

To deploy and test on the Stellar testnet:

```bash
# Deploy the contract
soroban contract deploy \
  --wasm target/wasm32-unknown-unknown/release/chainbridge.wasm \
  --network testnet \
  --source alice

# Note the contract ID output after deployment
# Example: Contract ID: CAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABSC4
```

### 10. Verify Installation

Run this verification script to ensure everything is set up correctly:

```bash
# Create a quick verification script
cat << 'EOF' > verify_setup.sh
#!/bin/bash

echo "=== Verifying ChainBridge Development Setup ==="
echo ""

# Check Rust
echo "Checking Rust installation..."
if command -v rustc &> /dev/null; then
    echo "✓ Rust: $(rustc --version)"
else
    echo "✗ Rust not found. Please install from https://rustup.rs"
fi

# Check Cargo
if command -v cargo &> /dev/null; then
    echo "✓ Cargo: $(cargo --version)"
else
    echo "✗ Cargo not found."
fi

# Check wasm32 target
echo ""
echo "Checking wasm32-unknown-unknown target..."
if rustup target list --installed | grep -q "wasm32-unknown-unknown"; then
    echo "✓ wasm32-unknown-unknown target installed"
else
    echo "✗ wasm32-unknown-unknown target not found. Run: rustup target add wasm32-unknown-unknown"
fi

# Check Soroban CLI
echo ""
echo "Checking Soroban CLI..."
if command -v soroban &> /dev/null; then
    echo "✓ Soroban CLI: $(soroban --version)"
else
    echo "✗ Soroban CLI not found. Run: cargo install soroban-cli --locked"
fi

# Check Stellar CLI
echo ""
echo "Checking Stellar CLI..."
if command -v stellar &> /dev/null; then
    echo "✓ Stellar CLI: $(stellar --version)"
else
    echo "✗ Stellar CLI not found. Run: cargo install stellar-cli --locked"
fi

echo ""
echo "=== Setup Verification Complete ==="
EOF

chmod +x verify_setup.sh
./verify_setup.sh
```

### Development Setup (Other Components)

#### Frontend

```bash
cd frontend
npm install
npm run dev
```

#### Backend

```bash
cd backend
pip install -r requirements.txt
python src/main.py
```

#### Relayer

```bash
cd relayer
cargo build --release
cargo run
```

## Coding Standards

### Rust (Smart Contracts)
- Follow Rust standard style (`cargo fmt`)
- Write tests for new functionality
- Document public functions
- Keep functions focused and small

### TypeScript/JavaScript (Frontend)
- Use TypeScript for type safety
- Follow ESLint rules and Prettier formatting
- Write meaningful component names
- Add comments for complex logic

#### Linting and Formatting

The frontend enforces strict linting and formatting standards. Before committing:

```bash
cd frontend

# Check for linting errors
npm run lint

# Auto-fix formatting issues
npm run format

# Verify no formatting issues remain
npm run format:check

# Type checking
npm run type-check
```

**ESLint Rules** (.eslintrc.json):
- No `var` statements (use `const` or `let`)
- Prefer `const` over `let`
- No unused variables (unless prefixed with `_`)
- No implicit type coercion (use `===` not `==`)
- No nested ternaries
- No console.log in production code (warn on other console methods)
- All React keys must be present and valid
- No param reassignment

**Prettier Configuration** (.prettierrc):
- Print width: 100 characters
- 2-space indentation
- Trailing commas (ES5 compatible)
- Double quotes for strings
- Semicolons required
- No trailing semicolons on object properties

#### Pre-commit Hooks (Recommended)

To automatically enforce linting and formatting before commits, install Husky:

```bash
cd frontend

# Install Husky
npm install husky lint-staged --save-dev

# Initialize Husky
npx husky install

# Add pre-commit hook
npx husky add .husky/pre-commit "npm run lint && npm run format:check"

# Add prepare script to package.json (if not present)
npm set-script prepare "husky install"
```

After setup, the following will run automatically before each commit:
- ESLint validation
- Prettier formatting check

If hooks fail, fix the issues and try committing again.

### Python (Backend)
- Follow PEP 8 style guide
- Type hints for function signatures
- Docstrings for classes and functions
- Write unit tests

## Commit Message Format

```
type(scope): subject

body (optional)

footer (optional)
```

Types:
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes
- `refactor`: Code refactoring
- `test`: Test additions or changes
- `chore`: Maintenance tasks

Examples:
```
feat(contracts): add flash loan functionality
fix(api): resolve loan calculation precision error
docs(readme): update installation instructions
```

## Areas Needing Help

Look for issues tagged with:
- `good-first-issue`: Great for newcomers
- `help-wanted`: Community assistance needed
- `bug`: Something isn't working
- `enhancement`: New feature or improvement

## Questions?

Feel free to ask questions in:
- GitHub Issues
- Pull Request discussions
- Community chat (coming soon)

Thank you for contributing to StellarLend!
