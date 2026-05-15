import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TextInput,
  Alert,
  ActivityIndicator,
  Pressable,
  StyleSheet,
} from 'react-native';
import { ChevronLeft, X } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { cn } from '@/lib/cn';
import Animated, { FadeInDown, FadeIn } from 'react-native-reanimated';
import Slider from '@react-native-community/slider';
import { extractErrorMessage } from '@/lib/errorUtils';

const VISIBLE_CATEGORIES = [
  { id: 'photographer', label: 'Photographer / Videographer' },
  { id: 'model', label: 'Model' },
  { id: 'makeup_artist', label: 'Makeup Artist' },
  { id: 'hair_stylist', label: 'Hair Stylist' },
  { id: 'wardrobe_stylist', label: 'Wardrobe Stylist' },
  { id: 'set_designer', label: 'Set Designer' },
  { id: 'stylist', label: 'Stylist' },
  { id: 'producer', label: 'Producer' },
  { id: 'creative_director', label: 'Director' },
  { id: 'influencer', label: 'Influencer / UGC Creator' },
  { id: 'editor', label: 'Editor' },
  { id: 'graphic_designer', label: 'Graphic Designer' },
  { id: 'marketing_consultant', label: 'Marketing Consultant' },
  { id: 'music_producer', label: 'Music Producer' },
  { id: 'drone_operator', label: 'Drone Operator' },
  { id: 'other', label: 'Other' },
];

