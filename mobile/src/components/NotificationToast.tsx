import React, { useEffect } from 'react';
import { View, Text, Animated, StyleSheet, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/lib/theme/ThemeContext';

interface NotificationToastProps {
  visible: boolean;
  type: 'success' | 'error' | 'info' | 'payment';
  title: string;
  message?: string;
  duration?: number;
  onDismiss?: () => void;
}

export function NotificationToast({
  visible,
  type,
  title,
  message,
  duration = 5000,
  onDismiss,
}: NotificationToastProps) {
  const { isDark } = useTheme();
  const slideAnim = React.useRef(new Animated.Value(-100)).current;

  useEffect(() => {
    if (visible) {
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start();

      const timer = setTimeout(() => {
        Animated.timing(slideAnim, {
          toValue: -100,
          duration: 300,
          useNativeDriver: true,
        }).start(() => {
          onDismiss?.();
        });
      }, duration);

      return () => clearTimeout(timer);
    } else {
      slideAnim.setValue(-100);
    }
  }, [visible, duration, slideAnim, onDismiss]);

  if (!visible) return null;

  const getIconAndColor = () => {
    switch (type) {
      case 'success':
        return { icon: 'checkmark-circle', color: '#10b981' };
      case 'error':
        return { icon: 'alert-circle', color: '#ef4444' };
      case 'payment':
        return { icon: 'card', color: '#f59e0b' };
      default:
        return { icon: 'information-circle', color: '#3b82f6' };
    }
  };

  const { icon, color } = getIconAndColor();

  return (
    <Animated.View
      style={[
        styles.container,
        {
          transform: [{ translateY: slideAnim }],
        },
      ]}
    >
      <View
        style={[
          styles.toast,
          {
            backgroundColor: isDark ? '#1A1A1A' : '#ffffff',
            borderLeftColor: color,
            shadowColor: isDark ? '#000000' : '#000000',
          },
        ]}
      >
        <View
          style={[
            styles.iconBox,
            {
              backgroundColor: isDark ? `${color}20` : `${color}10`,
            },
          ]}
        >
          <Ionicons name={icon as any} size={24} color={color} />
        </View>

        <View style={styles.content}>
          <Text
            style={[
              styles.title,
              {
                color: isDark ? '#ffffff' : '#111827',
              },
            ]}
          >
            {title}
          </Text>
          {message ? (
            <Text
              style={[
                styles.message,
                {
                  color: isDark ? '#9ca3af' : '#6b7280',
                },
              ]}
            >
              {message}
            </Text>
          ) : null}
        </View>

        <View style={styles.closeIcon}>
          <Ionicons
            name="close-circle"
            size={20}
            color={isDark ? '#6b7280' : '#9ca3af'}
          />
        </View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 9999,
    paddingHorizontal: 12,
    paddingTop: Platform.OS === 'android' ? 10 : 0,
  },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    borderLeftWidth: 4,
    borderRadius: 12,
    padding: 12,
    marginTop: 8,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
    gap: 12,
  },
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  content: {
    flex: 1,
  },
  title: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 2,
  },
  message: {
    fontSize: 12,
    lineHeight: 16,
  },
  closeIcon: {
    flexShrink: 0,
  },
});
