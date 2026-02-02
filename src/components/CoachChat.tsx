import { useState, useRef, useEffect, useCallback } from 'react';
import { Send, Bot, User, Loader2, Sparkles, Video, X, Volume2, VolumeX, Mic, MicOff, Brain } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { GameStats, SeasonStats, PlayerProfile } from '@/types/basketball';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import ReactMarkdown from 'react-markdown';
import { useAuth } from '@/hooks/useAuth';
import { ReportContentButton } from './ReportContentButton';
import { useCoachVoice } from '@/hooks/useCoachVoice';
import { useVoiceInput } from '@/hooks/useVoiceInput';
import { AudioWaveform } from './AudioWaveform';
import { InlineLoading } from '@/components/ui/loading-spinner';
import { CoachMemoryViewer } from '@/components/settings/CoachMemoryViewer';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  videoThumbnail?: string;
}

interface CoachChatProps {
  games: GameStats[];
  seasonStats: SeasonStats;
  profile: PlayerProfile;
  prefillPrompt?: string;
  onPrefillConsumed?: () => void;
}

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/coach-chat`;
const EXTRACT_MEMORY_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/extract-coach-memory`;

const suggestedPrompts = [
  "How was my last game?",
  "What should I work on this week?",
  "How can I improve my shooting?",
  "Analyze my season so far",
];

// Extract frames from video at specific intervals
async function extractVideoFrames(videoFile: File, numFrames: number = 5): Promise<string[]> {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    video.preload = 'metadata';
    video.muted = true;
    video.playsInline = true;
    
    const frames: string[] = [];
    let currentFrame = 0;
    
    video.onloadedmetadata = () => {
      const duration = video.duration;
      const interval = duration / (numFrames + 1);
      
      // Set canvas size to match video (scaled down for efficiency)
      const maxWidth = 640;
      const scale = Math.min(1, maxWidth / video.videoWidth);
      canvas.width = video.videoWidth * scale;
      canvas.height = video.videoHeight * scale;
      
      const captureFrame = () => {
        if (currentFrame >= numFrames) {
          URL.revokeObjectURL(video.src);
          resolve(frames);
          return;
        }
        
        const time = interval * (currentFrame + 1);
        video.currentTime = time;
      };
      
      video.onseeked = () => {
        if (ctx) {
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          const dataUrl = canvas.toDataURL('image/jpeg', 0.7);
          frames.push(dataUrl);
        }
        currentFrame++;
        captureFrame();
      };
      
      captureFrame();
    };
    
    video.onerror = () => {
      URL.revokeObjectURL(video.src);
      reject(new Error('Failed to load video'));
    };
    
    video.src = URL.createObjectURL(videoFile);
  });
}

// Get video thumbnail
async function getVideoThumbnail(videoFile: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    video.preload = 'metadata';
    video.muted = true;
    video.playsInline = true;
    
    video.onloadedmetadata = () => {
      video.currentTime = 1; // Get frame at 1 second
    };
    
    video.onseeked = () => {
      const maxWidth = 200;
      const scale = Math.min(1, maxWidth / video.videoWidth);
      canvas.width = video.videoWidth * scale;
      canvas.height = video.videoHeight * scale;
      
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
        URL.revokeObjectURL(video.src);
        resolve(dataUrl);
      } else {
        reject(new Error('Failed to get canvas context'));
      }
    };
    
    video.onerror = () => {
      URL.revokeObjectURL(video.src);
      reject(new Error('Failed to load video'));
    };
    
    video.src = URL.createObjectURL(videoFile);
  });
}

