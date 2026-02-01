import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { getQuarterString } from '@/utils/quarterUtils';

interface RingOfHonorEligibility {
  isEligible: boolean;
  isAlreadyMember: boolean;
  loading: boolean;
  checkEligibility: () => Promise<void>;
}

export function useRingOfHonorEligibility(currentLevel: number): RingOfHonorEligibility {
  const { user } = useAuth();
  const [isAlreadyMember, setIsAlreadyMember] = useState(false);
  const [loading, setLoading] = useState(true);

  const currentQuarter = getQuarterString();
  const isEligible = currentLevel >= 50;

  const checkEligibility = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      // Check if user is already in Ring of Honor for this quarter
      const { data, error } = await supabase
        .from('ring_of_honor')
        .select('id')
        .eq('user_id', user.id)
        .eq('quarter', currentQuarter)
        .maybeSingle();

      if (error) throw error;
      setIsAlreadyMember(!!data);
    } catch (error) {
      console.error('Error checking Ring of Honor eligibility:', error);
    } finally {
      setLoading(false);
    }
  }, [user, currentQuarter]);

  useEffect(() => {
    checkEligibility();
  }, [checkEligibility]);

  return {
    isEligible,
    isAlreadyMember,
    loading,
    checkEligibility,
  };
}
