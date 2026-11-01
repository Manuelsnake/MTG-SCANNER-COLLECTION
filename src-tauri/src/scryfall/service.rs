use std::sync::{Arc, Mutex};

use rusqlite::Connection;

use crate::error::AppResult;
use crate::scryfall::cache::{ScryfallCache, DEFAULT_CACHE_TTL_DAYS};
use crate::scryfall::client::{ReqwestTransport, ScryfallClient, ScryfallTransport};
use crate::scryfall::models::{ScryfallCard, ScryfallSearchResult};

pub struct CardIdentificationService<T: ScryfallTransport = ReqwestTransport> {
    client: ScryfallClient<T>,
    db_conn: Arc<Mutex<Connection>>,
}

impl CardIdentificationService<ReqwestTransport> {
    pub fn new(db_conn: Arc<Mutex<Connection>>) -> Self {
        Self {
            client: ScryfallClient::new(),
            db_conn,
        }
    }
}

impl<T: ScryfallTransport> CardIdentificationService<T> {
    pub fn with_transport(client: ScryfallClient<T>, db_conn: Arc<Mutex<Connection>>) -> Self {
        Self { client, db_conn }
    }

    /// Autocomplete card names
    pub async fn autocomplete(&self, query: &str) -> AppResult<Vec<String>> {
        self.client.autocomplete(query).await
    }

    /// Search cards by query syntax or name, using cache where appropriate
    pub async fn search_cards(
        &self,
        query: &str,
        page: u32,
    ) -> AppResult<Vec<ScryfallSearchResult>> {
        let trimmed = query.trim();
        if trimmed.is_empty() {
            return Ok(vec![]);
        }

        // Try local cache search first for instant results
        {
            let conn = self.db_conn.lock().unwrap();
            let cached_results = ScryfallCache::search_by_name(&conn, trimmed)?;
            if !cached_results.is_empty() && page <= 1 {
                return Ok(cached_results
                    .iter()
                    .map(|c| c.to_search_result())
                    .collect());
            }
        }

        // Fetch from Scryfall API
        let response = self.client.search_cards(trimmed, page).await?;

        // Cache fetched cards in SQLite
        if !response.data.is_empty() {
            let mut conn = self.db_conn.lock().unwrap();
            let _ =
                ScryfallCache::save_cards_batch(&mut conn, &response.data, DEFAULT_CACHE_TTL_DAYS);
        }

        Ok(response.data.iter().map(|c| c.to_search_result()).collect())
    }

    /// Retrieve all printings/editions of a specific card (given oracle_id)
    pub async fn get_printings(&self, oracle_id: &str) -> AppResult<Vec<ScryfallSearchResult>> {
        let trimmed = oracle_id.trim();

        // 1. Check local cache
        {
            let conn = self.db_conn.lock().unwrap();
            let cached_printings = ScryfallCache::get_printings_by_oracle_id(&conn, trimmed)?;
            if !cached_printings.is_empty() {
                return Ok(cached_printings
                    .iter()
                    .map(|c| c.to_search_result())
                    .collect());
            }
        }

        // 2. Fetch from Scryfall API
        let printings = self.client.get_printings(trimmed).await?;

        // 3. Save to cache
        if !printings.is_empty() {
            let mut conn = self.db_conn.lock().unwrap();
            let _ = ScryfallCache::save_cards_batch(&mut conn, &printings, DEFAULT_CACHE_TTL_DAYS);
        }

        Ok(printings.iter().map(|c| c.to_search_result()).collect())
    }

    /// Identify a specific card by set code and collector number (used by OCR, Webcam, Flatbed & Manual)
    pub async fn identify_by_set_and_number(
        &self,
        set_code: &str,
        collector_number: &str,
    ) -> AppResult<ScryfallCard> {
        // 1. Check local cache
        {
            let conn = self.db_conn.lock().unwrap();
            if let Some(card) = ScryfallCache::get_by_set_number(&conn, set_code, collector_number)?
            {
                return Ok(card);
            }
        }

        // 2. Fetch from Scryfall API
        let card = self
            .client
            .get_card_by_set_number(set_code, collector_number)
            .await?;

        // 3. Cache
        {
            let conn = self.db_conn.lock().unwrap();
            let _ = ScryfallCache::save_card(&conn, &card, DEFAULT_CACHE_TTL_DAYS);
        }

        Ok(card)
    }

    /// Identify a card by exact or fuzzy name
    pub async fn identify_by_name(&self, name: &str, exact: bool) -> AppResult<ScryfallCard> {
        let card = if exact {
            self.client.named_exact(name).await?
        } else {
            self.client.named_fuzzy(name).await?
        };

        // Cache
        {
            let conn = self.db_conn.lock().unwrap();
            let _ = ScryfallCache::save_card(&conn, &card, DEFAULT_CACHE_TTL_DAYS);
        }

        Ok(card)
    }
}
