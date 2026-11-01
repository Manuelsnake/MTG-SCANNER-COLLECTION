use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, Default, PartialEq, Eq)]
pub struct ScryfallImageUris {
    pub small: Option<String>,
    pub normal: Option<String>,
    pub large: Option<String>,
    pub png: Option<String>,
    pub art_crop: Option<String>,
    pub border_crop: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct ScryfallCardFace {
    pub name: String,
    pub printed_name: Option<String>,
    pub mana_cost: Option<String>,
    pub type_line: Option<String>,
    pub oracle_text: Option<String>,
    pub colors: Option<Vec<String>>,
    pub image_uris: Option<ScryfallImageUris>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct ScryfallPrices {
    pub eur: Option<String>,
    pub eur_foil: Option<String>,
    pub usd: Option<String>,
    pub usd_foil: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ScryfallCard {
    pub id: String,
    pub oracle_id: Option<String>,
    pub name: String,
    pub printed_name: Option<String>,
    pub lang: Option<String>,
    pub set: String,
    pub set_name: String,
    pub collector_number: String,
    pub released_at: Option<String>,
    pub rarity: String,
    pub mana_cost: Option<String>,
    pub type_line: Option<String>,
    pub oracle_text: Option<String>,
    pub colors: Option<Vec<String>>,
    pub color_identity: Option<Vec<String>>,
    pub image_uris: Option<ScryfallImageUris>,
    pub card_faces: Option<Vec<ScryfallCardFace>>,
    #[serde(default)]
    pub finishes: Vec<String>,
    pub prices: Option<ScryfallPrices>,
    pub scryfall_uri: Option<String>,
    pub prints_search_uri: Option<String>,
    pub games: Option<Vec<String>>,
    pub digital: Option<bool>,
    pub artist: Option<String>,
    pub flavor_text: Option<String>,
    pub layout: Option<String>,
}

impl ScryfallCard {
    /// Retrieve image URL handling both single-face and multi-face/transform cards
    pub fn get_image_url(&self, size: &str) -> Option<String> {
        if let Some(ref uris) = self.image_uris {
            return match size {
                "small" => uris.small.clone().or_else(|| uris.normal.clone()),
                "art_crop" => uris.art_crop.clone().or_else(|| uris.normal.clone()),
                "large" => uris.large.clone().or_else(|| uris.normal.clone()),
                _ => uris.normal.clone().or_else(|| uris.small.clone()),
            };
        }

        // Double-faced cards have image_uris inside card_faces
        if let Some(ref faces) = self.card_faces {
            if let Some(first_face) = faces.first() {
                if let Some(ref uris) = first_face.image_uris {
                    return match size {
                        "small" => uris.small.clone().or_else(|| uris.normal.clone()),
                        "art_crop" => uris.art_crop.clone().or_else(|| uris.normal.clone()),
                        "large" => uris.large.clone().or_else(|| uris.normal.clone()),
                        _ => uris.normal.clone().or_else(|| uris.small.clone()),
                    };
                }
            }
        }

        None
    }

    /// Parse price string in EUR to integer cents (€1.50 -> 150)
    pub fn get_eur_cents(&self) -> Option<i64> {
        self.prices
            .as_ref()
            .and_then(|p| p.eur.as_deref())
            .and_then(|s| s.parse::<f64>().ok())
            .map(|f| (f * 100.0).round() as i64)
    }

    /// Parse price string in EUR Foil to integer cents
    pub fn get_eur_foil_cents(&self) -> Option<i64> {
        self.prices
            .as_ref()
            .and_then(|p| p.eur_foil.as_deref())
            .and_then(|s| s.parse::<f64>().ok())
            .map(|f| (f * 100.0).round() as i64)
    }

    pub fn is_paper(&self) -> bool {
        if let Some(ref g) = self.games {
            g.iter().any(|game| game.eq_ignore_ascii_case("paper"))
        } else {
            !self.digital.unwrap_or(false)
        }
    }

    pub fn to_search_result(&self) -> ScryfallSearchResult {
        let is_paper = self.is_paper();
        ScryfallSearchResult {
            scryfall_id: self.id.clone(),
            oracle_id: self.oracle_id.clone(),
            name: self.name.clone(),
            printed_name: self.printed_name.clone(),
            set_code: self.set.to_uppercase(),
            set_name: self.set_name.clone(),
            collector_number: self.collector_number.clone(),
            released_at: self.released_at.clone(),
            rarity: self.rarity.clone(),
            mana_cost: self.mana_cost.clone(),
            type_line: self.type_line.clone(),
            oracle_text: self.oracle_text.clone(),
            colors: self.colors.clone().unwrap_or_default(),
            image_url: self.get_image_url("normal"),
            image_small: self.get_image_url("small"),
            image_art_crop: self.get_image_url("art_crop"),
            finishes: if self.finishes.is_empty() {
                vec!["nonfoil".to_string()]
            } else {
                self.finishes.clone()
            },
            price_eur: self.get_eur_cents(),
            price_eur_foil: self.get_eur_foil_cents(),
            scryfall_uri: self.scryfall_uri.clone(),
            lang: self.lang.clone().unwrap_or_else(|| "en".to_string()),
            games: self.games.clone().unwrap_or_default(),
            is_paper,
            digital: self.digital.unwrap_or(false),
            artist: self.artist.clone(),
            card_faces: self.card_faces.clone(),
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ScryfallList<T> {
    pub object: String,
    pub total_cards: Option<u32>,
    pub has_more: bool,
    pub next_page: Option<String>,
    pub data: Vec<T>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ScryfallAutocomplete {
    pub object: String,
    pub total_values: u32,
    pub data: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct ScryfallSearchResult {
    pub scryfall_id: String,
    pub oracle_id: Option<String>,
    pub name: String,
    pub printed_name: Option<String>,
    pub set_code: String,
    pub set_name: String,
    pub collector_number: String,
    pub released_at: Option<String>,
    pub rarity: String,
    pub mana_cost: Option<String>,
    pub type_line: Option<String>,
    pub oracle_text: Option<String>,
    pub colors: Vec<String>,
    pub image_url: Option<String>,
    pub image_small: Option<String>,
    pub image_art_crop: Option<String>,
    pub finishes: Vec<String>,
    pub price_eur: Option<i64>,
    pub price_eur_foil: Option<i64>,
    pub scryfall_uri: Option<String>,
    pub lang: String,
    pub games: Vec<String>,
    pub is_paper: bool,
    pub digital: bool,
    pub artist: Option<String>,
    pub card_faces: Option<Vec<ScryfallCardFace>>,
}