const SPECIALTIES: Record<string, Array<{ id: string; label: string }>> = {
  photographer: [
    { id: 'fashion_photography', label: 'Fashion Photography' },
    { id: 'commercial_photography', label: 'Commercial Photography' },
    { id: 'product_photography', label: 'Product Photography' },
    { id: 'portrait_photography', label: 'Portrait Photography' },
    { id: 'event_photography', label: 'Event Photography' },
    { id: 'wedding_photography', label: 'Wedding Photography' },
    { id: 'food_photography', label: 'Food Photography' },
    { id: 'real_estate_photography', label: 'Real Estate Photography' },
    { id: 'fashion_videography', label: 'Fashion Videography' },
    { id: 'commercial_videography', label: 'Commercial Videography' },
    { id: 'event_videography', label: 'Event Videography' },
    { id: 'brand_films', label: 'Brand Films' },
    { id: 'music_videos', label: 'Music Videos' },
    { id: 'documentary', label: 'Documentary' },
    { id: 'drone_aerial', label: 'Drone / Aerial' },
  ],
  model: [
    { id: 'fashion_model', label: 'Fashion Model' },
    { id: 'commercial_model', label: 'Commercial Model' },
    { id: 'fitness_model', label: 'Fitness Model' },
    { id: 'runway_model', label: 'Runway Model' },
    { id: 'parts_model', label: 'Parts Model (Hands/Feet)' },
    { id: 'plus_size_model', label: 'Plus Size Model' },
    { id: 'petite_model', label: 'Petite Model' },
    { id: 'catalog_model', label: 'Catalog Model' },
    { id: 'promotional_model', label: 'Promotional Model' },
    { id: 'influencer_model', label: 'Influencer / Content Creator' },
  ],
  makeup_artist: [
    { id: 'bridal_makeup', label: 'Bridal Makeup' },
    { id: 'fashion_makeup', label: 'Fashion / Editorial' },
    { id: 'sfx_makeup', label: 'SFX / Prosthetics' },
    { id: 'beauty_makeup', label: 'Beauty / Glam' },
    { id: 'theatrical_makeup', label: 'Theatrical / Film' },
    { id: 'airbrush_makeup', label: 'Airbrush' },
    { id: 'natural_makeup', label: 'Natural / No-Makeup Look' },
  ],
  stylist: [
    { id: 'fashion_stylist', label: 'Fashion Stylist' },
    { id: 'personal_stylist', label: 'Personal Stylist' },
    { id: 'editorial_stylist', label: 'Editorial Stylist' },
    { id: 'commercial_stylist', label: 'Commercial Stylist' },
    { id: 'celebrity_stylist', label: 'Celebrity Stylist' },
    { id: 'wardrobe_consultant', label: 'Wardrobe Consultant' },
  ],
  hair_stylist: [
    { id: 'bridal_hair', label: 'Bridal Hair' },
    { id: 'fashion_hair', label: 'Fashion / Editorial' },
    { id: 'color_specialist', label: 'Color Specialist' },
    { id: 'extensions_specialist', label: 'Extensions Specialist' },
    { id: 'barbering', label: 'Barbering' },
    { id: 'theatrical_hair', label: 'Theatrical / Film' },
  ],
  wardrobe_stylist: [
    { id: 'costume_design', label: 'Costume Design' },
    { id: 'wardrobe_management', label: 'Wardrobe Management' },
    { id: 'film_wardrobe', label: 'Film / TV Wardrobe' },
    { id: 'commercial_wardrobe', label: 'Commercial Wardrobe' },
    { id: 'fashion_pulls', label: 'Fashion Pulls' },
  ],
  set_designer: [
    { id: 'prop_styling', label: 'Prop Styling' },
    { id: 'set_construction', label: 'Set Construction' },
    { id: 'interior_styling', label: 'Interior Styling' },
    { id: 'event_design', label: 'Event Design' },
    { id: 'window_display', label: 'Window Display' },
    { id: 'art_department', label: 'Art Department' },
  ],
  producer: [
    { id: 'line_producer', label: 'Line Producer' },
    { id: 'executive_producer', label: 'Executive Producer' },
    { id: 'creative_producer', label: 'Creative Producer' },
    { id: 'production_manager', label: 'Production Manager' },
    { id: 'content_producer', label: 'Content Producer' },
    { id: 'event_producer', label: 'Event Producer' },
  ],
  creative_director: [
    { id: 'brand_creative_director', label: 'Brand Creative Director' },
    { id: 'art_director', label: 'Art Director' },
    { id: 'film_director', label: 'Film Director' },
    { id: 'commercial_director', label: 'Commercial Director' },
    { id: 'music_video_director', label: 'Music Video Director' },
    { id: 'fashion_director', label: 'Fashion Director' },
  ],
  influencer: [
    { id: 'lifestyle_influencer', label: 'Lifestyle Influencer' },
    { id: 'fashion_influencer', label: 'Fashion Influencer' },
    { id: 'beauty_influencer', label: 'Beauty Influencer' },
    { id: 'fitness_influencer', label: 'Fitness Influencer' },
    { id: 'travel_influencer', label: 'Travel Influencer' },
    { id: 'food_influencer', label: 'Food Influencer' },
    { id: 'tech_influencer', label: 'Tech Influencer' },
    { id: 'parenting_influencer', label: 'Parenting Influencer' },
    { id: 'luxury_influencer', label: 'Luxury Influencer' },
    { id: '3d_modeling', label: '3D Modeling' },
    { id: 'motion_graphics', label: 'Motion Graphics' },
    { id: 'vfx', label: 'VFX' },
    { id: 'product_visualization', label: 'Product Visualization' },
    { id: 'architectural_viz', label: 'Architectural Visualization' },
    { id: 'character_design', label: 'Character Design' },
    { id: 'animation', label: 'Animation' },
    { id: 'ar_vr', label: 'AR / VR' },
  ],
  editor: [
    { id: 'video_editor', label: 'Video Editor' },
    { id: 'photo_retoucher', label: 'Photo Retoucher' },
    { id: 'colorist', label: 'Colorist' },
    { id: 'motion_editor', label: 'Motion / Animation Editor' },
    { id: 'podcast_editor', label: 'Podcast / Audio Editor' },
    { id: 'social_media_editor', label: 'Social Media Editor' },
  ],
  graphic_designer: [
    { id: 'brand_identity', label: 'Brand Identity' },
    { id: 'social_media_graphics', label: 'Social Media Graphics' },
    { id: 'print_design', label: 'Print Design' },
    { id: 'packaging_design', label: 'Packaging Design' },
    { id: 'web_design', label: 'Web Design' },
    { id: 'illustration', label: 'Illustration' },
    { id: 'typography', label: 'Typography' },
    { id: 'presentation_design', label: 'Presentation Design' },
  ],
  marketing_consultant: [
    { id: 'social_media_strategy', label: 'Social Media Strategy' },
    { id: 'brand_strategy', label: 'Brand Strategy' },
    { id: 'content_strategy', label: 'Content Strategy' },
    { id: 'influencer_marketing', label: 'Influencer Marketing' },
    { id: 'performance_marketing', label: 'Performance Marketing' },
    { id: 'pr_communications', label: 'PR & Communications' },
    { id: 'growth_marketing', label: 'Growth Marketing' },
  ],
  music_producer: [
    { id: 'commercial_music', label: 'Commercial Music' },
    { id: 'sound_design', label: 'Sound Design' },
    { id: 'jingles_ads', label: 'Jingles & Ads' },
    { id: 'film_scoring', label: 'Film Scoring' },
    { id: 'podcast_audio', label: 'Podcast Audio' },
    { id: 'mixing_mastering', label: 'Mixing & Mastering' },
    { id: 'voice_over', label: 'Voice Over Direction' },
  ],
  drone_operator: [
    { id: 'aerial_photography', label: 'Aerial Photography' },
    { id: 'aerial_videography', label: 'Aerial Videography' },
    { id: 'real_estate_aerial', label: 'Real Estate Aerial' },
    { id: 'event_aerial', label: 'Event Coverage' },
    { id: 'commercial_aerial', label: 'Commercial / Advertising' },
    { id: 'inspection_survey', label: 'Inspection & Survey' },
    { id: 'fpv_drone', label: 'FPV Drone' },
    { id: 'mapping_surveying', label: 'Mapping & Surveying' },
  ],
  other: [
    { id: 'other_specialty', label: 'Other Specialty' },
  ],
};

