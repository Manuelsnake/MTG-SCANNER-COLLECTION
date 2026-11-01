import { invoke } from "@tauri-apps/api/core";
import type {
  AddManualCardInput,
  AddScryfallCardInput,
  CollectionSummary,
  CreateLocationInput,
  DatabaseInfo,
  InventoryItemDetail,
  Location,
  ScryfallCard,
  ScryfallSearchResult,
} from "../types";

export const api = {
  // Database Commands
  async getDbInfo(): Promise<DatabaseInfo> {
    return await invoke<DatabaseInfo>("get_db_info");
  },

  async verifyIntegrity(): Promise<string> {
    return await invoke<string>("verify_integrity");
  },

  // Collections Commands
  async listCollections(): Promise<CollectionSummary[]> {
    return await invoke<CollectionSummary[]>("list_collections");
  },

  async createCollection(name: string, description?: string): Promise<void> {
    await invoke("create_collection", { input: { name, description } });
  },

  async renameCollection(id: string, name: string, description?: string): Promise<void> {
    await invoke("rename_collection", { input: { id, name, description } });
  },

  async deleteCollection(id: string): Promise<void> {
    await invoke("delete_collection", { id });
  },

  async assignToCollection(collectionId: string, inventoryItemId: string): Promise<void> {
    await invoke("assign_to_collection", {
      collectionId,
      inventoryItemId,
    });
  },

  async removeFromCollection(collectionId: string, inventoryItemId: string): Promise<void> {
    await invoke("remove_from_collection", {
      collectionId,
      inventoryItemId,
    });
  },

  // Inventory Commands
  async getInventoryItems(search?: string, collectionId?: string): Promise<InventoryItemDetail[]> {
    return await invoke<InventoryItemDetail[]>("get_inventory_items", {
      search: search || null,
      collectionId: collectionId || null,
    });
  },

  async addManualCard(input: AddManualCardInput): Promise<InventoryItemDetail> {
    return await invoke<InventoryItemDetail>("add_manual_card", { input });
  },

  async addCardFromScryfall(input: AddScryfallCardInput): Promise<InventoryItemDetail> {
    return await invoke<InventoryItemDetail>("add_card_from_scryfall", { input });
  },

  async updateInventoryQuantity(
    id: string,
    deltaOrSet: number,
    isAbsolute = false
  ): Promise<number> {
    return await invoke<number>("update_inventory_quantity", {
      id,
      deltaOrSet,
      isAbsolute,
    });
  },

  async deleteInventoryItem(id: string): Promise<void> {
    await invoke("delete_inventory_item", { id });
  },

  // Locations Commands
  async listLocations(): Promise<Location[]> {
    return await invoke<Location[]>("list_locations");
  },

  async createLocation(input: CreateLocationInput): Promise<Location> {
    return await invoke<Location>("create_location", { input });
  },

  async deleteLocation(id: string): Promise<void> {
    await invoke("delete_location", { id });
  },

  // Scryfall Commands
  async scryfallAutocomplete(query: string): Promise<string[]> {
    return await invoke<string[]>("scryfall_autocomplete", { query });
  },

  async scryfallSearch(query: string, page = 1): Promise<ScryfallSearchResult[]> {
    return await invoke<ScryfallSearchResult[]>("scryfall_search", { query, page });
  },

  async scryfallGetPrintings(oracleId: string): Promise<ScryfallSearchResult[]> {
    return await invoke<ScryfallSearchResult[]>("scryfall_get_printings", { oracleId });
  },

  async scryfallGetCard(setCode: string, collectorNumber: string): Promise<ScryfallCard> {
    return await invoke<ScryfallCard>("scryfall_get_card", {
      setCode,
      collectorNumber,
    });
  },
};
