
# Statistics Page/Tab Preview

A dedicated **Statistics** page would give players deeper insights into their performance with advanced analytics, career records, and detailed breakdowns that go beyond the current dashboard view.

---

## Page Layout Overview

```text
+---------------------------------------------------------------+
| Navigation Bar (with new "Stats" tab icon: BarChart3)         |
+---------------------------------------------------------------+
|                                                               |
|  STATISTICS                                   [Team Filter ▼] |
|  Dive deep into your performance                              |
|                                                               |
+---------------------------------------------------------------+
|                                                               |
|  [Season Overview] [Career Highs] [Splits] [Efficiency]       |
|                                                               |
+---------------------------------------------------------------+
|                                                               |
|  (Content based on selected sub-tab)                          |
|                                                               |
+---------------------------------------------------------------+
```

---

## Sub-Tabs and Features

### 1. Season Overview (Default View)
- **Stat Cards Row**: PPG, RPG, APG, SPG, BPG, TO/G (with trend arrows vs last 5 games)
- **Shooting Breakdown**: Visual comparison of FG%, 3P%, FT% with progress bars and shot chart aesthetics
- **Performance Over Time**: Line charts showing scoring, rebounds, assists trends across all games
- **Win/Loss Impact**: Compare your stats in wins vs losses (e.g., "You avg 12.5 PPG in wins vs 8.2 PPG in losses")

### 2. Career Highs
- **Record Cards**: Display career highs for each stat category:
  - Most Points (vs opponent, date)
  - Most Rebounds (vs opponent, date)
  - Most Assists (vs opponent, date)
  - Most Steals, Blocks, etc.
- **Perfect Games**: Games with 0 turnovers, 100% FT, etc.
- **Milestone Timeline**: Visual timeline of when career highs were set

### 3. Splits (Game Breakdowns)
- **Home vs Away**: Stats comparison when playing at home vs away
- **By Opponent**: See how you perform against different teams
- **By Month**: Performance trends across the season months
- **Win Streak Analysis**: Stats during winning/losing streaks

### 4. Efficiency & Advanced Stats
- **True Shooting %**: (Points / (2 * (FGA + 0.44 * FTA))) * 100
- **Assist-to-Turnover Ratio**: APG / TO/G
- **Rebound Rate**: Rebounds per game relative to attempts
- **Points Responsibility**: Points + (Assists * 2) per game
- **Efficiency Rating**: Custom formula combining key stats
- **Radar Chart**: Visual spider web showing balanced vs specialized player profile

---

## Visual Components

### Radar Chart (Player Profile)
A 6-axis spider chart showing:
- Scoring (normalized PPG)
- Rebounding (normalized RPG)
- Playmaking (normalized APG)
- Defense (steals + blocks)
- Efficiency (shooting %)
- Consistency (low variance)

### Progress Bars for Shooting
```text
FG%   [████████████░░░░░░░░] 62.4%
3P%   [██████░░░░░░░░░░░░░░] 35.1%
FT%   [██████████████░░░░░░] 78.9%
```

### Career Highs Cards
Large, celebratory cards with icons, opponent info, and date badges showing personal bests.

### Trend Indicators
Each stat shows a colored arrow (green up/red down) comparing current average to last 5 games.

---

## Technical Approach

### New Files to Create:
1. `src/components/StatisticsPage.tsx` - Main container with sub-tabs
2. `src/components/stats/SeasonOverview.tsx` - Season averages and trends
3. `src/components/stats/CareerHighs.tsx` - Personal records display
4. `src/components/stats/StatsSplits.tsx` - Breakdowns by various categories
5. `src/components/stats/AdvancedStats.tsx` - Efficiency metrics and radar chart

### Navigation Update:
Add "Stats" tab to `Navigation.tsx` with `BarChart3` icon between "Games" and "Schedule"

### Data Calculations:
- Reuse existing `seasonStats` from `useGameWithMilestones`
- Add new utility functions in `src/utils/statsCalculations.ts` for:
  - Career high detection across all games
  - Home/away splits calculation
  - Advanced metrics (TS%, A/TO ratio, etc.)

### Charts:
- Extend recharts usage with `RadarChart`, `PolarGrid`, `PolarAngleAxis` for radar visualization
- Use `AreaChart` for trend visualization
- Continue `BarChart` pattern for comparisons

---

## User Experience

- **Responsive Design**: Stat cards stack on mobile, grid on desktop
- **Team Filtering**: Filter all statistics by team (if player has multiple teams)
- **Animated Entrance**: Stats animate in with staggered spring animations (matching existing patterns)
- **Empty States**: Friendly messaging when not enough games for certain stats (e.g., "Log more games to see home/away splits")
- **Skeleton Loading**: Consistent loading states matching the app's style

---

## Benefits for Players

1. **Self-Analysis**: Understand strengths and areas for improvement
2. **Motivation**: Career highs provide goals to chase
3. **Pattern Recognition**: See how context (home/away, opponent) affects performance
4. **Progress Tracking**: Visualize improvement over time
5. **Shareable Insights**: Data for coaches/parents to review

This would be a significant but high-value addition that makes Hoop Journal a more complete basketball analytics tool for young players.
