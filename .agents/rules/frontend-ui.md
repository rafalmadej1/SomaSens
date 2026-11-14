---
trigger: glob
globs: "frontend/**/*"
description: React 19, TypeScript, Vite, XSS sanitization, API boundary, and Tailwind v4 Soma theme conventions.
---

# Frontend & UI Rules

- **XSS & Markdown Safety (Critical)**:
  - `marked` does NOT sanitize HTML. Never pass LLM or user Markdown to `dangerouslySetInnerHTML` without sanitizing through `DOMPurify.sanitize(...)`.
- **API Client & Error Handling (`frontend/src/api.ts`)**:
  - Route all HTTP requests through `frontend/src/api.ts` (prefer `import.meta.env.VITE_API_URL` / Vite proxy over hardcoded `http://127.0.0.1:8000`).
  - Normalize FastAPI error responses: for HTTP `422`, `error.detail` is an array of validation objects—format them into a readable string so UI never renders `[object Object]`.
  - Keep `frontend/src/types.ts` strictly aligned with backend schemas (e.g., `unit: 'g' | 'szt'`, nullable profile fields).
- **State, Pagination & Forms**:
  - Avoid hardcoded fake biometric defaults in `Profile.tsx` that could be saved on failed fetches.
  - After local item creation/deletion in paginated lists (`Pantry.tsx`, `Activities.tsx`), keep pagination offsets consistent so "Load More" neither duplicates nor skips items.
- **Styling & Accessibility (`frontend/src/index.css`)**:
  - Place external `@import url(...)` font rules before `@import "tailwindcss"`.
  - Reuse defined `@theme` tokens (`soma-terracotta`, `soma-sand`, `soma-gold`, `neon-gold`, `dark-surface`) and `@layer utilities` (`glass-panel`, `glass-card`, `soma-text-primary`, `soma-button`). Never use undefined classes (such as `animate-pulse-glow`, `animate-shake`, or `no-scrollbar`).
  - Provide `aria-label` on icon-only buttons and associate `<label htmlFor>` with form inputs.
