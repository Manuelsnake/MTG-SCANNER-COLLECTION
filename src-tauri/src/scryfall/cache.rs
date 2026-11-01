use chrono::{Duration, Utc};
use log::debug;
use rusqlite::{params, Connection, OptionalExtension};

use crate::error::AppResult;
use crate::scryfall::models::ScryfallCard;

pub const DEFAULT_CACHE_TTL_DAYS: i64 = 7;

pub struct ScryfallCache;

impl ScryfallCache {
    /// Retrieve a cached card by its Scryfall UUID
    pub fn get_by_scryfall_id(
        conn: &Connection,
        scryfall_id: &str,
    ) -> AppResult<Option<ScryfallCard>> {
        let now = Utc::now().to_rfc3339();
        let raw_json: Option<String> = conn
            .query_row(
                "SELECT raw_json FROM scryfall_cache WHERE scryfall_id = ?1 AND expires_at > ?2",
                params![scryfall_id, now],
                |row| row.get(0),
            )
            .optional()?;

        if let Some(json) = raw_json {
            if let Ok(card) = serde_json::from_str::<ScryfallCard>(&json) {
                debug!("Cache HIT for Scryfall ID: {scryfall_id}");
                return Ok(Some(card));
            }
        }

        Ok(None)
    }

    /// Retrieve a cached card by set code and collector number
    pub fn get_by_set_number(
        conn: &Connection,
        set_code: &str,
        collector_number: &str,
    ) -> AppResult<Option<ScryfallCard>> {
        let now = Utc::now().to_rfc3339();
        let s = set_code.trim().to_lowercase();
        let n = collector_number.trim();

        let raw_json: Option<String> = conn
            .query_row(
                "SELECT raw_json FROM scryfall_cache WHERE LOWER(set_code) = ?1 AND collector_number = ?2 AND expires_at > ?3",
                params![s, n, now],
                |row| row.get(0),
            )
            .optional()?;

        if let Some(json) = raw_json {
            if let Ok(card) = serde_json::from_str::<ScryfallCard>(&json) {
                debug!("Cache HIT for {s}/{n}");
                return Ok(Some(card));
            }
        }

        Ok(None)
    }

    /// Retrieve all cached printings for a given oracle_id
    pub fn get_printings_by_oracle_id(
        conn: &Connection,
        oracle_id: &str,
    ) -> AppResult<Vec<ScryfallCard>> {
        let now = Utc::now().to_rfc3339();
        let mut stmt = conn.prepare(
            "SELECT raw_json FROM scryfall_cache WHERE oracle_id = ?1 AND expires_at > ?2 ORDER BY released_at DESC",
        )?;

        let cards = stmt
            .query_map(params![oracle_id, now], |row| {
                let json: String = row.get(0)?;
                Ok(json)
            })?
            .filter_map(Result::ok)
            .filter_map(|json| serde_json::from_str::<ScryfallCard>(&json).ok())
            .collect();

        Ok(cards)
    }

    /// Search cached cards by normalized name
    pub fn search_by_name(conn: &Connection, query: &str) -> AppResult<Vec<ScryfallCard>> {
        let now = Utc::now().to_rfc3339();
        let norm = query.trim().to_lowercase();
        if norm.is_empty() {
            return Ok(vec![]);
        }

        let pattern = format!("%{norm}%");
        let mut stmt = conn.prepare(
            r#"
            SELECT raw_json FROM scryfall_cache 
            WHERE name_normalized LIKE ?1 AND expires_at > ?2
            GROUP BY oracle_id
            ORDER BY name ASC
            LIMIT 30
            "#,
        )?;

        let cards = stmt
            .query_map(params![pattern, now], |row| {
                let json: String = row.get(0)?;
                Ok(json)
            })?
            .filter_map(Result::ok)
            .filter_map(|json| serde_json::from_str::<ScryfallCard>(&json).ok())
            .collect();

        Ok(cards)
    }

