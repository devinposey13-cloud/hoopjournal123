

## Add Navigation Bar to Legal Pages

### Problem
The Privacy Policy, Terms of Service, and EULA pages have no navigation — users arriving via direct links or App Store review have no way to go back or navigate to other parts of the app.

### Changes

**All three pages** (`PrivacyPolicy.tsx`, `TermsOfService.tsx`, `EULA.tsx`):

Add a sticky top navigation bar with:
- A back arrow button (navigates to `/` or `navigate(-1)` if history exists)
- The Hoop Journal logo + page title
- Links to sibling legal pages (e.g., from Privacy → Terms, EULA)

The nav bar will be a shared component to avoid duplication.

### Files

**Create: `src/components/settings/LegalPageNav.tsx`**
- Sticky header with back button (ArrowLeft icon → dashboard)
- Logo + current page title
- Row of text links to `/privacy`, `/terms`, `/eula` with active state highlighting
- Simple, minimal design matching existing legal page styling

**Modify: `src/pages/PrivacyPolicy.tsx`**
- Import and render `LegalPageNav` at the top

**Modify: `src/pages/TermsOfService.tsx`**
- Import and render `LegalPageNav` at the top

**Modify: `src/pages/EULA.tsx`**
- Import and render `LegalPageNav` at the top

