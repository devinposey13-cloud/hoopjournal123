

## Analysis: Recap Sharing vs PDF Export

**Short answer:** The recap sharing feature does NOT send a PDF. It sends a styled HTML email with stats and text. These are entirely separate features. No paywall bypass occurs through recap sharing.

**However, there is a real gap:** The PDF export button (`GameDetail.tsx` line 922, `GameCard.tsx` line 119) has **zero plan gating**. The plan catalog marks `exportPdf` as Elite-only, but `canUseFeature` is never checked before allowing the export. Any user on any plan can currently download PDFs.

---

### Recommended Fix

**Gate the PDF export behind the Elite plan:**

1. **`src/pages/GameDetail.tsx`** — Import `usePlan` and `canUseFeature`. Before calling `exportGameBoxScorePdf`, check `canUseFeature(currentPlan, 'exportPdf')`. If not allowed, show a paywall/upgrade prompt instead. Conditionally hide or disable the export button for non-Elite users.

2. **`src/components/GameCard.tsx`** — Same gating: import plan hooks, check access, and either hide the PDF button or show an upgrade toast when clicked by a non-Elite user.

3. **No changes needed** to `PostGameRecap.tsx` or `send-parent-recap` — the email feature is HTML-only and doesn't touch PDF logic.

### Scope
- **2 files modified**: `GameDetail.tsx`, `GameCard.tsx`
- No backend changes needed

