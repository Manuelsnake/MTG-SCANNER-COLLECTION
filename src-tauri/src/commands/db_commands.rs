use std::sync::Arc;
use tauri::State;

use crate::db::{Database, DatabaseInfo};
use crate::error::AppResult;

#[tauri::command]
pub fn get_db_info(db: State<'_, Arc<Database>>) -> AppResult<DatabaseInfo> {
    db.get_info()
}

#[tauri::command]
pub fn verify_integrity(db: State<'_, Arc<Database>>) -> AppResult<String> {
    db.verify_integrity()
}
