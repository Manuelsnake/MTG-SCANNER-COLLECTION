use std::collections::HashMap;
use std::sync::{Arc, Mutex};

use mtg_collection_manager_lib::db::Database;
use mtg_collection_manager_lib::error::{AppError, AppResult};
use mtg_collection_manager_lib::models::AddScryfallCardInput;
use mtg_collection_manager_lib::scryfall::client::{ScryfallClient, ScryfallTransport};
use mtg_collection_manager_lib::scryfall::CardIdentificationService;
use tempfile::NamedTempFile;

#[derive(Clone, Default)]
struct MockTransport {
    responses: Arc<Mutex<HashMap<String, Result<String, String>>>>,
    call_count: Arc<Mutex<usize>>,
}

impl MockTransport {
    fn new() -> Self {
        Self::default()
    }

    fn register_response(&self, url_fragment: &str, body: &str) {
        let mut map = self.responses.lock().unwrap();
        map.insert(url_fragment.to_string(), Ok(body.to_string()));
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
        let mut entries: Vec<(String, Result<String, String>)> =
            map.iter().map(|(k, v)| (k.clone(), v.clone())).collect();
        entries.sort_by_key(|a| std::cmp::Reverse(a.0.len()));

        for (fragment, res) in entries {
            if url.contains(&fragment) {
                return match res {
                    Ok(body) => Ok(body),
                    Err(err) => Err(AppError::Scryfall(err)),
                };
            }
        }

        Err(AppError::NotFound(format!(
            "Not found in mock transport: {url}"
        )))
    }
}

fn sample_fulmine_json() -> &'static str {
    r#"{
        "object": "list",
        "total_cards": 1,
        "has_more": false,
        "data": [
            {
                "id": "e67504bf-5a98-4aa9-94d7-42790bd55172",
                "oracle_id": "8905b73d-df4f-4d37-88ab-7815cf1dd0b8",
                "name": "Lightning Bolt",
                "printed_name": "Fulmine",
                "lang": "it",
                "released_at": "2022-06-10",
                "layout": "normal",
                "mana_cost": "{R}",
                "cmc": 1.0,
                "type_line": "Istantaneo",
                "oracle_text": "Il Fulmine infligge 3 danni a un qualsiasi bersaglio.",
                "colors": ["R"],
                "color_identity": ["R"],
                "set": "clb",
                "set_name": "Commander Legends: Battle for Baldur's Gate",
                "collector_number": "187",
                "rarity": "common",
                "image_uris": {
                    "small": "https://cards.scryfall.io/small/front/e/6/e67504bf.jpg",
                    "normal": "https://cards.scryfall.io/normal/front/e/6/e67504bf.jpg",
                    "art_crop": "https://cards.scryfall.io/art_crop/front/e/6/e67504bf.jpg"
                },
                "prices": {
                    "eur": "1.50",
                    "eur_foil": "3.00"
                },
                "finishes": ["nonfoil", "foil"],
                "legalities": {}
            }
        ]
    }"#
}

fn sample_contromagia_json() -> &'static str {
    r#"{
        "object": "list",
        "total_cards": 1,
        "has_more": false,
        "data": [
            {
                "id": "7dc2d708-3011-4770-bdc2-a895dc504eb4",
                "oracle_id": "cc919e99-4c12-421b-a5d9-7607774e1d10",
                "name": "Counterspell",
                "printed_name": "Contromagia",
                "lang": "it",
                "released_at": "2021-06-18",
                "layout": "normal",
                "mana_cost": "{U}{U}",
                "cmc": 2.0,
                "type_line": "Istantaneo",
                "oracle_text": "Neutralizza una magia bersaglio.",
                "colors": ["U"],
                "color_identity": ["U"],
                "set": "mh2",
                "set_name": "Modern Horizons 2",
                "collector_number": "267",
                "rarity": "uncommon",
                "image_uris": {
                    "small": "https://cards.scryfall.io/small/front/7/d/7dc2d708.jpg",
                    "normal": "https://cards.scryfall.io/normal/front/7/d/7dc2d708.jpg"
                },
                "prices": {
                    "eur": "1.20"
                },
                "finishes": ["nonfoil"],
                "legalities": {}
            }
        ]
    }"#
}

