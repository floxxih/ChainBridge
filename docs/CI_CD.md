# ChainBridge CI/CD Pipeline

This document describes the automated CI/CD pipeline for ChainBridge using GitHub Actions.

## Overview

The CI/CD pipeline ensures code quality, security, and automated deployments:

- **Continuous Integration**: Automated testing on every push/PR
- **Security Scanning**: Vulnerability detection and dependency audits
- **Code Coverage**: Coverage reporting for all components
- **Automated Releases**: Build and publish on version tags
- **Deployments**: Testnet deployment workflows

## Workflows

### 1. CI Workflow (`.github/workflows/ci.yml`)

Main continuous integration workflow that runs on every push and pull request.

#### Jobs:

| Job | Description | Tools |
|-----|-------------|-------|
| `smart-contracts` | Build and test Rust smart contracts | Rust, Clippy, rustfmt |
| `backend` | Lint and test Python backend | Black, flake8, mypy, pytest |
| `frontend` | Build and test Next.js frontend | ESLint, TypeScript, npm |
| `relayer` | Build and test Rust relayer | Rust, Clippy, rustfmt |
| `integration-tests` | Run integration test suite | Rust, cargo test |
| `code-quality` | CodeQL analysis | CodeQL |
| `coverage-report` | Generate coverage summary | - |

#### Smart Contracts Job:
```yaml
- Check formatting (cargo fmt)
- Run clippy linter
- Build for wasm32-unknown-unknown
- Run tests
- Upload WASM artifact
```

#### Backend Job:
```yaml
- Format check (Black)
- Lint (flake8)
- Type check (mypy)
- Run pytest with coverage
- Upload coverage report
```

#### Frontend Job:
```yaml
- Format check (Prettier)
- Lint (ESLint)
- Type check (TypeScript)
- Build (Next.js)
- Upload build artifact
```

### 2. Security Workflow (`.github/workflows/security.yml`)

Comprehensive security scanning for vulnerabilities.

#### Jobs:

| Job | Description | Tool |
|-----|-------------|------|
| `codeql` | Static analysis for security issues | CodeQL |
| `dependency-review` | Review dependency changes | Dependency Review |
| `cargo-audit` | Rust dependency vulnerabilities | cargo-audit |
| `npm-audit` | Node.js dependency vulnerabilities | npm audit |
| `python-safety` | Python dependency vulnerabilities | Safety |
| `secrets-scan` | Detect committed secrets | TruffleHog |

#### Schedule:
Runs weekly on Monday at 02:00 UTC for proactive security monitoring.

### 3. Coverage Workflow (`.github/workflows/coverage.yml`)

Generate and upload code coverage reports.

#### Jobs:

| Job | Description | Tool |
|-----|-------------|------|
| `rust-coverage` | Rust smart contract coverage | cargo-llvm-cov |
| `python-coverage` | Backend coverage | pytest-cov |
| `frontend-coverage` | Frontend coverage | Jest |

