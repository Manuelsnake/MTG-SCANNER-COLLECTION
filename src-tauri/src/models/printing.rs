use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct Printing {
    pub id: String,
    pub card_id: String,
    pub scryfall_id: Option<String>,
    pub set_code: String,
    pub collector_number: String,
    pub set_name: String,
    pub release_date: Option<String>,
    pub layout: String,
    pub rarity: Option<String>,
    pub mana_cost: Option<String>,
    pub type_line: Option<String>,
    pub image_url: Option<String>,
    pub price_eur: Option<i64>,
    pub created_at: String,
    pub updated_at: String,
}
