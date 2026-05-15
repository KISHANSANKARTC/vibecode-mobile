import {
  View,
  Text,
  ScrollView,
  TextInput,
  RefreshControl,
  Pressable,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Search, MessageCircle } from 'lucide-react-native';
import Animated, { FadeInDown, FadeIn } from 'react-native-reanimated';
import { useState, useCallback, useMemo, useEffect } from 'react';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { supabase } from '@/lib/supabase';
import { extractErrorMessage } from '@/lib/errorUtils';
import { cn } from '@/lib/cn';

import { ConversationCard } from '@/components/ConversationCard';

// Default placeholder avatar
const PLACEHOLDER_AVATAR =
  'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&h=200&fit=crop';

// Conversation type
interface Conversation {
  id: string;
  threadId: string;
  threadType: 'inquiry' | 'chat';
  name: string;
  avatar: string;
  lastMessage: string;
  timestamp: string;
  lastMessageDate: string;
  unreadCount: number;
  bookingContext?: string;
  type: 'gig' | 'chat';
}

// Tab filter type
type TabFilter = 'all' | 'gigs' | 'chats' | 'unread';

const TABS: { key: TabFilter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'gigs', label: 'Gigs' },
  { key: 'chats', label: 'Chats' },
  { key: 'unread', label: 'Unread' },
];

// Helper to format timestamp
function formatTimestamp(dateString: string): string {
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return '';

    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  } catch (error) {
    return '';
  }
}

function EmptyState() {
  return (
    <View className="flex-1 items-center justify-center px-8">
      <View
        className="w-20 h-20 rounded-full items-center justify-center mb-6"
        style={{ backgroundColor: 'rgba(249, 115, 22, 0.15)' }}
      >
        <MessageCircle size={36} color="#F97316" strokeWidth={1.5} />
      </View>
      <Text className="text-white text-xl font-semibold mb-2 text-center">
        No messages yet
      </Text>
      <Text className="text-neutral-400 text-center text-base leading-6">
        Start a conversation when you get booked for a project
      </Text>
    </View>
  );
}

function SearchEmptyState({ query }: { query: string }) {
  return (
    <View className="flex-1 items-center justify-center px-8">
      <View
        className="w-16 h-16 rounded-full items-center justify-center mb-4"
        style={{ backgroundColor: 'rgba(255, 255, 255, 0.05)' }}
      >
        <Search size={28} color="#6B7280" strokeWidth={1.5} />
      </View>
      <Text className="text-white text-lg font-medium mb-1 text-center">
        No results found
      </Text>
      <Text className="text-neutral-500 text-center text-sm">
        No conversations match "{query}"
      </Text>
    </View>
  );
}

function FilterEmptyState({ filter }: { filter: TabFilter }) {
  const labels: Record<TabFilter, string> = {
    all: 'all',
    gigs: 'gig',
    chats: 'chat',
    unread: 'unread',
  };

  return (
    <View className="flex-1 items-center justify-center px-8">
      <View
        className="w-16 h-16 rounded-full items-center justify-center mb-4"
        style={{ backgroundColor: 'rgba(255, 255, 255, 0.05)' }}
      >
        <MessageCircle size={28} color="#6B7280" strokeWidth={1.5} />
      </View>
      <Text className="text-white text-lg font-medium mb-1 text-center">
        No {labels[filter]} messages
      </Text>
      <Text className="text-neutral-500 text-center text-sm">
        Your {labels[filter]} conversations will appear here
      </Text>
    </View>
  );
}

