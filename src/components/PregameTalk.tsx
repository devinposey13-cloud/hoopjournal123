import { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Loader2, Sparkles, Volume2, VolumeX, Mic, MicOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import ReactMarkdown from 'react-markdown';
import { useAuth } from '@/hooks/useAuth';
import { useCoachVoice } from '@/hooks/useCoachVoice';
import { useVoiceInput } from '@/hooks/useVoiceInput';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface PregameTalkProps {
  opponent: string;
  gameDate: string;
  isHome: boolean;
}

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/coach-chat`;

const pregamePrompts = [
  "I'm nervous about this game",
  "What should I focus on?",
  "How do I stay confident?",
  "Help me visualize success",
];

const PREGAME_SYSTEM_CONTEXT = `You are Coach AI, a supportive and motivating basketball coach helping a young player prepare mentally for their upcoming game. 

Your approach:
- Focus on mindset, confidence, and mental preparation
- Emphasize "controlling what you can control" - effort, attitude, hustle, communication
- Encourage playing hard every possession
- Help manage nerves and build confidence
- Use visualization techniques when appropriate
- Keep responses concise and actionable (2-3 paragraphs max)
- Be warm, encouraging, but also direct like a real coach
- Ask follow-up questions to understand how the player is feeling

Never discuss specific opponent strategies or scouting - focus purely on the player's own preparation and mindset.`;

export function PregameTalk({ opponent, gameDate, isHome }: PregameTalkProps) {
  const { session } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  
  // Voice playback hook
  const { playingIndex, isLoadingAudio, playVoice, stopVoice } = useCoachVoice();
  
  // Voice input hook
  const { isRecording, isTranscribing, startRecording, stopRecording, cancelRecording } = useVoiceInput();

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const sendMessage = async (messageText: string) => {
    if (!messageText.trim() || isLoading) return;

    const userMessage: Message = { 
      role: 'user', 
      content: messageText.trim(),
    };
    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    let assistantContent = '';

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
      const apiMessages = [...messages, userMessage].map(({ role, content }) => ({ role, content }));
      
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
          pregameContext: {
            opponent,
            gameDate,
            isHome,
            systemPrompt: PREGAME_SYSTEM_CONTEXT,
          },
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
    } catch (error) {
      console.error('Chat error:', error);
      toast.error(error instanceof Error ? error.message : 'Coach unavailable. Please try again later.');
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
    <div className="stat-card flex flex-col h-[400px]">
      {/* Header */}
      <div className="flex items-center gap-3 pb-4 border-b border-border">
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center">
          <Bot className="w-5 h-5 text-white" />
        </div>
        <div>
          <h3 className="font-semibold">Pregame Talk</h3>
          <p className="text-xs text-muted-foreground">
            Mental prep for vs {opponent}
          </p>
        </div>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 py-4" ref={scrollRef}>
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center px-4">
            <div className="w-12 h-12 rounded-full bg-orange-500/10 flex items-center justify-center mb-3">
              <Sparkles className="w-6 h-6 text-orange-500" />
            </div>
            <h4 className="font-semibold mb-1 text-sm">Game Day Prep</h4>
            <p className="text-xs text-muted-foreground mb-4 max-w-xs">
              Talk to Coach AI about how you're feeling before the game. Focus on what you can control!
            </p>
            <div className="flex flex-wrap gap-2 justify-center">
              {pregamePrompts.map((prompt) => (
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
          <div className="space-y-3 px-1">
            {messages.map((message, index) => (
              <div
                key={index}
                className={cn(
                  'flex gap-2',
                  message.role === 'user' ? 'flex-row-reverse' : ''
                )}
              >
                <div
                  className={cn(
                    'w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0',
                    message.role === 'user'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-gradient-to-br from-orange-500 to-amber-500'
                  )}
                >
                  {message.role === 'user' ? (
                    <User className="w-3 h-3" />
                  ) : (
                    <Bot className="w-3 h-3 text-white" />
                  )}
                </div>
                <div
                  className={cn(
                    'rounded-2xl px-3 py-2 max-w-[85%] text-sm',
                    message.role === 'user'
                      ? 'bg-primary text-primary-foreground rounded-tr-sm'
                      : 'bg-muted rounded-tl-sm'
                  )}
                >
                  {message.role === 'assistant' ? (
                    <div>
                      <div className="prose prose-sm dark:prose-invert max-w-none">
                        <ReactMarkdown>{message.content}</ReactMarkdown>
                      </div>
                      {message.content && (
                        <div className="mt-2 pt-2 border-t border-border/30">
                          <Button
                            variant="ghost"
                            size="sm"
                            className={cn(
                              "h-6 px-2 text-xs gap-1",
                              playingIndex === index && "text-orange-500 animate-pulse"
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
                        </div>
                      )}
                    </div>
                  ) : (
                    <p className="whitespace-pre-wrap">{message.content}</p>
                  )}
                </div>
              </div>
            ))}
            {isLoading && messages[messages.length - 1]?.role === 'user' && (
              <div className="flex gap-2">
                <div className="w-7 h-7 rounded-full bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center flex-shrink-0">
                  <Bot className="w-3 h-3 text-white" />
                </div>
                <div className="bg-muted rounded-2xl rounded-tl-sm px-3 py-2">
                  <div className="flex items-center gap-2">
                    <Loader2 className="w-3 h-3 animate-spin text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">Thinking...</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </ScrollArea>

      {/* Input */}
      <form onSubmit={handleSubmit} className="pt-3 border-t border-border">
        <div className="flex gap-2">
          <Textarea
            ref={textareaRef}
            value={isTranscribing ? 'Transcribing...' : input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="How are you feeling about the game?"
            disabled={isLoading || isTranscribing}
            className="min-h-[40px] max-h-[80px] resize-none text-sm"
            rows={1}
          />
          <Button
            type="button"
            variant={isRecording ? "destructive" : "outline"}
            size="icon"
            className={cn(
              "h-10 w-10 flex-shrink-0 transition-all",
              isRecording && "animate-pulse"
            )}
            onClick={async () => {
              if (isRecording) {
                const transcript = await stopRecording();
                if (transcript) {
                  setInput(transcript);
                }
              } else {
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
          <Button
            type="submit"
            size="icon"
            disabled={isLoading || !input.trim() || isRecording || isTranscribing}
            className="h-10 w-10 flex-shrink-0 bg-gradient-to-br from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600"
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
