import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Image,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Alert,
  StyleSheet,
  Dimensions,
  Modal,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { useLocalSearchParams } from 'expo-router';
import { useRouter } from '@/lib/router-helper';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/lib/state/auth-store';
import { useThreadMessages } from '@/hooks/useThreadMessages';
import { uploadFile } from '@/lib/upload';
import { SkeletonLoader } from '@/components/SkeletonLoader';
import { useTheme } from '@/lib/theme/ThemeContext';
import { extractErrorMessage } from '@/lib/errorUtils';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// ── Helpers ──
function formatTime(isoString: string | null): string {
  if (!isoString) return '';
  const d = new Date(isoString);
  let h = d.getHours();
  const m = d.getMinutes();
  const ampm = h >= 12 ? 'PM' : 'AM';
  h = h % 12 || 12;
  return `${h}:${String(m).padStart(2, '0')} ${ampm}`;
}

function formatDateSeparator(isoString: string): string {
  const d = new Date(isoString);
  const now = new Date();
  const isToday = d.toDateString() === now.toDateString();
  const yd = new Date(now);
  yd.setDate(now.getDate() - 1);
  const isYesterday = d.toDateString() === yd.toDateString();
  if (isToday) return 'Today';
  if (isYesterday) return 'Yesterday';
  return d.toLocaleDateString('en-GB', { month: 'long', day: 'numeric', year: 'numeric' });
}

function isSameDay(a: string, b: string): boolean {
  return new Date(a).toDateString() === new Date(b).toDateString();
}

interface MessageGroup {
  id: string;
  sender_user_id: string;
  sender: any;
  firstDate: string;
  messages: any[];
}

function buildMessageGroups(messages: any[]): MessageGroup[] {
  const groups: MessageGroup[] = [];
  let currentGroup: MessageGroup | null = null;
  let lastTime: number | null = null;

  messages.forEach((msg) => {
    const t = new Date(msg.created_at).getTime();
    const gap = lastTime ? t - lastTime : 0;
    const sameGroup =
      currentGroup &&
      currentGroup.sender_user_id === msg.sender_user_id &&
      gap < 5 * 60 * 1000;

    if (sameGroup) {
      currentGroup!.messages.push(msg);
    } else {
      if (currentGroup) groups.push(currentGroup);
      currentGroup = {
        id: msg.id,
        sender_user_id: msg.sender_user_id,
        sender: msg.sender,
        firstDate: msg.created_at,
        messages: [msg],
      };
    }
    lastTime = t;
  });

  if (currentGroup) groups.push(currentGroup);
  return groups;
}

// ── Message Bubble ──
interface MessageBubbleProps {
  message: string | null;
  attachmentUrl: string | null;
  isOutgoing: boolean;
  isLast: boolean;
  timestamp: string;
  isRead?: boolean;
  readAt?: string | null;
  onImagePress?: (url: string) => void;
  colors?: any;
}

