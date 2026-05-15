import {
  View,
  Text,
  ScrollView,
  Pressable,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from '@/lib/router-helper';
import {
  ChevronLeft,
  Shield,
  Clock,
  CheckCircle,
  AlertCircle,
  Upload,
  X,
} from 'lucide-react-native';
import { useState, useEffect, useCallback } from 'react';
import { useAuthStore } from '@/lib/state/auth-store';
import { supabase } from '@/lib/supabase';
import * as DocumentPicker from 'expo-document-picker';
import { uploadFileToStorage, getContentType } from '@/helpers/uploadToStorage';
import { extractErrorMessage } from '@/lib/errorUtils';

interface CompanyData {
  id: string;
  company_name: string;
}

interface VerificationData {
  id: string;
  status: string;
  trade_license_url: string | null;
  notes: string | null;
  created_at: string;
}

export default function CompanyVerificationScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [company, setCompany] = useState<CompanyData | null>(null);
  const [verification, setVerification] = useState<VerificationData | null>(null);
  const [selectedFile, setSelectedFile] = useState<{ uri: string; name: string } | null>(null);
  const [toastMessage, setToastMessage] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      if (!user?.id) {
        setLoading(false);
        return;
      }

      try {
        const { data: companyData } = await supabase
          .from('client_companies')
          .select('id, company_name')
          .eq('user_id', user.id)
          .maybeSingle();

        if (!companyData) {
          setCompany(null);
          setLoading(false);
          return;
        }

        setCompany(companyData);

        const { data: verificationData } = await supabase
          .from('company_verifications')
          .select('*')
          .eq('company_id', companyData.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        setVerification(verificationData || null);
      } catch (err) {
        const errorMsg = extractErrorMessage(err);
        console.error('Error fetching data:', errorMsg);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user?.id]);

  const handleUpload = useCallback(async () => {
    try {
      setUploading(true);

      const result = await DocumentPicker.getDocumentAsync({
        type: ['image/jpeg', 'image/png', 'application/pdf'],
      });

      if (result.canceled) {
        setUploading(false);
        return;
      }

      const file = result.assets[0];
      const fileSize = file.size || 0;

      if (fileSize > 10 * 1024 * 1024) {
        setToastMessage('File size must be less than 10MB');
        setUploading(false);
        return;
      }

      setSelectedFile({ uri: file.uri, name: file.name });
      setUploading(false);
    } catch (err) {
      const errorMsg = extractErrorMessage(err);
      console.error('Error selecting file:', errorMsg);
      setToastMessage('Error selecting file');
      setUploading(false);
    }
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!user?.id || !company || !selectedFile) return;

    try {
      setUploading(true);

      const fileExtension = selectedFile.name.split('.').pop()?.toLowerCase() || 'pdf';
      const timestamp = Date.now();
      const fileName = `${user.id}/company/${company.id}/trade_license-${timestamp}.${fileExtension}`;
      const contentType = getContentType(fileExtension, false);

      console.log('[verification] Uploading trade license:', { fileName, uri: selectedFile.uri });

      const { publicUrl, error } = await uploadFileToStorage(
        'verifications',
        fileName,
        selectedFile.uri,
        contentType,
        { upsert: true }
      );

      if (error) {
        setToastMessage('Failed to upload file');
        setUploading(false);
        return;
      }

      console.log('[verification] File uploaded successfully:', publicUrl);

      if (verification) {
        await supabase
          .from('company_verifications')
          .update({
            trade_license_url: fileName,
            status: 'pending',
          })
          .eq('id', verification.id);
      } else {
        await supabase.from('company_verifications').insert({
          company_id: company.id,
          trade_license_url: fileName,
          status: 'pending',
        });
      }

      setSelectedFile(null);
      setToastMessage('Submitted for verification');

      const { data: updatedVer } = await supabase
        .from('company_verifications')
        .select('*')
        .eq('company_id', company.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      setVerification(updatedVer || null);
    } catch (err) {
      const errorMsg = extractErrorMessage(err);
      console.error('[verification] Error submitting:', errorMsg);
      setToastMessage('Error submitting for verification');
    } finally {
      setUploading(false);
    }
  }, [user?.id, company, selectedFile, verification]);

  if (loading) {
    return (
      <View className="flex-1 bg-[#F8F8F8] items-center justify-center">
        <ActivityIndicator size="large" color="#F97316" />
      </View>
    );
  }

  if (!company) {
    return (
      <View className="flex-1 bg-[#F8F8F8]">
        <View
          className="flex-row items-center px-5 py-4 border-b border-gray-200 bg-white"
          style={{ paddingTop: insets.top }}
        >
          <Pressable onPress={() => router.back()} className="mr-3">
            <ChevronLeft size={24} color="#1F2937" strokeWidth={2} />
          </Pressable>
          <Text className="text-gray-900 text-xl font-semibold">
            Company Verification
          </Text>
        </View>

        <ScrollView className="flex-1 px-5 py-6" contentContainerStyle={{ paddingBottom: 120 }}>
          <View className="bg-white rounded-2xl p-6 border border-gray-200 items-center">
            <AlertCircle size={48} color="#EF4444" strokeWidth={1.5} />
            <Text className="text-gray-900 text-lg font-semibold mt-4">
              Company Profile Required
            </Text>
            <Text className="text-gray-600 text-center text-sm mt-2 mb-6">
              Please set up your company profile first to proceed with verification.
            </Text>
            <Pressable
              onPress={() => router.push('/(client)/profile/company' as never)}
              className="bg-orange-500 rounded-lg px-6 py-3"
            >
              <Text className="text-white font-semibold">Go to Company Profile</Text>
            </Pressable>
          </View>
        </ScrollView>
      </View>
    );
  }

  const currentStatus = verification?.status || 'not_submitted';

  return (
    <View className="flex-1 bg-[#F8F8F8]">
      <View
        className="flex-row items-center px-5 py-4 border-b border-gray-200 bg-white"
        style={{ paddingTop: insets.top }}
      >
        <Pressable onPress={() => router.back()} className="mr-3">
          <ChevronLeft size={24} color="#1F2937" strokeWidth={2} />
        </Pressable>
        <Text className="text-gray-900 text-xl font-semibold">
          Company Verification
        </Text>
      </View>

      <ScrollView className="flex-1 px-5 py-6" contentContainerStyle={{ paddingBottom: 120 }}>
        {currentStatus === 'not_submitted' ? (
          <View className="bg-white rounded-2xl p-6 border border-gray-200 items-center mb-6">
            <Shield size={48} color="#F97316" strokeWidth={1.5} />
            <Text className="text-gray-900 text-lg font-semibold mt-4">
              Verify Your Company
            </Text>
            <Text className="text-gray-600 text-center text-sm mt-2 mb-6">
              Upload your trade license to verify your company and unlock all platform features.
            </Text>

            <Pressable
              onPress={handleUpload}
              disabled={uploading}
              className="w-full border-2 border-dashed border-gray-300 rounded-lg p-8 items-center bg-gray-50 mb-4"
              style={{ opacity: uploading ? 0.5 : 1 }}
            >
              {uploading ? (
                <ActivityIndicator color="#F97316" />
              ) : (
                <>
                  <Upload size={32} color="#9CA3AF" strokeWidth={1.5} />
                  <Text className="text-gray-600 text-sm font-medium mt-2">
                    Tap to upload file
                  </Text>
                  <Text className="text-gray-400 text-xs mt-1">
                    JPG, PNG, or PDF up to 10MB
                  </Text>
                </>
              )}
            </Pressable>

            {selectedFile ? (
              <View className="w-full bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4 flex-row items-center">
                <View className="flex-1">
                  <Text className="text-blue-900 font-medium">{selectedFile.name}</Text>
                </View>
                <Pressable onPress={() => setSelectedFile(null)}>
                  <X size={20} color="#0EA5E9" />
                </Pressable>
              </View>
            ) : null}

            <Pressable
              onPress={handleSubmit}
              disabled={!selectedFile || uploading}
              className="w-full bg-orange-500 rounded-lg py-3 items-center"
              style={{ opacity: !selectedFile || uploading ? 0.5 : 1 }}
            >
              <Text className="text-white font-semibold">Submit for Verification</Text>
            </Pressable>
          </View>
        ) : null}

        {currentStatus === 'pending' ? (
          <View className="bg-white rounded-2xl p-6 border border-gray-200 items-center mb-6">
            <Clock size={48} color="#FBBF24" strokeWidth={1.5} />
            <Text className="text-gray-900 text-lg font-semibold mt-4">
              Verification In Review
            </Text>
            <Text className="text-gray-600 text-center text-sm mt-2">
              Your documents are being reviewed. This usually takes 1-3 business hours.
            </Text>
            {verification?.created_at ? (
              <Text className="text-gray-500 text-xs mt-4">
                Submitted: {new Date(verification.created_at).toLocaleDateString()}
              </Text>
            ) : null}
          </View>
        ) : null}

        {currentStatus === 'approved' ? (
          <>
            {/* Hero Section */}
            <View className="bg-gradient-to-b from-green-50 to-white rounded-3xl p-6 border border-green-200 items-center mb-6 overflow-hidden">
              <View className="absolute top-0 right-0 w-32 h-32 bg-green-100 rounded-full opacity-50" />
              <View className="absolute bottom-0 left-0 w-24 h-24 bg-green-100 rounded-full opacity-30" />

              <View className="relative z-10 items-center">
                <View className="w-16 h-16 rounded-full bg-green-100 items-center justify-center mb-4">
                  <CheckCircle size={40} color="#16A34A" strokeWidth={2.5} />
                </View>
                <Text className="text-gray-900 text-2xl font-bold text-center">
                  Company Verified
                </Text>
                <View className="mt-3 px-4 py-1.5 rounded-full bg-green-100">
                  <Text className="text-green-700 text-xs font-semibold tracking-wide">
                    VERIFIED
                  </Text>
                </View>
                <Text className="text-gray-600 text-center text-sm mt-4 leading-5">
                  Your company has been verified successfully. You now have access to all platform features.
                </Text>
              </View>
            </View>

            {/* Benefits Section */}
            <View className="mb-6">
              <Text className="text-gray-900 text-sm font-semibold mb-3">
                Verified Benefits
              </Text>
              <View className="space-y-2">
                <View className="bg-white rounded-xl p-4 border border-green-100 flex-row items-start">
                  <View className="w-5 h-5 rounded-full bg-green-100 items-center justify-center mr-3 mt-0.5">
                    <Text className="text-green-700 text-xs font-bold">✓</Text>
                  </View>
                  <View className="flex-1">
                    <Text className="text-gray-900 font-medium text-sm">
                      Increased Credibility
                    </Text>
                    <Text className="text-gray-500 text-xs mt-1">
                      Stand out with verified badge on your profile
                    </Text>
                  </View>
                </View>

                <View className="bg-white rounded-xl p-4 border border-green-100 flex-row items-start">
                  <View className="w-5 h-5 rounded-full bg-green-100 items-center justify-center mr-3 mt-0.5">
                    <Text className="text-green-700 text-xs font-bold">✓</Text>
                  </View>
                  <View className="flex-1">
                    <Text className="text-gray-900 font-medium text-sm">
                      Priority Support
                    </Text>
                    <Text className="text-gray-500 text-xs mt-1">
                      Access to dedicated support team
                    </Text>
                  </View>
                </View>

                <View className="bg-white rounded-xl p-4 border border-green-100 flex-row items-start">
                  <View className="w-5 h-5 rounded-full bg-green-100 items-center justify-center mr-3 mt-0.5">
                    <Text className="text-green-700 text-xs font-bold">✓</Text>
                  </View>
                  <View className="flex-1">
                    <Text className="text-gray-900 font-medium text-sm">
                      Premium Features
                    </Text>
                    <Text className="text-gray-500 text-xs mt-1">
                      Unlock exclusive tools and analytics
                    </Text>
                  </View>
                </View>
              </View>
            </View>

            {/* Verification Info */}
            <View className="bg-white rounded-2xl p-4 border border-gray-200 mb-6">
              {verification?.created_at ? (
                <View>
                  <Text className="text-gray-600 text-xs font-medium uppercase tracking-wide mb-2">
                    Verification Date
                  </Text>
                  <Text className="text-gray-900 font-semibold">
                    {new Date(verification.created_at).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </Text>
                </View>
              ) : null}
            </View>

            {/* Action Button */}
            <Pressable
              onPress={() => router.push('/(client)/profile/company' as never)}
              className="w-full bg-green-500 rounded-xl py-3 items-center mb-4"
            >
              <Text className="text-white font-semibold">
                View Company Profile
              </Text>
            </Pressable>
          </>
        ) : null}

        {currentStatus === 'rejected' ? (
          <View className="bg-white rounded-2xl p-6 border border-gray-200 items-center mb-6">
            <AlertCircle size={48} color="#EF4444" strokeWidth={1.5} />
            <Text className="text-gray-900 text-lg font-semibold mt-4">
              Verification Rejected
            </Text>
            {verification?.notes ? (
              <Text className="text-gray-600 text-center text-sm mt-2">
                {verification.notes}
              </Text>
            ) : null}
            <Pressable
              onPress={handleUpload}
              className="mt-6 bg-orange-500 rounded-lg px-6 py-3"
            >
              <Text className="text-white font-semibold">Re-upload Document</Text>
            </Pressable>
          </View>
        ) : null}

        {toastMessage ? (
          <View className="bg-green-50 border border-green-200 rounded-lg p-4 flex-row items-center">
            <CheckCircle size={20} color="#22C55E" />
            <Text className="text-green-700 text-sm font-medium ml-2">{toastMessage}</Text>
          </View>
        ) : null}
      </ScrollView>
    </View>
  );
}
