import { View, Text, Pressable, Modal, ScrollView } from 'react-native';
import { BlurView } from 'expo-blur';
import { X, Check } from 'lucide-react-native';
import Animated, { FadeIn, FadeOut, SlideInDown, SlideOutDown } from 'react-native-reanimated';
import { useState, useEffect } from 'react';
import { cn } from '@/lib/cn';

export interface FilterState {
  priceMin: number;
  priceMax: number;
  verifiedOnly: boolean;
  availableToday: boolean;
  gender: 'all' | 'male' | 'female';
  minRating: boolean; // 4+ stars
}

interface FilterBottomSheetProps {
  visible: boolean;
  onClose: () => void;
  filters: FilterState;
  onApply: (filters: FilterState) => void;
}

const PRICE_STEPS = [0, 100, 200, 300, 500, 750, 1000, 1500, 2000];

function PriceSlider({
  label,
  value,
  onChange
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
}) {
  const currentIndex = PRICE_STEPS.findIndex(p => p >= value);
  const index = currentIndex === -1 ? PRICE_STEPS.length - 1 : currentIndex;

  return (
    <View className="mb-6">
      <View className="flex-row justify-between mb-3">
        <Text className="text-neutral-400 text-sm">{label}</Text>
        <Text className="text-white text-sm font-medium">{value} AED</Text>
      </View>
      <View className="flex-row items-center justify-between">
        {PRICE_STEPS.map((step, i) => (
          <Pressable
            key={step}
            onPress={() => onChange(step)}
            className="items-center"
          >
            <View
              className={cn(
                'w-3 h-3 rounded-full',
                i <= index ? 'bg-orange-500' : 'bg-neutral-700'
              )}
            />
            {(i === 0 || i === PRICE_STEPS.length - 1 || i === Math.floor(PRICE_STEPS.length / 2)) && (
              <Text className="text-neutral-500 text-[10px] mt-1">{step}</Text>
            )}
          </Pressable>
        ))}
      </View>
      <View className="h-1 bg-neutral-700 mt-2 rounded-full overflow-hidden">
        <View
          className="h-full bg-orange-500 rounded-full"
          style={{ width: `${(index / (PRICE_STEPS.length - 1)) * 100}%` }}
        />
      </View>
    </View>
  );
}

function Toggle({
  label,
  value,
  onChange
}: {
  label: string;
  value: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <Pressable
      onPress={() => onChange(!value)}
      className="flex-row items-center justify-between py-4 border-b"
      style={{ borderBottomColor: 'rgba(255,255,255,0.08)' }}
    >
      <Text className="text-white text-base">{label}</Text>
      <View
        className={cn(
          'w-12 h-7 rounded-full items-center justify-center',
          value ? 'bg-orange-500' : 'bg-neutral-700'
        )}
      >
        <View
          className={cn(
            'w-5 h-5 rounded-full bg-white absolute',
            value ? 'right-1' : 'left-1'
          )}
        />
      </View>
    </Pressable>
  );
}

