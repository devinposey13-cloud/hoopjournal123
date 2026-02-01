import { useState, useRef, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useTheme } from 'next-themes';
import { PlayerProfile } from '@/types/basketball';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Save, Camera, Loader2, User, Copy, ExternalLink, AtSign, Check, X, Crown, CreditCard, Trash2, Sun, Moon, Monitor, Trophy, ChevronRight, Star } from 'lucide-react';
import { DangerZoneSection } from '@/components/settings/DangerZoneSection';
import { TeamsManagement } from '@/components/settings/TeamsManagement';
import { toast } from 'sonner';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { FeedbackDialog } from '@/components/FeedbackDialog';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useSubscription } from '@/hooks/useSubscription';
import { AvatarGenerator } from '@/components/AvatarGenerator';
import { useXpProgress } from '@/hooks/useXpProgress';
import { useRingOfHonorEligibility } from '@/hooks/useRingOfHonorEligibility';
import { RingOfHonorOptInModal } from '@/components/xp/RingOfHonorOptInModal';
import { getQuarterString } from '@/utils/quarterUtils';

interface SettingsPanelProps {
  profile: PlayerProfile;
  onUpdateProfile: (updates: Partial<PlayerProfile>) => void;
  onUploadAvatar?: (file: File) => Promise<string | null>;
  onStartOver?: () => void;
}

const positions = ['Point Guard', 'Shooting Guard', 'Small Forward', 'Power Forward', 'Center', 'Guard', 'Forward'];
const grades = ['1st Grade', '2nd Grade', '3rd Grade', '4th Grade', '5th Grade', '6th Grade', '7th Grade', '8th Grade', '9th Grade', '10th Grade', '11th Grade', '12th Grade'];

