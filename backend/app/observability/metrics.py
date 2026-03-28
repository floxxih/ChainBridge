"""Prometheus metrics registry and helpers for ChainBridge observability."""

from __future__ import annotations

from typing import Mapping

from prometheus_client import Counter, Gauge, Histogram

HTTP_REQUESTS_TOTAL = Counter(
    "chainbridge_http_requests_total",
    "Total number of HTTP requests handled by the API",
    ["method", "route", "status"],
)

HTTP_REQUEST_DURATION_SECONDS = Histogram(
    "chainbridge_http_request_duration_seconds",
    "HTTP request duration in seconds",
    ["method", "route", "status"],
    buckets=(0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1.0, 2.0, 5.0, 10.0),
)

DB_QUERY_TOTAL = Counter(
    "chainbridge_db_queries_total",
    "Total number of database queries executed",
    ["statement_type"],
)

DB_QUERY_DURATION_SECONDS = Histogram(
    "chainbridge_db_query_duration_seconds",
    "Database query execution duration in seconds",
    ["statement_type"],
    buckets=(0.001, 0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1.0, 2.0, 5.0),
)

DB_SLOW_QUERIES_TOTAL = Counter(
    "chainbridge_db_slow_queries_total",
    "Total number of database queries that breached the slow-query threshold",
    ["statement_type"],
)

SWAP_COMPLETION_SECONDS = Histogram(
    "chainbridge_swap_completion_seconds",
    "End-to-end swap completion time from creation to execution",
    ["chain", "state"],
    buckets=(1, 5, 10, 30, 60, 120, 300, 600, 1800, 3600, 7200, 14400, 28800),
)

INDEXER_UP = Gauge(
    "chainbridge_indexer_up",
    "Whether a chain indexer is currently running (1 = up, 0 = down)",
    ["chain"],
)

INDEXER_BLOCKS_BEHIND = Gauge(
    "chainbridge_indexer_blocks_behind",
    "How many blocks/ledgers the indexer is behind the chain tip",
    ["chain"],
)

INDEXER_LAST_SYNCED_BLOCK = Gauge(
    "chainbridge_indexer_last_synced_block",
    "Last block/ledger indexed",
    ["chain"],
)

INDEXER_LATEST_CHAIN_BLOCK = Gauge(
    "chainbridge_indexer_latest_chain_block",
    "Latest known block/ledger on the chain",
    ["chain"],
)

INDEXER_EVENTS_PROCESSED = Gauge(
    "chainbridge_indexer_events_processed_total",
    "Number of events processed by the indexer",
    ["chain"],
)

SLOW_QUERY_THRESHOLD_SECONDS = 0.25


def normalize_statement_type(statement: str) -> str:
    """Collapse SQL statements into low-cardinality metric labels."""
    if not statement:
        return "UNKNOWN"
    token = statement.strip().split(" ", 1)[0].upper()
    return token or "UNKNOWN"


def observe_db_query(duration_seconds: float, statement: str) -> None:
    statement_type = normalize_statement_type(statement)
    DB_QUERY_TOTAL.labels(statement_type=statement_type).inc()
    DB_QUERY_DURATION_SECONDS.labels(statement_type=statement_type).observe(duration_seconds)
    if duration_seconds >= SLOW_QUERY_THRESHOLD_SECONDS:
        DB_SLOW_QUERIES_TOTAL.labels(statement_type=statement_type).inc()


def observe_swap_completion(chain: str, state: str, duration_seconds: float) -> None:
    SWAP_COMPLETION_SECONDS.labels(chain=(chain or "unknown"), state=(state or "unknown")).observe(
        max(0.0, duration_seconds)
    )


def update_indexer_metrics(statuses: Mapping[str, Mapping[str, object]]) -> None:
    """Update chain sync gauges from the indexer status snapshot."""
    for chain, status in statuses.items():
        INDEXER_UP.labels(chain=chain).set(1 if status.get("is_running") else 0)
        INDEXER_BLOCKS_BEHIND.labels(chain=chain).set(float(status.get("blocks_behind") or 0))
        INDEXER_LAST_SYNCED_BLOCK.labels(chain=chain).set(
            float(status.get("last_synced_block") or 0)
        )
        INDEXER_LATEST_CHAIN_BLOCK.labels(chain=chain).set(
            float(status.get("latest_chain_block") or 0)
        )
        INDEXER_EVENTS_PROCESSED.labels(chain=chain).set(
            float(status.get("events_processed") or 0)
        )