fn sample_foudre_json() -> &'static str {
    r#"{
        "object": "list",
        "total_cards": 1,
        "has_more": false,
        "data": [
            {
                "id": "6732ef21-2679-4bc6-8d59-3fb0360a6ae5",
                "oracle_id": "8905b73d-df4f-4d37-88ab-7815cf1dd0b8",
                "name": "Lightning Bolt",
                "printed_name": "Foudre",
                "lang": "fr",
                "released_at": "2018-03-16",
                "layout": "normal",
                "mana_cost": "{R}",
                "cmc": 1.0,
                "type_line": "Éphémère",
                "oracle_text": "La Foudre inflige 3 blessures à n'importe quelle cible.",
                "colors": ["R"],
                "color_identity": ["R"],
                "set": "a25",
                "set_name": "Masters 25",
                "collector_number": "141",
                "rarity": "uncommon",
                "image_uris": {
                    "normal": "https://cards.scryfall.io/normal/front/6/7/6732ef21.jpg"
                },
                "prices": {
                    "eur": "2.00"
                },
                "finishes": ["nonfoil"],
                "legalities": {}
            }
        ]
    }"#
}

fn sample_japanese_bolt_json() -> &'static str {
    r#"{
        "object": "list",
        "total_cards": 1,
        "has_more": false,
        "data": [
            {
                "id": "b1bbf8bf-6f5b-43d9-95a9-467554904c52",
                "oracle_id": "8905b73d-df4f-4d37-88ab-7815cf1dd0b8",
                "name": "Lightning Bolt",
                "printed_name": "稲妻",
                "lang": "ja",
                "released_at": "2021-04-23",
                "layout": "normal",
                "mana_cost": "{R}",
                "cmc": 1.0,
                "type_line": "インスタント",
                "oracle_text": "クリーチャー１体かプレインズウォーカー１体かプレイヤー１人を対象とする。稲妻はそれに３点のダメージを与える。",
                "colors": ["R"],
                "color_identity": ["R"],
                "set": "sta",
                "set_name": "Strixhaven Mystical Archive",
                "collector_number": "42",
                "rarity": "rare",
                "image_uris": {
                    "normal": "https://cards.scryfall.io/normal/front/b/1/b1bbf8bf.jpg"
                },
                "prices": {
                    "eur": "50.00"
                },
                "finishes": ["nonfoil", "foil"],
                "legalities": {}
            }
        ]
    }"#
}

fn sample_clb_187_en_json() -> &'static str {
    r#"{
        "id": "f29ba16f-c8fb-42fe-aabf-87089cb214a7",
        "oracle_id": "8905b73d-df4f-4d37-88ab-7815cf1dd0b8",
        "name": "Lightning Bolt",
        "lang": "en",
        "released_at": "2022-06-10",
        "layout": "normal",
        "mana_cost": "{R}",
        "cmc": 1.0,
        "type_line": "Instant",
        "oracle_text": "Lightning Bolt deals 3 damage to any target.",
        "colors": ["R"],
        "color_identity": ["R"],
        "set": "clb",
        "set_name": "Commander Legends: Battle for Baldur's Gate",
        "collector_number": "187",
        "rarity": "common",
        "image_uris": {
            "normal": "https://cards.scryfall.io/normal/front/f/2/f29ba16f.jpg"
        },
        "prices": {
            "eur": "0.90"
        },
        "finishes": ["nonfoil", "foil"],
        "legalities": {}
    }"#
}

