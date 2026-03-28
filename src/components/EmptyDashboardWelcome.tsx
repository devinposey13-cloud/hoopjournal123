import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Plus, Mic, Camera, User, Sparkles, Loader2, Check, X, RefreshCw, Trash2, Volume2, ImageIcon } from 'lucide-react';
import { getCoachAvatarUrl } from '@/utils/coachAvatar';
import { WebcamCaptureDialog } from '@/components/WebcamCaptureDialog';
import { useCoachVoice } from '@/hooks/useCoachVoice';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Dialog,
  DialogContent,
} from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface EmptyDashboardWelcomeProps {
  playerName: string;
  avatarUrl?: string;
  hasSkippedAvatar?: boolean;
  isFirstTimeAfterOnboarding?: boolean;
  coachVoiceGender?: 'male' | 'female';
  onLogFirstGame: () => void;
  onPregameTalk: () => void;
  onLogPractice?: () => void;
  onUploadPhoto: () => void;
  onSkipPhoto: () => void;
  onAvatarGenerated?: (newAvatarUrl: string) => void;
  onAvatarUploaded?: (file: File) => Promise<string | null>;
  onAvatarDeleted?: () => Promise<void>;
  onIntroPlayed?: () => void;
}

type AvatarState = 'idle' | 'generating' | 'preview' | 'uploading';

