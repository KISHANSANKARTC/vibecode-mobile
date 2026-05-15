import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';

export interface SenderProfile {
  id: string;
  full_name: string;
  avatar_url: string | null;
}

export interface Message {
  id: string;
  thread_id: string;
  sender_user_id: string;
  message_text: string | null;
  attachment_url: string | null;
  created_at: string;
  read_at: string | null;
  sender?: SenderProfile;
}

export interface ChatThread {
  id: string;
  booking_id: string;
  created_at: string;
}

export function useChat(bookingId: string) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [thread, setThread] = useState<ChatThread | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [typingUsers, setTypingUsers] = useState<Set<string>>(new Set());
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const typingChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const markedAsReadRef = useRef<Set<string>>(new Set());

  // Initialize: get current user and fetch/create chat thread
  useEffect(() => {
    const initialize = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          setIsLoading(false);
          return;
        }
        setCurrentUserId(user.id);

        // Fetch or create chat thread
        const threadData = await fetchOrCreateThread(bookingId);
        if (threadData) {
          setThread(threadData);
          // Now fetch messages for this thread
          await fetchMessages(threadData.id, user.id);
          // Subscribe to realtime updates
          subscribeToMessages(threadData.id, user.id);
          subscribeToTyping(threadData.id, user.id);
        }
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : typeof error === 'string' ? error : 'An error occurred';
        console.error('Error initializing chat:', errorMsg);
      } finally {
        setIsLoading(false);
      }
    };

    initialize();

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
      if (typingChannelRef.current) {
        supabase.removeChannel(typingChannelRef.current);
      }
    };
  }, [bookingId]);

  // Fetch or create chat thread
  const fetchOrCreateThread = async (bookingId: string): Promise<ChatThread | null> => {
    try {
      // Try to fetch existing thread
      const { data: threadData, error: fetchError } = await supabase
        .from('chat_threads')
        .select('*')
        .eq('booking_id', bookingId)
        .maybeSingle();

      if (fetchError && fetchError.code !== 'PGRST116') {
        throw fetchError;
      }

      // If thread exists, return it
      if (threadData) {
        return threadData;
      }

      // Thread doesn't exist, create one
      const { data: newThread, error: insertError } = await supabase
        .from('chat_threads')
        .insert({ booking_id: bookingId })
        .select()
        .single();

      if (insertError) {
        // Thread may have been created by the other party simultaneously
        const { data: retryThread } = await supabase
          .from('chat_threads')
          .select('*')
          .eq('booking_id', bookingId)
          .maybeSingle();
        return retryThread || null;
      }

      return newThread;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : typeof error === 'string' ? error : 'An error occurred';
      console.error('Error fetching or creating thread:', errorMsg);
      return null;
    }
  };

  // Fetch messages for a thread
  const fetchMessages = async (threadId: string, userId: string) => {
    try {
      const { data: msgs, error } = await supabase
        .from('chat_messages')
        .select('*')
        .eq('thread_id', threadId)
        .order('created_at', { ascending: true });

      if (error) throw error;

      // Enrich with sender profiles
      if (msgs && msgs.length > 0) {
        const senderIds = [...new Set(msgs.map(m => m.sender_user_id))];
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, full_name, avatar_url')
          .in('id', senderIds);

        const profileMap = new Map((profiles || []).map(p => [p.id, p]));
        const enrichedMessages: Message[] = msgs.map(m => {
          const sender = profileMap.get(m.sender_user_id);
          return {
            ...m,
            sender: sender as SenderProfile | undefined,
          };
        });

        setMessages(enrichedMessages);

        // Mark unread messages from other party as read
        const unreadFromOther = msgs.filter(
          m => m.sender_user_id !== userId && !m.read_at
        );

        if (unreadFromOther.length > 0) {
          await supabase
            .from('chat_messages')
            .update({ read_at: new Date().toISOString() })
            .in('id', unreadFromOther.map(m => m.id));
        }
      } else {
        setMessages([]);
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : typeof error === 'string' ? error : 'An error occurred';
      console.error('Error fetching messages:', errorMsg);
    }
  };

  // Subscribe to new/updated messages
  const subscribeToMessages = (threadId: string, userId: string) => {
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
    }

    const channel = supabase
      .channel(`chat-thread-${threadId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
          filter: `thread_id=eq.${threadId}`,
        },
        async (payload) => {
          const newMsg = payload.new as Message;

          // Fetch sender profile
          const { data: profile } = await supabase
            .from('profiles')
            .select('id, full_name, avatar_url')
            .eq('id', newMsg.sender_user_id)
            .single();

          setMessages((prev): Message[] => {
            if (prev.find(m => m.id === newMsg.id)) return prev;
            const enrichedMsg: Message = {
              ...newMsg,
              sender: profile as SenderProfile | undefined,
            };
            return [...prev, enrichedMsg];
          });

          // Mark as read if from other party
          if (newMsg.sender_user_id !== userId && !newMsg.read_at) {
            await supabase
              .from('chat_messages')
              .update({ read_at: new Date().toISOString() })
              .eq('id', newMsg.id);
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'chat_messages',
          filter: `thread_id=eq.${threadId}`,
        },
        (payload) => {
          const updated = payload.new as Message;
          setMessages((prev): Message[] =>
            prev.map(m => (m.id === updated.id ? { ...m, read_at: updated.read_at } : m))
          );
        }
      )
      .subscribe();

    channelRef.current = channel;
  };

  // Subscribe to typing indicators
  const subscribeToTyping = (threadId: string, userId: string) => {
    if (typingChannelRef.current) {
      supabase.removeChannel(typingChannelRef.current);
    }

    const typingChannel = supabase.channel(`typing-${threadId}`);
    typingChannelRef.current = typingChannel;

    typingChannel
      .on('presence', { event: 'sync' }, () => {
        const state = typingChannel.presenceState();
        const typing = new Set<string>();
        Object.values(state).forEach((presences: any[]) => {
          presences.forEach(p => {
            if (p.user_id !== userId && p.is_typing) {
              typing.add(p.user_id);
            }
          });
        });
        setTypingUsers(typing);
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await typingChannel.track({ user_id: userId, is_typing: false });
        }
      });
  };

  // Send a message
  const sendMessage = useCallback(async (text: string, attachmentPath?: string) => {
    if (!thread || !currentUserId) return;

    try {
      const { data: newMsg, error } = await supabase
        .from('chat_messages')
        .insert({
          thread_id: thread.id,
          sender_user_id: currentUserId,
          message_text: text || null,
          attachment_url: attachmentPath || null,
        })
        .select('*')
        .single();

      if (error) throw error;

      // Fetch sender profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url')
        .eq('id', currentUserId)
        .single();

      setMessages((prev): Message[] => {
        if (prev.find(m => m.id === newMsg.id)) return prev;
        const enrichedMsg: Message = {
          ...newMsg,
          sender: profile as SenderProfile | undefined,
        };
        return [...prev, enrichedMsg];
      });
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : typeof error === 'string' ? error : 'An error occurred';
      console.error('Error sending message:', errorMsg);
      throw error;
    }
  }, [thread, currentUserId]);

  // Mark messages as read
  const markAsRead = useCallback(async (messageId: string) => {
    if (markedAsReadRef.current.has(messageId)) return;

    markedAsReadRef.current.add(messageId);

    try {
      await supabase
        .from('chat_messages')
        .update({ read_at: new Date().toISOString() })
        .eq('id', messageId);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : typeof error === 'string' ? error : 'An error occurred';
      console.error('Error marking message as read:', errorMsg);
    }
  }, []);

  // Broadcast typing indicator
  const setTyping = useCallback(async (isTyping: boolean) => {
    if (!typingChannelRef.current) return;
    try {
      await typingChannelRef.current.track({ user_id: currentUserId, is_typing: isTyping });
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : typeof error === 'string' ? error : 'An error occurred';
      console.error('Error setting typing indicator:', errorMsg);
    }
  }, [currentUserId]);

  return {
    messages,
    isLoading,
    sendMessage,
    markAsRead,
    currentUserId,
    typingUsers,
    setTyping,
    thread,
  };
}
