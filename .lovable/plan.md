

## Restore Basketball GIF Preload Screen

The pre-hydration shell in `index.html` (lines 37-43) currently shows "HOOP JOURNAL" text with a CSS spinner. This needs to be replaced with the bouncing basketball animation that was there previously.

### Change

**`index.html`** — Replace the text+spinner content inside `#prehydration-shell` with a centered basketball GIF/animation. Since this is a pre-React shell (no JS frameworks available), we'll use an `<img>` tag pointing to a basketball bounce GIF hosted in `/public`, keeping the dark background and the auth-callback suppression script.

The shell content (lines 38-42) changes from:
```html
<div style="text-align:center;">
  <div style="font-family:Teko,sans-serif;...">HOOP JOURNAL</div>
  <div style="...border-radius:50%;animation:hjspin..."></div>
</div>
<style>@keyframes hjspin{to{transform:rotate(360deg)}}</style>
```

To:
```html
<img src="/basketball-loading.gif" alt="" style="width:80px;height:80px;" />
```

We'll need to either:
- Use the same Lottie basketball animation URL already used throughout the app (but Lottie requires JS, which won't work in a pre-React shell)
- Add a lightweight basketball bounce GIF to `/public`

I'll create a simple CSS-only bouncing basketball animation as a fallback (no external dependency, instant render), using an emoji or SVG basketball with a CSS bounce keyframe — matching the `animate-[bounce_3s_ease-in-out_infinite]` style already used in `JournalHeader.tsx`.

### Files
- `index.html` — replace shell content with bouncing basketball CSS animation

