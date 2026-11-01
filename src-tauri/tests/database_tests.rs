use mtg_collection_manager_lib::db::Database;
use mtg_collection_manager_lib::error::AppError;
use mtg_collection_manager_lib::models::{AddManualCardInput, CreateLocationInput};
use tempfile::NamedTempFile;

#[test]
fn test_database_creation_and_migration_execution() {
    let tmp = NamedTempFile::new().expect("Failed to create temp file");
    let db = Database::init_file(tmp.path()).expect("Failed to init db");

    let info = db.get_info().expect("Failed to get info");
    assert_eq!(info.schema_version, 4);
    assert_eq!(info.integrity_status, "ok");
    assert_eq!(info.cards_count, 0);
    assert_eq!(info.inventory_count, 0);
    assert_eq!(info.collections_count, 0);
    assert_eq!(info.locations_count, 0);
}

#[test]
fn test_database_persistence_after_reopening() {
    let tmp = NamedTempFile::new().expect("Failed to create temp file");
    let path = tmp.path().to_path_buf();

    // 1. Open and insert records
    {
        let db = Database::init_file(&path).expect("Failed to init db");
        let col = db
            .create_collection("Test Persistence Binder", Some("A temporary binder"))
            .expect("Failed to create collection");
        assert_eq!(col.name, "Test Persistence Binder");

        let card = db
            .add_manual_card(AddManualCardInput {
                card_name: "Lightning Bolt".to_string(),
                set_code: "LEA".to_string(),
                collector_number: "161".to_string(),
                set_name: "Limited Edition Alpha".to_string(),
                quantity: 4,
                language: "en".to_string(),
                finish: "nonfoil".to_string(),
                condition: "NM".to_string(),
                purchase_price: Some(15000), // €150.00
                currency: Some("EUR".to_string()),
                location_id: None,
                notes: Some("Alpha mint playset".to_string()),
            })
            .expect("Failed to add card");

        db.assign_to_collection(&col.id, &card.id)
            .expect("Failed to assign to collection");
    }

    // 2. Reopen from disk and verify persistence
    {
        let db = Database::init_file(&path).expect("Failed to reopen db");
        let info = db.get_info().expect("Failed to get info");
        assert_eq!(info.cards_count, 1);
        assert_eq!(info.printings_count, 1);
        assert_eq!(info.inventory_count, 1);
        assert_eq!(info.total_card_quantity, 4);
        assert_eq!(info.collections_count, 1);

        let collections = db.list_collections().expect("Failed to list collections");
        assert_eq!(collections.len(), 1);
        assert_eq!(collections[0].name, "Test Persistence Binder");
        assert_eq!(collections[0].total_items, 1);
        assert_eq!(collections[0].total_quantity, 4);

        let items = db
            .get_inventory_items(None, None)
            .expect("Failed to get inventory");
        assert_eq!(items.len(), 1);
        assert_eq!(items[0].card_name, "Lightning Bolt");
        assert_eq!(items[0].set_code, "LEA");
        assert_eq!(items[0].collector_number, "161");
        assert_eq!(items[0].quantity, 4);
        assert_eq!(items[0].purchase_price, Some(15000));
        assert_eq!(items[0].collection_ids.len(), 1);
    }
}

#[test]
fn test_collection_creation_rename_and_deletion() {
    let db = Database::init_memory().expect("Failed to init memory db");

    // 1. Create collection
    let col = db
        .create_collection("Commander Deck", Some("Atraxa Superfriends"))
        .expect("Failed to create collection");
    assert_eq!(col.name, "Commander Deck");

    // 2. Reject empty name
    let err_empty = db.create_collection("   ", None);
    assert!(matches!(err_empty, Err(AppError::Validation(_))));

    // 3. Reject duplicate name
    let err_dup = db.create_collection("Commander Deck", None);
    assert!(matches!(err_dup, Err(AppError::Conflict(_))));

    // 4. Rename collection
    let renamed = db
        .rename_collection(&col.id, "Commander - Atraxa", Some("Updated deck name"))
        .expect("Failed to rename");
    assert_eq!(renamed.name, "Commander - Atraxa");
    assert_eq!(renamed.description, Some("Updated deck name".to_string()));

    // 5. Delete collection
    db.delete_collection(&col.id).expect("Failed to delete");
    let remaining = db.list_collections().expect("Failed to list");
    assert!(remaining.is_empty());
}

