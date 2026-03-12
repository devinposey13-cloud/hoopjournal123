

## Public Privacy Policy & Terms of Service Pages

### What
Create publicly accessible routes `/privacy` and `/terms` so the privacy policy and terms of service can be shared as direct URLs (e.g., for App Store submission).

### How

1. **New page: `src/pages/PrivacyPolicy.tsx`**
   - Renders `PrivacyPolicyContent` from `LegalPolicyViewer.tsx` in a clean, standalone layout (no auth required)
   - Includes Hoop Journal logo, title, last-updated date, and version
   - Styled consistently with the existing viewer but as a full page

2. **New page: `src/pages/TermsOfService.tsx`**
   - Same pattern, renders `TermsOfServiceContent`

3. **Update `src/App.tsx`**
   - Add routes `/privacy` and `/terms` **above** the catch-all `/:username` route so they aren't treated as public profile lookups

No authentication, no database changes. The content components already exist and are simply reused in a public page wrapper.

### Result
- `https://hoopjournal123.lovable.app/privacy` — shareable privacy policy URL for App Store
- `https://hoopjournal123.lovable.app/terms` — shareable terms URL

