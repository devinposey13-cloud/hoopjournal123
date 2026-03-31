import { Play, Trash2, Globe, MessageCircle, Flag } from 'lucide-react';
import { format } from 'date-fns';
import { VideoClip } from '@/types/basketball';
import { Button } from '@/components/ui/button';
import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { VideoInteractions, VideoLikeButton } from './VideoInteractions';
import { ReportContentDialog } from './ReportContentDialog';
import { supabase } from '@/integrations/supabase/client';

interface ClipCardProps {
  clip: VideoClip;
  onDelete?: (id: string) => void;
  showPlayerInfo?: boolean;
}

export function ClipCard({ clip, onDelete, showPlayerInfo }: ClipCardProps) {
  const [showVideo, setShowVideo] = useState(false);
  const [commentCount, setCommentCount] = useState(0);

  useEffect(() => {
    if (showPlayerInfo) {
      fetchCommentCount();
    }
  }, [clip.id, showPlayerInfo]);

  const fetchCommentCount = async () => {
    const { count } = await supabase
      .from('video_comments')
      .select('*', { count: 'exact', head: true })
      .eq('video_id', clip.id);
    setCommentCount(count || 0);
  };

  return (
    <>
      <div 
        className="clip-card group cursor-pointer transition-all duration-300 ease-out hover:scale-[1.02] hover:shadow-lg hover:shadow-primary/5 hover:border-primary/30 hover:-translate-y-0.5" 
        onClick={() => setShowVideo(true)}
      >
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
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-sm line-clamp-1">{clip.title}</h3>
              {showPlayerInfo && clip.playerName ? (
                <div className="flex items-center gap-1 mt-0.5">
                  <Globe className="w-3 h-3 text-primary" />
                  <p className="text-xs text-muted-foreground truncate">
                    {clip.playerName} • {clip.playerTeam}
                  </p>
                </div>
              ) : (
                <p className="text-xs text-muted-foreground mt-0.5">
                  {format(new Date(clip.date), 'MMM d, yyyy')}
                </p>
              )}
            </div>
            {onDelete && (
              <Button
                variant="ghost"
                size="icon"
                className="opacity-0 group-hover:opacity-100 transition-opacity h-7 w-7 text-muted-foreground hover:text-destructive flex-shrink-0"
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
          {/* Show like/comment counts for public clips */}
          {showPlayerInfo && (
            <div className="flex items-center gap-3 mt-2 pt-2 border-t border-border">
              <VideoLikeButton videoId={clip.id} />
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <MessageCircle className="w-3.5 h-3.5" />
                <span>{commentCount}</span>
              </div>
              <div className="ml-auto" onClick={(e) => e.stopPropagation()}>
                <ReportContentDialog
                  contentType="video"
                  contentId={clip.id}
                  contentPreview={clip.title}
                  trigger={
                    <button className="flex items-center gap-1 text-xs text-muted-foreground hover:text-destructive transition-colors">
                      <Flag className="w-3 h-3" />
                    </button>
                  }
                />
              </div>
            </div>
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
          {/* Show interactions for public clips */}
          {showPlayerInfo && (
            <div className="mt-4">
              <VideoInteractions videoId={clip.id} showComments />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
