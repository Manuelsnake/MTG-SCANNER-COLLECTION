use std::sync::Arc;
use tauri::State;

use crate::db::Database;
use crate::error::AppResult;
use crate::models::{Collection, CollectionSummary, CreateCollectionInput, RenameCollectionInput};

#[tauri::command]
pub fn create_collection(
    input: CreateCollectionInput,
    db: State<'_, Arc<Database>>,
) -> AppResult<Collection> {
    db.create_collection(&input.name, input.description.as_deref())
}

#[tauri::command]
pub fn list_collections(db: State<'_, Arc<Database>>) -> AppResult<Vec<CollectionSummary>> {
    db.list_collections()
}

#[tauri::command]
pub fn rename_collection(
    input: RenameCollectionInput,
    db: State<'_, Arc<Database>>,
) -> AppResult<Collection> {
    db.rename_collection(&input.id, &input.name, input.description.as_deref())
}

#[tauri::command]
pub fn delete_collection(id: String, db: State<'_, Arc<Database>>) -> AppResult<()> {
    db.delete_collection(&id)
}

#[tauri::command]
pub fn assign_to_collection(
    collection_id: String,
    inventory_item_id: String,
    db: State<'_, Arc<Database>>,
) -> AppResult<()> {
    db.assign_to_collection(&collection_id, &inventory_item_id)
}

#[tauri::command]
pub fn remove_from_collection(
    collection_id: String,
    inventory_item_id: String,
    db: State<'_, Arc<Database>>,
) -> AppResult<()> {
    db.remove_from_collection(&collection_id, &inventory_item_id)
}
