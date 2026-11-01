# MTG Collection Manager

[![License](https://img.shields.io/badge/License-Apache_2.0-blue.svg)](LICENSE)
![Platform](https://img.shields.io/badge/Platform-Windows%20%7C%20Linux%20%7C%20macOS-lightgrey.svg)
![Backend](https://img.shields.io/badge/Backend-Tauri_2%20%7C%20Rust-orange.svg)
![Frontend](https://img.shields.io/badge/Frontend-React_19%20%7C%20TypeScript%20%7C%20Tailwind_4-blue.svg)

**English** | [Italiano](README.it.md)

> [!NOTE]
> **Project Status: In Active Development (Milestone 0 Completed)**
>
> MTG Collection Manager is currently in its initial architecture and repository setup phase. Milestone 0 is completed, and Milestone 1 has not yet begun. No Tauri or React application code has been generated yet. All features, performance targets (such as 60 FPS webcam scanning), and architectural components outlined below represent design specifications and planned targets for the final product.

**MTG Collection Manager** is a free, open-source, privacy-focused desktop application for scanning, identifying, and organizing Magic: The Gathering card collections. Built on **Tauri 2**, **Rust**, and **React 19**, it prioritizes a fast, rock-solid Windows experience while preserving a clean cross-platform architecture for Linux and macOS.

---

## Planned Features & Technical Targets

### 1. Multi-Channel Card Acquisition (Target Capabilities)

- **Real-Time Live Camera Scanner:** Target 60 FPS webcam/USB camera preview with planned automatic card stability detection, live anti-duplicate tracking, and support for multiple cards in frame.
- **Physical Document & Flatbed Scanners:** Planned dedicated support for flatbed glass scanners via an isolated 32-bit TWAIN helper sidecar (Windows), native 64-bit WIA 2.0 (Windows), and SANE (Linux/macOS).
- **Batch Folder & Watch Folder Ingest:** Planned reactive monitoring of external capture folders with atomic write detection, automatic image deduplication via SHA-256 hashes, and read-only source preservation.
- **Automatic Multi-Card Segmentation:** Planned automatic detection, cropping, and perspective rectification of multiple cards scanned together on an A4 flatbed scanner into normalized $744 \times 1039$ px images.

### 2. Hybrid Card Recognition & Integrated Local AI Engine (Planned Architecture)

- **Integrated Local AI Model Manager:** Completely self-contained in-application AI management. End users are **never required to install or configure external tools** such as Ollama, LM Studio, or background model services.
  - *Hardware Diagnostics:* Automatic detection of CPU architecture/threads, system RAM, discrete/integrated GPU, queryable VRAM, OS version, and available storage space.
  - *Hardware-Based Recommendations:* Tiered model suggestions based on detected hardware: *Lightweight* (fastest execution, minimal resource footprint), *Balanced* (optimal balance of accuracy and latency), *Advanced* (maximum accuracy for high-spec systems), and *Manual* model selection.
  - *Integrated Model Catalog:* Comprehensive catalog tracking model name, version, architecture, download size, estimated runtime RAM/VRAM footprint, supported inference backends, minimum hardware requirements, official license, and verified download URLs.
  - *In-App Download Manager:* Real-time download progress, pause, resume, cancellation, SHA-256 checksum verification, pre-flight disk space validation, model updates, clean uninstallation, and customizable model storage directory.
  - *Embedded Inference Engine:* Internal model loading and inference via embedded `llama.cpp` Rust bindings (`llama-cpp-2`) with an optimized universal CPU fallback (AVX2/OpenMP). Acceleration (Vulkan for AMD/NVIDIA, Metal for macOS) is only enabled after experimental verification on target hardware. Model weights are never bundled into the standard application installer.
- **Local Vision AI Models:** Target execution of compact on-device vision-language models (Liquid AI LFM2.5-VL 450M, 1.6B, 3B or Qwen2.5-VL in verified GGUF quantization formats) for fast card detection and identification.
- **Zero-AI / OCR-Only Mode:** Planned 100% download-free mode (< 80 MB RAM target). Uses local Tesseract OCR paired directly with Scryfall's database for users who prefer not to download AI models.
- **Scryfall Identification & Offline Bulk Data:** Planned resolution of card identity, specific printings, alternative arts, frame variations, and languages via Scryfall API (rate-limited to ~5 req/s) with offline lookup via daily Scryfall Bulk Data caches.
- **Mandatory Review & Verification Queue:** Planned verification workflow where uncertain matches are never silently committed. Users will review, change edition, correct language/finish, or manually search before adding to inventory.

### 3. Collection & Inventory Management (Planned Features)

- **Permanent SQLite Database:** Planned relational schema separating canonical card identities (Oracle) from physical printings and individual owned copies.
- **Granular Physical Copy Tracking:** Planned tracking of quantities, condition (NM, LP, MP, HP, DMG), finish (Non-foil, Traditional Foil, Etched), language, purchase price, purchase date, and exact physical storage location (Binder name, Box name, Page, and Slot coordinate).
- **Many-to-Many Virtual Collections:** Planned categorization of cards into multiple logical collections (e.g., *Rare Binder*, *Foil Collection*, *Commander Deck*, *Cards for Sale*) without duplicating underlying inventory records.

### 4. Market Pricing & Verified Exports (Planned Integrations)

- **Market Pricing:** Planned EUR and USD price tracking from Scryfall (sourced from Cardmarket daily updates) and optional modular CardTrader API integration.
- **Compliant Marketplace Links:** Planned direct clickable links to official Cardmarket product pages without unauthorized web scraping.
- **Standardized Collection Exports:** Planned exports of collections or single binders to Moxfield, Archidekt, and Deckbox CSV formats, as well as decklist export to Magic Arena / MTGO text format.

### 5. Integrated MTG Assistant (Local AI Chat — Planned Future Milestone)

- **Dedicated Local MTG Assistant:** Powered by the internal local AI engine, providing an offline conversational interface with zero reliance on paid cloud AI subscriptions. All personal collection data and chat history remain strictly confidential and stored on the user's local disk.
- **Application Guidance:** Answers questions about application features, guides new users through inventory workflows, and provides step-by-step troubleshooting assistance.
- **Natural Language Collection Search & Statistics:** Allows querying owned cards using conversational language (e.g., *"Show me all foil black vampires from Innistrad"* or *"Summarize the total market value of my Commander decks"*). Any proposed collection modifications or batch updates generated by the assistant require explicit user confirmation before execution.
- **Comprehensive Rules & Card Rulings:** Explains complex card interactions and answers rules questions referenced against the official Magic Comprehensive Rules and Scryfall card rulings. Clearly indicates the specific version/effective date of the Comprehensive Rules used and strictly distinguishes verified official rules citations from AI-synthesized explanations.

---

## Target Architecture Overview

> [!NOTE]
> The diagram below represents the target software architecture for the completed application. The current Milestone 0 repository hosts the governance baseline, CI workflows, licensing, and technical specifications. Application implementation will begin in Milestone 1.

```text
MTG Collection Manager (Target Product Architecture)
├── Frontend: React 19 + TypeScript + Vite + Tailwind CSS 4 + Zustand
│   ├── Navigation & Collection Views (Inventory, Binders, Decks, Markets)
│   ├── Integrated AI Chat Assistant (Natural Language Query & Rules Assistant)
│   └── Local Model Manager UI (Hardware Diagnostics, Catalog, In-App Downloader)
├── Desktop Shell: Tauri 2 (Rust)
├── Database: SQLite (bundled via rusqlite with WAL mode and FTS5)
├── Acquisition Layer:
│   ├── Live Camera Scanner (HTML5 MediaDevices + Web Worker stability tracker)
│   ├── Windows TWAIN Helper Sidecar (32-bit isolated process via TWAINDSM.dll)
│   ├── Windows WIA 2.0 (Native 64-bit COM)
│   └── Linux SANE CLI (scanimage)
├── Computer Vision: Image perspective warp (0.716 MTG aspect ratio) & rotation check
├── Embedded AI & Inference Layer:
│   ├── Local Model Manager (Hardware detection, catalog, download/checksum manager)
│   ├── llama.cpp embedded runtime (universal CPU fallback + tested Vulkan/Metal compute)
│   ├── Vision Models (LFM2.5-VL / Qwen2.5-VL GGUF) for card identification
│   ├── Text Models (GGUF) for Local MTG Assistant & Rules Engine
│   └── Tesseract OCR standalone engine (Zero-AI mode)
└── External APIs: Scryfall API (5 req/s rate-limited client) & CardTrader API
```

---

## Development Roadmap

- **Milestone 0: Project Preparation & CI Setup** :white_check_mark: *(Completed)*
  - Git repository initialization, Apache-2.0 license, NOTICE attribution, bilingual documentation, CI lint/security workflows.
- **Milestone 1: Foundations & SQLite Relational Schema** *(In Progress / Verification)*
  - Tauri 2 + React 19 scaffold, relational SQLite database with versioned migrations, physical inventory & collections schema.
- **Milestone 2: Scryfall Asynchronous Client & Local Cache** *(Planned)*
  - Respectful rate-limiting (~5 req/s), exponential backoff, bulk data ingestion, verification UI.
- **Milestone 3: Image Acquisition, Multi-Card Cropping & Live Camera Scanner** *(Planned)*
  - Real-time 60 FPS webcam scanner with auto-stability detection and anti-duplicate lock, comparative OpenCV/Rust cropping tests.
- **Milestone 4: Physical Flatbed Scanners (Windows-First)** *(Planned)*
  - TWAIN 32-bit sidecar, WIA 2.0 integration, flatbed-first protection.
- **Milestone 5: Integrated Local AI Model Manager & Vision Engine (Zero-AI Mode)** *(Planned)*
  - Internal model manager (hardware detection, model catalog, download/checksum manager, custom storage directory).
  - Embedded inference runtime via `llama.cpp` with universal CPU fallback and tested GPU acceleration.
  - Compact on-device vision models (LFM2.5-VL / Qwen2.5-VL) and download-free Zero-AI mode (Tesseract OCR).
  - Zero external dependencies on Ollama, LM Studio, or cloud AI services.
- **Milestone 6: Physical Inventory & Virtual Collections** *(Planned)*
  - High-performance virtualized grid (20,000+ cards), physical storage coordinates, many-to-many collections.
- **Milestone 7: EUR Pricing & Certified Exporters** *(Planned)*
  - Scryfall EUR, CardTrader API, direct Cardmarket links, Moxfield/Archidekt/Deckbox exports.
- **Milestone 8: Integrated MTG Assistant & Local AI Chat** *(Planned)*
  - In-app assistance for application features, navigation, and collection management workflows.
  - Natural language collection search, statistics queries, and strictly user-confirmed collection modifications.
  - Magic Comprehensive Rules grounding with document version tracking and distinction of verified rules vs. AI explanations.
  - 100% local, private, and offline operation by default.
- **Milestone 9: Cross-Platform Packaging & GitHub Releases** *(Planned)*
  - Windows `.exe` (NSIS) and `.msi` installers, Linux `.AppImage`/`.deb`, macOS `.dmg`.

---

## License & Attribution

- **Project Code:** Licensed under the [Apache License, Version 2.0](LICENSE).
- **Third-Party Notices:** See the [NOTICE](NOTICE) file for licenses and attributions regarding planned integrations (Cardloader, TWAINDSM, llama.cpp, Liquid AI).
- **Wizards of the Coast Official Disclaimer:** Wizards of the Coast, Magic: The Gathering, and their logos are trademarks of Wizards of the Coast LLC in the United States and other countries. © 1993-2026 Wizards. All Rights Reserved.

  MTG Collection Manager is unofficial Fan Content permitted under the Fan Content Policy. Not approved/endorsed by Wizards. Portions of the materials used are property of Wizards of the Coast. © Wizards of the Coast LLC.

  MTG Collection Manager is not affiliated with, endorsed, sponsored, or specifically approved by Wizards of the Coast LLC. MTG Collection Manager may use the trademarks and other intellectual property of Wizards of the Coast LLC, which is permitted under Wizards' [Fan Content Policy](https://company.wizards.com/en/legal/fancontentpolicy). For more information about Wizards of the Coast or any of Wizards' trademarks or other intellectual property, please visit their website at [https://company.wizards.com/](https://company.wizards.com/). Original software code created by the MTG Collection Manager project is copyrighted by its contributors under the Apache License, Version 2.0, and does not claim ownership of any intellectual property belonging to Wizards of the Coast LLC.
