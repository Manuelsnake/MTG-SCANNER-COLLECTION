# MTG Collection Manager

[![Licenza](https://img.shields.io/badge/Licenza-Apache_2.0-blue.svg)](LICENSE)
[![Piattaforma](https://img.shields.io/badge/Piattaforma-Windows%20%7C%20Linux%20%7C%20macOS-lightgrey.svg)]()
[![Backend](https://img.shields.io/badge/Backend-Tauri_2%20%7C%20Rust-orange.svg)]()
[![Frontend](https://img.shields.io/badge/Frontend-React_19%20%7C%20TypeScript%20%7C%20Tailwind_4-blue.svg)]()

> [English](README.md) | **Italiano**

**MTG Collection Manager** è un'applicazione desktop libera, open-source e attenta alla privacy per la scansione, l'identificazione e la catalogazione di collezioni di carte di Magic: The Gathering. Sviluppata con **Tauri 2**, **Rust** e **React 19**, pone come priorità assoluta un'esperienza solida e reattiva su **Windows**, preservando un'architettura modulare e pulita per Linux e macOS.

---

## Funzionalità Principali

### 1. Acquisizione Multicanale delle Carte
- **Scanner Webcam Live in Tempo Reale:** Anteprima video fluida a 60 FPS con rilevamento automatico della stabilità della carta, anti-duplicazione live per non riscandire la stessa carta e supporto al rilevamento di più carte contemporaneamente nell'inquadratura.
- **Scanner Piani e Documentali Fisici:** Supporto dedicato a scanner su superficie piana (flatbed) tramite un processo ausiliario (sidecar) TWAIN a 32-bit isolato (Windows), driver nativi WIA 2.0 a 64-bit (Windows) e SANE (Linux/macOS).
- **Importazione da Cartelle e Watch Folder:** Monitoraggio reattivo di cartelle esterne con rilevamento atomico del completamento di scrittura, deduplicazione con hash SHA-256 e protezione assoluta degli originali in sola lettura.
- **Segmentazione Automatica Multi-Carta:** Rileva, ritaglia e raddrizza in prospettiva più carte scansionate insieme su un piano A4, normalizzandole alla risoluzione di $744 \times 1039$ pixel.

### 2. Motore Ibrido di Riconoscimento Carte
- **Modelli AI di Visione Locali:** Esecuzione di modelli vision-language compatti direttamente sul dispositivo (Liquid AI LFM2.5-VL 450M, 1.6B, 3B o Qwen2.5-VL) tramite `llama.cpp` con accelerazione Vulkan (GPU AMD e NVIDIA), Metal (macOS) o fallback multi-core su CPU (OpenMP).
- **Modalità Zero-AI / Solo OCR:** Funzionamento al 100% senza scaricare alcun modello AI (< 80 MB di RAM). Utilizza Tesseract OCR locale interfacciato direttamente con il database Scryfall.
- **Identificazione Scryfall & Bulk Data Offline:** Risoluzione di identità, edizioni specifiche, illustrazioni alternative, varianti di bordo e lingue tramite l'API di Scryfall (rate limit conservativo a ~5 req/s) e ricerca istantanea offline tramite dump Scryfall Bulk Data.
- **Coda di Revisione e Verifica Obbligatoria:** Nessun riconoscimento incerto viene salvato alla cieca. L'utente conferma, modifica l'edizione o corregge lingua e finitura prima dell'inserimento permanente.

### 3. Gestione Completa dell'Inventario e delle Collezioni
- **Database Relazionale SQLite Permanente:** Schema relazionale che separa rigorosamente l'identità canonica della carta (Oracle) dalle stampe fisiche e dalle singole copie possedute.
- **Tracciamento Dettagliato delle Copie Fisiche:** Quantità, condizione (NM, LP, MP, HP, DMG), finitura (Non-foil, Foil Tradizionale, Etched), lingua, prezzo di acquisto, data di acquisizione e posizione fisica esatta (Nome raccoglitore, Scatola, Pagina e Slot).
- **Collezioni Virtuali Molti-a-Molti:** Organizzazione delle carte in collezioni logiche multiple (es. *Raccoglitore Rare*, *Collezione Foil*, *Mazzo Commander*, *Carte in Vendita*) senza duplicare i record fisici dell'inventario.

### 4. Monitoraggio Prezzi in EUR ed Esportazioni Certificate
- **Prezzi di Mercato:** Tracciamento integrato dei valori in EUR e USD da Scryfall (aggiornati giornalmente da Cardmarket) e modulo opzionale per le API di CardTrader.
- **Link Diretti di Mercato:** Collegamenti ipertestuali diretti alle pagine ufficiali di Cardmarket senza violare le policy con web scraping non autorizzato.
- **Esportatori Standard:** Esportazione dell'intera collezione o di singoli raccoglitori in formato CSV per Moxfield, Archidekt e Deckbox, ed esportazione decklist nel formato testo ufficiale per Magic Arena e MTGO.

---

## Panoramica dell'Architettura

```
MTG Collection Manager
├── Frontend: React 19 + TypeScript + Vite + Tailwind CSS 4 + Zustand
├── Shell Desktop: Tauri 2 (Rust)
├── Database: SQLite (integrato via rusqlite con WAL mode e FTS5)
├── Acquisizione:
│   ├── Scanner Live Webcam (HTML5 MediaDevices + Web Worker stabilità)
│   ├── Sidecar TWAIN Windows (Processo isolato a 32-bit via TWAINDSM.dll)
│   ├── Windows WIA 2.0 (COM Nativo a 64-bit)
│   └── Linux SANE CLI (scanimage)
├── Computer Vision: Warping prospettico (aspect ratio 0.716) & orientamento
├── Livello di Inferenza:
│   ├── llama-cpp-2 (Compute Vulkan / Metal / CPU AVX2)
│   └── Motore Standalone Tesseract OCR
└── API Esterne: Scryfall API (client con rate limit a 5 req/s) & CardTrader API
```

---

## Tabella dei Milestone di Sviluppo

- **Milestone 0: Preparazione del Progetto & CI** *(Attuale)*
  - Setup repository Git, licenza Apache-2.0, file NOTICE, documentazione bilingue, verifiche CI.
- **Milestone 1: Fondamenta & Schema Relazionale SQLite**
  - Scaffold Tauri 2 + React 19, database a 10 tabelle relazionali con migrazioni versionate.
- **Milestone 2: Client Asincrono Scryfall & Cache Locale**
  - Rate limiting a ~5 req/s, backoff esponenziale, ingestione Bulk Data, interfaccia di verifica.
- **Milestone 3: Acquisizione Immagini, Ritaglio & Scanner Live Webcam**
  - Live Camera Scanner a 60 FPS con rilevamento stabilità e anti-duplicato, test comparativi OpenCV/Rust.
- **Milestone 4: Scanner Fisici Flatbed (Priorità Windows)**
  - Sidecar TWAIN a 32-bit, WIA 2.0 nativo, protezione scanner piani.
- **Milestone 5: Modulo AI di Visione Locale & Modalità No-AI**
  - PoC standalone, accelerazione Vulkan per GPU (AMD Radeon / NVIDIA), modelli LFM2.5-VL, fallback No-AI.
- **Milestone 6: Inventario Fisico & Collezioni Virtuali**
  - Griglia virtualizzata (oltre 20.000 carte), coordinate di stoccaggio fisico, collezioni molti-a-molti.
- **Milestone 7: Prezzi EUR & Esportatori Certificati**
  - Scryfall EUR, CardTrader API, link Cardmarket, esportazioni Moxfield/Archidekt/Deckbox.
- **Milestone 8: Packaging Cross-Platform & GitHub Release**
  - Installer Windows `.exe` (NSIS) e `.msi`, Linux `.AppImage`/`.deb`, macOS `.dmg`.

---

## Licenze e Attribuzioni

- **Codice del Progetto:** Rilasciato sotto [Licenza Apache, Versione 2.0](LICENSE).
- **Note di Terze Parti:** Consultare il file [NOTICE](NOTICE) per licenze e note relative a Cardloader (Apache-2.0), TWAINDSM (LGPL-2.1), llama.cpp (MIT) e modelli Liquid AI LFM.
- **Disclaimer Wizards of the Coast:** MTG Collection Manager è un contenuto amatoriale non ufficiale consentito dalla Fan Content Policy di Wizards of the Coast. Non è approvato o sponsorizzato da Wizards. Magic: The Gathering è un marchio registrato di Wizards of the Coast LLC.
