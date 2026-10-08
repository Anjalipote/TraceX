"""live_agent_and_investigation_schema

Revision ID: 4e1122334455
Revises: 3d22624ed3d3
Create Date: 2026-10-08 13:40:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = '4e1122334455'
down_revision: Union[str, Sequence[str], None] = '3d22624ed3d3'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    existing_tables = set(inspector.get_table_names())
    is_postgres = conn.dialect.name.startswith("postgres")

    # 1. Add missing columns to existing tables
    def safe_add_column(table_name: str, column: sa.Column):
        if table_name in existing_tables:
            cols = {c["name"] for c in inspector.get_columns(table_name)}
            if column.name not in cols:
                op.add_column(table_name, column)

    # evidence columns
    safe_add_column('evidence', sa.Column('is_live_agent', sa.Boolean(), nullable=True, server_default=sa.text('false')))
    safe_add_column('evidence', sa.Column('baseline_sha256', sa.String(length=64), nullable=True))
    safe_add_column('evidence', sa.Column('pdf_diff_data', sa.Text(), nullable=True))

    # cases columns
    safe_add_column('cases', sa.Column('is_real_investigation', sa.Boolean(), nullable=True, server_default=sa.text('false')))
    safe_add_column('cases', sa.Column('collection_type', sa.String(length=32), nullable=True, server_default='demo'))
    safe_add_column('cases', sa.Column('computer_id', sa.String(length=128), nullable=True))
    safe_add_column('cases', sa.Column('target_file_path', sa.String(length=512), nullable=True))
    safe_add_column('cases', sa.Column('authorization_status', sa.String(length=32), nullable=True, server_default='Pending'))

    # timeline_events columns
    safe_add_column('timeline_events', sa.Column('is_live_agent', sa.Boolean(), nullable=True, server_default=sa.text('false')))

    # findings columns
    safe_add_column('findings', sa.Column('is_live_agent', sa.Boolean(), nullable=True, server_default=sa.text('false')))

    # 2. Create agent_hosts table if missing
    if 'agent_hosts' not in existing_tables:
        op.create_table(
            'agent_hosts',
            sa.Column('id', sa.String(length=36), primary_key=True),
            sa.Column('hostname', sa.String(length=128), unique=True, nullable=False),
            sa.Column('ip_address', sa.String(length=64), nullable=True),
            sa.Column('os_info', sa.String(length=255), nullable=True),
            sa.Column('current_user', sa.String(length=128), nullable=True),
            sa.Column('agent_version', sa.String(length=64), server_default='v1.0.0', nullable=False),
            sa.Column('status', sa.String(length=32), server_default='Online', nullable=False),
            sa.Column('monitored_paths', sa.Text(), nullable=True),
            sa.Column('total_events', sa.Integer(), server_default='0', nullable=False),
            sa.Column('last_heartbeat', sa.DateTime(), nullable=False),
            sa.Column('created_at', sa.DateTime(), nullable=False),
        )
        op.create_index('ix_agent_hosts_hostname', 'agent_hosts', ['hostname'], unique=True)

    # 3. Create collection_jobs table if missing
    if 'collection_jobs' not in existing_tables:
        op.create_table(
            'collection_jobs',
            sa.Column('id', sa.String(), primary_key=True),
            sa.Column('investigation_id', sa.String(), nullable=False),
            sa.Column('computer_id', sa.String(), nullable=False),
            sa.Column('status', sa.String(), server_default='queued'),
            sa.Column('stage', sa.String(), server_default='queued'),
            sa.Column('progress_percent', sa.Integer(), server_default='0'),
            sa.Column('scope_config', sa.JSON(), nullable=True),
            sa.Column('artifacts_discovered', sa.Integer(), server_default='0'),
            sa.Column('artifacts_collected', sa.Integer(), server_default='0'),
            sa.Column('artifacts_status', sa.JSON(), nullable=True),
            sa.Column('error_message', sa.Text(), nullable=True),
            sa.Column('started_at', sa.DateTime(), nullable=True),
            sa.Column('completed_at', sa.DateTime(), nullable=True),
            sa.Column('created_at', sa.DateTime(), nullable=True),
        )
        op.create_index('ix_collection_jobs_investigation_id', 'collection_jobs', ['investigation_id'])
        op.create_index('ix_collection_jobs_computer_id', 'collection_jobs', ['computer_id'])

    # 4. Create forensic_events table if missing
    if 'forensic_events' not in existing_tables:
        op.create_table(
            'forensic_events',
            sa.Column('id', sa.String(), primary_key=True),
            sa.Column('investigation_id', sa.String(), nullable=False),
            sa.Column('job_id', sa.String(), nullable=True),
            sa.Column('timestamp', sa.DateTime(), nullable=False),
            sa.Column('timestamp_source', sa.String(), server_default='filesystem'),
            sa.Column('event_type', sa.String(), nullable=False),
            sa.Column('category', sa.String(), server_default='File System'),
            sa.Column('severity', sa.String(), server_default='Low'),
            sa.Column('computer_id', sa.String(), nullable=True),
            sa.Column('user', sa.String(), nullable=True),
            sa.Column('file_name', sa.String(), nullable=True),
            sa.Column('file_path', sa.String(), nullable=True),
            sa.Column('destination_file', sa.String(), nullable=True),
            sa.Column('file_size', sa.Integer(), nullable=True),
            sa.Column('file_hash', sa.String(), nullable=True),
            sa.Column('previous_hash', sa.String(), nullable=True),
            sa.Column('device_name', sa.String(), nullable=True),
            sa.Column('device_serial', sa.String(), nullable=True),
            sa.Column('mount_point', sa.String(), nullable=True),
            sa.Column('vendor_id', sa.String(), nullable=True),
            sa.Column('product_id', sa.String(), nullable=True),
            sa.Column('hardware_id', sa.String(), nullable=True),
            sa.Column('raw_artifact_source', sa.String(), nullable=True),
            sa.Column('details', sa.JSON(), nullable=True),
            sa.Column('is_suspicious', sa.Boolean(), server_default=sa.text('false')),
            sa.Column('suspicion_reason', sa.Text(), nullable=True),
            sa.Column('correlation_group_id', sa.String(), nullable=True),
            sa.Column('evidence_id', sa.String(), nullable=True),
            sa.Column('created_at', sa.DateTime(), nullable=True),
        )
        op.create_index('ix_forensic_events_investigation_id', 'forensic_events', ['investigation_id'])
        op.create_index('ix_forensic_events_timestamp', 'forensic_events', ['timestamp'])
        op.create_index('ix_forensic_events_event_type', 'forensic_events', ['event_type'])

    # 5. Create investigation_files table if missing
    if 'investigation_files' not in existing_tables:
        op.create_table(
            'investigation_files',
            sa.Column('id', sa.String(length=36), primary_key=True),
            sa.Column('investigation_id', sa.String(length=64), nullable=False),
            sa.Column('computer_id', sa.String(length=128), nullable=False),
            sa.Column('agent_id', sa.String(length=128), nullable=True),
            sa.Column('original_file_path', sa.String(length=512), nullable=False),
            sa.Column('file_name', sa.String(length=255), nullable=False),
            sa.Column('extension', sa.String(length=32), nullable=True),
            sa.Column('file_size', sa.BigInteger(), server_default='0', nullable=False),
            sa.Column('current_sha256', sa.String(length=64), nullable=False),
            sa.Column('baseline_sha256', sa.String(length=64), nullable=True),
            sa.Column('is_hash_diverged', sa.Boolean(), server_default=sa.text('false')),
            sa.Column('volume', sa.String(length=16), server_default='C:'),
            sa.Column('filesystem', sa.String(length=32), server_default='NTFS'),
            sa.Column('creation_time', sa.DateTime(), nullable=True),
            sa.Column('modification_time', sa.DateTime(), nullable=True),
            sa.Column('access_time', sa.DateTime(), nullable=True),
            sa.Column('is_pdf', sa.Boolean(), server_default=sa.text('false')),
            sa.Column('pdf_diff_available', sa.Boolean(), server_default=sa.text('false')),
            sa.Column('pdf_comparison_summary', sa.Text(), nullable=True),
            sa.Column('status', sa.String(length=32), server_default='Selected'),
            sa.Column('notes', sa.Text(), nullable=True),
            sa.Column('reference_storage_path', sa.String(length=512), nullable=True),
            sa.Column('created_at', sa.DateTime(), nullable=False),
            sa.Column('updated_at', sa.DateTime(), nullable=True),
        )
        op.create_index('ix_investigation_files_investigation_id', 'investigation_files', ['investigation_id'])
        op.create_index('ix_investigation_files_computer_id', 'investigation_files', ['computer_id'])

    # 6. Create file artifact auxiliary tables if missing
    aux_tables = [
        ('file_metadata', [
            sa.Column('id', sa.String(36), primary_key=True),
            sa.Column('investigation_id', sa.String(64), nullable=False, index=True),
            sa.Column('computer_id', sa.String(128), nullable=False, index=True),
            sa.Column('agent_id', sa.String(128), nullable=True),
            sa.Column('file_path', sa.String(512), nullable=False, index=True),
            sa.Column('file_name', sa.String(255), nullable=False, index=True),
            sa.Column('extension', sa.String(32), nullable=True),
            sa.Column('file_size', sa.BigInteger(), server_default='0', nullable=False),
            sa.Column('creation_time', sa.DateTime(), nullable=True),
            sa.Column('modification_time', sa.DateTime(), nullable=True),
            sa.Column('access_time', sa.DateTime(), nullable=True),
            sa.Column('volume', sa.String(32), server_default='C:'),
            sa.Column('filesystem', sa.String(32), server_default='NTFS'),
            sa.Column('file_attributes', sa.String(128), nullable=True),
            sa.Column('owner', sa.String(128), nullable=True),
            sa.Column('collected_at', sa.DateTime(), nullable=False),
        ]),
        ('file_hashes', [
            sa.Column('id', sa.String(36), primary_key=True),
            sa.Column('investigation_id', sa.String(64), nullable=False, index=True),
            sa.Column('computer_id', sa.String(128), nullable=False, index=True),
            sa.Column('agent_id', sa.String(128), nullable=True),
            sa.Column('file_path', sa.String(512), nullable=False, index=True),
            sa.Column('sha256', sa.String(64), nullable=False, index=True),
            sa.Column('md5', sa.String(32), nullable=True),
            sa.Column('file_size', sa.BigInteger(), server_default='0'),
            sa.Column('timestamp_calculated', sa.DateTime(), nullable=False),
            sa.Column('is_current', sa.Boolean(), server_default=sa.text('true'), nullable=False),
            sa.Column('calculated_by', sa.String(64), server_default='TraceX-Agent-Hasher'),
        ]),
        ('file_versions', [
            sa.Column('id', sa.String(36), primary_key=True),
            sa.Column('investigation_id', sa.String(64), nullable=False, index=True),
            sa.Column('computer_id', sa.String(128), nullable=False, index=True),
            sa.Column('file_path', sa.String(512), nullable=False, index=True),
            sa.Column('version_label', sa.String(64), server_default='Baseline'),
            sa.Column('sha256', sa.String(64), nullable=False),
            sa.Column('captured_at', sa.DateTime(), nullable=False),
            sa.Column('source', sa.String(128), server_default='Baseline Seizure'),
            sa.Column('content_diff_summary', sa.Text(), nullable=True),
            sa.Column('changed_pages_json', sa.JSON(), nullable=True),
        ]),
        ('windows_events', [
            sa.Column('id', sa.String(36), primary_key=True),
            sa.Column('investigation_id', sa.String(64), nullable=False, index=True),
            sa.Column('computer_id', sa.String(128), nullable=False, index=True),
            sa.Column('log_channel', sa.String(64), nullable=False, index=True),
            sa.Column('event_id', sa.String(16), nullable=False, index=True),
            sa.Column('timestamp', sa.DateTime(), nullable=False, index=True),
            sa.Column('user', sa.String(128), server_default='SYSTEM'),
            sa.Column('provider_name', sa.String(128), nullable=True),
            sa.Column('task_category', sa.String(128), nullable=True),
            sa.Column('description', sa.Text(), nullable=True),
            sa.Column('raw_xml_text', sa.Text(), nullable=True),
        ]),
        ('usn_events', [
            sa.Column('id', sa.String(36), primary_key=True),
            sa.Column('investigation_id', sa.String(64), nullable=False, index=True),
            sa.Column('computer_id', sa.String(128), nullable=False, index=True),
            sa.Column('volume', sa.String(16), server_default='C:'),
            sa.Column('usn', sa.String(32), nullable=False, index=True),
            sa.Column('file_ref', sa.String(64), nullable=False, index=True),
            sa.Column('parent_file_ref', sa.String(64), nullable=True),
            sa.Column('reason_code', sa.String(32), nullable=True),
            sa.Column('change_reason', sa.String(128), nullable=False),
            sa.Column('timestamp', sa.DateTime(), nullable=True, index=True),
            sa.Column('file_name', sa.String(255), nullable=False, index=True),
            sa.Column('file_path', sa.String(512), nullable=True),
        ]),
        ('device_events', [
            sa.Column('id', sa.String(36), primary_key=True),
            sa.Column('investigation_id', sa.String(64), nullable=False, index=True),
            sa.Column('computer_id', sa.String(128), nullable=False, index=True),
            sa.Column('device_name', sa.String(255), nullable=False),
            sa.Column('serial_number', sa.String(128), nullable=True, index=True),
            sa.Column('hardware_id', sa.String(255), nullable=True),
            sa.Column('vendor_id', sa.String(64), nullable=True),
            sa.Column('product_id', sa.String(64), nullable=True),
            sa.Column('mount_point', sa.String(32), nullable=True),
            sa.Column('event_type', sa.String(64), server_default='ATTACHED'),
            sa.Column('timestamp', sa.DateTime(), nullable=False, index=True),
            sa.Column('source', sa.String(128), server_default='HKLM\\SYSTEM\\CurrentControlSet\\Enum\\USBSTOR'),
        ]),
    ]
    for tbl_name, tbl_cols in aux_tables:
        if tbl_name not in existing_tables:
            op.create_table(tbl_name, *tbl_cols)


def downgrade() -> None:
    pass
