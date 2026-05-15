import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  SafeAreaView,
  NativeScrollEvent,
  NativeSyntheticEvent,
  FlatList,
  Modal,
  Animated,
  Easing,
  TouchableOpacity,
  TextInput,
  Switch,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from '@/lib/router-helper';
import { useLocalSearchParams } from 'expo-router';
import { X, Star, MapPin, ChevronUp, ChevronLeft, SlidersHorizontal, Heart, Search, User, Zap } from 'lucide-react-native';
import { SearchBar } from '@/components/search/SearchBar';
import { CategoryCardRow } from '@/components/search/CategoryCardRow';
import { AvailabilitySortToolbar } from '@/components/search/AvailabilitySortToolbar';
import { useTalentSearch, TalentCard } from '@/hooks/useTalentSearch';
import { TalentSearchFilters } from '@/components/search/MobileFilterSheet';
import { OptimizedImage } from '@/components/OptimizedImage';
import { useShortlist } from '@/hooks/useShortlist';
import { useAuthStore } from '@/lib/state/auth-store';
import { categoryLabels } from '@/data/specialties';
import { getCountryLabel } from '@/data/locations';
import { RangeSlider } from '@/components/RangeSlider';
import { CardGridSkeleton } from '@/components/SkeletonLoader';
import { useTheme } from '@/lib/theme/ThemeContext';

interface FilterBadge {
  key: string;
  label: string;
}

const SCROLL_THRESHOLD = 0.7; // Load more at 70% scroll
const CATEGORY_ROW_HEIGHT = 88; // Height of category row with padding

