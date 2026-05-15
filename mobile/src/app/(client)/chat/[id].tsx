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
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft, Send, Paperclip, X, FileText } from 'lucide-react-native';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { useState, useCallback, useEffect, useRef } from 'react';
import { useLocalSearchParams } from 'expo-router';
import { useRouter } from '@/lib/router-helper';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/lib/state/auth-store';
import * as DocumentPicker from 'expo-document-picker';
import { uploadFileToStorage, getContentType } from '@/helpers/uploadToStorage';
import { extractErrorMessage } from '@/lib/api/api';

interface Message {
  id: string;
  content: string;
  senderName: string;
  senderAvatar: string;
  isSent: boolean;
  timestamp: string;
  isRead: boolean;
  attachmentUrl?: string;
}

interface ThreadInfo {
  otherUserName: string;
  otherUserAvatar: string;
  bookingTitle?: string;
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

function isImageUrl(url: string): boolean {
  const imageExtensions = ['.png', '.jpg', '.jpeg', '.gif', '.webp'];
  const lowerUrl = url.toLowerCase();
  return imageExtensions.some((ext) => lowerUrl.includes(ext));
}

function getFilenameFromUrl(url: string): string {
  try {
    const pathname = new URL(url).pathname;
    const filename = pathname.split('/').pop() || 'file';
    return decodeURIComponent(filename);
  } catch {
    return 'file';
  }
}

export default function ClientChatDetailScreen() {
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const userId = useAuthStore((s) => s.user?.id);

  const [threadInfo, setThreadInfo] = useState<ThreadInfo | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [messageText, setMessageText] = useState('');
  const [sending, setSending] = useState(false);
  const [otherUserId, setOtherUserId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [threadId, setThreadId] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<{ uri: string; name: string; size: number; mimeType: string } | null>(null);
  const [uploading, setUploading] = useState(false);

  const flatListRef = useRef<FlatList>(null);

  const bookingId = Array.isArray(id) ? id[0] : id;

  // Fetch thread info and messages
  const fetchThreadData = useCallback(async () => {
    if (!userId || !bookingId) {
      setError('Invalid booking ID');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Step 1: Look up chat thread by booking_id
      const { data: threadData, error: threadError } = await supabase
        .from('chat_threads')
        .select('id')
        .eq('booking_id', bookingId)
        .maybeSingle();

      // If no thread exists, show empty state
      if (!threadData) {
        console.log('No chat thread yet for booking:', bookingId);
        setThreadId(null);
        setMessages([]);
        setLoading(false);
        // Still fetch the booking talent info
      } else {
        setThreadId(threadData.id);
      }

      // Step 2: Resolve talent name (booking → booking_talents → talent_profiles → profiles)
      const { data: bookingTalentData } = await supabase
        .from('booking_talents')
        .select('talent_id')
        .eq('booking_id', bookingId)
        .limit(1)
        .maybeSingle();

      if (!bookingTalentData) {
        console.error('No talent assigned to booking');
        setError('Could not find talent for this booking');
        setLoading(false);
        return;
      }

      const { data: talentProfileData } = await supabase
        .from('talent_profiles')
        .select('user_id')
        .eq('id', bookingTalentData.talent_id)
        .single();

      if (!talentProfileData) {
        console.error('Talent profile not found');
        setError('Could not resolve talent profile');
        setLoading(false);
        return;
      }

      const { data: talentProfile } = await supabase
        .from('profiles')
        .select('full_name, avatar_url')
        .eq('id', talentProfileData.user_id)
        .single();

      if (!talentProfile) {
        console.error('Talent user profile not found');
        setError('Could not resolve talent name');
        setLoading(false);
        return;
      }

      console.log('✅ Talent profile resolved:', talentProfile.full_name);
      setThreadInfo({
        otherUserName: talentProfile.full_name || 'Unknown',
        otherUserAvatar: talentProfile.avatar_url || PLACEHOLDER_AVATAR,
      });
      setOtherUserId(talentProfileData.user_id);

      // If no thread yet, we're done
      if (!threadData) {
        setLoading(false);
        return;
      }

      // Step 3: Fetch chat messages
      const { data: messagesData, error: messagesError } = await supabase
        .from('chat_messages')
        .select('*')
        .eq('thread_id', threadData.id)
        .order('created_at', { ascending: true });

      if (messagesError) {
        console.error('Error fetching messages:', messagesError);
        setError('Could not load messages');
        setLoading(false);
        return;
      }

      if (!messagesData || messagesData.length === 0) {
        console.log('No messages found for thread');
        setMessages([]);
        setLoading(false);
        return;
      }

      console.log('✅ Messages found:', messagesData.length);

      // Step 4: Resolve sender names for messages
      const senderIds = [...new Set(messagesData.map((m) => m.sender_user_id))];
      const { data: senderProfiles } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url')
        .in('id', senderIds);

      const senderProfilesMap = new Map(senderProfiles?.map((p) => [p.id, p]) || []);

      const formattedMessages: Message[] = messagesData.map((msg) => {
        const senderProfile = senderProfilesMap.get(msg.sender_user_id);
        return {
          id: msg.id,
          content: msg.message_text,
          senderName: msg.sender_user_id === userId ? 'You' : (senderProfile?.full_name || 'Unknown'),
          senderAvatar: msg.sender_user_id === userId ? '' : (senderProfile?.avatar_url || PLACEHOLDER_AVATAR),
          isSent: msg.sender_user_id === userId,
          timestamp: msg.created_at,
          isRead: !!msg.read_at,
          attachmentUrl: msg.attachment_url,
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
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : typeof error === 'string' ? error : 'Failed to load conversation';
      console.error('Error fetching thread data:', errorMsg);
      setError('Failed to load conversation');
    } finally {
      setLoading(false);
    }
  }, [userId, bookingId]);

  useEffect(() => {
    fetchThreadData();
  }, [fetchThreadData]);

  // Subscribe to new messages
  useEffect(() => {
    if (!threadId) return;

    const subscription = supabase
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
            .single()
            .then(({ data: senderProfile }) => {
              setMessages((prev) => [
                ...prev,
                {
                  id: newMsg.id,
                  content: newMsg.message_text,
                  senderName: newMsg.sender_user_id === userId ? 'You' : (senderProfile?.full_name || 'Unknown'),
                  senderAvatar: newMsg.sender_user_id === userId ? '' : (senderProfile?.avatar_url || PLACEHOLDER_AVATAR),
                  isSent: newMsg.sender_user_id === userId,
                  timestamp: newMsg.created_at,
                  isRead: !!newMsg.read_at,
                  attachmentUrl: newMsg.attachment_url,
                },
              ]);
            });

          // Mark as read if not sent by current user
          if (newMsg.sender_user_id !== userId) {
            supabase
              .from('chat_messages')
              .update({ read_at: new Date().toISOString() })
              .eq('id', newMsg.id);
          }
        }
      )
      .subscribe();

    return () => {
      subscription?.unsubscribe();
    };
  }, [threadId, userId]);

  const handlePickFile = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: [
          'image/*',
          'application/pdf',
          'application/msword',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'text/plain',
          'application/vnd.ms-excel',
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        ],
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const file = result.assets[0];
        console.log('[chat] File selected:', { name: file.name, size: file.size, mimeType: file.mimeType });

        setSelectedFile({
          uri: file.uri,
          name: file.name || 'file',
          size: file.size || 0,
          mimeType: file.mimeType || 'application/octet-stream',
        });
      }
    } catch (err) {
      console.error('Error picking file:', err);
      setError('Failed to select file');
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 10) / 10 + ' ' + sizes[i];
  };

