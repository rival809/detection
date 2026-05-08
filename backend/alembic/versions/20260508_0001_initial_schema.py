"""initial schema

Revision ID: 0001
Revises:
Create Date: 2026-05-08
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID, JSONB
import uuid

revision = "0001"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "users",
        sa.Column("id", UUID(as_uuid=True), primary_key=True, default=uuid.uuid4),
        sa.Column("email", sa.String(), nullable=False, unique=True),
        sa.Column("hashed_password", sa.String(), nullable=False),
        sa.Column("is_active", sa.Boolean(), server_default="true"),
        sa.Column("created_at", sa.DateTime(), server_default=sa.func.now()),
    )
    op.create_index("ix_users_email", "users", ["email"])

    op.create_table(
        "videos",
        sa.Column("id", UUID(as_uuid=True), primary_key=True, default=uuid.uuid4),
        sa.Column("user_id", UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("original_filename", sa.String(), nullable=False),
        sa.Column("storage_path", sa.String(), nullable=False),
        sa.Column(
            "status",
            sa.Enum("PENDING", "PROCESSING", "COMPLETED", "FAILED", name="videostatus"),
            server_default="PENDING",
            nullable=False,
        ),
        sa.Column("error_message", sa.Text(), nullable=True),
        sa.Column("total_plates", sa.Integer(), server_default="0"),
        sa.Column("uploaded_at", sa.DateTime(), server_default=sa.func.now()),
        sa.Column("processed_at", sa.DateTime(), nullable=True),
    )

    op.create_table(
        "detections",
        sa.Column("id", UUID(as_uuid=True), primary_key=True, default=uuid.uuid4),
        sa.Column("video_id", UUID(as_uuid=True), sa.ForeignKey("videos.id"), nullable=False),
        sa.Column("plate_number", sa.String(), nullable=False),
        sa.Column("confidence", sa.Float(), nullable=False),
        sa.Column("image_crop_url", sa.String(), nullable=True),
        sa.Column("tax_info_json", JSONB(), nullable=True),
        sa.Column(
            "tax_status",
            sa.Enum("ACTIVE", "EXPIRED", "NOT_FOUND", "ERROR", name="taxstatus"),
            server_default="ERROR",
        ),
        sa.Column("detected_at", sa.DateTime(), server_default=sa.func.now()),
    )
    op.create_index("ix_detections_plate_number", "detections", ["plate_number"])


def downgrade() -> None:
    op.drop_table("detections")
    op.drop_table("videos")
    op.drop_table("users")
    op.execute("DROP TYPE IF EXISTS videostatus")
    op.execute("DROP TYPE IF EXISTS taxstatus")
