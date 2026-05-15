import { View, Text, ScrollView, Pressable, Image, RefreshControl, Dimensions, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import {
  Heart,
  Bell,
  Search,
  BadgeCheck,
  ChevronRight,
  RefreshCw,
  TrendingUp,
  Briefcase,
  Users,
  Star,
} from 'lucide-react-native';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { useState, useCallback, useEffect } from 'react';
import { router } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/lib/state/auth-store';
import { useNotificationsStore } from '@/lib/state/notifications-store';
import { extractErrorMessage } from '@/lib/errorUtils';
import { useTheme } from '@/lib/theme/ThemeContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { CardGridSkeleton, ListItemSkeleton } from '@/components/SkeletonLoader';

// Talent type interface
interface Talent {
  id: string;
  name: string;
  category: string;
  hourlyRate: number;
  rateType: 'hr' | 'day';
  avatar: string;
  isVerified: boolean;
  rating?: number;
  totalCompletedBookings?: number;
  createdAt?: string;
  lastBooked?: string;
}

// Default placeholder avatar
const PLACEHOLDER_AVATAR = 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&h=200&fit=crop';

// Helper to format category string
function formatCategory(category: string | null | undefined): string {
  // Handle null, undefined, empty string, or the string "null"
  if (!category || category === 'null' || category.trim() === '') return 'Creative';
  // Convert snake_case or lowercase to Title Case
  return category
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

const { height: SCREEN_HEIGHT, width: SCREEN_WIDTH } = Dimensions.get('window');
const HEADER_HEIGHT = SCREEN_HEIGHT * 0.62;

// Default placeholder avatar
const DEFAULT_AVATAR_URL = 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&h=200&fit=crop';

// Categories with local image assets and category IDs for navigation
const CATEGORIES = [
  { label: 'Photo/Video', categoryId: 'photographer', image: require('../../../assets/images/category-photographer.png') },
  { label: 'Models', categoryId: 'model', image: require('../../../assets/images/category-model.png') },
  { label: 'Influencer/UGC', categoryId: 'influencer', image: require('../../../assets/images/category-influencer.png') },
  { label: 'Drone Operators', categoryId: 'drone_operator', image: require('../../../assets/images/category-drone-operator.png') },
  { label: 'Makeup Artists', categoryId: 'makeup_artist', image: require('../../../assets/images/category-makeup-artist.png') },
  { label: 'Stylists', categoryId: 'stylist', image: require('../../../assets/images/category-stylist.png') },
  { label: 'Hair Stylists', categoryId: 'hair_stylist', image: require('../../../assets/images/category-hair-stylist.png') },
  { label: 'Editors', categoryId: 'editor', image: require('../../../assets/images/category-editor.png') },
  { label: 'Designers', categoryId: 'graphic_designer', image: require('../../../assets/images/category-graphic-designer.png') },
  { label: 'Directors', categoryId: 'creative_director', image: require('../../../assets/images/category-director.png') },
  { label: 'Marketing', categoryId: 'marketing_consultant', image: require('../../../assets/images/category-marketing-consultant.png') },
  { label: 'Music Producers', categoryId: 'music_producer', image: require('../../../assets/images/category-music-producer.png') },
];

// Fallback mock data in case Supabase fetch fails
const FALLBACK_BOOK_AGAIN: Talent = {
  id: '1',
  name: 'Amir Z',
  category: 'Photographer',
  avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&h=200&fit=crop',
  lastBooked: 'Feb 10, 2026',
  hourlyRate: 200,
  rateType: 'hr',
  isVerified: true,
};

const FALLBACK_RECOMMENDED: Talent[] = [
  { id: '1', name: 'Naveed', category: 'Photographer', hourlyRate: 500, rateType: 'hr', avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&h=200&fit=crop', isVerified: true },
  { id: '2', name: 'Asmaa', category: 'Photographer', hourlyRate: 850, rateType: 'hr', avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&h=200&fit=crop', isVerified: true },
  { id: '3', name: 'Alif Fahim', category: 'Photographer', hourlyRate: 450, rateType: 'hr', avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=200&h=200&fit=crop', isVerified: true },
  { id: '4', name: 'Omar', category: 'Photographer', hourlyRate: 400, rateType: 'hr', avatar: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=200&h=200&fit=crop', isVerified: true },
  { id: '5', name: 'marc a.', category: 'Photographer', hourlyRate: 700, rateType: 'hr', avatar: 'https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=200&h=200&fit=crop', isVerified: true },
  { id: '6', name: 'Zia ur', category: 'Photographer', hourlyRate: 2500, rateType: 'day', avatar: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=200&h=200&fit=crop', isVerified: true },
];

const FALLBACK_AVAILABLE: Talent[] = [
  { id: '7', name: 'Tariq', category: 'Photographer', hourlyRate: 2500, rateType: 'day', avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&h=200&fit=crop', isVerified: true },
  { id: '8', name: 'Heet', category: 'Editor', hourlyRate: 4000, rateType: 'hr', avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&h=200&fit=crop', isVerified: true },
  { id: '9', name: 'Maya', category: 'Stylist', hourlyRate: 400, rateType: 'hr', avatar: 'https://images.unsplash.com/photo-1534751516642-a1af1ef26a56?w=200&h=200&fit=crop', isVerified: false },
  { id: '10', name: 'Alex', category: 'Videographer', hourlyRate: 520, rateType: 'hr', avatar: 'https://images.unsplash.com/photo-1463453091185-61582044d556?w=200&h=200&fit=crop', isVerified: true },
];

const FALLBACK_TRENDING: Talent[] = [
  { id: '11', name: 'Amir Z', category: 'Photographer', hourlyRate: 200, rateType: 'hr', avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&h=200&fit=crop', isVerified: true, rating: 5.0 },
];

const FALLBACK_NEW: Talent[] = [
  { id: '16', name: 'Abdullah', category: 'Photographer', hourlyRate: 500, rateType: 'hr', avatar: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=200&h=200&fit=crop', isVerified: false },
  { id: '17', name: 'Saifu', category: 'Photographer', hourlyRate: 1000, rateType: 'day', avatar: 'https://images.unsplash.com/photo-1502823403499-6ccfcf4fb453?w=200&h=200&fit=crop', isVerified: true },
  { id: '18', name: 'Bishr', category: 'Photographer', hourlyRate: 300, rateType: 'hr', avatar: 'https://images.unsplash.com/photo-1463453091185-61582044d556?w=200&h=200&fit=crop', isVerified: false },
  { id: '19', name: 'Nina', category: 'Hair Stylist', hourlyRate: 320, rateType: 'hr', avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=200&h=200&fit=crop', isVerified: false },
];

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning,';
  if (hour < 18) return 'Good afternoon,';
  return 'Good evening,';
}

function UserAvatar({ avatarUrl, name }: { avatarUrl: string | null; name: string }) {
  const initials = name
    .split(' ')
    .map(w => w.charAt(0).toUpperCase())
    .slice(0, 2)
    .join('');

  return (
    <View className="w-20 h-20 rounded-full items-center justify-center" style={{ backgroundColor: '#FFD700' }}>
      {avatarUrl ? (
        <Image
          source={{ uri: avatarUrl }}
          style={{ width: 80, height: 80, borderRadius: 40 }}
        />
      ) : (
        <Text className="text-2xl font-bold text-gray-800">{initials || '?'}</Text>
      )}
      <View className="absolute bottom-0 right-0 w-4 h-4 rounded-full bg-green-500 border-2 border-white" />
    </View>
  );
}

// Section Header Component
function SectionHeader({ title, seeAll = true, onSeeAll, isDark = false }: { title: string; seeAll?: boolean; onSeeAll?: () => void; isDark?: boolean }) {
  return (
    <View className="flex-row items-center justify-between mb-4 px-4">
      <Text className="text-lg font-semibold" style={{ color: isDark ? '#FFFFFF' : '#1F2937' }}>{title}</Text>
      {seeAll ? (
        <Pressable onPress={onSeeAll}>
          <Text className="text-sm" style={{ color: isDark ? '#D1D5DB' : '#6B7280' }}>See all &gt;</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

// Dark Section Header
function DarkSectionHeader({ title, seeAll = true, onSeeAll }: { title: string; seeAll?: boolean; onSeeAll?: () => void }) {
  return (
    <View className="flex-row items-center justify-between mb-4 px-4">
      <Text className="text-white text-lg font-semibold">{title}</Text>
      {seeAll ? (
        <Pressable onPress={onSeeAll}>
          <Text className="text-white/80 text-sm">See all &gt;</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

// Timeline Booking Item
function TimelineItem({ item, isLast, isDark = false }: { item: { id: string; talentName: string; location: string; date: string; isToday: boolean }; isLast: boolean; isDark?: boolean }) {
  return (
    <Pressable
      className="flex-row items-start"
      onPress={() => router.push(`/(client)/bookings/${item.id}` as never)}
    >
      {/* Left column - Date */}
      <View className="w-14 items-end pr-3">
        <Text className={`text-xs font-medium ${item.isToday ? 'text-orange-500' : isDark ? 'text-gray-500' : 'text-gray-400'}`}>
          {item.date}
        </Text>
      </View>

      {/* Middle - Timeline dot and line */}
      <View className="items-center">
        <View
          className={`w-3 h-3 rounded-full ${item.isToday ? 'bg-orange-500' : isDark ? 'bg-gray-600' : 'bg-gray-300'}`}
        />
        {!isLast ? (
          <View className="w-0.5 h-12" style={{ backgroundColor: isDark ? '#374151' : '#E5E7EB' }} />
        ) : null}
      </View>

      {/* Right column - Content */}
      <View className="flex-1 flex-row items-center justify-between pl-3 pb-4">
        <View className="flex-1">
          <Text className="font-semibold text-sm" style={{ color: isDark ? '#FFFFFF' : '#1F2937' }}>{item.talentName}</Text>
          <Text className="text-xs mt-0.5" style={{ color: isDark ? '#9CA3AF' : '#9CA3AF' }}>{item.location}</Text>
        </View>
        <ChevronRight size={18} color="#9CA3AF" />
      </View>
    </Pressable>
  );
}

// Category Card with image background
function CategoryImageCard({ label, image, onPress }: { label: string; image: number | string; onPress?: () => void }) {
  const cardWidth = (SCREEN_WIDTH - 48) / 3;
  const [imageError, setImageError] = useState(false);

  return (
    <Pressable
      onPress={onPress}
      className="overflow-hidden"
      style={{
        width: cardWidth,
        aspectRatio: 1,
        borderRadius: 12,
        marginBottom: 12,
      }}
    >
      {!imageError ? (
        <Image
          source={typeof image === 'string' ? { uri: image } : image}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            width: '100%',
            height: '100%',
          }}
          resizeMode="cover"
          onError={() => setImageError(true)}
        />
      ) : (
        <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: '#1F2937' }} />
      )}
      <LinearGradient
        colors={['transparent', 'rgba(0,0,0,0.7)']}
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          height: '50%',
        }}
      />
      <View className="absolute bottom-2 left-2 right-2">
        <Text className="text-white text-xs font-medium" numberOfLines={2}>
          {label}
        </Text>
      </View>
    </Pressable>
  );
}

// Recommended Card (white card style)
function RecommendedCard({ talent, onPress, isDark = false }: { talent: Talent; onPress?: () => void; isDark?: boolean }) {
  const rateLabel = talent.rateType === 'day' ? '/day' : '/hr';
  return (
    <Pressable
      onPress={onPress}
      className="rounded-xl p-3 flex-row items-center"
      style={{
        backgroundColor: isDark ? '#1A1A1A' : '#FFFFFF',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: isDark ? 0.3 : 0.05,
        shadowRadius: 2,
        elevation: 1,
      }}
    >
      <Image
        source={{ uri: talent.avatar }}
        className="w-12 h-12 rounded-full"
        onError={() => {}}
      />
      <View className="flex-1 ml-3">
        <View className="flex-row items-center">
          <Text className="font-semibold text-sm" style={{ color: isDark ? '#FFFFFF' : '#1F2937' }} numberOfLines={1}>
            {talent.name}
          </Text>
          {talent.isVerified ? (
            <BadgeCheck size={14} color="#F97316" fill="#FFF7ED" className="ml-1" />
          ) : null}
        </View>
        <Text className="text-xs" style={{ color: isDark ? '#9CA3AF' : '#9CA3AF' }}>{talent.category}</Text>
        <Text className="text-orange-500 text-xs font-semibold mt-0.5">
          AED {talent.hourlyRate.toLocaleString()}{rateLabel}
        </Text>
      </View>
    </Pressable>
  );
}

// Available Today Card
function AvailableTodayCard({ talent, onPress, isDark = false }: { talent: Talent; onPress?: () => void; isDark?: boolean }) {
  const rateLabel = talent.rateType === 'day' ? '/day' : '/hr';
  return (
    <Pressable
      onPress={onPress}
      className="rounded-2xl p-3 mr-3"
      style={{
        width: 160,
        backgroundColor: isDark ? '#1A1A1A' : '#FFFFFF',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: isDark ? 0.3 : 0.05,
        shadowRadius: 4,
        elevation: 2,
      }}
    >
      <Image
        source={{ uri: talent.avatar }}
        className="w-12 h-12 rounded-full self-center"
        onError={() => {}}
      />
      <View className="items-center mt-2">
        <Text className="font-semibold text-sm" style={{ color: isDark ? '#FFFFFF' : '#1F2937' }} numberOfLines={1}>
          {talent.name}
        </Text>
        <Text className="text-xs mt-0.5" style={{ color: isDark ? '#9CA3AF' : '#9CA3AF' }}>{talent.category}</Text>
        <Text className="text-orange-500 text-xs font-semibold mt-1">
          AED {talent.hourlyRate.toLocaleString()}{rateLabel}
        </Text>
      </View>
    </Pressable>
  );
}

// Trending Talent Row
function TrendingTalentRow({ talent, rank, onPress, isDark = false }: { talent: Talent; rank: number; onPress?: () => void; isDark?: boolean }) {
  return (
    <Pressable
      onPress={onPress}
      className="rounded-xl p-3 flex-row items-center mb-2 mx-4"
      style={{
        backgroundColor: isDark ? '#1A1A1A' : '#FFFFFF',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: isDark ? 0.3 : 0.05,
        shadowRadius: 2,
        elevation: 1,
      }}
    >
      <Text className="text-2xl font-bold w-8" style={{ color: isDark ? '#4B5563' : '#D1D5DB' }}>{rank}</Text>
      <Image
        source={{ uri: talent.avatar }}
        className="w-12 h-12 rounded-full ml-2"
        onError={() => {}}
      />
      <View className="flex-1 ml-3">
        <View className="flex-row items-center">
          <Text className="font-semibold text-sm" style={{ color: isDark ? '#FFFFFF' : '#1F2937' }}>{talent.name}</Text>
          {talent.isVerified ? (
            <BadgeCheck size={14} color="#F97316" fill="#FFF7ED" className="ml-1" />
          ) : null}
        </View>
        <Text className="text-xs" style={{ color: isDark ? '#9CA3AF' : '#9CA3AF' }}>{talent.category}</Text>
        <Text className="text-orange-500 text-xs font-semibold">AED {talent.hourlyRate}/hr</Text>
      </View>
      <View className="flex-row items-center">
        <Star size={12} color="#F97316" fill="#F97316" />
        <Text className="text-sm font-medium ml-1" style={{ color: isDark ? '#FFFFFF' : '#1F2937' }}>{(talent.rating ?? 0).toFixed(1)}</Text>
      </View>
    </Pressable>
  );
}

// New on Engage Card (centered)
function NewOnEngageCard({ talent, onPress, isDark = false }: { talent: Talent; onPress?: () => void; isDark?: boolean }) {
  const rateLabel = talent.rateType === 'day' ? '/day' : '/hr';
  return (
    <Pressable
      onPress={onPress}
      className="rounded-2xl p-3 mr-3 items-center"
      style={{
        width: 112,
        backgroundColor: isDark ? '#1A1A1A' : '#FFFFFF',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: isDark ? 0.3 : 0.05,
        shadowRadius: 4,
        elevation: 2,
      }}
    >
      <Image
        source={{ uri: talent.avatar }}
        className="w-14 h-14 rounded-full"
        onError={() => {}}
      />
      <Text className="font-semibold text-xs mt-2 text-center" style={{ color: isDark ? '#FFFFFF' : '#1F2937' }} numberOfLines={1}>
        {talent.name}
      </Text>
      <Text className="text-[10px] text-center" style={{ color: isDark ? '#9CA3AF' : '#9CA3AF' }}>{talent.category}</Text>
      <View className="bg-violet-100 px-2 py-0.5 rounded-full mt-1">
        <Text className="text-violet-600 text-[10px] font-semibold">New</Text>
      </View>
      <Text className="text-orange-500 text-[10px] font-semibold mt-1">
        AED {talent.hourlyRate.toLocaleString()}{rateLabel}
      </Text>
    </Pressable>
  );
}

// Quick Action Card
function QuickActionCard({ title, subtitle, onPress, isDark = false }: { title: string; subtitle: string; onPress?: () => void; isDark?: boolean }) {
  return (
    <Pressable
      onPress={onPress}
      className="rounded-2xl p-5 flex-1"
      style={{
        backgroundColor: isDark ? '#1A1A1A' : '#FFFFFF',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: isDark ? 0.3 : 0.05,
        shadowRadius: 4,
        elevation: 2,
      }}
    >
      <Text className="font-semibold text-base" style={{ color: isDark ? '#FFFFFF' : '#1F2937' }}>{title}</Text>
      <Text className="text-xs mt-1" style={{ color: isDark ? '#9CA3AF' : '#9CA3AF' }}>{subtitle}</Text>
    </Pressable>
  );
}

export default function ClientHomeScreen() {
  const insets = useSafeAreaInsets();
  const { theme, isDark } = useTheme();
  const user = useAuthStore((s) => s.user);
  const notificationCount = useNotificationsStore((s) => s.unreadCount);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [clientName, setClientName] = useState('User');
  const [clientAvatarUrl, setClientAvatarUrl] = useState<string | null>(null);

  // State for upcoming bookings
  const [upcomingBookings, setUpcomingBookings] = useState<{ id: string; talentName: string; location: string; date: string; isToday: boolean }[]>([]);

  // State for talent data
  const [bookAgain, setBookAgain] = useState<Talent[]>([]);
  const [recentlyViewed, setRecentlyViewed] = useState<Talent[]>([]);
  const [recommendedTalent, setRecommendedTalent] = useState<Talent[]>([]);
  const [availableToday, setAvailableToday] = useState<Talent[]>([]);
  const [trendingTalent, setTrendingTalent] = useState<Talent[]>([]);
  const [newOnEngage, setNewOnEngage] = useState<Talent[]>([]);

  // Helper function to map Supabase data to Talent type
  const mapTalentData = (
    talentProfile: Record<string, unknown>,
    profilesMap: Map<string, { full_name: string; avatar_url: string | null }>
  ): Talent => {
    const profile = profilesMap.get(talentProfile.user_id as string);
    const hasHourlyRate = talentProfile.hourly_rate && (talentProfile.hourly_rate as number) > 0;

    return {
      id: talentProfile.id as string,
      name: (talentProfile.display_name as string) || profile?.full_name || 'Unknown',
      category: formatCategory(talentProfile.category as string | null),
      hourlyRate: hasHourlyRate
        ? (talentProfile.hourly_rate as number)
        : (talentProfile.day_rate as number) || 0,
      rateType: hasHourlyRate ? 'hr' : 'day',
      avatar: profile?.avatar_url || PLACEHOLDER_AVATAR,
      isVerified: (talentProfile.is_verified as boolean) || false,
      rating: (talentProfile.rating as number) || undefined,
      totalCompletedBookings: (talentProfile.total_completed_bookings as number) || undefined,
      createdAt: (talentProfile.created_at as string) || undefined,
    };
  };

  // Fetch user profile data
  const fetchUserProfile = useCallback(async () => {
    try {
      if (!user) {
        setClientName('User');
        setClientAvatarUrl(null);
        return;
      }

      const { data: profileData, error } = await supabase
        .from('profiles')
        .select('full_name, avatar_url')
        .eq('id', user.id)
        .single();

      if (!error && profileData) {
        if (profileData.full_name) {
          const firstName = profileData.full_name.split(' ')[0];
          setClientName(firstName);
        } else {
          setClientName(user.user_metadata?.full_name?.split(' ')[0] || 'User');
        }
        setClientAvatarUrl(profileData.avatar_url || null);
      } else {
        setClientName(user.user_metadata?.full_name?.split(' ')[0] || 'User');
        setClientAvatarUrl(null);
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : typeof error === 'string' ? error : 'Error fetching user profile';
      console.error('Error fetching user profile:', errorMsg);
      setClientName('User');
      setClientAvatarUrl(null);
    }
  }, [user]);

  // Fetch talent data from Supabase
  const fetchTalentData = useCallback(async () => {
    try {
      setLoading(true);

      // Fetch all talent profiles we need (with different limits/filters)
      const [
        { data: recommendedData, error: recommendedError },
        { data: availableData, error: availableError },
        { data: newData, error: newError },
        { data: trendingData, error: trendingError },
      ] = await Promise.all([
        // Recommended: verified talents, ordered by rating
        supabase
          .from('talent_profiles')
          .select('*')
          .eq('is_verified', true)
          .order('rating', { ascending: false })
          .limit(6),
        // Available Today: available and not away
        supabase
          .from('talent_profiles')
          .select('*')
          .eq('is_available', true)
          .eq('is_away', false)
          .limit(4),
        // New on Engage: ordered by created_at
        supabase
          .from('talent_profiles')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(4),
        // Trending: highest bookings or rating
        supabase
          .from('talent_profiles')
          .select('*')
          .order('total_completed_bookings', { ascending: false })
          .order('rating', { ascending: false })
          .limit(3),
      ]);

      // Fetch Book Again data separately from completed bookings
      const { data: completedBookings } = await supabase
        .from('bookings')
        .select(`
          id,
          scheduled_start,
          booking_talents (
            talent_id,
            role_category
          )
        `)
        .eq('client_id', user?.id)
        .eq('status', 'completed')
        .order('scheduled_start', { ascending: false })
        .limit(10);

      // Extract unique talent IDs from completed bookings
      const bookAgainTalentIds = new Set<string>();
      const bookAgainMap = new Map<string, string>(); // talent_id -> last booking date

      if (completedBookings && completedBookings.length > 0) {
        completedBookings.forEach((booking) => {
          if (booking.booking_talents && Array.isArray(booking.booking_talents)) {
            booking.booking_talents.forEach((bt: any) => {
              if (bt.talent_id && bookAgainTalentIds.size < 3) {
                bookAgainTalentIds.add(bt.talent_id);
                if (!bookAgainMap.has(bt.talent_id)) {
                  bookAgainMap.set(bt.talent_id, booking.scheduled_start || 'Recently');
                }
              }
            });
          }
        });
      }

      // Fetch talent profiles for book again
      let bookAgainTalents: Talent[] = [];
      if (bookAgainTalentIds.size > 0) {
        const { data: bookAgainTalentData } = await supabase
          .from('talent_profiles')
          .select('*')
          .in('id', Array.from(bookAgainTalentIds));

        if (bookAgainTalentData && bookAgainTalentData.length > 0) {
          const bookAgainUserIds = bookAgainTalentData.map(t => t.user_id);
          const { data: bookAgainProfiles } = await supabase
            .from('profiles')
            .select('id, full_name, avatar_url')
            .in('id', bookAgainUserIds);

          const bookAgainProfilesMap = new Map<string, { full_name: string; avatar_url: string | null }>();
          (bookAgainProfiles || []).forEach(p => {
            bookAgainProfilesMap.set(p.id, { full_name: p.full_name, avatar_url: p.avatar_url });
          });

          bookAgainTalents = bookAgainTalentData.map(t => {
            const mapped = mapTalentData(t, bookAgainProfilesMap);
            const lastBookedDate = bookAgainMap.get(t.id as string);
            if (lastBookedDate) {
              mapped.lastBooked = new Date(lastBookedDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
            } else {
              mapped.lastBooked = 'Recently';
            }
            return mapped;
          });
        }
      }

      // Collect all unique user_ids to fetch profiles for other sections
      const allTalents = [
        ...(recommendedData || []),
        ...(availableData || []),
        ...(newData || []),
        ...(trendingData || []),
      ];

      const userIds = [...new Set(allTalents.map(t => t.user_id))];

      // Fetch profiles for avatar_url
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url')
        .in('id', userIds);

      // Create a map for quick lookup
      const profilesMap = new Map<string, { full_name: string; avatar_url: string | null }>();
      (profilesData || []).forEach(p => {
        profilesMap.set(p.id, { full_name: p.full_name, avatar_url: p.avatar_url });
      });

      // Map data to Talent type
      if (recommendedData && recommendedData.length > 0) {
        setRecommendedTalent(recommendedData.map(t => mapTalentData(t, profilesMap)));
      } else {
        setRecommendedTalent(FALLBACK_RECOMMENDED);
      }

      if (availableData && availableData.length > 0) {
        setAvailableToday(availableData.map(t => mapTalentData(t, profilesMap)));
      } else {
        setAvailableToday(FALLBACK_AVAILABLE);
      }

      if (newData && newData.length > 0) {
        setNewOnEngage(newData.map(t => mapTalentData(t, profilesMap)));
      } else {
        setNewOnEngage(FALLBACK_NEW);
      }

      if (trendingData && trendingData.length > 0) {
        setTrendingTalent(trendingData.map(t => mapTalentData(t, profilesMap)));
      } else {
        setTrendingTalent(FALLBACK_TRENDING);
      }

      // Set book again talents
      if (bookAgainTalents.length > 0) {
        setBookAgain(bookAgainTalents);
      } else {
        setBookAgain([]);
      }

    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : typeof error === 'string' ? error : 'Error fetching talent data';
      console.error('Error fetching talent data:', errorMsg);
      // Use fallback data on error
      setRecommendedTalent(FALLBACK_RECOMMENDED);
      setAvailableToday(FALLBACK_AVAILABLE);
      setNewOnEngage(FALLBACK_NEW);
      setTrendingTalent(FALLBACK_TRENDING);
      setBookAgain([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch recently viewed talents from localStorage
  const fetchRecentlyViewed = useCallback(async () => {
    try {
      const recentlyViewedJSON = await AsyncStorage.getItem('engage_recently_viewed');

      if (!recentlyViewedJSON) {
        setRecentlyViewed([]);
        return;
      }

      const recentlyViewedData = JSON.parse(recentlyViewedJSON) as Array<{ talentId: string; viewedAt: string }>;

      if (!recentlyViewedData || recentlyViewedData.length === 0) {
        setRecentlyViewed([]);
        return;
      }

      // Get talent IDs (max 8 for display)
      const talentIds = recentlyViewedData.slice(0, 8).map(item => item.talentId);

      // Fetch talent profiles
      const { data: talentData } = await supabase
        .from('talent_profiles')
        .select('*')
        .in('id', talentIds);

      if (!talentData || talentData.length === 0) {
        setRecentlyViewed([]);
        return;
      }

      // Fetch user profiles for names and avatars
      const userIds = talentData.map(t => t.user_id);
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url')
        .in('id', userIds);

      const profilesMap = new Map<string, { full_name: string; avatar_url: string | null }>();
      (profilesData || []).forEach(p => {
        profilesMap.set(p.id, { full_name: p.full_name, avatar_url: p.avatar_url });
      });

      // Map to Talent type maintaining order from localStorage
      const mappedTalents = talentIds
        .map(id => talentData.find(t => t.id === id))
        .filter(t => t !== undefined)
        .map(t => mapTalentData(t, profilesMap));

      setRecentlyViewed(mappedTalents);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : typeof error === 'string' ? error : 'Error fetching recently viewed';
      console.error('Error fetching recently viewed:', errorMsg);
      setRecentlyViewed([]);
    }
  }, []);

  // Fetch upcoming bookings from Supabase
  const fetchUpcomingBookings = useCallback(async () => {
    try {
      if (!user?.id) {
        setUpcomingBookings([]);
        return;
      }

      const now = new Date().toISOString();
      const { data: bookingsData } = await supabase
        .from('bookings')
        .select(`
          id,
          scheduled_start,
          location_text,
          booking_talents (
            talent_id
          )
        `)
        .eq('client_id', user.id)
        .in('status', ['confirmed', 'pending', 'pending_acceptance', 'in_progress'])
        .gte('scheduled_start', now)
        .order('scheduled_start', { ascending: true })
        .limit(4);

      if (!bookingsData || bookingsData.length === 0) {
        setUpcomingBookings([]);
        return;
      }

      const talentIds = bookingsData
        .flatMap((b: any) => (b.booking_talents || []).map((bt: any) => bt.talent_id))
        .filter(Boolean);

      const uniqueTalentIds = [...new Set(talentIds)] as string[];
      let talentNameMap = new Map<string, string>();

      if (uniqueTalentIds.length > 0) {
        const { data: talentProfiles } = await supabase
          .from('talent_profiles')
          .select('id, display_name, user_id')
          .in('id', uniqueTalentIds);

        if (talentProfiles && talentProfiles.length > 0) {
          const userIds = talentProfiles.map(t => t.user_id).filter(Boolean);
          const { data: profiles } = await supabase
            .from('profiles')
            .select('id, full_name')
            .in('id', userIds);

          const profileMap = new Map<string, string>();
          (profiles || []).forEach(p => profileMap.set(p.id, p.full_name || 'Unknown'));

          talentProfiles.forEach(t => {
            talentNameMap.set(t.id, t.display_name || profileMap.get(t.user_id) || 'Talent');
          });
        }
      }

      const today = new Date();
      const mapped = bookingsData.map((b: any) => {
        const firstTalent = b.booking_talents?.[0]?.talent_id;
        const talentName = firstTalent ? (talentNameMap.get(firstTalent) || 'Talent') : 'Talent';
        const bookingDate = b.scheduled_start ? new Date(b.scheduled_start) : null;
        const isToday = bookingDate
          ? bookingDate.getFullYear() === today.getFullYear() &&
            bookingDate.getMonth() === today.getMonth() &&
            bookingDate.getDate() === today.getDate()
          : false;
        const dateLabel = isToday
          ? 'Today'
          : bookingDate
            ? bookingDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
            : 'TBD';

        return {
          id: b.id,
          talentName,
          location: b.location_text || 'Location TBD',
          date: dateLabel,
          isToday,
        };
      });

      setUpcomingBookings(mapped);
    } catch {
      setUpcomingBookings([]);
    }
  }, [user?.id]);

  // Fetch data on mount
  useEffect(() => {
    fetchUserProfile();
    fetchUpcomingBookings();
    fetchTalentData();
    fetchRecentlyViewed();
  }, [fetchUserProfile, fetchUpcomingBookings, fetchTalentData, fetchRecentlyViewed]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    Promise.all([fetchUserProfile(), fetchUpcomingBookings(), fetchTalentData(), fetchRecentlyViewed()]).finally(() => setRefreshing(false));
  }, [fetchUserProfile, fetchUpcomingBookings, fetchTalentData, fetchRecentlyViewed]);

  return (
    <View className="flex-1" style={{ backgroundColor: isDark ? '#0A0A0A' : '#FFFFFF' }}>
      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + 140 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#FA5610"
          />
        }
      >
        {/* Header Section with Concave Elliptical Bottom */}
        <View style={{ height: HEADER_HEIGHT }}>
          {/* Background Image */}
          <Image
            source={{ uri: 'https://tghuqwogmnslvlbhchpu.supabase.co/storage/v1/render/image/public/portfolio/c55cbbab-bf71-4e9e-81e1-7897219d1281/279b3c49-9ea0-429c-83f0-5327682041b9/1770276281554-1.png?width=1200&height=1500&quality=85' }}
            style={{
              position: 'absolute',
              width: '100%',
              height: '100%',
            }}
            resizeMode="cover"
            onError={() => {}}
          />
          {/* Subtle gradient overlay for text readability */}
          <View
            className="absolute w-full"
            style={{
              height: '70%',
              backgroundColor: 'rgba(0,0,0,0.25)',
              top: 0,
            }}
          />

          {/* Content */}
          <View style={{ flex: 1, paddingTop: insets.top, zIndex: 10 }}>
            {/* Top Bar */}
            <Animated.View
              entering={FadeInDown.delay(100).duration(500)}
              className="flex-row items-center justify-between px-4 pt-3"
            >
              <Pressable
                className="w-11 h-11 rounded-full items-center justify-center"
                style={{ backgroundColor: 'rgba(255,255,255,0.1)' }}
                onPress={() => router.push('/(client)/shortlist' as never)}
              >
                <Heart size={20} color="#FFFFFF" strokeWidth={1.5} />
              </Pressable>

              <Pressable
                className="w-11 h-11 rounded-full items-center justify-center relative"
                style={{ backgroundColor: 'rgba(255,255,255,0.1)' }}
                onPress={() => router.push('/(client)/notifications' as never)}
              >
                <Bell size={20} color="#FFFFFF" strokeWidth={1.5} />
                {notificationCount > 0 ? (
                  <View className="absolute -top-1 -right-1 min-w-5 h-5 rounded-full bg-orange-500 items-center justify-center px-1">
                    <Text className="text-white text-[10px] font-bold">
                      {notificationCount > 9 ? '9+' : notificationCount}
                    </Text>
                  </View>
                ) : null}
              </Pressable>
            </Animated.View>

            {/* Avatar and Greeting */}
            <Animated.View
              entering={FadeInDown.delay(200).duration(500)}
              className="items-center mt-6"
            >
              <Pressable onPress={() => router.push('/(client)/profile' as never)}>
                <UserAvatar avatarUrl={clientAvatarUrl} name={clientName} />
              </Pressable>
              <Text className="text-white/70 text-sm mt-4">
                {getGreeting()}
              </Text>
              <Text className="text-white text-4xl font-bold">
                {clientName}
              </Text>
            </Animated.View>

            {/* Search Bar */}
            <Animated.View
              entering={FadeInUp.delay(300).duration(500)}
              className="mx-4 mt-4 mb-2"
            >
              <Pressable
                className="flex-row items-center px-4 rounded-full border border-white/20"
                style={{
                  backgroundColor: 'rgba(255,255,255,0.15)',
                  height: 48,
                }}
                onPress={() => {
                  router.push('/(client)/search');
                }}
              >
                <Search size={18} color="#FFFFFF" strokeWidth={1.5} />
                <Text className="text-white/70 ml-3 flex-1 text-base font-medium">
                  Search talent...
                </Text>
              </Pressable>
            </Animated.View>
          </View>

          {/* Concave elliptical bottom mask */}
          <View
            style={{
              position: 'absolute',
              bottom: -50,
              left: '-25%',
              right: '-25%',
              height: 100,
              backgroundColor: isDark ? '#0A0A0A' : '#FFFFFF',
              borderTopLeftRadius: 1000,
              borderTopRightRadius: 1000,
            }}
          />
        </View>

        {/* Main Content */}
        <View style={{ marginTop: -30 }}>

          {/* Browse by Category - MOVED TO FIRST */}
          <Animated.View
            entering={FadeInUp.delay(400).duration(500)}
            className="mb-6"
          >
            <SectionHeader title="Browse by Category" seeAll={false} isDark={isDark} />
            <View className="flex-row flex-wrap justify-between px-4">
              {CATEGORIES.map((category) => (
                <CategoryImageCard
                  key={category.label}
                  label={category.label}
                  image={category.image}
                  onPress={() => router.push(`/(client)/search?category=${category.categoryId}` as any)}
                />
              ))}
            </View>
          </Animated.View>

          {/* Upcoming Bookings */}
          {upcomingBookings.length > 0 ? (
            <Animated.View
              entering={FadeInUp.delay(500).duration(500)}
              className="mx-4 mb-6"
            >
              <View
                className="rounded-2xl p-4"
                style={{
                  backgroundColor: isDark ? '#1A1A1A' : '#FFFFFF',
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: isDark ? 0.3 : 0.08,
                  shadowRadius: 8,
                  elevation: 3,
                  borderWidth: 1,
                  borderColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)',
                }}
              >
                <View className="flex-row items-center justify-between mb-4">
                  <Text className="text-xs font-semibold tracking-wider uppercase" style={{ color: isDark ? '#9CA3AF' : '#6B7280' }}>
                    UPCOMING
                  </Text>
                  <Text className="text-xs" style={{ color: isDark ? '#9CA3AF' : '#9CA3AF' }}>
                    {upcomingBookings.length} {upcomingBookings.length === 1 ? 'Booking' : 'Bookings'}
                  </Text>
                </View>

                {upcomingBookings.map((booking, index) => (
                  <TimelineItem
                    key={booking.id}
                    item={booking}
                    isLast={index === upcomingBookings.length - 1}
                    isDark={isDark}
                  />
                ))}
              </View>
            </Animated.View>
          ) : null}

          {/* Book Again */}
          {bookAgain.length > 0 && (
            <Animated.View
              entering={FadeInUp.delay(450).duration(500)}
              className="mx-4 mb-6"
            >
              <View className="flex-row items-center justify-between mb-3">
                <View className="flex-row items-center">
                  <RefreshCw size={18} color={isDark ? '#D1D5DB' : '#6B7280'} />
                  <Text className="text-lg font-semibold ml-2" style={{ color: isDark ? '#FFFFFF' : '#1F2937' }}>Book Again</Text>
                </View>
                <Pressable onPress={() => router.push('/(client)/bookings' as never)}>
                  <Text className="text-sm" style={{ color: isDark ? '#D1D5DB' : '#6B7280' }}>Past bookings &gt;</Text>
                </Pressable>
              </View>

              <View className="space-y-2">
                {bookAgain.map((talent, index) => (
                  <Pressable
                    key={talent.id}
                    className="rounded-2xl p-4 flex-row items-center mb-2"
                    style={{
                      backgroundColor: isDark ? '#1A1A1A' : '#FFFFFF',
                      shadowColor: '#000',
                      shadowOffset: { width: 0, height: 2 },
                      shadowOpacity: isDark ? 0.3 : 0.05,
                      shadowRadius: 4,
                      elevation: 2,
                    }}
                    onPress={() => router.push(`/(client)/talent/${talent.id}` as never)}
                  >
                    <Image
                      source={{ uri: talent.avatar }}
                      className="w-12 h-12 rounded-full"
                      onError={() => {}}
                    />
                    <View className="flex-1 ml-3">
                      <Text className="font-semibold" style={{ color: isDark ? '#FFFFFF' : '#1F2937' }}>{talent.name}</Text>
                      <Text className="text-xs" style={{ color: isDark ? '#9CA3AF' : '#9CA3AF' }}>{talent.category}</Text>
                      <Text className="text-xs" style={{ color: isDark ? '#9CA3AF' : '#9CA3AF' }}>Last booked {talent.lastBooked || 'Recently'}</Text>
                    </View>
                    <Pressable
                      className="px-4 py-2 rounded-lg"
                      style={{ backgroundColor: isDark ? '#F97316' : '#1F2937' }}
                      onPress={() => router.push(`/(client)/talent/${talent.id}` as never)}
                    >
                      <Text className="text-white font-semibold text-sm">Rebook</Text>
                    </Pressable>
                  </Pressable>
                ))}
              </View>
            </Animated.View>
          )}

          {/* Recently Viewed */}
          {recentlyViewed.length > 0 && (
            <Animated.View
              entering={FadeInUp.delay(500).duration(500)}
              className="mx-4 mb-6"
            >
              <View className="flex-row items-center mb-3">
                <Text className="text-lg font-semibold" style={{ color: isDark ? '#FFFFFF' : '#1F2937' }}>Recently Viewed</Text>
              </View>

              <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row">
                {recentlyViewed.map((talent, index) => (
                  <Pressable
                    key={talent.id}
                    onPress={() => router.push(`/(client)/talent/${talent.id}` as never)}
                    className="items-center mr-4"
                    style={{ width: 70 }}
                  >
                    <Image
                      source={{ uri: talent.avatar }}
                      className="w-16 h-16 rounded-full mb-2"
                      style={{
                        borderWidth: 2,
                        borderColor: isDark ? '#374151' : '#E5E7EB',
                      }}
                      onError={() => {}}
                    />
                    <Text
                      className="text-xs text-center"
                      style={{ color: isDark ? '#D1D5DB' : '#6B7280' }}
                      numberOfLines={1}
                    >
                      {talent.name.split(' ')[0]}
                    </Text>
                  </Pressable>
                ))}
              </ScrollView>
            </Animated.View>
          )}

          {/* Recommended for You - Dark Section */}
          <Animated.View
            entering={FadeInUp.delay(550).duration(500)}
            className="mb-6"
          >
            <View style={{ position: 'relative' }}>
              {!isDark ? (
                <>
                  <Image
                    source={{ uri: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=800&h=600&fit=crop' }}
                    className="absolute w-full h-full"
                    resizeMode="cover"
                    onError={() => {}}
                  />
                  <View
                    className="absolute w-full h-full"
                    style={{ backgroundColor: 'rgba(0,0,0,0.85)' }}
                  />
                </>
              ) : (
                <View
                  className="absolute w-full h-full"
                  style={{ backgroundColor: '#0A0A0A' }}
                />
              )}
              <View className="py-6">
                <DarkSectionHeader title="Recommended for You" />
                <View className="flex-row flex-wrap px-4">
                  {recommendedTalent.map((talent: Talent, index: number) => (
                    <View key={talent.id} className="w-1/2 pr-2 mb-2" style={{ paddingLeft: index % 2 === 1 ? 4 : 0 }}>
                      <RecommendedCard
                        talent={talent}
                        isDark={true}
                        onPress={() => router.push(`/(client)/talent/${talent.id}` as never)}
                      />
                    </View>
                  ))}
                </View>
              </View>
            </View>
          </Animated.View>

          {/* Available Today */}
          <Animated.View
            entering={FadeInUp.delay(650).duration(500)}
            className="mb-6"
          >
            <SectionHeader title="Available Today" isDark={isDark} />
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal: 16 }}
              style={{ flexGrow: 0 }}
            >
              {availableToday.map((talent: Talent) => (
                <AvailableTodayCard
                  key={talent.id}
                  talent={talent}
                  isDark={isDark}
                  onPress={() => router.push(`/(client)/talent/${talent.id}` as never)}
                />
              ))}
            </ScrollView>
          </Animated.View>

          {/* Trending Talent */}
          <Animated.View
            entering={FadeInUp.delay(700).duration(500)}
            className="mb-6"
          >
            <View className="flex-row items-center justify-between mb-4 px-4">
              <View className="flex-row items-center">
                <TrendingUp size={18} color="#F43F5E" />
                <Text className="text-lg font-semibold ml-2" style={{ color: isDark ? '#FFFFFF' : '#1F2937' }}>Trending Talent</Text>
              </View>
              <Pressable>
                <Text className="text-sm" style={{ color: isDark ? '#D1D5DB' : '#6B7280' }}>See all &gt;</Text>
              </Pressable>
            </View>
            {trendingTalent.map((talent: Talent, index: number) => (
              <TrendingTalentRow
                key={talent.id}
                talent={talent}
                rank={index + 1}
                isDark={isDark}
                onPress={() => router.push(`/(client)/talent/${talent.id}` as never)}
              />
            ))}
          </Animated.View>

          {/* New on Engage */}
          <Animated.View
            entering={FadeInUp.delay(750).duration(500)}
            className="mb-6"
          >
            <SectionHeader title="New on Engage" isDark={isDark} />
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal: 16 }}
              style={{ flexGrow: 0 }}
            >
              {newOnEngage.map((talent: Talent) => (
                <NewOnEngageCard
                  key={talent.id}
                  talent={talent}
                  isDark={isDark}
                  onPress={() => router.push(`/(client)/talent/${talent.id}` as never)}
                />
              ))}
            </ScrollView>
          </Animated.View>

          {/* Quick Actions */}
          <Animated.View
            entering={FadeInUp.delay(800).duration(500)}
            className="mx-4 mb-6"
          >
            <View className="flex-row gap-3">
              <QuickActionCard
                title="Find Talent"
                subtitle="Search creatives"
                isDark={isDark}
                onPress={() => router.push('/(client)/search' as any)}
              />
              <QuickActionCard
                title="Shortlist"
                subtitle="Saved profiles"
                isDark={isDark}
                onPress={() => router.push('/(client)/shortlist' as any)}
              />
            </View>
          </Animated.View>
        </View>
      </ScrollView>
    </View>
  );
}
