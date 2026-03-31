import { useRef, useState, useCallback, useMemo } from 'react';
import appStoreBadge from '@/assets/app-store-badge.svg';
import html2canvas from 'html2canvas';
import { Share2, Copy, Check, HelpCircle, Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';
import type { GameStats } from '@/types/basketball';
import { ReportCardCanvas, type ExportFormat } from '@/components/report-card/ReportCardCanvas';
import { SocialPreview } from '@/components/report-card/SocialPreview';
import { getGameGradeData } from '@/utils/gameGrading';

interface GameReportCardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  game: GameStats;
  playerName: string;
  playerTeam: string;
  avatarUrl?: string;
  allGames?: GameStats[];
}

const FORMATS = {
  story: { w: 1080, h: 1920 },
  post: { w: 1080, h: 1350 },
} as const;

const FONT = "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";

const isIOS = () => /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

export function GameReportCard({ open, onOpenChange, game, playerName, playerTeam, avatarUrl, allGames }: GameReportCardProps) {
  const previewRef = useRef<HTMLDivElement>(null);
  const exportRef = useRef<HTMLDivElement>(null);
  const [exporting, setExporting] = useState(false);
  const [copied, setCopied] = useState(false);
  const [platform, setPlatform] = useState<'instagram' | 'twitter' | 'imessage'>('instagram');
  const [exportFormat, setExportFormat] = useState<ExportFormat>('story');
  const [showSafeZones, setShowSafeZones] = useState(false);
  const [showIOSHelp, setShowIOSHelp] = useState(false);

  const { w: CANVAS_W, h: CANVAS_H } = FORMATS[exportFormat];

  const fileName = useMemo(() =>
    `hoop-journal-game-card-vs-${game.opponent.replace(/\s+/g, '-').toLowerCase()}.png`,
    [game.opponent]
  );

  const gradeData = useMemo(() => getGameGradeData(game), [game]);

  /**
   * Full Canvas 2D export — hides all text elements, captures backgrounds via html2canvas,
   * then redraws every text element crisp using Canvas 2D fillText.
   * This mirrors the approach used in AdminQuickMode for consistent export quality.
   */
  const captureCard = useCallback(async (): Promise<Blob | null> => {
    if (!exportRef.current) return null;

    try {
      if (document.fonts?.ready) {
        await document.fonts.ready;
      }

      const container = exportRef.current;

      // Wait for all images to load
      const images = Array.from(container.querySelectorAll('img'));
      await Promise.all(
        images.map((img) => {
          if (img.complete) return Promise.resolve();
          return new Promise<void>((resolve) => {
            const done = () => resolve();
            img.addEventListener('load', done, { once: true });
            img.addEventListener('error', done, { once: true });
          });
        })
      );

      const W = CANVAS_W;
      const H = CANVAS_H;
      const isPost = exportFormat === 'post';
      const sf = isPost ? 0.82 : 1;

      // ── Query all text elements to redraw via Canvas 2D ──
      const allTextEls = Array.from(container.querySelectorAll('[data-canvas-text]')) as HTMLElement[];
      const gradeEl = container.querySelector('[data-canvas-grade]') as HTMLElement | null;
      const avatarEl = container.querySelector('[data-canvas-avatar]') as HTMLElement | null;
      const xpEl = container.querySelector('[data-canvas-xp]') as HTMLElement | null;
      const tagEls = Array.from(container.querySelectorAll('[data-canvas-tag]')) as HTMLElement[];
      const careerHighEls = Array.from(container.querySelectorAll('[data-canvas-career-high]')) as HTMLElement[];
      const appStoreEl = container.querySelector('[data-canvas-appstore]') as HTMLElement | null;

      const allHideable = [...allTextEls, gradeEl, xpEl, ...tagEls, ...careerHighEls, appStoreEl].filter(Boolean) as HTMLElement[];

      // ── Read bounding rects BEFORE hiding ──
      const containerRect = container.getBoundingClientRect();
      const scaleX = W / containerRect.width;
      const scaleY = H / containerRect.height;

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

      // Collect all positions
      const textPositions = new Map<string, ReturnType<typeof getPos>>();
      allTextEls.forEach(el => {
        const key = el.getAttribute('data-canvas-text') || '';
        textPositions.set(key, getPos(el));
      });
      const gradePos = gradeEl ? getPos(gradeEl) : null;
      const avatarPos = avatarEl ? getPos(avatarEl) : null;
      const xpPos = xpEl ? getPos(xpEl) : null;
      const tagPositions = tagEls.map(el => ({ pos: getPos(el), text: el.textContent || '' }));
      const careerHighPositions = careerHighEls.map(el => ({ pos: getPos(el), text: el.textContent || '' }));
      const appStorePos = appStoreEl ? getPos(appStoreEl) : null;

      // Collect avatar image data
      const avatarImg = avatarEl?.querySelector('img') as HTMLImageElement | null;

      // ── Hide all text + avatar for clean html2canvas pass ──
      allHideable.forEach(el => el.style.visibility = 'hidden');
      // Also hide avatar to redraw it crisp
      if (avatarEl) avatarEl.style.visibility = 'hidden';

      const rawCanvas = await html2canvas(container, {
        scale: 2,
        backgroundColor: '#070b16',
        useCORS: true,
        width: W,
        height: H,
        windowWidth: W,
        windowHeight: H,
        logging: false,
      });

      // Restore visibility
      allHideable.forEach(el => el.style.visibility = '');
      if (avatarEl) avatarEl.style.visibility = '';

      const out = document.createElement('canvas');
      out.width = W;
      out.height = H;
      const ctx = out.getContext('2d');
      if (!ctx) return null;

      ctx.fillStyle = '#070b16';
      ctx.fillRect(0, 0, W, H);
      ctx.drawImage(rawCanvas, 0, 0, rawCanvas.width, rawCanvas.height, 0, 0, W, H);

      // ── 1. Redraw avatar as perfect circle ──
      if (avatarEl && avatarPos) {
        const p = avatarPos;
        const radius = p.w / 2;
        const borderWidth = 7 * scaleX;

        ctx.save();
        ctx.beginPath();
        ctx.arc(p.cx, p.cy, radius, 0, Math.PI * 2);
        ctx.strokeStyle = gradeData.color;
        ctx.lineWidth = borderWidth;
        ctx.shadowColor = `${gradeData.color}40`;
        ctx.shadowBlur = 100;
        ctx.stroke();
        ctx.restore();

        if (avatarImg && avatarImg.complete && avatarImg.naturalWidth > 0) {
          ctx.save();
          ctx.beginPath();
          ctx.arc(p.cx, p.cy, radius - borderWidth / 2, 0, Math.PI * 2);
          ctx.clip();
          const imgW = avatarImg.naturalWidth;
          const imgH = avatarImg.naturalHeight;
          const diam = (radius - borderWidth / 2) * 2;
          const scale = Math.max(diam / imgW, diam / imgH);
          const sw = imgW * scale;
          const sh = imgH * scale;
          ctx.drawImage(avatarImg, p.cx - sw / 2, p.cy - sh / 2, sw, sh);
          ctx.restore();
        } else {
          ctx.save();
          ctx.beginPath();
          ctx.arc(p.cx, p.cy, radius - borderWidth / 2, 0, Math.PI * 2);
          ctx.fillStyle = '#1e293b';
          ctx.fill();
          ctx.restore();
        }
      }

      // ── 2. Redraw grade label ──
      const gradeLabelPos = textPositions.get('grade-label');
      if (gradeLabelPos) {
        ctx.save();
        ctx.font = `800 ${Math.round(18 * sf)}px ${FONT}`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = '#475569';
        ctx.letterSpacing = `${18 * sf * 0.4}px`;
        ctx.fillText('HOOP JOURNAL GAME GRADE', gradeLabelPos.cx, gradeLabelPos.cy);
        ctx.restore();
      }

      // ── 3. Redraw grade letter ──
      if (gradeEl && gradePos) {
        const fontSize = Math.round(236 * sf);
        ctx.save();
        ctx.font = `900 ${fontSize}px ${FONT}`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = gradeData.color;

        const glowMatch = gradeData.glow.match(/rgba?\(([^)]+)\)/);
        if (glowMatch) {
          ctx.shadowColor = `rgba(${glowMatch[1]})`;
          ctx.shadowBlur = 60;
        }
        ctx.fillText(gradeData.grade, gradePos.cx, gradePos.cy);
        ctx.restore();
      }

      // ── 4. Redraw player name ──
      const namePos = textPositions.get('player-name');
      if (namePos) {
        ctx.save();
        ctx.font = `900 ${Math.round(55 * sf)}px ${FONT}`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = '#f8fafc';
        ctx.fillText(playerName.toUpperCase(), namePos.cx, namePos.cy);
        ctx.restore();
      }

      // ── 5. Redraw player team ──
      const teamPos = textPositions.get('player-team');
      if (teamPos) {
        ctx.save();
        ctx.font = `700 ${Math.round(21 * sf)}px ${FONT}`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = '#64748b';
        ctx.fillText(playerTeam.toUpperCase(), teamPos.cx, teamPos.cy);
        ctx.restore();
      }

      // ── 6. Redraw opponent ──
      const oppPos = textPositions.get('opponent');
      if (oppPos) {
        ctx.save();
        ctx.font = `900 ${Math.round(42 * sf)}px ${FONT}`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = '#cbd5e1';
        ctx.fillText(`VS ${game.opponent.toUpperCase()}`, oppPos.cx, oppPos.cy);
        ctx.restore();
      }

      // ── 7. Redraw result badge ──
      const resultPos = textPositions.get('result-badge');
      if (resultPos) {
        const isWin = game.isWin;
        const scoreDisplay = game.finalScoreUs !== undefined && game.finalScoreThem !== undefined
          ? `${game.finalScoreUs} – ${game.finalScoreThem}` : null;
        const resultText = `${isWin ? 'WIN' : 'LOSS'}${scoreDisplay ? ` ${scoreDisplay}` : ''}`;

        // Draw pill bg
        ctx.save();
        ctx.beginPath();
        ctx.roundRect(resultPos.x, resultPos.y, resultPos.w, resultPos.h, 8);
        ctx.fillStyle = isWin ? 'rgba(74,222,128,0.08)' : 'rgba(248,113,113,0.08)';
        ctx.fill();
        ctx.strokeStyle = isWin ? 'rgba(74,222,128,0.2)' : 'rgba(248,113,113,0.2)';
        ctx.lineWidth = 1;
        ctx.stroke();
        ctx.restore();

        ctx.save();
        ctx.font = `800 ${Math.round(18 * sf)}px ${FONT}`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = isWin ? '#4ade80' : '#f87171';
        ctx.fillText(resultText, resultPos.cx, resultPos.cy);
        ctx.restore();
      }

      // ── 8. Redraw game date ──
      const datePos = textPositions.get('game-date');
      if (datePos) {
        const dateText = (container.querySelector('[data-canvas-text="game-date"]') as HTMLElement)?.textContent || '';
        ctx.save();
        ctx.font = `500 ${Math.round(15 * sf)}px ${FONT}`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = '#475569';
        ctx.fillText(dateText, datePos.cx, datePos.cy);
        ctx.restore();
      }

      // ── 9. Redraw Game Score + Best Impact labels & values ──
      for (const key of ['game-score-label', 'impact-label']) {
        const p = textPositions.get(key);
        if (p) {
          const text = key === 'game-score-label' ? 'GAME SCORE' : 'BEST IMPACT';
          ctx.save();
          ctx.font = `800 ${Math.round(13 * sf)}px ${FONT}`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillStyle = '#475569';
          ctx.fillText(text, p.cx, p.cy);
          ctx.restore();
        }
      }

      const gsValPos = textPositions.get('game-score-value');
      if (gsValPos) {
        ctx.save();
        ctx.font = `900 ${Math.round(58 * sf)}px ${FONT}`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = '#f8fafc';
        ctx.fillText(String(gradeData.gameScore), gsValPos.cx, gsValPos.cy);
        ctx.restore();
      }

      const impValPos = textPositions.get('impact-value');
      if (impValPos) {
        const impEl = container.querySelector('[data-canvas-text="impact-value"]') as HTMLElement;
        const stat = impEl?.getAttribute('data-impact-stat') || '';
        const bestImpactData = getBestImpactFromGame(game);
        ctx.save();
        ctx.font = `900 ${Math.round(58 * sf)}px ${FONT}`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = '#f8fafc';
        // Draw number and stat suffix
        const numText = String(bestImpactData.value);
        const numWidth = ctx.measureText(numText + ' ').width;
        const totalX = impValPos.cx;
        ctx.fillText(numText, totalX - ctx.measureText(` ${stat}`).width / 2, impValPos.cy);
        // Draw stat in smaller, muted
        ctx.font = `700 ${Math.round(24 * sf)}px ${FONT}`;
        ctx.fillStyle = '#94a3b8';
        ctx.fillText(stat, totalX + numWidth / 2, impValPos.cy);
        ctx.restore();
      }

      // ── 10. Redraw performance tags ──
      tagPositions.forEach(({ pos, text }) => {
        // Draw pill background
        ctx.save();
        ctx.beginPath();
        ctx.roundRect(pos.x, pos.y, pos.w, pos.h, 50);
        ctx.fillStyle = `${gradeData.color}15`;
        ctx.fill();
        ctx.strokeStyle = `${gradeData.color}30`;
        ctx.lineWidth = 1;
        ctx.stroke();
        ctx.restore();

        ctx.save();
        ctx.font = `700 ${Math.round(18 * sf)}px ${FONT}`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = gradeData.color;
        ctx.fillText(text, pos.cx, pos.cy);
        ctx.restore();
      });

      // ── 11. Redraw stat grid labels & values ──
      const statLabels = ['PTS', 'REB', 'AST', 'STL', 'BLK', 'TOV'];
      const statValues = [game.points, game.rebounds, game.assists, game.steals, game.blocks, game.turnovers];
      statLabels.forEach((label, i) => {
        const lp = textPositions.get(`stat-label-${label}`);
        const vp = textPositions.get(`stat-value-${label}`);
        if (lp) {
          ctx.save();
          ctx.font = `800 ${Math.round(25 * sf)}px ${FONT}`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillStyle = gradeData.color;
          ctx.fillText(label, lp.cx, lp.cy);
          ctx.restore();
        }
        if (vp) {
          ctx.save();
          ctx.font = `900 ${Math.round(67 * sf)}px ${FONT}`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillStyle = '#f8fafc';
          ctx.fillText(String(statValues[i]), vp.cx, vp.cy);
          ctx.restore();
        }
      });

      // ── 12. Redraw shooting row labels & values ──
      const shootingData = [
        { label: 'FG', text: `${game.fgMade}/${game.fgAttempted}` },
        { label: '3PT', text: `${game.threePtMade}/${game.threePtAttempted}` },
        { label: 'FT', text: `${game.ftMade}/${game.ftAttempted}` },
      ];
      shootingData.forEach(({ label, text }) => {
        const lp = textPositions.get(`shoot-label-${label}`);
        const vp = textPositions.get(`shoot-value-${label}`);
        if (lp) {
          ctx.save();
          ctx.font = `800 ${Math.round(18 * sf)}px ${FONT}`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillStyle = '#94a3b8';
          ctx.fillText(label, lp.cx, lp.cy);
          ctx.restore();
        }
        if (vp) {
          ctx.save();
          ctx.font = `900 ${Math.round(40 * sf)}px ${FONT}`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillStyle = '#f8fafc';
          ctx.fillText(text, vp.cx, vp.cy);
          ctx.restore();
        }
      });

      // ── 13. Redraw career high badges ──
      careerHighPositions.forEach(({ pos, text }) => {
        // Draw pill bg
        ctx.save();
        ctx.beginPath();
        ctx.roundRect(pos.x, pos.y, pos.w, pos.h, 12);
        const grad = ctx.createLinearGradient(pos.x, pos.y, pos.x + pos.w, pos.y + pos.h);
        grad.addColorStop(0, 'rgba(255,215,0,0.12)');
        grad.addColorStop(1, 'rgba(255,165,0,0.06)');
        ctx.fillStyle = grad;
        ctx.fill();
        ctx.strokeStyle = 'rgba(255,215,0,0.25)';
        ctx.lineWidth = 1;
        ctx.stroke();
        ctx.restore();

        ctx.save();
        ctx.font = `800 15px ${FONT}`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = '#fbbf24';
        ctx.fillText(text, pos.cx, pos.cy);
        ctx.restore();
      });

      // ── 14. Redraw XP badge ──
      if (xpEl && xpPos) {
        const xpText = xpEl.textContent || '';
        // Draw pill bg
        ctx.save();
        ctx.beginPath();
        ctx.roundRect(xpPos.x, xpPos.y, xpPos.w, xpPos.h, 50);
        const grad = ctx.createLinearGradient(xpPos.x, xpPos.y, xpPos.x + xpPos.w, xpPos.y + xpPos.h);
        grad.addColorStop(0, 'rgba(255,107,0,0.18)');
        grad.addColorStop(1, 'rgba(255,165,0,0.08)');
        ctx.fillStyle = grad;
        ctx.fill();
        ctx.strokeStyle = 'rgba(255,107,0,0.3)';
        ctx.lineWidth = 1;
        ctx.stroke();
        ctx.restore();

        ctx.save();
        ctx.font = `900 ${Math.round(22 * sf)}px ${FONT}`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = '#ff8c3a';
        ctx.fillText(xpText, xpPos.cx, xpPos.cy);
        ctx.restore();
      }

      // ── 15. Redraw footer text ──
      const footerBrandPos = textPositions.get('footer-brand');
      if (footerBrandPos) {
        ctx.save();
        // Title line
        ctx.font = `800 ${isPost ? 20 : 28}px ${FONT}`;
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';
        ctx.fillStyle = '#f8fafc';
        ctx.fillText('Hoop Journal', footerBrandPos.x, footerBrandPos.y);
        // Subtitle line
        ctx.font = `500 ${isPost ? 13 : 18}px ${FONT}`;
        ctx.fillStyle = '#475569';
        ctx.fillText('Track Your Game. Improve Every Day.', footerBrandPos.x, footerBrandPos.y + (isPost ? 24 : 34));
        ctx.restore();
      }

      const footerScanPos = textPositions.get('footer-scan');
      if (footerScanPos) {
        ctx.save();
        ctx.font = `700 ${isPost ? 8 : 10}px ${FONT}`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = '#475569';
        ctx.fillText('SCAN TO TRACK', footerScanPos.cx, footerScanPos.cy);
        ctx.restore();
      }

      // ── 16. Redraw App Store badge ──
      if (appStorePos) {
        try {
          const badgeImg = new Image();
          badgeImg.crossOrigin = 'anonymous';
          await new Promise<void>((res, rej) => {
            badgeImg.onload = () => res();
            badgeImg.onerror = () => rej();
            badgeImg.src = appStoreBadge;
          });
          const aspectRatio = badgeImg.naturalWidth / badgeImg.naturalHeight;
          const drawW = appStorePos.w;
          const drawH = drawW / aspectRatio;
          ctx.save();
          ctx.drawImage(badgeImg, appStorePos.x, appStorePos.cy - drawH / 2, drawW, drawH);
          ctx.restore();
        } catch { /* badge load failed, skip */ }
      }

      return new Promise((resolve) => out.toBlob((blob) => resolve(blob ?? null), 'image/png'));
    } catch (err) {
      console.error('[ReportCard] Export failed:', err);
      return null;
    }
  }, [CANVAS_W, CANVAS_H, exportFormat, gradeData, game, playerName, playerTeam]);

  const handleSaveShare = async () => {
    setExporting(true);
    try {
      const blob = await captureCard();
      if (!blob) throw new Error('Failed to generate image');
      const file = new File([blob], fileName, { type: 'image/png' });

      if (navigator.share && navigator.canShare?.({ files: [file] })) {
        toast('🏀 Game card ready!', {
          description: isIOS()
            ? 'Tap "Save Image" in the share menu to save to Photos.'
            : 'Choose where to share or save your card.',
          duration: 5000,
        });
        await navigator.share({
          title: `Game Report vs ${game.opponent}`,
          text: `Check out my game! ${game.points} PTS vs ${game.opponent} 🏀`,
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
        toast('📱 Card ready to save', {
          description: 'Tap the Share icon, then choose "Save to Photos".',
          duration: 6000,
        });
      } else {
        toast.success('Game card downloaded!');
      }
    } catch (err: any) {
      if (err?.name !== 'AbortError') {
        toast.error('Failed to generate report card');
      }
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

  // Preview scale to fit in dialog
  const previewMaxW = 340;
  const previewScale = previewMaxW / CANVAS_W;

  return (
    <>
      {/* Hidden full-size canvas for export */}
      {open && (
        <div
          aria-hidden="true"
          style={{
            position: 'fixed',
            left: -2000,
            top: 0,
            width: CANVAS_W,
            height: CANVAS_H,
            overflow: 'hidden',
            pointerEvents: 'none',
            zIndex: -1,
          }}
        >
          <ReportCardCanvas
            ref={exportRef}
            game={game}
            playerName={playerName}
            playerTeam={playerTeam}
            avatarUrl={avatarUrl}
            allGames={allGames}
            exportFormat={exportFormat}
            showSafeZones={false}
          />
        </div>
      )}

      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-[440px] p-0 bg-card border-border overflow-hidden max-h-[95vh] flex flex-col">
          <DialogTitle className="sr-only">Game Report Card</DialogTitle>

          {/* Header */}
          <div className="px-4 pt-4 pb-2 shrink-0 space-y-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest text-center mb-2">Share Game Card</p>
            <SocialPreview platform={platform} onPlatformChange={setPlatform} />

            {/* Export Format & Safe Zone Toggle */}
            <div className="flex items-center justify-between gap-2 pt-1">
              <div className="flex gap-1">
                {(['story', 'post'] as const).map(fmt => (
                  <button
                    key={fmt}
                    onClick={() => setExportFormat(fmt)}
                    className={`px-3 py-1 rounded-full text-xs font-semibold transition-all ${
                      exportFormat === fmt
                        ? 'bg-primary/20 text-primary border border-primary/40'
                        : 'bg-secondary/50 text-muted-foreground border border-border/50 hover:bg-secondary'
                    }`}
                  >
                    {fmt === 'story' ? 'Story 9:16' : 'Post 4:5'}
                  </button>
                ))}
              </div>
              <button
                onClick={() => setShowSafeZones(v => !v)}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium transition-all ${
                  showSafeZones
                    ? 'bg-destructive/15 text-destructive border border-destructive/30'
                    : 'bg-secondary/50 text-muted-foreground border border-border/50 hover:bg-secondary'
                }`}
                title="Preview Instagram safe zones"
              >
                {showSafeZones ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                Safe Zones
              </button>
            </div>
          </div>

          {/* Preview container */}
          <div className="flex-1 min-h-0 overflow-y-auto px-4">
            <div
              className="w-full overflow-hidden rounded-lg border border-border/30 mx-auto mb-4"
              style={{ maxWidth: previewMaxW, aspectRatio: `${CANVAS_W}/${CANVAS_H}` }}
            >
              <div style={{ width: '100%', height: '100%', position: 'relative' }}>
                <div style={{
                  transformOrigin: 'top left',
                  transform: `scale(${previewScale})`,
                  position: 'absolute',
                  top: 0,
                  left: 0,
                }}>
                  <ReportCardCanvas
                    ref={previewRef}
                    game={game}
                    playerName={playerName}
                    playerTeam={playerTeam}
                    avatarUrl={avatarUrl}
                    allGames={allGames}
                    exportFormat={exportFormat}
                    showSafeZones={showSafeZones}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Sticky action footer */}
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

// Helper to get best impact stat from game
function getBestImpactFromGame(game: GameStats) {
  const weighted = [
    { stat: 'PTS', value: game.points, weight: game.points },
    { stat: 'REB', value: game.rebounds, weight: game.rebounds },
    { stat: 'AST', value: game.assists, weight: 1.5 * game.assists },
    { stat: 'STL', value: game.steals, weight: 2 * game.steals },
    { stat: 'BLK', value: game.blocks, weight: 2 * game.blocks },
  ];
  return weighted.sort((a, b) => b.weight - a.weight)[0];
}
