use std::sync::Arc;
use tauri::State;

use crate::error::AppResult;
use crate::image_cache::{ImageCacheManager, ImageCacheStats};

#[tauri::command]
pub async fn get_card_image(
    scryfall_id: String,
    remote_url: Option<String>,
    size: Option<String>,
    cache: State<'_, Arc<ImageCacheManager>>,
) -> AppResult<Option<String>> {
    let size_str = size.as_deref().unwrap_or("normal");
    cache
        .get_image(&scryfall_id, remote_url.as_deref(), size_str)
        .await
}

#[tauri::command]
pub async fn clear_card_image_cache(cache: State<'_, Arc<ImageCacheManager>>) -> AppResult<u32> {
    cache.clear_cache()
}

#[tauri::command]
pub async fn get_card_image_cache_stats(
    cache: State<'_, Arc<ImageCacheManager>>,
) -> AppResult<ImageCacheStats> {
    cache.cache_stats()
}
