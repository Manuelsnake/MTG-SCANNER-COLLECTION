// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::path::PathBuf;

fn main() {
    let args: Vec<String> = std::env::args().collect();

    // Headless / CLI diagnostic flag (useful for CI, server environments and automated verification)
    if args.iter().any(|a| a == "--init-db" || a == "--db-check") {
        let app_data = std::env::var("APPDATA")
            .map(PathBuf::from)
            .unwrap_or_else(|_| PathBuf::from("."));

        let db_path = app_data
            .join("com.mtgcollectionmanager.desktop")
            .join("database")
            .join("collection.db");

        println!("Initializing SQLite database at: {}", db_path.display());
        let db = mtg_collection_manager_lib::db::Database::init_file(&db_path)
            .expect("Failed to initialize database");
        let info = db.get_info().expect("Failed to get db info");

        println!("Database initialized successfully!");
        println!("Path: {}", info.path);
        println!("Schema Version: {}", info.schema_version);
        println!("Integrity Status: {}", info.integrity_status);
        return;
    }

    mtg_collection_manager_lib::run();
}
