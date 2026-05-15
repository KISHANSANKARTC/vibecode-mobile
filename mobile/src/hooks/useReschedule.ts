import { useCallback, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { extractErrorMessage } from '@/lib/errorUtils';

/**
 * useReschedule
 *
 * Calls the `reschedule-booking` edge function (verify_jwt=true) to request
 * or accept a reschedule on a booking. The function enforces:
 *   - only the booking client or assigned talent can request
 *   - the new time must respect the talent's availability
 *   - the other party must accept before the change is committed
 *
 * Returns { ok, error, status } where status reflects the booking's new
 * post-call state (e.g., 'reschedule_pending', 'reschedule_accepted').
 */
export function useReschedule() {
  const [isProcessing, setIsProcessing] = useState(false);

  const requestReschedule = useCallback(
    async (
      bookingId: string,
      newStart: Date,
      newEnd: Date,
      reason?: string
    ): Promise<{ ok: boolean; error?: string; status?: string }> => {
      setIsProcessing(true);
      try {
        const { data, error } = await supabase.functions.invoke('reschedule-booking', {
          body: {
            booking_id: bookingId,
            action: 'request',
            new_start: newStart.toISOString(),
            new_end: newEnd.toISOString(),
            reason: reason || null,
          },
        });
        if (error) throw new Error(error.message || 'Reschedule request failed');
        return { ok: true, status: (data as any)?.booking_status };
      } catch (err) {
        return { ok: false, error: extractErrorMessage(err) };
      } finally {
        setIsProcessing(false);
      }
    },
    []
  );

  const acceptReschedule = useCallback(
    async (bookingId: string): Promise<{ ok: boolean; error?: string }> => {
      setIsProcessing(true);
      try {
        const { error } = await supabase.functions.invoke('reschedule-booking', {
          body: { booking_id: bookingId, action: 'accept' },
        });
        if (error) throw new Error(error.message || 'Accept failed');
        return { ok: true };
      } catch (err) {
        return { ok: false, error: extractErrorMessage(err) };
      } finally {
        setIsProcessing(false);
      }
    },
    []
  );

  const declineReschedule = useCallback(
    async (bookingId: string, reason?: string): Promise<{ ok: boolean; error?: string }> => {
      setIsProcessing(true);
      try {
        const { error } = await supabase.functions.invoke('reschedule-booking', {
          body: { booking_id: bookingId, action: 'decline', reason: reason || null },
        });
        if (error) throw new Error(error.message || 'Decline failed');
        return { ok: true };
      } catch (err) {
        return { ok: false, error: extractErrorMessage(err) };
      } finally {
        setIsProcessing(false);
      }
    },
    []
  );

  return { isProcessing, requestReschedule, acceptReschedule, declineReschedule };
}
