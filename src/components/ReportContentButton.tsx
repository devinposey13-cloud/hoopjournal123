import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Flag, Loader2 } from 'lucide-react';

interface ReportContentButtonProps {
  userMessage: string;
  aiResponse: string;
}

export function ReportContentButton({ userMessage, aiResponse }: ReportContentButtonProps) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit() {
    if (!user) {
      toast.error('You must be logged in to report content');
      return;
    }

    setSubmitting(true);
    try {
      const { error } = await supabase
        .from('content_reports')
        .insert({
          reporter_user_id: user.id,
          reported_content: userMessage,
          ai_response: aiResponse,
          reason: reason.trim() || null,
        });

      if (error) throw error;

      toast.success('Report submitted. Thank you for helping keep our community safe.');
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
        <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-destructive">
          <Flag className="w-3 h-3 mr-1" />
          Report
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Report Inappropriate Content</DialogTitle>
          <DialogDescription>
            Help us keep Coach AI safe for everyone. Report any inappropriate, harmful, or off-topic responses.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">AI Response Being Reported</Label>
            <div className="bg-muted p-3 rounded text-sm max-h-24 overflow-y-auto">
              {aiResponse.slice(0, 200)}
              {aiResponse.length > 200 && '...'}
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="reason">Why are you reporting this? (optional)</Label>
            <Textarea
              id="reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g., Response was inappropriate, off-topic, or contained harmful content"
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
