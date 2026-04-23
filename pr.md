## Pull Request Description

### Issues Addressed:
- Resolves #17: Implement Cross-Chain Swap Coordinator. Setup a `SwapState` state machine for CrossChainSwap with state handling upon swap completion.
- Resolves #18: Add Multi-Signature HTLC Support. Enhanced HTLC type to allow `MultiSigConfig` which tracks designated signers, thresholds, and signatures, enabling `sign_htlc` feature for multi-sig validation on claims.
- Resolves #19: Implement Emergency Pause and Admin Functions. Implemented `pause` and `unpause` logic, effectively establishing an emergency switch validated by the Admin and checked on crucial protocol methods.
- Resolves #20: Implement Protocol Fee Collection. Initiated Fee structures in Storage (`FeeRate`, `FeeTreasury`) allowing `set_fee_rate` and `set_fee_treasury` updates managed by Admins, checking in swap resolutions.
- Resolves #129: [Frontend] Implement swap review and confirmation step. Built `SwapReviewSummary.tsx`.
- Resolves #118: [Frontend] Implement top navigation with wallet status indicators. Integrated multi-chain indicators inside `Navbar.tsx`.
- Resolves #76: Implement User Account System. Added `User` model features to backend, `users.py` route for preferences/notifications, test implementations and built the `Dashboard` on the frontend.
- Resolves #117: [Frontend] Build reusable button, input, and select component library. Implemented composable and accessible form primitives.

### Summary of Changes 
- Updated `types.rs` with new enumeration, types and fields handling advanced configurations (MultiSigConfig, SwapState).
- Modified `storage.rs` to persist Fee configurations and contract Pause status.
- Introduced pause constraints and multi-signature verifications in `htlc.rs` on functions `create_htlc`, `claim_htlc`, `refund_htlc`. Added `sign_htlc` endpoint.
- Introduced pause constraints and proper `SwapState` instantiation within `order.rs`.
- Included Pause checks and mocked fee transfers on Swap resolution step within `swap.rs`.
- Reflected parameter and structure modifications back in `lib.rs` and added endpoints for new administration roles and HTLC signatures.
- Re-styled frontend navigation layout to display independent pill-bars for chain indicators.
- Created standalone pre-execution module view layout to enforce manual confirmations before transactions.
- Upgraded the central User backend entities to accommodate theme/network preferences and notification settings.
