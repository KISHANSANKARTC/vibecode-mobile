import React, { useState, useEffect } from 'react';
import { View, ScrollView, Pressable, Text } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  Camera,
  User,
  Megaphone,
  Sparkles,
  Scissors,
  Shirt,
  Film,
  Palette,
  Clapperboard,
  Plane,
  Music,
  TrendingUp,
  X,
} from 'lucide-react-native';
import { categoryLabels, TalentCategory } from '@/data/specialties';
import { useTheme } from '@/lib/theme/ThemeContext';

interface CategoryCardRowProps {
  selectedCategory: string | null;
  onCategoryChange: (categoryId: string | null) => void;
  desktopLayout?: 'scroll' | 'grid';
  showHint?: boolean;
  onDismissHint?: () => void;
}

// Function to get icon component with dynamic color
const getCategoryIcon = (categoryId: TalentCategory, color: string) => {
  const icons: Record<TalentCategory, React.ReactNode> = {
    photographer: <Camera size={22} color={color} />,
    model: <User size={22} color={color} />,
    influencer: <Megaphone size={22} color={color} />,
    makeup_artist: <Sparkles size={22} color={color} />,
    hair_stylist: <Scissors size={22} color={color} />,
    stylist: <Shirt size={22} color={color} />,
    editor: <Film size={22} color={color} />,
    graphic_designer: <Palette size={22} color={color} />,
    creative_director: <Clapperboard size={22} color={color} />,
    drone_operator: <Plane size={22} color={color} />,
    music_producer: <Music size={22} color={color} />,
    marketing_consultant: <TrendingUp size={22} color={color} />,
  };
  return icons[categoryId];
};

export function CategoryCardRow({
  selectedCategory,
  onCategoryChange,
  desktopLayout = 'scroll',
  showHint = true,
  onDismissHint,
}: CategoryCardRowProps) {
  const { isDark } = useTheme();
  const [dismissedHint, setDismissedHint] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem('category_hint_dismissed')
      .then((stored) => {
        if (stored) setDismissedHint(true);
      })
      .catch(() => {
        // ignore storage errors
      });
  }, []);

  const handleDismissHint = () => {
    setDismissedHint(true);
    AsyncStorage.setItem('category_hint_dismissed', 'true').catch(() => {
      // ignore storage errors
    });
    onDismissHint?.();
  };

  const handleCategoryToggle = (categoryId: string) => {
    if (selectedCategory === categoryId) {
      onCategoryChange(null);
    } else {
      onCategoryChange(categoryId);
    }
  };

  const categories = Object.entries(categoryLabels).map(([id, label]) => ({
    id,
    label,
  }));

  // Colors based on theme
  const cardBgColor = isDark ? '#1C1C1C' : '#FFFFFF';
  const cardBorderColor = isDark ? 'rgba(255,255,255,0.1)' : '#E5E7EB';
  const selectedBorderColor = '#FA5610';
  const selectedBgColor = isDark ? 'rgba(250, 86, 16, 0.15)' : 'rgba(250, 86, 16, 0.1)';
  const iconColor = '#FA5610';
  const textColor = isDark ? '#FFFFFF' : '#111827';

  return (
    <View>
      {/* Hint Banner */}
      {showHint && !dismissedHint ? (
        <View
          style={{
            marginHorizontal: 16,
            marginTop: 12,
            padding: 12,
            backgroundColor: isDark ? 'rgba(250, 86, 16, 0.15)' : '#FFF7ED',
            borderWidth: 1,
            borderColor: isDark ? 'rgba(250, 86, 16, 0.3)' : '#FDBA74',
            borderRadius: 12,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <Text style={{ fontSize: 12, color: isDark ? '#FDBA74' : '#9A3412', flex: 1 }}>
            Tap a category to filter talents
          </Text>
          <Pressable onPress={handleDismissHint}>
            <X size={16} color={isDark ? '#FDBA74' : '#9CA3AF'} strokeWidth={2} />
          </Pressable>
        </View>
      ) : null}

      {/* Category Cards */}
      {desktopLayout === 'scroll' ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={{ paddingHorizontal: 16, paddingVertical: 8 }}
          contentContainerStyle={{ gap: 10 }}
        >
          {categories.map((category) => {
            const isSelected = selectedCategory === category.id;
            return (
              <Pressable
                key={category.id}
                onPress={() => handleCategoryToggle(category.id)}
                style={{
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: 14,
                  borderWidth: 2,
                  borderColor: isSelected ? selectedBorderColor : cardBorderColor,
                  backgroundColor: isSelected ? selectedBgColor : cardBgColor,
                  paddingHorizontal: 12,
                  paddingVertical: 10,
                  minWidth: 88,
                  height: 72,
                }}
              >
                <View style={{ marginBottom: 6 }}>
                  {getCategoryIcon(category.id as TalentCategory, isSelected ? selectedBorderColor : iconColor)}
                </View>
                <Text
                  style={{
                    fontSize: 11,
                    fontWeight: '600',
                    textAlign: 'center',
                    color: isSelected ? selectedBorderColor : textColor,
                  }}
                  numberOfLines={2}
                >
                  {category.label}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      ) : (
        <View style={{ paddingHorizontal: 16, paddingVertical: 12, flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
          {categories.map((category) => {
            const isSelected = selectedCategory === category.id;
            return (
              <Pressable
                key={category.id}
                onPress={() => handleCategoryToggle(category.id)}
                style={{
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: 14,
                  borderWidth: 2,
                  borderColor: isSelected ? selectedBorderColor : cardBorderColor,
                  backgroundColor: isSelected ? selectedBgColor : cardBgColor,
                  paddingHorizontal: 12,
                  paddingVertical: 10,
                  minWidth: 72,
                  height: 72,
                  flexGrow: 1,
                  flexBasis: '30%',
                }}
              >
                <View style={{ marginBottom: 6 }}>
                  {getCategoryIcon(category.id as TalentCategory, isSelected ? selectedBorderColor : iconColor)}
                </View>
                <Text
                  style={{
                    fontSize: 11,
                    fontWeight: '600',
                    textAlign: 'center',
                    color: isSelected ? selectedBorderColor : textColor,
                  }}
                  numberOfLines={2}
                >
                  {category.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      )}
    </View>
  );
}
