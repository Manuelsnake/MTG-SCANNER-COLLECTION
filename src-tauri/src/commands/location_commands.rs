use std::sync::Arc;
use tauri::State;

use crate::db::Database;
use crate::error::AppResult;
use crate::models::{CreateLocationInput, Location};

#[tauri::command]
pub fn create_location(
    input: CreateLocationInput,
    db: State<'_, Arc<Database>>,
) -> AppResult<Location> {
    db.create_location(input)
}

#[tauri::command]
pub fn list_locations(db: State<'_, Arc<Database>>) -> AppResult<Vec<Location>> {
    db.list_locations()
}

#[tauri::command]
pub fn delete_location(id: String, db: State<'_, Arc<Database>>) -> AppResult<()> {
    db.delete_location(&id)
}