#[test]
fn test_inventory_insertion_and_retrieval() {
    let db = Database::init_memory().expect("Failed to init memory db");

    let loc = db
        .create_location(CreateLocationInput {
            name: "Binder #1".to_string(),
            location_type: "Binder".to_string(),
            parent_id: None,
            description: Some("Main Rare Binder".to_string()),
        })
        .expect("Failed to create location");

    let card = db
        .add_manual_card(AddManualCardInput {
            card_name: "Black Lotus".to_string(),
            set_code: "LEA".to_string(),
            collector_number: "232".to_string(),
            set_name: "Limited Edition Alpha".to_string(),
            quantity: 1,
            language: "en".to_string(),
            finish: "nonfoil".to_string(),
            condition: "NM".to_string(),
            purchase_price: Some(2500000), // €25,000.00 in cents
            currency: Some("EUR".to_string()),
            location_id: Some(loc.id.clone()),
            notes: Some("Graded copy".to_string()),
        })
        .expect("Failed to add Black Lotus");

    assert_eq!(card.card_name, "Black Lotus");
    assert_eq!(card.set_code, "LEA");
    assert_eq!(card.collector_number, "232");
    assert_eq!(card.quantity, 1);
    assert_eq!(card.location_name, Some("Binder #1".to_string()));
    assert_eq!(card.purchase_price, Some(2500000));

    // Search by card name
    let found = db
        .get_inventory_items(Some("Lotus"), None)
        .expect("Search failed");
    assert_eq!(found.len(), 1);
    assert_eq!(found[0].card_name, "Black Lotus");

    // Search by set code
    let found_set = db
        .get_inventory_items(Some("lea"), None)
        .expect("Search failed");
    assert_eq!(found_set.len(), 1);

    // Search by non-existent term
    let not_found = db
        .get_inventory_items(Some("Mox Pearl"), None)
        .expect("Search failed");
    assert!(not_found.is_empty());
}

#[test]
fn test_quantity_validation_and_updates() {
    let db = Database::init_memory().expect("Failed to init memory db");

    // Reject 0 or negative quantity on insert
    let err_zero = db.add_manual_card(AddManualCardInput {
        card_name: "Sol Ring".to_string(),
        set_code: "LEA".to_string(),
        collector_number: "270".to_string(),
        set_name: "Limited Edition Alpha".to_string(),
        quantity: 0,
        language: "en".to_string(),
        finish: "nonfoil".to_string(),
        condition: "NM".to_string(),
        purchase_price: None,
        currency: None,
        location_id: None,
        notes: None,
    });
    assert!(matches!(err_zero, Err(AppError::Validation(_))));

    // Valid insert
    let item = db
        .add_manual_card(AddManualCardInput {
            card_name: "Sol Ring".to_string(),
            set_code: "LEA".to_string(),
            collector_number: "270".to_string(),
            set_name: "Limited Edition Alpha".to_string(),
            quantity: 2,
            language: "en".to_string(),
            finish: "nonfoil".to_string(),
            condition: "NM".to_string(),
            purchase_price: None,
            currency: None,
            location_id: None,
            notes: None,
        })
        .expect("Failed to add Sol Ring");

    // Increment quantity
    let new_qty = db
        .update_inventory_quantity(&item.id, 3, false)
        .expect("Failed increment");
    assert_eq!(new_qty, 5);

    // Decrement quantity
    let decremented = db
        .update_inventory_quantity(&item.id, -2, false)
        .expect("Failed decrement");
    assert_eq!(decremented, 3);

    // Reject negative quantity
    let err_neg = db.update_inventory_quantity(&item.id, -10, false);
    assert!(matches!(err_neg, Err(AppError::Validation(_))));

    // Set absolute quantity
    let abs_qty = db
        .update_inventory_quantity(&item.id, 10, true)
        .expect("Failed set absolute");
    assert_eq!(abs_qty, 10);
}

