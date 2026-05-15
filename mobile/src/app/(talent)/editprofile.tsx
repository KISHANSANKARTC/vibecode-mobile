import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TextInput,
  Pressable,
  Image,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Modal,
  Switch,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from '@/lib/router-helper';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/lib/state/auth-store';
import { uploadFile } from '@/lib/upload';
import { ProfileSkeleton } from '@/components/SkeletonLoader';
import { useTheme } from '@/lib/theme/ThemeContext';
import { extractErrorMessage } from '@/lib/errorUtils';

// Category labels mapping
const CATEGORY_LABELS: Record<string, string> = {
  photographer: 'Photographer / Videographer',
  model: 'Model',
  makeup_artist: 'Makeup Artist',
  hair_stylist: 'Hair Stylist',
  wardrobe_stylist: 'Wardrobe Stylist',
  set_designer: 'Set Designer',
  stylist: 'Stylist',
  producer: 'Producer',
  creative_director: 'Director',
  influencer: 'Influencer / UGC Creator',
  editor: 'Editor',
  graphic_designer: 'Graphic Designer',
  marketing_consultant: 'Marketing Consultant',
  music_producer: 'Music Producer',
  drone_operator: 'Drone Operator',
  other: 'Other',
};

// Country data with flags and currency
const COUNTRIES = [
  { code: 'US', name: 'United States', flag: '🇺🇸', currencyCode: 'USD' },
  { code: 'UK', name: 'United Kingdom', flag: '🇬🇧', currencyCode: 'GBP' },
  { code: 'CA', name: 'Canada', flag: '🇨🇦', currencyCode: 'CAD' },
  { code: 'AU', name: 'Australia', flag: '🇦🇺', currencyCode: 'AUD' },
  { code: 'IN', name: 'India', flag: '🇮🇳', currencyCode: 'INR' },
  { code: 'DE', name: 'Germany', flag: '🇩🇪', currencyCode: 'EUR' },
  { code: 'FR', name: 'France', flag: '🇫🇷', currencyCode: 'EUR' },
  { code: 'ES', name: 'Spain', flag: '🇪🇸', currencyCode: 'EUR' },
  { code: 'IT', name: 'Italy', flag: '🇮🇹', currencyCode: 'EUR' },
  { code: 'BR', name: 'Brazil', flag: '🇧🇷', currencyCode: 'BRL' },
  { code: 'MX', name: 'Mexico', flag: '🇲🇽', currencyCode: 'MXN' },
  { code: 'SG', name: 'Singapore', flag: '🇸🇬', currencyCode: 'SGD' },
  { code: 'JP', name: 'Japan', flag: '🇯🇵', currencyCode: 'JPY' },
  { code: 'NZ', name: 'New Zealand', flag: '🇳🇿', currencyCode: 'NZD' },
  { code: 'ZA', name: 'South Africa', flag: '🇿🇦', currencyCode: 'ZAR' },
  { code: 'AE', name: 'United Arab Emirates', flag: '🇦🇪', currencyCode: 'AED' },
  { code: 'SG', name: 'Singapore', flag: '🇸🇬', currencyCode: 'SGD' },
  { code: 'HK', name: 'Hong Kong', flag: '🇭🇰', currencyCode: 'HKD' },
  { code: 'NL', name: 'Netherlands', flag: '🇳🇱', currencyCode: 'EUR' },
  { code: 'CH', name: 'Switzerland', flag: '🇨🇭', currencyCode: 'CHF' },
];

// Cities by country
const CITIES_BY_COUNTRY: Record<string, string[]> = {
  US: ['New York', 'Los Angeles', 'Chicago', 'Houston', 'Phoenix', 'Miami', 'San Francisco', 'Boston'],
  UK: ['London', 'Manchester', 'Birmingham', 'Liverpool', 'Leeds', 'Bristol', 'Sheffield'],
  CA: ['Toronto', 'Vancouver', 'Montreal', 'Calgary', 'Ottawa', 'Edmonton', 'Winnipeg'],
  AU: ['Sydney', 'Melbourne', 'Brisbane', 'Perth', 'Adelaide', 'Gold Coast', 'Canberra'],
  IN: ['Delhi', 'Mumbai', 'Bangalore', 'Hyderabad', 'Chennai', 'Kolkata', 'Pune'],
  DE: ['Berlin', 'Munich', 'Hamburg', 'Frankfurt', 'Cologne', 'Dusseldorf', 'Stuttgart'],
  FR: ['Paris', 'Lyon', 'Marseille', 'Toulouse', 'Nice', 'Nantes', 'Strasbourg'],
  ES: ['Madrid', 'Barcelona', 'Valencia', 'Seville', 'Bilbao', 'Malaga', 'Zaragoza'],
  IT: ['Rome', 'Milan', 'Naples', 'Turin', 'Palermo', 'Genoa', 'Florence'],
  BR: ['Sao Paulo', 'Rio de Janeiro', 'Salvador', 'Brasilia', 'Fortaleza', 'Belo Horizonte'],
  MX: ['Mexico City', 'Guadalajara', 'Monterrey', 'Cancun', 'Playa del Carmen', 'Los Cabos'],
  SG: ['Singapore'],
  JP: ['Tokyo', 'Osaka', 'Kyoto', 'Yokohama', 'Nagoya', 'Sapporo', 'Fukuoka'],
  NZ: ['Auckland', 'Wellington', 'Christchurch', 'Hamilton', 'Tauranga', 'Dunedin'],
  ZA: ['Johannesburg', 'Cape Town', 'Durban', 'Pretoria', 'Bloemfontein', 'Port Elizabeth'],
  AE: ['Dubai', 'Abu Dhabi', 'Sharjah', 'Ajman', 'Ras Al Khaimah'],
  HK: ['Hong Kong', 'Kowloon', 'New Territories'],
  NL: ['Amsterdam', 'Rotterdam', 'The Hague', 'Utrecht', 'Eindhoven', 'Groningen'],
  CH: ['Zurich', 'Geneva', 'Basel', 'Bern', 'Lausanne', 'Lucerne', 'St. Gallen'],
};

// Build types for model stats
const BUILD_OPTIONS = ['Slim', 'Athletic', 'Average', 'Curvy', 'Plus Size'];

// Shoe sizes (EU)
const SHOE_SIZES = Array.from({ length: 14 }, (_, i) => (35 + i).toString());

// Nationalities
const NATIONALITIES = [
  'American', 'British', 'Canadian', 'Australian', 'Indian', 'German', 'French', 'Spanish',
  'Italian', 'Brazilian', 'Mexican', 'Japanese', 'South African', 'Chinese', 'Korean',
  'Dutch', 'Swiss', 'Swedish', 'Norwegian', 'Danish', 'Israeli', 'Thai', 'Filipino',
  'Indonesian', 'Vietnamese', 'Malaysian', 'Singaporean', 'New Zealander', 'Irish',
  'Turkish', 'Greek', 'Polish', 'Czech', 'Hungarian', 'Romanian', 'Portuguese',
];

