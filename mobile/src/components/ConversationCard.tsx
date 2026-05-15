import { View, Text, Pressable, Image } from 'react-native';
import { Trash2 } from 'lucide-react-native';
import { cn } from '@/lib/cn';

interface ConversationCardProps {
  id: string;
  name: string;
  avatar: string;
  lastMessage: string;
  timestamp: string;
  unreadCount: number;
  bookingContext?: string;
  type?: 'gig' | 'chat';
  onPress?: () => void;
  onDelete?: () => void;
}

/** Format a date string into "Feb 12" style short date */
function formatShortDate(dateString: string): string {
  if (!dateString) return '';
  // If already formatted (e.g. "Just now", "5m ago"), return as-is
  if (
    dateString.includes('ago') ||
    dateString === 'Just now' ||
    dateString === 'Yesterday'
  ) {
    return dateString;
  }
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return dateString;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export function ConversationCard({
  name,
  avatar,
  lastMessage,
  timestamp,
  unreadCount,
  bookingContext,
  type,
  onPress,
  onDelete,
}: ConversationCardProps) {
  const hasUnread = unreadCount > 0;
  const isGig = type === 'gig' || !!bookingContext;
  const displayDate = formatShortDate(timestamp);

  return (
    <Pressable
      onPress={onPress}
      className="flex-row items-center px-5 py-3.5"
      style={({ pressed }) => ({
        backgroundColor: pressed ? 'rgba(0, 0, 0, 0.04)' : 'transparent',
      })}
    >
      {/* Delete button */}
      {onDelete ? (
        <Pressable
          onPress={onDelete}
          className="mr-3 w-8 h-8 rounded-full items-center justify-center"
          style={{ backgroundColor: '#FEE2E2' }}
          hitSlop={8}
        >
          <Trash2 size={14} color="#EF4444" strokeWidth={2} />
        </Pressable>
      ) : null}

      {/* Avatar */}
      <View className="relative">
        <Image
          source={{ uri: avatar }}
          className="w-12 h-12 rounded-full bg-gray-200"
        />
        {hasUnread ? (
          <View className="absolute -top-0.5 -right-0.5 w-5 h-5 rounded-full bg-[#F97316] items-center justify-center border-2 border-[#F8F8F8]">
            <Text className="text-white text-[10px] font-bold">
              {unreadCount > 9 ? '9+' : unreadCount}
            </Text>
          </View>
        ) : null}
      </View>

      {/* Content */}
      <View className="flex-1 ml-3">
        {/* Name row with badge and date */}
        <View className="flex-row items-center justify-between mb-0.5">
          <View className="flex-row items-center flex-1 mr-2">
            <Text
              className={cn(
                'text-[15px]',
                hasUnread
                  ? 'text-gray-900 font-semibold'
                  : 'text-gray-900 font-medium'
              )}
              numberOfLines={1}
            >
              {name}
            </Text>
            {isGig ? (
              <View
                className="ml-2 px-2 py-0.5 rounded-full"
                style={{ backgroundColor: '#FFF7ED' }}
              >
                <Text className="text-[#F97316] text-[11px] font-semibold">
                  Gig
                </Text>
              </View>
            ) : null}
          </View>
          <Text
            className={cn(
              'text-xs',
              hasUnread ? 'text-[#F97316] font-medium' : 'text-gray-400'
            )}
          >
            {displayDate}
          </Text>
        </View>

        {/* Last message preview */}
        <Text
          className={cn(
            'text-[13px] leading-5',
            hasUnread ? 'text-gray-600' : 'text-gray-400'
          )}
          numberOfLines={1}
        >
          {lastMessage}
        </Text>
      </View>
    </Pressable>
  );
}
