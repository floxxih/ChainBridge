"""Add asset metadata table

Revision ID: 20260328_0002
Revises: 20260328_0001
Create Date: 2026-03-28 00:00:00.000000

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = "20260328_0002"
down_revision: Union[str, None] = "20260328_0001"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "assets",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("chain", sa.String(), nullable=False),
        sa.Column("address", sa.String(), nullable=True),
        sa.Column("symbol", sa.String(), nullable=False),
        sa.Column("name", sa.String(), nullable=False),
        sa.Column("decimals", sa.Integer(), nullable=True),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("icon_url", sa.String(), nullable=True),
        sa.Column("website_url", sa.String(), nullable=True),
        sa.Column("is_verified", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("tags", sa.String(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=True),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=True,
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_assets_chain"), "assets", ["chain"], unique=False)
    op.create_index(op.f("ix_assets_address"), "assets", ["address"], unique=False)
    op.create_index(op.f("ix_assets_symbol"), "assets", ["symbol"], unique=False)
    op.create_index(op.f("ix_assets_is_verified"), "assets", ["is_verified"], unique=False)
    op.create_index(op.f("ix_assets_is_active"), "assets", ["is_active"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_assets_is_active"), table_name="assets")
    op.drop_index(op.f("ix_assets_is_verified"), table_name="assets")
    op.drop_index(op.f("ix_assets_symbol"), table_name="assets")
    op.drop_index(op.f("ix_assets_address"), table_name="assets")
    op.drop_index(op.f("ix_assets_chain"), table_name="assets")
    op.drop_table("assets")