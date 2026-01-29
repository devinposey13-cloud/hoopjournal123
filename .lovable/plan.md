

# AI Trading Cards with 2K-Style Badge System

## Overview
Enhance the trading card concept with NBA 2K-inspired data elements, including a **dynamic badge system** that awards players skill badges based on their real game performance. Badges are earned automatically based on stats and displayed prominently on trading cards.

## The 2K Badge System

### Badge Categories (5 Total)
Just like NBA 2K, badges are organized into skill categories:

| Category | Icon | Description | Stats Used |
|----------|------|-------------|------------|
| **Finishing** | Dunk icon | Scoring ability in the paint | PPG, FG%, close-range shots |
| **Shooting** | Target icon | Perimeter shooting prowess | 3P%, FT%, mid-range |
| **Playmaking** | Pass icon | Ball handling and court vision | APG, AST/TO ratio |
| **Defense** | Shield icon | Defensive impact | SPG, BPG, defensive plays |
| **Rebounding** | Board icon | Glass control | RPG, offensive/defensive boards |

### Badge Tiers (4 Levels)
Each badge has a tier based on how well you perform in that skill:

| Tier | Color | Threshold Example |
|------|-------|-------------------|
| **Bronze** | Brown | Basic qualification (e.g., 3+ APG) |
| **Silver** | Silver | Above average (e.g., 5+ APG) |
| **Gold** | Gold | Elite level (e.g., 8+ APG) |
| **Hall of Fame** | Purple/HOF | Legendary (e.g., 12+ APG) |

### Example Badges

**Finishing Badges**
- Posterizer: Score 15+ PPG with 50%+ FG
- Paint Beast: Average 8+ rebounds + 12+ points
- Contact Finisher: High scoring with tough finishes

**Shooting Badges**
- Deadeye: 40%+ from three-point range
- Limitless Range: High 3P volume + accuracy
- Clutch Shooter: High FT% (85%+)

**Playmaking Badges**
- Dimer: 5+ APG (assists per game)
- Floor General: High AST/TO ratio (3:1+)
- Handles for Days: Low turnovers + high assists

**Defense Badges**
- Interceptor: 2+ SPG (steals per game)
- Rim Protector: 2+ BPG (blocks per game)
- Pick Pocket: High steal rate

**Rebounding Badges**
- Rebound Chaser: 8+ RPG
- Box Out Beast: 10+ RPG
- Putback Boss: Offensive rebounds + scoring

## Trading Card Layout with Badges

```text
+------------------------------------------+
|  [RARITY TIER]          [POSITION BADGE] |
|  ┌────────────────────────────────────┐  |
|  │                                    │  |
|  │      [Player Avatar/Photo]         │  |
|  │                                    │  |
|  └────────────────────────────────────┘  |
|                                          |
|  PLAYER NAME  #23                        |
|  Team Name • 8th Grade                   |
|  ─────────────────────────────────────── |
|                                          |
|  ╔════════════════════════════════════╗  |
|  ║  BADGES (2K STYLE)                 ║  |
|  ║  [HOF] Dimer  [GOLD] Deadeye       ║  |
|  ║  [SILVER] Rim Protector            ║  |
|  ╚════════════════════════════════════╝  |
|                                          |
|  +12.5 PPG  +6.2 APG  +3.1 SPG           |
|                                          |
|  "A floor general with elite court       |
|   vision and a deadly three-pointer..."  |
|                                          |
|  ┌───────────────────────────────────┐   |
|  │ OVR │ OFF │ DEF │ PLY │ ATH │ IQ  │   |
|  │  85 │  88 │  72 │  94 │  80 │ 91  │   |
|  └───────────────────────────────────┘   |
|                                          |
|  Season: 2024-25 • 18 Games Played       |
+------------------------------------------+
```

## Badge Calculation Logic

Badges are calculated automatically from your season stats:

