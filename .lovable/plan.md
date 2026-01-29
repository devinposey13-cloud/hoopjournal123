
# ElevenLabs Voice Integration for Coach AI

## Overview
Add a text-to-speech feature to Coach AI that allows users to listen to coaching advice with a motivational sports voice. Each AI response will include a speaker button that converts the text to speech using ElevenLabs.

## Architecture

```text
+------------------+     +--------------------+     +------------------+
|   CoachChat.tsx  | --> | elevenlabs-tts     | --> | ElevenLabs API   |
|   PregameTalk.tsx|     | (Edge Function)    |     |                  |
+------------------+     +--------------------+     +------------------+
        |                         |
        |  1. Click speaker icon  |
        |  2. Send text to edge   |
        |  3. Return audio blob   |
        |  4. Play in browser     |
        v                         v
+------------------+     +--------------------+
| Audio playback   |     | ELEVENLABS_API_KEY |
| via HTML5 Audio  |     | (Secret)           |
+------------------+     +--------------------+
```

## Implementation Steps

### Step 1: Connect ElevenLabs
Use the ElevenLabs connector to securely store the API key. This will prompt you to set up the connection and provide your ElevenLabs API key.

### Step 2: Create TTS Edge Function
Create a new edge function `supabase/functions/elevenlabs-tts/index.ts` that:
- Accepts text and optional voice parameters
- Calls ElevenLabs TTS API with a motivational sports coach voice
- Returns audio as binary MP3 data
- Uses the "Brian" voice (nPczCjzI2devNBz1zQrb) - a confident, energetic male voice perfect for coaching

### Step 3: Update CoachChat Component
Add voice playback capability to `src/components/CoachChat.tsx`:
- Add a speaker/volume icon button next to each AI response
- Create state for tracking which message is playing and loading state
- Implement `playVoice()` function that calls the TTS edge function
- Add visual feedback (pulsing animation while playing)
- Include stop/pause functionality

### Step 4: Update PregameTalk Component
Apply the same voice feature to `src/components/PregameTalk.tsx`:
- Add speaker button to pregame coaching responses
- Share the same TTS logic pattern

### Step 5: Create Shared Voice Hook (Optional Enhancement)
Create `src/hooks/useCoachVoice.ts` to encapsulate:
- Audio playback state management
- Loading/playing/stopped states
- Reusable across both chat components

## Voice Selection
Using "Brian" voice (ID: `nPczCjzI2devNBz1zQrb`) - an energetic, confident male voice ideal for sports coaching. Voice settings optimized for motivation:
- Stability: 0.5 (expressive but consistent)
- Similarity boost: 0.75 
- Style: 0.6 (slightly stylized for energy)
- Speed: 1.0 (normal pace for clarity)

## User Experience
- Speaker icon appears next to each Coach AI response
- Click to play - icon changes to indicate playing state
- Click again to stop playback
- Visual pulsing animation during audio playback
- Loading spinner while audio is being generated
- Graceful error handling with toast notifications

---

## Technical Details

### Edge Function: `elevenlabs-tts`
```typescript
// Key implementation details:
- POST endpoint accepting { text, voiceId? }
- output_format as query param (mp3_44100_128)
- Returns binary audio/mpeg response
- Uses ELEVENLABS_API_KEY from secrets
```

### Component Updates
```typescript
// New state in CoachChat/PregameTalk:
const [playingMessageIndex, setPlayingMessageIndex] = useState<number | null>(null);
const [isLoadingAudio, setIsLoadingAudio] = useState(false);
const audioRef = useRef<HTMLAudioElement | null>(null);

// New speaker button per message:
<Button onClick={() => playVoice(message.content, index)}>
  {playingMessageIndex === index ? <VolumeX /> : <Volume2 />}
</Button>
```

### Audio Playback Flow
1. User clicks speaker icon on AI response
2. Component calls edge function with message text
3. Edge function returns audio blob
4. Create object URL and play via HTML5 Audio
5. Track playing state for visual feedback
6. Cleanup object URL on completion

## Files to Create/Modify

| File | Action | Description |
|------|--------|-------------|
| `supabase/functions/elevenlabs-tts/index.ts` | Create | New edge function for TTS |
| `src/components/CoachChat.tsx` | Modify | Add voice playback UI and logic |
| `src/components/PregameTalk.tsx` | Modify | Add voice playback UI and logic |
| `supabase/config.toml` | Modify | Add function config with verify_jwt=false |

## Dependencies
- ElevenLabs API key (via connector)
- No new npm packages required (uses native fetch and Audio API)
