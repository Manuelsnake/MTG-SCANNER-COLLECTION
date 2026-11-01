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
  card_name: string;
  set_code: string;
  collector_number: string;
  set_name: string;
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
