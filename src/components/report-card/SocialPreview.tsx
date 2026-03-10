import { Instagram, Twitter, MessageCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

type Platform = 'instagram' | 'twitter' | 'imessage';

interface SocialPreviewProps {
  platform: Platform;
  onPlatformChange: (p: Platform) => void;
}

const PLATFORMS: { id: Platform; label: string; icon: typeof Instagram; aspect: string; desc: string }[] = [
  { id: 'instagram', label: 'Instagram', icon: Instagram, aspect: '4:5', desc: '1080 × 1350' },
  { id: 'twitter', label: 'X / Twitter', icon: Twitter, aspect: '4:5', desc: '1080 × 1350' },
  { id: 'imessage', label: 'iMessage', icon: MessageCircle, aspect: '4:5', desc: '1080 × 1350' },
];

export function SocialPreview({ platform, onPlatformChange }: SocialPreviewProps) {
  return (
    <div className="flex gap-1.5 justify-center">
      {PLATFORMS.map((p) => {
        const Icon = p.icon;
        const active = platform === p.id;
        return (
          <button
            key={p.id}
            onClick={() => onPlatformChange(p.id)}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all",
              active
                ? "bg-primary/20 text-primary border border-primary/40"
                : "bg-secondary/50 text-muted-foreground border border-border/50 hover:bg-secondary"
            )}
          >
            <Icon className="w-3.5 h-3.5" />
            {p.label}
          </button>
        );
      })}
    </div>
  );
}