#[test]
fn test_multiple_collection_memberships() {
    let db = Database::init_memory().expect("Failed to init memory db");

    let col1 = db
        .create_collection("Vintage Staples", None)
        .expect("Failed col1");
    let col2 = db.create_collection("P9 Vault", None).expect("Failed col2");

    let card = db
        .add_manual_card(AddManualCardInput {
            card_name: "Time Walk".to_string(),
            set_code: "LEA".to_string(),
            collector_number: "88".to_string(),
            set_name: "Limited Edition Alpha".to_string(),
            quantity: 1,
            language: "en".to_string(),
            finish: "nonfoil".to_string(),
            condition: "NM".to_string(),
            purchase_price: None,
            currency: None,
            location_id: None,
            notes: None,
        })
        .expect("Failed to add Time Walk");

    // Assign to both collections
    db.assign_to_collection(&col1.id, &card.id)
        .expect("Failed assign col1");
    db.assign_to_collection(&col2.id, &card.id)
        .expect("Failed assign col2");

    // Filter by col1
    let in_col1 = db
        .get_inventory_items(None, Some(&col1.id))
        .expect("Filter col1 failed");
    assert_eq!(in_col1.len(), 1);
    assert_eq!(in_col1[0].card_name, "Time Walk");
    assert_eq!(in_col1[0].collection_ids.len(), 2);

    // Filter by col2
    let in_col2 = db
        .get_inventory_items(None, Some(&col2.id))
        .expect("Filter col2 failed");
    assert_eq!(in_col2.len(), 1);

    // Remove from col1
    db.remove_from_collection(&col1.id, &card.id)
        .expect("Failed remove col1");
    let in_col1_after = db
        .get_inventory_items(None, Some(&col1.id))
        .expect("Filter col1 failed");
    assert!(in_col1_after.is_empty());

    // Still in col2
    let in_col2_after = db
        .get_inventory_items(None, Some(&col2.id))
        .expect("Filter col2 failed");
    assert_eq!(in_col2_after.len(), 1);

    // Underlying card quantity is still 1
    let all_items = db.get_inventory_items(None, None).expect("Failed get all");
    assert_eq!(all_items.len(), 1);
    assert_eq!(all_items[0].quantity, 1);
}

#[test]
fn test_duplicate_handling_for_printings() {
    let db = Database::init_memory().expect("Failed to init memory db");

    // Add first copy: NM nonfoil
    let copy1 = db
        .add_manual_card(AddManualCardInput {
            card_name: "Counterspell".to_string(),
            set_code: "MH2".to_string(),
            collector_number: "267".to_string(),
            set_name: "Modern Horizons 2".to_string(),
            quantity: 2,
            language: "en".to_string(),
            finish: "nonfoil".to_string(),
            condition: "NM".to_string(),
            purchase_price: Some(150),
            currency: Some("EUR".to_string()),
            location_id: None,
            notes: None,
        })
        .expect("Failed to add copy1");

    // Add second copy: same printing, but FOIL condition LP
    let copy2 = db
        .add_manual_card(AddManualCardInput {
            card_name: "Counterspell".to_string(),
            set_code: "MH2".to_string(),
            collector_number: "267".to_string(),
            set_name: "Modern Horizons 2".to_string(),
            quantity: 1,
            language: "en".to_string(),
            finish: "foil".to_string(),
            condition: "LP".to_string(),
            purchase_price: Some(500),
            currency: Some("EUR".to_string()),
            location_id: None,
            notes: None,
        })
        .expect("Failed to add copy2");

    // Both should share the same canonical card_id and printing_id!
    assert_eq!(copy1.card_id, copy2.card_id);
    assert_eq!(copy1.printing_id, copy2.printing_id);
    // But they have distinct inventory records
    assert_ne!(copy1.id, copy2.id);

    let info = db.get_info().expect("Failed get info");
    assert_eq!(info.cards_count, 1);
    assert_eq!(info.printings_count, 1);
    assert_eq!(info.inventory_count, 2);
    assert_eq!(info.total_card_quantity, 3);
}

