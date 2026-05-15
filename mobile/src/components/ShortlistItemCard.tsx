import React from 'react';
import { View, Text, Pressable, Image } from 'react-native';
import { Trash2 } from 'lucide-react-native';
import { OptimizedImage } from './OptimizedImage';

interface ShortlistItemCardProps {
  item: any;
  onRemove: (talentId: string) => void;
  onPress: (talentId: string) => void;
}

export function ShortlistItemCard({ item, onRemove, onPress }: ShortlistItemCardProps) {
  const handleRemove = () => {
    onRemove(item.talent_id);
  };

  const handlePress = () => {
    onPress(item.talent_id);
  };

  const talentName = item.profile?.full_name || item.talent?.display_name || 'Talent';
  const category = (item.talent?.category || 'creative').replace(/_/g, ' ');
  const hourlyRate = item.talent?.hourly_rate || 0;
  const avatarUrl = item.profile?.avatar_url || null;

  return (
    <Pressable
      onPress={handlePress}
      className="flex-row items-center gap-4 p-4 bg-white border border-gray-200 rounded-2xl mb-3"
    >
      {/* Avatar */}
      <View className="w-16 h-16 rounded-xl overflow-hidden bg-gray-100 shrink-0">
        <OptimizedImage
          uri={avatarUrl}
          width={64}
          height={64}
          borderRadius={12}
          fallbackText=""
          showLoadingIndicator={false}
        />
      </View>

      {/* Info */}
      <View className="flex-1">
        <Text className="font-semibold text-gray-900 text-base" numberOfLines={1}>
          {talentName}
        </Text>
        <Text className="text-xs text-gray-500 mt-1 capitalize" numberOfLines={1}>
          {category}
        </Text>
        {hourlyRate > 0 && (
          <Text className="text-sm font-medium text-gray-900 mt-2">
            AED {hourlyRate}/hr
          </Text>
        )}
      </View>

      {/* Remove Button */}
      <Pressable
        onPress={handleRemove}
        className="w-10 h-10 rounded-xl bg-red-50 items-center justify-center shrink-0"
      >
        <Trash2 size={18} color="#ef4444" />
      </Pressable>
    </Pressable>
  );
}
