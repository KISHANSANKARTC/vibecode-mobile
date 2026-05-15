import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Pressable,
  Modal,
  SafeAreaView,
  ScrollView,
  Switch,
} from 'react-native';
import {
  X,
  MapPin,
  Sparkles,
  Star,
  DollarSign,
  User,
  Check,
  RotateCcw,
} from 'lucide-react-native';
import { ChipPicker } from '@/components/search/ChipPicker';
import { RangeSlider } from '@/components/ui/RangeSlider';
import {
  NATIONALITIES,
  COUNTRIES,
} from '@/data/locations';
import {
  BUILD_OPTIONS,
  ETHNICITY_OPTIONS,
  SHOE_SIZES_EU,
  HEIGHT_RANGE,
  WEIGHT_RANGE,
} from '@/data/modelOptions';
import {
  INFLUENCER_NICHES,
  AUDIENCE_TYPES,
} from '@/data/influencerOptions';
import { specialtiesByCategory, TalentCategory } from '@/data/specialties';

interface MobileFilterSheetProps {
  visible: boolean;
  onClose: () => void;
  onApply: (filters: TalentSearchFilters) => void;
  selectedCategory?: string | null;
  currentFilters?: Partial<TalentSearchFilters>;
}

export interface TalentSearchFilters {
  query: string;
  category: string | null;
  country: string | null;
  nationality: string | null;
  minRating: number | null;
  minPrice: number | null;
  maxPrice: number | null;
  isVerified: boolean;
  isPremium: boolean;
  gender: string | null;
  ethnicity: string | null;
  build: string | null;
  heightMin: number | null;
  heightMax: number | null;
  weight: number | null;
  weightMax: number | null;
  shoeSize: string | null;
  followerCountMin: number | null;
  followerCountMax: number | null;
  niches: string[];
  audiences: string[];
  specialties: string[];
  availabilityFilter: 'instant' | 'today' | 'tomorrow' | 'custom' | null;
  sort: string;
  nearMeDistance: number | null;
}