function MessageBubble({
  message,
  attachmentUrl,
  isOutgoing,
  isLast,
  timestamp,
  isRead,
  readAt,
  onImagePress,
  colors,
}: MessageBubbleProps) {
  const isImage = attachmentUrl && /\.(jpg|jpeg|png|gif|webp)/i.test(attachmentUrl);
  const finalColors = colors || {
    messageInBg: '#f3f4f6',
    messageInText: '#111827',
    textSecondary: '#6b7280'
  };

  return (
    <View style={{ alignItems: isOutgoing ? 'flex-end' : 'flex-start', marginBottom: isLast ? 0 : 2 }}>
      <View
        style={[
          styles.bubble,
          isOutgoing ? styles.bubbleOut : { ...styles.bubbleIn, backgroundColor: finalColors.messageInBg },
          isLast && isOutgoing ? { borderBottomRightRadius: 6 } : null,
          isLast && !isOutgoing ? { borderBottomLeftRadius: 6 } : null,
        ]}
      >
        {/* Image attachment */}
        {isImage ? (
          <TouchableOpacity
            onPress={() => onImagePress?.(attachmentUrl)}
            activeOpacity={0.9}
            style={{ marginBottom: message ? 6 : 0 }}
          >
            <Image
              source={{ uri: attachmentUrl }}
              style={styles.attachmentImage}
              resizeMode="cover"
            />
          </TouchableOpacity>
        ) : null}

        {/* Non-image file attachment */}
        {attachmentUrl && !isImage ? (
          <View style={styles.fileAttachment}>
            <Ionicons
              name="document-outline"
              size={16}
              color={isOutgoing ? 'rgba(255,255,255,0.8)' : finalColors.textSecondary}
            />
            <Text
              style={[
                styles.fileAttachmentText,
                { color: isOutgoing ? 'rgba(255,255,255,0.9)' : finalColors.messageInText },
              ]}
            >
              Attachment
            </Text>
          </View>
        ) : null}

        {/* Text */}
        {message ? (
          <Text style={[
            styles.bubbleText,
            isOutgoing ? styles.bubbleTextOut : { ...styles.bubbleTextIn, color: finalColors.messageInText }
          ]}>
            {message}
          </Text>
        ) : null}
      </View>

      {/* Timestamp + read receipt */}
      {isLast ? (
        <View style={[styles.timestampRow, { justifyContent: isOutgoing ? 'flex-end' : 'flex-start' }]}>
          <Text style={styles.timestampText}>{formatTime(timestamp)}</Text>
          {isOutgoing ? (
            isRead && readAt ? (
              <>
                <Ionicons name="checkmark-done" size={13} color="#3b82f6" style={{ marginLeft: 3 }} />
                <Text style={[styles.timestampText, { color: '#3b82f6', marginLeft: 2 }]}>
                  Read {formatTime(readAt)}
                </Text>
              </>
            ) : (
              <Ionicons name="checkmark" size={13} color={finalColors.textSecondary} style={{ marginLeft: 3 }} />
            )
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

// ── Lightbox ──
function ImageLightbox({
  imageUrl,
  onClose,
  insets,
  colors,
}: {
  imageUrl: string | null;
  onClose: () => void;
  insets: any;
  colors?: any;
}) {
  if (!imageUrl) return null;
  return (
    <Modal visible={!!imageUrl} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.lightboxBg}>
        <TouchableOpacity
          onPress={onClose}
          style={[styles.lightboxClose, { top: insets.top + 12 }]}
        >
          <Ionicons name="close" size={24} color="#ffffff" />
        </TouchableOpacity>
        <Image source={{ uri: imageUrl }} style={styles.lightboxImage} resizeMode="contain" />
      </View>
    </Modal>
  );
}

// ── Typing Indicator ──
function TypingIndicator({ senderAvatar, senderName, colors }: any) {
  return (
    <View style={styles.typingRow}>
      <View style={[styles.typingAvatar, { backgroundColor: colors?.bgSecondary || '#f3f4f6' }]}>
        {senderAvatar ? (
          <Image
            source={{ uri: senderAvatar }}
            style={{ width: 28, height: 28, borderRadius: 8 }}
            resizeMode="cover"
          />
        ) : (
          <Text style={{ color: colors?.textSecondary || '#6b7280', fontSize: 10, fontWeight: '700' }}>
            {(senderName || 'C').charAt(0).toUpperCase()}
          </Text>
        )}
      </View>
      <View style={[styles.bubble, styles.bubbleIn, { paddingVertical: 12, paddingHorizontal: 14, backgroundColor: colors?.messageInBg || '#f3f4f6' }]}>
        <View style={{ flexDirection: 'row', gap: 4 }}>
          {[0, 1, 2].map((i) => (
            <View key={`typing-dot-${i}`} style={styles.typingDot} />
          ))}
        </View>
      </View>
    </View>
  );
}

// ===================== MAIN SCREEN =====================
export default function InquiryThreadScreen() {
  const { id: threadId } = useLocalSearchParams();
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const insets = useSafeAreaInsets();
  const { isDark } = useTheme();

  // Define theme-aware colors
  const colors = {
    bg: isDark ? '#0A0A0A' : '#ffffff',
    bgSecondary: isDark ? '#1A1A1A' : '#f3f4f6',
    text: isDark ? '#ffffff' : '#111827',
    textSecondary: isDark ? '#9ca3af' : '#6b7280',
    border: isDark ? '#374151' : '#e5e7eb',
    messageInBg: isDark ? '#1A1A1A' : '#f3f4f6',
    messageInText: isDark ? '#ffffff' : '#111827',
    messageOutBg: '#fa5610',
    messageOutText: '#ffffff',
    inputBg: isDark ? '#1A1A1A' : '#f3f4f6',
    inputBorder: isDark ? '#374151' : '#e5e7eb',
  };

  const [isVerified, setIsVerified] = useState(false);
  const [messageText, setMessageText] = useState('');
  const [selectedFile, setSelectedFile] = useState<any>(null);
  const [isSending, setIsSending] = useState(false);
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);
  const [isOtherTyping, setIsOtherTyping] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [otherParty, setOtherParty] = useState<any>(null);
  const [linkModalVisible, setLinkModalVisible] = useState(false);
  const [linkUrl, setLinkUrl] = useState('');
  const [linkTitle, setLinkTitle] = useState('');

  const scrollRef = useRef<ScrollView>(null);
  const typingChannelRef = useRef<any>(null);
  const typingTimeoutRef = useRef<any>(null);

  const { messages, isLoading, otherParty: hookOtherParty } = useThreadMessages(
    threadId as string,
    'inquiry',
    user?.id
  );

  // Set other party info
  useEffect(() => {
    if (hookOtherParty) {
      setOtherParty(hookOtherParty);
    }
  }, [hookOtherParty]);

  // Check verification status
  useEffect(() => {
    if (!user?.id) return;
    const checkVerification = async () => {
      const { data } = await supabase
        .from('talent_profiles')
        .select('is_verified')
        .eq('user_id', user.id)
        .maybeSingle();
      setIsVerified(data?.is_verified === true);
    };
    checkVerification();
  }, [user?.id]);

  // Auto-scroll
  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
    }
  }, [messages.length]);

  // Typing indicator
  useEffect(() => {
    if (!threadId || !user?.id) return;

    const typingChannel = supabase.channel(`typing-inquiry-${threadId}`);
    typingChannelRef.current = typingChannel;

    typingChannel
      .on('presence', { event: 'sync' }, () => {
        const state = typingChannel.presenceState();
        let found = false;
        Object.values(state).forEach((presences: any) => {
          presences.forEach((p: any) => {
            if (p.user_id !== user.id && p.is_typing) found = true;
          });
        });
        setIsOtherTyping(found);
      })
      .subscribe(async (status: string) => {
        if (status === 'SUBSCRIBED') {
          await typingChannel.track({ user_id: user.id, is_typing: false });
        }
      });

    return () => {
      if (typingChannelRef.current) {
        supabase.removeChannel(typingChannelRef.current);
        typingChannelRef.current = null;
      }
    };
  }, [threadId, user?.id]);

  const broadcastTyping = useCallback(
    async (isTyping: boolean) => {
      if (!typingChannelRef.current) return;
      try {
        await typingChannelRef.current.track({ user_id: user?.id, is_typing: isTyping });
      } catch (e) {}
    },
    [user?.id]
  );

  const handleTextChange = (text: string) => {
    setMessageText(text);
    broadcastTyping(text.length > 0);
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => broadcastTyping(false), 2000);
  };

  const handleAttachPress = () => {
    Alert.alert('Attach File', 'Choose what to upload', [
      {
        text: 'Image / Video',
        onPress: async () => {
          const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
          if (status !== 'granted') {
            Alert.alert('Permission Required', 'Please grant media library access.');
            return;
          }
          const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            quality: 0.85,
            allowsMultipleSelection: false,
          });
          if (!result.canceled && result.assets?.[0]) {
            const asset = result.assets[0];
            const ext = asset.uri.split('.').pop() || 'jpg';
            setSelectedFile({
              uri: asset.uri,
              name: `image_${Date.now()}.${ext}`,
              size: asset.fileSize || 0,
              type: asset.type === 'video' ? `video/${ext}` : `image/${ext}`,
              isImage: true,
            });
          }
        },
      },
      {
        text: 'Document (PDF, Doc)',
        onPress: async () => {
          try {
            const result = await DocumentPicker.getDocumentAsync({
              type: [
                'application/pdf',
                'application/msword',
                'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
              ],
              copyToCacheDirectory: true,
            });
            if (!result.canceled && result.assets && result.assets[0]) {
              const asset = result.assets[0];
              setSelectedFile({
                uri: asset.uri,
                name: asset.name || 'document',
                size: asset.size || 0,
                type: asset.mimeType || 'application/pdf',
                isImage: false,
              });
            }
          } catch (e) {
            const errorMsg = extractErrorMessage(e);
            console.error('DocumentPicker error:', errorMsg);
          }
        },
      },
      { text: 'Cancel', style: 'cancel' },
    ]);
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

    // Send the message content directly
    sendMessageWithContent(messageContent);
  };

  const sendMessageWithContent = async (text: string) => {
    if ((!text && !selectedFile) || isSending) return;

    setIsSending(true);
    broadcastTyping(false);

    let attachmentUrl: string | null = null;

    // Upload file if selected
    if (selectedFile) {
      try {
        const fileName = selectedFile.name || `file_${Date.now()}`;


        const uploadedFile = await uploadFile(selectedFile.uri, fileName, selectedFile.type);
        attachmentUrl = uploadedFile.cdnUrl || uploadedFile.url;
      } catch (e) {
        const errorMsg = extractErrorMessage(e);
        console.error('[inquiry] File upload error:', errorMsg);
        Alert.alert('Upload Failed', errorMsg);
      }
    }

    // Insert message
    try {
      const { error } = await supabase.from('inquiry_messages').insert({
        thread_id: threadId,
        sender_user_id: user?.id,
        message_text: text || null,
        attachment_url: attachmentUrl,
      });

      if (error) throw error;
    } catch (e) {
      const errorMsg = extractErrorMessage(e);
      console.error('Send message error:', errorMsg);
      Alert.alert('Error', 'Failed to send message. Please try again.');
    } finally {
      setIsSending(false);
    }
  };

  const handleSend = useCallback(async () => {
    const text = messageText.trim();
    if ((!text && !selectedFile) || isSending) return;

    setMessageText('');
    setSelectedFile(null);
    await sendMessageWithContent(text);
  }, [messageText, selectedFile, isSending, threadId, user?.id, broadcastTyping]);

  const handleSendQuote = () => {
    if (!isVerified) {
      Alert.alert('Verification Required', 'Please complete ID verification to send quotes to clients.', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'OK', onPress: () => {} },
      ]);
      return;
    }
    if (otherParty?.userId) {
      Alert.alert('Send Quote', 'Discuss pricing details directly in the chat with your client.', [
        { text: 'OK', style: 'cancel' },
      ]);
    }
  };

  const groups = useMemo(() => buildMessageGroups(messages), [messages]);
  const hasContent = messageText.trim() || selectedFile;

  if (isLoading) {
    return (
      <View style={[{ flex: 1, paddingTop: insets.top, backgroundColor: colors.bg }]}>
        {/* Skeleton header */}
        <View style={[styles.chatHeader, { backgroundColor: colors.bg, borderBottomColor: colors.border }]}>
          <TouchableOpacity onPress={() => router.back()} style={[styles.backBtn, { backgroundColor: colors.bgSecondary }]}>
            <Ionicons name="arrow-back" size={22} color={colors.text} />
          </TouchableOpacity>
          <SkeletonLoader width={40} height={40} borderRadius={12} style={{ flexShrink: 0 }} />
          <View style={{ flex: 1, gap: 6 }}>
            <SkeletonLoader width="70%" height={14} borderRadius={7} />
            <SkeletonLoader width="50%" height={11} borderRadius={6} />
          </View>
        </View>
        {/* Skeleton messages area */}
        <View style={{ flex: 1, padding: 16, gap: 12, backgroundColor: colors.bg }}>
          {[1, 2, 3, 4].map(i => (
            <View
              key={`skeleton-msg-${i}`}
              style={{ alignItems: i % 2 === 0 ? 'flex-end' : 'flex-start' }}
            >
              <SkeletonLoader
                width={i % 3 === 0 ? '55%' : '70%'}
                height={40}
                borderRadius={16}
              />
            </View>
          ))}
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top, backgroundColor: colors.bg }]}>
      {/* ── STICKY CHAT HEADER ── */}
      <View style={[styles.chatHeader, { backgroundColor: colors.bg, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={[styles.backBtn, { backgroundColor: colors.bgSecondary }]} activeOpacity={0.8}>
          <Ionicons name="arrow-back" size={22} color={colors.text} />
        </TouchableOpacity>

        <View style={styles.headerAvatarWrap}>
          {otherParty?.avatar ? (
            <Image source={{ uri: otherParty.avatar }} style={styles.headerAvatar} resizeMode="cover" />
          ) : (
            <View style={[styles.headerAvatar, { backgroundColor: colors.bgSecondary }]}>
              <Text style={[styles.headerAvatarInitial, { color: colors.text }]}>
                {(otherParty?.name || 'C').charAt(0).toUpperCase()}
              </Text>
            </View>
          )}
          <View style={[styles.onlineDot, { backgroundColor: colors.textSecondary }]} />
        </View>

        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={[styles.headerName, { color: colors.text }]} numberOfLines={1}>
            {otherParty?.name || 'Client'}
          </Text>
          <Text style={[styles.headerStatus, { color: colors.textSecondary }]}>Tap to view profile</Text>
        </View>

        <TouchableOpacity onPress={handleSendQuote} style={[styles.sendQuoteBtn, { borderColor: colors.border }]} activeOpacity={0.8}>
          <Text style={[styles.sendQuoteBtnText, { color: colors.text }]}>Send Quote</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.moreBtn} activeOpacity={0.8}>
          <Ionicons name="ellipsis-vertical" size={20} color={colors.text} />
        </TouchableOpacity>
      </View>

      {/* ── MESSAGES AREA ── */}
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={0}
      >
        <ScrollView
          ref={scrollRef}
          style={{ flex: 1, backgroundColor: colors.bg }}
          contentContainerStyle={styles.messagesContent}
          showsVerticalScrollIndicator={false}
          onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: false })}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={async () => {
                setRefreshing(true);
                // Reload messages - they auto-update via Supabase realtime
                setTimeout(() => setRefreshing(false), 500);
              }}
              tintColor="#fa5610"
            />
          }
        >
          {/* Empty state */}
          {groups.length === 0 ? (
            <View style={[styles.emptyChatState, { backgroundColor: colors.bg }]}>
              <View style={[styles.emptyIconBox, { backgroundColor: colors.bgSecondary }]}>
                <Ionicons name="chatbubble-outline" size={28} color={colors.textSecondary} />
              </View>
              <Text style={[styles.emptyTitle, { color: colors.text }]}>No messages yet</Text>
              <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>Send a message to start the conversation</Text>
            </View>
          ) : null}

          {/* Message groups */}
          {groups.map((group, groupIdx) => {
            const isOutgoing = group.sender_user_id === user?.id;
            const prevGroup = groups[groupIdx - 1];

            const showDateSep =
              !prevGroup ||
              !isSameDay(
                group.firstDate,
                prevGroup.messages[prevGroup.messages.length - 1].created_at
              );

            return (
              <View key={group.id}>
                {/* Date separator */}
                {(showDateSep || groupIdx === 0) ? (
                  <View style={styles.dateSep}>
                    <Text style={[styles.dateSepText, { color: colors.textSecondary, backgroundColor: colors.bgSecondary }]}>{formatDateSeparator(group.firstDate)}</Text>
                  </View>
                ) : null}

                {/* Group row */}
                <View
                  style={[
                    styles.groupRow,
                    isOutgoing ? { justifyContent: 'flex-end' } : { justifyContent: 'flex-start' },
                  ]}
                >
                  {/* Incoming avatar */}
                  {!isOutgoing ? (
                    <View style={styles.incomingAvatarWrap}>
                      {group.sender?.avatar_url ? (
                        <Image
                          source={{ uri: group.sender.avatar_url }}
                          style={styles.incomingAvatar}
                          resizeMode="cover"
                        />
                      ) : (
                        <View style={[styles.incomingAvatar, { backgroundColor: colors.bgSecondary }]}>
                          <Text style={{ color: colors.text, fontSize: 10, fontWeight: '700' }}>
                            {(group.sender?.full_name || otherParty?.name || 'C')
                              .charAt(0)
                              .toUpperCase()}
                          </Text>
                        </View>
                      )}
                    </View>
                  ) : null}

                  {/* Bubbles column */}
                  <View
                    style={[
                      styles.bubblesCol,
                      isOutgoing ? { alignItems: 'flex-end' } : { alignItems: 'flex-start' },
                    ]}
                  >
                    {group.messages.map((msg, msgIdx) => {
                      const isLast = msgIdx === group.messages.length - 1;
                      return (
                        <MessageBubble
                          key={msg.id}
                          message={msg.message_text}
                          attachmentUrl={msg.attachment_url}
                          isOutgoing={isOutgoing}
                          isLast={isLast}
                          timestamp={msg.created_at}
                          isRead={isOutgoing && isLast ? !!msg.read_at : undefined}
                          readAt={isOutgoing && isLast ? msg.read_at : undefined}
                          onImagePress={setLightboxImage}
                          colors={colors}
                        />
                      );
                    })}
                  </View>

                  {/* Spacer for outgoing */}
                  {isOutgoing ? <View style={{ width: 32 }} /> : null}
                </View>
              </View>
            );
          })}

          {/* Typing indicator */}
          {isOtherTyping ? (
            <TypingIndicator senderAvatar={otherParty?.avatar} senderName={otherParty?.name} colors={colors} />
          ) : null}
        </ScrollView>

        {/* ── COMPOSER ── */}
        <View style={[styles.composer, { backgroundColor: colors.bg, borderTopColor: colors.border, paddingBottom: insets.bottom + 8 }]}>
          {/* File preview */}
          {selectedFile ? (
            <View style={[styles.filePreviewRow, { backgroundColor: colors.bgSecondary }]}>
              {selectedFile.isImage ? (
                <Image
                  source={{ uri: selectedFile.uri }}
                  style={styles.filePreviewThumb}
                  resizeMode="cover"
                />
              ) : (
                <View style={[styles.filePreviewIconBox, { backgroundColor: colors.border }]}>
                  <Ionicons name="document-outline" size={22} color={colors.textSecondary} />
                </View>
              )}
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={[styles.filePreviewName, { color: colors.text }]} numberOfLines={1}>
                  {selectedFile.name}
                </Text>
                {selectedFile.size > 0 ? (
                  <Text style={[styles.filePreviewSize, { color: colors.textSecondary }]}>
                    {(selectedFile.size / 1024).toFixed(1)} KB
                  </Text>
                ) : null}
              </View>
              <TouchableOpacity
                onPress={() => setSelectedFile(null)}
                style={[styles.filePreviewRemove, { backgroundColor: colors.border }]}
                hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}
              >
                <Ionicons name="close" size={16} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>
          ) : null}

          {/* Input row */}
          <View style={styles.composerRow}>
            <TouchableOpacity
              onPress={handleAttachPress}
              style={styles.attachBtn}
              disabled={isSending}
              activeOpacity={0.8}
            >
              <Ionicons name="attach" size={22} color={colors.textSecondary} />
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setLinkModalVisible(true)}
              style={styles.attachBtn}
              disabled={isSending}
              activeOpacity={0.8}
            >
              <Ionicons name="link" size={22} color={colors.textSecondary} />
            </TouchableOpacity>

            <TextInput
              value={messageText}
              onChangeText={handleTextChange}
              placeholder="Type a message..."
              placeholderTextColor={colors.textSecondary}
              style={[styles.composerInput, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder, color: colors.text }]}
              multiline
              maxLength={2000}
              editable={!isSending}
            />

            <TouchableOpacity
              onPress={handleSend}
              disabled={!hasContent || isSending}
              style={[styles.sendBtn, hasContent ? styles.sendBtnActive : styles.sendBtnInactive]}
              activeOpacity={0.85}
            >
              {isSending ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <Ionicons name="send" size={18} color={hasContent ? '#ffffff' : colors.textSecondary} />
              )}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>

      {/* Lightbox */}
      <ImageLightbox imageUrl={lightboxImage} onClose={() => setLightboxImage(null)} insets={insets} colors={colors} />

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
        <TouchableOpacity
          style={{ flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.7)', justifyContent: 'center', alignItems: 'center' }}
          onPress={() => {
            setLinkModalVisible(false);
            setLinkUrl('');
            setLinkTitle('');
          }}
          activeOpacity={1}
        >
          <TouchableOpacity
            onPress={(e) => e.stopPropagation()}
            activeOpacity={1}
            style={{
              width: '85%',
              backgroundColor: colors.bg,
              borderRadius: 20,
              padding: 24,
              position: 'relative',
            }}
          >
            {/* Close button */}
            <TouchableOpacity
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
              <Ionicons name="close" size={24} color={colors.text} />
            </TouchableOpacity>

            {/* Title */}
            <Text style={{ fontSize: 18, fontWeight: '700', color: colors.text, marginBottom: 20, marginTop: 4 }}>
              Add External Link
            </Text>

            {/* Link URL input */}
            <View style={{ marginBottom: 16 }}>
              <Text style={{ fontSize: 14, fontWeight: '600', color: colors.text, marginBottom: 8 }}>
                Link URL
              </Text>
              <TextInput
                value={linkUrl}
                onChangeText={setLinkUrl}
                placeholder="https://drive.google.com/..."
                placeholderTextColor={colors.textSecondary}
                style={{
                  backgroundColor: colors.inputBg,
                  borderWidth: 2,
                  borderColor: '#d97706',
                  borderRadius: 14,
                  paddingHorizontal: 16,
                  paddingVertical: 12,
                  fontSize: 14,
                  color: colors.text,
                  minHeight: 48,
                }}
                autoCapitalize="none"
                returnKeyType="next"
              />
            </View>

            {/* Link Title input */}
            <View style={{ marginBottom: 24 }}>
              <Text style={{ fontSize: 14, fontWeight: '600', color: colors.text, marginBottom: 8 }}>
                Title (optional)
              </Text>
              <TextInput
                value={linkTitle}
                onChangeText={setLinkTitle}
                placeholder="Final Photos - Google Drive"
                placeholderTextColor={colors.textSecondary}
                style={{
                  backgroundColor: colors.inputBg,
                  borderWidth: 2,
                  borderColor: colors.inputBorder,
                  borderRadius: 14,
                  paddingHorizontal: 16,
                  paddingVertical: 12,
                  fontSize: 14,
                  color: colors.text,
                  minHeight: 48,
                }}
                returnKeyType="done"
              />
            </View>

            {/* Buttons */}
            <View style={{ flexDirection: 'row', gap: 12 }}>
              <TouchableOpacity
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
                  borderColor: colors.border,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Text style={{ fontSize: 16, fontWeight: '600', color: colors.text }}>
                  Cancel
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
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
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

// ===================== STYLES =====================
const styles = StyleSheet.create({
  container: { flex: 1 },

  chatHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerAvatarWrap: { position: 'relative' },
  headerAvatar: { width: 40, height: 40, borderRadius: 12 },
  headerAvatarFallback: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerAvatarInitial: { fontSize: 16, fontWeight: '700' },
  onlineDot: {
    position: 'absolute',
    bottom: -1,
    right: -1,
    width: 11,
    height: 11,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#ffffff',
  },
  headerName: { fontSize: 15, fontWeight: '600' },
  headerStatus: { fontSize: 11, marginTop: 1 },
  sendQuoteBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
  },
  sendQuoteBtnText: { fontSize: 12, fontWeight: '600' },
  moreBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },

  messagesContent: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 8 },

  emptyChatState: { alignItems: 'center', paddingTop: 80, paddingHorizontal: 32 },
  emptyIconBox: {
    width: 64,
    height: 64,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyTitle: { fontSize: 16, fontWeight: '600', marginBottom: 6 },
  emptySubtitle: { fontSize: 13, textAlign: 'center', lineHeight: 20 },

  groupRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginBottom: 4,
  },
  incomingAvatarWrap: { width: 32, marginRight: 8 },
  incomingAvatar: { width: 28, height: 28, borderRadius: 8 },
  incomingAvatarFallback: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  bubblesCol: { maxWidth: SCREEN_WIDTH * 0.72, flexShrink: 1 },

  bubble: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 18,
    marginBottom: 2,
    maxWidth: '100%',
  },
  bubbleOut: { backgroundColor: '#fa5610' },
  bubbleIn: { backgroundColor: '#f3f4f6' },
  bubbleText: { fontSize: 15, lineHeight: 22 },
  bubbleTextOut: { color: '#ffffff' },
  bubbleTextIn: { color: '#111827' },

  attachmentImage: {
    width: 200,
    height: 150,
    borderRadius: 12,
    marginBottom: 4,
  },
  fileAttachment: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  fileAttachmentText: { fontSize: 14 },

  timestampRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 4,
    marginBottom: 4,
    marginTop: 2,
  },
  timestampText: { fontSize: 11, color: '#9ca3af' },

  dateSep: { alignItems: 'center', marginVertical: 16 },
  dateSepText: {
    fontSize: 11,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 20,
  },

  typingRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, marginBottom: 8 },
  typingAvatar: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  typingDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#9ca3af' },

  lightboxBg: { flex: 1, backgroundColor: '#000000', alignItems: 'center', justifyContent: 'center' },
  lightboxClose: {
    position: 'absolute',
    left: 16,
    zIndex: 10,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  lightboxImage: { width: '100%', height: '100%' },

  composer: {
    borderTopWidth: 1,
    paddingTop: 10,
    paddingHorizontal: 12,
  },
  filePreviewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: 14,
    padding: 10,
    marginBottom: 10,
  },
  filePreviewThumb: { width: 48, height: 48, borderRadius: 10 },
  filePreviewIconBox: {
    width: 48,
    height: 48,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filePreviewName: { fontSize: 13, fontWeight: '500' },
  filePreviewSize: { fontSize: 11, marginTop: 2 },
  filePreviewRemove: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },

  composerRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
  },
  attachBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  composerInput: {
    flex: 1,
    minHeight: 44,
    maxHeight: 120,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 24,
    borderWidth: 1,
    fontSize: 15,
    textAlignVertical: 'center',
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnActive: { backgroundColor: '#fa5610' },
  sendBtnInactive: { backgroundColor: '#f3f4f6' },
});
