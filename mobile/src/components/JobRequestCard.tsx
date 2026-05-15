import { View, Text, Pressable, Image } from 'react-native';
import { MapPin, Calendar, Check, X } from 'lucide-react-native';
import Animated, { FadeInRight, useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';

interface JobRequestCardProps {
  id: string;
  clientName: string;
  clientAvatar: string;
  date: string;
  location: string;
  price: number;
  currency?: string;
  bookingType: string;
  onAccept?: () => void;
  onDecline?: () => void;
  index?: number;
}

export function JobRequestCard({
  clientName,
  clientAvatar,
  date,
  location,
  price,
  currency = 'AED',
  bookingType,
  onAccept,
  onDecline,
  index = 0,
}: JobRequestCardProps) {
  const translateX = useSharedValue(0);

  const panGesture = Gesture.Pan()
    .onUpdate((event) => {
      translateX.value = event.translationX;
    })
    .onEnd((event) => {
      if (event.translationX > 100) {
        // Accept action
        onAccept?.();
      } else if (event.translationX < -100) {
        // Decline action
        onDecline?.();
      }
      translateX.value = withSpring(0);
    });

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  return (
    <Animated.View
      entering={FadeInRight.delay(index * 100).duration(400)}
      className="mr-4"
      style={{ width: 280 }}
    >
      <GestureDetector gesture={panGesture}>
        <Animated.View
          style={[
            animatedStyle,
            {
              backgroundColor: 'rgba(255, 255, 255, 0.05)',
              borderRadius: 20,
              borderWidth: 1,
              borderColor: 'rgba(255, 255, 255, 0.08)',
              overflow: 'hidden',
            },
          ]}
        >
          {/* Card Content */}
          <View className="p-4">
            {/* Client Info */}
            <View className="flex-row items-center mb-3">
              <Image
                source={{ uri: clientAvatar }}
                className="w-12 h-12 rounded-full"
              />
              <View className="ml-3 flex-1">
                <Text className="text-white font-semibold text-base">
                  {clientName}
                </Text>
                <View
                  className="self-start px-2 py-0.5 rounded-full mt-1"
                  style={{ backgroundColor: 'rgba(249, 115, 22, 0.2)' }}
                >
                  <Text className="text-orange-500 text-xs font-medium">
                    {bookingType}
                  </Text>
                </View>
              </View>
            </View>

            {/* Details */}
            <View className="gap-2 mb-4">
              <View className="flex-row items-center">
                <Calendar size={14} color="#9CA3AF" />
                <Text className="text-neutral-400 text-sm ml-2">{date}</Text>
              </View>
              <View className="flex-row items-center">
                <MapPin size={14} color="#9CA3AF" />
                <Text className="text-neutral-400 text-sm ml-2" numberOfLines={1}>
                  {location}
                </Text>
              </View>
            </View>

            {/* Price */}
            <View className="mb-4">
              <Text className="text-orange-500 text-xl font-bold">
                {currency} {price.toLocaleString()}
              </Text>
            </View>

            {/* Action Buttons */}
            <View className="flex-row gap-3">
              <Pressable
                onPress={onDecline}
                className="flex-1 flex-row items-center justify-center py-3 rounded-xl"
                style={{
                  backgroundColor: 'rgba(239, 68, 68, 0.15)',
                  borderWidth: 1,
                  borderColor: 'rgba(239, 68, 68, 0.3)',
                }}
              >
                <X size={18} color="#EF4444" />
                <Text className="text-red-500 font-semibold ml-2">Decline</Text>
              </Pressable>
              <Pressable
                onPress={onAccept}
                className="flex-1 flex-row items-center justify-center py-3 rounded-xl bg-emerald-500"
              >
                <Check size={18} color="#FFFFFF" />
                <Text className="text-white font-semibold ml-2">Accept</Text>
              </Pressable>
            </View>
          </View>
        </Animated.View>
      </GestureDetector>
    </Animated.View>
  );
}