interface FormData {
  fullName: string;
  username: string;
  phone: string;
  bio: string;
  displayName: string;
  country: string | null;
  city: string | null;
  location_text: string | null;
  location_lat: number | null;
  location_lng: number | null;
  live_location_enabled: boolean;
  currency: string | null;
  bannerUrl: string | null;
  avatarUrl: string | null;
  categories: string[];
  hourly_rate: number | null;
  day_rate: number | null;
  session_rate: number | null;
  session_duration_hours: number | null;
  project_rate: number | null;
  experience_years: number | null;
  // Model stats
  nationality: string | null;
  height_cm: number | null;
  weight_kg: number | null;
  build: string | null;
  shoe_size: string | null;
  bust_cm: number | null;
  waist_cm: number | null;
  hips_cm: number | null;
}

interface UsernameValidation {
  isValid: boolean;
  error: string | null;
  isChecking: boolean;
}

export default function EditProfileScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const { theme, isDark } = useTheme();
  const [formData, setFormData] = useState<FormData>({
    fullName: '',
    username: '',
    phone: '',
    bio: '',
    displayName: '',
    country: null,
    city: null,
    location_text: null,
    location_lat: null,
    location_lng: null,
    live_location_enabled: false,
    currency: null,
    bannerUrl: null,
    avatarUrl: null,
    categories: [],
    hourly_rate: null,
    day_rate: null,
    session_rate: null,
    session_duration_hours: 2,
    project_rate: null,
    experience_years: null,
    nationality: null,
    height_cm: null,
    weight_kg: null,
    build: null,
    shoe_size: null,
    bust_cm: null,
    waist_cm: null,
    hips_cm: null,
  });

  const [usernameValidation, setUsernameValidation] = useState<UsernameValidation>({
    isValid: true,
    error: null,
    isChecking: false,
  });

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [isUploadingBanner, setIsUploadingBanner] = useState(false);
  const [showCountryDropdown, setShowCountryDropdown] = useState(false);
  const [showAIBioModal, setShowAIBioModal] = useState(false);
  const [showModelStats, setShowModelStats] = useState(false);
  const [selectedCategoryTab, setSelectedCategoryTab] = useState<string>('');

  // Load profile data on mount
  useEffect(() => {
    loadProfileData();

    // Subscribe to real-time changes for profile images
    if (!user?.id) return;

    const profileSubscription = supabase
      .channel(`profile:${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'profiles',
          filter: `id=eq.${user.id}`,
        },
        (payload: any) => {
          if (payload.new?.avatar_url) {
            setFormData((prev) => ({
              ...prev,
              avatarUrl: `${payload.new.avatar_url}?t=${Date.now()}`,
            }));
          }
        }
      )
      .subscribe();

    const talentSubscription = supabase
      .channel(`talent:${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'talent_profiles',
          filter: `user_id=eq.${user.id}`,
        },
        (payload: any) => {
          if (payload.new?.banner_url) {
            setFormData((prev) => ({
              ...prev,
              bannerUrl: `${payload.new.banner_url}?t=${Date.now()}`,
            }));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(profileSubscription);
      supabase.removeChannel(talentSubscription);
    };
  }, [user?.id]);

  const loadProfileData = async () => {
    if (!user?.id) {
      setIsLoading(false);
      return;
    }

    try {
      const [profileRes, talentProfileRes] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', user.id).single(),
        supabase.from('talent_profiles').select('*').eq('user_id', user.id).maybeSingle(),
      ]);

      if (profileRes.data) {
        setFormData((prev) => ({
          ...prev,
          fullName: profileRes.data.full_name || '',
          username: profileRes.data.username || '',
          phone: profileRes.data.phone || '',
          avatarUrl: profileRes.data.avatar_url,
        }));
      }

      if (talentProfileRes.data) {
        const tp = talentProfileRes.data;
        const categories = tp.categories ? (Array.isArray(tp.categories) ? tp.categories : []) : [];

        setFormData((prev) => ({
          ...prev,
          bio: tp.bio || '',
          displayName: tp.display_name || '',
          country: tp.country || null,
          city: tp.location_text || null,
          location_text: tp.location_text || null,
          location_lat: tp.location_lat,
          location_lng: tp.location_lng,
          live_location_enabled: tp.live_location_enabled || false,
          currency: tp.currency || null,
          bannerUrl: tp.banner_url,
          categories,
          hourly_rate: tp.hourly_rate,
          day_rate: tp.day_rate,
          session_rate: tp.session_rate,
          session_duration_hours: tp.session_duration_hours || 2,
          project_rate: tp.project_rate,
          experience_years: tp.experience_years,
          nationality: tp.nationality,
          height_cm: tp.height_cm,
          weight_kg: tp.weight_kg,
          build: tp.build,
          shoe_size: tp.shoe_size,
          bust_cm: tp.bust_cm,
          waist_cm: tp.waist_cm,
          hips_cm: tp.hips_cm,
        }));

        if (categories.length > 0) {
          setSelectedCategoryTab(categories[0]);
        }
      }
    } catch (err) {
      console.error('Error loading profile:', err);
      Alert.alert('Error', 'Failed to load profile');
    } finally {
      setIsLoading(false);
    }
  };

  // Validate and check username uniqueness
  const validateUsername = useCallback(async (value: string) => {
    // Sanitize
    const sanitized = value.toLowerCase().replace(/[^a-z0-9_]/g, '');

    // Check length
    if (sanitized.length < 3) {
      setUsernameValidation({
        isValid: false,
        error: 'Username must be at least 3 characters',
        isChecking: false,
      });
      return;
    }

    if (sanitized.length > 20) {
      setUsernameValidation({
        isValid: false,
        error: 'Username must be 20 characters or less',
        isChecking: false,
      });
      return;
    }

    // Check reserved words
    const reserved = ['admin', 'support', 'engage', 'help', 'api', 'www', 'app', 'talent', 'client', 'user'];
    if (reserved.includes(sanitized)) {
      setUsernameValidation({
        isValid: false,
        error: 'This username is reserved',
        isChecking: false,
      });
      return;
    }

    // Check uniqueness
    setUsernameValidation({
      isValid: true,
      error: null,
      isChecking: true,
    });

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id')
        .eq('username', sanitized)
        .maybeSingle();

      if (error) throw error;

      if (data && data.id !== user?.id) {
        setUsernameValidation({
          isValid: false,
          error: 'This username is already taken',
          isChecking: false,
        });
      } else {
        setUsernameValidation({
          isValid: true,
          error: null,
          isChecking: false,
        });
      }
    } catch (err) {
      console.error('Username check error:', err);
      setUsernameValidation({
        isValid: false,
        error: 'Error checking username',
        isChecking: false,
      });
    }
  }, [user?.id]);

  // Handle username change
  const handleUsernameChange = useCallback((value: string) => {
    const sanitized = value.toLowerCase().replace(/[^a-z0-9_]/g, '');
    setFormData((prev) => ({
      ...prev,
      username: sanitized,
    }));

    // Debounce validation
    const timeout = setTimeout(() => {
      validateUsername(sanitized);
    }, 500);

    return () => clearTimeout(timeout);
  }, [validateUsername]);

  // Pick banner image
  const pickBannerImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [3, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        const uri = asset.uri;
        if (uri) {
          await uploadImage(uri, 'banners', 'bannerUrl');
        } else {
          Alert.alert('Error', 'Could not read image file');
        }
      }
    } catch (err) {
      console.error('Error picking banner:', err);
      Alert.alert('Error', 'Failed to pick banner image');
    }
  };

  // Pick avatar image
  const pickAvatarImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        const uri = asset.uri;
        if (uri) {
          await uploadImage(uri, 'avatars', 'avatarUrl');
        } else {
          Alert.alert('Error', 'Could not read image file');
        }
      }
    } catch (err) {
      console.error('Error picking avatar:', err);
      Alert.alert('Error', 'Failed to pick avatar image');
    }
  };

  // Upload image to backend and immediately update database
  const uploadImage = async (uri: string, bucket: 'avatars' | 'banners', fieldKey: keyof FormData) => {
    if (!user?.id) {
      Alert.alert('Error', 'User not authenticated');
      return;
    }

    // Set loading state based on bucket type
    if (bucket === 'avatars') {
      setIsUploadingAvatar(true);
    } else {
      setIsUploadingBanner(true);
    }

    try {
      const timestamp = Date.now();
      const fileName = `${user.id}-${timestamp}.jpg`;


      // Upload to backend storage
      let uploadedFile;
      try {
        uploadedFile = await uploadFile(uri, fileName, 'image/jpeg');
      } catch (uploadErr) {
        console.error('[editprofile] Upload file function error:', uploadErr);
        throw uploadErr;
      }

      if (!uploadedFile) {
        throw new Error('Upload returned null response');
      }

      if (!uploadedFile?.url && !uploadedFile?.cdnUrl) {
        console.error('[editprofile] No URL in upload response:', uploadedFile);
        throw new Error('Could not generate public URL');
      }

      // Use CDN URL if available, otherwise use regular URL
      // Add timestamp to bust cache so image loads immediately
      const baseUrl = uploadedFile.cdnUrl || uploadedFile.url;
      const imageUrl = `${baseUrl}?t=${Date.now()}`;


      // Update local state
      setFormData((prev) => ({
        ...prev,
        [fieldKey]: imageUrl,
      }));

      // Immediately update database in real-time (no need to wait for Save button)
      if (bucket === 'avatars') {
        // Update profiles table for avatar
        const { error: updateError } = await supabase
          .from('profiles')
          .update({ avatar_url: imageUrl })
          .eq('id', user.id);

        if (updateError) {
          console.error('[editprofile] Error updating avatar in DB:', updateError);
          throw updateError;
        }

      } else if (bucket === 'banners') {
        // Update talent_profiles table for banner
        const { error: updateError } = await supabase
          .from('talent_profiles')
          .update({ banner_url: imageUrl })
          .eq('user_id', user.id);

        if (updateError) {
          console.error('[editprofile] Error updating banner in DB:', updateError);
          throw updateError;
        }

      }

      // Show success alert
      Alert.alert('Success', 'Image uploaded successfully!');
    } catch (err) {
      console.error('[editprofile] Error uploading image:', err);
      const errorMessage = extractErrorMessage(err);
      Alert.alert('Upload Failed', errorMessage);
    } finally {
      // Clear loading states
      if (bucket === 'avatars') {
        setIsUploadingAvatar(false);
      } else {
        setIsUploadingBanner(false);
      }
    }
  };

  // Get current location
  const getCurrentLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Location permission is required');
        return;
      }

      const location = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const { latitude, longitude } = location.coords;

      // Reverse geocode to get city and country
      const reverseGeocode = await Location.reverseGeocodeAsync({ latitude, longitude });
      const address = reverseGeocode[0];

      if (address) {
        const city = address.city || address.district || '';
        const country = address.isoCountryCode || '';

        setFormData((prev) => ({
          ...prev,
          location_lat: latitude,
          location_lng: longitude,
          city: city,
          country: country.toUpperCase(),
          location_text: `${city}, ${country}`,
        }));

        Alert.alert('Success', `Location detected: ${city}, ${country}`);
      }
    } catch (err) {
      console.error('Error getting location:', err);
      Alert.alert('Error', 'Failed to get location');
    }
  };

  // Handle country selection
  const handleCountrySelect = (countryCode: string) => {
    const country = COUNTRIES.find((c) => c.code === countryCode);
    if (country) {
      setFormData((prev) => ({
        ...prev,
        country: countryCode,
        currency: country.currencyCode,
        city: null,
        location_text: null,
      }));
      setShowCountryDropdown(false);
    }
  };

  // Get initial (skeleton loading state)
  if (isLoading) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.stickyHeader}>
          <Pressable onPress={() => router.replace('/(talent)/profile')} style={styles.backButton}>
            <Ionicons name="arrow-back" size={20} color="#111827" />
          </Pressable>
          <Text style={styles.headerTitle}>Edit Profile</Text>
        </View>
        <ProfileSkeleton />
      </View>
    );
  }

  const selectedCountry = COUNTRIES.find((c) => c.code === formData.country);
  const hasModel = formData.categories.includes('model');

  // Dynamic colors based on theme
  const colors = {
    bg: isDark ? '#0A0A0A' : '#ffffff',
    bgSecondary: isDark ? '#1A1A1A' : '#f9fafb',
    text: isDark ? '#ffffff' : '#111827',
    textSecondary: isDark ? '#9ca3af' : '#6b7280',
    border: isDark ? '#374151' : '#e5e7eb',
    borderLight: isDark ? '#2d2d2d' : '#f3f4f6',
  };

  // Create dynamic styles based on theme
  const getDynamicStyles = () => StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.bg },
    stickyHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 12,
      backgroundColor: colors.bg,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      gap: 12,
    },
    backButton: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: colors.borderLight,
      alignItems: 'center',
      justifyContent: 'center',
    },
    headerTitle: { fontSize: 20, fontWeight: '700', color: colors.text },
    bannerCard: {
      backgroundColor: colors.bg,
      borderRadius: 12,
      overflow: 'hidden',
      marginBottom: 8,
    },
    card: {
      backgroundColor: colors.bg,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 16,
    },
    label: {
      fontSize: 14,
      fontWeight: '500',
      color: colors.text,
      marginBottom: 8,
    },
    input: {
      height: 44,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
      paddingHorizontal: 12,
      fontSize: 14,
      color: colors.text,
      backgroundColor: colors.bgSecondary,
    },
    profileName: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.text,
      textAlign: 'center',
      marginBottom: 4,
    },
    profileCategory: {
      fontSize: 14,
      color: colors.textSecondary,
      textAlign: 'center',
      marginBottom: 12,
    },
    modalContent: {
      backgroundColor: colors.bg,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      maxHeight: '80%',
      paddingBottom: 20,
    },
    modalHeader: {
      paddingHorizontal: 20,
      paddingTop: 20,
      paddingBottom: 16,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    modalTitle: {
      fontSize: 20,
      fontWeight: '700',
      color: colors.text,
      marginBottom: 4,
    },
    modalSubtitle: {
      fontSize: 13,
      color: colors.textSecondary,
    },
    modalLabel: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.text,
      marginBottom: 8,
    },
    modalInput: {
      height: 44,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
      paddingHorizontal: 12,
      fontSize: 14,
      color: colors.text,
      backgroundColor: colors.bgSecondary,
    },
    modalFooter: {
      flexDirection: 'row',
      gap: 12,
      paddingHorizontal: 20,
      paddingTop: 16,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
  });

  const dynamicStyles = getDynamicStyles();

  return (
    <View style={[dynamicStyles.container, { paddingTop: insets.top }]}>
      {/* STICKY HEADER */}
      <View style={dynamicStyles.stickyHeader}>
        <Pressable onPress={() => router.push('/(talent)/profile')} style={dynamicStyles.backButton}>
          <Ionicons name="arrow-back" size={20} color={colors.text} />
        </Pressable>
        <Text style={dynamicStyles.headerTitle}>Edit Profile</Text>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* BANNER AND AVATAR CARD */}
        <View style={[dynamicStyles.bannerCard]}>
          {/* Banner */}
          <Pressable onPress={pickBannerImage} disabled={isUploadingBanner} style={styles.bannerContainer}>
            {formData.bannerUrl ? (
              <Image source={{ uri: formData.bannerUrl }} style={styles.banner} resizeMode="cover" />
            ) : (
              <View style={[styles.banner, styles.bannerPlaceholder, { backgroundColor: colors.borderLight }]} />
            )}
            {isUploadingBanner ? (
              <View style={[styles.bannerCameraButton, { backgroundColor: 'rgba(0,0,0,0.6)' }]}>
                <ActivityIndicator size="small" color="#ffffff" />
              </View>
            ) : (
              <Pressable onPress={pickBannerImage} style={styles.bannerCameraButton}>
                <Ionicons name="camera" size={18} color="#ffffff" />
              </Pressable>
            )}
          </Pressable>

          {/* Avatar overlapping banner */}
          <View style={styles.avatarWrapper}>
            <Pressable onPress={pickAvatarImage} disabled={isUploadingAvatar} style={styles.avatarButton}>
              {formData.avatarUrl ? (
                <Image source={{ uri: formData.avatarUrl }} style={[styles.avatar, { borderColor: colors.bg }]} resizeMode="cover" />
              ) : (
                <View style={[styles.avatar, styles.avatarPlaceholder, { borderColor: colors.bg }]}>
                  <Text style={styles.avatarInitials}>{getInitials(formData.fullName)}</Text>
                </View>
              )}
              {isUploadingAvatar ? (
                <View style={[styles.avatarCameraButton, { backgroundColor: 'rgba(0,0,0,0.6)' }]}>
                  <ActivityIndicator size="small" color="#ffffff" />
                </View>
              ) : (
                <View style={styles.avatarCameraButton}>
                  <Ionicons name="camera" size={14} color="#ffffff" />
                </View>
              )}
            </Pressable>
          </View>

          {/* Name and category below avatar */}
          <Text style={[dynamicStyles.profileName]}>{formData.fullName || 'Your Name'}</Text>
          {formData.categories.length > 0 ? (
            <Text style={[dynamicStyles.profileCategory]}>
              {formData.categories.map((cat) => CATEGORY_LABELS[cat] || cat).join(', ')}
            </Text>
          ) : null}
        </View>

        {/* BASIC INFO CARD */}
        <View style={[dynamicStyles.card]}>
          {/* Full Name */}
          <View style={styles.fieldGroup}>
            <Text style={[dynamicStyles.label]}>Full Name</Text>
            <TextInput
              style={[dynamicStyles.input]}
              placeholder="Enter your full name"
              value={formData.fullName}
              onChangeText={(text) => setFormData((prev) => ({ ...prev, fullName: text }))}
              placeholderTextColor={colors.textSecondary}
            />
          </View>

          {/* Username */}
          <View style={styles.fieldGroup}>
            <Text style={[dynamicStyles.label]}>Username</Text>
            <View style={[styles.usernameInputWrapper, { borderColor: colors.border, backgroundColor: colors.bgSecondary }]}>
              <Text style={[styles.usernamePrefix, { color: colors.text }]}>@</Text>
              <TextInput
                style={[styles.usernameInput, { color: colors.text }]}
                placeholder="username"
                value={formData.username}
                onChangeText={handleUsernameChange}
                placeholderTextColor={colors.textSecondary}
                autoCapitalize="none"
              />
              {usernameValidation.isChecking ? <ActivityIndicator size="small" color="#fa5610" /> : null}
            </View>

            {usernameValidation.error ? (
              <Text style={styles.errorText}>{usernameValidation.error}</Text>
            ) : null}

            {usernameValidation.isValid && formData.username.length >= 3 ? (
              <>
                <Text style={[styles.successText, { color: '#10b981' }]}>engageapp.co/{formData.username}</Text>
              </>
            ) : null}
          </View>

          {/* Phone Number */}
          <View style={styles.fieldGroup}>
            <Text style={[dynamicStyles.label]}>Phone Number</Text>
            <TextInput
              style={[dynamicStyles.input]}
              placeholder="Enter your phone number"
              value={formData.phone}
              onChangeText={(text) => setFormData((prev) => ({ ...prev, phone: text }))}
              placeholderTextColor={colors.textSecondary}
              keyboardType="phone-pad"
            />
            <Text style={[styles.helperText, { color: colors.textSecondary }]}>For booking confirmations & updates</Text>
          </View>

          {/* Categories (read-only) */}
          <View style={styles.fieldGroup}>
            <View style={styles.labelRow}>
              <Text style={[dynamicStyles.label]}>Categories</Text>
              <Pressable
                onPress={() => router.push('/(talent)/categories')}
                style={styles.editLink}
              >
                <Ionicons name="pencil-outline" size={14} color="#fa5610" style={{ marginRight: 4 }} />
                <Text style={[styles.editLinkText, { color: '#fa5610' }]}>Manage</Text>
              </Pressable>
            </View>

            {formData.categories.length > 0 ? (
              <View style={styles.categoryBadgesWrapper}>
                {formData.categories.map((cat) => (
                  <View key={cat} style={[styles.categoryBadge, { backgroundColor: colors.borderLight, borderColor: colors.border }]}>
                    <Text style={[styles.categoryBadgeText, { color: colors.text }]}>{CATEGORY_LABELS[cat] || cat}</Text>
                  </View>
                ))}
              </View>
            ) : (
              <Text style={[styles.mutedText, { color: colors.textSecondary }]}>No categories selected</Text>
            )}
          </View>

          {/* Bio */}
          <View style={styles.fieldGroup}>
            <View style={styles.bioHeaderRow}>
              <Text style={[dynamicStyles.label]}>Bio</Text>
              <View style={styles.bioMeta}>
                <Text
                  style={[
                    styles.bioCounter,
                    { color: formData.bio.length < 80 ? colors.textSecondary : '#10b981' },
                  ]}
                >
                  {formData.bio.length}/500
                </Text>
                <Pressable onPress={() => setShowAIBioModal(true)} style={styles.aiButton}>
                  <Ionicons name="sparkles" size={14} color="#fa5610" />
                  <Text style={styles.aiButtonText}>Write with AI</Text>
                </Pressable>
              </View>
            </View>

            {formData.bio.length === 0 && (
              <View style={[styles.bioHintBox, { backgroundColor: colors.borderLight, borderColor: colors.border }]}>
                <Text style={[styles.bioHintTitle, { color: colors.text }]}>Not sure what to write? Include:</Text>
                <Text style={[styles.bioHintItem, { color: colors.textSecondary }]}>• Your specialties and skills</Text>
                <Text style={[styles.bioHintItem, { color: colors.textSecondary }]}>• Years of experience</Text>
                <Text style={[styles.bioHintItem, { color: colors.textSecondary }]}>• What makes you unique</Text>
              </View>
            )}

            <TextInput
              style={[styles.bioInput, { minHeight: formData.bio.length > 0 ? 120 : 120, color: colors.text, borderColor: colors.border, backgroundColor: colors.bgSecondary }]}
              placeholder="Tell us about yourself..."
              value={formData.bio}
              onChangeText={(text) => setFormData((prev) => ({ ...prev, bio: text }))}
              placeholderTextColor={colors.textSecondary}
              multiline
              maxLength={500}
            />

            {formData.bio.length > 0 && formData.bio.length < 80 && (
              <Text style={styles.helperText}>Add a bit more detail...</Text>
            )}
          </View>
        </View>

        {/* LOCATION CARD */}
        <View style={styles.card}>
          <View style={styles.sectionHeader}>
            <Ionicons name="location" size={18} color="#fa5610" />
            <Text style={styles.sectionTitle}>Location</Text>
          </View>

          {/* Use My Current Location */}
          <Pressable onPress={getCurrentLocation} style={styles.currentLocationButton}>
            <Ionicons name="navigate" size={16} color="#059669" />
            <Text style={styles.currentLocationButtonText}>Use My Current Location</Text>
          </Pressable>

          {formData.location_lat && formData.location_lng ? (
            <Text style={styles.gpsSavedText}>
              GPS coordinates saved: {formData.location_lat.toFixed(4)}, {formData.location_lng.toFixed(4)}
            </Text>
          ) : null}

          {/* Country Dropdown */}
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Country</Text>
            <View style={styles.dropdownContainer}>
              <Pressable
                onPress={() => setShowCountryDropdown(!showCountryDropdown)}
                style={styles.dropdownButton}
              >
                <View style={styles.dropdownButtonContent}>
                  {selectedCountry ? (
                    <>
                      <Text style={styles.dropdownButtonText}>{selectedCountry.flag} {selectedCountry.name}</Text>
                    </>
                  ) : (
                    <Text style={styles.dropdownPlaceholder}>Select a country</Text>
                  )}
                </View>
                <Ionicons name="chevron-down" size={16} color="#6b7280" />
              </Pressable>

              {showCountryDropdown ? (
                <View style={styles.dropdownList}>
                  <ScrollView style={styles.dropdownScroll} nestedScrollEnabled showsVerticalScrollIndicator={false}>
                    {COUNTRIES.map((country) => (
                      <Pressable
                        key={country.code}
                        onPress={() => handleCountrySelect(country.code)}
                        style={styles.dropdownItem}
                      >
                        <Text style={styles.dropdownItemText}>
                          {country.flag} {country.name}
                        </Text>
                      </Pressable>
                    ))}
                  </ScrollView>
                </View>
              ) : null}
            </View>
          </View>

          {/* City Selection */}
          {formData.country && CITIES_BY_COUNTRY[formData.country] ? (
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>City</Text>
              <View style={styles.citiesWrapper}>
                {CITIES_BY_COUNTRY[formData.country].map((city) => (
                  <Pressable
                    key={city}
                    onPress={() =>
                      setFormData((prev) => ({
                        ...prev,
                        city,
                        location_text: `${city}, ${formData.country}`,
                      }))
                    }
                    style={[styles.cityPill, formData.city === city && styles.cityPillActive]}
                  >
                    <Text
                      style={[
                        styles.cityPillText,
                        formData.city === city && styles.cityPillTextActive,
                      ]}
                    >
                      {city}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>
          ) : null}

          {/* Remote Option */}
          <Pressable
            onPress={() =>
              setFormData((prev) => ({
                ...prev,
                city: 'Remote',
                location_text: 'Remote',
              }))
            }
            style={[
              styles.remoteButton,
              formData.city === 'Remote' && styles.remoteButtonActive,
            ]}
          >
            <Text style={styles.remoteLabelText}>🌍 Remote / Work from Anywhere</Text>
          </Pressable>

          {/* Currency Display */}
          {selectedCountry ? (
            <View style={styles.currencyInfoBox}>
              <Text style={styles.currencyLabel}>Currency</Text>
              <Text style={styles.currencyHelper}>Based on your country selection</Text>
              <View style={styles.currencyDisplay}>
                <Text style={styles.currencyCode}>{selectedCountry.currencyCode}</Text>
                <Text style={styles.currencyName}>{selectedCountry.currencyCode}</Text>
              </View>
            </View>
          ) : null}

          {/* Live Location Toggle */}
          <View style={styles.liveLocationRow}>
            <View style={styles.liveLocationLeft}>
              <View style={styles.liveLocationDot} />
              <Text style={styles.liveLocationLabel}>Live Location</Text>
            </View>
            <Switch
              value={formData.live_location_enabled}
              onValueChange={(value) =>
                setFormData((prev) => ({
                  ...prev,
                  live_location_enabled: value,
                }))
              }
              trackColor={{ false: '#e5e7eb', true: '#86efac' }}
              thumbColor={formData.live_location_enabled ? '#10b981' : '#f3f4f6'}
            />
          </View>
        </View>

        {/* MODEL STATS CARD (Conditional) */}
        {hasModel ? (
          <View style={styles.card}>
            <Pressable
              onPress={() => setShowModelStats(!showModelStats)}
              style={styles.collapsibleHeader}
            >
              <View style={styles.collapsibleHeaderLeft}>
                <Ionicons name="resize" size={18} color="#fa5610" />
                <Text style={styles.sectionTitle}>Model Stats</Text>
              </View>
              <Ionicons
                name={showModelStats ? 'chevron-down' : 'chevron-forward'}
                size={18}
                color="#fa5610"
              />
            </Pressable>

            {showModelStats ? (
              <>
                {/* Nationality */}
                <View style={styles.fieldGroup}>
                  <Text style={styles.label}>Nationality</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Select nationality"
                    value={formData.nationality || ''}
                    onChangeText={(text) =>
                      setFormData((prev) => ({
                        ...prev,
                        nationality: text,
                      }))
                    }
                    placeholderTextColor="#9ca3af"
                  />
                </View>

                {/* Height & Weight Grid */}
                <View style={styles.twoColumnGrid}>
                  <View style={[styles.fieldGroup, { flex: 1 }]}>
                    <Text style={styles.label}>Height (cm)</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="170"
                      value={formData.height_cm?.toString() || ''}
                      onChangeText={(text) =>
                        setFormData((prev) => ({
                          ...prev,
                          height_cm: text ? parseInt(text) : null,
                        }))
                      }
                      placeholderTextColor="#9ca3af"
                      keyboardType="numeric"
                    />
                  </View>
                  <View style={[styles.fieldGroup, { flex: 1 }]}>
                    <Text style={styles.label}>Weight (kg)</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="65"
                      value={formData.weight_kg?.toString() || ''}
                      onChangeText={(text) =>
                        setFormData((prev) => ({
                          ...prev,
                          weight_kg: text ? parseInt(text) : null,
                        }))
                      }
                      placeholderTextColor="#9ca3af"
                      keyboardType="numeric"
                    />
                  </View>
                </View>

                {/* Build */}
                <View style={styles.fieldGroup}>
                  <Text style={styles.label}>Build</Text>
                  <View style={styles.togglePillsWrapper}>
                    {BUILD_OPTIONS.map((option) => (
                      <Pressable
                        key={option}
                        onPress={() =>
                          setFormData((prev) => ({
                            ...prev,
                            build: formData.build === option ? null : option,
                          }))
                        }
                        style={[
                          styles.togglePill,
                          formData.build === option && styles.togglePillActive,
                        ]}
                      >
                        <Text
                          style={[
                            styles.togglePillText,
                            formData.build === option && styles.togglePillTextActive,
                          ]}
                        >
                          {option}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                </View>

                {/* Shoe Size */}
                <View style={styles.fieldGroup}>
                  <Text style={styles.label}>Shoe Size (EU)</Text>
                  <View style={styles.dropdownContainer}>
                    <Pressable style={styles.dropdownButton}>
                      <Text style={styles.dropdownButtonText}>
                        {formData.shoe_size || 'Select size'}
                      </Text>
                      <Ionicons name="chevron-down" size={16} color="#6b7280" />
                    </Pressable>
                  </View>
                </View>

                {/* Measurements Grid */}
                <View style={styles.threeColumnGrid}>
                  <View style={[styles.fieldGroup, { flex: 1 }]}>
                    <Text style={styles.label}>Bust (cm)</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="86"
                      value={formData.bust_cm?.toString() || ''}
                      onChangeText={(text) =>
                        setFormData((prev) => ({
                          ...prev,
                          bust_cm: text ? parseInt(text) : null,
                        }))
                      }
                      placeholderTextColor="#9ca3af"
                      keyboardType="numeric"
                    />
                  </View>
                  <View style={[styles.fieldGroup, { flex: 1 }]}>
                    <Text style={styles.label}>Waist (cm)</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="68"
                      value={formData.waist_cm?.toString() || ''}
                      onChangeText={(text) =>
                        setFormData((prev) => ({
                          ...prev,
                          waist_cm: text ? parseInt(text) : null,
                        }))
                      }
                      placeholderTextColor="#9ca3af"
                      keyboardType="numeric"
                    />
                  </View>
                  <View style={[styles.fieldGroup, { flex: 1 }]}>
                    <Text style={styles.label}>Hips (cm)</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="94"
                      value={formData.hips_cm?.toString() || ''}
                      onChangeText={(text) =>
                        setFormData((prev) => ({
                          ...prev,
                          hips_cm: text ? parseInt(text) : null,
                        }))
                      }
                      placeholderTextColor="#9ca3af"
                      keyboardType="numeric"
                    />
                  </View>
                </View>
              </>
            ) : null}
          </View>
        ) : null}

        {/* RATES & EXPERIENCE CARD */}
        {formData.categories.length > 0 ? (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Rates & Experience</Text>

            {/* Category Tabs */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.categoryTabsScroll}
              contentContainerStyle={styles.categoryTabsContent}
            >
              {formData.categories.map((category) => (
                <Pressable
                  key={category}
                  onPress={() => setSelectedCategoryTab(category)}
                  style={[
                    styles.categoryTab,
                    selectedCategoryTab === category && styles.categoryTabActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.categoryTabText,
                      selectedCategoryTab === category && styles.categoryTabTextActive,
                    ]}
                  >
                    {CATEGORY_LABELS[category] || category}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>

            {/* Rates Grid */}
            <View style={styles.twoColumnGrid}>
              <View style={[styles.fieldGroup, { flex: 1 }]}>
                <Text style={styles.label}>Hourly Rate ({formData.currency || 'USD'})</Text>
                <TextInput
                  style={styles.input}
                  placeholder="0"
                  value={formData.hourly_rate?.toString() || ''}
                  onChangeText={(text) =>
                    setFormData((prev) => ({
                      ...prev,
                      hourly_rate: text ? parseInt(text) : null,
                    }))
                  }
                  placeholderTextColor="#9ca3af"
                  keyboardType="numeric"
                />
              </View>
              <View style={[styles.fieldGroup, { flex: 1 }]}>
                <Text style={styles.label}>Day Rate ({formData.currency || 'USD'})</Text>
                <TextInput
                  style={styles.input}
                  placeholder="0"
                  value={formData.day_rate?.toString() || ''}
                  onChangeText={(text) =>
                    setFormData((prev) => ({
                      ...prev,
                      day_rate: text ? parseInt(text) : null,
                    }))
                  }
                  placeholderTextColor="#9ca3af"
                  keyboardType="numeric"
                />
              </View>
            </View>

            {/* Session & Project Rate */}
            <View style={styles.twoColumnGrid}>
              <View style={[styles.fieldGroup, { flex: 1 }]}>
                <Text style={styles.label}>Session Rate ({formData.currency || 'USD'})</Text>
                <TextInput
                  style={styles.input}
                  placeholder="0"
                  value={formData.session_rate?.toString() || ''}
                  onChangeText={(text) =>
                    setFormData((prev) => ({
                      ...prev,
                      session_rate: text ? parseInt(text) : null,
                    }))
                  }
                  placeholderTextColor="#9ca3af"
                  keyboardType="numeric"
                />
              </View>
              <View style={[styles.fieldGroup, { flex: 1 }]}>
                <Text style={styles.label}>Project Rate ({formData.currency || 'USD'})</Text>
                <TextInput
                  style={styles.input}
                  placeholder="0"
                  value={formData.project_rate?.toString() || ''}
                  onChangeText={(text) =>
                    setFormData((prev) => ({
                      ...prev,
                      project_rate: text ? parseInt(text) : null,
                    }))
                  }
                  placeholderTextColor="#9ca3af"
                  keyboardType="numeric"
                />
              </View>
            </View>

            {/* Experience */}
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Years of Experience</Text>
              <TextInput
                style={styles.input}
                placeholder="5"
                value={formData.experience_years?.toString() || ''}
                onChangeText={(text) =>
                  setFormData((prev) => ({
                    ...prev,
                    experience_years: text ? parseInt(text) : null,
                  }))
                }
                placeholderTextColor="#9ca3af"
                keyboardType="numeric"
              />
            </View>
          </View>
        ) : null}

        {/* AVAILABILITY CARD */}
        <View style={styles.card}>
          <View style={styles.availabilityHeader}>
            <View>
              <Text style={styles.sectionTitle}>Availability</Text>
              <Text style={styles.availabilitySubtitle}>Manage your schedule</Text>
            </View>
            <Pressable
              onPress={() => router.push('/(talent)/availability')}
              style={styles.manageButton}
            >
              <Ionicons name="calendar" size={16} color="#fa5610" />
              <Text style={styles.manageButtonText}>Manage</Text>
            </Pressable>
          </View>
        </View>

        {/* Spacer for sticky footer */}
        <View style={{ height: 120 }} />
      </ScrollView>

      {/* STICKY SAVE FOOTER */}
      <View style={[styles.stickyFooter, { paddingBottom: insets.bottom + 16 }]}>
        <Pressable
          onPress={saveProfile}
          disabled={isSaving || !usernameValidation.isValid}
          style={[
            styles.saveButton,
            (isSaving || !usernameValidation.isValid) && styles.saveButtonDisabled,
          ]}
        >
          {isSaving ? (
            <ActivityIndicator size="small" color="#ffffff" />
          ) : (
            <>
              <Ionicons name="checkmark" size={18} color="#ffffff" />
              <Text style={styles.saveButtonText}>Save Changes</Text>
            </>
          )}
        </Pressable>
      </View>

      {/* AI BIO MODAL */}
      <AIBioModal
        visible={showAIBioModal}
        onClose={() => setShowAIBioModal(false)}
        onGenerate={(bio) => {
          setFormData((prev) => ({
            ...prev,
            bio,
          }));
          setShowAIBioModal(false);
        }}
        category={formData.categories[0] || 'creative'}
        displayName={formData.displayName || formData.fullName}
        experienceYears={formData.experience_years}
        colors={colors}
      />
    </View>
  );

  function getInitials(name: string): string {
    if (!name) return 'T';
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  }

  async function saveProfile() {
    if (!user?.id) {
      Alert.alert('Error', 'User not found');
      return;
    }

    if (!usernameValidation.isValid) {
      Alert.alert('Error', usernameValidation.error || 'Invalid username');
      return;
    }

    setIsSaving(true);

    try {
      // Update profiles table
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          full_name: formData.fullName,
          username: formData.username,
          phone: formData.phone,
          avatar_url: formData.avatarUrl,
        })
        .eq('id', user.id);

      if (profileError) throw profileError;

      // Update talent_profiles table
      const { error: talentError } = await supabase
        .from('talent_profiles')
        .update({
          bio: formData.bio,
          display_name: formData.displayName || formData.fullName,
          country: formData.country,
          location_text: formData.location_text,
          location_lat: formData.location_lat,
          location_lng: formData.location_lng,
          live_location_enabled: formData.live_location_enabled,
          currency: formData.currency,
          banner_url: formData.bannerUrl,
          hourly_rate: formData.hourly_rate,
          day_rate: formData.day_rate,
          session_rate: formData.session_rate,
          session_duration_hours: formData.session_duration_hours,
          project_rate: formData.project_rate,
          experience_years: formData.experience_years,
          nationality: formData.nationality,
          height_cm: formData.height_cm,
          weight_kg: formData.weight_kg,
          build: formData.build,
          shoe_size: formData.shoe_size,
          bust_cm: formData.bust_cm,
          waist_cm: formData.waist_cm,
          hips_cm: formData.hips_cm,
        })
        .eq('user_id', user.id);

      if (talentError) throw talentError;

      Alert.alert('Success', 'Profile updated successfully');
      router.replace('/(talent)/profile');
    } catch (err) {
      console.error('Error saving profile:', err);
      Alert.alert('Error', 'Failed to save profile');
    } finally {
      setIsSaving(false);
    }
  }
}

// AI Bio Modal Component
function AIBioModal({
  visible,
  onClose,
  onGenerate,
  category = 'creative',
  displayName = 'Talent',
  experienceYears,
  colors,
}: {
  visible: boolean;
  onClose: () => void;
  onGenerate: (bio: string) => void;
  category?: string;
  displayName?: string;
  experienceYears?: number | null;
  colors: { bg: string; bgSecondary: string; text: string; textSecondary: string; border: string; borderLight: string };
}) {
  const [specialty, setSpecialty] = useState('');
  const [experience, setExperience] = useState(experienceYears?.toString() || '');
  const [unique, setUnique] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);

  const handleGenerate = async () => {
    if (!specialty || !experience || !unique) {
      Alert.alert('Error', 'Please fill all fields');
      return;
    }

    setIsGenerating(true);

    try {
      // Call the edge function to generate bio using AI
      const { data, error } = await supabase.functions.invoke('generate-talent-bio', {
        body: {
          category: category || 'creative',
          experience_years: parseInt(experience),
          style: specialty,
          unique_points: unique,
          name: displayName,
        },
      });

      if (error) throw error;

      if (data?.bio) {
        onGenerate(data.bio);
        setSpecialty('');
        setExperience('');
        setUnique('');
        Alert.alert('Success', 'Bio generated!');
      }
    } catch (err) {
      console.error('Error generating bio:', err);
      Alert.alert('Error', 'Failed to generate bio');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContent, { backgroundColor: colors.bg }]}>
          <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>AI Bio Generator</Text>
            <Text style={[styles.modalSubtitle, { color: colors.textSecondary }]}>Let AI help you write your professional bio</Text>
            <Pressable onPress={onClose} style={styles.modalCloseButton}>
              <Ionicons name="close" size={24} color={colors.text} />
            </Pressable>
          </View>

          <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
            <View style={styles.modalFieldGroup}>
              <Text style={[styles.modalLabel, { color: colors.text }]}>Your Style / Specialty</Text>
              <TextInput
                style={[styles.modalInput, { color: colors.text, borderColor: colors.border, backgroundColor: colors.bgSecondary }]}
                placeholder="e.g., Fashion photography, commercial modeling"
                value={specialty}
                onChangeText={setSpecialty}
                placeholderTextColor={colors.textSecondary}
              />
            </View>

            <View style={styles.modalFieldGroup}>
              <Text style={[styles.modalLabel, { color: colors.text }]}>Years of Experience</Text>
              <TextInput
                style={[styles.modalInput, { color: colors.text, borderColor: colors.border, backgroundColor: colors.bgSecondary }]}
                placeholder="e.g., 5 years"
                value={experience}
                onChangeText={setExperience}
                placeholderTextColor={colors.textSecondary}
                keyboardType="numeric"
              />
            </View>

            <View style={styles.modalFieldGroup}>
              <Text style={[styles.modalLabel, { color: colors.text }]}>What Makes You Unique?</Text>
              <TextInput
                style={[styles.modalInput, { minHeight: 100, color: colors.text, borderColor: colors.border, backgroundColor: colors.bgSecondary }]}
                placeholder="e.g., Award-winning work, unique creative approach..."
                value={unique}
                onChangeText={setUnique}
                placeholderTextColor={colors.textSecondary}
                multiline
              />
            </View>
          </ScrollView>

          <View style={[styles.modalFooter, { borderTopColor: colors.border }]}>
            <Pressable onPress={onClose} style={[styles.modalCancelButton, { borderColor: colors.border }]}>
              <Text style={[styles.modalCancelButtonText, { color: colors.textSecondary }]}>Cancel</Text>
            </Pressable>
            <Pressable
              onPress={handleGenerate}
              disabled={isGenerating}
              style={[styles.modalGenerateButton, isGenerating && styles.modalGenerateButtonDisabled]}
            >
              {isGenerating ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <>
                  <Ionicons name="sparkles" size={16} color="#ffffff" />
                  <Text style={styles.modalGenerateButtonText}>Generate</Text>
                </>
              )}
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#ffffff' },

  stickyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    gap: 12,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: { fontSize: 20, fontWeight: '700', color: '#111827' },

  scrollView: { flex: 1 },
  scrollContent: { paddingBottom: 20, paddingHorizontal: 16, paddingTop: 16, gap: 16 },

  bannerCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 8,
  },
  bannerContainer: {
    width: '100%',
    aspectRatio: 3 / 1,
    position: 'relative',
  },
  banner: {
    width: '100%',
    height: '100%',
  },
  bannerPlaceholder: {
    backgroundColor: '#f3f4f6',
  },
  bannerCameraButton: {
    position: 'absolute',
    bottom: 12,
    right: 12,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  avatarWrapper: {
    alignItems: 'center',
    marginTop: -40,
    marginBottom: 16,
  },
  avatarButton: {
    position: 'relative',
    width: 96,
    height: 96,
  },
  avatar: {
    width: '100%',
    height: '100%',
    borderRadius: 48,
    borderWidth: 3,
    borderColor: '#ffffff',
  },
  avatarPlaceholder: {
    backgroundColor: '#111827',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitials: {
    fontSize: 32,
    fontWeight: '700',
    color: '#ffffff',
  },
  avatarCameraButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#fa5610',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#ffffff',
  },

  profileName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    textAlign: 'center',
    marginBottom: 4,
  },
  profileCategory: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: 12,
  },

  card: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    padding: 16,
  },

  fieldGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#111827',
    marginBottom: 8,
  },
  input: {
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    paddingHorizontal: 12,
    fontSize: 14,
    color: '#111827',
  },
  helperText: {
    fontSize: 12,
    color: '#9ca3af',
    marginTop: 6,
  },
  errorText: {
    fontSize: 12,
    color: '#ef4444',
    marginTop: 6,
  },
  successText: {
    fontSize: 12,
    color: '#10b981',
    marginTop: 6,
  },

  usernameInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    paddingHorizontal: 12,
    height: 44,
  },
  usernamePrefix: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginRight: 4,
  },
  usernameInput: {
    flex: 1,
    fontSize: 14,
    color: '#111827',
  },

  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  editLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  editLinkText: {
    fontSize: 12,
    color: '#fa5610',
    fontWeight: '600',
  },

  categoryBadgesWrapper: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  categoryBadge: {
    backgroundColor: 'rgba(124,58,237,0.1)',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  categoryBadgeText: {
    fontSize: 12,
    color: '#fa5610',
    fontWeight: '500',
  },
  mutedText: {
    fontSize: 14,
    color: '#9ca3af',
  },

  bioHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  bioMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  bioCounter: {
    fontSize: 12,
    color: '#9ca3af',
    fontWeight: '500',
  },
  bioCounterGood: {
    color: '#10b981',
  },
  bioCounterError: {
    color: '#ef4444',
  },
  aiButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  aiButtonText: {
    fontSize: 11,
    color: '#fa5610',
    fontWeight: '600',
  },

  bioHintBox: {
    backgroundColor: 'rgba(124,58,237,0.05)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(124,58,237,0.2)',
    padding: 12,
    marginBottom: 12,
  },
  bioHintTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 8,
  },
  bioHintItem: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 4,
  },

  bioInput: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#111827',
    textAlignVertical: 'top',
  },

  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },

  currentLocationButton: {
    height: 48,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#10b981',
    backgroundColor: 'rgba(16,185,129,0.1)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 12,
  },
  currentLocationButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#059669',
  },
  gpsSavedText: {
    fontSize: 11,
    color: '#10b981',
    fontWeight: '500',
    marginBottom: 12,
  },

  dropdownContainer: {
    position: 'relative',
    marginBottom: 0,
  },
  dropdownButton: {
    height: 56,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
  },
  dropdownButtonContent: {
    flex: 1,
  },
  dropdownButtonText: {
    fontSize: 14,
    color: '#111827',
    fontWeight: '500',
  },
  dropdownPlaceholder: {
    fontSize: 14,
    color: '#9ca3af',
  },
  dropdownList: {
    position: 'absolute',
    top: 60,
    left: 0,
    right: 0,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    zIndex: 50,
    maxHeight: 256,
    marginTop: 4,
  },
  dropdownScroll: {
    flex: 1,
  },
  dropdownItem: {
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  dropdownItemText: {
    fontSize: 14,
    color: '#111827',
    fontWeight: '500',
  },

  citiesWrapper: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  cityPill: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    backgroundColor: '#f9fafb',
  },
  cityPillActive: {
    backgroundColor: '#fa5610',
    borderColor: '#fa5610',
  },
  cityPillText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6b7280',
  },
  cityPillTextActive: {
    color: '#ffffff',
  },

  remoteButton: {
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    marginBottom: 12,
  },
  remoteButtonActive: {
    backgroundColor: '#fa5610',
    borderColor: '#fa5610',
  },
  remoteLabelText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },

  currencyInfoBox: {
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    padding: 12,
    marginTop: 12,
  },
  currencyLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 2,
  },
  currencyHelper: {
    fontSize: 12,
    color: '#9ca3af',
    marginBottom: 8,
  },
  currencyDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  currencyCode: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
  },
  currencyName: {
    fontSize: 12,
    color: '#6b7280',
  },

  liveLocationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    marginTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  liveLocationLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  liveLocationDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#10b981',
  },
  liveLocationLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },

  collapsibleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    marginBottom: 16,
  },
  collapsibleHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },

  twoColumnGrid: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 0,
  },
  threeColumnGrid: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 0,
  },

  togglePillsWrapper: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  togglePill: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    backgroundColor: '#f9fafb',
  },
  togglePillActive: {
    backgroundColor: '#fa5610',
    borderColor: '#fa5610',
  },
  togglePillText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6b7280',
  },
  togglePillTextActive: {
    color: '#ffffff',
  },

  categoryTabsScroll: {
    marginHorizontal: -16,
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  categoryTabsContent: {
    gap: 8,
  },
  categoryTab: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#f3f4f6',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  categoryTabActive: {
    backgroundColor: '#transparent',
    borderBottomColor: '#fa5610',
  },
  categoryTabText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#6b7280',
  },
  categoryTabTextActive: {
    color: '#fa5610',
  },

  availabilityHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  availabilitySubtitle: {
    fontSize: 13,
    color: '#9ca3af',
    marginTop: 2,
  },
  manageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  manageButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#fa5610',
  },

  stickyFooter: {
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  saveButton: {
    height: 48,
    borderRadius: 12,
    backgroundColor: '#fa5610',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  saveButtonDisabled: {
    opacity: 0.5,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '80%',
    paddingBottom: 20,
  },
  modalHeader: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  modalSubtitle: {
    fontSize: 13,
    color: '#9ca3af',
  },
  modalCloseButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },

  modalBody: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  modalFieldGroup: {
    marginBottom: 16,
  },
  modalLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 8,
  },
  modalInput: {
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    paddingHorizontal: 12,
    fontSize: 14,
    color: '#111827',
  },

  modalFooter: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  modalCancelButton: {
    flex: 1,
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCancelButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6b7280',
  },
  modalGenerateButton: {
    flex: 1,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#fa5610',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  modalGenerateButtonDisabled: {
    opacity: 0.6,
  },
  modalGenerateButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff',
  },
});
