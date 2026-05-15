import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TextInput,
  Alert,
  ActivityIndicator,
  Pressable,
  Linking,
} from 'react-native';
import {
  ChevronLeft,
  X,
  Check,
  ChevronDown,
  Save,
  Info,
  Instagram,
  Video,
  Youtube,
  Twitter,
  Linkedin,
  Ghost,
} from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { cn } from '@/lib/cn';
import Animated, { FadeInDown, FadeIn } from 'react-native-reanimated';
import Slider from '@react-native-community/slider';
import { ListItemSkeleton } from '@/components/SkeletonLoader';
import { extractErrorMessage } from '@/lib/errorUtils';

const VISIBLE_CATEGORIES = [
  { id: 'photographer', label: 'Photographer' },
  { id: 'model', label: 'Model' },
  { id: 'makeup_artist', label: 'Makeup Artist' },
  { id: 'hair_stylist', label: 'Hair Stylist' },
  { id: 'wardrobe_stylist', label: 'Wardrobe Stylist' },
  { id: 'set_designer', label: 'Set Designer' },
  { id: 'stylist', label: 'Stylist' },
  { id: 'producer', label: 'Producer' },
  { id: 'creative_director', label: 'Creative Director' },
  { id: 'influencer', label: 'Influencer' },
  { id: 'editor', label: 'Editor' },
  { id: 'graphic_designer', label: 'Graphic Designer' },
  { id: 'marketing_consultant', label: 'Marketing Consultant' },
  { id: 'music_producer', label: 'Music Producer' },
  { id: 'drone_operator', label: 'Drone Operator' },
  { id: 'other', label: 'Other' },
];

const SPECIALTIES: Record<string, string[]> = {
  photographer: [
    'Fashion Photography',
    'Commercial Photography',
    'Product Photography',
    'Portrait Photography',
    'Event Photography',
    'Wedding Photography',
    'Food Photography',
    'Real Estate Photography',
    'Fashion Videography',
    'Commercial Videography',
    'Event Videography',
    'Brand Films',
    'Music Videos',
    'Documentary',
    'Drone / Aerial',
  ],
  model: [
    'Fashion Model',
    'Commercial Model',
    'Fitness Model',
    'Runway Model',
    'Parts Model (Hands/Feet)',
    'Plus Size Model',
    'Petite Model',
    'Catalog Model',
    'Promotional Model',
    'Influencer / Content Creator',
  ],
  makeup_artist: [
    'Bridal Makeup',
    'Fashion / Editorial',
    'SFX / Prosthetics',
    'Beauty / Glam',
    'Theatrical / Film',
    'Airbrush',
    'Natural / No-Makeup Look',
  ],
  hair_stylist: [
    'Bridal Hair',
    'Fashion / Editorial',
    'Color Specialist',
    'Extensions Specialist',
    'Barbering',
    'Theatrical / Film',
  ],
  wardrobe_stylist: [
    'Costume Design',
    'Wardrobe Management',
    'Film / TV Wardrobe',
    'Commercial Wardrobe',
    'Fashion Pulls',
  ],
  set_designer: [
    'Prop Styling',
    'Set Construction',
    'Interior Styling',
    'Event Design',
    'Window Display',
    'Art Department',
  ],
  stylist: [
    'Fashion Stylist',
    'Personal Stylist',
    'Editorial Stylist',
    'Commercial Stylist',
    'Celebrity Stylist',
    'Wardrobe Consultant',
  ],
  producer: [
    'Line Producer',
    'Executive Producer',
    'Creative Producer',
    'Production Manager',
    'Content Producer',
    'Event Producer',
  ],
  creative_director: [
    'Brand Creative Director',
    'Art Director',
    'Film Director',
    'Commercial Director',
    'Music Video Director',
    'Fashion Director',
  ],
  influencer: [
    'Lifestyle Influencer',
    'Fashion Influencer',
    'Beauty Influencer',
    'Fitness Influencer',
    'Travel Influencer',
    'Food Influencer',
    'Tech Influencer',
    'Parenting Influencer',
    'Luxury Influencer',
    '3D Modeling',
    'Motion Graphics',
    'VFX',
    'Product Visualization',
    'Architectural Visualization',
    'Character Design',
    'Animation',
    'AR / VR',
  ],
  editor: [
    'Video Editor',
    'Photo Retoucher',
    'Colorist',
    'Motion / Animation Editor',
    'Podcast / Audio Editor',
    'Social Media Editor',
  ],
  graphic_designer: [
    'Brand Identity',
    'Social Media Graphics',
    'Print Design',
    'Packaging Design',
    'Web Design',
    'Illustration',
    'Typography',
    'Presentation Design',
  ],
  marketing_consultant: [
    'Social Media Strategy',
    'Brand Strategy',
    'Content Strategy',
    'Influencer Marketing',
    'Performance Marketing',
    'PR & Communications',
    'Growth Marketing',
  ],
  music_producer: [
    'Commercial Music',
    'Sound Design',
    'Jingles & Ads',
    'Film Scoring',
    'Podcast Audio',
    'Mixing & Mastering',
    'Voice Over Direction',
  ],
  drone_operator: [
    'Aerial Photography',
    'Aerial Videography',
    'Real Estate Aerial',
    'Event Coverage',
    'Commercial / Advertising',
    'Inspection & Survey',
    'FPV Drone',
    'Mapping & Surveying',
  ],
  other: ['Other Specialty'],
};

