import { View, Text, ScrollView, Pressable, Image, RefreshControl, ActivityIndicator, TextInput, FlatList } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Search, MessageCircle, X, Clock } from 'lucide-react-native';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { useState, useCallback, useEffect } from 'react';
import { router } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/lib/state/auth-store';
import { useTheme } from '@/lib/theme/ThemeContext';

type TabType = 'all' | 'gigs' | 'chats' | 'unread';

interface ConversationThread {
  id: string;
  bookingId?: string; // For chat threads, this is the booking_id to navigate with
  type: 'inquiry' | 'booking';
  otherUserId: string;
  otherUserName: string;
  otherUserAvatar: string;
  lastMessage: string;
  lastMessageTime: string;
  lastMessageSenderName: string;
  unreadCount: number;
  bookingTitle?: string;
}

const PLACEHOLDER_AVATAR = 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&h=200&fit=crop';

// Tab filter component
function TabBar({ activeTab, onTabChange, isDark }: { activeTab: TabType; onTabChange: (tab: TabType) => void; isDark: boolean }) {
  const tabs: { id: TabType; label: string }[] = [
    { id: 'all', label: 'All' },
    { id: 'gigs', label: 'Gigs' },
    { id: 'chats', label: 'Chats' },
    { id: 'unread', label: 'Unread' },
  ];

  return (
    <View
      className="flex-row px-5 py-3 border-b"
      style={{ borderBottomColor: isDark ? 'rgba(255,255,255,0.1)' : '#E5E7EB' }}
    >
      {tabs.map((tab) => (
        <Pressable
          key={tab.id}
          onPress={() => onTabChange(tab.id)}
          className="mr-4 pb-2"
          style={{
            borderBottomWidth: activeTab === tab.id ? 2 : 0,
            borderBottomColor: activeTab === tab.id ? '#F97316' : 'transparent',
          }}
        >
          <Text
            className="text-sm font-medium"
            style={{ color: activeTab === tab.id ? '#F97316' : isDark ? '#9CA3AF' : '#6B7280' }}
          >
            {tab.label}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

// Conversation row component
function ConversationRow({
  conversation,
  index,
  onPress,
  isDark,
}: {
  conversation: ConversationThread;
  index: number;
  onPress: (conversation: ConversationThread) => void;
  isDark: boolean;
}) {
  const typeIcon = conversation.type === 'booking' ? '💼' : '💬';

  return (
    <Animated.View entering={FadeInUp.delay(index * 50).duration(400)}>
      <Pressable
        onPress={() => onPress(conversation)}
        className="flex-row items-center px-5 py-3.5 border-b"
        style={{ borderBottomColor: isDark ? 'rgba(255,255,255,0.1)' : '#F3F4F6' }}
      >
        {/* Avatar with type badge */}
        <View className="relative">
          <Image
            source={{ uri: conversation.otherUserAvatar || PLACEHOLDER_AVATAR }}
            style={{ width: 48, height: 48, borderRadius: 24 }}
          />
          <View
            className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full items-center justify-center"
            style={{ backgroundColor: isDark ? '#1A1A1A' : '#FFFFFF', borderWidth: 1, borderColor: isDark ? 'rgba(255,255,255,0.2)' : '#E5E7EB' }}
          >
            <Text className="text-xs">{typeIcon}</Text>
          </View>
        </View>

        {/* Content */}
        <View className="flex-1 ml-3">
          <View className="flex-row items-center justify-between mb-0.5">
            <Text
              className="font-semibold text-sm flex-1"
              style={{ color: isDark ? '#FFFFFF' : '#111827' }}
              numberOfLines={1}
            >
              {conversation.otherUserName}
            </Text>
            <Text
              className="text-xs ml-2"
              style={{ color: isDark ? '#6B7280' : '#9CA3AF' }}
            >
              {formatTime(conversation.lastMessageTime)}
            </Text>
          </View>
          {conversation.bookingTitle ? (
            <Text
              className="text-xs mb-1"
              style={{ color: isDark ? '#9CA3AF' : '#6B7280' }}
            >
              {conversation.bookingTitle}
            </Text>
          ) : null}
          <Text
            className="text-xs"
            style={{ color: isDark ? '#9CA3AF' : '#6B7280' }}
            numberOfLines={1}
          >
            <Text className="font-semibold">{conversation.lastMessageSenderName}:</Text> {conversation.lastMessage}
          </Text>
        </View>

        {/* Unread badge */}
        {conversation.unreadCount > 0 ? (
          <View
            className="ml-3 w-5 h-5 rounded-full items-center justify-center"
            style={{ backgroundColor: '#F97316' }}
          >
            <Text className="text-white text-xs font-bold">
              {conversation.unreadCount > 99 ? '99+' : conversation.unreadCount}
            </Text>
          </View>
        ) : null}
      </Pressable>
    </Animated.View>
  );
}

// Empty state component
function EmptyState({ tab, isDark }: { tab: TabType; isDark: boolean }) {
  const messages: Record<TabType, { title: string; desc: string }> = {
    all: { title: 'No messages yet', desc: 'Start a conversation by booking talent' },
    gigs: { title: 'No bookings yet', desc: 'Your booking conversations will appear here' },
    chats: { title: 'No inquiries', desc: 'Talent inquiries will appear here' },
    unread: { title: 'All caught up!', desc: 'No unread messages' },
  };

  const msg = messages[tab];

  return (
    <View className="flex-1 items-center justify-center px-8 py-16">
      <View
        className="w-20 h-20 rounded-full items-center justify-center mb-6"
        style={{ backgroundColor: 'rgba(249, 115, 22, 0.1)' }}
      >
        <MessageCircle size={36} color="#F97316" />
      </View>
      <Text
        className="text-lg font-semibold mb-2"
        style={{ color: isDark ? '#FFFFFF' : '#111827' }}
      >
        {msg.title}
      </Text>
      <Text
        className="text-center"
        style={{ color: isDark ? '#9CA3AF' : '#6B7280' }}
      >
        {msg.desc}
      </Text>
    </View>
  );
}

function formatTime(timestamp: string): string {
  try {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Now';
    if (diffMins < 60) return `${diffMins}m`;
    if (diffHours < 24) return `${diffHours}h`;
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays}d`;

    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  } catch {
    return 'Recently';
  }
}

export default function ClientMessagesScreen() {
  const insets = useSafeAreaInsets();
  const userId = useAuthStore((s) => s.user?.id);
  const { isDark } = useTheme();

  const [tab, setTab] = useState<TabType>('all');
  const [searchText, setSearchText] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [conversations, setConversations] = useState<ConversationThread[]>([]);

  const fetchConversations = useCallback(async () => {
    try {



      if (!userId) {

        setLoading(false);
        return;
      }

      setLoading(true);


      const threadsList: ConversationThread[] = [];
      const seenThreadIds = new Set<string>(); // Track seen threads to prevent duplicates

      // STEP 1: Fetch inquiry threads (where user is client)
      const { data: inquiryThreads } = await supabase
        .from('inquiry_threads')
        .select('*')
        .eq('client_user_id', userId)
        .order('updated_at', { ascending: false });



      // STEP 2: Fetch client's bookings to find chat threads
      const { data: bookings } = await supabase
        .from('bookings')
        .select('id')
        .eq('client_id', userId);



      const bookingIds = bookings?.map((b) => b.id) || [];
      let chatThreads: any[] = [];

      if (bookingIds.length > 0) {
        const { data: threads } = await supabase
          .from('chat_threads')
          .select('*')
          .in('booking_id', bookingIds);
        chatThreads = threads || [];

      }

      // STEP 3: Process inquiry threads
      if (inquiryThreads && inquiryThreads.length > 0) {
        const talentIds = inquiryThreads.map((t) => t.talent_id).filter(Boolean);

        // Get talent profiles to find user_ids
        const { data: talentProfiles } = await supabase
          .from('talent_profiles')
          .select('id, user_id')
          .in('id', talentIds);

        const talentUserIds = talentProfiles?.map((t) => t.user_id) || [];

        // Get user profiles
        const { data: userProfiles } = await supabase
          .from('profiles')
          .select('id, full_name, avatar_url')
          .in('id', talentUserIds);

        const profilesMap = new Map(userProfiles?.map((p) => [p.id, p]) || []);
        const talentProfileMap = new Map(talentProfiles?.map((t) => [t.id, t]) || []);

        // Fetch ALL inquiry messages at once (sorted by created_at)
        const threadIds = inquiryThreads.map((t) => t.id);
        const { data: allInquiryMessages } = await supabase
          .from('inquiry_messages')
          .select('id, thread_id, message_text, created_at, sender_user_id, read_at')
          .in('thread_id', threadIds)
          .order('created_at', { ascending: true });

        // Group messages by thread and find last message + unread count
        const messagesByThread = new Map<string, any[]>();
        allInquiryMessages?.forEach((msg) => {
          if (!messagesByThread.has(msg.thread_id)) {
            messagesByThread.set(msg.thread_id, []);
          }
          messagesByThread.get(msg.thread_id)!.push(msg);
        });

        // Fetch all sender profiles at once
        const senderIds = [...new Set(allInquiryMessages?.map((m) => m.sender_user_id) || [])];
        const { data: senderProfiles } = await supabase
          .from('profiles')
          .select('id, full_name')
          .in('id', senderIds);

        const senderProfilesMap = new Map(senderProfiles?.map((p) => [p.id, p]) || []);

        // STEP 5: For each inquiry thread, build conversation data
        for (const thread of inquiryThreads) {
          const messages = messagesByThread.get(thread.id) || [];
          if (messages.length === 0) {

            continue;
          }

          // Skip if already seen
          if (seenThreadIds.has(thread.id)) {

            continue;
          }

          // Get last message (messages are in chronological order)
          const lastMsg = messages[messages.length - 1];
          const unreadCount = messages.filter((m) => m.sender_user_id !== userId && !m.read_at).length;

          const talentProfile = talentProfileMap.get(thread.talent_id);
          const profile = talentProfile ? profilesMap.get(talentProfile.user_id) : null;

          // Use fallback name if profile not found
          const otherUserName = profile?.full_name || 'Talent';

          const senderProfile = senderProfilesMap.get(lastMsg.sender_user_id);

          seenThreadIds.add(thread.id);
          threadsList.push({
            id: thread.id,
            type: 'inquiry',
            otherUserId: talentProfile?.user_id || '',
            otherUserName: otherUserName,
            otherUserAvatar: profile?.avatar_url || PLACEHOLDER_AVATAR,
            lastMessage: lastMsg.message_text || '[Message]',
            lastMessageTime: lastMsg.created_at || thread.updated_at,
            lastMessageSenderName: lastMsg.sender_user_id === userId ? 'You' : (senderProfile?.full_name || otherUserName),
            unreadCount: unreadCount || 0,
          });
        }
      }

      // STEP 4: Process chat threads
      if (chatThreads.length > 0) {
        const bookingIds = chatThreads.map((t) => t.booking_id).filter(Boolean);

        // Get booking_talents to find talent IDs
        const { data: bookingTalents } = await supabase
          .from('booking_talents')
          .select('booking_id, talent_id')
          .in('booking_id', bookingIds);

        const talentIds = bookingTalents?.map((bt) => bt.talent_id).filter(Boolean) || [];

        // Get talent profiles to find user_ids
        const { data: talentProfiles } = await supabase
          .from('talent_profiles')
          .select('id, user_id')
          .in('id', talentIds);

        const talentUserIds = talentProfiles?.map((t) => t.user_id) || [];

        // Get user profiles
        const { data: chatUserProfiles } = await supabase
          .from('profiles')
          .select('id, full_name, avatar_url')
          .in('id', talentUserIds);

        // Get booking details for titles
        const { data: bookingDetails } = await supabase
          .from('bookings')
          .select('id, title, name')
          .in('id', bookingIds);

        const chatProfilesMap = new Map(chatUserProfiles?.map((p) => [p.id, p]) || []);
        const chatTalentProfileMap = new Map(talentProfiles?.map((t) => [t.id, t]) || []);
        const bookingTalentMap = new Map(bookingTalents?.map((bt) => [bt.booking_id, bt]) || []);
        const bookingsMap = new Map(bookingDetails?.map((b) => [b.id, b]) || []);

        // Fetch ALL chat messages at once (sorted by created_at)
        const threadIds = chatThreads.map((t) => t.id);
        const { data: allChatMessages } = await supabase
          .from('chat_messages')
          .select('id, thread_id, message_text, created_at, sender_user_id, read_at')
          .in('thread_id', threadIds)
          .order('created_at', { ascending: true });

        // Group messages by thread
        const chatMessagesByThread = new Map<string, any[]>();
        allChatMessages?.forEach((msg) => {
          if (!chatMessagesByThread.has(msg.thread_id)) {
            chatMessagesByThread.set(msg.thread_id, []);
          }
          chatMessagesByThread.get(msg.thread_id)!.push(msg);
        });

        // Fetch all sender profiles at once
        const chatSenderIds = [...new Set(allChatMessages?.map((m) => m.sender_user_id) || [])];
        const { data: chatSenderProfiles } = await supabase
          .from('profiles')
          .select('id, full_name')
          .in('id', chatSenderIds);

        const chatSenderProfilesMap = new Map(chatSenderProfiles?.map((p) => [p.id, p]) || []);

        // For each chat thread, build conversation data
        for (const thread of chatThreads) {
          const messages = chatMessagesByThread.get(thread.id) || [];
          if (messages.length === 0) {

            continue;
          }

          // Skip if already seen
          if (seenThreadIds.has(thread.id)) {

            continue;
          }

          // Get last message (messages are in chronological order)
          const lastMsg = messages[messages.length - 1];
          const unreadCount = messages.filter((m) => m.sender_user_id !== userId && !m.read_at).length;

          const bookingTalent = bookingTalentMap.get(thread.booking_id);
          const talentProfile = bookingTalent ? chatTalentProfileMap.get(bookingTalent.talent_id) : null;
          const userProfile = talentProfile ? chatProfilesMap.get(talentProfile.user_id) : null;
          const booking = bookingsMap.get(thread.booking_id);

          // Skip if profile couldn't be resolved
          if (!userProfile || !userProfile.full_name) {

            continue;
          }

          const senderProfile = chatSenderProfilesMap.get(lastMsg.sender_user_id);

          seenThreadIds.add(thread.id);
          threadsList.push({
            id: thread.id,
            bookingId: thread.booking_id, // Store booking_id for navigation
            type: 'booking',
            otherUserId: talentProfile?.user_id || '',
            otherUserName: userProfile?.full_name || 'Unknown',
            otherUserAvatar: userProfile?.avatar_url || PLACEHOLDER_AVATAR,
            lastMessage: lastMsg.message_text || '[Message]',
            lastMessageTime: lastMsg.created_at || thread.created_at,
            lastMessageSenderName: lastMsg.sender_user_id === userId ? 'You' : (senderProfile?.full_name || 'Unknown'),
            unreadCount: unreadCount || 0,
            bookingTitle: booking?.title || booking?.name,
          });
        }
      }

      // STEP 6: Filter out empty threads and sort by most recent
      const activeThreads = threadsList.filter((t) => t.lastMessage != null);
      activeThreads.sort(
        (a, b) =>
          new Date(b.lastMessageTime).getTime() -
          new Date(a.lastMessageTime).getTime()
      );


      setConversations(activeThreads);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : typeof error === 'string' ? error : 'Error fetching conversations';
      // Error already captured in state via setError
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchConversations();

    // Set up real-time subscriptions for new messages
    let debounceTimer: ReturnType<typeof setTimeout> | null = null;
    const debouncedFetch = () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => fetchConversations(), 400);
    };

    const channel = supabase
      .channel('client-messages-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'inquiry_messages' }, debouncedFetch)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'chat_messages' }, debouncedFetch)
      .subscribe();

    return () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      supabase.removeChannel(channel);
    };
  }, [fetchConversations]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchConversations().finally(() => setRefreshing(false));
  }, [fetchConversations]);

  // Filter conversations
  let filtered = conversations;

  if (tab === 'gigs') {
    filtered = conversations.filter((c) => c.type === 'booking');
  } else if (tab === 'chats') {
    filtered = conversations.filter((c) => c.type === 'inquiry');
  } else if (tab === 'unread') {
    filtered = conversations.filter((c) => c.unreadCount > 0);
  }

  if (searchText.trim()) {
    const search = searchText.toLowerCase();
    filtered = filtered.filter(
      (c) =>
        c.otherUserName.toLowerCase().includes(search) ||
        c.lastMessage.toLowerCase().includes(search)
    );
  }

  const handleConversationPress = (conversation: ConversationThread) => {
    if (conversation.type === 'inquiry') {
      router.push({
        pathname: '/(client)/messages/[id]',
        params: { id: conversation.id },
      } as never);
    } else {
      // For chat threads, navigate to /client/chat/:bookingId
      router.push({
        pathname: '/(client)/chat/[id]',
        params: { id: conversation.bookingId || conversation.id },
      } as never);
    }
  };

  return (
    <View className="flex-1" style={{ backgroundColor: isDark ? '#0A0A0A' : '#F8F8F8' }}>
      <View style={{ paddingTop: insets.top, backgroundColor: isDark ? '#0A0A0A' : '#FFFFFF' }} />

      {/* Header */}
      <Animated.View
        entering={FadeInDown.delay(100).duration(500)}
        className="px-5 py-4"
        style={{ backgroundColor: isDark ? '#0A0A0A' : '#FFFFFF' }}
      >
        <Text
          className="text-2xl font-bold mb-4"
          style={{ color: isDark ? '#FFFFFF' : '#111827' }}
        >
          Messages
        </Text>

        {/* Search Bar */}
        <View
          className="flex-row items-center px-3 py-2.5 rounded-lg"
          style={{
            backgroundColor: isDark ? '#1A1A1A' : '#F9FAFB',
            borderWidth: 1,
            borderColor: isDark ? 'rgba(255,255,255,0.1)' : '#E5E7EB',
          }}
        >
          <Search size={18} color={isDark ? '#6B7280' : '#9CA3AF'} />
          <TextInput
            value={searchText}
            onChangeText={setSearchText}
            placeholder="Search conversations..."
            placeholderTextColor={isDark ? '#6B7280' : '#9CA3AF'}
            className="flex-1 ml-2 text-sm"
            style={{ color: isDark ? '#FFFFFF' : '#111827' }}
          />
          {searchText ? (
            <Pressable onPress={() => setSearchText('')}>
              <X size={16} color={isDark ? '#6B7280' : '#9CA3AF'} />
            </Pressable>
          ) : null}
        </View>
      </Animated.View>

      {/* Tabs */}
      <TabBar activeTab={tab} onTabChange={setTab} isDark={isDark} />

      {/* Content */}
      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#F97316" />
        </View>
      ) : filtered.length > 0 ? (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          renderItem={({ item, index }) => (
            <ConversationRow
              conversation={item}
              index={index}
              onPress={handleConversationPress}
              isDark={isDark}
            />
          )}
          scrollEnabled
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#F97316"
            />
          }
        />
      ) : (
        <EmptyState tab={tab} isDark={isDark} />
      )}
    </View>
  );
}
