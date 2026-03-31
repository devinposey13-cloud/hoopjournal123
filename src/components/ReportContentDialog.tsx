import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { dispatchSlackAlert } from '@/utils/slackAlerts';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Flag, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ReportContentDialogProps {
  contentType: 'comment' | 'video';
  contentId: string;
  contentPreview: string;
  trigger?: React.ReactNode;
}

const LABELS: Record<string, { title: string; desc: string; previewLabel: string }> = {
  comment: {
    title: 'Report Comment',
    desc: 'Help us keep the community safe by reporting inappropriate comments.',
    previewLabel: 'Comment Being Reported',
  },
  video: {
    title: 'Report Video',
    desc: 'Help us keep the community safe by reporting inappropriate videos.',
    previewLabel: 'Video Being Reported',
  },
};

export function ReportContentDialog({
  contentType,
  contentId,
  contentPreview,
  trigger,
}: ReportContentDialogProps) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const labels = LABELS[contentType];

  async function handleSubmit() {
    if (!user) {
      toast.error('You must be logged in to report content');
      return;
    }

    setSubmitting(true);
    try {
      const { error } = await supabase.from('content_reports').insert({
        reporter_user_id: user.id,
        reported_content: contentPreview.slice(0, 500),
        content_type: contentType,
        content_reference_id: contentId,
        reason: reason.trim() || null,
      } as any);

      if (error) throw error;

      toast.success('Report submitted. Thank you for helping keep our community safe.');
      dispatchSlackAlert({
        category: 'reported_content',
        severity: 'warning',
        title: `${contentType === 'comment' ? 'Comment' : 'Video'} Reported`,
        summary: `A user reported a ${contentType}. Reason: ${reason.trim() || 'No reason given'}`,
        details: {
          'Content Type': contentType,
          Preview: contentPreview.substring(0, 100),
          Reason: reason.trim() || 'None',
        },
        dedup_key: `report_${contentType}_${contentId}_${user.id}`,
      });
      setOpen(false);
      setReason('');
    } catch (error) {
      console.error('Error submitting report:', error);
      toast.error('Failed to submit report');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 text-muted-foreground hover:text-destructive"
          >
            <Flag className="w-3 h-3" />
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{labels.title}</DialogTitle>
          <DialogDescription>{labels.desc}</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">{labels.previewLabel}</Label>
            <div className="bg-muted p-3 rounded text-sm max-h-24 overflow-y-auto">
              {contentPreview.slice(0, 200)}
              {contentPreview.length > 200 && '...'}
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="report-reason">Why are you reporting this? (optional)</Label>
            <Textarea
              id="report-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g., Inappropriate language, spam, harassment"
              rows={3}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={submitting} variant="destructive">
            {submitting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Submitting...
              </>
            ) : (
              <>
                <Flag className="w-4 h-4 mr-2" />
                Submit Report
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