  const isImageFile = (mimeType: string): boolean => {
    return mimeType.startsWith('image/');
  };

  const handleSendMessage = async () => {
    if ((!messageText.trim() && !selectedFile) || !userId || !otherUserId) return;

    const content = messageText.trim();
    setMessageText('');
    setSending(true);
    setUploading(!!selectedFile);
    setError(null);

    try {
      // If no thread exists yet, create one
      let currentThreadId = threadId;
      if (!currentThreadId) {
        const { data: newThread, error: threadError } = await supabase
          .from('chat_threads')
          .insert({ booking_id: bookingId })
          .select('id')
          .single();

        if (threadError || !newThread) {
          throw new Error('Failed to create chat thread: ' + (threadError?.message || 'Unknown error'));
        }

        currentThreadId = newThread.id;
        setThreadId(newThread.id);
      }

      let attachmentUrl: string | null = null;

      // Upload file if selected
      if (selectedFile) {
        try {
          // Get current user's auth UUID for the folder path
          const { data: authData, error: authError } = await supabase.auth.getUser();
          const authUserId = authData?.user?.id;

          if (authError || !authUserId) {
            throw new Error('Failed to get user ID: ' + (authError?.message || 'No user authenticated'));
          }

          // Generate file path: userId/timestamp_filename
          const ext = selectedFile.name.split('.').pop()?.toLowerCase() || 'file';
          const fileName = `${authUserId}/${Date.now()}_${selectedFile.name}`;
          const contentType = selectedFile.mimeType || getContentType(ext, false);

          console.log('[client-chat] Uploading attachment:', { fileName, uri: selectedFile.uri, mimeType: selectedFile.mimeType, contentType });

          // Upload using the helper
          const { publicUrl, error: uploadError } = await uploadFileToStorage(
            'chat-attachments',
            fileName,
            selectedFile.uri,
            contentType
          );

          if (uploadError) {
            console.error('[client-chat] Upload error:', uploadError);
            throw new Error('File upload failed: ' + uploadError);
          }

          if (!publicUrl) {
            throw new Error('Could not generate public URL');
          }

          console.log('[client-chat] Attachment uploaded successfully:', publicUrl);
          attachmentUrl = publicUrl;
          setUploading(false);
        } catch (err) {
          const errorMsg = err instanceof Error ? err.message : typeof err === 'string' ? err : 'Unknown error';
          console.error('Error uploading file:', errorMsg);
          setError('Failed to upload file: ' + errorMsg);
          setMessageText(content); // Restore text on error
          setUploading(false);
          setSending(false);
          return;
        }
      }

      // Send chat message
      const { error: messageError } = await supabase.from('chat_messages').insert({
        thread_id: currentThreadId,
        sender_user_id: userId,
        message_text: content || null,
        attachment_url: attachmentUrl,
        read_at: null,
      });

      if (messageError) {
        throw new Error('Failed to send message: ' + messageError.message);
      }

      // Clear file selection
      setSelectedFile(null);

      // Scroll to bottom
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    } catch (err) {
      console.error('Error sending message:', extractErrorMessage(err));
      const errorMessage = extractErrorMessage(err);
      setError('Failed to send message: ' + errorMessage);
      setMessageText(content); // Restore text on error
    } finally {
      setSending(false);
      setUploading(false);
    }
  };

