import React, { useState, useCallback, useEffect, memo, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  Image,
  RefreshControl,
  Switch,
  Dimensions,
  Alert,
  Linking,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, useFocusEffect } from 'expo-router';
import { useFocusEffect as useNavigationFocusEffect } from '@react-navigation/native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import * as Location from 'expo-location';
import {
  Share2,
  Bell,
  ChevronRight,
  ChevronDown,
  Calendar,
  CheckCircle2,
  Circle,
  AlertCircle,
  TrendingUp,
  Eye,
  BarChart3,
  DollarSign,
  ArrowRight,
  ChevronUp,
  MapPin,
  Clock,
  Briefcase,
  Crown,
  Star,
  Settings,
  Lock,
} from 'lucide-react-native';
import { useTalentDashboard } from '@/hooks/useTalentDashboard';
import { useNotifications } from '@/hooks/useNotifications';
import { usePaymentNotifications } from '@/hooks/usePaymentNotifications';
import { useNotificationsStore } from '@/lib/state/notifications-store';
import { useTheme } from '@/lib/theme/ThemeContext';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/lib/state/auth-store';
import { SkeletonLoader } from '@/components/SkeletonLoader';
import { NotificationToast } from '@/components/NotificationToast';
import { extractErrorMessage } from '@/lib/errorUtils';

const SCREEN_WIDTH = Dimensions.get('window').width;

// Light theme colors
const COLORS_LIGHT = {
  foreground: '#171717', // Primary text (near-black)
  mutedForeground: '#737373', // Secondary text, labels
  cardBg: '#FFFFFF', // Card backgrounds
  pageBg: '#FAFAFA', // Page background
  border: 'rgba(235,235,235,0.4)', // Card borders (40% opacity)
  mutedBg: 'rgba(245,245,245,0.3)', // Stat boxes (30% opacity)
  accentOrange: '#FA5610', // Brand orange
  success: '#10B981', // Emerald green
  error: '#EF4444', // Red
  warning: '#F59E0B', // Amber
};

// Dark theme colors
const COLORS_DARK = {
  foreground: '#ffffff', // Primary text (white)
  mutedForeground: '#9ca3af', // Secondary text, labels
  cardBg: '#1A1A1A', // Card backgrounds (dark gray)
  pageBg: '#0A0A0A', // Page background (very dark)
  border: 'rgba(55,65,81,0.4)', // Card borders (40% opacity dark)
  mutedBg: 'rgba(30,30,30,0.3)', // Stat boxes (30% opacity dark)
  accentOrange: '#FA5610', // Brand orange (same)
  success: '#10B981', // Emerald green (same)
  error: '#EF4444', // Red (same)
  warning: '#F59E0B', // Amber (same)
};

// Get colors based on theme
function getColors(isDark: boolean) {
  return isDark ? COLORS_DARK : COLORS_LIGHT;
}

// Module-level COLORS that will be updated by TalentHomeScreen
let COLORS = COLORS_LIGHT;

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

function maskName(fullName: string | null | undefined): string {
  if (!fullName) return 'Anonymous';
  const parts = fullName.trim().split(/\s+/);
  if (parts.length === 1) return parts[0];
  const firstName = parts[0];
  const lastName = parts[parts.length - 1];
  return `${firstName} ${lastName.replace(/./g, '*')}`;
}

function getDayPillsFromSchedule(schedule: any[]): Array<{ day: number; date: Date; isToday: boolean; hasBooking: boolean }> {
  const today = new Date();
  const pills = [];

  // Create a map of dates with bookings
  const bookingDates = new Set<string>();
  schedule.forEach((booking) => {
    if (booking.date) {
      const date = new Date(booking.date);
      const dateStr = date.toDateString();
      bookingDates.add(dateStr);
    }
  });

  for (let i = 0; i < 7; i++) {
    const date = new Date(today);
    date.setDate(date.getDate() + i);
    const dateStr = date.toDateString();

    pills.push({
      day: date.getDate(),
      date,
      isToday: i === 0,
      hasBooking: bookingDates.has(dateStr),
    });
  }
  return pills;
}

// Payout Status Widget
// Memoized to prevent unnecessary re-renders when other dashboard state changes
const PayoutStatusWidget = memo(function PayoutStatusWidget({
  bankAccounts,
  monthlyEarnings,
}: {
  bankAccounts: any;
  monthlyEarnings: any;
}) {
  return (
    <Animated.View entering={FadeInDown.delay(350).duration(500)}>
      <View
        style={{
          borderRadius: 16,
          borderWidth: 1,
          borderColor: COLORS.border,
          backgroundColor: COLORS.cardBg,
          padding: 16,
          marginHorizontal: 16,
          marginBottom: 24,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.06,
          shadowRadius: 8,
          elevation: 3,
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <Text style={{ color: COLORS.foreground, fontSize: 14, fontWeight: '700' }}>PAYOUTS</Text>
          <Pressable
            onPress={() => router.push('/(talent)/payouts')}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}
          >
            <Text style={{ color: COLORS.mutedForeground, fontSize: 12, fontWeight: '600' }}>View history</Text>
            <ArrowRight size={14} color={COLORS.mutedForeground} />
          </Pressable>
        </View>

        <View style={{ flexDirection: 'row', gap: 12, marginBottom: 16 }}>
          <View
            style={{
              flex: 1,
              paddingHorizontal: 12,
              paddingVertical: 12,
              borderRadius: 10,
              backgroundColor: COLORS.mutedBg,
            }}
          >
            <Text style={{ color: COLORS.mutedForeground, fontSize: 11, fontWeight: '500', marginBottom: 4 }}>
              Available
            </Text>
            <Text style={{ color: COLORS.foreground, fontSize: 18, fontWeight: '700' }}>
              {monthlyEarnings.currency} {new Intl.NumberFormat('en-AE').format(Math.max(0, monthlyEarnings.earnings - monthlyEarnings.pending))}
            </Text>
          </View>

          <View
            style={{
              flex: 1,
              paddingHorizontal: 12,
              paddingVertical: 12,
              borderRadius: 10,
              backgroundColor: COLORS.mutedBg,
            }}
          >
            <Text style={{ color: COLORS.mutedForeground, fontSize: 11, fontWeight: '500', marginBottom: 4 }}>
              Pending
            </Text>
            <Text style={{ color: COLORS.accentOrange, fontSize: 18, fontWeight: '700' }}>
              {monthlyEarnings.currency} {new Intl.NumberFormat('en-AE').format(monthlyEarnings.pending)}
            </Text>
          </View>
        </View>

        {bankAccounts.primary ? (
          <Pressable
            onPress={() => router.push('/(talent)/payouts')}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingHorizontal: 12,
              paddingVertical: 12,
              borderRadius: 10,
              backgroundColor: 'rgba(16,185,129,0.1)',
              borderWidth: 1,
              borderColor: 'rgba(16,185,129,0.2)',
            }}
          >
            <View>
              <Text style={{ color: COLORS.foreground, fontSize: 11, fontWeight: '500' }}>
                {bankAccounts.primary.bank_name || 'Bank Account'}
              </Text>
              <Text style={{ color: COLORS.foreground, fontSize: 12, fontWeight: '600' }}>
                {bankAccounts.primary.iban ? `****${bankAccounts.primary.iban.slice(-4)}` : '****'}
              </Text>
            </View>
            <CheckCircle2 size={20} color={COLORS.success} />
          </Pressable>
        ) : (
          <Pressable
            onPress={() => router.push('/(talent)/payouts')}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingHorizontal: 12,
              paddingVertical: 12,
              borderRadius: 10,
              backgroundColor: 'rgba(245,158,11,0.1)',
              borderWidth: 1,
              borderColor: 'rgba(245,158,11,0.2)',
            }}
          >
            <Text style={{ color: COLORS.foreground, fontSize: 13, fontWeight: '600' }}>
              Add bank details
            </Text>
            <Pressable
              style={{
                paddingHorizontal: 10,
                paddingVertical: 6,
                borderRadius: 6,
                backgroundColor: 'rgba(0, 0, 0, 0.05)',
              }}
            >
              <Text style={{ color: '#D97706', fontSize: 12, fontWeight: '600' }}>Add →</Text>
            </Pressable>
          </Pressable>
        )}
      </View>
    </Animated.View>
  );
});

