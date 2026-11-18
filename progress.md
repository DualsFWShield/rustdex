# 🍺 Beerdex - Clean Multiplatform Rust Architecture & Status

> **Status & Architectural Overview**  
> *Objective: Clean, complete, and robust Beerdex multiplatform distribution supporting Web (PWA), Native Android (Google Play Store & APK), and Native Desktop (Windows & Linux via Rust Wry/Tao), with a clean Rust calculation & catalog engine.*

---

## 📊 Platform & Architecture Dashboard

| Platform / Component | Technology Stack | Status | Output & Artifacts |
|---|---|---|---|
| **Web & PWA** | Vanilla HTML5 / CSS3 / ES6 + Service Worker | ✅ **100% Restored & Functional** | Full offline PWA, Zero regressions (`index.html`, `js/app.js`, `ui.js`) |
| **Windows Native Desktop** | Rust (`wry` + `tao` native window runner) | ✅ **Configured & Validated** | Standalone native `.exe` with local asset protocol (`beerdex-app.exe`) |
| **Linux Native Desktop** | Rust (`wry` + `tao` with WebKitGTK) | ✅ **Configured & Validated** | Standalone native binary & tarball package (`beerdex-linux-x64.tar.gz`) |
| **Android Native (Play Store)** | Capacitor 8 (`co.median.android.yeenpjz`) | ✅ **100% Synced & Ready** | Signed `.apk` & Google Play Store release bundle (`.aab`) |
| **Rust Domain Core** | `beerdex-core` (BAC, Rarity, Thanos, Models) | ✅ **100% Tested (11/11 tests pass)** | Multi-target Rust crate (`crates/beerdex-core`) |
| **Platform Abstraction** | `beerdex-platform` (Catalogs, Storage, Bridges) | ✅ **100% Tested (6/6 tests pass)** | Embedded catalogs & storage layer (`crates/beerdex-platform`) |
| **QA Lab & Test Suites** | 18 Test Suites + Test Runner | ✅ **100% Restored** | Browser & unit integration test runner (`tests/`) |
| **Multiplatform CI/CD** | GitHub Actions Workflow | ✅ **Configured & Ready** | `.github/workflows/rust-multiplatform-build.yml` |

---

## 🧹 1. Restorations from Canonical `beerdex.be`

Following the audit of `beerdex.be`, unnecessary and broken rewrites were reverted to restore full parity and performance:

1. **Restored Full Web UI & Modular Architecture**:
   - Replaced broken Rust HTML-string generator and hacky `rust-bridge.js` with the original, battle-tested `index.html` and `js/app.js`.
   - Restored `#modal-container` and all modal layouts (beer detail, reveal animation, aroma wheel, filters, manual addition, custom beers).
   - Removed all mock `alert()` placeholders (notation presets, poster generation, backups) to restore genuine interactive functionality.

2. **Restored Client-Side Interactive Libraries**:
   - `vanilla-tilt.min.js`: Holographic 3D card tilt physics.
   - `confetti.browser.min.js`: Particle animations for achievement unlocks.
   - `html5-qrcode.min.js`: Camera barcode & QR code scanner (with rear-camera priority).
   - `peerjs.min.js` & `p2p.js`: WebRTC P2P Party & BeerMatch sync.
   - `lz-string.min.js` & `qrcode.min.js`: Compressed QR payloads.
   - `brewbrother.js` & `brewbrother_nlp.js`: Interactive flavor wheel & zythology descriptions.

3. **Restored Data & Imagery**:
   - `data/thanos_aliases.json`: Restored complete alias dictionary (600+ entries) and updated `beerdex-core` to parse untagged alias objects properly.
   - Missing beer imagery: Restored 12 newly added references (`houppe-*`, `mythos-*`, `soultrip-*`, `mythos-ice-lager`, etc.).
   - Canonical beer catalogs (`belgiumbeer.json`, `newbeer.json`) aligned 1:1 with `beerdex.be`.

4. **Restored Quality Assurance & Test Suites**:
   - Restored the 18 test suites in `tests/suites/` and the interactive QA runner (`tests/runner.js`, `tests/index.html`).

---

## 🦀 2. Rust Workspace & Multiplatform Engine

The Rust workspace is structured into clean, focused crates:

