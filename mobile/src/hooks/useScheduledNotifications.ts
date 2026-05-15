import { useState, useEffect } from 'react';
import { useAuthStore } from '@/lib/state/auth-store';
import { supabase } from '@/lib/supabase';

export interface ScheduledNotification {
  id: string;
  userId: string;
  notificationType: string;
  referenceId: string | null;
  referenceType: string | null;
  scheduledFor: string;
  sentAt: string | null;
  title: string;
  body: string | null;
  deepLink: string | null;
  createdAt: string;
}

interface UseScheduledNotificationsReturn {
  scheduledNotifications: ScheduledNotification[];
  isLoading: boolean;
}

export const useScheduledNotifications =
  (): UseScheduledNotificationsReturn => {
    const user = useAuthStore((s) => s.user);
    const [scheduledNotifications, setScheduledNotifications] = useState<
      ScheduledNotification[]
    >([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
      const fetchScheduledNotifications = async () => {
        if (!user?.id) {
          setIsLoading(false);
          return;
        }

        try {
          const now = new Date().toISOString();

          const { data, error } = await supabase
            .from('scheduled_notifications')
            .select('*')
            .eq('user_id', user.id)
            .is('sent_at', null)
            .gte('scheduled_for', now)
            .order('scheduled_for', { ascending: true })
            .limit(20);

          if (error) throw error;

          // Map snake_case to camelCase
          const mapped: ScheduledNotification[] = (data || []).map((item: any) => ({
            id: item.id,
            userId: item.user_id,
            notificationType: item.notification_type,
            referenceId: item.reference_id,
            referenceType: item.reference_type,
            scheduledFor: item.scheduled_for,
            sentAt: item.sent_at,
            title: item.title,
            body: item.body,
            deepLink: item.deep_link,
            createdAt: item.created_at,
          }));

          setScheduledNotifications(mapped);
        } catch (error) {
          const err = error as any;
          const errorMsg = err instanceof Error ? err.message : typeof err === 'string' ? err : 'An error occurred';
          console.error('Error fetching scheduled notifications:', errorMsg);
        } finally {
          setIsLoading(false);
        }
      };

      fetchScheduledNotifications();
    }, [user?.id]);

    return { scheduledNotifications, isLoading };
  };
