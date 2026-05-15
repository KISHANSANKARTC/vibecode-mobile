import React, { useState, useRef, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  FlatList,
  TextInput,
  Image,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Alert,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/lib/theme/ThemeContext';
import { useTalentMessages, type ThreadData } from '@/hooks/useTalentMessages';
import { useThreadMessages, type Message } from '@/hooks/useThreadMessages';
import { useAuthStore } from '@/lib/state/auth-store';
import { supabase } from '@/lib/supabase';
import { router } from 'expo-router';
import { SkeletonLoader } from '@/components/SkeletonLoader';
import { Modal } from 'react-native';
import { extractErrorMessage } from '@/lib/errorUtils';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// ── Helpers ──
function formatThreadTime(isoString: string | null): string {
  if (!isoString) return '';
  const date = new Date(isoString);
  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const isYesterday = date.toDateString() === yesterday.toDateString();

  if (isToday) return date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  if (isYesterday) return 'Yesterday';
  return date.toLocaleDateString('en-GB', { month: 'short', day: 'numeric' });
}

function formatMessageTime(isoString: string): string {
  if (!isoString) return '';
  return new Date(isoString).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
}

function formatDateSeparator(isoString: string): string {
  const date = new Date(isoString);
  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (isToday) return 'Today';
  if (date.toDateString() === yesterday.toDateString()) return 'Yesterday';
  return date.toLocaleDateString('en-GB', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
}

// Group consecutive messages by sender (within 5 min gap)
function groupMessages(messages: Message[]) {
  const groups: any[] = [];
  let currentGroup: any = null;
  let lastTime: number | null = null;

  messages.forEach((msg) => {
    const msgTime = new Date(msg.created_at).getTime();
    const shouldBreak = !currentGroup ||
      currentGroup.senderId !== msg.sender_user_id ||
      (lastTime && msgTime - lastTime > 5 * 60 * 1000);

    if (shouldBreak) {
      if (currentGroup) groups.push(currentGroup);
      currentGroup = {
        id: msg.id,
        senderId: msg.sender_user_id,
        sender: msg.sender,
        messages: [msg],
        firstDate: msg.created_at,
      };
    } else {
      currentGroup.messages.push(msg);
    }
    lastTime = msgTime;
  });

  if (currentGroup) groups.push(currentGroup);
  return groups;
}

// ===================== THREAD LIST =====================
function ThreadList({
  threads,
  isLoading,
  filter,
  onFilterChange,
  search,
  onSearchChange,
  totalUnread,
  gigsCount,
  chatsCount,
  unreadThreadsCount,
  onSelectThread,
  isDark,
}: {
  threads: ThreadData[];
  isLoading: boolean;
  filter: 'all' | 'gigs' | 'chats' | 'unread';
  onFilterChange: (filter: 'all' | 'gigs' | 'chats' | 'unread') => void;
  search: string;
  onSearchChange: (search: string) => void;
  totalUnread: number;
  gigsCount: number;
  chatsCount: number;
  unreadThreadsCount: number;
  onSelectThread: (thread: ThreadData) => void;
  isDark: boolean;
}) {
  const insets = useSafeAreaInsets();

  const colors = {
    bg: isDark ? '#0A0A0A' : '#ffffff',
    bgSecondary: isDark ? '#1A1A1A' : '#f9fafb',
    text: isDark ? '#ffffff' : '#111827',
    textSecondary: isDark ? '#9ca3af' : '#6b7280',
    border: isDark ? '#374151' : '#e5e7eb',
  };

  const filtered = useMemo(() => {
    let result = threads;
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(t =>
        t.otherPartyName?.toLowerCase().includes(q) ||
        t.lastMessage?.toLowerCase().includes(q)
      );
    }
    if (filter === 'gigs') result = result.filter(t => t.type === 'booking');
    if (filter === 'chats') result = result.filter(t => t.type === 'inquiry');
    if (filter === 'unread') result = result.filter(t => t.unreadCount > 0);
    return result;
  }, [threads, search, filter]);

  const FILTERS: Array<{ key: 'all' | 'gigs' | 'chats' | 'unread'; label: string }> = [
    { key: 'all', label: 'All' },
    { key: 'gigs', label: `Gigs${gigsCount > 0 ? ` (${gigsCount})` : ''}` },
    { key: 'chats', label: `Chats${chatsCount > 0 ? ` (${chatsCount})` : ''}` },
    { key: 'unread', label: `Unread${unreadThreadsCount > 0 ? ` (${unreadThreadsCount})` : ''}` },
  ];

  if (isLoading) {
    return (
      <View style={[styles.container, { paddingTop: insets.top, backgroundColor: colors.bg }]}>
        <View style={[styles.listHeader, { backgroundColor: colors.bg, borderBottomColor: colors.border }]}>
          <View style={styles.titleRow}>
            <Text style={[styles.screenTitle, { color: colors.text }]}>Messages</Text>
          </View>
          <View style={[styles.searchBar, { backgroundColor: colors.bgSecondary }]}>
            <Ionicons name="search-outline" size={16} color={colors.textSecondary} />
            <Text style={{ color: colors.textSecondary, fontSize: 15 }}>Search conversations...</Text>
          </View>
        </View>
        <View style={{ flex: 1 }}>
          <FlatList
            data={[1, 2, 3, 4, 5]}
            keyExtractor={item => `skeleton-${item}`}
            contentContainerStyle={{ padding: 8 }}
            scrollEnabled={false}
            renderItem={() => (
              <View style={styles.threadRow}>
                <SkeletonLoader width={52} height={52} borderRadius={16} style={{ flexShrink: 0 }} />
                <View style={{ flex: 1, gap: 8 }}>
                  <SkeletonLoader width="60%" height={14} borderRadius={7} />
                  <SkeletonLoader width="80%" height={12} borderRadius={6} />
                </View>
              </View>
            )}
          />
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top, backgroundColor: colors.bg }]}>
      {/* Header */}
      <View style={[styles.listHeader, { backgroundColor: colors.bg, borderBottomColor: colors.border }]}>
        <View style={styles.titleRow}>
          <Text style={[styles.screenTitle, { color: colors.text }]}>Messages</Text>
          {totalUnread > 0 && (
            <View style={styles.totalUnreadBadge}>
              <Text style={styles.totalUnreadText}>{totalUnread > 99 ? '99+' : totalUnread}</Text>
            </View>
          )}
        </View>

        {/* Search bar */}
        <View style={[styles.searchBar, { backgroundColor: colors.bgSecondary }]}>
          <Ionicons name="search-outline" size={16} color={colors.textSecondary} />
          <TextInput
            value={search}
            onChangeText={onSearchChange}
            placeholder="Search conversations..."
            placeholderTextColor={colors.textSecondary}
            style={[styles.searchInput, { color: colors.text }]}
            returnKeyType="search"
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => onSearchChange('')}>
              <Ionicons name="close-circle" size={16} color={colors.textSecondary} />
            </TouchableOpacity>
          )}
        </View>

        {/* Filter tabs */}
        <View style={styles.filterTabsRow}>
          {FILTERS.map(f => (
            <TouchableOpacity
              key={f.key}
              onPress={() => onFilterChange(f.key)}
              style={[styles.filterTab, filter === f.key && styles.filterTabActive]}
              activeOpacity={0.8}
            >
              <Text style={[styles.filterTabText, filter === f.key && [styles.filterTabTextActive, { color: '#fa5610' }], filter !== f.key && { color: colors.textSecondary }]}>
                {f.label}
              </Text>
              {filter === f.key && <View style={styles.filterTabUnderline} />}
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Thread list */}
      <FlatList
        data={filtered}
        keyExtractor={item => `${item.type}-${item.id}`}
        contentContainerStyle={{ padding: 8, paddingBottom: 20 }}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={() => (
          <View style={styles.emptyState}>
            <View style={[styles.emptyIconBox, { backgroundColor: colors.bgSecondary }]}>
              <Ionicons name="chatbubble-outline" size={28} color={colors.textSecondary} />
            </View>
            <Text style={[styles.emptyTitle, { color: colors.text }]}>
              {search ? 'No results' : 'No messages yet'}
            </Text>
            <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
              {search ? 'Try a different search term' : 'Messages from clients will appear here'}
            </Text>
          </View>
        )}
        renderItem={({ item }) => {
          const isGig = item.type === 'booking';
          const hasUnread = item.unreadCount > 0;
          const isAttachment = !item.lastMessage && item.lastMessageTime;

          return (
            <TouchableOpacity
              onPress={() => onSelectThread(item)}
              style={[styles.threadRow, hasUnread && [styles.threadRowUnread, { backgroundColor: isDark ? 'rgba(124,58,237,0.1)' : 'rgba(124,58,237,0.04)' }]]}
              activeOpacity={0.75}
            >
              {/* Left: type icon + avatar */}
              <View style={{ position: 'relative' }}>
                {/* Type indicator */}
                <View style={[styles.typeIcon, isGig ? styles.typeIconGig : [styles.typeIconChat, { backgroundColor: colors.bgSecondary, borderColor: colors.bg }]]}>
                  <Ionicons
                    name={isGig ? 'briefcase-outline' : 'chatbubble-outline'}
                    size={13}
                    color={isGig ? '#fa5610' : colors.textSecondary}
                  />
                </View>
                {/* Avatar */}
                <View style={styles.threadAvatarWrap}>
                  {item.otherPartyAvatar ? (
                    <Image source={{ uri: item.otherPartyAvatar }} style={styles.threadAvatar} />
                  ) : (
                    <View style={[styles.threadAvatar, [styles.threadAvatarFallback, { backgroundColor: colors.bgSecondary }]]}>
                      <Text style={[styles.threadAvatarInitial, { color: colors.text }]}>
                        {(item.otherPartyName || 'C').charAt(0).toUpperCase()}
                      </Text>
                    </View>
                  )}
                  {/* Unread indicator dot on avatar */}
                  {hasUnread ? <View style={styles.unreadDot} /> : null}
                </View>
              </View>

              {/* Content */}
              <View style={styles.threadContent}>
                <View style={styles.threadTopRow}>
                  <View style={styles.threadNameRow}>
                    <Text style={[styles.threadName, hasUnread && [styles.threadNameUnread, { color: colors.text, fontWeight: '600' }], !hasUnread && { color: colors.text }]} numberOfLines={1}>
                      {item.otherPartyName || 'Client'}
                    </Text>
                    {isGig ? (
                      <View style={styles.gigBadge}>
                        <Text style={styles.gigBadgeText}>Gig</Text>
                      </View>
                    ) : null}
                  </View>
                  <Text style={[styles.threadTime, { color: colors.textSecondary }]}>{formatThreadTime(item.lastMessageTime)}</Text>
                </View>
                <View style={styles.threadBottomRow}>
                  <Text
                    style={[styles.threadPreview, hasUnread && [styles.threadPreviewUnread, { color: colors.text, fontWeight: '500' }], !hasUnread && { color: colors.textSecondary }]}
                    numberOfLines={1}
                  >
                    {item.lastMessage || (isAttachment ? '📎 Attachment' : 'No messages yet')}
                  </Text>
                  {hasUnread ? (
                    <View style={styles.unreadBadge}>
                      <Text style={styles.unreadBadgeText}>
                        {item.unreadCount > 9 ? '9+' : item.unreadCount}
                      </Text>
                    </View>
                  ) : null}
                </View>
              </View>
            </TouchableOpacity>
          );
        }}
      />
    </View>
  );
}

