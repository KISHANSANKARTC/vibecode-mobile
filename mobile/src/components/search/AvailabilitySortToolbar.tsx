import React, { useState } from 'react';
import { View, Text, Pressable, ScrollView, Modal } from 'react-native';
import { Clock, Zap, Calendar, Grid3x3, List, ChevronDown, X } from 'lucide-react-native';
import { useTheme } from '@/lib/theme/ThemeContext';

interface AvailabilitySortToolbarProps {
  availabilityFilter: 'instant' | 'today' | 'tomorrow' | 'custom' | null;
  onAvailabilityChange: (filter: 'instant' | 'today' | 'tomorrow' | 'custom' | null) => void;
  sort: string;
  onSortChange: (sort: string) => void;
  viewMode: 'grid' | 'list';
  onViewModeChange: (mode: 'grid' | 'list') => void;
}

const SORT_OPTIONS = [
  { id: 'recommended', label: 'Recommended' },
  { id: 'newest', label: 'Newest First' },
  { id: 'oldest', label: 'Oldest First' },
  { id: 'nearest', label: 'Nearest First' },
  { id: 'highest_rated', label: 'Highest Rated' },
  { id: 'available_first', label: 'Available First' },
  { id: 'price_low_high', label: 'Price: Low to High' },
  { id: 'price_high_low', label: 'Price: High to Low' },
];

const AVAILABILITY_OPTIONS = [
  { id: 'instant', label: 'Instant Book', icon: (color: string) => <Zap size={18} color={color} /> },
  { id: 'today', label: 'Available Today', icon: (color: string) => <Clock size={18} color={color} /> },
  { id: 'tomorrow', label: 'Available Tomorrow', icon: (color: string) => <Calendar size={18} color={color} /> },
];

