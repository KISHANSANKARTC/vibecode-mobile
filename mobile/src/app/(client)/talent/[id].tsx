import { View, Text, ScrollView, Image, Pressable, Dimensions, ActivityIndicator, Modal, FlatList, Alert, TextInput } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useRouter } from '@/lib/router-helper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  ArrowLeft,
  Share2,
  Heart,
  Star,
  MessageCircle,
  CheckCircle,
  Briefcase,
  Clock,
  MapPin,
  Youtube,
  Instagram,
  AlertCircle,
  ChevronDown,
  ChevronRight,
  X,
  Send,
  Calendar as CalendarIcon,
  MessageSquare,
} from 'lucide-react-native';
import Animated, {
  FadeIn,
  FadeInDown,
} from 'react-native-reanimated';
import { useState, useEffect, useMemo } from 'react';
import { cn } from '@/lib/cn';
import { supabase } from '@/lib/supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { extractErrorMessage } from '@/lib/errorUtils';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Helper function to transform package data
function transformPackage(pkg: any): Package {
  let inclusions: string[] = [];
  if (pkg.inclusions_json) {
    if (Array.isArray(pkg.inclusions_json)) {
      inclusions = pkg.inclusions_json;
    } else if (typeof pkg.inclusions_json === 'string') {
      try {
        const parsed = JSON.parse(pkg.inclusions_json);
        inclusions = Array.isArray(parsed) ? parsed : [];
      } catch {
        inclusions = [];
      }
    }
  }

  let deliverables: string[] = [];
  if (pkg.deliverables_json) {
    if (Array.isArray(pkg.deliverables_json)) {
      deliverables = pkg.deliverables_json;
    } else if (typeof pkg.deliverables_json === 'string') {
      try {
        const parsed = JSON.parse(pkg.deliverables_json);
        deliverables = Array.isArray(parsed) ? parsed : [];
      } catch {
        deliverables = [];
      }
    }
  }

  let addons: string[] = [];
  if (pkg.addons_json) {
    if (Array.isArray(pkg.addons_json)) {
      addons = pkg.addons_json;
    } else if (typeof pkg.addons_json === 'string') {
      try {
        const parsed = JSON.parse(pkg.addons_json);
        addons = Array.isArray(parsed) ? parsed : [];
      } catch {
        addons = [];
      }
    }
  }

  const allInclusions = [...inclusions, ...deliverables];

  return {
    id: pkg.id,
    name: pkg.name || 'Package',
    base_price: pkg.base_price || pkg.price || 0,
    price: pkg.base_price || pkg.price || 0,
    currency: pkg.currency,
    duration_hours: pkg.duration_hours,
    duration: pkg.duration_hours ? `${pkg.duration_hours}h` : 'Custom',
    description: pkg.description,
    inclusions_json: pkg.inclusions_json,
    deliverables_json: pkg.deliverables_json,
    includes: allInclusions,
    inclusions: inclusions,
    deliverables: deliverables,
    revisions_included: pkg.revisions_included,
    instant_book_enabled: pkg.instant_book_enabled,
    instant_book_terms_json: pkg.instant_book_terms_json,
    addons_json: pkg.addons_json,
    addons: addons,
    is_active: pkg.is_active,
  };
}

// Helper function to get initials from name
function getInitials(name: string): string {
  return name
    .split(' ')
    .map(word => word.charAt(0))
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

// Colors as per design requirements
const COLORS = {
  orange: '#F97316',
  darkCard: '#1A1A1A',
  darkCardAlt: '#1F1F1F',
  lightBg: '#FFFFFF',
  grayText: '#6B7280',
  green: '#22C55E',
};

// Package interface
interface Package {
  id: string;
  name: string;
  base_price: number;
  price?: number;
  currency?: string;
  duration_hours?: number;
  duration?: string;
  description?: string;
  inclusions_json?: string | string[];
  deliverables_json?: string | string[];
  inclusions?: string[];
  deliverables?: string[];
  includes?: string[];
  revisions_included?: number;
  instant_book_enabled?: boolean;
  instant_book_terms_json?: any;
  addons_json?: string | string[];
  addons?: string[];
  is_active?: boolean;
}

// Review interface
interface Review {
  id: string;
  rating: number;
  comment?: string;
  created_at: string;
  reviewer_user_id: string;
  reviewer_name?: string;
  reviewer_avatar?: string;
  clientName?: string;
  clientAvatar?: string;
  text?: string;
  date?: string;
}

// Extended talent data structure with new fields
interface TalentData {
  id: string;
  name: string;
  subtitle: string;
  category: string;
  location: string;
  rating: number;
  reviewCount: number;
  isVerified: boolean;
  isAvailable: boolean;
  isNewProfile: boolean;
  avatar: string;
  activeAgo: string;
  startingPrice: number;
  reliabilityScore: number | null;
  gigsCompleted: number;
  contentFocus: string[];
  audience: string[];
  socialMedia: { platform: string; handle?: string }[];
  modelSpecs: {
    height?: string;
    weight?: string;
    build?: string;
    shoeSize?: string;
    nationality?: string;
    ethnicity?: string;
    bust?: string;
    waist?: string;
    hips?: string;
  };
  portfolio: string[];
  caseStudies: string[];
  packages: Package[];
  reviews: Review[];
  availability: {
    status: string;
    dates: string[];
  };
  user_id?: string;
  hourly_rate?: number;
  session_rate?: number;
  day_rate?: number;
  project_rate?: number;
  categories?: string[];
  currency?: string;
  username?: string | null;
}

// Default/fallback talent data structure
const DEFAULT_TALENT: TalentData = {
  id: '0',
  name: 'Loading...',
  subtitle: 'Model',
  category: 'Model',
  location: 'Dubai, UAE',
  rating: 0,
  reviewCount: 0,
  isVerified: false,
  isAvailable: true,
  isNewProfile: true,
  avatar: '',
  activeAgo: '8h ago',
  startingPrice: 150,
  reliabilityScore: null,
  gigsCompleted: 0,
  contentFocus: [],
  audience: [],
  socialMedia: [],
  modelSpecs: {},
  portfolio: [],
  caseStudies: [],
  packages: [],
  reviews: [],
  availability: {
    status: 'available',
    dates: [],
  },
  username: undefined,
};

// Avatar Component with initials fallback
function AvatarWithInitials({ uri, name, size = 40 }: { uri?: string; name: string; size?: number }) {
  if (uri) {
    return (
      <Image
        source={{ uri }}
        style={{ width: size, height: size, borderRadius: size / 2 }}
        resizeMode="cover"
      />
    );
  }

  const initials = getInitials(name);
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: COLORS.orange,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Text style={{ color: 'white', fontWeight: '600', fontSize: size * 0.4 }}>
        {initials}
      </Text>
    </View>
  );
}

