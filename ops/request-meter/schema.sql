CREATE TABLE IF NOT EXISTS request_counts (
  hour_utc TEXT NOT NULL,
  path TEXT NOT NULL,
  method TEXT NOT NULL,
  status INTEGER NOT NULL,
  representation TEXT NOT NULL,
  cache_status TEXT NOT NULL,
  client_hint TEXT NOT NULL,
  requests INTEGER NOT NULL DEFAULT 0 CHECK (requests >= 0),
  PRIMARY KEY (hour_utc, path, method, status, representation, cache_status, client_hint)
) WITHOUT ROWID;
