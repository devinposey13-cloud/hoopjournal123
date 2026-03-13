

## Create Coach AI Avatar from Your Photo

### What We Will Do

1. **Generate the avatar** using the existing `generate-avatar` backend function with your uploaded photo. This will create a stylized NBA 2K-style illustrated portrait from your face.

2. **Save the generated image** as a static asset in `public/coach-avatar.png` so it loads reliably across the app.

3. **Update the Coach AI circle** in `EmptyDashboardWelcome.tsx` (line 277-284) to display the generated avatar image instead of the current 🏀 basketball emoji. The circle will use an `<img>` tag with the same sizing and styling.

### Files Changed
- `public/coach-avatar.png` — new static asset (generated from your photo)
- `src/components/EmptyDashboardWelcome.tsx` — replace the 🏀 emoji with the coach avatar image in the Coach AI section

### Technical Notes
- The avatar will be generated once and stored as a static file, not regenerated per user
- The existing ring animation (glowing when speaking) will be preserved around the new avatar image
- The image will be rendered as a rounded circle matching the current 80px (w-20 h-20) size

