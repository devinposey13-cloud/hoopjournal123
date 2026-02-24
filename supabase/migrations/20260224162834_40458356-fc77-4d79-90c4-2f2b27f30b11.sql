-- Allow users to insert their own plan_overrides row (for auto-grandfathering)
CREATE POLICY "Users can insert their own plan override"
ON public.plan_overrides
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Allow users to update their own plan_overrides row (for auto-grandfathering)
CREATE POLICY "Users can update their own plan override"
ON public.plan_overrides
FOR UPDATE
USING (auth.uid() = user_id);