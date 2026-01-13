# Claude Code Projekt-Instruktionen

## Nach jeder Code-Änderung

Nach Abschluss von Code-Änderungen immer:

1. **Build ausführen:**
   ```bash
   npm run build
   ```

2. **Firefox-Version entpacken:**
   ```bash
   mkdir -p dist/firefox-unpacked && unzip -o dist/tab_session_manager-for-firefox-*.zip -d dist/firefox-unpacked
   ```

## Build-Ausgabe

- `dist/tab_session_manager-for-chrome-*.zip` - Chrome Extension (gepackt)
- `dist/tab_session_manager-for-firefox-*.zip` - Firefox Extension (gepackt)
- `dist/firefox-unpacked/` - Firefox Extension (entpackt, zum Testen)

## Projekt-Struktur

- `src/popup/` - Popup UI (React)
- `src/options/` - Einstellungsseite (React)
- `src/background/` - Background Scripts
- `src/settings/` - Settings Management
- `src/_locales/` - Übersetzungen

## Wichtige Dateien

- `src/manifest.json` - Chrome Manifest
- `src/manifest-ff.json` - Firefox Manifest
- `webpack.config.dist.js` - Production Build
- `webpack.config.dev.js` - Development Build (watch mode)

## Development

```bash
npm run watch-dev  # Für Entwicklung mit Auto-Rebuild
npm run build      # Für Production Build
```
