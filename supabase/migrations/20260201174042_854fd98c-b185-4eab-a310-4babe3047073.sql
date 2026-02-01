-- Add coach_persona column to player_settings
ALTER TABLE public.player_settings 
ADD COLUMN coach_persona text DEFAULT 'calm_mentor';

-- Create coach_memory table for context-aware AI
CREATE TABLE public.coach_memory (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  memory_type text NOT NULL, -- 'habit', 'preference', 'pattern', 'milestone_context', 'conversation_insight'
  memory_key text NOT NULL, -- e.g., 'shooting_struggles', 'favorite_drill', 'communication_style'
  memory_value text NOT NULL, -- The actual insight/memory
  confidence numeric DEFAULT 0.5, -- How confident the AI is about this memory (0-1)
  occurrence_count integer DEFAULT 1, -- How many times this pattern was observed
  last_updated_at timestamp with time zone DEFAULT now(),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  expires_at timestamp with time zone, -- Optional expiry for temporary memories
  UNIQUE(user_id, memory_type, memory_key)
);

-- Enable RLS
ALTER TABLE public.coach_memory ENABLE ROW LEVEL SECURITY;

-- Users can view their own memories
CREATE POLICY "Users can view their own coach memories"
ON public.coach_memory
FOR SELECT
USING (auth.uid() = user_id);

-- Users can create their own memories
CREATE POLICY "Users can create their own coach memories"
ON public.coach_memory
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can update their own memories
CREATE POLICY "Users can update their own coach memories"
ON public.coach_memory
FOR UPDATE
USING (auth.uid() = user_id);

-- Users can delete their own memories
CREATE POLICY "Users can delete their own coach memories"
ON public.coach_memory
FOR DELETE
USING (auth.uid() = user_id);

-- Create index for efficient queries
CREATE INDEX idx_coach_memory_user_type ON public.coach_memory(user_id, memory_type);
CREATE INDEX idx_coach_memory_updated ON public.coach_memory(user_id, last_updated_at DESC);