use std::collections::HashMap;
use std::sync::{Arc, Mutex};
use tempfile::NamedTempFile;

use mtg_collection_manager_lib::db::Database;
use mtg_collection_manager_lib::error::{AppError, AppResult};
use mtg_collection_manager_lib::models::{AddScryfallCardInput, CreateLocationInput};
use mtg_collection_manager_lib::scryfall::cache::ScryfallCache;
use mtg_collection_manager_lib::scryfall::client::{ScryfallClient, ScryfallTransport};
use mtg_collection_manager_lib::scryfall::models::ScryfallCard;
use mtg_collection_manager_lib::scryfall::CardIdentificationService;

#[derive(Clone, Default)]
struct MockTransport {
    responses: Arc<Mutex<HashMap<String, Result<String, String>>>>,
    call_count: Arc<Mutex<usize>>,
}

impl MockTransport {
    fn new() -> Self {
        Self::default()
    }

    fn register(&self, url_fragment: &str, response_json: &str) {
        let mut map = self.responses.lock().unwrap();
        map.insert(url_fragment.to_string(), Ok(response_json.to_string()));
    }

    #[allow(dead_code)]
    fn register_error(&self, url_fragment: &str, err_msg: &str) {
        let mut map = self.responses.lock().unwrap();
        map.insert(url_fragment.to_string(), Err(err_msg.to_string()));
    }

    fn calls(&self) -> usize {
        *self.call_count.lock().unwrap()
    }
}

impl ScryfallTransport for MockTransport {
    async fn get(&self, url: &str) -> AppResult<String> {
        let mut count = self.call_count.lock().unwrap();
        *count += 1;

        let map = self.responses.lock().unwrap();
        for (fragment, res) in map.iter() {
            if url.contains(fragment) {
                return match res {
                    Ok(body) => Ok(body.clone()),
                    Err(err) => Err(AppError::Scryfall(err.clone())),
                };
            }
        }

        Err(AppError::NotFound(format!(
            "Not found in mock transport: {url}"
        )))
    }
}

fn sample_lotus_json() -> &'static str {
    r#"{
        "id": "bd8fa327-dd41-4737-8f19-2cf5eb1f7cdd",
        "oracle_id": "b34bb2dc-c1af-4d77-b0b3-a0fb342a5fc6",
        "name": "Black Lotus",
        "lang": "en",
        "released_at": "1993-08-05",
        "layout": "normal",
        "mana_cost": "{0}",
        "cmc": 0.0,
        "type_line": "Artifact",
        "oracle_text": "{T}, Sacrifice Black Lotus: Add three mana of any one color.",
        "colors": [],
        "color_identity": [],
        "set": "lea",
        "set_name": "Limited Edition Alpha",
        "collector_number": "232",
        "rarity": "rare",
        "image_uris": {
            "small": "https://cards.scryfall.io/small/front/b/d/bd8fa327-dd41-4737-8f19-2cf5eb1f7cdd.jpg",
            "normal": "https://cards.scryfall.io/normal/front/b/d/bd8fa327-dd41-4737-8f19-2cf5eb1f7cdd.jpg",
            "large": "https://cards.scryfall.io/large/front/b/d/bd8fa327-dd41-4737-8f19-2cf5eb1f7cdd.jpg"
        },
        "prices": {
            "usd": "50000.00",
            "usd_foil": null,
            "eur": "45000.00",
            "eur_foil": null
        },
        "finishes": ["nonfoil"],
        "foil": false,
        "nonfoil": true
    }"#
}

