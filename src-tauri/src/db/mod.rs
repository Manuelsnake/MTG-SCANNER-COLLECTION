pub mod migrations;
pub mod schema;

use std::fs;
use std::path::{Path, PathBuf};
use std::sync::Mutex;

use chrono::Utc;
use log::info;
use rusqlite::{params, Connection, OptionalExtension};
use uuid::Uuid;

use crate::error::{AppError, AppResult};
use crate::models::{
    AddManualCardInput, Collection, CollectionSummary, CreateLocationInput, InventoryItemDetail,
    Location,
};

#[derive(Debug, serde::Serialize, serde::Deserialize)]
pub struct DatabaseInfo {
    pub path: String,
    pub schema_version: i64,
    pub cards_count: i64,
    pub printings_count: i64,
    pub inventory_count: i64,
    pub total_card_quantity: i64,
    pub collections_count: i64,
    pub locations_count: i64,
    pub integrity_status: String,
}

pub struct Database {
    conn: Mutex<Connection>,
    path: PathBuf,
}

impl Database {
    /// Initialize a SQLite database stored in the given filesystem path.
    pub fn init_file(path: &Path) -> AppResult<Self> {
        if let Some(parent) = path.parent() {
            fs::create_dir_all(parent).map_err(|e| {
                AppError::Internal(format!(
                    "Failed to create database directory {}: {e}",
                    parent.display()
                ))
            })?;
        }

        let mut conn = Connection::open(path)?;
        Self::apply_pragmas(&mut conn)?;
        let version = migrations::run_migrations(&mut conn)?;
        info!(
            "SQLite database initialized at {} (Schema Version: {})",
            path.display(),
            version
        );

        Ok(Self {
            conn: Mutex::new(conn),
            path: path.to_path_buf(),
        })
    }

    /// Initialize an in-memory SQLite database (used primarily for automated tests).
    pub fn init_memory() -> AppResult<Self> {
        let mut conn = Connection::open_in_memory()?;
        Self::apply_pragmas(&mut conn)?;
        migrations::run_migrations(&mut conn)?;

        Ok(Self {
            conn: Mutex::new(conn),
            path: PathBuf::from(":memory:"),
        })
    }

    fn apply_pragmas(conn: &mut Connection) -> AppResult<()> {
        conn.execute_batch(
            r#"
            PRAGMA foreign_keys = ON;
            PRAGMA journal_mode = WAL;
            PRAGMA synchronous = NORMAL;
            PRAGMA busy_timeout = 5000;
            "#,
        )?;
        Ok(())
    }

    pub fn get_path(&self) -> &Path {
        &self.path
    }

    pub fn verify_integrity(&self) -> AppResult<String> {
        let conn = self.conn.lock().unwrap();
        let mut stmt = conn.prepare("PRAGMA integrity_check")?;
        let status: String = stmt.query_row([], |row| row.get(0))?;
        Ok(status)
    }

    pub fn get_info(&self) -> AppResult<DatabaseInfo> {
        let conn = self.conn.lock().unwrap();

        let schema_version: i64 = conn.query_row("PRAGMA user_version", [], |row| row.get(0))?;
        let cards_count: i64 =
            conn.query_row("SELECT COUNT(*) FROM cards", [], |row| row.get(0))?;
        let printings_count: i64 =
            conn.query_row("SELECT COUNT(*) FROM printings", [], |row| row.get(0))?;
        let inventory_count: i64 =
            conn.query_row("SELECT COUNT(*) FROM inventory_items", [], |row| row.get(0))?;
        let total_card_quantity: i64 = conn.query_row(
            "SELECT COALESCE(SUM(quantity), 0) FROM inventory_items",
            [],
            |row| row.get(0),
        )?;
        let collections_count: i64 =
            conn.query_row("SELECT COUNT(*) FROM collections", [], |row| row.get(0))?;
        let locations_count: i64 =
            conn.query_row("SELECT COUNT(*) FROM locations", [], |row| row.get(0))?;

        let integrity_status: String =
            conn.query_row("PRAGMA integrity_check", [], |row| row.get(0))?;

        Ok(DatabaseInfo {
            path: self.path.to_string_lossy().to_string(),
            schema_version,
            cards_count,
            printings_count,
            inventory_count,
            total_card_quantity,
            collections_count,
            locations_count,
            integrity_status,
        })
    }

