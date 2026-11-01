pub const CREATE_MIGRATIONS_TABLE: &str = r#"
CREATE TABLE IF NOT EXISTS schema_migrations (
    version INTEGER PRIMARY KEY,
    name TEXT NOT NULL,
    applied_at TEXT NOT NULL
);
"#;

pub const MIGRATION_001_INITIAL_SCHEMA: &str = r#"
-- Canonical Card Identity
CREATE TABLE IF NOT EXISTS cards (
    id TEXT PRIMARY KEY,
    oracle_id TEXT,
    name TEXT NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_cards_name ON cards(name);
CREATE INDEX IF NOT EXISTS idx_cards_oracle_id ON cards(oracle_id);

-- Specific Printed Versions
CREATE TABLE IF NOT EXISTS printings (
    id TEXT PRIMARY KEY,
    card_id TEXT NOT NULL REFERENCES cards(id) ON DELETE CASCADE,
    scryfall_id TEXT,
    set_code TEXT NOT NULL,
    collector_number TEXT NOT NULL,
    set_name TEXT NOT NULL,
    release_date TEXT,
    layout TEXT NOT NULL DEFAULT 'normal',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    CONSTRAINT uq_printings_set_collector UNIQUE (set_code, collector_number)
);

CREATE INDEX IF NOT EXISTS idx_printings_card_id ON printings(card_id);
CREATE INDEX IF NOT EXISTS idx_printings_set_code ON printings(set_code);
CREATE INDEX IF NOT EXISTS idx_printings_scryfall_id ON printings(scryfall_id);

-- Physical Storage Locations
CREATE TABLE IF NOT EXISTS locations (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    location_type TEXT NOT NULL,
    parent_id TEXT REFERENCES locations(id) ON DELETE SET NULL,
    description TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_locations_parent_id ON locations(parent_id);

-- Physical Inventory Copies Owned by User
CREATE TABLE IF NOT EXISTS inventory_items (
    id TEXT PRIMARY KEY,
    printing_id TEXT NOT NULL REFERENCES printings(id) ON DELETE RESTRICT,
    quantity INTEGER NOT NULL CHECK (quantity >= 0),
    language TEXT NOT NULL DEFAULT 'en',
    finish TEXT NOT NULL DEFAULT 'nonfoil',
    condition TEXT NOT NULL DEFAULT 'NM',
    acquisition_date TEXT,
    purchase_price INTEGER,
    currency TEXT NOT NULL DEFAULT 'EUR',
    location_id TEXT REFERENCES locations(id) ON DELETE SET NULL,
    notes TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_inventory_printing_id ON inventory_items(printing_id);
CREATE INDEX IF NOT EXISTS idx_inventory_location_id ON inventory_items(location_id);
CREATE INDEX IF NOT EXISTS idx_inventory_condition ON inventory_items(condition);
CREATE INDEX IF NOT EXISTS idx_inventory_finish ON inventory_items(finish);

-- User-Created Virtual Collections
CREATE TABLE IF NOT EXISTS collections (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_collections_name ON collections(name);

-- Many-to-Many Relationship Between Inventory Items and Virtual Collections
CREATE TABLE IF NOT EXISTS collection_items (
    id TEXT PRIMARY KEY,
    inventory_item_id TEXT NOT NULL REFERENCES inventory_items(id) ON DELETE CASCADE,
    collection_id TEXT NOT NULL REFERENCES collections(id) ON DELETE CASCADE,
    assigned_at TEXT NOT NULL,
    CONSTRAINT uq_collection_inventory UNIQUE (collection_id, inventory_item_id)
);

CREATE INDEX IF NOT EXISTS idx_col_items_inventory ON collection_items(inventory_item_id);
CREATE INDEX IF NOT EXISTS idx_col_items_collection ON collection_items(collection_id);
"#;
