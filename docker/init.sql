-- IsoCheck Database Initialization Script
-- Creates non-superuser role for workload execution (satisfying Rule 5 & remediation requirement 1a)

CREATE USER isocheck_app WITH PASSWORD 'isocheck_app';
GRANT ALL PRIVILEGES ON DATABASE isocheck TO isocheck_app;

\connect isocheck

GRANT ALL ON SCHEMA public TO isocheck_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO isocheck_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO isocheck_app;
