import { useCallback, useState } from 'react';
import { Alert, Linking, Platform } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import { supabase } from '@/lib/supabase';
import { extractErrorMessage } from '@/lib/errorUtils';

/**
 * useBookingPayment
 *
 * Wraps the two server-side payment paths for a booking:
 *   1) Card / Apple Pay / Google Pay  → `create-booking-payment` returns
 *      a Stripe Checkout URL. We open it in an in-app browser and let
 *      Stripe handle the rest. On success the user is redirected to
 *      `success_url` which should be an app deep link so Stripe Checkout
 *      can hand control back.
 *   2) Wallet → `pay-booking-with-wallet` runs the debit + booking-status
 *      update atomically server-side. No browser involved.
 *
 * This is the React Native equivalent of the web's BookingFlow payment
 * branch. It does NOT install Stripe SDK — it relies on hosted Checkout.
 * If you later install `@stripe/stripe-react-native`, you can call
 * `create-booking-payment` with `{ mode: 'payment_intent' }` and use
 * Stripe's native PaymentSheet here instead.
 */
export function useBookingPayment() {
  const [isProcessing, setIsProcessing] = useState(false);

  const payWithCard = useCallback(
    async (bookingId: string): Promise<{ ok: boolean; error?: string }> => {
      setIsProcessing(true);
      try {
        const appUrl = process.env.EXPO_PUBLIC_APP_URL || 'https://engageapp.co';
        const deepScheme = process.env.EXPO_PUBLIC_APP_DEEP_LINK_SCHEME || 'engageapp';

        // Stripe Checkout requires absolute success/cancel URLs. We pass both:
        //   success_url = deep link back into the app
        //   cancel_url  = web URL (fallback for desktop preview)
        const successUrl = `${deepScheme}://payment-result?booking_id=${bookingId}&status=success`;
        const cancelUrl = `${appUrl}/payment-result?booking_id=${bookingId}&status=cancel`;

        const { data, error } = await supabase.functions.invoke('create-booking-payment', {
          body: {
            booking_id: bookingId,
            success_url: successUrl,
            cancel_url: cancelUrl,
          },
        });

        if (error) throw new Error(error.message || 'Failed to create payment');
        const url = (data as any)?.url || (data as any)?.checkout_url;
        if (!url) throw new Error('Payment session URL missing from server response');

        // Open Stripe Checkout in an in-app browser. On iOS this is an
        // SFAuthenticationSession-style sheet that returns to the app
        // automatically on the deep-link redirect.
        const result = await WebBrowser.openAuthSessionAsync(url, successUrl);

        if (result.type === 'success') {
          return { ok: true };
        }
        if (result.type === 'cancel' || result.type === 'dismiss') {
          return { ok: false, error: 'Payment was cancelled' };
        }
        // Fallback for platforms where openAuthSessionAsync isn't supported.
        if (Platform.OS === 'web') {
          await Linking.openURL(url);
          return { ok: true };
        }
        return { ok: false, error: 'Payment did not complete' };
      } catch (err) {
        const msg = extractErrorMessage(err);
        console.error('[useBookingPayment] payWithCard failed:', msg);
        return { ok: false, error: msg };
      } finally {
        setIsProcessing(false);
      }
    },
    []
  );

  const payWithWallet = useCallback(
    async (bookingId: string): Promise<{ ok: boolean; error?: string }> => {
      setIsProcessing(true);
      try {
        const { data, error } = await supabase.functions.invoke('pay-booking-with-wallet', {
          body: { booking_id: bookingId },
        });

        if (error) throw new Error(error.message || 'Wallet payment failed');

        // Edge function returns { success: true } on happy path; surface
        // server-side validation failures (insufficient balance etc.) to UI.
        const payload = data as any;
        if (payload && payload.success === false) {
          return { ok: false, error: payload.error || payload.message || 'Wallet payment failed' };
        }
        return { ok: true };
      } catch (err) {
        const msg = extractErrorMessage(err);
        console.error('[useBookingPayment] payWithWallet failed:', msg);
        return { ok: false, error: msg };
      } finally {
        setIsProcessing(false);
      }
    },
    []
  );

  /**
   * After Stripe Checkout completes, verify the payment server-side so the
   * booking status reflects reality (handles the case where the user closed
   * the deep-link before the webhook fired).
   */
  const verifyPayment = useCallback(async (bookingId: string): Promise<boolean> => {
    try {
      const { data, error } = await supabase.functions.invoke('verify-payment', {
        body: { booking_id: bookingId },
      });
      if (error) return false;
      return !!(data as any)?.confirmed;
    } catch {
      return false;
    }
  }, []);

  return { isProcessing, payWithCard, payWithWallet, verifyPayment };
}
