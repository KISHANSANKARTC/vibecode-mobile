import { View, Text, Pressable, FlatList, TextInput } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft, Heart, Search, X } from 'lucide-react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { useCallback, useMemo, useState } from 'react';
import { useRouter } from '@/lib/router-helper';
import { useShortlist } from '@/hooks/useShortlist';
import { ShortlistItemCard } from '@/components/ShortlistItemCard';
import { useAuthStore } from '@/lib/state/auth-store';
import { ListItemSkeleton } from '@/components/SkeletonLoader';

// Empty State Component
function EmptyState({ router }: { router: ReturnType<typeof useRouter> }) {
  return (
    <Animated.View
      entering={FadeIn.duration(300)}
      className="flex-1 items-center justify-center"
      style={{ marginTop: -60 }}
    >
      <View className="w-16 h-16 rounded-full items-center justify-center mb-5 bg-gray-100">
        <Heart size={28} color="#9CA3AF" strokeWidth={1.5} />
      </View>
      <Text className="text-gray-900 text-lg font-semibold mb-2">No saved talent yet</Text>
      <Text className="text-gray-400 text-sm text-center px-12 mb-6">
        Tap the heart icon on any talent card to save them here
      </Text>
      <Pressable
        className="bg-orange-500 px-8 py-3.5 rounded-xl"
        onPress={() => router.push('/(client)/search')}
      >
        <Text className="text-white font-semibold text-base">Find Talent</Text>
      </Pressable>
    </Animated.View>
  );
}

// Loading State
function LoadingState() {
  return (
    <ListItemSkeleton count={5} />
  );
}

export default function ShortlistScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const user = useAuthStore((state) => state.user);
  const { items, isLoading, removeFromShortlist } = useShortlist(user);
  const [searchQuery, setSearchQuery] = useState('');

  const filteredItems = useMemo(() => {
    if (!searchQuery.trim()) return items;
    const q = searchQuery.toLowerCase();
    return items.filter((item) => {
      const name = (item.profile?.full_name || item.talent?.display_name || '').toLowerCase();
      const category = (item.talent?.category || '').toLowerCase();
      const location = (item.talent?.location_text || '').toLowerCase();
      return name.includes(q) || category.includes(q) || location.includes(q);
    });
  }, [items, searchQuery]);

  const handleBackPress = useCallback(() => {
    router.back();
  }, []);

  const handleRemoveItem = useCallback(
    async (talentId: string) => {
      await removeFromShortlist(talentId);
    },
    [removeFromShortlist]
  );

  const handlePressItem = useCallback((talentId: string) => {
    router.push(`/talent/${talentId}`);
  }, []);

  const renderItem = useCallback(
    ({ item }: { item: any }) => (
      <ShortlistItemCard
        item={item}
        onRemove={handleRemoveItem}
        onPress={handlePressItem}
      />
    ),
    [handleRemoveItem, handlePressItem]
  );

  return (
    <View className="flex-1 bg-white">
      {/* Header */}
      <View
        className="bg-white px-4 pb-4 z-50"
        style={{
          paddingTop: insets.top + 12,
        }}
      >
        <View className="flex-row items-center justify-between">
          <View className="flex-row items-center flex-1">
            <Pressable
              onPress={handleBackPress}
              hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
              className="w-10 h-10 rounded-full items-center justify-center mr-3"
              style={({ pressed }) => ({
                backgroundColor: pressed ? '#E5E7EB' : '#F3F4F6',
                opacity: pressed ? 0.7 : 1,
              })}
            >
              <ArrowLeft size={20} color="#1F2937" strokeWidth={2.5} />
            </Pressable>
            <View>
              <Text className="text-gray-900 text-xl font-semibold">Shortlist</Text>
              <Text className="text-gray-500 text-xs mt-0.5">
                {items.length} saved
              </Text>
            </View>
          </View>
        </View>
      </View>

      {/* Search Bar */}
      {!isLoading && items.length > 0 ? (
        <View className="px-4 pb-3">
          <View className="flex-row items-center bg-gray-100 rounded-xl px-3 py-2.5">
            <Search size={18} color="#9CA3AF" />
            <TextInput
              placeholder="Search by name, category, or location"
              placeholderTextColor="#9CA3AF"
              value={searchQuery}
              onChangeText={setSearchQuery}
              className="flex-1 ml-2 text-gray-900 text-sm"
              returnKeyType="search"
            />
            {searchQuery ? (
              <Pressable onPress={() => setSearchQuery('')} hitSlop={8}>
                <X size={16} color="#9CA3AF" />
              </Pressable>
            ) : null}
          </View>
        </View>
      ) : null}

      {/* Content */}
      {isLoading ? (
        <LoadingState />
      ) : items.length === 0 ? (
        <EmptyState router={router} />
      ) : (
        <FlatList
          data={filteredItems}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{
            paddingHorizontal: 16,
            paddingVertical: 16,
            paddingBottom: insets.bottom + 100,
          }}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View className="items-center justify-center py-12">
              <Text className="text-gray-400 text-sm">No results for "{searchQuery}"</Text>
            </View>
          }
        />
      )}
    </View>
  );
}
