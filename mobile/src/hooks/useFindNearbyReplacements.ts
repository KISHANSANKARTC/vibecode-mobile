import { useCallback, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { extractErrorMessage } from '@/lib/errorUtils';

export interface ReplacementTalent {
  id: string;
  display_name: string;
  category: string;
  rating: number;
  hourly_rate: number | null;
  distance_km: number;
  avatar_url: string | null;
}

/**
 * useFindNearbyReplacements
 *
 * Calls `find-nearby-replacements` to suggest alternative talents when a
 * booked talent is unable to deliver (no-show, cancellation). The function
 * filters by category, geography, availability, and reliability score.
 *
 * Surface this in the dispute / refund flow on the booking-detail screen.
 * Mirrors the web's same-named edge function call.
 */
export function useFindNearbyReplacements() {
  const [results, setResults] = useState<ReplacementTalent[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const findReplacements = useCallback(async (bookingId: string, radiusKm: number = 50) => {
    setIsLoading(true);
    setError(null);
    try {
      const { data, error: invokeErr } = await supabase.functions.invoke(
        'find-nearby-replacements',
        {
          body: { booking_id: bookingId, radius_km: radiusKm },
        }
      );
      if (invokeErr) throw new Error(invokeErr.message);
      const list: ReplacementTalent[] = (data as any)?.talents || [];
      setResults(list);
      return { ok: true, talents: list };
    } catch (err) {
      const msg = extractErrorMessage(err);
      setError(msg);
      return { ok: false, error: msg, talents: [] as ReplacementTalent[] };
    } finally {
      setIsLoading(false);
    }
  }, []);

  return { results, isLoading, error, findReplacements };
}
