import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { extractErrorMessage } from '@/lib/errorUtils';

export interface AvailableSlot {
  start: string; // ISO timestamp
  end: string;
  status: 'available' | 'booked' | 'blocked';
}

export interface AvailabilityResponse {
  slots: AvailableSlot[];
  no_direct_booking?: boolean;
  timezone?: string;
}

/**
 * useAvailableSlots
 *
 * Fetches bookable time slots for a talent from the `get-available-slots`
 * edge function. The function respects:
 *   - `talent_working_hours` (recurring weekly base)
 *   - `talent_time_off`, `talent_recurring_time_off` (blocks)
 *   - `bookings` with scheduled_start/scheduled_end (conflicts)
 *   - `availability_slots` overrides
 *
 * Web parity: lovable-web/src/hooks/useAvailableSlots.ts.
 */
export function useAvailableSlots(talentId?: string, fromDate?: Date, toDate?: Date) {
  const [data, setData] = useState<AvailabilityResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchSlots = useCallback(async () => {
    if (!talentId) return;
    setIsLoading(true);
    setError(null);
    try {
      const { data: payload, error: invokeErr } = await supabase.functions.invoke(
        'get-available-slots',
        {
          body: {
            talent_id: talentId,
            from: (fromDate || new Date()).toISOString(),
            to: (toDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)).toISOString(),
          },
        }
      );

      if (invokeErr) throw new Error(invokeErr.message || 'Failed to fetch availability');
      setData((payload as AvailabilityResponse) || { slots: [] });
    } catch (err) {
      setError(extractErrorMessage(err));
      setData(null);
    } finally {
      setIsLoading(false);
    }
  }, [talentId, fromDate, toDate]);

  useEffect(() => {
    fetchSlots();
  }, [fetchSlots]);

  return { data, isLoading, error, refetch: fetchSlots };
}

/**
 * Convenience hook: fetch the lightweight today/tomorrow availability summary
 * used by talent cards in search results. Calls `get-availability-summary`.
 */
export function useAvailabilitySummary(talentIds: string[]) {
  const [summary, setSummary] = useState<
    Record<string, { availableToday: boolean; availableTomorrow: boolean; hasInstantBook: boolean }>
  >({});
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!talentIds.length) return;
    let cancelled = false;
    setIsLoading(true);
    (async () => {
      try {
        const { data, error } = await supabase.functions.invoke('get-availability-summary', {
          body: { talent_ids: talentIds },
        });
        if (error) throw new Error(error.message);
        if (!cancelled) setSummary((data as any)?.summary || {});
      } catch (err) {
        console.warn('[useAvailabilitySummary] failed:', extractErrorMessage(err));
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [JSON.stringify(talentIds)]); // eslint-disable-line react-hooks/exhaustive-deps

  return { summary, isLoading };
}
