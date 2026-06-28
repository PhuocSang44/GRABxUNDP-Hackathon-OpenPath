"""create accessibility checkpoints

Revision ID: c9f2a1b3d8e4
Revises: 87a4a7507aa3
Create Date: 2026-06-28 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = 'c9f2a1b3d8e4'
down_revision: Union[str, Sequence[str], None] = '680a1de537f7'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'accessibility_checkpoints',
        sa.Column('id', sa.String(), nullable=False),
        sa.Column('cache_key', sa.String(), nullable=False),
        sa.Column('lat', sa.Float(), nullable=False),
        sa.Column('lng', sa.Float(), nullable=False),
        sa.Column('accessibility', sa.String(), nullable=False),
        sa.Column('sidewalk', sa.Boolean(), nullable=True),
        sa.Column('width', sa.String(), nullable=True),
        sa.Column('surface', sa.String(), nullable=True),
        sa.Column('curb_ramp', sa.Boolean(), nullable=True),
        sa.Column('obstacles', sa.JSON(), nullable=True),
        sa.Column('confidence', sa.Float(), nullable=True),
        sa.Column('street_view_url', sa.String(), nullable=True),
        sa.Column('analyzed_at', sa.DateTime(timezone=True), server_default=sa.text('now()')),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()')),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('cache_key', name='uq_accessibility_checkpoints_cache_key'),
    )
    op.create_index(
        'ix_accessibility_checkpoints_cache_key',
        'accessibility_checkpoints',
        ['cache_key'],
    )


def downgrade() -> None:
    op.drop_index('ix_accessibility_checkpoints_cache_key', 'accessibility_checkpoints')
    op.drop_table('accessibility_checkpoints')
