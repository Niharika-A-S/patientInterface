# MemoryCare NER — Cognitive Games Module

Patient-side cognitive gaming module for **MemoryCare NER**, an offline-first Progressive Web App for elderly patients in the North Eastern Region of India — Smart India Hackathon 2026, team Elite's Alliance.

This folder is **static files only** (plus a tiny Flask app that serves them). There is no Node.js, npm, Vite, or build step.

---

## Getting started

```bash
pip install -r requirements.txt
python app.py
```

Then open `http://localhost:5000` in Chrome.

Service workers need `http://` or `https://`. Opening `index.html` via `file://` is a known limitation.

Flask only serves the existing static files. It does not add a database or API yet.

---

## Tech stack

| Layer | Technology |
|---|---|
| Frontend | Native ES modules (plain `.js` files, no bundler) |
| Local storage | Dexie.js over IndexedDB (UMD file in `vendor/`) |
| Voice output | Web Speech API (`SpeechSynthesisUtterance`) — English + Hindi |
| PWA | Hand-written `manifest.json` + `sw.js` |

After the first load, the app makes no network calls at runtime.

---

## The 4 games

1. **Pattern Matching** — card-flip memory match
2. **Shape Sort** — selective-attention task ("tap all the circles" / "tap all the orange shapes")
3. **Face-Name Recall** — unlabeled face, pick `"Name (Relationship)"` from 4 choices
4. **Remember My Story** — listen to a story, then answer multiple-choice questions (all must be correct to complete)

Each game has 5 difficulty levels along pair count, sequence length, distractor count, and time pressure.

---

## Adaptive difficulty

Rule-based (not ML). Tracks accuracy, reaction time, mistakes, and attempts:

- High accuracy + fast + few mistakes → level up by exactly 1
- Low accuracy + slow + many mistakes → level down by exactly 1
- Never more than one level change at a time
- `manualLevelOverride` is stored on each patient/game record (caregiver UI is later work)

New `game_results` rows always start with `sync_status: "PENDING"`. Nothing in this module sets `"SYNCED"`.

---

## Testing offline behavior

1. Open the app once over `http://` so the service worker can install
2. DevTools → Application → Service Workers — one worker, **activated**
3. Network → Offline, then refresh — all games still load
4. Application → IndexedDB → `game_results` — each record has `sync_status: "PENDING"`
5. Application → Manifest — cream `#FDF6EC` / terracotta `#D85A30`, icons present

---

## Out of scope for this module

- Nurse and Family dashboards
- SQLite backend and the sync engine
- Speech-to-text
- Face authentication
- Reminder system
- Switching storage away from Dexie/IndexedDB


BENGALI LANGUAGE SUPPORT :

- Added **Bengali language support** to the existing multilingual interface.
- Added Bengali translations for the application's user-facing text, including:
  - Profile and language selection
  - Game names and instructions
  - Buttons and messages
  - Family photo section
  - Face & Name activity
  - Shape Sort instructions
  - Story activity
  - Relationship names
- Integrated Bengali into the existing language-selection and localization system without changing the existing functionality of other supported languages.
- Added Bengali support for **Shape Sort instructions**.
- Added Bengali translations for the **top four stories**, including their questions and answer options.
- Prepared separate **Bengali voice recordings** for the stories, questions, and answer options using local audio files.
- Integrated the Bengali story audio so that the appropriate recording is played according to the story, question, and options currently displayed.
- Maintained the existing **offline functionality** by using bundled/local audio rather than requiring a live voice or cloud API during application use.

ASSAMESE LANGUAGE SUPPORT 
- Added Assamese (as) language support to the MemoryCare platform.
- Added Assamese translations for the interface, dashboard, profile, games, instructions, buttons, and relationships.
- Integrated Assamese Shape Sort instructions, including dynamic shape/object names.
- Added separate Assamese interface voice using prerecorded local audio.
- Added Assamese story voice structure for the top 4 stories, with separate audio for stories, questions, and options.