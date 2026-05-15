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
      // Get authenticated user
      const { data: authData } = await supabase.auth.getUser();
      const userId = authData?.user?.id;

      if (!userId) {
        console.log('[notifications-store] No authenticated user');
        set({ unreadCount: 0 });
        return;
      }

      console.log('[notifications-store] Fetching unread count for user:', userId);

      // Query all notifications
      const { count, error } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId);

      if (error) {
        console.warn('[notifications-store] Query error:', error.message || 'Unknown error');
        set({ unreadCount: 0 });
        return;
      }

      console.log('[notifications-store] ✅ Unread count:', count);
      set({ unreadCount: count || 0 });
    } catch (err) {
      console.warn('[notifications-store] Unexpected error:', err);
      set({ unreadCount: 0 });
    }
  },
}));
