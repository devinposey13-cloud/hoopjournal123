

## Persistent Collapsible Music Bar

This plan adds a fixed music bar at the bottom of the screen that stays visible and keeps playing as you navigate between tabs.

### What You'll Get

- A sleek music bar fixed to the bottom of the screen
- Music continues playing when switching between Dashboard, Games, Schedule, etc.
- Click to expand/collapse the player
- Only appears when you have a Spotify URL saved in Settings
- Smooth animations for expanding/collapsing

### Visual Design

The music bar will have two states:

**Collapsed State (default):**
- Thin bar (about 52px tall) showing a music icon, "Now Playing" text, and expand button
- Spotify green accent color
- Semi-transparent background with blur effect

**Expanded State:**
- Taller bar (about 120px) showing the full Spotify embed player
- Collapse button to minimize

---

### Technical Details

**New Component: `PersistentMusicBar.tsx`**

```text
+------------------------------------------------------------------+
|  [Music Icon]  Pregame Music - Get in the zone    [Expand/Collapse] |
|  ----------------------------------------------------------------  |
|  [  Spotify iFrame Embed (when expanded)                        ]  |
+------------------------------------------------------------------+
```

**Key Implementation Points:**

1. **Component Location**: Place outside the tab-switching logic in `Index.tsx` so it never unmounts
2. **State Management**: Local `isExpanded` state to toggle between collapsed/expanded views
3. **Fixed Positioning**: Use `fixed bottom-0` CSS to anchor at screen bottom
4. **Main Content Padding**: Add `pb-16` (collapsed) or `pb-32` (expanded) to main content to prevent overlap
5. **Collapsible Animation**: Use Radix Collapsible for smooth expand/collapse transitions

**Files to Create:**
- `src/components/PersistentMusicBar.tsx` - New persistent player component

**Files to Modify:**
- `src/pages/Index.tsx` - Remove inline SpotifyPlayer, add PersistentMusicBar outside tab content, add bottom padding
- `src/components/SpotifyPlayer.tsx` - Keep as-is (used in GameDetail pregame page)

**Component Structure:**

```typescript
// PersistentMusicBar.tsx
function PersistentMusicBar({ url }: { url: string | null | undefined }) {
  const [isExpanded, setIsExpanded] = useState(false);
  
  if (!url || !parseSpotifyUrl(url)) return null;
  
  return (
    <div className="fixed bottom-0 left-0 right-0 z-50">
      <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
        {/* Header bar - always visible */}
        <div className="flex items-center justify-between px-4 py-3 bg-card/95 backdrop-blur border-t">
          <div className="flex items-center gap-3">
            <Music className="text-green-500" />
            <span>Pregame Music</span>
          </div>
          <CollapsibleTrigger>
            <ChevronUp/ChevronDown />
          </CollapsibleTrigger>
        </div>
        
        {/* Expandable content with Spotify embed */}
        <CollapsibleContent>
          <iframe src={embedUrl} height={80} ... />
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}
```

**Index.tsx Changes:**

```typescript
return (
  <div className="min-h-screen bg-background pb-14">  {/* Add bottom padding */}
    <Navigation ... />
    <main>
      {/* Tab content - SpotifyPlayer REMOVED from dashboard */}
      {activeTab === 'dashboard' && (...)}
      {/* other tabs */}
    </main>
    
    {/* Persistent music bar - OUTSIDE tab switching */}
    {profile.themeMusicUrl && (
      <PersistentMusicBar url={profile.themeMusicUrl} />
    )}
  </div>
);
```

