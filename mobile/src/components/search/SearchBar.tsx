import React, { useState, useRef } from 'react';
import {
  View,
  TextInput,
  Pressable,
  Text,
} from 'react-native';
import { Search, X } from 'lucide-react-native';
import { useTheme } from '@/lib/theme/ThemeContext';

interface SearchBarProps {
  placeholder?: string;
  value?: string;
  onChange?: (value: string) => void;
  onSearch?: () => void;
  onCategorySelect?: (categoryId: string) => void;
  onFilterClick?: () => void;
  showFilters?: boolean;
  showSearchButton?: boolean;
  className?: string;
  autoFocus?: boolean;
}

export function SearchBar({
  placeholder = 'Search talents...',
  value = '',
  onChange,
  onSearch,
  onCategorySelect,
  onFilterClick,
  showFilters = true,
  showSearchButton = false,
  autoFocus = false,
}: SearchBarProps) {
  const inputRef = useRef<TextInput>(null);
  const { isDark } = useTheme();

  // Theme colors
  const bgColor = isDark ? '#2A2A2A' : '#FFFFFF';
  const borderColor = isDark ? 'rgba(255,255,255,0.1)' : '#E5E7EB';
  const textColor = isDark ? '#FFFFFF' : '#111827';
  const placeholderColor = isDark ? '#6B7280' : '#9CA3AF';
  const iconColor = isDark ? '#9CA3AF' : '#9CA3AF';

  return (
    <View style={{ position: 'relative' }}>
      {/* Search Input Container - Dark Mode Support */}
      <View style={{ paddingHorizontal: 0, paddingVertical: 8 }}>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: bgColor,
            borderRadius: 12,
            borderWidth: 1,
            borderColor: borderColor,
            paddingHorizontal: 14,
            paddingVertical: 12,
          }}
        >
          <Search size={18} color={iconColor} strokeWidth={2} />
          <TextInput
            ref={inputRef}
            placeholder={placeholder}
            value={value}
            onChangeText={onChange}
            autoFocus={autoFocus}
            placeholderTextColor={placeholderColor}
            style={{
              flex: 1,
              color: textColor,
              fontSize: 15,
              marginLeft: 10,
              fontWeight: '400',
            }}
          />
          {value ? (
            <Pressable
              onPress={() => onChange?.('')}
              style={{
                padding: 4,
                borderRadius: 12,
                backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : '#F3F4F6',
              }}
            >
              <X size={16} color={iconColor} strokeWidth={2.5} />
            </Pressable>
          ) : null}
        </View>
      </View>
    </View>
  );
}