// Reputation Widget
// Memoized to prevent unnecessary re-renders
const ReputationWidget = memo(function ReputationWidget({
  reviews,
  averageRating,
}: {
  reviews: any[];
  averageRating: number;
}) {
  if (reviews.length === 0) {
    return (
      <Animated.View entering={FadeInDown.delay(375).duration(500)}>
        <View
          style={{
            borderRadius: 16,
            borderWidth: 1,
            borderColor: COLORS.border,
            backgroundColor: COLORS.cardBg,
            padding: 24,
            marginHorizontal: 16,
            marginBottom: 24,
            alignItems: 'center',
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.06,
            shadowRadius: 8,
            elevation: 3,
          }}
        >
          <Star size={32} color={COLORS.mutedForeground} style={{ marginBottom: 12 }} />
          <Text style={{ color: COLORS.mutedForeground, fontSize: 13, fontWeight: '500', textAlign: 'center' }}>
            Complete bookings to build your reputation
          </Text>
        </View>
      </Animated.View>
    );
  }

  // Mask last names for privacy: "John Smith" -> "John ***"
  const maskLastName = (name: string | null | undefined): string => {
    if (!name) return 'Client';
    const parts = name.trim().split(' ');
    if (parts.length <= 1) return name;
    return [...parts.slice(0, -1), '***'].join(' ');
  };

  const featuredReview = reviews.find((r) => r.comment && r.comment.length > 20);

  return (
    <Animated.View entering={FadeInDown.delay(375).duration(500)}>
      <View
        style={{
          borderRadius: 16,
          borderWidth: 1,
          borderColor: COLORS.border,
          backgroundColor: COLORS.cardBg,
          padding: 20,
          marginHorizontal: 16,
          marginBottom: 24,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.06,
          shadowRadius: 8,
          elevation: 3,
        }}
      >
        {featuredReview ? (
          <>
            <Text
              style={{
                color: COLORS.foreground,
                fontSize: 18,
                fontStyle: 'italic',
                fontWeight: '500',
                marginBottom: 16,
                lineHeight: 26,
              }}
            >
              "{featuredReview.comment}"
            </Text>
            <Text style={{ color: COLORS.mutedForeground, fontSize: 14, marginBottom: 16 }}>
              — {maskLastName(featuredReview.reviewer_name)}
            </Text>
          </>
        ) : null}

        <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 8, marginBottom: 16, paddingTop: 16, borderTopWidth: 1, borderTopColor: COLORS.border }}>
          <Text style={{ color: COLORS.foreground, fontSize: 24, fontWeight: '700' }}>
            {averageRating.toFixed(1)}
          </Text>
          <Text style={{ color: COLORS.mutedForeground, fontSize: 14 }}>/ 5</Text>
          <Text style={{ color: COLORS.mutedForeground, fontSize: 14 }}>from {reviews.length} client{reviews.length !== 1 ? 's' : ''}</Text>
        </View>

        <Pressable
          onPress={() => router.push('/(talent)/myreviews')}
          style={{ flexDirection: 'row', alignItems: 'center', gap: 4, paddingTop: 16, borderTopWidth: 1, borderTopColor: COLORS.border }}
        >
          <Text style={{ color: COLORS.mutedForeground, fontSize: 14, fontWeight: '500' }}>View all reviews</Text>
          <ArrowRight size={14} color={COLORS.mutedForeground} />
        </Pressable>
      </View>
    </Animated.View>
  );
});

// Go Premium Card
// Memoized to prevent unnecessary re-renders
const GoPremiumCard = memo(function GoPremiumCard({
  isPremium,
  premiumEndDate,
}: {
  isPremium: boolean;
  premiumEndDate: string | null;
}) {
  if (isPremium) {
    const renewDate = premiumEndDate ? new Date(premiumEndDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Unknown';

    return (
      <Animated.View entering={FadeInDown.delay(400).duration(500)}>
        <View
          style={{
            borderRadius: 16,
            borderWidth: 1,
            borderColor: COLORS.border,
            backgroundColor: COLORS.cardBg,
            padding: 20,
            marginHorizontal: 16,
            marginBottom: 24,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.06,
            shadowRadius: 8,
            elevation: 3,
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 }}>
            <View
              style={{
                width: 48,
                height: 48,
                borderRadius: 24,
                backgroundColor: 'rgba(250,86,16,0.1)',
                justifyContent: 'center',
                alignItems: 'center',
              }}
            >
              <Crown size={24} color={COLORS.accentOrange} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ color: COLORS.foreground, fontSize: 16, fontWeight: '700' }}>Premium Active</Text>
              <View
                style={{
                  paddingHorizontal: 8,
                  paddingVertical: 2,
                  borderRadius: 4,
                  backgroundColor: 'rgba(16,185,129,0.1)',
                  marginTop: 4,
                  alignSelf: 'flex-start',
                }}
              >
                <Text style={{ color: COLORS.success, fontSize: 11, fontWeight: '600' }}>Active</Text>
              </View>
            </View>
          </View>

          <Text style={{ color: COLORS.mutedForeground, fontSize: 13, marginBottom: 16 }}>
            Renews {renewDate}
          </Text>

          <Pressable
            onPress={() => router.push('/(talent)/subscription')}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: COLORS.accentOrange,
              borderRadius: 10,
              paddingVertical: 12,
              gap: 8,
            }}
          >
            <Settings size={16} color="#ffffff" />
            <Text style={{ color: '#ffffff', fontSize: 14, fontWeight: '600' }}>Manage Subscription</Text>
          </Pressable>
        </View>
      </Animated.View>
    );
  }

  return (
    <Animated.View entering={FadeInDown.delay(400).duration(500)}>
      <View
        style={{
          borderRadius: 16,
          borderWidth: 1,
          borderColor: COLORS.border,
          backgroundColor: COLORS.cardBg,
          padding: 20,
          marginHorizontal: 16,
          marginBottom: 24,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.06,
          shadowRadius: 8,
          elevation: 3,
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 }}>
          <View
            style={{
              width: 48,
              height: 48,
              borderRadius: 24,
              backgroundColor: 'rgba(250,86,16,0.1)',
              justifyContent: 'center',
              alignItems: 'center',
            }}
          >
            <Crown size={24} color={COLORS.accentOrange} />
          </View>
          <Text style={{ color: COLORS.foreground, fontSize: 16, fontWeight: '700', flex: 1 }}>Go Premium</Text>
        </View>

        <View style={{ gap: 12, marginBottom: 16 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <CheckCircle2 size={18} color={COLORS.success} />
            <Text style={{ color: COLORS.foreground, fontSize: 13, flex: 1 }}>Featured on discovery</Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <CheckCircle2 size={18} color={COLORS.success} />
            <Text style={{ color: COLORS.foreground, fontSize: 13, flex: 1 }}>Priority in search</Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <CheckCircle2 size={18} color={COLORS.success} />
            <Text style={{ color: COLORS.foreground, fontSize: 13, flex: 1 }}>Verified badge</Text>
          </View>
        </View>

        <Pressable
          onPress={() => router.push('/(talent)/subscription')}
          style={{
            backgroundColor: COLORS.accentOrange,
            borderRadius: 10,
            paddingVertical: 12,
            alignItems: 'center',
            gap: 8,
          }}
        >
          <Text style={{ color: '#ffffff', fontSize: 14, fontWeight: '600' }}>Upgrade • AED 149/mo</Text>
        </Pressable>
      </View>
    </Animated.View>
  );
});

// Quick Actions Grid
// Memoized to prevent unnecessary re-renders
const QuickActionsGrid = memo(function QuickActionsGrid() {
  return (
    <Animated.View entering={FadeInDown.delay(425).duration(500)}>
      <View style={{ marginHorizontal: 16, marginBottom: 24, gap: 12 }}>
        <View style={{ flexDirection: 'row', gap: 12 }}>
          <Pressable
            onPress={() => router.push('/(talent)/portfolio')}
            style={{
              flex: 1,
              backgroundColor: COLORS.cardBg,
              borderWidth: 1,
              borderColor: COLORS.border,
              borderRadius: 16,
              padding: 16,
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 1 },
              shadowOpacity: 0.04,
              shadowRadius: 4,
              elevation: 2,
            }}
          >
            <Briefcase size={24} color={COLORS.accentOrange} style={{ marginBottom: 8 }} />
            <Text style={{ color: COLORS.foreground, fontSize: 14, fontWeight: '600', marginBottom: 4 }}>Portfolio</Text>
            <Text style={{ color: COLORS.mutedForeground, fontSize: 12 }}>Manage your work</Text>
          </Pressable>

          <Pressable
            onPress={() => router.push('/(talent)/calendar')}
            style={{
              flex: 1,
              backgroundColor: COLORS.cardBg,
              borderWidth: 1,
              borderColor: COLORS.border,
              borderRadius: 16,
              padding: 16,
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 1 },
              shadowOpacity: 0.04,
              shadowRadius: 4,
              elevation: 2,
            }}
          >
            <Calendar size={24} color={COLORS.accentOrange} style={{ marginBottom: 8 }} />
            <Text style={{ color: COLORS.foreground, fontSize: 14, fontWeight: '600', marginBottom: 4 }}>Calendar</Text>
            <Text style={{ color: COLORS.mutedForeground, fontSize: 12 }}>Set availability</Text>
          </Pressable>
        </View>
      </View>
    </Animated.View>
  );
});