function GenderSelector({
  value,
  onChange
}: {
  value: 'all' | 'male' | 'female';
  onChange: (value: 'all' | 'male' | 'female') => void;
}) {
  const options: Array<{ key: 'all' | 'male' | 'female'; label: string }> = [
    { key: 'all', label: 'All' },
    { key: 'male', label: 'Male' },
    { key: 'female', label: 'Female' },
  ];

  return (
    <View className="mb-6">
      <Text className="text-neutral-400 text-sm mb-3">Gender</Text>
      <View className="flex-row">
        {options.map((option) => (
          <Pressable
            key={option.key}
            onPress={() => onChange(option.key)}
            className={cn(
              'flex-1 py-3 items-center rounded-xl mr-2',
              value === option.key ? 'bg-orange-500' : 'bg-neutral-800'
            )}
            style={option.key === 'female' ? { marginRight: 0 } : undefined}
          >
            <Text
              className={cn(
                'text-sm font-medium',
                value === option.key ? 'text-white' : 'text-neutral-400'
              )}
            >
              {option.label}
            </Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

export function FilterBottomSheet({
  visible,
  onClose,
  filters,
  onApply,
}: FilterBottomSheetProps) {
  const [localFilters, setLocalFilters] = useState<FilterState>(filters);

  useEffect(() => {
    if (visible) {
      setLocalFilters(filters);
    }
  }, [visible, filters]);

  const handleApply = () => {
    onApply(localFilters);
    onClose();
  };

  const handleReset = () => {
    const defaultFilters: FilterState = {
      priceMin: 0,
      priceMax: 2000,
      verifiedOnly: false,
      availableToday: false,
      gender: 'all',
      minRating: false,
    };
    setLocalFilters(defaultFilters);
  };

  const activeFiltersCount = [
    localFilters.priceMin > 0,
    localFilters.priceMax < 2000,
    localFilters.verifiedOnly,
    localFilters.availableToday,
    localFilters.gender !== 'all',
    localFilters.minRating,
  ].filter(Boolean).length;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View className="flex-1 justify-end">
        {/* Backdrop */}
        <Animated.View
          entering={FadeIn.duration(200)}
          exiting={FadeOut.duration(200)}
          className="absolute inset-0"
        >
          <Pressable
            onPress={onClose}
            className="flex-1"
            style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}
          />
        </Animated.View>

        {/* Bottom Sheet */}
        <Animated.View
          entering={SlideInDown.duration(300).springify().damping(20)}
          exiting={SlideOutDown.duration(200)}
          style={{
            backgroundColor: 'rgba(20, 20, 20, 0.95)',
            borderTopLeftRadius: 24,
            borderTopRightRadius: 24,
            maxHeight: '85%',
            borderWidth: 1,
            borderBottomWidth: 0,
            borderColor: 'rgba(255,255,255,0.1)',
          }}
        >
          {/* Handle */}
          <View className="items-center pt-3">
            <View className="w-10 h-1 rounded-full bg-neutral-600" />
          </View>

          {/* Header */}
          <View className="flex-row items-center justify-between px-5 py-4">
            <Pressable onPress={handleReset}>
              <Text className="text-orange-500 text-base">Reset</Text>
            </Pressable>
            <Text className="text-white text-lg font-semibold">Filters</Text>
            <Pressable
              onPress={onClose}
              className="w-8 h-8 rounded-full items-center justify-center"
              style={{ backgroundColor: 'rgba(255,255,255,0.1)' }}
            >
              <X size={18} color="#FFFFFF" />
            </Pressable>
          </View>

          {/* Content */}
          <ScrollView
            className="px-5"
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 24 }}
          >
            {/* Price Range */}
            <View className="mb-4">
              <Text className="text-white text-base font-medium mb-4">Price Range</Text>
              <PriceSlider
                label="Min Price"
                value={localFilters.priceMin}
                onChange={(value) =>
                  setLocalFilters((prev) => ({
                    ...prev,
                    priceMin: Math.min(value, prev.priceMax),
                  }))
                }
              />
              <PriceSlider
                label="Max Price"
                value={localFilters.priceMax}
                onChange={(value) =>
                  setLocalFilters((prev) => ({
                    ...prev,
                    priceMax: Math.max(value, prev.priceMin),
                  }))
                }
              />
            </View>

            {/* Toggles */}
            <Toggle
              label="Verified Only"
              value={localFilters.verifiedOnly}
              onChange={(value) =>
                setLocalFilters((prev) => ({ ...prev, verifiedOnly: value }))
              }
            />
            <Toggle
              label="Available Today"
              value={localFilters.availableToday}
              onChange={(value) =>
                setLocalFilters((prev) => ({ ...prev, availableToday: value }))
              }
            />
            <Toggle
              label="4+ Star Rating"
              value={localFilters.minRating}
              onChange={(value) =>
                setLocalFilters((prev) => ({ ...prev, minRating: value }))
              }
            />

            {/* Gender */}
            <View className="mt-6">
              <GenderSelector
                value={localFilters.gender}
                onChange={(value) =>
                  setLocalFilters((prev) => ({ ...prev, gender: value }))
                }
              />
            </View>
          </ScrollView>

          {/* Apply Button */}
          <View className="px-5 pb-8 pt-4">
            <Pressable
              onPress={handleApply}
              className="py-4 rounded-2xl items-center"
              style={{ backgroundColor: '#F97316' }}
            >
              <Text className="text-white text-base font-semibold">
                Apply Filters{activeFiltersCount > 0 ? ` (${activeFiltersCount})` : null}
              </Text>
            </Pressable>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}
