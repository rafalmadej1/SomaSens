---
name: somasense-ui-feature
description: >-
  Build or update SomaSense React 19 UI components, API client calls, and
  Tailwind v4 styling. Use when creating or modifying views in
  frontend/src/components/, frontend/src/api.ts, or frontend/src/index.css.
---

# SomaSense Frontend UI & UX Feature Workflow

Follow these steps when implementing or refining UI features in `frontend/src/`.

## 1. API & Type Boundary

- Define or update strict TypeScript interfaces in `frontend/src/types.ts` matching `backend/models.py` and `backend/main.py`.
- Add or update fetch helpers in `frontend/src/api.ts` using `getHeaders()` and `handleAuthError(res)` (`401` handling).
- Preserve `somasense_token` handling in `localStorage` and ensure `logoutUser()` calls `/auth/logout` with the token before removing it.
- Keep wire values intact (`g`/`szt`, `lodowka`/`spizarnia`/`zamrazarka`) and preserve "Load More" `limit`/`offset` pagination in list views.

## 2. Component & UX Ergonomics (`frontend/src/components/`)

- Reuse the existing view structure in `frontend/src/App.tsx` (`Home`, `Pantry`, `Activities`, `Profile`, `AIAssistant`, `About`, `Auth`).
- Enforce client-side password bounds (minimum 8 chars, maximum 72 UTF-8 bytes) in `Auth.tsx` to match backend validation.
- Render AI Markdown responses safely via `marked` and use `lucide-react` icons consistently.

## 3. Soma Visual System (`frontend/src/index.css`)

- Use Tailwind CSS v4 `@theme` tokens (`soma-terracotta`, `soma-sand`, `soma-gold`, `neon-gold`, `dark-surface`) and shared classes (`glass-panel`, `glass-card`, `soma-text-primary`, `soma-button`).
- Avoid introducing ad-hoc color schemes or external CSS frameworks.

## 4. Verification

Run lint and production build from the repository root:

```bash
npm --prefix frontend run lint
npm --prefix frontend run build
```
