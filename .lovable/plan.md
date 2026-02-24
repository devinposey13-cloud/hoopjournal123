

# Add Web Speech API Fallback for Voice Input

## Overview
Add the browser's built-in Web Speech API as an automatic fallback when the ElevenLabs STT service is unavailable (quota exceeded, API errors, network issues). This ensures voice input keeps working for users even during ElevenLabs outages -- at no additional cost.

## How It Works

1. User taps the microphone and speaks as usual
2. Recording stops and audio is sent to ElevenLabs STT (primary)
3. If ElevenLabs fails (401, 429, 500, network error), the system automatically retries using the browser's Web Speech API
4. User sees a brief toast: "Using backup transcription..." so they know what happened
5. The transcribed text is returned exactly the same way -- no UI changes needed

## Technical Details

### File Changes

**`src/hooks/useVoiceInput.ts`** -- Main changes:
- Add a new helper function `transcribeWithWebSpeechAPI()` that uses `window.SpeechRecognition` (or `webkitSpeechRecognition` for Safari/iOS)
- Modify `stopRecording()` to wrap the ElevenLabs fetch call in a try/catch
- On ElevenLabs failure, call the Web Speech fallback automatically
- Since Web Speech API works in real-time (not from a recorded blob), the fallback will re-record a short prompt asking the user to repeat if needed -- OR we use a hybrid approach:
  - During recording, we silently run `SpeechRecognition` in parallel to capture a fallback transcript
  - If ElevenLabs fails, we use the already-captured Web Speech transcript immediately

### Recommended Approach: Parallel Capture (Best UX)

During `startRecording()`:
- Start the MediaRecorder (for ElevenLabs) as before
- Simultaneously start a `SpeechRecognition` instance in the background
- Store interim/final results in a ref (`webSpeechResultRef`)

During `stopRecording()`:
- Stop both MediaRecorder and SpeechRecognition
- Try ElevenLabs STT first
- If it fails, return the Web Speech result from the ref
- Show a toast: "Used backup transcription" so user knows

### New helper: `useWebSpeechFallback.ts`
A small hook/utility that encapsulates:
- Checking `window.SpeechRecognition || window.webkitSpeechRecognition` availability
- Starting/stopping recognition
- Collecting final transcript results
- Handling errors gracefully (not all browsers support it)

### Type declaration update: `src/types/web-speech.d.ts`
- Add TypeScript declarations for `SpeechRecognition` and `webkitSpeechRecognition` on the window object

### Browser Compatibility
- Chrome, Edge, Safari (including iOS Safari) all support Web Speech API
- Firefox has limited support -- for Firefox users, the existing ElevenLabs-only path remains (with a clear error message if it fails)

### No changes needed to:
- Edge functions
- UI components (CoachChat, PregameTalk, PostGameTalk, AIStatsCapture)
- AudioWaveform component
- The `useVoiceInput` return interface stays identical

## Limitations
- Web Speech API requires an internet connection (it's not offline)
- Accuracy may be slightly lower than ElevenLabs Scribe
- Some browsers (Firefox) have limited or no support
- These are acceptable tradeoffs for a free, zero-config fallback

