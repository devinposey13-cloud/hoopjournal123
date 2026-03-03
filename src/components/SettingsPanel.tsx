import { useState, useEffect } from 'react';
import { LegalPolicyViewer, PrivacyPolicyContent, TermsOfServiceContent } from '@/components/settings/LegalPolicyViewer';
import { useNavigate, Link } from 'react-router-dom';
import { useTheme } from 'next-themes';
import { PlayerProfile } from '@/types/basketball';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Save, Loader2, Crown, CreditCard, Sun, Moon, Monitor, Trophy, ChevronRight, Star, User, Check, XCircle, Shield, FileText } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { DangerZoneSection } from '@/components/settings/DangerZoneSection';
import { ProfileManagement } from '@/components/settings/ProfileManagement';
import { toast } from 'sonner';
import { FeedbackDialog } from '@/components/FeedbackDialog';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useSubscription } from '@/hooks/useSubscription';
import { usePlan } from '@/hooks/usePlanState';
import { planCatalog, hasSpecialAccess } from '@/lib/plans';
import { useXpProgress } from '@/hooks/useXpProgress';
import { useRingOfHonorEligibility } from '@/hooks/useRingOfHonorEligibility';
import { RingOfHonorOptInModal } from '@/components/xp/RingOfHonorOptInModal';
import { ParentDashboardSettings } from '@/components/settings/ParentDashboardSettings';

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
  const [isCanceling, setIsCanceling] = useState(false);
  
  const { isSubscribed, planType, subscriptionEnd, subscriptionStatus, billingCycle, cancelAtPeriodEnd, isLoading: subLoading, openCustomerPortal, cancelSubscription } = useSubscription();
  const { currentPlan, accessInfo, accessBadge, loading: planLoading } = usePlan();
  const { theme, setTheme } = useTheme();
  const { progress: xpProgress } = useXpProgress();
  const ringOfHonorEligibility = useRingOfHonorEligibility(xpProgress?.current_level || 1);
  const [showRingOfHonorModal, setShowRingOfHonorModal] = useState(false);
  const [showPrivacyPolicy, setShowPrivacyPolicy] = useState(false);
  const [showTermsOfService, setShowTermsOfService] = useState(false);

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

          {/* Profile Management (only shows for multi-profile users) */}
          <ProfileManagement />

          {/* Theme Music URL */}
          <div className="space-y-2">
            <Label htmlFor="themeMusicUrl" className="flex items-center gap-2">
              Pregame Music
              <span className="flex items-center gap-1.5">
                {/* Spotify Icon */}
                <svg className="w-4 h-4 text-green-500" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/>
                </svg>
                {/* SoundCloud Icon */}
                <svg className="w-4 h-4 text-orange-500" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M1.175 12.225c-.051 0-.094.046-.101.1l-.233 2.154.233 2.105c.007.058.05.098.101.098.05 0 .09-.04.099-.098l.255-2.105-.27-2.154c-.009-.06-.052-.1-.102-.1m-.899.828c-.06 0-.091.037-.104.094L0 14.479l.165 1.308c.014.057.045.09.111.09.057 0 .104-.033.11-.09l.195-1.308-.195-1.332c-.007-.06-.053-.094-.11-.094m1.83-1.229c-.061 0-.12.045-.12.104l-.21 2.563.225 2.458c0 .06.045.104.106.104.061 0 .12-.044.12-.104l.24-2.458-.24-2.563c0-.06-.045-.104-.121-.104m.945-.089c-.075 0-.135.06-.15.135l-.193 2.64.21 2.544c.016.075.075.135.15.135.074 0 .149-.06.15-.135l.225-2.544-.225-2.64c-.016-.075-.075-.135-.15-.135m1.065.412c-.09 0-.181.075-.181.165l-.165 2.198.18 2.514c0 .09.09.165.18.165.091 0 .181-.075.181-.165l.21-2.514-.21-2.198c0-.09-.09-.165-.18-.165m.96-.285c-.105 0-.196.09-.196.196l-.15 2.287.15 2.499c.015.105.09.18.195.18s.195-.075.195-.18l.164-2.499-.164-2.287c0-.105-.09-.196-.195-.196m1.035-.195c-.12 0-.225.105-.225.225l-.135 2.287.135 2.47c0 .12.105.225.225.225.12 0 .225-.105.225-.225l.15-2.47-.15-2.287c0-.12-.105-.225-.225-.225m1.035.075c-.135 0-.24.12-.24.24l-.12 2.182.12 2.438c0 .135.105.24.24.24.135 0 .24-.105.24-.24l.135-2.438-.135-2.182c0-.135-.105-.24-.24-.24m1.05-.48c-.15 0-.27.12-.27.27l-.09 2.392.105 2.413c0 .15.12.27.27.27.135 0 .255-.12.255-.27l.12-2.413-.12-2.392c-.015-.15-.135-.27-.27-.27m1.065.165c-.165 0-.285.135-.285.285l-.075 2.227.09 2.393c0 .165.12.285.285.285.15 0 .285-.12.285-.285l.09-2.393-.09-2.227c0-.15-.135-.285-.285-.285m1.11-.615c-.18 0-.315.135-.315.315l-.06 2.527.06 2.378c0 .18.135.315.315.315.165 0 .315-.135.315-.315l.075-2.378-.075-2.527c0-.18-.15-.315-.315-.315m1.14.09c-.195 0-.345.15-.345.33l-.045 2.407.045 2.363c.015.195.165.33.345.33.195 0 .345-.15.345-.345l.06-2.348-.06-2.392c0-.195-.15-.345-.345-.345m1.125-.375c-.195 0-.375.18-.375.375l-.03 2.692.03 2.317c.015.21.165.375.375.375.195 0 .375-.165.375-.375l.045-2.317-.045-2.692c0-.21-.18-.375-.375-.375m1.155.465c-.21 0-.39.18-.39.39l-.015 1.852.015 2.303c.015.21.18.39.39.39.21 0 .39-.18.39-.39l.03-2.303-.03-1.852c0-.21-.18-.39-.39-.39m1.14-.63c-.225 0-.405.18-.42.405l-.015 2.482.015 2.273c.015.225.195.405.42.405.225 0 .405-.18.405-.405l.03-2.273-.03-2.482c-.015-.225-.18-.405-.405-.405m1.095.63c-.225 0-.42.195-.42.42v2.061c0 .015.015 2.243.015 2.243 0 .225.195.42.42.42.21 0 .405-.195.42-.42l.015-2.258-.015-2.046c-.015-.24-.21-.42-.435-.42m1.11-.195c-.24 0-.435.21-.435.435l-.015 2.256.015 2.228c.015.24.21.435.435.435.24 0 .435-.195.435-.435l.015-2.228-.015-2.256c0-.225-.195-.435-.435-.435m1.14.78c-.24 0-.45.21-.45.45v1.481l.015 2.198c.015.255.21.45.435.45.24 0 .435-.195.45-.45v-3.679c-.015-.24-.21-.45-.45-.45m1.125-.855c-.255 0-.45.21-.45.45l-.015 2.791.015 2.168c.015.24.21.45.45.45.255 0 .45-.21.45-.45l.015-2.168-.015-2.791c0-.24-.195-.45-.45-.45m1.125 1.185c-.255 0-.465.21-.465.465v1.156l.015 2.138c.015.255.21.465.45.465.255 0 .465-.21.465-.465V13.53c0-.255-.21-.465-.465-.465m1.08-.99c-.255 0-.48.225-.48.48l-.015 2.631.015 2.123c.015.255.225.465.48.465.255 0 .48-.21.48-.465l.015-2.123-.015-2.631c0-.255-.225-.48-.48-.48m1.095.69c-.27 0-.495.225-.495.495v1.946l.015 2.093c.015.27.225.495.48.495.27 0 .495-.225.495-.495l.015-2.108-.015-1.931c0-.27-.225-.495-.495-.495m2.715-1.14c-.375 0-.72.09-1.035.27-.12-.93-.54-1.77-1.185-2.4-.66-.645-1.545-1.02-2.535-1.11-.3-.03-.585.105-.72.345-.015 0-.015.015-.015.015-.135.24-.135.555.015.78.12.195.33.315.555.33.615.045 1.17.285 1.605.69.435.405.72.945.795 1.545.045.375.27.705.6.87.15.075.315.105.48.105H21c1.095 0 2.01-.795 2.19-1.845.015-.12.03-.24.03-.36 0-1.245-1.005-2.235-2.22-2.235"/>
                </svg>
              </span>
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
            {subLoading ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                <span className="ml-2 text-sm text-muted-foreground">Loading plan…</span>
              </div>
            ) : isSubscribed && planType ? (
              <>
                {/* Subscribed state */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Crown className="w-5 h-5 text-yellow-500" />
                    <div>
                      <p className="font-semibold">
                        {planCatalog[planType]?.name || 'Pro'} Plan
                      </p>
                      <p className="text-xs text-muted-foreground">
                        ${billingCycle === 'year'
                          ? `${planCatalog[planType]?.yearlyPrice}/yr`
                          : `${planCatalog[planType]?.monthlyPrice}/mo`}
                        {' · '}
                        {billingCycle === 'year' ? 'Yearly' : 'Monthly'}
                      </p>
                    </div>
                  </div>
                  <Badge className={
                    cancelAtPeriodEnd
                      ? 'bg-orange-500/10 text-orange-600 border-orange-500/20'
                      : 'bg-green-500/10 text-green-600 border-green-500/20'
                  }>
                    {cancelAtPeriodEnd ? 'Canceling' : 'Active'}
                  </Badge>
                </div>

                {subscriptionEnd && (
                  <div className="text-sm text-muted-foreground bg-background/50 rounded-md px-3 py-2 border border-border">
                    {cancelAtPeriodEnd
                      ? `Access ends ${new Date(subscriptionEnd).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}`
                      : `Next payment: ${new Date(subscriptionEnd).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}`
                    }
                  </div>
                )}

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={async () => {
                      setIsLoadingPortal(true);
                      try { await openCustomerPortal(); }
                      catch { toast.error('Failed to open billing portal'); }
                      finally { setIsLoadingPortal(false); }
                    }}
                    disabled={isLoadingPortal}
                  >
                    {isLoadingPortal ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <CreditCard className="w-4 h-4 mr-2" />}
                    Manage
                  </Button>

                  {!cancelAtPeriodEnd && (
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="outline" className="flex-1 text-destructive border-destructive/30 hover:bg-destructive/10">
                          <XCircle className="w-4 h-4 mr-2" />
                          Cancel
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Cancel Subscription?</AlertDialogTitle>
                          <AlertDialogDescription>
                            Your plan will remain active until {subscriptionEnd ? new Date(subscriptionEnd).toLocaleDateString() : 'the end of the billing period'}. After that, you'll be moved to the Free plan.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Keep Plan</AlertDialogCancel>
                          <AlertDialogAction
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            onClick={async () => {
                              setIsCanceling(true);
                              try {
                                await cancelSubscription(false);
                                toast.success('Subscription will cancel at end of billing period');
                              } catch {
                                toast.error('Failed to cancel subscription');
                              } finally {
                                setIsCanceling(false);
                              }
                            }}
                            disabled={isCanceling}
                          >
                            {isCanceling ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                            Cancel Subscription
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  )}
                </div>
              </>
            ) : hasSpecialAccess(accessInfo) ? (
              <>
                {/* Special access state (grandfathered, admin override, promo) */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Crown className="w-5 h-5 text-yellow-500" />
                    <div>
                      <p className="font-semibold">
                        {planCatalog[currentPlan]?.name || 'Elite'} Plan
                      </p>
                      {accessBadge && (
                        <p className="text-xs text-muted-foreground">
                          {accessBadge.label}
                        </p>
                      )}
                    </div>
                  </div>
                  <Badge className="bg-yellow-500/10 text-yellow-600 border-yellow-500/20">
                    {accessBadge?.type === 'grandfathered' ? '⭐ Founding Member' : accessBadge?.label || 'Active'}
                  </Badge>
                </div>

                <div className="text-sm text-muted-foreground bg-background/50 rounded-md px-3 py-2 border border-border">
                  {accessBadge?.type === 'grandfathered'
                    ? 'You have lifetime Elite access as an early supporter. Thank you! 🏀'
                    : accessBadge?.type === 'promo_locked'
                      ? 'Elite access locked in while your Starter subscription is active. 🏀'
                      : 'Your access has been granted by an administrator.'}
                </div>

                <ul className="space-y-1.5 text-sm text-muted-foreground pl-1">
                  {planCatalog[currentPlan]?.features
                    .filter(f => f.included)
                    .slice(0, 4)
                    .map((f, i) => (
                      <li key={i} className="flex items-center gap-2">
                        <span className="text-yellow-500">✓</span> {f.label}
                      </li>
                    ))}
                </ul>
              </>
            ) : (
              <>
                {/* Free plan state */}
                <div className="flex items-center gap-2">
                  <Crown className="w-5 h-5 text-muted-foreground" />
                  <div>
                    <p className="font-semibold">Free Plan</p>
                    <p className="text-xs text-muted-foreground">{planCatalog.free.tagline}</p>
                  </div>
                </div>

                <ul className="space-y-1.5 text-sm text-muted-foreground pl-1">
                  <li className="flex items-center gap-2">
                    <span className="text-primary">•</span> 2 AI Recaps / month
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-primary">•</span> 30-day game history
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-primary">•</span> Level 10 XP cap
                  </li>
                </ul>

                <Button
                  className="w-full gradient-primary font-semibold"
                  onClick={() => navigate('/pricing')}
                >
                  <Star className="w-4 h-4 mr-2" />
                  Upgrade to unlock more
                </Button>
              </>
            )}
          </div>

          {/* Parent Dashboard Section */}
          <ParentDashboardSettings />

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

          {/* Legal Section */}
          <Separator className="my-6" />
          
          <div className="space-y-2">
            <Label className="text-sm font-medium">Legal</Label>
            <button
              onClick={() => setShowPrivacyPolicy(true)}
              className="w-full stat-card bg-secondary/30 p-4 rounded-lg hover:bg-secondary/50 transition-colors text-left"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Shield className="w-5 h-5 text-muted-foreground" />
                  <span className="text-sm font-medium text-foreground">Privacy Policy</span>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground" />
              </div>
            </button>
            <button
              onClick={() => setShowTermsOfService(true)}
              className="w-full stat-card bg-secondary/30 p-4 rounded-lg hover:bg-secondary/50 transition-colors text-left"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <FileText className="w-5 h-5 text-muted-foreground" />
                  <span className="text-sm font-medium text-foreground">Terms of Service</span>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground" />
              </div>
            </button>
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
            <div className="text-center pt-2">
              <p className="text-xs text-muted-foreground">
                Or reach us directly at{' '}
                <a 
                  href="mailto:support@hoopjournal.me" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  onClick={(e) => {
                    e.stopPropagation();
                    window.open('mailto:support@hoopjournal.me', '_blank');
                  }}
                  className="text-primary hover:underline font-medium"
                >
                  support@hoopjournal.me
                </a>
              </p>
            </div>
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

      {/* Legal Policy Modals */}
      <LegalPolicyViewer
        open={showPrivacyPolicy}
        onClose={() => setShowPrivacyPolicy(false)}
        title="Privacy Policy"
        lastUpdated="March 3, 2026"
        policyType="privacy_policy"
      >
        <PrivacyPolicyContent />
      </LegalPolicyViewer>

      <LegalPolicyViewer
        open={showTermsOfService}
        onClose={() => setShowTermsOfService(false)}
        title="Terms of Service"
        lastUpdated="March 3, 2026"
        policyType="terms_of_service"
      >
        <TermsOfServiceContent />
      </LegalPolicyViewer>
    </div>
  );
}