// Weekly Schedule Widget
// Memoized to prevent unnecessary re-renders
const WeeklyScheduleWidget = memo(function WeeklyScheduleWidget({
  dayPills,
  weeklySchedule,
}: {
  dayPills: any[];
  weeklySchedule: any[];
}) {
  const bookingCount = dayPills.filter((p) => p.hasBooking).length;

  return (
    <Animated.View entering={FadeInDown.delay(450).duration(500)}>
      <View style={{ marginHorizontal: 16, marginBottom: 24 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <Text style={{ color: COLORS.foreground, fontSize: 14, fontWeight: '700' }}>
            THIS WEEK
          </Text>
          <Text style={{ color: COLORS.mutedForeground, fontSize: 12 }}>{bookingCount} booking{bookingCount !== 1 ? 's' : ''}</Text>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={{ marginHorizontal: -16 }}
          contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }}
        >
          {dayPills.map((pill: any, index: number) => (
            <View
              key={`day-pill-${pill.date || index}`}
              style={{
                alignItems: 'center',
                gap: 6,
              }}
            >
              <View
                style={{
                  paddingHorizontal: 12,
                  paddingVertical: 10,
                  borderRadius: 10,
                  backgroundColor: pill.isToday ? '#fa5610' : COLORS.mutedBg,
                  minWidth: 56,
                  alignItems: 'center',
                  shadowColor: pill.isToday ? '#fa5610' : 'transparent',
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.2,
                  shadowRadius: 4,
                  elevation: pill.isToday ? 4 : 0,
                }}
              >
                <Text
                  style={{
                    color: pill.isToday ? '#ffffff' : COLORS.foreground,
                    fontSize: 14,
                    fontWeight: '600',
                  }}
                >
                  {pill.day}
                </Text>
              </View>
              {pill.hasBooking ? (
                <View
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: 3,
                    backgroundColor: COLORS.accentOrange,
                  }}
                />
              ) : null}
            </View>
          ))}
        </ScrollView>

        {bookingCount === 0 && (
          <View
            style={{
              marginTop: 16,
              paddingVertical: 24,
              alignItems: 'center',
              backgroundColor: COLORS.mutedBg,
              borderRadius: 12,
              borderWidth: 1,
              borderColor: COLORS.border,
              gap: 8,
            }}
          >
            <Calendar size={32} color={COLORS.mutedForeground} />
            <Text style={{ color: COLORS.mutedForeground, fontSize: 13, fontWeight: '500' }}>
              No bookings this week
            </Text>
            <Pressable onPress={() => router.push('/(talent)/calendar')}>
              <Text style={{ color: COLORS.accentOrange, fontSize: 12, fontWeight: '600', marginTop: 4 }}>
                Update availability
              </Text>
            </Pressable>
          </View>
        )}
      </View>
    </Animated.View>
  );
});

// Header Component
// Fixed: Background image now displays correctly in dashboard
// Memoized to prevent full page re-renders when toggle state changes
const Header = memo(function Header({
  userProfile,
  talentProfile,
  onAvatarPress,
  onBellPress,
  onSharePress,
  instantBookEnabled,
  liveLocationEnabled,
  isAvailableToday,
  isAvailabilityUpdating,
  onInstantBookChange,
  onLiveLocationChange,
  onAvailabilityToggle,
  settingsExpanded,
  onToggleSettings,
  isVerified,
  totalJobs,
  unreadCount,
}: {
  userProfile: any;
  talentProfile: any;
  onAvatarPress: () => void;
  onBellPress: () => void;
  onSharePress: () => void;
  instantBookEnabled: boolean;
  liveLocationEnabled: boolean;
  isAvailableToday: boolean;
  isAvailabilityUpdating: boolean;
  onInstantBookChange: (value: boolean) => void;
  onLiveLocationChange: (value: boolean) => void;
  onAvailabilityToggle: () => void;
  settingsExpanded: boolean;
  onToggleSettings: () => void;
  isVerified: boolean;
  totalJobs: number;
  unreadCount: number;
}) {
  const insets = useSafeAreaInsets();
  const avatarUrl = userProfile?.avatar_url || talentProfile?.avatar_url;
  const fullName = userProfile?.full_name || talentProfile?.display_name || 'Talent';
  const firstName = fullName?.split(' ')[0] || 'Talent';

  // Debug logging for avatar

  return (
    <View style={{ pointerEvents: 'auto' }}>
      <Image
        source={{ uri: 'https://tghuqwogmnslvlbhchpu.supabase.co/storage/v1/render/image/public/portfolio/c55cbbab-bf71-4e9e-81e1-7897219d1281/279b3c49-9ea0-429c-83f0-5327682041b9/1770276281554-1.png?width=1200&height=1500&quality=85' }}
        style={{ position: 'absolute', top: 0, left: 0, width: Dimensions.get('window').width, height: 650, zIndex: 0 }}
        resizeMode="cover"
      />
      <View style={{ position: 'absolute', top: 0, left: 0, width: Dimensions.get('window').width, height: 650, backgroundColor: 'rgba(0, 0, 0, 0.35)', zIndex: 1 }} />

      <View style={{ paddingTop: insets.top, position: 'relative', zIndex: 10, paddingHorizontal: 16, paddingBottom: 32 }}>
        <Animated.View entering={FadeInDown.duration(500)} style={{ marginBottom: 20, paddingVertical: 12, zIndex: 10, position: 'relative' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <Pressable onPress={onAvatarPress}>
              {avatarUrl ? (
                <Image
                  source={{ uri: avatarUrl }}
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: 24,
                    borderWidth: 2,
                    borderColor: '#ffffff',
                  }}
                />
              ) : (
                <View
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: 24,
                    borderWidth: 2,
                    borderColor: '#ffffff',
                    backgroundColor: '#fa5610',
                    justifyContent: 'center',
                    alignItems: 'center',
                  }}
                >
                  <Text style={{ color: '#ffffff', fontSize: 18, fontWeight: '700' }}>
                    {firstName.charAt(0).toUpperCase()}
                  </Text>
                </View>
              )}
            </Pressable>

            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <Pressable
                onPress={onSharePress}
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 20,
                  backgroundColor: 'rgba(255, 255, 255, 0.1)',
                  justifyContent: 'center',
                  alignItems: 'center',
                }}
              >
                <Share2 size={18} color="#ffffff" />
              </Pressable>

              {/* Available/Away Toggle Button */}
              <Pressable
                onPress={() => {
                  onAvailabilityToggle();
                }}
                disabled={isAvailabilityUpdating}
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 20,
                  backgroundColor: isAvailableToday ? 'rgba(16, 185, 129, 0.3)' : 'rgba(107, 114, 128, 0.3)',
                  justifyContent: 'center',
                  alignItems: 'center',
                  borderWidth: 1,
                  borderColor: isAvailableToday ? 'rgba(16, 185, 129, 0.5)' : 'rgba(107, 114, 128, 0.5)',
                  opacity: isAvailabilityUpdating ? 0.5 : 1,
                }}
              >
                <View
                  style={{
                    width: 10,
                    height: 10,
                    borderRadius: 5,
                    backgroundColor: isAvailableToday ? '#10b981' : '#6b7280',
                  }}
                />
              </Pressable>

              <Pressable
                onPress={onBellPress}
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 20,
                  backgroundColor: 'rgba(255, 255, 255, 0.1)',
                  justifyContent: 'center',
                  alignItems: 'center',
                  position: 'relative',
                }}
              >
                <Bell size={18} color="#ffffff" />
                {unreadCount > 0 && (
                  <View
                    style={{
                      position: 'absolute',
                      top: 4,
                      right: 4,
                      width: 16,
                      height: 16,
                      borderRadius: 8,
                      backgroundColor: '#ef4444',
                      justifyContent: 'center',
                      alignItems: 'center',
                    }}
                  >
                    <Text style={{ color: '#ffffff', fontSize: 9, fontWeight: '700' }}>
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </Text>
                  </View>
                )}
              </Pressable>
            </View>
          </View>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(100).duration(500)} style={{ marginBottom: 16, zIndex: 10, position: 'relative' }}>
          <Text style={{ color: 'rgba(255, 255, 255, 0.6)', fontSize: 13, marginBottom: 4, fontWeight: '500' }}>
            {getGreeting()},
          </Text>
          <Text style={{ color: '#ffffff', fontSize: 40, fontWeight: '700', marginBottom: 12 }}>
            {firstName}
          </Text>

          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            {isVerified ? (
              <>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <Text style={{ color: '#10b981', fontSize: 12, fontWeight: '600' }}>✓ Verified</Text>
                </View>
                <Text style={{ color: 'rgba(255, 255, 255, 0.3)', fontSize: 12 }}>•</Text>
              </>
            ) : null}
            <Text style={{ color: 'rgba(255, 255, 255, 0.6)', fontSize: 12, fontWeight: '500' }}>
              New Talent
            </Text>
            <Text style={{ color: 'rgba(255, 255, 255, 0.3)', fontSize: 12 }}>•</Text>
            <Text style={{ color: 'rgba(255, 255, 255, 0.6)', fontSize: 12, fontWeight: '500' }}>
              {totalJobs} gig{totalJobs !== 1 ? 's' : ''}
            </Text>
          </View>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(150).duration(500)} style={{ marginBottom: 16, zIndex: 10, position: 'relative' }}>
          <Pressable
            onPress={onToggleSettings}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingHorizontal: 12,
              paddingVertical: 12,
              borderRadius: 12,
              backgroundColor: 'rgba(255, 255, 255, 0.08)',
              borderWidth: 1,
              borderColor: 'rgba(255, 255, 255, 0.12)',
            }}
          >
            <Text style={{ color: '#ffffff', fontSize: 13, fontWeight: '600' }}>Quick Settings</Text>
            {settingsExpanded ? (
              <ChevronUp size={16} color="#ffffff" />
            ) : (
              <ChevronDown size={16} color="#ffffff" />
            )}
          </Pressable>
        </Animated.View>

        {settingsExpanded ? (
          <Animated.View entering={FadeInDown.duration(150)} style={{ marginBottom: 20 }}>
            <View
              style={{
                backgroundColor: 'rgba(255, 255, 255, 0.05)',
                borderRadius: 12,
                borderWidth: 1,
                borderColor: 'rgba(255, 255, 255, 0.12)',
                padding: 12,
                gap: 12,
              }}
            >
              <Pressable
                onPress={() => {
                  onInstantBookChange(!instantBookEnabled);
                }}
                style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 8 }}
              >
                <Text style={{ color: '#ffffff', fontSize: 13, fontWeight: '500' }}>Available Now</Text>
                <Switch
                  value={instantBookEnabled}
                  onValueChange={(val) => {
                    onInstantBookChange(val);
                  }}
                  trackColor={{ false: 'rgba(255, 255, 255, 0.2)', true: '#fa5610' }}
                  thumbColor={instantBookEnabled ? '#ffffff' : '#d1d5db'}
                />
              </Pressable>

              <Pressable
                onPress={() => {
                  onLiveLocationChange(!liveLocationEnabled);
                }}
                style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 8 }}
              >
                <Text style={{ color: '#ffffff', fontSize: 13, fontWeight: '500' }}>Live Location</Text>
                <Switch
                  value={liveLocationEnabled}
                  onValueChange={(val) => {
                    onLiveLocationChange(val);
                  }}
                  trackColor={{ false: 'rgba(255, 255, 255, 0.2)', true: '#fa5610' }}
                  thumbColor={liveLocationEnabled ? '#ffffff' : '#d1d5db'}
                />
              </Pressable>
            </View>
          </Animated.View>
        ) : null}
      </View>
    </View>
  );
});

