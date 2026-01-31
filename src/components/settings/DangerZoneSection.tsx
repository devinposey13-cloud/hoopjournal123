import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { AlertTriangle, RefreshCw, Trash2, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface DangerZoneSectionProps {
  userId: string;
  onStartOver?: () => void;
}

export function DangerZoneSection({ userId, onStartOver }: DangerZoneSectionProps) {
  const navigate = useNavigate();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showStartOverDialog, setShowStartOverDialog] = useState(false);
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);
  const [isStartingOver, setIsStartingOver] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [startOverConfirmText, setStartOverConfirmText] = useState('');
  const [deleteCountdown, setDeleteCountdown] = useState<number | null>(null);

  // Countdown timer for delete confirmation
  useEffect(() => {
    if (deleteConfirmText === 'DELETE' && !isDeletingAccount) {
      setDeleteCountdown(5);
      
      const interval = setInterval(() => {
        setDeleteCountdown(prev => {
          if (prev === null || prev <= 1) {
            clearInterval(interval);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      
      return () => clearInterval(interval);
    } else {
      setDeleteCountdown(null);
    }
  }, [deleteConfirmText, isDeletingAccount]);

  const handleDeleteAccount = async () => {
    if (deleteConfirmText !== 'DELETE') return;

    setIsDeletingAccount(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        toast.error('Not authenticated');
        return;
      }

      const { data, error } = await supabase.functions.invoke('delete-own-account', {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (error) {
        throw new Error(error.message);
      }

      if (!data?.success) {
        throw new Error(data?.error || 'Failed to delete account');
      }

      toast.success('Account deleted successfully');
      
      // Sign out and redirect to auth page
      await supabase.auth.signOut();
      navigate('/');
    } catch (error: any) {
      console.error('Error deleting account:', error);
      toast.error(error.message || 'Failed to delete account');
    } finally {
      setIsDeletingAccount(false);
      setShowDeleteDialog(false);
      setDeleteConfirmText('');
    }
  };

  const handleStartOver = async () => {
    if (startOverConfirmText !== 'RESTART') return;

    setIsStartingOver(true);
    try {
      // Delete all user data except account itself
      // Order matters for foreign key constraints

      // First get video clips to delete from storage
      const { data: videoClips } = await supabase
        .from('video_clips')
        .select('file_path, thumbnail_path')
        .eq('user_id', userId);

      // Delete video files from storage
      if (videoClips && videoClips.length > 0) {
        const filePaths = videoClips
          .flatMap(clip => [clip.file_path, clip.thumbnail_path])
          .filter(Boolean) as string[];

        if (filePaths.length > 0) {
          await supabase.storage.from('video-clips').remove(filePaths);
        }
      }

      // Delete from tables in order
      const tablesToClean = [
        'video_likes',
        'video_comments',
        'video_clips',
        'stats_predictions',
        'postgame_insights',
        'player_milestones',
        'player_badges',
        'user_achievements',
        'user_game_stats',
        'game_scores',
        'games',
        'scheduled_games',
        'seasons',
      ];

      for (const table of tablesToClean) {
        const { error } = await supabase
          .from(table as any)
          .delete()
          .eq('user_id', userId);

        if (error) {
          console.error(`Error deleting from ${table}:`, error);
        }
      }

      // Reset player_settings to trigger re-onboarding (set onboarding_completed_at to null)
      const { error: updateError } = await supabase
        .from('player_settings')
        .update({
          onboarding_completed_at: null,
          name: 'Player Name',
          team: 'Team Name',
          position: 'Guard',
          height: "5'8\"",
          grade: '1st Grade',
          number: 0,
          court_role: null,
          playing_level: null,
          season_goals: null,
        })
        .eq('user_id', userId);

      if (updateError) {
        console.error('Error resetting player settings:', updateError);
        throw updateError;
      }

      // Clear localStorage intro flag
      localStorage.removeItem('hoopjournal_intro_seen');

      toast.success('All data cleared! Starting fresh...');
      
      // Call the callback to handle navigation/reload
      if (onStartOver) {
        onStartOver();
      } else {
        // Fallback: reload the page
        window.location.reload();
      }
    } catch (error: any) {
      console.error('Error starting over:', error);
      toast.error(error.message || 'Failed to reset account');
    } finally {
      setIsStartingOver(false);
      setShowStartOverDialog(false);
      setStartOverConfirmText('');
    }
  };

  return (
    <>
      <Separator className="my-6" />

      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-destructive flex items-center gap-2">
          <AlertTriangle className="w-5 h-5" />
          Danger Zone
        </h3>

        {/* Start Over Card */}
        <div className="border border-amber-500/30 bg-amber-500/5 rounded-lg p-4">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
            <div className="flex-1">
              <h4 className="font-medium flex items-center gap-2">
                <RefreshCw className="w-4 h-4 text-amber-500" />
                Start Over
              </h4>
              <p className="text-sm text-muted-foreground mt-1">
                Wipe all game data, clips, and schedule. You'll go through onboarding again.
                Your account and profile photo will be preserved.
              </p>
            </div>
            <Button
              variant="outline"
              className="border-amber-500/50 hover:bg-amber-500/10 hover:text-amber-600"
              onClick={() => setShowStartOverDialog(true)}
            >
              Start Fresh
            </Button>
          </div>
        </div>

        {/* Delete Account Card */}
        <div className="border border-destructive/30 bg-destructive/5 rounded-lg p-4">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
            <div className="flex-1">
              <h4 className="font-medium flex items-center gap-2">
                <Trash2 className="w-4 h-4 text-destructive" />
                Delete Account
              </h4>
              <p className="text-sm text-muted-foreground mt-1">
                Permanently delete your account and all associated data.
                This action cannot be undone.
              </p>
            </div>
            <Button
              variant="destructive"
              onClick={() => setShowDeleteDialog(true)}
            >
              Delete Account
            </Button>
          </div>
        </div>
      </div>

      {/* Delete Account Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="w-5 h-5" />
              Delete Your Account?
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-3">
              <p>
                This will <strong>permanently delete</strong> your account and all associated data including:
              </p>
              <ul className="list-disc list-inside text-sm space-y-1 ml-2">
                <li>All game statistics and history</li>
                <li>Video clips and uploads</li>
                <li>Season schedule and predictions</li>
                <li>Milestones and achievements</li>
                <li>Profile and settings</li>
              </ul>
              <p className="font-semibold text-destructive">
                This action cannot be undone.
              </p>
              <div className="pt-2">
                <label className="text-sm font-medium">
                  Type <span className="font-mono bg-muted px-1 rounded">DELETE</span> to confirm:
                </label>
                <Input
                  value={deleteConfirmText}
                  onChange={(e) => setDeleteConfirmText(e.target.value.toUpperCase())}
                  placeholder="DELETE"
                  className="mt-2"
                  disabled={isDeletingAccount}
                />
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeletingAccount}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                handleDeleteAccount();
              }}
              disabled={
                deleteConfirmText !== 'DELETE' || 
                (deleteCountdown !== null && deleteCountdown > 0) || 
                isDeletingAccount
              }
              className="bg-destructive hover:bg-destructive/90"
            >
              {isDeletingAccount ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  Deleting...
                </>
              ) : deleteCountdown !== null && deleteCountdown > 0 ? (
                `Wait ${deleteCountdown}s...`
              ) : (
                'Delete My Account'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Start Over Confirmation Dialog */}
      <AlertDialog open={showStartOverDialog} onOpenChange={setShowStartOverDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-amber-600">
              <RefreshCw className="w-5 h-5" />
              Start Over From Scratch?
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-3">
              <p>
                This will <strong>reset your account</strong> and delete:
              </p>
              <ul className="list-disc list-inside text-sm space-y-1 ml-2">
                <li>All game statistics and history</li>
                <li>Video clips and uploads</li>
                <li>Season schedule and predictions</li>
                <li>Milestones and achievements</li>
              </ul>
              <p className="text-sm text-muted-foreground">
                Your account, email, and profile photo will be preserved. You'll go through
                the onboarding process again as if you were a new user.
              </p>
              <div className="pt-2">
                <label className="text-sm font-medium">
                  Type <span className="font-mono bg-muted px-1 rounded">RESTART</span> to confirm:
                </label>
                <Input
                  value={startOverConfirmText}
                  onChange={(e) => setStartOverConfirmText(e.target.value.toUpperCase())}
                  placeholder="RESTART"
                  className="mt-2"
                  disabled={isStartingOver}
                />
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isStartingOver}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                handleStartOver();
              }}
              disabled={startOverConfirmText !== 'RESTART' || isStartingOver}
              className="bg-amber-500 hover:bg-amber-600 text-white"
            >
              {isStartingOver ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  Resetting...
                </>
              ) : (
                'Start Over'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