Coverage reports are uploaded to [Codecov](https://codecov.io).

### 4. Deploy Workflow (`.github/workflows/deploy.yml`)

Deploy smart contracts to testnet.

#### Triggers:
- Push to main/master (paths: smartcontract/**)
- Manual workflow dispatch

#### Jobs:
1. **Build Contract**: Compile WASM
2. **Deploy Contract**: Deploy to testnet (manual)
3. **Notify Deployment**: Status reporting

#### Manual Deployment:
1. Go to Actions → Deploy to Testnet
2. Select environment (testnet/futurenet)
3. Run workflow

### 5. Release Workflow (`.github/workflows/release.yml`)

Automated release builds on version tags.

#### Triggers:
- Push tags matching `v*.*.*`

#### Jobs:
1. **Create Release**: GitHub release with notes
2. **Build WASM**: Smart contract artifact
3. **Build Relayer**: Cross-platform binaries
4. **Build Frontend**: Production build

#### Supported Platforms:
- Linux (x86_64)
- macOS (x86_64)
- Windows (x86_64)

## Dependabot

Automated dependency updates via `.github/dependabot.yml`.

### Configuration:

| Ecosystem | Directory | Schedule |
|-----------|-----------|----------|
| Cargo | /smartcontract | Weekly (Mon) |
| Cargo | /relayer | Weekly (Mon) |
| Cargo | /tests | Weekly (Mon) |
| Pip | /backend | Weekly (Mon) |
| NPM | /frontend | Weekly (Mon) |
| GitHub Actions | / | Weekly (Mon) |

### Settings:
- 5 PRs per ecosystem max
- Reviewers: ChaoLing140
- Labels: dependencies, ecosystem
- Commit prefix: deps(scope)

## Branch Protection

Recommended branch protection rules for main/master:

### Required Status Checks:
- ✅ Smart Contracts
- ✅ Backend
- ✅ Frontend
- ✅ Relayer
- ✅ Integration Tests
- ✅ Security Scan

### Settings:
- Require branches to be up to date
- Require conversation resolution
- Require signed commits (optional)

## CI/CD Pipeline Flow

```
┌─────────────────────────────────────────────────────────────┐
│                     Push / Pull Request                      │
└────────────────────────────┬────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────┐
│                       CI Workflow                            │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐   │
│  │ Smart    │  │ Backend  │  │ Frontend │  │ Relayer  │   │
│  │Contracts │  │ (Python) │  │  (Next)  │  │  (Rust)  │   │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘   │
│       │             │             │             │          │
│       └─────────────┴─────────────┴─────────────┘          │
│                           │                                  │
│                           ▼                                  │
│                ┌──────────────────┐                         │
│                │ Integration Tests│                         │
│                └──────────────────┘                         │
└────────────────────────────┬────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────┐
│                    Security Workflow                         │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐   │
│  │ CodeQL   │  │ Cargo    │  │  NPM     │  │ Python   │   │
│  │ Analysis │  │  Audit   │  │  Audit   │  │  Safety  │   │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘   │
└────────────────────────────┬────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────┐
│                   Coverage Reports                           │
│              (Uploaded to Codecov)                          │
└────────────────────────────┬────────────────────────────────┘
                             │
                             ▼
                      ┌──────────┐
                      │  Merge   │
                      │  Ready   │
                      └──────────┘
```

## Running Tests Locally

### Smart Contracts:
```bash
cd smartcontract
cargo fmt --all -- --check
cargo clippy --all-targets --all-features -- -D warnings
cargo test --all-features
cargo build --target wasm32-unknown-unknown --release
```

### Backend:
```bash
cd backend
black --check .
flake8 .
mypy . --ignore-missing-imports
pytest --cov=app --cov-report=html
```

### Frontend:
```bash
cd frontend
npm run lint
npm run type-check
npm run build
```

### Relayer:
```bash
cd relayer
cargo fmt --all -- --check
cargo clippy --all-targets --all-features -- -D warnings
cargo test
cargo build --release
```

## Troubleshooting

### CI Fails on Formatting:
```bash
# Auto-fix formatting
cargo fmt --all
black .
npm run format
```

### CI Fails on Linting:
```bash
# Check specific errors
cargo clippy --all-targets --all-features
flake8 backend/ --show-source
npm run lint
```

### CI Fails on Tests:
```bash
# Run tests locally
cargo test --all-features
pytest -v
npm test
```

### Coverage Upload Fails:
- Check Codecov token is configured
- Verify coverage files exist
- Check file paths in workflow

### Security Scan Fails:
```bash
# Run security checks locally
cargo audit
npm audit
safety check -r backend/requirements.txt
```

## Security Best Practices

1. **Never commit secrets** - Use GitHub Secrets for sensitive data
2. **Review Dependabot PRs** - Keep dependencies updated
3. **Monitor security alerts** - Address vulnerabilities promptly
4. **Use branch protection** - Require status checks before merging
5. **Enable Dependabot** - Automated security updates

## Configuration Files

| File | Purpose |
|------|---------|
| `.github/workflows/ci.yml` | Main CI pipeline |
| `.github/workflows/security.yml` | Security scanning |
| `.github/workflows/coverage.yml` | Code coverage |
| `.github/workflows/deploy.yml` | Deployment workflow |
| `.github/workflows/release.yml` | Release automation |
| `.github/dependabot.yml` | Dependency updates |

## Metrics and Monitoring

### Key Metrics:
- Build success rate
- Test pass rate
- Code coverage percentage
- Security vulnerability count
- Dependency freshness

### Monitoring:
- GitHub Actions dashboard
- Codecov coverage reports
- Dependabot alerts
- Security tab in GitHub

## Contributing

When contributing to ChainBridge:

1. Ensure all CI checks pass before requesting review
2. Maintain or improve code coverage
3. Address security findings promptly
4. Keep dependencies updated
5. Follow branch protection rules

## Support

For CI/CD issues:
- Check workflow logs in Actions tab
- Review this documentation
- Open an issue with `ci-cd` label