// Profile Completion Card
// Memoized to prevent unnecessary re-renders
const ProfileCompletionCard = memo(function ProfileCompletionCard({
  completion,
  onStepPress,
}: {
  completion: any;
  onStepPress: (href: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <Animated.View entering={FadeInDown.delay(200).duration(500)}>
      <Pressable
        onPress={() => setExpanded(!expanded)}
        style={{
          borderRadius: 16,
          borderWidth: 1,
          borderColor: COLORS.border,
          backgroundColor: COLORS.cardBg,
          padding: 16,
          marginHorizontal: 16,
          marginBottom: 20,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.06,
          shadowRadius: 8,
          elevation: 3,
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
          <View
            style={{
              width: 56,
              height: 56,
              borderRadius: 28,
              backgroundColor: COLORS.mutedBg,
              justifyContent: 'center',
              alignItems: 'center',
            }}
          >
            <Text style={{ color: COLORS.foreground, fontSize: 22, fontWeight: '700' }}>
              {completion.percentage}%
            </Text>
          </View>

          <View style={{ flex: 1 }}>
            <Text style={{ color: COLORS.foreground, fontSize: 14, fontWeight: '600', marginBottom: 4 }}>
              Complete Your Profile
            </Text>
            <Text style={{ color: COLORS.mutedForeground, fontSize: 12 }}>
              {completion.steps.filter((s: any) => s.completed).length} of {completion.steps.length}
            </Text>
          </View>

          {expanded ? (
            <ChevronUp size={20} color={COLORS.mutedForeground} />
          ) : (
            <ChevronRight size={20} color={COLORS.mutedForeground} />
          )}
        </View>

        <View style={{ marginTop: 16, marginBottom: expanded ? 16 : 0, height: 6, backgroundColor: COLORS.border, borderRadius: 3, overflow: 'hidden' }}>
          <View
            style={{
              height: '100%',
              width: `${completion.percentage}%`,
              backgroundColor: COLORS.foreground,
              borderRadius: 3,
            }}
          />
        </View>

        {expanded ? (
          <Animated.View entering={FadeInDown.duration(300)}>
            <View style={{ gap: 12, borderTopWidth: 1, borderTopColor: COLORS.border, paddingTop: 16 }}>
              {completion.steps.map((step: any) => (
                <Pressable
                  key={step.id}
                  onPress={() => onStepPress(step.href)}
                  disabled={step.completed}
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 12, opacity: step.completed ? 0.6 : 1 }}
                >
                  {step.completed ? (
                    <CheckCircle2 size={20} color={COLORS.success} />
                  ) : (
                    <Circle size={20} color={COLORS.border} />
                  )}
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: COLORS.foreground, fontSize: 13, fontWeight: '500' }}>
                      {step.label}
                      {step.count ? <Text style={{ color: COLORS.mutedForeground, fontSize: 12 }}> {step.count}</Text> : null}
                    </Text>
                  </View>
                </Pressable>
              ))}
            </View>
          </Animated.View>
        ) : null}
      </Pressable>
    </Animated.View>
  );
});

