import { useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '@/lib/supabase';
import { extractErrorMessage } from '@/lib/errorUtils';

const REFERRAL_CODE_KEY = 'engage_referral_code';
const SIGNUP_SOURCE_KEY = 'engage_signup_source';

/**
 * useReferralSignup
 *
 * Mobile parity for the web's `process-referral-signup` flow. Web stores
 * the referral code in localStorage at landing-page mount; mobile stores
 * it in AsyncStorage via storePendingReferral() from a deep-link handler.
 *
 * Call processReferralSignup(role) after the user picks/sets their role.
 * Failures are non-fatal — referral credits are best-effort.
 *
 * NOTE: this hook is also embedded inside the updated `auth-store.ts`
 * `setUserRole` action, so most callers don't need to import this directly.
 */
export function useReferralSignup() {
  const storePendingReferral = useCallback(
    async (referralCode?: string, signupSource?: string) => {
      if (referralCode) await AsyncStorage.setItem(REFERRAL_CODE_KEY, referralCode);
      if (signupSource) await AsyncStorage.setItem(SIGNUP_SOURCE_KEY, signupSource);
    },
    []
  );

  const processReferralSignup = useCallback(
    async (newUserId: string, newUserType: 'client' | 'talent') => {
      try {
        const [referralCode, signupSource] = await Promise.all([
          AsyncStorage.getItem(REFERRAL_CODE_KEY),
          AsyncStorage.getItem(SIGNUP_SOURCE_KEY),
        ]);

        if (!referralCode && !signupSource) return { ok: true };

        const { error } = await supabase.functions.invoke('process-referral-signup', {
          body: {
            newUserId,
            referralCode: referralCode || null,
            signupSource: signupSource || 'organic',
            newUserType,
          },
        });

        if (error) {
          console.warn('[useReferralSignup] non-fatal:', error.message);
        }

        await Promise.all([
          AsyncStorage.removeItem(REFERRAL_CODE_KEY),
          AsyncStorage.removeItem(SIGNUP_SOURCE_KEY),
        ]);

        return { ok: true };
      } catch (err) {
        console.warn('[useReferralSignup] error:', extractErrorMessage(err));
        return { ok: false, error: extractErrorMessage(err) };
      }
    },
    []
  );

  const redeemReferralCredits = useCallback(
    async (amount: number, bookingId?: string) => {
      try {
        const { data, error } = await supabase.functions.invoke('redeem-referral-credits', {
          body: { amount, booking_id: bookingId },
        });
        if (error) throw new Error(error.message);
        return { ok: true, applied: (data as any)?.applied_amount || 0 };
      } catch (err) {
        return { ok: false, error: extractErrorMessage(err) };
      }
    },
    []
  );

  return { storePendingReferral, processReferralSignup, redeemReferralCredits };
}
