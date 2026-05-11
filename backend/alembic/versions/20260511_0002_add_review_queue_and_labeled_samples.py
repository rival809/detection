"""add review_queue and labeled_samples

Revision ID: 0002
Revises: 0001
Create Date: 2026-05-11
"""
import uuid

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects.postgresql import UUID

revision = "0002"
down_revision = "0001"
branch_labels = None
depends_on = None

review_queue_status = sa.Enum("PENDING", "APPROVED", "CORRECTED", "REJECTED", name="reviewqueuestatus")


def upgrade() -> None:
    review_queue_status.create(op.get_bind(), checkfirst=True)

    op.create_table(
        "review_queue",
        sa.Column("id", UUID(as_uuid=True), primary_key=True, default=uuid.uuid4),
        sa.Column("video_id", UUID(as_uuid=True), sa.ForeignKey("videos.id"), nullable=False),
        sa.Column("raw_plate", sa.String(), nullable=False),
        sa.Column("confidence", sa.Float(), nullable=False),
        sa.Column("image_crop_url", sa.String(), nullable=True),
        sa.Column("status", review_queue_status, nullable=False, server_default="PENDING"),
        sa.Column("created_at", sa.DateTime(), server_default=sa.func.now()),
    )
    op.create_index("ix_review_queue_status", "review_queue", ["status"])

    op.create_table(
        "labeled_samples",
        sa.Column("id", UUID(as_uuid=True), primary_key=True, default=uuid.uuid4),
        sa.Column("review_queue_id", UUID(as_uuid=True), sa.ForeignKey("review_queue.id"), nullable=False),
        sa.Column("original_plate", sa.String(), nullable=False),
        sa.Column("corrected_plate", sa.String(), nullable=True),
        sa.Column("reviewed_by", UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("reviewed_at", sa.DateTime(), server_default=sa.func.now()),
        sa.Column("image_crop_url", sa.String(), nullable=True),
    )


def downgrade() -> None:
    op.drop_table("labeled_samples")
    op.drop_table("review_queue")
    review_queue_status.drop(op.get_bind(), checkfirst=True)