// Earnings Card
// Memoized to prevent unnecessary re-renders
const EarningsCard = memo(function EarningsCard({ earnings, replyRate, talentProfile }: { earnings: any; replyRate: number; talentProfile: any }) {
  // Calculate trend percentage: ((this month - last month) / last month) * 100
  const calculateTrend = (): number => {
    if (!earnings.lastMonthEarnings || earnings.lastMonthEarnings === 0) {
      return earnings.earnings > 0 ? 100 : 0; // New earnings or no change
    }
    const trendPercent = ((earnings.earnings - earnings.lastMonthEarnings) / earnings.lastMonthEarnings) * 100;
    return Math.round(trendPercent);
  };

  const trend = calculateTrend();
  const isTrendPositive = trend >= 0;
  const rating = talentProfile?.rating || 0;

  return (
    <Animated.View entering={FadeInDown.delay(250).duration(500)}>
      <View
        style={{
          borderRadius: 16,
          borderWidth: 1,
          borderColor: COLORS.border,
          backgroundColor: COLORS.cardBg,
          padding: 20,
          marginHorizontal: 16,
          marginBottom: 24,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.06,
          shadowRadius: 8,
          elevation: 3,
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <Text style={{ color: COLORS.mutedForeground, fontSize: 11, fontWeight: '700', letterSpacing: 0.5 }}>
            THIS MONTH
          </Text>
          {earnings.earnings > 0 && (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <TrendingUp size={14} color={isTrendPositive ? COLORS.success : COLORS.error} />
              <Text style={{ color: isTrendPositive ? COLORS.success : COLORS.error, fontSize: 12, fontWeight: '600' }}>
                {isTrendPositive ? '+' : ''}{trend}% vs last month
              </Text>
            </View>
          )}
        </View>

        <Text style={{ color: COLORS.foreground, fontSize: 30, fontWeight: '700', marginBottom: 20 }}>
          AED {new Intl.NumberFormat('en-AE').format(earnings.earnings)}
        </Text>

        <View style={{ flexDirection: 'row', gap: 12 }}>
          <View style={{ flex: 1, alignItems: 'center', backgroundColor: COLORS.mutedBg, paddingVertical: 12, borderRadius: 8 }}>
            <Text style={{ color: COLORS.foreground, fontSize: 18, marginBottom: 6, fontWeight: '600' }}>
              {earnings.bookingsCount}
            </Text>
            <Text style={{ color: COLORS.mutedForeground, fontSize: 12, fontWeight: '600' }}>Bookings</Text>
          </View>
          <View
            style={{
              flex: 1,
              alignItems: 'center',
              backgroundColor: COLORS.mutedBg,
              paddingVertical: 12,
              borderRadius: 8,
            }}
          >
            <Text style={{ color: COLORS.foreground, fontSize: 18, marginBottom: 6, fontWeight: '600' }}>
              {rating > 0 ? rating.toFixed(1) : '—'}
            </Text>
            <Text style={{ color: COLORS.mutedForeground, fontSize: 12, fontWeight: '600' }}>
              Rating
            </Text>
          </View>
          <View style={{ flex: 1, alignItems: 'center', backgroundColor: COLORS.mutedBg, paddingVertical: 12, borderRadius: 8 }}>
            <Text style={{ color: COLORS.foreground, fontSize: 18, marginBottom: 6, fontWeight: '600' }}>
              {replyRate}%
            </Text>
            <Text style={{ color: COLORS.mutedForeground, fontSize: 12, fontWeight: '600' }}>Reply rate</Text>
          </View>
        </View>
      </View>
    </Animated.View>
  );
});

// Action Required Card
// Memoized to prevent unnecessary re-renders
const ActionRequiredCard = memo(function ActionRequiredCard({
  requests,
  onAccept,
  onDecline,
  onViewAll,
}: {
  requests: any[];
  onAccept: (id: string) => void;
  onDecline: (id: string) => void;
  onViewAll: () => void;
}) {
  const user = useAuthStore((state) => state.user);
  const [isVerified, setIsVerified] = useState(false);
  const [hasBankAccount, setHasBankAccount] = useState(false);
  const [talentProfileId, setTalentProfileId] = useState<string | null>(null);
  const [loadingVerification, setLoadingVerification] = useState(true);

  // Fetch talent profile ID and verification status
  useEffect(() => {
    const fetchVerificationStatus = async () => {
      if (!user?.id) {
        setLoadingVerification(false);
        return;
      }

      try {
        setLoadingVerification(true);

        // Fetch talent profile ID
        const { data: talentProfile } = await supabase
          .from('talent_profiles')
          .select('id')
          .eq('user_id', user.id)
          .maybeSingle();

        if (!talentProfile?.id) {
          setLoadingVerification(false);
          return;
        }

        setTalentProfileId(talentProfile.id);

        // Check talent verification
        const { data: talentVerification } = await supabase
          .from('talent_verifications')
          .select('status')
          .eq('talent_id', talentProfile.id)
          .eq('status', 'approved')
          .maybeSingle();

        if (talentVerification) {
          setIsVerified(true);
          setLoadingVerification(false);
          return;
        }

        // Check client verification as fallback
        const { data: clientVerification } = await supabase
          .from('client_verifications')
          .select('status')
          .eq('user_id', user.id)
          .eq('status', 'approved')
          .maybeSingle();

        if (clientVerification) {
          setIsVerified(true);
          setLoadingVerification(false);
          return;
        }

        // Check client companies
        const { data: clientCompanies } = await supabase
          .from('client_companies')
          .select('verification_status')
          .eq('user_id', user.id)
          .eq('verification_status', 'verified')
          .maybeSingle();

        setIsVerified(!!clientCompanies);

        // Check for bank account
        const { data: bankAccount } = await supabase
          .from('talent_payout_methods')
          .select('id')
          .eq('talent_id', talentProfile.id)
          .maybeSingle();

        setHasBankAccount(!!bankAccount);

        setLoadingVerification(false);
      } catch (err) {
        console.error('[ActionRequiredCard] Error fetching verification:', err);
        setLoadingVerification(false);
      }
    };

    fetchVerificationStatus();
  }, [user?.id]);

  if (requests.length === 0) return null;

  return (
    <Animated.View entering={FadeInDown.delay(275).duration(500)}>
      <View style={{ marginHorizontal: 16, marginBottom: 24 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 }}>
          <AlertCircle size={18} color="#fa5610" />
          <Text style={{ color: COLORS.foreground, fontSize: 14, fontWeight: '700' }}>Action Required</Text>
          <View
            style={{
              paddingHorizontal: 8,
              paddingVertical: 4,
              borderRadius: 6,
              backgroundColor: 'rgba(250, 86, 16, 0.1)',
            }}
          >
            <Text style={{ color: '#fa5610', fontSize: 11, fontWeight: '600' }}>
              {requests.length}
            </Text>
          </View>
        </View>

        {requests.slice(0, 2).map((request) => {
          const booking = request.booking;
          const scheduledStart = booking?.scheduled_start ? new Date(booking.scheduled_start) : null;
          const scheduledEnd = booking?.scheduled_end ? new Date(booking.scheduled_end) : null;

          // Format date and time - match required format: Wed, Jan 11
          const formatDate = (date: Date | null) => {
            if (!date) return 'TBD';
            // Returns format like "Wed, Jan 11"
            const parts = date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }).split(' ');
            return parts.join(', ');
          };

          const formatTime = (date: Date | null) => {
            if (!date) return 'TBD';
            // Format time as HH:MM AM/PM
            return date.toLocaleTimeString('en-US', {
              hour: 'numeric',
              minute: '2-digit',
              hour12: true
            });
          };


          const blockerMessage = !isVerified
            ? 'Complete ID verification to accept this booking'
            : !hasBankAccount
            ? 'Please add bank details to receive payments'
            : null;

          const handleAcceptPress = () => {
            if (blockerMessage) {
              const navigateTo = !isVerified ? '/(talent)/verifyidentity' : '/(talent)/payouts';
              const message = blockerMessage;
              Alert.alert(
                !isVerified ? 'ID Verification Required' : 'Bank Account Required',
                message,
                [
                  { text: 'Cancel', style: 'cancel' },
                  {
                    text: !isVerified ? 'Verify Now' : 'Add Bank Details',
                    onPress: () => router.push(navigateTo as any),
                    style: 'default',
                  },
                ]
              );
              return;
            }
            onAccept(request.id);
          };

          return (
            <View
              key={request.id}
              style={{
                backgroundColor: COLORS.cardBg,
                borderRadius: 12,
                borderWidth: 1,
                borderColor: COLORS.border,
                padding: 16,
                marginBottom: 12,
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 1 },
                shadowOpacity: 0.04,
                shadowRadius: 4,
                elevation: 2,
              }}
            >
              {/* Client info header */}
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                {request.clientAvatar ? (
                  <Image
                    source={{ uri: request.clientAvatar }}
                    style={{
                      width: 48,
                      height: 48,
                      borderRadius: 12,
                    }}
                  />
                ) : (
                  <View
                    style={{
                      width: 48,
                      height: 48,
                      borderRadius: 12,
                      backgroundColor: COLORS.mutedBg,
                      justifyContent: 'center',
                      alignItems: 'center',
                    }}
                  >
                    <Text style={{ fontSize: 18, fontWeight: '700', color: COLORS.foreground }}>
                      {request.clientName?.charAt(0) || 'C'}
                    </Text>
                  </View>
                )}
                <View style={{ flex: 1 }}>
                  <Text style={{ color: COLORS.foreground, fontSize: 14, fontWeight: '600' }}>Booking Request</Text>
                  <Text style={{ color: COLORS.mutedForeground, fontSize: 12 }}>{request.clientName || 'Client'}</Text>
                </View>
              </View>

              {/* Verification warning banner */}
              {blockerMessage && !loadingVerification ? (
                <View
                  style={{
                    marginBottom: 16,
                    paddingHorizontal: 12,
                    paddingVertical: 10,
                    borderRadius: 8,
                    backgroundColor: !isVerified
                      ? 'rgba(239, 68, 68, 0.1)'  // Red tint
                      : 'rgba(245, 158, 11, 0.1)', // Amber tint
                    borderLeftWidth: 3,
                    borderLeftColor: !isVerified ? '#EF4444' : '#F59E0B',
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 8,
                  }}
                >
                  <AlertCircle
                    size={14}
                    color={!isVerified ? '#EF4444' : '#F59E0B'}
                  />
                  <Text
                    style={{
                      color: !isVerified ? '#EF4444' : '#F59E0B',
                      fontSize: 12,
                      fontWeight: '500',
                      flex: 1,
                    }}
                  >
                    {blockerMessage}
                  </Text>
                </View>
              ) : null}

              {/* Details grid - 2x2 */}
              <View style={{ gap: 12, marginBottom: 16 }}>
                <View style={{ flexDirection: 'row', gap: 12 }}>
                  {/* Date */}
                  <View style={{ flex: 1, backgroundColor: COLORS.mutedBg, borderRadius: 12, padding: 12 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                      <Calendar size={14} color={COLORS.mutedForeground} />
                      <Text style={{ color: COLORS.mutedForeground, fontSize: 10 }}>Date</Text>
                    </View>
                    <Text style={{ color: COLORS.foreground, fontSize: 13, fontWeight: '600' }}>
                      {formatDate(scheduledStart)}
                    </Text>
                  </View>

                  {/* Time */}
                  <View style={{ flex: 1, backgroundColor: COLORS.mutedBg, borderRadius: 12, padding: 12 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                      <Clock size={14} color={COLORS.mutedForeground} />
                      <Text style={{ color: COLORS.mutedForeground, fontSize: 10 }}>Time</Text>
                    </View>
                    <Text style={{ color: COLORS.foreground, fontSize: 13, fontWeight: '600' }}>
                      {formatTime(scheduledStart)}
                    </Text>
                  </View>
                </View>

                <View style={{ flexDirection: 'row', gap: 12 }}>
                  {/* Location */}
                  <View style={{ flex: 1, backgroundColor: COLORS.mutedBg, borderRadius: 12, padding: 12 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                      <MapPin size={14} color={COLORS.mutedForeground} />
                      <Text style={{ color: COLORS.mutedForeground, fontSize: 10 }}>Location</Text>
                    </View>
                    <Text style={{ color: COLORS.foreground, fontSize: 13, fontWeight: '600' }} numberOfLines={1}>
                      {request.location || 'TBD'}
                    </Text>
                  </View>

                  {/* Total Amount */}
                  <View style={{ flex: 1, backgroundColor: COLORS.mutedBg, borderRadius: 12, padding: 12 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                      <DollarSign size={14} color={COLORS.mutedForeground} />
                      <Text style={{ color: COLORS.mutedForeground, fontSize: 10 }}>Total Amount</Text>
                    </View>
                    <Text style={{ color: COLORS.foreground, fontSize: 13, fontWeight: '700' }}>
                      {request.currency} {request.amount.toLocaleString()}
                    </Text>
                  </View>
                </View>
              </View>

              {/* Role category badge */}
              {request.role_category ? (
                <View style={{ marginBottom: 16 }}>
                  <View
                    style={{
                      alignSelf: 'flex-start',
                      paddingHorizontal: 12,
                      paddingVertical: 6,
                      borderRadius: 16,
                      backgroundColor: 'rgba(250, 86, 16, 0.1)',
                    }}
                  >
                    <Text style={{ color: '#fa5610', fontSize: 11, fontWeight: '600' }}>
                      {request.role_category}
                    </Text>
                  </View>
                </View>
              ) : null}

              {/* Decline / Accept buttons */}
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <Pressable
                  onPress={() => onDecline(request.id)}
                  style={{
                    flex: 1,
                    paddingVertical: 10,
                    borderRadius: 8,
                    borderWidth: 1,
                    borderColor: COLORS.error,
                    alignItems: 'center',
                  }}
                >
                  <Text style={{ color: COLORS.error, fontSize: 12, fontWeight: '600' }}>Decline</Text>
                </Pressable>
                <Pressable
                  onPress={handleAcceptPress}
                  style={{
                    flex: 1,
                    paddingVertical: 10,
                    borderRadius: 8,
                    backgroundColor: blockerMessage ? '#d1d5db' : COLORS.success,
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexDirection: 'row',
                    gap: 6,
                    opacity: blockerMessage ? 0.6 : 1,
                  }}
                >
                  {blockerMessage ? <Lock size={14} color="#6b7280" /> : null}
                  <Text style={{ color: blockerMessage ? '#4b5563' : '#ffffff', fontSize: 12, fontWeight: '600' }}>
                    Accept
                  </Text>
                </Pressable>
              </View>
            </View>
          );
        })}

        {requests.length > 2 ? (
          <Pressable
            onPress={onViewAll}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 4,
              paddingVertical: 8,
            }}
          >
            <Text style={{ color: '#fa5610', fontSize: 12, fontWeight: '600' }}>
              +{requests.length - 2} more requests
            </Text>
            <ArrowRight size={14} color="#fa5610" />
          </Pressable>
        ) : null}
      </View>
    </Animated.View>
  );
});

// This Week Card
// Memoized to prevent unnecessary re-renders
const ThisWeekCard = memo(function ThisWeekCard({ dayPills, onUpdateAvailability }: { dayPills: any[]; onUpdateAvailability?: () => void }) {
  const bookingCount = dayPills.filter((p) => p.hasBooking).length;

  return (
    <Animated.View entering={FadeInDown.delay(300).duration(500)}>
      <View style={{ marginHorizontal: 16, marginBottom: 24 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <Text style={{ color: COLORS.foreground, fontSize: 14, fontWeight: '700' }}>
            THIS WEEK
          </Text>
          <Text style={{ color: COLORS.mutedForeground, fontSize: 12 }}>{bookingCount} booking{bookingCount !== 1 ? 's' : ''}</Text>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={{ marginHorizontal: -16 }}
          contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }}
        >
          {dayPills.map((pill: any, index: number) => (
            <View
              key={`day-pill-${pill.date || index}`}
              style={{
                alignItems: 'center',
                gap: 6,
              }}
            >
              <View
                style={{
                  paddingHorizontal: 12,
                  paddingVertical: 10,
                  borderRadius: 10,
                  backgroundColor: pill.isToday ? '#fa5610' : COLORS.mutedBg,
                  minWidth: 56,
                  alignItems: 'center',
                  shadowColor: pill.isToday ? '#fa5610' : 'transparent',
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.2,
                  shadowRadius: 4,
                  elevation: pill.isToday ? 4 : 0,
                }}
              >
                <Text
                  style={{
                    color: pill.isToday ? '#ffffff' : COLORS.foreground,
                    fontSize: 14,
                    fontWeight: '600',
                  }}
                >
                  {pill.day}
                </Text>
              </View>
              {pill.hasBooking ? (
                <View
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: 3,
                    backgroundColor: COLORS.accentOrange,
                  }}
                />
              ) : null}
            </View>
          ))}
        </ScrollView>

        {bookingCount === 0 && (
          <View
            style={{
              marginTop: 16,
              paddingVertical: 24,
              alignItems: 'center',
              backgroundColor: COLORS.mutedBg,
              borderRadius: 12,
              borderWidth: 1,
              borderColor: COLORS.border,
              gap: 8,
            }}
          >
            <Calendar size={32} color={COLORS.mutedForeground} />
            <Text style={{ color: COLORS.mutedForeground, fontSize: 13, fontWeight: '500' }}>
              No bookings this week
            </Text>
            {onUpdateAvailability ? (
              <Pressable onPress={onUpdateAvailability}>
                <Text style={{ color: COLORS.accentOrange, fontSize: 12, fontWeight: '600', marginTop: 4 }}>
                  Update availability
                </Text>
              </Pressable>
            ) : null}
          </View>
        )}
      </View>
    </Animated.View>
  );
});

// Search Visibility Card
// Memoized to prevent unnecessary re-renders
const SearchVisibilityCard = memo(function SearchVisibilityCard({ visibilityScore, profileViews, bookingsCount, reliabilityScore, responseTimeHours }: { visibilityScore: number; profileViews: number; bookingsCount: number; reliabilityScore: number; responseTimeHours?: number }) {
  const getBarColor = (score: number) => {
    if (score >= 80) return COLORS.success; // Emerald
    if (score >= 50) return COLORS.accentOrange; // Orange (NOT purple)
    return COLORS.error; // Red
  };

  return (
    <Animated.View entering={FadeInDown.delay(325).duration(500)}>
      <View
        style={{
          borderRadius: 16,
          borderWidth: 1,
          borderColor: COLORS.border,
          backgroundColor: COLORS.cardBg,
          padding: 16,
          marginHorizontal: 16,
          marginBottom: 24,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.06,
          shadowRadius: 8,
          elevation: 3,
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <Text style={{ color: COLORS.foreground, fontSize: 14, fontWeight: '700' }}>SEARCH VISIBILITY</Text>
          <Pressable onPress={() => router.push('/(talent)/editprofile')}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <Text style={{ color: COLORS.mutedForeground, fontSize: 12, fontWeight: '600' }}>Edit</Text>
              <ArrowRight size={14} color={COLORS.mutedForeground} />
            </View>
          </Pressable>
        </View>

        <View
          style={{
            height: 10,
            backgroundColor: COLORS.mutedBg,
            borderRadius: 5,
            overflow: 'hidden',
            marginBottom: 12,
          }}
        >
          <View
            style={{
              height: '100%',
              width: `${visibilityScore}%`,
              backgroundColor: getBarColor(visibilityScore),
              borderRadius: 5,
            }}
          />
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <Text style={{ color: COLORS.mutedForeground, fontSize: 12 }}>Profile visibility</Text>
          <Text style={{ color: COLORS.foreground, fontSize: 18, fontWeight: '700' }}>
            {visibilityScore}%
          </Text>
        </View>

        <View style={{ flexDirection: 'row', gap: 12 }}>
          <View style={{ flex: 1, alignItems: 'center', backgroundColor: COLORS.mutedBg, paddingVertical: 12, borderRadius: 8 }}>
            <Eye size={16} color={COLORS.mutedForeground} style={{ marginBottom: 4 }} />
            <Text style={{ color: COLORS.foreground, fontSize: 16, fontWeight: '600', marginBottom: 2 }}>
              {profileViews}
            </Text>
            <Text style={{ color: COLORS.mutedForeground, fontSize: 11 }}>Views</Text>
          </View>
          <View style={{ flex: 1, alignItems: 'center', backgroundColor: COLORS.mutedBg, paddingVertical: 12, borderRadius: 8 }}>
            <BarChart3 size={16} color={COLORS.mutedForeground} style={{ marginBottom: 4 }} />
            <Text style={{ color: COLORS.foreground, fontSize: 16, fontWeight: '600', marginBottom: 2 }}>
              {Math.round(reliabilityScore)}%
            </Text>
            <Text style={{ color: COLORS.mutedForeground, fontSize: 11 }}>Reliability</Text>
          </View>
          <View style={{ flex: 1, alignItems: 'center', backgroundColor: COLORS.mutedBg, paddingVertical: 12, borderRadius: 8 }}>
            <Briefcase size={16} color={COLORS.mutedForeground} style={{ marginBottom: 4 }} />
            <Text style={{ color: COLORS.foreground, fontSize: 16, fontWeight: '600', marginBottom: 2 }}>
              {bookingsCount}
            </Text>
            <Text style={{ color: COLORS.mutedForeground, fontSize: 11 }}>Bookings</Text>
          </View>
        </View>

        {responseTimeHours !== undefined && (
          <View style={{ marginTop: 12, alignItems: 'center', gap: 6 }}>
            <Text style={{ color: COLORS.mutedForeground, fontSize: 12 }}>
              Avg. response: {responseTimeHours < 1 ? '<1h' : `${Math.floor(responseTimeHours)}h${Math.round((responseTimeHours % 1) * 60) ? Math.round((responseTimeHours % 1) * 60) + 'm' : ''}`}
            </Text>
            {responseTimeHours <= 2 && (
              <Text style={{ color: COLORS.success, fontSize: 12, fontWeight: '600' }}>
                • Fast responder
              </Text>
            )}
          </View>
        )}
      </View>
    </Animated.View>
  );
});

// Payouts Card
// Memoized to prevent unnecessary re-renders
const PayoutsCard = memo(function PayoutsCard({ bankAccounts, monthlyEarnings }: { bankAccounts: any; monthlyEarnings: any }) {
  return (
    <Animated.View entering={FadeInDown.delay(350).duration(500)}>
      <View
        style={{
          borderRadius: 16,
          borderWidth: 1,
          borderColor: COLORS.border,
          backgroundColor: COLORS.cardBg,
          padding: 16,
          marginHorizontal: 16,
          marginBottom: 24,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.06,
          shadowRadius: 8,
          elevation: 3,
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <Text style={{ color: COLORS.foreground, fontSize: 14, fontWeight: '700' }}>PAYOUTS</Text>
          <Pressable>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <Text style={{ color: '#fa5610', fontSize: 12, fontWeight: '600' }}>View history</Text>
              <ArrowRight size={14} color="#fa5610" />
            </View>
          </Pressable>
        </View>

        <View style={{ flexDirection: 'row', gap: 12, marginBottom: 16 }}>
          <View
            style={{
              flex: 1,
              paddingHorizontal: 12,
              paddingVertical: 12,
              borderRadius: 10,
              backgroundColor: COLORS.mutedBg,
              borderWidth: 1,
              borderColor: COLORS.border,
            }}
          >
            <Text style={{ color: COLORS.mutedForeground, fontSize: 11, fontWeight: '500', marginBottom: 4 }}>
              Available
            </Text>
            <Text style={{ color: COLORS.foreground, fontSize: 16, fontWeight: '700' }}>
              {monthlyEarnings.currency} {Math.max(0, monthlyEarnings.earnings - monthlyEarnings.pending).toLocaleString()}
            </Text>
          </View>

          <View
            style={{
              flex: 1,
              paddingHorizontal: 12,
              paddingVertical: 12,
              borderRadius: 10,
              backgroundColor: COLORS.mutedBg,
              borderWidth: 1,
              borderColor: COLORS.border,
            }}
          >
            <Text style={{ color: COLORS.mutedForeground, fontSize: 11, fontWeight: '500', marginBottom: 4 }}>
              Pending
            </Text>
            <Text style={{ color: COLORS.accentOrange, fontSize: 16, fontWeight: '700' }}>
              {monthlyEarnings.currency} {monthlyEarnings.pending.toLocaleString()}
            </Text>
          </View>
        </View>

        {bankAccounts.primary ? (
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingHorizontal: 12,
              paddingVertical: 12,
              borderRadius: 10,
              backgroundColor: 'rgba(16,185,129,0.1)',
              borderWidth: 1,
              borderColor: 'rgba(16,185,129,0.2)',
            }}
          >
            <View>
              <Text style={{ color: COLORS.foreground, fontSize: 11, fontWeight: '500' }}>
                {bankAccounts.primary.bank_name || 'Bank Account'}
              </Text>
              <Text style={{ color: COLORS.foreground, fontSize: 12, fontWeight: '600' }}>
                {bankAccounts.primary.iban ? `****${bankAccounts.primary.iban.slice(-4)}` : '****'}
              </Text>
            </View>
            <CheckCircle2 size={20} color={COLORS.success} />
          </View>
        ) : (
          <Pressable
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingHorizontal: 12,
              paddingVertical: 12,
              borderRadius: 10,
              backgroundColor: 'rgba(245,158,11,0.1)',
              borderWidth: 1,
              borderColor: 'rgba(245,158,11,0.2)',
            }}
          >
            <Text style={{ color: COLORS.foreground, fontSize: 13, fontWeight: '600' }}>
              Add bank details
            </Text>
            <Pressable
              style={{
                paddingHorizontal: 10,
                paddingVertical: 6,
                borderRadius: 6,
                backgroundColor: 'rgba(0, 0, 0, 0.05)',
              }}
            >
              <Text style={{ color: COLORS.foreground, fontSize: 12, fontWeight: '600' }}>Add →</Text>
            </Pressable>
          </Pressable>
        )}
      </View>
    </Animated.View>
  );
});

export default function TalentHomeScreen() {
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const [settingsExpanded, setSettingsExpanded] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string>('');
  const [paymentNotification, setPaymentNotification] = useState<any>(null);
  const [showPaymentToast, setShowPaymentToast] = useState(false);

  // Force re-render when theme changes
  const [themeKey, setThemeKey] = useState(0);

  // Update module-level COLORS and trigger re-render when theme changes
  useEffect(() => {
    const isDark = theme === 'dark';
    COLORS = getColors(isDark);
    setThemeKey(prev => prev + 1);
  }, [theme]);

  // Dynamic colors based on theme
  const isDark = theme === 'dark';
  const bgColor = isDark ? '#0A0A0A' : '#ffffff';

  const dashboard = useTalentDashboard();
  const notifications = useNotifications();
  const user = useAuthStore((s) => s.user);
  const unreadNotificationsCount = useNotificationsStore((s) => s.unreadCount);
  const fetchUnreadCount = useNotificationsStore((s) => s.fetchUnreadCount);

  // Set up real-time payment notifications
  usePaymentNotifications((payment) => {
    setPaymentNotification(payment);
    setShowPaymentToast(true);
  });
  const {
    profile,
    talentProfile,
    monthlyEarnings,
    replyRate,
    reviews,
    pendingRequests,
    weeklySchedule,
    profileCompletion,
    visibilityScore,
    profileViews,
    totalJobs,
    bankAccounts,
    totalBookings,
    isLoading,
    refetch,
  } = dashboard;

  const [instantBookEnabled, setInstantBookEnabled] = useState<boolean>(false);
  const [liveLocationEnabled, setLiveLocationEnabled] = useState<boolean>(false);
  const [isAvailableToday, setIsAvailableToday] = useState<boolean>(true);
  const [isAvailabilityUpdating, setIsAvailabilityUpdating] = useState<boolean>(false);
  const [isPremium, setIsPremium] = useState<boolean>(false);
  const [premiumEndDate, setPremiumEndDate] = useState<string | null>(null);

  // Refetch on screen focus
  useFocusEffect(
    useCallback(() => {
      refetch();
      checkPremiumStatus();
      // Fetch unread notifications count
      fetchUnreadCount();
    }, [refetch, fetchUnreadCount])
  );

  const checkPremiumStatus = useCallback(async () => {
    try {
      const result = await supabase.functions.invoke('check-premium-subscription');
      if (result.data) {
        setIsPremium(result.data.subscribed === true);
        setPremiumEndDate(result.data.subscription_end || null);
      }
    } catch (err) {
      const errorMsg = extractErrorMessage(err);
      console.error('Error checking premium status:', errorMsg);
    }
  }, []);

  // Sync toggle states with dashboard data when it loads
  useEffect(() => {
    if (talentProfile?.instant_book_master_enabled !== undefined) {
      setInstantBookEnabled(talentProfile.instant_book_master_enabled);
    }
  }, [talentProfile?.id, talentProfile?.instant_book_master_enabled]);

  useEffect(() => {
    if (talentProfile?.live_location_enabled !== undefined) {
      setLiveLocationEnabled(talentProfile.live_location_enabled);
    }
  }, [talentProfile?.id, talentProfile?.live_location_enabled]);

  useEffect(() => {
    if (talentProfile?.is_available !== undefined) {
      setIsAvailableToday(talentProfile.is_available ?? true);
    }
  }, [talentProfile?.id, talentProfile?.is_available]);

  // Sync avatar from talent_profiles to profiles if missing
  useEffect(() => {
    const syncAvatar = async () => {
      if (!user?.id) return;

      // If talent profile has avatar but profile doesn't, sync it
      const talentAvatar = talentProfile?.avatar_url;
      const profileAvatar = profile?.avatar_url;

      if (talentAvatar && !profileAvatar) {
        try {
          await supabase
            .from('profiles')
            .update({ avatar_url: talentAvatar })
            .eq('id', user.id);
        } catch (err) {
          console.warn('[TalentHome] Failed to sync avatar:', extractErrorMessage(err));
        }
      }
    };

    syncAvatar();
  }, [user?.id, talentProfile?.avatar_url, profile?.avatar_url]);

  // Set up real-time notifications subscription
  useEffect(() => {
    if (!user?.id) return;


    const channel = supabase
      .channel(`notifications:${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          // Increment unread count in store
          useNotificationsStore.setState((state) => ({
            unreadCount: state.unreadCount + 1,
          }));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id]);

  const dayPills = getDayPillsFromSchedule(weeklySchedule);

  const handleInstantBookChange = useCallback(
    async (value: boolean) => {

      try {
        if (!talentProfile?.id) {
          console.error('handleInstantBookChange: No talent profile ID');
          setToastMessage('Error: Profile ID missing');
          return;
        }

        // Update local state IMMEDIATELY
        setInstantBookEnabled(value);

        // Then update database in background
        const { error, data } = await supabase
          .from('talent_profiles')
          .update({ instant_book_master_enabled: value })
          .eq('id', talentProfile.id)
          .select();


        if (error) {
          console.error('Database error:', extractErrorMessage(error));
          setInstantBookEnabled(!value); // Revert on error
          setToastMessage('Failed to save to database');
        } else {
          setToastMessage(value ? 'Instant booking enabled' : 'Instant booking disabled');
        }
      } catch (err) {
        console.error('Error in handleInstantBookChange:', err);
        setInstantBookEnabled(!value); // Revert on error
        setToastMessage('Error updating setting');
      }
    },
    [talentProfile?.id]
  );

  const handleLiveLocationChange = useCallback(
    async (value: boolean) => {

      try {
        if (!talentProfile?.id) {
          console.error('handleLiveLocationChange: No talent profile ID');
          setToastMessage('Error: Profile ID missing');
          return;
        }

        if (value) {
          // Requesting to enable live location - request permission first
          const { status } = await Location.requestForegroundPermissionsAsync();

          if (status !== 'granted') {
            console.warn('Location permission not granted');
            setToastMessage('Location permission required');
            return;
          }
        }

        // Update local state IMMEDIATELY
        setLiveLocationEnabled(value);

        // Then update database in background
        const { error, data } = await supabase
          .from('talent_profiles')
          .update({ live_location_enabled: value })
          .eq('id', talentProfile.id)
          .select();


        if (error) {
          console.error('Database error:', extractErrorMessage(error));
          setLiveLocationEnabled(!value); // Revert on error
          setToastMessage('Failed to save to database');
        } else {
          setToastMessage(value ? 'Live location enabled' : 'Live location disabled');
        }
      } catch (err) {
        console.error('Error in handleLiveLocationChange:', err);
        setLiveLocationEnabled(!value); // Revert on error
        setToastMessage('Error updating setting');
      }
    },
    [talentProfile?.id]
  );

  const handleAvailabilityToggle = useCallback(
    async () => {

      // Early exit conditions
      if (!talentProfile?.id) {
        console.error('No talent profile ID');
        setToastMessage('Error: Profile ID missing');
        return;
      }

      if (isAvailabilityUpdating) {
        console.warn('Already updating, ignoring click');
        return;
      }

      const newValue = !isAvailableToday;

      setIsAvailabilityUpdating(true);

      try {
        // Update database in background
        const { error } = await supabase
          .from('talent_profiles')
          .update({
            is_available: newValue,
            updated_at: new Date().toISOString()
          })
          .eq('id', talentProfile.id);

        if (error) {
          console.error('Database error:', extractErrorMessage(error));
          // Revert on error
          setIsAvailableToday(!newValue);
          setToastMessage('Failed to update availability');
          return;
        }

        // Update UI after successful database update
        setIsAvailableToday(newValue);
        setToastMessage(newValue ? 'You are now available' : 'You are now away');
      } catch (err) {
        console.error('Error in handleAvailabilityToggle:', err);
        // Revert on error
        setIsAvailableToday(!newValue);
        setToastMessage('Error updating availability');
      } finally {
        setIsAvailabilityUpdating(false);
      }
    },
    [talentProfile?.id, isAvailableToday]
  );

  const handleAcceptRequest = useCallback(
    async (id: string) => {
      try {
        const { error } = await supabase
          .from('booking_talents')
          .update({ status: 'accepted', accepted_at: new Date().toISOString() })
          .eq('id', id);

        if (error) {
          setToastMessage('Failed to accept request');
        } else {
          setToastMessage('Request accepted');
          refetch();
        }
      } catch (err) {
        setToastMessage('Error accepting request');
      }
    },
    [refetch]
  );

  const handleDeclineRequest = useCallback(
    async (id: string) => {
      try {
        const { error } = await supabase
          .from('booking_talents')
          .update({ status: 'declined', declined_at: new Date().toISOString() })
          .eq('id', id);

        if (error) {
          setToastMessage('Failed to decline request');
        } else {
          setToastMessage('Request declined');
          refetch();
        }
      } catch (err) {
        setToastMessage('Error declining request');
      }
    },
    [refetch]
  );

  const handleProfileStepPress = useCallback((href: string) => {
    router.push(`/(talent)/${href}` as any);
  }, []);

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: bgColor }}>
        <ScrollView contentContainerStyle={{ flex: 1, justifyContent: 'center', padding: 16 }} scrollEnabled={false}>
          <SkeletonLoader width="100%" height={180} borderRadius={16} style={{ marginBottom: 20 }} />
          <SkeletonLoader width="100%" height={120} borderRadius={16} style={{ marginBottom: 20 }} />
          <SkeletonLoader width="100%" height={100} borderRadius={16} style={{ marginBottom: 20 }} />
          <SkeletonLoader width="100%" height={100} borderRadius={16} />
        </ScrollView>
      </View>
    );
  }

  return (
    <View key={`theme-${themeKey}`} style={{ flex: 1, backgroundColor: bgColor }}>
      <ScrollView
        contentContainerStyle={{
          paddingBottom: insets.bottom + 100,
        }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={false}
            onRefresh={refetch}
            tintColor="#fa5610"
          />
        }
      >
        <Header
          userProfile={profile}
          talentProfile={talentProfile}
          onAvatarPress={() => router.push('/(talent)/profile')}
          onBellPress={() => {
            router.push('/(talent)/notifications');
          }}
          onSharePress={() =>
            router.push({
              pathname: '/(talent)/share-profile',
              params: {
                displayName: profile?.full_name || 'Talent',
                avatarUrl: profile?.avatar_url,
                category: talentProfile?.subcategories?.[0] || talentProfile?.category || 'Professional',
                location: talentProfile?.location_text || 'Worldwide',
                username: profile?.username,
                isVerified: talentProfile?.is_verified ? 'true' : 'false',
              },
            })
          }
          instantBookEnabled={instantBookEnabled}
          liveLocationEnabled={liveLocationEnabled}
          isAvailableToday={isAvailableToday}
          isAvailabilityUpdating={isAvailabilityUpdating}
          onInstantBookChange={handleInstantBookChange}
          onLiveLocationChange={handleLiveLocationChange}
          onAvailabilityToggle={handleAvailabilityToggle}
          settingsExpanded={settingsExpanded}
          onToggleSettings={() => setSettingsExpanded(!settingsExpanded)}
          isVerified={talentProfile?.is_verified || false}
          totalJobs={totalJobs}
          unreadCount={unreadNotificationsCount}
        />

        <ProfileCompletionCard
          completion={profileCompletion}
          onStepPress={handleProfileStepPress}
        />

        <EarningsCard earnings={monthlyEarnings} replyRate={replyRate} talentProfile={talentProfile} />

        <ActionRequiredCard
          requests={pendingRequests}
          onAccept={handleAcceptRequest}
          onDecline={handleDeclineRequest}
          onViewAll={() => router.push('/(talent)/jobs')}
        />

        <SearchVisibilityCard visibilityScore={visibilityScore} profileViews={profileViews} bookingsCount={totalBookings} reliabilityScore={talentProfile?.reliability_score || 0} responseTimeHours={talentProfile?.avg_response_time_hours || undefined} />

        <PayoutStatusWidget bankAccounts={bankAccounts} monthlyEarnings={monthlyEarnings} />

        <ReputationWidget reviews={reviews} averageRating={reviews.length > 0 ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length : 0} />

        <GoPremiumCard isPremium={isPremium} premiumEndDate={premiumEndDate} />

        <QuickActionsGrid />

        <WeeklyScheduleWidget dayPills={dayPills} weeklySchedule={weeklySchedule} />
      </ScrollView>

      {/* Payment Notification Toast */}
      <NotificationToast
        visible={showPaymentToast}
        type="payment"
        title="Payment Received! 💰"
        message={
          paymentNotification
            ? `You received $${paymentNotification.amount || 'payment'}`
            : 'A payment has been credited to your account'
        }
        duration={6000}
        onDismiss={() => {
          setShowPaymentToast(false);
          setPaymentNotification(null);
        }}
      />

      {toastMessage ? (
        <Animated.View
          entering={FadeInDown.duration(300)}
          style={{
            position: 'absolute',
            bottom: insets.bottom + 20,
            left: 16,
            right: 16,
            backgroundColor: '#111827',
            borderRadius: 12,
            padding: 16,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 12,
          }}
        >
          <Text style={{ color: '#ffffff', fontSize: 14, fontWeight: '500', flex: 1 }}>
            {toastMessage}
          </Text>
          <Pressable onPress={() => setToastMessage('')}>
            <Text style={{ color: '#fa5610', fontSize: 12, fontWeight: '600' }}>Dismiss</Text>
          </Pressable>
        </Animated.View>
      ) : null}
    </View>
  );
}
