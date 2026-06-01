"""Add amendment_count and amendment_log to swap_orders."""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = "20260601_0005"
down_revision: Union[str, None] = "20260530_0004"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "swap_orders",
        sa.Column(
            "amendment_count",
            sa.Integer(),
            nullable=False,
            server_default="0",
        ),
    )
    op.add_column(
        "swap_orders",
        sa.Column(
            "amendment_log",
            postgresql.JSONB(astext_type=sa.Text()),
            nullable=False,
            server_default="[]",
        ),
    )


def downgrade() -> None:
    op.drop_column("swap_orders", "amendment_log")
    op.drop_column("swap_orders", "amendment_count")
