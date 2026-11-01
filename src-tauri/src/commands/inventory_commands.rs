use std::sync::Arc;
use tauri::State;

use crate::db::Database;
use crate::error::AppResult;
use crate::models::{AddManualCardInput, InventoryItemDetail};

#[tauri::command]
pub fn add_manual_card(
    input: AddManualCardInput,
    db: State<'_, Arc<Database>>,
) -> AppResult<InventoryItemDetail> {
    db.add_manual_card(input)
}

#[tauri::command]
pub fn get_inventory_items(
    search: Option<String>,
    collection_id: Option<String>,
    db: State<'_, Arc<Database>>,
) -> AppResult<Vec<InventoryItemDetail>> {
    db.get_inventory_items(search.as_deref(), collection_id.as_deref())
}

#[tauri::command]
pub fn update_inventory_quantity(
    id: String,
    delta_or_set: i64,
    is_absolute: bool,
    db: State<'_, Arc<Database>>,
) -> AppResult<i64> {
    db.update_inventory_quantity(&id, delta_or_set, is_absolute)
}

#[tauri::command]
pub fn delete_inventory_item(id: String, db: State<'_, Arc<Database>>) -> AppResult<()> {
    db.delete_inventory_item(&id)
}
