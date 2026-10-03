-- docker-compose.yml mounts this folder into /docker-entrypoint-initdb.d.
-- Compose runs it once on a fresh volume, which is when the test database is created.
CREATE DATABASE shortlist_test;