    // ==========================================
    // Collections Operations
    // ==========================================

    pub fn create_collection(
        &self,
        name: &str,
        description: Option<&str>,
    ) -> AppResult<Collection> {
        let trimmed_name = name.trim();
        if trimmed_name.is_empty() {
            return Err(AppError::Validation(
                "Collection name cannot be empty".to_string(),
            ));
        }

        let conn = self.conn.lock().unwrap();
        let id = Uuid::new_v4().to_string();
        let now = Utc::now().to_rfc3339();

        let result = conn.execute(
            "INSERT INTO collections (id, name, description, created_at, updated_at) VALUES (?1, ?2, ?3, ?4, ?5)",
            params![id, trimmed_name, description.map(|s| s.trim()), now, now],
        );

        match result {
            Ok(_) => Ok(Collection {
                id,
                name: trimmed_name.to_string(),
                description: description.map(|s| s.trim().to_string()),
                created_at: now.clone(),
                updated_at: now,
            }),
            Err(rusqlite::Error::SqliteFailure(err, _))
                if err.extended_code == 2067 || err.extended_code == 1555 =>
            {
                Err(AppError::Conflict(format!(
                    "A collection with name '{}' already exists",
                    trimmed_name
                )))
            }
            Err(e) => Err(AppError::Database(e)),
        }
    }

    pub fn list_collections(&self) -> AppResult<Vec<CollectionSummary>> {
        let conn = self.conn.lock().unwrap();
        let mut stmt = conn.prepare(
            r#"
            SELECT 
                c.id, c.name, c.description, c.created_at, c.updated_at,
                COUNT(ci.id) as total_items,
                COALESCE(SUM(inv.quantity), 0) as total_quantity
            FROM collections c
            LEFT JOIN collection_items ci ON c.id = ci.collection_id
            LEFT JOIN inventory_items inv ON ci.inventory_item_id = inv.id
            GROUP BY c.id
            ORDER BY c.name COLLATE NOCASE ASC
            "#,
        )?;

        let collections = stmt
            .query_map([], |row| {
                Ok(CollectionSummary {
                    id: row.get(0)?,
                    name: row.get(1)?,
                    description: row.get(2)?,
                    created_at: row.get(3)?,
                    updated_at: row.get(4)?,
                    total_items: row.get(5)?,
                    total_quantity: row.get(6)?,
                })
            })?
            .filter_map(Result::ok)
            .collect();

        Ok(collections)
    }

    pub fn rename_collection(
        &self,
        id: &str,
        new_name: &str,
        description: Option<&str>,
    ) -> AppResult<Collection> {
        let trimmed_name = new_name.trim();
        if trimmed_name.is_empty() {
            return Err(AppError::Validation(
                "Collection name cannot be empty".to_string(),
            ));
        }

        let conn = self.conn.lock().unwrap();
        let now = Utc::now().to_rfc3339();

        let updated_rows = conn.execute(
            "UPDATE collections SET name = ?1, description = ?2, updated_at = ?3 WHERE id = ?4",
            params![trimmed_name, description.map(|s| s.trim()), now, id],
        );

        match updated_rows {
            Ok(0) => Err(AppError::NotFound(format!("Collection {id} not found"))),
            Ok(_) => {
                let mut stmt = conn.prepare(
                    "SELECT id, name, description, created_at, updated_at FROM collections WHERE id = ?1",
                )?;
                let col = stmt.query_row([id], |row| {
                    Ok(Collection {
                        id: row.get(0)?,
                        name: row.get(1)?,
                        description: row.get(2)?,
                        created_at: row.get(3)?,
                        updated_at: row.get(4)?,
                    })
                })?;
                Ok(col)
            }
            Err(rusqlite::Error::SqliteFailure(err, _))
                if err.extended_code == 2067 || err.extended_code == 1555 =>
            {
                Err(AppError::Conflict(format!(
                    "A collection with name '{}' already exists",
                    trimmed_name
                )))
            }
            Err(e) => Err(AppError::Database(e)),
        }
    }

