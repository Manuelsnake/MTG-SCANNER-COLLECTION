use std::sync::Arc;
use tauri::State;

use crate::error::AppResult;
use crate::scryfall::models::{ScryfallCard, ScryfallSearchResult};
use crate::scryfall::CardIdentificationService;

#[tauri::command]
pub async fn scryfall_autocomplete(
    query: String,
    service: State<'_, Arc<CardIdentificationService>>,
) -> AppResult<Vec<String>> {
    service.autocomplete(&query).await
}

#[tauri::command]
pub async fn scryfall_search(
    query: String,
    page: Option<u32>,
    service: State<'_, Arc<CardIdentificationService>>,
) -> AppResult<Vec<ScryfallSearchResult>> {
    service.search_cards(&query, page.unwrap_or(1)).await
}

#[tauri::command]
pub async fn scryfall_get_printings(
    oracle_id: String,
    service: State<'_, Arc<CardIdentificationService>>,
) -> AppResult<Vec<ScryfallSearchResult>> {
    service.get_printings(&oracle_id).await
}

#[tauri::command]
pub async fn scryfall_get_card(
    set_code: String,
    collector_number: String,
    service: State<'_, Arc<CardIdentificationService>>,
) -> AppResult<ScryfallCard> {
    service
        .identify_by_set_and_number(&set_code, &collector_number)
        .await
}
