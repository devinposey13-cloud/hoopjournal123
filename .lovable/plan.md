
# Speech-to-Text for Coach AI Voice Memos

## Overview
Add a microphone button to Coach AI and Pregame Talk that allows users to speak their questions instead of typing. The audio will be transcribed in real-time using ElevenLabs Scribe STT, then sent to Coach AI as a regular text message.

## Architecture

```text
+------------------+     +--------------------+     +------------------+
|   Mic Button     | --> | Browser MediaRecorder | --> | Audio Blob     |
|   (CoachChat)    |     | (Record audio)       |     | (webm/mp3)     |
+------------------+     +--------------------+     +------------------+
                                    |
                                    v
                         +--------------------+     +------------------+
                         | elevenlabs-stt     | --> | ElevenLabs API   |
                         | (Edge Function)    |     | (Scribe STT)     |
                         +--------------------+     +------------------+
                                    |
                                    v
                         +--------------------+
                         | Transcribed text   |
                         | -> Send to chat    |
                         +--------------------+
```

## Implementation Steps

### Step 1: Create STT Edge Function
Create `supabase/functions/elevenlabs-stt/index.ts` that:
- Accepts audio file via FormData
- Calls ElevenLabs Scribe API (`scribe_v2` model)
- Returns transcribed text
- Uses existing `ELEVENLABS_API_KEY` secret

### Step 2: Create Voice Input Hook
Create `src/hooks/useVoiceInput.ts` to encapsulate:
- MediaRecorder setup and audio capture
- Recording state management (idle, recording, transcribing)
- Microphone permission handling
- Audio blob to FormData conversion
- Error handling with user-friendly messages

### Step 3: Update CoachChat Component
Add voice input to `src/components/CoachChat.tsx`:
- Add microphone button next to the send button
- Show recording indicator (pulsing red dot)
- Display "Transcribing..." state while processing
- Auto-populate input field with transcription OR auto-send
- Handle microphone permission requests gracefully

### Step 4: Update PregameTalk Component
Apply same voice input to `src/components/PregameTalk.tsx`:
- Matching microphone button UI
- Same hook integration

## User Experience

1. User taps/clicks the microphone button
2. First-time users see permission request for microphone access
3. Button changes to recording state (pulsing red indicator)
4. User speaks their question
5. User taps again to stop recording (or auto-stop after silence)
6. "Transcribing..." indicator shows while processing
7. Transcribed text appears in input field
8. User can edit if needed, then send OR auto-send immediately
9. Coach AI responds normally

## Edge Function: elevenlabs-stt

```typescript
// Key implementation:
// - POST with FormData containing audio file
// - Uses scribe_v2 model for batch transcription
// - Returns { text: string, words: Word[] }
// - Error handling for failed transcriptions
```

### API Request Format
```typescript
const formData = new FormData();
formData.append("file", audioFile);
formData.append("model_id", "scribe_v2");
formData.append("language_code", "eng");
```

## Voice Input Hook: useVoiceInput

```typescript
interface UseVoiceInputReturn {
  isRecording: boolean;
  isTranscribing: boolean;
  startRecording: () => Promise<void>;
  stopRecording: () => Promise<string | null>; // Returns transcription
  cancelRecording: () => void;
  permissionStatus: 'granted' | 'denied' | 'prompt';
}
```

## UI Updates

### Microphone Button States
| State | Icon | Color | Animation |
|-------|------|-------|-----------|
| Idle | Mic | Default | None |
| Recording | MicOff | Red | Pulsing |
| Transcribing | Loader | Default | Spinning |
| Error | Mic | Red | None |

### Input Area Layout
```text
+---------------------------------------+--------+--------+
|  [Text input / "Transcribing..."]    | [Mic]  | [Send] |
+---------------------------------------+--------+--------+
```

## Files to Create/Modify

| File | Action | Description |
|------|--------|-------------|
| `supabase/functions/elevenlabs-stt/index.ts` | Create | Batch STT edge function |
| `src/hooks/useVoiceInput.ts` | Create | Voice recording and transcription hook |
| `src/components/CoachChat.tsx` | Modify | Add mic button and voice input |
| `src/components/PregameTalk.tsx` | Modify | Add mic button and voice input |
| `supabase/config.toml` | Modify | Add function config |

## Technical Details

### Audio Recording
- Use MediaRecorder API with `audio/webm` format (best browser support)
- Max recording duration: 60 seconds (to prevent huge files)
- Auto-stop on silence detection (optional enhancement)
- Fallback to `audio/mp4` for Safari compatibility

### Error Handling
- Microphone permission denied → Clear message with instructions
- Recording fails → Toast with retry option
- Transcription fails → Toast with error, keep recorded audio for retry
- Empty transcription → Toast suggesting to speak louder/clearer

## Dependencies
- Uses existing `ELEVENLABS_API_KEY` secret (already configured)
- No new npm packages required (uses native MediaRecorder API)
- Works on modern browsers (Chrome, Firefox, Safari, Edge)

## Mobile Considerations
- Touch-friendly button size (at least 44x44px)
- Clear visual feedback for recording state
- Haptic feedback on iOS/Android if supported
- Handle audio focus and interruptions gracefully
