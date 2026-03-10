import { useRef, useState, useCallback } from 'react';
import html2canvas from 'html2canvas';
import { Download, Share2, Copy, Check } from 'lucide-react';
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

export function GameReportCard({ open, onOpenChange, game, playerName, playerTeam, avatarUrl, allGames }: GameReportCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [exporting, setExporting] = useState(false);
  const [copied, setCopied] = useState(false);
  const [platform, setPlatform] = useState<'instagram' | 'twitter' | 'imessage'>('instagram');

  const captureCard = useCallback(async (): Promise<Blob | null> => {
    if (!cardRef.current) return null;

    const clone = cardRef.current.cloneNode(true) as HTMLElement;
    clone.style.position = 'fixed';
    clone.style.top = '-9999px';
    clone.style.left = '-9999px';
    clone.style.width = `${CANVAS_W}px`;
    clone.style.height = `${CANVAS_H}px`;
    clone.style.transform = 'none';
    clone.style.zIndex = '-1';
    document.body.appendChild(clone);

    try {
      const rawCanvas = await html2canvas(clone, {
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

      const srcW = rawCanvas.width;
      const srcH = rawCanvas.height;
      const targetAR = CANVAS_W / CANVAS_H;
      const srcAR = srcW / srcH;

      let drawW: number, drawH: number, offsetX: number, offsetY: number;
      if (srcAR > targetAR) {
        drawW = CANVAS_W;
        drawH = CANVAS_W / srcAR;
        offsetX = 0;
        offsetY = (CANVAS_H - drawH) / 2;
      } else {
        drawH = CANVAS_H;
        drawW = CANVAS_H * srcAR;
        offsetX = (CANVAS_W - drawW) / 2;
        offsetY = 0;
      }

      ctx.drawImage(rawCanvas, 0, 0, srcW, srcH, offsetX, offsetY, drawW, drawH);

      return new Promise(resolve => targetCanvas.toBlob(blob => resolve(blob), 'image/png'));
    } finally {
      document.body.removeChild(clone);
    }
  }, []);

  const handleDownload = async () => {
    setExporting(true);
    try {
      const blob = await captureCard();
      if (!blob) throw new Error('Failed to generate image');
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `game-report-vs-${game.opponent.replace(/\s+/g, '-')}.png`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('Report card downloaded!');
    } catch {
      toast.error('Failed to generate report card');
    } finally {
      setExporting(false);
    }
  };

  const handleShare = async () => {
    setExporting(true);
    try {
      const blob = await captureCard();
      if (!blob) throw new Error('Failed to generate image');
      const file = new File([blob], 'game-report.png', { type: 'image/png' });
      if (navigator.share && navigator.canShare?.({ files: [file] })) {
        await navigator.share({
          title: `Game Report vs ${game.opponent}`,
          text: `Check out my game report! ${game.points} PTS vs ${game.opponent} 🏀`,
          files: [file],
        });
      } else {
        await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
        setCopied(true);
        toast.success('Image copied to clipboard!');
        setTimeout(() => setCopied(false), 2000);
      }
    } catch (err: any) {
      if (err?.name !== 'AbortError') {
        toast.error('Failed to share');
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

  const previewScale = 380 / CANVAS_W;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[440px] p-0 bg-card border-border overflow-hidden max-h-[95vh] flex flex-col">
        <DialogTitle className="sr-only">Game Report Card</DialogTitle>

        {/* Header */}
        <div className="px-4 pt-4 pb-2 shrink-0">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest text-center mb-2">Share Game Card</p>
          <SocialPreview platform={platform} onPlatformChange={setPlatform} />
        </div>

        {/* Preview container - constrained & scrollable */}
        <div className="flex-1 min-h-0 overflow-y-auto px-4">
          <div
            className="w-full overflow-hidden rounded-lg border border-border/30 mx-auto mb-6"
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
                  ref={cardRef}
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

        {/* Sticky action footer */}
        <div className="shrink-0 px-4 pb-4 pt-3 border-t border-border/30 bg-card relative">
          <div className="absolute -top-6 left-0 right-0 h-6 bg-gradient-to-t from-card to-transparent pointer-events-none" />
          <div className="flex gap-2">
            <Button onClick={handleDownload} disabled={exporting} className="flex-1 gap-2">
              <Download className="w-4 h-4" />
              Download
            </Button>
            <Button onClick={handleShare} disabled={exporting} variant="secondary" className="flex-1 gap-2">
              <Share2 className="w-4 h-4" />
              Share
            </Button>
            <Button onClick={handleCopy} disabled={exporting} variant="outline" size="icon">
              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
