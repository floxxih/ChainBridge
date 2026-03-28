# Roadmap Foundations

This document describes the first integrated implementation pass for the following roadmap issues:

- Issue #80: Governance DAO structure
- Issue #79: Liquidity pool integration
- Issue #78: Advanced order types
- Issue #77: Swap sharing and referral system

## Scope

The current branch adds protocol-level foundations instead of a fully productionized DAO, AMM, referral engine, and advanced matching stack. The goal is to establish shared primitives across the smart contract and frontend so later issue-specific work can iterate on a stable interface.

## Governance

- `GovernanceConfig` stores the DAO token symbol, quorum settings, proposal threshold, voting window, and execution timelock.
- `GovernanceProposal` tracks proposer, proposal actions, vote counts, voting deadline, and execution readiness.
- Delegation support is modeled with `DelegationRecord`.
- Contract methods now support proposal creation, voting, delegation, retrieval, and execution.

## Liquidity Pools

- `LiquidityPool` models a two-asset pool with reserves, LP supply, fee tier, and reward rate.
- `LiquidityPosition` tracks LP token balances and accrued rewards per provider.
- Contract methods now support pool creation, liquidity deposits, pool retrieval, position retrieval, and quote calculation for direct pool routes.

## Advanced Orders

- `SwapOrder` now includes:
  - `order_type`
  - `execution`
  - `amendment_count`
- `OrderExecutionCondition` provides a minimal structure for trigger pricing, time-based execution, and partial-fill permissions.
- Contract methods now support advanced order creation and amendments.

## Referrals and Sharing

- `ReferralRecord` tracks referral-code ownership, usage count, last swap usage, and rewards earned.
- Contract methods now support referral-code registration and referral usage accounting.
- The frontend exposes these capabilities from the swap flow and a dedicated protocol workspace.

## Frontend Surfaces

- `/protocol` consolidates governance, liquidity, advanced orders, and referral analytics.
- `/swap` now exposes advanced execution mode selection and links into governance/liquidity/referral workflows.
- The main navigation and landing page highlight the new protocol capabilities.

## Follow-Up Work

- Replace mock frontend data with API-backed state.
- Harden governance voting power calculations and delegation accounting.
- Support multi-hop and best-price routing across several pools plus the order book.
- Expand referral attribution into signed share links, QR payloads, and payout settlement.
- Add dedicated unit and integration tests for edge cases around execution conditions and quorum math.
