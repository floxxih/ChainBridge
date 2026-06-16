"""Add trigger_price and valid_from to swap_orders for advanced order conditions."""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "20260601_0006"
down_revision: Union[str, None] = "20260601_0005"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "swap_orders",
        sa.Column("trigger_price", sa.Numeric(precision=36, scale=18), nullable=True),
    )
    op.add_column(
        "swap_orders",
        sa.Column("valid_from", sa.BigInteger(), nullable=True),
    )
    op.create_index(
        op.f("ix_swap_orders_valid_from"), "swap_orders", ["valid_from"], unique=False
    )


def downgrade() -> None:
    op.drop_index(op.f("ix_swap_orders_valid_from"), table_name="swap_orders")
    op.drop_column("swap_orders", "valid_from")
    op.drop_column("swap_orders", "trigger_price")
