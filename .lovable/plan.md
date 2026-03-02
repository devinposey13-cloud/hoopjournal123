

## Parent Dashboard Feature — Implementation Plan

### Overview
Build a read-only, shareable page where parents can view their child's stats, game history, milestones, and season progress. Access is gated to Elite plan users. The parent accesses the dashboard via a unique token-based link (no login required).

### Architecture

```text
Player (Elite) → Settings → "Enable Parent Dashboard" → generates unique token
                                                        → shareable link: /parent/{token}

Parent (no login) → /parent/{token} → read-only dashboard with:
                     - Player info header
                     - Season averages
                     - Recent game log
                     - Milestones earned
                     - XP / level progress
```

### Database Changes

**New table: `parent_dashboard_tokens`**
- `id` (uuid, PK)
- `user_id` (uuid, NOT NULL) — the player
- `profile_id` (uuid, nullable) — for multi-profile support
- `token` (text, UNIQUE, NOT NULL) — random URL-safe token
- `is_active` (boolean, default true)
- `created_at` (timestamptz)
- `last_viewed_at` (timestamptz, nullable)

**RLS policies:**
- Users can CRUD their own tokens (`auth.uid() = user_id`)
- Public SELECT by token value (for unauthenticated parent access — handled via a security definer function or anon SELECT with `is_active = true`)

### New Files

1. **`src/pages/ParentDashboard.tsx`** — Public page at `/parent/:token`
   - Fetches token → resolves user_id → loads player data (profile, games, stats, milestones, XP)
   - Read-only layout similar to PublicProfile but richer: includes game-by-game log, season averages, milestone collection, and XP level
   - Branded header with Hoop Journal logo
   - No login required

2. **`src/components/settings/ParentDashboardSettings.tsx`** — Settings UI for Elite users
   - Toggle to enable/disable parent dashboard
   - Shows shareable link with copy button
   - Regenerate link option
   - Placed in SettingsPanel under a "Parent Dashboard" section (gated by `canUseFeature(currentPlan, 'parentDashboard')`)

### Route Addition

In `App.tsx`, add:
```
<Route path="/parent/:token" element={<ParentDashboard />} />
```
Place above the `/:username` catch route.

### Data Access Strategy

The parent dashboard page will use a security definer function `get_parent_dashboard_data(p_token text)` that:
1. Validates the token exists and is active
2. Returns the player's user_id and profile_id
3. The frontend then queries public-safe data using the resolved IDs through additional security definer functions or by querying tables that have public-friendly RLS

Alternatively, simpler approach: add an anon-readable SELECT policy on `parent_dashboard_tokens` filtered by `is_active = true`, then use the resolved `user_id` to query games/milestones/stats via security definer views (similar to `public_player_profiles`).

### Feature Gating

- In `SettingsPanel.tsx`, the Parent Dashboard section only shows for Elite users (using `canUseFeature`)
- Non-Elite users see a locked card that triggers `openPaywall('parent_dashboard')`
- The `/parent/:token` page itself is always accessible (public link for parents)

### Security Considerations
- Tokens are cryptographically random (generated via `crypto.randomUUID()` or similar)
- Players can deactivate/regenerate tokens at any time
- No sensitive PII exposed (phone numbers excluded, similar to public profiles)
- Token-based access means parents don't need accounts

### Implementation Steps
1. Create `parent_dashboard_tokens` table with RLS
2. Create security definer function for token validation
3. Build `ParentDashboard.tsx` page (public, read-only)
4. Build `ParentDashboardSettings.tsx` component for settings
5. Integrate into `SettingsPanel.tsx` with Elite gating
6. Add route in `App.tsx`

