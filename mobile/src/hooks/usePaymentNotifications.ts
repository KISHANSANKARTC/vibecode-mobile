import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/lib/state/auth-store';

interface PaymentNotification {
  id: string;
  bookingId: string;
  amount: number;
  clientName: string;
  talentId: string;
  status: 'pending' | 'completed' | 'failed';
}

export function usePaymentNotifications(
  onPaymentReceived?: (payment: PaymentNotification) => void
) {
  const user = useAuthStore((s) => s.user);
  const [isListening, setIsListening] = useState(false);

  useEffect(() => {
    if (!user) return;

    setIsListening(true);

    // Subscribe to real-time payment notifications for talent
    const paymentChannel = supabase
      .channel(`payments:${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          const notification = payload.new as any;

          // Check if this is a payment notification
          if (
            notification.type === 'payment_success' ||
            notification.type === 'payment_received' ||
            notification.type === 'payout_ready'
          ) {
            console.log('[PaymentNotification] Payment notification received:', notification);

            // Extract payment details from notification body
            const paymentData: PaymentNotification = {
              id: notification.id,
              bookingId: notification.body || '',
              amount: 0, // Amount would come from the notification body
              clientName: '', // Client name would come from the title
              talentId: user.id,
              status: 'completed',
            };

            onPaymentReceived?.(paymentData);
          }
        }
      )
      .subscribe((status) => {
        console.log('[PaymentNotification] Subscription status:', status);
      });

    return () => {
      supabase.removeChannel(paymentChannel);
      setIsListening(false);
    };
  }, [user, onPaymentReceived]);

  return { isListening };
}
