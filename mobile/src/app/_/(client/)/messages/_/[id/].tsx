import { View, Text, TextInput, Pressable, ActivityIndicator, Alert, Image, Modal } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useRouter } from '@/lib/router-helper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft, Send } from 'lucide-react-native';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { extractErrorMessage } from '@/lib/errorUtils';

const QUICK_REPLIES = [
  "I'd like to book you",
  "Check availability",
  "Quick question",
];

export default function MessagesScreen() {
  const { id, name, avatar } = useLocalSearchParams<{ id: string; name: string; avatar?: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [message, setMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [talentAvatar, setTalentAvatar] = useState<string | null>(avatar ? decodeURIComponent(avatar) : null);

  // Fetch talent avatar if not provided
  useEffect(() => {
    const fetchTalentData = async () => {
      if (talentAvatar) return; // Already have avatar

      try {
        const { data: talentProfile } = await supabase
          .from('talent_profiles')
          .select('user_id')
          .eq('id', id)
          .maybeSingle();

        if (talentProfile?.user_id) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('avatar_url')
            .eq('id', talentProfile.user_id)
            .maybeSingle();

          if (profile?.avatar_url) {
            setTalentAvatar(profile.avatar_url);
          }
        }
      } catch (err) {
        console.error('Error fetching talent avatar:', extractErrorMessage(err));
      }
    };

    fetchTalentData();
  }, [id, talentAvatar]);

  const handleQuickReply = (reply: string) => {
    setMessage(reply);
  };

  const handleSendMessage = async () => {
    if (!message.trim()) return;

    try {
      setIsSending(true);

      // Get current user
      const { data: authData } = await supabase.auth.getUser();
      const clientUserId = authData?.user?.id;

      if (!clientUserId) {
        Alert.alert('Error', 'Please sign in to send messages');
        return;
      }

      // Check if inquiry thread exists
      const { data: existingThread } = await supabase
        .from('inquiry_threads')
        .select('id')
        .eq('client_user_id', clientUserId)
        .eq('talent_id', id)
        .maybeSingle();

      let threadId = existingThread?.id;

      // If no thread exists, create one
      if (!threadId) {
        const { data: newThread, error: threadError } = await supabase
          .from('inquiry_threads')
          .insert({
            client_user_id: clientUserId,
            talent_id: id,
            status: 'open',
          })
          .select('id')
          .single();

        if (threadError || !newThread) {
          throw new Error('Failed to create message thread');
        }

        threadId = newThread.id;
      }

      // Insert the message
      const { error: messageError } = await supabase
        .from('inquiry_messages')
        .insert({
          thread_id: threadId,
          sender_user_id: clientUserId,
          message_text: message.trim(),
        });

      if (messageError) {
        throw new Error('Failed to send message');
      }

      Alert.alert('Success', 'Message sent! Check your messages for replies.');
      router.back();
    } catch (err) {
      const errorMsg = extractErrorMessage(err);
      console.error('Error sending message:', errorMsg);
      Alert.alert('Error', 'Failed to send message. Please try again.');
    } finally {
      setIsSending(false);
    }
  };

  return (
    <Modal transparent animationType="fade" onRequestClose={() => router.back()}>
      <View className="flex-1 bg-black/60 items-center justify-center" style={{ paddingTop: insets.top }}>
        <View
          className="bg-black rounded-2xl w-11/12 max-w-sm overflow-hidden"
          style={{ paddingBottom: insets.bottom + 20 }}
        >
          {/* Close Button */}
          <View className="px-4 pt-4 flex-row justify-between items-center">
            <View style={{ width: 40 }} />
            <Text className="text-white text-sm font-medium">Message {name}</Text>
            <Pressable onPress={() => router.back()} className="w-10 h-10 items-center justify-center">
              <ArrowLeft size={24} color="white" />
            </Pressable>
          </View>

          {/* Avatar */}
          <View className="items-center py-8">
            {talentAvatar ? (
              <Image
                source={{ uri: talentAvatar }}
                style={{ width: 100, height: 100, borderRadius: 50 }}
                resizeMode="cover"
              />
            ) : (
              <View
                style={{
                  width: 100,
                  height: 100,
                  borderRadius: 50,
                  backgroundColor: '#F97316',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Text className="text-white text-4xl font-bold">
                  {name
                    .split(' ')
                    .map((n) => n[0])
                    .join('')
                    .toUpperCase()
                    .slice(0, 2)}
                </Text>
              </View>
            )}
          </View>

          {/* Title */}
          <View className="items-center px-4">
            <Text className="text-white text-2xl font-bold">Message {name}</Text>
            <Text className="text-gray-400 text-sm mt-1">Start a conversation</Text>
          </View>

          {/* Quick Reply Buttons */}
          <View className="px-4 py-6">
            <View className="flex-row flex-wrap gap-3 justify-center">
              {QUICK_REPLIES.map((reply) => (
                <Pressable
                  key={reply}
                  onPress={() => handleQuickReply(reply)}
                  className="px-4 py-2.5 border border-gray-600 rounded-full"
                >
                  <Text className="text-white text-sm font-medium">{reply}</Text>
                </Pressable>
              ))}
            </View>
          </View>

          {/* Message Input */}
          <View className="px-4">
            <TextInput
              className="bg-gray-900 border border-gray-700 rounded-lg px-4 py-3 text-white text-base min-h-24"
              placeholder="Type your message..."
              placeholderTextColor="#666"
              value={message}
              onChangeText={setMessage}
              editable={!isSending}
              multiline
              maxLength={500}
            />
          </View>

          {/* Send Button */}
          <View className="px-4 py-6">
            <Pressable
              onPress={handleSendMessage}
              disabled={!message.trim() || isSending}
              className="bg-orange-500 rounded-full py-3 items-center flex-row justify-center"
              style={{
                opacity: !message.trim() || isSending ? 0.5 : 1,
              }}
            >
              {isSending ? (
                <ActivityIndicator size="small" color="white" />
              ) : (
                <>
                  <Send size={18} color="white" />
                  <Text className="text-white text-base font-semibold ml-2">Send Message</Text>
                </>
              )}
            </Pressable>
          </View>

          {/* Footer Text */}
          <View className="px-4 pb-4">
            <Text className="text-gray-500 text-xs text-center">
              Your contact info will be shared with {name}
            </Text>
          </View>
        </View>
      </View>
    </Modal>
  );
}