```text
rustdex/
├── Cargo.toml                      # Workspace definition
├── crates/
│   ├── beerdex-core/               # Pure Rust domain & business logic
│   │   ├── Cargo.toml
│   │   └── src/
│   │       ├── lib.rs              # 11 Unit tests passing
│   │       ├── models.rs           # Beer, Brewery, BacRule, Rating data models
│   │       ├── bac.rs              # Widmark/Watson BAC metabolic simulation
│   │       ├── rarity.rs           # Heuristic rarity scoring & import ranks
│   │       ├── achievements.rs     # 125 achievement evaluation rules
│   │       ├── deduplicator.rs     # Levenshtein & Jaro-Winkler fuzzy matching
│   │       ├── thanos.rs           # Thanos catalog deduplication engine
│   │       ├── nlp.rs              # RosaeNLG narrative generator
│   │       └── storage.rs          # Storage state serialization & mutations
│   │
│   ├── beerdex-platform/           # Platform abstraction layer
│   │   ├── Cargo.toml
│   │   └── src/
│   │       ├── lib.rs              # 6 Unit tests passing
│   │       ├── catalogs.rs         # Embedded static catalogs (10 countries + rules)
│   │       ├── storage_desktop.rs  # Filesystem persistence (%APPDATA% / ~/.config)
│   │       ├── storage_web.rs      # WebStorage bridge
│   │       ├── scanner.rs          # EAN-13 barcode validator
│   │       └── p2p.rs              # Binary packet chunking & reassembly
│   │
│   └── beerdex-app/                # Native Desktop Runner (Windows / Linux)
│       ├── Cargo.toml              # Dependencies: tao (0.37), wry (0.57)
│       └── src/
│           ├── main.rs             # Native executable entry point
│           ├── lib.rs
│           └── desktop.rs          # Tao Window + Wry WebView with beerdex:// custom protocol
│
├── bd-mobile/                      # Native Android packaging (Capacitor)
│   ├── play-store-offline/         # Standalone Play Store variant
│   ├── play-store-online/          # Online Play Store variant
│   ├── github-offline/             # Standalone GitHub release variant
│   └── github-online/              # Online GitHub release variant
│
├── tests/                          # 18 Browser QA Lab test suites
├── scripts/                        # Mobile sync & build automation
├── data/                           # Canonical JSON catalogs & locales
└── .github/workflows/              # Multiplatform CI/CD pipeline
```

---

## 🚀 3. Quality & Verification Metrics

- `cargo clippy --workspace --all-targets -- -D warnings`: **0 warnings, 0 errors**
- `cargo fmt --all --check`: **100% formatted & compliant**
- `cargo test -p beerdex-core -p beerdex-platform`: **17/17 Rust tests passed**
- `cargo check -p beerdex-core -p beerdex-platform --target wasm32-unknown-unknown`: **0 warnings, 0 errors**
- `powershell -File scripts/sync-mobile.ps1`: **All 4 Android variants synced cleanly**
- Web UI & Service Worker: **100% functional, offline capable, zero regressions**

---

## ⚡ 4. Runtime Performance Pass (2026-11-18)

Zero visual change. Everything below is internal (caches, scheduling, payload size) or a rebuild of a stale artifact.

### 4.1 Critical fix: stale WASM artifact

The committed `wasm/beerdex_app_bg.wasm` (2,023,579 B) was built from an **older** Rust source that still contained the native UI renderer (`beerdex_app::wasm::render_dom`, `AppState`, `beerdex_open_*`). ~1 s after boot it replaced `#app.innerHTML` with a ~2.3 MB pre-rendered shell, which:

- destroyed every listener bound by `setupEventListeners()` (dead filter / nav / view buttons),
- injected `<style id="beerdex-native-styles">` with `.modal-overlay { display:none !important }` (all modals invisible),
- added a duplicate `#modal-container` inside `#app`.

**Fix:** rebuilt from the current `crates/beerdex-app/src/wasm.rs` (`cargo build -p beerdex-app --lib --target wasm32-unknown-unknown --release`, then `wasm-bindgen` **0.2.130** to match `Cargo.lock`). New engine is **267 KB** and only exports compute helpers. A defensive handler in `js/app.js` still cleans up leftovers from an old cached wasm and rebinds only when the header node actually changed.

> ⚠️ Always regenerate the wasm from the current Rust source before committing it.

### 4.2 Payload & install size

| Item | Before | After |
|---|---|---|
| `images/foam.png` | 87 MB | 220 KB |
| `icons/logo-bnr.png` | 16.8 MB | 88 KB |
| `wasm/beerdex_app_bg.wasm` | 2.02 MB | 267 KB |
| Boot JS (QR scanner + P2P) | ~495 KB parsed at boot | loaded on first use |
| SW precache (first install) | ~104 MB | ~1.7 MB |

`js/vendor-loader.js` lazy-loads `html5-qrcode` and `peerjs`/`p2p`; small globals stay `defer`.

### 4.3 Runtime work moved off the hot path

- `js/storage.js`: in-memory caches for preferences and custom beers, `getAllConsumedBeerIdSet()` (O(1) membership), idle-coalesced `autoBackup()` with `pagehide`/`visibilitychange` flush.
- `js/data.js`: memoised enrichment (WeakMap) and a single shared `breweries.json` promise.
- `js/thanos.js` / `js/utils.js`: memoised per-beer search metadata + per-query analysis, cached region/country normalization.
- `js/ui.js`: preferences read once per card batch, memoised BAC badge, favorite fast path, background removal on a downscaled copy (≤600 px) with an LRU result cache and idle queue.
- `js/app.js`: `runWhenIdle()` for deferred JSON loading and deduplication.
- `sw.js`: `Beerdex-v5.1.1`, precaches wasm/glue, `.wasm` treated as a static asset.

### 4.4 Validation

1,499 beers; pagination 24→48→72→96→120; search; filters/sort; grid/list toggle; stats; drunk; settings; export/import modals; custom beer add/delete; rating/favorite/drink; lazy QR + P2P; offline reload with the server stopped. Zero console errors.

Warm local measurement: DCL **342 ms → 52 ms**, first card **584 ms → 309 ms**, no 2.3 MB shell replacing the DOM.
