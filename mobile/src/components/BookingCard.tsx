import { View, Text, Pressable, Image } from 'react-native';
import { MapPin, Calendar } from 'lucide-react-native';

interface BookingCardProps {
  id: string;
  talentName: string;
  talentAvatar: string;
  date: string;
  location: string;
  status: 'confirmed' | 'pending' | 'completed';
  onPress?: () => void;
}

export function BookingCard({
  talentName,
  talentAvatar,
  date,
  location,
  status,
  onPress,
}: BookingCardProps) {
  const getStatusColor = () => {
    switch (status) {
      case 'confirmed':
        return { bg: 'rgba(34, 197, 94, 0.2)', text: '#22C55E' };
      case 'pending':
        return { bg: 'rgba(249, 115, 22, 0.2)', text: '#F97316' };
      case 'completed':
        return { bg: 'rgba(156, 163, 175, 0.2)', text: '#9CA3AF' };
      default:
        return { bg: 'rgba(156, 163, 175, 0.2)', text: '#9CA3AF' };
    }
  };

  const statusColors = getStatusColor();

  return (
    <Pressable
      onPress={onPress}
      className="w-64 mr-3 p-4"
      style={{
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        borderRadius: 16,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.08)',
      }}
    >
      {/* Header with avatar and status */}
      <View className="flex-row items-center mb-3">
        <Image
          source={{ uri: talentAvatar }}
          className="w-12 h-12 rounded-full mr-3"
        />
        <View className="flex-1">
          <Text className="text-white font-medium text-base" numberOfLines={1}>
            {talentName}
          </Text>
          <View
            className="self-start px-2 py-0.5 rounded-full mt-1"
            style={{ backgroundColor: statusColors.bg }}
          >
            <Text
              className="text-[10px] font-semibold capitalize"
              style={{ color: statusColors.text }}
            >
              {status}
            </Text>
          </View>
        </View>
      </View>

      {/* Details */}
      <View className="gap-2">
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
    </Pressable>
  );
}