fn sample_counterspell_json() -> &'static str {
    r#"{
        "id": "1920dae4-fb92-4f19-ae4b-eb3276b8dac7",
        "oracle_id": "cc919e99-4c12-421b-a5d9-7607774e1d10",
        "name": "Counterspell",
        "lang": "en",
        "released_at": "2021-06-18",
        "layout": "normal",
        "mana_cost": "{U}{U}",
        "cmc": 2.0,
        "type_line": "Instant",
        "oracle_text": "Counter target spell.",
        "colors": ["U"],
        "color_identity": ["U"],
        "set": "mh2",
        "set_name": "Modern Horizons 2",
        "collector_number": "267",
        "rarity": "uncommon",
        "image_uris": {
            "small": "https://cards.scryfall.io/small/front/1/9/1920dae4-fb92-4f19-ae4b-eb3276b8dac7.jpg",
            "normal": "https://cards.scryfall.io/normal/front/1/9/1920dae4-fb92-4f19-ae4b-eb3276b8dac7.jpg"
        },
        "prices": {
            "usd": "1.50",
            "usd_foil": "3.50",
            "eur": "1.25",
            "eur_foil": "3.00"
        },
        "finishes": ["nonfoil", "foil"],
        "foil": true,
        "nonfoil": true
    }"#
}

#[tokio::test]
async fn test_scryfall_json_parsing_and_model_properties() {
    let card: ScryfallCard = serde_json::from_str(sample_lotus_json()).expect("Deserialize lotus");
    assert_eq!(card.name, "Black Lotus");
    assert_eq!(card.set, "lea");
    assert_eq!(card.collector_number, "232");
    assert_eq!(card.rarity, "rare");
    assert_eq!(card.mana_cost.as_deref(), Some("{0}"));
    assert_eq!(card.type_line.as_deref(), Some("Artifact"));
    assert_eq!(card.get_eur_cents(), Some(4500000));
    assert!(card
        .get_image_url("normal")
        .unwrap()
        .contains("bd8fa327-dd41-4737-8f19-2cf5eb1f7cdd"));
    assert_eq!(card.finishes, vec!["nonfoil"]);

    let cs: ScryfallCard =
        serde_json::from_str(sample_counterspell_json()).expect("Deserialize counterspell");
    assert_eq!(cs.name, "Counterspell");
    assert_eq!(cs.get_eur_cents(), Some(125));
    assert_eq!(cs.finishes, vec!["nonfoil", "foil"]);
}

