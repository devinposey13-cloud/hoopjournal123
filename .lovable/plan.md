

## Plan: Make TodayCard clickable to navigate to pregame card

The TodayCard currently has no click handler on the card body itself. When there's a `displayGame`, clicking anywhere on the card (except the two bottom buttons) should navigate to the game detail/pregame view.

### Changes

**`src/components/dashboard/TodayCard.tsx`**:
1. Add an `onClick` handler to the outer container `div` that navigates to the appropriate game route:
   - If there's a linked recorded game in `games` matching the scheduled game's opponent/date, navigate to `/game/{recordedGameId}`
   - Otherwise navigate to `/game/scheduled/{displayGame.id}`
2. Add `cursor-pointer` to the outer div when a `displayGame` exists
3. On the two bottom `Button` elements, add `e.stopPropagation()` to their `onClick` handlers so clicking them doesn't trigger the card navigation
4. Also stop propagation on the missing-game and insight prompt click handlers to prevent conflicts

This mirrors the pattern already used in `ScheduleCard.tsx` and `LogSection.tsx` for navigating to scheduled/recorded games.

