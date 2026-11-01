use std::sync::Arc;
use tauri::State;

use crate::db::Database;
use crate::error::AppResult;
use crate::models::{AddManualCardInput, AddScryfallCardInput, InventoryItemDetail};

#[tauri::command]
pub fn add_manual_card(
    input: AddManualCardInput,
    db: State<'_, Arc<Database>>,
) -> AppResult<InventoryItemDetail> {
    db.add_manual_card(input)
}

#[tauri::command]
pub fn add_card_from_scryfall(
    input: AddScryfallCardInput,
    db: State<'_, Arc<Database>>,
) -> AppResult<InventoryItemDetail> {
    db.add_card_from_scryfall(input)
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

#[tauri::command]
pub async fn heal_inventory_images(
    db: State<'_, Arc<Database>>,
    service: State<'_, Arc<crate::scryfall::CardIdentificationService>>,
    cache: State<'_, Arc<crate::image_cache::ImageCacheManager>>,
) -> AppResult<u32> {
    // 1. Fast path: auto-heal anything already present in local SQLite scryfall_cache
    let cached_healed = db.backfill_inventory_metadata_from_cache()?;

    // 2. Identify remaining unhealed printings in inventory
    let unhealed = db.get_unhealed_printings()?;
    if unhealed.is_empty() {
        return Ok(cached_healed);
    }

    let mut newly_healed = 0;
    for (printing_id, set_code, collector_number, lang) in unhealed {
        let lang_opt = if lang.is_empty() || lang == "en" {
            None
        } else {
            Some(lang.as_str())
        };

        match service
            .identify_by_set_and_number_lang(&set_code, &collector_number, lang_opt)
            .await
        {
            Ok(card) => {
                if let Err(e) = db.update_printing_with_scryfall(&printing_id, &card) {
                    log::warn!("Failed to update printing {printing_id} during heal: {e}");
                    continue;
                }
                newly_healed += 1;

                // Pre-download image into cache
                if let Some(url) = card.get_image_url("normal") {
                    let _ = cache.download_and_cache(&card.id, &url, "normal").await;
                }
                if let Some(url) = card.get_image_url("small") {
                    let _ = cache.download_and_cache(&card.id, &url, "small").await;
                }
            }
            Err(e) => {
                log::warn!(
                    "Could not identify card {set_code} #{collector_number} during heal: {e}"
                );
            }
        }
    }

    Ok(cached_healed + newly_healed)
}
