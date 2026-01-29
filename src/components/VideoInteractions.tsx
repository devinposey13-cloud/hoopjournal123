import { useState, useEffect } from 'react';
import { Heart, MessageCircle, Send, Trash2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

interface Comment {
  id: string;
  isOwner: boolean; // Only track ownership, not raw user ID
  userName: string;
  content: string;
  createdAt: string;
}

interface VideoInteractionsProps {
  videoId: string;
  showComments?: boolean;
}

export function VideoInteractions({ videoId, showComments = true }: VideoInteractionsProps) {
  const { user } = useAuth();
  const [likes, setLikes] = useState(0);
  const [isLiked, setIsLiked] = useState(false);
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showCommentsSection, setShowCommentsSection] = useState(false);

  useEffect(() => {
    fetchInteractions();
  }, [videoId, user]);

  const fetchInteractions = async () => {
    setLoading(true);
    try {
      // Fetch likes count
      const { count: likesCount } = await supabase
        .from('video_likes')
        .select('*', { count: 'exact', head: true })
        .eq('video_id', videoId);

      setLikes(likesCount || 0);

      // Check if current user liked
      if (user) {
        const { data: userLike } = await supabase
          .from('video_likes')
          .select('id')
          .eq('video_id', videoId)
          .eq('user_id', user.id)
          .maybeSingle();

        setIsLiked(!!userLike);
      }

      // Fetch comments with user names
      const { data: commentsData } = await supabase
        .from('video_comments')
        .select('*')
        .eq('video_id', videoId)
        .order('created_at', { ascending: true });

      if (commentsData && commentsData.length > 0) {
        // Get user names for comments - prefer display_name over name for privacy
        const userIds = [...new Set(commentsData.map(c => c.user_id))];
        const { data: playersData } = await supabase
          .from('player_settings')
          .select('user_id, name, display_name')
          .in('user_id', userIds);

        const nameMap = (playersData || []).reduce((acc, p) => {
          // Use display_name if set, otherwise fall back to name
          acc[p.user_id] = p.display_name || p.name;
          return acc;
        }, {} as Record<string, string>);

        setComments(commentsData.map(c => ({
          id: c.id,
          isOwner: user?.id === c.user_id, // Convert to boolean ownership check
          userName: nameMap[c.user_id] || 'Anonymous',
          content: c.content,
          createdAt: c.created_at,
        })));
      } else {
        setComments([]);
      }
    } catch (error) {
      console.error('Error fetching interactions:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLike = async () => {
    if (!user) {
      toast.error('Please sign in to like videos');
      return;
    }

    try {
      if (isLiked) {
        // Unlike
        await supabase
          .from('video_likes')
          .delete()
          .eq('video_id', videoId)
          .eq('user_id', user.id);

        setLikes(prev => prev - 1);
        setIsLiked(false);
      } else {
        // Like
        await supabase
          .from('video_likes')
          .insert({ video_id: videoId, user_id: user.id });

        setLikes(prev => prev + 1);
        setIsLiked(true);
      }
    } catch (error) {
      console.error('Error toggling like:', error);
      toast.error('Failed to update like');
    }
  };

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      toast.error('Please sign in to comment');
      return;
    }
    if (!newComment.trim()) return;

    setSubmitting(true);
    try {
      const { data, error } = await supabase
        .from('video_comments')
        .insert({
          video_id: videoId,
          user_id: user.id,
          content: newComment.trim(),
        })
        .select()
        .single();

      if (error) throw error;

      // Get user's display name (prefer display_name over name)
      const { data: playerData } = await supabase
        .from('player_settings')
        .select('name, display_name')
        .eq('user_id', user.id)
        .maybeSingle();

      setComments(prev => [...prev, {
        id: data.id,
        isOwner: true, // User's own comment
        userName: playerData?.display_name || playerData?.name || 'You',
        content: data.content,
        createdAt: data.created_at,
      }]);
      setNewComment('');
      toast.success('Comment added');
    } catch (error) {
      console.error('Error adding comment:', error);
      toast.error('Failed to add comment');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    try {
      await supabase
        .from('video_comments')
        .delete()
        .eq('id', commentId);

      setComments(prev => prev.filter(c => c.id !== commentId));
      toast.success('Comment deleted');
    } catch (error) {
      console.error('Error deleting comment:', error);
      toast.error('Failed to delete comment');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center gap-4 py-2">
        <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Like and Comment buttons */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="sm"
          className={cn(
            "flex items-center gap-1.5 px-2",
            isLiked && "text-red-500 hover:text-red-600"
          )}
          onClick={handleLike}
        >
          <Heart className={cn("w-5 h-5", isLiked && "fill-current")} />
          <span className="text-sm font-medium">{likes}</span>
        </Button>

        {showComments && (
          <Button
            variant="ghost"
            size="sm"
            className="flex items-center gap-1.5 px-2"
            onClick={() => setShowCommentsSection(!showCommentsSection)}
          >
            <MessageCircle className="w-5 h-5" />
            <span className="text-sm font-medium">{comments.length}</span>
          </Button>
        )}
      </div>

      {/* Comments Section */}
      {showComments && showCommentsSection && (
        <div className="border-t border-border pt-3 space-y-3">
          {comments.length > 0 && (
            <ScrollArea className="max-h-48">
              <div className="space-y-2 pr-4">
                {comments.map((comment) => (
                  <div key={comment.id} className="flex items-start gap-2 group">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline gap-2">
                        <span className="text-sm font-medium">{comment.userName}</span>
                        <span className="text-xs text-muted-foreground">
                          {format(new Date(comment.createdAt), 'MMM d, h:mm a')}
                        </span>
                      </div>
                      <p className="text-sm text-foreground/90 break-words">{comment.content}</p>
                    </div>
                    {comment.isOwner && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="opacity-0 group-hover:opacity-100 transition-opacity h-6 w-6 text-muted-foreground hover:text-destructive flex-shrink-0"
                        onClick={() => handleDeleteComment(comment.id)}
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}

          {/* Add Comment Form */}
          {user ? (
            <form onSubmit={handleAddComment} className="flex gap-2">
              <Input
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Add a comment..."
                className="flex-1 h-9 text-sm"
                maxLength={500}
              />
              <Button
                type="submit"
                size="icon"
                className="h-9 w-9"
                disabled={!newComment.trim() || submitting}
              >
                {submitting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
              </Button>
            </form>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-2">
              Sign in to leave a comment
            </p>
          )}
        </div>
      )}
    </div>
  );
}

// Compact version for card display
export function VideoLikeButton({ videoId }: { videoId: string }) {
  const { user } = useAuth();
  const [likes, setLikes] = useState(0);
  const [isLiked, setIsLiked] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLikes();
  }, [videoId, user]);

  const fetchLikes = async () => {
    try {
      const { count } = await supabase
        .from('video_likes')
        .select('*', { count: 'exact', head: true })
        .eq('video_id', videoId);

      setLikes(count || 0);

      if (user) {
        const { data: userLike } = await supabase
          .from('video_likes')
          .select('id')
          .eq('video_id', videoId)
          .eq('user_id', user.id)
          .maybeSingle();

        setIsLiked(!!userLike);
      }
    } catch (error) {
      console.error('Error fetching likes:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLike = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user) {
      toast.error('Please sign in to like videos');
      return;
    }

    try {
      if (isLiked) {
        await supabase
          .from('video_likes')
          .delete()
          .eq('video_id', videoId)
          .eq('user_id', user.id);

        setLikes(prev => prev - 1);
        setIsLiked(false);
      } else {
        await supabase
          .from('video_likes')
          .insert({ video_id: videoId, user_id: user.id });

        setLikes(prev => prev + 1);
        setIsLiked(true);
      }
    } catch (error) {
      console.error('Error toggling like:', error);
    }
  };

  if (loading) return null;

  return (
    <button
      onClick={handleLike}
      className={cn(
        "flex items-center gap-1 text-xs transition-colors",
        isLiked ? "text-red-500" : "text-muted-foreground hover:text-red-500"
      )}
    >
      <Heart className={cn("w-3.5 h-3.5", isLiked && "fill-current")} />
      <span>{likes}</span>
    </button>
  );
}
