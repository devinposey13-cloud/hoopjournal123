

# Audio Waveform Visualization + Auto-Send + Auto-Play AI Response

## Overview
Enhance the voice input experience with three features:
1. **Real-time waveform visualization** while recording to show audio is being captured
2. **Auto-send** the transcribed message immediately after transcription completes
3. **Auto-play** the AI's response audio once it finishes generating

## Architecture

```text
+------------------+     +--------------------+     +------------------+
|   Mic Button     | --> | AudioContext       | --> | AnalyserNode     |
|   (Recording)    |     | (Web Audio API)    |     | (Frequency Data) |
+------------------+     +--------------------+     +------------------+
         |                                                   |
         v                                                   v
+------------------+                              +------------------+
| MediaRecorder    |                              | Waveform UI      |
| (Capture Audio)  |                              | (Animated Bars)  |
+------------------+                              +------------------+
         |
         v
+------------------+     +--------------------+     +------------------+
| Stop Recording   | --> | Transcribe (STT)   | --> | Auto-Send        |
+------------------+     +--------------------+     | to sendMessage() |
                                                    +------------------+
                                                             |
                                                             v
                                                    +------------------+
                                                    | AI Response      |
                                                    | Streaming Done   |
                                                    +------------------+
                                                             |
                                                             v
                                                    +------------------+
                                                    | Auto-Play Voice  |
                                                    | (TTS)            |
                                                    +------------------+
```

## Implementation Steps

### Step 1: Enhance useVoiceInput Hook with Audio Analysis
Update `src/hooks/useVoiceInput.ts` to:
- Create an `AudioContext` and `AnalyserNode` when recording starts
- Expose `audioData` (frequency array) for waveform rendering
- Return audio level data in real-time via state updates

### Step 2: Create Waveform Visualization Component
Create `src/components/AudioWaveform.tsx`:
- Accept `audioData` array as prop
- Render animated bars that respond to audio frequency data
- Use CSS transitions for smooth animations
- Show pulsing animation when no audio data (recording but silent)

### Step 3: Update CoachChat for Auto-Send + Auto-Play
Modify `src/components/CoachChat.tsx`:
- After transcription completes, immediately call `sendMessage()` instead of just setting input
- Track when AI response finishes streaming
- Auto-play the AI response using `playVoice()` once complete
- Add state to track if response came from voice input (to trigger auto-play)

### Step 4: Update PregameTalk with Same Features
Apply identical changes to `src/components/PregameTalk.tsx`:
- Auto-send after transcription
- Auto-play AI response
- Waveform visualization while recording

## User Experience Flow

1. User taps microphone button
2. **Waveform bars appear** below/above the input, animating in real-time
3. User speaks their question
4. User taps to stop (or auto-stop after 60s)
5. "Transcribing..." indicator shows briefly
6. **Message auto-sends** immediately after transcription
7. AI response streams in
8. Once complete, **AI voice auto-plays** the response
9. User can tap to stop or let it finish

## Waveform UI Design

```text
Recording State:
+---------------------------------------+
| [Textarea: "Listening..."]            |
+---------------------------------------+
|  ▌▐▌▌▐▌▐▌▌▐▌▐▌▌▐▌▐▌▌▐▌▐▌▌▐▌▐▌▌▐▌▐▌  | <- Animated bars
+---------------------------------------+
|  [MIC (red)]  [SEND (disabled)]       |
+---------------------------------------+
```

- 20-30 vertical bars
- Height varies based on frequency data
- Smooth CSS transitions (100ms)
- Gradient color: primary color with opacity
- Bars pulse gently even when silent to show recording is active

## Files to Create/Modify

| File | Action | Description |
|------|--------|-------------|
| `src/hooks/useVoiceInput.ts` | Modify | Add AudioContext, AnalyserNode, expose audioData |
| `src/components/AudioWaveform.tsx` | Create | Animated waveform visualization component |
| `src/components/CoachChat.tsx` | Modify | Add waveform, auto-send, auto-play AI response |
| `src/components/PregameTalk.tsx` | Modify | Add waveform, auto-send, auto-play AI response |

## Technical Details

### useVoiceInput Hook Changes
```typescript
interface UseVoiceInputReturn {
  isRecording: boolean;
  isTranscribing: boolean;
  audioData: number[];  // NEW: frequency data for waveform
  startRecording: () => Promise<void>;
  stopRecording: () => Promise<string | null>;
  cancelRecording: () => void;
}
```

- Use `AudioContext.createAnalyser()` to get real-time frequency data
- Update `audioData` state at ~30fps using `requestAnimationFrame`
- Clean up analyser on stop/unmount

### AudioWaveform Component
```typescript
interface AudioWaveformProps {
  audioData: number[];
  isRecording: boolean;
  barCount?: number;  // Default: 24
}
```

- Renders a row of `<div>` bars
- Each bar height = `audioData[i] / 255 * maxHeight`
- CSS transitions for smooth animation
- Minimum height even when silent (shows it's active)

### Auto-Play Logic
```typescript
// Track if current message was voice-initiated
const isVoiceMessage = useRef(false);

// When transcription completes and message is sent
isVoiceMessage.current = true;

// When streaming completes
if (isVoiceMessage.current) {
  const lastMessageIndex = messages.length - 1;
  playVoice(lastMessage.content, lastMessageIndex);
  isVoiceMessage.current = false;
}
```

## Edge Cases & Considerations

1. **Auto-play on mobile**: Some browsers require user interaction for audio playback. The initial mic tap satisfies this requirement.

2. **Overlapping audio**: If user starts new recording while AI is speaking, stop the AI audio first.

3. **Empty transcription**: Don't auto-send if transcription fails or returns empty.

4. **User preference**: Could add a toggle for auto-play in future, but start with it always on since this is a conversational flow.

5. **Long responses**: For very long AI responses, auto-play might be overwhelming. Could consider only auto-playing responses under a certain length, but start simple.

