---
name: somasense-domain-review
description: >-
  Audit SomaSense nutrition, workout, biometric, and pantry domain logic for
  sports science accuracy and user safety. Use when reviewing backend/prompts.py,
  biometric schemas, or nutrition/fitness UI workflows.
---

# SomaSense Sports Nutrition & Fitness Domain Review

Use this procedure to evaluate domain correctness, safety, and usability across prompts, schemas, and UI flows.

## 1. Inspect Current Domain Inputs & Prompts

- Read `backend/prompts.py` (`build_diet_prompt`, `build_workout_prompt`, `build_shopping_prompt`).
- Inspect `UserProfileUpdate`, `WorkoutRequest`, and `ShoppingRequest` in `backend/main.py` plus `PantryItemCreate` and `UnitEnum`/`LocationEnum` in `backend/models.py`.
- Check how `frontend/src/components/` (`Profile.tsx`, `Pantry.tsx`, `Activities.tsx`, `AIAssistant.tsx`) collects and displays domain fields.

## 2. Evaluate Domain Criteria

- **Workout Safety & Specificity**: Check that `injuries`, `equipment`, `discipline`, `focus_areas`, `activityLevel`, and biometrics (`age`, `weight`, `height`, `gender`) produce safe exercise choices, contraindication warnings, and adequate recovery.
- **Caloric & Macro Alignment**: Verify `build_diet_prompt` integrates `activities` (`type`, `duration`, `calories`) and `profile_context` (`goal`, `dietary_preferences`) coherently without promoting extreme deficits.
- **Inventory & Pantry Realism**: Check unit handling (`g`, `szt`), storage sectors (`lodowka`, `spizarnia`, `zamrazarka`), expiry prioritization, and realistic ingredient quantities in `CONSUMPTION_STRUCTURE`.
- **Shopping Practicality**: Verify `build_shopping_prompt` respects `days`, `budget` (PLN), `avoids` (allergens/dislikes), and `preferences`.

## 3. Deliver Findings

Report findings grouped into:
1. **Safety / Contraindication Risks**
2. **Nutrition & Training Quality Gaps**
3. **Concrete Prompt or Schema Recommendations** (citing exact files and lines)
