CREATE TABLE IF NOT EXISTS product_sync_events (
  event_id TEXT PRIMARY KEY,
  received_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_product_sync_events_received_at ON product_sync_events(received_at);
