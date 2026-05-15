import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/lib/state/auth-store';

export interface ThreadData {
  id: string;
  type: 'inquiry' | 'booking';
  clientUserId: string;
  otherPartyName: string;
  otherPartyAvatar: string | null;
  lastMessage: string | null;
  lastMessageTime: string | null;
  lastMessageSenderId: string | null;
  unreadCount: number;
  updatedAt: string;
  bookingId?: string;
}

export function useTalentMessages() {
  const user = useAuthStore((state) => state.user);
  const [threads, setThreads] = useState<ThreadData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const isFetchingRef = useRef(false);
  const hasLoadedRef = useRef(false);

  const fetchThreads = useCallback(async () => {
    if (!user?.id) {
      setIsLoading(false);
      return;
    }
    if (isFetchingRef.current) return;
    isFetchingRef.current = true;
    if (!hasLoadedRef.current) setIsLoading(true);

    try {
      const allThreads: ThreadData[] = [];

      // Step 1: Get talent profile
      const { data: talentProfile } = await supabase
        .from('talent_profiles')
        .select('id, is_verified')
        .eq('user_id', user.id)
        .maybeSingle();

      if (!talentProfile) {
        setThreads([]);
        setIsLoading(false);
        isFetchingRef.current = false;
        return;
      }

      // Step 2: Fetch inquiry threads + booking talent IDs in parallel
      const [inquiryResult, bookingTalentsResult] = await Promise.all([
        supabase
          .from('inquiry_threads')
          .select('*')
          .eq('talent_id', talentProfile.id)
          .order('updated_at', { ascending: false }),
        supabase
          .from('booking_talents')
          .select('booking_id')
          .eq('talent_id', talentProfile.id),
      ]);

      const inquiryThreads = inquiryResult.data || [];
      const bookingIds = (bookingTalentsResult.data || []).map(bt => bt.booking_id);

      // Step 3: Fetch client profiles for inquiry threads
      const clientIds = [...new Set(inquiryThreads.map(t => t.client_user_id))];
      const [clientProfilesResult, inquiryCompaniesResult] = await Promise.all([
        clientIds.length > 0
          ? supabase.from('profiles').select('id, full_name, avatar_url').in('id', clientIds)
          : Promise.resolve({ data: [] }),
        clientIds.length > 0
          ? supabase.from('client_companies').select('user_id, company_name, account_type').in('user_id', clientIds)
          : Promise.resolve({ data: [] }),
      ]);

      const clientProfileMap = new Map((clientProfilesResult.data || []).map(p => [p.id, p]));
      const clientCompanyMap = new Map((inquiryCompaniesResult.data || []).map(c => [c.user_id, c]));

      // Step 4: Fetch last message + unread count for each inquiry thread
      const inquiryMessageResults = await Promise.all(
        inquiryThreads.map(thread =>
          Promise.all([
            supabase
              .from('inquiry_messages')
              .select('message_text, created_at, sender_user_id')
              .eq('thread_id', thread.id)
              .order('created_at', { ascending: false })
              .limit(1)
              .maybeSingle(),
            supabase
              .from('inquiry_messages')
              .select('*', { count: 'exact', head: true })
              .eq('thread_id', thread.id)
              .neq('sender_user_id', user.id)
              .is('read_at', null),
          ])
        )
      );

      // Build inquiry threads
      inquiryThreads.forEach((thread, idx) => {
        const clientProfile = clientProfileMap.get(thread.client_user_id);
        const company = clientCompanyMap.get(thread.client_user_id);
        const displayName = company?.account_type === 'organization'
          ? (company.company_name || clientProfile?.full_name || 'Client')
          : (clientProfile?.full_name || 'Client');
        const [lastMsgResult, unreadResult] = inquiryMessageResults[idx] || [{ data: null }, { count: 0 }];

        if (!lastMsgResult.data) return; // skip empty threads

        allThreads.push({
          id: thread.id,
          type: 'inquiry',
          clientUserId: thread.client_user_id,
          otherPartyName: displayName,
          otherPartyAvatar: clientProfile?.avatar_url || null,
          lastMessage: lastMsgResult.data?.message_text || null,
          lastMessageTime: lastMsgResult.data?.created_at || null,
          lastMessageSenderId: lastMsgResult.data?.sender_user_id || null,
          unreadCount: unreadResult.count || 0,
          updatedAt: thread.updated_at,
        });
      });

      // Step 5: Fetch booking chat threads
      if (bookingIds.length > 0) {
        const { data: chatThreads } = await supabase
          .from('chat_threads')
          .select('*')
          .in('booking_id', bookingIds);

        if (chatThreads && chatThreads.length > 0) {
          const chatBookingIds = chatThreads.map(t => t.booking_id);
          const { data: bookings } = await supabase
            .from('bookings')
            .select('id, client_id')
            .in('id', chatBookingIds);

          const bookingMap = new Map((bookings || []).map(b => [b.id, b]));
          const bookingClientIds = [...new Set((bookings || []).map(b => b.client_id))];

          const [bookingClientProfiles, chatMessagesResults] = await Promise.all([
            bookingClientIds.length > 0
              ? supabase.from('profiles').select('id, full_name, avatar_url').in('id', bookingClientIds)
              : Promise.resolve({ data: [] }),
            Promise.all(chatThreads.map(thread =>
              Promise.all([
                supabase
                  .from('chat_messages')
                  .select('message_text, created_at, sender_user_id')
                  .eq('thread_id', thread.id)
                  .order('created_at', { ascending: false })
                  .limit(1)
                  .maybeSingle(),
                supabase
                  .from('chat_messages')
                  .select('*', { count: 'exact', head: true })
                  .eq('thread_id', thread.id)
                  .neq('sender_user_id', user.id)
                  .is('read_at', null),
              ])
            )),
          ]);

          const bookingClientProfileMap = new Map((bookingClientProfiles.data || []).map(p => [p.id, p]));

          chatThreads.forEach((thread, idx) => {
            const booking = bookingMap.get(thread.booking_id);
            if (!booking) return;
            const clientProfile = bookingClientProfileMap.get(booking.client_id);
            const [lastMsgResult, unreadResult] = chatMessagesResults[idx] || [{ data: null }, { count: 0 }];

            if (!lastMsgResult.data) return; // skip empty threads

            allThreads.push({
              id: thread.id,
              type: 'booking',
              bookingId: thread.booking_id,
              clientUserId: booking.client_id,
              otherPartyName: clientProfile?.full_name || 'Client',
              otherPartyAvatar: clientProfile?.avatar_url || null,
              lastMessage: lastMsgResult.data?.message_text || null,
              lastMessageTime: lastMsgResult.data?.created_at || null,
              lastMessageSenderId: lastMsgResult.data?.sender_user_id || null,
              unreadCount: unreadResult.count || 0,
              updatedAt: lastMsgResult.data?.created_at || thread.created_at,
            });
          });
        }
      }

      // Sort by most recent
      allThreads.sort((a, b) => {
        const timeA = a.lastMessageTime || a.updatedAt;
        const timeB = b.lastMessageTime || b.updatedAt;
        return new Date(timeB).getTime() - new Date(timeA).getTime();
      });

      setThreads(allThreads);
      hasLoadedRef.current = true;
    } catch (err) {
      console.error('useTalentMessages error:', err);
    } finally {
      setIsLoading(false);
      isFetchingRef.current = false;
    }
  }, [user?.id]);

  useEffect(() => {
    fetchThreads();
  }, [fetchThreads]);

  // Realtime: subscribe to new inquiry_messages and chat_messages
  useEffect(() => {
    if (!user?.id) return;

    let debounceTimer: ReturnType<typeof setTimeout> | null = null;
    const debouncedFetch = () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => fetchThreads(), 400);
    };

    const inquiryChannel = supabase
      .channel('talent-inquiry-messages-list')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'inquiry_messages' }, debouncedFetch)
      .subscribe();

    const chatChannel = supabase
      .channel('talent-chat-messages-list')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'chat_messages' }, debouncedFetch)
      .subscribe();

    return () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      supabase.removeChannel(inquiryChannel);
      supabase.removeChannel(chatChannel);
    };
  }, [user?.id, fetchThreads]);

  const totalUnreadCount = threads.reduce((sum, t) => sum + (t.unreadCount || 0), 0);
  const gigsCount = threads.filter(t => t.type === 'booking').length;
  const chatsCount = threads.filter(t => t.type === 'inquiry').length;
  const unreadThreadsCount = threads.filter(t => t.unreadCount > 0).length;

  return {
    threads,
    isLoading,
    totalUnreadCount,
    gigsCount,
    chatsCount,
    unreadThreadsCount,
    refetch: fetchThreads,
  };
}
