# MAURITOP

MAURITOP is a Mauritanian digital-services and game top-up platform. The application uses MRU pricing, Arabic RTL as its primary interface, and supports French LTR.

## Technology

- React 19, Vite 6, TypeScript, Tailwind CSS 4
- Firebase Authentication, Firestore and Storage
- Express 5 server with WebSocket support at `/live`
- React Router 7

## Requirements

- Node.js 22.9 or later (Node 22 or 24 LTS recommended)
- npm 10 or later

## Local development

1. Install the exact dependency versions from the committed lockfile:

   ```sh
   npm ci
   ```

2. Copy `.env.example` to `.env.local` and enter only the server credentials needed for local development. The local file is ignored by Git:

   ```sh
   cp .env.example .env.local
   ```

   - `GEMINI_API_KEY` is used by the server-side Gemini chat endpoint.
   - `FIREBASE_SERVICE_ACCOUNT_JSON` is used by Firebase Admin when Application Default Credentials are not available.
   - `FCM_SERVER_KEY` is optional and used for server-side push notifications.

   Never commit `.env.local`, service-account JSON, private keys, or other credentials. The browser Firebase client configuration is read from `firebase-applet-config.json`; do not place Firebase Admin credentials in that file.

3. Start the combined Express and Vite development server:

   ```sh
   npm run dev
   ```

   The local application listens on port 3000. Express API routes use `/api/*`, and the WebSocket endpoint is `/live`.

## Project checks

- `npm run lint` — TypeScript check for the `src/` application code.
- `npm run build` — builds the Vite frontend and bundles the Express server to `dist/server.cjs`.
- `npm start` — starts the built Express server in production mode.
- `npm run clean` — removes the generated `dist/` directory.

There is currently no dedicated unit/E2E test script in `package.json`. The GitHub Actions baseline workflow runs a clean `npm ci`, the TypeScript check, and the full production build.

## Hosting note

`firebase.json` currently configures static Firebase Hosting for the `dist/` directory. It does not by itself deploy the Express server, its `/api/*` routes, or the `/live` WebSocket endpoint. Production hosting must run the Node server and route the API and WebSocket traffic to it. Do not treat a successful static frontend deployment as proof that the backend is deployed.

## Source integrity

- `package.json` and `package-lock.json` are the npm dependency source of truth.
- Use `npm ci` for reproducible installs.
- Do not introduce a second lockfile unless the project deliberately adopts a second package manager.
- Preserve real Firebase project configuration, customer data, payment destinations, and existing media assets.
