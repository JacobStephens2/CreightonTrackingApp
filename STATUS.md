# Project Status

Last updated: 2026-03-20

## Specs Implementation Status

| Spec | Status | Notes |
|------|--------|-------|
| PWA app for Creighton Model tracking | Done | Vanilla TS, Vite, Dexie.js, fully offline-capable |
| Google Play Store delivery (TWA) | Ready | assetlinks.json template in place, not yet published |
| Domain: https://creighton.stephens.page | Done | Self-hosted on Apache, SSL via Let's Encrypt |
| Google Analytics (G-4RXK6BKTKW) | Done | Tag in index.html |
| Optional login & server sync | Done | Express API, SQLite, JWT auth, auto-sync on save, auto-download on load |
| Upload local data on account creation | Done | Syncs immediately after registration |
| User first name on account | Done | Editable in settings, shown in shared view |
| Provider sharing (read-only link) | Done | Generate/revoke link, strips private fields (intercourse, notes) |
| Link to main site in shared view | Done | "Start tracking with Creighton Tracker" link |
| Show user's name in shared chart | Done | "{Name}'s Chart" header |
| Basic Infertile Pattern legend popup explanation | Done | Clickable in both chart view and shared chart view |
| Links to FertilityCare.org & Saint Paul VI | Done | Learn More card in settings |
| Date picker for new observations | Done | Date input defaulting to today, static date when editing |

## Architecture

- **Frontend:** Vanilla TypeScript + Vite + Dexie.js (IndexedDB) + vite-plugin-pwa
- **Backend:** Express + better-sqlite3 on port 3456, systemd service (`creighton-api`)
- **Hosting:** Apache reverse proxy, Let's Encrypt SSL, self-hosted
- **Auth:** JWT in httpOnly cookies, bcrypt password hashing, rate limiting on login/register

## Infrastructure

- Apache vhost: `/etc/apache2/sites-available/creighton.stephens.page-le-ssl.conf`
- Systemd service: `/etc/systemd/system/creighton-api.service`
- Web root: `/var/www/creighton.stephens.page/`
- Source: `/home/jacob/CreightonTrackingApp/`
- Database: `/home/jacob/CreightonTrackingApp/server/data/creighton.db`
- GitHub: https://github.com/JacobStephens2/CreightonTrackingApp

## Known Issues / Quirks Fixed

- Apache global `Alias /icons/` was intercepting icon requests — renamed to `app-icons/`
- SVG icons didn't trigger Android Chrome install prompt — converted to PNG
- Service worker was serving index.html for `/shared/*` URLs — added `navigateFallbackDenylist`
- Cycle detection was too aggressive — now requires 3+ non-bleeding days or 14+ day gap
- Cycle numbering used database IDs — now uses chronological position
- Downloaded data had mismatched cycleIds — `evaluateCycles()` runs after download
- Settings view rendered duplicate cards from concurrent async renders — added generation counter
- Auth rate limiter blocked `/api/auth/me` — narrowed to login/register only

## Deploy Process

```bash
# Frontend
cd /home/jacob/CreightonTrackingApp
npm run build
sudo rm -rf /var/www/creighton.stephens.page/*
sudo cp -r dist/* /var/www/creighton.stephens.page/

# Backend
cd server && npm run build
sudo systemctl restart creighton-api
```
