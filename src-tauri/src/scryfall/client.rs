use std::time::{Duration, Instant};

use log::warn;
use reqwest::header::{HeaderMap, HeaderValue, ACCEPT, USER_AGENT};
use reqwest::StatusCode;
use tokio::sync::Mutex;

use crate::error::{AppError, AppResult};
use crate::scryfall::models::{ScryfallAutocomplete, ScryfallCard, ScryfallList};

const BASE_URL: &str = "https://api.scryfall.com";
const USER_AGENT_VALUE: &str =
    "MTGCollectionManager/0.2.0 (https://github.com/Manuelsnake/MTG-SCANNER-COLLECTION)";
const MIN_REQUEST_INTERVAL_MS: u64 = 150; // Conservative ~6.6 req/s to strictly honor Scryfall 5-10 req/s guidelines

pub trait ScryfallTransport: Send + Sync {
    fn get(&self, url: &str) -> impl std::future::Future<Output = AppResult<String>> + Send;
}

pub struct ReqwestTransport {
    client: reqwest::Client,
    last_request: Mutex<Option<Instant>>,
}

impl ReqwestTransport {
    pub fn new() -> Self {
        let mut headers = HeaderMap::new();
        headers.insert(USER_AGENT, HeaderValue::from_static(USER_AGENT_VALUE));
        headers.insert(
            ACCEPT,
            HeaderValue::from_static("application/json;q=0.9,*/*;q=0.8"),
        );

        let client = reqwest::Client::builder()
            .default_headers(headers)
            .timeout(Duration::from_secs(15))
            .build()
            .expect("Failed to initialize Scryfall HTTP client");

        Self {
            client,
            last_request: Mutex::new(None),
        }
    }

    async fn wait_for_rate_limit(&self) {
        let mut last = self.last_request.lock().await;
        let now = Instant::now();
        if let Some(prev) = *last {
            let elapsed = now.duration_since(prev);
            let min_interval = Duration::from_millis(MIN_REQUEST_INTERVAL_MS);
            if elapsed < min_interval {
                let to_wait = min_interval - elapsed;
                tokio::time::sleep(to_wait).await;
            }
        }
        *last = Some(Instant::now());
    }
}

impl Default for ReqwestTransport {
    fn default() -> Self {
        Self::new()
    }
}

impl ScryfallTransport for ReqwestTransport {
    async fn get(&self, url: &str) -> AppResult<String> {
        self.wait_for_rate_limit().await;

        let mut retries = 0;
        loop {
            let res = self.client.get(url).send().await.map_err(|e| {
                AppError::Network(format!("Scryfall network request failed for {url}: {e}"))
            })?;

            let status = res.status();
            if status.is_success() {
                let body = res.text().await.map_err(|e| {
                    AppError::Network(format!("Failed to read Scryfall response body: {e}"))
                })?;
                return Ok(body);
            }

            if status == StatusCode::NOT_FOUND {
                return Err(AppError::NotFound(format!(
                    "Resource not found on Scryfall: {url}"
                )));
            }

            if status == StatusCode::TOO_MANY_REQUESTS && retries < 2 {
                warn!("Scryfall rate limit encountered (HTTP 429), backing off...");
                tokio::time::sleep(Duration::from_millis(1000 * (retries + 1))).await;
                retries += 1;
                continue;
            }

            let error_text = res.text().await.unwrap_or_default();
            return Err(AppError::Scryfall(format!(
                "Scryfall API returned HTTP {status}: {error_text}"
            )));
        }
    }
}

pub struct ScryfallClient<T: ScryfallTransport = ReqwestTransport> {
    transport: T,
}

impl ScryfallClient<ReqwestTransport> {
    pub fn new() -> Self {
        Self {
            transport: ReqwestTransport::new(),
        }
    }
}

impl Default for ScryfallClient<ReqwestTransport> {
    fn default() -> Self {
        Self::new()
    }
}

impl<T: ScryfallTransport> ScryfallClient<T> {
    pub fn with_transport(transport: T) -> Self {
        Self { transport }
    }

    /// Autocomplete card names based on a partial user query
    pub async fn autocomplete(&self, query: &str) -> AppResult<Vec<String>> {
        let trimmed = query.trim();
        if trimmed.is_empty() {
            return Ok(vec![]);
        }

        let encoded = urlencoding::encode(trimmed);
        let url = format!("{BASE_URL}/cards/autocomplete?q={encoded}");

        let raw = self.transport.get(&url).await?;
        let parsed: ScryfallAutocomplete = serde_json::from_str(&raw).map_err(|e| {
            AppError::Scryfall(format!("Failed to parse autocomplete response: {e}"))
        })?;

        Ok(parsed.data)
    }

    /// Search cards by query syntax or card name, with optional language restriction and multilingual inclusion
    pub async fn search_cards(
        &self,
        query: &str,
        page: u32,
        lang: Option<&str>,
    ) -> AppResult<ScryfallList<ScryfallCard>> {
        let trimmed = query.trim();
        if trimmed.is_empty() {
            return Ok(ScryfallList {
                object: "list".to_string(),
                total_cards: Some(0),
                has_more: false,
                next_page: None,
                data: vec![],
            });
        }

        let mut final_query = trimmed.to_string();
        if let Some(l) = lang {
            let clean_lang = l.trim().to_lowercase();
            if !clean_lang.is_empty() && clean_lang != "any" && !trimmed.contains("lang:") {
                final_query = format!("lang:{clean_lang} {trimmed}");
            }
        }

        let p = if page == 0 { 1 } else { page };
        let encoded = urlencoding::encode(&final_query);
        let url = format!("{BASE_URL}/cards/search?q={encoded}&unique=cards&order=name&page={p}&include_multilingual=true");

        let raw = self.transport.get(&url).await?;
        let list: ScryfallList<ScryfallCard> = serde_json::from_str(&raw).map_err(|e| {
            AppError::Scryfall(format!("Failed to parse Scryfall search response: {e}"))
        })?;

        Ok(list)
    }

