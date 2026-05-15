import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  Pressable,
  FlatList,
  TextInput,
  Modal,
  SafeAreaView,
} from 'react-native';
import { ChevronDown, Search, Check, X } from 'lucide-react-native';

interface ChipOption {
  id: string;
  label: string;
  icon?: string;
}

interface ChipPickerProps {
  title: string;
  description?: string;
  options: ChipOption[];
  popularOptions?: string[];
  value: string | string[] | null;
  onChange: (value: string | string[] | null) => void;
  multiple?: boolean;
  maxInlineItems?: number;
  searchPlaceholder?: string;
  icon?: React.ReactNode;
  iconBgClass?: string;
}

export function ChipPicker({
  title,
  description,
  options,
  popularOptions = [],
  value,
  onChange,
  multiple = false,
  maxInlineItems = 5,
  searchPlaceholder = 'Search...',
  icon,
  iconBgClass = 'bg-gray-100',
}: ChipPickerProps) {
  const [showSheet, setShowSheet] = useState(false);
  const [searchText, setSearchText] = useState('');

  const popularItems = useMemo(
    () =>
      options.filter((opt) =>
        popularOptions.includes(opt.id)
      ).slice(0, maxInlineItems),
    [options, popularOptions, maxInlineItems]
  );

  const hasMore = popularOptions.length > maxInlineItems;
  const selectedCount = Array.isArray(value)
    ? value.length
    : value
      ? 1
      : 0;

  const filteredOptions = useMemo(
    () =>
      options.filter((opt) =>
        opt.label.toLowerCase().includes(searchText.toLowerCase())
      ),
    [options, searchText]
  );

  const isSelected = (id: string) => {
    if (Array.isArray(value)) return value.includes(id);
    return value === id;
  };

  const handleSelect = (id: string) => {
    if (multiple) {
      if (Array.isArray(value)) {
        onChange(
          value.includes(id)
            ? value.filter((v) => v !== id)
            : [...value, id]
        );
      } else {
        onChange(value ? [value, id] : [id]);
      }
    } else {
      onChange(isSelected(id) ? null : id);
    }
  };

  const handleApply = () => {
    setShowSheet(false);
    setSearchText('');
  };

  return (
    <View className="gap-2">
      {/* Inline Chips */}
      <View className="flex-row flex-wrap gap-2">
        {popularItems.map((item) => (
          <Pressable
            key={item.id}
            onPress={() => handleSelect(item.id)}
            className={`rounded-xl px-3 py-2 border ${
              isSelected(item.id)
                ? 'bg-orange-500 border-orange-500'
                : 'bg-white border-gray-200'
            }`}
          >
            <Text
              className={`text-xs font-medium ${
                isSelected(item.id) ? 'text-white' : 'text-gray-900'
              }`}
            >
              {item.label}
            </Text>
          </Pressable>
        ))}

        {hasMore ? (
          <Pressable
            onPress={() => setShowSheet(true)}
            className="rounded-xl px-3 py-2 border border-gray-200 bg-white flex-row items-center gap-1"
          >
            <Text className="text-xs font-medium text-gray-900">
              +{popularOptions.length - maxInlineItems} more
            </Text>
            <ChevronDown size={14} color="#6B7280" strokeWidth={2} />
          </Pressable>
        ) : null}
      </View>

      {/* Bottom Sheet Modal */}
      <Modal
        visible={showSheet}
        animationType="slide"
        transparent
        onRequestClose={() => setShowSheet(false)}
      >
        <SafeAreaView className="flex-1 bg-black/40">
          <View className="h-[85vh] bg-white rounded-t-3xl mt-auto flex flex-col">
            {/* Header */}
            <View className="px-4 py-4 border-b border-gray-200 flex-row items-center justify-between">
              <View className="flex-1">
                <Text className="text-lg font-semibold text-gray-900">
                  {title}
                </Text>
                {selectedCount > 0 ? (
                  <Text className="text-xs text-gray-500 mt-1">
                    {selectedCount} selected
                  </Text>
                ) : null}
              </View>
              <Pressable onPress={() => setShowSheet(false)}>
                <X size={24} color="#6B7280" strokeWidth={2} />
              </Pressable>
            </View>

            {/* Search Input */}
            <View className="px-4 py-3 border-b border-gray-200">
              <View className="flex-row items-center gap-2 bg-gray-100 rounded-lg px-3 py-2">
                <Search size={16} color="#9CA3AF" strokeWidth={2} />
                <TextInput
                  placeholder={searchPlaceholder}
                  value={searchText}
                  onChangeText={setSearchText}
                  placeholderTextColor="#9CA3AF"
                  className="flex-1 text-gray-900 text-sm"
                />
              </View>
            </View>

            {/* Options List */}
            <FlatList
              data={filteredOptions}
              keyExtractor={(item) => item.id}
              className="flex-1"
              contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 12 }}
              renderItem={({ item }) => (
                <Pressable
                  onPress={() => handleSelect(item.id)}
                  className="flex-row items-center gap-3 py-3 border-b border-gray-100"
                >
                  <View
                    className={`w-6 h-6 rounded-md border-2 items-center justify-center ${
                      isSelected(item.id)
                        ? 'bg-orange-500 border-orange-500'
                        : 'border-gray-300 bg-white'
                    }`}
                  >
                    {isSelected(item.id) ? (
                      <Check size={16} color="#FFF" strokeWidth={2} />
                    ) : null}
                  </View>
                  <Text className="flex-1 text-gray-900 text-sm">
                    {item.label}
                  </Text>
                </Pressable>
              )}
            />

            {/* Footer */}
            <View className="px-4 py-3 border-t border-gray-200 flex-row gap-3">
              <Pressable
                onPress={() => setShowSheet(false)}
                className="flex-1 py-3 rounded-lg bg-gray-100"
              >
                <Text className="text-gray-900 font-semibold text-center text-sm">
                  Cancel
                </Text>
              </Pressable>
              <Pressable
                onPress={handleApply}
                className="flex-1 py-3 rounded-lg bg-orange-500"
              >
                <Text className="text-white font-semibold text-center text-sm">
                  Apply
                </Text>
              </Pressable>
            </View>
          </View>
        </SafeAreaView>
      </Modal>
    </View>
  );
}
