pub mod commands;
pub mod db;
pub mod error;
pub mod models;

use std::sync::Arc;
use tauri::Manager;

use crate::db::Database;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let _ = env_logger::try_init();

    tauri::Builder::default()
        .setup(|app| {
            let app_data_dir = app
                .path()
                .app_data_dir()
                .expect("Failed to resolve application data directory");

            let db_path = app_data_dir.join("database").join("collection.db");
            log::info!("Initializing SQLite database at: {}", db_path.display());

            let db = Database::init_file(&db_path)
                .expect("Failed to initialize SQLite database with migrations");

            app.manage(Arc::new(db));
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            // Database
            crate::commands::get_db_info,
            crate::commands::verify_integrity,
            // Collections
            crate::commands::create_collection,
            crate::commands::list_collections,
            crate::commands::rename_collection,
            crate::commands::delete_collection,
            crate::commands::assign_to_collection,
            crate::commands::remove_from_collection,
            // Inventory
            crate::commands::add_manual_card,
            crate::commands::get_inventory_items,
            crate::commands::update_inventory_quantity,
            crate::commands::delete_inventory_item,
            // Locations
            crate::commands::create_location,
            crate::commands::list_locations,
            crate::commands::delete_location,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
