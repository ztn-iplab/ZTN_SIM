"""Add PendingTransaction model

Revision ID: 19961ef7425e
Revises: 885568c6e4bb
Create Date: 2025-03-31 16:48:45.510855

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '19961ef7425e'
down_revision = '885568c6e4bb'
branch_labels = None
depends_on = None


def upgrade():
    # ### commands auto generated by Alembic - please adjust! ###
    op.create_table('pending_transactions',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('user_id', sa.Integer(), nullable=False),
    sa.Column('transaction_data', sa.Text(), nullable=False),
    sa.Column('transaction_type', sa.String(length=20), nullable=False),
    sa.Column('created_at', sa.DateTime(), nullable=True),
    sa.Column('expires_at', sa.DateTime(), nullable=False),
    sa.Column('is_used', sa.Boolean(), nullable=True),
    sa.ForeignKeyConstraint(['user_id'], ['users.id'], ),
    sa.PrimaryKeyConstraint('id')
    )
    # ### end Alembic commands ###


def downgrade():
    # ### commands auto generated by Alembic - please adjust! ###
    op.drop_table('pending_transactions')
    # ### end Alembic commands ###
