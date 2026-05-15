import { useCallback, useEffect, useState } from 'react';
import * as WebBrowser from 'expo-web-browser';
import { Linking, Platform } from 'react-native';
import { supabase } from '@/lib/supabase';
import { extractErrorMessage } from '@/lib/errorUtils';

/**
 * useStripeConnect
 *
 * Talent payouts run on Stripe Connect. This hook covers the four flows:
 *   - createConnectAccount() → starts onboarding, returns hosted Stripe URL
 *   - verifyConnectAccount() → checks chargesEnabled / payoutsEnabled
 *   - openDashboard() → Stripe Express dashboard for the talent
 *   - requestPayout() → manually trigger a payout for a completed booking
 *
 * Web parity: lovable-web/src/hooks (useStripeConnect equivalent) +
 * lovable-web/supabase/functions/{create-connect-account,verify-connect-account,
 * get-connect-dashboard-link,create-talent-payout}.
 *
 * Note: three of these functions are verify_jwt=true — supabase.functions.invoke
 * forwards the user JWT automatically, so no extra header work is needed.
 */
export interface ConnectStatus {
  hasAccount: boolean;
  chargesEnabled: boolean;
  payoutsEnabled: boolean;
  detailsSubmitted: boolean;
  requirementsCurrentlyDue?: string[];
}

export function useStripeConnect() {
  const [isLoading, setIsLoading] = useState(false);
  const [status, setStatus] = useState<ConnectStatus | null>(null);

  const verifyConnectAccount = useCallback(async (): Promise<ConnectStatus | null> => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('verify-connect-account', {});
      if (error) throw new Error(error.message || 'Failed to verify Connect account');
      const next: ConnectStatus = {
        hasAccount: !!(data as any)?.hasAccount,
        chargesEnabled: !!(data as any)?.chargesEnabled,
        payoutsEnabled: !!(data as any)?.payoutsEnabled,
        detailsSubmitted: !!(data as any)?.detailsSubmitted,
        requirementsCurrentlyDue: (data as any)?.requirementsCurrentlyDue || [],
      };
      setStatus(next);
      return next;
    } catch (err) {
      console.error('[useStripeConnect] verify failed:', extractErrorMessage(err));
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const createConnectAccount = useCallback(async (): Promise<{ ok: boolean; error?: string }> => {
    setIsLoading(true);
    try {
      const appUrl = process.env.EXPO_PUBLIC_APP_URL || 'https://engageapp.co';
      const deepScheme = process.env.EXPO_PUBLIC_APP_DEEP_LINK_SCHEME || 'engageapp';

      const { data, error } = await supabase.functions.invoke('create-connect-account', {
        body: {
          return_url: `${deepScheme}://payouts?status=connected`,
          refresh_url: `${appUrl}/payouts?status=refresh`,
        },
      });

      if (error) throw new Error(error.message || 'Failed to start Connect onboarding');
      const url = (data as any)?.url || (data as any)?.onboarding_url;
      if (!url) throw new Error('Stripe onboarding URL missing');

      const result = await WebBrowser.openAuthSessionAsync(
        url,
        `${deepScheme}://payouts`
      );

      if (result.type === 'success' || result.type === 'dismiss') {
        await verifyConnectAccount();
        return { ok: true };
      }
      if (Platform.OS === 'web') {
        await Linking.openURL(url);
        return { ok: true };
      }
      return { ok: false, error: 'Onboarding was cancelled' };
    } catch (err) {
      const msg = extractErrorMessage(err);
      return { ok: false, error: msg };
    } finally {
      setIsLoading(false);
    }
  }, [verifyConnectAccount]);

  const openDashboard = useCallback(async (): Promise<{ ok: boolean; error?: string }> => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('get-connect-dashboard-link', {});
      if (error) throw new Error(error.message || 'Failed to open dashboard');
      const url = (data as any)?.url;
      if (!url) throw new Error('Dashboard URL missing');

      await WebBrowser.openBrowserAsync(url);
      return { ok: true };
    } catch (err) {
      return { ok: false, error: extractErrorMessage(err) };
    } finally {
      setIsLoading(false);
    }
  }, []);

  const requestPayout = useCallback(
    async (bookingId: string): Promise<{ ok: boolean; error?: string; payoutId?: string }> => {
      setIsLoading(true);
      try {
        const { data, error } = await supabase.functions.invoke('create-talent-payout', {
          body: { booking_id: bookingId },
        });
        if (error) throw new Error(error.message || 'Payout request failed');
        return { ok: true, payoutId: (data as any)?.payout_id };
      } catch (err) {
        return { ok: false, error: extractErrorMessage(err) };
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  // Auto-verify on mount so consumers don't need to call it manually.
  useEffect(() => {
    verifyConnectAccount();
  }, [verifyConnectAccount]);

  return {
    isLoading,
    status,
    verifyConnectAccount,
    createConnectAccount,
    openDashboard,
    requestPayout,
  };
}
