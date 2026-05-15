import {
  View,
  Text,
  ScrollView,
  Pressable,
  TextInput,
  Image,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from '@/lib/router-helper';
import {
  ChevronLeft,
  Building,
  Camera,
  Check,
  ChevronDown,
} from 'lucide-react-native';
import { useState, useEffect, useCallback } from 'react';
import { useAuthStore } from '@/lib/state/auth-store';
import { supabase } from '@/lib/supabase';
import * as DocumentPicker from 'expo-document-picker';
import { uploadFileToStorage, getContentType } from '@/helpers/uploadToStorage';
import { extractErrorMessage } from '@/lib/errorUtils';

interface FormData {
  company_name: string;
  industry: string;
  vat_number: string;
  billing_address: string;
  logo_url: string | null;
}

const INDUSTRY_OPTIONS = [
  { id: 'fashion', label: 'Fashion & Apparel' },
  { id: 'advertising', label: 'Advertising' },
  { id: 'ecommerce', label: 'E-commerce' },
  { id: 'events', label: 'Events' },
  { id: 'media', label: 'Media' },
  { id: 'hospitality', label: 'Hospitality' },
  { id: 'real_estate', label: 'Real Estate' },
  { id: 'technology', label: 'Technology' },
  { id: 'food_beverage', label: 'Food & Beverage' },
  { id: 'entertainment', label: 'Entertainment' },
  { id: 'healthcare', label: 'Healthcare' },
  { id: 'finance', label: 'Finance' },
  { id: 'marketing', label: 'Marketing' },
  { id: 'creative_agency', label: 'Creative Agency' },
  { id: 'production_house', label: 'Production House' },
  { id: 'other', label: 'Other' },
];

export default function CompanyProfileScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);

  const [formData, setFormData] = useState<FormData>({
    company_name: '',
    industry: '',
    vat_number: '',
    billing_address: '',
    logo_url: null,
  });

  // Fetch company data on load
  useEffect(() => {
    const fetchCompanyData = async () => {
      if (!user?.id) {
        setLoading(false);
        return;
      }

      try {
        const { data: company, error } = await supabase
          .from('client_companies')
          .select('*')
          .eq('user_id', user.id)
          .maybeSingle();

        if (error) {
          console.error('Error fetching company:', extractErrorMessage(error));
        } else if (company) {
          setFormData({
            company_name: company.company_name || '',
            industry: company.industry || '',
            vat_number: company.vat_number || '',
            billing_address: company.billing_address || '',
            logo_url: company.logo_url || null,
          });
        }
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : typeof error === 'string' ? error : 'Error fetching company data';
        console.error('Error fetching company data:', errorMsg);
      } finally {
        setLoading(false);
      }
    };

    fetchCompanyData();
  }, [user?.id]);

  const handleLogoUpload = useCallback(async () => {
    if (!user?.id) return;

    try {
      setUploading(true);

      const result = await DocumentPicker.getDocumentAsync({
        type: ['image/jpeg', 'image/png', 'image/webp'],
      });

      if (result.canceled) {
        setUploading(false);
        return;
      }

      const file = result.assets[0];
      const fileSize = file.size || 0;

      // Validate file size (5MB)
      if (fileSize > 5 * 1024 * 1024) {
        setToastMessage('File size must be less than 5MB');
        setUploading(false);
        return;
      }

      // Get file extension
      const fileExtension = file.name.split('.').pop()?.toLowerCase() || 'jpg';
      const fileName = `${user.id}/company-logo.${fileExtension}`;
      const contentType = file.mimeType || getContentType(fileExtension, false);

      console.log('[company] Uploading logo:', { fileName, uri: file.uri, mimeType: file.mimeType });

      // Upload using the helper
      const { publicUrl, error } = await uploadFileToStorage(
        'avatars',
        fileName,
        file.uri,
        contentType,
        { upsert: true }
      );

      if (error) {
        console.error('[company] Upload error:', extractErrorMessage(error));
        setToastMessage('Failed to upload logo');
        setUploading(false);
        return;
      }

      if (!publicUrl) {
        setToastMessage('Failed to upload logo');
        setUploading(false);
        return;
      }

      console.log('[company] Logo uploaded successfully:', publicUrl);

      // Update form state with new logo URL
      setFormData((prev) => ({
        ...prev,
        logo_url: publicUrl,
      }));

      setToastMessage('Logo uploaded successfully');
    } catch (err) {
      const errorMsg = extractErrorMessage(err);
      console.error('Error uploading logo:', errorMsg);
      setToastMessage('Error uploading logo');
    } finally {
      setUploading(false);
    }
  }, [user?.id]);

  const handleSave = useCallback(async () => {
    if (!user?.id) return;

    if (!formData.company_name.trim()) {
      setToastMessage('Company name is required');
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase
        .from('client_companies')
        .update({
          company_name: formData.company_name,
          industry: formData.industry,
          vat_number: formData.vat_number || null,
          billing_address: formData.billing_address || null,
          logo_url: formData.logo_url,
        })
        .eq('user_id', user.id);

      if (error) {
        console.error('Error saving company:', extractErrorMessage(error));
        setToastMessage('Failed to save changes');
      } else {
        setToastMessage('Company profile updated');
      }
    } catch (err) {
      const errorMsg = extractErrorMessage(err);
      console.error('Error saving company:', errorMsg);
      setToastMessage('Error saving changes');
    } finally {
      setSaving(false);
    }
  }, [user?.id, formData]);

  const selectedIndustryLabel = INDUSTRY_OPTIONS.find(
    (opt) => opt.id === formData.industry
  )?.label;

  if (loading) {
    return (
      <View className="flex-1 bg-[#F8F8F8] items-center justify-center">
        <ActivityIndicator size="large" color="#F97316" />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-[#F8F8F8]">
      {/* Header */}
      <View
        className="flex-row items-center px-5 py-4 border-b border-gray-200 bg-white"
        style={{ paddingTop: insets.top }}
      >
        <Pressable onPress={() => router.back()} className="mr-3">
          <ChevronLeft size={24} color="#1F2937" strokeWidth={2} />
        </Pressable>
        <Text className="text-gray-900 text-xl font-semibold">
          Company Profile
        </Text>
      </View>

      <ScrollView
        className="flex-1 px-5 py-6"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 120 }}
        scrollEnabled={!showDropdown}
      >
        {/* Logo and Company Info Card */}
        <View className="bg-white rounded-2xl p-6 border border-gray-200 mb-6 items-center">
          {/* Logo Upload Area */}
          <Pressable
            onPress={handleLogoUpload}
            disabled={uploading}
            className="relative mb-4"
          >
            <View
              className="w-20 h-20 rounded-xl items-center justify-center bg-gray-100 border-2 border-gray-200"
              style={{ opacity: uploading ? 0.5 : 1 }}
            >
              {formData.logo_url ? (
                <Image
                  source={{ uri: formData.logo_url }}
                  className="w-full h-full rounded-xl"
                  resizeMode="cover"
                />
              ) : (
                <Building size={32} color="#9CA3AF" strokeWidth={1.5} />
              )}
            </View>

            {/* Camera Overlay */}
            <View
              className="absolute bottom-0 right-0 w-7 h-7 rounded-full bg-orange-500 items-center justify-center"
              style={{
                borderWidth: 2,
                borderColor: '#FFFFFF',
              }}
            >
              <Camera size={14} color="#FFFFFF" strokeWidth={2} />
            </View>

            {uploading ? (
              <View className="absolute inset-0 items-center justify-center rounded-xl bg-black/20">
                <ActivityIndicator size="small" color="#F97316" />
              </View>
            ) : null}
          </Pressable>

          {/* Company Name */}
          <Text className="text-gray-900 text-lg font-semibold mt-2">
            {formData.company_name || 'Your Company'}
          </Text>

          {/* Industry Label */}
          <Text className="text-gray-500 text-sm mt-1">
            {selectedIndustryLabel || 'Add your industry'}
          </Text>
        </View>

        {/* Form Card */}
        <View className="bg-white rounded-2xl p-4 border border-gray-200 mb-6">
          {/* Company Name Field */}
          <View className="mb-4">
            <Text className="text-gray-600 text-sm font-medium mb-2">
              Company Name *
            </Text>
            <TextInput
              value={formData.company_name}
              onChangeText={(text) =>
                setFormData((prev) => ({ ...prev, company_name: text }))
              }
              placeholder="Acme Inc."
              editable={!saving && !uploading}
              className="border border-gray-300 rounded-xl px-4 py-3 bg-white text-gray-900"
              placeholderTextColor="#9CA3AF"
            />
          </View>

          {/* Industry Dropdown */}
          <View className="mb-4" style={{ zIndex: showDropdown ? 1000 : 0 }}>
            <Text className="text-gray-600 text-sm font-medium mb-2">
              Industry
            </Text>
            <View style={{ position: 'relative' }}>
              <Pressable
                onPress={() => setShowDropdown(!showDropdown)}
                className="border border-gray-300 rounded-lg px-4 py-3 bg-white flex-row items-center justify-between active:bg-gray-50"
              >
                <Text
                  className={
                    formData.industry
                      ? 'text-gray-900 text-base'
                      : 'text-gray-400 text-base'
                  }
                >
                  {selectedIndustryLabel || 'Select industry'}
                </Text>
                <ChevronDown
                  size={20}
                  color="#6B7280"
                  strokeWidth={2}
                />
              </Pressable>

              {/* Dropdown Menu */}
              {showDropdown ? (
                <View
                  style={{
                    position: 'absolute',
                    top: 56,
                    left: 0,
                    right: 0,
                    backgroundColor: '#FFFFFF',
                    borderRadius: 8,
                    borderWidth: 1,
                    borderColor: '#D1D5DB',
                    maxHeight: 300,
                    zIndex: 9999,
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 4 },
                    shadowOpacity: 0.15,
                    shadowRadius: 12,
                    elevation: 50,
                  }}
                >
                  <ScrollView scrollEnabled nestedScrollEnabled showsVerticalScrollIndicator={true}>
                    {INDUSTRY_OPTIONS.map((option) => (
                      <Pressable
                        key={option.id}
                        onPress={() => {
                          setFormData((prev) => ({
                            ...prev,
                            industry: option.id,
                          }));
                          setShowDropdown(false);
                        }}
                        style={{
                          paddingHorizontal: 12,
                          paddingVertical: 10,
                          flexDirection: 'row',
                          alignItems: 'center',
                          backgroundColor: formData.industry === option.id ? '#FEF3F2' : '#FFFFFF',
                        }}
                      >
                        <View style={{ flex: 1 }}>
                          <Text
                            style={{
                              fontSize: 14,
                              color: formData.industry === option.id ? '#F97316' : '#374151',
                              fontWeight: formData.industry === option.id ? '600' : '400',
                            }}
                          >
                            {option.label}
                          </Text>
                        </View>
                        {formData.industry === option.id ? (
                          <View style={{ marginLeft: 8 }}>
                            <Check size={18} color="#F97316" strokeWidth={2.5} />
                          </View>
                        ) : null}
                      </Pressable>
                    ))}
                  </ScrollView>
                </View>
              ) : null}
            </View>
          </View>

          {/* VAT Number Field */}
          <View className="mb-4">
            <Text className="text-gray-600 text-sm font-medium mb-2">
              VAT / Tax Number
            </Text>
            <TextInput
              value={formData.vat_number}
              onChangeText={(text) =>
                setFormData((prev) => ({ ...prev, vat_number: text }))
              }
              placeholder="VAT123456789"
              editable={!saving && !uploading}
              className="border border-gray-300 rounded-lg px-4 py-3 bg-white text-gray-900"
              placeholderTextColor="#9CA3AF"
            />
          </View>

          {/* Billing Address Field */}
          <View className="mb-6">
            <Text className="text-gray-600 text-sm font-medium mb-2">
              Billing Address
            </Text>
            <TextInput
              value={formData.billing_address}
              onChangeText={(text) =>
                setFormData((prev) => ({ ...prev, billing_address: text }))
              }
              placeholder="123 Main Street, City, Country"
              editable={!saving && !uploading}
              multiline
              numberOfLines={3}
              className="border border-gray-300 rounded-lg px-4 py-3 bg-white text-gray-900"
              placeholderTextColor="#9CA3AF"
              textAlignVertical="top"
            />
          </View>

          {/* Save Button */}
          <Pressable
            onPress={handleSave}
            disabled={saving || uploading || !formData.company_name.trim()}
            className="bg-orange-500 rounded-lg py-3 items-center justify-center flex-row"
            style={{ opacity: saving || uploading ? 0.6 : 1 }}
          >
            {saving ? (
              <ActivityIndicator color="white" />
            ) : (
              <>
                <Check size={20} color="white" strokeWidth={2} />
                <Text className="text-white font-semibold ml-2">
                  Save Changes
                </Text>
              </>
            )}
          </Pressable>
        </View>

        {/* Toast Message */}
        {toastMessage ? (
          <View className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4 flex-row items-center">
            <Check size={20} color="#22C55E" />
            <Text className="text-green-700 text-sm font-medium ml-2">
              {toastMessage}
            </Text>
          </View>
        ) : null}
      </ScrollView>
    </View>
  );
}