#[tokio::test]
async fn test_card_identification_service_with_mock_and_caching() {
    let tmp = NamedTempFile::new().expect("Tempfile");
    let db = Database::init_file(tmp.path()).expect("Init DB");

    let transport = MockTransport::new();
    transport.register(
        "/cards/autocomplete?q=bla",
        r#"{"object":"catalog","total_values":2,"data":["Black Lotus","Black Vise"]}"#,
    );
    transport.register(
        "/cards/search?q=Black%20Lotus",
        &format!(
            r#"{{"object":"list","total_cards":1,"has_more":false,"data":[{}]}}"#,
            sample_lotus_json()
        ),
    );
    transport.register("/cards/lea/232", sample_lotus_json());
    transport.register(
        "/cards/search?order=released&q=oracle_id%3Ab34bb2dc-c1af-4d77-b0b3-a0fb342a5fc6&unique=prints",
        &format!(r#"{{"object":"list","total_cards":1,"has_more":false,"data":[{}]}}"#, sample_lotus_json()),
    );

    let client = ScryfallClient::with_transport(transport.clone());
    let service = CardIdentificationService::with_transport(client, db.get_conn());

    // 1. Autocomplete test
    let ac = service.autocomplete("bla").await.expect("Autocomplete");
    assert_eq!(ac, vec!["Black Lotus", "Black Vise"]);
    assert_eq!(transport.calls(), 1);

    // 2. Search test - first call hits transport
    let results = service
        .search_cards("Black Lotus", 1)
        .await
        .expect("Search");
    assert_eq!(results.len(), 1);
    assert_eq!(results[0].name, "Black Lotus");
    assert_eq!(results[0].set_code, "LEA");
    assert_eq!(results[0].price_eur, Some(4500000));
    assert_eq!(transport.calls(), 2);

    // 3. Search test - second call should hit local SQLite cache!
    let cached_results = service
        .search_cards("Black Lotus", 1)
        .await
        .expect("Cached search");
    assert_eq!(cached_results.len(), 1);
    assert_eq!(cached_results[0].name, "Black Lotus");
    // Call count must remain 2 (no extra HTTP call made)
    assert_eq!(transport.calls(), 2);

    // 4. Identify by set and number - LEA 232 is already cached from previous search batch!
    let card = service
        .identify_by_set_and_number("lea", "232")
        .await
        .expect("Identify");
    assert_eq!(card.name, "Black Lotus");
    assert_eq!(transport.calls(), 2); // Still 2, served completely from cache!

    // 5. Get printings by oracle_id - LEA is already cached!
    let printings = service
        .get_printings("b34bb2dc-c1af-4d77-b0b3-a0fb342a5fc6")
        .await
        .expect("Printings");
    assert_eq!(printings.len(), 1);
    assert_eq!(printings[0].set_code, "LEA");
    assert_eq!(transport.calls(), 2); // Served from cache!
}

#[tokio::test]
async fn test_scryfall_cache_expiration_and_purge() {
    let tmp = NamedTempFile::new().expect("Tempfile");
    let db = Database::init_file(tmp.path()).expect("Init DB");
    let conn_arc = db.get_conn();
    let conn = conn_arc.lock().unwrap();

    let lotus: ScryfallCard = serde_json::from_str(sample_lotus_json()).unwrap();

    // Save with 0 days TTL (immediately expired)
    ScryfallCache::save_card(&conn, &lotus, 0).expect("Save card");

    // Purge expired
    let purged = ScryfallCache::purge_expired(&conn).expect("Purge");
    assert!(purged >= 1);

    // Verify it is gone
    let cached = ScryfallCache::get_by_scryfall_id(&conn, &lotus.id).expect("Query cache");
    assert!(cached.is_none());
}

#[test]
fn test_add_card_from_scryfall_with_deduplication_and_inventory() {
    let tmp = NamedTempFile::new().expect("Tempfile");
    let db = Database::init_file(tmp.path()).expect("Init DB");

    // Create a collection and a location
    let col = db
        .create_collection("Commander Deck", Some("My primary deck"))
        .expect("Create col");
    let loc = db
        .create_location(CreateLocationInput {
            name: "Binder 1".to_string(),
            location_type: "binder".to_string(),
            parent_id: None,
            description: Some("Main trade binder".to_string()),
        })
        .expect("Create loc");

    // Insert Counterspell from Scryfall
    let input1 = AddScryfallCardInput {
        scryfall_id: "1920dae4-fb92-4f19-ae4b-eb3276b8dac7".to_string(),
        oracle_id: Some("cc919e99-4c12-421b-a5d9-7607774e1d10".to_string()),
        card_name: "Counterspell".to_string(),
        set_code: "MH2".to_string(),
        set_name: "Modern Horizons 2".to_string(),
        collector_number: "267".to_string(),
        release_date: Some("2021-06-18".to_string()),
        layout: Some("normal".to_string()),
        rarity: Some("uncommon".to_string()),
        mana_cost: Some("{U}{U}".to_string()),
        type_line: Some("Instant".to_string()),
        image_url: Some(
            "https://cards.scryfall.io/normal/front/1/9/1920dae4-fb92-4f19-ae4b-eb3276b8dac7.jpg"
                .to_string(),
        ),
        quantity: 2,
        language: "en".to_string(),
        finish: "nonfoil".to_string(),
        condition: "NM".to_string(),
        purchase_price: Some(125), // 1.25 EUR in cents
        currency: Some("EUR".to_string()),
        location_id: Some(loc.id.clone()),
        notes: Some("Purchased locally".to_string()),
        collection_ids: vec![col.id.clone()],
    };

    let item1 = db
        .add_card_from_scryfall(input1)
        .expect("Add scryfall card");
    assert_eq!(item1.card_name, "Counterspell");
    assert_eq!(item1.set_code, "MH2");
    assert_eq!(item1.quantity, 2);
    assert_eq!(item1.rarity.as_deref(), Some("uncommon"));
    assert_eq!(item1.mana_cost.as_deref(), Some("{U}{U}"));
    assert_eq!(
        item1.scryfall_id.as_deref(),
        Some("1920dae4-fb92-4f19-ae4b-eb3276b8dac7")
    );
    assert!(item1.image_url.is_some());

    // Deduplication test: add 1 more identical copy (same printing, same finish, condition, language, location)
    let input2 = AddScryfallCardInput {
        scryfall_id: "1920dae4-fb92-4f19-ae4b-eb3276b8dac7".to_string(),
        oracle_id: Some("cc919e99-4c12-421b-a5d9-7607774e1d10".to_string()),
        card_name: "Counterspell".to_string(),
        set_code: "MH2".to_string(),
        set_name: "Modern Horizons 2".to_string(),
        collector_number: "267".to_string(),
        release_date: Some("2021-06-18".to_string()),
        layout: Some("normal".to_string()),
        rarity: Some("uncommon".to_string()),
        mana_cost: Some("{U}{U}".to_string()),
        type_line: Some("Instant".to_string()),
        image_url: None,
        quantity: 1,
        language: "en".to_string(),
        finish: "nonfoil".to_string(),
        condition: "NM".to_string(),
        purchase_price: None,
        currency: None,
        location_id: Some(loc.id.clone()),
        notes: None,
        collection_ids: vec![],
    };

    let item2 = db
        .add_card_from_scryfall(input2)
        .expect("Add duplicate scryfall card");
    assert_eq!(item2.id, item1.id); // Same item updated!
    assert_eq!(item2.quantity, 3); // 2 + 1 = 3

    // Add another copy with DIFFERENT finish (foil) -> creates a separate inventory item
    let input_foil = AddScryfallCardInput {
        scryfall_id: "1920dae4-fb92-4f19-ae4b-eb3276b8dac7".to_string(),
        oracle_id: Some("cc919e99-4c12-421b-a5d9-7607774e1d10".to_string()),
        card_name: "Counterspell".to_string(),
        set_code: "MH2".to_string(),
        set_name: "Modern Horizons 2".to_string(),
        collector_number: "267".to_string(),
        release_date: Some("2021-06-18".to_string()),
        layout: Some("normal".to_string()),
        rarity: Some("uncommon".to_string()),
        mana_cost: Some("{U}{U}".to_string()),
        type_line: Some("Instant".to_string()),
        image_url: None,
        quantity: 1,
        language: "en".to_string(),
        finish: "foil".to_string(),
        condition: "NM".to_string(),
        purchase_price: Some(300),
        currency: Some("EUR".to_string()),
        location_id: Some(loc.id.clone()),
        notes: Some("Foil promo".to_string()),
        collection_ids: vec![col.id.clone()],
    };

    let item_foil = db.add_card_from_scryfall(input_foil).expect("Add foil");
    assert_ne!(item_foil.id, item1.id);
    assert_eq!(item_foil.finish, "foil");
    assert_eq!(item_foil.quantity, 1);

    // Verify inventory retrieval returns both items with enriched Scryfall fields
    let items = db.get_inventory_items(None, None).expect("Get inventory");
    assert_eq!(items.len(), 2);

    let nonfoil = items.iter().find(|i| i.finish == "nonfoil").unwrap();
    assert_eq!(nonfoil.quantity, 3);
    assert_eq!(
        nonfoil.scryfall_id.as_deref(),
        Some("1920dae4-fb92-4f19-ae4b-eb3276b8dac7")
    );
    assert_eq!(nonfoil.rarity.as_deref(), Some("uncommon"));
    assert_eq!(nonfoil.mana_cost.as_deref(), Some("{U}{U}"));
    assert!(nonfoil.image_url.is_some());

    let foil = items.iter().find(|i| i.finish == "foil").unwrap();
    assert_eq!(foil.quantity, 1);

    // Verify total cards count in db info
    let info = db.get_info().expect("Get info");
    assert_eq!(info.cards_count, 1); // 1 canonical card (Counterspell)
    assert_eq!(info.printings_count, 1); // 1 printing (MH2 #267)
    assert_eq!(info.inventory_count, 2); // 2 inventory entries (nonfoil + foil)
    assert_eq!(info.total_card_quantity, 4); // 3 nonfoil + 1 foil = 4 total cards
}
