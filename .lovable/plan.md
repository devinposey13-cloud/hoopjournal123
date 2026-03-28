

## Add "Log Practice" to Empty Dashboard

### Problem
The "Log Practice" button only appears after a user has logged at least one game. New users on the empty dashboard cannot access Practice Mode.

### Fix

**`src/pages/Index.tsx`**
- Add a "Log Practice" button inside the empty dashboard section (around line 777, after `EmptyDashboardWelcome`)
- Use the same button style and `onClick={() => setShowPracticeMode(true)}` handler as the existing one
- Wrap the `EmptyDashboardWelcome` block with the same `showPracticeMode` conditional that exists for the main dashboard, so practice mode renders correctly from the empty state too

**`src/components/EmptyDashboardWelcome.tsx`** (optional)
- Alternatively, add the button directly inside the welcome component as a secondary CTA alongside "Log First Game"

### Recommended approach
Add the button in `Index.tsx` right after the `EmptyDashboardWelcome` component (inside the same container div), keeping it consistent with the existing button. Also ensure the `showPracticeMode` ternary wraps both the empty and non-empty dashboard branches.

