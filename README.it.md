# MTG Collection Manager

## Identità Futura Provvisoria: ManaTeca — Scry & Tell

[![Licenza](https://img.shields.io/badge/Licenza-Apache_2.0-blue.svg)](LICENSE)
![Piattaforma](https://img.shields.io/badge/Piattaforma-Windows%20%7C%20Linux%20%7C%20macOS-lightgrey.svg)
![Backend](https://img.shields.io/badge/Backend-Tauri_2%20%7C%20Rust-orange.svg)
![Frontend](https://img.shields.io/badge/Frontend-React_19%20%7C%20TypeScript%20%7C%20Tailwind_4-blue.svg)

[English](README.md) | **Italiano**

> [!NOTE]
> **Stato del Progetto: In Sviluppo Attivo (Milestone 0 e 1 Completate — Milestone 2 In Corso)**
>
> MTG Collection Manager ha completato la propria architettura di base, lo schema relazionale SQLite (Milestone 1) ed è attualmente in fase di completamento della Milestone 2 (integrazione Scryfall, ricerca multilingua, selezione stampe ed edizioni, aggiunta alla collezione da Scryfall, cache immagini e visualizzatore zoom ad alta risoluzione nella collezione) sul branch `feature/milestone-2-scryfall`. La priorità principale di sviluppo avanzerà verso l'acquisizione e scansione da webcam e scanner flatbed (Milestone 3 e 4) e il gestore integrato di AI locale (Milestone 5). La visione di prodotto a lungo termine evolverà in **ManaTeca — Scry & Tell**, introducendo un Deck Builder multilingua ispirato ad Archidekt, la classificazione Commander Bracket ufficiale e l'analisi combinazioni verificate nelle milestone future.

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

### 6. Deck Builder Multilingua (Ispirato ad Archidekt — Futura Pianificazione)

- **Gestione Completa dei Mazzi:** Creazione, duplicazione, categorizzazione, importazione ed esportazione mazzi per tutti i formati ufficiali e amatoriali (Commander/EDH, Modern, Standard, Pioneer, Legacy, Vintage, Pauper, Oathbreaker).
- **Ricerca Multilingua Obbligatoria & Separazione Identità:** Ricerca e aggiunta carte in qualsiasi lingua supportata (Italiano, English, Français, Deutsch, Español, Português, 日本語, 한국어, Русский, 简体中文) mantenendo l'identità Oracle canonica in inglese, la color identity, la legalità di formato e il testo delle regole. Una specifica stampa fisica e lingua può essere associata alla carta nel mazzo senza frammentare le regole di gioco.
- **Integrazione Diretta con l'Inventario Personale:** Comunicazione bidirezionale con il database SQLite locale. Gli utenti possono inserire carte direttamente dalla collezione posseduta, tracciare le copie mancanti rispetto a quelle possedute, allocare carte fisiche su più mazzi senza duplicare i record e preservare finitura, lingua e stampa esatta.
- **Analisi e Statistiche Avanzate del Mazzo:** Curva di mana, distribuzione colori, ripartizione tipi di carta, rapporto creature/non-creature, conteggio terre, costo di mana medio (CMC), stima del valore economico e categorie personalizzate sia in vista grafica visuale che tabellare.

### 7. Intelligenza Commander Bracket & Motore Combinazioni (Futura Pianificazione)

- **Framework Ufficiale Commander Bracket:** Sistema consultivo e trasparente per la valutazione della potenza del mazzo basato sui 5 scaglioni ufficiali:
  - *Bracket 1: Exhibition*
  - *Bracket 2: Core*
  - *Bracket 3: Upgraded*
  - *Bracket 4: Optimized*
  - *Bracket 5: cEDH*
  La valutazione analizza fast mana, Game Changers, tutori, combo infinite, turni extra, mass land denial e velocità competitiva complessiva.
- **Riferimenti Versionati e Aggiornabili:** Gli elenchi dei Game Changers e i criteri di bracket sono versionati e datati, permettendo aggiornamenti nel tempo con spiegazioni trasparenti e non dogmatiche.
- **Motore di Riconoscimento Combo e Sinergie (Integrazione Commander Spellbook):** Analisi completa della decklist rispetto al dataset verificato di Commander Spellbook (distinguendo combo infinite verificate, interazioni a 2 carte, combo multi-carta, combo condizionali, forti sinergie e combo incomplete con carte mancanti). L'AI assiste nella spiegazione delle interazioni ma non inventa mai combinazioni arbitrarie non conformi alle regole.

### 8. Strategia di Rebranding Futuro & Continuità Dati (ManaTeca — Scry & Tell)

- **Fase Dedicata di Rebranding Finale:** Al termine del consolidamento delle funzionalità cardine di scansione e inventario, l'applicazione adotterà la nuova identità **ManaTeca — Scry & Tell** (nome visualizzato, logo, icona, titoli delle finestre e repository).
- **Continuità Assoluta del Database & Percorsi:** Per garantire che nessun utente perda la propria collezione durante l'aggiornamento, l'applicazione integrerà una strategia di discovery retrocompatibile del database SQLite (ricerca fallback nella cartella `com.mtgcollectionmanager.desktop`).

---

## Panoramica dell'Architettura Target

> [!NOTE]
> Il diagramma sottostante illustra l'architettura software di riferimento pianificata per il prodotto finale. Le Milestone 0 e 1 sono completate e verificate, e la Milestone 2 è funzionalmente completa sul branch `feature/milestone-2-scryfall`.

```text
MTG Collection Manager / ManaTeca (Architettura Target del Prodotto)
├── Frontend: React 19 + TypeScript + Vite + Tailwind CSS 4 + Zustand
│   ├── Navigazione & Viste Collezione (Inventario, Raccoglitori, Mazzi, Mercato)
│   ├── Deck Builder Multilingua (Griglia Visuale, Vista Tabellare, Curva & Colori)
│   ├── Intelligenza Commander (Bracket Analyzer, Motore Combo Spellbook)
│   ├── Chat Assistente MTG Integrata (Query in Linguaggio Naturale & Regole)
│   └── UI Gestore Modelli Locali (Diagnostica Hardware, Catalogo, Downloader)
├── Shell Desktop: Tauri 2 (Rust)
├── Database: SQLite (integrato via rusqlite con WAL mode, FTS5 e Continuità Dati)
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
└── API & Dataset Esterni:
    ├── Scryfall API (Client asincrono rate-limited, ricerca multilingua & Bulk Data)
    ├── Dataset Aperto Commander Spellbook
    └── Link Prezzi Conforme Cardmarket & CardTrader API
```

---

## Tabella dei Milestone di Sviluppo

- **Milestone 0: Preparazione del Progetto & CI** :white_check_mark: *(Completato)*
  - Setup repository Git, licenza Apache-2.0, file NOTICE, documentazione bilingue, verifiche CI.
- **Milestone 1: Fondamenta & Schema Relazionale SQLite** :white_check_mark: *(Completato)*
  - Scaffold Tauri 2 + React 19, database SQLite relazionale con migrazioni versionate, schema per inventario e collezioni, inserimento manuale, persistenza locale.
- **Milestone 2: Client Asincrono Scryfall, Ricerca Multilingua, 4 Modalità di Visualizzazione & UI Bilingue (IT/EN)** :hammer_and_wrench: *(In Corso)*
  - Client Scryfall rate-limited, cache SQLite, ricerca multilingua in 18 lingue, selezione edizioni e stampe specifiche, aggiunta alla collezione da Scryfall, cache immagini su disco con gerarchia di fallback, supporto carte bifronte (MDFC), anteprima al passaggio del mouse (hover preview), lightbox zoom ad alta risoluzione sia nella ricerca che nella collezione, 4 modalità di visualizzazione della collezione personalizzabili (Griglia, Compatta, Tabella, Galleria) e internazionalizzazione completa dell'interfaccia (UI in Italiano e Inglese con autorilevamento lingua del sistema operativo, selettore sempre visibile `[ IT ] [ EN ]` nella barra di navigazione superiore e impostazioni persistenti).
- **Milestone 3: Acquisizione Immagini, Ritaglio & Scanner Live Webcam** *(Pianificato - Prossima Priorità Principale)*
  - Live Camera Scanner a 60 FPS con rilevamento stabilità e anti-duplicato, pipeline di rilevamento e riconoscimento carte, test comparativi OpenCV/Rust.
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
- **Milestone 10: Deck Builder Multilingua (Ispirato ad Archidekt)** *(Futura Milestone Maggiore)*
  - Costruzione mazzi per formato, selezione Commander, tracciamento carte possedute vs mancanti nell'inventario, ricerca multilingua, statistiche curva/colori e categorizzazione libera.
- **Milestone 11: Intelligenza Commander Bracket & Motore Combo** *(Futura Milestone Maggiore)*
  - Classificazione ufficiale nei 5 bracket Commander (da Exhibition a cEDH) con score consultivo spiegabile, Game Changers versionati e motore combo basato su Commander Spellbook.
- **Fase Finale di Rebranding: ManaTeca — Scry & Tell** *(Transizione Conclusiva)*
  - Lancio del brand definitivo, aggiornamento icone e installer, migrazione retrocompatibile garantita di AppData/SQLite.

---

## Supporto al Progetto & Donazioni

MTG Collection Manager è e **rimarrà per sempre un software libero e open source al 100%** sotto licenza Apache 2.0. Non esistono piani a pagamento, abbonamenti, funzionalità bloccate né pubblicità. Tutte le funzionalità sono e saranno sempre accessibili a chiunque senza alcuna restrizione e le donazioni **non sono mai richieste** per utilizzare l'applicazione.

Se apprezzi il progetto, lo trovi utile e desideri supportarne lo sviluppo indipendente continuo, qualsiasi contributo è benvenuto ma **completamente volontario**:

- **Ko-fi:** Sostieni direttamente su [ko-fi.com/manuelsnake](https://ko-fi.com/manuelsnake)
  [![ko-fi](https://ko-fi.com/img/githubbutton_sm.svg)](https://ko-fi.com/manuelsnake)
- **Pulsante Sponsor di GitHub:** Fai clic sul pulsante **Sponsor** (contrassegnato dall'icona a cuore `♥`) in alto nella pagina del [Repository GitHub](https://github.com/Manuelsnake/MTG-SCANNER-COLLECTION), che rimanda direttamente alla pagina Ko-fi dello sviluppatore.

Il vostro supporto volontario contribuisce direttamente a sostenere il tempo dedicato allo sviluppo, l'acquisizione di hardware di test (scanner piani, webcam e dispositivi di acquisizione) e il miglioramento costante dell'applicazione. Grazie di cuore!

---

## Licenze e Attribuzioni

- **Codice del Progetto:** Rilasciato sotto [Licenza Apache, Versione 2.0](LICENSE).
- **Note di Terze Parti:** Consultare il file [NOTICE](NOTICE) per licenze e note relative alle integrazioni pianificate (Cardloader, TWAINDSM, llama.cpp, Liquid AI).
- **Disclaimer Ufficiale Wizards of the Coast:** Wizards of the Coast, Magic: The Gathering e i rispettivi loghi sono marchi registrati di Wizards of the Coast LLC negli Stati Uniti e in altri paesi. © 1993-2026 Wizards. Tutti i diritti riservati.

  MTG Collection Manager è un contenuto amatoriale non ufficiale consentito dalle Linee guida sui contenuti amatoriali. Non è approvato né autorizzato da Wizards. Parte dei materiali utilizzati è proprietà di Wizards of the Coast. © Wizards of the Coast LLC.

  MTG Collection Manager non è affiliato, sponsorizzato, supportato o specificamente approvato da Wizards of the Coast LLC. MTG Collection Manager può utilizzare i marchi e altre proprietà intellettuali di Wizards of the Coast LLC conformemente a quanto consentito dalle [Linee guida sui contenuti amatoriali](https://company.wizards.com/en/legal/fancontentpolicy) di Wizards. Per ulteriori informazioni su Wizards of the Coast o sui suoi marchi, visitare il sito web [https://company.wizards.com/](https://company.wizards.com/). Il codice software originale sviluppato dal progetto MTG Collection Manager è protetto da copyright dei suoi contributori sotto Licenza Apache 2.0 e non rivendica alcuna titolarità sulle proprietà intellettuali appartenenti a Wizards of the Coast LLC.
