# Dispute Resolution

ChainBridge includes a manual dispute workflow for swaps that cannot be resolved automatically.

## Goals

- Let users report problematic swaps with structured evidence.
- Provide admins with an auditable review and resolution workflow.
- Support refund overrides in exceptional cases.
- Keep the process transparent with immutable action logs.

## User Workflow

1. User submits a dispute for a specific swap via `POST /api/v1/disputes`.
2. User includes:
- `swap_id`
- `submitted_by`
- `category` (`timeout`, `incorrect_amount`, `counterparty_unresponsive`, `proof_failure`, `chain_reorg`, `other`)
- `reason`
- optional `evidence[]`
3. User can append additional evidence via `POST /api/v1/disputes/{id}/evidence`.
4. User can view current status and full action log via:
- `GET /api/v1/disputes`
- `GET /api/v1/disputes/{id}`

## Admin Workflow

1. Admin lists disputes via `GET /api/v1/admin/disputes`.
2. Admin starts review via `POST /api/v1/admin/disputes/{id}/review`.
3. Admin resolves via `POST /api/v1/admin/disputes/{id}/resolve` with:
- `status`: `resolved` | `rejected` | `refunded`
- `resolution_action`: `approve` | `reject` | `refund_override` | `manual_settlement`
- `resolution`
- optional `admin_notes`
- optional `refund_override` and `refund_amount`

## Logging and Transparency

Every dispute stores an append-only `action_log` containing:

- timestamp
- action name
- actor
- details payload

Typical actions:

- `dispute.submitted`
- `dispute.evidence_added`
- `dispute.review_started`
- `dispute.resolved`

This enables post-mortem analysis, compliance checks, and user-visible accountability.

## Dispute Statistics

`GET /api/v1/admin/disputes/stats` returns:

- total
- submitted
- in_review
- resolved
- rejected
- refunded

These metrics power admin dashboards and operational monitoring.

## Refund Override Safety

Refund override is admin-only and must include explicit resolution metadata.
When applied, the dispute and swap records are updated, and the action is logged.

Recommended operational controls:

- Restrict override permission to a limited admin group.
- Require clear rationale in `resolution` and `admin_notes`.
- Periodically audit all refunded disputes.