export function AvailabilitySortToolbar({
  availabilityFilter,
  onAvailabilityChange,
  sort,
  onSortChange,
  viewMode,
  onViewModeChange,
}: AvailabilitySortToolbarProps) {
  const { isDark } = useTheme();
  const [showAvailability, setShowAvailability] = useState(false);
  const [showSort, setShowSort] = useState(false);

  // Theme colors
  const primaryColor = '#FA5610';
  const bgColor = isDark ? '#1A1A1A' : '#FFFFFF';
  const borderColor = isDark ? 'rgba(255,255,255,0.1)' : '#E5E7EB';
  const textColor = isDark ? '#FFFFFF' : '#374151';
  const subtleTextColor = isDark ? '#9CA3AF' : '#6B7280';
  const toggleBgColor = isDark ? '#2A2A2A' : '#F3F4F6';
  const activeToggleBgColor = isDark ? '#1C1C1C' : '#FFFFFF';

  const getSortLabel = () => {
    const option = SORT_OPTIONS.find((o) => o.id === sort);
    return option?.label || 'Recommended';
  };

  const getAvailabilityLabel = () => {
    const option = AVAILABILITY_OPTIONS.find((o) => o.id === availabilityFilter);
    return option?.label || 'Availability';
  };

  return (
    <View
      style={{
        paddingHorizontal: 16,
        paddingVertical: 12,
        backgroundColor: bgColor,
        borderBottomWidth: 1,
        borderBottomColor: borderColor,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
        {/* Availability Dropdown */}
        <View style={{ flex: 1 }}>
          <Pressable
            onPress={() => setShowAvailability(true)}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 6,
              paddingVertical: 8,
              paddingHorizontal: 10,
              borderRadius: 10,
              backgroundColor: toggleBgColor,
            }}
          >
            <Clock size={16} color={subtleTextColor} />
            <Text
              style={{
                fontSize: 12,
                color: textColor,
                fontWeight: '500',
                flex: 1,
              }}
              numberOfLines={1}
            >
              {getAvailabilityLabel()}
            </Text>
            <ChevronDown size={14} color={subtleTextColor} />
          </Pressable>
        </View>

        {/* Availability Modal */}
        <Modal
          visible={showAvailability}
          transparent
          animationType="fade"
          onRequestClose={() => setShowAvailability(false)}
        >
          <Pressable
            style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' }}
            onPress={() => setShowAvailability(false)}
          >
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
              <Pressable
                style={{
                  backgroundColor: isDark ? '#1C1C1C' : '#FFFFFF',
                  borderRadius: 16,
                  width: 280,
                  overflow: 'hidden',
                }}
                onPress={(e) => e.stopPropagation()}
              >
                <View style={{ paddingVertical: 8 }}>
                  {AVAILABILITY_OPTIONS.map((option) => (
                    <Pressable
                      key={option.id}
                      onPress={() => {
                        onAvailabilityChange(option.id as 'instant' | 'today' | 'tomorrow');
                        setShowAvailability(false);
                      }}
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 12,
                        paddingHorizontal: 20,
                        paddingVertical: 14,
                        borderBottomWidth: 1,
                        borderBottomColor: isDark ? 'rgba(255,255,255,0.1)' : '#F3F4F6',
                      }}
                    >
                      {option.icon(availabilityFilter === option.id ? primaryColor : subtleTextColor)}
                      <Text
                        style={{
                          fontSize: 14,
                          flex: 1,
                          fontWeight: availabilityFilter === option.id ? '600' : '400',
                          color: availabilityFilter === option.id ? primaryColor : textColor,
                        }}
                      >
                        {option.label}
                      </Text>
                    </Pressable>
                  ))}

                  {/* Clear filter option */}
                  {availabilityFilter ? (
                    <Pressable
                      onPress={() => {
                        onAvailabilityChange(null);
                        setShowAvailability(false);
                      }}
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 12,
                        paddingHorizontal: 20,
                        paddingVertical: 14,
                      }}
                    >
                      <X size={18} color={subtleTextColor} />
                      <Text style={{ fontSize: 14, color: subtleTextColor }}>Clear</Text>
                    </Pressable>
                  ) : null}
                </View>
              </Pressable>
            </View>
          </Pressable>
        </Modal>

        {/* Sort Dropdown */}
        <View style={{ flex: 1 }}>
          <Pressable
            onPress={() => setShowSort(true)}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 6,
              paddingVertical: 8,
              paddingHorizontal: 10,
              borderRadius: 10,
              backgroundColor: toggleBgColor,
            }}
          >
            <Text
              style={{
                fontSize: 12,
                color: textColor,
                fontWeight: '500',
                flex: 1,
              }}
              numberOfLines={1}
            >
              {getSortLabel()}
            </Text>
            <ChevronDown size={14} color={subtleTextColor} />
          </Pressable>
        </View>

        {/* Sort Modal */}
        <Modal
          visible={showSort}
          transparent
          animationType="fade"
          onRequestClose={() => setShowSort(false)}
        >
          <Pressable
            style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' }}
            onPress={() => setShowSort(false)}
          >
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
              <Pressable
                style={{
                  backgroundColor: isDark ? '#1C1C1C' : '#FFFFFF',
                  borderRadius: 16,
                  width: 280,
                  maxHeight: 400,
                  overflow: 'hidden',
                }}
                onPress={(e) => e.stopPropagation()}
              >
                <ScrollView showsVerticalScrollIndicator={false}>
                  {SORT_OPTIONS.map((option) => (
                    <Pressable
                      key={option.id}
                      onPress={() => {
                        onSortChange(option.id);
                        setShowSort(false);
                      }}
                      style={{
                        paddingHorizontal: 20,
                        paddingVertical: 14,
                        borderBottomWidth: 1,
                        borderBottomColor: isDark ? 'rgba(255,255,255,0.1)' : '#F3F4F6',
                        backgroundColor: sort === option.id
                          ? isDark ? 'rgba(250, 86, 16, 0.15)' : '#FFF7ED'
                          : 'transparent',
                      }}
                    >
                      <Text
                        style={{
                          fontSize: 14,
                          fontWeight: sort === option.id ? '600' : '400',
                          color: sort === option.id ? primaryColor : textColor,
                        }}
                      >
                        {option.label}
                      </Text>
                    </Pressable>
                  ))}
                </ScrollView>
              </Pressable>
            </View>
          </Pressable>
        </Modal>

        {/* View Mode Toggle */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 4,
            backgroundColor: toggleBgColor,
            borderRadius: 10,
            padding: 4,
          }}
        >
          <Pressable
            onPress={() => onViewModeChange('grid')}
            style={{
              alignItems: 'center',
              justifyContent: 'center',
              paddingVertical: 8,
              paddingHorizontal: 12,
              borderRadius: 8,
              backgroundColor: viewMode === 'grid' ? activeToggleBgColor : 'transparent',
            }}
          >
            <Grid3x3 size={18} color={viewMode === 'grid' ? primaryColor : subtleTextColor} />
          </Pressable>
          <Pressable
            onPress={() => onViewModeChange('list')}
            style={{
              alignItems: 'center',
              justifyContent: 'center',
              paddingVertical: 8,
              paddingHorizontal: 12,
              borderRadius: 8,
              backgroundColor: viewMode === 'list' ? activeToggleBgColor : 'transparent',
            }}
          >
            <List size={18} color={viewMode === 'list' ? primaryColor : subtleTextColor} />
          </Pressable>
        </View>
      </View>
    </View>
  );
}
