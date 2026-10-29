# Møltz Radar

The Møltz Radar artifact turned into a standalone Node.js project: a Vite frontend plus a small Express server.

## Run it

```bash
npm install
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
server/index.js       Express: serves the app and proxies authentication, customer, and policy requests
```

## What changed from the artifact

The artifact relied on two claude.ai runtime features. `src/claude-shim.js` preserves browser downloads; assistant chat and call scripts use local fallbacks:

- **Assistant chat and call scripts**: use built-in local answers and templates. No API key or external AI service is required.
- **Export to Excel/CSV**: a normal browser download.

## Notes

- Login calls `POST /auth/sign-in` with `{ username, password }`, then verifies the returned access token with `GET /auth/me`. Password recovery first calls `POST /auth/reset-password` with `{ username }` to request a code, then calls `POST /auth/reset-password/confirm` with `{ username, new_password, code }` to complete the reset. The Node server proxies these requests through `/api/auth` to avoid browser CORS requirements.
- The authentication API defaults to `http://localhost:5002`. Set `AUTH_API_URL` in the server environment or `.env` to change it, then restart the app server.
- Use an existing API account. Authentication challenges (including a required new password) are reported but not completed by this login form. Password recovery requires the upstream auth API to support `POST /auth/reset-password`.
- The access token is persisted in `localStorage` so reloads and browser restarts keep the user logged in until the JWT's `exp`. Startup verifies the token with `GET /auth/me`; logout, token expiry, or an API `401` clears the session. Passwords and refresh tokens are not stored, and sessions are not automatically renewed. Browser storage is accessible to same-origin JavaScript, so protect against XSS and use HTTPS for non-local deployments.
- Carteira loads authenticated customer records from `GET /customers` through `/api/customers`, with server pagination (15 per page), page-local search and sorting, and retry states. Only fields supplied by this endpoint are displayed; demo policy/revenue controls are not shown in this grid. Customer authorization is enforced by the REST API.
- Renovações loads policies from `GET /policies` through `/api/policies`, using server-side date filtering and pagination. The remaining dashboard metrics and views still use sample data generated in `src/app.js`.
- Run authentication checks with `node --test src/auth.test.js`.
- Excel export loads SheetJS from cdnjs at runtime, as the original did.
- Fonts (Geist, Instrument Serif) load from Google Fonts.
