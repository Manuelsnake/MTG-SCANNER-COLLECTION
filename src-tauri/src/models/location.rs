use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct Location {
    pub id: String,
    pub name: String,
    pub location_type: String,
    pub parent_id: Option<String>,
    pub description: Option<String>,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateLocationInput {
    pub name: String,
    pub location_type: String,
    pub parent_id: Option<String>,
    pub description: Option<String>,
}
