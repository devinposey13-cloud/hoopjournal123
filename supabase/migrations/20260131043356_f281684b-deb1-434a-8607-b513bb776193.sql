-- Add DELETE policy for player_milestones table so users can delete their own milestones
CREATE POLICY "Users can delete their own milestones"
ON public.player_milestones
FOR DELETE
USING (auth.uid() = user_id);