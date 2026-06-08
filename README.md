# TorrentSearch

A Firefox browser extension that lets you search torrents instantly from any webpage — just select text, right-click, and get results in a sleek overlay panel without ever leaving the page.

Results are fetched from your own self-hosted indexer backend: either **Jackett** or **Prowlarr**. No external services, no tracking, no ads.

---

## Features

- **Context-menu search** — select any text on any page, right-click, and choose *Torrent Search* to trigger an instant search.
- **In-page overlay** — results appear in a floating panel over the current page; close it with `Escape`, the ✕ button, or by clicking the backdrop.
- **Dual backend support** — auto-detects whether your server is Jackett or Prowlarr and adapts the API call accordingly.
- **Sortable results table** — click any column header to sort ascending/descending by Tracker, Title, Category, Size, Seeders, Peers, or Date.
- **One-click download & magnet links** — 📥 downloads the `.torrent` file; 🧲 opens the magnet link directly in your torrent client.
- **Human-readable metadata** — file sizes formatted as B/KB/MB/GB/TB; dates shown in `DD/MM/YYYY` format; seeder/leecher counts colour-coded (green/orange).
- **Dark & light theme** — automatically follows the OS `prefers-color-scheme` setting with a full CSS variable palette.
- **Zero data collection** — declared in the Firefox manifest; the extension only communicates with the host you configure.

---

## Screenshots / UI overview

| State | Description |
|---|---|
| Loading | Spinning indicator while the request is in flight |
| Results | Scrollable table with sortable columns and action icons |
| Empty | Friendly message when no results are found |
| Error | Plain-language error when the backend is unreachable or misconfigured |

---

## Requirements

- **Firefox** (Manifest V2 extension — no Chrome support out of the box)
- A running instance of either:
  - [**Jackett**](https://github.com/Jackett/Jackett) — typically `http://127.0.0.1:9117`
  - [**Prowlarr**](https://github.com/Prowlarr/Prowlarr) — typically `http://127.0.0.1:9696`

---

## Installation

### From a signed `.xpi` file

1. Open Firefox and go to `about:addons`.
2. Click the gear icon → *Install Add-on From File…*
3. Select the `.xpi` file.

### Temporary installation (development)

1. Clone or download this repository.
2. Go to `about:debugging` → *This Firefox* → *Load Temporary Add-on…*
3. Select `manifest.json` from the repository root.

> **Note:** Temporary add-ons are removed when Firefox restarts. For persistent use, sign the extension via the [Firefox Add-on Developer Hub](https://addons.mozilla.org/developers/).

---

## Configuration

1. After installation, click the extension's toolbar button **or** go to the extension's settings page.
2. Fill in:
   - **URL** — the base address of your Jackett/Prowlarr instance (e.g. `http://127.0.0.1:9117`). Trailing slashes are stripped automatically.
   - **API Key** — found in your Jackett or Prowlarr web UI under Settings → General.
3. Click **Save**.

The extension performs a live test request to detect which backend is running and reports the result (e.g. *Jackett connected ✓*). Settings are persisted locally via `browser.storage.local`.

---

## How it works

### Architecture

```
┌─────────────────────────────────────────┐
│              Browser Tab                │
│  ┌─────────────┐   messages   ┌───────┐ │
│  │ content.js  │◄────────────►│ back- │ │
│  │  (overlay)  │              │ ground│ │
│  └─────────────┘              │  .js  │ │
│        ▲                      └───┬───┘ │
│        │ CSS: overlay.css         │     │
│        │                          │ fetch│
└────────│──────────────────────────│─────┘
         │                          ▼
    DOM overlay              Jackett / Prowlarr
    rendered in              REST API
    the active tab
```

### Flow

1. **Selection + right-click** → `background.js` receives the `contextMenus.onClicked` event.
2. Background sends a `startSearch` message to `content.js`, which renders a loading overlay immediately.
3. Background fetches results from the configured backend:
   - **Jackett**: `GET /api/v2.0/indexers/all/results?Query=…&apikey=…`
   - **Prowlarr**: `GET /api/v1/search?query=…&apikey=…`
4. The raw Prowlarr response is normalised to match the Jackett field schema (`Tracker`, `Title`, `Size`, `Seeders`, `Peers`, `MagnetUri`, `Link`, etc.).
5. Results are sent back to `content.js` via a `showResults` message and rendered as a sortable HTML table inside the overlay.

### File structure

```
├── manifest.json       Extension manifest (MV2, Firefox/Gecko)
├── background.js       Service worker: context menu, API requests
├── content.js          Content script: overlay rendering & table logic
├── overlay.css         All overlay styles (scoped under #jacket-overlay-root)
├── options.html        Settings popup markup
├── options.js          Settings logic (load, detect backend, save)
├── icons/
│   ├── icon48.png
│   └── icon96.png
└── LICENSE             The Unlicense (public domain)
```

---

## Permissions

| Permission | Reason |
|---|---|
| `contextMenus` | Register the right-click *Torrent Search* item |
| `storage` | Persist host URL, API key, and detected backend |
| `activeTab` | Send messages to the currently focused tab |
| `<all_urls>` | Inject the overlay content script on any page |

---

## Backend API compatibility

| Field (internal) | Jackett source field | Prowlarr source field |
|---|---|---|
| Tracker | `Tracker` | `indexer` |
| Title | `Title` | `title` |
| CategoryDesc | `CategoryDesc` | `categories[0].name` |
| Size | `Size` | `size` |
| Seeders | `Seeders` | `seeders` |
| Peers | `Peers` | `leechers` |
| PublishDate | `PublishDate` | `publishDate` |
| Details | `Details` | `infoUrl` / `guid` |
| Link | `Link` | `downloadUrl` |
| MagnetUri | `MagnetUri` | `magnetUrl` |

---

## Theming

All visual tokens are CSS custom properties declared on `#jacket-overlay-root`, keeping styles fully isolated from the host page. A `@media (prefers-color-scheme: light)` block overrides the default dark palette for light-mode users. No external fonts or assets are loaded.

---

## License

Released into the public domain under [The Unlicense](LICENSE). Do whatever you want with it.