```text
DIMER BADGE:
  - Bronze: 3+ APG
  - Silver: 5+ APG  
  - Gold: 8+ APG
  - HOF: 12+ APG

DEADEYE BADGE:
  - Bronze: 30%+ 3P% (10+ attempts)
  - Silver: 35%+ 3P%
  - Gold: 40%+ 3P%
  - HOF: 45%+ 3P%

POSTERIZER BADGE:
  - Bronze: 10+ PPG with 40%+ FG%
  - Silver: 15+ PPG with 45%+ FG%
  - Gold: 20+ PPG with 50%+ FG%
  - HOF: 25+ PPG with 55%+ FG%

INTERCEPTOR BADGE:
  - Bronze: 1+ SPG
  - Silver: 1.5+ SPG
  - Gold: 2+ SPG
  - HOF: 3+ SPG

REBOUND CHASER BADGE:
  - Bronze: 5+ RPG
  - Silver: 7+ RPG
  - Gold: 10+ RPG
  - HOF: 14+ RPG
```

## Implementation Plan

### Step 1: Database Schema
Create tables for the badge system:

**`player_badges` table**
- user_id, badge_id, tier (bronze/silver/gold/hof), season_id
- Auto-calculated when card is generated

**`badge_definitions` table**
- id, name, category, icon, description
- Threshold values for each tier

**`trading_cards` table**
- user_id, season_id, rarity, overall_rating
- AI-generated title, description
- Stats snapshot, badges earned

### Step 2: Badge Calculator Function
Create utility function `calculatePlayerBadges(seasonStats)`:
- Takes season averages as input
- Returns array of earned badges with tiers
- Used during card generation

### Step 3: Edge Function - generate-trading-card
Update to include badge calculation:
- Calculate 2K-style attribute ratings (OVR, OFF, DEF, etc.)
- Run badge calculator to determine earned badges
- Generate AI scouting report mentioning top badges
- Determine card rarity from stats + badge count

### Step 4: Badge Display Component
Create `BadgeDisplay.tsx`:
- Renders badge icon with tier color
- Tier-specific styling (HOF gets purple glow, Gold gets shimmer)
- Tooltip with badge description

### Step 5: Trading Card Component
Create `TradingCard.tsx`:
- Card frame with rarity-based border
- Player photo/avatar section
- Badge showcase section (shows top 3-5 badges)
- Stats grid with 2K-style ratings
- AI-generated scouting report

### Step 6: Card Collection & Generation UI
Create collection management:
- View all generated cards
- "Generate New Card" button
- Filter by season, sort by overall rating
- Share/export functionality

## Files to Create/Modify

| File | Action | Description |
|------|--------|-------------|
| Database migration | Create | Add `badge_definitions`, `player_badges`, `trading_cards` tables |
| `src/types/tradingCard.ts` | Create | TypeScript types for badges and cards |
| `src/utils/badgeCalculator.ts` | Create | Badge calculation logic from stats |
| `supabase/functions/generate-trading-card/index.ts` | Create | Edge function for card + badge generation |
| `src/components/trading-cards/BadgeDisplay.tsx` | Create | Individual badge UI component |
| `src/components/trading-cards/TradingCard.tsx` | Create | Full card display component |
| `src/components/trading-cards/CardCollection.tsx` | Create | Collection view and management |
| `src/hooks/useTradingCards.ts` | Create | Hook for card data operations |
| `src/components/games/GamesHub.tsx` | Modify | Add Trading Cards tab |

## Badge Visual Design

### Tier Colors & Effects
- **Bronze**: Brown background, subtle texture
- **Silver**: Silver gradient, light shimmer
- **Gold**: Gold gradient, animated shine
- **Hall of Fame**: Purple with holographic rainbow effect

### Badge Icon Examples
Each badge category has a distinct icon style:
- Finishing: Flame/basketball going through hoop
- Shooting: Crosshair/target
- Playmaking: Basketball with motion lines
- Defense: Shield
- Rebounding: Hands grabbing ball

## Technical Notes

### Data Available for Badge Calculation
From `SeasonStats` interface:
- `avgPoints`, `avgRebounds`, `avgAssists`, `avgSteals`, `avgBlocks`
- `fgPercentage`, `threePtPercentage`, `ftPercentage`
- `gamesPlayed`, `wins`, `losses`

### Additional Stats from Individual Games
- Minutes played (for efficiency calculations)
- Turnovers (for AST/TO ratio)
- Shot attempts (for volume badges)

### Badge Unlock Conditions
- Minimum 3 games required to earn badges
- Badges recalculate each time a card is generated
- Higher tier badges replace lower tiers automatically