// Calendar Component for Availability
function AvailabilityCalendar({ talent }: { talent: TalentData }) {
  const [currentDate, setCurrentDate] = useState(new Date());

  const getDaysInMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  };

  const days = [];
  const daysInMonth = getDaysInMonth(currentDate);
  const firstDay = getFirstDayOfMonth(currentDate);

  // Add empty cells for days before month starts
  for (let i = 0; i < firstDay; i++) {
    days.push(null);
  }

  // Add days of the month
  for (let day = 1; day <= daysInMonth; day++) {
    days.push(day);
  }

  const weekDays = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
  const monthName = currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  // Parse availability data from talent - with fallback to mock data
  let availableDates = new Set([5, 6, 10, 12, 13, 15, 18, 20, 22]);
  try {
    if (talent?.availability?.dates && Array.isArray(talent.availability.dates)) {
      const dateNums = talent.availability.dates.map(d => {
        const parsed = parseInt(d, 10);
        return isNaN(parsed) ? null : parsed;
      }).filter(d => d !== null) as number[];
      if (dateNums.length > 0) {
        availableDates = new Set(dateNums);
      }
    }
  } catch (e) {
    const errorMsg = extractErrorMessage(e);
    console.error('Error parsing availability dates:', errorMsg);
  }

  return (
    <View className="bg-white rounded-lg p-4 mb-4">
      <View className="flex-row items-center justify-between mb-4">
        <Text className="text-gray-900 text-lg font-semibold">Availability</Text>
        <Text className="text-gray-500 text-sm">{availableDates.size} days available</Text>
      </View>

      <Text className="text-gray-700 font-medium text-center mb-3">{monthName}</Text>

      {/* Weekday header */}
      <View className="flex-row justify-between mb-2">
        {weekDays.map((day) => (
          <Text key={day} className="text-gray-500 text-xs font-semibold w-1/7 text-center">
            {day}
          </Text>
        ))}
      </View>

      {/* Calendar grid */}
      <View className="flex-row flex-wrap">
        {days.map((day, idx) => {
          const isOtherMonth = day === null;
          const isAvailable = availableDates.has(day as number);
          const isToday = day === new Date().getDate() && currentDate.getMonth() === new Date().getMonth();
          const isPast = day ? day < new Date().getDate() : false;

          return (
            <View
              key={day === null ? `empty-${idx}` : `${currentDate.getFullYear()}-${currentDate.getMonth()}-${day}`}
              style={{ width: '14.28%' }}
              className="aspect-square items-center justify-center mb-2"
            >
              {isOtherMonth ? (
                <View className="w-full h-full items-center justify-center opacity-20">
                  <Text className="text-gray-400 text-xs" />
                </View>
              ) : (
                <View
                  className={cn(
                    'w-full h-full items-center justify-center rounded-lg',
                    isAvailable ? 'bg-green-100' : isPast ? 'opacity-40' : 'opacity-80',
                    isToday ? 'border border-orange-500' : ''
                  )}
                >
                  {isAvailable ? (
                    <>
                      <CheckCircle size={14} color={COLORS.green} fill={COLORS.green} />
                    </>
                  ) : (
                    <Text className="text-gray-600 text-xs font-medium">{day}</Text>
                  )}
                </View>
              )}
            </View>
          );
        })}
      </View>

      <View className="flex-row items-center mt-4 pt-4 border-t border-gray-100">
        <View className="w-4 h-4 rounded bg-green-100 mr-2" />
        <CheckCircle size={12} color={COLORS.green} fill={COLORS.green} />
        <Text className="text-gray-600 text-xs ml-2">Available</Text>
      </View>
    </View>
  );
}
function RatingDistribution({ reviews }: { reviews: Review[] }) {
  const distribution = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
  reviews.forEach(r => {
    if (r.rating >= 1 && r.rating <= 5) {
      distribution[r.rating as keyof typeof distribution]++;
    }
  });

  const total = reviews.length;
  const getPercentage = (count: number) => (total > 0 ? Math.round((count / total) * 100) : 0);

  return (
    <View className="bg-white rounded-lg p-4 mb-4">
      {[5, 4, 3, 2, 1].map(rating => (
        <View key={rating} className="flex-row items-center mb-3">
          <Text className="text-gray-600 text-sm w-6">{rating}★</Text>
          <View className="flex-1 bg-gray-200 rounded-full h-2 mx-3 overflow-hidden">
            <View
              style={{
                height: '100%',
                width: `${getPercentage(distribution[rating as keyof typeof distribution])}%`,
                backgroundColor: COLORS.orange,
              }}
            />
          </View>
          <Text className="text-gray-500 text-xs w-10">
            {getPercentage(distribution[rating as keyof typeof distribution])}%
          </Text>
        </View>
      ))}
    </View>
  );
}
function TagChip({ label, variant = 'default' }: { label: string; variant?: 'default' | 'social' }) {
  const bgColor = variant === 'social' ? 'bg-[#2A2A2A]' : 'bg-gray-100';
  const textColor = variant === 'social' ? 'text-white' : 'text-gray-700';

  return (
    <View className={cn('px-3 py-1.5 rounded-full mr-2 mb-2', bgColor)}>
      <Text className={cn('text-xs font-medium', textColor)}>{label}</Text>
    </View>
  );
}

// Social Media Chip
function SocialChip({ platform }: { platform: string }) {
  const getIcon = () => {
    switch (platform.toLowerCase()) {
      case 'youtube':
        return <Youtube size={14} color="#FF0000" />;
      case 'instagram':
        return <Instagram size={14} color="#E4405F" />;
      default:
        return null;
    }
  };

  return (
    <View className="flex-row items-center bg-[#2A2A2A] px-3 py-1.5 rounded-full mr-2 mb-2">
      {getIcon()}
      <Text className="text-white text-xs font-medium ml-1.5">{platform}</Text>
    </View>
  );
}

// Spec Item Component
function SpecItem({ label, value }: { label: string; value: string }) {
  return (
    <View className="w-1/3 mb-4">
      <Text className="text-gray-400 text-xs mb-1">{label}</Text>
      <Text className="text-gray-900 text-sm font-medium">{value}</Text>
    </View>
  );
}

// Stats Item Component
function StatsItem({ icon, value, label }: { icon: React.ReactNode; value: string; label: string }) {
  return (
    <View className="flex-1 items-center py-4">
      <View className="mb-1">{icon}</View>
      <Text className="text-gray-900 text-sm font-semibold">{value}</Text>
      <Text className="text-gray-500 text-xs">{label}</Text>
    </View>
  );
}