export function SettingsPanel({ profile, onUpdateProfile, onUploadAvatar, onStartOver }: SettingsPanelProps) {
  const navigate = useNavigate();
  const [formData, setFormData] = useState(profile);
  
  // Sync formData with profile prop when it changes externally (e.g., avatar deleted from dashboard)
  useEffect(() => {
    setFormData(profile);
  }, [profile]);
  const [isUploading, setIsUploading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [newUsername, setNewUsername] = useState('');
  const [usernameError, setUsernameError] = useState('');
  const [isCheckingUsername, setIsCheckingUsername] = useState(false);
  const [isClaimingUsername, setIsClaimingUsername] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [isLoadingPortal, setIsLoadingPortal] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
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

  const validateUsername = (value: string) => {
    const cleaned = value.toLowerCase().replace(/[^a-z0-9]/g, '');
    setNewUsername(cleaned);
    
    if (cleaned.length === 0) {
      setUsernameError('');
    } else if (cleaned.length < 3) {
      setUsernameError('Username must be at least 3 characters');
    } else if (cleaned.length > 20) {
      setUsernameError('Username must be 20 characters or less');
    } else {
      setUsernameError('');
    }
  };

  const checkUsernameAvailable = async (usernameToCheck: string): Promise<boolean> => {
    const { data } = await (supabase as any)
      .from('player_settings')
      .select('username')
      .eq('username', usernameToCheck)
      .maybeSingle();
    return !data;
  };

  const handleClaimUsername = async () => {
    if (newUsername.length < 3) {
      setUsernameError('Username must be at least 3 characters');
      return;
    }

    if (!userId) {
      toast.error('Please log in to claim a username');
      return;
    }

    setIsCheckingUsername(true);
    try {
      const isAvailable = await checkUsernameAvailable(newUsername);
      if (!isAvailable) {
        setUsernameError('Username is already taken');
        return;
      }

      setIsClaimingUsername(true);
      // Update the username in the database
      const { error } = await (supabase as any)
        .from('player_settings')
        .update({ username: newUsername })
        .eq('user_id', userId);

      if (error) throw error;

      // Update local state
      setFormData(prev => ({ ...prev, username: newUsername }));
      onUpdateProfile({ username: newUsername });
      setNewUsername('');
      toast.success('Username claimed successfully!');
    } catch (error: any) {
      toast.error(error.message || 'Failed to claim username');
    } finally {
      setIsCheckingUsername(false);
      setIsClaimingUsername(false);
    }
  };

  const handleSave = () => {
    onUpdateProfile(formData);
    toast.success('Profile updated successfully!');
  };

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !onUploadAvatar) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image must be less than 5MB');
      return;
    }

    setIsUploading(true);
    try {
      const avatarUrl = await onUploadAvatar(file);
      if (avatarUrl) {
        setFormData(prev => ({ ...prev, avatar: avatarUrl }));
      }
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleDeleteAvatar = async () => {
    if (!formData.avatar || !userId) return;
    
    setIsDeleting(true);
    try {
      // Extract the file path from the URL if it's a Supabase storage URL
      const avatarUrl = formData.avatar;
      if (avatarUrl.includes('avatars/')) {
        const pathMatch = avatarUrl.match(/avatars\/(.+)$/);
        if (pathMatch) {
          const filePath = pathMatch[1];
          // Try to delete from storage
          await supabase.storage.from('avatars').remove([filePath]);
        }
      }
      
      // Update profile to remove avatar
      setFormData(prev => ({ ...prev, avatar: undefined }));
      onUpdateProfile({ avatar: undefined });
      toast.success('Profile photo removed');
    } catch (error: any) {
      console.error('Error deleting avatar:', error);
      toast.error('Failed to remove photo');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="stat-card">
        <h2 className="text-xl font-bold mb-6">Player Profile</h2>
        
        <div className="space-y-6">
          {/* Avatar Upload */}
          <div className="flex flex-col items-center gap-4">
            <div className="relative group">
              <Avatar className="w-24 h-24 border-2 border-border">
                <AvatarImage src={formData.avatar} alt={formData.name} />
                <AvatarFallback className="bg-muted">
                  <User className="w-10 h-10 text-muted-foreground" />
                </AvatarFallback>
              </Avatar>
              <button
                type="button"
                onClick={handleAvatarClick}
                disabled={isUploading}
                className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
              >
                {isUploading ? (
                  <Loader2 className="w-6 h-6 text-white animate-spin" />
                ) : (
                  <Camera className="w-6 h-6 text-white" />
                )}
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="hidden"
              />
            </div>
            <div className="flex items-center gap-2">
              <p className="text-sm text-muted-foreground">
                Click to upload a profile photo
              </p>
              {formData.avatar && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleDeleteAvatar}
                  disabled={isDeleting}
                  className="text-destructive hover:text-destructive hover:bg-destructive/10 h-7 px-2"
                >
                  {isDeleting ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Trash2 className="w-3.5 h-3.5" />
                  )}
                  <span className="ml-1 text-xs">Remove</span>
                </Button>
              )}
            </div>
            
            {/* AI Avatar Generator */}
            <AvatarGenerator
              currentAvatarUrl={formData.avatar}
              onAvatarGenerated={(newUrl) => {
                setFormData(prev => ({ ...prev, avatar: newUrl }));
                onUpdateProfile({ avatar: newUrl });
              }}
              playerName={formData.name}
            />
          </div>

          {/* Username & Public Profile */}
          <div className="stat-card bg-secondary/30 p-4 rounded-lg space-y-4">
            {/* Public/Private Toggle - Always show */}
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="public-profile" className="text-sm font-medium">
                  Public Profile
                </Label>
                <p className="text-xs text-muted-foreground">
                  {formData.isProfilePublic 
                    ? "Your stats and highlights are visible to others"
                    : "Your profile is private and not accessible to others"
                  }
                </p>
              </div>
              <Switch
                id="public-profile"
                checked={formData.isProfilePublic ?? false}
                onCheckedChange={(checked) => 
                  setFormData({ ...formData, isProfilePublic: checked })
                }
              />
            </div>

            {/* Username Section */}
            {formData.username ? (
              // User has a username - show their URL if public
              <div>
                <Label className="text-sm font-medium">Your Profile URL</Label>
                {formData.isProfilePublic ? (
                  <div className="flex items-center gap-2 mt-1">
                    <code className="text-sm bg-muted px-2 py-1 rounded">
                      hoopjournal.me/{formData.username}
                    </code>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => {
                        navigator.clipboard.writeText(`${window.location.origin}/${formData.username}`);
                        toast.success('Link copied!');
                      }}
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </Button>
                    <a 
                      href={`/${formData.username}`} 
                      target="_blank" 
                      rel="noopener noreferrer"
                    >
                      <Button variant="ghost" size="icon" className="h-7 w-7">
                        <ExternalLink className="w-3.5 h-3.5" />
                      </Button>
                    </a>
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground mt-1">
                    Your username is <strong>{formData.username}</strong>, but your profile is private. 
                    Enable "Public Profile" above to make it accessible.
                  </p>
                )}
              </div>
            ) : (
              // User doesn't have a username - let them claim one
              <div className="space-y-2">
                <Label htmlFor="claim-username" className="text-sm font-medium">
                  Claim Your Profile URL
                </Label>
                <p className="text-xs text-muted-foreground">
                  Choose a unique username to create your public profile page
                </p>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <AtSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="claim-username"
                      type="text"
                      value={newUsername}
                      onChange={(e) => validateUsername(e.target.value)}
                      placeholder="username"
                      className="pl-9"
                      maxLength={20}
                    />
                  </div>
                  <Button
                    onClick={handleClaimUsername}
                    disabled={newUsername.length < 3 || !!usernameError || isCheckingUsername || isClaimingUsername}
                    size="sm"
                  >
                    {isCheckingUsername || isClaimingUsername ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Check className="w-4 h-4" />
                    )}
                  </Button>
                </div>
                {usernameError && (
                  <p className="text-xs text-destructive flex items-center gap-1">
                    <X className="w-3 h-3" />
                    {usernameError}
                  </p>
                )}
                {newUsername.length >= 3 && !usernameError && (
                  <p className="text-xs text-muted-foreground">
                    Your profile will be: hoopjournal.me/{newUsername}
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Display Name for Privacy */}
          <div className="space-y-2">
            <Label htmlFor="displayName">
              Display Name
              <span className="text-muted-foreground text-xs ml-1">(shown on comments)</span>
            </Label>
            <Input
              id="displayName"
              value={formData.displayName || ''}
              onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
              placeholder="e.g., HoopStar23"
              maxLength={30}
            />
            <p className="text-xs text-muted-foreground">
              This name will be displayed instead of your real name when you comment on videos.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Player Name</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Enter player name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="number">Jersey Number</Label>
              <Input
                id="number"
                type="number"
                min={0}
                max={99}
                value={formData.number}
                onChange={(e) => setFormData({ ...formData, number: parseInt(e.target.value) || 0 })}
              />
            </div>
          </div>

          {/* Teams Management */}
          <div className="stat-card bg-secondary/30 p-4 rounded-lg">
            <TeamsManagement />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="position">Position</Label>
              <Select
                value={formData.position}
                onValueChange={(value) => setFormData({ ...formData, position: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select position" />
                </SelectTrigger>
                <SelectContent>
                  {positions.map((pos) => (
                    <SelectItem key={pos} value={pos}>
                      {pos}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="number">Jersey Number</Label>
              <Input
                id="number"
                type="number"
                min={0}
                max={99}
                value={formData.number}
                onChange={(e) => setFormData({ ...formData, number: parseInt(e.target.value) || 0 })}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="height">Height</Label>
              <Input
                id="height"
                value={formData.height}
                onChange={(e) => setFormData({ ...formData, height: e.target.value })}
                placeholder="e.g., 5'8"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="grade">Grade</Label>
              <Select
                value={formData.grade}
                onValueChange={(value) => setFormData({ ...formData, grade: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select grade" />
                </SelectTrigger>
                <SelectContent>
                  {grades.map((grade) => (
                    <SelectItem key={grade} value={grade}>
                      {grade}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Theme Music URL */}
          <div className="space-y-2">
            <Label htmlFor="themeMusicUrl">
              Pregame Music
              <span className="text-muted-foreground text-xs ml-1">(Spotify URL)</span>
            </Label>
            <Input
              id="themeMusicUrl"
              value={formData.themeMusicUrl || ''}
              onChange={(e) => setFormData({ ...formData, themeMusicUrl: e.target.value })}
              placeholder="https://open.spotify.com/playlist/..."
            />
            <p className="text-xs text-muted-foreground">
              Paste a Spotify track, album, or playlist URL to play on your pregame page.
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
          </div>

          {/* Instagram URL */}
          <div className="space-y-2">
            <Label htmlFor="instagramUrl">
              Instagram Profile
            </Label>
            <Input
              id="instagramUrl"
              value={formData.instagramUrl || ''}
              onChange={(e) => setFormData({ ...formData, instagramUrl: e.target.value })}
              placeholder="https://instagram.com/username"
            />
            <p className="text-xs text-muted-foreground">
              Link your Instagram profile to display on your dashboard.
            </p>
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
            Save Profile
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