export function MobileFilterSheet({
  visible,
  onClose,
  onApply,
  selectedCategory,
  currentFilters = {},
}: MobileFilterSheetProps) {
  const [filters, setFilters] = useState<Partial<TalentSearchFilters>>({
    minRating: null,
    minPrice: 0,
    maxPrice: 2000,
    isVerified: false,
    isPremium: false,
    gender: null,
    ethnicity: null,
    build: null,
    heightMin: HEIGHT_RANGE.defaultMin,
    heightMax: HEIGHT_RANGE.defaultMax,
    weight: null,
    shoeSize: null,
    followerCountMin: 0,
    followerCountMax: 1000000,
    niches: [],
    audiences: [],
    specialties: [],
    country: null,
    nationality: null,
    nearMeDistance: null,
    ...currentFilters,
  });

  const [keyboardOffset, setKeyboardOffset] = useState(0);

  useEffect(() => {
    const handleResize = () => {
      const viewport = (global as any).visualViewport;
      if (viewport) {
        const heightDiff = window.innerHeight - viewport.height;
        setKeyboardOffset(heightDiff > 150 ? 150 : 0);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleReset = () => {
    setFilters({
      minRating: null,
      minPrice: 0,
      maxPrice: 2000,
      isVerified: false,
      isPremium: false,
      gender: null,
      ethnicity: null,
      build: null,
      heightMin: HEIGHT_RANGE.defaultMin,
      heightMax: HEIGHT_RANGE.defaultMax,
      weight: null,
      shoeSize: null,
      followerCountMin: 0,
      followerCountMax: 1000000,
      niches: [],
      audiences: [],
      specialties: [],
      country: null,
      nationality: null,
      nearMeDistance: null,
    });
  };

  const handleApply = () => {
    onApply(filters as TalentSearchFilters);
    onClose();
  };

  const countryOptions = COUNTRIES.map((c) => ({
    id: c.id,
    label: c.label,
  }));

  const nationalityOptions = NATIONALITIES.map((n) => ({
    id: n.id,
    label: n.label,
  }));

  const ethnicityOptions = ETHNICITY_OPTIONS;

  const buildOptions = BUILD_OPTIONS;

  const nicheOptions = INFLUENCER_NICHES.map((n) => ({
    id: n.value,
    label: n.label,
  }));

  const audienceOptions = AUDIENCE_TYPES.map((a) => ({
    id: a.value,
    label: a.label,
  }));

  const specialtyOptions = selectedCategory
    ? specialtiesByCategory[selectedCategory as TalentCategory] || []
    : [];

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <SafeAreaView className="flex-1 bg-black/40">
        <View
          className="h-[85vh] bg-white rounded-t-3xl mt-auto flex flex-col"
          style={{ marginBottom: keyboardOffset }}
        >
          {/* Header - Min 56px height with centered content */}
          <View className="px-4 py-3 border-b border-gray-200 flex-row items-center justify-between min-h-[56px]">
            <Text className="text-lg font-semibold text-gray-900">
              Filters
            </Text>
            <Pressable
              onPress={onClose}
              className="p-2 rounded-lg active:bg-gray-100"
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <X size={24} color="#6B7280" strokeWidth={2} />
            </Pressable>
          </View>

          {/* Scrollable Filters */}
          <ScrollView className="flex-1 px-4 py-5">
            {/* Location Section */}
            <View className="mb-5">
              <View className="flex-row items-start gap-3 mb-3 min-h-[32px]">
                <View className="pt-1">
                  <MapPin size={20} color="#6B7280" strokeWidth={2} />
                </View>
                <View className="flex-1">
                  <Text className="text-sm font-semibold text-gray-700">
                    Location
                  </Text>
                  <Text className="text-xs text-gray-500 mt-0.5">
                    Find talent near you
                  </Text>
                </View>
              </View>

              <ChipPicker
                title="Select Country"
                options={countryOptions}
                value={filters.country || null}
                onChange={(val: string | string[] | null) =>
                  setFilters((prev) => ({
                    ...prev,
                    country: val as string | null,
                  }))
                }
                popularOptions={['uae', 'saudi', 'qatar', 'kuwait', 'egypt', 'uk']}
                multiple={false}
              />
            </View>

            {/* Quick Filters Section */}
            <View className="mb-5">
              <View className="flex-row items-start gap-3 mb-3 min-h-[32px]">
                <View className="pt-1">
                  <Sparkles size={20} color="#6B7280" strokeWidth={2} />
                </View>
                <Text className="text-sm font-semibold text-gray-700">
                  Quick Filters
                </Text>
              </View>

              <View className="gap-3">
                {/* Verified Only */}
                <View className="flex-row items-center justify-between py-3 min-h-[50px]">
                  <View className="flex-1">
                    <Text className="text-sm font-medium text-gray-900">Verified Only</Text>
                    <Text className="text-xs text-gray-500 mt-0.5">Show verified talents</Text>
                  </View>
                  <View className="ml-3">
                    <Switch
                      value={filters.isVerified || false}
                      onValueChange={(val: boolean) =>
                        setFilters((prev) => ({ ...prev, isVerified: val }))
                      }
                    />
                  </View>
                </View>

                {/* Premium Only */}
                <View className="flex-row items-center justify-between py-3 min-h-[50px]">
                  <View className="flex-1">
                    <Text className="text-sm font-medium text-gray-900">Premium Only</Text>
                    <Text className="text-xs text-gray-500 mt-0.5">Show premium talents</Text>
                  </View>
                  <View className="ml-3">
                    <Switch
                      value={filters.isPremium || false}
                      onValueChange={(val: boolean) =>
                        setFilters((prev) => ({ ...prev, isPremium: val }))
                      }
                    />
                  </View>
                </View>

                {/* Minimum Rating */}
                <View className="mb-2">
                  <Text className="text-sm text-gray-700 mb-3">
                    Minimum Rating
                  </Text>
                  <View className="flex-row gap-2">
                    {['Any', '3+', '4+', '4.5+'].map((label, idx) => (
                      <Pressable
                        key={label}
                        onPress={() =>
                          setFilters((prev) => ({
                            ...prev,
                            minRating: idx === 0 ? null : parseFloat(label),
                          }))
                        }
                        className={`flex-1 min-h-[44px] rounded-lg border items-center justify-center ${
                          (idx === 0 && !filters.minRating) ||
                          filters.minRating === parseFloat(label)
                            ? 'bg-orange-500 border-orange-500'
                            : 'bg-white border-gray-200'
                        }`}
                      >
                        <Text
                          className={`text-xs font-semibold ${
                            (idx === 0 && !filters.minRating) ||
                            filters.minRating === parseFloat(label)
                              ? 'text-white'
                              : 'text-gray-900'
                          }`}
                        >
                          {label}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                </View>

                {/* Gender */}
                <View className="mb-2">
                  <Text className="text-sm text-gray-700 mb-3">Gender</Text>
                  <View className="flex-row gap-2">
                    {['Any', 'Male', 'Female'].map((label) => (
                      <Pressable
                        key={label}
                        onPress={() =>
                          setFilters((prev) => ({
                            ...prev,
                            gender:
                              label === 'Any'
                                ? null
                                : label.toLowerCase(),
                          }))
                        }
                        className={`flex-1 min-h-[44px] rounded-lg border items-center justify-center ${
                          (label === 'Any' && !filters.gender) ||
                          filters.gender === label.toLowerCase()
                            ? 'bg-orange-500 border-orange-500'
                            : 'bg-white border-gray-200'
                        }`}
                      >
                        <Text
                          className={`text-xs font-semibold ${
                            (label === 'Any' && !filters.gender) ||
                            filters.gender === label.toLowerCase()
                              ? 'text-white'
                              : 'text-gray-900'
                          }`}
                        >
                          {label}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                </View>

                {/* Nationality */}
                <ChipPicker
                  title="Nationality"
                  options={nationalityOptions}
                  value={filters.nationality || null}
                  onChange={(val: string | string[] | null) =>
                    setFilters((prev) => ({
                      ...prev,
                      nationality: val as string | null,
                    }))
                  }
                  popularOptions={[
                    'emirati',
                    'saudi',
                    'egyptian',
                    'british',
                    'lebanese',
                    'moroccan',
                  ]}
                  multiple={false}
                />
              </View>
            </View>

            {/* Price Range Section */}
            <View className="mb-5">
              <View className="flex-row items-start gap-3 mb-3 min-h-[32px]">
                <View className="pt-1">
                  <DollarSign size={20} color="#6B7280" strokeWidth={2} />
                </View>
                <Text className="text-sm font-semibold text-gray-700">
                  Price Range
                </Text>
              </View>

              <View className="gap-4">
                <View>
                  <Text className="text-xs text-gray-600 mb-2">
                    Min: AED {filters.minPrice || 0}
                  </Text>
                  <RangeSlider
                    min={0}
                    max={2000}
                    value={filters.minPrice || 0}
                    step={50}
                    onChange={(val: number) =>
                      setFilters((prev) => ({
                        ...prev,
                        minPrice: val,
                      }))
                    }
                  />
                </View>

                <View>
                  <Text className="text-xs text-gray-600 mb-2">
                    Max: AED {filters.maxPrice || 2000}+
                  </Text>
                  <RangeSlider
                    min={0}
                    max={2000}
                    value={filters.maxPrice || 2000}
                    step={50}
                    onChange={(val: number) =>
                      setFilters((prev) => ({
                        ...prev,
                        maxPrice: val,
                      }))
                    }
                  />
                </View>
              </View>
            </View>

            {/* Model Attributes Section (shown when category is 'model') */}
            {selectedCategory === 'model' ? (
              <View className="mb-5">
                <View className="flex-row items-start gap-3 mb-3 min-h-[32px]">
                  <View className="pt-1">
                    <User size={20} color="#6B7280" strokeWidth={2} />
                  </View>
                  <Text className="text-sm font-semibold text-gray-700">
                    Model Attributes
                  </Text>
                </View>

                <View className="gap-4">
                  {/* Ethnicity */}
                  <ChipPicker
                    title="Ethnicity"
                    options={ethnicityOptions}
                    value={filters.ethnicity || null}
                    onChange={(val: string | string[] | null) =>
                      setFilters((prev) => ({
                        ...prev,
                        ethnicity: val as string | null,
                      }))
                    }
                    popularOptions={[
                      'arab',
                      'caucasian',
                      'asian',
                      'middle_eastern',
                    ]}
                    multiple={false}
                  />

                  {/* Height Range */}
                  <View>
                    <Text className="text-sm text-gray-700 mb-3">
                      Height: {filters.heightMin || HEIGHT_RANGE.defaultMin} - {filters.heightMax || HEIGHT_RANGE.defaultMax} cm
                    </Text>
                    <View className="gap-4">
                      <View>
                        <Text className="text-xs text-gray-600 mb-2">Min</Text>
                        <RangeSlider
                          min={HEIGHT_RANGE.min}
                          max={HEIGHT_RANGE.max}
                          value={filters.heightMin || HEIGHT_RANGE.defaultMin}
                          step={1}
                          onChange={(val: number) =>
                            setFilters((prev) => ({
                              ...prev,
                              heightMin: val,
                            }))
                          }
                        />
                      </View>
                      <View>
                        <Text className="text-xs text-gray-600 mb-2">Max</Text>
                        <RangeSlider
                          min={HEIGHT_RANGE.min}
                          max={HEIGHT_RANGE.max}
                          value={filters.heightMax || HEIGHT_RANGE.defaultMax}
                          step={1}
                          onChange={(val: number) =>
                            setFilters((prev) => ({
                              ...prev,
                              heightMax: val,
                            }))
                          }
                        />
                      </View>
                    </View>
                  </View>

                  {/* Build */}
                  <View>
                    <Text className="text-sm text-gray-700 mb-3">Build</Text>
                    <View className="flex-row flex-wrap gap-2">
                      {['Any', ...buildOptions.map((b) => b.label)].map(
                        (label) => (
                          <Pressable
                            key={label}
                            onPress={() =>
                              setFilters((prev) => ({
                                ...prev,
                                build:
                                  label === 'Any'
                                    ? null
                                    : label.toLowerCase().replace(/ /g, '_'),
                              }))
                            }
                            className={`min-h-[44px] px-4 py-2.5 rounded-lg border items-center justify-center ${
                              (label === 'Any' && !filters.build) ||
                              filters.build ===
                                label.toLowerCase().replace(/ /g, '_')
                                ? 'bg-orange-500 border-orange-500'
                                : 'bg-white border-gray-200'
                            }`}
                          >
                            <Text
                              className={`text-xs font-medium ${
                                (label === 'Any' && !filters.build) ||
                                filters.build ===
                                  label.toLowerCase().replace(/ /g, '_')
                                  ? 'text-white'
                                  : 'text-gray-900'
                              }`}
                            >
                              {label}
                            </Text>
                          </Pressable>
                        )
                      )}
                    </View>
                  </View>

                  {/* Shoe Size */}
                  <ChipPicker
                    title="Shoe Size (EU)"
                    options={SHOE_SIZES_EU}
                    value={filters.shoeSize || null}
                    onChange={(val: string | string[] | null) =>
                      setFilters((prev) => ({
                        ...prev,
                        shoeSize: val as string | null,
                      }))
                    }
                    popularOptions={['39', '40', '41', '42', '43']}
                    multiple={false}
                  />
                </View>
              </View>
            ) : null}

            {/* Influencer Filters Section (shown when category is 'influencer') */}
            {selectedCategory === 'influencer' ? (
              <View className="mb-5">
                <View className="flex-row items-start gap-3 mb-3 min-h-[32px]">
                  <View className="pt-1">
                    <User size={20} color="#6B7280" strokeWidth={2} />
                  </View>
                  <Text className="text-sm font-semibold text-gray-700">
                    Influencer Info
                  </Text>
                </View>

                <View className="gap-4">
                  {/* Followers Range */}
                  <View>
                    <Text className="text-sm text-gray-700 mb-3">
                      Followers: {Math.floor((filters.followerCountMin || 0) / 1000)}K -{' '}
                      {Math.floor((filters.followerCountMax || 1000000) / 1000)}K
                    </Text>
                    <View className="gap-4">
                      <View>
                        <Text className="text-xs text-gray-600 mb-2">Min</Text>
                        <RangeSlider
                          min={0}
                          max={1000000}
                          value={filters.followerCountMin || 0}
                          step={10000}
                          onChange={(val: number) =>
                            setFilters((prev) => ({
                              ...prev,
                              followerCountMin: val,
                            }))
                          }
                        />
                      </View>
                      <View>
                        <Text className="text-xs text-gray-600 mb-2">Max</Text>
                        <RangeSlider
                          min={0}
                          max={1000000}
                          value={filters.followerCountMax || 1000000}
                          step={10000}
                          onChange={(val: number) =>
                            setFilters((prev) => ({
                              ...prev,
                              followerCountMax: val,
                            }))
                          }
                        />
                      </View>
                    </View>
                  </View>

                  {/* Niches */}
                  <View>
                    <Text className="text-sm text-gray-700 mb-3">Niches</Text>
                    <View className="flex-row flex-wrap gap-2">
                      {nicheOptions.slice(0, 6).map((niche) => (
                        <Pressable
                          key={niche.id}
                          onPress={() =>
                            setFilters((prev) => ({
                              ...prev,
                              niches: prev.niches?.includes(niche.id)
                                ? prev.niches?.filter(
                                    (n) => n !== niche.id
                                  )
                                : [...(prev.niches || []), niche.id],
                            }))
                          }
                          className={`min-h-[44px] px-4 py-2.5 rounded-lg border items-center justify-center ${
                            filters.niches?.includes(niche.id)
                              ? 'bg-pink-500 border-pink-500'
                              : 'bg-white border-gray-200'
                          }`}
                        >
                          <Text
                            className={`text-xs font-medium ${
                              filters.niches?.includes(niche.id)
                                ? 'text-white'
                                : 'text-gray-900'
                            }`}
                          >
                            {niche.label}
                          </Text>
                        </Pressable>
                      ))}
                    </View>
                  </View>

                  {/* Audiences */}
                  <View>
                    <Text className="text-sm text-gray-700 mb-3">
                      Target Audiences
                    </Text>
                    <View className="flex-row flex-wrap gap-2">
                      {audienceOptions.map((audience) => (
                        <Pressable
                          key={audience.id}
                          onPress={() =>
                            setFilters((prev) => ({
                              ...prev,
                              audiences: prev.audiences?.includes(audience.id)
                                ? prev.audiences?.filter(
                                    (a) => a !== audience.id
                                  )
                                : [...(prev.audiences || []), audience.id],
                            }))
                          }
                          className={`min-h-[44px] px-4 py-2.5 rounded-lg border items-center justify-center ${
                            filters.audiences?.includes(audience.id)
                              ? 'bg-pink-500 border-pink-500'
                              : 'bg-white border-gray-200'
                          }`}
                        >
                          <Text
                            className={`text-xs font-medium ${
                              filters.audiences?.includes(audience.id)
                                ? 'text-white'
                                : 'text-gray-900'
                            }`}
                          >
                            {audience.label}
                          </Text>
                        </Pressable>
                      ))}
                    </View>
                  </View>
                </View>
              </View>
            ) : null}

            {/* Specialty Section (shown when category selected) */}
            {selectedCategory && specialtyOptions.length > 0 ? (
              <View className="mb-5">
                <View className="flex-row items-start gap-3 mb-3 min-h-[32px]">
                  <View className="pt-1">
                    <Sparkles size={20} color="#6B7280" strokeWidth={2} />
                  </View>
                  <Text className="text-sm font-semibold text-gray-700">
                    Specialty
                  </Text>
                </View>

                <View className="flex-row flex-wrap gap-2">
                  {specialtyOptions.map((spec) => (
                    <Pressable
                      key={spec.id}
                      onPress={() =>
                        setFilters((prev) => ({
                          ...prev,
                          specialties: prev.specialties?.includes(spec.id)
                            ? prev.specialties?.filter((s) => s !== spec.id)
                            : [...(prev.specialties || []), spec.id],
                        }))
                      }
                      className={`min-h-[44px] px-4 py-2.5 rounded-lg border items-center justify-center ${
                        filters.specialties?.includes(spec.id)
                          ? 'bg-violet-500 border-violet-500'
                          : 'bg-white border-gray-200'
                      }`}
                    >
                      <Text
                        className={`text-xs font-medium ${
                          filters.specialties?.includes(spec.id)
                            ? 'text-white'
                            : 'text-gray-900'
                        }`}
                      >
                        {spec.label}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </View>
            ) : null}

            {/* Spacer for bottom button visibility */}
            <View className="h-6" />
          </ScrollView>

          {/* Sticky Footer */}
          <View className="px-4 py-3 border-t border-gray-200 flex-row gap-3 bg-white">
            <Pressable
              onPress={handleReset}
              className="flex-1 min-h-[48px] rounded-lg bg-gray-100 border border-gray-300 flex-row items-center justify-center gap-2"
            >
              <RotateCcw size={18} color="#6B7280" strokeWidth={2} />
              <Text className="text-gray-700 font-semibold text-sm">
                Reset
              </Text>
            </Pressable>
            <Pressable
              onPress={handleApply}
              className="flex-1 min-h-[48px] rounded-lg bg-violet-600 flex-row items-center justify-center gap-2"
            >
              <Check size={18} color="#FFF" strokeWidth={2} />
              <Text className="text-white font-semibold text-sm">
                Show Results
              </Text>
            </Pressable>
          </View>
        </View>
      </SafeAreaView>
    </Modal>
  );
}
