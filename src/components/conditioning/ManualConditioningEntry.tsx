import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { ArrowLeft, Check } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useActiveProfile } from '@/hooks/useActiveProfile';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface ManualConditioningEntryProps {
  onBack: () => void;
  onSaved: () => void;
}

const ACTIVITY_TYPES = [
  { value: 'run', label: 'Run' },
  { value: 'sprints', label: 'Sprints' },
  { value: 'other', label: 'Other' },
];

export function ManualConditioningEntry({ onBack, onSaved }: ManualConditioningEntryProps) {
  const { user } = useAuth();
  const { activeProfileId } = useActiveProfile();
  const [activityType, setActivityType] = useState('run');
  const [minutes, setMinutes] = useState('');
  const [seconds, setSeconds] = useState('');
  const [distance, setDistance] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!user) return;
    const totalSeconds = (parseInt(minutes || '0') * 60) + parseInt(seconds || '0');
    if (totalSeconds === 0) { toast.error('Please enter a time'); return; }

    setSaving(true);
    const distMeters = distance ? parseFloat(distance) * 1000 : null;

    const { error } = await (supabase as any).from('conditioning_sessions').insert({
      user_id: user.id,
      profile_id: activeProfileId || null,
      activity_type: activityType,
      elapsed_seconds: totalSeconds,
      total_distance_meters: distMeters,
      verification_status: 'manual_entry',
      is_manual: true,
      notes: notes || null,
    });

    setSaving(false);
    if (error) { console.error('Failed to save:', error); toast.error('Failed to save'); return; }
    toast.success('Conditioning logged! 💪');
    onSaved();
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <div className="bg-card border-b border-border px-3 py-2 flex items-center sticky top-0 z-10">
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onBack}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <p className="font-semibold text-sm ml-2">Log Conditioning</p>
      </div>

      <div className="flex-1 px-4 py-6 space-y-5">
        {/* Activity type */}
        <div className="space-y-2">
          <p className="text-sm font-medium">Activity Type</p>
          <div className="flex gap-2">
            {ACTIVITY_TYPES.map(at => (
              <button
                key={at.value}
                onClick={() => setActivityType(at.value)}
                className={cn(
                  "flex-1 py-2.5 rounded-lg border text-sm font-medium transition-all",
                  activityType === at.value
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-card border-border text-muted-foreground hover:bg-accent/50"
                )}
              >
                {at.label}
              </button>
            ))}
          </div>
        </div>

        {/* Time */}
        <div className="space-y-2">
          <p className="text-sm font-medium">Time</p>
          <div className="flex gap-2 items-center">
            <div className="flex-1">
              <Input
                type="number"
                placeholder="Min"
                value={minutes}
                onChange={e => setMinutes(e.target.value)}
                min="0"
                inputMode="numeric"
              />
            </div>
            <span className="text-muted-foreground font-bold">:</span>
            <div className="flex-1">
              <Input
                type="number"
                placeholder="Sec"
                value={seconds}
                onChange={e => setSeconds(e.target.value)}
                min="0"
                max="59"
                inputMode="numeric"
              />
            </div>
          </div>
        </div>

        {/* Distance */}
        <div className="space-y-2">
          <p className="text-sm font-medium">Distance (km) <span className="text-muted-foreground font-normal">— optional</span></p>
          <Input
            type="number"
            placeholder="e.g. 2.5"
            value={distance}
            onChange={e => setDistance(e.target.value)}
            min="0"
            step="0.01"
            inputMode="decimal"
          />
        </div>

        {/* Notes */}
        <div className="space-y-2">
          <p className="text-sm font-medium">Notes <span className="text-muted-foreground font-normal">— optional</span></p>
          <Input
            placeholder="How did it feel?"
            value={notes}
            onChange={e => setNotes(e.target.value)}
          />
        </div>

        {/* Manual entry badge */}
        <Card className="border-border">
          <CardContent className="p-3 flex items-center gap-2 text-xs text-muted-foreground">
            <div className="w-2 h-2 rounded-full bg-muted-foreground" />
            This will be saved as a Manual Entry
          </CardContent>
        </Card>

        <Button
          className="w-full gap-2 h-12 text-base"
          onClick={handleSave}
          disabled={saving}
        >
          <Check className="w-5 h-5" />
          {saving ? 'Saving...' : 'Save'}
        </Button>
      </div>
    </div>
  );
}
