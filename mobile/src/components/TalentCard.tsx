import { View, Text, Pressable } from 'react-native';
import { Star, BadgeCheck } from 'lucide-react-native';
import { OptimizedImage } from '@/components/OptimizedImage';
import { cn } from '@/lib/cn';

interface TalentCardProps {
  id: string;
  name: string;
  category: string;
  rating: number;
  hourlyRate: number;
  avatar: string;
  isVerified?: boolean;
  badge?: 'available' | 'new' | null;
  onPress?: () => void;
}

export function TalentCard({
  name,
  category,
  rating,
  hourlyRate,
  avatar,
  isVerified = false,
  badge = null,
  onPress,
}: TalentCardProps) {
  return (
    <Pressable
      onPress={onPress}
      className="w-40 mr-3"
      style={{
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        borderRadius: 16,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.08)',
        overflow: 'hidden',
      }}
    >
      {/* Avatar */}
      <View className="relative">
        <OptimizedImage
          uri={avatar}
          width={160}
          height={176}
          borderRadius={0}
          resizeMode="cover"
          fallbackText="No Image"
          showLoadingIndicator={false}
        />
        {/* Gradient overlay at bottom of image */}
        <View
          className="absolute bottom-0 left-0 right-0 h-16"
          style={{
            backgroundColor: 'transparent',
            backgroundImage: 'linear-gradient(transparent, rgba(0,0,0,0.6))',
          }}
        />
        {/* Badge */}
        {badge != null && (
          <View
            className={cn(
              'absolute top-2 left-2 px-2 py-1 rounded-full',
              badge === 'available' && 'bg-emerald-500',
              badge === 'new' && 'bg-orange-500'
            )}
          >
            <Text className="text-white text-[10px] font-semibold">
              {badge === 'available' ? 'Available' : 'New'}
            </Text>
          </View>
        )}
        {/* Verified badge */}
        {isVerified === true && (
          <View className="absolute top-2 right-2">
            <BadgeCheck size={18} color="#F97316" fill="#0A0A0A" />
          </View>
        )}
      </View>

      {/* Info */}
      <View className="p-3">
        <View className="flex-row items-center mb-1">
          <Text className="text-white text-sm font-medium flex-1" numberOfLines={1}>
            {name}
          </Text>
        </View>
        <Text className="text-neutral-400 text-xs mb-2" numberOfLines={1}>
          {category}
        </Text>
        <View className="flex-row items-center justify-between">
          <View className="flex-row items-center">
            <Star size={12} color="#F97316" fill="#F97316" />
            <Text className="text-white text-xs ml-1">{rating.toFixed(1)}</Text>
          </View>
          <Text className="text-orange-500 text-xs font-semibold">
            ${hourlyRate}/hr
          </Text>
        </View>
      </View>
    </Pressable>
  );
}
