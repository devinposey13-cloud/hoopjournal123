

# Fix Public Profile Stats, Highlights & Add Privacy-Respecting Milestone Cards

## Problem Summary

The public profile page (`/:username`) has the following issues:

1. **Stats not displaying**: The games data exists in the database and RLS policies are correct, but there may be silent failures or the data isn't being rendered properly
2. **Highlights not displaying**: The video clips fetch appears correct but clips must have `is_public = true` (current test clip has `is_public = false`)
3. **Milestones not displayed at all**: The page doesn't fetch or display milestone cards

Additionally, the user wants milestone cards on public profiles to show **only the title and requirement description** - no game-specific information (opponent, date, stats) to protect privacy.

## Root Cause Analysis

After investigating:
- The RLS policies are correctly configured for public access
- The `public_player_profiles` view works with `security_invoker = false` 
- Games and player_milestones have "Anyone can view...of public profiles" policies
- Video clips require `is_public = true` on the clip itself (separate from profile public setting)

The core issue is likely:
1. The page may be silently swallowing errors
2. Milestones are not being fetched at all
3. Need a simplified milestone card variant for public display

## Solution

### Part 1: Debug & Fix Data Fetching in PublicProfile.tsx

Add proper error logging and ensure the data fetching works correctly:

```typescript
// Add better error handling
const { data: gamesData, error: gamesError } = await supabase
  .from('games')
  .select('*')
  .eq('user_id', profileData.user_id);

if (gamesError) {
  console.error('Error fetching games:', gamesError);
}
```

### Part 2: Fetch Milestones for Public Profile

Add milestone fetching to the `fetchPublicProfile` function:

```typescript
interface PublicMilestone {
  id: string;
  milestoneId: string;
  milestoneName: string;
  milestoneDescription: string;
  milestoneRarity: MilestoneRarity;
  milestoneIcon: string;
  earnedAt: string;
}

// Fetch milestones with joined definitions
const { data: milestonesData } = await supabase
  .from('player_milestones')
  .select(`
    id,
    milestone_id,
    earned_at,
    milestone_definitions (
      name,
      description,
      rarity,
      icon
    )
  `)
  .eq('user_id', profileData.user_id);
```

### Part 3: Create a Privacy-Respecting Public Milestone Card

Create a new component `PublicMilestoneCard` that shows only:
- Milestone name (title)
- Requirement description
- Rarity badge
- Icon

It explicitly excludes:
- Stats snapshot (points, rebounds, etc.)
- Opponent name
- Earned date
- Game-specific details
- Flip functionality (no history log)

```typescript
// src/components/milestones/PublicMilestoneCard.tsx
interface PublicMilestoneCardProps {
  name: string;
  description: string;
  rarity: MilestoneRarity;
  icon: string;
}

export function PublicMilestoneCard({ name, description, rarity, icon }: PublicMilestoneCardProps) {
  // Simplified display with only title, description, icon, and rarity
  // No stats, no opponent, no date, no flip animation
}
```

### Part 4: Add Milestones Tab to Public Profile

Update the Tabs component to include a third tab for Milestones:

```typescript
<TabsList className="grid w-full max-w-md mx-auto grid-cols-3 mb-6">
  <TabsTrigger value="stats">Stats</TabsTrigger>
  <TabsTrigger value="highlights">Highlights</TabsTrigger>
  <TabsTrigger value="milestones">Milestones</TabsTrigger>
</TabsList>

<TabsContent value="milestones">
  {milestones.length > 0 ? (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
      {milestones.map((m) => (
        <PublicMilestoneCard
          key={m.id}
          name={m.milestoneName}
          description={m.milestoneDescription}
          rarity={m.milestoneRarity}
          icon={m.milestoneIcon}
        />
      ))}
    </div>
  ) : (
    <div className="stat-card text-center py-12">
      <p className="text-muted-foreground">No milestones earned yet.</p>
    </div>
  )}
</TabsContent>
```

### Part 5: Group Repeated Milestones with Count Badge

Since a player can earn the same milestone multiple times, group them and show a count:

```typescript
// Group milestones by milestone_id and count occurrences
const groupedMilestones = useMemo(() => {
  const groups = new Map<string, { ...milestone, count: number }>();
  milestonesData.forEach(m => {
    const existing = groups.get(m.milestone_id);
    if (existing) {
      existing.count++;
    } else {
      groups.set(m.milestone_id, { ...m, count: 1 });
    }
  });
  return Array.from(groups.values());
}, [milestonesData]);
```

The `PublicMilestoneCard` will show a "5x" badge for repeated achievements.

## Summary of Changes

| File | Change |
|------|--------|
| `src/pages/PublicProfile.tsx` | Add milestone fetching, add Milestones tab, improve error handling |
| `src/components/milestones/PublicMilestoneCard.tsx` | **New file** - Privacy-respecting card showing only title + description |

## Visual Design

```text
Public Profile Milestone Card:
+------------------------+
|   [UNCOMMON]           |
|                        |
|      [🎯 Icon]         |
|                        |
|    "Sharpshooter"      |
|                        |
| Made 2+ three-pointers |
| in one game            |
|                        |
|      [5x badge]        |
+------------------------+

What's shown:
✓ Milestone name
✓ Full requirement description
✓ Rarity label
✓ Icon
✓ Occurrence count (5x)

What's hidden:
✗ Stats (27 PTS, 8 REB)
✗ Opponent (vs Rebels)
✗ Date earned (Jan 5, 2026)
✗ Flip animation / history
```

## Technical Considerations

1. **RLS Policies**: Already in place - "Anyone can view milestones of public profiles" allows this
2. **Type Safety**: Use proper typing for the milestone data joined with definitions
3. **Performance**: Group milestones client-side after fetching to reduce query complexity
4. **Privacy**: The `PublicMilestoneCard` intentionally receives no game-specific props

