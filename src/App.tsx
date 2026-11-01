import React, { useCallback, useEffect, useState } from "react";
import { Navbar } from "./components/Navbar";
import { ScryfallSearchModal } from "./components/ScryfallSearchModal";
import { StatusBanner } from "./components/StatusBanner";
import { CollectionsPage } from "./pages/CollectionsPage";
import { Dashboard } from "./pages/Dashboard";
import { InventoryPage } from "./pages/InventoryPage";
import { LocationsPage } from "./pages/LocationsPage";
import { SettingsPage } from "./pages/SettingsPage";
import { api } from "./services/api";
import { useI18n } from "./i18n";
import type {
  ActiveTab,
  AddManualCardInput,
  CollectionSummary,
  CreateLocationInput,
  DatabaseInfo,
  InventoryItemDetail,
  Location,
} from "./types";

export const App: React.FC = () => {
  const { t } = useI18n();
  const [activeTab, setActiveTab] = useState<ActiveTab>("dashboard");
  const [dbInfo, setDbInfo] = useState<DatabaseInfo | null>(null);
  const [inventory, setInventory] = useState<InventoryItemDetail[]>([]);
  const [collections, setCollections] = useState<CollectionSummary[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorNotification, setErrorNotification] = useState<string | null>(null);

  // Modals
  const [isAddCardModalOpen, setIsAddCardModalOpen] = useState(false);
  const [isScryfallModalOpen, setIsScryfallModalOpen] = useState(false);
  const [isCreateCollectionModalOpen, setIsCreateCollectionModalOpen] = useState(false);

  const loadAllData = useCallback(async () => {
    try {
      setIsLoading(true);
      setErrorNotification(null);
      const [info, inv, cols, locs] = await Promise.all([
        api.getDbInfo(),
        api.getInventoryItems(),
        api.listCollections(),
        api.listLocations(),
      ]);
      setDbInfo(info);
      setInventory(inv);
      setCollections(cols);
      setLocations(locs);

      // Auto-heal missing metadata/images for legacy or manually entered cards in background
      api.healInventoryImages().then((healedCount) => {
        if (healedCount > 0) {
          api.getInventoryItems().then(setInventory).catch(() => {});
        }
      }).catch(() => {});
    } catch (err) {
      console.error("Failed to load application data:", err);
      setErrorNotification(String(err));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAllData();
  }, [loadAllData]);

  // Inventory actions
  const handleAddCard = async (input: AddManualCardInput) => {
    await api.addManualCard(input);
    await loadAllData();
  };

  const handleUpdateQuantity = async (id: string, delta: number) => {
    await api.updateInventoryQuantity(id, delta, false);
    await loadAllData();
  };

  const handleDeleteItem = async (id: string) => {
    if (confirm(t("inventory.deleteCardConfirm"))) {
      await api.deleteInventoryItem(id);
      await loadAllData();
    }
  };

  const handleAssignToCollection = async (collectionId: string, inventoryItemId: string) => {
    await api.assignToCollection(collectionId, inventoryItemId);
    await loadAllData();
  };

  const handleRemoveFromCollection = async (collectionId: string, inventoryItemId: string) => {
    await api.removeFromCollection(collectionId, inventoryItemId);
    await loadAllData();
  };

  // Collection actions
  const handleCreateCollection = async (name: string, description?: string) => {
    await api.createCollection(name, description);
    await loadAllData();
  };

  const handleRenameCollection = async (id: string, name: string, description?: string) => {
    await api.renameCollection(id, name, description);
    await loadAllData();
  };

  const handleDeleteCollection = async (id: string) => {
    await api.deleteCollection(id);
    await loadAllData();
  };

  // Location actions
  const handleCreateLocation = async (input: CreateLocationInput) => {
    await api.createLocation(input);
    await loadAllData();
  };

  const handleDeleteLocation = async (id: string) => {
    await api.deleteLocation(id);
    await loadAllData();
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        dbInfo={dbInfo}
        onRefresh={loadAllData}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <StatusBanner />

        {errorNotification && (
          <div className="mb-6 p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-sm flex items-center justify-between">
            <span>{errorNotification}</span>
            <button
              onClick={() => setErrorNotification(null)}
              className="text-xs text-rose-400 hover:text-rose-200 underline"
            >
              {t("common.dismiss")}
            </button>
          </div>
        )}

        {isLoading && !dbInfo ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-400">
            <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mb-3"></div>
            <p className="text-sm">{t("settings.connectingDb")}</p>
          </div>
        ) : (
          <>
            {activeTab === "dashboard" && (
              <Dashboard
                dbInfo={dbInfo}
                inventory={inventory}
                setActiveTab={setActiveTab}
                onOpenAddCard={() => setIsAddCardModalOpen(true)}
                onOpenScryfallSearch={() => setIsScryfallModalOpen(true)}
                onOpenCreateCollection={() => setIsCreateCollectionModalOpen(true)}
              />
            )}

            {activeTab === "inventory" && (
              <InventoryPage
                inventory={inventory}
                collections={collections}
                locations={locations}
                onAddCard={handleAddCard}
                onOpenScryfallModal={() => setIsScryfallModalOpen(true)}
                onUpdateQuantity={handleUpdateQuantity}
                onDeleteItem={handleDeleteItem}
                onAssignToCollection={handleAssignToCollection}
                onRemoveFromCollection={handleRemoveFromCollection}
                isAddCardModalOpen={isAddCardModalOpen}
                setIsAddCardModalOpen={setIsAddCardModalOpen}
              />
            )}

            {activeTab === "collections" && (
              <CollectionsPage
                collections={collections}
                inventory={inventory}
                onCreateCollection={handleCreateCollection}
                onRenameCollection={handleRenameCollection}
                onDeleteCollection={handleDeleteCollection}
                onRemoveFromCollection={handleRemoveFromCollection}
                isCreateModalOpen={isCreateCollectionModalOpen}
                setIsCreateModalOpen={setIsCreateCollectionModalOpen}
              />
            )}

            {activeTab === "locations" && (
              <LocationsPage
                locations={locations}
                onCreateLocation={handleCreateLocation}
                onDeleteLocation={handleDeleteLocation}
              />
            )}

            {activeTab === "settings" && (
              <SettingsPage
                dbInfo={dbInfo}
                onRefresh={loadAllData}
                onVerifyIntegrity={api.verifyIntegrity}
              />
            )}
          </>
        )}
      </main>

      {/* Global Scryfall Search Modal */}
      <ScryfallSearchModal
        isOpen={isScryfallModalOpen}
        onClose={() => setIsScryfallModalOpen(false)}
        collections={collections}
        locations={locations}
        onCardAdded={loadAllData}
      />

      <footer className="border-t border-slate-800/80 py-4 text-center text-xs text-slate-400">
        <p>{t("common.footerDisclaimer")}</p>
      </footer>
    </div>
  );
};
