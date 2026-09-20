PRAGMA foreign_keys = ON;

CREATE TABLE migration_runs (
  id TEXT PRIMARY KEY,
  source TEXT NOT NULL DEFAULT 'woocommerce',
  mode TEXT NOT NULL CHECK (mode IN ('snapshot', 'incremental', 'final')),
  status TEXT NOT NULL CHECK (status IN ('running', 'complete', 'failed')),
  started_at TEXT NOT NULL,
  completed_at TEXT,
  source_high_watermark TEXT,
  manifest_key TEXT,
  record_counts_json TEXT NOT NULL DEFAULT '{}',
  error TEXT
);

CREATE TABLE source_records (
  source_type TEXT NOT NULL,
  source_id TEXT NOT NULL,
  source_updated_at TEXT,
  checksum_sha256 TEXT NOT NULL,
  raw_json TEXT NOT NULL,
  migration_run_id TEXT NOT NULL,
  imported_at TEXT NOT NULL,
  PRIMARY KEY (source_type, source_id),
  FOREIGN KEY (migration_run_id) REFERENCES migration_runs(id)
);
CREATE INDEX idx_source_records_run ON source_records(migration_run_id);
CREATE INDEX idx_source_records_updated ON source_records(source_type, source_updated_at);

CREATE TABLE commerce_settings (
  key TEXT PRIMARY KEY,
  value_json TEXT NOT NULL,
  source_updated_at TEXT,
  updated_at TEXT NOT NULL
);

CREATE TABLE products (
  id INTEGER PRIMARY KEY,
  parent_id INTEGER,
  type TEXT NOT NULL,
  status TEXT NOT NULL,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  sku TEXT,
  description_html TEXT NOT NULL DEFAULT '',
  short_description_html TEXT NOT NULL DEFAULT '',
  currency TEXT NOT NULL DEFAULT 'GBP',
  regular_price_minor INTEGER,
  sale_price_minor INTEGER,
  price_minor INTEGER,
  taxable INTEGER NOT NULL DEFAULT 0 CHECK (taxable IN (0, 1)),
  virtual INTEGER NOT NULL DEFAULT 0 CHECK (virtual IN (0, 1)),
  downloadable INTEGER NOT NULL DEFAULT 0 CHECK (downloadable IN (0, 1)),
  manage_stock INTEGER NOT NULL DEFAULT 0 CHECK (manage_stock IN (0, 1)),
  stock_quantity INTEGER,
  stock_status TEXT NOT NULL,
  backorders TEXT NOT NULL DEFAULT 'no',
  sold_individually INTEGER NOT NULL DEFAULT 0 CHECK (sold_individually IN (0, 1)),
  weight_kg TEXT,
  categories_json TEXT NOT NULL DEFAULT '[]',
  tags_json TEXT NOT NULL DEFAULT '[]',
  attributes_json TEXT NOT NULL DEFAULT '[]',
  source_created_at TEXT,
  source_updated_at TEXT,
  FOREIGN KEY (parent_id) REFERENCES products(id)
);
CREATE UNIQUE INDEX idx_products_slug ON products(slug);
CREATE INDEX idx_products_parent ON products(parent_id);
CREATE INDEX idx_products_status ON products(status, stock_status);

CREATE TABLE product_media (
  id INTEGER PRIMARY KEY,
  product_id INTEGER NOT NULL,
  source_url TEXT NOT NULL,
  r2_key TEXT,
  alt_text TEXT NOT NULL DEFAULT '',
  position INTEGER NOT NULL DEFAULT 0,
  checksum_sha256 TEXT,
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
);
CREATE INDEX idx_product_media_product ON product_media(product_id, position);

CREATE TABLE downloadable_files (
  id TEXT PRIMARY KEY,
  product_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  source_url TEXT,
  r2_key TEXT,
  checksum_sha256 TEXT,
  size_bytes INTEGER,
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
);

CREATE TABLE orders (
  id INTEGER PRIMARY KEY,
  order_number INTEGER NOT NULL UNIQUE,
  source_order_id INTEGER UNIQUE,
  status TEXT NOT NULL,
  currency TEXT NOT NULL DEFAULT 'GBP',
  prices_include_tax INTEGER NOT NULL DEFAULT 0 CHECK (prices_include_tax IN (0, 1)),
  customer_id INTEGER,
  customer_email TEXT NOT NULL DEFAULT '',
  customer_phone TEXT NOT NULL DEFAULT '',
  customer_note TEXT NOT NULL DEFAULT '',
  payment_method TEXT,
  payment_method_title TEXT,
  transaction_id TEXT,
  subtotal_minor INTEGER NOT NULL DEFAULT 0,
  discount_minor INTEGER NOT NULL DEFAULT 0,
  shipping_minor INTEGER NOT NULL DEFAULT 0,
  tax_minor INTEGER NOT NULL DEFAULT 0,
  total_minor INTEGER NOT NULL DEFAULT 0,
  date_created TEXT NOT NULL,
  date_modified TEXT NOT NULL,
  date_paid TEXT,
  date_completed TEXT,
  source_created_via TEXT,
  source_version TEXT,
  migration_run_id TEXT,
  FOREIGN KEY (migration_run_id) REFERENCES migration_runs(id)
);
CREATE INDEX idx_orders_status ON orders(status, date_created DESC);
CREATE INDEX idx_orders_email ON orders(customer_email);
CREATE INDEX idx_orders_transaction ON orders(transaction_id);