    /// Retrieve all printings of a card given its oracle_id, supporting pagination and multilingual printings
    pub async fn get_printings(&self, oracle_id: &str) -> AppResult<Vec<ScryfallCard>> {
        let trimmed = oracle_id.trim();
        let encoded = urlencoding::encode(trimmed);
        let mut next_url = Some(format!(
            "{BASE_URL}/cards/search?q=oracle_id%3A{encoded}&unique=prints&order=released&dir=desc&include_multilingual=true"
        ));

        let mut all_printings = Vec::new();
        let mut pages = 0;

        while let Some(url) = next_url {
            let raw = self.transport.get(&url).await?;
            let list: ScryfallList<ScryfallCard> = serde_json::from_str(&raw).map_err(|e| {
                AppError::Scryfall(format!("Failed to parse printings response: {e}"))
            })?;

            all_printings.extend(list.data);
            pages += 1;

            if list.has_more && pages < 10 {
                next_url = list.next_page;
            } else {
                next_url = None;
            }
        }

        Ok(all_printings)
    }

    /// Retrieve printings directly from a Scryfall search query with pagination
    pub async fn get_printings_by_query(&self, query: &str) -> AppResult<Vec<ScryfallCard>> {
        let trimmed = query.trim();
        let encoded = urlencoding::encode(trimmed);
        let mut next_url = Some(format!(
            "{BASE_URL}/cards/search?q={encoded}&unique=prints&order=released&dir=desc&include_multilingual=true"
        ));

        let mut all_printings = Vec::new();
        let mut pages = 0;

        while let Some(url) = next_url {
            let raw = self.transport.get(&url).await?;
            let list: ScryfallList<ScryfallCard> = serde_json::from_str(&raw).map_err(|e| {
                AppError::Scryfall(format!("Failed to parse printings query response: {e}"))
            })?;

            all_printings.extend(list.data);
            pages += 1;

            if list.has_more && pages < 10 {
                next_url = list.next_page;
            } else {
                next_url = None;
            }
        }

        Ok(all_printings)
    }

    /// Retrieve exact card printing by set code, collector number, and optional language
    pub async fn get_card_by_set_number_lang(
        &self,
        set: &str,
        number: &str,
        lang: Option<&str>,
    ) -> AppResult<ScryfallCard> {
        let s = set.trim().to_lowercase();
        let n = number.trim();
        let url = if let Some(l) = lang {
            let clean_lang = l.trim().to_lowercase();
            if !clean_lang.is_empty() && clean_lang != "en" && clean_lang != "any" {
                format!("{BASE_URL}/cards/{s}/{n}/{clean_lang}")
            } else {
                format!("{BASE_URL}/cards/{s}/{n}")
            }
        } else {
            format!("{BASE_URL}/cards/{s}/{n}")
        };

        let raw = self.transport.get(&url).await?;
        let card: ScryfallCard = serde_json::from_str(&raw).map_err(|e| {
            AppError::Scryfall(format!("Failed to parse card printing response: {e}"))
        })?;

        Ok(card)
    }

    /// Retrieve exact card printing by set code and collector number (defaults to English)
    pub async fn get_card_by_set_number(&self, set: &str, number: &str) -> AppResult<ScryfallCard> {
        self.get_card_by_set_number_lang(set, number, None).await
    }

    /// Retrieve card by exact Scryfall UUID
    pub async fn get_card_by_id(&self, scryfall_id: &str) -> AppResult<ScryfallCard> {
        let id = scryfall_id.trim();
        let url = format!("{BASE_URL}/cards/{id}");

        let raw = self.transport.get(&url).await?;
        let card: ScryfallCard = serde_json::from_str(&raw)
            .map_err(|e| AppError::Scryfall(format!("Failed to parse card ID response: {e}")))?;

        Ok(card)
    }

    /// Search card by exact name
    pub async fn named_exact(&self, name: &str) -> AppResult<ScryfallCard> {
        let encoded = urlencoding::encode(name.trim());
        let url = format!("{BASE_URL}/cards/named?exact={encoded}");

        let raw = self.transport.get(&url).await?;
        let card: ScryfallCard = serde_json::from_str(&raw).map_err(|e| {
            AppError::Scryfall(format!("Failed to parse named exact response: {e}"))
        })?;

        Ok(card)
    }

    /// Search card by fuzzy name
    pub async fn named_fuzzy(&self, name: &str) -> AppResult<ScryfallCard> {
        let encoded = urlencoding::encode(name.trim());
        let url = format!("{BASE_URL}/cards/named?fuzzy={encoded}");

        let raw = self.transport.get(&url).await?;
        let card: ScryfallCard = serde_json::from_str(&raw).map_err(|e| {
            AppError::Scryfall(format!("Failed to parse named fuzzy response: {e}"))
        })?;

        Ok(card)
    }
}
