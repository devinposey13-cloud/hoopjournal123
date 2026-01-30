-- Create table for storing post-game reflection insights
CREATE TABLE public.postgame_insights (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  game_id UUID NOT NULL REFERENCES public.games(id) ON DELETE CASCADE,
  season_id UUID REFERENCES public.seasons(id) ON DELETE SET NULL,
  -- Key insights extracted by AI
  feeling TEXT, -- How the player felt about their performance (e.g., "confident", "frustrated", "proud")
  goals_achieved TEXT[], -- Which pregame goals were achieved
  goals_missed TEXT[], -- Which pregame goals were not achieved
  key_takeaways TEXT[], -- Main lessons/insights from the game
  areas_to_improve TEXT[], -- Specific areas for improvement
  mental_notes TEXT, -- Any mental/emotional patterns observed
  confidence_level INTEGER CHECK (confidence_level >= 1 AND confidence_level <= 10), -- 1-10 scale
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.postgame_insights ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own insights" 
ON public.postgame_insights 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own insights" 
ON public.postgame_insights 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own insights" 
ON public.postgame_insights 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own insights" 
ON public.postgame_insights 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create unique constraint so only one insight per game
CREATE UNIQUE INDEX postgame_insights_game_unique ON public.postgame_insights(game_id, user_id);

-- Trigger for updated_at
CREATE TRIGGER update_postgame_insights_updated_at
BEFORE UPDATE ON public.postgame_insights
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();