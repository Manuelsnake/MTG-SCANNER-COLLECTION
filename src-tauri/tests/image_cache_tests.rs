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

#[tokio::test]
async fn test_image_cache_size_fallback() {
    let tmp_dir = TempDir::new().expect("Create temp dir");
    let cache = ImageCacheManager::new(tmp_dir.path());

    let test_id = "card-fallback-test-456";

    // Save only "normal" image
    let normal_bytes = b"high-quality-normal-card-image-bytes";
    cache
        .save_image_bytes(test_id, "normal", normal_bytes)
        .expect("Save normal");

    // Exact check: has "normal", not "small"
    assert!(cache.has_image(test_id, "normal"));
    assert!(!cache.has_image(test_id, "small"));

    // Fallback search finds "normal" when requesting "small"
    let (found_path, found_size) = cache
        .find_cached_image(test_id, "small")
        .expect("Find fallback for small");
    assert_eq!(found_size, "normal");
    assert!(found_path.is_file());

    // Base64 with fallback returns data URL
    let small_fallback_b64 = cache
        .get_base64_with_fallback(test_id, "small")
        .expect("Base64 fallback for small");
    assert!(small_fallback_b64.starts_with("data:image/jpeg;base64,"));

    // Regular get_base64 also utilizes fallback
    let regular_b64 = cache
        .get_base64(test_id, "small")
        .expect("get_base64 uses fallback");
    assert_eq!(small_fallback_b64, regular_b64);

    // get_image with no remote_url immediately resolves via cached fallback
    let image_data = cache
        .get_image(test_id, None, "small")
        .await
        .expect("get_image fallback")
        .expect("Image returned");
    assert_eq!(image_data, regular_b64);
}

#[tokio::test]
async fn test_concurrent_image_saves_without_lock() {
    let tmp_dir = TempDir::new().expect("Create temp dir");
    let cache = std::sync::Arc::new(ImageCacheManager::new(tmp_dir.path()));

    let mut handles = Vec::new();
    for i in 0..10 {
        let cache_clone = std::sync::Arc::clone(&cache);
        let handle = tokio::spawn(async move {
            let bytes = format!("image-bytes-concurrent-{i}").into_bytes();
            cache_clone.save_image_bytes("concurrent-card-uuid", "normal", &bytes)
        });
        handles.push(handle);
    }

    for h in handles {
        let res = h.await.expect("Join task");
        assert!(res.is_ok(), "Concurrent save failed: {:?}", res);
    }

    assert!(cache.has_image("concurrent-card-uuid", "normal"));
}

#[test]
fn test_double_faced_card_image_extraction() {
    use mtg_collection_manager_lib::scryfall::models::{
        ScryfallCard, ScryfallCardFace, ScryfallImageUris,
    };

    let face1 = ScryfallCardFace {
        name: "Delver of Secrets".to_string(),
        printed_name: None,
        mana_cost: Some("{U}".to_string()),
        type_line: Some("Creature — Human Wizard".to_string()),
        oracle_text: None,
        colors: Some(vec!["U".to_string()]),
        image_uris: Some(ScryfallImageUris {
            small: Some("https://cards.scryfall.io/small/front/delver.jpg".to_string()),
            normal: Some("https://cards.scryfall.io/normal/front/delver.jpg".to_string()),
            large: Some("https://cards.scryfall.io/large/front/delver.jpg".to_string()),
            png: None,
            art_crop: Some("https://cards.scryfall.io/art/front/delver.jpg".to_string()),
            border_crop: None,
        }),
    };

    let face2 = ScryfallCardFace {
        name: "Insectile Aberration".to_string(),
        printed_name: None,
        mana_cost: None,
        type_line: Some("Creature — Human Insect".to_string()),
        oracle_text: None,
        colors: Some(vec!["U".to_string()]),
        image_uris: Some(ScryfallImageUris {
            small: Some("https://cards.scryfall.io/small/back/delver.jpg".to_string()),
            normal: Some("https://cards.scryfall.io/normal/back/delver.jpg".to_string()),
            large: Some("https://cards.scryfall.io/large/back/delver.jpg".to_string()),
            png: None,
            art_crop: None,
            border_crop: None,
        }),
    };

    let card = ScryfallCard {
        id: "delver-uuid".to_string(),
        oracle_id: Some("delver-oracle".to_string()),
        name: "Delver of Secrets // Insectile Aberration".to_string(),
        printed_name: None,
        lang: Some("en".to_string()),
        set: "isd".to_string(),
        set_name: "Innistrad".to_string(),
        collector_number: "51".to_string(),
        released_at: Some("2011-09-30".to_string()),
        rarity: "common".to_string(),
        mana_cost: Some("{U}".to_string()),
        type_line: Some("Creature — Human Wizard // Creature — Human Insect".to_string()),
        oracle_text: None,
        colors: Some(vec!["U".to_string()]),
        color_identity: Some(vec!["U".to_string()]),
        image_uris: None, // Multi-faced cards have image_uris on faces, not root
        card_faces: Some(vec![face1, face2]),
        finishes: vec!["nonfoil".to_string()],
        prices: None,
        scryfall_uri: None,
        prints_search_uri: None,
        games: None,
        digital: Some(false),
        artist: None,
        flavor_text: None,
        layout: Some("transform".to_string()),
    };

    // Card should extract image from first face
    assert_eq!(
        card.get_image_url("normal").as_deref(),
        Some("https://cards.scryfall.io/normal/front/delver.jpg")
    );
    assert_eq!(
        card.get_image_url("small").as_deref(),
        Some("https://cards.scryfall.io/small/front/delver.jpg")
    );
    assert_eq!(
        card.get_image_url("large").as_deref(),
        Some("https://cards.scryfall.io/large/front/delver.jpg")
    );

    let search_res = card.to_search_result();
    assert_eq!(
        search_res.image_url.as_deref(),
        Some("https://cards.scryfall.io/normal/front/delver.jpg")
    );
    assert!(search_res.card_faces.is_some());
    assert_eq!(search_res.card_faces.as_ref().unwrap().len(), 2);
}
