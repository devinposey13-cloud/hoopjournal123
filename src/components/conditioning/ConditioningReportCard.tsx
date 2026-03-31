import { useRef, useState, useCallback } from 'react';
import html2canvas from 'html2canvas';
import appStoreBadge from '@/assets/app-store-badge.svg';
import { Share2, Copy, Check, HelpCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { ConditioningCardCanvas, type ConditioningCardData } from './ConditioningCardCanvas';

interface ConditioningReportCardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  data: ConditioningCardData;
}

const CANVAS_W = 1080;
const CANVAS_H = 1920;
const FONT = "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";

const isIOS = () => /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

export function ConditioningReportCard({ open, onOpenChange, data }: ConditioningReportCardProps) {
  const previewRef = useRef<HTMLDivElement>(null);
  const exportRef = useRef<HTMLDivElement>(null);
  const [exporting, setExporting] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showIOSHelp, setShowIOSHelp] = useState(false);

  const fileName = `hoop-journal-conditioning-card.png`;

  const captureCard = useCallback(async (): Promise<Blob | null> => {
    if (!exportRef.current) return null;

    try {
      if (document.fonts?.ready) await document.fonts.ready;

      const container = exportRef.current;
      const images = Array.from(container.querySelectorAll('img'));
      await Promise.all(
        images.map((img) => {
          if (img.complete) return Promise.resolve();
          return new Promise<void>((resolve) => {
            img.addEventListener('load', () => resolve(), { once: true });
            img.addEventListener('error', () => resolve(), { once: true });
          });
        })
      );

      // Query text elements for hide/redraw
      const allTextEls = Array.from(container.querySelectorAll('[data-canvas-name], [data-canvas-team], [data-canvas-archetype], [data-canvas-status], [data-canvas-label], [data-canvas-grade], [data-canvas-time], [data-canvas-distance], [data-canvas-trust], [data-canvas-tracking], [data-canvas-date], [data-canvas-footer-brand], [data-canvas-footer-scan], [data-canvas-footer-claim], [data-canvas-eventtag]')) as HTMLElement[];
      const badgeEls = Array.from(container.querySelectorAll('[data-canvas-badge]')) as HTMLElement[];
      const avatarEl = container.querySelector('[data-canvas-avatar]') as HTMLElement | null;
      const appStoreEl = container.querySelector('[data-canvas-appstore]') as HTMLElement | null;

      const allHideable = [...allTextEls, ...badgeEls, appStoreEl].filter(Boolean);

      const containerRect = container.getBoundingClientRect();
      const scaleX = CANVAS_W / containerRect.width;
      const scaleY = CANVAS_H / containerRect.height;

      function getPos(el: HTMLElement) {
        const r = el.getBoundingClientRect();
        return {
          cx: (r.left - containerRect.left + r.width / 2) * scaleX,
          cy: (r.top - containerRect.top + r.height / 2) * scaleY,
          x: (r.left - containerRect.left) * scaleX,
          y: (r.top - containerRect.top) * scaleY,
          w: r.width * scaleX,
          h: r.height * scaleY,
        };
      }

      // Read positions before hiding
      const positions = new Map<string, ReturnType<typeof getPos>>();
      allTextEls.forEach(el => {
        const attr = el.getAttributeNames().find(a => a.startsWith('data-canvas-'));
        if (attr) positions.set(attr.replace('data-canvas-', ''), getPos(el));
      });
      const badgePositions = badgeEls.map(el => ({ pos: getPos(el), text: el.textContent || '' }));
      const avatarPos = avatarEl ? getPos(avatarEl) : null;
      const appStorePos = appStoreEl ? getPos(appStoreEl) : null;
      const avatarImg = avatarEl?.querySelector('img') as HTMLImageElement | null;

      // Hide for clean capture
      allHideable.forEach(el => el.style.visibility = 'hidden');
      if (avatarEl) avatarEl.style.visibility = 'hidden';

      const rawCanvas = await html2canvas(container, {
        scale: 2,
        backgroundColor: '#070b16',
        useCORS: true,
        width: CANVAS_W,
        height: CANVAS_H,
        windowWidth: CANVAS_W,
        windowHeight: CANVAS_H,
        logging: false,
      });

      allHideable.forEach(el => el.style.visibility = '');
      if (avatarEl) avatarEl.style.visibility = '';

      const out = document.createElement('canvas');
      out.width = CANVAS_W;
      out.height = CANVAS_H;
      const ctx = out.getContext('2d');
      if (!ctx) return null;

      ctx.fillStyle = '#070b16';
      ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
      ctx.drawImage(rawCanvas, 0, 0, rawCanvas.width, rawCanvas.height, 0, 0, CANVAS_W, CANVAS_H);

      const gradeColor = data.conditioningGrade.color;
      const trustColor = { high_trust: '#4ade80', solid: '#facc15', review: '#fb923c', low_trust: '#f87171' }[data.coachTrust.band] || '#9CA3AF';

      // Redraw avatar
      if (avatarEl && avatarPos) {
        const p = avatarPos;
        const radius = p.w / 2;
        const borderWidth = 8 * scaleX;

        ctx.save();
        ctx.beginPath();
        ctx.arc(p.cx, p.cy, radius, 0, Math.PI * 2);
        ctx.strokeStyle = gradeColor;
        ctx.lineWidth = borderWidth;
        ctx.shadowColor = `${gradeColor}40`;
        ctx.shadowBlur = 80;
        ctx.stroke();
        ctx.restore();

        if (avatarImg?.complete && avatarImg.naturalWidth > 0) {
          ctx.save();
          ctx.beginPath();
          ctx.arc(p.cx, p.cy, radius - borderWidth / 2, 0, Math.PI * 2);
          ctx.clip();
          const diam = (radius - borderWidth / 2) * 2;
          const scale = Math.max(diam / avatarImg.naturalWidth, diam / avatarImg.naturalHeight);
          const sw = avatarImg.naturalWidth * scale;
          const sh = avatarImg.naturalHeight * scale;
          ctx.drawImage(avatarImg, p.cx - sw / 2, p.cy - sh / 2, sw, sh);
          ctx.restore();
        }
      }

      // Helper for centered text
      const drawText = (key: string, text: string, font: string, fillStyle: string, opts?: { shadow?: string; shadowBlur?: number }) => {
        const p = positions.get(key);
        if (!p) return;
        ctx.save();
        ctx.font = font;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = fillStyle;
        if (opts?.shadow) { ctx.shadowColor = opts.shadow; ctx.shadowBlur = opts.shadowBlur || 40; }
        ctx.fillText(text, p.cx, p.cy);
        ctx.restore();
      };

      // Event tag
      const eventTagPos = positions.get('eventtag');
      if (eventTagPos) {
        ctx.save();
        ctx.beginPath();
        ctx.roundRect(eventTagPos.x, eventTagPos.y, eventTagPos.w, eventTagPos.h, 12);
        const grad = ctx.createLinearGradient(eventTagPos.x, eventTagPos.y, eventTagPos.x + eventTagPos.w, eventTagPos.y + eventTagPos.h);
        grad.addColorStop(0, 'rgba(34,197,94,0.9)');
        grad.addColorStop(1, 'rgba(22,163,74,0.9)');
        ctx.fillStyle = grad;
        ctx.fill();
        ctx.restore();
        ctx.save();
        ctx.font = `900 16px ${FONT}`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = '#fff';
        ctx.fillText('🏃 CONDITIONING CARD', eventTagPos.cx, eventTagPos.cy);
        ctx.restore();
      }

      drawText('name', data.playerName.toUpperCase(), `900 72px ${FONT}`, '#f8fafc');

      // Team line
      const teamPos = positions.get('team');
      if (teamPos) {
        const teamText = `${data.playerTeam.toUpperCase()}  |  #${data.jerseyNumber}${data.position ? ` • ${data.position}` : ''}`;
        drawText('team', teamText, `700 28px ${FONT}`, '#64748b');
      }

      // Archetype
      const archetypeData = getConditioningArchetypeHelper(String(data.conditioningGrade.grade));
      drawText('archetype', archetypeData.title, `800 32px ${FONT}`, gradeColor, { shadow: `${gradeColor}40`, shadowBlur: 30 });
      drawText('status', archetypeData.subtitle, `700 19px ${FONT}`, '#94a3b8');

      // Grade label
      drawText('label', 'CONDITIONING GRADE', `800 19px ${FONT}`, '#64748b');

      // Grade letter
      const gradePos = positions.get('grade');
      if (gradePos) {
        ctx.save();
        ctx.font = `900 220px ${FONT}`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = gradeColor;
        const glowMatch = data.conditioningGrade.glow.match(/rgba?\(([^)]+)\)/);
        if (glowMatch) { ctx.shadowColor = `rgba(${glowMatch[1]})`; ctx.shadowBlur = 60; }
        ctx.fillText(String(data.conditioningGrade.grade), gradePos.cx, gradePos.cy);
        ctx.restore();
      }

      // Time
      drawText('time', data.conditioningGrade.mileTimeFormatted || '', `900 56px ${FONT}`, '#f8fafc');
      // Distance
      const miles = data.distanceMeters / 1609.344;
      drawText('distance', `${miles.toFixed(2)} MI`, `700 28px ${FONT}`, '#94a3b8');

      // Coach Trust pill
      const trustPos = positions.get('trust');
      if (trustPos) {
        ctx.save();
        ctx.beginPath();
        ctx.roundRect(trustPos.x, trustPos.y, trustPos.w, trustPos.h, 50);
        ctx.fillStyle = `${trustColor}10`;
        ctx.fill();
        ctx.strokeStyle = `${trustColor}30`;
        ctx.lineWidth = 1.5;
        ctx.stroke();
        ctx.restore();

        ctx.save();
        ctx.font = `900 24px ${FONT}`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = trustColor;
        ctx.fillText(`Coach Trust: ${data.coachTrust.score}  •  ${data.coachTrust.bandLabel}`, trustPos.cx, trustPos.cy);
        ctx.restore();
      }

      drawText('tracking', 'BACKGROUND TRACKED', `600 15px ${FONT}`, '#475569');
      drawText('date', data.sessionDate ? new Date(data.sessionDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).toUpperCase() : '', `600 18px ${FONT}`, '#475569');

      // Badges
      badgePositions.forEach(({ pos, text }) => {
        ctx.save();
        ctx.beginPath();
        ctx.roundRect(pos.x, pos.y, pos.w, pos.h, 50);
        ctx.fillStyle = `${gradeColor}15`;
        ctx.fill();
        ctx.strokeStyle = `${gradeColor}30`;
        ctx.lineWidth = 1.5;
        ctx.stroke();
        ctx.restore();

        ctx.save();
        ctx.font = `700 21px ${FONT}`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = gradeColor;
        ctx.fillText(text, pos.cx, pos.cy);
        ctx.restore();
      });

      // Footer
      const fbPos = positions.get('footer-brand');
      if (fbPos) {
        ctx.save();
        ctx.font = `800 26px ${FONT}`;
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';
        ctx.fillStyle = '#f8fafc';
        ctx.fillText('Hoop Journal', fbPos.x, fbPos.y);
        ctx.font = `500 15px ${FONT}`;
        ctx.fillStyle = '#475569';
        ctx.fillText('CONDITIONING REPORT', fbPos.x, fbPos.y + 30);
        ctx.restore();
      }

      const fsPos = positions.get('footer-scan');
      if (fsPos) drawText('footer-scan', 'SCAN TO CLAIM REPORT', `700 10px ${FONT}`, '#475569');

      const fcPos = positions.get('footer-claim');
      if (fcPos) drawText('footer-claim', 'CLAIM WITHIN 72 HOURS', `600 10px ${FONT}`, '#475569');

      return new Promise((resolve) => out.toBlob((blob) => resolve(blob ?? null), 'image/png'));
    } catch (err) {
      console.error('[ConditioningCard] Export failed:', err);
      return null;
    }
  }, [data]);

  const handleSaveShare = async () => {
    setExporting(true);
    try {
      const blob = await captureCard();
      if (!blob) throw new Error('Failed to generate image');
      const file = new File([blob], fileName, { type: 'image/png' });

      if (navigator.share && navigator.canShare?.({ files: [file] })) {
        toast('🏃 Conditioning card ready!', {
          description: isIOS()
            ? 'Tap "Save Image" in the share menu to save to Photos.'
            : 'Choose where to share or save your card.',
          duration: 5000,
        });
        await navigator.share({
          title: 'Conditioning Report',
          text: `Check out my conditioning run! Grade: ${data.conditioningGrade.grade} 🏃`,
          files: [file],
        });
        return;
      }

      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      a.click();
      URL.revokeObjectURL(url);

      if (isIOS()) {
        toast('📱 Card ready to save', { description: 'Tap the Share icon, then choose "Save to Photos".', duration: 6000 });
      } else {
        toast.success('Conditioning card downloaded!');
      }
    } catch (err: any) {
      if (err?.name !== 'AbortError') toast.error('Failed to generate conditioning card');
    } finally {
      setExporting(false);
    }
  };

  const handleCopy = async () => {
    setExporting(true);
    try {
      const blob = await captureCard();
      if (!blob) throw new Error('Failed');
      await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
      setCopied(true);
      toast.success('Copied to clipboard!');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Failed to copy image');
    } finally {
      setExporting(false);
    }
  };

  const previewMaxW = 340;
  const previewScale = previewMaxW / CANVAS_W;

  return (
    <>
      {open && (
        <div
          aria-hidden="true"
          style={{
            position: 'fixed', left: -2000, top: 0,
            width: CANVAS_W, height: CANVAS_H,
            overflow: 'hidden', pointerEvents: 'none', zIndex: -1,
          }}
        >
          <ConditioningCardCanvas ref={exportRef} {...data} />
        </div>
      )}

      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-[440px] p-0 bg-card border-border overflow-hidden max-h-[95vh] flex flex-col">
          <DialogTitle className="sr-only">Conditioning Report Card</DialogTitle>

          <div className="px-4 pt-4 pb-2 shrink-0">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest text-center mb-2">Share Conditioning Card</p>
          </div>

          <div className="flex-1 min-h-0 overflow-y-auto px-4">
            <div
              className="w-full overflow-hidden rounded-lg border border-border/30 mx-auto mb-4"
              style={{ maxWidth: previewMaxW, aspectRatio: `${CANVAS_W}/${CANVAS_H}` }}
            >
              <div style={{ width: '100%', height: '100%', position: 'relative' }}>
                <div style={{
                  transformOrigin: 'top left',
                  transform: `scale(${previewScale})`,
                  position: 'absolute', top: 0, left: 0,
                }}>
                  <ConditioningCardCanvas ref={previewRef} {...data} />
                </div>
              </div>
            </div>
          </div>

          <div className="shrink-0 px-4 pb-4 pt-3 border-t border-border/30 bg-card relative">
            <div className="absolute -top-6 left-0 right-0 h-6 bg-gradient-to-t from-card to-transparent pointer-events-none" />

            {showIOSHelp && (
              <div className="mb-3 p-3 rounded-lg bg-muted/50 border border-border/40 text-xs text-muted-foreground space-y-1.5">
                <p className="font-semibold text-foreground text-sm">How to save on iPhone</p>
                <p>1. Tap <strong>Save / Share Card</strong> below</p>
                <p>2. In the share menu, tap <strong>Save Image</strong></p>
                <p>3. Your card will appear in Photos 📸</p>
                <button onClick={() => setShowIOSHelp(false)} className="text-primary text-xs mt-1">Got it</button>
              </div>
            )}

            <div className="flex gap-2">
              <Button onClick={handleSaveShare} disabled={exporting} className="flex-1 gap-2">
                <Share2 className="w-4 h-4" />
                {exporting ? 'Generating...' : 'Save / Share Card'}
              </Button>
              <Button onClick={handleCopy} disabled={exporting} variant="outline" size="icon">
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              </Button>
              {isIOS() && (
                <Button onClick={() => setShowIOSHelp(v => !v)} variant="ghost" size="icon" className="text-muted-foreground">
                  <HelpCircle className="w-4 h-4" />
                </Button>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

// Duplicated helper to avoid circular dependency
function getConditioningArchetypeHelper(grade: string) {
  switch (grade) {
    case 'A+': return { title: 'RELENTLESS RUNNER', subtitle: 'ELITE CONDITIONING LEVEL' };
    case 'A': return { title: 'GAME READY', subtitle: 'ELITE CONDITIONING LEVEL' };
    case 'A-': return { title: 'WELL CONDITIONED', subtitle: 'GAME READY CONDITIONING' };
    case 'B+': return { title: 'STRONG EFFORT', subtitle: 'SOLID CONDITIONING LEVEL' };
    case 'B': return { title: 'SOLID RUNNER', subtitle: 'SOLID CONDITIONING LEVEL' };
    case 'B-': return { title: 'GETTING THERE', subtitle: 'BUILDING CONDITIONING' };
    case 'C+': return { title: 'WORK IN PROGRESS', subtitle: 'NEEDS IMPROVEMENT' };
    case 'C': return { title: 'KEEP GRINDING', subtitle: 'NEEDS IMPROVEMENT' };
    default: return { title: 'KEEP PUSHING', subtitle: 'BUILDING CONDITIONING' };
  }
}
