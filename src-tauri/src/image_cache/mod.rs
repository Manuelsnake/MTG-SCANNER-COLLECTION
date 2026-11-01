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

    /// Check if an exact cached image exists and is non-empty
    pub fn has_image(&self, scryfall_id: &str, size: &str) -> bool {
        let path = self.get_file_path(scryfall_id, size);
        path.is_file() && fs::metadata(&path).map(|m| m.len() > 0).unwrap_or(false)
    }

    /// Check if any cached image exists for this card, returning the path and size found
    pub fn find_cached_image(
        &self,
        scryfall_id: &str,
        preferred_size: &str,
    ) -> Option<(PathBuf, String)> {
        let clean_id = scryfall_id.trim();
        if clean_id.is_empty() {
            return None;
        }

        // Size fallback hierarchy based on preferred size
        let sizes_to_check: &[&str] = match preferred_size {
            "small" => &["small", "normal", "large", "art_crop", "png"],
            "large" => &["large", "normal", "small", "art_crop", "png"],
            "art_crop" => &["art_crop", "normal", "large", "small", "png"],
            _ => &["normal", "large", "small", "art_crop", "png"],
        };

        for &size in sizes_to_check {
            let path = self.get_file_path(clean_id, size);
            if path.is_file() && fs::metadata(&path).map(|m| m.len() > 0).unwrap_or(false) {
                return Some((path, size.to_string()));
            }
        }

        None
    }

    /// Retrieve cached image as data URL (data:image/jpeg;base64,...), with fallback across sizes
    pub fn get_base64_with_fallback(
        &self,
        scryfall_id: &str,
        preferred_size: &str,
    ) -> Option<String> {
        if let Some((path, _)) = self.find_cached_image(scryfall_id, preferred_size) {
            if let Ok(bytes) = fs::read(&path) {
                if !bytes.is_empty() {
                    let encoded = BASE64_STANDARD.encode(&bytes);
                    return Some(format!("data:image/jpeg;base64,{encoded}"));
                }
            }
        }
        None
    }

    /// Retrieve cached image as data URL (data:image/jpeg;base64,...)
    pub fn get_base64(&self, scryfall_id: &str, size: &str) -> Option<String> {
        self.get_base64_with_fallback(scryfall_id, size)
    }

    /// Save image bytes to disk safely using unique temporary file name to prevent concurrency locks
    pub fn save_image_bytes(
        &self,
        scryfall_id: &str,
        size: &str,
        bytes: &[u8],
    ) -> AppResult<PathBuf> {
        let clean_id = scryfall_id.trim();
        let clean_size = if size.trim().is_empty() {
            "normal"
        } else {
            size.trim()
        };
        let target_path = self.get_file_path(clean_id, clean_size);
        let tmp_file_name = format!("{clean_id}_{clean_size}_{}.tmp", uuid::Uuid::new_v4());
        let tmp_path = self.cache_dir.join(tmp_file_name);

        fs::write(&tmp_path, bytes).map_err(|e| {
            AppError::Io(format!(
                "Failed to write temporary image file {}: {e}",
                tmp_path.display()
            ))
        })?;

        if let Err(e) = fs::rename(&tmp_path, &target_path) {
            // If target already exists and is valid on Windows, clean up temp file and succeed
            if target_path.is_file()
                && fs::metadata(&target_path)
                    .map(|m| m.len() > 0)
                    .unwrap_or(false)
            {
                let _ = fs::remove_file(&tmp_path);
                return Ok(target_path);
            }
            return Err(AppError::Io(format!(
                "Failed to finalize image file {}: {e}",
                target_path.display()
            )));
        }

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
    /// Supports multi-tier size fallback and direct Scryfall CDN recovery.
    pub async fn get_image(
        &self,
        scryfall_id: &str,
        remote_url: Option<&str>,
        size: &str,
    ) -> AppResult<Option<String>> {
        let clean_id = scryfall_id.trim();
        if clean_id.is_empty() {
            return Ok(None);
        }

        // 1. If any cached version of this card exists on disk, return it immediately
        if let Some(cached) = self.get_base64_with_fallback(clean_id, size) {
            return Ok(Some(cached));
        }

        // 2. If remote_url is provided, attempt download and caching
        if let Some(url) = remote_url {
            let trimmed = url.trim();
            if !trimmed.is_empty() {
                match self.download_and_cache(clean_id, trimmed, size).await {
                    Ok(_) => return Ok(self.get_base64_with_fallback(clean_id, size)),
                    Err(e) => {
                        warn!(
                            "Could not download and cache image for {clean_id} from {trimmed}: {e}"
                        );
                    }
                }
            }
        }

        // 3. Scryfall CDN fallback: If no remote_url was provided or download failed,
        // construct canonical Scryfall CDN front face URL if clean_id is a 36-char UUID.
        if clean_id.len() == 36 && clean_id.chars().all(|c| c.is_ascii_hexdigit() || c == '-') {
            let c1 = &clean_id[0..1];
            let c2 = &clean_id[1..2];
            let cdn_size = match size {
                "small" => "small",
                "large" => "large",
                "art_crop" => "art_crop",
                _ => "normal",
            };
            let cdn_url =
                format!("https://cards.scryfall.io/{cdn_size}/front/{c1}/{c2}/{clean_id}.jpg");
            if self
                .download_and_cache(clean_id, &cdn_url, size)
                .await
                .is_ok()
            {
                return Ok(self.get_base64_with_fallback(clean_id, size));
            }
        }

        // 4. Final check for any fallback size that may exist
        Ok(self.get_base64_with_fallback(clean_id, size))
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
