import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useTheme } from 'next-themes';
import { PlayerProfile } from '@/types/basketball';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Save, Loader2, Crown, CreditCard, Sun, Moon, Monitor, Trophy, ChevronRight, Star, User, Check } from 'lucide-react';
import { DangerZoneSection } from '@/components/settings/DangerZoneSection';
import { toast } from 'sonner';
import { FeedbackDialog } from '@/components/FeedbackDialog';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useSubscription } from '@/hooks/useSubscription';
import { useXpProgress } from '@/hooks/useXpProgress';
import { useRingOfHonorEligibility } from '@/hooks/useRingOfHonorEligibility';
import { RingOfHonorOptInModal } from '@/components/xp/RingOfHonorOptInModal';

interface SettingsPanelProps {
  profile: PlayerProfile;
  onUpdateProfile: (updates: Partial<PlayerProfile>) => void;
  onUploadAvatar?: (file: File) => Promise<string | null>;
  onStartOver?: () => void;
}

export function SettingsPanel({ profile, onUpdateProfile, onStartOver }: SettingsPanelProps) {
  const navigate = useNavigate();
  const [formData, setFormData] = useState(profile);
  
  // Sync formData with profile prop when it changes externally
  useEffect(() => {
    setFormData(profile);
  }, [profile]);

  const [userId, setUserId] = useState<string | null>(null);
  const [isLoadingPortal, setIsLoadingPortal] = useState(false);
  
  const { isSubscribed, planType, subscriptionEnd, isLoading: subLoading, openCustomerPortal } = useSubscription();
  const { theme, setTheme } = useTheme();
  const { progress: xpProgress } = useXpProgress();
  const ringOfHonorEligibility = useRingOfHonorEligibility(xpProgress?.current_level || 1);
  const [showRingOfHonorModal, setShowRingOfHonorModal] = useState(false);

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) setUserId(user.id);
    };
    getUser();
  }, []);

  const handleSave = () => {
    onUpdateProfile(formData);
    toast.success('Settings updated successfully!');
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="stat-card">
        <h2 className="text-xl font-bold mb-6">Settings</h2>
        
        <div className="space-y-6">
          {/* Link to Profile Page */}
          <Link to="/profile">
            <div className="stat-card bg-secondary/30 p-4 rounded-lg hover:bg-secondary/50 transition-colors cursor-pointer">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <User className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium">My Profile</p>
                    <p className="text-xs text-muted-foreground">
                      Manage your player info, avatar, teams & public profile
                    </p>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-muted-foreground" />
              </div>
            </div>
          </Link>

          {/* Theme Music URL */}
          <div className="space-y-2">
            <Label htmlFor="themeMusicUrl">
              Pregame Music
              <span className="text-muted-foreground text-xs ml-1">(Spotify or SoundCloud)</span>
            </Label>
            <Input
              id="themeMusicUrl"
              value={formData.themeMusicUrl || ''}
              onChange={(e) => setFormData({ ...formData, themeMusicUrl: e.target.value })}
              placeholder="https://open.spotify.com/... or https://soundcloud.com/..."
            />
            <p className="text-xs text-muted-foreground">
              Paste a Spotify or SoundCloud URL (track, album, or playlist) to play on your pregame page.
            </p>
          </div>

          {/* Coach AI Persona */}
          <Separator className="my-6" />
          
          <div className="stat-card bg-secondary/30 p-4 rounded-lg space-y-4">
            <h3 className="text-sm font-semibold flex items-center gap-2">
              🏀 Coach AI Persona
            </h3>
            <p className="text-xs text-muted-foreground">
              Choose how Coach AI communicates with you. This affects chat, recaps, and all coaching feedback.
            </p>
            <div className="grid grid-cols-1 gap-2">
              {[
                { id: 'calm_mentor', label: 'Calm Mentor', emoji: '🧘', desc: 'Patient guidance with gentle encouragement' },
                { id: 'tough_coach', label: 'Tough Coach', emoji: '💪', desc: 'Direct, no-nonsense feedback that pushes you' },
                { id: 'analyst', label: 'Analyst', emoji: '📊', desc: 'Data-driven insights focused on numbers' },
                { id: 'motivator', label: 'Motivator', emoji: '🔥', desc: 'High-energy hype and constant encouragement' },
                { id: 'parent_friendly', label: 'Parent-Friendly', emoji: '❤️', desc: 'Warm, supportive tone perfect for younger players' },
              ].map((persona) => (
                <button
                  key={persona.id}
                  type="button"
                  onClick={() => setFormData({ ...formData, coachPersona: persona.id })}
                  className={`flex items-center gap-3 p-3 rounded-lg border-2 transition-all text-left ${
                    (formData.coachPersona || 'calm_mentor') === persona.id
                      ? 'border-primary bg-primary/10'
                      : 'border-border hover:border-primary/50'
                  }`}
                >
                  <span className="text-xl">{persona.emoji}</span>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm">{persona.label}</p>
                    <p className="text-xs text-muted-foreground truncate">{persona.desc}</p>
                  </div>
                  {(formData.coachPersona || 'calm_mentor') === persona.id && (
                    <Check className="w-4 h-4 text-primary flex-shrink-0" />
                  )}
                </button>
              ))}
            </div>

            {/* Coach Voice Gender Toggle */}
            <div className="flex items-center justify-between pt-4 border-t border-border">
              <div>
                <Label className="text-sm font-medium">Coach Voice</Label>
                <p className="text-xs text-muted-foreground">
                  {formData.coachVoiceGender === 'female' 
                    ? 'Sarah - Warm, encouraging female voice' 
                    : 'Brian - Confident, energetic male voice'}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className={`text-xs ${formData.coachVoiceGender !== 'female' ? 'text-primary font-medium' : 'text-muted-foreground'}`}>
                  Male
                </span>
                <Switch
                  checked={formData.coachVoiceGender === 'female'}
                  onCheckedChange={(checked) => 
                    setFormData({ ...formData, coachVoiceGender: checked ? 'female' : 'male' })
                  }
                />
                <span className={`text-xs ${formData.coachVoiceGender === 'female' ? 'text-primary font-medium' : 'text-muted-foreground'}`}>
                  Female
                </span>
              </div>
            </div>
          </div>

          {/* Family Sharing Section */}
          <Separator className="my-6" />
          
          <div className="stat-card bg-secondary/30 p-4 rounded-lg space-y-4">
            <h3 className="text-sm font-semibold flex items-center gap-2">
              📧 Game Recap Sharing
            </h3>
            
            {/* Parent Email */}
            <div className="space-y-2">
              <Label htmlFor="parentEmail">Parent/Guardian Email</Label>
              <Input
                id="parentEmail"
                type="email"
                value={formData.parentEmail || ''}
                onChange={(e) => setFormData({ ...formData, parentEmail: e.target.value })}
                placeholder="parent@email.com"
              />
              <p className="text-xs text-muted-foreground">
                Share your game recaps with a parent or guardian. They'll receive an email when you click "Share with Family" after a game.
              </p>
            </div>

            {/* Self Email Notification Toggle */}
            <div className="flex items-center justify-between pt-2">
              <div>
                <Label htmlFor="receive-summaries" className="text-sm font-medium">
                  Send me game summaries
                </Label>
                <p className="text-xs text-muted-foreground">
                  Receive your Coach AI recaps directly to your email
                </p>
              </div>
              <Switch
                id="receive-summaries"
                checked={formData.receiveGameSummaries ?? false}
                onCheckedChange={(checked) => 
                  setFormData({ ...formData, receiveGameSummaries: checked })
                }
              />
            </div>
          </div>

          <Button onClick={handleSave} className="w-full gradient-primary font-semibold mt-6">
            <Save className="w-4 h-4 mr-2" />
            Save Settings
          </Button>

          {/* Appearance Section */}
          <Separator className="my-6" />
          
          <div className="space-y-3">
            <Label className="text-sm font-medium">Appearance</Label>
            <div className="flex gap-2">
              <Button
                variant={theme === 'light' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setTheme('light')}
                className="flex-1"
              >
                <Sun className="w-4 h-4 mr-2" />
                Light
              </Button>
              <Button
                variant={theme === 'dark' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setTheme('dark')}
                className="flex-1"
              >
                <Moon className="w-4 h-4 mr-2" />
                Dark
              </Button>
              <Button
                variant={theme === 'system' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setTheme('system')}
                className="flex-1"
              >
                <Monitor className="w-4 h-4 mr-2" />
                System
              </Button>
            </div>
          </div>

          {/* Subscription Section */}
          <Separator className="my-6" />
          
          <div className="stat-card bg-secondary/30 p-4 rounded-lg space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Crown className={`w-5 h-5 ${isSubscribed ? 'text-yellow-500' : 'text-muted-foreground'}`} />
                <div>
                  <p className="font-medium">
                    {subLoading ? 'Loading...' : isSubscribed ? 'Pro Member' : 'Free Plan'}
                  </p>
                  {isSubscribed && subscriptionEnd && (
                    <p className="text-xs text-muted-foreground">
                      {planType === 'annual' ? 'Annual' : 'Monthly'} • Renews {new Date(subscriptionEnd).toLocaleDateString()}
                    </p>
                  )}
                </div>
              </div>
              {isSubscribed && (
                <Badge className="bg-green-500/10 text-green-600 border-green-500/20">
                  Active
                </Badge>
              )}
            </div>
            
            <div className="flex gap-2">
              {isSubscribed ? (
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={async () => {
                    setIsLoadingPortal(true);
                    try {
                      await openCustomerPortal();
                    } catch (error) {
                      toast.error('Failed to open billing portal');
                    } finally {
                      setIsLoadingPortal(false);
                    }
                  }}
                  disabled={isLoadingPortal}
                >
                  {isLoadingPortal ? (
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  ) : (
                    <CreditCard className="w-4 h-4 mr-2" />
                  )}
                  Manage Subscription
                </Button>
              ) : (
                <Button
                  className="w-full gradient-primary"
                  onClick={() => navigate('/pricing')}
                >
                  <Crown className="w-4 h-4 mr-2" />
                  Upgrade to Pro
                </Button>
              )}
            </div>
          </div>

          {/* Ring of Honor Section */}
          <Separator className="my-6" />
          
          <div className="stat-card bg-gradient-to-r from-amber-500/10 via-yellow-500/10 to-amber-500/10 border border-amber-500/20 p-4 rounded-lg space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-400 to-yellow-600 flex items-center justify-center">
                  <Trophy className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="font-semibold">Ring of Honor</h3>
                  <p className="text-xs text-muted-foreground">
                    {ringOfHonorEligibility.isAlreadyMember 
                      ? "You're a legend! 🏆"
                      : ringOfHonorEligibility.isEligible 
                        ? "You've reached Level 50! Join the legends."
                        : `Reach Level 50 to unlock (Currently Level ${xpProgress?.current_level || 1})`
                    }
                  </p>
                </div>
              </div>
              {ringOfHonorEligibility.isAlreadyMember && (
                <Badge className="bg-amber-500/20 text-amber-600 border-amber-500/30">
                  <Star className="w-3 h-3 mr-1 fill-current" />
                  Member
                </Badge>
              )}
            </div>

            {/* Opt-in Toggle */}
            <div className="flex items-center justify-between p-3 bg-background/50 rounded-lg border border-amber-500/10">
              <div className="flex-1">
                <Label htmlFor="ring-opt-in" className="text-sm font-medium cursor-pointer">
                  Opt-in to Ring of Honor
                </Label>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Allow your avatar and stats to be displayed publicly when you reach Level 50
                </p>
              </div>
              <Switch
                id="ring-opt-in"
                checked={formData.ringOfHonorOptIn ?? false}
                onCheckedChange={(checked) => 
                  setFormData({ ...formData, ringOfHonorOptIn: checked })
                }
              />
            </div>
            
            <div className="flex gap-2">
              {ringOfHonorEligibility.isAlreadyMember ? (
                <Link to="/ring-of-honor" className="w-full">
                  <Button variant="outline" className="w-full border-amber-500/30 hover:bg-amber-500/10">
                    <Trophy className="w-4 h-4 mr-2" />
                    View Ring of Honor
                    <ChevronRight className="w-4 h-4 ml-auto" />
                  </Button>
                </Link>
              ) : ringOfHonorEligibility.isEligible && formData.ringOfHonorOptIn ? (
                <Button
                  className="w-full bg-gradient-to-r from-amber-500 to-yellow-600 hover:from-amber-600 hover:to-yellow-700 text-white"
                  onClick={() => setShowRingOfHonorModal(true)}
                >
                  <Crown className="w-4 h-4 mr-2" />
                  Join the Legends
                </Button>
              ) : (
                <Link to="/ring-of-honor" className="w-full">
                  <Button variant="outline" className="w-full border-amber-500/30 hover:bg-amber-500/10">
                    <Trophy className="w-4 h-4 mr-2" />
                    Preview Ring of Honor
                    <ChevronRight className="w-4 h-4 ml-auto" />
                  </Button>
                </Link>
              )}
            </div>
            
            {ringOfHonorEligibility.isEligible && !formData.ringOfHonorOptIn && !ringOfHonorEligibility.isAlreadyMember && (
              <p className="text-xs text-amber-600 text-center">
                Enable opt-in above to join the Ring of Honor
              </p>
            )}
          </div>

          {/* Feedback Section */}
          <Separator className="my-6" />
          
          <div className="space-y-3">
            <div className="text-center">
              <p className="text-sm font-medium">💬 Have feedback?</p>
              <p className="text-xs text-muted-foreground">
                Help us improve Hoop Journal by sharing your thoughts, ideas, or reporting bugs.
              </p>
            </div>
            <FeedbackDialog />
          </div>

          {/* Danger Zone Section */}
          {userId && (
            <DangerZoneSection userId={userId} onStartOver={onStartOver} />
          )}
        </div>
      </div>

      {/* Ring of Honor Opt-In Modal */}
      {xpProgress && (
        <RingOfHonorOptInModal
          open={showRingOfHonorModal}
          onOpenChange={setShowRingOfHonorModal}
          playerData={{
            displayName: formData.displayName || formData.name,
            avatarUrl: formData.avatar,
          }}
          onSuccess={() => ringOfHonorEligibility.checkEligibility()}
        />
      )}
    </div>
  );
}
