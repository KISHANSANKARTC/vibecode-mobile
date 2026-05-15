import { useState, useEffect } from 'react';
import {
  View,
  Text,
  Pressable,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
  TextInput,
  Image,
  FlatList,
  Dimensions,
} from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useRouter } from '@/lib/router-helper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import {
  ChevronLeft,
  ChevronRight,
  Check,
  LogOut,
  Upload,
  X,
  CheckCircle2,
} from 'lucide-react-native';
import Animated, { FadeInDown, FadeOutUp } from 'react-native-reanimated';
import { useAuthStore } from '@/lib/state/auth-store';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { uploadFile } from '@/lib/upload';
import { supabase } from '@/lib/supabase';
import { extractErrorMessage } from '@/lib/errorUtils';

// ─────── Error Normalization Helper ───────
function getErrorMessage(err: any): string {
  return extractErrorMessage(err);
}

type Step = 'categories' | 'profile' | 'model-details' | 'social-media' | 'pricing' | 'portfolio' | 'success' | 'verification';

interface CategoryData {
  name: string;
  description: string;
  icon: string;
  image?: any; // Local require() image
}

const CATEGORIES: CategoryData[] = [
  { name: 'Photographer', description: 'Photos & videos', icon: '📷', image: require('@/../assets/images/category-photographer.png') },
  { name: 'Model', description: 'Modeling services', icon: '👤', image: require('@/../assets/images/category-model.png') },
  { name: 'Influencer/UGC Creator', description: 'Social content', icon: '✨', image: require('@/../assets/images/category-influencer.png') },
  { name: 'Drone Operator', description: 'Drone footage', icon: '🛸', image: require('@/../assets/images/category-drone-operator.png') },
  { name: 'Editor', description: 'Video/photo editing', icon: '✂️', image: require('@/../assets/images/category-editor.png') },
  { name: 'Graphic Designer', description: 'Design work', icon: '🎨', image: require('@/../assets/images/category-graphic-designer.png') },
  { name: 'Makeup Artist', description: 'Makeup services', icon: '💄', image: require('@/../assets/images/category-makeup-artist.png') },
  { name: 'Stylist', description: 'Fashion styling', icon: '👗', image: require('@/../assets/images/category-stylist.png') },
  { name: 'Hair Stylist', description: 'Hair services', icon: '💇', image: require('@/../assets/images/category-hair-stylist.png') },
  { name: 'Marketing Consultant', description: 'Marketing expertise', icon: '📊', image: require('@/../assets/images/category-marketing-consultant.png') },
  { name: 'Director', description: 'Project direction', icon: '🎬', image: require('@/../assets/images/category-director.png') },
  { name: 'Music Producer', description: 'Music production', icon: '🎵', image: require('@/../assets/images/category-music-producer.png') },
  { name: 'Other', description: 'Other services', icon: '📌', image: require('@/../assets/images/category-other.png') },
];

const BUILDS = ['Slim', 'Athletic', 'Average', 'Muscular', 'Plus Size'];
const SHOE_SIZES = Array.from({ length: 14 }, (_, i) => (i + 35).toString());
const COUNTRIES = ['UAE', 'Saudi Arabia', 'Egypt', 'Kuwait', 'Qatar', 'Bahrain', 'Oman', 'Other'];
const CITIES_BY_COUNTRY: Record<string, string[]> = {
  UAE: ['Dubai', 'Abu Dhabi', 'Sharjah', 'Ajman', 'Ras Al Khaimah'],
  'Saudi Arabia': ['Riyadh', 'Jeddah', 'Dammam'],
  Egypt: ['Cairo', 'Alexandria', 'Giza'],
  Kuwait: ['Kuwait City'],
  Qatar: ['Doha'],
  Bahrain: ['Manama'],
  Oman: ['Muscat'],
};

const COUNTRY_PHONE_CODES: Record<string, { code: string; flag: string }> = {
  UAE: { code: '+971', flag: '\u{1F1E6}\u{1F1EA}' },
  'Saudi Arabia': { code: '+966', flag: '\u{1F1F8}\u{1F1E6}' },
  Egypt: { code: '+20', flag: '\u{1F1EA}\u{1F1EC}' },
  Kuwait: { code: '+965', flag: '\u{1F1F0}\u{1F1FC}' },
  Qatar: { code: '+974', flag: '\u{1F1F6}\u{1F1E6}' },
  Bahrain: { code: '+973', flag: '\u{1F1E7}\u{1F1ED}' },
  Oman: { code: '+968', flag: '\u{1F1F4}\u{1F1F2}' },
  Other: { code: '+', flag: '\u{1F30D}' },
};

// ISO country code to internal country ID mapping
const ISO_TO_COUNTRY: Record<string, string> = {
  AE: 'UAE',
  SA: 'Saudi Arabia',
  EG: 'Egypt',
  KW: 'Kuwait',
  QA: 'Qatar',
  BH: 'Bahrain',
  OM: 'Oman',
};

// Default intervals based on category type
const getDefaultInterval = (category: string): string => {
  if (category === 'Model') return 'per session';
  if (category === 'Influencer/UGC Creator') return 'per project';
  return 'per hour';
};

const ETHNICITIES = [
  'Asian',
  'Middle Eastern',
  'Indian',
  'African',
  'European',
  'Hispanic',
  'Mixed',
  'Other',
];

const SOCIAL_NICHES = [
  'Fashion',
  'Beauty',
  'Lifestyle',
  'Technology',
  'Gaming',
  'Sports',
  'Fitness',
  'Travel',
  'Food',
  'Education',
  'Entertainment',
];

