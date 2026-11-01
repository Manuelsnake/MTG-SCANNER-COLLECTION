export interface DatabaseInfo {
  path: string;
  schema_version: number;
  cards_count: number;
  printings_count: number;
  inventory_count: number;
  total_card_quantity: number;
  collections_count: number;
  locations_count: number;
  integrity_status: string;
}

export interface CollectionSummary {
  id: string;
  name: string;
  description: string | null;
  total_items: number;
  total_quantity: number;
  created_at: string;
  updated_at: string;
}

export interface InventoryItemDetail {
  id: string;
  printing_id: string;
  card_id: string;
  scryfall_id?: string | null;
  card_name: string;
  printed_name?: string | null;
  set_code: string;
  collector_number: string;
  set_name: string;
  rarity?: string | null;
  mana_cost?: string | null;
  image_url?: string | null;
  image_small?: string | null;
  image_art_crop?: string | null;
  local_image_path?: string | null;
  image_status?: string | null;
  card_faces?: string | null;
  quantity: number;
  language: string;
  finish: string;
  condition: string;
  acquisition_date: string | null;
  purchase_price: number | null; // Cents (e.g. 150 = €1.50)
  currency: string;
  location_id: string | null;
  location_name: string | null;
  notes: string | null;
  collection_ids: string[];
  created_at: string;
  updated_at: string;
}

export interface AddManualCardInput {
  card_name: string;
  set_code: string;
  collector_number: string;
  set_name: string;
  quantity: number;
  language: string;
  finish: string;
  condition: string;
  purchase_price?: number | null;
  currency?: string | null;
  location_id?: string | null;
  notes?: string | null;
}

export interface ScryfallCardFace {
  name: string;
  printed_name?: string | null;
  mana_cost?: string | null;
  type_line?: string | null;
  oracle_text?: string | null;
  colors?: string[];
  image_uris?: {
    small?: string;
    normal?: string;
    large?: string;
    png?: string;
    art_crop?: string;
    border_crop?: string;
  };
}

export interface ScryfallSearchResult {
  scryfall_id: string;
  oracle_id: string | null;
  name: string;
  printed_name?: string | null;
  lang?: string;
  set_code: string;
  set_name: string;
  collector_number: string;
  released_at: string | null;
  rarity: string | null;
  mana_cost: string | null;
  type_line: string | null;
  colors: string[];
  image_url: string | null;
  image_small: string | null;
  image_art_crop: string | null;
  card_faces?: ScryfallCardFace[] | string | null;
  is_paper?: boolean;
  digital?: boolean;
  artist?: string | null;
  finishes: string[];
  price_eur: number | null; // Cents
  price_eur_foil: number | null; // Cents
  scryfall_uri: string | null;
}

export interface ScryfallCard {
  id: string;
  oracle_id?: string | null;
  name: string;
  printed_name?: string | null;
  lang: string;
  released_at?: string | null;
  layout?: string | null;
  mana_cost?: string | null;
  cmc?: number | null;
  type_line?: string | null;
  oracle_text?: string | null;
  colors?: string[] | null;
  color_identity?: string[] | null;
  set: string;
  set_name: string;
  collector_number: string;
  rarity: string;
  finishes: string[];
  scryfall_uri?: string | null;
}

export interface AddScryfallCardInput {
  scryfall_id: string;
  oracle_id?: string | null;
  card_name: string;
  printed_name?: string | null;
  set_code: string;
  collector_number: string;
  set_name: string;
  release_date?: string | null;
  layout?: string | null;
  rarity?: string | null;
  mana_cost?: string | null;
  type_line?: string | null;
  image_url?: string | null;
  image_small?: string | null;
  image_art_crop?: string | null;
  card_faces?: ScryfallCardFace[] | string | null;
  quantity: number;
  language: string;
  finish: string;
  condition: string;
  purchase_price?: number | null;
  currency?: string | null;
  location_id?: string | null;
  notes?: string | null;
  collection_ids: string[];
}

export interface ImageCacheStats {
  total_images: number;
  total_bytes: number;
  cache_dir: string;
}

export interface Location {
  id: string;
  name: string;
  location_type: string;
  parent_id: string | null;
  description: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateLocationInput {
  name: string;
  location_type: string;
  parent_id?: string | null;
  description?: string | null;
}

export type ActiveTab = "dashboard" | "inventory" | "collections" | "locations" | "settings";

export interface SupportedLanguage {
  code: string;
  name: string;
  nativeName: string;
}

export const SUPPORTED_LANGUAGES: SupportedLanguage[] = [
  { code: "any", name: "Any Language", nativeName: "Tutte le lingue" },
  { code: "en", name: "English", nativeName: "English" },
  { code: "it", name: "Italian", nativeName: "Italiano" },
  { code: "fr", name: "French", nativeName: "Français" },
  { code: "de", name: "German", nativeName: "Deutsch" },
  { code: "es", name: "Spanish", nativeName: "Español" },
  { code: "pt", name: "Portuguese", nativeName: "Português" },
  { code: "ja", name: "Japanese", nativeName: "日本語" },
  { code: "ko", name: "Korean", nativeName: "한국어" },
  { code: "ru", name: "Russian", nativeName: "Русский" },
  { code: "zhs", name: "Simplified Chinese", nativeName: "简体中文" },
  { code: "zht", name: "Traditional Chinese", nativeName: "繁體中文" },
  { code: "he", name: "Hebrew", nativeName: "עברית" },
  { code: "la", name: "Latin", nativeName: "Latina" },
  { code: "grc", name: "Ancient Greek", nativeName: "Ἑλληνική" },
  { code: "ar", name: "Arabic", nativeName: "العربية" },
  { code: "sa", name: "Sanskrit", nativeName: "संस्कृतम्" },
  { code: "ph", name: "Phyrexian", nativeName: "Phyrexian" },
];
