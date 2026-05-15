import { useState, useEffect, useCallback } from 'react';
import { useAuthStore } from '@/lib/state/auth-store';
import { supabase } from '@/lib/supabase';

export interface NotificationPreferences {
  id: string;
  userId: string;
  whatsappReminderEnabled: boolean;
  emailReminderEnabled: boolean;
  bookingReminderEnabled: boolean;
  bookingReminderHours: number;
  bookingStatusEnabled: boolean;
  paymentReceivedEnabled: boolean;
  paymentDueEnabled: boolean;
  milestoneReminderEnabled: boolean;
  newMessageEnabled: boolean;
  newBookingEnabled: boolean;
  newReviewEnabled: boolean;
  marketingEnabled: boolean;
}

interface UseNotificationPreferencesReturn {
  preferences: NotificationPreferences | null;
  isLoading: boolean;
  isSaving: boolean;
  updatePreference: (key: keyof NotificationPreferences, value: any) => void;
  savePreferences: () => Promise<void>;
}

const DEFAULT_PREFERENCES: Omit<NotificationPreferences, 'id' | 'userId'> = {
  whatsappReminderEnabled: true,
  emailReminderEnabled: true,
  bookingReminderEnabled: true,
  bookingReminderHours: 24,
  bookingStatusEnabled: true,
  paymentReceivedEnabled: true,
  paymentDueEnabled: true,
  milestoneReminderEnabled: true,
  newMessageEnabled: true,
  newBookingEnabled: true,
  newReviewEnabled: true,
  marketingEnabled: false,
};

export const useNotificationPreferences =
  (): UseNotificationPreferencesReturn => {
    const user = useAuthStore((s) => s.user);
    const [preferences, setPreferences] =
      useState<NotificationPreferences | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);

    // Fetch preferences on mount
    useEffect(() => {
      const fetchPreferences = async () => {
        if (!user?.id) {
          setIsLoading(false);
          return;
        }

        try {
          const { data, error } = await supabase
            .from('notification_preferences')
            .select('*')
            .eq('user_id', user.id)
            .maybeSingle();

          if (error && error.code !== 'PGRST116') {
            throw error;
          }

          if (data) {
            // Map snake_case to camelCase
            setPreferences({
              id: data.id,
              userId: data.user_id,
              whatsappReminderEnabled: data.whatsapp_reminder_enabled ?? true,
              emailReminderEnabled: data.email_reminder_enabled ?? true,
              bookingReminderEnabled: data.booking_reminder_enabled ?? true,
              bookingReminderHours: data.booking_reminder_hours ?? 24,
              bookingStatusEnabled: data.booking_status_enabled ?? true,
              paymentReceivedEnabled: data.payment_received_enabled ?? true,
              paymentDueEnabled: data.payment_due_enabled ?? true,
              milestoneReminderEnabled: data.milestone_reminder_enabled ?? true,
              newMessageEnabled: data.new_message_enabled ?? true,
              newBookingEnabled: data.new_booking_enabled ?? true,
              newReviewEnabled: data.new_review_enabled ?? true,
              marketingEnabled: data.marketing_enabled ?? false,
            });
          } else {
            // No record exists, set defaults
            setPreferences({
              id: '',
              userId: user.id,
              ...DEFAULT_PREFERENCES,
            });

            // Try to insert default record
            try {
              await supabase.from('notification_preferences').insert({
                user_id: user.id,
                ...Object.entries(DEFAULT_PREFERENCES).reduce(
                  (acc, [key, val]) => {
                    const snakeCase = key.replace(
                      /[A-Z]/g,
                      (letter) => `_${letter.toLowerCase()}`
                    );
                    acc[snakeCase] = val;
                    return acc;
                  },
                  {} as any
                ),
              });
            } catch (insertError) {
              console.error('Error inserting default preferences:', insertError);
              // Still set defaults in memory
            }
          }
        } catch (error) {
          const errorMsg = error instanceof Error ? error.message : typeof error === 'string' ? error : 'An error occurred';
          console.error('Error fetching notification preferences:', errorMsg);
          // Set defaults on error
          setPreferences({
            id: '',
            userId: user.id,
            ...DEFAULT_PREFERENCES,
          });
        } finally {
          setIsLoading(false);
        }
      };

      fetchPreferences();
    }, [user?.id]);

    const updatePreference = useCallback(
      (key: keyof NotificationPreferences, value: any) => {
        setPreferences((prev) =>
          prev ? { ...prev, [key]: value } : null
        );
      },
      []
    );

    const savePreferences = useCallback(async () => {
      if (!user?.id || !preferences) return;

      setIsSaving(true);

      try {
        // Compute noti field
        const noti = preferences.whatsappReminderEnabled &&
          preferences.emailReminderEnabled
          ? 'B'
          : preferences.whatsappReminderEnabled
            ? 'W'
            : preferences.emailReminderEnabled
              ? 'E'
              : 'N';

        // Map camelCase back to snake_case
        const payload = {
          whatsapp_reminder_enabled: preferences.whatsappReminderEnabled,
          email_reminder_enabled: preferences.emailReminderEnabled,
          booking_reminder_enabled: preferences.bookingReminderEnabled,
          booking_reminder_hours: preferences.bookingReminderHours,
          booking_status_enabled: preferences.bookingStatusEnabled,
          payment_received_enabled: preferences.paymentReceivedEnabled,
          payment_due_enabled: preferences.paymentDueEnabled,
          milestone_reminder_enabled: preferences.milestoneReminderEnabled,
          new_message_enabled: preferences.newMessageEnabled,
          new_booking_enabled: preferences.newBookingEnabled,
          new_review_enabled: preferences.newReviewEnabled,
          marketing_enabled: preferences.marketingEnabled,
          noti,
          updated_at: new Date().toISOString(),
        };

        // Try UPDATE first
        const { data: updateResult, error: updateError } = await supabase
          .from('notification_preferences')
          .update(payload)
          .eq('user_id', user.id)
          .select()
          .maybeSingle();

        if (updateError && updateError.code !== 'PGRST116') {
          throw updateError;
        }

        // If no row was updated, INSERT instead
        if (!updateResult) {
          await supabase.from('notification_preferences').insert({
            user_id: user.id,
            ...payload,
          });
        }

        console.log('Notification preferences saved');
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : typeof error === 'string' ? error : 'An error occurred';
        console.error('Error saving preferences:', errorMsg);
        throw error;
      } finally {
        setIsSaving(false);
      }
    }, [user?.id, preferences]);

    return {
      preferences,
      isLoading,
      isSaving,
      updatePreference,
      savePreferences,
    };
  };
