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

    /// Search cards by query syntax or name, using cache where appropriate, supporting multilingual search
    pub async fn search_cards(
        &self,
        query: &str,
        page: u32,
        lang: Option<&str>,
    ) -> AppResult<Vec<ScryfallSearchResult>> {
        let trimmed = query.trim();
        if trimmed.is_empty() {
            return Ok(vec![]);
        }

        // Try local cache search first for instant results
        {
            let conn = self.db_conn.lock().unwrap();
            let cached_results = ScryfallCache::search_by_name(&conn, trimmed, lang)?;
            if !cached_results.is_empty() && page <= 1 {
                return Ok(cached_results
                    .iter()
                    .map(|c| c.to_search_result())
                    .collect());
            }
        }

        // Fetch from Scryfall API with multilingual inclusion
        let response = self.client.search_cards(trimmed, page, lang).await?;

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
        if trimmed.is_empty() {
            return Ok(vec![]);
        }

        // 1. Check if the full set of printings was already synchronized into SQLite
        {
            let conn = self.db_conn.lock().unwrap();
            let is_synced = ScryfallCache::is_oracle_synced(&conn, trimmed)?;
            if is_synced {
                let cached_printings = ScryfallCache::get_printings_by_oracle_id(&conn, trimmed)?;
                if !cached_printings.is_empty() {
                    let mut results: Vec<ScryfallSearchResult> = cached_printings
                        .iter()
                        .map(|c| c.to_search_result())
                        .collect();
                    // Prioritize paper printings, then sort by release date descending
                    results.sort_by(|a, b| {
                        b.is_paper
                            .cmp(&a.is_paper)
                            .then_with(|| b.released_at.cmp(&a.released_at))
                    });
                    return Ok(results);
                }
            }
        }

        // 2. Fetch complete paginated printings from Scryfall API
        let printings = self.client.get_printings(trimmed).await?;

        // 3. Save to cache and record oracle synchronization
        if !printings.is_empty() {
            let mut conn = self.db_conn.lock().unwrap();
            let _ = ScryfallCache::save_cards_batch(&mut conn, &printings, DEFAULT_CACHE_TTL_DAYS);
            let _ = ScryfallCache::mark_oracle_synced(&conn, trimmed, printings.len());
        }

        let mut results: Vec<ScryfallSearchResult> =
            printings.iter().map(|c| c.to_search_result()).collect();
        results.sort_by(|a, b| {
            b.is_paper
                .cmp(&a.is_paper)
                .then_with(|| b.released_at.cmp(&a.released_at))
        });
        Ok(results)
    }

    /// Retrieve printings when oracle_id is unavailable, searching by card name
    pub async fn get_printings_by_name(
        &self,
        card_name: &str,
    ) -> AppResult<Vec<ScryfallSearchResult>> {
        let trimmed = card_name.trim();
        if trimmed.is_empty() {
            return Ok(vec![]);
        }

        let query = format!("!\"{}\"", trimmed);
        let printings = self.client.get_printings_by_query(&query).await?;

        if !printings.is_empty() {
            let mut conn = self.db_conn.lock().unwrap();
            let _ = ScryfallCache::save_cards_batch(&mut conn, &printings, DEFAULT_CACHE_TTL_DAYS);
        }

        let mut results: Vec<ScryfallSearchResult> =
            printings.iter().map(|c| c.to_search_result()).collect();
        results.sort_by(|a, b| {
            b.is_paper
                .cmp(&a.is_paper)
                .then_with(|| b.released_at.cmp(&a.released_at))
        });
        Ok(results)
    }

    /// Identify a specific card by set code, collector number, and optional language
    pub async fn identify_by_set_and_number_lang(
        &self,
        set_code: &str,
        collector_number: &str,
        lang: Option<&str>,
    ) -> AppResult<ScryfallCard> {
        // 1. Check local cache
        {
            let conn = self.db_conn.lock().unwrap();
            if let Some(card) =
                ScryfallCache::get_by_set_number_lang(&conn, set_code, collector_number, lang)?
            {
                return Ok(card);
            }
        }

        // 2. Fetch from Scryfall API
        let card = self
            .client
            .get_card_by_set_number_lang(set_code, collector_number, lang)
            .await?;

        // 3. Cache
        {
            let conn = self.db_conn.lock().unwrap();
            let _ = ScryfallCache::save_card(&conn, &card, DEFAULT_CACHE_TTL_DAYS);
        }

        Ok(card)
    }

    /// Identify a specific card by set code and collector number (defaults to English)
    pub async fn identify_by_set_and_number(
        &self,
        set_code: &str,
        collector_number: &str,
    ) -> AppResult<ScryfallCard> {
        self.identify_by_set_and_number_lang(set_code, collector_number, None)
            .await
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