    /// Save a single card into the cache
    pub fn save_card(conn: &Connection, card: &ScryfallCard, ttl_days: i64) -> AppResult<()> {
        let now = Utc::now();
        let expires_at = (now + Duration::days(ttl_days)).to_rfc3339();
        let cached_at = now.to_rfc3339();

        let raw_json = serde_json::to_string(card).map_err(|e| {
            crate::error::AppError::Internal(format!("Failed to serialize ScryfallCard: {e}"))
        })?;

        let colors_json = serde_json::to_string(&card.colors.clone().unwrap_or_default())
            .unwrap_or_else(|_| "[]".to_string());
        let finishes_json =
            serde_json::to_string(&card.finishes).unwrap_or_else(|_| "[]".to_string());

        conn.execute(
            r#"
            INSERT OR REPLACE INTO scryfall_cache (
                scryfall_id, oracle_id, name, name_normalized, set_code, collector_number,
                set_name, released_at, rarity, mana_cost, type_line, colors,
                image_small, image_normal, image_large, image_art_crop,
                finishes, price_eur, price_eur_foil, raw_json, cached_at, expires_at
            ) VALUES (
                ?1, ?2, ?3, ?4, ?5, ?6,
                ?7, ?8, ?9, ?10, ?11, ?12,
                ?13, ?14, ?15, ?16,
                ?17, ?18, ?19, ?20, ?21, ?22
            )
            "#,
            params![
                card.id,
                card.oracle_id,
                card.name,
                card.name.to_lowercase(),
                card.set.to_lowercase(),
                card.collector_number,
                card.set_name,
                card.released_at,
                card.rarity,
                card.mana_cost,
                card.type_line,
                colors_json,
                card.get_image_url("small"),
                card.get_image_url("normal"),
                card.get_image_url("large"),
                card.get_image_url("art_crop"),
                finishes_json,
                card.get_eur_cents(),
                card.get_eur_foil_cents(),
                raw_json,
                cached_at,
                expires_at
            ],
        )?;

        Ok(())
    }

    /// Save a batch of cards into the cache
    pub fn save_cards_batch(
        conn: &mut Connection,
        cards: &[ScryfallCard],
        ttl_days: i64,
    ) -> AppResult<()> {
        let tx = conn.transaction()?;
        for card in cards {
            let now = Utc::now();
            let expires_at = (now + Duration::days(ttl_days)).to_rfc3339();
            let cached_at = now.to_rfc3339();

            let raw_json = serde_json::to_string(card).map_err(|e| {
                crate::error::AppError::Internal(format!("Failed to serialize ScryfallCard: {e}"))
            })?;

            let colors_json = serde_json::to_string(&card.colors.clone().unwrap_or_default())
                .unwrap_or_else(|_| "[]".to_string());
            let finishes_json =
                serde_json::to_string(&card.finishes).unwrap_or_else(|_| "[]".to_string());

            tx.execute(
                r#"
                INSERT OR REPLACE INTO scryfall_cache (
                    scryfall_id, oracle_id, name, name_normalized, set_code, collector_number,
                    set_name, released_at, rarity, mana_cost, type_line, colors,
                    image_small, image_normal, image_large, image_art_crop,
                    finishes, price_eur, price_eur_foil, raw_json, cached_at, expires_at
                ) VALUES (
                    ?1, ?2, ?3, ?4, ?5, ?6,
                    ?7, ?8, ?9, ?10, ?11, ?12,
                    ?13, ?14, ?15, ?16,
                    ?17, ?18, ?19, ?20, ?21, ?22
                )
                "#,
                params![
                    card.id,
                    card.oracle_id,
                    card.name,
                    card.name.to_lowercase(),
                    card.set.to_lowercase(),
                    card.collector_number,
                    card.set_name,
                    card.released_at,
                    card.rarity,
                    card.mana_cost,
                    card.type_line,
                    colors_json,
                    card.get_image_url("small"),
                    card.get_image_url("normal"),
                    card.get_image_url("large"),
                    card.get_image_url("art_crop"),
                    finishes_json,
                    card.get_eur_cents(),
                    card.get_eur_foil_cents(),
                    raw_json,
                    cached_at,
                    expires_at
                ],
            )?;
        }
        tx.commit()?;
        Ok(())
    }

    /// Purge expired cache entries
    pub fn purge_expired(conn: &Connection) -> AppResult<usize> {
        let now = Utc::now().to_rfc3339();
        let count = conn.execute(
            "DELETE FROM scryfall_cache WHERE expires_at <= ?1",
            params![now],
        )?;
        Ok(count)
    }
}