// Portfolio Image Component
function PortfolioImage({ uri, index, onPress }: { uri: string; index: number; onPress?: () => void }) {
  const imageWidth = (SCREEN_WIDTH - 48 - 8) / 2;
  const [imageError, setImageError] = useState(false);

  if (!uri || imageError) {
    return (
      <View
        style={{
          width: imageWidth,
          aspectRatio: 0.8,
          margin: 4,
          borderRadius: 12,
          overflow: 'hidden',
          backgroundColor: '#F3F4F6',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Text style={{ color: '#9CA3AF', fontSize: 12 }}>No image</Text>
      </View>
    );
  }

  return (
    <Animated.View entering={FadeIn.delay(index * 50).duration(300)}>
      <Pressable
        onPress={onPress}
        style={{
          width: imageWidth,
          aspectRatio: 0.8,
          margin: 4,
          borderRadius: 12,
          overflow: 'hidden',
          backgroundColor: '#F3F4F6',
        }}
      >
        <Image
          source={{ uri }}
          style={{ width: '100%', height: '100%' }}
          resizeMode="cover"
          onError={() => setImageError(true)}
        />
      </Pressable>
    </Animated.View>
  );
}

export default function TalentProfileScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  // State
  const [isFavorited, setIsFavorited] = useState(false);
  const [isTogglingFavorite, setIsTogglingFavorite] = useState(false);
  const [activeTab, setActiveTab] = useState('Portfolio');
  const [activeSubTab, setActiveSubTab] = useState('Portfolio');
  const [talent, setTalent] = useState<TalentData>(DEFAULT_TALENT);
  const [isLoading, setIsLoading] = useState(true);
  const [reviewsSortBy, setReviewsSortBy] = useState<'latest' | 'highest' | 'lowest'>('latest');
  const [showAllReviews, setShowAllReviews] = useState(false);
  const [showBookingSheet, setShowBookingSheet] = useState(false);
  const [bookingSheetStep, setBookingSheetStep] = useState<1 | 2>(1);
  const [selectedSheetCategory, setSelectedSheetCategory] = useState<{
    key: string;
    label: string;
    subtitle: string;
    priceLabel: string | null;
    priceUnit: string;
  } | null>(null);
  const [showInquiryDialog, setShowInquiryDialog] = useState(false);
  const [inquiryMessage, setInquiryMessage] = useState('');
  const [isSendingInquiry, setIsSendingInquiry] = useState(false);
  const [showPortfolioViewer, setShowPortfolioViewer] = useState(false);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);

  const tabs = ['Portfolio', 'Packages', `Reviews (${talent.reviewCount})`, 'Availability'];

  // Helper function to copy to clipboard
  const handleShareProfile = async () => {
    try {
      // Build the profile URL using username or fall back to talent ID
      const baseUrl = 'https://engageapp.co';
      const profileUrl = talent.username
        ? `${baseUrl}/${talent.username}`
        : `${baseUrl}/t/${talent.id}`;

      // Copy to clipboard
      if (typeof navigator !== 'undefined' && navigator.clipboard) {
        await navigator.clipboard.writeText(profileUrl);
        Alert.alert('Success', 'Profile link copied!');
      } else {
        // Fallback for environments without clipboard API
        Alert.alert('Share Profile', `Copy this link: ${profileUrl}`);
      }
    } catch (err) {
      const errorMsg = extractErrorMessage(err);
      Alert.alert('Error', `Failed to copy link: ${errorMsg}`);
    }
  };

  // Helper function to toggle favorite
  const handleToggleFavorite = async () => {
    try {
      setIsTogglingFavorite(true);

      // Get current user
      const { data: authData } = await supabase.auth.getUser();
      const userId = authData?.user?.id;

      if (!userId) {
        Alert.alert('Error', 'Please sign in to save favorites');
        setIsTogglingFavorite(false);
        return;
      }

      if (isFavorited) {
        // Remove from favorites
        const { error } = await supabase
          .from('shortlist_items')
          .delete()
          .eq('user_id', userId)
          .eq('talent_id', id);

        if (error) {
          const errorMsg = error.message || 'Failed to remove from favorites';
          console.error('Error removing favorite:', errorMsg);
          Alert.alert('Error', errorMsg);
          return;
        }

        setIsFavorited(false);
        Alert.alert('Success', 'Removed from favorites');
      } else {
        // Add to favorites
        const { error } = await supabase
          .from('shortlist_items')
          .insert({
            user_id: userId,
            talent_id: id,
          });

        if (error) {
          const errorMsg = error.message || 'Failed to add to favorites';
          console.error('Error adding favorite:', errorMsg);
          Alert.alert('Error', errorMsg);
          return;
        }

        setIsFavorited(true);
        Alert.alert('Success', 'Added to favorites');
      }
    } catch (err) {
      const errorMsg = extractErrorMessage(err);
      console.error('Error toggling favorite:', errorMsg);
      Alert.alert('Error', `Failed to update favorite: ${errorMsg}`);
    } finally {
      setIsTogglingFavorite(false);
    }
  };

  // Helper function to fetch favorite status
  const fetchFavoriteStatus = async () => {
    try {
      const { data: authData } = await supabase.auth.getUser();
      const userId = authData?.user?.id;

      if (!userId) {
        setIsFavorited(false);
        return;
      }

      const { data, error } = await supabase
        .from('shortlist_items')
        .select('id')
        .eq('user_id', userId)
        .eq('talent_id', id)
        .maybeSingle();

      if (error) {
        const errorMsg = error.message || 'Failed to fetch favorite status';
        console.error('Error fetching favorite status:', errorMsg);
        return;
      }

      setIsFavorited(!!data);
    } catch (err) {
      const errorMsg = extractErrorMessage(err);
      console.error('Error checking favorite status:', errorMsg);
    }
  };

  // Handle sending inquiry message
  const handleSendInquiry = async () => {
    if (!inquiryMessage.trim()) return;

    try {
      setIsSendingInquiry(true);

      // Get current user
      const { data: authData } = await supabase.auth.getUser();
      const clientUserId = authData?.user?.id;

      if (!clientUserId) {
        Alert.alert('Error', 'Please sign in to send messages');
        return;
      }

      // Check if inquiry thread exists
      const { data: existingThread } = await supabase
        .from('inquiry_threads')
        .select('id')
        .eq('client_user_id', clientUserId)
        .eq('talent_id', id)
        .maybeSingle();

      let threadId = existingThread?.id;

      // If no thread exists, create one
      if (!threadId) {
        const { data: newThread, error: threadError } = await supabase
          .from('inquiry_threads')
          .insert({
            client_user_id: clientUserId,
            talent_id: id,
            status: 'open',
          })
          .select('id')
          .single();

        if (threadError || !newThread) {
          throw new Error('Failed to create message thread');
        }

        threadId = newThread.id;
      }

      // Insert the message
      const { error: messageError } = await supabase
        .from('inquiry_messages')
        .insert({
          thread_id: threadId,
          sender_user_id: clientUserId,
          message_text: inquiryMessage.trim(),
        });

      if (messageError) {
        throw new Error('Failed to send message');
      }

      // Success - close dialog and show toast
      setInquiryMessage('');
      setShowInquiryDialog(false);
      Alert.alert('Success', 'Message sent! Check your messages for replies.');
    } catch (err) {
      const errorMsg = extractErrorMessage(err);
      console.error('Error sending inquiry:', errorMsg);
      Alert.alert('Error', 'Failed to send message. Please try again.');
    } finally {
      setIsSendingInquiry(false);
    }
  };

  // Quick reply options
  const QUICK_REPLIES = [
    "I'd like to book you",
    "Check availability",
    "Quick question",
  ];

  // Compute sorted reviews
  const sortedReviews = useMemo(() => {
    let sorted = [...talent.reviews];
    if (reviewsSortBy === 'highest') {
      sorted.sort((a, b) => (b.rating || 0) - (a.rating || 0));
    } else if (reviewsSortBy === 'lowest') {
      sorted.sort((a, b) => (a.rating || 0) - (b.rating || 0));
    } else {
      sorted.sort((a, b) => new Date(b.date || '').getTime() - new Date(a.date || '').getTime());
    }
    return sorted;
  }, [talent.reviews, reviewsSortBy]);

  // Filter reviews to show (5 by default, all if showAllReviews)
  const displayedReviews = useMemo(() => {
    return showAllReviews ? sortedReviews : sortedReviews.slice(0, 5);
  }, [sortedReviews, showAllReviews]);

  // Filter active packages
  const activePackages = useMemo(() => {
    return talent.packages.filter(pkg => pkg.is_active !== false);
  }, [talent.packages]);

  // Build categories list for the booking sheet (step 1) — only real categories on the talent
  const sheetCategoryOptions = useMemo<
    {
      key: string;
      label: string;
      subtitle: string;
      priceLabel: string | null;
      priceUnit: string;
    }[]
  >(() => {
    const labelFor = (cat: string): string => {
      const mapping: Record<string, string> = {
        model: 'Model',
        influencer: 'Influencer',
        photographer: 'Photographer',
        videographer: 'Videographer',
        makeup_artist: 'Makeup Artist',
        hair_stylist: 'Hair Stylist',
        stylist: 'Stylist',
        drone_operator: 'Drone Operator',
      };
      return mapping[cat.toLowerCase()] || cat.charAt(0).toUpperCase() + cat.slice(1);
    };

    const cur = talent.currency || 'AED';
    const primaryRate =
      talent.hourly_rate ?? talent.session_rate ?? talent.day_rate ?? talent.project_rate ?? null;
    const primaryUnit = talent.hourly_rate
      ? '/hr'
      : talent.session_rate
        ? '/session'
        : talent.day_rate
          ? '/day'
          : talent.project_rate
            ? '/project'
            : '/hr';

    const seen = new Set<string>();
    const items: { key: string; label: string; subtitle: string; priceLabel: string | null; priceUnit: string }[] = [];

    if (talent.category) {
      const k = String(talent.category).toLowerCase();
      seen.add(k);
      items.push({
        key: k,
        label: labelFor(k),
        subtitle: primaryRate ? `${cur} ${primaryRate}${primaryUnit}` : 'Custom rates',
        priceLabel: primaryRate ? `${cur} ${primaryRate}` : null,
        priceUnit: primaryUnit,
      });
    }

    const extras = (talent.categories || []).filter(Boolean);
    extras.forEach((c) => {
      const k = String(c).toLowerCase();
      if (seen.has(k)) return;
      seen.add(k);
      items.push({
        key: k,
        label: labelFor(k),
        subtitle: 'Custom rates',
        priceLabel: null,
        priceUnit: '',
      });
    });

    return items;
  }, [talent.category, talent.categories, talent.currency, talent.hourly_rate, talent.session_rate, talent.day_rate, talent.project_rate]);

  // Build rate options for sheet step 2
  const sheetRateOptions = useMemo<
    { key: 'hourly' | 'session' | 'day' | 'project'; label: string; subtitle: string; priceLabel: string; priceUnit: string }[]
  >(() => {
    const cur = talent.currency || 'AED';
    const out: { key: 'hourly' | 'session' | 'day' | 'project'; label: string; subtitle: string; priceLabel: string; priceUnit: string }[] = [];
    if (talent.hourly_rate) {
      out.push({
        key: 'hourly',
        label: 'Hourly',
        subtitle: 'Book by the hour',
        priceLabel: `${cur} ${talent.hourly_rate}`,
        priceUnit: '/hr',
      });
    }
    if (talent.session_rate) {
      out.push({
        key: 'session',
        label: 'Session',
        subtitle: 'Per session',
        priceLabel: `${cur} ${talent.session_rate}`,
        priceUnit: '/session',
      });
    }
    if (talent.day_rate) {
      out.push({
        key: 'day',
        label: 'Day',
        subtitle: 'Per day',
        priceLabel: `${cur} ${talent.day_rate}`,
        priceUnit: '/day',
      });
    }
    if (talent.project_rate) {
      out.push({
        key: 'project',
        label: 'Project',
        subtitle: 'Per project',
        priceLabel: `${cur} ${talent.project_rate}`,
        priceUnit: '/project',
      });
    }
    return out;
  }, [talent.currency, talent.hourly_rate, talent.session_rate, talent.day_rate, talent.project_rate]);

  // Helper function to calculate time ago
  const getTimeAgo = (dateString: string | null): string => {
    if (!dateString) return 'Recently';

    const now = new Date();
    const past = new Date(dateString);
    const diffMs = now.getTime() - past.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return 'Recently';
  };

  // Fetch talent data from Supabase
  useEffect(() => {
    const fetchTalentData = async () => {
      if (!id) {
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        console.log('Fetching talent profile for id:', id);

        // Query 1: Fetch talent profile
        const { data: talentProfile, error: profileError } = await supabase
          .from('talent_profiles')
          .select('*')
          .eq('id', id)
          .maybeSingle();

        if (profileError || !talentProfile) {
          console.error('Error fetching talent profile:', profileError);
          console.error('Talent ID:', id);
          setIsLoading(false);
          // Show error message to user
          setTalent({
            ...DEFAULT_TALENT,
            id: id || '0',
            name: 'Talent Not Found',
            subtitle: 'This talent profile could not be loaded',
          });
          return;
        }

        console.log('Talent profile fetched:', talentProfile);

        // Query 2: Fetch completed bookings count (using join)
        const { count: completedBookingsCount } = await supabase
          .from('booking_talents')
          .select('id, bookings!inner(status)', { count: 'exact', head: true })
          .eq('talent_id', id)
          .eq('bookings.status', 'completed');

        console.log('Completed bookings count:', completedBookingsCount);

        // Query 3: Fetch user profile using talent.user_id
        let profile: { full_name: string; avatar_url: string | null; email: string | null; username: string | null; last_seen_at: string | null } | null = null;
        if (talentProfile.user_id) {
          const { data: profileData, error: userProfileError } = await supabase
            .from('profiles')
            .select('full_name, avatar_url, email, username, last_seen_at')
            .eq('id', talentProfile.user_id)
            .maybeSingle();

          if (!userProfileError && profileData) {
            profile = profileData;
          }
          console.log('User profile fetched:', profileData, userProfileError);
        }

        // Query 4: Fetch reviews (using reviewee_user_id, NOT talent_id)
        const { data: reviewsData } = await supabase
          .from('reviews')
          .select('id, rating, comment, created_at, reviewer_user_id')
          .eq('reviewee_user_id', talentProfile.user_id)
          .order('created_at', { ascending: false });

        console.log('Reviews data:', reviewsData);

        // Query 5: Fetch reviewer profiles (batch)
        const reviewerIds = reviewsData?.map(r => r.reviewer_user_id).filter(Boolean) || [];
        let reviewerProfiles: Array<{ id: string; full_name: string; avatar_url: string | null }> = [];
        if (reviewerIds.length > 0) {
          const { data: reviewerProfilesData } = await supabase
            .from('profiles')
            .select('id, full_name, avatar_url')
            .in('id', reviewerIds);

          reviewerProfiles = reviewerProfilesData || [];
          console.log('Reviewer profiles fetched:', reviewerProfiles);
        }

        // Query 6: Fetch packages (correct table name)
        const { data: packagesData } = await supabase
          .from('packages')
          .select('*')
          .eq('talent_id', id)
          .order('created_at', { ascending: true });

        console.log('Packages data:', packagesData);

        // Query 7: Fetch portfolio projects (correct table name)
        const { data: portfolioProjects } = await supabase
          .from('portfolio_projects')
          .select('*')
          .eq('talent_id', id)
          .eq('is_published', true)
          .order('is_featured', { ascending: false })
          .order('created_at', { ascending: false });

        console.log('Portfolio projects:', portfolioProjects);

        // Query 8: Fetch portfolio items directly (for gallery media)
        const { data: portfolioItems } = await supabase
          .from('portfolio_items')
          .select('id, media_url, thumbnail_url, media_type, title, talent_id')
          .eq('talent_id', id)
          .eq('approved_status', 'approved')
          .order('sort_order', { ascending: true })
          .order('created_at', { ascending: true });

        console.log('Portfolio items:', portfolioItems);

        // Query 9: Fetch portfolio media from projects (if projects exist)
        const projectIds = portfolioProjects?.map(p => p.id) || [];
        let portfolioMedia: Array<{ id: string; project_id: string; media_url?: string; image_url?: string; sort_order: number }> = [];
        if (projectIds.length > 0) {
          const { data: portfolioMediaData } = await supabase
            .from('portfolio_media')
            .select('*')
            .in('project_id', projectIds)
            .order('sort_order');

          portfolioMedia = portfolioMediaData || [];
          console.log('Portfolio media from projects:', portfolioMedia);
        }

        // Calculate average rating from reviews
        const avgRating =
          reviewsData && reviewsData.length > 0
            ? (reviewsData.reduce((sum: number, r: { rating: number }) => sum + r.rating, 0) / reviewsData.length)
            : (talentProfile.rating || 0);

        // Get category subtitle
        const getCategorySubtitle = (cat: string | null): string => {
          if (!cat) return 'Creative';
          const mapping: Record<string, string> = {
            model: 'Model',
            influencer: 'Influencer',
            photographer: 'Photographer',
            videographer: 'Videographer',
            makeup_artist: 'Makeup Artist',
            hair_stylist: 'Hair Stylist',
            stylist: 'Stylist',
          };
          return mapping[cat.toLowerCase()] || cat.charAt(0).toUpperCase() + cat.slice(1);
        };

        // Parse JSON fields with proper error handling
        const parseJsonField = (field: any): any[] => {
          if (!field) return [];
          if (Array.isArray(field)) return field;
          if (typeof field === 'string') {
            try {
              const parsed = JSON.parse(field);
              return Array.isArray(parsed) ? parsed : [];
            } catch {
              return [];
            }
          }
          return [];
        };

        // Parse subcategories
        const subcategories = parseJsonField(talentProfile.subcategories);
        console.log('Subcategories:', subcategories);

        // Parse languages
        const languages = parseJsonField(talentProfile.languages);
        console.log('Languages:', languages);

        // Parse influencer niche for content focus
        const contentFocus = parseJsonField(talentProfile.influencer_niche);
        console.log('Content focus:', contentFocus);

        // Parse audience type
        const audience = parseJsonField(talentProfile.audience_type);
        console.log('Audience:', audience);

        // Parse social links
        const socialLinksRaw = parseJsonField(talentProfile.social_links);
        const socialMedia = socialLinksRaw.map((link: any) => {
          if (typeof link === 'string') return { platform: link };
          return { platform: link.platform || link.name, handle: link.handle || link.url };
        });
        console.log('Social media:', socialMedia);

        // Parse model measurements
        const modelMeasurements = talentProfile.model_measurements
          ? (typeof talentProfile.model_measurements === 'string'
              ? JSON.parse(talentProfile.model_measurements)
              : talentProfile.model_measurements)
          : null;

        // Build model specs from database fields
        const modelSpecs: {
          height?: string;
          weight?: string;
          build?: string;
          shoeSize?: string;
          nationality?: string;
          ethnicity?: string;
          bust?: string;
          waist?: string;
          hips?: string;
        } = {};

        if (talentProfile.height_cm) modelSpecs.height = `${talentProfile.height_cm} cm`;
        if (talentProfile.weight_kg) modelSpecs.weight = `${talentProfile.weight_kg} kg`;
        if (talentProfile.build) modelSpecs.build = talentProfile.build;
        if (talentProfile.shoe_size) modelSpecs.shoeSize = talentProfile.shoe_size;
        if (talentProfile.nationality) modelSpecs.nationality = talentProfile.nationality;
        if (talentProfile.ethnicity) modelSpecs.ethnicity = talentProfile.ethnicity;

        // Add measurements from model_measurements JSON
        if (modelMeasurements) {
          if (modelMeasurements.bust) modelSpecs.bust = modelMeasurements.bust;
          if (modelMeasurements.waist) modelSpecs.waist = modelMeasurements.waist;
          if (modelMeasurements.hips) modelSpecs.hips = modelMeasurements.hips;
        }

        console.log('Model specs:', modelSpecs);

        // Extract portfolio image URLs from BOTH portfolio_items and portfolio_media
        const portfolioItemsUrls = portfolioItems?.map((item) => item.media_url || item.thumbnail_url || '').filter(Boolean) || [];
        const portfolioMediaUrls = portfolioMedia.map((media) => media.media_url || media.image_url || '').filter(Boolean);
        const portfolioImages = [...portfolioItemsUrls, ...portfolioMediaUrls];
        console.log('Portfolio images (combined):', portfolioImages.length, 'items:', portfolioItemsUrls.length, 'media:', portfolioMediaUrls.length);

        // Build talent data object with ALL fields from database
        const builtTalent: TalentData = {
          id: talentProfile.id,
          name: talentProfile.display_name || profile?.full_name || 'Talent Profile',
          subtitle: `${getCategorySubtitle(talentProfile.category)} ${talentProfile.category === 'model' || talentProfile.category === 'influencer' ? '- influencer' : ''}`,
          category: talentProfile.category || 'Creative Professional',
          location: talentProfile.location_text || 'Dubai, UAE',
          rating: Math.round(avgRating * 10) / 10,
          reviewCount: reviewsData?.length || 0,
          isVerified: talentProfile.is_verified || false,
          isAvailable: talentProfile.is_available ?? true,
          isNewProfile: (reviewsData?.length || 0) === 0,
          avatar: profile?.avatar_url || '',
          activeAgo: getTimeAgo(profile?.last_seen_at || null),
          startingPrice: talentProfile.hourly_rate || talentProfile.day_rate || talentProfile.session_rate || talentProfile.project_rate || 150,
          reliabilityScore: talentProfile.reliability_score || null,
          gigsCompleted: completedBookingsCount || 0,
          contentFocus: contentFocus.length > 0 ? contentFocus : [],
          audience: audience.length > 0 ? audience : [],
          socialMedia: socialMedia.length > 0 ? socialMedia : [],
          modelSpecs,
          portfolio: portfolioImages,
          caseStudies: [],
          packages: packagesData?.map((pkg: any): Package => transformPackage(pkg)) || [],
          reviews: reviewsData?.map((r): Review => {
            const reviewer = reviewerProfiles.find(rp => rp.id === r.reviewer_user_id);
            return {
              id: r.id,
              rating: r.rating,
              comment: r.comment,
              created_at: r.created_at,
              reviewer_user_id: r.reviewer_user_id,
              reviewer_name: reviewer?.full_name || 'Client',
              reviewer_avatar: reviewer?.avatar_url || '',
              clientName: reviewer?.full_name || 'Client',
              clientAvatar: reviewer?.avatar_url || '',
              text: r.comment || '',
              date: r.created_at,
            };
          }) || [],
          user_id: talentProfile.user_id,
          hourly_rate: talentProfile.hourly_rate,
          session_rate: talentProfile.session_rate,
          day_rate: talentProfile.day_rate,
          project_rate: talentProfile.project_rate,
          categories: parseJsonField(talentProfile.categories),
          availability: {
            status: 'available',
            dates: [],
          },
          username: profile?.username,
        };

        console.log('Built talent data:', builtTalent);
        setTalent(builtTalent);

        // Add to recently viewed in localStorage
        try {
          const recentlyViewedJSON = await AsyncStorage.getItem('engage_recently_viewed');
          let recentlyViewed: Array<{ talentId: string; viewedAt: string }> = [];

          if (recentlyViewedJSON) {
            recentlyViewed = JSON.parse(recentlyViewedJSON);
          }

          // Remove existing entry if present
          recentlyViewed = recentlyViewed.filter(item => item.talentId !== id);

          // Add to the beginning
          recentlyViewed.unshift({
            talentId: id,
            viewedAt: new Date().toISOString(),
          });

          // Keep only the last 10 items
          recentlyViewed = recentlyViewed.slice(0, 10);

          await AsyncStorage.setItem('engage_recently_viewed', JSON.stringify(recentlyViewed));
        } catch (storageError) {
          console.error('Error saving to recently viewed:', storageError);
        }
      } catch (err) {
        const errorMsg = extractErrorMessage(err);
        console.error('Error fetching talent data:', errorMsg);
      } finally {
        setIsLoading(false);
      }
    };

    fetchTalentData();
  }, [id]);

  // Fetch favorite status on mount and when ID changes
  useEffect(() => {
    fetchFavoriteStatus();
  }, [id]);

  if (isLoading) {
    return (
      <View className="flex-1 bg-white items-center justify-center">
        <ActivityIndicator size="large" color={COLORS.orange} />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-white">
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingBottom: insets.bottom + 100,
        }}
      >
        {/* Debug Info - Remove after testing */}
        {talent.name === 'Talent Not Found' && (
          <View className="bg-red-50 p-4 m-4 rounded-lg">
            <Text className="text-red-800 font-bold mb-2">⚠️ Talent Not Found</Text>
            <Text className="text-red-600 text-sm">
              Talent ID: {id}{'\n'}
              Check browser console (F12) for detailed error logs.{'\n'}
              Possible issues:{'\n'}
              • No talent exists with this ID{'\n'}
              • Database connection issue{'\n'}
              • Missing data in talent_profiles table
            </Text>
          </View>
        )}

        {/* Header Section - Dark Card */}
        <View
          className="px-4 pb-6"
          style={{
            backgroundColor: COLORS.darkCard,
            paddingTop: insets.top,
          }}
        >
          {/* App Bar */}
          <View className="flex-row items-center justify-between py-3">
            <Pressable
              onPress={() => router.back()}
              className="w-10 h-10 items-center justify-center"
            >
              <ArrowLeft size={24} color="#FFFFFF" />
            </Pressable>

            <Text className="text-white text-lg font-semibold">engage</Text>

            <View className="flex-row">
              <Pressable
                onPress={handleShareProfile}
                className="w-10 h-10 items-center justify-center"
              >
                <Share2 size={20} color="#FFFFFF" />
              </Pressable>
              <Pressable
                onPress={handleToggleFavorite}
                disabled={isTogglingFavorite}
                className="w-10 h-10 items-center justify-center"
              >
                <Heart
                  size={20}
                  color={isFavorited ? COLORS.orange : '#FFFFFF'}
                  fill={isFavorited ? COLORS.orange : 'transparent'}
                />
              </Pressable>
            </View>
          </View>

          {/* Profile Info */}
          <Animated.View entering={FadeInDown.delay(100).duration(400)}>
            {/* Name */}
            <Text className="text-white text-2xl font-bold mt-2">{talent.name}</Text>

            {/* Subtitle */}
            <Text className="text-gray-400 text-sm mt-1">{talent.subtitle}</Text>

            {/* Badges Row */}
            <View className="flex-row items-center mt-3 flex-wrap">
              {talent.isNewProfile ? (
                <View className="bg-orange-500 px-2.5 py-1 rounded-full mr-2">
                  <Text className="text-white text-xs font-medium">New profile</Text>
                </View>
              ) : null}
              <Text className="text-gray-400 text-xs mr-2">({talent.reviewCount} reviews)</Text>
              {talent.isAvailable ? (
                <View className="flex-row items-center">
                  <View className="w-2 h-2 rounded-full bg-green-500 mr-1" />
                  <Text className="text-green-500 text-xs">Available Today</Text>
                </View>
              ) : null}
            </View>

            {/* Profile Info Row */}
            <View className="flex-row items-center mt-4">
              <Image
                source={{ uri: talent.avatar }}
                className="w-8 h-8 rounded-full"
                resizeMode="cover"
              />
              <Text className="text-white text-sm font-medium ml-2">{talent.name}</Text>
              <View className="w-1 h-1 rounded-full bg-gray-500 mx-2" />
              <Clock size={12} color="#9CA3AF" />
              <Text className="text-gray-400 text-xs ml-1">Active {talent.activeAgo}</Text>
            </View>

            <View className="flex-row items-center mt-2">
              <MapPin size={12} color="#9CA3AF" />
              <Text className="text-gray-400 text-xs ml-1">Based in {talent.location}</Text>
              <View className="w-1 h-1 rounded-full bg-gray-500 mx-2" />
              <Text className="text-gray-400 text-xs">Starting from SAR {talent.startingPrice}</Text>
            </View>

            {/* CTA Buttons */}
            <View className="flex-row items-center mt-5">
              <Pressable
                onPress={() => {
                  console.log('[BookNow] top Book button press');
                  setBookingSheetStep(1);
                  setSelectedSheetCategory(null);
                  setShowBookingSheet(true);
                }}
                className="flex-1 py-3.5 rounded-xl items-center mr-3"
                style={{ backgroundColor: COLORS.orange }}
              >
                <Text className="text-white text-base font-semibold">Book</Text>
              </Pressable>
              <Pressable
                onPress={() => setShowInquiryDialog(true)}
                className="flex-1 flex-row py-3.5 rounded-xl items-center justify-center mr-3"
                style={{ backgroundColor: '#2A2A2A' }}
              >
                <MessageCircle size={18} color="#FFFFFF" />
                <Text className="text-white text-base font-semibold ml-2">Message</Text>
              </Pressable>
              <Pressable
                onPress={handleToggleFavorite}
                disabled={isTogglingFavorite}
                className="w-12 h-12 rounded-xl items-center justify-center"
                style={{ backgroundColor: '#2A2A2A' }}
              >
                <Heart
                  size={20}
                  color={isFavorited ? COLORS.orange : '#FFFFFF'}
                  fill={isFavorited ? COLORS.orange : 'transparent'}
                />
              </Pressable>
            </View>
          </Animated.View>
        </View>

        {/* Stats Row - Light Background */}
        <View className="flex-row bg-white border-b border-gray-100">
          <StatsItem
            icon={<Star size={18} color={COLORS.orange} fill={COLORS.orange} />}
            value={talent.isNewProfile ? 'New' : talent.rating.toFixed(1)}
            label={talent.isNewProfile ? 'Profile' : 'Rating'}
          />
          <StatsItem
            icon={<MessageCircle size={18} color={COLORS.grayText} />}
            value={talent.reviewCount.toString()}
            label="Reviews"
          />
          <StatsItem
            icon={<CheckCircle size={18} color={COLORS.grayText} />}
            value={talent.reliabilityScore ? `${talent.reliabilityScore}%` : '-'}
            label="Reliability"
          />
          <StatsItem
            icon={<Briefcase size={18} color={COLORS.grayText} />}
            value={talent.gigsCompleted.toString()}
            label="Gigs"
          />
        </View>

        {/* Influencer Details Section */}
        <Animated.View
          entering={FadeInDown.delay(200).duration(400)}
          className="px-4 pt-6 pb-4 bg-white"
        >
          <View className="flex-row items-center mb-4">
            <Text className="text-gray-900 text-lg font-semibold">Influencer Details</Text>
            {talent.isVerified ? (
              <View className="flex-row items-center bg-green-50 px-2.5 py-1 rounded-full ml-2">
                <CheckCircle size={12} color={COLORS.green} />
                <Text className="text-green-600 text-xs font-medium ml-1">Verified</Text>
              </View>
            ) : null}
          </View>

          {/* Content Focus */}
          <Text className="text-gray-500 text-sm mb-2">Content Focus</Text>
          <View className="flex-row flex-wrap mb-4">
            {talent.contentFocus.map((item, index) => (
              <TagChip key={`contentFocus-${index}-${item}`} label={item} />
            ))}
          </View>

          {/* Audience */}
          <Text className="text-gray-500 text-sm mb-2">Audience</Text>
          <View className="flex-row flex-wrap mb-4">
            {talent.audience.map((item, index) => (
              <TagChip key={`audience-${index}-${item}`} label={item} />
            ))}
          </View>

          {/* Social Media */}
          <Text className="text-gray-500 text-sm mb-2">Social Media</Text>
          <View className="flex-row flex-wrap">
            {talent.socialMedia.map((item, index) => (
              <SocialChip key={`socialMedia-${index}-${item.platform}`} platform={item.platform} />
            ))}
          </View>
        </Animated.View>

        {/* Model Specifications Section - Only show for models */}
        {talent.category === 'model' && (
          <Animated.View
            entering={FadeInDown.delay(300).duration(400)}
            className="px-4 pt-4 pb-2 bg-gray-50"
          >
            <Text className="text-gray-900 text-lg font-semibold mb-4">Model Specifications</Text>
            <View className="flex-row flex-wrap">
              {talent.modelSpecs.height ? (
                <SpecItem label="Height" value={talent.modelSpecs.height} />
              ) : null}
              {talent.modelSpecs.weight ? (
                <SpecItem label="Weight" value={talent.modelSpecs.weight} />
              ) : null}
              {talent.modelSpecs.build ? (
                <SpecItem label="Build" value={talent.modelSpecs.build} />
              ) : null}
              {talent.modelSpecs.shoeSize ? (
                <SpecItem label="Shoe Size" value={talent.modelSpecs.shoeSize} />
              ) : null}
              {talent.modelSpecs.nationality ? (
                <SpecItem label="Nationality" value={talent.modelSpecs.nationality} />
              ) : null}
              {talent.modelSpecs.ethnicity ? (
                <SpecItem label="Ethnicity" value={talent.modelSpecs.ethnicity} />
              ) : null}
              {talent.modelSpecs.bust ? (
                <SpecItem label="Bust" value={`${talent.modelSpecs.bust} cm`} />
              ) : null}
              {talent.modelSpecs.waist ? (
                <SpecItem label="Waist" value={`${talent.modelSpecs.waist} cm`} />
              ) : null}
              {talent.modelSpecs.hips ? (
                <SpecItem label="Hips" value={`${talent.modelSpecs.hips} cm`} />
              ) : null}
            </View>
          </Animated.View>
        )}

        {/* Tab Section */}
        <View className="bg-white">
          {/* Main Tabs */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 16 }}
            style={{ flexGrow: 0 }}
            className="border-b border-gray-100"
          >
            {tabs.map((tab) => (
              <Pressable
                key={tab}
                onPress={() => setActiveTab(tab.split(' ')[0])}
                className={cn(
                  'py-4 mr-6',
                  activeTab === tab.split(' ')[0] && 'border-b-2 border-orange-500'
                )}
              >
                <Text
                  className={cn(
                    'text-sm font-medium',
                    activeTab === tab.split(' ')[0] ? 'text-orange-500' : 'text-gray-500'
                  )}
                >
                  {tab}
                </Text>
              </Pressable>
            ))}
          </ScrollView>

          {/* Portfolio Content */}
          {activeTab === 'Portfolio' ? (
            <Animated.View entering={FadeInDown.delay(100).duration(300)}>
              {/* Sub-tabs */}
              <View className="flex-row px-4 py-3 border-b border-gray-100">
                <Pressable
                  onPress={() => setActiveSubTab('Portfolio')}
                  className={cn(
                    'px-4 py-2 rounded-full mr-2',
                    activeSubTab === 'Portfolio' ? 'bg-gray-900' : 'bg-gray-100'
                  )}
                >
                  <Text
                    className={cn(
                      'text-sm font-medium',
                      activeSubTab === 'Portfolio' ? 'text-white' : 'text-gray-600'
                    )}
                  >
                    Portfolio ({talent.portfolio.length})
                  </Text>
                </Pressable>
                <Pressable
                  onPress={() => setActiveSubTab('CaseStudy')}
                  className={cn(
                    'px-4 py-2 rounded-full',
                    activeSubTab === 'CaseStudy' ? 'bg-gray-900' : 'bg-gray-100'
                  )}
                >
                  <Text
                    className={cn(
                      'text-sm font-medium',
                      activeSubTab === 'CaseStudy' ? 'text-white' : 'text-gray-600'
                    )}
                  >
                    Case Study
                  </Text>
                </Pressable>
              </View>

              {/* Portfolio Grid */}
              <View className="flex-row flex-wrap px-4 pt-4">
                {talent.portfolio.length > 0 ? (
                  talent.portfolio.map((uri, index) => (
                    <PortfolioImage
                      key={`portfolio-${index}-${uri}`}
                      uri={uri}
                      index={index}
                      onPress={() => {
                        setSelectedImageIndex(index);
                        setShowPortfolioViewer(true);
                      }}
                    />
                  ))
                ) : (
                  <View className="w-full py-12 items-center">
                    <Text className="text-gray-400 text-sm">No portfolio items yet</Text>
                  </View>
                )}
              </View>
            </Animated.View>
          ) : null}

          {/* Packages Content */}
          {activeTab === 'Packages' ? (
            <Animated.View
              entering={FadeInDown.delay(100).duration(300)}
              className="px-4 pt-4 pb-4"
            >
              {activePackages.length > 0 ? (
                <>
                  {activePackages.map((pkg) => (
                    <Pressable
                      key={pkg.id}
                      onPress={() => {
                        console.log('[BookNow] package press:', pkg.id);
                        router.push({
                          pathname: '/(client)/booking/new',
                          params: { talent: id, package: pkg.id },
                        } as any);
                      }}
                      className="bg-white rounded-lg p-4 mb-3 border border-gray-100"
                    >
                      <View className="flex-row items-start justify-between mb-2">
                        <View className="flex-1 pr-2">
                          <View className="flex-row items-center">
                            <Text className="text-gray-900 text-base font-semibold flex-1">{pkg.name}</Text>
                            {pkg.instant_book_enabled ? (
                              <View className="bg-orange-100 px-2 py-1 rounded-full ml-2">
                                <Text className="text-orange-600 text-xs font-medium">Instant ⚡</Text>
                              </View>
                            ) : null}
                          </View>
                          {pkg.description ? (
                            <Text className="text-gray-600 text-sm mt-1 line-clamp-2">{pkg.description}</Text>
                          ) : null}
                        </View>
                        <View>
                          <Text className="text-orange-500 text-xl font-bold">
                            {pkg.currency || 'SAR'} {pkg.base_price}
                          </Text>
                          {pkg.duration_hours ? (
                            <Text className="text-gray-500 text-xs text-right mt-0.5">
                              {pkg.duration_hours}h duration
                            </Text>
                          ) : null}
                        </View>
                      </View>

                      {(pkg.includes || []).slice(0, 4).length > 0 && (
                        <View className="mt-3">
                          {(pkg.includes || []).slice(0, 4).map((item: string) => (
                            <View key={item} className="flex-row items-center mt-1">
                              <CheckCircle size={14} color={COLORS.green} fill={COLORS.green} />
                              <Text className="text-gray-600 text-sm ml-2 flex-1">{item}</Text>
                            </View>
                          ))}
                        </View>
                      )}

                      {pkg.revisions_included !== undefined && (
                        <Text className="text-gray-500 text-xs mt-2">{pkg.revisions_included} revisions</Text>
                      )}

                      <Pressable
                        onPress={() => {
                          console.log('[BookNow] package CTA press:', pkg.id);
                          router.push({
                            pathname: '/(client)/booking/new',
                            params: { talent: id, package: pkg.id },
                          } as any);
                        }}
                        className={cn(
                          'mt-3 py-2.5 rounded-lg items-center',
                          pkg.instant_book_enabled
                            ? 'bg-orange-500'
                            : 'bg-orange-100'
                        )}
                      >
                        <Text className={cn(
                          'font-semibold',
                          pkg.instant_book_enabled
                            ? 'text-white'
                            : 'text-orange-600'
                        )}>
                          {pkg.instant_book_enabled ? 'Book Now' : 'Request Booking'}
                        </Text>
                      </Pressable>
                    </Pressable>
                  ))}

                  <Pressable className="mt-2 py-3 px-4 rounded-lg border border-orange-500 items-center">
                    <Text className="text-orange-500 font-semibold">Request Custom Quote</Text>
                  </Pressable>
                </>
              ) : (
                <View className="py-12 items-center">
                  <AlertCircle size={40} color={COLORS.grayText} />
                  <Text className="text-gray-500 text-sm mt-2">No packages available</Text>
                </View>
              )}
            </Animated.View>
          ) : null}

          {/* Reviews Content */}
          {activeTab === 'Reviews' ? (
            <Animated.View
              entering={FadeInDown.delay(100).duration(300)}
              className="px-4 pt-4 pb-4"
            >
              {talent.reviews.length > 0 ? (
                <>
                  {/* Rating Summary */}
                  <View className="bg-white rounded-lg p-4 mb-4 border border-gray-100">
                    <View className="flex-row items-center mb-3">
                      <Star size={24} color={COLORS.orange} fill={COLORS.orange} />
                      <Text className="text-gray-900 text-2xl font-bold ml-2">{talent.rating}</Text>
                      <Text className="text-gray-500 text-sm ml-1">({talent.reviewCount} reviews)</Text>
                    </View>
                  </View>

                  {/* Rating Distribution */}
                  <RatingDistribution reviews={talent.reviews} />

                  {/* Sort Dropdown */}
                  <View className="mb-4">
                    <Pressable
                      onPress={() => {
                        // Toggle sort options
                        const options = ['latest', 'highest', 'lowest'] as const;
                        const currentIndex = options.indexOf(reviewsSortBy);
                        const nextIndex = (currentIndex + 1) % options.length;
                        setReviewsSortBy(options[nextIndex]);
                      }}
                      className="flex-row items-center justify-between py-2 px-3 bg-gray-50 rounded-lg"
                    >
                      <Text className="text-gray-700 text-sm">
                        {reviewsSortBy === 'latest' ? 'Latest first' : reviewsSortBy === 'highest' ? 'Highest rated' : 'Lowest rated'}
                      </Text>
                      <ChevronDown size={18} color={COLORS.grayText} />
                    </Pressable>
                  </View>

                  {/* Reviews List */}
                  {displayedReviews.map((review) => (
                    <View
                      key={review.id}
                      className="bg-white rounded-lg p-4 mb-3 border border-gray-100"
                    >
                      <View className="flex-row items-center mb-2">
                        <AvatarWithInitials
                          uri={review.clientAvatar}
                          name={review.clientName || 'Reviewer'}
                          size={40}
                        />
                        <View className="ml-3 flex-1">
                          <Text className="text-gray-900 text-sm font-medium">{review.clientName}</Text>
                          <View className="flex-row items-center mt-0.5">
                            {Array.from({ length: 5 }).map((_, i) => (
                              <Star
                                key={`${review.id}-star-${i}`}
                                size={12}
                                color={COLORS.orange}
                                fill={i < (review.rating || 0) ? COLORS.orange : 'transparent'}
                              />
                            ))}
                          </View>
                        </View>
                        <Text className="text-gray-400 text-xs">
                          {review.date ? new Date(review.date).toLocaleDateString('en-US', {
                            month: 'long',
                            day: 'numeric',
                            year: 'numeric',
                          }) : ''}
                        </Text>
                      </View>
                      <Text className="text-gray-600 text-sm">{review.text}</Text>
                    </View>
                  ))}

                  {/* Show All Button */}
                  {!showAllReviews && talent.reviews.length > 5 && (
                    <Pressable
                      onPress={() => setShowAllReviews(true)}
                      className="py-3 px-4 rounded-lg border border-gray-200 items-center mt-2"
                    >
                      <Text className="text-gray-700 font-semibold">
                        Show all {talent.reviews.length} reviews
                      </Text>
                    </Pressable>
                  )}
                </>
              ) : (
                <View className="py-12 items-center">
                  <AlertCircle size={40} color={COLORS.grayText} />
                  <Text className="text-gray-500 text-sm mt-2">No reviews yet</Text>
                </View>
              )}
            </Animated.View>
          ) : null}

          {/* Availability Content */}
          {activeTab === 'Availability' ? (
            <Animated.View
              entering={FadeInDown.delay(100).duration(300)}
              className="px-4 pt-4 pb-4"
            >
              <AvailabilityCalendar talent={talent} />

              <Pressable
                onPress={() => {
                  console.log('[BookNow] availability Book press');
                  setBookingSheetStep(1);
                  setSelectedSheetCategory(null);
                  setShowBookingSheet(true);
                }}
                className="bg-orange-500 rounded-lg py-3.5 items-center"
              >
                <Text className="text-white font-semibold">Book</Text>
              </Pressable>
            </Animated.View>
          ) : null}
        </View>
      </ScrollView>

      {/* Booking Flow Bottom Sheet (two-step) */}
      <Modal
        visible={showBookingSheet}
        transparent
        animationType="slide"
        onRequestClose={() => {
          setShowBookingSheet(false);
          setBookingSheetStep(1);
          setSelectedSheetCategory(null);
        }}
      >
        <Pressable
          style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' }}
          onPress={() => {
            setShowBookingSheet(false);
            setBookingSheetStep(1);
            setSelectedSheetCategory(null);
          }}
        >
          <Pressable
            onPress={() => { /* swallow */ }}
            style={{
              height: '80%',
              backgroundColor: '#0A0A0A',
              borderTopLeftRadius: 28,
              borderTopRightRadius: 28,
              overflow: 'hidden',
            }}
          >
            {/* Grabber */}
            <View style={{ alignItems: 'center', paddingTop: 8 }}>
              <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: '#3F3F46' }} />
            </View>

            {/* Header */}
            <View style={{ paddingHorizontal: 16, paddingTop: 12, paddingBottom: 8, position: 'relative' }}>
              <Text style={{ color: '#FFFFFF', fontSize: 18, fontWeight: '700', textAlign: 'center' }}>
                Book {talent.name}
              </Text>
              <Pressable
                onPress={() => {
                  setShowBookingSheet(false);
                  setBookingSheetStep(1);
                  setSelectedSheetCategory(null);
                }}
                hitSlop={8}
                style={{
                  position: 'absolute',
                  right: 8,
                  top: 6,
                  width: 44,
                  height: 44,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <X size={22} color="#9CA3AF" />
              </Pressable>
            </View>

            <ScrollView
              style={{ flex: 1 }}
              contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: insets.bottom + 24, paddingTop: 8 }}
              showsVerticalScrollIndicator={false}
            >
              {bookingSheetStep === 1 ? (
                <>
                  <Text style={{ color: '#9CA3AF', fontSize: 13, marginBottom: 12 }}>What do you need?</Text>

                  {/* Category cards from talent's actual categories */}
                  {sheetCategoryOptions.length > 0 ? (
                    sheetCategoryOptions.map((cat) => (
                      <Pressable
                        key={cat.key}
                        onPress={() => {
                          console.log('[BookNow] sheet category pick:', cat.key);
                          setSelectedSheetCategory(cat);
                          setBookingSheetStep(2);
                        }}
                        style={{
                          backgroundColor: '#1C1C1E',
                          borderRadius: 16,
                          padding: 16,
                          marginBottom: 12,
                          flexDirection: 'row',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          minHeight: 64,
                        }}
                      >
                        <View style={{ flex: 1 }}>
                          <Text style={{ color: '#FFFFFF', fontSize: 16, fontWeight: '700' }}>
                            {cat.label}
                          </Text>
                          <Text style={{ color: '#9CA3AF', fontSize: 12, marginTop: 2 }}>
                            {cat.subtitle}
                          </Text>
                        </View>
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                          {cat.priceLabel ? (
                            <Text style={{ color: '#FA5610', fontSize: 15, fontWeight: '700', marginRight: 8 }}>
                              {cat.priceLabel}
                              <Text style={{ color: '#9CA3AF', fontSize: 12, fontWeight: '500' }}>
                                {cat.priceUnit}
                              </Text>
                            </Text>
                          ) : null}
                          <ChevronRight size={18} color="#6B7280" />
                        </View>
                      </Pressable>
                    ))
                  ) : null}

                  {/* Custom Offer */}
                  <Pressable
                    onPress={() => {
                      console.log('[BookNow] sheet custom offer');
                      setShowBookingSheet(false);
                      setBookingSheetStep(1);
                      setSelectedSheetCategory(null);
                      router.push({
                        pathname: '/(client)/booking/new',
                        params: { talent: id, rateType: 'custom' },
                      } as any);
                    }}
                    style={{
                      borderRadius: 16,
                      padding: 16,
                      borderWidth: 1,
                      borderColor: '#3F3F46',
                      borderStyle: 'dashed',
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      marginTop: 4,
                      marginBottom: 24,
                    }}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: '#FFFFFF', fontSize: 16, fontWeight: '700' }}>
                        Make a Custom Offer
                      </Text>
                      <Text style={{ color: '#9CA3AF', fontSize: 12, marginTop: 2 }}>
                        Propose your own time, location & price
                      </Text>
                    </View>
                    <MessageSquare size={18} color="#9CA3AF" />
                  </Pressable>
                </>
              ) : (
                <>
                  {/* Back + selected chip */}
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
                    <Pressable
                      onPress={() => {
                        setBookingSheetStep(1);
                        setSelectedSheetCategory(null);
                      }}
                      hitSlop={8}
                      style={{ flexDirection: 'row', alignItems: 'center', marginRight: 12 }}
                    >
                      <ArrowLeft size={16} color="#FFFFFF" />
                      <Text style={{ color: '#FFFFFF', fontSize: 14, fontWeight: '600', marginLeft: 4 }}>
                        Back
                      </Text>
                    </Pressable>

                    {selectedSheetCategory ? (
                      <View
                        style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          paddingHorizontal: 12,
                          paddingVertical: 6,
                          borderRadius: 999,
                          borderWidth: 1,
                          borderColor: '#22C55E',
                          backgroundColor: 'rgba(34,197,94,0.1)',
                        }}
                      >
                        <CheckCircle size={12} color="#22C55E" />
                        <Text style={{ color: '#22C55E', fontSize: 12, fontWeight: '600', marginLeft: 4 }}>
                          {selectedSheetCategory.label}
                        </Text>
                      </View>
                    ) : null}
                  </View>

                  <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
                    <CalendarIcon size={14} color="#FA5610" />
                    <Text style={{ color: '#FFFFFF', fontSize: 14, fontWeight: '700', marginLeft: 6 }}>
                      Book by Rate
                    </Text>
                  </View>

                  {/* Rate cards */}
                  {sheetRateOptions.map((rate) => (
                    <Pressable
                      key={rate.key}
                      onPress={() => {
                        console.log('[BookNow] sheet rate pick:', rate.key);
                        setShowBookingSheet(false);
                        setBookingSheetStep(1);
                        const cat = selectedSheetCategory?.key;
                        setSelectedSheetCategory(null);
                        router.push({
                          pathname: '/(client)/booking/new',
                          params: {
                            talent: id,
                            rateType: rate.key,
                            ...(cat ? { category: cat } : {}),
                          },
                        } as any);
                      }}
                      style={{
                        backgroundColor: '#1C1C1E',
                        borderRadius: 16,
                        padding: 16,
                        marginBottom: 12,
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        minHeight: 64,
                      }}
                    >
                      <View style={{ flex: 1 }}>
                        <Text style={{ color: '#FFFFFF', fontSize: 16, fontWeight: '700' }}>
                          {rate.label}
                        </Text>
                        <Text style={{ color: '#9CA3AF', fontSize: 12, marginTop: 2 }}>
                          {rate.subtitle}
                        </Text>
                      </View>
                      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <Text style={{ color: '#FA5610', fontSize: 15, fontWeight: '700', marginRight: 8 }}>
                          {rate.priceLabel}
                          <Text style={{ color: '#9CA3AF', fontSize: 12, fontWeight: '500' }}>
                            {rate.priceUnit}
                          </Text>
                        </Text>
                        <ChevronRight size={18} color="#6B7280" />
                      </View>
                    </Pressable>
                  ))}

                  {/* Custom Offer */}
                  <Pressable
                    onPress={() => {
                      console.log('[BookNow] sheet custom offer (step 2)');
                      setShowBookingSheet(false);
                      setBookingSheetStep(1);
                      const cat = selectedSheetCategory?.key;
                      setSelectedSheetCategory(null);
                      router.push({
                        pathname: '/(client)/booking/new',
                        params: {
                          talent: id,
                          rateType: 'custom',
                          ...(cat ? { category: cat } : {}),
                        },
                      } as any);
                    }}
                    style={{
                      borderRadius: 16,
                      padding: 16,
                      borderWidth: 1,
                      borderColor: '#3F3F46',
                      borderStyle: 'dashed',
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      marginTop: 4,
                      marginBottom: 24,
                    }}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: '#FFFFFF', fontSize: 16, fontWeight: '700' }}>
                        Make a Custom Offer
                      </Text>
                      <Text style={{ color: '#9CA3AF', fontSize: 12, marginTop: 2 }}>
                        Propose your own time, location & price
                      </Text>
                    </View>
                    <MessageSquare size={18} color="#9CA3AF" />
                  </Pressable>
                </>
              )}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Inquiry Message Dialog */}
      <Modal
        visible={showInquiryDialog}
        transparent
        animationType="fade"
        onRequestClose={() => setShowInquiryDialog(false)}
      >
        <Pressable
          className="flex-1 bg-black/60 items-center justify-center"
          onPress={() => setShowInquiryDialog(false)}
        >
          <Pressable
            onPress={(e) => e.stopPropagation()}
            className="bg-[#1A1A1A] rounded-2xl w-11/12 max-w-sm overflow-hidden"
            style={{ maxHeight: '85%' }}
          >
            {/* Header with close button */}
            <View className="px-4 pt-4 flex-row justify-end">
              <Pressable
                onPress={() => setShowInquiryDialog(false)}
                className="w-8 h-8 items-center justify-center rounded-full bg-gray-800"
              >
                <X size={18} color="#9CA3AF" />
              </Pressable>
            </View>

            {/* Avatar */}
            <View className="items-center pt-2 pb-4">
              {talent.avatar ? (
                <Image
                  source={{ uri: talent.avatar }}
                  style={{ width: 80, height: 80, borderRadius: 40 }}
                  resizeMode="cover"
                />
              ) : (
                <View
                  style={{
                    width: 80,
                    height: 80,
                    borderRadius: 40,
                    backgroundColor: COLORS.orange,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Text className="text-white text-3xl font-bold">
                    {talent.name
                      .split(' ')
                      .map((n) => n[0])
                      .join('')
                      .toUpperCase()
                      .slice(0, 2)}
                  </Text>
                </View>
              )}
            </View>

            {/* Title */}
            <View className="items-center px-4">
              <Text className="text-white text-xl font-bold">Message {talent.name}</Text>
              <Text className="text-gray-400 text-sm mt-1">Start a conversation</Text>
            </View>

            {/* Quick Reply Buttons */}
            <View className="px-4 py-5">
              <View className="flex-row flex-wrap gap-2 justify-center">
                {QUICK_REPLIES.map((reply) => (
                  <Pressable
                    key={reply}
                    onPress={() => setInquiryMessage(reply)}
                    className="px-3 py-2 border border-gray-600 rounded-full"
                    style={{
                      backgroundColor: inquiryMessage === reply ? '#374151' : 'transparent',
                    }}
                  >
                    <Text className="text-white text-sm">{reply}</Text>
                  </Pressable>
                ))}
              </View>
            </View>

            {/* Message Input */}
            <View className="px-4">
              <TextInput
                className="bg-[#2A2A2A] border border-gray-700 rounded-xl px-4 py-3 text-white text-base"
                style={{ minHeight: 100, textAlignVertical: 'top' }}
                placeholder="Write your message..."
                placeholderTextColor="#6B7280"
                value={inquiryMessage}
                onChangeText={setInquiryMessage}
                editable={!isSendingInquiry}
                multiline
                maxLength={500}
              />
            </View>

            {/* Send Button */}
            <View className="px-4 pt-4 pb-2">
              <Pressable
                onPress={handleSendInquiry}
                disabled={!inquiryMessage.trim() || isSendingInquiry}
                className="rounded-full py-3.5 items-center flex-row justify-center"
                style={{
                  backgroundColor: !inquiryMessage.trim() || isSendingInquiry ? '#4B5563' : COLORS.orange,
                }}
              >
                {isSendingInquiry ? (
                  <ActivityIndicator size="small" color="white" />
                ) : (
                  <>
                    <Send size={18} color="white" />
                    <Text className="text-white text-base font-semibold ml-2">Send Message</Text>
                  </>
                )}
              </Pressable>
            </View>

            {/* Footer Text */}
            <View className="px-4 pt-2 pb-5">
              <Text className="text-gray-500 text-xs text-center">
                Your contact info will be shared with {talent.name}
              </Text>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Portfolio Image Viewer Modal */}
      <Modal
        visible={showPortfolioViewer}
        transparent
        animationType="fade"
        onRequestClose={() => setShowPortfolioViewer(false)}
      >
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.95)' }}>
          {/* Header */}
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingTop: insets.top + 10,
              paddingHorizontal: 16,
              paddingBottom: 10,
            }}
          >
            <Pressable
              onPress={() => setShowPortfolioViewer(false)}
              style={{
                width: 40,
                height: 40,
                borderRadius: 20,
                backgroundColor: 'rgba(255,255,255,0.1)',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <X size={24} color="#FFFFFF" />
            </Pressable>
            <Text style={{ color: '#FFFFFF', fontSize: 16, fontWeight: '600' }}>
              {selectedImageIndex + 1} / {talent.portfolio.length}
            </Text>
            <View style={{ width: 40 }} />
          </View>

          {/* Image Gallery */}
          <FlatList
            data={talent.portfolio}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            initialScrollIndex={selectedImageIndex}
            getItemLayout={(data, index) => ({
              length: SCREEN_WIDTH,
              offset: SCREEN_WIDTH * index,
              index,
            })}
            onMomentumScrollEnd={(e) => {
              const newIndex = Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH);
              setSelectedImageIndex(newIndex);
            }}
            keyExtractor={(item, index) => `viewer-${index}-${item}`}
            renderItem={({ item: uri }) => (
              <View
                style={{
                  width: SCREEN_WIDTH,
                  flex: 1,
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: 16,
                }}
              >
                <Image
                  source={{ uri }}
                  style={{
                    width: SCREEN_WIDTH - 32,
                    height: '100%',
                    borderRadius: 12,
                  }}
                  resizeMode="contain"
                />
              </View>
            )}
            style={{ flex: 1 }}
          />

          {/* Thumbnail Strip */}
          {talent.portfolio.length > 1 ? (
            <View
              style={{
                paddingBottom: insets.bottom + 20,
                paddingTop: 16,
                backgroundColor: 'rgba(0,0,0,0.5)',
              }}
            >
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ paddingHorizontal: 16 }}
                style={{ flexGrow: 0 }}
              >
                {talent.portfolio.map((uri, index) => (
                  <Pressable
                    key={`thumb-${index}-${uri}`}
                    onPress={() => setSelectedImageIndex(index)}
                    style={{
                      width: 60,
                      height: 60,
                      marginRight: 8,
                      borderRadius: 8,
                      overflow: 'hidden',
                      borderWidth: selectedImageIndex === index ? 2 : 0,
                      borderColor: COLORS.orange,
                      opacity: selectedImageIndex === index ? 1 : 0.6,
                    }}
                  >
                    <Image
                      source={{ uri }}
                      style={{ width: '100%', height: '100%' }}
                      resizeMode="cover"
                    />
                  </Pressable>
                ))}
              </ScrollView>
            </View>
          ) : null}
        </View>
      </Modal>

      {/* Floating Book Button */}
      <Pressable
        onPress={() => {
          console.log('[BookNow] floating Book press');
          setBookingSheetStep(1);
          setSelectedSheetCategory(null);
          setShowBookingSheet(true);
        }}
        className="absolute right-4 rounded-full items-center justify-center"
        style={{
          bottom: insets.bottom + 20,
          backgroundColor: COLORS.orange,
          paddingHorizontal: 24,
          paddingVertical: 14,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.3,
          shadowRadius: 8,
          elevation: 8,
        }}
      >
        <Text className="text-white text-base font-semibold">Book</Text>
      </Pressable>
    </View>
  );
}