    pub fn delete_collection(&self, id: &str) -> AppResult<()> {
        let conn = self.conn.lock().unwrap();
        let rows = conn.execute("DELETE FROM collections WHERE id = ?1", params![id])?;
        if rows == 0 {
            return Err(AppError::NotFound(format!("Collection {id} not found")));
        }
        Ok(())
    }

    pub fn assign_to_collection(
        &self,
        collection_id: &str,
        inventory_item_id: &str,
    ) -> AppResult<()> {
        let conn = self.conn.lock().unwrap();
        let id = Uuid::new_v4().to_string();
        let now = Utc::now().to_rfc3339();

        let result = conn.execute(
            "INSERT INTO collection_items (id, collection_id, inventory_item_id, assigned_at) VALUES (?1, ?2, ?3, ?4)",
            params![id, collection_id, inventory_item_id, now],
        );

        match result {
            Ok(_) => Ok(()),
            Err(rusqlite::Error::SqliteFailure(err, _))
                if err.extended_code == 2067 || err.extended_code == 1555 =>
            {
                // Already assigned, idempotent success
                Ok(())
            }
            Err(e) => Err(AppError::Database(e)),
        }
    }

    pub fn remove_from_collection(
        &self,
        collection_id: &str,
        inventory_item_id: &str,
    ) -> AppResult<()> {
        let conn = self.conn.lock().unwrap();
        conn.execute(
            "DELETE FROM collection_items WHERE collection_id = ?1 AND inventory_item_id = ?2",
            params![collection_id, inventory_item_id],
        )?;
        Ok(())
    }

    // ==========================================
    // Inventory Operations
    // ==========================================

    pub fn add_manual_card(&self, input: AddManualCardInput) -> AppResult<InventoryItemDetail> {
        let card_name = input.card_name.trim();
        let set_code = input.set_code.trim().to_uppercase();
        let collector_number = input.collector_number.trim();
        let set_name = input.set_name.trim();

        if card_name.is_empty() {
            return Err(AppError::Validation(
                "Card name cannot be empty".to_string(),
            ));
        }
        if set_code.is_empty() {
            return Err(AppError::Validation("Set code cannot be empty".to_string()));
        }
        if collector_number.is_empty() {
            return Err(AppError::Validation(
                "Collector number cannot be empty".to_string(),
            ));
        }
        if input.quantity <= 0 {
            return Err(AppError::Validation(
                "Quantity must be greater than zero".to_string(),
            ));
        }

        let mut conn = self.conn.lock().unwrap();
        let tx = conn.transaction()?;

        let now = Utc::now().to_rfc3339();

        // 1. Resolve or create canonical card
        let card_id: String = {
            let existing: Option<String> = tx
                .query_row(
                    "SELECT id FROM cards WHERE LOWER(name) = LOWER(?1)",
                    params![card_name],
                    |row| row.get(0),
                )
                .optional()?;

            if let Some(id) = existing {
                id
            } else {
                let new_id = Uuid::new_v4().to_string();
                tx.execute(
                    "INSERT INTO cards (id, name, created_at, updated_at) VALUES (?1, ?2, ?3, ?4)",
                    params![new_id, card_name, now, now],
                )?;
                new_id
            }
        };

        // 2. Resolve or create printing
        let printing_id: String = {
            let existing: Option<String> = tx
                .query_row(
                    "SELECT id FROM printings WHERE set_code = ?1 AND collector_number = ?2",
                    params![set_code, collector_number],
                    |row| row.get(0),
                )
                .optional()?;

            if let Some(id) = existing {
                id
            } else {
                let new_id = Uuid::new_v4().to_string();
                tx.execute(
                    r#"
                    INSERT INTO printings 
                    (id, card_id, set_code, collector_number, set_name, layout, created_at, updated_at) 
                    VALUES (?1, ?2, ?3, ?4, ?5, 'normal', ?6, ?7)
                    "#,
                    params![new_id, card_id, set_code, collector_number, set_name, now, now],
                )?;
                new_id
            }
        };

        // 3. Insert inventory record
        let inventory_id = Uuid::new_v4().to_string();
        let currency = input
            .currency
            .unwrap_or_else(|| "EUR".to_string())
            .trim()
            .to_uppercase();

        tx.execute(
            r#"
            INSERT INTO inventory_items (
                id, printing_id, quantity, language, finish, condition, 
                purchase_price, currency, location_id, notes, created_at, updated_at
            ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12)
            "#,
            params![
                inventory_id,
                printing_id,
                input.quantity,
                input.language.trim().to_lowercase(),
                input.finish.trim().to_lowercase(),
                input.condition.trim().to_uppercase(),
                input.purchase_price,
                currency,
                input.location_id,
                input.notes.as_deref().map(str::trim),
                now,
                now
            ],
        )?;

        // Fetch location name if attached
        let location_name: Option<String> = if let Some(ref loc_id) = input.location_id {
            tx.query_row(
                "SELECT name FROM locations WHERE id = ?1",
                params![loc_id],
                |row| row.get(0),
            )
            .optional()?
        } else {
            None
        };

        tx.commit()?;

        Ok(InventoryItemDetail {
            id: inventory_id,
            printing_id,
            card_id,
            card_name: card_name.to_string(),
            set_code,
            collector_number: collector_number.to_string(),
            set_name: set_name.to_string(),
            quantity: input.quantity,
            language: input.language.trim().to_lowercase(),
            finish: input.finish.trim().to_lowercase(),
            condition: input.condition.trim().to_uppercase(),
            acquisition_date: None,
            purchase_price: input.purchase_price,
            currency,
            location_id: input.location_id,
            location_name,
            notes: input.notes,
            collection_ids: vec![],
            created_at: now.clone(),
            updated_at: now,
        })
    }

