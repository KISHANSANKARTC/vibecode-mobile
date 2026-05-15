import { View, Text } from 'react-native';
import { Star, MessageCircle, ThumbsUp } from 'lucide-react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

interface ReputationWidgetProps {
  rating: number;
  replyRate: number;
  reviewCount: number;
}

export function ReputationWidget({
  rating,
  replyRate,
  reviewCount,
}: ReputationWidgetProps) {
  return (
    <Animated.View
      entering={FadeInDown.delay(400).duration(500)}
      className="mx-4 rounded-2xl p-4"
      style={{
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.08)',
      }}
    >
      <Text className="text-white text-lg font-semibold mb-4">Your Reputation</Text>

      <View className="flex-row justify-between">
        {/* Rating */}
        <View className="flex-1 items-center">
          <View
            className="w-12 h-12 rounded-full items-center justify-center mb-2"
            style={{ backgroundColor: 'rgba(249, 115, 22, 0.2)' }}
          >
            <Star size={22} color="#F97316" fill="#F97316" />
          </View>
          <Text className="text-white text-xl font-bold">{rating.toFixed(1)}</Text>
          <Text className="text-neutral-400 text-xs">Rating</Text>
        </View>

        {/* Reply Rate */}
        <View className="flex-1 items-center">
          <View
            className="w-12 h-12 rounded-full items-center justify-center mb-2"
            style={{ backgroundColor: 'rgba(16, 185, 129, 0.2)' }}
          >
            <MessageCircle size={22} color="#10B981" />
          </View>
          <Text className="text-white text-xl font-bold">{replyRate}%</Text>
          <Text className="text-neutral-400 text-xs">Reply Rate</Text>
        </View>

        {/* Reviews */}
        <View className="flex-1 items-center">
          <View
            className="w-12 h-12 rounded-full items-center justify-center mb-2"
            style={{ backgroundColor: 'rgba(59, 130, 246, 0.2)' }}
          >
            <ThumbsUp size={22} color="#3B82F6" />
          </View>
          <Text className="text-white text-xl font-bold">{reviewCount}</Text>
          <Text className="text-neutral-400 text-xs">Reviews</Text>
        </View>
      </View>
    </Animated.View>
  );
}