export function CoachChat({ games, seasonStats, profile, prefillPrompt, onPrefillConsumed }: CoachChatProps) {
  const { session } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedVideo, setSelectedVideo] = useState<File | null>(null);
  const [videoThumbnail, setVideoThumbnail] = useState<string | null>(null);
  const [isExtractingFrames, setIsExtractingFrames] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Handle prefill prompt from "Dear Basketball" entry point
  useEffect(() => {
    if (prefillPrompt && !input) {
      setInput(prefillPrompt);
      onPrefillConsumed?.();
      // Focus the textarea after a brief delay for smooth transition
      setTimeout(() => {
        textareaRef.current?.focus();
      }, 300);
    }
  }, [prefillPrompt, onPrefillConsumed, input]);
  
  // Voice playback hook
  const { playingIndex, isLoadingAudio, playVoice, stopVoice } = useCoachVoice();
  
  // Voice input hook
  const { isRecording, isTranscribing, audioData, startRecording, stopRecording, cancelRecording } = useVoiceInput();
  
  // Track if message was voice-initiated for auto-play
  const isVoiceMessageRef = useRef(false);
  const pendingAutoPlayRef = useRef(false);

  const latestGame = games.length > 0 ? games[0] : null;

  // Extract memories from conversation in the background
  const extractMemories = useCallback(async (userMessage: string, assistantResponse: string) => {
    if (!session?.access_token || !userMessage || !assistantResponse) return;
    
    try {
      // Run in background - don't await or block UI
      fetch(EXTRACT_MEMORY_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          userMessage,
          assistantResponse,
        }),
      }).then(async (response) => {
        if (response.ok) {
          const data = await response.json();
          if (data.memoriesExtracted > 0) {
            console.log(`Coach AI learned ${data.memoriesExtracted} new insight(s)`);
          }
        }
      }).catch((err) => {
        console.error('Memory extraction failed:', err);
      });
    } catch (error) {
      // Silently fail - this is a background enhancement
      console.error('Memory extraction error:', error);
    }
  }, [session?.access_token]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleVideoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    // Validate file type
    if (!file.type.startsWith('video/')) {
      toast.error('Please upload a video file.');
      return;
    }
    
    // Validate file size (100MB limit)
    if (file.size > 100 * 1024 * 1024) {
      toast.error('Please upload a video under 100MB.');
      return;
    }
    
    try {
      const thumbnail = await getVideoThumbnail(file);
      setSelectedVideo(file);
      setVideoThumbnail(thumbnail);
    } catch (error) {
      toast.error('Could not load video preview.');
    }
    
    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const removeVideo = () => {
    setSelectedVideo(null);
    setVideoThumbnail(null);
  };

  const sendMessage = async (messageText: string) => {
    if ((!messageText.trim() && !selectedVideo) || isLoading) return;

    const hasVideo = !!selectedVideo;
    const currentVideoThumbnail = videoThumbnail;
    const currentVideoFile = selectedVideo;
    
    // Clear video selection
    setSelectedVideo(null);
    setVideoThumbnail(null);

    const userMessage: Message = { 
      role: 'user', 
      content: messageText.trim() || (hasVideo ? 'Please analyze this basketball video clip and provide feedback.' : ''),
      videoThumbnail: currentVideoThumbnail || undefined,
    };
    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    let assistantContent = '';
    let videoFrames: string[] = [];

    // Extract frames if video is attached
    if (hasVideo && currentVideoFile) {
      setIsExtractingFrames(true);
      try {
        videoFrames = await extractVideoFrames(currentVideoFile, 5);
      } catch (error) {
        console.error('Error extracting frames:', error);
        toast.error('Could not extract frames from video.');
      } finally {
        setIsExtractingFrames(false);
      }
    }

    const updateAssistant = (chunk: string) => {
      assistantContent += chunk;
      setMessages((prev) => {
        const last = prev[prev.length - 1];
        if (last?.role === 'assistant') {
          return prev.map((m, i) =>
            i === prev.length - 1 ? { ...m, content: assistantContent } : m
          );
        }
        return [...prev, { role: 'assistant', content: assistantContent }];
      });
    };

    try {
      // Prepare messages for API (strip videoThumbnail from messages)
      const apiMessages = [...messages, userMessage].map(({ role, content }) => ({ role, content }));
      
      // Get the user's access token for authentication
      const accessToken = session?.access_token;
      if (!accessToken) {
        throw new Error('You must be logged in to use Coach AI');
      }

      const response = await fetch(CHAT_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          messages: apiMessages,
          playerStats: latestGame,
          seasonStats,
          playerGrade: profile.grade,
          playerName: profile.name,
          courtRole: profile.courtRole,
          seasonGoals: profile.seasonGoals,
          videoFrames: videoFrames.length > 0 ? videoFrames : undefined,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to get response');
      }

      if (!response.body) throw new Error('No response body');

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        let newlineIndex: number;
        while ((newlineIndex = buffer.indexOf('\n')) !== -1) {
          let line = buffer.slice(0, newlineIndex);
          buffer = buffer.slice(newlineIndex + 1);

          if (line.endsWith('\r')) line = line.slice(0, -1);
          if (line.startsWith(':') || line.trim() === '') continue;
          if (!line.startsWith('data: ')) continue;

          const jsonStr = line.slice(6).trim();
          if (jsonStr === '[DONE]') break;

          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) updateAssistant(content);
          } catch {
            buffer = line + '\n' + buffer;
            break;
          }
        }
      }
      // Auto-play AI response if message was voice-initiated
      if (isVoiceMessageRef.current && assistantContent) {
        pendingAutoPlayRef.current = true;
        isVoiceMessageRef.current = false;
      }
      
      // Extract memories from this conversation (runs in background)
      if (assistantContent && userMessage.content) {
        extractMemories(userMessage.content, assistantContent);
      }
    } catch (error) {
      console.error('Chat error:', error);
      toast.error(error instanceof Error ? error.message : 'Coach unavailable. Please try again later.');
      isVoiceMessageRef.current = false;
      // Remove the empty assistant message if it was added
      setMessages((prev) => {
        const last = prev[prev.length - 1];
        if (last?.role === 'assistant' && !last.content) {
          return prev.slice(0, -1);
        }
        return prev;
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  // Auto-play effect when streaming completes
  useEffect(() => {
    if (pendingAutoPlayRef.current && !isLoading && messages.length > 0) {
      const lastMessage = messages[messages.length - 1];
      if (lastMessage?.role === 'assistant' && lastMessage.content) {
        pendingAutoPlayRef.current = false;
        // Small delay to ensure UI is updated
        setTimeout(() => {
          playVoice(lastMessage.content, messages.length - 1);
        }, 100);
      }
    }
  }, [isLoading, messages, playVoice]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(input);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  return (
    <div className="stat-card flex flex-col h-[600px]">
      <Tabs defaultValue="chat" className="flex flex-col h-full">
        {/* Header with Tabs */}
        <div className="flex items-center justify-between pb-4 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full gradient-primary flex items-center justify-center">
              <Bot className="w-5 h-5 text-primary-foreground" />
            </div>
            <div>
              <h3 className="font-semibold">Coach AI</h3>
              <p className="text-xs text-muted-foreground">
                Your personal basketball coach
              </p>
            </div>
          </div>
          <TabsList className="grid grid-cols-2 w-[160px]">
            <TabsTrigger value="chat" className="text-xs">Chat</TabsTrigger>
            <TabsTrigger value="memory" className="text-xs">
              <Brain className="w-3 h-3 mr-1" />
              Memory
            </TabsTrigger>
          </TabsList>
        </div>

        {/* Chat Tab */}
        <TabsContent value="chat" className="flex-1 flex flex-col mt-0 overflow-hidden">

      {/* Messages */}
      <ScrollArea className="flex-1 py-4" ref={scrollRef}>
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center px-4">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
              <Sparkles className="w-8 h-8 text-primary" />
            </div>
            <h4 className="font-semibold mb-2">Ask Coach AI</h4>
            <p className="text-sm text-muted-foreground mb-6 max-w-sm">
              Get personalized feedback on your game, training tips, and advice
              based on your stats. <span className="text-primary font-medium">Upload a video clip for technique analysis!</span>
            </p>
            <div className="flex flex-wrap gap-2 justify-center">
              {suggestedPrompts.map((prompt) => (
                <Button
                  key={prompt}
                  variant="outline"
                  size="sm"
                  className="text-xs"
                  onClick={() => sendMessage(prompt)}
                >
                  {prompt}
                </Button>
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-4 px-1">
            {messages.map((message, index) => (
              <div
                key={index}
                className={cn(
                  'flex gap-3',
                  message.role === 'user' ? 'flex-row-reverse' : ''
                )}
              >
                <div
                  className={cn(
                    'w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0',
                    message.role === 'user'
                      ? 'bg-primary text-primary-foreground'
                      : 'gradient-primary'
                  )}
                >
                  {message.role === 'user' ? (
                    <User className="w-4 h-4" />
                  ) : (
                    <Bot className="w-4 h-4 text-primary-foreground" />
                  )}
                </div>
                <div
                  className={cn(
                    'rounded-2xl px-4 py-2 max-w-[80%]',
                    message.role === 'user'
                      ? 'bg-primary text-primary-foreground rounded-tr-sm'
                      : 'bg-muted rounded-tl-sm'
                  )}
                >
                  {message.videoThumbnail && (
                    <div className="mb-2 rounded-lg overflow-hidden border border-border/50">
                      <img 
                        src={message.videoThumbnail} 
                        alt="Video clip" 
                        className="w-full max-w-[150px]"
                      />
                      <div className="flex items-center gap-1 px-2 py-1 bg-black/50 text-white text-xs">
                        <Video className="w-3 h-3" />
                        Video clip
                      </div>
                    </div>
                  )}
                  {message.role === 'assistant' ? (
                    <div>
                      <div className="prose prose-sm dark:prose-invert max-w-none">
                        <ReactMarkdown>{message.content}</ReactMarkdown>
                      </div>
                      {message.content && (
                        <div className="mt-2 pt-2 border-t border-border/50 flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            className={cn(
                              "h-7 px-2 text-xs gap-1",
                              playingIndex === index && "text-primary animate-pulse"
                            )}
                            onClick={() => playVoice(message.content, index)}
                            disabled={isLoadingAudio && playingIndex !== index}
                          >
                            {isLoadingAudio && playingIndex === null ? (
                              <Loader2 className="w-3 h-3 animate-spin" />
                            ) : playingIndex === index ? (
                              <VolumeX className="w-3 h-3" />
                            ) : (
                              <Volume2 className="w-3 h-3" />
                            )}
                            {playingIndex === index ? 'Stop' : 'Listen'}
                          </Button>
                          <ReportContentButton 
                            userMessage={messages[index - 1]?.content || ''} 
                            aiResponse={message.content} 
                          />
                        </div>
                      )}
                    </div>
                  ) : (
                    <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                  )}
                </div>
              </div>
            ))}
            {isLoading && messages[messages.length - 1]?.role === 'user' && (
              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-full gradient-primary flex items-center justify-center flex-shrink-0">
                  <Bot className="w-4 h-4 text-primary-foreground" />
                </div>
                <div className="bg-muted rounded-2xl rounded-tl-sm px-4 py-3">
                  <InlineLoading 
                    message={isExtractingFrames ? 'Analyzing video...' : 'Thinking...'} 
                  />
                </div>
              </div>
            )}
          </div>
        )}
      </ScrollArea>

      {/* Video Preview */}
      {selectedVideo && videoThumbnail && (
        <div className="px-2 pb-2">
          <div className="relative inline-block">
            <img 
              src={videoThumbnail} 
              alt="Selected video" 
              className="h-20 rounded-lg border border-border"
            />
            <div className="absolute bottom-1 left-1 flex items-center gap-1 px-1.5 py-0.5 bg-black/60 rounded text-white text-xs">
              <Video className="w-3 h-3" />
              Video
            </div>
            <button
              onClick={removeVideo}
              className="absolute -top-2 -right-2 w-5 h-5 bg-destructive rounded-full flex items-center justify-center text-destructive-foreground"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        </div>
      )}

      {/* Input */}
      <form onSubmit={handleSubmit} className="pt-4 border-t border-border">
        <div className="flex gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept="video/*"
            onChange={handleVideoSelect}
            className="hidden"
          />
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="h-11 w-11 flex-shrink-0"
            onClick={() => fileInputRef.current?.click()}
            disabled={isLoading || isRecording || isTranscribing}
            title="Upload video for analysis"
          >
            <Video className="w-4 h-4" />
          </Button>
          <Textarea
            ref={textareaRef}
            value={isTranscribing ? 'Transcribing...' : input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={selectedVideo ? "Add a question about this video..." : "Ask Coach AI for feedback..."}
            className="min-h-[44px] max-h-32 resize-none"
            rows={1}
            disabled={isTranscribing}
          />
          <div className="flex flex-col gap-1">
            {isRecording && (
              <AudioWaveform audioData={audioData} isRecording={isRecording} />
            )}
            <Button
              type="button"
              variant={isRecording ? "destructive" : "outline"}
              size="icon"
              className={cn(
                "h-11 w-11 flex-shrink-0 transition-all",
                isRecording && "animate-pulse"
              )}
              onClick={async () => {
                if (isRecording) {
                  // Stop any playing audio first
                  stopVoice();
                  const transcript = await stopRecording();
                  if (transcript) {
                    // Mark as voice message for auto-play
                    isVoiceMessageRef.current = true;
                    // Auto-send the message
                    sendMessage(transcript);
                  }
                } else {
                  // Stop any playing audio before recording
                  stopVoice();
                  await startRecording();
                }
              }}
              disabled={isLoading || isTranscribing}
              title={isRecording ? "Stop recording" : "Record voice message"}
            >
              {isTranscribing ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : isRecording ? (
                <MicOff className="w-4 h-4" />
              ) : (
                <Mic className="w-4 h-4" />
              )}
            </Button>
          </div>
          <Button
            type="submit"
            size="icon"
            className="gradient-primary h-11 w-11 flex-shrink-0"
            disabled={(!input.trim() && !selectedVideo) || isLoading || isRecording || isTranscribing}
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </Button>
        </div>
      </form>
        </TabsContent>

        {/* Memory Tab */}
        <TabsContent value="memory" className="flex-1 mt-0 overflow-auto py-4">
          <CoachMemoryViewer />
        </TabsContent>
      </Tabs>
    </div>
  );
}
