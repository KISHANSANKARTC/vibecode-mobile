import { create } from 'zustand';
import { supabase } from '@/lib/supabase';

interface NotificationsStore {
  unreadCount: number;
  setUnreadCount: (count: number) => void;
  incrementUnreadCount: () => void;
  decrementUnreadCount: () => void;
  fetchUnreadCount: () => Promise<void>;
}

export const useNotificationsStore = create<NotificationsStore>((set) => ({
  unreadCount: 0,
  setUnreadCount: (count) => set({ unreadCount: count }),
  incrementUnreadCount: () => set((state) => ({ unreadCount: state.unreadCount + 1 })),
  decrementUnreadCount: () =>
    set((state) => ({ unreadCount: Math.max(0, state.unreadCount - 1) })),
  fetchUnreadCount: async () => {
    try {
      const { data: authData } = await supabase.auth.getUser();
      const userId = authData?.user?.id;

      if (!userId) {
        set({ unreadCount: 0 });
        return;
      }

      // Count UNREAD notifications only (read_at IS NULL).
      // The notifications table uses `read_at` (timestamptz) — there is no `is_read` column.
      const { count, error } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .is('read_at', null);

      if (error) {
        console.warn('[notifications-store] Query error:', error.message || 'Unknown error');
        set({ unreadCount: 0 });
        return;
      }

      set({ unreadCount: count || 0 });
    } catch (err) {
      console.warn('[notifications-store] Unexpected error:', err);
      set({ unreadCount: 0 });
    }
  },
}));
