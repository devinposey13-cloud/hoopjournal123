import { Play, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { VideoClip } from '@/types/basketball';
import { Button } from '@/components/ui/button';
import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface ClipCardProps {
  clip: VideoClip;
  onDelete?: (id: string) => void;
}

export function ClipCard({ clip, onDelete }: ClipCardProps) {
  const [showVideo, setShowVideo] = useState(false);

  return (
    <>
      <div className="clip-card group cursor-pointer" onClick={() => setShowVideo(true)}>
        <div className="aspect-video bg-muted relative overflow-hidden">
          {clip.thumbnail ? (
            <img
              src={clip.thumbnail}
              alt={clip.title}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-muted to-secondary">
              <Play className="w-12 h-12 text-muted-foreground" />
            </div>
          )}
          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
            <div className="w-14 h-14 rounded-full gradient-primary flex items-center justify-center shadow-glow">
              <Play className="w-6 h-6 text-primary-foreground ml-1" />
            </div>
          </div>
        </div>
        <div className="p-3">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="font-semibold text-sm line-clamp-1">{clip.title}</h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                {format(new Date(clip.date), 'MMM d, yyyy')}
              </p>
            </div>
            {onDelete && (
              <Button
                variant="ghost"
                size="icon"
                className="opacity-0 group-hover:opacity-100 transition-opacity h-7 w-7 text-muted-foreground hover:text-destructive"
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(clip.id);
                }}
              >
                <Trash2 className="w-3.5 h-3.5" />
              </Button>
            )}
          </div>
          {clip.description && (
            <p className="text-xs text-muted-foreground mt-1.5 line-clamp-2">
              {clip.description}
            </p>
          )}
        </div>
      </div>

      <Dialog open={showVideo} onOpenChange={setShowVideo}>
        <DialogContent className="max-w-4xl bg-card border-border">
          <DialogHeader>
            <DialogTitle>{clip.title}</DialogTitle>
          </DialogHeader>
          <div className="aspect-video mt-2">
            <video
              src={clip.url}
              controls
              autoPlay
              className="w-full h-full rounded-lg"
            />
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