fn sample_clb_187_it_json() -> &'static str {
    r#"{
        "id": "e67504bf-5a98-4aa9-94d7-42790bd55172",
        "oracle_id": "8905b73d-df4f-4d37-88ab-7815cf1dd0b8",
        "name": "Lightning Bolt",
        "printed_name": "Fulmine",
        "lang": "it",
        "released_at": "2022-06-10",
        "layout": "normal",
        "mana_cost": "{R}",
        "cmc": 1.0,
        "type_line": "Istantaneo",
        "oracle_text": "Il Fulmine infligge 3 danni a un qualsiasi bersaglio.",
        "colors": ["R"],
        "color_identity": ["R"],
        "set": "clb",
        "set_name": "Commander Legends: Battle for Baldur's Gate",
        "collector_number": "187",
        "rarity": "common",
        "image_uris": {
            "normal": "https://cards.scryfall.io/normal/front/e/6/e67504bf.jpg"
        },
        "prices": {
            "eur": "1.50"
        },
        "finishes": ["nonfoil", "foil"],
        "legalities": {}
    }"#
}

fn sample_english_only_json() -> &'static str {
    r#"{
        "object": "list",
        "total_cards": 1,
        "has_more": false,
        "data": [
            {
                "id": "e3095995-1f6e-41bb-a719-21b66df2ba38",
                "oracle_id": "7662c559-fb50-48e0-bb1d-5415309650fe",
                "name": "Chamber Sentry",
                "lang": "en",
                "released_at": "2018-10-05",
                "layout": "normal",
                "mana_cost": "{X}",
                "cmc": 0.0,
                "type_line": "Artifact Creature — Construct",
                "oracle_text": "Chamber Sentry enters the battlefield...",
                "colors": [],
                "color_identity": [],
                "set": "grn",
                "set_name": "Guilds of Ravnica",
                "collector_number": "232",
                "rarity": "rare",
                "image_uris": {
                    "normal": "https://cards.scryfall.io/normal/front/e/3/e3095995.jpg"
                },
                "prices": {
                    "eur": "0.20"
                },
                "finishes": ["nonfoil"],
                "legalities": {}
            }
        ]
    }"#
}

