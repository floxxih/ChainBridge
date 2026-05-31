"""Add database indexes for swap filters (#445)

Revision ID: 20260328_0004
Revises: 20260328_0003
Create Date: 2026-05-31 00:00:00.000000

"""

from typing import Sequence, Union

from alembic import op

revision: str = "20260328_0004"
down_revision: Union[str, None] = "20260328_0003"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_index(
        "ix_cross_chain_swaps_created_at",
        "cross_chain_swaps",
        ["created_at"],
        unique=False,
    )
    op.create_index(
        "ix_cross_chain_swaps_other_chain_state_created_at",
        "cross_chain_swaps",
        ["other_chain", "state", "created_at"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index("ix_cross_chain_swaps_other_chain_state_created_at", table_name="cross_chain_swaps")
    op.drop_index("ix_cross_chain_swaps_created_at", table_name="cross_chain_swaps")