  if (loading) {
    return (
      <View className="flex-1 bg-[#F8F8F8] items-center justify-center">
        <ActivityIndicator size="large" color="#F97316" />
      </View>
    );
  }

  if (error || !threadInfo) {
    return (
      <View className="flex-1 bg-[#F8F8F8] items-center justify-center">
        <Text className="text-gray-600">{error || 'Could not load booking'}</Text>
        <Pressable onPress={() => router.back()} className="mt-4 px-4 py-2 bg-orange-500 rounded-lg">
          <Text className="text-white text-sm font-semibold">Go Back</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      className="flex-1 bg-[#F8F8F8]"
    >
      <View className="flex-1 bg-[#F8F8F8]">
        {/* Status Bar padding */}
        <View style={{ paddingTop: insets.top, backgroundColor: '#FFFFFF' }} />

        {/* Header */}
        <Animated.View
          entering={FadeInDown.delay(100).duration(500)}
          className="flex-row items-center px-4 py-3 bg-white border-b border-gray-100"
        >
          <Pressable onPress={() => router.back()} className="p-2 -ml-2 mr-2">
            <ArrowLeft size={24} color="#374151" />
          </Pressable>

          <View className="flex-1">
            <Text className="text-gray-900 font-semibold" numberOfLines={1}>
              {threadInfo.otherUserName}
            </Text>
            {threadInfo.bookingTitle ? (
              <Text className="text-gray-500 text-xs mt-0.5">{threadInfo.bookingTitle}</Text>
            ) : null}
          </View>
        </Animated.View>

        {/* Messages Container - Scrollable */}
        <View className="flex-1">
          {messages.length === 0 ? (
            <View className="flex-1 items-center justify-center px-8 py-8">
              <Text className="text-gray-600 text-center mb-2">No messages yet</Text>
              <Text className="text-gray-400 text-sm text-center">Start the conversation!</Text>
            </View>
          ) : (
            <FlatList
              ref={flatListRef}
              data={messages}
              keyExtractor={(item) => item.id}
              renderItem={({ item, index }) => {
                const showDateSeparator = shouldShowDateSeparator(
                  item.timestamp,
                  index > 0 ? messages[index - 1].timestamp : null
                );

                return (
                  <Animated.View entering={FadeInUp.delay(index * 20).duration(400)}>
                    {showDateSeparator ? (
                      <View className="items-center py-3">
                        <Text className="text-gray-400 text-xs">{formatDate(item.timestamp)}</Text>
                      </View>
                    ) : null}

                    <View
                      className={`flex-row ${item.isSent ? 'justify-end' : 'justify-start'} px-4 mb-2`}
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
                        className={`max-w-xs px-4 py-2.5 rounded-2xl ${
                          item.isSent ? 'bg-orange-500' : 'bg-gray-200'
                        }`}
                      >
                        {item.content ? (
                          <Text
                            className={`text-sm ${item.isSent ? 'text-white' : 'text-gray-900'}`}
                          >
                            {item.content}
                          </Text>
                        ) : null}

                        {item.attachmentUrl ? (
                          <View className="mt-2">
                            {isImageUrl(item.attachmentUrl) ? (
                              <Image
                                source={{ uri: item.attachmentUrl }}
                                style={{
                                  width: 200,
                                  height: 160,
                                  borderRadius: 8,
                                }}
                              />
                            ) : (
                              <Pressable
                                onPress={() => {
                                  // For now, just log - in a real app, this would open/download
                                  console.log('Download:', item.attachmentUrl);
                                }}
                                className="flex-row items-center bg-gray-100 rounded-lg p-2"
                              >
                                <FileText size={20} color="#6B7280" />
                                <Text className="ml-2 text-gray-700 text-sm flex-1">
                                  {getFilenameFromUrl(item.attachmentUrl)}
                                </Text>
                              </Pressable>
                            )}
                          </View>
                        ) : null}

                        <Text
                          className={`text-xs mt-1 ${
                            item.isSent ? 'text-orange-100' : 'text-gray-500'
                          }`}
                        >
                          {formatTime(item.timestamp)}
                        </Text>
                      </View>
                    </View>
                  </Animated.View>
                );
              }}
              scrollEnabled
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingVertical: 8 }}
              onContentSizeChange={() => {
                flatListRef.current?.scrollToEnd({ animated: true });
              }}
            />
          )}
        </View>