export default function TalentSetupScreen() {
  const params = useLocalSearchParams<{
    email?: string;
    phone?: string;
    countryCode?: string;
    gender?: string;
  }>();

  const router = useRouter();
  const insets = useSafeAreaInsets();
  const user = useAuthStore((s) => s.user);

  const [currentStep, setCurrentStep] = useState<Step>('categories');
  const [isLoading, setIsLoading] = useState(false);
  const [createdTalentId, setCreatedTalentId] = useState<string | null>(null);

  // Step 1: Categories
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);

  // Step 2: Profile
  const [displayName, setDisplayName] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [selectedCountry, setSelectedCountry] = useState('');
  const [selectedCity, setSelectedCity] = useState('');
  const [phone, setPhone] = useState(params?.phone || '');
  const [showCountryDropdown, setShowCountryDropdown] = useState(false);
  const [showCityDropdown, setShowCityDropdown] = useState(false);

  // Step 3: Model Details (conditional)
  const [height, setHeight] = useState('');
  const [weight, setWeight] = useState('');
  const [build, setBuild] = useState('');
  const [shoeSize, setShoeSize] = useState('');
  const [nationality, setNationality] = useState('');
  const [ethnicity, setEthnicity] = useState('');

  // Step 4: Social Media (conditional)
  const [instagram, setInstagram] = useState('');
  const [tiktok, setTiktok] = useState('');
  const [youtube, setYoutube] = useState('');
  const [twitter, setTwitter] = useState('');
  const [linkedin, setLinkedin] = useState('');
  const [snapchat, setSnapchat] = useState('');
  const [selectedNiches, setSelectedNiches] = useState<string[]>([]);

  // Step 5: Pricing
  const [rates, setRates] = useState<Record<string, { amount: string; interval: string }>>({});
  const [showIntervalDropdown, setShowIntervalDropdown] = useState<string | null>(null);

  // Step 6: Portfolio
  const [portfolioItems, setPortfolioItems] = useState<string[]>([]);
  const [isSavingPortfolio, setIsSavingPortfolio] = useState(false);

  // Step 8: Verification
  const [idDocument, setIdDocument] = useState('');
  const [selfiePhoto, setSelfiePhoto] = useState('');

  // Upload states
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [isUploadingPortfolio, setIsUploadingPortfolio] = useState(false);
  const [isUploadingId, setIsUploadingId] = useState(false);
  const [isUploadingSelfie, setIsUploadingSelfie] = useState(false);

  // Geolocation state
  const [isLoadingGeo, setIsLoadingGeo] = useState(false);
  const [hasManuallySelectedCountry, setHasManuallySelectedCountry] = useState(false);

  const hasModelCategory = selectedCategories.includes('Model');
  const hasInfluencerCategory = selectedCategories.includes('Influencer/UGC Creator');

  // Fetch IP geolocation on mount
  useEffect(() => {
    const fetchGeolocation = async () => {
      // Don't fetch if user has already selected a country
      if (selectedCountry || hasManuallySelectedCountry) return;

      setIsLoadingGeo(true);
      try {
        const { data, error } = await supabase.functions.invoke('ip-geolocation');

        if (error) {
          console.warn('[TALENT-SETUP] Geolocation error:', error);
          return;
        }

        if (data) {
          const countryCode = data.country_code || data.countryCode;
          const city = data.city;

          // Map ISO code to our internal country ID
          const mappedCountry = countryCode ? ISO_TO_COUNTRY[countryCode] : null;

          if (mappedCountry && !hasManuallySelectedCountry) {
            setSelectedCountry(mappedCountry);

            // Also auto-fill city if available and matches our cities
            if (city && CITIES_BY_COUNTRY[mappedCountry]?.includes(city)) {
              setSelectedCity(city);
            }
          }
        }
      } catch (err) {
        console.warn('[TALENT-SETUP] Failed to fetch geolocation:', err);
      } finally {
        setIsLoadingGeo(false);
      }
    };

    fetchGeolocation();
  }, []);

  useEffect(() => {
  }, []);

  const handleCategoryToggle = (category: string) => {
    if (selectedCategories.includes(category)) {
      setSelectedCategories(selectedCategories.filter(c => c !== category));
    } else {
      if (selectedCategories.length < 3) {
        setSelectedCategories([...selectedCategories, category]);
      } else {
        Alert.alert('Maximum 3 categories allowed');
      }
    }
  };

  // Upload handlers
  const handleAvatarUpload = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (result.canceled || !result.assets[0]) return;

      const asset = result.assets[0];
      setIsUploadingAvatar(true);

      const uploadedFile = await uploadFile(
        asset.uri,
        `avatar-${Date.now()}.jpg`,
        'image/jpeg'
      );

      setAvatarUrl(uploadedFile.url || uploadedFile.cdnUrl);
      Alert.alert('Success', 'Profile photo uploaded!');
    } catch (err) {
      console.error('[talent-setup] Avatar upload error:', extractErrorMessage(err));
      Alert.alert('Upload Failed', extractErrorMessage(err));
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  const handlePortfolioUpload = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.8,
      });

      if (result.canceled || !result.assets[0]) return;

      const asset = result.assets[0];
      setIsUploadingPortfolio(true);


      const uploadedFile = await uploadFile(
        asset.uri,
        `portfolio-${Date.now()}.jpg`,
        'image/jpeg'
      );

      setPortfolioItems([...portfolioItems, uploadedFile.url || uploadedFile.cdnUrl]);
      Alert.alert('Success', 'Portfolio item added!');
    } catch (err) {
      console.error('[talent-setup] Portfolio upload error:', extractErrorMessage(err));
      const errorMsg = extractErrorMessage(err);
      console.error('[talent-setup] Error details:', {
        message: errorMsg,
        type: typeof err,
        stack: 'N/A'
      });

      let userMessage = errorMsg;
      if (errorMsg.includes('Failed to fetch')) {
        userMessage = 'Network error. Please check your connection and try again.';
      } else if (errorMsg.includes('timeout')) {
        userMessage = 'Upload timed out. Please try again.';
      } else if (errorMsg.includes('Backend URL')) {
        userMessage = 'Server configuration error. Please try again later.';
      }

      Alert.alert('Upload Failed', userMessage);
    } finally {
      setIsUploadingPortfolio(false);
    }
  };

  const getMimeType = (filename: string): string => {
    const ext = filename.split('.').pop()?.toLowerCase() || '';
    const mimeTypes: { [key: string]: string } = {
      'jpg': 'image/jpeg',
      'jpeg': 'image/jpeg',
      'png': 'image/png',
      'webp': 'image/webp',
      'heic': 'image/heic',
      'heif': 'image/heif',
      'gif': 'image/gif',
      'pdf': 'application/pdf',
    };
    return mimeTypes[ext] || 'image/jpeg'; // Default to JPEG instead of octet-stream
  };

  const handleIdUpload = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.8,
      });

      if (result.canceled || !result.assets[0]) return;

      const asset = result.assets[0];
      setIsUploadingId(true);

      // Get auth user
      const { data: authData } = await supabase.auth.getUser();
      const authUserId = authData?.user?.id;
      if (!authUserId) throw new Error('Not authenticated');

      // Get file extension
      const filename = asset.fileName || 'id.jpg';
      const ext = filename.split('.').pop() || 'jpg';
      // Use asset.mimeType if available (actual MIME type from OS), otherwise guess from filename
      const mimeType = asset.mimeType || getMimeType(filename);
      const storagePath = `${authUserId}/id-${Date.now()}.${ext}`;


      // Read file - handle both web and native
      let bytes: Uint8Array;

      if (asset.uri.startsWith('file://') || asset.uri.startsWith('/')) {
        // Native platform - use FileSystem
        const base64 = await FileSystem.readAsStringAsync(asset.uri, { encoding: 'base64' });
        const binaryString = atob(base64);
        bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
      } else {
        // Web platform - fetch from blob URL
        const response = await fetch(asset.uri);
        const blob = await response.blob();
        bytes = new Uint8Array(await blob.arrayBuffer());
      }

      // Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('verifications')
        .upload(storagePath, bytes, {
          contentType: mimeType,
          upsert: false,
        });

      if (uploadError) throw uploadError instanceof Error ? uploadError : new Error((uploadError as any)?.message || 'Upload failed');

      // Generate signed URL for preview
      const { data: signedUrl } = await supabase.storage
        .from('verifications')
        .createSignedUrl(storagePath, 3600);

      // Store ONLY the storage path in state, not the full URL
      setIdDocument(storagePath);

      Alert.alert('Success', 'ID document uploaded!');
    } catch (err) {
      console.error('[talent-setup] ID upload error:', extractErrorMessage(err));
      Alert.alert('Upload Failed', extractErrorMessage(err));
    } finally {
      setIsUploadingId(false);
    }
  };

  const handleSelfieUpload = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.8,
      });

      if (result.canceled || !result.assets[0]) return;

      const asset = result.assets[0];
      setIsUploadingSelfie(true);

      // Get auth user
      const { data: authData } = await supabase.auth.getUser();
      const authUserId = authData?.user?.id;
      if (!authUserId) throw new Error('Not authenticated');

      // Get file extension
      const filename = asset.fileName || 'selfie.jpg';
      const ext = filename.split('.').pop() || 'jpg';
      // Use asset.mimeType if available (actual MIME type from OS), otherwise guess from filename
      const mimeType = asset.mimeType || getMimeType(filename);
      const storagePath = `${authUserId}/selfie-${Date.now()}.${ext}`;


      // Read file - handle both web and native
      let bytes: Uint8Array;

      if (asset.uri.startsWith('file://') || asset.uri.startsWith('/')) {
        // Native platform - use FileSystem
        const base64 = await FileSystem.readAsStringAsync(asset.uri, { encoding: 'base64' });
        const binaryString = atob(base64);
        bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
      } else {
        // Web platform - fetch from blob URL
        const response = await fetch(asset.uri);
        const blob = await response.blob();
        bytes = new Uint8Array(await blob.arrayBuffer());
      }

      // Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('verifications')
        .upload(storagePath, bytes, {
          contentType: mimeType,
          upsert: false,
        });

      if (uploadError) throw uploadError instanceof Error ? uploadError : new Error((uploadError as any)?.message || 'Upload failed');

      // Generate signed URL for preview
      const { data: signedUrl } = await supabase.storage
        .from('verifications')
        .createSignedUrl(storagePath, 3600);

      // Store ONLY the storage path in state, not the full URL
      setSelfiePhoto(storagePath);

      Alert.alert('Success', 'Selfie uploaded!');
    } catch (err) {
      console.error('[talent-setup] Selfie upload error:', extractErrorMessage(err));
      Alert.alert('Upload Failed', extractErrorMessage(err));
    } finally {
      setIsUploadingSelfie(false);
    }
  };

  // Save portfolio items to Supabase
  const handleSavePortfolio = async () => {
    // Duplicate-submit guard
    if (isSavingPortfolio) {
      return;
    }

    if (!user?.id) {
      Alert.alert('Error', 'User not found');
      return;
    }

    if (!createdTalentId) {
      Alert.alert('Error', 'Talent profile not found. Please go back and complete your profile.');
      return;
    }

    if (portfolioItems.length < 5) {
      Alert.alert('Error', 'Please upload at least 5 portfolio items');
      return;
    }

    setIsSavingPortfolio(true);

    // Create a timeout promise to prevent infinite loading
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Request timed out. Please try again.')), 15000);
    });

    try {

      // Mark onboarding as completed with timeout
      const updatePromise = supabase
        .from('talent_profiles')
        .update({ onboarding_completed: true })
        .eq('id', createdTalentId);

      const result = await Promise.race([updatePromise, timeoutPromise]) as { error: any };
      const updateError = result?.error;


      if (updateError) {
        console.warn('[talent-setup] Non-critical error updating profile:', updateError.message);
      }


      // Move to success step without alert
      setCurrentStep('success');
    } catch (err) {
      const errorMessage = extractErrorMessage(err);
      console.error('[talent-setup] SAVE_FAILED:', errorMessage);

      Alert.alert('Save Failed', errorMessage);
    } finally {
      setIsSavingPortfolio(false);
    }
  };

  const handleContinue = async () => {
    // Validate current step
    switch (currentStep) {
      case 'categories':
        if (selectedCategories.length === 0) {
          Alert.alert('Error', 'Please select at least one category');
          return;
        }
        setCurrentStep('profile');
        break;

      case 'profile':
        if (!displayName.trim() || displayName.length < 2) {
          Alert.alert('Error', 'Display name must be at least 2 characters');
          return;
        }
        if (!avatarUrl) {
          Alert.alert('Error', 'Please upload a profile photo');
          return;
        }
        if (!selectedCountry) {
          Alert.alert('Error', 'Please select a country');
          return;
        }

        // Create talent profile if not already created
        if (!createdTalentId) {
          try {
            setIsLoading(true);

            // Check if profile already exists
            const { data: existingProfile, error: checkError } = await supabase
              .from('talent_profiles')
              .select('id')
              .eq('user_id', user?.id)
              .single();

            if (existingProfile?.id) {
              setCreatedTalentId(existingProfile.id);

              const fullPhone = phone ? `${COUNTRY_PHONE_CODES[selectedCountry]?.code || ''}${phone}` : null;
              await supabase
                .from('talent_profiles')
                .update({
                  display_name: displayName,
                  avatar_url: avatarUrl,
                  country: selectedCountry,
                  city: selectedCity,
                  phone: fullPhone,
                })
                .eq('id', existingProfile.id);

              if (avatarUrl) {
                await supabase
                  .from('profiles')
                  .update({ avatar_url: avatarUrl, full_name: displayName })
                  .eq('id', user?.id);
              }
            } else if (checkError?.code === 'PGRST116') {
              // No rows returned - create new profile
              const { data: newProfile, error: createError } = await supabase
                .from('talent_profiles')
                .insert({
                  user_id: user?.id,
                  email: user?.email,
                  display_name: displayName,
                  avatar_url: avatarUrl,
                  country: selectedCountry,
                  city: selectedCity,
                  phone: phone ? `${COUNTRY_PHONE_CODES[selectedCountry]?.code || ''}${phone}` : null,
                })
                .select('id')
                .single();

              if (createError) {
                Alert.alert('Error', 'Failed to create profile: ' + createError.message);
                setIsLoading(false);
                return;
              }

              setCreatedTalentId(newProfile?.id || null);

              // Also update the profiles table with avatar_url and full_name
              if (user?.id) {
                const { error: profileUpdateError } = await supabase
                  .from('profiles')
                  .update({ avatar_url: avatarUrl, full_name: displayName })
                  .eq('id', user.id);

                if (profileUpdateError) {
                  console.warn('[talent-setup] Failed to update profiles table:', profileUpdateError.message);
                } else {
                }
              }
            }
          } catch (err) {
            Alert.alert('Error', 'Failed to create profile');
            console.error('[talent-setup] Profile creation error:', extractErrorMessage(err));
            setIsLoading(false);
            return;
          } finally {
            setIsLoading(false);
          }
        }

        if (hasModelCategory) {
          setCurrentStep('model-details');
        } else if (hasInfluencerCategory) {
          setCurrentStep('social-media');
        } else {
          setCurrentStep('pricing');
        }
        break;

      case 'model-details':
        if (!height || !build || !nationality) {
          Alert.alert('Error', 'Please fill in required fields');
          return;
        }
        const heightNum = parseInt(height);
        if (isNaN(heightNum) || heightNum < 140 || heightNum > 210) {
          Alert.alert('Error', 'Height must be between 140 and 210 cm');
          return;
        }
        if (weight) {
          const weightNum = parseInt(weight);
          if (isNaN(weightNum) || weightNum < 30 || weightNum > 200) {
            Alert.alert('Error', 'Weight must be between 30 and 200 kg');
            return;
          }
        }

        // Save model details to database
        if (createdTalentId) {
          try {
            setIsLoading(true);

            const { error: updateError } = await supabase
              .from('talent_profiles')
              .update({
                height_cm: height ? parseInt(height) : null,
                weight_kg: weight ? parseInt(weight) : null,
                build: build || null,
                shoe_size: shoeSize || null,
                nationality: nationality || null,
                ethnicity: ethnicity || null,
              })
              .eq('id', createdTalentId);

            if (updateError) {
              console.error('[talent-setup] Error saving model details:', updateError.message);
              Alert.alert('Error', 'Failed to save model details: ' + updateError.message);
              setIsLoading(false);
              return;
            }

          } catch (err) {
            console.error('[talent-setup] Error saving model details:', extractErrorMessage(err));
            Alert.alert('Error', 'Failed to save model details');
            setIsLoading(false);
            return;
          } finally {
            setIsLoading(false);
          }
        }

        if (hasInfluencerCategory) {
          setCurrentStep('social-media');
        } else {
          setCurrentStep('pricing');
        }
        break;

      case 'social-media':
        const socialLinksArray = [instagram, tiktok, youtube, twitter, linkedin, snapchat];
        if (socialLinksArray.every(link => !link.trim())) {
          Alert.alert('Error', 'Please add at least one social media link');
          return;
        }
        const urlPattern = /^https?:\/\/.+\..+/;
        const filledLinks = socialLinksArray.filter(link => link.trim());
        const invalidLink = filledLinks.find(link => !urlPattern.test(link.trim()));
        if (invalidLink) {
          Alert.alert('Error', 'Social media links must be valid URLs starting with http:// or https://');
          return;
        }
        if (selectedNiches.length === 0) {
          Alert.alert('Error', 'Please select at least one niche');
          return;
        }

        // Save social media details to database
        if (createdTalentId) {
          try {
            setIsLoading(true);

            const socialLinksObj: Record<string, string> = {};
            if (instagram) socialLinksObj.instagram = instagram;
            if (tiktok) socialLinksObj.tiktok = tiktok;
            if (youtube) socialLinksObj.youtube = youtube;
            if (twitter) socialLinksObj.twitter = twitter;
            if (linkedin) socialLinksObj.linkedin = linkedin;
            if (snapchat) socialLinksObj.snapchat = snapchat;

            const { error: updateError } = await supabase
              .from('talent_profiles')
              .update({
                social_links: socialLinksObj,
                influencer_niche: selectedNiches,
              })
              .eq('id', createdTalentId);

            if (updateError) {
              console.error('[talent-setup] Error saving social media:', updateError.message);
              Alert.alert('Error', 'Failed to save social media details');
              setIsLoading(false);
              return;
            }

          } catch (err) {
            console.error('[talent-setup] Error saving social media:', extractErrorMessage(err));
            Alert.alert('Error', 'Failed to save social media details');
            setIsLoading(false);
            return;
          } finally {
            setIsLoading(false);
          }
        }

        setCurrentStep('pricing');
        break;

      case 'pricing':
        // Check if all categories have rates
        const allRatesSet = selectedCategories.every(
          cat => rates[cat]?.amount && parseInt(rates[cat].amount) > 0
        );
        if (!allRatesSet) {
          Alert.alert('Error', 'Please set rates for all categories');
          return;
        }

        // Save pricing details to database
        if (createdTalentId) {
          try {
            setIsLoading(true);

            // Calculate main rates based on selected categories
            // Use the first rate as the main hourly/day rate
            let hourlyRate: number | null = null;
            let dayRate: number | null = null;

            for (const category of selectedCategories) {
              const rate = rates[category];
              if (rate?.amount) {
                const amount = parseInt(rate.amount);
                if (rate.interval === 'hour' || rate.interval === 'hourly') {
                  if (!hourlyRate) hourlyRate = amount;
                } else if (rate.interval === 'day' || rate.interval === 'daily') {
                  if (!dayRate) dayRate = amount;
                } else {
                  // Default to hourly if no interval specified
                  if (!hourlyRate) hourlyRate = amount;
                }
              }
            }

            const { error: updateError } = await supabase
              .from('talent_profiles')
              .update({
                hourly_rate: hourlyRate,
                day_rate: dayRate,
              })
              .eq('id', createdTalentId);

            if (updateError) {
              console.error('[talent-setup] Error saving pricing:', updateError.message);
              Alert.alert('Error', 'Failed to save pricing details');
              setIsLoading(false);
              return;
            }

          } catch (err) {
            console.error('[talent-setup] Error saving pricing:', extractErrorMessage(err));
            Alert.alert('Error', 'Failed to save pricing details');
            setIsLoading(false);
            return;
          } finally {
            setIsLoading(false);
          }
        }

        setCurrentStep('portfolio');
        break;

      case 'portfolio':
        if (portfolioItems.length < 5) {
          Alert.alert('Error', 'Please upload at least 5 portfolio items');
          return;
        }
        // Save portfolio to database
        await handleSavePortfolio();
        break;

      case 'success':
        setCurrentStep('verification');
        break;

      case 'verification':
        // Validation: both files required
        if (!idDocument || !selfiePhoto) {
          Alert.alert('Error', 'Please upload both ID document and selfie');
          return;
        }

        try {
          setIsLoading(true);


          // Get auth user
          const { data: authData } = await supabase.auth.getUser();
          const authUserId = authData?.user?.id;
          if (!authUserId) throw new Error('Not authenticated');

          // Get correct talent profile id from database
          const { data: profile, error: profileError } = await supabase
            .from('talent_profiles')
            .select('id')
            .eq('user_id', authUserId)
            .maybeSingle();

          if (profileError) throw profileError;
          if (!profile?.id) throw new Error('Talent profile not found');

          const talentId = profile.id;

          // Insert verification record - THIS is where the actual submit happens
          const { error: insertError } = await supabase
            .from('talent_verifications')
            .insert({
              talent_id: talentId,
              id_document_url: idDocument,
              selfie_url: selfiePhoto,
              status: 'pending',
            });

          if (insertError) throw insertError;

          // SUCCESS BOUNDARY: once DB save worked, do not show failure anymore
          // Check if user role already exists first
          const { data: existingRole, error: roleCheckError } = await supabase
            .from('user_roles')
            .select('user_id')
            .eq('user_id', authUserId)
            .eq('role', 'talent')
            .limit(1)
            .maybeSingle();

          if (roleCheckError && roleCheckError.code !== 'PGRST116') {
            console.warn('[talent-setup] role check warning (continuing):', roleCheckError.message);
            // Continue anyway - it's not critical if check fails
          }

          // Only insert role if it doesn't already exist
          if (!existingRole?.user_id) {
            const { error: roleInsertError } = await supabase
              .from('user_roles')
              .insert({ user_id: authUserId, role: 'talent' });

            if (roleInsertError) {
              console.error('[talent-setup] role insert error:', roleInsertError.message);
              throw roleInsertError;
            }
          } else {
          }

          // Show success and navigate
          Alert.alert('Success', "Verification submitted! We'll review within up to 3 hours.");

          // Clear onboarding session storage if needed
          // TODO: Implement if needed

          // Navigate to talent dashboard
          router.replace('/(talent)');

          // Send notification in background (non-blocking)
          void supabase.functions
            .invoke('send-verification-notification', {
              body: {
                type: 'talent',
                talentId,
                userName: displayName || authData?.user?.email || 'Unknown',
              },
            })
            .catch((err) => {
              console.warn('[talent-setup] notification failed after successful save (this is OK):', err);
              // Do NOT throw or show error - notification failure is not a submit failure
            });
        } catch (err) {
          console.error('[talent-setup] Verification submit error:', extractErrorMessage(err));
          const errorMessage = getErrorMessage(err);
          console.error('[talent-setup] formatted error message:', errorMessage);
          Alert.alert('Verification Failed', errorMessage || 'Failed to submit verification');
        } finally {
          setIsLoading(false);
        }
        break;

      default:
        break;
    }
  };

  const handleBack = () => {
    const steps: Step[] = ['categories', 'profile', 'model-details', 'social-media', 'pricing', 'portfolio', 'success', 'verification'];
    const currentIndex = steps.indexOf(currentStep);
    if (currentIndex > 0) {
      setCurrentStep(steps[currentIndex - 1]);
    } else {
      router.back();
    }
  };

  const handleLogout = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel' },
      {
        text: 'Sign Out',
        onPress: async () => {
          try {
            // Sign out from Supabase
            const { error } = await supabase.auth.signOut();
            if (error) {
              Alert.alert('Error', 'Failed to sign out: ' + error.message);
              return;
            }
            // Navigate back to auth screen
            router.replace('/onboarding/auth?role=talent');
          } catch (err) {
            Alert.alert('Error', 'An error occurred during sign out');
            console.error('Logout error:', extractErrorMessage(err));
          }
        },
      },
    ]);
  };

  const getStepNumber = () => {
    const steps: Step[] = [];
    if (selectedCategories.length > 0) {
      steps.push('categories', 'profile');
      if (hasModelCategory) steps.push('model-details');
      if (hasInfluencerCategory) steps.push('social-media');
      steps.push('pricing', 'portfolio', 'success');
      if (true) steps.push('verification'); // verification is optional
    } else {
      steps.push('categories');
    }

    return { current: steps.indexOf(currentStep) + 1, total: steps.length };
  };

  const { current, total } = getStepNumber();

  return (
    <View className="flex-1 bg-[#0A0A0A]">
      <LinearGradient colors={['#0A0A0A', '#0A0A0A']} style={{ flex: 1 }}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          className="flex-1"
        >
          {/* Header */}
          <View
            className="flex-row items-center justify-between px-4 py-4"
            style={{ paddingTop: insets.top + 8 }}
          >
            <Pressable
              onPress={currentStep === 'categories' ? handleLogout : handleBack}
              className="p-2 rounded-full"
              style={{ backgroundColor: 'rgba(255,255,255,0.1)' }}
            >
              {currentStep === 'categories' ? (
                <LogOut size={24} color="#FFFFFF" />
              ) : (
                <ChevronLeft size={24} color="#FFFFFF" />
              )}
            </Pressable>

            <Text className="text-white text-lg font-semibold flex-1 text-center">
              {currentStep === 'categories' && 'What do you do?'}
              {currentStep === 'profile' && 'Your Profile'}
              {currentStep === 'model-details' && 'Model Details'}
              {currentStep === 'social-media' && 'Social Media'}
              {currentStep === 'pricing' && 'Set your rates'}
              {currentStep === 'portfolio' && 'Portfolio'}
              {currentStep === 'success' && 'You\'re all set!'}
              {currentStep === 'verification' && 'Verify Your Identity'}
            </Text>

            <View className="w-10" />
          </View>

          {/* Progress Bar */}
          {currentStep !== 'success' && currentStep !== 'verification' && (
            <View className="px-4 mb-6">
              <View className="flex-row gap-1">
                {Array.from({ length: total }).map((_, i) => (
                  <View
                    key={i}
                    className="flex-1 h-1 rounded-full"
                    style={{
                      backgroundColor: i < current ? '#FA5610' : 'rgba(255,255,255,0.1)',
                    }}
                  />
                ))}
              </View>
            </View>
          )}

          {/* Content */}
          <ScrollView className="flex-1 px-6" showsVerticalScrollIndicator={false}>
            <Animated.View entering={FadeInDown.duration(300)} className="pb-8">
              {currentStep === 'categories' && (
                <View className="gap-6">
                  <View className="items-center mb-2">
                    <Text className="text-white text-2xl font-bold">What do you do?</Text>
                    <Text className="text-neutral-400 text-sm mt-3">Select all that apply</Text>
                  </View>

                  <View
                    style={{
                      flexDirection: 'row',
                      flexWrap: 'wrap',
                      gap: 8,
                    }}
                  >
                    {CATEGORIES.map((cat, index) => {
                      const screenWidth = Dimensions.get('window').width;
                      const cardWidth = (screenWidth - 48 - 8) / 2; // 48 = padding (24*2), 8 = gap
                      return (
                        <Pressable
                          key={cat.name}
                          onPress={() => handleCategoryToggle(cat.name)}
                          style={{ width: cardWidth, marginBottom: 4 }}
                        >
                        <Animated.View entering={FadeInDown.delay(index * 30).duration(400)}>
                          <View
                            className="overflow-hidden rounded-3xl h-40 items-end justify-end relative border-2"
                            style={{
                              backgroundColor: 'rgba(20, 20, 20, 0.9)',
                              borderColor: selectedCategories.includes(cat.name)
                                ? '#FA5610'
                                : 'rgba(255, 255, 255, 0.1)',
                            }}
                          >
                            {/* Background image for categories with images */}
                            {cat.image ? (
                              <Image
                                source={cat.image}
                                style={{
                                  position: 'absolute',
                                  width: '100%',
                                  height: '100%',
                                  resizeMode: 'cover',
                                }}
                              />
                            ) : null}

                            {/* Background gradient overlay */}
                            <LinearGradient
                              colors={['transparent', 'rgba(0,0,0,0.7)']}
                              style={{
                                position: 'absolute',
                                width: '100%',
                                height: '100%',
                              }}
                            />

                            {/* Category content */}
                            <View className="absolute inset-0 p-4 justify-between">
                              <View />
                              <View>
                                <Text className="text-white font-bold text-base leading-5">
                                  {cat.name === 'Photographer' ? 'Photographer / Videographer' : cat.name}
                                </Text>
                                <Text className="text-neutral-300 text-xs mt-1.5 leading-4">
                                  {cat.description}
                                </Text>
                              </View>
                            </View>

                            {/* Selection indicator */}
                            {selectedCategories.includes(cat.name) && (
                              <View className="absolute top-3 right-3 bg-orange-500 rounded-full p-2 z-10">
                                <Check size={16} color="#fff" strokeWidth={3} />
                              </View>
                            )}
                          </View>
                        </Animated.View>
                      </Pressable>
                      );
                    })}
                  </View>
                </View>
              )}

              {currentStep === 'profile' && (
                <View className="gap-6">
                  {/* Avatar Upload Circle */}
                  <View className="items-center mb-2">
                    <Text className="text-white text-2xl font-bold mb-1">Your Profile</Text>
                    <Text className="text-neutral-400 text-sm">Add a profile photo to help clients recognize you</Text>

                    <View className="relative mt-8 mb-2">
                      <View
                        className="w-32 h-32 rounded-full items-center justify-center border-2 overflow-hidden"
                        style={{
                          borderColor: avatarUrl ? '#FA5610' : 'rgba(255,137,74,0.3)',
                          backgroundColor: 'rgba(255,255,255,0.05)',
                        }}
                      >
                        {isUploadingAvatar ? (
                          <ActivityIndicator size="large" color="#FA5610" />
                        ) : avatarUrl ? (
                          <Image
                            source={{ uri: avatarUrl }}
                            className="w-full h-full"
                          />
                        ) : (
                          <View className="items-center gap-2">
                            <View className="w-16 h-16 rounded-full bg-neutral-700 items-center justify-center">
                              <Upload size={32} color="rgba(255,255,255,0.4)" />
                            </View>
                          </View>
                        )}
                      </View>

                      {/* Camera icon overlay */}
                      <Pressable
                        onPress={handleAvatarUpload}
                        disabled={isUploadingAvatar}
                        className="absolute bottom-0 right-0 w-12 h-12 rounded-full bg-orange-500 items-center justify-center border-4 active:opacity-80"
                        style={{ borderColor: '#0A0A0A' }}
                      >
                        <Upload size={20} color="#fff" />
                      </Pressable>
                    </View>

                    <Text className="text-orange-500 text-sm font-semibold mt-3">Profile photo required</Text>
                  </View>

                  {/* Form Fields */}
                  <View className="gap-5 mt-4">
                    {/* Display Name */}
                    <View>
                      <Text className="text-white font-semibold text-sm mb-2">Display Name</Text>
                      <View className="bg-neutral-900 border border-neutral-700 rounded-2xl px-5 py-4">
                        <TextInput
                          placeholder="Your professional name"
                          placeholderTextColor="#666"
                          value={displayName}
                          onChangeText={setDisplayName}
                          className="text-white text-base"
                        />
                      </View>
                      <Text className="text-blue-400 text-xs mt-2">This is how clients will see you</Text>
                    </View>

                    {/* Country Selector */}
                    <View>
                      <View className="flex-row items-center justify-between mb-2">
                        <Text className="text-white font-semibold text-sm">
                          Your Country <Text className="text-red-500">*</Text>
                        </Text>
                        {isLoadingGeo ? (
                          <View className="flex-row items-center gap-1">
                            <ActivityIndicator size="small" color="#FA5610" />
                            <Text className="text-neutral-500 text-xs">Detecting...</Text>
                          </View>
                        ) : selectedCountry && !hasManuallySelectedCountry ? (
                          <Text className="text-green-500 text-xs">Auto-detected</Text>
                        ) : null}
                      </View>
                      <Pressable
                        onPress={() => setShowCountryDropdown(!showCountryDropdown)}
                        className="bg-neutral-900 border border-neutral-700 rounded-2xl px-5 py-4 flex-row justify-between items-center active:opacity-70"
                      >
                        <View className="flex-row items-center gap-2 flex-1">
                          <Text className="text-lg">🇦🇪</Text>
                          <Text className={selectedCountry ? 'text-white text-base font-medium' : 'text-neutral-400 text-base'}>
                            {selectedCountry || 'Select country'}
                          </Text>
                        </View>
                        <ChevronRight size={20} color="#999" />
                      </Pressable>
                      {showCountryDropdown ? (
                        <View className="mt-2 bg-neutral-900 rounded-2xl overflow-hidden border border-neutral-700 max-h-48">
                          <ScrollView showsVerticalScrollIndicator={false}>
                            {COUNTRIES.map(country => (
                              <Pressable
                                key={country}
                                onPress={() => {
                                  setSelectedCountry(country);
                                  setSelectedCity('');
                                  setShowCountryDropdown(false);
                                  setHasManuallySelectedCountry(true); // Mark as manually selected
                                }}
                                className="px-5 py-4 border-b border-neutral-800 active:bg-neutral-800"
                              >
                                <Text className={selectedCountry === country ? 'text-orange-500 font-semibold text-base' : 'text-white text-base'}>
                                  {country}
                                </Text>
                              </Pressable>
                            ))}
                          </ScrollView>
                        </View>
                      ) : null}
                    </View>

                    {/* City Selector */}
                    {selectedCountry ? (
                      <View>
                        <Text className="text-white font-semibold text-sm mb-2">City</Text>
                        <Pressable
                          onPress={() => setShowCityDropdown(!showCityDropdown)}
                          className="bg-neutral-900 border border-neutral-700 rounded-2xl px-5 py-4 flex-row justify-between items-center active:opacity-70"
                        >
                          <View className="flex-row items-center gap-2 flex-1">
                            <Text className="text-lg">📍</Text>
                            <Text className={selectedCity ? 'text-white text-base font-medium' : 'text-neutral-400 text-base'}>
                              {selectedCity || 'Select city'}
                            </Text>
                          </View>
                          <ChevronRight size={20} color="#999" />
                        </Pressable>
                        {showCityDropdown ? (
                          <View className="mt-2 bg-neutral-900 rounded-2xl overflow-hidden border border-neutral-700 max-h-48">
                            <ScrollView showsVerticalScrollIndicator={false}>
                              {(CITIES_BY_COUNTRY[selectedCountry] || []).map(city => (
                                <Pressable
                                  key={city}
                                  onPress={() => {
                                    setSelectedCity(city);
                                    setShowCityDropdown(false);
                                  }}
                                  className="px-5 py-4 border-b border-neutral-800 active:bg-neutral-800"
                                >
                                  <Text className={selectedCity === city ? 'text-orange-500 font-semibold text-base' : 'text-white text-base'}>
                                    {city}
                                  </Text>
                                </Pressable>
                              ))}
                            </ScrollView>
                          </View>
                        ) : null}
                      </View>
                    ) : null}

                    {/* Phone Number */}
                    <View>
                      <Text className="text-white font-semibold text-sm mb-2">Phone Number</Text>
                      <View className="flex-row gap-3 items-center">
                        <View className="bg-neutral-900 border border-neutral-700 rounded-2xl px-4 py-4 items-center">
                          <View className="flex-row items-center gap-1">
                            <Text className="text-neutral-400 text-sm">{COUNTRY_PHONE_CODES[selectedCountry]?.flag || '🌍'}</Text>
                            <Text className="text-white font-semibold">{COUNTRY_PHONE_CODES[selectedCountry]?.code || '+971'}</Text>
                          </View>
                        </View>
                        <View className="flex-1 bg-neutral-900 border border-neutral-700 rounded-2xl px-5 py-4">
                          <TextInput
                            placeholder="Your phone number"
                            placeholderTextColor="#666"
                            value={phone}
                            onChangeText={setPhone}
                            keyboardType="phone-pad"
                            className="text-white text-base"
                          />
                        </View>
                      </View>
                    </View>
                  </View>
                </View>
              )}

              {currentStep === 'model-details' && (
                <View className="gap-4">
                  {/* Height Slider - simplified */}
                  <View>
                    <Text className="text-neutral-400 text-sm mb-2">
                      Height: {height} cm
                    </Text>
                    <TextInput
                      placeholder="Height (140-210 cm)"
                      placeholderTextColor="#525252"
                      value={height}
                      onChangeText={setHeight}
                      keyboardType="numeric"
                      className="bg-white/10 border border-white/10 rounded-2xl px-4 py-3 text-white"
                    />
                  </View>

                  {/* Weight - optional */}
                  <View>
                    <Text className="text-neutral-400 text-sm mb-2">
                      Weight (Optional): {weight} kg
                    </Text>
                    <TextInput
                      placeholder="Weight (kg)"
                      placeholderTextColor="#525252"
                      value={weight}
                      onChangeText={setWeight}
                      keyboardType="numeric"
                      className="bg-white/10 border border-white/10 rounded-2xl px-4 py-3 text-white"
                    />
                  </View>

                  {/* Build */}
                  <View>
                    <Text className="text-neutral-400 text-sm mb-2">Build</Text>
                    <View className="flex-row flex-wrap gap-2">
                      {BUILDS.map(b => (
                        <Pressable
                          key={b}
                          onPress={() => setBuild(b)}
                          className="px-4 py-2 rounded-2xl border"
                          style={{
                            backgroundColor:
                              build === b ? 'rgba(250, 86, 16, 0.3)' : 'rgba(255, 255, 255, 0.08)',
                            borderColor:
                              build === b ? '#FA5610' : 'rgba(255, 255, 255, 0.1)',
                          }}
                        >
                          <Text className="text-white text-sm">{b}</Text>
                        </Pressable>
                      ))}
                    </View>
                  </View>

                  {/* Shoe Size - optional */}
                  <View>
                    <Text className="text-neutral-400 text-sm mb-2">Shoe Size EU (Optional)</Text>
                    <TextInput
                      placeholder="EU Size"
                      placeholderTextColor="#525252"
                      value={shoeSize}
                      onChangeText={setShoeSize}
                      className="bg-white/10 border border-white/10 rounded-2xl px-4 py-3 text-white"
                    />
                  </View>

                  {/* Nationality */}
                  <View>
                    <Text className="text-neutral-400 text-sm mb-2">Nationality</Text>
                    <TextInput
                      placeholder="Your nationality"
                      placeholderTextColor="#525252"
                      value={nationality}
                      onChangeText={(text) => {
                        // Only allow letters, spaces, and hyphens (for nationalities like "South African")
                        const cleanedText = text.replace(/[^a-zA-Z\s-]/g, '');
                        setNationality(cleanedText);
                      }}
                      autoCapitalize="words"
                      className="bg-white/10 border border-white/10 rounded-2xl px-4 py-3 text-white"
                    />
                  </View>

                  {/* Ethnicity - optional */}
                  <View>
                    <Text className="text-neutral-400 text-sm mb-2">Ethnicity (Optional)</Text>
                    <View className="flex-row flex-wrap gap-2">
                      {ETHNICITIES.map(e => (
                        <Pressable
                          key={e}
                          onPress={() => setEthnicity(ethnicity === e ? '' : e)}
                          className="px-3 py-2 rounded-2xl border"
                          style={{
                            backgroundColor:
                              ethnicity === e ? 'rgba(250, 86, 16, 0.3)' : 'rgba(255, 255, 255, 0.08)',
                            borderColor:
                              ethnicity === e ? '#FA5610' : 'rgba(255, 255, 255, 0.1)',
                          }}
                        >
                          <Text className="text-white text-xs">{e}</Text>
                        </Pressable>
                      ))}
                    </View>
                  </View>
                </View>
              )}

              {currentStep === 'social-media' && (
                <View className="gap-4">
                  <TextInput
                    placeholder="Instagram URL"
                    placeholderTextColor="#525252"
                    value={instagram}
                    onChangeText={setInstagram}
                    className="bg-white/10 border border-white/10 rounded-2xl px-4 py-3 text-white"
                  />
                  <TextInput
                    placeholder="TikTok URL"
                    placeholderTextColor="#525252"
                    value={tiktok}
                    onChangeText={setTiktok}
                    className="bg-white/10 border border-white/10 rounded-2xl px-4 py-3 text-white"
                  />
                  <TextInput
                    placeholder="YouTube URL"
                    placeholderTextColor="#525252"
                    value={youtube}
                    onChangeText={setYoutube}
                    className="bg-white/10 border border-white/10 rounded-2xl px-4 py-3 text-white"
                  />
                  <TextInput
                    placeholder="Twitter URL"
                    placeholderTextColor="#525252"
                    value={twitter}
                    onChangeText={setTwitter}
                    className="bg-white/10 border border-white/10 rounded-2xl px-4 py-3 text-white"
                  />
                  <TextInput
                    placeholder="LinkedIn URL"
                    placeholderTextColor="#525252"
                    value={linkedin}
                    onChangeText={setLinkedin}
                    className="bg-white/10 border border-white/10 rounded-2xl px-4 py-3 text-white"
                  />
                  <TextInput
                    placeholder="Snapchat URL"
                    placeholderTextColor="#525252"
                    value={snapchat}
                    onChangeText={setSnapchat}
                    className="bg-white/10 border border-white/10 rounded-2xl px-4 py-3 text-white"
                  />

                  <View>
                    <Text className="text-neutral-400 text-sm mb-2">Niches (Select at least 1)</Text>
                    <View className="flex-row flex-wrap gap-2">
                      {SOCIAL_NICHES.map(niche => (
                        <Pressable
                          key={niche}
                          onPress={() => {
                            if (selectedNiches.includes(niche)) {
                              setSelectedNiches(selectedNiches.filter(n => n !== niche));
                            } else {
                              setSelectedNiches([...selectedNiches, niche]);
                            }
                          }}
                          className="px-3 py-2 rounded-2xl border"
                          style={{
                            backgroundColor: selectedNiches.includes(niche)
                              ? 'rgba(250, 86, 16, 0.3)'
                              : 'rgba(255, 255, 255, 0.08)',
                            borderColor: selectedNiches.includes(niche)
                              ? '#FA5610'
                              : 'rgba(255, 255, 255, 0.1)',
                          }}
                        >
                          <Text className="text-white text-xs">{niche}</Text>
                        </Pressable>
                      ))}
                    </View>
                  </View>
                </View>
              )}

              {currentStep === 'pricing' && (
                <View className="gap-4">
                  {/* Header */}
                  <View className="items-center mb-2">
                    <Text className="text-white text-2xl font-bold">Set Your Rates</Text>
                    <Text className="text-neutral-400 text-sm mt-2">Enter your pricing for each service</Text>
                  </View>

                  {/* Rate cards */}
                  {selectedCategories.map(category => {
                    const hasRate = rates[category]?.amount && parseInt(rates[category].amount) > 0;
                    const defaultInterval = getDefaultInterval(category);

                    return (
                      <View key={category} className="gap-3">
                        <View
                          className="p-4 rounded-2xl relative"
                          style={{
                            backgroundColor: hasRate ? 'rgba(16, 185, 129, 0.1)' : 'rgba(250, 86, 16, 0.1)',
                            borderWidth: hasRate ? 1 : 0,
                            borderColor: hasRate ? 'rgba(16, 185, 129, 0.3)' : 'transparent',
                          }}
                        >
                          {/* Header with Set badge */}
                          <View className="flex-row justify-between items-center mb-3">
                            <Text className="text-white font-semibold">{category}</Text>
                            {hasRate ? (
                              <View
                                className="flex-row items-center gap-1 px-2 py-1 rounded-full"
                                style={{ backgroundColor: 'rgba(16, 185, 129, 0.2)' }}
                              >
                                <Check size={12} color="#10B981" strokeWidth={3} />
                                <Text className="text-green-400 text-xs font-semibold">Set</Text>
                              </View>
                            ) : null}
                          </View>

                          <View className="flex-row gap-2 items-end">
                            <View className="flex-1">
                              <Text className="text-neutral-400 text-xs mb-1">Amount</Text>
                              <View className="flex-row items-center bg-white/10 border border-white/10 rounded-2xl px-3">
                                <Text className="text-orange-500 font-semibold">AED</Text>
                                <TextInput
                                  placeholder="0"
                                  placeholderTextColor="#525252"
                                  value={rates[category]?.amount || ''}
                                  onChangeText={(text) =>
                                    setRates({
                                      ...rates,
                                      [category]: {
                                        ...rates[category],
                                        amount: text,
                                        interval: rates[category]?.interval || defaultInterval,
                                      },
                                    })
                                  }
                                  keyboardType="numeric"
                                  className="flex-1 py-3 ml-2 text-white"
                                />
                              </View>
                            </View>
                            <View className="flex-1">
                              <Text className="text-neutral-400 text-xs mb-1">Interval</Text>
                              <Pressable
                                className="bg-white/10 border border-white/10 rounded-2xl px-3 py-3"
                                onPress={() => setShowIntervalDropdown(showIntervalDropdown === category ? null : category)}
                              >
                                <Text className="text-white text-xs text-center">
                                  {rates[category]?.interval || defaultInterval}
                                </Text>
                              </Pressable>
                              {showIntervalDropdown === category && (
                                <View className="absolute top-16 right-0 left-0 bg-neutral-900 border border-white/10 rounded-2xl overflow-hidden z-50">
                                  {['per hour', 'per day', 'per session', 'per project'].map(interval => (
                                    <Pressable
                                      key={interval}
                                      onPress={() => {
                                        setRates({
                                          ...rates,
                                          [category]: {
                                            ...rates[category],
                                            amount: rates[category]?.amount || '',
                                            interval,
                                          },
                                        });
                                        setShowIntervalDropdown(null);
                                      }}
                                      className="px-3 py-3 border-b border-white/5"
                                    >
                                      <Text className={`text-sm ${rates[category]?.interval === interval ? 'text-orange-500 font-semibold' : 'text-neutral-300'}`}>
                                        {interval}
                                      </Text>
                                    </Pressable>
                                  ))}
                                </View>
                              )}
                            </View>
                          </View>
                        </View>
                      </View>
                    );
                  })}

                  {/* Green summary box */}
                  <View
                    className="p-4 rounded-2xl flex-row items-center justify-center gap-2 mt-2"
                    style={{
                      backgroundColor: Object.keys(rates).filter(cat => rates[cat]?.amount && parseInt(rates[cat].amount) > 0).length === selectedCategories.length
                        ? 'rgba(16, 185, 129, 0.15)'
                        : 'rgba(250, 86, 16, 0.1)',
                      borderWidth: 1,
                      borderColor: Object.keys(rates).filter(cat => rates[cat]?.amount && parseInt(rates[cat].amount) > 0).length === selectedCategories.length
                        ? 'rgba(16, 185, 129, 0.3)'
                        : 'rgba(250, 86, 16, 0.2)',
                    }}
                  >
                    {Object.keys(rates).filter(cat => rates[cat]?.amount && parseInt(rates[cat].amount) > 0).length === selectedCategories.length ? (
                      <CheckCircle2 size={18} color="#10B981" />
                    ) : null}
                    <Text
                      className="font-semibold text-sm"
                      style={{
                        color: Object.keys(rates).filter(cat => rates[cat]?.amount && parseInt(rates[cat].amount) > 0).length === selectedCategories.length
                          ? '#10B981'
                          : '#FA5610'
                      }}
                    >
                      {Object.keys(rates).filter(cat => rates[cat]?.amount && parseInt(rates[cat].amount) > 0).length}/{selectedCategories.length} role{selectedCategories.length > 1 ? 's' : ''} configured
                    </Text>
                  </View>
                </View>
              )}

              {currentStep === 'portfolio' && (
                <View className="gap-6">
                  <View className="items-center mb-2">
                    <Text className="text-white text-2xl font-bold">Your Portfolio</Text>
                    <Text className="text-neutral-400 text-sm mt-2">Add 5 photos or videos to showcase your work</Text>
                  </View>

                  {/* Large Upload Area */}
                  <Pressable
                    onPress={handlePortfolioUpload}
                    disabled={isUploadingPortfolio}
                    className="bg-neutral-900 border-2 border-dashed rounded-3xl px-8 py-16 items-center justify-center active:opacity-70"
                    style={{
                      borderColor: portfolioItems.length >= 5 ? '#FA5610' : 'rgba(255, 255, 255, 0.1)',
                      minHeight: 280,
                    }}
                  >
                    {isUploadingPortfolio ? (
                      <View className="items-center gap-3">
                        <ActivityIndicator size="large" color="#FA5610" />
                        <Text className="text-orange-500 text-sm font-semibold">Uploading...</Text>
                      </View>
                    ) : (
                      <View className="items-center gap-4">
                        <View className="w-16 h-16 rounded-full bg-orange-500/10 items-center justify-center">
                          <Upload size={32} color="#FA5610" />
                        </View>
                        <View className="items-center gap-2">
                          <Text className="text-white text-lg font-bold">Tap to add photos or videos</Text>
                          <Text className="text-neutral-400 text-sm">JPG, PNG, WebP, MP4 • Max 50MB each</Text>
                        </View>
                      </View>
                    )}
                  </Pressable>

                  {/* Uploaded Items Grid - small thumbnails */}
                  {portfolioItems.length > 0 && (
                    <View className="gap-3">
                      <Text className="text-white text-sm font-semibold">Uploaded Items ({portfolioItems.length}/5)</Text>
                      <View className="flex-row flex-wrap gap-2">
                        {portfolioItems.map((item, i) => (
                          <View
                            key={i}
                            className="w-20 h-20 rounded-xl overflow-hidden border border-neutral-700"
                          >
                            <Image
                              source={{ uri: item }}
                              className="w-full h-full"
                            />
                          </View>
                        ))}
                      </View>
                    </View>
                  )}

                  {/* Warning Box */}
                  <View className="bg-orange-500/10 border border-orange-500/40 rounded-2xl p-4 flex-row gap-3 items-start">
                    <View className="w-6 h-6 rounded-full bg-orange-500 items-center justify-center mt-0.5">
                      <View className="w-1 h-1 bg-white rounded-full" />
                      <View className="w-1 h-1 bg-white rounded-full absolute" />
                    </View>
                    <View className="flex-1">
                      <Text className="text-orange-300 font-semibold text-sm mb-1">
                        At least 5 photos or videos are required to continue
                      </Text>
                      <Text className="text-orange-200/70 text-xs leading-4">
                        Showcase your best work with high-quality images or videos that represent your talent.
                      </Text>
                    </View>
                  </View>
                </View>
              )}

              {currentStep === 'success' && (
                <View className="gap-6 py-4">
                  {/* Success Icon and Heading */}
                  <View className="items-center gap-4">
                    <View className="w-20 h-20 rounded-full bg-green-500/20 items-center justify-center">
                      <CheckCircle2 size={56} color="#10B981" strokeWidth={2} />
                    </View>
                    <View className="items-center gap-2">
                      <Text className="text-white text-3xl font-bold text-center">
                        You're all set, {displayName || 'there'}!
                      </Text>
                      <Text className="text-neutral-400 text-sm text-center">
                        Your profile is ready. Complete verification to unlock exclusive opportunities.
                      </Text>
                    </View>
                  </View>

                  {/* Bio Section */}
                  <View className="bg-neutral-900 rounded-2xl p-5 gap-3 border border-neutral-800">
                    <View className="flex-row items-center gap-2">
                      <Text className="text-white font-semibold text-lg">Write a quick intro</Text>
                      <View className="flex-1" />
                      <Text className="text-orange-500 text-xs font-semibold">OPTIONAL</Text>
                    </View>
                    <Text className="text-neutral-400 text-xs leading-5">
                      A personal bio helps clients learn about you. Share your experience, style, and what makes you unique. This can increase bookings by up to 3x.
                    </Text>
                  </View>

                  {/* Verification Benefits Section */}
                  <View className="gap-3">
                    <Text className="text-white font-semibold text-lg">Verification unlocks:</Text>

                    {/* Benefit 1 */}
                    <View className="flex-row gap-3 bg-neutral-900 rounded-2xl p-4 border border-neutral-800">
                      <View className="w-10 h-10 rounded-full bg-blue-500/20 items-center justify-center flex-shrink-0">
                        <Check size={20} color="#3B82F6" />
                      </View>
                      <View className="flex-1">
                        <Text className="text-white font-semibold text-sm">Verified badge</Text>
                        <Text className="text-neutral-400 text-xs mt-0.5">Stand out with an official badge</Text>
                      </View>
                    </View>

                    {/* Benefit 2 */}
                    <View className="flex-row gap-3 bg-neutral-900 rounded-2xl p-4 border border-neutral-800">
                      <View className="w-10 h-10 rounded-full bg-purple-500/20 items-center justify-center flex-shrink-0">
                        <Check size={20} color="#A855F7" />
                      </View>
                      <View className="flex-1">
                        <Text className="text-white font-semibold text-sm">Higher visibility</Text>
                        <Text className="text-neutral-400 text-xs mt-0.5">Show up higher in client searches</Text>
                      </View>
                    </View>

                    {/* Benefit 3 */}
                    <View className="flex-row gap-3 bg-neutral-900 rounded-2xl p-4 border border-neutral-800">
                      <View className="w-10 h-10 rounded-full bg-green-500/20 items-center justify-center flex-shrink-0">
                        <Check size={20} color="#10B981" />
                      </View>
                      <View className="flex-1">
                        <Text className="text-white font-semibold text-sm">More bookings</Text>
                        <Text className="text-neutral-400 text-xs mt-0.5">Trusted status increases booking rate</Text>
                      </View>
                    </View>

                    {/* Benefit 4 */}
                    <View className="flex-row gap-3 bg-neutral-900 rounded-2xl p-4 border border-neutral-800">
                      <View className="w-10 h-10 rounded-full bg-amber-500/20 items-center justify-center flex-shrink-0">
                        <Check size={20} color="#F59E0B" />
                      </View>
                      <View className="flex-1">
                        <Text className="text-white font-semibold text-sm">Faster response rate</Text>
                        <Text className="text-neutral-400 text-xs mt-0.5">Clients prioritize verified talents</Text>
                      </View>
                    </View>
                  </View>
                </View>
              )}

              {currentStep === 'verification' && (
                <View className="gap-4">
                  <Text className="text-neutral-400 text-center text-sm mb-4">
                    Upload your ID and a selfie to verify your identity
                  </Text>

                  {/* ID Document */}
                  <View>
                    <Text className="text-white font-semibold mb-3">ID Document</Text>
                    <Pressable
                      onPress={handleIdUpload}
                      disabled={isUploadingId}
                      className="h-40 rounded-2xl items-center justify-center border-2 border-dashed"
                      style={{
                        borderColor: 'rgba(255, 255, 255, 0.2)',
                        backgroundColor: 'rgba(255, 255, 255, 0.05)',
                      }}
                    >
                      {isUploadingId ? (
                        <ActivityIndicator size="small" color="#FA5610" />
                      ) : idDocument ? (
                        <Image
                          source={{ uri: idDocument }}
                          className="w-full h-full rounded-2xl"
                        />
                      ) : (
                        <Upload size={24} color="#FA5610" />
                      )}
                    </Pressable>
                  </View>

                  {/* Selfie */}
                  <View>
                    <Text className="text-white font-semibold mb-3">Selfie Photo</Text>
                    <Pressable
                      onPress={handleSelfieUpload}
                      disabled={isUploadingSelfie}
                      className="h-40 w-40 self-center rounded-2xl items-center justify-center border-2 border-dashed"
                      style={{
                        borderColor: 'rgba(255, 255, 255, 0.2)',
                        backgroundColor: 'rgba(255, 255, 255, 0.05)',
                      }}
                    >
                      {isUploadingSelfie ? (
                        <ActivityIndicator size="small" color="#FA5610" />
                      ) : selfiePhoto ? (
                        <Image
                          source={{ uri: selfiePhoto }}
                          className="w-full h-full rounded-2xl"
                        />
                      ) : (
                        <Upload size={24} color="#FA5610" />
                      )}
                    </Pressable>
                  </View>
                </View>
              )}
            </Animated.View>
          </ScrollView>

          {/* Footer Buttons */}
          <View className="px-6 py-4 gap-3" style={{ paddingBottom: insets.bottom + 8 }}>
            {currentStep === 'portfolio' && (
              <Pressable
                onPress={handleSavePortfolio}
                disabled={isSavingPortfolio || portfolioItems.length < 5}
                className={`rounded-2xl py-4 items-center flex-row justify-center ${
                  portfolioItems.length < 5 ? 'bg-neutral-700 opacity-50' : 'bg-orange-500'
                }`}
              >
                {isSavingPortfolio ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <>
                    <Text className="text-white font-semibold text-base">Save Portfolio</Text>
                    <ChevronRight size={20} color="#fff" className="ml-2" />
                  </>
                )}
              </Pressable>
            )}

            {currentStep === 'success' && (
              <>
                <Pressable
                  onPress={() => setCurrentStep('verification')}
                  className="bg-orange-500 rounded-2xl py-4 items-center justify-center"
                >
                  <Text className="text-white font-semibold text-base">Get Verified Now</Text>
                </Pressable>

                <Pressable
                  className="border-2 border-orange-500 rounded-2xl py-4 items-center"
                  onPress={() => router.replace('/(talent)')}
                >
                  <Text className="text-orange-500 font-semibold text-base">Skip for now</Text>
                </Pressable>
              </>
            )}

            {currentStep !== 'portfolio' && currentStep !== 'success' && (
              <Pressable
                onPress={handleContinue}
                disabled={isLoading}
                className="bg-orange-500 rounded-2xl py-4 items-center flex-row justify-center"
              >
                {isLoading ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <>
                    <Text className="text-white font-semibold text-base">
                      {currentStep === 'verification' ? 'Submit' : 'Continue'}
                    </Text>
                    {currentStep !== 'verification' && (
                      <ChevronRight size={20} color="#fff" className="ml-2" />
                    )}
                  </>
                )}
              </Pressable>
            )}

            {currentStep === 'verification' && (
              <Pressable
                className="border-2 border-orange-500 rounded-2xl py-4 items-center"
                onPress={async () => {
                  try {
                    // Update user role to talent
                    const { error: roleError } = await supabase.from('user_roles').upsert(
                      { user_id: user?.id, role: 'talent' },
                      { onConflict: 'user_id,role' }
                    );

                    if (roleError) throw roleError;

                    // Navigate to talent dashboard
                    router.replace('/(talent)');
                  } catch (err) {
                    console.error('[talent-setup] Skip verification error:', extractErrorMessage(err));
                    Alert.alert('Error', 'Failed to proceed');
                  }
                }}
              >
                <Text className="text-orange-500 font-semibold">Skip for now</Text>
              </Pressable>
            )}
          </View>
        </KeyboardAvoidingView>
      </LinearGradient>
    </View>
  );
}
