import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
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
import { Save, Camera, Loader2, User, Copy, ExternalLink, AtSign, Check, X, Crown, CreditCard } from 'lucide-react';
import { toast } from 'sonner';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { FeedbackDialog } from '@/components/FeedbackDialog';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useSubscription } from '@/hooks/useSubscription';

interface SettingsPanelProps {
  profile: PlayerProfile;
  onUpdateProfile: (updates: Partial<PlayerProfile>) => void;
  onUploadAvatar?: (file: File) => Promise<string | null>;
}

const positions = ['Point Guard', 'Shooting Guard', 'Small Forward', 'Power Forward', 'Center', 'Guard', 'Forward'];
const grades = ['1st Grade', '2nd Grade', '3rd Grade', '4th Grade', '5th Grade', '6th Grade', '7th Grade', '8th Grade', '9th Grade', '10th Grade', '11th Grade', '12th Grade'];

export function SettingsPanel({ profile, onUpdateProfile, onUploadAvatar }: SettingsPanelProps) {
  const navigate = useNavigate();
  const [formData, setFormData] = useState(profile);
  const [isUploading, setIsUploading] = useState(false);
  const [newUsername, setNewUsername] = useState('');
  const [usernameError, setUsernameError] = useState('');
  const [isCheckingUsername, setIsCheckingUsername] = useState(false);
  const [isClaimingUsername, setIsClaimingUsername] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [isLoadingPortal, setIsLoadingPortal] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const { isSubscribed, planType, subscriptionEnd, isLoading: subLoading, openCustomerPortal } = useSubscription();

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
            <p className="text-sm text-muted-foreground">
              Click to upload a profile photo
            </p>
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

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="team">Team Name</Label>
              <Input
                id="team"
                value={formData.team}
                onChange={(e) => setFormData({ ...formData, team: e.target.value })}
                placeholder="Enter team name"
              />
            </div>
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

          <Button onClick={handleSave} className="w-full gradient-primary font-semibold mt-6">
            <Save className="w-4 h-4 mr-2" />
            Save Profile
          </Button>

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
        </div>
      </div>
    </div>
  );
}
