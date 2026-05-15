import { View, Text, TextInput, Pressable, ActivityIndicator, Alert, Image, FlatList, KeyboardAvoidingView, Platform, Modal } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useRouter } from '@/lib/router-helper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft, Send, MoreVertical, Paperclip, X, FileText, ImageIcon, User } from 'lucide-react-native';
import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { extractErrorMessage } from '@/lib/errorUtils';
import { useAuthStore } from '@/lib/state/auth-store';
import { useTheme } from '@/lib/theme/ThemeContext';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';

interface Message {
  id: string;
  thread_id: string;
  sender_user_id: string;
  message_text: string;
  attachment_url?: string | null;
  created_at: string;
  read_at: string | null;
}

interface ThreadInfo {
  id: string;
  talent_id: string;
  talent_name: string;
  talent_avatar: string | null;
}

interface AttachmentPreview {
  uri: string;
  name: string;
  size: number;
  type: 'image' | 'document';
  mimeType?: string;
}

const PLACEHOLDER_AVATAR = 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&h=200&fit=crop';

// Format file size
const formatFileSize = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

export default function InquiryThreadScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const userId = useAuthStore((s) => s.user?.id);
  const flatListRef = useRef<FlatList>(null);
  const { isDark } = useTheme();

  const [messages, setMessages] = useState<Message[]>([]);
  const [threadInfo, setThreadInfo] = useState<ThreadInfo | null>(null);
  const [newMessage, setNewMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [showMenu, setShowMenu] = useState(false);
  const [attachment, setAttachment] = useState<AttachmentPreview | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  // Theme colors
  const colors = {
    background: isDark ? '#0A0A0A' : '#FFFFFF',
    cardBackground: isDark ? '#1A1A1A' : '#F3F4F6',
    border: isDark ? '#27272A' : '#E5E7EB',
    text: isDark ? '#FAFAFA' : '#111827',
    textSecondary: isDark ? '#A1A1AA' : '#6B7280',
    inputBg: isDark ? '#27272A' : '#F3F4F6',
    incomingBubble: isDark ? '#27272A' : '#F3F4F6',
    incomingText: isDark ? '#FAFAFA' : '#111827',
  };

  // Fetch thread info and messages
  const fetchThreadData = useCallback(async () => {
    if (!id || !userId) return;

    try {
      setIsLoading(true);

      // Fetch thread info
      const { data: thread, error: threadError } = await supabase
        .from('inquiry_threads')
        .select('id, talent_id, client_user_id')
        .eq('id', id)
        .single();

      if (threadError || !thread) {
        console.error('Error fetching thread:', threadError);
        Alert.alert('Error', 'Conversation not found');
        router.back();
        return;
      }

      // Fetch talent profile and user info
      const { data: talentProfile } = await supabase
        .from('talent_profiles')
        .select('id, user_id, display_name')
        .eq('id', thread.talent_id)
        .single();

      let talentName = 'Talent';
      let talentAvatar: string | null = null;

      if (talentProfile?.user_id) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('full_name, avatar_url')
          .eq('id', talentProfile.user_id)
          .single();

        talentName = talentProfile.display_name || profile?.full_name || 'Talent';
        talentAvatar = profile?.avatar_url || null;
      }

      setThreadInfo({
        id: thread.id,
        talent_id: thread.talent_id,
        talent_name: talentName,
        talent_avatar: talentAvatar,
      });

      // Fetch messages
      const { data: messagesData, error: messagesError } = await supabase
        .from('inquiry_messages')
        .select('*')
        .eq('thread_id', id)
        .order('created_at', { ascending: true });

      if (messagesError) {
        console.error('Error fetching messages:', messagesError);
      } else {
        setMessages(messagesData || []);
      }

      // Mark messages as read
      await supabase
        .from('inquiry_messages')
        .update({ read_at: new Date().toISOString() })
        .eq('thread_id', id)
        .neq('sender_user_id', userId)
        .is('read_at', null);

    } catch (err) {
      console.error('Error:', extractErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  }, [id, userId, router]);

  useEffect(() => {
    fetchThreadData();
  }, [fetchThreadData]);

  // Subscribe to new messages
  useEffect(() => {
    if (!id) return;

    const channel = supabase
      .channel(`inquiry_messages:${id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'inquiry_messages',
          filter: `thread_id=eq.${id}`,
        },
        (payload) => {
          const newMsg = payload.new as Message;
          setMessages((prev) => [...prev, newMsg]);

          // Mark as read if not from current user
          if (newMsg.sender_user_id !== userId) {
            supabase
              .from('inquiry_messages')
              .update({ read_at: new Date().toISOString() })
              .eq('id', newMsg.id);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [id, userId]);

  // Send message
  const handleSendMessage = async () => {
    if ((!newMessage.trim() && !attachment) || !userId || !id) return;

    try {
      setIsSending(true);
      let attachmentUrl: string | null = null;

      // Upload attachment if exists
      if (attachment) {
        setIsUploading(true);
        const ext = attachment.name.split('.').pop() || 'file';
        const fileName = `${userId}/${id}/${Date.now()}.${ext}`;

        // Fetch the file as blob
        const response = await fetch(attachment.uri);
        const blob = await response.blob();

        const { error: uploadError } = await supabase.storage
          .from('chat-attachments')
          .upload(fileName, blob, {
            contentType: attachment.mimeType || 'application/octet-stream',
          });

        if (uploadError) {
          console.error('Upload error:', uploadError);
          throw new Error('Failed to upload attachment');
        }

        const { data: urlData } = supabase.storage
          .from('chat-attachments')
          .getPublicUrl(fileName);

        attachmentUrl = urlData.publicUrl;
        setIsUploading(false);
      }

      const { error } = await supabase
        .from('inquiry_messages')
        .insert({
          thread_id: id,
          sender_user_id: userId,
          message_text: newMessage.trim() || null,
          attachment_url: attachmentUrl,
        });

      if (error) throw error;

      setNewMessage('');
      setAttachment(null);

      // Update thread updated_at
      await supabase
        .from('inquiry_threads')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', id);

    } catch (err) {
      console.error('Error sending message:', extractErrorMessage(err));
      Alert.alert('Error', 'Failed to send message');
    } finally {
      setIsSending(false);
      setIsUploading(false);
    }
  };

  // Pick image
  const handlePickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: false,
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        const fileName = asset.uri.split('/').pop() || 'image.jpg';
        setAttachment({
          uri: asset.uri,
          name: fileName,
          size: asset.fileSize || 0,
          type: 'image',
          mimeType: asset.mimeType || 'image/jpeg',
        });
      }
    } catch (err) {
      console.error('Error picking image:', extractErrorMessage(err));
    }
  };

  // Pick document
  const handlePickDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
      });

      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        setAttachment({
          uri: asset.uri,
          name: asset.name,
          size: asset.size || 0,
          type: 'document',
          mimeType: asset.mimeType || 'application/pdf',
        });
      }
    } catch (err) {
      console.error('Error picking document:', extractErrorMessage(err));
    }
  };

  // Show attachment picker
  const handleAttachmentPress = () => {
    Alert.alert(
      'Add Attachment',
      'Choose attachment type',
      [
        { text: 'Photo', onPress: handlePickImage },
        { text: 'Document', onPress: handlePickDocument },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

  // Navigate to talent profile
  const handleViewProfile = () => {
    setShowMenu(false);
    if (threadInfo?.talent_id) {
      router.push({
        pathname: '/(client)/talent/[id]',
        params: { id: threadInfo.talent_id },
      } as any);
    }
  };

  // Format time
  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();

    if (isToday) {
      return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
    }
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
  };

  // Render message bubble
  const renderMessage = ({ item }: { item: Message }) => {
    const isMe = item.sender_user_id === userId;
    const hasAttachment = !!item.attachment_url;
    const isImage = hasAttachment && (item.attachment_url?.match(/\.(jpg|jpeg|png|gif|webp)$/i) || item.attachment_url?.includes('image'));

    return (
      <View className={`px-4 py-1 ${isMe ? 'items-end' : 'items-start'}`}>
        <View
          className={`max-w-[80%] px-4 py-2.5 rounded-2xl ${
            isMe ? 'bg-orange-500 rounded-br-sm' : 'rounded-bl-sm'
          }`}
          style={!isMe ? { backgroundColor: colors.incomingBubble } : undefined}
        >
          {/* Attachment */}
          {hasAttachment ? (
            <Pressable
              onPress={() => {
                // Could open full-screen image viewer
              }}
              className="mb-2"
            >
              {isImage ? (
                <Image
                  source={{ uri: item.attachment_url! }}
                  style={{ width: 200, height: 150, borderRadius: 8 }}
                  resizeMode="cover"
                />
              ) : (
                <View
                  className="flex-row items-center p-3 rounded-lg"
                  style={{
                    backgroundColor: isMe ? 'rgba(255,255,255,0.2)' : (isDark ? '#1F1F1F' : '#E5E7EB'),
                    borderWidth: isMe ? 0 : 1,
                    borderColor: colors.border,
                  }}
                >
                  <FileText size={24} color={isMe ? '#FFFFFF' : colors.textSecondary} />
                  <Text
                    className="ml-2 text-sm flex-1"
                    style={{ color: isMe ? '#FFFFFF' : colors.text }}
                    numberOfLines={1}
                  >
                    Attachment
                  </Text>
                </View>
              )}
            </Pressable>
          ) : null}

          {/* Message text */}
          {item.message_text ? (
            <Text
              className="text-base"
              style={{ color: isMe ? '#FFFFFF' : colors.incomingText }}
            >
              {item.message_text}
            </Text>
          ) : null}
        </View>
        <Text
          className="text-xs mt-1 px-1"
          style={{ color: colors.textSecondary }}
        >
          {formatTime(item.created_at)}
        </Text>
      </View>
    );
  };

  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center" style={{ backgroundColor: colors.background }}>
        <ActivityIndicator size="large" color="#F97316" />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      className="flex-1"
      style={{ backgroundColor: colors.background }}
      keyboardVerticalOffset={0}
    >
      <View className="flex-1" style={{ paddingTop: insets.top }}>
        {/* Header */}
        <View
          className="flex-row items-center px-4 py-3 border-b"
          style={{ borderBottomColor: colors.border, backgroundColor: colors.background }}
        >
          <Pressable onPress={() => router.back()} className="mr-3 p-1">
            <ArrowLeft size={24} color={colors.text} />
          </Pressable>
          <Image
            source={{ uri: threadInfo?.talent_avatar || PLACEHOLDER_AVATAR }}
            style={{ width: 40, height: 40, borderRadius: 20 }}
          />
          <View className="ml-3 flex-1">
            <Text
              className="text-base font-semibold"
              style={{ color: colors.text }}
            >
              {threadInfo?.talent_name || 'Conversation'}
            </Text>
            <Text
              className="text-xs"
              style={{ color: colors.textSecondary }}
            >
              Inquiry
            </Text>
          </View>

          {/* Three-dot menu */}
          <Pressable
            onPress={() => setShowMenu(true)}
            className="p-2 rounded-full"
            style={{ backgroundColor: isDark ? '#27272A' : '#F3F4F6' }}
          >
            <MoreVertical size={20} color={colors.text} />
          </Pressable>
        </View>

        {/* Messages List */}
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item) => item.id}
          renderItem={renderMessage}
          contentContainerStyle={{ paddingVertical: 16 }}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: false })}
          onLayout={() => flatListRef.current?.scrollToEnd({ animated: false })}
          ListEmptyComponent={
            <View className="flex-1 items-center justify-center py-20">
              <Text style={{ color: colors.textSecondary }} className="text-sm">
                No messages yet
              </Text>
            </View>
          }
        />

        {/* Attachment Preview */}
        {attachment ? (
          <View
            className="mx-4 mb-2 p-3 rounded-xl flex-row items-center"
            style={{ backgroundColor: colors.cardBackground }}
          >
            {attachment.type === 'image' ? (
              <Image
                source={{ uri: attachment.uri }}
                style={{ width: 48, height: 48, borderRadius: 8 }}
                resizeMode="cover"
              />
            ) : (
              <View
                className="w-12 h-12 rounded-lg items-center justify-center"
                style={{ backgroundColor: colors.inputBg }}
              >
                <FileText size={24} color={colors.textSecondary} />
              </View>
            )}
            <View className="ml-3 flex-1">
              <Text
                className="text-sm font-medium"
                style={{ color: colors.text }}
                numberOfLines={1}
              >
                {attachment.name}
              </Text>
              <Text
                className="text-xs"
                style={{ color: colors.textSecondary }}
              >
                {formatFileSize(attachment.size)}
              </Text>
            </View>
            <Pressable
              onPress={() => setAttachment(null)}
              className="p-2"
            >
              <X size={20} color={colors.textSecondary} />
            </Pressable>
          </View>
        ) : null}

        {/* Message Input */}
        <View
          className="px-4 py-3 border-t"
          style={{
            borderTopColor: colors.border,
            backgroundColor: colors.background,
            paddingBottom: insets.bottom + 8,
          }}
        >
          <View
            className="flex-row items-end rounded-2xl px-3 py-2"
            style={{ backgroundColor: colors.inputBg }}
          >
            {/* Attachment button */}
            <Pressable
              onPress={handleAttachmentPress}
              className="p-2 mr-1"
              disabled={isSending}
            >
              <Paperclip size={20} color={colors.textSecondary} />
            </Pressable>

            <TextInput
              className="flex-1 text-base max-h-24 py-1"
              style={{ color: colors.text }}
              placeholder="Type a message..."
              placeholderTextColor={colors.textSecondary}
              value={newMessage}
              onChangeText={setNewMessage}
              editable={!isSending}
              multiline
              maxLength={1000}
            />
            <Pressable
              onPress={handleSendMessage}
              disabled={(!newMessage.trim() && !attachment) || isSending}
              className="ml-2 mb-1 p-1"
            >
              {isSending || isUploading ? (
                <ActivityIndicator size="small" color="#F97316" />
              ) : (
                <Send
                  size={22}
                  color={(newMessage.trim() || attachment) ? '#F97316' : colors.textSecondary}
                />
              )}
            </Pressable>
          </View>
        </View>

        {/* Menu Modal */}
        <Modal
          visible={showMenu}
          transparent
          animationType="fade"
          onRequestClose={() => setShowMenu(false)}
        >
          <Pressable
            className="flex-1"
            style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
            onPress={() => setShowMenu(false)}
          >
            <View className="flex-1 justify-end">
              <View
                className="mx-4 mb-4 rounded-2xl overflow-hidden"
                style={{ backgroundColor: colors.background }}
              >
                <Pressable
                  onPress={handleViewProfile}
                  className="flex-row items-center px-5 py-4 border-b"
                  style={{ borderBottomColor: colors.border }}
                >
                  <User size={20} color={colors.text} />
                  <Text
                    className="ml-3 text-base font-medium"
                    style={{ color: colors.text }}
                  >
                    View Profile
                  </Text>
                </Pressable>

                <Pressable
                  onPress={() => setShowMenu(false)}
                  className="px-5 py-4 items-center"
                >
                  <Text
                    className="text-base font-medium"
                    style={{ color: colors.textSecondary }}
                  >
                    Cancel
                  </Text>
                </Pressable>
              </View>
            </View>
          </Pressable>
        </Modal>
      </View>
    </KeyboardAvoidingView>
  );
}