export default function TalentMessagesScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<TabFilter>('all');
  const [conversations, setConversations] = useState<Conversation[]>([]);

  // Fetch conversations from Supabase
  const fetchConversations = useCallback(async () => {
    try {
      setLoading(true);

      // Get current user
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        console.log('[TalentMessages] No user logged in');
        setConversations([]);
        setLoading(false);
        return;
      }

      console.log('[TalentMessages] Current user ID:', user.id);
      const allConversations: Conversation[] = [];

      // 1. Fetch inquiry threads (pre-booking conversations where this user is the talent)
      const { data: inquiryThreads, error: inquiryError } = await supabase
        .from('inquiry_threads')
        .select('id, client_user_id, talent_id, updated_at')
        .eq('talent_id', user.id);

      if (inquiryError) {
        console.error('[TalentMessages] Error fetching inquiry threads:', inquiryError);
      } else {
        console.log('[TalentMessages] Found inquiry threads:', inquiryThreads?.length);

        if (inquiryThreads && inquiryThreads.length > 0) {
          const threadIds = inquiryThreads.map((t) => t.id);
          const clientIds = inquiryThreads.map((t) => t.client_user_id).filter(Boolean) as string[];

          // Get last message for each inquiry thread
          const { data: lastMessages } = await supabase
            .from('inquiry_messages')
            .select('id, thread_id, content, created_at, sender_id')
            .in('thread_id', threadIds)
            .order('created_at', { ascending: false });

          // Get unread counts for inquiry threads
          const { data: unreadMessages } = await supabase
            .from('inquiry_messages')
            .select('id, thread_id')
            .in('thread_id', threadIds)
            .is('read_at', null)
            .neq('sender_id', user.id);

          // Get client profiles
          const { data: profiles } = await supabase
            .from('profiles')
            .select('id, full_name, avatar_url')
            .in('id', clientIds);

          // Create maps
          const lastMessageMap = new Map(
            lastMessages
              ?.filter((m) => m.content) // Only include messages with content
              .map((m) => [m.thread_id, m]) || []
          );

          const unreadMap = new Map<string, number>();
          unreadMessages?.forEach((m) => {
            unreadMap.set(m.thread_id, (unreadMap.get(m.thread_id) || 0) + 1);
          });

          const profilesMap = new Map(
            profiles?.map((p) => [p.id, p]) || []
          );

          // Process each inquiry thread
          inquiryThreads.forEach((thread) => {
            const lastMsg = lastMessageMap.get(thread.id);

            // Only add if there's at least one message
            if (lastMsg && lastMsg.content) {
              const profile = profilesMap.get(thread.client_user_id);

              allConversations.push({
                id: `inquiry-${thread.id}`,
                threadId: thread.id,
                threadType: 'inquiry',
                name: profile?.full_name || 'Unknown',
                avatar: profile?.avatar_url || PLACEHOLDER_AVATAR,
                lastMessage: lastMsg.content,
                timestamp: formatTimestamp(lastMsg.created_at),
                lastMessageDate: lastMsg.created_at,
                unreadCount: unreadMap.get(thread.id) || 0,
                bookingContext: undefined,
                type: 'chat',
              });
            }
          });
        }
      }

      // 2. Fetch chat threads (booking-linked conversations)
      // First, get talent's booking assignments
      const { data: bookingTalentAssignments, error: assignmentsError } = await supabase
        .from('booking_talents')
        .select('booking_id, talent_id')
        .eq('talent_id', user.id);

      if (assignmentsError) {
        console.error('[TalentMessages] Error fetching booking assignments:', assignmentsError);
      } else {
        console.log('[TalentMessages] Found booking assignments:', bookingTalentAssignments?.length);

        if (bookingTalentAssignments && bookingTalentAssignments.length > 0) {
          const bookingIds = bookingTalentAssignments.map((bt) => bt.booking_id);

          // Get chat threads for these bookings
          const { data: chatThreads, error: chatError } = await supabase
            .from('chat_threads')
            .select('id, booking_id, updated_at')
            .in('booking_id', bookingIds);

          if (chatError) {
            console.error('[TalentMessages] Error fetching chat threads:', chatError);
          } else if (chatThreads && chatThreads.length > 0) {
            console.log('[TalentMessages] Found chat threads:', chatThreads.length);

            const chatThreadIds = chatThreads.map((t) => t.id);

            // Get last message for each chat thread
            const { data: lastChatMessages } = await supabase
              .from('chat_messages')
              .select('id, thread_id, content, created_at, sender_id')
              .in('thread_id', chatThreadIds)
              .order('created_at', { ascending: false });

            // Get unread counts for chat threads
            const { data: unreadChatMessages } = await supabase
              .from('chat_messages')
              .select('id, thread_id')
              .in('thread_id', chatThreadIds)
              .is('read_at', null)
              .neq('sender_id', user.id);

            // Get client IDs from bookings
            const { data: bookings } = await supabase
              .from('bookings')
              .select('id, client_id')
              .in('id', bookingIds);

            const clientIds = Array.from(
              new Set(bookings?.map((b) => b.client_id) || [])
            ) as string[];

            // Get client profiles
            const { data: clientProfiles } = await supabase
              .from('profiles')
              .select('id, full_name, avatar_url')
              .in('id', clientIds);

            // Create maps
            const lastChatMessageMap = new Map(
              lastChatMessages
                ?.filter((m) => m.content) // Only include messages with content
                .map((m) => [m.thread_id, m]) || []
            );

            const unreadChatMap = new Map<string, number>();
            unreadChatMessages?.forEach((m) => {
              unreadChatMap.set(m.thread_id, (unreadChatMap.get(m.thread_id) || 0) + 1);
            });

            const bookingMap = new Map(
              bookings?.map((b) => [b.id, b]) || []
            );

            const profilesMap = new Map(
              clientProfiles?.map((p) => [p.id, p]) || []
            );

            // Process each chat thread
            chatThreads.forEach((thread) => {
              const lastMsg = lastChatMessageMap.get(thread.id);

              // Only add if there's at least one message
              if (lastMsg && lastMsg.content) {
                const booking = bookingMap.get(thread.booking_id);
                const profile = booking ? profilesMap.get(booking.client_id) : null;

                allConversations.push({
                  id: `chat-${thread.id}`,
                  threadId: thread.id,
                  threadType: 'chat',
                  name: profile?.full_name || 'Unknown',
                  avatar: profile?.avatar_url || PLACEHOLDER_AVATAR,
                  lastMessage: lastMsg.content,
                  timestamp: formatTimestamp(lastMsg.created_at),
                  lastMessageDate: lastMsg.created_at,
                  unreadCount: unreadChatMap.get(thread.id) || 0,
                  bookingContext: `Booking #${thread.booking_id}`,
                  type: 'gig',
                });
              }
            });
          }
        }
      }

      // Sort by most recent activity
      allConversations.sort((a, b) => {
        const dateA = new Date(a.lastMessageDate || 0).getTime();
        const dateB = new Date(b.lastMessageDate || 0).getTime();
        return dateB - dateA;
      });

      console.log('[TalentMessages] Final conversations:', allConversations.length);
      setConversations(allConversations);
    } catch (error) {
      console.error('[TalentMessages] Error fetching conversations:', extractErrorMessage(error));
      setConversations([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchConversations().finally(() => setRefreshing(false));
  }, [fetchConversations]);

  // Count gigs for the tab label
  const gigCount = useMemo(
    () => conversations.filter((c) => c.type === 'gig').length,
    [conversations]
  );

  // Filter by tab
  const tabFilteredConversations = useMemo(() => {
    switch (activeTab) {
      case 'gigs':
        return conversations.filter((c) => c.type === 'gig');
      case 'chats':
        return conversations.filter((c) => c.type === 'chat');
      case 'unread':
        return conversations.filter((c) => c.unreadCount > 0);
      default:
        return conversations;
    }
  }, [activeTab, conversations]);

  // Filter by search
  const filteredConversations = useMemo(() => {
    if (!searchQuery.trim()) return tabFilteredConversations;
    const query = searchQuery.toLowerCase();
    return tabFilteredConversations.filter(
      (conv: Conversation) =>
        conv.name.toLowerCase().includes(query) ||
        conv.lastMessage.toLowerCase().includes(query) ||
        conv.bookingContext?.toLowerCase().includes(query)
    );
  }, [searchQuery, tabFilteredConversations]);

  const handleConversationPress = (conversation: Conversation) => {
    // Placeholder - chat screen not created yet
    console.log('[TalentMessages] Open conversation:', conversation.threadId, conversation.threadType);
  };

  const hasConversations = conversations.length > 0;
  const hasFilteredResults = filteredConversations.length > 0;

  // Build tab label with count
  function getTabLabel(tab: { key: TabFilter; label: string }): string {
    if (tab.key === 'gigs' && gigCount > 0) {
      return `${tab.label} (${gigCount})`;
    }
    return tab.label;
  }

  return (
    <View className="flex-1 bg-[#0A0A0A]">
      <LinearGradient
        colors={['#1A1A1A', '#0F0F0F', '#0A0A0A']}
        style={{ flex: 1, paddingTop: insets.top }}
      >
        {/* Header */}
        <Animated.View
          entering={FadeInDown.delay(50).duration(400)}
          className="px-5 pt-4 pb-2"
        >
          <Text className="text-white text-[28px] font-bold">Messages</Text>
        </Animated.View>

        {/* Search Bar */}
        <Animated.View
          entering={FadeInDown.delay(100).duration(400)}
          className="px-5 pt-3 pb-2"
        >
          <View
            className="flex-row items-center px-4 rounded-xl"
            style={{
              backgroundColor: 'rgba(255, 255, 255, 0.06)',
              borderWidth: 1,
              borderColor: 'rgba(255, 255, 255, 0.08)',
              height: 44,
            }}
          >
            <Search size={18} color="#6B7280" strokeWidth={1.5} />
            <TextInput
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Search messages..."
              placeholderTextColor="#6B7280"
              className="flex-1 ml-2.5 text-white text-[15px]"
              style={{ paddingVertical: 0 }}
              autoCapitalize="none"
              autoCorrect={false}
            />
            {searchQuery.length > 0 ? (
              <Pressable onPress={() => setSearchQuery('')} hitSlop={8}>
                <Text className="text-neutral-500 text-sm font-medium">Clear</Text>
              </Pressable>
            ) : null}
          </View>
        </Animated.View>

        {/* Tab Filters */}
        <Animated.View entering={FadeInDown.delay(150).duration(400)}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 20, paddingVertical: 8 }}
            style={{ flexGrow: 0 }}
          >
            {TABS.map((tab) => {
              const isActive = activeTab === tab.key;
              return (
                <Pressable
                  key={tab.key}
                  onPress={() => setActiveTab(tab.key)}
                  className="mr-6"
                >
                  <Text
                    className={cn(
                      'text-[15px] pb-2',
                      isActive
                        ? 'text-white font-semibold'
                        : 'text-neutral-500 font-medium'
                    )}
                  >
                    {getTabLabel(tab)}
                  </Text>
                  {isActive ? (
                    <View
                      className="h-[2.5px] rounded-full"
                      style={{ backgroundColor: '#F97316' }}
                    />
                  ) : null}
                </Pressable>
              );
            })}
          </ScrollView>
          {/* Divider under tabs */}
          <View
            className="h-px"
            style={{ backgroundColor: 'rgba(255, 255, 255, 0.06)' }}
          />
        </Animated.View>

        {/* Content */}
        {loading ? (
          <View className="flex-1 items-center justify-center">
            <ActivityIndicator size="large" color="#F97316" />
          </View>
        ) : !hasConversations ? (
          <EmptyState />
        ) : !hasFilteredResults && searchQuery.trim() ? (
          <SearchEmptyState query={searchQuery} />
        ) : !hasFilteredResults ? (
          <FilterEmptyState filter={activeTab} />
        ) : (
          <ScrollView
            className="flex-1"
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                tintColor="#F97316"
                progressBackgroundColor="#1A1A1A"
              />
            }
          >
            <Animated.View entering={FadeIn.delay(200).duration(350)}>
              {filteredConversations.map(
                (conversation: Conversation, index: number) => (
                  <View key={conversation.id}>
                    <ConversationCard
                      {...conversation}
                      onPress={() =>
                        handleConversationPress(conversation)
                      }
                    />
                    {index < filteredConversations.length - 1 ? (
                      <View
                        className="ml-[76px] mr-5 h-px"
                        style={{ backgroundColor: 'rgba(255, 255, 255, 0.06)' }}
                      />
                    ) : null}
                  </View>
                )
              )}
            </Animated.View>
          </ScrollView>
        )}
      </LinearGradient>
    </View>
  );
}
