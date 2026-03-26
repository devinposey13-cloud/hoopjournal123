
DROP POLICY IF EXISTS "Users can lookup unclaimed cards by claim code" ON public.quick_cards;
DROP POLICY IF EXISTS "Users can claim unclaimed cards" ON public.quick_cards;

CREATE POLICY "Users can lookup cards by claim code"
ON public.quick_cards FOR SELECT TO authenticated
USING (claim_code IS NOT NULL AND (claimed_by_user_id IS NULL OR claimed_by_user_id = auth.uid()));

CREATE POLICY "Users can claim or reclaim cards"
ON public.quick_cards FOR UPDATE TO authenticated
USING (claimed_by_user_id IS NULL OR claimed_by_user_id = auth.uid())
WITH CHECK (claimed_by_user_id = auth.uid());