export default function ClientSearchPage() {
  const router = useRouter();
  const { isDark } = useTheme();
  const params = useLocalSearchParams<{ category?: string }>();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(params.category ?? null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [showFilterSheet, setShowFilterSheet] = useState(false);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const insets = useSafeAreaInsets();

  // Filter state variables
  const [selectedGender, setSelectedGender] = useState<'male' | 'female' | null>(null);
  const [selectedNationality, setSelectedNationality] = useState<string | null>(null);
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 2000]);
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const [premiumOnly, setPremiumOnly] = useState(false);
  const [minRating, setMinRating] = useState<0 | 4 | 4.5 | 4.8>(0);
  const [nearMeEnabled, setNearMeEnabled] = useState(false);
  const [maxDistance, setMaxDistance] = useState(5);
  const [selectedCountry, setSelectedCountry] = useState<string | null>(null);
  const [selectedEthnicity, setSelectedEthnicity] = useState<string | null>(null);
  const [selectedBuild, setSelectedBuild] = useState<string | null>(null);
  const [heightRange, setHeightRange] = useState<[number, number]>([155, 195]);
  const [weightRange, setWeightRange] = useState<[number, number]>([40, 150]);
  const [selectedShoeSize, setSelectedShoeSize] = useState<string | null>(null);

  // Influencer filter state
  const [followerRange, setFollowerRange] = useState<[number, number]>([0, 1000000]);
  const [selectedNiches, setSelectedNiches] = useState<string[]>([]);
  const [selectedAudienceTypes, setSelectedAudienceTypes] = useState<string[]>([]);

  // Specialty filter state
  const [selectedSpecialties, setSelectedSpecialties] = useState<string[]>([]);

  // Nationality picker modal
  const [nationalitySheetOpen, setNationalitySheetOpen] = useState(false);
  const [nationalitySearch, setNationalitySearch] = useState('');

  const flatListRef = useRef<FlatList>(null);

  // Animated values
  const categoryRowAnim = useRef(new Animated.Value(1)).current;
  const scrollBtnOpacity = useRef(new Animated.Value(0)).current;
  const toolbarAnim = useRef(new Animated.Value(1)).current;

  // Nationality data
  const NATIONALITIES = [
    { id: 'emirati', label: 'Emirati', flag: '🇦🇪' },
    { id: 'saudi', label: 'Saudi Arabian', flag: '🇸🇦' },
    { id: 'egyptian', label: 'Egyptian', flag: '🇪🇬' },
    { id: 'lebanese', label: 'Lebanese', flag: '🇱🇧' },
    { id: 'moroccan', label: 'Moroccan', flag: '🇲🇦' },
    { id: 'jordanian', label: 'Jordanian', flag: '🇯🇴' },
    { id: 'kuwaiti', label: 'Kuwaiti', flag: '🇰🇼' },
    { id: 'qatari', label: 'Qatari', flag: '🇶🇦' },
    { id: 'british', label: 'British', flag: '🇬🇧' },
    { id: 'american', label: 'American', flag: '🇺🇸' },
    { id: 'indian', label: 'Indian', flag: '🇮🇳' },
    { id: 'pakistani', label: 'Pakistani', flag: '🇵🇰' },
    { id: 'filipino', label: 'Filipino', flag: '🇵🇭' },
    { id: 'french', label: 'French', flag: '🇫🇷' },
    { id: 'russian', label: 'Russian', flag: '🇷🇺' },
  ];

  const POPULAR_NATIONALITIES = ['emirati', 'saudi', 'egyptian', 'lebanese', 'moroccan'];
  const popularNats = POPULAR_NATIONALITIES.map(id => NATIONALITIES.find(n => n.id === id)).filter(Boolean);
  const remainingCount = NATIONALITIES.length - popularNats.length;

  // Calculate active filters count
  const activeFiltersCount = [
    verifiedOnly,
    premiumOnly,
    minRating > 0,
    priceRange[0] > 0 || priceRange[1] < 2000,
    nearMeEnabled,
    selectedCountry,
    selectedGender,
    selectedNationality,
    selectedEthnicity,
    selectedBuild,
    heightRange[0] > 155 || heightRange[1] < 195,
    weightRange[0] > 40 || weightRange[1] < 150,
    selectedShoeSize,
    followerRange[0] > 0 || followerRange[1] < 1000000,
    selectedNiches.length > 0,
    selectedAudienceTypes.length > 0,
    selectedSpecialties.length > 0,
  ].filter(Boolean).length;

  // Reset filters function
  const handleResetFilters = useCallback(() => {
    setSelectedGender(null);
    setSelectedNationality(null);
    setPriceRange([0, 2000]);
    setVerifiedOnly(false);
    setPremiumOnly(false);
    setMinRating(0);
    setNearMeEnabled(false);
    setMaxDistance(5);
    setSelectedCountry(null);
    setSelectedEthnicity(null);
    setSelectedBuild(null);
    setHeightRange([155, 195]);
    setWeightRange([40, 150]);
    setSelectedShoeSize(null);
    setFollowerRange([0, 1000000]);
    setSelectedNiches([]);
    setSelectedAudienceTypes([]);
    setSelectedSpecialties([]);
  }, []);

  const user = useAuthStore((state) => state.user);
  const { isInShortlist, addToShortlist, removeFromShortlist } = useShortlist(user);

  const { talents, loading, error, hasMore, filters, search, loadMore } = useTalentSearch({
    pageSize: 20,
    initialFilters: {
      sort: 'recommended',
      category: params.category ?? null,
    },
  });

  // Wire up all filter state to search function
  // This effect triggers when any filter changes and updates the Supabase query
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    const buildFilterObject = (): Partial<TalentSearchFilters> => {
      const filterObject: Partial<TalentSearchFilters> = {};

      // Only add filters that have non-default values
      if (verifiedOnly) filterObject.isVerified = true;
      if (premiumOnly) filterObject.isPremium = true;
      if (minRating > 0) filterObject.minRating = minRating;
      if (priceRange[0] > 0) filterObject.minPrice = priceRange[0];
      if (priceRange[1] < 2000) filterObject.maxPrice = priceRange[1];
      if (selectedCountry) filterObject.country = selectedCountry;
      if (selectedNationality) filterObject.nationality = selectedNationality;
      if (selectedGender) filterObject.gender = selectedGender;
      if (selectedEthnicity) filterObject.ethnicity = selectedEthnicity;
      if (selectedBuild) filterObject.build = selectedBuild;
      if (heightRange[0] > 155) filterObject.heightMin = heightRange[0];
      if (heightRange[1] < 195) filterObject.heightMax = heightRange[1];
      if (weightRange[0] > 40) filterObject.weight = weightRange[0]; // Weight min
      if (weightRange[1] < 150) filterObject.weightMax = weightRange[1]; // Weight max
      if (selectedShoeSize) filterObject.shoeSize = selectedShoeSize;
      if (followerRange[0] > 0) filterObject.followerCountMin = followerRange[0];
      if (followerRange[1] < 1000000) filterObject.followerCountMax = followerRange[1];
      if (selectedNiches.length > 0) filterObject.niches = selectedNiches;
      if (selectedAudienceTypes.length > 0) filterObject.audiences = selectedAudienceTypes;
      if (selectedSpecialties.length > 0) filterObject.specialties = selectedSpecialties;
      if (nearMeEnabled && maxDistance) filterObject.nearMeDistance = maxDistance;

      return filterObject;
    };

    // Build the complete filter object
    const updatedFilters: Partial<TalentSearchFilters> = {
      ...buildFilterObject(),
      query: searchQuery,
      category: selectedCategory,
      sort: filters.sort || 'recommended',
    };

    // Only trigger search if filters actually changed
    // This prevents unnecessary re-renders on mount
    // NOTE: We intentionally do NOT include filters, search, searchQuery, selectedCategory in dependencies
    // to avoid infinite loops. The comparison check (JSON.stringify) handles detecting changes.
    const filtersChanged = JSON.stringify(updatedFilters) !== JSON.stringify(filters);
    if (filtersChanged) {
      search(updatedFilters);
    }
  }, [
    verifiedOnly,
    premiumOnly,
    minRating,
    priceRange,
    selectedCountry,
    selectedNationality,
    selectedGender,
    selectedEthnicity,
    selectedBuild,
    heightRange,
    weightRange,
    selectedShoeSize,
    followerRange,
    selectedNiches,
    selectedAudienceTypes,
    selectedSpecialties,
    nearMeEnabled,
    maxDistance,
  ]);

  // Restore session state on mount

  // Animate header row and scroll-to-top button on scroll
  useEffect(() => {
    Animated.parallel([
      Animated.timing(categoryRowAnim, {
        toValue: isScrolled ? 0 : 1,
        duration: 250,
        easing: Easing.out(Easing.ease),
        useNativeDriver: false, // Must be false — animating height/layout
      }),
      Animated.timing(scrollBtnOpacity, {
        toValue: isScrolled ? 1 : 0,
        duration: 200,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true, // opacity can use native driver
      }),
      Animated.timing(toolbarAnim, {
        toValue: isScrolled ? 0 : 1,
        duration: 250,
        easing: Easing.out(Easing.ease),
        useNativeDriver: false, // Must be false — animating height/layout
      }),
    ]).start();
  }, [isScrolled]);

  // Handle search
  const handleSearch = useCallback(
    (query: string, category?: string | null) => {
      setSearchQuery(query);
      const newCategory = category !== undefined ? category : selectedCategory;
      setSelectedCategory(newCategory);

      const updatedFilters: Partial<TalentSearchFilters> = {
        query,
        category: newCategory,
      };

      search(updatedFilters);
    },
    [selectedCategory, search]
  );

  // Handle category toggle
  const handleCategoryChange = useCallback(
    (categoryId: string | null) => {
      setSelectedCategory(categoryId);
      const updatedFilters: Partial<TalentSearchFilters> = {
        category: categoryId,
      };

      search(updatedFilters);
    },
    [search]
  );

  // Handle filter apply
  const handleApplyFilters = useCallback(
    (newFilters: TalentSearchFilters) => {
      search(newFilters);
      setShowFilterSheet(false);
    },
    [search]
  );

  // Handle availability change
  const handleAvailabilityChange = useCallback(
    (availability: 'instant' | 'today' | 'tomorrow' | 'custom' | null) => {
      const updatedFilters: Partial<TalentSearchFilters> = {
        availabilityFilter: availability,
      };

      search(updatedFilters);
    },
    [search]
  );

  // Handle sort change
  const handleSortChange = useCallback(
    (sortId: string) => {
      const updatedFilters: Partial<TalentSearchFilters> = {
        sort: sortId,
      };

      search(updatedFilters);
    },
    [search]
  );

  // Get active filter badges
  const getFilterBadges = (): FilterBadge[] => {
    const badges: FilterBadge[] = [];

    if (filters.query) {
      badges.push({ key: 'query', label: `"${filters.query}"` });
    }
    if (filters.category) {
      const categoryName = Object.entries(categoryLabels).find(
        ([id]) => id === filters.category
      )?.[1] || filters.category;
      badges.push({ key: 'category', label: categoryName });
    }
    if (filters.country) {
      badges.push({ key: 'country', label: getCountryLabel(filters.country) });
    }
    if (filters.isVerified) {
      badges.push({ key: 'verified', label: 'Verified Only' });
    }
    if (filters.isPremium) {
      badges.push({ key: 'premium', label: 'Premium Only' });
    }
    if (filters.minRating) {
      badges.push({ key: 'rating', label: `${filters.minRating}+ Stars` });
    }
    if (filters.minPrice || filters.maxPrice) {
      const minLabel = filters.minPrice ? `${filters.minPrice}` : '0';
      const maxLabel = filters.maxPrice ? `${filters.maxPrice}` : '∞';
      badges.push({ key: 'price', label: `${minLabel} - ${maxLabel} AED` });
    }
    if (filters.specialties && filters.specialties.length > 0) {
      badges.push({ key: 'specialties', label: `${filters.specialties.length} specialty filters` });
    }

    return badges;
  };

  // Remove filter badge
  const removeFilterBadge = useCallback(
    (badgeKey: string) => {
      const updatedFilters: Partial<TalentSearchFilters> = {};

      switch (badgeKey) {
        case 'query':
          updatedFilters.query = '';
          setSearchQuery('');
          break;
        case 'category':
          updatedFilters.category = null;
          setSelectedCategory(null);
          break;
        case 'country':
          updatedFilters.country = null;
          break;
        case 'verified':
          updatedFilters.isVerified = false;
          break;
        case 'premium':
          updatedFilters.isPremium = false;
          break;
        case 'rating':
          updatedFilters.minRating = null;
          break;
        case 'price':
          updatedFilters.minPrice = null;
          updatedFilters.maxPrice = null;
          break;
        case 'specialties':
          updatedFilters.specialties = [];
          break;
      }

      search(updatedFilters);
    },
    [search]
  );

  // Infinite scroll handler
  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const { contentOffset, contentSize, layoutMeasurement } = event.nativeEvent;
    const scrollPosition = contentOffset.y;
    const scrollableHeight = contentSize.height - layoutMeasurement.height;
    const progress = scrollPosition / scrollableHeight;

    // Check if scrolled past 100 units
    const shouldBeScrolled = scrollPosition > 100;
    if (shouldBeScrolled !== isScrolled) {
      setIsScrolled(shouldBeScrolled);
    }

    // Load more at 70% scroll
    if (progress > SCROLL_THRESHOLD) {
      loadMore();
    }

    // Show/hide scroll to top button
    setShowScrollTop(scrollPosition > 200);
  };

  // Render talent card (grid view) - Lovable Design
  const renderTalentCardGrid = ({ item }: { item: TalentCard }) => {
    const isLiked = isInShortlist(item.id);

    const handleHeartPress = () => {
      if (isLiked) {
        removeFromShortlist(item.id);
      } else {
        addToShortlist(item.id);
      }
    };

    // Theme colors
    const cardBgColor = isDark ? '#1C1C1C' : '#FFFFFF';
    const cardBorderColor = isDark ? 'rgba(255,255,255,0.08)' : '#E5E7EB';
    const textColor = isDark ? '#FFFFFF' : '#111827';
    const subtitleColor = isDark ? '#9CA3AF' : '#6B7280';
    const primaryColor = '#FA5610';

    // Get category label
    const categoryLabel = filters.category && categoryLabels[filters.category as keyof typeof categoryLabels]
      ? categoryLabels[filters.category as keyof typeof categoryLabels]
      : 'Talent';

    return (
      <Pressable
        onPress={() => router.push(`/talent/${item.id}`)}
        style={{
          flex: 1,
          borderRadius: 16,
          overflow: 'hidden',
          backgroundColor: cardBgColor,
          borderWidth: 1,
          borderColor: cardBorderColor,
          marginBottom: 8,
        }}
      >
        {/* Image Container - 3:4 aspect ratio */}
        <View style={{ aspectRatio: 3 / 4, backgroundColor: isDark ? '#2A2A2A' : '#F3F4F6', position: 'relative' }}>
          <OptimizedImage
            uri={item.imageUrl}
            width={180}
            height={240}
            borderRadius={0}
            fallbackText="No Image"
            showLoadingIndicator
          />

          {/* Online/Availability Indicator - Top Left */}
          <View
            style={{
              position: 'absolute',
              top: 10,
              left: 10,
              width: 12,
              height: 12,
              borderRadius: 6,
              backgroundColor: item.isVerified ? '#22C55E' : '#F59E0B',
              borderWidth: 2,
              borderColor: cardBgColor,
            }}
          />

          {/* Heart/Favorite Button - Top Right */}
          <Pressable
            onPress={handleHeartPress}
            style={{
              position: 'absolute',
              top: 8,
              right: 8,
              width: 32,
              height: 32,
              borderRadius: 16,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: 'rgba(255, 255, 255, 0.95)',
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.15,
              shadowRadius: 4,
              elevation: 4,
            }}
          >
            <Heart
              size={16}
              color={isLiked ? '#EF4444' : '#9CA3AF'}
              fill={isLiked ? '#EF4444' : 'none'}
            />
          </Pressable>
        </View>

        {/* Info Section */}
        <View style={{ padding: 12 }}>
          {/* Name */}
          <Text
            style={{
              fontSize: 14,
              fontWeight: '600',
              color: textColor,
              marginBottom: 2,
            }}
            numberOfLines={1}
          >
            {item.name}
          </Text>

          {/* Category */}
          <Text
            style={{
              fontSize: 12,
              color: subtitleColor,
              marginBottom: 6,
            }}
            numberOfLines={1}
          >
            {categoryLabel}
          </Text>

          {/* Price or Contact */}
          <Text
            style={{
              fontSize: 13,
              fontWeight: '600',
              color: primaryColor,
            }}
          >
            {item.hourlyRate > 0 ? `From AED ${item.hourlyRate}/hr` : 'Contact'}
          </Text>
        </View>

        {/* Bottom Action Buttons */}
        <View
          style={{
            flexDirection: 'row',
            borderTopWidth: 1,
            borderTopColor: cardBorderColor,
          }}
        >
          <Pressable
            onPress={() => router.push(`/talent/${item.id}`)}
            style={{
              flex: 1,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              paddingVertical: 10,
              gap: 6,
              borderRightWidth: 1,
              borderRightColor: cardBorderColor,
            }}
          >
            <User size={14} color={subtitleColor} />
            <Text style={{ fontSize: 11, color: subtitleColor, fontWeight: '500' }}>Profile</Text>
          </Pressable>
          <Pressable
            onPress={() => router.push(`/talent/${item.id}`)}
            style={{
              flex: 1,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              paddingVertical: 10,
              gap: 6,
            }}
          >
            <Zap size={14} color={primaryColor} />
            <Text style={{ fontSize: 11, color: primaryColor, fontWeight: '500' }}>Book</Text>
          </Pressable>
        </View>
      </Pressable>
    );
  };

  // Render talent card (list view) - Lovable Design
  const renderTalentCardList = ({ item }: { item: TalentCard }) => {
    const isLiked = isInShortlist(item.id);

    const handleHeartPress = () => {
      if (isLiked) {
        removeFromShortlist(item.id);
      } else {
        addToShortlist(item.id);
      }
    };

    // Theme colors
    const cardBgColor = isDark ? '#1C1C1C' : '#FFFFFF';
    const cardBorderColor = isDark ? 'rgba(255,255,255,0.08)' : '#E5E7EB';
    const textColor = isDark ? '#FFFFFF' : '#111827';
    const subtitleColor = isDark ? '#9CA3AF' : '#6B7280';
    const primaryColor = '#FA5610';

    // Get category label
    const categoryLabel = filters.category && categoryLabels[filters.category as keyof typeof categoryLabels]
      ? categoryLabels[filters.category as keyof typeof categoryLabels]
      : 'Talent';

    return (
      <Pressable
        onPress={() => router.push(`/talent/${item.id}`)}
        style={{
          flexDirection: 'row',
          gap: 12,
          padding: 12,
          backgroundColor: cardBgColor,
          borderBottomWidth: 1,
          borderBottomColor: cardBorderColor,
        }}
      >
        {/* Image */}
        <View
          style={{
            width: 80,
            height: 100,
            borderRadius: 12,
            overflow: 'hidden',
            backgroundColor: isDark ? '#2A2A2A' : '#F3F4F6',
            position: 'relative',
          }}
        >
          <OptimizedImage
            uri={item.imageUrl}
            width={80}
            height={100}
            borderRadius={12}
            fallbackText="No Image"
            showLoadingIndicator={false}
          />

          {/* Online indicator */}
          <View
            style={{
              position: 'absolute',
              top: 6,
              left: 6,
              width: 10,
              height: 10,
              borderRadius: 5,
              backgroundColor: item.isVerified ? '#22C55E' : '#F59E0B',
              borderWidth: 2,
              borderColor: cardBgColor,
            }}
          />

          {/* Heart Button - Small version for list view */}
          <Pressable
            onPress={handleHeartPress}
            style={{
              position: 'absolute',
              top: 4,
              right: 4,
              width: 26,
              height: 26,
              borderRadius: 13,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: 'rgba(255, 255, 255, 0.95)',
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 1 },
              shadowOpacity: 0.1,
              shadowRadius: 2,
              elevation: 2,
            }}
          >
            <Heart size={12} color={isLiked ? '#EF4444' : '#9CA3AF'} fill={isLiked ? '#EF4444' : 'none'} />
          </Pressable>
        </View>

        {/* Info */}
        <View style={{ flex: 1, justifyContent: 'center' }}>
          <Text
            style={{
              fontWeight: '600',
              fontSize: 15,
              color: textColor,
              marginBottom: 2,
            }}
            numberOfLines={1}
          >
            {item.name}
          </Text>

          {/* Category */}
          <Text
            style={{
              fontSize: 12,
              color: subtitleColor,
              marginBottom: 4,
            }}
          >
            {categoryLabel}
          </Text>

          {/* Rating */}
          {item.rating > 0 ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 4 }}>
              <Star size={12} color={primaryColor} fill={primaryColor} />
              <Text style={{ fontSize: 12, color: subtitleColor }}>
                {item.rating.toFixed(1)} ({item.reviewCount})
              </Text>
            </View>
          ) : null}

          {/* Location */}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 4 }}>
            <MapPin size={12} color={subtitleColor} />
            <Text style={{ fontSize: 12, color: subtitleColor }}>{item.location}</Text>
          </View>

          {/* Price */}
          <Text
            style={{
              fontSize: 13,
              color: primaryColor,
              fontWeight: '600',
            }}
          >
            {item.hourlyRate > 0 ? `From AED ${item.hourlyRate}/hr` : 'Contact'}
          </Text>
        </View>

        {/* Verified Badge */}
        {item.isVerified ? (
          <View style={{ alignItems: 'center', justifyContent: 'center' }}>
            <View
              style={{
                width: 28,
                height: 28,
                backgroundColor: isDark ? 'rgba(59, 130, 246, 0.2)' : '#DBEAFE',
                borderRadius: 14,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Ionicons name="checkmark" size={16} color="#3B82F6" />
            </View>
          </View>
        ) : null}
      </Pressable>
    );
  };

  const filterBadges = getFilterBadges();

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: isDark ? '#0A0A0A' : '#F9FAFB' }}>
      <View style={{ flex: 1 }}>
        {/* Header with Back Button and Title - Lovable Design */}
        <View
          style={{
            paddingHorizontal: 16,
            paddingVertical: 12,
            paddingTop: insets.top + 8,
            backgroundColor: isDark ? '#1A1A1A' : '#FFFFFF',
            borderBottomWidth: 1,
            borderBottomColor: isDark ? 'rgba(255,255,255,0.08)' : '#F3F4F6',
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            {/* Back Button */}
            <Pressable
              onPress={() => router.back()}
              style={{
                width: 40,
                height: 40,
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: 20,
                backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : '#F3F4F6',
              }}
            >
              <ChevronLeft size={22} color={isDark ? '#FFFFFF' : '#374151'} strokeWidth={2} />
            </Pressable>

            {/* Title */}
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text
                style={{
                  fontSize: 20,
                  fontWeight: '700',
                  letterSpacing: -0.3,
                  color: isDark ? '#FFFFFF' : '#111827',
                }}
              >
                Find Talent
              </Text>
            </View>

            {/* Right Icons */}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              {/* Filter Button */}
              <Pressable
                onPress={() => setShowFilterSheet(true)}
                style={{
                  position: 'relative',
                  width: 40,
                  height: 40,
                  borderRadius: 20,
                  backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : '#F3F4F6',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <SlidersHorizontal size={18} color={isDark ? '#FFFFFF' : '#374151'} />

                {/* Active filter count badge */}
                {activeFiltersCount > 0 && (
                  <View
                    style={{
                      position: 'absolute',
                      top: -2,
                      right: -2,
                      minWidth: 18,
                      height: 18,
                      borderRadius: 9,
                      backgroundColor: '#FA5610',
                      alignItems: 'center',
                      justifyContent: 'center',
                      paddingHorizontal: 4,
                    }}
                  >
                    <Text style={{ color: '#FFFFFF', fontSize: 10, fontWeight: '700' }}>
                      {activeFiltersCount}
                    </Text>
                  </View>
                )}
              </Pressable>

              {/* Search Button */}
              <Pressable
                onPress={() => {
                  // Focus search (already handled by SearchBar)
                }}
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 20,
                  backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : '#F3F4F6',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Search size={18} color={isDark ? '#FFFFFF' : '#374151'} />
              </Pressable>
            </View>
          </View>
        </View>

        {/* Search Bar - Dark Mode Design */}
        <View
          style={{
            backgroundColor: isDark ? '#1A1A1A' : '#FFFFFF',
            paddingHorizontal: 16,
            paddingVertical: 8,
            borderBottomWidth: 1,
            borderBottomColor: isDark ? 'rgba(255,255,255,0.08)' : '#F3F4F6',
          }}
        >
          <SearchBar
            placeholder="Search talents..."
            value={searchQuery}
            onChange={(text) => {
              setSearchQuery(text);
              handleSearch(text);
            }}
            onSearch={() => {}}
            onCategorySelect={(categoryId) => handleCategoryChange(categoryId)}
            onFilterClick={() => setShowFilterSheet(true)}
            showFilters={false}
            showSearchButton={false}
          />
        </View>

        {/* Category Cards - Collapsible with Dark Mode */}
        <Animated.View
          style={{
            height: categoryRowAnim.interpolate({
              inputRange: [0, 1],
              outputRange: [0, CATEGORY_ROW_HEIGHT],
            }),
            opacity: categoryRowAnim,
            overflow: 'hidden',
          }}
        >
          <View
            style={{
              paddingVertical: 8,
              backgroundColor: isDark ? '#121212' : '#F9FAFB',
              borderBottomWidth: 1,
              borderBottomColor: isDark ? 'rgba(255,255,255,0.08)' : '#F3F4F6',
            }}
          >
            <CategoryCardRow selectedCategory={selectedCategory} onCategoryChange={handleCategoryChange} />
          </View>
        </Animated.View>

        {/* Availability & Sort Toolbar - Scroll-Hide with Dark Mode */}
        <Animated.View
          style={{
            height: toolbarAnim.interpolate({
              inputRange: [0, 1],
              outputRange: [0, 60],
            }),
            opacity: toolbarAnim,
            overflow: 'hidden',
          }}
        >
          <AvailabilitySortToolbar
            availabilityFilter={filters.availabilityFilter}
            onAvailabilityChange={handleAvailabilityChange}
            sort={filters.sort}
            onSortChange={handleSortChange}
            viewMode={viewMode}
            onViewModeChange={setViewMode}
          />
        </Animated.View>

        {/* Active Filters - Dark Mode */}
        {filterBadges.length > 0 ? (
          <View
            style={{
              backgroundColor: isDark ? '#1A1A1A' : '#FFFFFF',
              borderBottomWidth: 1,
              borderBottomColor: isDark ? 'rgba(255,255,255,0.08)' : '#F3F4F6',
            }}
          >
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ paddingHorizontal: 16, paddingVertical: 10 }}>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                {filterBadges.map((badge) => (
                  <View
                    key={badge.key}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 6,
                      paddingHorizontal: 12,
                      paddingVertical: 6,
                      borderRadius: 20,
                      backgroundColor: isDark ? 'rgba(250, 86, 16, 0.15)' : '#FFF7ED',
                      borderWidth: 1,
                      borderColor: isDark ? 'rgba(250, 86, 16, 0.3)' : '#FDBA74',
                    }}
                  >
                    <Text style={{ fontSize: 12, fontWeight: '500', color: '#FA5610' }}>{badge.label}</Text>
                    <Pressable onPress={() => removeFilterBadge(badge.key)}>
                      <X size={14} color="#FA5610" />
                    </Pressable>
                  </View>
                ))}
              </View>
            </ScrollView>
          </View>
        ) : null}

        {/* Results - Dark Mode */}
        {error ? (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 48 }}>
            <Text style={{ fontSize: 18, fontWeight: '600', color: '#EF4444', marginBottom: 8 }}>Error Loading Talents</Text>
            <Text
              style={{
                fontSize: 14,
                textAlign: 'center',
                paddingHorizontal: 16,
                color: isDark ? '#9CA3AF' : '#6B7280',
              }}
            >
              {error}
            </Text>
          </View>
        ) : loading && talents.length === 0 ? (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 48 }}>
            <ActivityIndicator size="large" color="#FA5610" />
            <Text style={{ marginTop: 16, color: isDark ? '#9CA3AF' : '#6B7280' }}>Loading talents...</Text>
          </View>
        ) : talents.length > 0 ? (
          viewMode === 'grid' ? (
            <FlatList
              key={`grid-${talents.length}`}
              ref={flatListRef}
              data={talents}
              renderItem={renderTalentCardGrid}
              keyExtractor={(item) => item.id}
              numColumns={2}
              columnWrapperStyle={{ gap: 10, paddingHorizontal: 12 }}
              onScroll={handleScroll}
              scrollEventThrottle={16}
              contentContainerStyle={{ paddingVertical: 12, backgroundColor: isDark ? '#0A0A0A' : '#F9FAFB' }}
              ListFooterComponent={
                loading && talents.length > 0 ? (
                  <View style={{ paddingVertical: 16, alignItems: 'center' }}>
                    <ActivityIndicator size="small" color="#FA5610" />
                  </View>
                ) : !hasMore && talents.length > 0 ? (
                  <View style={{ paddingVertical: 16, alignItems: 'center' }}>
                    <Text style={{ fontSize: 12, color: isDark ? '#6B7280' : '#9CA3AF' }}>No more results</Text>
                  </View>
                ) : null
              }
            />
          ) : (
            <FlatList
              key={`list-${talents.length}`}
              ref={flatListRef}
              data={talents}
              renderItem={renderTalentCardList}
              keyExtractor={(item) => item.id}
              onScroll={handleScroll}
              scrollEventThrottle={16}
              contentContainerStyle={{ backgroundColor: isDark ? '#0A0A0A' : '#F9FAFB' }}
              ListFooterComponent={
                loading && talents.length > 0 ? (
                  <View style={{ paddingVertical: 16, alignItems: 'center' }}>
                    <ActivityIndicator size="small" color="#FA5610" />
                  </View>
                ) : !hasMore && talents.length > 0 ? (
                  <View style={{ paddingVertical: 16, alignItems: 'center' }}>
                    <Text style={{ fontSize: 12, color: isDark ? '#6B7280' : '#9CA3AF' }}>No more results</Text>
                  </View>
                ) : null
              }
            />
          )
        ) : (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 48 }}>
            <Text style={{ color: isDark ? '#9CA3AF' : '#6B7280', fontSize: 18, fontWeight: '500' }}>No talents found</Text>
            <Text style={{ marginTop: 8, color: isDark ? '#6B7280' : '#9CA3AF', fontSize: 14 }}>Try adjusting your filters</Text>
          </View>
        )}

        {/* Scroll to Top Button - Floating with Orange accent */}
        <Animated.View
          style={{
            position: 'absolute',
            bottom: 100,
            right: 20,
            opacity: scrollBtnOpacity,
            pointerEvents: isScrolled ? 'auto' : 'none',
          }}
        >
          <TouchableOpacity
            onPress={() => {
              flatListRef.current?.scrollToOffset({ offset: 0, animated: true });
            }}
            style={{
              width: 48,
              height: 48,
              borderRadius: 24,
              backgroundColor: '#FA5610',
              alignItems: 'center',
              justifyContent: 'center',
              shadowColor: '#FA5610',
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.3,
              shadowRadius: 8,
              elevation: 8,
            }}
            activeOpacity={0.85}
          >
            <ChevronUp size={24} color="#FFFFFF" />
          </TouchableOpacity>
        </Animated.View>
      </View>

      {/* Filter Modal */}
      <Modal
        visible={showFilterSheet}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowFilterSheet(false)}
      >
        <SafeAreaView style={{ flex: 1, backgroundColor: '#ffffff' }}>
          {/* === STICKY HEADER === */}
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingHorizontal: 20,
              paddingTop: insets.top + 12,
              paddingBottom: 16,
              borderBottomWidth: 1,
              borderBottomColor: '#e5e7eb',
              backgroundColor: '#ffffff',
              minHeight: 88,
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 }}>
              {/* Simplified Filter Icon - Gray background only */}
              <View
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 22,
                  backgroundColor: '#f3f4f6',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginTop: 4,
                }}
              >
                <Ionicons name="options-outline" size={22} color="#6b7280" />
              </View>
              <View style={{ flex: 1, justifyContent: 'center' }}>
                <Text style={{ fontSize: 20, fontWeight: '800', color: '#111827', letterSpacing: -0.5, marginBottom: 2 }}>Filters</Text>
                <Text style={{ fontSize: 13, color: '#9ca3af', marginTop: 3 }}>
                  {activeFiltersCount > 0 ? `${activeFiltersCount} active` : 'Refine search'}
                </Text>
              </View>
            </View>

            {/* Right side: Clear All + Close X */}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginLeft: 12 }}>
              {activeFiltersCount > 0 && (
                <TouchableOpacity onPress={handleResetFilters} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                  <Text style={{ fontSize: 14, color: '#6b7280', fontWeight: '600' }}>Clear</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity
                onPress={() => setShowFilterSheet(false)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                style={{ width: 40, height: 40, alignItems: 'center', justifyContent: 'center' }}
              >
                <Ionicons name="close" size={24} color="#111827" />
              </TouchableOpacity>
            </View>
          </View>

          {/* === SCROLLABLE CONTENT === */}
          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={{ padding: 16, gap: 20, paddingBottom: 40 }}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {/* SECTION: Location Toggle */}
            <View
              style={{
                borderRadius: 16,
                borderWidth: 1,
                borderColor: '#e5e7eb',
                backgroundColor: '#ffffff',
                padding: 16,
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 56 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 }}>
                  <View style={{ width: 36, height: 36, borderRadius: 8, backgroundColor: '#f3f4f6', alignItems: 'center', justifyContent: 'center' }}>
                    <Ionicons name="location-outline" size={18} color="#6b7280" />
                  </View>
                  <View style={{ flex: 1, justifyContent: 'center' }}>
                    <Text style={{ fontSize: 14, fontWeight: '600', color: '#111827', marginBottom: 2 }}>Location</Text>
                    <Text style={{ fontSize: 12, color: '#9ca3af' }}>Find talent near you</Text>
                  </View>
                </View>
                <Switch value={nearMeEnabled} onValueChange={setNearMeEnabled} trackColor={{ false: '#e5e7eb', true: '#FA5610' }} thumbColor="#ffffff" />
              </View>
            </View>

            {/* SECTION: Country */}
            <View
              style={{
                borderRadius: 16,
                borderWidth: 1,
                borderColor: '#e5e7eb',
                backgroundColor: '#ffffff',
                padding: 16,
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                <View style={{ width: 36, height: 36, borderRadius: 8, backgroundColor: '#f3f4f6', alignItems: 'center', justifyContent: 'center' }}>
                  <Ionicons name="flag-outline" size={18} color="#6b7280" />
                </View>
                <View style={{ flex: 1, justifyContent: 'center' }}>
                  <Text style={{ fontSize: 14, fontWeight: '600', color: '#111827' }}>Country</Text>
                  <Text style={{ fontSize: 12, color: '#9ca3af' }}>Filter by location</Text>
                </View>
              </View>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {[
                  { id: 'uae', flag: '🇦🇪', label: 'United Arab Emirates' },
                  { id: 'saudi', flag: '🇸🇦', label: 'Saudi Arabia' },
                  { id: 'qatar', flag: '🇶🇦', label: 'Qatar' },
                  { id: 'egypt', flag: '🇪🇬', label: 'Egypt' },
                  { id: 'kuwait', flag: '🇰🇼', label: 'Kuwait' },
                ].map((country) => (
                  <TouchableOpacity
                    key={country.id}
                    onPress={() => setSelectedCountry(selectedCountry === country.id ? null : country.id)}
                    style={{
                      height: 44,
                      paddingHorizontal: 12,
                      paddingVertical: 8,
                      borderRadius: 12,
                      backgroundColor: selectedCountry === country.id ? '#FA5610' : '#f3f4f6',
                      borderWidth: 1,
                      borderColor: selectedCountry === country.id ? '#FA5610' : '#e5e7eb',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexDirection: 'row',
                      maxWidth: '48%',
                    }}
                    activeOpacity={0.8}
                  >
                    <Text style={{ fontSize: 16, marginRight: 4 }}>{country.flag}</Text>
                    <Text
                      style={{ fontSize: 13, color: selectedCountry === country.id ? '#ffffff' : '#6b7280', fontWeight: '500' }}
                      numberOfLines={1}
                      ellipsizeMode="tail"
                    >
                      {country.label}
                    </Text>
                  </TouchableOpacity>
                ))}
                <TouchableOpacity
                  onPress={() => setNationalitySheetOpen(true)}
                  style={{
                    height: 44,
                    paddingHorizontal: 12,
                    paddingVertical: 8,
                    borderRadius: 12,
                    backgroundColor: '#f3f4f6',
                    borderWidth: 1,
                    borderColor: '#e5e7eb',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                  activeOpacity={0.8}
                >
                  <Text style={{ fontSize: 13, color: '#FA5610', fontWeight: '600' }}>+31 more</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* SECTION: Quick Filters Card */}
            <View
              style={{
                borderRadius: 16,
                borderWidth: 1,
                borderColor: '#e5e7eb',
                backgroundColor: '#ffffff',
                padding: 16,
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                <View style={{ width: 36, height: 36, borderRadius: 8, backgroundColor: '#f3f4f6', alignItems: 'center', justifyContent: 'center' }}>
                  <Ionicons name="filter-outline" size={18} color="#6b7280" />
                </View>
                <View style={{ flex: 1, justifyContent: 'center' }}>
                  <Text style={{ fontSize: 14, fontWeight: '600', color: '#111827' }}>Quick Filters</Text>
                </View>
              </View>

              {/* Verified Toggle Row */}
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  minHeight: 56,
                  paddingVertical: 8,
                  borderBottomWidth: 1,
                  borderBottomColor: '#f3f4f6',
                }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 }}>
                  <View style={{ width: 32, height: 32, borderRadius: 6, backgroundColor: '#f3f4f6', alignItems: 'center', justifyContent: 'center' }}>
                    <Ionicons name="shield-checkmark" size={16} color="#6b7280" />
                  </View>
                  <View style={{ flex: 1, justifyContent: 'center' }}>
                    <Text style={{ fontSize: 13, fontWeight: '500', color: '#111827' }}>Verified Only</Text>
                    <Text style={{ fontSize: 11, color: '#9ca3af', marginTop: 2 }}>ID verified</Text>
                  </View>
                </View>
                <Switch
                  value={verifiedOnly}
                  onValueChange={setVerifiedOnly}
                  trackColor={{ false: '#e5e7eb', true: '#FA5610' }}
                  thumbColor="#ffffff"
                />
              </View>

              {/* Premium Toggle Row */}
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  minHeight: 56,
                  paddingVertical: 8,
                  borderBottomWidth: 1,
                  borderBottomColor: '#f3f4f6',
                }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 }}>
                  <View style={{ width: 32, height: 32, borderRadius: 6, backgroundColor: '#f3f4f6', alignItems: 'center', justifyContent: 'center' }}>
                    <Ionicons name="star" size={16} color="#6b7280" />
                  </View>
                  <View style={{ flex: 1, justifyContent: 'center' }}>
                    <Text style={{ fontSize: 13, fontWeight: '500', color: '#111827' }}>Premium Only</Text>
                    <Text style={{ fontSize: 11, color: '#9ca3af', marginTop: 2 }}>Featured</Text>
                  </View>
                </View>
                <Switch
                  value={premiumOnly}
                  onValueChange={setPremiumOnly}
                  trackColor={{ false: '#e5e7eb', true: '#FA5610' }}
                  thumbColor="#ffffff"
                />
              </View>

              {/* Minimum Rating Row */}
              <View style={{ paddingVertical: 12 }}>
                <Text style={{ fontSize: 12, color: '#6b7280', marginBottom: 12 }}>Minimum rating</Text>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  {[0, 4, 4.5, 4.8].map((rating) => (
                    <TouchableOpacity
                      key={rating}
                      onPress={() => setMinRating(rating as 0 | 4 | 4.5 | 4.8)}
                      style={{
                        flex: 1,
                        height: 44,
                        borderRadius: 12,
                        backgroundColor: minRating === rating ? '#FA5610' : '#f3f4f6',
                        borderWidth: 1,
                        borderColor: minRating === rating ? '#FA5610' : '#e5e7eb',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                      activeOpacity={0.8}
                    >
                      <Text
                        style={{
                          fontSize: 13,
                          fontWeight: '600',
                          color: minRating === rating ? '#ffffff' : '#6b7280',
                        }}
                      >
                        {rating === 0 ? 'Any' : `${rating}+`}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </View>

            {/* SECTION: Gender Card */}
            <View
              style={{
                borderRadius: 16,
                borderWidth: 1,
                borderColor: '#e5e7eb',
                backgroundColor: '#ffffff',
                padding: 16,
              }}
            >
              {/* Header */}
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                <View style={{ width: 36, height: 36, borderRadius: 8, backgroundColor: '#f3f4f6', alignItems: 'center', justifyContent: 'center' }}>
                  <Ionicons name="person" size={18} color="#6b7280" />
                </View>
                <View style={{ flex: 1, justifyContent: 'center' }}>
                  <Text style={{ fontSize: 14, fontWeight: '600', color: '#111827' }}>Gender</Text>
                  <Text style={{ fontSize: 12, color: '#9ca3af' }}>Filter by gender</Text>
                </View>
              </View>

              {/* Any / Male / Female Toggle Buttons */}
              <View style={{ flexDirection: 'row', gap: 8 }}>
                {[
                  { value: null as null, label: 'Any' },
                  { value: 'male' as const, label: 'Male' },
                  { value: 'female' as const, label: 'Female' },
                ].map((option) => (
                  <TouchableOpacity
                    key={option.value || 'any'}
                    onPress={() => setSelectedGender(option.value)}
                    style={{
                      flex: 1,
                      height: 44,
                      borderRadius: 12,
                      backgroundColor: selectedGender === option.value ? '#FA5610' : '#f3f4f6',
                      borderWidth: 1,
                      borderColor: selectedGender === option.value ? '#FA5610' : '#e5e7eb',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                    activeOpacity={0.8}
                  >
                    <Text
                      style={{
                        fontSize: 13,
                        fontWeight: '600',
                        color: selectedGender === option.value ? '#ffffff' : '#6b7280',
                      }}
                    >
                      {option.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* SECTION: Nationality Card */}
            <View
              style={{
                borderRadius: 16,
                borderWidth: 1,
                borderColor: '#e5e7eb',
                backgroundColor: '#ffffff',
                padding: 16,
              }}
            >
              {/* Header */}
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                <View style={{ width: 36, height: 36, borderRadius: 8, backgroundColor: '#f3f4f6', alignItems: 'center', justifyContent: 'center' }}>
                  <Ionicons name="globe" size={18} color="#6b7280" />
                </View>
                <View style={{ flex: 1, justifyContent: 'center' }}>
                  <Text style={{ fontSize: 14, fontWeight: '600', color: '#111827' }}>Nationality</Text>
                  <Text style={{ fontSize: 12, color: '#9ca3af' }}>Filter by talent nationality</Text>
                </View>
              </View>

              {/* Popular Chips */}
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {popularNats.map((nat: any) => (
                  <TouchableOpacity
                    key={nat.id}
                    onPress={() => setSelectedNationality(selectedNationality === nat.id ? null : nat.id)}
                    style={{
                      height: 44,
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 6,
                      paddingHorizontal: 12,
                      paddingVertical: 8,
                      borderRadius: 12,
                      backgroundColor: selectedNationality === nat.id ? '#FA5610' : '#f3f4f6',
                      borderWidth: 1,
                      borderColor: selectedNationality === nat.id ? '#FA5610' : '#e5e7eb',
                      flex: 0,
                      minWidth: '45%',
                    }}
                    activeOpacity={0.8}
                  >
                    <Text style={{ fontSize: 16 }}>{nat.flag}</Text>
                    <Text
                      style={{
                        fontSize: 13,
                        fontWeight: '500',
                        color: selectedNationality === nat.id ? '#ffffff' : '#374151',
                      }}
                      numberOfLines={1}
                      ellipsizeMode="tail"
                    >
                      {nat.label}
                    </Text>
                  </TouchableOpacity>
                ))}

                {/* "+N more" button */}
                {remainingCount > 0 && (
                  <TouchableOpacity
                    onPress={() => setNationalitySheetOpen(true)}
                    style={{
                      height: 44,
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 4,
                      paddingHorizontal: 12,
                      paddingVertical: 8,
                      borderRadius: 12,
                      backgroundColor: '#f3f4f6',
                      borderWidth: 1,
                      borderColor: '#e5e7eb',
                    }}
                    activeOpacity={0.8}
                  >
                    <Text style={{ fontSize: 13, fontWeight: '500', color: '#FA5610' }}>+{remainingCount} more</Text>
                    <Ionicons name="chevron-forward" size={14} color="#FA5610" />
                  </TouchableOpacity>
                )}
              </View>
            </View>

            {/* SECTION: Price Range Card */}
            <View
              style={{
                borderRadius: 16,
                borderWidth: 1,
                borderColor: '#e5e7eb',
                backgroundColor: '#ffffff',
                padding: 16,
              }}
            >
              {/* Header */}
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 20 }}>
                <View style={{ width: 36, height: 36, borderRadius: 8, backgroundColor: '#f3f4f6', alignItems: 'center', justifyContent: 'center' }}>
                  <Ionicons name="cash" size={18} color="#6b7280" />
                </View>
                <View style={{ flex: 1, justifyContent: 'center' }}>
                  <Text style={{ fontSize: 14, fontWeight: '600', color: '#111827' }}>Hourly Rate</Text>
                  <Text style={{ fontSize: 12, color: '#9ca3af' }}>Set your budget</Text>
                </View>
              </View>

              {/* Dual-handle Range Slider */}
              <RangeSlider
                min={0}
                max={2000}
                step={50}
                minValue={priceRange[0]}
                maxValue={priceRange[1]}
                onMinChange={(value) => setPriceRange([value, priceRange[1]])}
                onMaxChange={(value) => setPriceRange([priceRange[0], value])}
                currency="AED"
              />
            </View>

            {/* SECTION: Model Attributes Card (Conditional) */}
            {selectedCategory === 'model' && (
              <View
                style={{
                  borderRadius: 16,
                  borderWidth: 1,
                  borderColor: '#e5e7eb',
                  backgroundColor: '#ffffff',
                  padding: 16,
                }}
              >
                {/* Header */}
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 20 }}>
                  <View style={{ width: 36, height: 36, borderRadius: 8, backgroundColor: '#f3f4f6', alignItems: 'center', justifyContent: 'center' }}>
                    <Ionicons name="body" size={18} color="#6b7280" />
                  </View>
                  <View style={{ flex: 1, justifyContent: 'center' }}>
                    <Text style={{ fontSize: 14, fontWeight: '600', color: '#111827' }}>Model Attributes</Text>
                    <Text style={{ fontSize: 12, color: '#9ca3af' }}>Physical characteristics</Text>
                  </View>
                </View>

                {/* Build chips */}
                <View style={{ marginBottom: 24 }}>
                  <Text style={{ fontSize: 13, color: '#6b7280', marginBottom: 12 }}>Build</Text>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                    {[
                      { id: null, label: 'Any' },
                      { id: 'slim', label: 'Slim' },
                      { id: 'athletic', label: 'Athletic' },
                      { id: 'average', label: 'Average' },
                      { id: 'curvy', label: 'Curvy' },
                      { id: 'plus_size', label: 'Plus Size' },
                    ].map((option) => (
                      <TouchableOpacity
                        key={option.id || 'any'}
                        onPress={() => setSelectedBuild(option.id)}
                        style={{
                          height: 44,
                          paddingHorizontal: 14,
                          paddingVertical: 8,
                          borderRadius: 12,
                          backgroundColor: selectedBuild === option.id ? '#FA5610' : '#f3f4f6',
                          borderWidth: 1,
                          borderColor: selectedBuild === option.id ? '#FA5610' : '#e5e7eb',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flex: 0,
                          minWidth: '30%',
                        }}
                        activeOpacity={0.8}
                      >
                        <Text
                          style={{
                            fontSize: 13,
                            fontWeight: '500',
                            color: selectedBuild === option.id ? '#ffffff' : '#6b7280',
                          }}
                        >
                          {option.label}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                {/* Height Range */}
                <View style={{ marginBottom: 24 }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 }}>
                    <Text style={{ fontSize: 13, color: '#6b7280' }}>Height</Text>
                    <Text style={{ fontSize: 13, fontWeight: '600', color: '#111827' }}>
                      {heightRange[0]} - {heightRange[1]} cm
                    </Text>
                  </View>
                  {/* Min height */}
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                    <TouchableOpacity
                      onPress={() => setHeightRange([Math.max(140, heightRange[0] - 1), heightRange[1]])}
                      style={{ width: 36, height: 36, borderRadius: 8, backgroundColor: '#f3f4f6', alignItems: 'center', justifyContent: 'center' }}
                    >
                      <Text style={{ fontSize: 20, color: '#111827' }}>−</Text>
                    </TouchableOpacity>
                    <View style={{ flex: 1, height: 44, borderRadius: 12, backgroundColor: '#f3f4f6', alignItems: 'center', justifyContent: 'center' }}>
                      <Text style={{ fontSize: 16, fontWeight: '600', color: '#111827' }}>{heightRange[0]} cm</Text>
                    </View>
                    <TouchableOpacity
                      onPress={() => {
                        if (heightRange[0] + 1 <= heightRange[1]) {
                          setHeightRange([heightRange[0] + 1, heightRange[1]]);
                        }
                      }}
                      style={{ width: 36, height: 36, borderRadius: 8, backgroundColor: '#FA5610', alignItems: 'center', justifyContent: 'center' }}
                    >
                      <Text style={{ fontSize: 20, color: '#ffffff' }}>+</Text>
                    </TouchableOpacity>
                  </View>
                  {/* Max height */}
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <TouchableOpacity
                      onPress={() => {
                        if (heightRange[1] - 1 >= heightRange[0]) {
                          setHeightRange([heightRange[0], heightRange[1] - 1]);
                        }
                      }}
                      style={{ width: 36, height: 36, borderRadius: 8, backgroundColor: '#f3f4f6', alignItems: 'center', justifyContent: 'center' }}
                    >
                      <Text style={{ fontSize: 20, color: '#111827' }}>−</Text>
                    </TouchableOpacity>
                    <View style={{ flex: 1, height: 44, borderRadius: 12, backgroundColor: '#f3f4f6', alignItems: 'center', justifyContent: 'center' }}>
                      <Text style={{ fontSize: 16, fontWeight: '600', color: '#111827' }}>{heightRange[1]} cm</Text>
                    </View>
                    <TouchableOpacity
                      onPress={() => setHeightRange([heightRange[0], Math.min(210, heightRange[1] + 1)])}
                      style={{ width: 36, height: 36, borderRadius: 8, backgroundColor: '#FA5610', alignItems: 'center', justifyContent: 'center' }}
                    >
                      <Text style={{ fontSize: 20, color: '#ffffff' }}>+</Text>
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Weight Range */}
                <View>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 }}>
                    <Text style={{ fontSize: 13, color: '#6b7280' }}>Weight</Text>
                    <Text style={{ fontSize: 13, fontWeight: '600', color: '#111827' }}>
                      {weightRange[0]} - {weightRange[1]} kg
                    </Text>
                  </View>
                  {/* Min weight */}
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                    <TouchableOpacity
                      onPress={() => setWeightRange([Math.max(40, weightRange[0] - 1), weightRange[1]])}
                      style={{ width: 36, height: 36, borderRadius: 8, backgroundColor: '#f3f4f6', alignItems: 'center', justifyContent: 'center' }}
                    >
                      <Text style={{ fontSize: 20, color: '#111827' }}>−</Text>
                    </TouchableOpacity>
                    <View style={{ flex: 1, height: 44, borderRadius: 12, backgroundColor: '#f3f4f6', alignItems: 'center', justifyContent: 'center' }}>
                      <Text style={{ fontSize: 16, fontWeight: '600', color: '#111827' }}>{weightRange[0]} kg</Text>
                    </View>
                    <TouchableOpacity
                      onPress={() => {
                        if (weightRange[0] + 1 <= weightRange[1]) {
                          setWeightRange([weightRange[0] + 1, weightRange[1]]);
                        }
                      }}
                      style={{ width: 36, height: 36, borderRadius: 8, backgroundColor: '#FA5610', alignItems: 'center', justifyContent: 'center' }}
                    >
                      <Text style={{ fontSize: 20, color: '#ffffff' }}>+</Text>
                    </TouchableOpacity>
                  </View>
                  {/* Max weight */}
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <TouchableOpacity
                      onPress={() => {
                        if (weightRange[1] - 1 >= weightRange[0]) {
                          setWeightRange([weightRange[0], weightRange[1] - 1]);
                        }
                      }}
                      style={{ width: 36, height: 36, borderRadius: 8, backgroundColor: '#f3f4f6', alignItems: 'center', justifyContent: 'center' }}
                    >
                      <Text style={{ fontSize: 20, color: '#111827' }}>−</Text>
                    </TouchableOpacity>
                    <View style={{ flex: 1, height: 44, borderRadius: 12, backgroundColor: '#f3f4f6', alignItems: 'center', justifyContent: 'center' }}>
                      <Text style={{ fontSize: 16, fontWeight: '600', color: '#111827' }}>{weightRange[1]} kg</Text>
                    </View>
                    <TouchableOpacity
                      onPress={() => setWeightRange([weightRange[0], Math.min(150, weightRange[1] + 1)])}
                      style={{ width: 36, height: 36, borderRadius: 8, backgroundColor: '#FA5610', alignItems: 'center', justifyContent: 'center' }}
                    >
                      <Text style={{ fontSize: 20, color: '#ffffff' }}>+</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            )}
          </ScrollView>

          {/* === STICKY FOOTER === */}
          <View
            style={{
              flexDirection: 'row',
              gap: 12,
              paddingHorizontal: 16,
              paddingVertical: 16,
              paddingBottom: 32,
              borderTopWidth: 1,
              borderTopColor: '#e5e7eb',
              backgroundColor: '#ffffff',
            }}
          >
            {/* Reset Button */}
            <TouchableOpacity
              onPress={handleResetFilters}
              style={{
                flex: 1,
                height: 52,
                borderRadius: 16,
                backgroundColor: '#f3f4f6',
                alignItems: 'center',
                justifyContent: 'center',
              }}
              activeOpacity={0.8}
            >
              <Text style={{ fontSize: 16, fontWeight: '600', color: '#374151' }}>Reset</Text>
            </TouchableOpacity>

            {/* Show Results Button */}
            <TouchableOpacity
              onPress={() => setShowFilterSheet(false)}
              style={{
                flex: 2,
                height: 52,
                borderRadius: 16,
                backgroundColor: '#FA5610',
                alignItems: 'center',
                justifyContent: 'center',
                flexDirection: 'row',
                gap: 8,
              }}
              activeOpacity={0.9}
            >
              <Ionicons name="checkmark" size={18} color="#ffffff" />
              <Text style={{ fontSize: 16, fontWeight: '700', color: '#ffffff' }}>Show Results</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </Modal>

      {/* Nationality Full-List Modal */}
      <Modal
        visible={nationalitySheetOpen}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setNationalitySheetOpen(false)}
      >
        <View style={{ flex: 1, backgroundColor: '#ffffff' }}>
          {/* Header with back button + search */}
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingHorizontal: 16,
              paddingVertical: 14,
              borderBottomWidth: 1,
              borderBottomColor: '#e5e7eb',
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <TouchableOpacity
                onPress={() => {
                  setNationalitySheetOpen(false);
                  setNationalitySearch('');
                }}
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 20,
                  backgroundColor: '#f3f4f6',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Ionicons name="chevron-back" size={20} color="#111827" />
              </TouchableOpacity>
              <Text style={{ fontSize: 18, fontWeight: '700', color: '#111827' }}>Nationality</Text>
            </View>
          </View>

          {/* Search Input */}
          <View style={{ paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' }}>
            <TextInput
              value={nationalitySearch}
              onChangeText={setNationalitySearch}
              placeholder="Search nationalities..."
              placeholderTextColor="#9ca3af"
              style={{
                height: 44,
                borderRadius: 12,
                backgroundColor: '#f3f4f6',
                paddingHorizontal: 16,
                fontSize: 16,
                color: '#111827',
              }}
            />
          </View>

          {/* Scrollable nationality list */}
          <ScrollView style={{ flex: 1 }}>
            {NATIONALITIES.filter(n =>
              n.label.toLowerCase().includes(nationalitySearch.toLowerCase())
            ).map((nat) => (
              <TouchableOpacity
                key={nat.id}
                onPress={() => {
                  setSelectedNationality(selectedNationality === nat.id ? null : nat.id);
                  setNationalitySheetOpen(false);
                  setNationalitySearch('');
                }}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  paddingHorizontal: 16,
                  paddingVertical: 16,
                  borderBottomWidth: 1,
                  borderBottomColor: '#f9fafb',
                }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                  <Text style={{ fontSize: 24 }}>{nat.flag}</Text>
                  <Text style={{ fontSize: 15, color: '#111827' }}>{nat.label}</Text>
                </View>
                {selectedNationality === nat.id && <Ionicons name="checkmark-circle" size={22} color="#FA5610" />}
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