    pub fn get_inventory_items(
        &self,
        search: Option<&str>,
        collection_id: Option<&str>,
    ) -> AppResult<Vec<InventoryItemDetail>> {
        let conn = self.conn.lock().unwrap();

        let mut query = String::from(
            r#"
            SELECT 
                inv.id, inv.printing_id, p.card_id, c.name as card_name,
                p.set_code, p.collector_number, p.set_name,
                inv.quantity, inv.language, inv.finish, inv.condition,
                inv.acquisition_date, inv.purchase_price, inv.currency,
                inv.location_id, loc.name as location_name, inv.notes,
                inv.created_at, inv.updated_at,
                (SELECT GROUP_CONCAT(ci.collection_id) FROM collection_items ci WHERE ci.inventory_item_id = inv.id) as collection_ids
            FROM inventory_items inv
            JOIN printings p ON inv.printing_id = p.id
            JOIN cards c ON p.card_id = c.id
            LEFT JOIN locations loc ON inv.location_id = loc.id
            WHERE 1=1
            "#,
        );

        let mut param_values: Vec<Box<dyn rusqlite::ToSql>> = Vec::new();

        if let Some(col_id) = collection_id {
            if !col_id.trim().is_empty() {
                query.push_str(" AND inv.id IN (SELECT inventory_item_id FROM collection_items WHERE collection_id = ?)");
                param_values.push(Box::new(col_id.trim().to_string()));
            }
        }

        if let Some(s) = search {
            let term = s.trim();
            if !term.is_empty() {
                query.push_str(" AND (LOWER(c.name) LIKE ? OR LOWER(p.set_code) LIKE ? OR LOWER(p.collector_number) LIKE ?)");
                let pattern = format!("%{}%", term.to_lowercase());
                param_values.push(Box::new(pattern.clone()));
                param_values.push(Box::new(pattern.clone()));
                param_values.push(Box::new(pattern));
            }
        }

        query.push_str(
            " ORDER BY c.name COLLATE NOCASE ASC, p.set_code ASC, p.collector_number ASC",
        );

        let mut stmt = conn.prepare(&query)?;
        let params_slice: Vec<&dyn rusqlite::ToSql> =
            param_values.iter().map(|b| b.as_ref()).collect();

        let items = stmt
            .query_map(params_slice.as_slice(), |row| {
                let col_ids_str: Option<String> = row.get(19)?;
                let collection_ids = col_ids_str
                    .map(|s| s.split(',').map(|id| id.to_string()).collect())
                    .unwrap_or_default();

                Ok(InventoryItemDetail {
                    id: row.get(0)?,
                    printing_id: row.get(1)?,
                    card_id: row.get(2)?,
                    card_name: row.get(3)?,
                    set_code: row.get(4)?,
                    collector_number: row.get(5)?,
                    set_name: row.get(6)?,
                    quantity: row.get(7)?,
                    language: row.get(8)?,
                    finish: row.get(9)?,
                    condition: row.get(10)?,
                    acquisition_date: row.get(11)?,
                    purchase_price: row.get(12)?,
                    currency: row.get(13)?,
                    location_id: row.get(14)?,
                    location_name: row.get(15)?,
                    notes: row.get(16)?,
                    created_at: row.get(17)?,
                    updated_at: row.get(18)?,
                    collection_ids,
                })
            })?
            .filter_map(Result::ok)
            .collect();

        Ok(items)
    }

