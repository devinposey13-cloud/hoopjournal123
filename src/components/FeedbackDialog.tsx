import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { MessageSquare, Loader2, Send } from 'lucide-react';

const CATEGORIES = [
  { value: 'general', label: 'General Feedback' },
  { value: 'feature', label: 'Feature Request' },
  { value: 'bug', label: 'Bug Report' },
  { value: 'other', label: 'Other' },
];

const MAX_MESSAGE_LENGTH = 1000;

export function FeedbackDialog() {
  const { session } = useAuth();
  const [open, setOpen] = useState(false);
  const [category, setCategory] = useState('general');
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!session?.user?.id) {
      toast.error('You must be logged in to submit feedback');
      return;
    }

    if (!message.trim()) {
      toast.error('Please enter your feedback');
      return;
    }

    if (message.length > MAX_MESSAGE_LENGTH) {
      toast.error(`Feedback must be less than ${MAX_MESSAGE_LENGTH} characters`);
      return;
    }

    setIsSubmitting(true);
    try {
      const { error } = await supabase.from('user_feedback').insert({
        user_id: session.user.id,
        category,
        message: message.trim(),
      });

      if (error) throw error;

      // Send email notification (fire-and-forget)
      supabase.functions.invoke('notify-feedback', {
        body: {
          category,
          message: message.trim(),
          userEmail: session.user.email,
        },
      }).catch((err) => console.error('Failed to send feedback notification:', err));

      toast.success('Thank you for your feedback!');
      setOpen(false);
      setCategory('general');
      setMessage('');
    } catch (error) {
      console.error('Error submitting feedback:', error);
      toast.error('Failed to submit feedback. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="w-full gap-2">
          <MessageSquare className="w-4 h-4" />
          Send Feedback
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5" />
            Share Your Feedback
          </DialogTitle>
          <DialogDescription>
            Help us make Hoop Journal better! Your feedback goes directly to the team.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="category">Category</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger id="category">
                <SelectValue placeholder="Select a category" />
              </SelectTrigger>
              <SelectContent>
                {CATEGORIES.map((cat) => (
                  <SelectItem key={cat.value} value={cat.value}>
                    {cat.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="message">Your Feedback</Label>
            <Textarea
              id="message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Tell us what's on your mind..."
              className="min-h-[120px] resize-none"
              maxLength={MAX_MESSAGE_LENGTH}
            />
            <p className="text-xs text-muted-foreground text-right">
              {message.length}/{MAX_MESSAGE_LENGTH}
            </p>
          </div>
        </div>
        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting || !message.trim()}
            className="gap-2"
          >
            {isSubmitting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
            Submit Feedback
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
