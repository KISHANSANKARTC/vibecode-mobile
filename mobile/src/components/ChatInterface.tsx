import { View, Text, ScrollView, Pressable, TextInput, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native';
import { useTheme } from '@/lib/theme/ThemeContext';
import { useState, useEffect, useRef, useCallback } from 'react';
import { Paperclip, Image as ImageIcon, Send } from 'lucide-react-native';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { supabase } from '@/lib/supabase';
import { format } from 'date-fns';

interface Message {
  id: string;
  sender_id: string;
  text?: string;
  message?: string;
  created_at: string;
  sender_name?: string;
}

interface ChatInterfaceProps {
  bookingId: string;
  currentUserId?: string | null;
  otherUserName: string;
  clientId?: string;
}

export function ChatInterface({
  bookingId,
  currentUserId,
  otherUserName,
  clientId,
}: ChatInterfaceProps) {
  const { isDark } = useTheme();
  const [messages, setMessages] = useState<Message[]>([]);
  const [messageText, setMessageText] = useState('');
  const [loading, setLoading] = useState(false);
  const [sendingMessage, setSendingMessage] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);

  // Fetch messages on mount
  useEffect(() => {
    fetchMessages();

    // Subscribe to real-time message updates using the correct Supabase syntax
    const channel = supabase.channel(`booking-${bookingId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'booking_messages',
          filter: `booking_id=eq.${bookingId}`,
        },
        (payload: any) => {
          if (payload.new) {
            setMessages((prev) => {
              // Avoid duplicates
              if (prev.some((m) => m.id === payload.new.id)) {
                return prev;
              }
              return [...prev, payload.new];
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [bookingId]);

  const fetchMessages = useCallback(async () => {
    try {
      setLoading(true);

      // Try to fetch from booking_messages table
      // This will gracefully fail if table doesn't exist yet
      const { data, error } = await supabase
        .from('booking_messages')
        .select('*')
        .eq('booking_id', bookingId)
        .order('created_at', { ascending: true })
        .limit(100);

      if (error) {
        // Table doesn't exist or other error - just show empty state
        console.log('Messages table not available yet - showing empty state');
        setMessages([]);
        return;
      }

      setMessages(data || []);
    } catch (error: any) {
      console.log('Fetching messages (table may not exist yet):', error?.message);
      // Silently fail and show empty state
      setMessages([]);
    } finally {
      setLoading(false);
    }
  }, [bookingId]);

  const handleSendMessage = async () => {
    if (!messageText.trim() || !currentUserId) return;

    // Trim message
    const trimmedText = messageText.trim();

    try {
      setSendingMessage(true);

      // Try to insert message into booking_messages table
      const { data, error } = await supabase
        .from('booking_messages')
        .insert([
          {
            booking_id: bookingId,
            sender_id: currentUserId,
            message: trimmedText,
            created_at: new Date().toISOString(),
          },
        ])
        .select();

      if (error) {
        console.log('Could not send message (table may not exist):', error.message);
        // Still clear the input - we'll add a toast notification later
      }

      // Clear input after attempting to send
      setMessageText('');

      // Scroll to bottom
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);
    } catch (error: any) {
      console.log('Error sending message:', error?.message);
    } finally {
      setSendingMessage(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      className="flex-1">
      <View className="flex-1">
        {/* Messages Area */}
        {loading ? (
          <View className="flex-1 items-center justify-center">
            <ActivityIndicator size="large" color={isDark ? '#3B82F6' : '#3B82F6'} />
          </View>
        ) : messages.length === 0 ? (
          <Animated.View entering={FadeInUp.duration(400)} className="flex-1 items-center justify-center">
            <Text className={`text-lg font-semibold ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
              No messages yet
            </Text>
            <Text className={`text-sm mt-2 ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>
              Start the conversation!
            </Text>
          </Animated.View>
        ) : (
          <ScrollView
            ref={scrollViewRef}
            className="flex-1"
            contentContainerStyle={{ padding: 16 }}
            showsVerticalScrollIndicator={false}
            onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: true })}>
            {messages.map((message, idx) => (
              <View key={message.id || `msg-${idx}`} className="mb-3">
                {message.sender_id !== currentUserId && (
                  <Text className={`text-xs font-medium mb-1 ml-1 ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>
                    {otherUserName}
                  </Text>
                )}
                <View
                  className={`rounded-2xl px-4 py-3 max-w-xs ${
                    message.sender_id === currentUserId
                      ? 'bg-orange-500 ml-auto'
                      : isDark
                        ? 'bg-gray-800'
                        : 'bg-gray-100'
                  }`}>
                  <Text
                    className={`text-sm ${
                      message.sender_id === currentUserId
                        ? 'text-white'
                        : isDark
                          ? 'text-white'
                          : 'text-gray-900'
                    }`}>
                    {message.message || message.text}
                  </Text>
                  <Text
                    className={`text-xs mt-1 ${
                      message.sender_id === currentUserId
                        ? 'text-orange-100'
                        : isDark
                          ? 'text-gray-500'
                          : 'text-gray-400'
                    }`}>
                    {format(new Date(message.created_at), 'h:mm a')}
                  </Text>
                </View>
              </View>
            ))}
          </ScrollView>
        )}

        {/* Message Input */}
        <Animated.View
          entering={FadeInUp.delay(100).duration(400)}
          className={`px-4 py-4 border-t ${isDark ? 'border-gray-800 bg-[#1A1A1A]' : 'border-gray-200 bg-white'}`}>
          {/* Input Field */}
          <View
            className={`flex-row items-center gap-2 px-4 py-3 rounded-full ${isDark ? 'bg-gray-800' : 'bg-gray-100'}`}>
            {/* Attachment Button */}
            <Pressable className="p-2">
              <Paperclip size={18} color={isDark ? '#9CA3AF' : '#6B7280'} />
            </Pressable>

            {/* Image Button */}
            <Pressable className="p-2">
              <ImageIcon size={18} color={isDark ? '#9CA3AF' : '#6B7280'} />
            </Pressable>

            {/* Text Input */}
            <TextInput
              placeholder="Type a message..."
              value={messageText}
              onChangeText={setMessageText}
              placeholderTextColor={isDark ? '#6B7280' : '#9CA3AF'}
              multiline
              maxLength={500}
              className={`flex-1 text-sm py-2 ${isDark ? 'text-white' : 'text-gray-900'}`}
              editable={!sendingMessage}
            />

            {/* Send Button */}
            <Pressable
              onPress={handleSendMessage}
              disabled={!messageText.trim() || sendingMessage}
              className={`p-2 ${!messageText.trim() || sendingMessage ? 'opacity-50' : ''}`}>
              {sendingMessage ? (
                <ActivityIndicator size="small" color={isDark ? '#3B82F6' : '#3B82F6'} />
              ) : (
                <Send size={18} color={messageText.trim() ? '#FA5610' : '#9CA3AF'} />
              )}
            </Pressable>
          </View>
        </Animated.View>
      </View>
    </KeyboardAvoidingView>
  );
}
