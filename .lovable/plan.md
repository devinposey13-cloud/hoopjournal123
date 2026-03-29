

## Add Conditioning Data to Progress Tab Practice View

### Overview
When the user selects "Practice" in the Progress tab, they currently only see shooting stats. This enhancement adds a Conditioning section below the shooting stats showing run history, totals, and trends — keeping the view clean and consistent.

### Changes

**1. `src/components/ProgressHub.tsx` — Fetch conditioning sessions**
- Add a `conditioningSessions` state array alongside `practiceSessions`
- In the existing `useEffect` that fires when `dataSource === 'practice'`, also query `conditioning_sessions` table filtered by `user_id` (and `profile_id` if active)
- Pass `conditioningSessions` as a new prop to `PracticeProgressView`

**2. `src/components/progress/PracticeProgressView.tsx` — Add conditioning section to Practice view**
- Add optional `conditioningSessions` prop to the component interface
- After the existing shooting stats section (in `mode === 'practice'`), render a new "Conditioning" section if there are sessions:
  - **Summary stats row** (reusing `StatCard` pattern): Total Runs, Total Distance, Total Time, Avg Pace
  - **Best run callout** (reusing the amber `Trophy` card pattern from best practice session)
  - **Last 5 runs trend chart** (reusing the same `AreaChart` pattern, showing distance or pace over time)
  - **Trust score average** displayed as a small badge if available
- In `mode === 'combined'`, optionally show a conditioning summary card comparing total conditioning volume

**3. No database changes needed**
- All data already exists in `conditioning_sessions` table with the fields needed (elapsed_seconds, total_distance_meters, coach_trust_score, created_at, activity_type, verification_status)

### Technical details
- Reuse the existing `StatCard` and chart patterns already in `PracticeProgressView` for visual consistency
- Calculate pace as `elapsed_seconds / (total_distance_meters / 1000)` converted to min/km
- Filter to only `activity_type = 'run'` sessions for the conditioning stats
- The conditioning section uses a `Running` icon from lucide and a section header to visually separate it from shooting stats

