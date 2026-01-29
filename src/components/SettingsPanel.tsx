import { useState, useRef } from 'react';
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
import { Save, Camera, Loader2, User, Copy, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { FeedbackDialog } from '@/components/FeedbackDialog';
import { Separator } from '@/components/ui/separator';

interface SettingsPanelProps {
  profile: PlayerProfile;
  onUpdateProfile: (updates: Partial<PlayerProfile>) => void;
  onUploadAvatar?: (file: File) => Promise<string | null>;
}

const positions = ['Point Guard', 'Shooting Guard', 'Small Forward', 'Power Forward', 'Center', 'Guard', 'Forward'];
const grades = ['1st Grade', '2nd Grade', '3rd Grade', '4th Grade', '5th Grade', '6th Grade', '7th Grade', '8th Grade', '9th Grade', '10th Grade', '11th Grade', '12th Grade'];

export function SettingsPanel({ profile, onUpdateProfile, onUploadAvatar }: SettingsPanelProps) {
  const [formData, setFormData] = useState(profile);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
          {formData.username && (
            <div className="stat-card bg-secondary/30 p-4 rounded-lg space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-sm font-medium">Your Profile URL</Label>
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
                    {formData.isProfilePublic && (
                      <a 
                        href={`/${formData.username}`} 
                        target="_blank" 
                        rel="noopener noreferrer"
                      >
                        <Button variant="ghost" size="icon" className="h-7 w-7">
                          <ExternalLink className="w-3.5 h-3.5" />
                        </Button>
                      </a>
                    )}
                  </div>
                </div>
              </div>
              
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="public-profile" className="text-sm font-medium">
                    Public Profile
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Allow others to view your stats and public highlights
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
            </div>
          )}

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

          <Button onClick={handleSave} className="w-full gradient-primary font-semibold mt-6">
            <Save className="w-4 h-4 mr-2" />
            Save Profile
          </Button>

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
