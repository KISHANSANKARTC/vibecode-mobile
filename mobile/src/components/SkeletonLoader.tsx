import React, { useEffect, useRef } from 'react';
import { View, ViewStyle, Animated } from 'react-native';

interface SkeletonLoaderProps {
  width?: number | string;
  height?: number | string;
  borderRadius?: number;
  style?: ViewStyle;
  isDark?: boolean;
}

export const SkeletonLoader: React.FC<SkeletonLoaderProps> = ({
  width = '100%',
  height = 16,
  borderRadius = 4,
  style,
  isDark = false,
}) => {
  const shimmerAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(shimmerAnim, {
          toValue: 1,
          duration: 1500,
          useNativeDriver: false,
        }),
        Animated.timing(shimmerAnim, {
          toValue: 0,
          duration: 1500,
          useNativeDriver: false,
        }),
      ])
    ).start();
  }, [shimmerAnim]);

  const opacity = shimmerAnim.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0.3, 0.7, 0.3],
  });

  const animatedStyle: any = {
    width: typeof width === 'string' ? width : width,
    height: typeof height === 'number' ? height : 16,
    borderRadius: typeof borderRadius === 'number' ? borderRadius : 4,
    backgroundColor: isDark ? '#374151' : '#e5e7eb',
    opacity,
  };

  return (
    <Animated.View
      style={[
        animatedStyle,
        style,
      ]}
    />
  );
};

// Skeleton variants for common layouts
export const ProfileSkeleton: React.FC = () => (
  <View className="flex-1 bg-white p-4">
    {/* Header skeleton */}
    <SkeletonLoader width={80} height={80} borderRadius={40} style={{ marginBottom: 16, alignSelf: 'center' }} />
    <SkeletonLoader width="60%" height={20} borderRadius={4} style={{ marginBottom: 8, alignSelf: 'center' }} />
    <SkeletonLoader width="40%" height={16} borderRadius={4} style={{ marginBottom: 24, alignSelf: 'center' }} />

    {/* Content sections */}
    {[1, 2, 3].map((i) => (
      <View key={i} style={{ marginBottom: 16 }}>
        <SkeletonLoader width="100%" height={12} borderRadius={4} style={{ marginBottom: 8 }} />
        <SkeletonLoader width="85%" height={12} borderRadius={4} />
      </View>
    ))}
  </View>
);

export const CardGridSkeleton: React.FC<{ count?: number }> = ({ count = 6 }) => (
  <View className="flex-1 bg-white p-4">
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
      {Array.from({ length: count }).map((_, i) => (
        <View key={i} style={{ width: '48%' }}>
          <SkeletonLoader width="100%" height={150} borderRadius={8} style={{ marginBottom: 8 }} />
          <SkeletonLoader width="80%" height={14} borderRadius={4} />
        </View>
      ))}
    </View>
  </View>
);

export const ListItemSkeleton: React.FC<{ count?: number; isDark?: boolean }> = ({ count = 5, isDark = false }) => (
  <View style={{ flex: 1, backgroundColor: isDark ? '#0A0A0A' : '#ffffff' }}>
    {Array.from({ length: count }).map((_, i) => (
      <View key={i} style={{ padding: 16, borderBottomWidth: 1, borderBottomColor: isDark ? '#374151' : '#f3f4f6' }}>
        <View style={{ flexDirection: 'row', gap: 12 }}>
          <SkeletonLoader width={48} height={48} borderRadius={24} isDark={isDark} />
          <View style={{ flex: 1 }}>
            <SkeletonLoader width="70%" height={16} borderRadius={4} style={{ marginBottom: 8 }} isDark={isDark} />
            <SkeletonLoader width="90%" height={12} borderRadius={4} isDark={isDark} />
          </View>
        </View>
      </View>
    ))}
  </View>
);

export const TableSkeleton: React.FC<{ count?: number; columns?: number }> = ({ count = 5, columns = 3 }) => (
  <View className="flex-1 bg-white p-4">
    {Array.from({ length: count }).map((_, i) => (
      <View key={i} style={{ flexDirection: 'row', gap: 8, marginBottom: 16 }}>
        {Array.from({ length: columns }).map((_, j) => (
          <View key={j} style={{ flex: 1 }}>
            <SkeletonLoader width="100%" height={16} borderRadius={4} />
          </View>
        ))}
      </View>
    ))}
  </View>
);

export const PortfolioGridSkeleton: React.FC<{ count?: number; isDark?: boolean }> = ({ count = 6, isDark = false }) => (
  <View style={{ flex: 1, backgroundColor: isDark ? '#0A0A0A' : '#ffffff', padding: 16 }}>
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
      {Array.from({ length: count }).map((_, i) => (
        <View key={i} style={{ width: '48%', aspectRatio: 1 }}>
          <SkeletonLoader width="100%" height="100%" borderRadius={8} isDark={isDark} />
        </View>
      ))}
    </View>
  </View>
);
