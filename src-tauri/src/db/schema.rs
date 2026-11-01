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

pub const MIGRATION_002_SCRYFALL_CACHE: &str = r#"
-- Persistent Scryfall Card & Printing Cache
CREATE TABLE IF NOT EXISTS scryfall_cache (
    scryfall_id TEXT PRIMARY KEY,
    oracle_id TEXT,
    name TEXT NOT NULL,
    name_normalized TEXT NOT NULL,
    set_code TEXT NOT NULL,
    collector_number TEXT NOT NULL,
    set_name TEXT NOT NULL,
    released_at TEXT,
    rarity TEXT NOT NULL,
    mana_cost TEXT,
    type_line TEXT,
    colors TEXT,
    image_small TEXT,
    image_normal TEXT,
    image_large TEXT,
    image_art_crop TEXT,
    finishes TEXT NOT NULL,
    price_eur INTEGER,
    price_eur_foil INTEGER,
    raw_json TEXT NOT NULL,
    cached_at TEXT NOT NULL,
    expires_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_scryfall_cache_name_norm ON scryfall_cache(name_normalized);
CREATE INDEX IF NOT EXISTS idx_scryfall_cache_oracle_id ON scryfall_cache(oracle_id);
CREATE INDEX IF NOT EXISTS idx_scryfall_cache_set_num ON scryfall_cache(set_code, collector_number);

-- Extend printings with cached visual & metadata columns
ALTER TABLE printings ADD COLUMN rarity TEXT;
ALTER TABLE printings ADD COLUMN mana_cost TEXT;
ALTER TABLE printings ADD COLUMN type_line TEXT;
ALTER TABLE printings ADD COLUMN image_url TEXT;
ALTER TABLE printings ADD COLUMN price_eur INTEGER;
"#;

pub const MIGRATION_003_IMAGE_METADATA_AND_SYNC: &str = r#"
-- Table for tracking synchronized oracle printing sets
CREATE TABLE IF NOT EXISTS scryfall_oracle_sync (
    oracle_id TEXT PRIMARY KEY,
    synced_at TEXT NOT NULL,
    total_printings INTEGER NOT NULL
);

-- Extend printings with full image metadata, face data and status
ALTER TABLE printings ADD COLUMN image_small TEXT;
ALTER TABLE printings ADD COLUMN image_art_crop TEXT;
ALTER TABLE printings ADD COLUMN image_status TEXT DEFAULT 'available';
ALTER TABLE printings ADD COLUMN card_faces TEXT;

-- Table for tracking disk-cached card images
CREATE TABLE IF NOT EXISTS local_image_cache (
    scryfall_id TEXT NOT NULL,
    image_size TEXT NOT NULL,
    local_path TEXT NOT NULL,
    file_size_bytes INTEGER NOT NULL,
    cached_at TEXT NOT NULL,
    PRIMARY KEY (scryfall_id, image_size)
);

CREATE INDEX IF NOT EXISTS idx_local_image_cache_id ON local_image_cache(scryfall_id);
"#;

pub const MIGRATION_004_MULTILINGUAL_SUPPORT: &str = r#"
-- Recreate printings table with lang and printed_name and UNIQUE(set_code, collector_number, lang)
CREATE TABLE IF NOT EXISTS printings_multilingual (
    id TEXT PRIMARY KEY,
    card_id TEXT NOT NULL REFERENCES cards(id) ON DELETE CASCADE,
    scryfall_id TEXT,
    set_code TEXT NOT NULL,
    collector_number TEXT NOT NULL,
    set_name TEXT NOT NULL,
    release_date TEXT,
    layout TEXT NOT NULL DEFAULT 'normal',
    rarity TEXT,
    mana_cost TEXT,
    type_line TEXT,
    image_url TEXT,
    price_eur INTEGER,
    image_small TEXT,
    image_art_crop TEXT,
    image_status TEXT DEFAULT 'available',
    card_faces TEXT,
    lang TEXT NOT NULL DEFAULT 'en',
    printed_name TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    CONSTRAINT uq_printings_set_collector_lang UNIQUE (set_code, collector_number, lang)
);

INSERT INTO printings_multilingual (
    id, card_id, scryfall_id, set_code, collector_number, set_name,
    release_date, layout, rarity, mana_cost, type_line, image_url,
    price_eur, image_small, image_art_crop, image_status, card_faces,
    lang, printed_name, created_at, updated_at
)
SELECT 
    id, card_id, scryfall_id, set_code, collector_number, set_name,
    release_date, layout, rarity, mana_cost, type_line, image_url,
    price_eur, image_small, image_art_crop, image_status, card_faces,
    'en', NULL, created_at, updated_at
FROM printings;

DROP TABLE printings;
ALTER TABLE printings_multilingual RENAME TO printings;

CREATE INDEX IF NOT EXISTS idx_printings_card_id ON printings(card_id);
CREATE INDEX IF NOT EXISTS idx_printings_set_code ON printings(set_code);
CREATE INDEX IF NOT EXISTS idx_printings_scryfall_id ON printings(scryfall_id);
CREATE INDEX IF NOT EXISTS idx_printings_lang ON printings(lang);
CREATE INDEX IF NOT EXISTS idx_printings_printed_name ON printings(printed_name);

-- Extend scryfall_cache with localized printed name and indexes
ALTER TABLE scryfall_cache ADD COLUMN lang TEXT NOT NULL DEFAULT 'en';
ALTER TABLE scryfall_cache ADD COLUMN printed_name TEXT;
ALTER TABLE scryfall_cache ADD COLUMN printed_name_normalized TEXT;

CREATE INDEX IF NOT EXISTS idx_scryfall_cache_printed_name ON scryfall_cache(printed_name_normalized);
CREATE INDEX IF NOT EXISTS idx_scryfall_cache_lang ON scryfall_cache(lang);

-- Add printed_name to inventory_items
ALTER TABLE inventory_items ADD COLUMN printed_name TEXT;
"#;