#[tokio::test]
async fn test_multilingual_search_acceptance_scenarios() {
    let tmp = NamedTempFile::new().expect("Create temp db");
    let db = Database::init_file(tmp.path()).expect("Init db");

    let transport = MockTransport::new();
    // Register mock responses
    // Scenario 1: Italian "Fulmine"
    transport.register_response("q=Fulmine", sample_fulmine_json());
    // Scenario 2: Italian "Contromagia"
    transport.register_response("q=Contromagia", sample_contromagia_json());
    // Scenario 3: English name with lang:it filter
    transport.register_response("lang%3Ait", sample_fulmine_json());
    // Scenario 4: French "Foudre"
    transport.register_response("q=Foudre", sample_foudre_json());
    // Scenario 5: Japanese search
    transport.register_response("lang%3Aja", sample_japanese_bolt_json());
    // Scenario 6 & 7: Printings endpoint
    transport.register_response("/cards/clb/187/it", sample_clb_187_it_json());
    transport.register_response("/cards/clb/187", sample_clb_187_en_json());
    // Scenario 10: English-only card
    transport.register_response("Chamber%20Sentry", sample_english_only_json());

    let client = ScryfallClient::with_transport(transport.clone());
    let service = CardIdentificationService::with_transport(client, db.get_conn());

    // =========================================================================
    // Scenario 1: Search using Italian localized name "Fulmine"
    // =========================================================================
    let it_results = service
        .search_cards("Fulmine", 1, None)
        .await
        .expect("Search Fulmine");
    assert_eq!(it_results.len(), 1);
    assert_eq!(it_results[0].name, "Lightning Bolt");
    assert_eq!(it_results[0].printed_name.as_deref(), Some("Fulmine"));
    assert_eq!(it_results[0].lang, "it");
    assert_eq!(it_results[0].set_code, "CLB");

    // =========================================================================
    // Scenario 2: Search using Italian localized name "Contromagia"
    // =========================================================================
    let cm_results = service
        .search_cards("Contromagia", 1, None)
        .await
        .expect("Search Contromagia");
    assert_eq!(cm_results.len(), 1);
    assert_eq!(cm_results[0].name, "Counterspell");
    assert_eq!(cm_results[0].printed_name.as_deref(), Some("Contromagia"));
    assert_eq!(cm_results[0].lang, "it");

    // =========================================================================
    // Scenario 3: English search with Italian language filter
    // =========================================================================
    let filtered_results = service
        .search_cards("Lightning Bolt", 1, Some("it"))
        .await
        .expect("Search Lightning Bolt in Italian");
    assert_eq!(filtered_results.len(), 1);
    assert_eq!(filtered_results[0].name, "Lightning Bolt");
    assert_eq!(filtered_results[0].printed_name.as_deref(), Some("Fulmine"));

    // =========================================================================
    // Scenario 4: French search "Foudre"
    // =========================================================================
    let fr_results = service
        .search_cards("Foudre", 1, None)
        .await
        .expect("Search Foudre");
    assert_eq!(fr_results.len(), 1);
    assert_eq!(fr_results[0].name, "Lightning Bolt");
    assert_eq!(fr_results[0].printed_name.as_deref(), Some("Foudre"));
    assert_eq!(fr_results[0].lang, "fr");

    // =========================================================================
    // Scenario 5: Switching languages (Japanese search)
    // =========================================================================
    let ja_results = service
        .search_cards("Lightning Bolt", 1, Some("ja"))
        .await
        .expect("Search Japanese Lightning Bolt");
    assert_eq!(ja_results.len(), 1);
    assert_eq!(ja_results[0].name, "Lightning Bolt");
    assert_eq!(ja_results[0].printed_name.as_deref(), Some("稲妻"));
    assert_eq!(ja_results[0].lang, "ja");

    // =========================================================================
    // Scenario 6 & 7: Retrieving distinct Italian and English printings of CLB #187
    // =========================================================================
    let en_printing = service
        .identify_by_set_and_number_lang("clb", "187", Some("en"))
        .await
        .expect("Get CLB 187 English");
    assert_eq!(en_printing.name, "Lightning Bolt");
    assert_eq!(en_printing.lang.as_deref(), Some("en"));
    assert!(en_printing.printed_name.is_none());

    let it_printing = service
        .identify_by_set_and_number_lang("clb", "187", Some("it"))
        .await
        .expect("Get CLB 187 Italian");
    assert_eq!(it_printing.name, "Lightning Bolt");
    assert_eq!(it_printing.lang.as_deref(), Some("it"));
    assert_eq!(it_printing.printed_name.as_deref(), Some("Fulmine"));

    // =========================================================================
    // Scenario 8: Saving selected Italian printing and English printing in SQLite
    // Verify that both coexist under same (set_code, collector_number) due to lang key!
    // =========================================================================
    let col = db
        .create_collection("Multilingual Binder", None)
        .expect("Create collection");

    // Add Italian printing
    let it_input = AddScryfallCardInput {
        scryfall_id: it_printing.id.clone(),
        oracle_id: it_printing.oracle_id.clone(),
        card_name: it_printing.name.clone(),
        printed_name: it_printing.printed_name.clone(),
        set_code: it_printing.set.to_uppercase(),
        set_name: it_printing.set_name.clone(),
        collector_number: it_printing.collector_number.clone(),
        release_date: it_printing.released_at.clone(),
        layout: it_printing.layout.clone(),
        rarity: Some(it_printing.rarity.clone()),
        mana_cost: it_printing.mana_cost.clone(),
        type_line: it_printing.type_line.clone(),
        image_url: it_printing
            .image_uris
            .as_ref()
            .and_then(|u| u.normal.clone()),
        image_small: None,
        image_art_crop: None,
        card_faces: None,
        quantity: 2,
        language: it_printing.lang.clone().unwrap_or_else(|| "it".to_string()),
        finish: "nonfoil".to_string(),
        condition: "NM".to_string(),
        purchase_price: Some(150),
        currency: Some("EUR".to_string()),
        location_id: None,
        notes: Some("Edizione Italiana".to_string()),
        collection_ids: vec![col.id.clone()],
    };
    let saved_it = db
        .add_card_from_scryfall(it_input)
        .expect("Add Italian card");
    assert_eq!(saved_it.language, "it");
    assert_eq!(saved_it.printed_name.as_deref(), Some("Fulmine"));
    assert_eq!(saved_it.card_name, "Lightning Bolt");

    // Add English printing of same set & number (CLB #187)
    let en_input = AddScryfallCardInput {
        scryfall_id: en_printing.id.clone(),
        oracle_id: en_printing.oracle_id.clone(),
        card_name: en_printing.name.clone(),
        printed_name: None,
        set_code: en_printing.set.to_uppercase(),
        set_name: en_printing.set_name.clone(),
        collector_number: en_printing.collector_number.clone(),
        release_date: en_printing.released_at.clone(),
        layout: en_printing.layout.clone(),
        rarity: Some(en_printing.rarity.clone()),
        mana_cost: en_printing.mana_cost.clone(),
        type_line: en_printing.type_line.clone(),
        image_url: en_printing
            .image_uris
            .as_ref()
            .and_then(|u| u.normal.clone()),
        image_small: None,
        image_art_crop: None,
        card_faces: None,
        quantity: 1,
        language: en_printing.lang.clone().unwrap_or_else(|| "en".to_string()),
        finish: "nonfoil".to_string(),
        condition: "NM".to_string(),
        purchase_price: Some(90),
        currency: Some("EUR".to_string()),
        location_id: None,
        notes: Some("English original".to_string()),
        collection_ids: vec![col.id.clone()],
    };
    let saved_en = db
        .add_card_from_scryfall(en_input)
        .expect("Add English card");
    assert_eq!(saved_en.language, "en");
    assert_eq!(saved_en.card_name, "Lightning Bolt");
    assert_ne!(saved_it.id, saved_en.id); // Distinct items in inventory!

    // Verify inventory retrieval returns both correctly
    let inventory = db.get_inventory_items(None, None).expect("Get inventory");
    assert_eq!(inventory.len(), 2);
    let it_item = inventory.iter().find(|i| i.language == "it").unwrap();
    assert_eq!(it_item.printed_name.as_deref(), Some("Fulmine"));
    let en_item = inventory.iter().find(|i| i.language == "en").unwrap();
    assert_eq!(en_item.language, "en");

    // Verify inventory search matches localized name "Fulmine"
    let searched_by_local = db
        .get_inventory_items(Some("Fulmine"), None)
        .expect("Search inventory by local name");
    assert_eq!(searched_by_local.len(), 1);
    assert_eq!(searched_by_local[0].id, saved_it.id);

    // =========================================================================
    // Scenario 9: Local cache retrieval of localized names
    // Searching "Fulmine" again will hit the SQLite cache without calling transport!
    // =========================================================================
    let calls_before = transport.calls();
    let cached_fulmine = service
        .search_cards("Fulmine", 1, None)
        .await
        .expect("Cached search Fulmine");
    assert_eq!(cached_fulmine.len(), 1);
    assert_eq!(cached_fulmine[0].printed_name.as_deref(), Some("Fulmine"));
    assert_eq!(transport.calls(), calls_before); // ZERO new HTTP calls!

    // =========================================================================
    // Scenario 10: Handling cards without localized translations
    // English-only card has printed_name = None and handles cleanly
    // =========================================================================
    let en_only = service
        .search_cards("Chamber Sentry", 1, None)
        .await
        .expect("Search Chamber Sentry");
    assert_eq!(en_only.len(), 1);
    assert_eq!(en_only[0].name, "Chamber Sentry");
    assert_eq!(en_only[0].lang, "en");
    assert!(en_only[0].printed_name.is_none());
}
