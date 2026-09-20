CREATE TABLE migration_events (
  event_id TEXT PRIMARY KEY,
  run_id TEXT NOT NULL,
  action TEXT NOT NULL,
  received_at INTEGER NOT NULL,
  FOREIGN KEY (run_id) REFERENCES migration_runs(id) ON DELETE CASCADE
);
CREATE INDEX idx_migration_events_received_at ON migration_events(received_at);
