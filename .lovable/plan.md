

## Scroll-to-Top on Every Navigation

### Problem
Only Pricing and Upgrade pages scroll to top on mount. Components like Conditioning, Practice Mode, and other views render mid-scroll.

### Solution
Create a single `ScrollToTop` component that listens to React Router's `useLocation` and scrolls to `(0, 0)` on every route change. Place it once inside `BrowserRouter` in `App.tsx`. Then remove the duplicate `useEffect` scroll calls from Pricing and Upgrade.

For **in-page view switches** (Practice Mode, Conditioning, etc. which swap views via local state, not route changes), add `window.scrollTo(0, 0)` in the state-change handlers or via a `useEffect` that watches the view state.

### Changes

**1. Create `src/components/ScrollToTop.tsx`**
- Uses `useLocation()` from react-router-dom
- `useEffect` on `location.pathname` → `window.scrollTo(0, 0)`

**2. `src/App.tsx`**
- Import and render `<ScrollToTop />` as first child inside `<BrowserRouter>`

**3. `src/pages/Pricing.tsx` and `src/pages/Upgrade.tsx`**
- Remove the manual `useEffect(() => { window.scrollTo(0, 0) }, [])` (now handled globally)

**4. `src/components/practice/PracticeMode.tsx`**
- Add `useEffect` watching `view` state → `window.scrollTo(0, 0)` on change

**5. `src/components/conditioning/ConditioningHome.tsx`**
- Add `useEffect(() => { window.scrollTo(0, 0) }, [])` on mount

**6. `src/components/conditioning/RunTracker.tsx`**
- Add `useEffect` watching `phase` state → `window.scrollTo(0, 0)` on change

**7. `src/components/conditioning/ConditioningHistory.tsx` and `ManualConditioningEntry.tsx`**
- Add scroll-to-top on mount

