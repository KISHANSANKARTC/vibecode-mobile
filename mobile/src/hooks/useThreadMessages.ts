import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { extractErrorMessage } from '@/lib/errorUtils';
import { uploadFileToStorage, getContentType } from '@/helpers/uploadToStorage';

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

export interface OtherParty {
  userId: string;
  name: string;
  avatar: string | null;
}

export function useThreadMessages(threadId: string, threadType: 'booking' | 'inquiry', userId: string | undefined) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [otherParty, setOtherParty] = useState<OtherParty | null>(null);
  const [isOtherTyping, setIsOtherTyping] = useState(false);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const typingChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  const TABLE = threadType === 'booking' ? 'chat_messages' : 'inquiry_messages';

  // Fetch messages when thread changes
  useEffect(() => {
    if (!threadId || !userId) return;
    setIsLoading(true);
    setMessages([]);

    const load = async () => {
      try {
        // Fetch thread info to get other party
        if (threadType === 'inquiry') {
          const { data: thread } = await supabase
            .from('inquiry_threads')
            .select('client_user_id')
            .eq('id', threadId)
            .single();

          if (thread?.client_user_id) {
            const { data: profile } = await supabase
              .from('profiles')
              .select('full_name, avatar_url')
              .eq('id', thread.client_user_id)
              .single();

            const { data: company } = await supabase
              .from('client_companies')
              .select('company_name, account_type')
              .eq('user_id', thread.client_user_id)
              .maybeSingle();

            const displayName = company?.account_type === 'organization'
              ? (company.company_name || profile?.full_name || 'Client')
              : (profile?.full_name || 'Client');

            setOtherParty({
              userId: thread.client_user_id,
              name: displayName,
              avatar: profile?.avatar_url || null,
            });
          }
        } else {
          // booking thread — get client from booking
          const { data: chatThread } = await supabase
            .from('chat_threads')
            .select('booking_id')
            .eq('id', threadId)
            .single();

          if (chatThread?.booking_id) {
            const { data: booking } = await supabase
              .from('bookings')
              .select('client_id')
              .eq('id', chatThread.booking_id)
              .single();

            if (booking?.client_id) {
              const { data: profile } = await supabase
                .from('profiles')
                .select('full_name, avatar_url')
                .eq('id', booking.client_id)
                .single();

              setOtherParty({
                userId: booking.client_id,
                name: profile?.full_name || 'Client',
                avatar: profile?.avatar_url || null,
              });
            }
          }
        }

        // Fetch messages
        const { data: msgs } = await supabase
          .from(TABLE)
          .select('*')
          .eq('thread_id', threadId)
          .order('created_at', { ascending: true });

        // Enrich with sender profiles
        if (msgs && msgs.length > 0) {
          const senderIds = [...new Set(msgs.map(m => m.sender_user_id))];
          const { data: profiles } = await supabase
            .from('profiles')
            .select('id, full_name, avatar_url')
            .in('id', senderIds);
          const profileMap = new Map((profiles || []).map(p => [p.id, p]));
          const enrichedMessages = msgs.map(m => {
            const sender = profileMap.get(m.sender_user_id);
            return {
              ...m,
              sender: sender as SenderProfile | undefined,
            };
          });
          setMessages(enrichedMessages as Message[]);
        } else {
          setMessages([]);
        }

        // Mark all unread messages from other party as read
        await supabase
          .from(TABLE)
          .update({ read_at: new Date().toISOString() })
          .eq('thread_id', threadId)
          .neq('sender_user_id', userId)
          .is('read_at', null);

        setIsLoading(false);
      } catch (error) {
        const err = error as any;
        const errorMsg = err instanceof Error ? err.message : typeof err === 'string' ? err : 'An error occurred';
        console.error('Error loading thread messages:', errorMsg);
        setIsLoading(false);
      }
    };

    load();

    // Cleanup old channel
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
    }

    // Subscribe to new messages in this thread
    const channel = supabase
      .channel(`talent-thread-${threadId}`)
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: TABLE, filter: `thread_id=eq.${threadId}` },
        async (payload) => {
          const newMsg = payload.new as Message;
          const { data: profile } = await supabase
            .from('profiles')
            .select('id, full_name, avatar_url')
            .eq('id', newMsg.sender_user_id)
            .single();

          setMessages(prev => {
            if (prev.find(m => m.id === newMsg.id)) return prev;
            const enrichedMsg: Message = {
              ...newMsg,
              sender: profile as SenderProfile | undefined,
            };
            return [...prev, enrichedMsg];
          });

          // Mark as read if from other party
          if (newMsg.sender_user_id !== userId) {
            await supabase
              .from(TABLE)
              .update({ read_at: new Date().toISOString() })
              .eq('id', newMsg.id);
          }
        }
      )
      .on('postgres_changes',
        { event: 'UPDATE', schema: 'public', table: TABLE, filter: `thread_id=eq.${threadId}` },
        (payload) => {
          const updated = payload.new as Message;
          setMessages(prev => prev.map(m => m.id === updated.id ? { ...m, read_at: updated.read_at } : m));
        }
      )
      .subscribe();

    channelRef.current = channel;

    // Typing indicator
    if (typingChannelRef.current) {
      supabase.removeChannel(typingChannelRef.current);
    }
    const typingChannel = supabase.channel(`typing-${threadId}`);
    typingChannelRef.current = typingChannel;
    typingChannel
      .on('presence', { event: 'sync' }, () => {
        const state = typingChannel.presenceState();
        let found = false;
        Object.values(state).forEach((presences: any[]) => {
          presences.forEach(p => {
            if (p.user_id !== userId && p.is_typing) found = true;
          });
        });
        setIsOtherTyping(found);
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await typingChannel.track({ user_id: userId, is_typing: false });
        }
      });

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
      if (typingChannelRef.current) {
        supabase.removeChannel(typingChannelRef.current);
        typingChannelRef.current = null;
      }
    };
  }, [threadId, threadType, userId]);

  // Send a message
  const sendMessage = useCallback(async (text: string, fileAsset?: any) => {
    if (!threadId || !userId) {
      throw new Error('Cannot send message: thread or user not available');
    }

    let attachmentUrl = null;

    if (fileAsset) {
      const ext = fileAsset.uri.split('.').pop()?.toLowerCase() || 'jpg';
      const fileName = `${userId}/${threadId}/${Date.now()}.${ext}`;
      const contentType = getContentType(ext, fileAsset.type?.includes('video') || false);

      console.log('[useThreadMessages] Uploading attachment:', { fileName, uri: fileAsset.uri, type: fileAsset.type });

      const { publicUrl, error } = await uploadFileToStorage(
        'chat-attachments',
        fileName,
        fileAsset.uri,
        contentType
      );

      if (error) {
        const err = error as any;
        const errorMsg = err instanceof Error ? err.message : typeof err === 'string' ? err : 'An error occurred';
        console.error('[useThreadMessages] Upload error:', errorMsg);
        throw new Error('Failed to upload attachment');
      } else if (publicUrl) {
        console.log('[useThreadMessages] Attachment uploaded successfully:', publicUrl);
        attachmentUrl = publicUrl;
      }
    }

    const { data: newMsg, error } = await supabase
      .from(TABLE)
      .insert({
        thread_id: threadId,
        sender_user_id: userId,
        message_text: text || null,
        attachment_url: attachmentUrl,
      })
      .select('*')
      .single();

    if (error) {
      console.error('sendMessage error:', extractErrorMessage(error));
      throw new Error(`Failed to send message: ${error.message}`);
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('id, full_name, avatar_url')
      .eq('id', userId)
      .single();

    setMessages(prev => {
      if (prev.find(m => m.id === newMsg.id)) return prev;
      const enrichedMsg: Message = {
        ...newMsg,
        sender: profile as SenderProfile | undefined,
      };
      return [...prev, enrichedMsg];
    });

    // Create notification for the other party
    if (otherParty?.userId) {
      const senderName = profile?.full_name || 'Someone';
      const messagePreview = text
        ? text.substring(0, 50) + (text.length > 50 ? '...' : '')
        : 'Sent a file';

      const deepLinkPath = `/talent/messages/${threadId}`;
      console.log('[useThreadMessages] Creating notification:', {
        user_id: otherParty.userId,
        type: 'message',
        title: `${senderName} sent you a message`,
        body: messagePreview,
        deep_link: deepLinkPath,
      });

      const { data: notifResult, error: notifError } = await supabase.from('notifications').insert({
        user_id: otherParty.userId,
        type: 'message',
        title: `${senderName} sent you a message`,
        body: messagePreview,
        deep_link: deepLinkPath,
      }).select();

      if (notifError) {
        console.error('[useThreadMessages] Notification creation error:', notifError);
      } else {
        console.log('[useThreadMessages] Notification created:', notifResult);
      }
    }
  }, [threadId, userId, otherParty]);

  // Broadcast typing indicator
  const sendTypingIndicator = useCallback(async (isTyping: boolean) => {
    if (!typingChannelRef.current) return;
    try {
      await typingChannelRef.current.track({ user_id: userId, is_typing: isTyping });
    } catch {
      // Silently fail
    }
  }, [userId]);

  return {
    messages,
    isLoading,
    otherParty,
    isOtherTyping,
    sendMessage,
    sendTypingIndicator,
  };
}
