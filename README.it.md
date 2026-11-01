# MTG Collection Manager

[![Licenza](https://img.shields.io/badge/Licenza-Apache_2.0-blue.svg)](LICENSE)
![Piattaforma](https://img.shields.io/badge/Piattaforma-Windows%20%7C%20Linux%20%7C%20macOS-lightgrey.svg)
![Backend](https://img.shields.io/badge/Backend-Tauri_2%20%7C%20Rust-orange.svg)
![Frontend](https://img.shields.io/badge/Frontend-React_19%20%7C%20TypeScript%20%7C%20Tailwind_4-blue.svg)

[English](README.md) | **Italiano**

> [!NOTE]
> **Stato del Progetto: In Fase di Sviluppo Iniziale (Milestone 0 Completata)**
>
> MTG Collection Manager si trova attualmente nella fase preliminare di predisposizione dell'architettura e del repository. La Milestone 0 è completata, mentre la Milestone 1 non è ancora iniziata. Nessun codice applicativo Tauri o React è stato ancora generato. Tutte le funzionalità, le metriche prestazionali (come i 60 FPS per la webcam) e i componenti architetturali descritti di seguito rappresentano specifiche di progettazione e obiettivi tecnici pianificati per il prodotto finale.

**MTG Collection Manager** è un'applicazione desktop libera, open-source e attenta alla privacy per la scansione, l'identificazione e la catalogazione di collezioni di carte di Magic: The Gathering. Sviluppata con **Tauri 2**, **Rust** e **React 19**, pone come priorità assoluta un'esperienza solida e reattiva su **Windows**, preservando un'architettura modulare e pulita per Linux e macOS.

---

## Funzionalità Pianificate & Obiettivi Tecnici

### 1. Acquisizione Multicanale delle Carte (Obiettivi di Progetto)

- **Scanner Webcam Live in Tempo Reale:** Obiettivo prestazionale di 60 FPS su hardware idoneo con rilevamento automatico della stabilità della carta, anti-duplicazione live e supporto al rilevamento di più carte contemporaneamente nell'inquadratura.
- **Scanner Piani e Documentali Fisici:** Supporto dedicato pianificato per scanner su superficie piana (flatbed) tramite processo ausiliario (sidecar) TWAIN a 32-bit isolato (Windows), driver nativi WIA 2.0 a 64-bit (Windows) e SANE (Linux/macOS).
- **Importazione da Cartelle e Watch Folder:** Monitoraggio reattivo pianificato di cartelle esterne con rilevamento atomico del completamento di scrittura, deduplicazione con hash SHA-256 e protezione assoluta degli originali in sola lettura.
- **Segmentazione Automatica Multi-Carta:** Rilevamento, ritaglio e raddrizzamento in prospettiva pianificati per più carte scansionate insieme su un piano A4, normalizzandole alla risoluzione di $744 \times 1039$ pixel.

### 2. Motore Ibrido di Riconoscimento Carte & AI Locale Integrata (Architettura Prevista)

- **Gestore Integrato dei Modelli AI Locali:** Gestione dei modelli AI completamente interna all'applicazione. Gli utenti finali **non dovranno mai installare o configurare applicazioni esterne** come Ollama, LM Studio o servizi in background separati.
  - *Diagnostica Hardware Automatica:* Rilevamento automatico di architettura/thread CPU, RAM di sistema, GPU (integrata/dedicata), VRAM disponibile (dove rilevabile), versione del sistema operativo e spazio di archiviazione libero.
  - *Raccomandazioni Basate sull'Hardware:* Suggerimento graduato dei modelli in base all'hardware rilevato: *Leggero / Lightweight* (massima velocità, consumo minimo di risorse), *Bilanciato / Balanced* (equilibrio ottimale tra accuratezza e latenza), *Avanzato / Advanced* (massima precisione per sistemi performanti) e selezione manuale.
  - *Catalogo Modelli Integrato:* Schede descrittive complete con nome e versione del modello, architettura, dimensione del download, fabbisogno stimato di memoria (RAM/VRAM), backend di inferenza supportati, requisiti hardware minimi, licenza d'uso ufficiale e sorgenti verificate di download.
  - *Download Diretto nell'Applicazione:* Monitoraggio avanzamento in tempo reale, pausa, ripresa, annullamento, verifica integrità tramite hash SHA-256, controllo preliminare dello spazio su disco, aggiornamento, rimozione pulita dei modelli e cartella di memorizzazione personalizzabile.
  - *Motore di Inferenza Integrato:* Caricamento ed esecuzione dei modelli gestiti direttamente tramite binding Rust di `llama.cpp` (`llama-cpp-2`) con fallback universale multi-thread su CPU (AVX2/OpenMP). L'accelerazione hardware (Vulkan per GPU AMD/NVIDIA, Metal per macOS) verrà abilitata solo dopo verifica empirica sull'hardware di destinazione. I pesi dei modelli non sono mai inclusi nell'installer standard dell'applicazione.
- **Modelli AI di Visione Locali:** Esecuzione on-device di modelli compatti vision-language (Liquid AI LFM2.5-VL 450M, 1.6B, 3B o Qwen2.5-VL in formati GGUF verificati) per il riconoscimento rapido di carte Magic.
- **Modalità Zero-AI / Solo OCR:** Modalità leggera pianificata al 100% senza scaricare alcun modello AI (target < 80 MB di RAM). Utilizzerà Tesseract OCR locale interfacciato direttamente con il database Scryfall per gli utenti che non desiderano scaricare modelli AI.
- **Identificazione Scryfall & Bulk Data Offline:** Risoluzione pianificata di identità, edizioni specifiche, illustrazioni alternative, varianti di bordo e lingue tramite l'API di Scryfall (rate limit conservativo a ~5 req/s) e ricerca istantanea offline tramite dump Scryfall Bulk Data.
- **Coda di Revisione e Verifica Obbligatoria:** Flusso di verifica progettato affinché nessun riconoscimento incerto venga salvato alla cieca. L'utente confermerà, modificherà l'edizione o correggerà lingua e finitura prima dell'inserimento permanente.

### 3. Gestione dell'Inventario e delle Collezioni (Funzionalità Pianificate)

- **Database Relazionale SQLite Permanente:** Schema relazionale pianificato per separare rigorosamente l'identità canonica della carta (Oracle) dalle stampe fisiche e dalle singole copie possedute.
- **Tracciamento Dettagliato delle Copie Fisiche:** Tracciamento pianificato di quantità, condizione (NM, LP, MP, HP, DMG), finitura (Non-foil, Foil Tradizionale, Etched), lingua, prezzo di acquisto, data di acquisizione e posizione fisica esatta (Nome raccoglitore, Scatola, Pagina e Slot).
- **Collezioni Virtuali Molti-a-Molti:** Organizzazione logica pianificata delle carte in collezioni multiple (es. *Raccoglitore Rare*, *Collezione Foil*, *Mazzo Commander*, *Carte in Vendita*) senza duplicare i record fisici dell'inventario.

### 4. Monitoraggio Prezzi ed Esportazioni Certificate (Integrazioni Pianificate)

- **Prezzi di Mercato:** Tracciamento pianificato dei valori in EUR e USD da Scryfall (aggiornati giornalmente da Cardmarket) e modulo opzionale per le API di CardTrader.
- **Link Diretti di Mercato:** Collegamenti ipertestuali diretti pianificati alle pagine ufficiali di Cardmarket senza violare le policy con web scraping non autorizzato.
- **Esportatori Standard:** Esportazione pianificata dell'intera collezione o di singoli raccoglitori in formato CSV per Moxfield, Archidekt e Deckbox, ed esportazione decklist nel formato testo ufficiale per Magic Arena e MTGO.

### 5. Assistente MTG Integrato (Chat AI Locale — Futura Milestone Pianificata)

- **Assistente MTG Locale Dedicato:** Basato sul motore AI locale integrato, offre un'interfaccia conversazionale offline senza alcuna dipendenza da servizi cloud o abbonamenti AI a pagamento. Tutti i dati della collezione e le cronologie di chat rimangono confidenziali e memorizzati sul disco locale.
- **Guida all'Applicazione:** Risponde a quesiti sulle funzionalità del software, assiste i nuovi utenti nei flussi di catalogazione e inventario e fornisce supporto passo-passo nella risoluzione di problemi.
- **Ricerca e Statistiche in Linguaggio Naturale:** Consente di interrogare la collezione con linguaggio colloquiale (es. *"Mostrami tutti i vampiri neri foil di Innistrad"* oppure *"Qual è il valore di mercato totale dei miei mazzi Commander?"*). Qualsiasi proposta di modifica o operazione batch generata dall'assistente richiede sempre l'esplicita conferma preventiva dell'utente.
- **Regole Ufficiali e Interazioni tra Carte:** Spiega interazioni complesse e risponde a dubbi arbitrali basandosi sul Comprehensive Rules ufficiale di Magic e sui ruling di Scryfall. Riporta con precisione la versione/data del documento di regole utilizzato e distingue in modo trasparente le citazioni letterali delle regole verificate dalle elaborazioni sintetiche dell'AI.

---

## Panoramica dell'Architettura Target

> [!NOTE]
> Il diagramma sottostante illustra l'architettura software di riferimento pianificata per il prodotto finale. L'attuale repository (Milestone 0) ospita i requisiti di governance, i flussi CI, le licenze e le specifiche tecniche. L'implementazione del codice applicativo inizierà con la Milestone 1.

```text
MTG Collection Manager (Architettura Target del Prodotto)
├── Frontend: React 19 + TypeScript + Vite + Tailwind CSS 4 + Zustand
│   ├── Navigazione & Viste Collezione (Inventario, Raccoglitori, Mazzi, Mercato)
│   ├── Chat Assistente MTG Integrata (Query in Linguaggio Naturale & Regole)
│   └── UI Gestore Modelli Locali (Diagnostica Hardware, Catalogo, Downloader)
├── Shell Desktop: Tauri 2 (Rust)
├── Database: SQLite (integrato via rusqlite con WAL mode e FTS5)
├── Acquisizione:
│   ├── Scanner Live Webcam (HTML5 MediaDevices + Web Worker stabilità)
│   ├── Sidecar TWAIN Windows (Processo isolato a 32-bit via TWAINDSM.dll)
│   ├── Windows WIA 2.0 (COM Nativo a 64-bit)
│   └── Linux SANE CLI (scanimage)
├── Computer Vision: Warping prospettico (aspect ratio 0.716) & orientamento
├── Livello di Inferenza & AI Integrata:
│   ├── Gestore Modelli Locali (Rilevamento hardware, catalogo, download/hash manager)
│   ├── Runtime incorporato llama.cpp (fallback universale CPU + compute Vulkan/Metal testato)
│   ├── Modelli di Visione (LFM2.5-VL / Qwen2.5-VL GGUF) per identificazione carte
│   ├── Modelli di Testo (GGUF) per Assistente MTG & Motore Regole
│   └── Motore Standalone Tesseract OCR (Modalità Zero-AI)
└── API Esterne: Scryfall API (client con rate limit a 5 req/s) & CardTrader API
```

---

## Tabella dei Milestone di Sviluppo

- **Milestone 0: Preparazione del Progetto & CI** :white_check_mark: *(Completato)*
  - Setup repository Git, licenza Apache-2.0, file NOTICE, documentazione bilingue, verifiche CI.
- **Milestone 1: Fondamenta & Schema Relazionale SQLite** *(In corso / Verifica)*
  - Scaffold Tauri 2 + React 19, database SQLite relazionale con migrazioni versionate, schema per inventario e collezioni.
- **Milestone 2: Client Asincrono Scryfall & Cache Locale** *(Pianificato)*
  - Rate limiting a ~5 req/s, backoff esponenziale, ingestione Bulk Data, interfaccia di verifica.
- **Milestone 3: Acquisizione Immagini, Ritaglio & Scanner Live Webcam** *(Pianificato)*
  - Live Camera Scanner a 60 FPS con rilevamento stabilità e anti-duplicato, test comparativi OpenCV/Rust.
- **Milestone 4: Scanner Fisici Flatbed (Priorità Windows)** *(Pianificato)*
  - Sidecar TWAIN a 32-bit, WIA 2.0 nativo, protezione scanner piani.
- **Milestone 5: Gestore Integrato Modelli AI Locali & Motore di Visione (Modalità Zero-AI)** *(Pianificato)*
  - Gestore interno dei modelli (rilevamento hardware, catalogo, download/verifica hash, cartella personalizzata).
  - Runtime di inferenza integrato `llama.cpp` con fallback CPU universale e accelerazione GPU validata.
  - Modelli di visione compatti on-device (LFM2.5-VL / Qwen2.5-VL) e modalità Zero-AI senza download (Tesseract OCR).
  - Nessuna dipendenza esterna da Ollama, LM Studio o servizi cloud.
- **Milestone 6: Inventario Fisico & Collezioni Virtuali** *(Pianificato)*
  - Griglia virtualizzata (oltre 20.000 carte), coordinate di stoccaggio fisico, collezioni molti-a-molti.
- **Milestone 7: Prezzi EUR & Esportatori Certificati** *(Pianificato)*
  - Scryfall EUR, CardTrader API, link Cardmarket, esportazioni Moxfield/Archidekt/Deckbox.
- **Milestone 8: Assistente MTG Integrato & Chat AI Locale** *(Pianificato)*
  - Assistenza integrata sulle funzionalità dell'applicazione, navigazione e flussi di collezione.
  - Ricerca della collezione in linguaggio naturale, statistiche e modifiche solo previa conferma esplicita.
  - Integrazione delle Magic Comprehensive Rules con tracciamento versione e distinzione regole/AI.
  - Funzionamento 100% locale, riservato e offline per impostazione predefinita.
- **Milestone 9: Packaging Cross-Platform & Release GitHub** *(Pianificato)*
  - Installer Windows `.exe` (NSIS) e `.msi`, Linux `.AppImage`/`.deb`, macOS `.dmg`.

---

## Licenze e Attribuzioni

- **Codice del Progetto:** Rilasciato sotto [Licenza Apache, Versione 2.0](LICENSE).
- **Note di Terze Parti:** Consultare il file [NOTICE](NOTICE) per licenze e note relative alle integrazioni pianificate (Cardloader, TWAINDSM, llama.cpp, Liquid AI).
- **Disclaimer Ufficiale Wizards of the Coast:** Wizards of the Coast, Magic: The Gathering e i rispettivi loghi sono marchi registrati di Wizards of the Coast LLC negli Stati Uniti e in altri paesi. © 1993-2026 Wizards. Tutti i diritti riservati.

  MTG Collection Manager è un contenuto amatoriale non ufficiale consentito dalle Linee guida sui contenuti amatoriali. Non è approvato né autorizzato da Wizards. Parte dei materiali utilizzati è proprietà di Wizards of the Coast. © Wizards of the Coast LLC.

  MTG Collection Manager non è affiliato, sponsorizzato, supportato o specificamente approvato da Wizards of the Coast LLC. MTG Collection Manager può utilizzare i marchi e altre proprietà intellettuali di Wizards of the Coast LLC conformemente a quanto consentito dalle [Linee guida sui contenuti amatoriali](https://company.wizards.com/en/legal/fancontentpolicy) di Wizards. Per ulteriori informazioni su Wizards of the Coast o sui suoi marchi, visitare il sito web [https://company.wizards.com/](https://company.wizards.com/). Il codice software originale sviluppato dal progetto MTG Collection Manager è protetto da copyright dei suoi contributori sotto Licenza Apache 2.0 e non rivendica alcuna titolarità sulle proprietà intellettuali appartenenti a Wizards of the Coast LLC.
