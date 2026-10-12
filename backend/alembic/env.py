from logging.config import fileConfig

from sqlalchemy import engine_from_config
from sqlalchemy import pool

from alembic import context

# Import our settings and base model
import sys
import os
sys.path.append(os.getcwd())
from app.core.config import settings
from app.db.base import Base
from app.models.user import User
from app.models.course import Course
from app.models.resource import Resource
from app.models.resource_page import ResourcePage
from app.models.resource_chunk import ResourceChunk
from app.models.resource_image import ResourceImage
from app.models.resource_video import ResourceVideoSegment
from app.models.knowledge import CourseKnowledgeMap, Topic, Concept, ConceptSource, PrerequisiteRelationship

config = context.config

if config.config_file_name is not None:
    fileConfig(config.config_file_name)

target_metadata = Base.metadata

def run_migrations_offline() -> None:
    url = settings.DATABASE_URL
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )

    with context.begin_transaction():
        context.run_migrations()

def run_migrations_online() -> None:
    configuration = config.get_section(config.config_ini_section, {})
    configuration["sqlalchemy.url"] = settings.DATABASE_URL
    connectable = engine_from_config(
        configuration,
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )

    with connectable.connect() as connection:
        context.configure(
            connection=connection, target_metadata=target_metadata
        )

        with context.begin_transaction():
            context.run_migrations()

if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