    pub fn update_inventory_quantity(
        &self,
        id: &str,
        delta_or_set: i64,
        is_absolute: bool,
    ) -> AppResult<i64> {
        let conn = self.conn.lock().unwrap();
        let now = Utc::now().to_rfc3339();

        let current_quantity: i64 = conn
            .query_row(
                "SELECT quantity FROM inventory_items WHERE id = ?1",
                params![id],
                |row| row.get(0),
            )
            .map_err(|e| match e {
                rusqlite::Error::QueryReturnedNoRows => {
                    AppError::NotFound(format!("Inventory item {id} not found"))
                }
                other => AppError::Database(other),
            })?;

        let new_quantity = if is_absolute {
            delta_or_set
        } else {
            current_quantity + delta_or_set
        };

        if new_quantity < 0 {
            return Err(AppError::Validation(
                "Quantity cannot be negative".to_string(),
            ));
        }

        conn.execute(
            "UPDATE inventory_items SET quantity = ?1, updated_at = ?2 WHERE id = ?3",
            params![new_quantity, now, id],
        )?;

        Ok(new_quantity)
    }

    pub fn delete_inventory_item(&self, id: &str) -> AppResult<()> {
        let conn = self.conn.lock().unwrap();
        let rows = conn.execute("DELETE FROM inventory_items WHERE id = ?1", params![id])?;
        if rows == 0 {
            return Err(AppError::NotFound(format!("Inventory item {id} not found")));
        }
        Ok(())
    }

    // ==========================================
    // Location Operations
    // ==========================================

    pub fn create_location(&self, input: CreateLocationInput) -> AppResult<Location> {
        let trimmed_name = input.name.trim();
        if trimmed_name.is_empty() {
            return Err(AppError::Validation(
                "Location name cannot be empty".to_string(),
            ));
        }

        let conn = self.conn.lock().unwrap();
        let id = Uuid::new_v4().to_string();
        let now = Utc::now().to_rfc3339();

        conn.execute(
            r#"
            INSERT INTO locations (id, name, location_type, parent_id, description, created_at, updated_at)
            VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)
            "#,
            params![
                id,
                trimmed_name,
                input.location_type.trim(),
                input.parent_id,
                input.description.as_deref().map(str::trim),
                now,
                now
            ],
        )?;

        Ok(Location {
            id,
            name: trimmed_name.to_string(),
            location_type: input.location_type.trim().to_string(),
            parent_id: input.parent_id,
            description: input.description.map(|s| s.trim().to_string()),
            created_at: now.clone(),
            updated_at: now,
        })
    }

    pub fn list_locations(&self) -> AppResult<Vec<Location>> {
        let conn = self.conn.lock().unwrap();
        let mut stmt = conn.prepare(
            "SELECT id, name, location_type, parent_id, description, created_at, updated_at FROM locations ORDER BY name ASC",
        )?;

        let locations = stmt
            .query_map([], |row| {
                Ok(Location {
                    id: row.get(0)?,
                    name: row.get(1)?,
                    location_type: row.get(2)?,
                    parent_id: row.get(3)?,
                    description: row.get(4)?,
                    created_at: row.get(5)?,
                    updated_at: row.get(6)?,
                })
            })?
            .filter_map(Result::ok)
            .collect();

        Ok(locations)
    }

    pub fn delete_location(&self, id: &str) -> AppResult<()> {
        let conn = self.conn.lock().unwrap();
        let rows = conn.execute("DELETE FROM locations WHERE id = ?1", params![id])?;
        if rows == 0 {
            return Err(AppError::NotFound(format!("Location {id} not found")));
        }
        Ok(())
    }
}