const UAE_EMIRATES = ['Dubai', 'Abu Dhabi', 'Sharjah', 'Ajman', 'Ras Al Khaimah', 'Fujairah', 'Umm Al Quwain'];

const BUILD_OPTIONS = ['Slim', 'Athletic', 'Average', 'Curvy', 'Plus Size'];

const ETHNICITY_OPTIONS = [
  'Arab',
  'Asian',
  'Black / African',
  'Caucasian / White',
  'Hispanic / Latino',
  'Middle Eastern',
  'Mixed / Multiracial',
  'South Asian',
  'Other',
];

const NATIONALITIES = [
  'Emirati',
  'Saudi',
  'Kuwaiti',
  'Qatari',
  'Bahraini',
  'Omani',
  'Lebanese',
  'Egyptian',
  'Moroccan',
  'Jordanian',
  'Palestinian',
  'Syrian',
  'Iraqi',
  'Tunisian',
  'Algerian',
  'British',
  'American',
  'Canadian',
  'Australian',
  'French',
  'German',
  'Italian',
  'Spanish',
  'Dutch',
  'Russian',
  'Ukrainian',
  'Polish',
  'Brazilian',
  'Colombian',
  'Mexican',
  'Argentine',
  'Indian',
  'Pakistani',
  'Bangladeshi',
  'Sri Lankan',
  'Filipino',
  'Indonesian',
  'Thai',
  'Vietnamese',
  'Chinese',
  'Japanese',
  'Korean',
  'Nigerian',
  'South African',
  'Kenyan',
  'Ethiopian',
  'Ghanaian',
  'Other',
];

const INFLUENCER_NICHES = [
  'Fashion & Style',
  'Beauty & Skincare',
  'Fitness & Health',
  'Food & Lifestyle',
  'Travel & Adventure',
  'Tech & Gaming',
  'Parenting & Family',
  'Luxury & High-End',
  'Comedy & Entertainment',
  'Business & Finance',
  'Art & Design',
  'Music',
  'Automotive',
  'Sustainability & Eco',
];

const AUDIENCE_TYPES = [
  'Female Majority',
  'Male Majority',
  'Gen Z (18-24)',
  'Millennials (25-40)',
  'Gen X (41-56)',
  'Parents',
  'Professionals',
  'Students',
  'Luxury Consumers',
  'Health Conscious',
  'Local UAE',
  'Global Audience',
  'MENA Region',
];

const SOCIAL_PLATFORMS = [
  { id: 'instagram', label: 'Instagram', icon: Instagram },
  { id: 'tiktok', label: 'TikTok', icon: Video },
  { id: 'youtube', label: 'YouTube', icon: Youtube },
  { id: 'twitter', label: 'X', icon: Twitter },
  { id: 'linkedin', label: 'LinkedIn', icon: Linkedin },
  { id: 'snapchat', label: 'Snapchat', icon: Ghost },
];

const HEIGHT_RANGE = { min: 140, max: 210 };
const WEIGHT_RANGE = { min: 40, max: 150 };
const SHOE_SIZES_EU = Array.from({ length: 14 }, (_, i) => String(35 + i));

