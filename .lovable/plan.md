

## Improve Stat Panel Readability on Game Report Card

**Problem:** The stat category labels (PTS, REB, AST, etc.) are 15px muted text below large 68px numbers — they get lost visually.

### Proposed Changes (ReportCardCanvas.tsx)

**Flip label above number + increase prominence:**

Each stat box becomes:

```text
┌──────────────────┐
│  ▌PTS             │  ← 20px, accent-colored, bold, left accent bar
│    24             │  ← 60px, white
└──────────────────┘
```

Specific changes:
1. **Move label above the number** — category-first reads more naturally
2. **Increase label to 20px** with the grade's accent color instead of muted gray
3. **Add a 4px left accent bar** in the grade color on each box for a broadcast/sports graphic feel
4. **Reduce number from 68px → 60px** to rebalance hierarchy — label and value feel like partners, not afterthoughts
5. **Left-align text** inside each box for a cleaner editorial look

### File
- `src/components/report-card/ReportCardCanvas.tsx` — stat grid section (~lines 230-250)

