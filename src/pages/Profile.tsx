import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useCloudData } from '@/hooks/useCloudData';
import { useAdmin } from '@/hooks/useAdmin';
import { useIsMobile } from '@/hooks/use-mobile';
import { Navigation, Tab } from '@/components/Navigation';
import { BottomNavigation } from '@/components/BottomNavigation';
import { DashboardSkeleton } from '@/components/skeletons/DashboardSkeleton';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { AvatarGenerator } from '@/components/AvatarGenerator';
import { TeamsManagement } from '@/components/settings/TeamsManagement';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  Save, Camera, Loader2, User, Copy, ExternalLink, AtSign, Check, X, Trash2, 
  ChevronLeft, Instagram
} from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';

const positions = ['Point Guard', 'Shooting Guard', 'Small Forward', 'Power Forward', 'Center', 'Guard', 'Forward'];
const grades = ['1st Grade', '2nd Grade', '3rd Grade', '4th Grade', '5th Grade', '6th Grade', '7th Grade', '8th Grade', '9th Grade', '10th Grade', '11th Grade', '12th Grade'];

export default function Profile() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { isAdmin } = useAdmin();
  const isMobile = useIsMobile();
  
  const {
    profile,
    seasons,
    activeSeason,
    switchSeason,
    createSeason,
    deleteSeason,
    updateProfile,
    uploadAvatar,
    loading,
  } = useCloudData();

  const [formData, setFormData] = useState(profile);
  const [isUploading, setIsUploading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [newUsername, setNewUsername] = useState('');
  const [usernameError, setUsernameError] = useState('');
  const [isCheckingUsername, setIsCheckingUsername] = useState(false);
  const [isClaimingUsername, setIsClaimingUsername] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sync formData with profile prop
  useEffect(() => {
    if (profile) {
      setFormData(profile);
    }
  }, [profile]);

  // Handle tab change from navigation
  const handleTabChange = (tab: Tab) => {
    if (tab === 'dashboard') {
      navigate('/');
    } else if (tab === 'games') {
      navigate('/log/history');
    } else if (tab === 'stats') {
      navigate('/progress/overview');
    } else {
      navigate('/');
    }
  };

  const handleSeasonChange = (seasonId: string) => {
    switchSeason(seasonId);
  };

  const handleCreateSeason = async (name: string): Promise<void> => {
    await createSeason(name);
  };

  // Redirect if not authenticated
  if (!authLoading && !user) {
    navigate('/');
    return null;
  }

  if (authLoading || loading || !profile) {
    return <DashboardSkeleton />;
  }

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
    const { data } = await supabase
      .from('player_settings')
      .select('username')
      .eq('username', usernameToCheck)
      .maybeSingle();
    return !data;
  };

  const handleClaimUsername = async () => {
    if (newUsername.length < 3 || !user) return;

    setIsCheckingUsername(true);
    try {
      const isAvailable = await checkUsernameAvailable(newUsername);
      if (!isAvailable) {
        setUsernameError('Username is already taken');
        return;
      }

      setIsClaimingUsername(true);
      await updateProfile({ username: newUsername });
      setFormData(prev => ({ ...prev, username: newUsername }));
      setNewUsername('');
      toast.success('Username claimed successfully!');
    } catch (error: any) {
      toast.error(error.message || 'Failed to claim username');
    } finally {
      setIsCheckingUsername(false);
      setIsClaimingUsername(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await updateProfile(formData);
      toast.success('Profile updated successfully!');
    } catch (error) {
      toast.error('Failed to update profile');
    } finally {
      setIsSaving(false);
    }
  };

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !uploadAvatar) return;

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
      const avatarUrl = await uploadAvatar(file);
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
    if (!formData.avatar || !user) return;
    
    setIsDeleting(true);
    try {
      if (formData.avatar.includes('avatars/')) {
        const pathMatch = formData.avatar.match(/avatars\/(.+)$/);
        if (pathMatch) {
          await supabase.storage.from('avatars').remove([pathMatch[1]]);
        }
      }
      
      setFormData(prev => ({ ...prev, avatar: undefined }));
      await updateProfile({ avatar: undefined });
      toast.success('Profile photo removed');
    } catch (error) {
      toast.error('Failed to remove photo');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className={cn("min-h-screen bg-background", isMobile ? "pb-20" : "")}>
      {/* Desktop Navigation */}
      {!isMobile && (
        <Navigation
          activeTab="settings"
          onTabChange={handleTabChange}
          seasons={seasons}
          activeSeason={activeSeason}
          onSeasonChange={handleSeasonChange}
          onCreateSeason={handleCreateSeason}
          onDeleteSeason={deleteSeason}
          isAdmin={isAdmin}
        />
      )}

      {/* Main Content */}
      <div className="container mx-auto px-4 py-6">
        <div className="max-w-2xl mx-auto">
          {/* Header */}
          <div className="flex items-center gap-4 mb-6">
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
              <ChevronLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2">
                <User className="h-6 w-6 text-primary" />
                My Profile
              </h1>
              <p className="text-muted-foreground">Manage your player information</p>
            </div>
          </div>

          <div className="stat-card space-y-6">
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
                  updateProfile({ avatar: newUrl });
                }}
                playerName={formData.name}
              />
            </div>

            {/* Username & Public Profile */}
            <div className="stat-card bg-secondary/30 p-4 rounded-lg space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="public-profile" className="text-sm font-medium">
                    Public Profile
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    {formData.isProfilePublic 
                      ? "Your stats and highlights are visible to others"
                      : "Your profile is private"
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

              {formData.username ? (
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
                      <a href={`/${formData.username}`} target="_blank" rel="noopener noreferrer">
                        <Button variant="ghost" size="icon" className="h-7 w-7">
                          <ExternalLink className="w-3.5 h-3.5" />
                        </Button>
                      </a>
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground mt-1">
                      Your username is <strong>{formData.username}</strong>. Enable "Public Profile" to share.
                    </p>
                  )}
                </div>
              ) : (
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Claim Your Profile URL</Label>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <AtSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        value={newUsername}
                        onChange={(e) => validateUsername(e.target.value)}
                        placeholder="username"
                        className="pl-9"
                        maxLength={20}
                      />
                    </div>
                    <Button
                      onClick={handleClaimUsername}
                      disabled={newUsername.length < 3 || !!usernameError || isCheckingUsername}
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
                      <X className="w-3 h-3" /> {usernameError}
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Display Name */}
            <div className="space-y-2">
              <Label htmlFor="displayName">
                Display Name <span className="text-muted-foreground text-xs">(shown on comments)</span>
              </Label>
              <Input
                id="displayName"
                value={formData.displayName || ''}
                onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
                placeholder="e.g., HoopStar23"
                maxLength={30}
              />
            </div>

            {/* Basic Info */}
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

            {/* Teams */}
            <div className="stat-card bg-secondary/30 p-4 rounded-lg">
              <TeamsManagement />
            </div>

            {/* Position & Grade */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Position</Label>
                <Select
                  value={formData.position}
                  onValueChange={(value) => setFormData({ ...formData, position: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select position" />
                  </SelectTrigger>
                  <SelectContent>
                    {positions.map((pos) => (
                      <SelectItem key={pos} value={pos}>{pos}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Grade</Label>
                <Select
                  value={formData.grade}
                  onValueChange={(value) => setFormData({ ...formData, grade: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select grade" />
                  </SelectTrigger>
                  <SelectContent>
                    {grades.map((g) => (
                      <SelectItem key={g} value={g}>{g}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Height */}
            {/* Height */}
            <div className="space-y-2">
              <Label htmlFor="height">Height</Label>
              <Input
                id="height"
                value={formData.height}
                onChange={(e) => setFormData({ ...formData, height: e.target.value })}
                placeholder={'e.g., 5\'10"'}
              />
            </div>

            {/* Instagram */}
            <div className="space-y-2">
              <Label htmlFor="instagram" className="flex items-center gap-2">
                <Instagram className="w-4 h-4" />
                Instagram URL
              </Label>
              <Input
                id="instagram"
                value={formData.instagramUrl || ''}
                onChange={(e) => setFormData({ ...formData, instagramUrl: e.target.value })}
                placeholder="https://instagram.com/yourusername"
              />
              <p className="text-xs text-muted-foreground">
                Only visible on public profiles for players in 9th grade or above.
              </p>
            </div>

            {/* Save Button */}
            <Button onClick={handleSave} disabled={isSaving} className="w-full">
              {isSaving ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Save className="w-4 h-4 mr-2" />
              )}
              Save Changes
            </Button>
          </div>
        </div>
      </div>

      {/* Mobile Bottom Navigation */}
      {isMobile && (
        <BottomNavigation
          activeTab="settings"
          onTabChange={handleTabChange}
          seasons={seasons}
          activeSeason={activeSeason}
          onSeasonChange={handleSeasonChange}
          onCreateSeason={handleCreateSeason}
          onDeleteSeason={deleteSeason}
          isAdmin={isAdmin}
        />
      )}
    </div>
  );
}
