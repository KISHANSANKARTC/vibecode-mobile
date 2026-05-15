import { View, Text, Pressable } from 'react-native';
import { extractErrorMessage } from '@/lib/errorUtils';
import { Stack, usePathname, router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Home, Search, Briefcase, MessageCircle, User } from 'lucide-react-native';
import { BlurView } from 'expo-blur';
import Animated, { FadeIn } from 'react-native-reanimated';
import { useState, useEffect, useCallback } from 'react';
import { useTheme } from '@/lib/theme/ThemeContext';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { useAuthStore } from '@/lib/state/auth-store';
import { supabase } from '@/lib/supabase';

const NAV_ITEMS = [
  { icon: Home, route: '/(client)', label: 'Home' },
  { icon: Search, route: '/(client)/search', label: 'Search' },
  { icon: Briefcase, route: '/(client)/bookings', label: 'Bookings', hasBadge: true },
  { icon: MessageCircle, route: '/(client)/messages', label: 'Messages' },
  { icon: User, route: '/(client)/profile', label: 'Profile' },
] as const;

function usePendingBookingsCount(): number {
  const userId = useAuthStore((s) => s.user?.id);
  const [count, setCount] = useState<number>(0);

  const fetchCount = useCallback(async () => {
    if (!userId) {
      setCount(0);
      return;
    }
    try {
      const { count: pendingCount, error } = await supabase
        .from('bookings')
        .select('id', { count: 'exact', head: true })
        .eq('client_id', userId)
        .in('status', ['pending', 'pending_acceptance', 'pending_payment']);

      if (!error && pendingCount != null) {
        setCount(pendingCount);
      }
    } catch {
      // Silently ignore fetch errors for badge count
    }
  }, [userId]);

  useEffect(() => {
    fetchCount();

    // Re-fetch every 30 seconds to keep badge current
    const interval = setInterval(fetchCount, 30000);
    return () => clearInterval(interval);
  }, [fetchCount]);

  return count;
}

function FloatingNavBar() {
  const insets = useSafeAreaInsets();
  const { isDark } = useTheme();
  const pathname = usePathname();
  const pendingBookingsCount = usePendingBookingsCount();

  // Hide nav bar on detail/sub pages
  const isTalentDetailPage = pathname.includes('/talent/');
  const isBookingDetailPage = pathname.includes('/bookings/') && pathname !== '/(client)/bookings';
  const isBookingCreatePage = pathname.includes('/booking/');
  const isMessageDetailPage = pathname.includes('/messages/') && pathname !== '/(client)/messages';
  const isShortlistPage = pathname.includes('/shortlist');
  const isNotificationsPage = pathname.includes('/notifications');
  const isProfileSubPage = pathname.includes('/profile/') && pathname !== '/(client)/profile';

  if (isTalentDetailPage || isBookingDetailPage || isBookingCreatePage || isMessageDetailPage || isShortlistPage || isNotificationsPage || isProfileSubPage) {
    return null;
  }

  const isActive = (route: string) => {
    if (route === '/(client)') {
      return pathname === '/(client)' || pathname === '/client' || pathname === '/(client)/index';
    }
    return pathname.startsWith(route);
  };

  return (
    <Animated.View
      entering={FadeIn.delay(300).duration(400)}
      className="absolute left-0 right-0"
      style={{
        bottom: 0,
      }}
    >
      <BlurView
        intensity={80}
        tint={isDark ? 'dark' : 'light'}
        className="flex-row items-center justify-around px-2"
        style={{
          paddingTop: 8,
          paddingBottom: insets.bottom + 8,
          overflow: 'hidden',
          backgroundColor: isDark ? 'rgba(26, 26, 26, 0.85)' : 'rgba(249, 249, 249, 0.62)',
          borderTopWidth: 1,
          borderTopColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(255, 255, 255, 0.5)',
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: isDark ? 0.3 : 0.1,
          shadowRadius: 8,
          elevation: 8,
        }}
      >
        {NAV_ITEMS.map((item) => {
          const active = isActive(item.route);
          const Icon = item.icon;

          return (
            <Pressable
              key={item.route}
              onPress={() => {
                try {
                  router.push(item.route as any);
                } catch (e) {
                  const errorMsg = extractErrorMessage(e);
                  console.error('Navigation error:', errorMsg);
                }
              }}
              className="items-center justify-center relative"
              style={{
                width: 52,
                height: 52,
                borderRadius: 26,
                backgroundColor: active ? '#FA5610' : 'transparent',
              }}
            >
              <Icon
                size={22}
                color={active ? '#FFFFFF' : '#6B7280'}
                strokeWidth={active ? 2 : 1.5}
              />
              {/* Badge for Bookings */}
              {'hasBadge' in item && item.hasBadge && pendingBookingsCount > 0 && !active ? (
                <View
                  className="absolute -top-0.5 -right-0.5 min-w-4 h-4 rounded-full bg-orange-500 items-center justify-center px-1"
                >
                  <Text className="text-white text-[10px] font-bold">
                    {pendingBookingsCount > 99 ? '99+' : pendingBookingsCount}
                  </Text>
                </View>
              ) : null}
            </Pressable>
          );
        })}
      </BlurView>
    </Animated.View>
  );
}

export default function ClientLayout() {
  const { isDark } = useTheme();

  return (
    <ProtectedRoute requiredRole="client">
      <View className="flex-1" style={{ backgroundColor: isDark ? '#0A0A0A' : '#F8F8F8' }}>
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: isDark ? '#0A0A0A' : '#F8F8F8' },
          }}
        >
          <Stack.Screen name="index" />
          <Stack.Screen name="search" />
          <Stack.Screen name="bookings" />
          <Stack.Screen name="messages" />
          <Stack.Screen name="messages/[id]" />
          <Stack.Screen name="chat/[id]" />
          <Stack.Screen name="profile" />
          <Stack.Screen name="talent/[id]" />
          <Stack.Screen name="bookings/[id]" />
          <Stack.Screen name="booking/new" />
          <Stack.Screen name="shortlist" />
          <Stack.Screen name="notifications" />
        </Stack>
        <FloatingNavBar />
      </View>
    </ProtectedRoute>
  );
}
