
# AI Avatar Generator Integration

## Overview

Add an AI-powered avatar generation feature that transforms a user's uploaded profile photo into a stylized basketball avatar. Users will have the option to either keep their original photo or generate an AI-stylized version.

## How It Works

1. User uploads a profile photo (existing functionality)
2. After upload completes, a new "Generate Avatar" button appears
3. User clicks to generate an AI-stylized basketball avatar
4. AI transforms their photo into a stylized cartoon/illustrated avatar
5. User can keep the AI avatar or revert to original photo

## Technical Approach

### AI Model

Using **Lovable AI** with `google/gemini-2.5-flash-image` model - this is already configured in your project (via `LOVABLE_API_KEY`) and requires no additional API keys. While you mentioned DALL-E, Lovable AI provides equivalent image generation capabilities and is the recommended approach since it's already integrated.

### Architecture

```text
User uploads photo → Stored in Supabase Storage
                            ↓
User clicks "Generate Avatar" → Edge Function
                            ↓
                    Lovable AI Gateway
                    (gemini-2.5-flash-image)
                            ↓
              Generated avatar base64 returned
                            ↓
            Upload to Supabase Storage → Update profile
```

### New Components and Files

| File | Purpose |
|------|---------|
| `supabase/functions/generate-avatar/index.ts` | Edge function to call Lovable AI for image generation |
| `src/components/AvatarGenerator.tsx` | UI component with generate button and loading state |
| `src/components/SettingsPanel.tsx` | Updated to include the avatar generator after photo upload |

### Edge Function Design

The function will:
1. Accept the uploaded photo URL
2. Call Lovable AI with a prompt like: "Transform this photo into a stylized basketball player avatar in a cartoon/illustrated style. Keep the person's likeness but make it look like a sports trading card illustration."
3. Return the generated image as base64
4. The frontend uploads this to storage and updates the profile

### UI/UX Flow

1. **Avatar Section Updates**:
   - Current: Camera icon overlay on hover
   - New: After upload, show a small "Generate AI Avatar" button below the photo
   - Show loading spinner with "Creating your avatar..." during generation
   - After generation, show both original and AI version with toggle option

2. **Visual States**:
   - `idle`: Shows current avatar with upload button
   - `uploading`: Shows spinner during photo upload
   - `generating`: Shows animated spinner with "AI is creating your avatar..."
   - `preview`: Shows generated avatar with "Use This" and "Keep Original" buttons

### Database Changes

None required - we'll store the AI-generated avatar URL in the existing `avatar_url` column. Optionally, we could add an `original_avatar_url` column to preserve the original, but this can be a future enhancement.

### Error Handling

- If AI generation fails, show toast error and keep original photo
- Implement retry button for failed generations
- Add timeout handling (30 second max for generation)

## Implementation Steps

1. Create the `generate-avatar` edge function
2. Create the `AvatarGenerator` component with generate button and states
3. Update `SettingsPanel` to integrate the avatar generator
4. Update `useCloudData` to handle the generated avatar upload
5. Add loading animations and user feedback

## Considerations

- **Processing Time**: Image generation takes 5-15 seconds - need good loading feedback
- **Cost**: Each generation uses Lovable AI credits - consider limiting to avoid abuse
- **Quality**: The prompt can be refined based on results
- **Storage**: Generated avatars use same storage bucket as regular avatars
