
# AI-Powered Game Stats Capture

## Overview
Add an AI-powered alternative to manual game stat entry. Users will be able to describe their game performance in natural language (via voice or text), and the AI will extract and populate all the statistics automatically. This creates a much faster, more conversational way to log games.

## User Experience

### How It Works
1. User opens "Add Game" dialog
2. They see a new tab/toggle: "Manual Entry" vs "AI Capture"
3. In AI Capture mode, they can:
   - **Type** a description: "I scored 18 points on 7-for-12 shooting with 5 rebounds and 3 assists. We beat Central High 62-55."
   - **Speak** the same description using voice input (already have `useVoiceInput` hook)
4. AI extracts stats and shows a preview with all fields populated
5. User can review, make any corrections, and save

### Example Inputs
- "Had 12 points, 8 rebounds, 2 blocks against Lincoln. We won."
- "Shot 3-for-8 from three, 2-for-4 on twos, made both my free throws. 15 points total, 4 assists, 2 turnovers. Lost to Oak Hill 48-52."
- "Great game! 22 points, 6 assists, 5 steals. Played about 28 minutes. Beat Riverside."

## Technical Implementation

### 1. New Edge Function: `extract-game-stats`
Creates a new backend function that uses Lovable AI (Gemini) to parse natural language into structured game statistics.

```
POST /functions/v1/extract-game-stats
Body: { description: string, date?: string }
Response: {
  opponent: string,
  points: number,
  rebounds: number,
  assists: number,
  steals: number,
  blocks: number,
  turnovers: number,
  fouls: number,
  minutesPlayed: number,
  fgMade: number,
  fgAttempted: number,
  threePtMade: number,
  threePtAttempted: number,
  ftMade: number,
  ftAttempted: number,
  isWin: boolean | null,
  confidence: number,
  missingFields: string[]
}
```

The edge function will:
- Use Lovable AI with tool calling to extract structured data
- Validate all extracted values are within reasonable basketball ranges
- Calculate derived stats (e.g., total points from shooting breakdown if provided)
- Flag missing or uncertain fields for user review

### 2. New Component: `AIStatsCapture`
A new component that handles the AI-powered input flow:
- Text input area for typing game description
- Voice input button (reusing existing `useVoiceInput` hook)
- Real-time audio waveform visualization during recording
- Loading state while AI processes
- Preview of extracted stats in a card layout
- Edit capability before final save

### 3. Updated `AddGameDialog`
Modify the existing dialog to include tab navigation:
- "Manual Entry" tab (existing `GameStatsForm`)
- "AI Capture" tab (new `AIStatsCapture`)

### 4. Stats Preview Component
Shows the AI-extracted stats in a visual format:
- Highlighted fields that were successfully extracted
- Warning indicators for fields that couldn't be determined
- Inline edit capability for corrections
- "Looks good, save game" primary action

## Files to Create/Modify

### New Files
1. **`supabase/functions/extract-game-stats/index.ts`**
   - Edge function using Lovable AI with tool calling
   - Structured extraction with validation
   - Returns confidence scores

2. **`src/components/AIStatsCapture.tsx`**
   - Voice/text input interface
   - Calls edge function
   - Displays extracted stats preview
   - Handles edit and confirmation flow

### Modified Files
1. **`src/components/AddGameDialog.tsx`**
   - Add tabs for Manual Entry vs AI Capture
   - Pass through game data from either source

2. **`supabase/config.toml`**
   - Register new edge function

## Edge Function Details

The `extract-game-stats` function will use Lovable AI's tool calling feature to ensure structured output:

```typescript
// Tool definition for structured extraction
const extractionTool = {
  type: "function",
  function: {
    name: "extract_game_stats",
    description: "Extract basketball game statistics from a natural language description",
    parameters: {
      type: "object",
      properties: {
        opponent: { type: "string", description: "Name of opposing team" },
        points: { type: "number", description: "Total points scored" },
        rebounds: { type: "number" },
        assists: { type: "number" },
        // ... all stat fields
        isWin: { type: "boolean", description: "Whether the player's team won" },
      },
      required: ["opponent"]
    }
  }
};
```

## UI/UX Considerations

1. **Mobile-First Design**
   - Large tap targets for voice recording button
   - Audio waveform feedback during recording
   - Easy preview scroll and edit

2. **Smart Defaults**
   - If user doesn't mention a stat, default to 0
   - If win/loss not mentioned, ask or leave as "Unknown"
   - Use today's date by default

3. **Feedback Loop**
   - Show exactly what AI understood
   - Highlight any stats that seem unusual
   - Easy correction before save

4. **Voice UX**
   - Reuse existing ElevenLabs STT integration
   - Show transcription as it's processed
   - Allow re-record if transcription is wrong

## Rationale

This approach:
- Leverages existing infrastructure (ElevenLabs STT, Lovable AI)
- Provides faster game logging for users on-the-go
- Maintains data quality through preview/edit step
- Adds value without replacing manual entry option
