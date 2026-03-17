import { useState, useRef, useEffect, useCallback } from 'react';
import { Send, Bot, User, Loader2, MessageSquareHeart, Volume2, VolumeX, Mic, MicOff, Target, CheckCircle, XCircle, Lightbulb, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import ReactMarkdown from 'react-markdown';
import { useAuth } from '@/hooks/useAuth';
import { useCoachVoice } from '@/hooks/useCoachVoice';
import { useVoiceInput } from '@/hooks/useVoiceInput';
import { AudioWaveform } from './AudioWaveform';
import { supabase } from '@/integrations/supabase/client';
import type { GameStats } from '@/types/basketball';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface PostGameInsight {
  feeling?: string;
  goals_achieved?: string[];
  goals_missed?: string[];
  key_takeaways?: string[];
  areas_to_improve?: string[];
  mental_notes?: string;
  confidence_level?: number;
}

interface PostGameTalkProps {
  game: GameStats;
  pregameGoals?: string[];
  seasonId?: string;
}

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/coach-chat`;

const postgamePrompts = [
  "I played my best today",
  "I struggled with confidence",
  "I need to work on...",
  "I'm proud of my defense",
];

const POSTGAME_SYSTEM_CONTEXT = `You are Coach AI, a thoughtful and supportive basketball coach helping a young player reflect on their game performance.

Your approach:
- Help the player process their feelings about the game honestly
- Celebrate what went well without being dismissive of challenges
- Help identify patterns in their performance and mindset
- Connect their performance to the goals they set (if mentioned)
- Focus on growth mindset - every game is a learning opportunity
- Keep responses conversational and supportive (2-3 paragraphs max)
- Ask follow-up questions to understand their experience better
- Help them identify 1-2 specific things to work on

After the conversation, you'll help summarize key insights that can help track patterns over time.

Important: This is a safe space for honest reflection. Be encouraging but also help them be honest with themselves.`;

export function PostGameTalk({ game, pregameGoals, seasonId }: PostGameTalkProps) {
  const { session, user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [existingInsight, setExistingInsight] = useState<PostGameInsight | null>(null);
  const [isSavingInsight, setIsSavingInsight] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  
  // Voice playback hook
  const { playingIndex, isLoadingAudio, playVoice, stopVoice } = useCoachVoice();
  
  // Voice input hook
  const { isRecording, isTranscribing, audioData, startRecording, stopRecording } = useVoiceInput();
  
  // Track if message was voice-initiated for auto-play
  const isVoiceMessageRef = useRef(false);
  const pendingAutoPlayRef = useRef(false);

  // Load existing insight if any
  useEffect(() => {
    const fetchExistingInsight = async () => {
      if (!game.id || !user) return;
      
      const { data } = await supabase
        .from('postgame_insights')
        .select('*')
        .eq('game_id', game.id)
        .eq('user_id', user.id)
        .maybeSingle();
      
      if (data) {
        setExistingInsight({
          feeling: data.feeling || undefined,
          goals_achieved: data.goals_achieved || undefined,
          goals_missed: data.goals_missed || undefined,
          key_takeaways: data.key_takeaways || undefined,
          areas_to_improve: data.areas_to_improve || undefined,
          mental_notes: data.mental_notes || undefined,
          confidence_level: data.confidence_level || undefined,
        });
      }
    };
    
    fetchExistingInsight();
  }, [game.id, user]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const extractAndSaveInsights = useCallback(async (conversationMessages: Message[]) => {
    if (!user || !game.id) return;
    
    setIsSavingInsight(true);
    try {
      const accessToken = session?.access_token;
      if (!accessToken) throw new Error('Not authenticated');

      // Use AI to extract insights from the conversation
      const extractionPrompt = `Based on this post-game reflection conversation, extract the following insights in JSON format:
{
  "feeling": "one word describing overall feeling (e.g., proud, frustrated, motivated, disappointed, excited)",
  "goals_achieved": ["list of goals or focuses that were successfully executed"],
  "goals_missed": ["list of goals or focuses that were not achieved"],
  "key_takeaways": ["2-3 main lessons or realizations from this game"],
  "areas_to_improve": ["specific skills or aspects to work on"],
  "mental_notes": "brief note about any mental/emotional patterns observed",
  "confidence_level": number from 1-10 based on player's confidence after this game
}

Conversation:
${conversationMessages.map(m => `${m.role}: ${m.content}`).join('\n')}

Return ONLY the JSON, no other text.`;

      const response = await fetch(CHAT_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          messages: [{ role: 'user', content: extractionPrompt }],
          maxTokens: 500,
        }),
      });

      if (!response.ok) throw new Error('Failed to extract insights');

      // Read the streamed response
      const reader = response.body?.getReader();
      if (!reader) throw new Error('No response body');
      
      let fullResponse = '';
      const decoder = new TextDecoder();
      
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');
        
        for (const line of lines) {
          if (line.startsWith('data: ') && line !== 'data: [DONE]') {
            try {
              const parsed = JSON.parse(line.slice(6));
              const content = parsed.choices?.[0]?.delta?.content;
              if (content) fullResponse += content;
            } catch {
              // Ignore parse errors for partial chunks
            }
          }
        }
      }

      // Parse the JSON from the response
      const jsonMatch = fullResponse.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const insights: PostGameInsight = JSON.parse(jsonMatch[0]);
        
        // Upsert the insights
        const { error } = await supabase
          .from('postgame_insights')
          .upsert({
            user_id: user.id,
            game_id: game.id,
            season_id: seasonId || null,
            feeling: insights.feeling,
            goals_achieved: insights.goals_achieved,
            goals_missed: insights.goals_missed,
            key_takeaways: insights.key_takeaways,
            areas_to_improve: insights.areas_to_improve,
            mental_notes: insights.mental_notes,
            confidence_level: insights.confidence_level,
          }, {
            onConflict: 'game_id,user_id',
          });

        if (error) throw error;
        
        setExistingInsight(insights);
        toast.success('Insights saved!');
      }
    } catch (error) {
      console.error('Error saving insights:', error);
      toast.error('Failed to save insights');
    } finally {
      setIsSavingInsight(false);
    }
  }, [user, game.id, seasonId, session?.access_token]);

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

      // Build context about the game
      const gameContext = `
The player just finished a game vs ${game.opponent} and scored ${game.points} points, ${game.rebounds} rebounds, ${game.assists} assists.
They ${game.isWin ? 'won' : 'lost'} the game.
Shooting: ${game.fgMade}/${game.fgAttempted} FG (${game.fgAttempted > 0 ? Math.round((game.fgMade / game.fgAttempted) * 100) : 0}%), ${game.threePtMade}/${game.threePtAttempted} 3PT.
${pregameGoals && pregameGoals.length > 0 ? `Their pregame goals were: ${pregameGoals.join(', ')}` : ''}
`;

      const response = await fetch(CHAT_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          messages: apiMessages,
          pregameContext: {
            opponent: game.opponent,
            gameDate: game.date,
            isHome: true,
            systemPrompt: POSTGAME_SYSTEM_CONTEXT + '\n\nGame Context:\n' + gameContext,
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
      
      // Auto-play AI response if message was voice-initiated
      if (isVoiceMessageRef.current && assistantContent) {
        pendingAutoPlayRef.current = true;
        isVoiceMessageRef.current = false;
      }
    } catch (error) {
      console.error('Chat error:', error);
      toast.error(error instanceof Error ? error.message : 'Coach unavailable. Please try again later.');
      isVoiceMessageRef.current = false;
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
    <div className="stat-card flex flex-col h-[450px] mt-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 pb-4 border-b border-border">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
            <MessageSquareHeart className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="font-semibold">Post Game Talk</h3>
            <p className="text-xs text-muted-foreground">
              Reflect on your game vs {game.opponent}
            </p>
          </div>
        </div>
        
        {/* Save Insights Button */}
        {messages.length >= 4 && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => extractAndSaveInsights(messages)}
            disabled={isSavingInsight}
          >
            {isSavingInsight ? (
              <Loader2 className="w-4 h-4 mr-1 animate-spin" />
            ) : (
              <Save className="w-4 h-4 mr-1" />
            )}
            Save Insights
          </Button>
        )}
      </div>

      {/* Pregame Goals Reference */}
      {pregameGoals && pregameGoals.length > 0 && (
        <div className="py-3 px-3 bg-muted/50 rounded-lg my-3">
          <div className="flex items-center gap-2 text-sm font-medium mb-2">
            <Target className="w-4 h-4 text-primary" />
            Your Pregame Goals
          </div>
          <ul className="text-xs text-muted-foreground space-y-1">
            {pregameGoals.map((goal, i) => (
              <li key={i} className="flex items-start gap-2">
                <span className="text-primary">•</span>
                {goal}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Existing Insights Summary */}
      {existingInsight && messages.length === 0 && (
        <div className="py-3 px-3 bg-violet-500/10 rounded-lg my-3 border border-violet-500/20">
          <div className="flex items-center gap-2 text-sm font-medium mb-2 text-violet-400">
            <Lightbulb className="w-4 h-4" />
            Previous Reflection Insights
          </div>
          <div className="text-xs text-muted-foreground space-y-2">
            {existingInsight.feeling && (
              <p>Feeling: <span className="text-foreground capitalize">{existingInsight.feeling}</span></p>
            )}
            {existingInsight.key_takeaways && existingInsight.key_takeaways.length > 0 && (
              <div>
                <p className="font-medium text-foreground">Key Takeaways:</p>
                <ul className="ml-4 space-y-1">
                  {existingInsight.key_takeaways.map((t, i) => {
                    // Parse structured JSON takeaways into readable text
                    try {
                      const parsed = typeof t === 'string' && t.startsWith('{') ? JSON.parse(t) : null;
                      if (parsed && parsed.body) {
                        return <li key={i}>• {parsed.title ? `${parsed.title}: ` : ''}{parsed.body}</li>;
                      }
                    } catch { /* not JSON, render as-is */ }
                    return <li key={i}>• {t}</li>;
                  })}
                </ul>
              </div>
            )}
            {existingInsight.areas_to_improve && existingInsight.areas_to_improve.length > 0 && (
              <div>
                <p className="font-medium text-foreground">Areas to Improve:</p>
                <ul className="ml-4 space-y-1">
                  {existingInsight.areas_to_improve.map((a, i) => (
                    <li key={i}>• {a}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-3 italic">
            Continue the conversation below to add more reflections.
          </p>
        </div>
      )}

      {/* Messages */}
      <ScrollArea className="flex-1 py-4" ref={scrollRef}>
        {messages.length === 0 && !existingInsight ? (
          <div className="h-full flex flex-col items-center justify-center text-center px-4">
            <div className="w-12 h-12 rounded-full bg-violet-500/10 flex items-center justify-center mb-3">
              <MessageSquareHeart className="w-6 h-6 text-violet-500" />
            </div>
            <h4 className="font-semibold mb-1 text-sm">How Did It Go?</h4>
            <p className="text-xs text-muted-foreground mb-4 max-w-xs">
              Reflect on your game with Coach AI. Be honest about what went well and what you can improve.
            </p>
            <div className="flex flex-wrap gap-2 justify-center">
              {postgamePrompts.map((prompt) => (
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
                      : 'bg-gradient-to-br from-violet-500 to-purple-600'
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
                              playingIndex === index && "text-violet-500 animate-pulse"
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
                <div className="w-7 h-7 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center flex-shrink-0">
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
            placeholder="How do you feel about your performance?"
            disabled={isLoading || isTranscribing}
            className="min-h-[40px] max-h-[80px] resize-none text-sm"
            rows={1}
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
                "h-10 w-10 flex-shrink-0 transition-all",
                isRecording && "animate-pulse"
              )}
              onClick={async () => {
                if (isRecording) {
                  stopVoice();
                  const transcript = await stopRecording();
                  if (transcript) {
                    isVoiceMessageRef.current = true;
                    sendMessage(transcript);
                  }
                } else {
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
            disabled={isLoading || !input.trim() || isRecording || isTranscribing}
            className="h-10 w-10 flex-shrink-0 bg-gradient-to-br from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700"
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
