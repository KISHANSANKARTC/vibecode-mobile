import React from 'react';
import { View, Text, Pressable } from 'react-native';

interface RangeSliderProps {
  min: number;
  max: number;
  value: number;
  step?: number;
  onChange: (value: number) => void;
}

export function RangeSlider({
  min,
  max,
  value,
  step = 1,
  onChange,
}: RangeSliderProps) {
  const percentage = ((value - min) / (max - min)) * 100;

  const handlePress = (e: any) => {
    const { locationX, width } = e.nativeEvent;
    const newPercentage = locationX / width;
    const newValue = min + newPercentage * (max - min);
    const roundedValue = Math.round(newValue / step) * step;
    onChange(Math.max(min, Math.min(max, roundedValue)));
  };

  return (
    <View className="gap-2">
      <Pressable onPress={handlePress} className="h-8 bg-gray-200 rounded-full">
        <View
          className="h-full bg-orange-500 rounded-full flex-row items-center justify-end pr-1"
          style={{ width: `${percentage}%` }}
        >
          <View className="w-5 h-5 bg-orange-600 rounded-full border-2 border-white" />
        </View>
      </Pressable>
      <Text className="text-xs text-gray-600 text-center">
        {value}
      </Text>
    </View>
  );
}