export function EmptyDashboardWelcome({ 
  playerName, 
  avatarUrl,
  hasSkippedAvatar,
  isFirstTimeAfterOnboarding,
  coachVoiceGender,
  onLogFirstGame, 
  onPregameTalk,
  onUploadPhoto,
  onSkipPhoto,
  onAvatarGenerated,
  onAvatarUploaded,
  onAvatarDeleted,
  onIntroPlayed
}: EmptyDashboardWelcomeProps) {
  const hasAvatar = Boolean(avatarUrl);
  // Hide avatar card if user has skipped and has no avatar
  const shouldShowAvatarCard = hasAvatar || !hasSkippedAvatar;
  const [avatarState, setAvatarState] = useState<AvatarState>('idle');
  const [generatedPreview, setGeneratedPreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showSkipConfirm, setShowSkipConfirm] = useState(false);
  const [showAvatarPreview, setShowAvatarPreview] = useState(false);
  const [hasPlayedIntro, setHasPlayedIntro] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showWebcam, setShowWebcam] = useState(false);

  // Randomize coach gender for onboarding (before user has saved a preference)
  const [randomGender] = useState<'male' | 'female'>(() => Math.random() < 0.5 ? 'male' : 'female');
  const effectiveCoachGender = coachVoiceGender || randomGender;
  
  // Coach voice for intro
  const { playVoice, playingIndex, isLoadingAudio } = useCoachVoice(effectiveCoachGender);

  const INTRO_MESSAGE = `Hey ${playerName}! First game hasn't been logged yet — but every season starts somewhere. Let me know when you're ready.`;

  // Auto-play Coach AI intro voice after onboarding
  useEffect(() => {
    if (isFirstTimeAfterOnboarding && !hasPlayedIntro) {
      // Small delay to let animations settle
      const timer = setTimeout(() => {
        playVoice(INTRO_MESSAGE, -1); // Use -1 as special index for intro
        setHasPlayedIntro(true);
        onIntroPlayed?.();
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [isFirstTimeAfterOnboarding, hasPlayedIntro, playVoice, onIntroPlayed]);

  const handleAvatarClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    setTimeout(() => fileInputRef.current?.click(), 0);
  };

  const handleConfirmSkip = () => {
    setShowSkipConfirm(false);
    onSkipPhoto();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    // Always reset input so the same file can be re-selected
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }

    if (file.size > 20 * 1024 * 1024) {
      toast.error('Image must be less than 20MB');
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
      }
    } else {
      // Fallback to settings panel
      onUploadPhoto();
    }
  };

  const handleWebcamCapture = async (file: File) => {
    if (onAvatarUploaded) {
      setAvatarState('uploading');
      try {
        const newUrl = await onAvatarUploaded(file);
        if (newUrl && onAvatarGenerated) {
          onAvatarGenerated(newUrl);
        }
      } finally {
        setAvatarState('idle');
      }
    }
  };

  const handleDeleteAvatar = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!onAvatarDeleted) return;
    
    setIsDeleting(true);
    try {
      await onAvatarDeleted();
    } finally {
      setIsDeleting(false);
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
      <div className={`grid gap-4 w-full max-w-2xl ${shouldShowAvatarCard ? 'grid-cols-1 md:grid-cols-2' : 'grid-cols-1 max-w-md mx-auto'}`}>
        {/* Coach AI Card */}
        <Card className="bg-gradient-to-br from-card to-card/80 border-2 border-primary/20 shadow-lg relative overflow-hidden">
          {/* Audio indicator when playing */}
          {(playingIndex === -1 || isLoadingAudio) && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="absolute top-3 right-3"
            >
              <div className="flex items-center gap-1.5 text-primary">
                {isLoadingAudio ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Volume2 className="w-4 h-4 animate-pulse" />
                )}
                <span className="text-xs font-medium">
                  {isLoadingAudio ? 'Loading...' : 'Speaking'}
                </span>
              </div>
            </motion.div>
          )}
          <CardContent className="pt-8 pb-6 px-6 text-center">
            {/* Coach AI Avatar - Focal Point */}
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', delay: 0.2 }}
              className="relative w-32 h-32 mx-auto mb-6"
            >
              {/* Pulsating glow rings */}
              <motion.div
                className="absolute inset-0 rounded-full bg-primary/20"
                animate={{
                  scale: [1, 1.35, 1],
                  opacity: [0.4, 0, 0.4],
                }}
                transition={{
                  duration: 2.5,
                  repeat: Infinity,
                  ease: 'easeInOut',
                }}
              />
              <motion.div
                className="absolute inset-0 rounded-full bg-primary/15"
                animate={{
                  scale: [1, 1.55, 1],
                  opacity: [0.3, 0, 0.3],
                }}
                transition={{
                  duration: 2.5,
                  repeat: Infinity,
                  ease: 'easeInOut',
                  delay: 0.4,
                }}
              />
              <motion.div
                className="absolute inset-0 rounded-full bg-primary/10"
                animate={{
                  scale: [1, 1.75, 1],
                  opacity: [0.2, 0, 0.2],
                }}
                transition={{
                  duration: 2.5,
                  repeat: Infinity,
                  ease: 'easeInOut',
                  delay: 0.8,
                }}
              />
              {/* Avatar circle */}
              <div className={`relative w-32 h-32 rounded-full overflow-hidden shadow-[0_0_30px_8px_hsl(var(--primary)/0.3)] ${playingIndex === -1 ? 'ring-2 ring-primary ring-offset-2 ring-offset-background' : 'ring-2 ring-primary/40'}`}>
                <img src={getCoachAvatarUrl(effectiveCoachGender)} alt="Coach AI" className="w-full h-full object-cover" />
              </div>
            </motion.div>

            {/* Coach AI Header */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="mb-4"
            >
              <div className="flex items-center justify-center gap-2 mb-1">
                <span className="text-xs uppercase tracking-wider text-primary font-semibold">
                  Coach AI
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 text-muted-foreground hover:text-primary"
                  onClick={() => playVoice(INTRO_MESSAGE, -1)}
                  disabled={isLoadingAudio || playingIndex === -1}
                  title="Replay intro message"
                >
                  <Volume2 className="h-3.5 w-3.5" />
                  <span className="sr-only">Replay intro message</span>
                </Button>
              </div>
              <h3 
                className="text-3xl text-foreground uppercase tracking-wide"
                style={{ fontFamily: "'Teko', sans-serif", fontWeight: 600 }}
              >
                Hey {playerName}!
              </h3>
            </motion.div>

            {/* Message */}
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
              className={`text-muted-foreground mb-8 leading-relaxed text-sm ${playingIndex === -1 ? 'text-foreground' : ''}`}
            >
              {INTRO_MESSAGE}
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

        {/* Avatar Upload/Generate Card - only show if not skipped or has avatar */}
        {shouldShowAvatarCard && (
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
                      className="relative group"
                    >
                      <Avatar 
                        className="w-28 h-28 border-3 border-primary/30 shadow-lg cursor-pointer hover:ring-2 hover:ring-primary/50 transition-all"
                        onClick={() => setShowAvatarPreview(true)}
                      >
                        <AvatarImage src={avatarUrl} alt={playerName} />
                        <AvatarFallback className="bg-muted">
                          <User className="w-12 h-12 text-muted-foreground/50" />
                        </AvatarFallback>
                      </Avatar>
                      {/* Delete button overlay */}
                      {onAvatarDeleted && (
                        <motion.button
                          initial={{ scale: 0, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          transition={{ delay: 0.3 }}
                          onClick={handleDeleteAvatar}
                          disabled={isDeleting}
                          className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-destructive flex items-center justify-center shadow-lg hover:scale-110 transition-transform disabled:opacity-50"
                        >
                          {isDeleting ? (
                            <Loader2 className="w-4 h-4 text-destructive-foreground animate-spin" />
                          ) : (
                            <Trash2 className="w-4 h-4 text-destructive-foreground" />
                          )}
                        </motion.button>
                      )}
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
                    <div className="flex gap-2 w-full">
                      <Button
                        onClick={() => setShowWebcam(true)}
                        variant="outline"
                        className="flex-1 h-10 text-muted-foreground"
                      >
                        <Camera className="w-4 h-4 mr-1" />
                        Take Photo
                      </Button>
                      <Button
                        onClick={handleAvatarClick}
                        variant="outline"
                        className="flex-1 h-10 text-muted-foreground"
                      >
                        <ImageIcon className="w-4 h-4 mr-1" />
                        Upload
                      </Button>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="flex gap-2 w-full">
                      <Button
                        onClick={() => setShowWebcam(true)}
                        className="flex-1 h-12 gradient-primary"
                      >
                        <Camera className="w-4 h-4 mr-1" />
                        Take Photo
                      </Button>
                      <Button
                        onClick={handleAvatarClick}
                        variant="outline"
                        className="flex-1 h-12"
                      >
                        <ImageIcon className="w-4 h-4 mr-1" />
                        Upload
                      </Button>
                    </div>
                    <Button
                      onClick={() => setShowSkipConfirm(true)}
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
        )}
      </div>

      {/* Motivational subtext */}
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.6 }}
        transition={{ delay: 0.8 }}
        className="text-base text-muted-foreground mt-6 text-center uppercase tracking-wide"
        style={{ fontFamily: "'Teko', sans-serif", fontWeight: 600 }}
      >
        "Every expert was once a beginner."
      </motion.p>

      {/* Skip Confirmation Dialog */}
      <AlertDialog open={showSkipConfirm} onOpenChange={setShowSkipConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Skip adding a photo?</AlertDialogTitle>
            <AlertDialogDescription>
              Your avatar helps personalize your journal and makes it feel more like yours. 
              You can always add a photo later in Settings.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Go back</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmSkip}>
              Skip for now
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Avatar Enlargement Dialog */}
      <Dialog open={showAvatarPreview} onOpenChange={setShowAvatarPreview}>
        <DialogContent className="sm:max-w-md p-0 overflow-hidden bg-transparent border-none shadow-none">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.8, opacity: 0 }}
            transition={{ type: "spring", duration: 0.4 }}
            className="flex flex-col items-center justify-center"
          >
            <div className="relative">
              <img 
                src={avatarUrl} 
                alt={playerName}
                className="w-72 h-72 md:w-80 md:h-80 rounded-2xl object-contain border-4 border-primary/30 shadow-2xl bg-background"
              />
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3, duration: 0.4, ease: 'easeOut' }}
                className="absolute bottom-3 left-1/2 -translate-x-1/2 bg-background/90 text-foreground text-sm font-bold px-4 py-1.5 rounded-full whitespace-nowrap shadow-lg backdrop-blur-sm border border-border"
              >
                {playerName}
              </motion.div>
            </div>
          </motion.div>
        </DialogContent>
      </Dialog>

      {/* Webcam Capture Dialog */}
      <WebcamCaptureDialog
        open={showWebcam}
        onOpenChange={setShowWebcam}
        onCapture={handleWebcamCapture}
      />
    </motion.div>
  );
}
