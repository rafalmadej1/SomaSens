---
name: somasense-ui-feature
description: >-
  Build or update SomaSense React 19 UI components, API client calls, and
  Tailwind v4 styling. Use when creating or modifying views in
  frontend/src/components/, frontend/src/api.ts, or frontend/src/index.css.
---

# SomaSense Frontend UI & UX Feature Workflow

Follow these steps when implementing or refining UI features in `frontend/src/`.

## 1. API Client & Error Handling (`frontend/src/api.ts`, `frontend/src/types.ts`)

- Keep `frontend/src/types.ts` strictly matched to backend schemas (`unit: 'g' | 'szt'`, union for `location`, nullable profile fields).
- Normalize FastAPI errors in `frontend/src/api.ts`: handle `422` array `detail` payloads cleanly so validation errors never render as `[object Object]`.
- Validate password byte length (`new TextEncoder().encode(password).length <= 72` and `password.length >= 8`) in `Auth.tsx`.

## 2. XSS Safety & Component State (`frontend/src/components/`)

- Always sanitize Markdown (`DOMPurify.sanitize(marked.parse(source, { async: false }))`) before passing HTML to `dangerouslySetInnerHTML`.
- Do not populate `Profile.tsx` with fake default biometric values that can be accidentally persisted on fetch errors.
- Keep list pagination (`limit`/`offset`) consistent after item creation/deletion and provide visible error states instead of silent `catch(() => {})`.

## 3. Soma Visual System & Accessibility (`frontend/src/index.css`)

- Use defined Tailwind CSS v4 `@theme` tokens (`soma-terracotta`, `soma-sand`, `soma-gold`, `neon-gold`, `dark-surface`) and utilities (`glass-panel`, `glass-card`, `soma-text-primary`, `soma-button`).
- Never use undefined CSS classes (`animate-pulse-glow`, `animate-shake`, `no-scrollbar`).
- Include `aria-label` on icon-only buttons and `<label htmlFor>` on form controls.

## 4. Verification

```bash
npm --prefix frontend run lint
npm --prefix frontend run build
```
