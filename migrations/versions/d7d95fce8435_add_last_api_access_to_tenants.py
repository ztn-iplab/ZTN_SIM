"""Add last_api_access to tenants

Revision ID: d7d95fce8435
Revises: 3eb516621981
Create Date: 2025-06-23 10:11:11.909719

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'd7d95fce8435'
down_revision = '3eb516621981'
branch_labels = None
depends_on = None


def upgrade():
    # ### commands auto generated by Alembic - please adjust! ###
    with op.batch_alter_table('tenants', schema=None) as batch_op:
        batch_op.add_column(sa.Column('last_api_access', sa.DateTime(), nullable=True))

    # ### end Alembic commands ###


def downgrade():
    # ### commands auto generated by Alembic - please adjust! ###
    with op.batch_alter_table('tenants', schema=None) as batch_op:
        batch_op.drop_column('last_api_access')

    # ### end Alembic commands ###
