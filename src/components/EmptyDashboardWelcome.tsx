import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Plus, Mic, Camera, User, Sparkles, Loader2, Check, X, RefreshCw } from 'lucide-react';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface EmptyDashboardWelcomeProps {
  playerName: string;
  avatarUrl?: string;
  onLogFirstGame: () => void;
  onPregameTalk: () => void;
  onUploadPhoto: () => void;
  onSkipPhoto: () => void;
  onAvatarGenerated?: (newAvatarUrl: string) => void;
  onAvatarUploaded?: (file: File) => Promise<string | null>;
}

type AvatarState = 'idle' | 'generating' | 'preview' | 'uploading';

export function EmptyDashboardWelcome({ 
  playerName, 
  avatarUrl,
  onLogFirstGame, 
  onPregameTalk,
  onUploadPhoto,
  onSkipPhoto,
  onAvatarGenerated,
  onAvatarUploaded
}: EmptyDashboardWelcomeProps) {
  const hasAvatar = Boolean(avatarUrl);
  const [avatarState, setAvatarState] = useState<AvatarState>('idle');
  const [generatedPreview, setGeneratedPreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image must be less than 5MB');
      return;
    }

    if (onAvatarUploaded) {
      setAvatarState('uploading');
      try {
        const newUrl = await onAvatarUploaded(file);
        if (newUrl && onAvatarGenerated) {
          onAvatarGenerated(newUrl);
        }
      } finally {
        setAvatarState('idle');
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      }
    } else {
      // Fallback to settings panel
      onUploadPhoto();
    }
  };

  const generateAvatar = async () => {
    if (!avatarUrl) {
      toast.error('Please upload a profile photo first');
      return;
    }

    setAvatarState('generating');

    try {
      const { data, error } = await supabase.functions.invoke('generate-avatar', {
        body: { imageUrl: avatarUrl }
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
      setAvatarState('preview');
      toast.success('Avatar generated! Preview it below.');
    } catch (error: any) {
      console.error('Avatar generation error:', error);
      toast.error(error.message || 'Failed to generate avatar');
      setAvatarState('idle');
    }
  };

  const acceptGeneratedAvatar = async () => {
    if (!generatedPreview || !onAvatarGenerated) return;

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
      
      setAvatarState('idle');
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
    setAvatarState('idle');
    setGeneratedPreview(null);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center justify-center py-12 px-4"
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full max-w-2xl">
        {/* Coach AI Card */}
        <Card className="bg-gradient-to-br from-card to-card/80 border-2 border-primary/20 shadow-lg">
          <CardContent className="pt-8 pb-6 px-6 text-center">
            {/* Coach AI Avatar */}
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', delay: 0.2 }}
              className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-6"
            >
              <span className="text-4xl">🏀</span>
            </motion.div>

            {/* Coach AI Header */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="mb-4"
            >
              <div className="text-xs uppercase tracking-wider text-primary font-semibold mb-1">
                Coach AI
              </div>
              <h3 
                className="text-2xl text-foreground"
                style={{ fontFamily: "'Dancing Script', cursive" }}
              >
                Hey {playerName}!
              </h3>
            </motion.div>

            {/* Message */}
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="text-muted-foreground mb-8 leading-relaxed text-sm"
            >
              First game hasn't been logged yet — but every season starts somewhere.
              Let me know when you're ready.
            </motion.p>

            {/* Action Buttons */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="flex flex-col gap-3"
            >
              <Button
                onClick={onLogFirstGame}
                className="w-full h-12 gradient-primary"
              >
                <Plus className="w-4 h-4 mr-2" />
                Log First Game
              </Button>
              <Button
                onClick={onPregameTalk}
                variant="outline"
                className="w-full h-12"
              >
                <Mic className="w-4 h-4 mr-2" />
                Pregame Talk
              </Button>
            </motion.div>
          </CardContent>
        </Card>

        {/* Avatar Upload/Generate Card */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card className="bg-gradient-to-br from-card to-card/80 border-2 border-muted shadow-lg h-full">
            <CardContent className="pt-8 pb-6 px-6 text-center flex flex-col h-full">
              {/* Avatar Preview - show different states with animations */}
              <div className="mx-auto mb-8 h-36 flex items-center justify-center">
                <AnimatePresence mode="wait">
                {avatarState === 'generating' ? (
                    <motion.div
                      key="generating"
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.8 }}
                      transition={{ duration: 0.3, ease: "easeOut" }}
                      className="relative"
                    >
                      <motion.div 
                        className="w-28 h-28 rounded-full bg-gradient-to-r from-primary/20 to-primary/40"
                        animate={{ 
                          scale: [1, 1.05, 1],
                          opacity: [0.5, 1, 0.5]
                        }}
                        transition={{ 
                          duration: 1.5,
                          repeat: Infinity,
                          ease: "easeInOut"
                        }}
                      />
                      <Loader2 className="w-8 h-8 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 animate-spin text-primary" />
                    </motion.div>
                  ) : avatarState === 'uploading' ? (
                    <motion.div
                      key="uploading"
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.8 }}
                      transition={{ duration: 0.3, ease: "easeOut" }}
                      className="relative"
                    >
                      <motion.div 
                        className="w-28 h-28 rounded-full bg-gradient-to-r from-primary/20 to-primary/40"
                        animate={{ 
                          scale: [1, 1.05, 1],
                          opacity: [0.5, 1, 0.5]
                        }}
                        transition={{ 
                          duration: 1.5,
                          repeat: Infinity,
                          ease: "easeInOut"
                        }}
                      />
                      <Camera className="w-8 h-8 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-primary animate-pulse" />
                    </motion.div>
                  ) : avatarState === 'preview' && generatedPreview ? (
                    <motion.div 
                      key="preview"
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      transition={{ duration: 0.4, ease: "easeOut" }}
                      className="flex items-center gap-4"
                    >
                      <motion.div 
                        className="text-center"
                        initial={{ x: 20, opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        transition={{ delay: 0.1, duration: 0.3 }}
                      >
                        <Avatar className="w-20 h-20 border-2 border-muted">
                          <AvatarImage src={avatarUrl} alt="Original" />
                          <AvatarFallback><User className="w-7 h-7" /></AvatarFallback>
                        </Avatar>
                        <p className="text-xs text-muted-foreground mt-2">Original</p>
                      </motion.div>
                      <motion.div 
                        className="text-muted-foreground text-lg"
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ delay: 0.2, type: "spring", stiffness: 300 }}
                      >
                        →
                      </motion.div>
                      <motion.div 
                        className="text-center"
                        initial={{ x: -20, opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        transition={{ delay: 0.3, duration: 0.3 }}
                      >
                        <motion.div
                          initial={{ scale: 0.8 }}
                          animate={{ 
                            scale: [1, 1.08, 1],
                            boxShadow: [
                              '0 0 0 0 hsl(var(--primary) / 0)',
                              '0 0 25px 6px hsl(var(--primary) / 0.4)',
                              '0 0 20px 4px hsl(var(--primary) / 0.25)'
                            ]
                          }}
                          transition={{ delay: 0.4, duration: 0.6 }}
                          className="rounded-full"
                        >
                          <Avatar className="w-20 h-20 border-2 border-primary ring-2 ring-primary/30 shadow-[0_0_20px_4px_hsl(var(--primary)/0.25)]">
                            <AvatarImage src={generatedPreview} alt="AI Generated" />
                            <AvatarFallback><Sparkles className="w-7 h-7" /></AvatarFallback>
                          </Avatar>
                        </motion.div>
                        <p className="text-xs text-primary mt-2 font-medium">AI</p>
                      </motion.div>
                    </motion.div>
                  ) : hasAvatar ? (
                    <motion.div
                      key="hasAvatar"
                      initial={{ opacity: 0, scale: 0.8, rotateY: -90 }}
                      animate={{ opacity: 1, scale: 1, rotateY: 0 }}
                      exit={{ opacity: 0, scale: 0.8, rotateY: 90 }}
                      transition={{ duration: 0.4, ease: "easeOut" }}
                    >
                      <Avatar className="w-28 h-28 border-3 border-primary/30 shadow-lg">
                        <AvatarImage src={avatarUrl} alt={playerName} />
                        <AvatarFallback className="bg-muted">
                          <User className="w-12 h-12 text-muted-foreground/50" />
                        </AvatarFallback>
                      </Avatar>
                    </motion.div>
                  ) : (
                    <motion.div
                      key="noAvatar"
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ 
                        opacity: 1, 
                        scale: 1,
                        y: [0, -8, 0]
                      }}
                      exit={{ opacity: 0, scale: 0.8 }}
                      transition={{ 
                        opacity: { duration: 0.3, ease: "easeOut" },
                        scale: { duration: 0.3, ease: "easeOut" },
                        y: { 
                          duration: 2.5, 
                          repeat: Infinity, 
                          ease: "easeInOut"
                        }
                      }}
                      className="relative cursor-pointer group"
                      onClick={handleAvatarClick}
                    >
                      <motion.div
                        animate={{
                          boxShadow: [
                            '0 0 0 0 hsl(var(--primary) / 0)',
                            '0 0 0 8px hsl(var(--primary) / 0.15)',
                            '0 0 0 0 hsl(var(--primary) / 0)'
                          ]
                        }}
                        transition={{
                          duration: 2,
                          repeat: Infinity,
                          ease: "easeInOut"
                        }}
                        className="rounded-full"
                      >
                        <Avatar className="w-28 h-28 border-2 border-dashed border-primary/50 animate-pulse">
                          <AvatarFallback className="bg-muted">
                            <User className="w-12 h-12 text-muted-foreground/50" />
                          </AvatarFallback>
                        </Avatar>
                      </motion.div>
                      {/* Plus icon overlay */}
                      <motion.div
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ delay: 0.5 }}
                        className="absolute -bottom-1 -right-1 w-9 h-9 rounded-full bg-primary flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform"
                      >
                        <Plus className="w-5 h-5 text-primary-foreground" />
                      </motion.div>
                    </motion.div>
                  )}
                </AnimatePresence>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </div>

              {/* Header */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
                className="mb-4"
              >
                <h3 className="text-xl font-semibold text-foreground">
                  {avatarState === 'generating' 
                    ? 'Creating your avatar...'
                    : avatarState === 'preview'
                    ? 'Your AI avatar is ready!'
                    : hasAvatar 
                    ? 'Looking good!' 
                    : 'Add a face to the journey'}
                </h3>
              </motion.div>

              {/* Message */}
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.6 }}
                className="text-muted-foreground mb-8 leading-relaxed text-sm flex-1"
              >
                {avatarState === 'generating'
                  ? 'AI is transforming your photo into a basketball-themed avatar...'
                  : avatarState === 'preview'
                  ? 'Choose to use the AI-generated avatar or keep your original photo.'
                  : hasAvatar
                  ? 'Want to level up? Generate an AI avatar to make your player card pop!'
                  : 'This helps your Hoop Journal player card feel like you. Upload a photo to see your avatar.'}
              </motion.p>

              {/* Action Buttons */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.7 }}
                className="flex flex-col gap-3 mt-auto"
              >
                {avatarState === 'preview' && generatedPreview ? (
                  <>
                    <div className="flex gap-2">
                      <Button
                        onClick={cancelPreview}
                        variant="outline"
                        disabled={isUploading}
                        className="flex-1 h-12"
                      >
                        <X className="w-4 h-4 mr-2" />
                        Keep Original
                      </Button>
                      <Button
                        onClick={acceptGeneratedAvatar}
                        disabled={isUploading}
                        className="flex-1 h-12 gradient-primary"
                      >
                        {isUploading ? (
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        ) : (
                          <Check className="w-4 h-4 mr-2" />
                        )}
                        Use This
                      </Button>
                    </div>
                    <Button
                      onClick={generateAvatar}
                      variant="ghost"
                      disabled={isUploading}
                      className="w-full h-10 text-muted-foreground"
                    >
                      <RefreshCw className="w-4 h-4 mr-2" />
                      Regenerate
                    </Button>
                  </>
                ) : avatarState === 'generating' ? (
                  <Button disabled className="w-full h-12">
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Generating...
                  </Button>
                ) : hasAvatar ? (
                  <>
                    <Button
                      onClick={generateAvatar}
                      className="w-full h-12 gradient-primary"
                    >
                      <Sparkles className="w-4 h-4 mr-2" />
                      Generate AI Avatar
                    </Button>
                    <Button
                      onClick={onUploadPhoto}
                      variant="ghost"
                      className="w-full h-10 text-muted-foreground"
                    >
                      <Camera className="w-4 h-4 mr-2" />
                      Change photo
                    </Button>
                  </>
                ) : (
                  <>
                    <Button
                      onClick={onUploadPhoto}
                      className="w-full h-12 gradient-primary"
                    >
                      <Camera className="w-4 h-4 mr-2" />
                      Upload a photo
                    </Button>
                    <Button
                      onClick={onSkipPhoto}
                      variant="ghost"
                      className="w-full h-12 text-muted-foreground"
                    >
                      Skip for now
                    </Button>
                  </>
                )}
              </motion.div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Motivational subtext */}
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.6 }}
        transition={{ delay: 0.8 }}
        className="text-sm text-muted-foreground mt-6 text-center"
        style={{ fontFamily: "'Dancing Script', cursive" }}
      >
        "Every expert was once a beginner."
      </motion.p>
    </motion.div>
  );
}
