import { useState, useEffect, useCallback, useRef } from 'react';
import { InteractionManager } from 'react-native';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/lib/state/auth-store';

export interface Notification {
  id: string;
  userId: string;
  type: string;
  title: string;
  body?: string;
  deepLink?: string;
  readAt: Date | null;
  createdAt: Date;
}

export function useNotifications() {
  const user = useAuthStore((state) => state.user);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const channelRef = useRef<any>(null);
  const notificationsRef = useRef<Notification[]>([]);

  // Keep ref in sync for use inside callbacks
  useEffect(() => {
    notificationsRef.current = notifications;
  }, [notifications]);

  // FETCH: Load all notifications for the current user from Supabase
  const fetchNotifications = useCallback(async () => {
    if (!user?.id) {
      setIsLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) {
        console.error('Supabase error:', error.message || 'Unknown error');
        throw error;
      }

      const mapped = (data || []).map((n: any) => ({
        id: n.id,
        userId: n.user_id,
        type: n.type,
        title: n.title,
        body: n.body || '',
        deepLink: n.deep_link,
        readAt: n.read_at ? new Date(n.read_at) : null,
        createdAt: new Date(n.created_at),
      }));

      setNotifications(mapped);
      setUnreadCount(mapped.filter((n) => !n.readAt).length);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : error && typeof error === 'object' && 'message' in error ? (error as any).message : typeof error === 'string' ? error : 'Unknown error';
      console.error('Error fetching notifications:', errorMsg);
    } finally {
      setIsLoading(false);
    }
  }, [user?.id]);

  // Use ref to prevent double fetching
  const hasFetchedRef = useRef(false);

  useEffect(() => {
    if (hasFetchedRef.current) return;
    hasFetchedRef.current = true;

    // Defer initial fetch until after animations for smoother startup
    const interactionTask = InteractionManager.runAfterInteractions(() => {
      fetchNotifications();
    });

    return () => {
      interactionTask.cancel();
    };
  }, [fetchNotifications]);

  // REALTIME: Subscribe to INSERT / UPDATE / DELETE on the notifications table
  useEffect(() => {
    if (!user?.id) return;

    // Clean up old channel first
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }

    const channel = supabase
      .channel(`notifications:${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`,
        },
        (payload: any) => {
          const newNotif: Notification = {
            id: payload.new.id,
            userId: payload.new.user_id,
            type: payload.new.type,
            title: payload.new.title,
            body: payload.new.body || '',
            deepLink: payload.new.deep_link,
            readAt: payload.new.read_at ? new Date(payload.new.read_at) : null,
            createdAt: new Date(payload.new.created_at),
          };
          setNotifications((prev) => [newNotif, ...prev]);
          // Only increment unread count if the notification is actually unread
          if (!newNotif.readAt) {
            setUnreadCount((prev) => prev + 1);
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`,
        },
        (payload: any) => {
          setNotifications((prev) => {
            const next = prev.map((n) =>
              n.id === payload.new.id
                ? { ...n, readAt: payload.new.read_at ? new Date(payload.new.read_at) : null }
                : n
            );
            setUnreadCount(next.filter((n) => !n.readAt).length);
            return next;
          });
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`,
        },
        (payload: any) => {
          setNotifications((prev) => {
            const filtered = prev.filter((n) => n.id !== payload.old.id);
            setUnreadCount(filtered.filter((n) => !n.readAt).length);
            return filtered;
          });
        }
      )
      .subscribe();

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [user?.id]);

  // MARK ONE AS READ
  const markAsRead = useCallback(async (notificationId: string) => {
    try {
      await supabase
        .from('notifications')
        .update({ read_at: new Date().toISOString() })
        .eq('id', notificationId);

      setNotifications((prev) =>
        prev.map((n) => (n.id === notificationId ? { ...n, readAt: new Date() } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (error) {
      const err = error as any;
      const errorMsg = err instanceof Error ? err.message : typeof err === 'string' ? err : 'An error occurred';
      console.error('Error marking as read:', errorMsg);
    }
  }, []);

  // MARK ALL AS READ
  const markAllAsRead = useCallback(async () => {
    if (!user?.id) return;
    try {
      await supabase
        .from('notifications')
        .update({ read_at: new Date().toISOString() })
        .eq('user_id', user.id)
        .is('read_at', null);

      setNotifications((prev) => prev.map((n) => ({ ...n, readAt: n.readAt || new Date() })));
      setUnreadCount(0);
    } catch (error) {
      const err = error as any;
      const errorMsg = err instanceof Error ? err.message : typeof err === 'string' ? err : 'An error occurred';
      console.error('Error marking all as read:', errorMsg);
    }
  }, [user?.id]);

  // DELETE ONE NOTIFICATION
  const deleteNotification = useCallback(async (notificationId: string) => {
    try {
      await supabase.from('notifications').delete().eq('id', notificationId);

      const notif = notificationsRef.current.find((n) => n.id === notificationId);
      setNotifications((prev) => prev.filter((n) => n.id !== notificationId));
      if (notif && !notif.readAt) {
        setUnreadCount((prev) => Math.max(0, prev - 1));
      }
    } catch (error) {
      const err = error as any;
      const errorMsg = err instanceof Error ? err.message : typeof err === 'string' ? err : 'An error occurred';
      console.error('Error deleting notification:', errorMsg);
    }
  }, []);

  return {
    notifications,
    unreadCount,
    isLoading,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    refetch: fetchNotifications,
  };
}