#[test]
fn test_milestone_1_acceptance_lifecycle() {
    let tmp = NamedTempFile::new().expect("Failed to create temporary acceptance test database");
    let path = tmp.path().to_path_buf();

    let card_id: String;
    let col_vault_id: String;
    let col_trade_id: String;

    // Steps 1 to 8: Active application session
    {
        let db =
            Database::init_file(&path).expect("Failed to initialize database on temporary file");

        // Step 1: Create a collection
        let col1 = db
            .create_collection("Temporary Collection", Some("To be deleted"))
            .expect("Step 1 failed: create collection");
        assert_eq!(col1.name, "Temporary Collection");

        let col_vault = db
            .create_collection("Rare Vault", Some("High value cards"))
            .expect("Failed to create vault collection");
        col_vault_id = col_vault.id;

        let col_trade = db
            .create_collection("Trade Binder", Some("Available for trade"))
            .expect("Failed to create trade collection");
        col_trade_id = col_trade.id;

        // Step 2: List existing collections
        let collections = db
            .list_collections()
            .expect("Step 2 failed: list collections");
        assert_eq!(collections.len(), 3);
        assert!(collections.iter().any(|c| c.name == "Temporary Collection"));
        assert!(collections.iter().any(|c| c.name == "Rare Vault"));
        assert!(collections.iter().any(|c| c.name == "Trade Binder"));

        // Step 3: Rename a collection
        let renamed = db
            .rename_collection(
                &col1.id,
                "Renamed Temporary",
                Some("Updated temporary notes"),
            )
            .expect("Step 3 failed: rename collection");
        assert_eq!(renamed.name, "Renamed Temporary");
        assert_eq!(
            renamed.description,
            Some("Updated temporary notes".to_string())
        );

        // Step 4: Delete a collection safely
        db.delete_collection(&col1.id)
            .expect("Step 4 failed: delete collection");
        let collections_after_del = db
            .list_collections()
            .expect("Failed list collections after delete");
        assert_eq!(collections_after_del.len(), 2);
        assert!(!collections_after_del.iter().any(|c| c.id == col1.id));

        // Step 5: Insert a manually entered card printing
        let inserted_card = db
            .add_manual_card(AddManualCardInput {
                card_name: "Mox Diamond".to_string(),
                set_code: "STH".to_string(),
                collector_number: "138".to_string(),
                set_name: "Stronghold".to_string(),
                quantity: 1,
                language: "en".to_string(),
                finish: "nonfoil".to_string(),
                condition: "NM".to_string(),
                purchase_price: Some(65000), // €650.00
                currency: Some("EUR".to_string()),
                location_id: None,
                notes: Some("Reserved List staple".to_string()),
            })
            .expect("Step 5 failed: insert manual card");
        assert_eq!(inserted_card.card_name, "Mox Diamond");
        assert_eq!(inserted_card.set_code, "STH");
        assert_eq!(inserted_card.quantity, 1);
        card_id = inserted_card.id.clone();

        // Step 6: Display inventory records
        let inventory = db
            .get_inventory_items(None, None)
            .expect("Step 6 failed: display inventory records");
        assert_eq!(inventory.len(), 1);
        assert_eq!(inventory[0].card_name, "Mox Diamond");
        assert_eq!(inventory[0].purchase_price, Some(65000));
        assert_eq!(inventory[0].currency, "EUR");

        // Step 7: Update card quantities
        let updated_qty = db
            .update_inventory_quantity(&card_id, 2, false)
            .expect("Step 7 failed: increment quantity");
        assert_eq!(updated_qty, 3);

        // Step 8: Assign an inventory item to multiple virtual collections
        db.assign_to_collection(&col_vault_id, &card_id)
            .expect("Step 8a failed: assign to Rare Vault");
        db.assign_to_collection(&col_trade_id, &card_id)
            .expect("Step 8b failed: assign to Trade Binder");

        let items_in_vault = db
            .get_inventory_items(None, Some(&col_vault_id))
            .expect("Get vault items failed");
        assert_eq!(items_in_vault.len(), 1);
        assert_eq!(items_in_vault[0].collection_ids.len(), 2);

        let items_in_trade = db
            .get_inventory_items(None, Some(&col_trade_id))
            .expect("Get trade items failed");
        assert_eq!(items_in_trade.len(), 1);
        assert_eq!(items_in_trade[0].id, card_id);
    } // Database closed and dropped here

    // Step 9: Reopen / restart application session from same database file
    {
        let db = Database::init_file(&path).expect("Step 9 failed: reopen database from disk");

        // Step 10: Confirm all saved data remains available
        let info = db
            .get_info()
            .expect("Step 10 failed: get db info after restart");
        assert_eq!(info.schema_version, 4);
        assert_eq!(info.integrity_status, "ok");
        assert_eq!(info.cards_count, 1);
        assert_eq!(info.printings_count, 1);
        assert_eq!(info.inventory_count, 1);
        assert_eq!(info.total_card_quantity, 3);
        assert_eq!(info.collections_count, 2);

        let collections = db
            .list_collections()
            .expect("List collections after restart failed");
        assert_eq!(collections.len(), 2);
        let vault = collections
            .iter()
            .find(|c| c.id == col_vault_id)
            .expect("Vault collection missing");
        assert_eq!(vault.total_items, 1);
        assert_eq!(vault.total_quantity, 3);

        let inventory = db
            .get_inventory_items(None, None)
            .expect("Get inventory after restart failed");
        assert_eq!(inventory.len(), 1);
        assert_eq!(inventory[0].id, card_id);
        assert_eq!(inventory[0].card_name, "Mox Diamond");
        assert_eq!(inventory[0].quantity, 3);
        assert_eq!(inventory[0].purchase_price, Some(65000));
        assert_eq!(inventory[0].collection_ids.len(), 2);
        assert!(inventory[0].collection_ids.contains(&col_vault_id));
        assert!(inventory[0].collection_ids.contains(&col_trade_id));
    }
}
