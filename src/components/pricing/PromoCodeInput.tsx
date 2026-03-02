import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown, Ticket, Loader2, CheckCircle2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export function PromoCodeInput({ onApplied }: { onApplied?: () => void }) {
  const [isOpen, setIsOpen] = useState(false);
  const [code, setCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [applied, setApplied] = useState(false);

  const handleApply = async () => {
    if (!code.trim()) {
      toast.error('Please enter an event code.');
      return;
    }

    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('validate-promo-code', {
        body: { code: code.trim() },
      });

      if (error) throw error;

      if (data?.success) {
        setApplied(true);
        onApplied?.();
        toast.success(data.message);
      } else {
        toast.error(data?.error || 'Invalid event code.');
      }
    } catch (err: any) {
      // Handle rate limiting
      if (err?.message?.includes('429') || err?.status === 429) {
        toast.error('Too many attempts. Please try again later.');
      } else {
        toast.error('Invalid event code.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  if (applied) {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-green-500/30 bg-green-500/10 p-3 text-sm">
        <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />
        <span className="text-green-600 dark:text-green-400 font-medium">
          Event code applied! Subscribe to Starter to lock in Elite access.
        </span>
      </div>
    );
  }

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger asChild>
        <button className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors w-full justify-center py-2">
          <Ticket className="w-4 h-4" />
          Have an Event Code?
          <ChevronDown className={`w-3 h-3 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </button>
      </CollapsibleTrigger>
      <CollapsibleContent className="pt-2">
        <div className="flex gap-2 max-w-sm mx-auto">
          <Input
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="Enter event code"
            className="flex-1"
            disabled={isLoading}
            onKeyDown={(e) => e.key === 'Enter' && handleApply()}
          />
          <Button
            onClick={handleApply}
            disabled={isLoading || !code.trim()}
            size="sm"
            className="shrink-0"
          >
            {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Apply Code'}
          </Button>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