const UAE_EMIRATES = [
  { id: 'dubai', label: 'Dubai' },
  { id: 'abu_dhabi', label: 'Abu Dhabi' },
  { id: 'sharjah', label: 'Sharjah' },
  { id: 'ajman', label: 'Ajman' },
  { id: 'ras_al_khaimah', label: 'Ras Al Khaimah' },
  { id: 'fujairah', label: 'Fujairah' },
  { id: 'umm_al_quwain', label: 'Umm Al Quwain' },
];

const BUILD_OPTIONS = [
  { id: 'slim', label: 'Slim' },
  { id: 'athletic', label: 'Athletic' },
  { id: 'average', label: 'Average' },
  { id: 'curvy', label: 'Curvy' },
  { id: 'plus_size', label: 'Plus Size' },
];

const ETHNICITY_OPTIONS = [
  { id: 'arab', label: 'Arab' },
  { id: 'asian', label: 'Asian' },
  { id: 'black', label: 'Black / African' },
  { id: 'caucasian', label: 'Caucasian / White' },
  { id: 'hispanic', label: 'Hispanic / Latino' },
  { id: 'middle_eastern', label: 'Middle Eastern' },
  { id: 'mixed', label: 'Mixed / Multiracial' },
  { id: 'south_asian', label: 'South Asian' },
  { id: 'other', label: 'Other' },
];

const INFLUENCER_NICHES = [
  { value: 'fashion_style', label: 'Fashion & Style' },
  { value: 'beauty_skincare', label: 'Beauty & Skincare' },
  { value: 'fitness_health', label: 'Fitness & Health' },
  { value: 'food_lifestyle', label: 'Food & Lifestyle' },
  { value: 'travel_adventure', label: 'Travel & Adventure' },
  { value: 'tech_gaming', label: 'Tech & Gaming' },
  { value: 'parenting_family', label: 'Parenting & Family' },
  { value: 'luxury_highend', label: 'Luxury & High-End' },
  { value: 'comedy_entertainment', label: 'Comedy & Entertainment' },
  { value: 'business_finance', label: 'Business & Finance' },
  { value: 'art_design', label: 'Art & Design' },
  { value: 'music', label: 'Music' },
  { value: 'automotive', label: 'Automotive' },
  { value: 'sustainability', label: 'Sustainability & Eco' },
];

const AUDIENCE_TYPES = [
  { value: 'female_majority', label: 'Female Majority' },
  { value: 'male_majority', label: 'Male Majority' },
  { value: 'gen_z', label: 'Gen Z (18-24)' },
  { value: 'millennials', label: 'Millennials (25-40)' },
  { value: 'gen_x', label: 'Gen X (41-56)' },
  { value: 'parents', label: 'Parents' },
  { value: 'professionals', label: 'Professionals' },
  { value: 'students', label: 'Students' },
  { value: 'luxury_consumers', label: 'Luxury Consumers' },
  { value: 'health_conscious', label: 'Health Conscious' },
  { value: 'local_uae', label: 'Local UAE' },
  { value: 'global_audience', label: 'Global Audience' },
  { value: 'mena_region', label: 'MENA Region' },
];

const SOCIAL_PLATFORMS = [
  { value: 'instagram', label: 'Instagram' },
  { value: 'tiktok', label: 'TikTok' },
  { value: 'youtube', label: 'YouTube' },
  { value: 'twitter', label: 'X' },
  { value: 'linkedin', label: 'LinkedIn' },
  { value: 'snapchat', label: 'Snapchat' },
];

const HEIGHT_RANGE = { min: 140, max: 210 };
const WEIGHT_RANGE = { min: 40, max: 120 };
const SHOE_SIZES_EU = Array.from({ length: 14 }, (_, i) => (35 + i).toString());

