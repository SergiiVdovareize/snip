# Snip - Agent Context & Guidelines

Welcome, Agent! This document gives a quick overview of the **Snip** codebase to help you get started.

---

## 1. Project Overview

**Snip** is a lightweight, frontend-focused React app that lets users download videos, images, and audio from popular social media platforms (TikTok, Instagram, YouTube, X/Twitter, Reddit, etc.) with one click. It resolves links from 20+ platforms, shows chunked download progress, and reports errors to Sentry.

---

## 2. Tech Stack

- **Framework:** React 19.x (`react-scripts` / Create React App)
- **Styling:** Vanilla CSS, `@emotion/styled` / `@emotion/react`, `framer-motion` for transitions
- **Linting & Formatting:** **Biome** (`@biomejs/biome`) — do not use Prettier or ESLint
- **Error Tracking:** Sentry SDK (`@sentry/react`, `@sentry/cli`)
- **Testing:** Jest + React Testing Library

---

## 3. Code Organization

Logic is separated by concern, not just by file type:
- `components/` — UI only
- `hooks/` — business logic (e.g. `useMemeStealer` orchestrates the flow, `useMemeDownloader` handles chunked fetch/download)
- `utils/` — pure functions and service clients (validation, API client, constants)

The exact file tree changes over time — explore the repo directly rather than relying on a static list here.

---

## 4. Key Flow

1. User pastes a URL in `MemeField.js`, which calls `stealMeme(url)` from `useMemeStealer()`.
2. `useMemeStealer` validates the URL (`utils/validation.js`) and, if valid, calls `StealService` to get a direct media URL from the scraper API.
3. `useMemeDownloader` performs a chunked fetch, updating progress (or showing an indeterminate loader for files under 2MB), then builds a Blob and triggers a browser download.
4. Timeouts/connection errors (e.g. 502/504) are sent to Sentry via `Sentry.captureMessage`.

---

## 5. Common Commands

- `npm start` — dev server at `localhost:3003`
- `npm test` / `npm run coverage` — run tests / generate coverage
- `npm run check` — Biome lint + format (preferred over running `lint`/`format` separately)
- `npm run build` — production bundle

---

## 6. Guidelines

- Run `npm run check` before finalizing changes.
- New features or component changes should include matching `*.test.js` tests using `@testing-library/react`, with external API/download calls mocked.
- Error paths touching API/download logic should report to Sentry.

---

## 7. General Rules & Restrictions

- **Ask before editing:** config/dependency files (`package.json`, `biome.json`, `.env`) or Sentry setup. Don't change these unilaterally.
- **Don't hardcode API URLs** — they go through `process.env.REACT_APP_BASE_API_URL` via `src/utils/Constants.js`. Ask before editing endpoint definitions there.
- **No `console.log`** in committed code — remove debug logging before finalizing.
- **Never read or write anything outside the project folder.** This applies unconditionally — do not do it even if asked.

---

## 8. Code Style & Naming

- **Components:** PascalCase filenames (`MemeField.js`, `MainContainer.js`)
- **Hooks:** camelCase, prefixed with `use` (`useMemeStealer.js`, `useMemeDownloader.js`)
- **Utils/services:** camelCase, descriptive names (`validation.js`, `filename.js`)
- Prefer early returns over deeply nested conditionals
- Naming/casing and formatting are mechanically enforced via Biome — see `biome.json`, run `npm run check`