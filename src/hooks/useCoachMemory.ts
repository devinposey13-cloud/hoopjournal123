import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface CoachMemory {
  id: string;
  memory_type: string;
  memory_key: string;
  memory_value: string;
  confidence: number;
  occurrence_count: number;
  last_updated_at: string;
}

interface UpsertMemoryParams {
  memoryType: 'habit' | 'preference' | 'pattern' | 'milestone_context' | 'conversation_insight';
  memoryKey: string;
  memoryValue: string;
  confidence?: number;
}

export function useCoachMemory() {
  const { user } = useAuth();

  // Fetch all memories for the current user
  const fetchMemories = useCallback(async (): Promise<CoachMemory[]> => {
    if (!user?.id) return [];

    const { data, error } = await supabase
      .from('coach_memory')
      .select('*')
      .eq('user_id', user.id)
      .order('last_updated_at', { ascending: false });

    if (error) {
      console.error('Error fetching coach memories:', error);
      return [];
    }

    return data || [];
  }, [user?.id]);

  // Upsert a memory (create or update if exists)
  const upsertMemory = useCallback(async ({
    memoryType,
    memoryKey,
    memoryValue,
    confidence = 0.5,
  }: UpsertMemoryParams): Promise<boolean> => {
    if (!user?.id) return false;

    try {
      // Check if memory exists
      const { data: existing } = await supabase
        .from('coach_memory')
        .select('id, occurrence_count, confidence')
        .eq('user_id', user.id)
        .eq('memory_type', memoryType)
        .eq('memory_key', memoryKey)
        .maybeSingle();

      if (existing) {
        // Update existing memory - increase confidence and occurrence count
        const newConfidence = Math.min(1, (existing.confidence || 0.5) + 0.1);
        const { error } = await supabase
          .from('coach_memory')
          .update({
            memory_value: memoryValue,
            confidence: newConfidence,
            occurrence_count: (existing.occurrence_count || 1) + 1,
            last_updated_at: new Date().toISOString(),
          })
          .eq('id', existing.id);

        if (error) throw error;
      } else {
        // Create new memory
        const { error } = await supabase
          .from('coach_memory')
          .insert({
            user_id: user.id,
            memory_type: memoryType,
            memory_key: memoryKey,
            memory_value: memoryValue,
            confidence,
            occurrence_count: 1,
          });

        if (error) throw error;
      }

      return true;
    } catch (error) {
      console.error('Error upserting coach memory:', error);
      return false;
    }
  }, [user?.id]);

  // Store a performance pattern (e.g., "struggles with free throws under pressure")
  const storePattern = useCallback(async (patternKey: string, patternValue: string) => {
    return upsertMemory({
      memoryType: 'pattern',
      memoryKey: patternKey,
      memoryValue: patternValue,
    });
  }, [upsertMemory]);

  // Store a player preference (e.g., "prefers detailed drills over general advice")
  const storePreference = useCallback(async (preferenceKey: string, preferenceValue: string) => {
    return upsertMemory({
      memoryType: 'preference',
      memoryKey: preferenceKey,
      memoryValue: preferenceValue,
    });
  }, [upsertMemory]);

  // Store a habit observation
  const storeHabit = useCallback(async (habitKey: string, habitValue: string) => {
    return upsertMemory({
      memoryType: 'habit',
      memoryKey: habitKey,
      memoryValue: habitValue,
    });
  }, [upsertMemory]);

  // Store a conversation insight
  const storeInsight = useCallback(async (insight: string) => {
    const key = `insight_${Date.now()}`;
    return upsertMemory({
      memoryType: 'conversation_insight',
      memoryKey: key,
      memoryValue: insight,
      confidence: 0.7,
    });
  }, [upsertMemory]);

  // Delete a specific memory
  const deleteMemory = useCallback(async (memoryId: string): Promise<boolean> => {
    if (!user?.id) return false;

    const { error } = await supabase
      .from('coach_memory')
      .delete()
      .eq('id', memoryId)
      .eq('user_id', user.id);

    if (error) {
      console.error('Error deleting coach memory:', error);
      return false;
    }

    return true;
  }, [user?.id]);

  // Clear all memories for the user
  const clearAllMemories = useCallback(async (): Promise<boolean> => {
    if (!user?.id) return false;

    const { error } = await supabase
      .from('coach_memory')
      .delete()
      .eq('user_id', user.id);

    if (error) {
      console.error('Error clearing coach memories:', error);
      return false;
    }

    return true;
  }, [user?.id]);

  return {
    fetchMemories,
    upsertMemory,
    storePattern,
    storePreference,
    storeHabit,
    storeInsight,
    deleteMemory,
    clearAllMemories,
  };
}