CREATE TABLE order_addresses (
  order_id INTEGER NOT NULL,
  kind TEXT NOT NULL CHECK (kind IN ('billing', 'shipping')),
  first_name TEXT NOT NULL DEFAULT '',
  last_name TEXT NOT NULL DEFAULT '',
  company TEXT NOT NULL DEFAULT '',
  address_1 TEXT NOT NULL DEFAULT '',
  address_2 TEXT NOT NULL DEFAULT '',
  city TEXT NOT NULL DEFAULT '',
  state TEXT NOT NULL DEFAULT '',
  postcode TEXT NOT NULL DEFAULT '',
  country TEXT NOT NULL DEFAULT '',
  email TEXT NOT NULL DEFAULT '',
  phone TEXT NOT NULL DEFAULT '',
  PRIMARY KEY (order_id, kind),
  FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
);

CREATE TABLE order_items (
  id INTEGER PRIMARY KEY,
  order_id INTEGER NOT NULL,
  source_item_id INTEGER,
  product_id INTEGER,
  variation_id INTEGER,
  name TEXT NOT NULL,
  sku TEXT,
  quantity INTEGER NOT NULL,
  subtotal_minor INTEGER NOT NULL DEFAULT 0,
  total_minor INTEGER NOT NULL DEFAULT 0,
  tax_minor INTEGER NOT NULL DEFAULT 0,
  attributes_json TEXT NOT NULL DEFAULT '[]',
  FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
  FOREIGN KEY (product_id) REFERENCES products(id),
  FOREIGN KEY (variation_id) REFERENCES products(id)
);
CREATE INDEX idx_order_items_order ON order_items(order_id);
CREATE INDEX idx_order_items_product ON order_items(product_id);

CREATE TABLE order_adjustments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id INTEGER NOT NULL,
  source_item_id INTEGER,
  kind TEXT NOT NULL CHECK (kind IN ('shipping', 'coupon', 'fee', 'tax')),
  code TEXT,
  label TEXT NOT NULL DEFAULT '',
  amount_minor INTEGER NOT NULL DEFAULT 0,
  tax_minor INTEGER NOT NULL DEFAULT 0,
  data_json TEXT NOT NULL DEFAULT '{}',
  FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
);
CREATE INDEX idx_order_adjustments_order ON order_adjustments(order_id, kind);

CREATE TABLE order_notes (
  id INTEGER PRIMARY KEY,
  order_id INTEGER NOT NULL,
  note TEXT NOT NULL,
  customer_visible INTEGER NOT NULL DEFAULT 0 CHECK (customer_visible IN (0, 1)),
  created_by TEXT,
  created_at TEXT NOT NULL,
  FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
);

CREATE TABLE refunds (
  id INTEGER PRIMARY KEY,
  order_id INTEGER NOT NULL,
  amount_minor INTEGER NOT NULL,
  reason TEXT NOT NULL DEFAULT '',
  refunded_by INTEGER,
  created_at TEXT NOT NULL,
  line_items_json TEXT NOT NULL DEFAULT '[]',
  FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
);

CREATE TABLE payment_transactions (
  id TEXT PRIMARY KEY,
  order_id INTEGER NOT NULL,
  provider TEXT NOT NULL,
  provider_transaction_id TEXT,
  kind TEXT NOT NULL,
  status TEXT NOT NULL,
  amount_minor INTEGER,
  currency TEXT,
  occurred_at TEXT NOT NULL,
  data_json TEXT NOT NULL DEFAULT '{}',
  FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
);
CREATE INDEX idx_payment_transactions_order ON payment_transactions(order_id, occurred_at);
CREATE UNIQUE INDEX idx_payment_provider_id ON payment_transactions(provider, provider_transaction_id)
  WHERE provider_transaction_id IS NOT NULL;

CREATE TABLE download_grants (
  id TEXT PRIMARY KEY,
  order_id INTEGER NOT NULL,
  order_item_id INTEGER NOT NULL,
  downloadable_file_id TEXT NOT NULL,
  customer_email TEXT NOT NULL,
  token_hash TEXT,
  downloads_remaining INTEGER,
  access_granted_at TEXT NOT NULL,
  access_expires_at TEXT,
  FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
  FOREIGN KEY (order_item_id) REFERENCES order_items(id) ON DELETE CASCADE,
  FOREIGN KEY (downloadable_file_id) REFERENCES downloadable_files(id)
);
CREATE INDEX idx_download_grants_order ON download_grants(order_id);

CREATE TABLE shipping_rules (
  id TEXT PRIMARY KEY,
  position INTEGER NOT NULL,
  active INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0, 1)),
  internal_label TEXT NOT NULL,
  customer_title TEXT NOT NULL,
  countries_json TEXT NOT NULL,
  min_weight_kg TEXT,
  min_inclusive INTEGER NOT NULL DEFAULT 0 CHECK (min_inclusive IN (0, 1)),
  max_weight_kg TEXT,
  max_inclusive INTEGER NOT NULL DEFAULT 0 CHECK (max_inclusive IN (0, 1)),
  min_subtotal_minor INTEGER,
  max_subtotal_minor INTEGER,
  price_minor INTEGER NOT NULL,
  currency TEXT NOT NULL DEFAULT 'GBP',
  source_json TEXT NOT NULL DEFAULT '{}'
);

CREATE TABLE webhook_events (
  provider TEXT NOT NULL,
  event_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  status TEXT NOT NULL,
  received_at TEXT NOT NULL,
  processed_at TEXT,
  payload_sha256 TEXT NOT NULL,
  error TEXT,
  PRIMARY KEY (provider, event_id)
);

CREATE TABLE order_number_sequence (
  singleton INTEGER PRIMARY KEY CHECK (singleton = 1),
  next_number INTEGER NOT NULL
);

CREATE TABLE audit_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  actor TEXT NOT NULL,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  created_at TEXT NOT NULL,
  details_json TEXT NOT NULL DEFAULT '{}'
);
CREATE INDEX idx_audit_entity ON audit_log(entity_type, entity_id, created_at);
