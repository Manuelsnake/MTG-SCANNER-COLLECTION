use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct Card {
    pub id: String,
    pub oracle_id: Option<String>,
    pub name: String,
    pub created_at: String,
    pub updated_at: String,
}
