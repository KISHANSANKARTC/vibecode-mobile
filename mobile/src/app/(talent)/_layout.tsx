import { Tabs, Stack, usePathname, router } from 'expo-router';
import { View, Pressable } from 'react-native';
import { Home, Briefcase, Image, MessageCircle, User } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeIn } from 'react-native-reanimated';
import { useTheme } from '@/lib/theme/ThemeContext';
import { ProtectedRoute } from '@/components/ProtectedRoute';

const NAV_ITEMS = [
  { icon: Home, route: '/(talent)', label: 'Home' },
  { icon: Briefcase, route: '/(talent)/jobs', label: 'Gigs' },
  { icon: Image, route: '/(talent)/portfolio', label: 'Portfolio' },
  { icon: MessageCircle, route: '/(talent)/messagesGroup', label: 'Messages' },
  { icon: User, route: '/(talent)/profile', label: 'Profile' },
] as const;

function FloatingNavBar() {
  const insets = useSafeAreaInsets();
  const pathname = usePathname();
  const { isDark } = useTheme();

  // Hide nav bar on detail/sub pages
  const isDetailPage = pathname.includes('/messages/') && pathname !== '/(talent)/messagesGroup';
  const isSubPage = pathname.includes('/profile/') && pathname !== '/(talent)/profile';
  const isInquiryThread = pathname.includes('/inquiry/');
  const isCaseStudyFlow = pathname.includes('/portfolio/new-case-study') || pathname.includes('/portfolio/case-study-editor');
  const isShareProfileFlow = pathname.includes('/share-profile');
  const isCategoriesFlow = pathname.includes('/categories') || pathname.includes('/categoriesspecialties');
  const isEditProfileFlow = pathname.includes('/editprofile');
  const isAccountTypeFlow = pathname.includes('/accounttype');
  const isMyReviewsFlow = pathname.includes('/myreviews');
  const isMediaFlow = pathname.includes('/media');
  const isManagePackagesFlow = pathname.includes('/managepackages');
  const isAvailabilityFlow = pathname.includes('/availability') || pathname.includes('/calendar');
  const isPayoutsFlow = pathname.includes('/payouts');
  const isSubscriptionFlow = pathname.includes('/subscription');
  const isJobDetailFlow = pathname.includes('/jobs/') && pathname !== '/(talent)/jobs';
  const isSupportFlow = pathname.includes('/support');

  if (isDetailPage || isSubPage || isInquiryThread || isCaseStudyFlow || isShareProfileFlow || isCategoriesFlow || isEditProfileFlow || isAccountTypeFlow || isMyReviewsFlow || isMediaFlow || isManagePackagesFlow || isAvailabilityFlow || isPayoutsFlow || isSubscriptionFlow || isSupportFlow) {
    return null;
  }

  // For job detail pages, only hide nav if not on chat tab
  if (isJobDetailFlow && !pathname.includes('tab=chat')) {
    return null;
  }

  const isActive = (route: string) => {
    if (route === '/(talent)') {
      return pathname === '/(talent)' || pathname === '/talent' || pathname === '/(talent)/index';
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
      <View
        style={{
          paddingTop: 8,
          paddingBottom: insets.bottom + 8,
          overflow: 'hidden',
          backgroundColor: isDark ? '#1A1A1A' : '#ffffff',
          borderTopWidth: 1,
          borderTopColor: isDark ? '#374151' : '#e5e7eb',
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: isDark ? 0.3 : 0.1,
          shadowRadius: 8,
          elevation: 8,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-around',
          paddingHorizontal: 8,
        }}
      >
        {NAV_ITEMS.map((item) => {
          const active = isActive(item.route);
          const Icon = item.icon;

          return (
            <Pressable
              key={item.route}
              onPress={() => router.push(item.route as never)}
              style={{
                width: 52,
                height: 52,
                borderRadius: 26,
                backgroundColor: active ? '#fa5610' : 'transparent',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Icon
                size={22}
                color={active ? '#ffffff' : isDark ? '#6b7280' : '#9CA3AF'}
                strokeWidth={active ? 2 : 1.5}
              />
            </Pressable>
          );
        })}
      </View>
    </Animated.View>
  );
}

function MessagesStack() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen name="messages" />
      <Stack.Screen name="messages/[id]" />
    </Stack>
  );
}

function NotificationsStack() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen name="notifications/feed" />
      <Stack.Screen name="notifications/settings" />
    </Stack>
  );
}

export default function TalentLayout() {
  return (
    <ProtectedRoute requiredRole="talent">
      <View style={{ flex: 1 }}>
        <Tabs
          screenOptions={{
            headerShown: false,
            tabBarStyle: {
              display: 'none',
            },
          }}
        >
          <Tabs.Screen
            name="index"
            options={{
              tabBarStyle: { display: 'none' },
            }}
          />
          <Tabs.Screen
            name="jobs"
            options={{
              tabBarStyle: { display: 'none' },
            }}
          />
          <Tabs.Screen
            name="portfolio"
            options={{
              tabBarStyle: { display: 'none' },
            }}
          />
          <Tabs.Screen
            name="messagesGroup"
            options={{
              tabBarStyle: { display: 'none' },
            }}
          />
          <Tabs.Screen
            name="payouts"
            options={{
              tabBarStyle: { display: 'none' },
            }}
          />
          <Tabs.Screen
            name="profile"
            options={{
              tabBarStyle: { display: 'none' },
            }}
          />
          <Tabs.Screen
            name="share-profile"
            options={{
              tabBarStyle: { display: 'none' },
            }}
          />
          <Tabs.Screen
            name="categories"
            options={{
              tabBarStyle: { display: 'none' },
            }}
          />
          <Tabs.Screen
            name="editprofile"
            options={{
              tabBarStyle: { display: 'none' },
            }}
          />
          <Tabs.Screen
            name="accounttype"
            options={{
              tabBarStyle: { display: 'none' },
            }}
          />
          <Tabs.Screen
            name="myreviews"
            options={{
              tabBarStyle: { display: 'none' },
            }}
          />
          <Tabs.Screen
            name="media"
            options={{
              tabBarStyle: { display: 'none' },
            }}
          />
          <Tabs.Screen
            name="managepackages"
            options={{
              tabBarStyle: { display: 'none' },
            }}
          />
          <Tabs.Screen
            name="availability"
            options={{
              tabBarStyle: { display: 'none' },
            }}
          />
          <Tabs.Screen
            name="subscription"
            options={{
              tabBarStyle: { display: 'none' },
            }}
          />
          <Tabs.Screen
            name="notifications"
            options={{
              tabBarStyle: { display: 'none' },
            }}
          />
          <Tabs.Screen
            name="support"
            options={{
              tabBarStyle: { display: 'none' },
            }}
          />
        </Tabs>
        <FloatingNavBar />
      </View>
    </ProtectedRoute>
  );
}
