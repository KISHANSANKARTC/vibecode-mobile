import {
  View,
  Text,
  TextInput,
  Pressable,
  Image,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  StatusBar,
  Alert,
  Modal,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft, Send, Paperclip, X, MoreVertical } from 'lucide-react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { useState, useCallback, useEffect, useRef } from 'react';
import { useLocalSearchParams } from 'expo-router';
import { useRouter } from '@/lib/router-helper';
import * as ImagePicker from 'expo-image-picker';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/lib/state/auth-store';
import { uploadFile } from '@/lib/upload';
import { useTheme } from '@/lib/theme/ThemeContext';
import { extractErrorMessage } from '@/lib/errorUtils';

interface Message {
  id: string;
  content: string;
  senderName: string;
  senderAvatar: string;
  isSent: boolean;
  timestamp: string;
  isRead: boolean;
  attachment_url?: string;
}

interface ThreadInfo {
  otherUserName: string;
  otherUserAvatar: string;
  bookingTitle?: string;
  booking_id?: string;
  otherUserId?: string;
}

const PLACEHOLDER_AVATAR = 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&h=200&fit=crop';

function formatTime(timestamp: string): string {
  try {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
  } catch {
    return '';
  }
}

function formatDate(timestamp: string): string {
  try {
    const date = new Date(timestamp);
    const today = new Date();

    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    }

    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    }

    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: date.getFullYear() !== today.getFullYear() ? 'numeric' : undefined });
  } catch {
    return '';
  }
}

function shouldShowDateSeparator(current: string, previous: string | null): boolean {
  if (!previous) return true;
  return formatDate(current) !== formatDate(previous);
}

