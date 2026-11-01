use std::fs;
use std::path::{Path, PathBuf};
use std::time::Duration;

use base64::engine::general_purpose::STANDARD as BASE64_STANDARD;
use base64::Engine;
use log::{info, warn};
use reqwest::header::{HeaderMap, HeaderValue, ACCEPT, USER_AGENT};
use serde::{Deserialize, Serialize};

use crate::error::{AppError, AppResult};

const USER_AGENT_VALUE: &str =
    "MTGCollectionManager/0.2.0 (https://github.com/Manuelsnake/MTG-SCANNER-COLLECTION)";

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ImageCacheStats {
    pub total_images: u32,
    pub total_bytes: u64,
    pub cache_dir: String,
}

pub struct ImageCacheManager {
    cache_dir: PathBuf,
    http_client: reqwest::Client,
}

impl ImageCacheManager {
    pub fn new(app_data_dir: &Path) -> Self {
        let cache_dir = app_data_dir.join("image_cache");
        if let Err(e) = fs::create_dir_all(&cache_dir) {
            warn!(
                "Failed to create image cache directory at {}: {e}",
                cache_dir.display()
            );
        }

        let mut headers = HeaderMap::new();
        headers.insert(USER_AGENT, HeaderValue::from_static(USER_AGENT_VALUE));
        headers.insert(
            ACCEPT,
            HeaderValue::from_static("image/jpeg,image/webp,image/*,*/*;q=0.8"),
        );

        let http_client = reqwest::Client::builder()
            .default_headers(headers)
            .timeout(Duration::from_secs(20))
            .build()
            .unwrap_or_default();

        Self {
            cache_dir,
            http_client,
        }
    }

    /// Construct the canonical local path for a card image
    pub fn get_file_path(&self, scryfall_id: &str, size: &str) -> PathBuf {
        let clean_id = scryfall_id.trim();
        let clean_size = if size.trim().is_empty() {
            "normal"
        } else {
            size.trim()
        };
        self.cache_dir.join(format!("{clean_id}_{clean_size}.jpg"))
    }

    /// Check if a cached image exists and is non-empty
    pub fn has_image(&self, scryfall_id: &str, size: &str) -> bool {
        let path = self.get_file_path(scryfall_id, size);
        path.is_file() && fs::metadata(&path).map(|m| m.len() > 0).unwrap_or(false)
    }

    /// Retrieve cached image as data URL (data:image/jpeg;base64,...)
    pub fn get_base64(&self, scryfall_id: &str, size: &str) -> Option<String> {
        let path = self.get_file_path(scryfall_id, size);
        if path.is_file() {
            if let Ok(bytes) = fs::read(&path) {
                if !bytes.is_empty() {
                    let encoded = BASE64_STANDARD.encode(&bytes);
                    return Some(format!("data:image/jpeg;base64,{encoded}"));
                }
            }
        }
        None
    }

    /// Save image bytes to disk safely
    pub fn save_image_bytes(
        &self,
        scryfall_id: &str,
        size: &str,
        bytes: &[u8],
    ) -> AppResult<PathBuf> {
        let target_path = self.get_file_path(scryfall_id, size);
        let tmp_path = target_path.with_extension("tmp");

        fs::write(&tmp_path, bytes).map_err(|e| {
            AppError::Io(format!(
                "Failed to write temporary image file {}: {e}",
                tmp_path.display()
            ))
        })?;

        fs::rename(&tmp_path, &target_path).map_err(|e| {
            AppError::Io(format!(
                "Failed to finalize image file {}: {e}",
                target_path.display()
            ))
        })?;

        Ok(target_path)
    }

    /// Download and cache an image from a remote URL
    pub async fn download_and_cache(
        &self,
        scryfall_id: &str,
        url: &str,
        size: &str,
    ) -> AppResult<PathBuf> {
        if self.has_image(scryfall_id, size) {
            return Ok(self.get_file_path(scryfall_id, size));
        }

        let resp = self.http_client.get(url).send().await.map_err(|e| {
            AppError::Network(format!("Failed to download card image from {url}: {e}"))
        })?;

        if !resp.status().is_success() {
            return Err(AppError::Network(format!(
                "HTTP error {} while downloading image from {url}",
                resp.status()
            )));
        }

        let bytes = resp.bytes().await.map_err(|e| {
            AppError::Network(format!("Failed to read image bytes from {url}: {e}"))
        })?;

        self.save_image_bytes(scryfall_id, size, &bytes)
    }

    /// Get cached image data or download and return base64
    pub async fn get_or_download_base64(
        &self,
        scryfall_id: &str,
        url: &str,
        size: &str,
    ) -> AppResult<String> {
        if let Some(data_url) = self.get_base64(scryfall_id, size) {
            return Ok(data_url);
        }

        // Download and cache
        let path = self.download_and_cache(scryfall_id, url, size).await?;
        let bytes = fs::read(&path).map_err(|e| {
            AppError::Io(format!(
                "Failed to read newly cached image {}: {e}",
                path.display()
            ))
        })?;
        let encoded = BASE64_STANDARD.encode(&bytes);
        Ok(format!("data:image/jpeg;base64,{encoded}"))
    }

    /// Retrieve image as base64 data URI, downloading if remote URL is provided and not yet cached.
    pub async fn get_image(
        &self,
        scryfall_id: &str,
        remote_url: Option<&str>,
        size: &str,
    ) -> AppResult<Option<String>> {
        if let Some(cached) = self.get_base64(scryfall_id, size) {
            return Ok(Some(cached));
        }
        if let Some(url) = remote_url {
            let trimmed = url.trim();
            if !trimmed.is_empty() {
                match self.download_and_cache(scryfall_id, trimmed, size).await {
                    Ok(_) => return Ok(self.get_base64(scryfall_id, size)),
                    Err(e) => {
                        warn!("Could not download and cache image for {scryfall_id}: {e}");
                        return Ok(None);
                    }
                }
            }
        }
        Ok(None)
    }

    /// Clear all cached image files on disk
    pub fn clear_cache(&self) -> AppResult<u32> {
        let mut count = 0;
        if self.cache_dir.is_dir() {
            let entries = fs::read_dir(&self.cache_dir)
                .map_err(|e| AppError::Io(format!("Failed to read image cache dir: {e}")))?;

            for entry in entries.flatten() {
                let path = entry.path();
                if path.is_file()
                    && path.extension().and_then(|s| s.to_str()) == Some("jpg")
                    && fs::remove_file(&path).is_ok()
                {
                    count += 1;
                }
            }
        }
        info!("Cleared {count} image files from image cache");
        Ok(count)
    }

    /// Retrieve cache statistics
    pub fn cache_stats(&self) -> AppResult<ImageCacheStats> {
        let mut count = 0;
        let mut total_bytes = 0;

        if self.cache_dir.is_dir() {
            if let Ok(entries) = fs::read_dir(&self.cache_dir) {
                for entry in entries.flatten() {
                    let path = entry.path();
                    if path.is_file() {
                        if let Ok(meta) = entry.metadata() {
                            count += 1;
                            total_bytes += meta.len();
                        }
                    }
                }
            }
        }

        Ok(ImageCacheStats {
            total_images: count,
            total_bytes,
            cache_dir: self.cache_dir.to_string_lossy().to_string(),
        })
    }
}