export default function CategoriesScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedSubcategories, setSelectedSubcategories] = useState<Record<string, string[]>>({});
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({});
  const [droneAreas, setDroneAreas] = useState<string[]>([]);

  const [heightCm, setHeightCm] = useState<number>(165);
  const [weightCm, setWeightCm] = useState<number>(65);
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
        .eq('id', authUser.id)
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

      try {
        const categories = Array.isArray(data.categories) ? data.categories : (data.category ? [data.category] : []);
        setSelectedCategories(categories);

        setSelectedSubcategories(typeof data.subcategories === 'object' && data.subcategories ? data.subcategories : {});
        setDroneAreas(Array.isArray(data.drone_license_areas) ? data.drone_license_areas : []);

        setHeightCm(typeof data.height_cm === 'number' ? data.height_cm : 165);
        setWeightCm(typeof data.weight_kg === 'number' ? data.weight_kg : 65);
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
        console.error('[Categories] State init error:', extractErrorMessage(initErr));
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

  const toggleSubcategory = (categoryId: string, subcatId: string) => {
    setSelectedSubcategories((prev) => {
      const categorySubcats = prev[categoryId] || [];
      if (categorySubcats.includes(subcatId)) {
        return {
          ...prev,
          [categoryId]: categorySubcats.filter((s) => s !== subcatId),
        };
      } else {
        return {
          ...prev,
          [categoryId]: [...categorySubcats, subcatId],
        };
      }
    });
  };

  const handleSave = async () => {
    if (selectedCategories.length === 0) {
      Alert.alert('Required', 'Please select at least one category');
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

      const modelMeasurements = (measurements.bust || measurements.waist || measurements.hips)
        ? {
            bust: measurements.bust ? Number(measurements.bust) : undefined,
            waist: measurements.waist ? Number(measurements.waist) : undefined,
            hips: measurements.hips ? Number(measurements.hips) : undefined,
          }
        : null;

      const { error } = await supabase
        .from('talent_profiles')
        .update({
          category: selectedCategories[0],
          categories: selectedCategories,
          subcategories: selectedSubcategories,
          drone_license_areas: isDrone ? droneAreas : null,
          ethnicity: isModel ? ethnicity : null,
          height_cm: isModel ? heightCm : null,
          weight_kg: isModel ? weightCm : null,
          build: isModel ? build : null,
          shoe_size: isModel ? shoeSize : null,
          nationality: isModel ? nationality : null,
          model_measurements: isModel ? modelMeasurements : null,
          social_links: isInfluencer ? socialLinks : null,
          influencer_niche: isInfluencer ? selectedNiches : null,
          audience_type: isInfluencer ? selectedAudiences : null,
          advertiser_permit_number: isInfluencer && advertiserPermitNumber?.trim()
            ? advertiserPermitNumber.trim()
            : null,
          social_verification_status: isInfluencer ? 'pending' : null,
          social_verified: false,
        })
        .eq('id', authUser.id);

      if (error) throw error;

      Alert.alert('Success', 'Categories updated successfully');
      router.replace('/(talent)/profile');
    } catch (err) {
      console.error('[Categories] Save error:', err);
      Alert.alert('Error', 'Failed to save changes');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <View className="flex-1 bg-[#0A0A0A] items-center justify-center">
        <ActivityIndicator size="large" color="#fa5610" />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-[#0A0A0A]" style={{ paddingTop: insets.top }}>
      {/* Header */}
      <Animated.View
        entering={FadeInDown.duration(300)}
        className="flex-row items-center justify-between px-5 py-4"
        style={{ borderBottomColor: 'rgba(255, 255, 255, 0.05)', borderBottomWidth: 1 }}
      >
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <ChevronLeft size={24} color="#ffffff" />
        </Pressable>
        <Text className="text-white text-lg font-semibold">Categories & Specialties</Text>
        <View style={{ width: 24 }} />
      </Animated.View>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View entering={FadeIn.delay(100).duration(400)} className="px-5 pt-4">
          {/* Selected Categories Preview */}
          {selectedCategories.length > 0 && (
            <View className="mb-6">
              <View className="flex-row flex-wrap gap-2 mb-3">
                {selectedCategories.map((catId) => {
                  const cat = VISIBLE_CATEGORIES.find((c) => c.id === catId);
                  return (
                    <View
                      key={catId}
                      className="flex-row items-center gap-1 px-3 py-2 rounded-full"
                      style={{ backgroundColor: 'rgba(255, 255, 255, 0.08)' }}
                    >
                      <Text className="text-white text-sm font-medium" numberOfLines={1}>
                        {cat?.label}
                      </Text>
                      <Pressable onPress={() => toggleCategory(catId)} hitSlop={6}>
                        <X size={16} color="#ffffff" />
                      </Pressable>
                    </View>
                  );
                })}
              </View>
              <Text className="text-neutral-400 text-sm font-medium">
                {selectedCategories.length}/{MAX_CATEGORIES}
              </Text>
            </View>
          )}

          {/* Categories Selection Card */}
          <View
            className="rounded-2xl p-5 mb-6"
            style={{ backgroundColor: 'rgba(255, 255, 255, 0.05)' }}
          >
            <View className="flex-row items-center justify-between mb-4">
              <Text className="text-white text-base font-semibold">Select Categories</Text>
              <Text className="text-neutral-400 text-sm">Max 3</Text>
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
                    style={{
                      width: '48%',
                      opacity: isDisabled ? 0.5 : 1,
                    }}
                  >
                    <View
                      className="flex-row items-center justify-center px-3 py-3 rounded-xl"
                      style={{
                        borderWidth: 1,
                        borderColor: isSelected ? '#fa5610' : 'rgba(255, 255, 255, 0.1)',
                        backgroundColor: isSelected ? 'rgba(250, 86, 16, 0.15)' : 'transparent',
                      }}
                    >
                      <Text
                        className="text-center text-xs font-medium"
                        style={{ color: isSelected ? '#fa5610' : '#ffffff' }}
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
          {selectedCategories.length > 0 && (
            <View
              className="rounded-2xl p-5 mb-6"
              style={{ backgroundColor: 'rgba(255, 255, 255, 0.05)' }}
            >
              <Text className="text-white text-base font-semibold mb-1">Specialties</Text>
              <Text className="text-neutral-400 text-sm mb-4">
                Select your specialties for each category
              </Text>

              {selectedCategories.map((catId) => {
                const isOpen = expandedCategories[catId];
                const specs = (SPECIALTIES as any)[catId] || [];
                const selectedCount = (selectedSubcategories[catId] || []).length;

                return (
                  <View key={catId} className="mb-3">
                    <Pressable
                      onPress={() => setExpandedCategories((prev) => ({ ...prev, [catId]: !prev[catId] }))}
                    >
                      <View
                        className="flex-row items-center justify-between px-3 py-3 rounded-xl"
                        style={{ backgroundColor: 'rgba(0, 0, 0, 0.2)' }}
                      >
                        <Text className="text-white text-sm font-medium flex-1">
                          {VISIBLE_CATEGORIES.find((c) => c.id === catId)?.label}
                        </Text>
                        {selectedCount > 0 && (
                          <View
                            className="px-2 py-1 rounded mr-2"
                            style={{ backgroundColor: 'rgba(255, 255, 255, 0.1)' }}
                          >
                            <Text className="text-neutral-400 text-xs font-medium">
                              {selectedCount} selected
                            </Text>
                          </View>
                        )}
                      </View>
                    </Pressable>

                    {isOpen ? (
                      <View className="flex-row flex-wrap gap-2 mt-3">
                        {specs.map((spec: any) => {
                          const isSpecSelected = (selectedSubcategories[catId] || []).includes(spec.id);
                          return (
                            <Pressable
                              key={spec.id}
                              onPress={() => toggleSubcategory(catId, spec.id)}
                            >
                              <View
                                className="px-3 py-2 rounded-lg"
                                style={{
                                  backgroundColor: isSpecSelected ? '#fa5610' : 'rgba(255, 255, 255, 0.08)',
                                }}
                              >
                                <Text
                                  className="text-xs font-medium"
                                  style={{ color: isSpecSelected ? '#ffffff' : '#ffffff' }}
                                >
                                  {spec.label}
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
          )}

          {/* Drone License Areas */}
          {selectedCategories.includes('drone_operator') && (
            <View
              className="rounded-2xl p-5 mb-6"
              style={{ backgroundColor: 'rgba(255, 255, 255, 0.05)' }}
            >
              <Text className="text-white text-base font-semibold mb-1">Drone License Areas (UAE)</Text>
              <Text className="text-neutral-400 text-sm mb-4">
                Select the emirates where you're licensed
              </Text>

              <View className="flex-row flex-wrap gap-2">
                {UAE_EMIRATES.map((emirate) => {
                  const isSelected = droneAreas.includes(emirate.id);
                  return (
                    <Pressable
                      key={emirate.id}
                      onPress={() => {
                        setDroneAreas((prev) =>
                          prev.includes(emirate.id)
                            ? prev.filter((a) => a !== emirate.id)
                            : [...prev, emirate.id]
                        );
                      }}
                    >
                      <View
                        className="px-3 py-2 rounded-lg"
                        style={{
                          backgroundColor: isSelected ? '#fa5610' : 'rgba(255, 255, 255, 0.08)',
                        }}
                      >
                        <Text
                          className="text-xs font-medium"
                          style={{ color: isSelected ? '#ffffff' : '#ffffff' }}
                        >
                          {emirate.label}
                        </Text>
                      </View>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          )}

          {/* Model Specifications */}
          {selectedCategories.includes('model') && (
            <View
              className="rounded-2xl p-5 mb-6"
              style={{ backgroundColor: 'rgba(255, 255, 255, 0.05)' }}
            >
              <Text className="text-white text-base font-semibold mb-1">Model Specifications</Text>
              <Text className="text-neutral-400 text-sm mb-4">
                Physical measurements for modeling work
              </Text>

              {/* Height Slider */}
              <View className="mb-6">
                <Text className="text-white text-sm font-medium mb-3">
                  Height: {heightCm} cm
                </Text>
                <Slider
                  style={{ height: 40 }}
                  minimumValue={HEIGHT_RANGE.min}
                  maximumValue={HEIGHT_RANGE.max}
                  value={heightCm}
                  onValueChange={setHeightCm}
                  step={1}
                  minimumTrackTintColor="#fa5610"
                  maximumTrackTintColor="rgba(255, 255, 255, 0.2)"
                  thumbTintColor="#fa5610"
                />
              </View>

              {/* Weight Slider */}
              <View className="mb-6">
                <Text className="text-white text-sm font-medium mb-3">
                  Weight: {weightCm} kg
                </Text>
                <Slider
                  style={{ height: 40 }}
                  minimumValue={WEIGHT_RANGE.min}
                  maximumValue={WEIGHT_RANGE.max}
                  value={weightCm}
                  onValueChange={setWeightCm}
                  step={1}
                  minimumTrackTintColor="#fa5610"
                  maximumTrackTintColor="rgba(255, 255, 255, 0.2)"
                  thumbTintColor="#fa5610"
                />
              </View>

              {/* Build */}
              <View className="mb-6">
                <Text className="text-white text-sm font-medium mb-3">Build</Text>
                <View className="flex-row flex-wrap gap-2">
                  {BUILD_OPTIONS.map((opt) => {
                    const isSelected = build === opt.id;
                    return (
                      <Pressable
                        key={opt.id}
                        onPress={() => setBuild(build === opt.id ? '' : opt.id)}
                      >
                        <View
                          className="px-3 py-2 rounded-lg"
                          style={{
                            backgroundColor: isSelected ? '#fa5610' : 'rgba(255, 255, 255, 0.08)',
                          }}
                        >
                          <Text
                            className="text-xs font-medium"
                            style={{ color: isSelected ? '#ffffff' : '#ffffff' }}
                          >
                            {opt.label}
                          </Text>
                        </View>
                      </Pressable>
                    );
                  })}
                </View>
              </View>

              {/* Ethnicity */}
              <View className="mb-6">
                <Text className="text-white text-sm font-medium mb-2">Ethnicity</Text>
                <Text className="text-neutral-400 text-xs mb-3">
                  Helps clients find models for diverse casting
                </Text>
                <View className="flex-row flex-wrap gap-2">
                  {ETHNICITY_OPTIONS.map((opt) => {
                    const isSelected = ethnicity === opt.id;
                    return (
                      <Pressable
                        key={opt.id}
                        onPress={() => setEthnicity(ethnicity === opt.id ? '' : opt.id)}
                      >
                        <View
                          className="px-3 py-2 rounded-lg"
                          style={{
                            backgroundColor: isSelected ? '#fa5610' : 'rgba(255, 255, 255, 0.08)',
                          }}
                        >
                          <Text
                            className="text-xs font-medium"
                            style={{ color: isSelected ? '#ffffff' : '#ffffff' }}
                          >
                            {opt.label}
                          </Text>
                        </View>
                      </Pressable>
                    );
                  })}
                </View>
              </View>

              {/* Shoe Size */}
              <View className="mb-6">
                <Text className="text-white text-sm font-medium mb-3">Shoe Size (EU)</Text>
                <View className="flex-row flex-wrap gap-2">
                  {SHOE_SIZES_EU.map((size) => {
                    const isSelected = shoeSize === size;
                    return (
                      <Pressable
                        key={size}
                        onPress={() => setShoeSize(shoeSize === size ? '' : size)}
                      >
                        <View
                          className="w-10 h-10 items-center justify-center rounded-lg"
                          style={{
                            backgroundColor: isSelected ? '#fa5610' : 'rgba(255, 255, 255, 0.08)',
                          }}
                        >
                          <Text
                            className="text-xs font-medium"
                            style={{ color: isSelected ? '#ffffff' : '#ffffff' }}
                          >
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
                <Text className="text-white text-sm font-medium mb-2">Nationality</Text>
                <TextInput
                  className="px-3 py-3 rounded-lg text-white text-sm"
                  style={{
                    backgroundColor: 'rgba(255, 255, 255, 0.08)',
                    borderWidth: 1,
                    borderColor: 'rgba(255, 255, 255, 0.1)',
                  }}
                  placeholder="Search nationality..."
                  placeholderTextColor="#6B7280"
                  value={nationality}
                  onChangeText={setNationality}
                />
              </View>

              {/* Measurements */}
              <View>
                <Text className="text-white text-sm font-medium mb-3">
                  Measurements (Optional)
                </Text>
                <View className="flex-row gap-2">
                  <TextInput
                    className="flex-1 px-3 py-3 rounded-lg text-white text-sm"
                    style={{
                      backgroundColor: 'rgba(255, 255, 255, 0.08)',
                      borderWidth: 1,
                      borderColor: 'rgba(255, 255, 255, 0.1)',
                    }}
                    placeholder="Bust"
                    placeholderTextColor="#6B7280"
                    keyboardType="numeric"
                    value={measurements.bust}
                    onChangeText={(text) =>
                      setMeasurements((prev) => ({ ...prev, bust: text }))
                    }
                  />
                  <TextInput
                    className="flex-1 px-3 py-3 rounded-lg text-white text-sm"
                    style={{
                      backgroundColor: 'rgba(255, 255, 255, 0.08)',
                      borderWidth: 1,
                      borderColor: 'rgba(255, 255, 255, 0.1)',
                    }}
                    placeholder="Waist"
                    placeholderTextColor="#6B7280"
                    keyboardType="numeric"
                    value={measurements.waist}
                    onChangeText={(text) =>
                      setMeasurements((prev) => ({ ...prev, waist: text }))
                    }
                  />
                  <TextInput
                    className="flex-1 px-3 py-3 rounded-lg text-white text-sm"
                    style={{
                      backgroundColor: 'rgba(255, 255, 255, 0.08)',
                      borderWidth: 1,
                      borderColor: 'rgba(255, 255, 255, 0.1)',
                    }}
                    placeholder="Hips"
                    placeholderTextColor="#6B7280"
                    keyboardType="numeric"
                    value={measurements.hips}
                    onChangeText={(text) =>
                      setMeasurements((prev) => ({ ...prev, hips: text }))
                    }
                  />
                </View>
              </View>
            </View>
          )}

          {/* Influencer Details */}
          {selectedCategories.includes('influencer') && (
            <View
              className="rounded-2xl p-5 mb-6"
              style={{ backgroundColor: 'rgba(255, 255, 255, 0.05)' }}
            >
              <Text className="text-white text-base font-semibold mb-1">Influencer Details</Text>
              <Text className="text-neutral-400 text-sm mb-4">
                Add your social media accounts and content focus
              </Text>

              {/* Social Media Accounts */}
              <View className="mb-6">
                <Text className="text-white text-sm font-medium mb-2">Social Media Accounts</Text>
                <Text className="text-neutral-400 text-xs mb-3">
                  Add at least one account for verification
                </Text>

                {SOCIAL_PLATFORMS.map((platform) => (
                  <View key={platform.value} className="mb-3">
                    <TextInput
                      className="px-3 py-3 rounded-lg text-white text-sm"
                      style={{
                        backgroundColor: 'rgba(255, 255, 255, 0.08)',
                        borderWidth: 1,
                        borderColor: 'rgba(255, 255, 255, 0.1)',
                      }}
                      placeholder={`Your ${platform.label} handle or URL`}
                      placeholderTextColor="#6B7280"
                      value={socialLinks[platform.value] || ''}
                      onChangeText={(text) =>
                        setSocialLinks((prev) => ({ ...prev, [platform.value]: text }))
                      }
                    />
                  </View>
                ))}
              </View>

              {/* Content Focus */}
              <View className="mb-6">
                <Text className="text-white text-sm font-medium mb-2">Content Focus</Text>
                <Text className="text-neutral-400 text-xs mb-3">
                  Select the categories that describe your content
                </Text>
                <View className="flex-row flex-wrap gap-2">
                  {INFLUENCER_NICHES.map((niche) => {
                    const isSelected = selectedNiches.includes(niche.value);
                    return (
                      <Pressable
                        key={niche.value}
                        onPress={() =>
                          setSelectedNiches((prev) =>
                            prev.includes(niche.value)
                              ? prev.filter((n) => n !== niche.value)
                              : [...prev, niche.value]
                          )
                        }
                      >
                        <View
                          className="px-3 py-2 rounded-lg"
                          style={{
                            backgroundColor: isSelected ? '#fa5610' : 'rgba(255, 255, 255, 0.08)',
                          }}
                        >
                          <Text
                            className="text-xs font-medium"
                            style={{ color: isSelected ? '#ffffff' : '#ffffff' }}
                          >
                            {niche.label}
                          </Text>
                        </View>
                      </Pressable>
                    );
                  })}
                </View>
              </View>

              {/* Audience Demographics */}
              <View className="mb-6">
                <Text className="text-white text-sm font-medium mb-3">Audience Demographics</Text>
                <View className="flex-row flex-wrap gap-2">
                  {AUDIENCE_TYPES.map((audience) => {
                    const isSelected = selectedAudiences.includes(audience.value);
                    return (
                      <Pressable
                        key={audience.value}
                        onPress={() =>
                          setSelectedAudiences((prev) =>
                            prev.includes(audience.value)
                              ? prev.filter((a) => a !== audience.value)
                              : [...prev, audience.value]
                          )
                        }
                      >
                        <View
                          className="px-3 py-2 rounded-lg"
                          style={{
                            backgroundColor: isSelected ? '#fa5610' : 'rgba(255, 255, 255, 0.08)',
                          }}
                        >
                          <Text
                            className="text-xs font-medium"
                            style={{ color: isSelected ? '#ffffff' : '#ffffff' }}
                          >
                            {audience.label}
                          </Text>
                        </View>
                      </Pressable>
                    );
                  })}
                </View>
              </View>

              {/* Verification Info */}
              <View
                className="flex-row gap-3 p-3 rounded-lg mb-6"
                style={{ backgroundColor: 'rgba(0, 0, 0, 0.3)' }}
              >
                <Text className="text-neutral-400 text-xs leading-5">
                  <Text className="font-semibold text-neutral-300">Verification: </Text>
                  Your social accounts will be reviewed. Once verified, you'll receive a "Verified Influencer" badge.
                </Text>
              </View>

              {/* Advertiser Permit (Dubai only) */}
              {isDubbingLocation ? (
                <View>
                  <View className="flex-row items-center gap-2 mb-2">
                    <Text className="text-white text-sm font-medium">Advertiser Permit Number</Text>
                    <Text className="text-neutral-400 text-xs">(Optional)</Text>
                  </View>
                  <Text className="text-neutral-400 text-xs mb-3">
                    Influencers in Dubai are required to have an Advertiser Permit from the UAE Media Council.
                  </Text>
                  <TextInput
                    className="px-3 py-3 rounded-lg text-white text-sm"
                    style={{
                      backgroundColor: 'rgba(255, 255, 255, 0.08)',
                      borderWidth: 1,
                      borderColor: 'rgba(255, 255, 255, 0.1)',
                    }}
                    placeholder="Enter your Advertiser Permit number"
                    placeholderTextColor="#6B7280"
                    value={advertiserPermitNumber}
                    onChangeText={setAdvertiserPermitNumber}
                  />
                </View>
              ) : null}
            </View>
          )}
        </Animated.View>
      </ScrollView>

      {/* Save Button */}
      <View
        className="px-5"
        style={{
          paddingBottom: insets.bottom + 16,
          borderTopColor: 'rgba(255, 255, 255, 0.05)',
          borderTopWidth: 1,
        }}
      >
        <Pressable
          onPress={handleSave}
          disabled={isSaving || selectedCategories.length === 0}
        >
          <View
            className="h-14 flex-row items-center justify-center rounded-xl"
            style={{
              backgroundColor:
                isSaving || selectedCategories.length === 0
                  ? 'rgba(250, 86, 16, 0.3)'
                  : '#fa5610',
            }}
          >
            {isSaving ? (
              <ActivityIndicator size="small" color="#ffffff" />
            ) : (
              <Text className="text-white text-base font-semibold">
                Save Changes
              </Text>
            )}
          </View>
        </Pressable>
      </View>
    </View>
  );
}
