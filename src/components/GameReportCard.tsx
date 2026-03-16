import { useRef, useState, useCallback, useMemo } from 'react';
import html2canvas from 'html2canvas';
import { Share2, Copy, Check, HelpCircle, Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';
import type { GameStats } from '@/types/basketball';
import { ReportCardCanvas, type ExportFormat } from '@/components/report-card/ReportCardCanvas';
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

const FORMATS = {
  story: { w: 1080, h: 1920 },
  post: { w: 1080, h: 1350 },
} as const;

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

  const captureCard = useCallback(async (): Promise<Blob | null> => {
    if (!exportRef.current) return null;

    try {
      if (document.fonts?.ready) {
        await document.fonts.ready;
      }

      const images = Array.from(exportRef.current.querySelectorAll('img'));
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

      const rawCanvas = await html2canvas(exportRef.current, {
        scale: 2,
        backgroundColor: '#070b16',
        useCORS: true,
        foreignObjectRendering: true,
        width: CANVAS_W,
        height: CANVAS_H,
        windowWidth: CANVAS_W,
        windowHeight: CANVAS_H,
        logging: false,
      });

      return new Promise((resolve) => rawCanvas.toBlob((blob) => resolve(blob ?? null), 'image/png'));
    } catch (err) {
      console.error('[ReportCard] Export failed:', err);
      return null;
    }
  }, [CANVAS_W, CANVAS_H]);

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
