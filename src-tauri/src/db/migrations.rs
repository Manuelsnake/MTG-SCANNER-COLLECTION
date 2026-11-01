use chrono::Utc;
use log::info;
use rusqlite::{params, Connection, Transaction};

use crate::db::schema::{
    CREATE_MIGRATIONS_TABLE, MIGRATION_001_INITIAL_SCHEMA, MIGRATION_002_SCRYFALL_CACHE,
    MIGRATION_003_IMAGE_METADATA_AND_SYNC,
};
use crate::error::{AppError, AppResult};

pub struct Migration {
    pub version: i64,
    pub name: &'static str,
    pub sql: &'static str,
}

pub const ALL_MIGRATIONS: &[Migration] = &[
    Migration {
        version: 1,
        name: "001_initial_schema",
        sql: MIGRATION_001_INITIAL_SCHEMA,
    },
    Migration {
        version: 2,
        name: "002_scryfall_cache",
        sql: MIGRATION_002_SCRYFALL_CACHE,
    },
    Migration {
        version: 3,
        name: "003_image_metadata_and_sync",
        sql: MIGRATION_003_IMAGE_METADATA_AND_SYNC,
    },
];

pub fn run_migrations(conn: &mut Connection) -> AppResult<i64> {
    // 1. Ensure migrations tracking table exists
    conn.execute_batch(CREATE_MIGRATIONS_TABLE)
        .map_err(|e| AppError::Migration(format!("Failed to create migrations table: {e}")))?;

    // 2. Fetch applied versions (scoped so stmt is dropped before starting transactions)
    let applied_versions: Vec<i64> = {
        let mut stmt = conn
            .prepare("SELECT version FROM schema_migrations ORDER BY version ASC")
            .map_err(|e| AppError::Migration(format!("Failed to prepare migrations query: {e}")))?;

        let rows = stmt
            .query_map([], |row| row.get(0))
            .map_err(|e| AppError::Migration(format!("Failed to fetch applied migrations: {e}")))?;

        rows.flatten().collect()
    };

    let mut current_version = applied_versions.last().copied().unwrap_or(0);

    // 3. Apply pending migrations sequentially inside transactions
    for migration in ALL_MIGRATIONS {
        if !applied_versions.contains(&migration.version) {
            info!(
                "Applying database migration {}: {}",
                migration.version, migration.name
            );

            let tx = conn
                .transaction()
                .map_err(|e| AppError::Migration(format!("Failed to start transaction: {e}")))?;

            apply_single_migration(&tx, migration)?;

            tx.commit()
                .map_err(|e| AppError::Migration(format!("Failed to commit transaction: {e}")))?;

            current_version = migration.version;
        }
    }

    Ok(current_version)
}

fn apply_single_migration(tx: &Transaction, migration: &Migration) -> AppResult<()> {
    tx.execute_batch(migration.sql).map_err(|e| {
        AppError::Migration(format!(
            "Failed executing migration {} ({}): {e}",
            migration.version, migration.name
        ))
    })?;

    let now = Utc::now().to_rfc3339();
    tx.execute(
        "INSERT INTO schema_migrations (version, name, applied_at) VALUES (?1, ?2, ?3)",
        params![migration.version, migration.name, now],
    )
    .map_err(|e| {
        AppError::Migration(format!(
            "Failed to record migration {}: {e}",
            migration.version
        ))
    })?;

    tx.execute_batch(&format!("PRAGMA user_version = {};", migration.version))
        .map_err(|e| {
            AppError::Migration(format!(
                "Failed to update user_version for {}: {e}",
                migration.version
            ))
        })?;

    Ok(())
}
