import React, { useState, useRef } from 'react';
import { View, Text, Pressable, Dimensions, PanResponder, GestureResponderEvent } from 'react-native';

interface RangeSliderProps {
  min: number;
  max: number;
  step: number;
  minValue: number;
  maxValue: number;
  onMinChange: (value: number) => void;
  onMaxChange: (value: number) => void;
  currency?: string;
}

export function RangeSlider({
  min,
  max,
  step,
  minValue,
  maxValue,
  onMinChange,
  onMaxChange,
  currency = 'AED',
}: RangeSliderProps) {
  const [draggingMin, setDraggingMin] = useState(false);
  const [draggingMax, setDraggingMax] = useState(false);
  const sliderRef = useRef<View>(null);
  const trackHeight = 4;
  const thumbSize = 24;

  // Calculate positions based on values
  const minPercent = ((minValue - min) / (max - min)) * 100;
  const maxPercent = ((maxValue - min) / (max - min)) * 100;

  const handleSliderPress = (event: GestureResponderEvent, isMin: boolean) => {
    const { nativeEvent } = event;
    const x = nativeEvent.locationX;

    // Get the slider width from layout
    sliderRef.current?.measure((fx, fy, width) => {
      const percent = (x / width) * 100;
      const newValue = Math.round((min + (percent / 100) * (max - min)) / step) * step;

      if (isMin) {
        const constrainedValue = Math.max(min, Math.min(newValue, maxValue - step));
        onMinChange(constrainedValue);
      } else {
        const constrainedValue = Math.min(max, Math.max(newValue, minValue + step));
        onMaxChange(constrainedValue);
      }
    });
  };

  return (
    <View style={{ paddingHorizontal: 0 }}>
      {/* Slider Track */}
      <Pressable
        ref={sliderRef}
        onPress={(event) => {
          // Find nearest thumb to click
          const { nativeEvent } = event;
          const x = nativeEvent.locationX;
          sliderRef.current?.measure((fx, fy, width) => {
            const clickPercent = (x / width) * 100;
            const minDist = Math.abs(clickPercent - minPercent);
            const maxDist = Math.abs(clickPercent - maxPercent);
            if (minDist < maxDist) {
              handleSliderPress(event, true);
            } else {
              handleSliderPress(event, false);
            }
          });
        }}
        style={{
          marginVertical: 20,
          height: thumbSize + 16,
          justifyContent: 'center',
          paddingVertical: 8,
        }}
      >
        {/* Background track */}
        <View
          style={{
            height: trackHeight,
            backgroundColor: '#e5e7eb',
            borderRadius: 2,
            position: 'relative',
          }}
        />

        {/* Active range highlight */}
        <View
          style={{
            position: 'absolute',
            height: trackHeight,
            backgroundColor: '#fa5610',
            borderRadius: 2,
            top: '50%',
            marginTop: -trackHeight / 2,
            left: `${minPercent}%`,
            right: `${100 - maxPercent}%`,
          }}
        />

        {/* Min thumb */}
        <View
          style={{
            position: 'absolute',
            left: `${minPercent}%`,
            top: '50%',
            marginTop: -thumbSize / 2,
            marginLeft: -thumbSize / 2,
            width: thumbSize,
            height: thumbSize,
            borderRadius: thumbSize / 2,
            backgroundColor: '#ffffff',
            borderWidth: 2,
            borderColor: '#fa5610',
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.15,
            shadowRadius: 4,
            elevation: 3,
            zIndex: minValue > (min + max) / 2 ? 4 : 5,
          }}
        />

        {/* Max thumb */}
        <View
          style={{
            position: 'absolute',
            left: `${maxPercent}%`,
            top: '50%',
            marginTop: -thumbSize / 2,
            marginLeft: -thumbSize / 2,
            width: thumbSize,
            height: thumbSize,
            borderRadius: thumbSize / 2,
            backgroundColor: '#ffffff',
            borderWidth: 2,
            borderColor: '#fa5610',
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.15,
            shadowRadius: 4,
            elevation: 3,
            zIndex: maxValue <= (min + max) / 2 ? 4 : 5,
          }}
        />
      </Pressable>

      {/* Value display */}
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          gap: 12,
          marginTop: 8,
        }}
      >
        <View
          style={{
            flex: 1,
            backgroundColor: '#f3f4f6',
            borderRadius: 12,
            paddingHorizontal: 14,
            paddingVertical: 10,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Text style={{ fontSize: 11, color: '#6b7280', marginBottom: 4 }}>Min</Text>
          <Text style={{ fontSize: 16, fontWeight: '700', color: '#111827' }}>
            {currency} {minValue}
          </Text>
        </View>
        <View
          style={{
            flex: 1,
            backgroundColor: '#f3f4f6',
            borderRadius: 12,
            paddingHorizontal: 14,
            paddingVertical: 10,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Text style={{ fontSize: 11, color: '#6b7280', marginBottom: 4 }}>Max</Text>
          <Text style={{ fontSize: 16, fontWeight: '700', color: '#111827' }}>
            {currency} {maxValue >= max ? `${max}+` : maxValue}
          </Text>
        </View>
      </View>
    </View>
  );
}
