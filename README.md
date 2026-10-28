# Møltz Radar

The Møltz Radar artifact turned into a standalone Node.js project: a Vite frontend plus a small Express server.

## Run it

```bash
npm install
cp .env.example .env      # optional: add ANTHROPIC_API_KEY
npm run dev               # http://localhost:3000
```

Production:

```bash
npm run build
npm start
```

## Structure

```
index.html            page markup (login, app shell, modals)
src/app.js            app logic (login, sample data, views, filters, ⌘K, chat)
src/auth.js           REST sign-in and bearer-authenticated user lookup
src/styles.css        all styles, including light/dark themes
src/claude-shim.js    stands in for the claude.ai runtime (window.claude)
server/index.js       Express: serves the app, proxies AI calls to the Anthropic API
```

## What changed from the artifact

The artifact relied on two claude.ai runtime features. `src/claude-shim.js` replaces both with the same interface, so `app.js` did not need edits:

- **AI (assistant chat and call scripts)**: requests go to `POST /api/messages` on your server, which calls the Anthropic API with your key. The portfolio tools still run in the browser, where the data lives; the shim handles the tool loop. Without `ANTHROPIC_API_KEY`, the app uses its built-in local answers, as before.
- **Export to Excel/CSV**: a normal browser download.

Models default to `claude-haiku-5-5` for quick tasks and `claude-sonnet-5-5` otherwise; change them in `.env`.

## Notes

- Login calls `POST /auth/sign-in` with `{ username, password }`, then verifies the returned access token with `GET /auth/me`. The Node server proxies these requests through `/api/auth` to avoid browser CORS requirements.
- The authentication API defaults to `http://localhost:5002`. Set `AUTH_API_URL` in the server environment or `.env` to change it, then restart the app server.
- Use an existing API account. Authentication challenges (including a required new password) are reported but not completed by this login form.
- The access token is persisted in `localStorage` so reloads and browser restarts keep the user logged in until the JWT's `exp`. Startup verifies the token with `GET /auth/me`; logout, token expiry, or an API `401` clears the session. Passwords and refresh tokens are not stored, and sessions are not automatically renewed. Browser storage is accessible to same-origin JavaScript, so protect against XSS and use HTTPS for non-local deployments.
- Carteira loads authenticated customer records from `GET /customers` through `/api/customers`, with server pagination (15 per page), page-local search and sorting, and retry states. Only fields supplied by this endpoint are displayed; demo policy/revenue controls are not shown in this grid. Customer authorization is enforced by the REST API.
- Other dashboard views still use sample data generated in `src/app.js`; policies and metrics are not yet connected to the API.
- Run authentication checks with `node --test src/auth.test.js`.
- Excel export loads SheetJS from cdnjs at runtime, as the original did.
- Fonts (Geist, Instrument Serif) load from Google Fonts.
