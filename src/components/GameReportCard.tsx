import { useRef, useState, useCallback, useMemo } from 'react';
import html2canvas from 'html2canvas';
import { Share2, Copy, Check, HelpCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';
import type { GameStats } from '@/types/basketball';
import { ReportCardCanvas } from '@/components/report-card/ReportCardCanvas';
import { SocialPreview } from '@/components/report-card/SocialPreview';

interface GameReportCardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  game: GameStats;
  playerName: string;
  playerTeam: string;
  avatarUrl?: string;
  allGames?: GameStats[];
}

const CANVAS_W = 1080;
const CANVAS_H = 1920;

const isIOS = () => /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

export function GameReportCard({ open, onOpenChange, game, playerName, playerTeam, avatarUrl, allGames }: GameReportCardProps) {
  const previewRef = useRef<HTMLDivElement>(null);
  const exportRef = useRef<HTMLDivElement>(null);
  const [exporting, setExporting] = useState(false);
  const [copied, setCopied] = useState(false);
  const [platform, setPlatform] = useState<'instagram' | 'twitter' | 'imessage'>('instagram');
  const [showIOSHelp, setShowIOSHelp] = useState(false);

  const fileName = useMemo(() =>
    `hoop-journal-game-card-vs-${game.opponent.replace(/\s+/g, '-').toLowerCase()}.png`,
    [game.opponent]
  );

  const captureCard = useCallback(async (): Promise<Blob | null> => {
    if (!exportRef.current) return null;

    try {
      const rawCanvas = await html2canvas(exportRef.current, {
        scale: 1,
        backgroundColor: null,
        useCORS: true,
        width: CANVAS_W,
        height: CANVAS_H,
        windowWidth: CANVAS_W,
        windowHeight: CANVAS_H,
        logging: false,
      });

      const targetCanvas = document.createElement('canvas');
      targetCanvas.width = CANVAS_W;
      targetCanvas.height = CANVAS_H;
      const ctx = targetCanvas.getContext('2d');
      if (!ctx) return null;

      ctx.fillStyle = '#070b16';
      ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
      ctx.drawImage(rawCanvas, 0, 0, CANVAS_W, CANVAS_H);

      return new Promise(resolve => targetCanvas.toBlob(blob => resolve(blob), 'image/png'));
    } catch (err) {
      console.error('[ReportCard] Export failed:', err);
      return null;
    }
  }, []);

  const handleSaveShare = async () => {
    setExporting(true);
    try {
      const blob = await captureCard();
      if (!blob) throw new Error('Failed to generate image');
      const file = new File([blob], fileName, { type: 'image/png' });

      // Prefer native share sheet (works great on iOS — user can tap "Save Image")
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

      // Fallback: browser download
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[440px] p-0 bg-card border-border overflow-hidden max-h-[95vh] flex flex-col">
        <DialogTitle className="sr-only">Game Report Card</DialogTitle>

        {/* Header */}
        <div className="px-4 pt-4 pb-2 shrink-0">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest text-center mb-2">Share Game Card</p>
          <SocialPreview platform={platform} onPlatformChange={setPlatform} />
        </div>

        {/* Preview container (scaled for display) */}
        <div className="flex-1 min-h-0 overflow-y-auto px-4">
          <div
            className="w-full overflow-hidden rounded-lg border border-border/30 mx-auto mb-4"
            style={{ maxWidth: 340, aspectRatio: `${CANVAS_W}/${CANVAS_H}` }}
          >
            <div style={{ width: '100%', height: '100%', position: 'relative' }}>
              <div style={{
                transformOrigin: 'top left',
                transform: `scale(${340 / CANVAS_W})`,
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
                />
              </div>
            </div>
          </div>
        </div>

        {/* Hidden full-size canvas for export (no CSS transform) */}
        <div style={{ position: 'fixed', top: -9999, left: -9999, pointerEvents: 'none', opacity: 0 }}>
          <ReportCardCanvas
            ref={exportRef}
            game={game}
            playerName={playerName}
            playerTeam={playerTeam}
            avatarUrl={avatarUrl}
            allGames={allGames}
          />
        </div>

        {/* Sticky action footer */}
        <div className="shrink-0 px-4 pb-4 pt-3 border-t border-border/30 bg-card relative">
          <div className="absolute -top-6 left-0 right-0 h-6 bg-gradient-to-t from-card to-transparent pointer-events-none" />

          {/* iOS help panel */}
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
              Save / Share Card
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
  );
}