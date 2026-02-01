import { useState, useEffect } from 'react';
import { Brain, Trash2, Loader2, AlertTriangle, RefreshCw, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useCoachMemory } from '@/hooks/useCoachMemory';
import { toast } from 'sonner';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { cn } from '@/lib/utils';

interface Memory {
  id: string;
  memory_type: string;
  memory_key: string;
  memory_value: string;
  confidence: number;
  occurrence_count: number;
  last_updated_at: string;
}

const memoryTypeConfig: Record<string, { emoji: string; label: string; color: string }> = {
  habit: { emoji: '🔄', label: 'Habit', color: 'bg-blue-500/10 text-blue-600 border-blue-500/20' },
  preference: { emoji: '⭐', label: 'Preference', color: 'bg-purple-500/10 text-purple-600 border-purple-500/20' },
  pattern: { emoji: '📈', label: 'Pattern', color: 'bg-green-500/10 text-green-600 border-green-500/20' },
  concern: { emoji: '🎯', label: 'Focus Area', color: 'bg-orange-500/10 text-orange-600 border-orange-500/20' },
  strength: { emoji: '💪', label: 'Strength', color: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' },
  goal: { emoji: '🏆', label: 'Goal', color: 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20' },
  conversation_insight: { emoji: '💬', label: 'Insight', color: 'bg-pink-500/10 text-pink-600 border-pink-500/20' },
  milestone_context: { emoji: '🏅', label: 'Milestone', color: 'bg-amber-500/10 text-amber-600 border-amber-500/20' },
};

function getConfidenceLevel(confidence: number): { label: string; color: string } {
  if (confidence >= 0.8) return { label: 'High', color: 'text-green-600' };
  if (confidence >= 0.5) return { label: 'Medium', color: 'text-yellow-600' };
  return { label: 'Low', color: 'text-muted-foreground' };
}

function formatTimeAgo(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
  return `${Math.floor(diffDays / 30)} months ago`;
}

export function CoachMemoryViewer() {
  const [memories, setMemories] = useState<Memory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isClearingAll, setIsClearingAll] = useState(false);
  
  const { fetchMemories, deleteMemory, clearAllMemories } = useCoachMemory();

  const loadMemories = async () => {
    setIsLoading(true);
    try {
      const data = await fetchMemories();
      setMemories(data);
    } catch (error) {
      console.error('Failed to load memories:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadMemories();
  }, []);

  const handleDelete = async (memoryId: string) => {
    setDeletingId(memoryId);
    try {
      const success = await deleteMemory(memoryId);
      if (success) {
        setMemories(prev => prev.filter(m => m.id !== memoryId));
        toast.success('Memory removed');
      } else {
        toast.error('Failed to remove memory');
      }
    } finally {
      setDeletingId(null);
    }
  };

  const handleClearAll = async () => {
    setIsClearingAll(true);
    try {
      const success = await clearAllMemories();
      if (success) {
        setMemories([]);
        toast.success('All memories cleared');
      } else {
        toast.error('Failed to clear memories');
      }
    } finally {
      setIsClearingAll(false);
    }
  };

  // Group memories by type
  const groupedMemories = memories.reduce((acc, memory) => {
    const type = memory.memory_type;
    if (!acc[type]) acc[type] = [];
    acc[type].push(memory);
    return acc;
  }, {} as Record<string, Memory[]>);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Brain className="w-4 h-4 text-primary" />
          <h3 className="text-sm font-semibold">Coach AI Memory</h3>
          {memories.length > 0 && (
            <Badge variant="secondary" className="text-xs">
              {memories.length} {memories.length === 1 ? 'insight' : 'insights'}
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={loadMemories}
            disabled={isLoading}
          >
            <RefreshCw className={cn("w-3.5 h-3.5", isLoading && "animate-spin")} />
          </Button>
          {memories.length > 0 && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs text-destructive hover:text-destructive hover:bg-destructive/10"
                  disabled={isClearingAll}
                >
                  {isClearingAll ? (
                    <Loader2 className="w-3 h-3 animate-spin mr-1" />
                  ) : (
                    <Trash2 className="w-3 h-3 mr-1" />
                  )}
                  Clear All
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle className="flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5 text-destructive" />
                    Clear Coach AI Memory?
                  </AlertDialogTitle>
                  <AlertDialogDescription>
                    This will permanently delete all {memories.length} insights Coach AI has learned about you. 
                    Coach will start fresh and need to relearn your patterns and preferences.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleClearAll}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    Clear All Memories
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>
      </div>
      
      <p className="text-xs text-muted-foreground">
        Coach AI learns about you over time to personalize advice. Here's what Coach remembers:
      </p>

      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
        </div>
      ) : memories.length === 0 ? (
        <div className="text-center py-6 border border-dashed border-border rounded-lg">
          <Sparkles className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
          <p className="text-sm text-muted-foreground">
            No memories yet
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Chat with Coach AI and memories will be stored automatically
          </p>
        </div>
      ) : (
        <div className="space-y-4 max-h-[400px] overflow-y-auto pr-1">
          {Object.entries(groupedMemories).map(([type, typeMemories]) => {
            const config = memoryTypeConfig[type] || { emoji: '📝', label: type, color: 'bg-gray-500/10 text-gray-600' };
            
            return (
              <div key={type} className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-sm">{config.emoji}</span>
                  <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    {config.label}s
                  </span>
                </div>
                <div className="space-y-2">
                  {typeMemories.map((memory) => {
                    const confidence = getConfidenceLevel(memory.confidence);
                    
                    return (
                      <div
                        key={memory.id}
                        className="group flex items-start gap-3 p-3 bg-secondary/50 rounded-lg border border-border/50 hover:border-border transition-colors"
                      >
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium leading-snug">
                            {memory.memory_value}
                          </p>
                          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                            <Badge variant="outline" className={cn("text-[10px] px-1.5 py-0", config.color)}>
                              {memory.memory_key.replace(/_/g, ' ')}
                            </Badge>
                            <span className={cn("text-[10px]", confidence.color)}>
                              {confidence.label} confidence
                            </span>
                            {memory.occurrence_count > 1 && (
                              <span className="text-[10px] text-muted-foreground">
                                • Seen {memory.occurrence_count}x
                              </span>
                            )}
                            <span className="text-[10px] text-muted-foreground">
                              • {formatTimeAgo(memory.last_updated_at)}
                            </span>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                          onClick={() => handleDelete(memory.id)}
                          disabled={deletingId === memory.id}
                        >
                          {deletingId === memory.id ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          ) : (
                            <Trash2 className="w-3 h-3" />
                          )}
                        </Button>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
