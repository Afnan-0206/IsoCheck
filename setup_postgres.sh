#!/usr/bin/env bash
set -e

# ================================================================
# DEPRECATED: This script installs Postgres via apt in WSL.
# Use docker-compose.yml instead:
#   docker compose up -d postgres
# The Docker setup uses pinned postgres:17.2 with a non-superuser role.
# This script is kept only as a reference; do NOT use for new setups.
# ================================================================
echo "WARNING: setup_postgres.sh is DEPRECATED. Use 'docker compose up -d postgres' instead." >&2
echo "See docker-compose.yml for the correct, reproducible Postgres setup." >&2
exit 1

# Configure git safe directory
git config --global --add safe.directory '*'

# Configure PostgreSQL to accept connections from host
PG_CONF=$(find /etc/postgresql -name postgresql.conf)
PG_HBA=$(find /etc/postgresql -name pg_hba.conf)

sed -i "s/#listen_addresses = 'localhost'/listen_addresses = '*'/g" "$PG_CONF"
sed -i "s/listen_addresses = 'localhost'/listen_addresses = '*'/g" "$PG_CONF"

if ! grep -q "host all all 0.0.0.0/0 md5" "$PG_HBA"; then
    echo "host all all 0.0.0.0/0 md5" >> "$PG_HBA"
    echo "host all all ::0/0 md5" >> "$PG_HBA"
fi

service postgresql restart

su - postgres -c "psql -tc \"SELECT 1 FROM pg_roles WHERE rolname='isocheck'\"" | grep -q 1 || \
    su - postgres -c "psql -c \"CREATE USER isocheck WITH PASSWORD 'isocheck' SUPERUSER;\""

su - postgres -c "psql -tc \"SELECT 1 FROM pg_database WHERE datname='isocheck'\"" | grep -q 1 || \
    su - postgres -c "psql -c \"CREATE DATABASE isocheck OWNER isocheck;\""

# Also install python3-psycopg inside WSL
apt-get install -y -q python3-pip python3-psycopg 2>/dev/null || true

echo "PostgreSQL & Git configured successfully!"
