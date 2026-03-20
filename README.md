# Creighton Cycle Tracker

A PWA for tracking your fertility cycle using the Creighton Model FertilityCare System (CrMS).

**Live at [creighton.stephens.page](https://creighton.stephens.page)**

## Features

- **Daily observations** — bleeding (H/M/L/VL/B), mucus stretch (0–10), mucus characteristics (C/K/L/B/G/Y), frequency, peak day marking, intercourse tracking, notes
- **Auto-computed CrMS stamps** — green (dry/infertile), red (bleeding), white (fertile/mucus), yellow (BIP), with peak day (P) and post-peak count (1/2/3)
- **Chart view** — classic Creighton 35-column chart with cycle rows, stamps, and observation codes
- **Calendar view** — monthly grid with mini stamps
- **Auto cycle detection** — new cycle starts when bleeding resumes after non-bleeding days
- **Auto peak day detection** — last day of peak-type mucus
- **Export/import** — JSON backup and CSV chart export
- **Optional account & sync** — sign in to back up data to the server and access it across devices
- **Provider sharing** — generate a read-only share link for your FertilityCare Practitioner
- **Offline-capable** — full PWA with service worker, works without internet
- **Installable** — add to home screen on Android/iOS, TWA-ready for Play Store

## Tech Stack

**Frontend:** Vanilla TypeScript, Vite, Dexie.js (IndexedDB), vite-plugin-pwa
**Backend:** Express, better-sqlite3, JWT auth, bcrypt
**Hosting:** Apache, Let's Encrypt SSL

## Development

```bash
npm install
npm run dev         # Dev server with hot reload
npm run build       # Production build
npm run preview     # Preview production build
```

The backend API server (for account/sync features):

```bash
cd server
npm install
npm run dev         # Dev server with auto-reload
npm run build       # Compile TypeScript
npm start           # Run production build
```

In development, Vite proxies `/api` requests to `localhost:3456`.

## Deployment

The app is self-hosted on Apache with the Express API running as a systemd service (`creighton-api`) on port 3456, proxied through Apache.

```bash
# Build and deploy frontend
npm run build
sudo cp -r dist/* /var/www/creighton.stephens.page/

# Build and deploy backend
cd server && npm run build
sudo systemctl restart creighton-api
```

## Learn More

- [FertilityCare.org](https://www.fertilitycare.org/) — FertilityCare Centers of America
- [Saint Paul VI Institute](https://saintpaulvi.com/) — Pope Paul VI Institute for the Study of Human Reproduction
