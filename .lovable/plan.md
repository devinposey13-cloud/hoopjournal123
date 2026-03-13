

## Change Male Coach Voice to African American Male

### What We Will Do

Update the male voice ID in the ElevenLabs TTS edge function from "Brian" (nPczCjzI2devNBz1zQrb) to a voice with an African American male sound. Based on the ElevenLabs voice library, a strong candidate is:

- **Marcus** (`IbsAkxpPgsmCNfObGf6G`) — deep, warm African American male voice, great for coaching/motivation
- Alternative: **Hakeem** (`nJvj5shg2xu1GKGxqfkE`) — African American narrator voice

Since ElevenLabs' pre-built voice IDs can change, I recommend we use one of these. The change is a single line in the edge function.

### Files Changed
- `supabase/functions/elevenlabs-tts/index.ts` — update `MALE_VOICE_ID` constant to the new voice ID

### Notes
- This is a one-line change in the edge function
- No client-side changes needed — the voice selection logic already works correctly
- The female voice remains unchanged
- You can preview voices at [elevenlabs.io/voice-library](https://elevenlabs.io/voice-library) to confirm your preference before we proceed

