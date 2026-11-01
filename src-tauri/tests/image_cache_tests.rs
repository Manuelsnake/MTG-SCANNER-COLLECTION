use mtg_collection_manager_lib::image_cache::ImageCacheManager;
use tempfile::TempDir;

#[tokio::test]
async fn test_image_cache_lifecycle() {
    let tmp_dir = TempDir::new().expect("Create temp dir");
    let cache = ImageCacheManager::new(tmp_dir.path());

    let test_id = "test-card-123";
    let test_size = "normal";

    // 1. Initial state: image does not exist
    assert!(!cache.has_image(test_id, test_size));
    assert!(cache.get_base64(test_id, test_size).is_none());

    // 2. Save image bytes
    let fake_jpeg_bytes = b"fake-jpeg-image-binary-content-123456789";
    let saved_path = cache
        .save_image_bytes(test_id, test_size, fake_jpeg_bytes)
        .expect("Save image bytes");
    assert!(saved_path.is_file());

    // 3. Verify existence and base64 representation
    assert!(cache.has_image(test_id, test_size));
    let base64_str = cache
        .get_base64(test_id, test_size)
        .expect("Get base64 string");
    assert!(base64_str.starts_with("data:image/jpeg;base64,"));

    // 4. Verify stats
    let stats = cache.cache_stats().expect("Cache stats");
    assert_eq!(stats.total_images, 1);
    assert_eq!(stats.total_bytes, fake_jpeg_bytes.len() as u64);

    // 5. Test clear cache
    let cleared = cache.clear_cache().expect("Clear cache");
    assert_eq!(cleared, 1);
    assert!(!cache.has_image(test_id, test_size));

    let stats_after = cache.cache_stats().expect("Cache stats after");
    assert_eq!(stats_after.total_images, 0);
    assert_eq!(stats_after.total_bytes, 0);
}
