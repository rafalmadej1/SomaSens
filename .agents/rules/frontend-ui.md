---
trigger: glob
globs: "frontend/**/*"
description: React 19, TypeScript, Vite, API boundary, and Tailwind v4 Soma theme conventions.
---

# Frontend & UI Rules

- **API Boundary (`frontend/src/api.ts`)**:
  - `frontend/src/api.ts` is the single browser-to-API client targeting `http://127.0.0.1:8000`, persisting the JWT in `localStorage` under `somasense_token`, and handling `401` unauthorized responses.
  - Keep endpoint paths, request payloads, and TypeScript interfaces in `frontend/src/types.ts` synchronized with `backend/main.py` and `backend/models.py`.
  - Preserve collection pagination via "Load More" controls (`limit`/`offset`) rather than fetching unbounded lists.
- **AI Assistant Lifecycle**:
  - The AI assistant view loads persisted `diet`, `workout`, and `shopping` plans on mount.
  - Diet generation draws on pantry, activities, and profile; workout generation is supplemented by profile fields; shopping can receive the active workout plan.
- **Styling & Theme (`frontend/src/index.css`)**:
  - Styling uses Tailwind CSS v4 `@theme` tokens (`soma-terracotta`, `soma-sand`, `soma-gold`, `neon-gold`, `dark-surface`) and shared utilities (`glass-panel`, `glass-card`, `soma-text-primary`, `soma-button`).
  - Reuse existing Soma Ancient Earth + glassmorphism utilities for new UI instead of introducing separate color palettes or ad-hoc CSS systems.
- **TypeScript & Linting**: Maintain strict TypeScript compatibility (`tsc -b`) and zero ESLint errors (`npm --prefix frontend run lint`).
