import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Sparkles, Loader2, Check, X, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { User } from 'lucide-react';

interface AvatarGeneratorProps {
  currentAvatarUrl: string | undefined;
  onAvatarGenerated: (newAvatarUrl: string) => void;
  playerName: string;
}

type GeneratorState = 'idle' | 'generating' | 'preview';

export function AvatarGenerator({ 
  currentAvatarUrl, 
  onAvatarGenerated,
  playerName 
}: AvatarGeneratorProps) {
  const [state, setState] = useState<GeneratorState>('idle');
  const [generatedPreview, setGeneratedPreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const generateAvatar = async () => {
    if (!currentAvatarUrl) {
      toast.error('Please upload a profile photo first');
      return;
    }

    setState('generating');

    try {
      const { data, error } = await supabase.functions.invoke('generate-avatar', {
        body: { imageUrl: currentAvatarUrl }
      });

      if (error) {
        console.error('Edge function error:', error);
        throw new Error(error.message || 'Failed to generate avatar');
      }

      if (data?.error) {
        throw new Error(data.error);
      }

      if (!data?.imageData) {
        throw new Error('No avatar image received');
      }

      setGeneratedPreview(data.imageData);
      setState('preview');
      toast.success('Avatar generated! Preview it below.');
    } catch (error: any) {
      console.error('Avatar generation error:', error);
      toast.error(error.message || 'Failed to generate avatar');
      setState('idle');
    }
  };

  const acceptGeneratedAvatar = async () => {
    if (!generatedPreview) return;

    setIsUploading(true);

    try {
      // Convert base64 to blob
      const base64Data = generatedPreview.replace(/^data:image\/\w+;base64,/, '');
      const byteCharacters = atob(base64Data);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: 'image/png' });

      // Get user ID for file path
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Upload to Supabase storage
      const fileName = `${user.id}/ai-avatar-${Date.now()}.png`;
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, blob, {
          contentType: 'image/png',
          upsert: true
        });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName);

      // Update profile with new avatar
      onAvatarGenerated(publicUrl);
      
      setState('idle');
      setGeneratedPreview(null);
      toast.success('AI avatar saved!');
    } catch (error: any) {
      console.error('Upload error:', error);
      toast.error('Failed to save avatar');
    } finally {
      setIsUploading(false);
    }
  };

  const cancelPreview = () => {
    setState('idle');
    setGeneratedPreview(null);
  };

  if (!currentAvatarUrl) {
    return null;
  }

  return (
    <div className="w-full space-y-3">
      {state === 'idle' && (
        <Button
          variant="outline"
          size="sm"
          onClick={generateAvatar}
          className="w-full gap-2 text-xs"
        >
          <Sparkles className="w-3.5 h-3.5" />
          Generate AI Avatar
        </Button>
      )}

      {state === 'generating' && (
        <div className="flex flex-col items-center gap-2 py-3">
          <div className="relative">
            <div className="w-16 h-16 rounded-full bg-gradient-to-r from-primary/20 to-primary/40 animate-pulse" />
            <Loader2 className="w-6 h-6 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 animate-spin text-primary" />
          </div>
          <p className="text-xs text-muted-foreground animate-pulse">
            Creating your avatar...
          </p>
        </div>
      )}

      {state === 'preview' && generatedPreview && (
        <div className="space-y-3">
          <div className="flex items-center justify-center gap-4">
            <div className="text-center">
              <Avatar className="w-16 h-16 border-2 border-muted mx-auto">
                <AvatarImage src={currentAvatarUrl} alt="Original" />
                <AvatarFallback>
                  <User className="w-6 h-6" />
                </AvatarFallback>
              </Avatar>
              <p className="text-[10px] text-muted-foreground mt-1">Original</p>
            </div>
            <div className="text-muted-foreground">→</div>
            <div className="text-center">
              <Avatar className="w-16 h-16 border-2 border-primary mx-auto ring-2 ring-primary/20">
                <AvatarImage src={generatedPreview} alt="AI Generated" />
                <AvatarFallback>
                  <Sparkles className="w-6 h-6" />
                </AvatarFallback>
              </Avatar>
              <p className="text-[10px] text-primary mt-1 font-medium">AI Generated</p>
            </div>
          </div>

          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={cancelPreview}
              disabled={isUploading}
              className="flex-1 gap-1"
            >
              <X className="w-3.5 h-3.5" />
              Keep Original
            </Button>
            <Button
              size="sm"
              onClick={acceptGeneratedAvatar}
              disabled={isUploading}
              className="flex-1 gap-1 gradient-primary"
            >
              {isUploading ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Check className="w-3.5 h-3.5" />
              )}
              Use This
            </Button>
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={generateAvatar}
            disabled={isUploading}
            className="w-full gap-1 text-xs"
          >
            <RefreshCw className="w-3 h-3" />
            Regenerate
          </Button>
        </div>
      )}
    </div>
  );
}
