

## Redesign Practice Mode & Move Dashboard Button

### Changes

**1. Move "Log Practice" button into the Coach AI card (`EmptyDashboardWelcome.tsx`)**
- Add a new prop `onLogPractice` to the component interface
- Add a third button after "Pregame Talk" in the action buttons section (around line 395-401): an outline button with Target icon labeled "Log Practice"
- Remove the standalone "Log Practice" button from `Index.tsx` in the empty dashboard section (lines 779-788)
- Pass `() => setShowPracticeMode(true)` as the `onLogPractice` prop from `Index.tsx`

**2. Remove standalone "Log Practice" button from populated dashboard (`Index.tsx`)**
- Remove the AnimatedSection block at lines 896-906 (the separate Log Practice button)
- Add the same `onLogPractice` prop to the `TodayCard` component if it has a similar action area, or add it as a button inside the existing TodayCard/quick-actions section

**3. Rewrite `PracticeMode.tsx` to match LiveStatCapture layout**
- Replace the current stepper-based UI with the same Made/Miss button pattern used in `LiveStatCapture.tsx`
- Copy the `StatButton` component pattern (green Made / red Miss buttons in a 2-col grid)
- Structure the shooting sections identically to LiveStatCapture:
  - **Header**: Back button + "Practice Mode" title (compact, sticky)
  - **Overall shooting % display**: Large percentage in a gradient banner (like the points display)
  - **Quick stats bar**: Show total made/attempted for each zone
  - **Three shooting zones** (FT, Mid Range, 3PT), each with:
    - Zone label + made/attempted (percentage) + undo button
    - Two-column grid: green "Made" button / red "Miss" button
    - "Made" increments both makes and attempts; "Miss" increments only attempts
  - **History tab** remains the same
- Add undo functionality per zone (undo last shot of that type) mirroring `undoLastShot` from LiveStatCapture
- Add a global undo button in the header
- Keep the save button and history view

### Technical details
- Extract or duplicate the `StatButton` component from `LiveStatCapture.tsx` into a shared location, or inline the same styles in `PracticeMode.tsx`
- Use the same color scheme: `bg-green-500/30` for Made, `bg-red-500/15` for Miss
- Track an action history array (like LiveStatCapture) to support undo
- The database schema stays the same — just the UI input method changes