        {/* Message Input Container - Fixed at bottom */}
        <View className="bg-white border-t border-gray-100" style={{ paddingBottom: insets.bottom }}>
          {/* Error Message */}
          {error ? (
            <Animated.View
              entering={FadeInDown.duration(300)}
              className="mx-4 mt-3 bg-red-50 border border-red-200 rounded-lg px-3 py-2 flex-row items-center justify-between"
            >
              <Text className="text-red-700 text-sm flex-1">{error}</Text>
              <Pressable onPress={() => setError(null)} className="p-1">
                <X size={16} color="#DC2626" />
              </Pressable>
            </Animated.View>
          ) : null}

          {/* File Preview Bar - shown when file is selected */}
          {selectedFile ? (
            <Animated.View
              entering={FadeInDown.duration(300)}
              className="mx-4 mt-3 flex-row items-center bg-blue-50 rounded-lg px-3 py-3 border border-blue-200"
            >
              {isImageFile(selectedFile.mimeType) ? (
                <Image
                  source={{ uri: selectedFile.uri }}
                  style={{ width: 48, height: 48, borderRadius: 8, marginRight: 12 }}
                />
              ) : (
                <View className="w-12 h-12 bg-blue-100 rounded-lg items-center justify-center mr-3">
                  <FileText size={24} color="#3B82F6" />
                </View>
              )}
              <View className="flex-1">
                <Text className="text-gray-900 text-sm font-medium" numberOfLines={1}>
                  {selectedFile.name}
                </Text>
                <Text className="text-gray-500 text-xs mt-0.5">
                  {formatFileSize(selectedFile.size)}
                </Text>
              </View>
              <Pressable
                onPress={() => setSelectedFile(null)}
                disabled={uploading}
                className="p-2"
              >
                <X size={20} color={uploading ? '#D1D5DB' : '#6B7280'} />
              </Pressable>
            </Animated.View>
          ) : null}

          {/* Input Row: Attachment | TextInput | Send */}
          <View className="flex-row items-center px-4 py-3 gap-2">
            {/* Attachment Button */}
            <Pressable
              onPress={handlePickFile}
              disabled={uploading || sending}
              className={`flex-row items-center justify-center w-10 h-10 rounded-full ${
                uploading || sending ? 'bg-gray-100' : 'bg-gray-100 active:bg-gray-200'
              }`}
            >
              {uploading ? (
                <ActivityIndicator size="small" color="#F97316" />
              ) : (
                <Paperclip
                  size={20}
                  color={(sending || uploading) ? '#D1D5DB' : '#6B7280'}
                  strokeWidth={2}
                />
              )}
            </Pressable>

            {/* Text Input */}
            <TextInput
              value={messageText}
              onChangeText={setMessageText}
              placeholder="Type a message..."
              placeholderTextColor="#9CA3AF"
              multiline
              maxLength={500}
              className="flex-1 text-gray-900 text-sm px-3 py-2 bg-gray-100 rounded-full"
              editable={!sending && !uploading}
              style={{
                maxHeight: 100,
                paddingVertical: 8,
              }}
            />

            {/* Send Button */}
            <Pressable
              onPress={handleSendMessage}
              disabled={(!messageText.trim() && !selectedFile) || sending || uploading}
              className={`flex-row items-center justify-center w-10 h-10 rounded-full ${
                (messageText.trim() || selectedFile) && !uploading
                  ? 'bg-orange-500'
                  : 'bg-gray-100'
              }`}
            >
              {sending || uploading ? (
                <ActivityIndicator size="small" color="#F97316" />
              ) : (
                <Send
                  size={20}
                  color={(messageText.trim() || selectedFile) && !uploading ? '#FFFFFF' : '#D1D5DB'}
                  strokeWidth={2}
                />
              )}
            </Pressable>
          </View>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}
