
-- Allow authenticated users to look up unclaimed cards by claim code
CREATE POLICY "Users can lookup unclaimed cards by claim code"
ON public.quick_cards
FOR SELECT
TO authenticated
USING (claimed_by_user_id IS NULL AND claim_code IS NOT NULL);

-- Allow authenticated users to claim unclaimed cards
CREATE POLICY "Users can claim unclaimed cards"
ON public.quick_cards
FOR UPDATE
TO authenticated
USING (claimed_by_user_id IS NULL)
WITH CHECK (claimed_by_user_id = auth.uid());
