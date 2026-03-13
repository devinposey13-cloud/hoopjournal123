

## Swap Dancing Script → Teko for consistency

Replace all remaining `fontFamily: "'Dancing Script', cursive"` references with `fontFamily: "'Teko', sans-serif"` and update classes to match the sporty angular style (uppercase, tracking-wide, appropriate weight).

**Files to edit (7 files, ~10 occurrences):**

1. **`src/components/AuthForm.tsx`** — tagline style swap + add `uppercase tracking-wide`
2. **`src/components/onboarding/RoleCard.tsx`** — both `<h2>` tags
3. **`src/components/onboarding/LevelCard.tsx`** — heading
4. **`src/components/onboarding/CompletionCard.tsx`** — heading
5. **`src/components/onboarding/TransitionScreen.tsx`** — heading
6. **`src/components/onboarding/FamilyCard.tsx`** — heading
7. **`src/components/EmptyDashboardWelcome.tsx`** — greeting + quote (2 instances)

Each change: `'Dancing Script', cursive` → `'Teko', sans-serif` with `fontWeight: 600`, add `uppercase tracking-wide` to className, bump font sizes slightly since Teko renders more compact than Dancing Script.