// ===================== CHAT THREAD VIEW =====================
function ChatThreadView({
  thread,
  userId,
  isVerified,
  onBack,
  onSendQuote,
}: {
  thread: ThreadData;
  userId: string | undefined;
  isVerified: boolean;
  onBack: () => void;
  onSendQuote: (thread: ThreadData, otherParty: any) => void;
}) {
  const insets = useSafeAreaInsets();
  const {
    messages,
    isLoading,
    otherParty,
    isOtherTyping,
    sendMessage,
    sendTypingIndicator,
  } = useThreadMessages(thread.id, thread.type, userId);

  const [messageText, setMessageText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const scrollRef = useRef<ScrollView>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [linkUrl, setLinkUrl] = useState('');
  const [linkTitle, setLinkTitle] = useState('');

  // Auto-scroll on new messages
  useEffect(() => {
    if (messages.length > 0 && scrollRef.current) {
      setTimeout(() => scrollRef.current?.scrollToEnd?.({ animated: true }), 100);
    }
  }, [messages.length]);

  const groupedMessages = useMemo(() => groupMessages(messages), [messages]);

  const handleTextChange = (text: string) => {
    setMessageText(text);
    sendTypingIndicator(text.length > 0);
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => sendTypingIndicator(false), 2000);
  };

  const handleSend = async () => {
    const text = messageText.trim();
    if (!text || isSending) return;
    setMessageText('');
    sendTypingIndicator(false);
    setIsSending(true);
    try {
      await sendMessage(text, null);
    } catch (e) {
      const errorMsg = extractErrorMessage(e);
      console.error('Error sending message:', errorMsg);
    } finally {
      setIsSending(false);
    }
  };

  const handleAddLink = async () => {
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


    // Clear the input fields immediately
    setLinkUrl('');
    setLinkTitle('');

    try {
      // Send the message and wait for it
      await sendMessage(messageContent, null);
      // Close modal only after message is sent
      setShowLinkModal(false);
    } catch (err) {
      const errorMsg = extractErrorMessage(err);
      console.error('Error sending link message:', errorMsg);
      Alert.alert('Error', 'Failed to send link: ' + errorMsg);
    }
  };

  const handleSendQuotePress = () => {
    if (!isVerified) {
      Alert.alert(
        'Verification Required',
        'Please complete ID verification to send quotes.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Verify Now', onPress: () => onBack() },
        ]
      );
      return;
    }
    onSendQuote(thread, otherParty);
  };

  const displayName = otherParty?.name || thread.otherPartyName || 'Client';
  const displayAvatar = otherParty?.avatar || thread.otherPartyAvatar;

  return (
    <KeyboardAvoidingView
      style={[styles.container, { paddingTop: insets.top }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={0}
    >
      {/* ── Chat Header ── */}
      <View style={styles.chatHeader}>
        {/* Back button */}
        <TouchableOpacity onPress={onBack} style={styles.chatBackBtn} activeOpacity={0.8}>
          <Ionicons name="arrow-back" size={22} color="#111827" />
        </TouchableOpacity>

        {/* Avatar + Name + Status */}
        <View style={styles.chatHeaderInfo}>
          <View style={styles.chatAvatarWrap}>
            {displayAvatar ? (
              <Image source={{ uri: displayAvatar }} style={styles.chatAvatar} />
            ) : (
              <View style={[styles.chatAvatar, styles.chatAvatarFallback]}>
                <Text style={styles.chatAvatarInitial}>{displayName.charAt(0).toUpperCase()}</Text>
              </View>
            )}
            {/* Online dot - always show as grey/offline for now */}
            <View style={[styles.onlineDot, { backgroundColor: '#9ca3af' }]} />
          </View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={styles.chatHeaderName} numberOfLines={1}>
              {displayName}
            </Text>
            <Text style={styles.chatHeaderStatus}>Tap to view profile</Text>
          </View>
        </View>

        {/* Send Quote button */}
        <TouchableOpacity
          onPress={handleSendQuotePress}
          style={styles.sendQuoteBtn}
          activeOpacity={0.8}
        >
          <Text style={styles.sendQuoteBtnText}>Send Quote</Text>
        </TouchableOpacity>

        {/* 3-dot menu */}
        <TouchableOpacity style={styles.moreBtn} activeOpacity={0.8}>
          <Ionicons name="ellipsis-vertical" size={20} color="#111827" />
        </TouchableOpacity>
      </View>

      {/* ── Messages Area ── */}
      {isLoading ? (
        <View style={{ flex: 1, padding: 16 }}>
          <View style={{ gap: 12 }}>
            {/* Skeleton message bubbles */}
            {[1, 2, 3].map(i => (
              <View key={`skeleton-msg-${i}`} style={{ alignItems: i % 2 === 0 ? 'flex-end' : 'flex-start' }}>
                <SkeletonLoader
                  width={i % 3 === 0 ? '60%' : '70%'}
                  height={40}
                  borderRadius={16}
                />
              </View>
            ))}
          </View>
        </View>
      ) : (
        <ScrollView
          ref={scrollRef}
          style={{ flex: 1 }}
          contentContainerStyle={styles.messagesContent}
          showsVerticalScrollIndicator={false}
          onContentSizeChange={() => scrollRef.current?.scrollToEnd?.({ animated: false })}
        >
          {groupedMessages.length === 0 ? (
            <View style={styles.emptyChatState}>
              <View style={styles.emptyIconBox}>
                <Ionicons name="chatbubble-outline" size={24} color="#9ca3af" />
              </View>
              <Text style={styles.emptyTitle}>No messages yet</Text>
              <Text style={styles.emptySubtitle}>Send a message to start the conversation</Text>
            </View>
          ) : (
            groupedMessages.map((group, groupIndex) => {
              const isOutgoing = group.senderId === userId;
              const prevGroup = groupedMessages[groupIndex - 1];
              const showDateSep = !prevGroup ||
                new Date(group.firstDate).toDateString() !== new Date(prevGroup.messages[prevGroup.messages.length - 1].created_at).toDateString();

              return (
                <View key={group.id}>
                  {/* Date separator */}
                  {showDateSep ? (
                    <View style={styles.dateSep}>
                      <Text style={styles.dateSepText}>{formatDateSeparator(group.firstDate)}</Text>
                    </View>
                  ) : null}

                  {/* Message group row */}
                  <View style={[styles.messageGroupRow, isOutgoing ? { justifyContent: 'flex-end' } : { justifyContent: 'flex-start' }]}>
                    {/* Incoming avatar */}
                    {!isOutgoing && (
                      <View style={styles.incomingAvatarCol}>
                        {displayAvatar ? (
                          <Image source={{ uri: displayAvatar }} style={styles.incomingAvatar} />
                        ) : (
                          <View style={[styles.incomingAvatar, styles.chatAvatarFallback]}>
                            <Text style={{ color: '#6b7280', fontSize: 12, fontWeight: '700' }}>
                              {displayName.charAt(0).toUpperCase()}
                            </Text>
                          </View>
                        )}
                      </View>
                    )}

                    {/* Bubbles column */}
                    <View style={[styles.bubblesCol, isOutgoing ? { alignItems: 'flex-end' } : { alignItems: 'flex-start' }]}>
                      {group.messages.map((msg: Message, msgIdx: number) => {
                        const isLast = msgIdx === group.messages.length - 1;
                        const isRead = isOutgoing && isLast && !!msg.read_at;
                        const isImage = msg.attachment_url && /\.(jpg|jpeg|png|gif|webp)/i.test(msg.attachment_url);

                        return (
                          <View key={msg.id}>
                            <View
                              style={[
                                styles.bubble,
                                isOutgoing ? styles.bubbleOut : styles.bubbleIn,
                                isLast && isOutgoing ? styles.bubbleOutTail : null,
                                isLast && !isOutgoing ? styles.bubbleInTail : null,
                              ]}
                            >
                              {/* Image attachment */}
                              {isImage && msg.attachment_url ? (
                                <Image
                                  source={{ uri: msg.attachment_url }}
                                  style={styles.attachmentImage}
                                  resizeMode="cover"
                                />
                              ) : null}
                              {/* File attachment */}
                              {msg.attachment_url && !isImage ? (
                                <View style={styles.fileAttachment}>
                                  <Ionicons name="document-outline" size={16} color={isOutgoing ? 'rgba(255,255,255,0.8)' : '#6b7280'} />
                                  <Text style={[styles.fileAttachmentText, { color: isOutgoing ? 'rgba(255,255,255,0.9)' : '#111827' }]}>
                                    Attachment
                                  </Text>
                                </View>
                              ) : null}
                              {/* Text */}
                              {msg.message_text ? (
                                <Text style={[styles.bubbleText, isOutgoing ? styles.bubbleTextOut : styles.bubbleTextIn]}>
                                  {msg.message_text}
                                </Text>
                              ) : null}
                            </View>
                            {/* Timestamp + read receipt — only on last in group */}
                            {isLast ? (
                              <View style={[styles.timestampRow, isOutgoing ? { justifyContent: 'flex-end' } : { justifyContent: 'flex-start' }]}>
                                <Text style={styles.timestampText}>{formatMessageTime(msg.created_at)}</Text>
                                {isOutgoing ? (
                                  isRead ? (
                                    <>
                                      <Ionicons name="checkmark-done" size={14} color="#3b82f6" style={{ marginLeft: 4 }} />
                                      <Text style={[styles.timestampText, { color: '#3b82f6', marginLeft: 2 }]}>
                                        Read {msg.read_at ? formatMessageTime(msg.read_at) : ''}
                                      </Text>
                                    </>
                                  ) : (
                                    <Ionicons name="checkmark" size={14} color="#9ca3af" style={{ marginLeft: 4 }} />
                                  )
                                ) : null}
                              </View>
                            ) : null}
                          </View>
                        );
                      })}
                    </View>

                    {/* Spacer for outgoing */}
                    {isOutgoing ? <View style={{ width: 32 }} /> : null}
                  </View>
                </View>
              );
            })
          )}

          {/* Typing indicator */}
          {isOtherTyping ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingBottom: 8 }}>
              <View style={[styles.incomingAvatar, styles.chatAvatarFallback]}>
                <Text style={{ color: '#6b7280', fontSize: 10 }}>{displayName.charAt(0)}</Text>
              </View>
              <View style={[styles.bubble, styles.bubbleIn, { paddingVertical: 10 }]}>
                <View style={{ flexDirection: 'row', gap: 4 }}>
                  {[0, 200, 400].map((delay, i) => (
                    <View key={`typing-dot-${i}-${delay}`} style={styles.typingDot} />
                  ))}
                </View>
              </View>
            </View>
          ) : null}
        </ScrollView>
      )}

      {/* ── Composer ── */}
      <View style={[styles.composer, { paddingBottom: Math.max(insets.bottom, 8) }]}>
        {/* Attachment button */}
        <TouchableOpacity style={styles.composerAttachBtn} activeOpacity={0.8}>
          <Ionicons name="attach" size={22} color="#6b7280" />
        </TouchableOpacity>

        {/* Link button */}
        <TouchableOpacity
          onPress={() => setShowLinkModal(true)}
          style={styles.composerAttachBtn}
          activeOpacity={0.8}
        >
          <Ionicons name="link" size={22} color="#6b7280" />
        </TouchableOpacity>

        {/* Text input */}
        <TextInput
          value={messageText}
          onChangeText={handleTextChange}
          placeholder="Type a message..."
          placeholderTextColor="#9ca3af"
          style={styles.composerInput}
          multiline
          maxLength={2000}
          returnKeyType="default"
        />

        {/* Send button */}
        <TouchableOpacity
          onPress={handleSend}
          disabled={!messageText.trim() || isSending}
          style={[
            styles.composerSendBtn,
            messageText.trim() ? styles.composerSendBtnActive : styles.composerSendBtnInactive,
          ]}
          activeOpacity={0.85}
        >
          {isSending
            ? <ActivityIndicator size="small" color="#ffffff" />
            : <Ionicons name="send" size={18} color={messageText.trim() ? '#ffffff' : '#9ca3af'} />
          }
        </TouchableOpacity>
      </View>

      {/* ── Add Link Modal ── */}
      <Modal
        visible={showLinkModal}
        transparent
        animationType="fade"
        onRequestClose={() => {
          setShowLinkModal(false);
          setLinkUrl('');
          setLinkTitle('');
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {/* Close button */}
            <TouchableOpacity
              onPress={() => {
                setShowLinkModal(false);
                setLinkUrl('');
                setLinkTitle('');
              }}
              style={styles.modalCloseBtn}
            >
              <Ionicons name="close" size={24} color="#ffffff" />
            </TouchableOpacity>

            {/* Title */}
            <Text style={styles.modalTitle}>Add External Link</Text>

            {/* Link URL input */}
            <View style={styles.modalSection}>
              <Text style={styles.modalLabel}>Link URL</Text>
              <TextInput
                value={linkUrl}
                onChangeText={setLinkUrl}
                placeholder="https://drive.google.com/..."
                placeholderTextColor="#6b7280"
                style={styles.modalInput}
                autoCapitalize="none"
                returnKeyType="next"
              />
            </View>

            {/* Link Title input */}
            <View style={styles.modalSection}>
              <Text style={styles.modalLabel}>Title (optional)</Text>
              <TextInput
                value={linkTitle}
                onChangeText={setLinkTitle}
                placeholder="Final Photos - Google Drive"
                placeholderTextColor="#6b7280"
                style={styles.modalInput}
                returnKeyType="done"
              />
            </View>

            {/* Buttons */}
            <View style={styles.modalButtonRow}>
              <TouchableOpacity
                onPress={() => {
                  setShowLinkModal(false);
                  setLinkUrl('');
                  setLinkTitle('');
                }}
                style={styles.modalCancelBtn}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handleAddLink}
                style={styles.modalAddBtn}
              >
                <Ionicons name="add" size={20} color="#ffffff" />
                <Text style={styles.modalAddText}>Add Link</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

// ===================== MAIN SCREEN =====================
export default function TalentMessagesScreen() {
  const { isDark } = useTheme();
  const user = useAuthStore((state) => state.user);
  const {
    threads,
    isLoading,
    totalUnreadCount,
    gigsCount,
    chatsCount,
    unreadThreadsCount,
    refetch,
  } = useTalentMessages();

  const [selectedThread, setSelectedThread] = useState<ThreadData | null>(null);
  const [filter, setFilter] = useState<'all' | 'gigs' | 'chats' | 'unread'>('all');
  const [search, setSearch] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  // Check talent verification
  const [isVerified, setIsVerified] = useState(false);
  useEffect(() => {
    if (!user?.id) return;
    const checkVerif = async () => {
      const { data } = await supabase
        .from('talent_profiles')
        .select('is_verified')
        .eq('user_id', user.id)
        .maybeSingle();
      setIsVerified(data?.is_verified === true);
    };
    checkVerif();
  }, [user?.id]);

  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const handleSelectThread = (thread: ThreadData) => {
    // Inquiry threads: navigate to inquiry chat screen
    if (thread.type === 'inquiry') {
      router.push(`/(talent)/messagesGroup/inquiry/${thread.id}`);
      return;
    }
    // Booking threads: navigate to booking messages chat screen
    if (thread.type === 'booking') {
      router.push(`/(talent)/messagesGroup/messages/${thread.id}`);
      return;
    }
  };

  const handleBack = () => {
    setSelectedThread(null);
  };

  const handleSendQuote = (thread: ThreadData, otherParty: any) => {
    Alert.alert('Send Quote', 'Quotes can be discussed directly in the chat with your client.');
  };

  // Show chat thread view when a thread is selected
  if (selectedThread) {
    return (
      <ChatThreadView
        thread={selectedThread}
        userId={user?.id}
        isVerified={isVerified}
        onBack={handleBack}
        onSendQuote={handleSendQuote}
      />
    );
  }

  // Show thread list
  return (
    <ThreadList
      threads={threads}
      isLoading={isLoading}
      filter={filter}
      onFilterChange={setFilter}
      search={search}
      onSearchChange={setSearch}
      totalUnread={totalUnreadCount}
      gigsCount={gigsCount}
      chatsCount={chatsCount}
      unreadThreadsCount={unreadThreadsCount}
      onSelectThread={handleSelectThread}
      isDark={isDark}
    />
  );
}

// ===================== STYLES =====================
const styles = StyleSheet.create({
  container: { flex: 1 },

  // Thread List Header
  listHeader: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 0,
    borderBottomWidth: 1,
  },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
  screenTitle: { fontSize: 22, fontWeight: '700', color: '#111827' },
  totalUnreadBadge: { paddingHorizontal: 8, paddingVertical: 2, backgroundColor: '#fa5610', borderRadius: 20 },
  totalUnreadText: { color: '#ffffff', fontSize: 12, fontWeight: '700' },

  // Search bar
  searchBar: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    borderRadius: 25,
    paddingHorizontal: 14, paddingVertical: 10,
    marginBottom: 12,
  },
  searchInput: { flex: 1, fontSize: 15, color: '#111827', padding: 0 },

  // Filter tabs
  filterTabsRow: {
    flexDirection: 'row',
    borderBottomWidth: 0,
  },
  filterTab: {
    paddingHorizontal: 4, paddingBottom: 10, marginRight: 20,
    position: 'relative',
  },
  filterTabActive: {},
  filterTabText: { fontSize: 14, fontWeight: '500', color: '#9ca3af' },
  filterTabTextActive: { color: '#fa5610', fontWeight: '700' },
  filterTabUnderline: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    height: 2.5, backgroundColor: '#fa5610', borderRadius: 2,
  },

  // Thread row
  threadRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 12, paddingVertical: 12, borderRadius: 14,
    marginBottom: 2,
  },
  threadRowUnread: { backgroundColor: 'rgba(124,58,237,0.04)' },
  typeIcon: {
    width: 26, height: 26, borderRadius: 13,
    alignItems: 'center', justifyContent: 'center',
    position: 'absolute', bottom: -4, right: -4, zIndex: 2,
    borderWidth: 1.5, borderColor: '#ffffff',
  },
  typeIconGig: { backgroundColor: 'rgba(124,58,237,0.12)' },
  typeIconChat: { borderWidth: 1.5, borderColor: '#ffffff' },
  threadAvatarWrap: { position: 'relative', width: 52, height: 52 },
  threadAvatar: { width: 52, height: 52, borderRadius: 16 },
  threadAvatarFallback: { alignItems: 'center', justifyContent: 'center' },
  threadAvatarInitial: { fontSize: 20, fontWeight: '700', color: '#111827' },
  unreadDot: {
    position: 'absolute', top: -2, right: -2,
    width: 12, height: 12, borderRadius: 6,
    backgroundColor: '#fa5610', borderWidth: 2, borderColor: '#ffffff',
  },
  threadContent: { flex: 1, minWidth: 0 },
  threadTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 3 },
  threadNameRow: { flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1, minWidth: 0 },
  threadName: { fontSize: 15, fontWeight: '500', color: '#111827', flexShrink: 1 },
  threadNameUnread: { fontWeight: '700' },
  gigBadge: { paddingHorizontal: 6, paddingVertical: 2, backgroundColor: '#fa5610', borderRadius: 6 },
  gigBadgeText: { color: '#ffffff', fontSize: 9, fontWeight: '700', textTransform: 'uppercase' },
  threadTime: { fontSize: 11, color: '#9ca3af', flexShrink: 0 },
  threadBottomRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  threadPreview: { fontSize: 13, color: '#9ca3af', flex: 1 },
  threadPreviewUnread: { color: '#111827', fontWeight: '500' },
  unreadBadge: {
    minWidth: 20, height: 20, paddingHorizontal: 5, borderRadius: 10,
    backgroundColor: '#fa5610', alignItems: 'center', justifyContent: 'center', marginLeft: 6,
  },
  unreadBadgeText: { color: '#ffffff', fontSize: 11, fontWeight: '700' },

  // Skeleton
  skeletonRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 8 },
  skeletonAvatar: { width: 52, height: 52, borderRadius: 16, backgroundColor: '#f3f4f6' },
  skeletonLine: { height: 14, borderRadius: 7, backgroundColor: '#f3f4f6' },

  // Empty state
  emptyState: { alignItems: 'center', paddingTop: 80, paddingHorizontal: 32 },
  emptyChatState: { alignItems: 'center', paddingTop: 60, paddingHorizontal: 32 },
  emptyIconBox: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: 'rgba(124,58,237,0.1)',
    alignItems: 'center', justifyContent: 'center', marginBottom: 16,
  },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: '#111827', marginBottom: 6 },
  emptySubtitle: { fontSize: 14, color: '#9ca3af', textAlign: 'center', lineHeight: 22 },

  // Chat header
  chatHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 12, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: '#e5e7eb',
  },
  chatBackBtn: {
    width: 40, height: 40, borderRadius: 20,
    alignItems: 'center', justifyContent: 'center',
  },
  chatHeaderInfo: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10, minWidth: 0 },
  chatAvatarWrap: { position: 'relative' },
  chatAvatar: { width: 40, height: 40, borderRadius: 12 },
  chatAvatarFallback: { alignItems: 'center', justifyContent: 'center' },
  chatAvatarInitial: { fontSize: 16, fontWeight: '700', color: '#111827' },
  onlineDot: {
    position: 'absolute', bottom: -1, right: -1,
    width: 12, height: 12, borderRadius: 6, borderWidth: 2, borderColor: '#ffffff',
  },
  chatHeaderName: { fontSize: 15, fontWeight: '600', color: '#111827' },
  chatHeaderStatus: { fontSize: 11, color: '#9ca3af', marginTop: 1 },
  sendQuoteBtn: {
    paddingHorizontal: 12, paddingVertical: 8,
    borderRadius: 10, borderWidth: 1, borderColor: '#e5e7eb',
  },
  sendQuoteBtnText: { fontSize: 12, fontWeight: '600', color: '#111827' },
  moreBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },

  // Messages
  messagesContent: { padding: 16, paddingBottom: 8 },
  messageGroupRow: { flexDirection: 'row', alignItems: 'flex-end', marginBottom: 4 },
  incomingAvatarCol: { width: 32, marginRight: 8 },
  incomingAvatar: { width: 28, height: 28, borderRadius: 8 },
  bubblesCol: { maxWidth: SCREEN_WIDTH * 0.72, flexShrink: 1 },
  bubble: {
    paddingHorizontal: 14, paddingVertical: 10,
    borderRadius: 18, marginBottom: 2,
    maxWidth: '100%',
  },
  bubbleOut: { backgroundColor: '#fa5610' },
  bubbleIn: {},
  bubbleOutTail: { borderBottomRightRadius: 6 },
  bubbleInTail: { borderBottomLeftRadius: 6 },
  bubbleText: { fontSize: 15, lineHeight: 22 },
  bubbleTextOut: { color: '#ffffff' },
  bubbleTextIn: { color: '#111827' },
  attachmentImage: { width: 200, height: 150, borderRadius: 12, marginBottom: 4 },
  fileAttachment: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  fileAttachmentText: { fontSize: 14 },

  // Timestamp
  timestampRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 4, marginBottom: 4 },
  timestampText: { fontSize: 11, color: '#9ca3af' },

  // Date separator
  dateSep: { alignItems: 'center', marginVertical: 16 },
  dateSepText: {
    fontSize: 11, color: '#9ca3af',
    paddingHorizontal: 12, paddingVertical: 4, borderRadius: 20,
  },

  // Typing dots
  typingDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#9ca3af' },

  // Composer
  composer: {
    flexDirection: 'row', alignItems: 'flex-end', gap: 8,
    paddingHorizontal: 12, paddingTop: 10,
    borderTopWidth: 1, borderTopColor: '#e5e7eb',
    backgroundColor: '#ffffff',
  },
  composerAttachBtn: {
    width: 44, height: 44, borderRadius: 22,
    alignItems: 'center', justifyContent: 'center',
  },
  composerInput: {
    flex: 1, minHeight: 44, maxHeight: 120,
    paddingHorizontal: 16, paddingVertical: 10,
    borderRadius: 24, borderWidth: 1, borderColor: '#e5e7eb',
    fontSize: 15,
    textAlignVertical: 'center',
  },
  composerSendBtn: {
    width: 44, height: 44, borderRadius: 22,
    alignItems: 'center', justifyContent: 'center',
  },
  composerSendBtnActive: { backgroundColor: '#fa5610' },
  composerSendBtnInactive: {},

  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '85%',
    backgroundColor: '#1A1A1A',
    borderRadius: 20,
    padding: 24,
    position: 'relative',
  },
  modalCloseBtn: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 20,
    marginTop: 4,
  },
  modalSection: {
    marginBottom: 16,
  },
  modalLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 8,
  },
  modalInput: {
    backgroundColor: '#2A2A2A',
    borderWidth: 2,
    borderColor: '#d97706',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 14,
    color: '#ffffff',
    minHeight: 48,
  },
  modalButtonRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 24,
  },
  modalCancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#4b5563',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCancelText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
  modalAddBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: '#d97706',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  modalAddText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
});