export default function CategoriesScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedSubcategories, setSelectedSubcategories] = useState<Record<string, string[]>>({});
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({});
  const [droneAreas, setDroneAreas] = useState<string[]>([]);

  const [heightCm, setHeightCm] = useState<number>(155);
  const [weightKg, setWeightKg] = useState<number>(65);
  const [build, setBuild] = useState<string>('');
  const [shoeSize, setShoeSize] = useState<string>('');
  const [nationality, setNationality] = useState<string>('');
  const [ethnicity, setEthnicity] = useState<string>('');
  const [measurements, setMeasurements] = useState({ bust: '', waist: '', hips: '' });

  const [socialLinks, setSocialLinks] = useState<Record<string, string>>({});
  const [selectedNiches, setSelectedNiches] = useState<string[]>([]);
  const [selectedAudiences, setSelectedAudiences] = useState<string[]>([]);
  const [advertiserPermitNumber, setAdvertiserPermitNumber] = useState<string>('');

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isDubbingLocation, setIsDubbingLocation] = useState(false);
  const [existingProfileId, setExistingProfileId] = useState<string | null>(null);
  const [existingProfile, setExistingProfile] = useState<any>(null);

  const MAX_CATEGORIES = 3;

  useEffect(() => {
    loadProfileData();
  }, []);

  const loadProfileData = async () => {
    try {
      const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();

      if (authError || !authUser?.id) {
        console.error('[Categories] Auth error:', authError?.message);
        setIsLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('talent_profiles')
        .select('*')
        .eq('user_id', authUser.id)
        .maybeSingle();

      if (error) {
        console.error('[Categories] Query error:', error.message, error.code);
        setIsLoading(false);
        return;
      }

      if (!data) {
        console.warn('[Categories] No talent profile found for user', authUser.id);
        setIsLoading(false);
        return;
      }

      // Store the existing profile for later use in save
      setExistingProfileId(data.id);
      setExistingProfile(data);

      try {
        const categories = Array.isArray(data.categories)
          ? data.categories
          : data.category
          ? [data.category]
          : [];
        setSelectedCategories(categories);

        setSelectedSubcategories(typeof data.subcategories === 'object' && data.subcategories ? data.subcategories : {});
        setDroneAreas(Array.isArray(data.drone_license_areas) ? data.drone_license_areas : []);

        setHeightCm(typeof data.height_cm === 'number' ? data.height_cm : 155);
        setWeightKg(typeof data.weight_kg === 'number' ? data.weight_kg : 65);
        setBuild(typeof data.build === 'string' ? data.build : '');
        setShoeSize(typeof data.shoe_size === 'string' ? data.shoe_size : '');
        setNationality(typeof data.nationality === 'string' ? data.nationality : '');
        setEthnicity(typeof data.ethnicity === 'string' ? data.ethnicity : '');

        setSocialLinks(typeof data.social_links === 'object' && data.social_links ? data.social_links : {});
        setSelectedNiches(Array.isArray(data.influencer_niche) ? data.influencer_niche : []);
        setSelectedAudiences(Array.isArray(data.audience_type) ? data.audience_type : []);
        setAdvertiserPermitNumber(typeof data.advertiser_permit_number === 'string' ? data.advertiser_permit_number : '');

        if (data.model_measurements && typeof data.model_measurements === 'object') {
          setMeasurements({
            bust: data.model_measurements.bust ? String(data.model_measurements.bust) : '',
            waist: data.model_measurements.waist ? String(data.model_measurements.waist) : '',
            hips: data.model_measurements.hips ? String(data.model_measurements.hips) : '',
          });
        }

        const locationText = typeof data.location_text === 'string' ? data.location_text.toLowerCase() : '';
        setIsDubbingLocation(locationText.includes('dubai'));
      } catch (initErr: any) {
        console.error('[Categories] State init error:', initErr?.message || String(initErr));
      }
    } catch (err: any) {
      console.error('[Categories] Load error:', extractErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  };

  const toggleCategory = (categoryId: string) => {
    setSelectedCategories((prev) => {
      if (prev.includes(categoryId)) {
        const newCategories = prev.filter((c) => c !== categoryId);
        const newSubcats = { ...selectedSubcategories };
        delete newSubcats[categoryId];
        setSelectedSubcategories(newSubcats);
        return newCategories;
      } else {
        if (prev.length >= MAX_CATEGORIES) {
          Alert.alert('Maximum Categories', 'You can select up to 3 categories');
          return prev;
        }
        return [...prev, categoryId];
      }
    });
  };

  const toggleSubcategory = (categoryId: string, specialty: string) => {
    setSelectedSubcategories((prev) => {
      const categorySubcats = prev[categoryId] || [];
      if (categorySubcats.includes(specialty)) {
        return {
          ...prev,
          [categoryId]: categorySubcats.filter((s) => s !== specialty),
        };
      } else {
        return {
          ...prev,
          [categoryId]: [...categorySubcats, specialty],
        };
      }
    });
  };

  const handleSave = async () => {
    if (selectedCategories.length === 0) {
      Alert.alert('Required', 'Please select at least one category');
      return;
    }

    if (!existingProfileId) {
      Alert.alert('Error', 'No talent profile found');
      return;
    }

    setIsSaving(true);
    try {
      const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();

      if (authError || !authUser?.id) {
        Alert.alert('Error', 'Unable to save: user not authenticated');
        setIsSaving(false);
        return;
      }

      const isModel = selectedCategories.includes('model');
      const isInfluencer = selectedCategories.includes('influencer');
      const isDrone = selectedCategories.includes('drone_operator');

      // Build model measurements object (only if model)
      const modelMeasurements =
        measurements.bust || measurements.waist || measurements.hips
          ? {
              bust: measurements.bust ? Number(measurements.bust) : undefined,
              waist: measurements.waist ? Number(measurements.waist) : undefined,
              hips: measurements.hips ? Number(measurements.hips) : undefined,
            }
          : null;

      // Check influencer verification needs
      const hasActiveSocials = Object.values(socialLinks).some((link) => link && String(link).trim() !== '');
      const previousSocialLinks = existingProfile?.social_links || {};
      const socialLinksChanged = JSON.stringify(socialLinks) !== JSON.stringify(previousSocialLinks);
      const needsVerification = isInfluencer && hasActiveSocials && (!existingProfile?.social_verified || socialLinksChanged);

      // Perform the database update
      const { error } = await supabase
        .from('talent_profiles')
        .update({
          // CORE — always save these
          category: selectedCategories[0],
          categories: selectedCategories,
          subcategories: selectedSubcategories,

          // DRONE — only if drone_operator selected
          drone_license_areas: isDrone ? droneAreas : null,

          // MODEL — only if model selected, else null
          ethnicity: isModel ? ethnicity : null,
          height_cm: isModel ? heightCm : null,
          weight_kg: isModel ? weightKg : null,
          build: isModel ? build : null,
          shoe_size: isModel ? shoeSize : null,
          nationality: isModel ? nationality : null,
          model_measurements: isModel ? modelMeasurements : null,

          // INFLUENCER — only if influencer selected, else null
          social_links: isInfluencer ? socialLinks : null,
          influencer_niche: isInfluencer ? selectedNiches : null,
          audience_type: isInfluencer ? selectedAudiences : null,
          advertiser_permit_number:
            isInfluencer && advertiserPermitNumber?.trim() ? advertiserPermitNumber.trim() : (existingProfile?.advertiser_permit_number || null),
          social_verification_status: needsVerification
            ? 'pending'
            : isInfluencer
              ? existingProfile?.social_verification_status || 'not_submitted'
              : 'not_submitted',
          social_verified: socialLinksChanged && isInfluencer ? false : existingProfile?.social_verified || false,
        })
        .eq('id', existingProfileId);

      if (error) {
        console.error('[Categories] Save error:', extractErrorMessage(error));
        Alert.alert('Error', 'Failed to save changes. Please try again.');
        setIsSaving(false);
        return;
      }

      // Show success message
      if (needsVerification) {
        Alert.alert('Success', 'Changes saved! Your social accounts have been submitted for verification.');
      } else {
        Alert.alert('Success', 'Categories updated successfully');
      }

      // Navigate back
      router.push('/(talent)/profile');
    } catch (err) {
      console.error('[Categories] Save error:', err);
      Alert.alert('Error', 'Failed to save changes');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <View className="flex-1 bg-white" style={{ paddingTop: insets.top }}>
        {/* Sticky Header */}
        <Animated.View
          entering={FadeInDown.duration(300)}
          className="flex-row items-center justify-between px-5 py-4"
          style={{ borderBottomColor: '#E5E5E5', borderBottomWidth: 1 }}
        >
          <Pressable onPress={() => router.push('/(talent)/profile')} hitSlop={8}>
            <View className="w-10 h-10 rounded-full bg-[#F5F5F5] items-center justify-center">
              <ChevronLeft size={24} color="#111827" />
            </View>
          </Pressable>
          <Text className="text-[#111827] text-xl font-bold">Categories & Specialties</Text>
          <View style={{ width: 40 }} />
        </Animated.View>
        <ListItemSkeleton count={8} />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-white" style={{ paddingTop: insets.top }}>
      {/* Sticky Header */}
      <Animated.View
        entering={FadeInDown.duration(300)}
        className="flex-row items-center justify-between px-5 py-4"
        style={{ borderBottomColor: '#E5E5E5', borderBottomWidth: 1 }}
      >
        <Pressable onPress={() => router.push('/(talent)/profile')} hitSlop={8}>
          <View className="w-10 h-10 rounded-full bg-[#F5F5F5] items-center justify-center">
            <ChevronLeft size={24} color="#111827" />
          </View>
        </Pressable>
        <Text className="text-[#111827] text-xl font-bold">Categories & Specialties</Text>
        <View style={{ width: 40 }} />
      </Animated.View>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: insets.bottom + 140 }}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View entering={FadeIn.delay(100).duration(400)} className="px-5 pt-4">
          {/* Selected Categories Preview */}
          {selectedCategories.length > 0 ? (
            <View className="mb-6">
              <View className="flex-row flex-wrap gap-2 mb-3">
                {selectedCategories.map((catId) => {
                  const cat = VISIBLE_CATEGORIES.find((c) => c.id === catId);
                  return (
                    <View
                      key={catId}
                      className="flex-row items-center gap-1 px-3 py-1.5 rounded-full"
                      style={{ backgroundColor: '#F5F5F5' }}
                    >
                      <Text className="text-[#171717] text-sm font-medium">{cat?.label}</Text>
                      <Pressable onPress={() => toggleCategory(catId)} hitSlop={6}>
                        <X size={14} color="#171717" />
                      </Pressable>
                    </View>
                  );
                })}
              </View>
              <Text className="text-[#737373] text-sm font-medium">
                {selectedCategories.length}/{MAX_CATEGORIES}
              </Text>
            </View>
          ) : null}

          {/* Categories Selection Card */}
          <View className="rounded-2xl p-5 mb-6 bg-white border border-[#E5E5E5]">
            <View className="flex-row items-center justify-between mb-4">
              <Text className="text-[#171717] text-base font-bold">Select Categories</Text>
              <Text className="text-[#737373] text-sm font-medium">Max 3</Text>
            </View>

            <View className="flex-row flex-wrap gap-2">
              {VISIBLE_CATEGORIES.map((cat) => {
                const isSelected = selectedCategories.includes(cat.id);
                const isDisabled = selectedCategories.length >= MAX_CATEGORIES && !isSelected;

                return (
                  <Pressable
                    key={cat.id}
                    onPress={() => toggleCategory(cat.id)}
                    disabled={isDisabled}
                    style={{ width: '48%', opacity: isDisabled ? 0.5 : 1 }}
                  >
                    <View
                      className="flex-row items-center justify-center px-3 py-3 rounded-xl border"
                      style={{
                        borderColor: isSelected ? '#FA5610' : '#E5E5E5',
                        backgroundColor: isSelected ? 'rgba(250,86,16,0.1)' : 'white',
                      }}
                    >
                      {isSelected ? <Check size={16} color="#FA5610" style={{ marginRight: 6 }} /> : null}
                      <Text
                        className="text-center text-sm font-medium flex-1"
                        style={{ color: isSelected ? '#FA5610' : '#171717' }}
                        numberOfLines={2}
                      >
                        {cat.label}
                      </Text>
                    </View>
                  </Pressable>
                );
              })}
            </View>
          </View>

          {/* Specialties Card */}
          {selectedCategories.length > 0 ? (
            <View className="rounded-2xl p-5 mb-6 bg-white border border-[#E5E5E5]">
              <Text className="text-[#171717] text-base font-bold mb-1">Specialties</Text>
              <Text className="text-[#737373] text-sm mb-4">Select your specialties for each category</Text>

              {selectedCategories.map((catId) => {
                const isOpen = expandedCategories[catId];
                const specs = SPECIALTIES[catId] || [];
                const selectedCount = (selectedSubcategories[catId] || []).length;

                return (
                  <View key={catId} className="mb-3">
                    <Pressable
                      onPress={() =>
                        setExpandedCategories((prev) => ({
                          ...prev,
                          [catId]: !prev[catId],
                        }))
                      }
                    >
                      <View
                        className="flex-row items-center justify-between px-3 py-3 rounded-xl"
                        style={{ backgroundColor: 'rgba(245,245,245,0.5)', borderColor: '#E5E5E5', borderWidth: 1 }}
                      >
                        <Text className="text-[#171717] text-sm font-medium flex-1">
                          {VISIBLE_CATEGORIES.find((c) => c.id === catId)?.label}
                        </Text>
                        {selectedCount > 0 ? (
                          <View className="px-2 py-1 rounded mr-2 bg-[#FA5610]">
                            <Text className="text-white text-xs font-medium">{selectedCount} selected</Text>
                          </View>
                        ) : null}
                        <ChevronDown
                          size={18}
                          color="#737373"
                          style={{ transform: [{ rotate: isOpen ? '180deg' : '0deg' }] }}
                        />
                      </View>
                    </Pressable>

                    {isOpen ? (
                      <View className="flex-row flex-wrap gap-2 mt-3">
                        {specs.map((spec) => {
                          const isSpecSelected = (selectedSubcategories[catId] || []).includes(spec);
                          return (
                            <Pressable key={spec} onPress={() => toggleSubcategory(catId, spec)}>
                              <View
                                className="px-3 py-2 rounded-xl border"
                                style={{
                                  backgroundColor: isSpecSelected ? '#FA5610' : 'white',
                                  borderColor: isSpecSelected ? '#FA5610' : '#E5E5E5',
                                }}
                              >
                                <Text
                                  className="text-sm font-medium"
                                  style={{ color: isSpecSelected ? 'white' : '#171717' }}
                                >
                                  {spec}
                                </Text>
                              </View>
                            </Pressable>
                          );
                        })}
                      </View>
                    ) : null}
                  </View>
                );
              })}
            </View>
          ) : null}

          {/* Drone License Areas */}
          {selectedCategories.includes('drone_operator') ? (
            <View className="rounded-2xl p-5 mb-6 bg-white border border-[#E5E5E5]">
              <Text className="text-[#171717] text-base font-bold mb-1">Drone License Areas (UAE)</Text>
              <Text className="text-[#737373] text-sm mb-4">Select the emirates where you're licensed to operate</Text>

              <View className="flex-row flex-wrap gap-2">
                {UAE_EMIRATES.map((emirate) => {
                  const isSelected = droneAreas.includes(emirate);
                  return (
                    <Pressable
                      key={emirate}
                      onPress={() => {
                        setDroneAreas((prev) =>
                          prev.includes(emirate) ? prev.filter((a) => a !== emirate) : [...prev, emirate]
                        );
                      }}
                    >
                      <View
                        className="px-4 py-2 rounded-xl border"
                        style={{
                          backgroundColor: isSelected ? 'rgba(250,86,16,0.1)' : 'white',
                          borderColor: isSelected ? '#FA5610' : '#E5E5E5',
                        }}
                      >
                        <Text style={{ color: isSelected ? '#FA5610' : '#171717' }} className="text-sm font-medium">
                          {emirate}
                        </Text>
                      </View>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          ) : null}

          {/* Model Specifications */}
          {selectedCategories.includes('model') ? (
            <View className="rounded-2xl p-5 mb-6 bg-white border border-[#E5E5E5]">
              <Text className="text-[#171717] text-base font-bold mb-1">Model Specifications</Text>
              <Text className="text-[#737373] text-sm mb-6">Physical measurements for modeling work</Text>

              {/* Height Slider */}
              <View className="mb-6">
                <View className="flex-row items-center justify-between mb-3">
                  <Text className="text-[#171717] text-sm">Height</Text>
                  <Text className="text-[#171717] text-sm font-medium">{Math.round(heightCm)} cm</Text>
                </View>
                <Slider
                  style={{ height: 40 }}
                  minimumValue={HEIGHT_RANGE.min}
                  maximumValue={HEIGHT_RANGE.max}
                  value={heightCm}
                  onValueChange={setHeightCm}
                  step={1}
                  minimumTrackTintColor="#fa5610"
                  maximumTrackTintColor="#e5e7eb"
                  thumbTintColor="#fa5610"
                />
              </View>

              {/* Weight Slider */}
              <View className="mb-6">
                <View className="flex-row items-center justify-between mb-3">
                  <Text className="text-[#171717] text-sm">Weight</Text>
                  <Text className="text-[#171717] text-sm font-medium">{Math.round(weightKg)} kg</Text>
                </View>
                <Slider
                  style={{ height: 40 }}
                  minimumValue={WEIGHT_RANGE.min}
                  maximumValue={WEIGHT_RANGE.max}
                  value={weightKg}
                  onValueChange={setWeightKg}
                  step={1}
                  minimumTrackTintColor="#fa5610"
                  maximumTrackTintColor="#e5e7eb"
                  thumbTintColor="#fa5610"
                />
              </View>

              {/* Build */}
              <View className="mb-6">
                <Text className="text-[#171717] text-sm font-medium mb-3">Build</Text>
                <View className="flex-row flex-wrap gap-2">
                  {BUILD_OPTIONS.map((opt) => {
                    const isSelected = build === opt;
                    return (
                      <Pressable key={opt} onPress={() => setBuild(build === opt ? '' : opt)}>
                        <View
                          className="px-4 py-2 rounded-xl border"
                          style={{
                            backgroundColor: isSelected ? 'rgba(250,86,16,0.1)' : 'white',
                            borderColor: isSelected ? '#FA5610' : '#E5E5E5',
                          }}
                        >
                          <Text style={{ color: isSelected ? '#FA5610' : '#171717' }} className="text-sm font-medium">
                            {opt}
                          </Text>
                        </View>
                      </Pressable>
                    );
                  })}
                </View>
              </View>

              {/* Shoe Size */}
              <View className="mb-6">
                <Text className="text-[#171717] text-sm font-medium mb-3">Shoe Size (EU)</Text>
                <View className="flex-row flex-wrap gap-2">
                  {SHOE_SIZES_EU.map((size) => {
                    const isSelected = shoeSize === size;
                    return (
                      <Pressable key={size} onPress={() => setShoeSize(shoeSize === size ? '' : size)}>
                        <View
                          className="w-10 h-10 items-center justify-center rounded-xl border"
                          style={{
                            backgroundColor: isSelected ? '#FA5610' : 'white',
                            borderColor: isSelected ? '#FA5610' : '#E5E5E5',
                          }}
                        >
                          <Text style={{ color: isSelected ? 'white' : '#171717' }} className="text-xs font-medium">
                            {size}
                          </Text>
                        </View>
                      </Pressable>
                    );
                  })}
                </View>
              </View>

              {/* Nationality */}
              <View className="mb-6">
                <Text className="text-[#171717] text-sm font-medium mb-2">Nationality</Text>
                <TextInput
                  className="px-3 py-3 rounded-lg text-[#171717] text-sm"
                  style={{
                    backgroundColor: 'white',
                    borderWidth: 1,
                    borderColor: '#E5E5E5',
                  }}
                  placeholder="Search nationality..."
                  placeholderTextColor="#b3b3b3"
                  value={nationality}
                  onChangeText={setNationality}
                />
              </View>

              {/* Ethnicity */}
              <View className="mb-6">
                <Text className="text-[#171717] text-sm font-medium mb-2">Ethnicity</Text>
                <Text className="text-[#737373] text-xs mb-3">Helps clients find models for diverse casting</Text>
                <View className="flex-row flex-wrap gap-2">
                  {ETHNICITY_OPTIONS.map((opt) => {
                    const isSelected = ethnicity === opt;
                    return (
                      <Pressable key={opt} onPress={() => setEthnicity(ethnicity === opt ? '' : opt)}>
                        <View
                          className="px-4 py-2 rounded-xl border"
                          style={{
                            backgroundColor: isSelected ? 'rgba(250,86,16,0.1)' : 'white',
                            borderColor: isSelected ? '#FA5610' : '#E5E5E5',
                          }}
                        >
                          <Text style={{ color: isSelected ? '#FA5610' : '#171717' }} className="text-sm font-medium">
                            {opt}
                          </Text>
                        </View>
                      </Pressable>
                    );
                  })}
                </View>
              </View>

              {/* Measurements */}
              <View>
                <Text className="text-[#171717] text-sm font-medium mb-3">Measurements (Optional)</Text>
                <View className="flex-row gap-2">
                  <TextInput
                    className="flex-1 px-3 py-3 rounded-lg text-[#171717] text-sm"
                    style={{
                      backgroundColor: 'white',
                      borderWidth: 1,
                      borderColor: '#E5E5E5',
                    }}
                    placeholder="Bust"
                    placeholderTextColor="#b3b3b3"
                    keyboardType="numeric"
                    value={measurements.bust}
                    onChangeText={(text) => setMeasurements((prev) => ({ ...prev, bust: text }))}
                  />
                  <TextInput
                    className="flex-1 px-3 py-3 rounded-lg text-[#171717] text-sm"
                    style={{
                      backgroundColor: 'white',
                      borderWidth: 1,
                      borderColor: '#E5E5E5',
                    }}
                    placeholder="Waist"
                    placeholderTextColor="#b3b3b3"
                    keyboardType="numeric"
                    value={measurements.waist}
                    onChangeText={(text) => setMeasurements((prev) => ({ ...prev, waist: text }))}
                  />
                  <TextInput
                    className="flex-1 px-3 py-3 rounded-lg text-[#171717] text-sm"
                    style={{
                      backgroundColor: 'white',
                      borderWidth: 1,
                      borderColor: '#E5E5E5',
                    }}
                    placeholder="Hips"
                    placeholderTextColor="#b3b3b3"
                    keyboardType="numeric"
                    value={measurements.hips}
                    onChangeText={(text) => setMeasurements((prev) => ({ ...prev, hips: text }))}
                  />
                </View>
              </View>
            </View>
          ) : null}

          {/* Influencer Details */}
          {selectedCategories.includes('influencer') ? (
            <View className="rounded-2xl p-5 mb-6 bg-white border border-[#E5E5E5]">
              <Text className="text-[#171717] text-base font-bold mb-1">Influencer Details</Text>
              <Text className="text-[#737373] text-sm mb-6">Add your social media accounts and content focus</Text>

              {/* Social Media Accounts */}
              <View className="mb-6">
                <Text className="text-[#171717] text-sm font-medium mb-2">Social Media Accounts</Text>
                <Text className="text-[#737373] text-xs mb-3">Add at least one account for verification</Text>

                {SOCIAL_PLATFORMS.map((platform) => {
                  const Icon = platform.icon;
                  return (
                    <View key={platform.id} className="flex-row items-center gap-3 mb-3">
                      <View
                        className="w-10 h-10 rounded-lg items-center justify-center"
                        style={{ backgroundColor: '#F5F5F5' }}
                      >
                        <Icon size={20} color="#FA5610" />
                      </View>
                      <TextInput
                        className="flex-1 px-3 py-3 rounded-lg text-[#171717] text-sm"
                        style={{
                          backgroundColor: 'white',
                          borderWidth: 1,
                          borderColor: '#E5E5E5',
                        }}
                        placeholder={`Your ${platform.label} handle or URL`}
                        placeholderTextColor="#b3b3b3"
                        value={socialLinks[platform.id] || ''}
                        onChangeText={(text) => setSocialLinks((prev) => ({ ...prev, [platform.id]: text }))}
                      />
                    </View>
                  );
                })}
              </View>

              {/* Content Focus */}
              <View className="mb-6">
                <Text className="text-[#171717] text-sm font-medium mb-2">Content Focus</Text>
                <Text className="text-[#737373] text-xs mb-3">Select the categories that describe your content</Text>
                <View className="flex-row flex-wrap gap-2">
                  {INFLUENCER_NICHES.map((niche) => {
                    const isSelected = selectedNiches.includes(niche);
                    return (
                      <Pressable
                        key={niche}
                        onPress={() =>
                          setSelectedNiches((prev) =>
                            prev.includes(niche) ? prev.filter((n) => n !== niche) : [...prev, niche]
                          )
                        }
                      >
                        <View
                          className="flex-row items-center px-3 py-2 rounded-xl border"
                          style={{
                            backgroundColor: isSelected ? '#FA5610' : 'white',
                            borderColor: isSelected ? '#FA5610' : '#E5E5E5',
                          }}
                        >
                          {isSelected ? <Check size={14} color="white" style={{ marginRight: 4 }} /> : null}
                          <Text
                            style={{ color: isSelected ? 'white' : '#171717' }}
                            className="text-sm font-medium"
                          >
                            {niche}
                          </Text>
                        </View>
                      </Pressable>
                    );
                  })}
                </View>
              </View>

              {/* Audience Demographics */}
              <View className="mb-6">
                <Text className="text-[#171717] text-sm font-medium mb-3">Audience Demographics</Text>
                <View className="flex-row flex-wrap gap-2">
                  {AUDIENCE_TYPES.map((audience) => {
                    const isSelected = selectedAudiences.includes(audience);
                    return (
                      <Pressable
                        key={audience}
                        onPress={() =>
                          setSelectedAudiences((prev) =>
                            prev.includes(audience) ? prev.filter((a) => a !== audience) : [...prev, audience]
                          )
                        }
                      >
                        <View
                          className="flex-row items-center px-3 py-2 rounded-xl border"
                          style={{
                            backgroundColor: isSelected ? 'rgba(250,86,16,0.1)' : 'white',
                            borderColor: isSelected ? '#FA5610' : '#E5E5E5',
                          }}
                        >
                          {isSelected ? <Check size={14} color="#FA5610" style={{ marginRight: 4 }} /> : null}
                          <Text
                            style={{ color: isSelected ? '#FA5610' : '#171717' }}
                            className="text-sm font-medium"
                          >
                            {audience}
                          </Text>
                        </View>
                      </Pressable>
                    );
                  })}
                </View>
              </View>

              {/* Verification Info */}
              <View className="flex-row gap-3 p-4 rounded-lg mb-6" style={{ backgroundColor: 'rgba(245,245,245,0.5)', borderColor: '#E5E5E5', borderWidth: 1 }}>
                <Info size={18} color="#b3b3b3" style={{ marginTop: 2 }} />
                <View className="flex-1">
                  <Text className="text-[#171717] text-sm font-bold">Verification: </Text>
                  <Text className="text-[#737373] text-sm leading-5">
                    Your social accounts will be reviewed. Once verified, you'll receive a "Verified Influencer" badge on your profile.
                  </Text>
                </View>
              </View>

              {/* Advertiser Permit (Dubai only) */}
              {isDubbingLocation ? (
                <View>
                  <View className="flex-row items-center gap-2 mb-2">
                    <Text className="text-[#171717] text-sm font-medium">Advertiser Permit Number</Text>
                    <Text className="text-[#b3b3b3] text-xs">(Optional)</Text>
                  </View>
                  <Text className="text-[#737373] text-xs mb-3">
                    Influencers in Dubai are required to have an Advertiser Permit from the UAE Media Council.
                  </Text>
                  <TextInput
                    className="px-3 py-3 rounded-lg text-[#171717] text-sm mb-3"
                    style={{
                      backgroundColor: 'white',
                      borderWidth: 1,
                      borderColor: '#E5E5E5',
                    }}
                    placeholder="Enter your Advertiser Permit number"
                    placeholderTextColor="#b3b3b3"
                    value={advertiserPermitNumber}
                    onChangeText={setAdvertiserPermitNumber}
                  />
                  <Pressable onPress={() => Linking.openURL('https://uaemc.gov.ae')}>
                    <Text className="text-[#FA5610] text-sm font-bold">
                      Don't have a permit? Apply for one here →
                    </Text>
                  </Pressable>
                </View>
              ) : null}
            </View>
          ) : null}
        </Animated.View>
      </ScrollView>

      {/* Save Button */}
      <View
        className="px-5"
        style={{
          paddingBottom: insets.bottom + 16,
          borderTopColor: '#E5E5E5',
          borderTopWidth: 1,
        }}
      >
        <Pressable onPress={handleSave} disabled={isSaving || selectedCategories.length === 0}>
          <View
            className="h-14 flex-row items-center justify-center rounded-2xl gap-2"
            style={{
              backgroundColor:
                isSaving || selectedCategories.length === 0
                  ? 'rgba(250, 86, 16, 0.5)'
                  : '#fa5610',
            }}
          >
            {isSaving ? (
              <ActivityIndicator size="small" color="white" />
            ) : (
              <>
                <Save size={20} color="white" />
                <Text className="text-white text-base font-bold">Save Changes</Text>
              </>
            )}
          </View>
        </Pressable>
      </View>
    </View>
  );
}
