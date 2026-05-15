import { useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { extractErrorMessage } from '@/lib/errorUtils';
import { Alert } from 'react-native';

interface UseWorkCompletionProps {
  bookingId: string;
  onSuccess?: () => void;
}

export function useWorkCompletion({ bookingId, onSuccess }: UseWorkCompletionProps) {
  const [isApprovingWork, setIsApprovingWork] = useState(false);
  const [isMarkingDelivered, setIsMarkingDelivered] = useState(false);

  const approveWork = useCallback(async () => {
    setIsApprovingWork(true);
    try {
      // CRITICAL: Refresh session to get fresh token
      const { data: sessionData, error: refreshError } = await supabase.auth.refreshSession();
      if (refreshError || !sessionData.session) {
        Alert.alert('Session expired', 'Please sign in again.');
        setIsApprovingWork(false);
        return false;
      }

      const accessToken = sessionData.session.access_token;

      const { data, error } = await supabase.functions.invoke('approve-work-completion', {
        body: { bookingId },
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      if (error) {
        const status = error?.context?.status ?? (error as any)?.status;
        if (status === 401) {
          Alert.alert('Authentication failed', 'Please sign in again.');
          return false;
        }
        console.error('Edge function error:', extractErrorMessage(error));
        throw error;
      }

      if (data?.success) {
        Alert.alert(
          'Success',
          data.alreadyApproved ? 'Work was already approved' : 'Work approved! Payment released to talent.'
        );
        onSuccess?.();
        return true;
      }

      throw new Error(data?.error || 'Failed to approve work');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to approve work';
      console.error('Work approval error:', message);
      Alert.alert('Error', message);
      return false;
    } finally {
      setIsApprovingWork(false);
    }
  }, [bookingId, onSuccess]);

  const markWorkDelivered = useCallback(async () => {
    setIsMarkingDelivered(true);
    try {
      // CRITICAL: Refresh session to get fresh token
      const { data: sessionData, error: refreshError } = await supabase.auth.refreshSession();
      if (refreshError || !sessionData.session) {
        Alert.alert('Session expired', 'Please sign in again.');
        setIsMarkingDelivered(false);
        return false;
      }

      const accessToken = sessionData.session.access_token;

      const { data, error } = await supabase.functions.invoke('mark-work-delivered', {
        body: { bookingId },
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      if (error) {
        const status = error?.context?.status ?? (error as any)?.status;
        if (status === 401) {
          Alert.alert('Authentication failed', 'Please sign in again.');
          return false;
        }
        console.error('Edge function error:', extractErrorMessage(error));
        throw error;
      }

      if (data?.success || data?.status === 'delivered') {
        Alert.alert('Success', 'Work marked as delivered! Client will be notified to review your work.');
        onSuccess?.();
        return true;
      }

      throw new Error(data?.error || 'Failed to mark work as delivered');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to mark work as delivered';
      console.error('Mark work delivered error:', message);
      Alert.alert('Error', message);
      return false;
    } finally {
      setIsMarkingDelivered(false);
    }
  }, [bookingId, onSuccess]);

  return { approveWork, isApprovingWork, markWorkDelivered, isMarkingDelivered };
}
