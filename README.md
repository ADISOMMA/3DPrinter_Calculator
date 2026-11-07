# 🧊 3DPrinter Calculator – Calcolatore Costi Stampa 3D

Sito statico (HTML + CSS + JavaScript, nessuna dipendenza) per calcolare **quanto costa davvero** un pezzo stampato in 3D e **a quanto venderlo**.

## Funzioni

- **Stampanti preimpostate**: Bambu Lab, Prusa, Creality, Elegoo, Anycubic, Qidi, Sovol, più una generica. Ognuna ha prezzo, consumo medio, vita utile e manutenzione, tutti modificabili. Puoi salvare stampanti personalizzate.
- **Filamenti preimpostati**: generici per tipo (PLA, PETG, ABS, ASA, TPU, CF, PC) e marche comuni. Si possono usare **più filamenti** per stampe multicolore/AMS e salvare filamenti personalizzati.
- **Import da slicer**: legge tempo e grammi da G-code di Bambu Studio, OrcaSlicer, PrusaSlicer e Cura, e dai file `.gcode.3mf` slicati di Bambu/Orca.
- **Costi completi**: filamento, spreco/spurgo, energia, ammortamento e manutenzione, preparazione per piatto, post-produzione per pezzo, imballaggio, progettazione, supplemento urgenza.
- **Componenti aggiuntivi** a elenco (magneti, LED, pulsanti, viti, inserti…) con costo unitario e quantità per pezzo.
- **Riserva fallimenti** calcolata come costo ÷ (1 − tasso fallimenti).
- **Più pezzi per piatto**: il costo del piatto viene diviso tra i pezzi stampati insieme.
- **Prezzo**: ricarico, commissioni della piattaforma (% e fisse) già incluse nel prezzo, IVA, prezzo minimo d'ordine, arrotondamento (anche a x,90).
- **Sconti quantità** a fasce modificabili. Compare un avviso se lo sconto porta il prezzo sotto il costo.
- **Listino per quantità** con prezzo e margine per ogni fascia.
- **Preventivi salvati** nel browser, testo del preventivo da copiare, backup/ripristino in JSON.
- **Prezzo amici & famiglia**: copre solo i costi vivi più un piccolo margine, con confronto rispetto al prezzo cliente.
- **Interfaccia**: sezioni richiudibili con riepilogo, unità di misura nei campi, ripartizione del costo con barra colorata, import trascinando il file, barra del prezzo sempre visibile su telefono.
- **Installabile come app** (PWA): su telefono "Aggiungi a schermata Home", funziona anche offline.
- Tema chiaro/scuro automatico.

I dati restano nel `localStorage` del browser: nessun server e nessun account.

## Online

**https://adisomma.github.io/3DPrinter_Calculator/**

Repository: https://github.com/ADISOMMA/3DPrinter_Calculator

Il sito è pubblicato con GitHub Pages dal branch `main`, cartella `/ (root)`. Ogni `git push` su `main` aggiorna il sito in circa un minuto.

## Uso in locale

Apri `index.html` con un doppio clic: funziona anche senza server.

## Aggiornare i preset

Stampanti, filamenti e fasce di sconto predefinite si trovano in [`data.js`](data.js). I prezzi sono indicativi (EUR, mercato UE).
