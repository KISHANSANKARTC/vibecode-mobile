import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { extractErrorMessage } from '@/lib/errorUtils';

export interface RecommendedTalent {
  id: string;
  display_name: string;
  category: string | null;
  rating: number;
  hourly_rate: number | null;
  currency: string | null;
  avatar_url: string | null;
  match_score?: number;
  reason?: string;
}

/**
 * useAIRecommendations
 *
 * Fetches AI-ranked talent recommendations for the current client. Mirrors
 * the web's `useAIRecommendations` — calls `ai-recommend-talent`
 * (verify_jwt=false, but reads the user's history server-side via the
 * forwarded JWT when present).
 *
 * Use on the client home screen and as the "recommended" sort option in
 * search results.
 */
export function useAIRecommendations(params?: {
  query?: string;
  category?: string;
  limit?: number;
}) {
  const [recommendations, setRecommendations] = useState<RecommendedTalent[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchRecommendations = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const { data, error: invokeErr } = await supabase.functions.invoke('ai-recommend-talent', {
        body: {
          query: params?.query || '',
          category: params?.category || null,
          limit: params?.limit || 10,
        },
      });
      if (invokeErr) throw new Error(invokeErr.message || 'Failed to fetch recommendations');
      setRecommendations(((data as any)?.talents || []) as RecommendedTalent[]);
    } catch (err) {
      setError(extractErrorMessage(err));
      setRecommendations([]);
    } finally {
      setIsLoading(false);
    }
  }, [params?.query, params?.category, params?.limit]);

  useEffect(() => {
    fetchRecommendations();
  }, [fetchRecommendations]);

  return { recommendations, isLoading, error, refetch: fetchRecommendations };
}