export default function TalentChatDetailScreen() {
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const userId = useAuthStore((s) => s.user?.id);
  const { isDark } = useTheme();

  const [threadInfo, setThreadInfo] = useState<ThreadInfo | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [messageText, setMessageText] = useState('');
  const [sending, setSending] = useState(false);
  const [otherUserId, setOtherUserId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [threadType, setThreadType] = useState<'inquiry' | 'booking' | null>(null);
  const [selectedFile, setSelectedFile] = useState<{uri: string, name: string, type: string} | null>(null);
  const [menuVisible, setMenuVisible] = useState(false);
  const [linkModalVisible, setLinkModalVisible] = useState(false);
  const [linkUrl, setLinkUrl] = useState('');
  const [linkTitle, setLinkTitle] = useState('');

  const flatListRef = useRef<FlatList>(null);

  const threadId = Array.isArray(id) ? id[0] : id;

  // Fetch thread info and messages
  const fetchThreadData = useCallback(async () => {
    if (!userId || !threadId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Try to determine if this is an inquiry or booking thread
      // First check inquiry_threads
      const { data: inquiryThreadData, error: inquiryError } = await supabase
        .from('inquiry_threads')
        .select('id, client_user_id')
        .eq('id', threadId)
        .maybeSingle();

      if (inquiryThreadData) {
        // It's an inquiry thread
        setThreadType('inquiry');

        // Step 2: Resolve client name (client_user_id → profiles)
        const { data: clientProfile, error: clientError } = await supabase
          .from('profiles')
          .select('full_name, avatar_url')
          .eq('id', inquiryThreadData.client_user_id)
          .maybeSingle();

        if (clientError || !clientProfile) {
          console.error('Client profile error:', clientError);
          setError('Failed to load user info');
          setLoading(false);
          return;
        }

        setThreadInfo({
          otherUserName: clientProfile.full_name || 'Unknown',
          otherUserAvatar: clientProfile.avatar_url || PLACEHOLDER_AVATAR,
        });
        setOtherUserId(inquiryThreadData.client_user_id);

        // Step 3: Fetch inquiry messages
        const { data: messagesData, error: messagesError } = await supabase
          .from('inquiry_messages')
          .select('*')
          .eq('thread_id', threadId)
          .order('created_at', { ascending: true });

        if (messagesError) {
          console.error('Error fetching messages:', messagesError);
          setError('Failed to load messages');
          setLoading(false);
          return;
        }

        if (!messagesData || messagesData.length === 0) {
          setMessages([]);
          setLoading(false);
          return;
        }


        // Step 4: Resolve sender names for messages
        const senderIds = [...new Set(messagesData.map((m) => m.sender_user_id))];
        const { data: senderProfiles, error: senderError } = await supabase
          .from('profiles')
          .select('id, full_name, avatar_url')
          .in('id', senderIds);

        if (senderError) {
          console.error('Error fetching sender profiles:', senderError);
        }

        const senderProfilesMap = new Map(senderProfiles?.map((p) => [p.id, p]) || []);

        const formattedMessages: Message[] = messagesData.map((msg) => {
          const senderProfile = senderProfilesMap.get(msg.sender_user_id);
          return {
            id: msg.id,
            content: msg.message_text || '',
            senderName: msg.sender_user_id === userId ? 'You' : (senderProfile?.full_name || 'Unknown'),
            senderAvatar: msg.sender_user_id === userId ? '' : (senderProfile?.avatar_url || PLACEHOLDER_AVATAR),
            isSent: msg.sender_user_id === userId,
            timestamp: msg.created_at,
            isRead: !!msg.read_at,
            attachment_url: msg.attachment_url || undefined,
          };
        });

        setMessages(formattedMessages);

        // Mark as read
        const unreadIds = messagesData
          .filter((m) => m.sender_user_id !== userId && !m.read_at)
          .map((m) => m.id);

        if (unreadIds.length > 0) {
          await supabase
            .from('inquiry_messages')
            .update({ read_at: new Date().toISOString() })
            .in('id', unreadIds);
        }

        setLoading(false);
        return;
      }

      // If not found in inquiry_threads, try chat_threads
      const { data: chatThreadData, error: chatError } = await supabase
        .from('chat_threads')
        .select('id, booking_id')
        .eq('id', threadId)
        .maybeSingle();

      if (chatThreadData) {
        // It's a booking/chat thread
        setThreadType('booking');

        // Get booking and client info
        const { data: booking } = await supabase
          .from('bookings')
          .select('id, client_id')
          .eq('id', chatThreadData.booking_id)
          .maybeSingle();

        if (!booking) {
          setError('Booking not found');
          setLoading(false);
          return;
        }

        // Get client profile
        const { data: clientProfile } = await supabase
          .from('profiles')
          .select('full_name, avatar_url')
          .eq('id', booking.client_id)
          .maybeSingle();

        if (!clientProfile) {
          setError('Failed to load user info');
          setLoading(false);
          return;
        }

        setThreadInfo({
          otherUserName: clientProfile.full_name || 'Unknown',
          otherUserAvatar: clientProfile.avatar_url || PLACEHOLDER_AVATAR,
          booking_id: chatThreadData.booking_id,
          otherUserId: booking.client_id,
        });
        setOtherUserId(booking.client_id);

        // Fetch chat messages
        const { data: messagesData, error: messagesError } = await supabase
          .from('chat_messages')
          .select('*')
          .eq('thread_id', threadId)
          .order('created_at', { ascending: true });

        if (messagesError) {
          console.error('Error fetching messages:', messagesError);
          setError('Failed to load messages');
          setLoading(false);
          return;
        }

        if (!messagesData || messagesData.length === 0) {
          setMessages([]);
          setLoading(false);
          return;
        }


        // Resolve sender names
        const senderIds = [...new Set(messagesData.map((m) => m.sender_user_id))];
        const { data: senderProfiles, error: senderError } = await supabase
          .from('profiles')
          .select('id, full_name, avatar_url')
          .in('id', senderIds);

        if (senderError) {
          console.error('Error fetching sender profiles:', senderError);
        }

        const senderProfilesMap = new Map(senderProfiles?.map((p) => [p.id, p]) || []);

        const formattedMessages: Message[] = messagesData.map((msg) => {
          const senderProfile = senderProfilesMap.get(msg.sender_user_id);
          return {
            id: msg.id,
            content: msg.message_text || '',
            senderName: msg.sender_user_id === userId ? 'You' : (senderProfile?.full_name || 'Unknown'),
            senderAvatar: msg.sender_user_id === userId ? '' : (senderProfile?.avatar_url || PLACEHOLDER_AVATAR),
            isSent: msg.sender_user_id === userId,
            timestamp: msg.created_at,
            isRead: !!msg.read_at,
            attachment_url: msg.attachment_url || undefined,
          };
        });

        setMessages(formattedMessages);

        // Mark as read
        const unreadIds = messagesData
          .filter((m) => m.sender_user_id !== userId && !m.read_at)
          .map((m) => m.id);

        if (unreadIds.length > 0) {
          await supabase
            .from('chat_messages')
            .update({ read_at: new Date().toISOString() })
            .in('id', unreadIds);
        }

        setLoading(false);
        return;
      }

      // Thread not found in either table
      console.error('Thread not found in either inquiry_threads or chat_threads');
      setError('Conversation not found');
      setLoading(false);
    } catch (err: any) {
      console.error('Error fetching thread data:', err);
      setError(err?.message || 'An error occurred');
      setLoading(false);
    }
  }, [userId, threadId]);

  useEffect(() => {
    fetchThreadData();
  }, [fetchThreadData]);

  // Subscribe to new messages (both inquiry and chat)
  useEffect(() => {
    if (!threadId) return;

    // Subscribe to both inquiry and chat messages
    const inquirySubscription = supabase
      .channel(`inquiry_messages:${threadId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'inquiry_messages',
          filter: `thread_id=eq.${threadId}`,
        },
        (payload) => {
          const newMsg = payload.new as any;

          // Fetch sender profile for the new message
          supabase
            .from('profiles')
            .select('full_name, avatar_url')
            .eq('id', newMsg.sender_user_id)
            .maybeSingle()
            .then(({ data: senderProfile }) => {
              setMessages((prev) => [
                ...prev,
                {
                  id: newMsg.id,
                  content: newMsg.message_text || '',
                  senderName: newMsg.sender_user_id === userId ? 'You' : (senderProfile?.full_name || 'Unknown'),
                  senderAvatar: newMsg.sender_user_id === userId ? '' : (senderProfile?.avatar_url || PLACEHOLDER_AVATAR),
                  isSent: newMsg.sender_user_id === userId,
                  timestamp: newMsg.created_at,
                  isRead: !!newMsg.read_at,
                  attachment_url: newMsg.attachment_url || undefined,
                },
              ]);
            });

          // Mark as read if not sent by current user
          if (newMsg.sender_user_id !== userId) {
            supabase
              .from('inquiry_messages')
              .update({ read_at: new Date().toISOString() })
              .eq('id', newMsg.id)
              .then(({ error }) => {
                if (error) console.error('Error marking as read:', extractErrorMessage(error));
              });
          }
        }
      )
      .subscribe();

    const chatSubscription = supabase
      .channel(`chat_messages:${threadId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
          filter: `thread_id=eq.${threadId}`,
        },
        (payload) => {
          const newMsg = payload.new as any;

          // Fetch sender profile for the new message
          supabase
            .from('profiles')
            .select('full_name, avatar_url')
            .eq('id', newMsg.sender_user_id)
            .maybeSingle()
            .then(({ data: senderProfile }) => {
              setMessages((prev) => [
                ...prev,
                {
                  id: newMsg.id,
                  content: newMsg.message_text || '',
                  senderName: newMsg.sender_user_id === userId ? 'You' : (senderProfile?.full_name || 'Unknown'),
                  senderAvatar: newMsg.sender_user_id === userId ? '' : (senderProfile?.avatar_url || PLACEHOLDER_AVATAR),
                  isSent: newMsg.sender_user_id === userId,
                  timestamp: newMsg.created_at,
                  isRead: !!newMsg.read_at,
                  attachment_url: newMsg.attachment_url || undefined,
                },
              ]);
            });

          // Mark as read if not sent by current user
          if (newMsg.sender_user_id !== userId) {
            supabase
              .from('chat_messages')
              .update({ read_at: new Date().toISOString() })
              .eq('id', newMsg.id)
              .then(({ error }) => {
                if (error) console.error('Error marking as read:', extractErrorMessage(error));
              });
          }
        }
      )
      .subscribe();

    return () => {
      inquirySubscription?.unsubscribe();
      chatSubscription?.unsubscribe();
    };
  }, [threadId, userId]);

  const pickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        setSelectedFile({
          uri: asset.uri,
          name: asset.fileName || `image_${Date.now()}.jpg`,
          type: asset.mimeType || 'image/jpeg',
        });
      }
    } catch (err) {
      console.error('Error picking image:', err);
      Alert.alert('Error', 'Failed to pick image');
    }
  };

  const handleAddLink = () => {
    if (!linkUrl.trim()) {
      Alert.alert('Error', 'Please enter a link URL');
      return;
    }

    // Validate URL format
    try {
      new URL(linkUrl);
    } catch {
      Alert.alert('Error', 'Please enter a valid URL');
      return;
    }

    const linkText = linkTitle.trim() || linkUrl;
    const messageContent = `${linkText}\n${linkUrl}`;

    // Close modal and clear inputs
    setLinkModalVisible(false);
    setLinkUrl('');
    setLinkTitle('');

    // Send the message content directly (don't use setState)
    sendMessageWithContent(messageContent);
  };

  const sendMessageWithContent = async (content: string) => {
    if ((!content && !selectedFile) || !userId || !otherUserId || !threadType) return;

    setSending(true);

    try {
      let attachmentUrl = null;

      // Upload file if selected
      if (selectedFile) {

        try {
          const uploadedFile = await uploadFile(selectedFile.uri, selectedFile.name, selectedFile.type);
          attachmentUrl = uploadedFile.cdnUrl || uploadedFile.url;
        } catch (uploadErr: any) {
          console.error('[messages] Upload error:', uploadErr);
          Alert.alert('Error', uploadErr?.message || 'Failed to upload file');
          setSending(false);
          return;
        }
      }

      if (threadType === 'inquiry') {
        // Send inquiry message
        const { error: insertError } = await supabase.from('inquiry_messages').insert({
          thread_id: threadId,
          sender_user_id: userId,
          message_text: content || null,
          attachment_url: attachmentUrl,
          read_at: null,
        });

        if (insertError) throw insertError;

        // Update inquiry thread updated_at
        await supabase
          .from('inquiry_threads')
          .update({ updated_at: new Date().toISOString() })
          .eq('id', threadId);
      } else if (threadType === 'booking') {
        // Send chat message
        const { error: insertError } = await supabase.from('chat_messages').insert({
          thread_id: threadId,
          sender_user_id: userId,
          message_text: content || null,
          attachment_url: attachmentUrl,
          read_at: null,
        });

        if (insertError) throw insertError;

        // Update chat thread updated_at
        await supabase
          .from('chat_threads')
          .update({ updated_at: new Date().toISOString() })
          .eq('id', threadId);
      }

      setSelectedFile(null);

      // Scroll to bottom
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    } catch (err: any) {
      console.error('Error sending message:', err);
      Alert.alert('Error', 'Failed to send message');
    } finally {
      setSending(false);
    }
  };

  const handleSendMessage = async () => {
    const content = messageText.trim();
    if ((!content && !selectedFile) || !userId || !otherUserId || !threadType) return;

    setMessageText('');
    await sendMessageWithContent(content);
  };

  if (loading) {
    const bgColor = isDark ? '#0A0A0A' : '#ffffff';
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: bgColor }}>
        <ActivityIndicator size="large" color="#fa5610" />
      </View>
    );
  }

  if (error || !threadInfo) {
    const bgColor = isDark ? '#0A0A0A' : '#ffffff';
    const textColor = isDark ? '#9ca3af' : '#9ca3af';
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: bgColor }}>
        <Text style={{ color: textColor, fontSize: 16, marginBottom: 16 }}>
          {error || 'Conversation not found'}
        </Text>
        <Pressable
          onPress={() => router.back()}
          style={{ paddingHorizontal: 16, paddingVertical: 8, backgroundColor: '#fa5610', borderRadius: 8 }}
        >
          <Text style={{ color: '#fff', fontWeight: '600' }}>Go Back</Text>
        </Pressable>
      </View>
    );
  }

  // Dynamic colors based on theme
  const colors = {
    bg: isDark ? '#0A0A0A' : '#ffffff',
    bgSecondary: isDark ? '#1A1A1A' : '#f3f4f6',
    text: isDark ? '#ffffff' : '#111827',
    textSecondary: isDark ? '#9ca3af' : '#6b7280',
    border: isDark ? '#2d2d2d' : '#e5e7eb',
    messageInBg: isDark ? '#1A1A1A' : '#f3f4f6',
    messageInText: isDark ? '#ffffff' : '#111827',
    messageOutBg: '#fa5610',
    messageOutText: '#ffffff',
    inputBg: isDark ? '#1A1A1A' : '#f3f4f6',
    inputBorder: isDark ? '#2d2d2d' : '#e5e7eb',
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={{ flex: 1, backgroundColor: colors.bg }}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 44 : 0}
    >
      <View style={{ paddingTop: insets.top, backgroundColor: colors.bg }} />

      {/* Header */}
      <Animated.View
        entering={FadeInDown.delay(100).duration(500)}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: 16,
          paddingVertical: 12,
          backgroundColor: colors.bg,
          borderBottomWidth: 1,
          borderBottomColor: colors.border,
        }}
      >
        <Pressable onPress={() => router.back()} style={{ padding: 8, marginRight: 8 }}>
          <ArrowLeft size={24} color={colors.text} />
        </Pressable>

        <View style={{ flex: 1 }}>
          <Text style={{ color: colors.text, fontWeight: '600', fontSize: 16 }} numberOfLines={1}>
            {threadInfo.otherUserName}
          </Text>
          {threadInfo.bookingTitle ? (
            <Text style={{ color: colors.textSecondary, fontSize: 12, marginTop: 2 }}>{threadInfo.bookingTitle}</Text>
          ) : null}
        </View>

        {/* Three-dot menu button */}
        <Pressable onPress={() => setMenuVisible(true)} style={{ padding: 8 }}>
          <MoreVertical size={24} color={colors.text} />
        </Pressable>
      </Animated.View>

      {/* Messages */}
      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={(item) => item.id}
        maxToRenderPerBatch={15}
        updateCellsBatchingPeriod={100}
        removeClippedSubviews={true}
        renderItem={({ item, index }) => {
          const showDateSeparator = shouldShowDateSeparator(
            item.timestamp,
            index > 0 ? messages[index - 1].timestamp : null
          );

          return (
            <Animated.View entering={FadeInUp.delay(index * 20).duration(400)}>
              {showDateSeparator ? (
                <View style={{ alignItems: 'center', paddingVertical: 12 }}>
                  <Text style={{ color: colors.textSecondary, fontSize: 12 }}>{formatDate(item.timestamp)}</Text>
                </View>
              ) : null}

              <View
                style={{
                  flexDirection: 'row',
                  justifyContent: item.isSent ? 'flex-end' : 'flex-start',
                  paddingHorizontal: 16,
                  marginBottom: 8,
                }}
              >
                {!item.isSent && item.senderAvatar ? (
                  <Image
                    source={{ uri: item.senderAvatar }}
                    style={{ width: 32, height: 32, borderRadius: 16, marginRight: 8 }}
                  />
                ) : !item.isSent ? (
                  <View style={{ width: 32, marginRight: 8 }} />
                ) : null}

                <View
                  style={{
                    maxWidth: '75%',
                    overflow: 'hidden',
                    borderRadius: 18,
                  }}
                >
                  {/* Display attachment image if present */}
                  {item.attachment_url && /\.(jpg|jpeg|png|gif|webp)$/i.test(item.attachment_url) ? (
                    <Image
                      source={{ uri: item.attachment_url }}
                      style={{
                        width: 250,
                        height: 200,
                        borderRadius: 18,
                        marginBottom: item.content ? 8 : 0,
                      }}
                      resizeMode="cover"
                    />
                  ) : null}

                  {/* Display text message */}
                  {item.content ? (
                    <View
                      style={{
                        paddingHorizontal: 14,
                        paddingVertical: 10,
                        borderRadius: 18,
                        backgroundColor: item.isSent ? colors.messageOutBg : colors.messageInBg,
                      }}
                    >
                      <Text
                        style={{
                          fontSize: 14,
                          color: item.isSent ? colors.messageOutText : colors.messageInText,
                          lineHeight: 20,
                        }}
                      >
                        {item.content}
                      </Text>
                    </View>
                  ) : null}

                  {/* Timestamp */}
                  <Text
                    style={{
                      fontSize: 11,
                      marginTop: 4,
                      paddingHorizontal: 4,
                      color: item.isSent ? '#fa5610' : colors.textSecondary,
                    }}
                  >
                    {formatTime(item.timestamp)}
                    {item.isSent && item.isRead ? ' ✓ Read' : item.isSent ? ' ✓' : ''}
                  </Text>
                </View>
              </View>
            </Animated.View>
          );
        }}
        scrollEnabled
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingTop: 12, paddingBottom: 12 }}
        style={{ backgroundColor: colors.bg, flex: 1 }}
        onContentSizeChange={() => {
          flatListRef.current?.scrollToEnd({ animated: false });
        }}
        ListEmptyComponent={
          <View style={{ alignItems: 'center', justifyContent: 'center', paddingTop: 40 }}>
            <Text style={{ color: colors.textSecondary, fontSize: 14 }}>No messages yet</Text>
            <Text style={{ color: colors.textSecondary, fontSize: 12, marginTop: 4 }}>Start the conversation</Text>
          </View>
        }
      />

      {/* Message Input */}
      <View
        style={{
          backgroundColor: colors.bg,
          borderTopWidth: 1,
          borderTopColor: colors.border,
          paddingHorizontal: 12,
          paddingVertical: 8,
          paddingBottom: insets.bottom + 8,
        }}
      >
        {/* File Preview */}
        {selectedFile ? (
          <Animated.View
            entering={FadeInDown.duration(300)}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              marginBottom: 8,
              paddingHorizontal: 12,
              paddingVertical: 8,
              backgroundColor: colors.bgSecondary,
              borderRadius: 12,
              gap: 10,
            }}
          >
            {selectedFile.type === 'image' ? (
              <Image
                source={{ uri: selectedFile.uri }}
                style={{ width: 48, height: 48, borderRadius: 8 }}
              />
            ) : (
              <View style={{ width: 48, height: 48, borderRadius: 8, backgroundColor: colors.border, justifyContent: 'center', alignItems: 'center' }}>
                <Paperclip size={24} color={colors.textSecondary} />
              </View>
            )}
            <Text style={{ flex: 1, fontSize: 13, fontWeight: '500', color: colors.text }} numberOfLines={1}>
              {selectedFile.name}
            </Text>
            <Pressable onPress={() => setSelectedFile(null)}>
              <X size={20} color={colors.textSecondary} />
            </Pressable>
          </Animated.View>
        ) : null}

        <View
          style={{
            flexDirection: 'row',
            alignItems: 'flex-end',
            paddingHorizontal: 12,
            paddingVertical: 8,
            borderRadius: 24,
            backgroundColor: colors.inputBg,
            borderWidth: 1,
            borderColor: colors.inputBorder,
            gap: 8,
          }}
        >
          <Pressable
            onPress={pickImage}
            disabled={sending}
            style={{ padding: 8 }}
          >
            <Paperclip size={20} color={sending ? colors.textSecondary : colors.textSecondary} />
          </Pressable>

          <Pressable
            onPress={() => setLinkModalVisible(true)}
            disabled={sending}
            style={{ padding: 8 }}
          >
            <Ionicons name="link" size={20} color={sending ? colors.textSecondary : colors.textSecondary} />
          </Pressable>

          <TextInput
            value={messageText}
            onChangeText={setMessageText}
            placeholder="Type a message..."
            placeholderTextColor={colors.textSecondary}
            multiline
            maxLength={500}
            style={{
              flex: 1,
              color: colors.text,
              fontSize: 14,
              paddingVertical: 8,
              maxHeight: 100,
            }}
            editable={!sending}
          />

          <Pressable
            onPress={handleSendMessage}
            disabled={(!messageText.trim() && !selectedFile) || sending}
            style={{ padding: 8 }}
          >
            {sending ? (
              <ActivityIndicator size="small" color="#fa5610" />
            ) : (
              <Send
                size={20}
                color={(messageText.trim() || selectedFile) ? '#fa5610' : colors.textSecondary}
              />
            )}
          </Pressable>
        </View>
      </View>

      {/* Menu Modal */}
      <Modal
        visible={menuVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setMenuVisible(false)}
      >
        <Pressable
          style={{ flex: 1 }}
          onPress={() => setMenuVisible(false)}
        >
          <View
            style={{
              flex: 1,
              justifyContent: 'flex-start',
              alignItems: 'flex-end',
              paddingRight: 16,
              paddingTop: insets.top + 50,
            }}
          >
            <Pressable
              onPress={(e) => {
                e.stopPropagation();
              }}
              style={{
                backgroundColor: colors.bg,
                borderRadius: 8,
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.25,
                shadowRadius: 3.84,
                elevation: 5,
                overflow: 'hidden',
              }}
            >
              {/* View Job Option */}
              {threadInfo?.booking_id ? (
                <Pressable
                  onPress={() => {
                    setMenuVisible(false);
                    router.push(`/(talent)/jobs/${threadInfo.booking_id}`);
                  }}
                  style={{
                    paddingVertical: 12,
                    paddingHorizontal: 16,
                    borderBottomWidth: 1,
                    borderBottomColor: colors.border,
                  }}
                >
                  <Text
                    style={{
                      color: colors.text,
                      fontSize: 14,
                      fontWeight: '500',
                    }}
                  >
                    View Job
                  </Text>
                </Pressable>
              ) : null}

              {/* View Profile Option */}
              {threadInfo?.otherUserId ? (
                <Pressable
                  onPress={() => {
                    setMenuVisible(false);
                    // Navigate to the talent's profile
                    router.push(`/(talent)/profile?userId=${threadInfo.otherUserId}`);
                  }}
                  style={{
                    paddingVertical: 12,
                    paddingHorizontal: 16,
                  }}
                >
                  <Text
                    style={{
                      color: colors.text,
                      fontSize: 14,
                      fontWeight: '500',
                    }}
                  >
                    View Profile
                  </Text>
                </Pressable>
              ) : null}
            </Pressable>
          </View>
        </Pressable>
      </Modal>

      {/* Add Link Modal */}
      <Modal
        visible={linkModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => {
          setLinkModalVisible(false);
          setLinkUrl('');
          setLinkTitle('');
        }}
      >
        <Pressable
          style={{ flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.7)', justifyContent: 'center', alignItems: 'center' }}
          onPress={() => {
            setLinkModalVisible(false);
            setLinkUrl('');
            setLinkTitle('');
          }}
        >
          <Pressable
            onPress={(e) => e.stopPropagation()}
            style={{
              width: '85%',
              backgroundColor: isDark ? '#1A1A1A' : '#ffffff',
              borderRadius: 20,
              padding: 24,
              position: 'relative',
            }}
          >
            {/* Close button */}
            <Pressable
              onPress={() => {
                setLinkModalVisible(false);
                setLinkUrl('');
                setLinkTitle('');
              }}
              style={{
                position: 'absolute',
                top: 12,
                right: 12,
                width: 32,
                height: 32,
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: 16,
              }}
            >
              <Ionicons name="close" size={24} color={isDark ? '#ffffff' : '#111827'} />
            </Pressable>

            {/* Title */}
            <Text style={{ fontSize: 18, fontWeight: '700', color: isDark ? '#ffffff' : '#111827', marginBottom: 20, marginTop: 4 }}>
              Add External Link
            </Text>

            {/* Link URL input */}
            <View style={{ marginBottom: 16 }}>
              <Text style={{ fontSize: 14, fontWeight: '600', color: isDark ? '#ffffff' : '#111827', marginBottom: 8 }}>
                Link URL
              </Text>
              <TextInput
                value={linkUrl}
                onChangeText={setLinkUrl}
                placeholder="https://drive.google.com/..."
                placeholderTextColor={isDark ? '#6b7280' : '#9ca3af'}
                style={{
                  backgroundColor: isDark ? '#2A2A2A' : '#f3f4f6',
                  borderWidth: 2,
                  borderColor: '#d97706',
                  borderRadius: 14,
                  paddingHorizontal: 16,
                  paddingVertical: 12,
                  fontSize: 14,
                  color: isDark ? '#ffffff' : '#111827',
                  minHeight: 48,
                }}
                autoCapitalize="none"
                returnKeyType="next"
              />
            </View>

            {/* Link Title input */}
            <View style={{ marginBottom: 24 }}>
              <Text style={{ fontSize: 14, fontWeight: '600', color: isDark ? '#ffffff' : '#111827', marginBottom: 8 }}>
                Title (optional)
              </Text>
              <TextInput
                value={linkTitle}
                onChangeText={setLinkTitle}
                placeholder="Final Photos - Google Drive"
                placeholderTextColor={isDark ? '#6b7280' : '#9ca3af'}
                style={{
                  backgroundColor: isDark ? '#2A2A2A' : '#f3f4f6',
                  borderWidth: 2,
                  borderColor: isDark ? '#374151' : '#e5e7eb',
                  borderRadius: 14,
                  paddingHorizontal: 16,
                  paddingVertical: 12,
                  fontSize: 14,
                  color: isDark ? '#ffffff' : '#111827',
                  minHeight: 48,
                }}
                returnKeyType="done"
              />
            </View>

            {/* Buttons */}
            <View style={{ flexDirection: 'row', gap: 12 }}>
              <Pressable
                onPress={() => {
                  setLinkModalVisible(false);
                  setLinkUrl('');
                  setLinkTitle('');
                }}
                style={{
                  flex: 1,
                  paddingVertical: 12,
                  borderRadius: 14,
                  borderWidth: 1,
                  borderColor: isDark ? '#4b5563' : '#e5e7eb',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Text style={{ fontSize: 16, fontWeight: '600', color: isDark ? '#ffffff' : '#111827' }}>
                  Cancel
                </Text>
              </Pressable>

              <Pressable
                onPress={handleAddLink}
                style={{
                  flex: 1,
                  paddingVertical: 12,
                  borderRadius: 14,
                  backgroundColor: '#d97706',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexDirection: 'row',
                  gap: 6,
                }}
              >
                <Ionicons name="add" size={20} color="#ffffff" />
                <Text style={{ fontSize: 16, fontWeight: '600', color: '#ffffff' }}>
                  Add Link
                </Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </KeyboardAvoidingView>
  );
}
