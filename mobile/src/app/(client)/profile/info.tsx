import { View, Text, ScrollView, Pressable, TextInput, Alert, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from '@/lib/router-helper';
import { ChevronLeft, Building2, ChevronDown, Save } from 'lucide-react-native';
import { useState, useEffect } from 'react';
import { useAuthStore } from '@/lib/state/auth-store';
import { supabase } from '@/lib/supabase';

const COUNTRIES = [
  { id: 'uae', name: 'United Arab Emirates', code: 'AE', currency: 'AED', currencySymbol: 'د.إ' },
  { id: 'saudi', name: 'Saudi Arabia', code: 'SA', currency: 'SAR', currencySymbol: '﷼' },
  { id: 'qatar', name: 'Qatar', code: 'QA', currency: 'QAR', currencySymbol: '﷼' },
  { id: 'bahrain', name: 'Bahrain', code: 'BH', currency: 'BHD', currencySymbol: '.د.ب' },
  { id: 'kuwait', name: 'Kuwait', code: 'KW', currency: 'KWD', currencySymbol: 'د.ك' },
  { id: 'oman', name: 'Oman', code: 'OM', currency: 'OMR', currencySymbol: '﷼' },
  { id: 'jordan', name: 'Jordan', code: 'JO', currency: 'JOD', currencySymbol: 'د.ا' },
  { id: 'lebanon', name: 'Lebanon', code: 'LB', currency: 'LBP', currencySymbol: 'ل.ل' },
  { id: 'egypt', name: 'Egypt', code: 'EG', currency: 'EGP', currencySymbol: 'ج.م' },
  { id: 'iraq', name: 'Iraq', code: 'IQ', currency: 'IQD', currencySymbol: 'ع.د' },
  { id: 'uk', name: 'United Kingdom', code: 'GB', currency: 'GBP', currencySymbol: '£' },
  { id: 'usa', name: 'United States', code: 'US', currency: 'USD', currencySymbol: '$' },
  { id: 'india', name: 'India', code: 'IN', currency: 'INR', currencySymbol: '₹' },
];

const INDUSTRIES = [
  { id: 'fashion', label: 'Fashion' },
  { id: 'advertising', label: 'Advertising' },
  { id: 'ecommerce', label: 'E-commerce' },
  { id: 'events', label: 'Events' },
  { id: 'media', label: 'Media' },
  { id: 'marketing', label: 'Marketing' },
  { id: 'creative_agency', label: 'Creative Agency' },
  { id: 'production_house', label: 'Production House' },
  { id: 'other', label: 'Other' },
];

export default function MyInfoScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user } = useAuthStore();

  const [accountType, setAccountType] = useState<'Individual' | 'Organization'>('Individual');
  const [isOrganization, setIsOrganization] = useState(false);
  const [name, setName] = useState('');
  const [countryId, setCountryId] = useState('');
  const [industryId, setIndustryId] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      if (!user?.id) {
        setLoading(false);
        return;
      }

      try {
        // Fetch company data
        const { data: companyData } = await supabase
          .from('client_companies')
          .select('*')
          .eq('user_id', user.id)
          .maybeSingle();

        // Fetch profile data
        const { data: profileData } = await supabase
          .from('profiles')
          .select('full_name')
          .eq('id', user.id)
          .maybeSingle();

        if (companyData) {
          const isOrg = companyData.account_type === 'organization';
          setIsOrganization(isOrg);
          setAccountType(isOrg ? 'Organization' : 'Individual');
          setName(companyData.company_name || profileData?.full_name || '');
          setCountryId(companyData.country || '');
          setIndustryId(companyData.industry || '');
        } else {
          setName(profileData?.full_name || '');
          setAccountType('Individual');
          setIsOrganization(false);
        }
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : typeof error === 'string' ? error : 'Error loading profile';
        console.error('Error loading profile:', errorMsg);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [user?.id]);

  const selectedCountry = COUNTRIES.find((c) => c.id === countryId);
  const selectedIndustry = INDUSTRIES.find((ind) => ind.id === industryId);

  const handleCountrySelect = () => {
    const options: Array<{ text: string; onPress: () => void }> = COUNTRIES.map((country) => ({
      text: `${country.code} ${country.name}`,
      onPress: () => setCountryId(country.id),
    }));
    options.push({ text: 'Cancel', onPress: () => {} });

    Alert.alert('Select Country', '', options as any);
  };

  const handleIndustrySelect = () => {
    const options: Array<{ text: string; onPress: () => void }> = INDUSTRIES.map((industry) => ({
      text: industry.label,
      onPress: () => setIndustryId(industry.id),
    }));
    options.push({ text: 'Cancel', onPress: () => {} });

    Alert.alert('Select Industry', '', options as any);
  };

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert('Validation', 'Please enter a name');
      return;
    }

    if (!user?.id) {
      Alert.alert('Error', 'User not authenticated');
      return;
    }

    setIsSaving(true);
    try {
      const currency = selectedCountry?.currency || 'AED';

      await supabase
        .from('client_companies')
        .upsert({
          user_id: user.id,
          company_name: name,
          country: countryId,
          industry: industryId,
          currency: currency,
          account_type: isOrganization ? 'organization' : 'individual',
        });

      Alert.alert('Success', 'Profile updated successfully');
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : typeof error === 'string' ? error : 'Failed to save';
      console.error('Save error:', errorMsg);
      Alert.alert('Error', errorMsg);
    } finally {
      setIsSaving(false);
    }
  };

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center" style={{ backgroundColor: '#F8F8F8' }}>
        <ActivityIndicator size="large" color="#F97316" />
      </View>
    );
  }

  return (
    <View className="flex-1" style={{ backgroundColor: '#F8F8F8' }}>
      {/* Header */}
      <View
        className="flex-row items-center px-5 py-4 border-b border-gray-200 bg-white"
        style={{ paddingTop: insets.top }}
      >
        <Pressable onPress={() => router.back()} className="mr-3">
          <ChevronLeft size={24} color="#1F2937" strokeWidth={2} />
        </Pressable>
        <Text className="text-gray-900 text-2xl font-bold">My Info</Text>
      </View>

      <ScrollView className="flex-1" showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 120 }}>
        {/* Account Type Card */}
        <View className="mx-5 mt-6 bg-white rounded-2xl p-6 border border-gray-200">
          <View className="flex-row items-start justify-between">
            <View className="flex-1">
              <Text className="text-gray-900 text-lg font-bold mb-1">Account Type</Text>
              <Text className="text-gray-600 text-sm">
                {isOrganization
                  ? 'You signed up as an organization/company.'
                  : 'You signed up as an individual.'}
              </Text>
            </View>
            <View className="ml-3 flex-row items-center gap-2 px-3 py-1.5 bg-gray-100 rounded-lg">
              <Building2 size={16} color="#374151" />
              <Text className="text-gray-900 text-sm font-bold">
                {isOrganization ? 'Organization' : 'Individual'}
              </Text>
            </View>
          </View>
        </View>

        {/* Profile Info Card */}
        <View className="mx-5 mt-6 bg-white rounded-2xl p-6 border border-gray-200">
          <Text className="text-gray-900 text-lg font-bold mb-6">Profile Info</Text>

          {/* Company Name */}
          <View className="mb-6">
            <Text className="text-gray-900 font-bold mb-2">
              {isOrganization ? 'Company Name' : 'Full Name'}
            </Text>
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder={isOrganization ? 'Company Name' : 'Full Name'}
              className="border border-gray-300 rounded-xl px-4 py-3 bg-gray-50 text-gray-900"
              editable={!isSaving}
            />
          </View>

          {/* Country */}
          <View className="mb-6">
            <Text className="text-gray-900 font-bold mb-2">Country</Text>
            <Pressable
              onPress={handleCountrySelect}
              className="border border-gray-300 rounded-xl px-4 py-3 bg-gray-50 flex-row items-center justify-between"
            >
              <Text className={selectedCountry ? 'text-gray-900 font-medium' : 'text-gray-400'}>
                {selectedCountry ? `${selectedCountry.code} ${selectedCountry.name}` : 'Select country...'}
              </Text>
              <ChevronDown size={20} color="#9CA3AF" />
            </Pressable>
            {selectedCountry ? (
              <Text className="text-orange-500 text-xs mt-2">
                Currency: {selectedCountry.currency} ({selectedCountry.currencySymbol})
              </Text>
            ) : null}
          </View>

          {/* Industry - Chip Selection */}
          <View className="mb-6">
            <View className="flex-row items-center mb-3">
              <Text className="text-gray-900 font-bold">Industry</Text>
              {!isOrganization && <Text className="text-gray-500 ml-1">(optional)</Text>}
            </View>
            <View className="flex-row flex-wrap gap-2">
              {INDUSTRIES.map((industry) => {
                const isSelected = industryId === industry.id;
                return (
                  <Pressable
                    key={industry.id}
                    onPress={() => setIndustryId(isSelected ? '' : industry.id)}
                    className={`px-4 py-2 rounded-full ${
                      isSelected
                        ? 'bg-orange-500'
                        : 'bg-gray-100 border border-gray-300'
                    }`}
                  >
                    <Text
                      className={`font-bold text-sm ${
                        isSelected ? 'text-white' : 'text-gray-900'
                      }`}
                    >
                      {industry.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Save Button - Fixed at Bottom */}
      <View className="absolute bottom-0 left-0 right-0 px-5" style={{ paddingBottom: insets.bottom + 8 }}>
        <Pressable
          onPress={handleSave}
          disabled={isSaving}
          className="bg-gray-900 rounded-full py-4 flex-row items-center justify-center gap-2"
          style={{ opacity: isSaving ? 0.7 : 1 }}
        >
          <Save size={20} color="white" />
          {isSaving ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text className="text-white font-bold text-lg">Save Changes</Text>
          )}
        </Pressable>
      </View>
    </View>
  );
}
