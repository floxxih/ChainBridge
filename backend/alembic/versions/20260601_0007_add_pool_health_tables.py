"""Add liquidity_pool_snapshots and liquidity_pool_health tables for reserve drift monitoring (#507)."""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = "20260601_0007"
down_revision: Union[str, None] = "20260601_0006"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "liquidity_pool_snapshots",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            primary_key=True,
            server_default=sa.text("gen_random_uuid()"),
        ),
        sa.Column("pool_id", sa.BigInteger(), nullable=False),
        sa.Column("asset_a", sa.String(), nullable=False),
        sa.Column("asset_b", sa.String(), nullable=False),
        sa.Column("reserve_a", sa.BigInteger(), nullable=False),
        sa.Column("reserve_b", sa.BigInteger(), nullable=False),
        sa.Column("ratio", sa.Float(), nullable=True),
        sa.Column(
            "captured_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            onupdate=sa.text("now()"),
        ),
    )
    op.create_index("ix_liquidity_pool_snapshots_pool_id", "liquidity_pool_snapshots", ["pool_id"])
    op.create_index(
        "ix_liquidity_pool_snapshots_captured_at", "liquidity_pool_snapshots", ["captured_at"]
    )
    op.create_index(
        "ix_pool_snapshots_pool_captured",
        "liquidity_pool_snapshots",
        ["pool_id", "captured_at"],
    )

    op.create_table(
        "liquidity_pool_health",
        sa.Column("pool_id", sa.BigInteger(), primary_key=True),
        sa.Column("asset_a", sa.String(), nullable=False),
        sa.Column("asset_b", sa.String(), nullable=False),
        sa.Column("reserve_a", sa.BigInteger(), nullable=False),
        sa.Column("reserve_b", sa.BigInteger(), nullable=False),
        sa.Column("ratio", sa.Float(), nullable=True),
        sa.Column("ratio_drift_pct", sa.Float(), nullable=True),
        sa.Column("status", sa.String(), nullable=False, server_default="healthy"),
        sa.Column(
            "last_checked_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
    )


def downgrade() -> None:
    op.drop_table("liquidity_pool_health")
    op.drop_index("ix_pool_snapshots_pool_captured", table_name="liquidity_pool_snapshots")
    op.drop_index("ix_liquidity_pool_snapshots_captured_at", table_name="liquidity_pool_snapshots")
    op.drop_index("ix_liquidity_pool_snapshots_pool_id", table_name="liquidity_pool_snapshots")
    op.drop_table("liquidity_pool_snapshots")
