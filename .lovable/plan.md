
# Perplexity AI Integration for Basketball Knowledge & Player Comparison

## Overview
Add two new AI-powered features to the Coach tab: **Basketball Knowledge Search** (search for drills, techniques, NBA player comparisons) and **Player Comparison** (compare user stats against real NBA/WNBA players and legends). Both features leverage Perplexity AI for grounded, real-time web search results.

## Architecture

```text
+------------------+     +--------------------+     +------------------+
|   Coach Tab      | --> | perplexity-search  | --> | Perplexity API   |
| (3 sub-tabs)     |     | (Edge Function)    |     | (AI Search)      |
+------------------+     +--------------------+     +------------------+
| - Coach Chat     |             |
| - BB Knowledge   |     +--------------------+     +------------------+
| - Player Compare |---->| perplexity-compare | --> | Perplexity API   |
+------------------+     | (Edge Function)    |     | (Grounded Search)|
                         +--------------------+     +------------------+
```

## New Features

### 1. Basketball Knowledge Search
- Search for drills, training tips, basketball techniques
- Get AI-powered answers grounded in real basketball content
- Suggested searches: "How to improve my crossover", "Defensive drills for guards", "NBA shooting form tips"
- Results include citations to real sources

### 2. Player Comparison
- Enter user's stats (or use season averages automatically)
- AI finds similar NBA/WNBA players based on statistical profile
- Provides insights on play style, strengths to emulate, and areas to develop
- Example: "Your scoring profile is similar to Steph Curry's early career - high 3PT%, good assists"

## Implementation Steps

### Step 1: Connect Perplexity API
Use the Perplexity connector to securely store the API key.

### Step 2: Create Edge Functions
Create two new edge functions:

**`perplexity-search`** - For basketball knowledge queries
- Accepts a search query
- Calls Perplexity API with basketball-focused system prompt
- Returns AI response with citations

**`perplexity-compare`** - For player comparison
- Accepts user stats (points, rebounds, assists, etc.)
- Builds a search query to find similar NBA/WNBA players
- Returns comparison analysis with player matches

### Step 3: Create UI Components

**`BasketballKnowledge.tsx`**
- Search input with suggested topics
- Loading state with basketball-themed animation
- Results display with markdown rendering
- Citations/sources section

**`PlayerComparison.tsx`**
- Auto-populated stats from user's season averages
- "Compare My Stats" button
- Results showing matched players with similarity breakdown
- Voice playback support (reuse existing hook)

### Step 4: Update Coach Tab Layout
Transform the Coach tab to use sub-tabs:
- **Chat** - Existing CoachChat component
- **Knowledge** - New BasketballKnowledge component
- **Compare** - New PlayerComparison component

## User Experience

### Basketball Knowledge
1. User clicks "Knowledge" tab
2. Sees search bar with suggested topics like "Shooting drills", "Post moves", "Basketball conditioning"
3. Types query or clicks suggestion
4. Gets AI-grounded answer with real sources
5. Can listen to response with voice playback

### Player Comparison
1. User clicks "Compare" tab
2. Sees their season averages pre-filled
3. Clicks "Find Similar Players"
4. Gets analysis like: "Based on your 15 PPG, 5 RPG, 3 APG profile, you have a similar stat line to..."
5. Shows 2-3 matched players with insights on what to learn from each

## Files to Create/Modify

| File | Action | Description |
|------|--------|-------------|
| `supabase/functions/perplexity-search/index.ts` | Create | Basketball knowledge search endpoint |
| `supabase/functions/perplexity-compare/index.ts` | Create | Player comparison endpoint |
| `src/components/BasketballKnowledge.tsx` | Create | Knowledge search UI component |
| `src/components/PlayerComparison.tsx` | Create | Player comparison UI component |
| `src/pages/Index.tsx` | Modify | Update Coach tab to use sub-tabs |
| `supabase/config.toml` | Modify | Add new function configs |

## Technical Details

### Edge Function: perplexity-search
```typescript
// Key implementation:
// - POST with { query: string }
// - Uses sonar model for fast grounded search
// - Basketball-focused system prompt
// - Returns { answer: string, citations: string[] }
```

### Edge Function: perplexity-compare
```typescript
// Key implementation:
// - POST with { stats: SeasonStats }
// - Builds comparison query from user stats
// - Uses sonar-pro for deeper analysis
// - Returns { comparison: string, matchedPlayers: string[], citations: string[] }
```

### Coach Tab Sub-tabs
```typescript
// Updated Coach tab structure:
<Tabs defaultValue="chat">
  <TabsList>
    <TabsTrigger value="chat">Coach Chat</TabsTrigger>
    <TabsTrigger value="knowledge">BB Knowledge</TabsTrigger>
    <TabsTrigger value="compare">Player Compare</TabsTrigger>
  </TabsList>
  <TabsContent value="chat">
    <CoachChat ... />
  </TabsContent>
  <TabsContent value="knowledge">
    <BasketballKnowledge />
  </TabsContent>
  <TabsContent value="compare">
    <PlayerComparison seasonStats={seasonStats} />
  </TabsContent>
</Tabs>
```

## Dependencies
- Perplexity API key (via connector - already available in workspace)
- No new npm packages required
- Reuses existing voice hook for audio playback
