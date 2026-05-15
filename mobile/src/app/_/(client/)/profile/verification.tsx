import {
  View,
  Text,
  ScrollView,
  Pressable,
  ActivityIndicator,
  Image,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import {
  ChevronLeft,
  Shield,
  FileText,
  Building2,
  CheckCircle2,
  Clock,
  AlertCircle,
  BadgeCheck,
  Sparkles,
  Upload,
  X,
} from 'lucide-react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useState, useEffect, useCallback } from 'react';
import { useAuthStore } from '@/lib/state/auth-store';
import { supabase } from '@/lib/supabase';
import * as DocumentPicker from 'expo-document-picker';
import { extractErrorMessage } from '@/lib/errorUtils';

interface CompanyData {
  id: string;
  company_name: string;
}

interface VerificationData {
  id: string;
  status: string;
  trade_license_url: string | null;
  registration_doc_url: string | null;
  notes: string | null;
}

export default function CompanyVerificationScreen() {
  const insets = useSafeAreaInsets();
  const user = useAuthStore((s) => s.user);
  const [loading, setLoading] = useState(true);
  const [company, setCompany] = useState<CompanyData | null>(null);
  const [verification, setVerification] = useState<VerificationData | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [showForm, setShowForm] = useState(true);
  const [selectedFile, setSelectedFile] = useState<{ uri: string; name: string } | null>(null);
  const [selectedRegFile, setSelectedRegFile] = useState<{ uri: string; name: string } | null>(null);
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

        setVerification(verificationData);
        if (verificationData && (verificationData.status === 'pending' || verificationData.status === 'approved')) {
          setShowForm(false);
        }
      } catch (error) {
        console.error('Error fetching data:', extractErrorMessage(error));
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user?.id]);

  const handleFileUpload = useCallback(async (type: string) => {
    try {
      setIsUploading(true);
      const result = await DocumentPicker.getDocumentAsync({
        type: ['image/jpeg', 'image/png', 'application/pdf'],
      });

      if (result.canceled) {
        setIsUploading(false);
        return;
      }

      const file = result.assets[0];
      if (file.size && file.size > 10 * 1024 * 1024) {
        setToastMessage('File size must be less than 10MB');
        setIsUploading(false);
        return;
      }

      if (type === 'trade_license') {
        setSelectedFile({ uri: file.uri, name: file.name });
      } else {
        setSelectedRegFile({ uri: file.uri, name: file.name });
      }
      setToastMessage('File uploaded successfully');
    } catch (error) {
      console.error('Error uploading:', extractErrorMessage(error));
      setToastMessage('Error uploading file');
    } finally {
      setIsUploading(false);
    }
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!selectedFile || !company || !user?.id) {
      setToastMessage('Please upload at least the trade license');
      return;
    }

    try {
      setIsUploading(true);

      const fileExtension = selectedFile.name.split('.').pop() || 'pdf';
      const filePath = `${user.id}/company/${company.id}/trade_license-${Date.now()}.${fileExtension}`;

      const response = await fetch(selectedFile.uri);
      const blob = await response.blob();

      const { error: uploadError } = await supabase.storage
        .from('verifications')
        .upload(filePath, blob, { upsert: true });

      if (uploadError) {
        setToastMessage('Failed to upload file');
        setIsUploading(false);
        return;
      }

      let regDocPath = null;
      if (selectedRegFile) {
        const regExtension = selectedRegFile.name.split('.').pop() || 'pdf';
        regDocPath = `${user.id}/company/${company.id}/registration_doc-${Date.now()}.${regExtension}`;
        const regResponse = await fetch(selectedRegFile.uri);
        const regBlob = await regResponse.blob();
        await supabase.storage.from('verifications').upload(regDocPath, regBlob, { upsert: true });
      }

      if (verification) {
        await supabase
          .from('company_verifications')
          .update({
            trade_license_url: filePath,
            registration_doc_url: regDocPath,
            status: 'pending',
          })
          .eq('id', verification.id);
      } else {
        await supabase.from('company_verifications').insert({
          company_id: company.id,
          trade_license_url: filePath,
          registration_doc_url: regDocPath,
          status: 'pending',
        });
      }

      setToastMessage('Documents submitted for verification');
      setShowForm(false);
      setSelectedFile(null);
      setSelectedRegFile(null);

      const { data: updatedVer } = await supabase
        .from('company_verifications')
        .select('*')
        .eq('company_id', company.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (updatedVer) {
        setVerification(updatedVer);
      }
    } catch (error) {
      console.error('Error submitting:', extractErrorMessage(error));
      setToastMessage('Error submitting documents');
    } finally {
      setIsUploading(false);
    }
  }, [selectedFile, selectedRegFile, company, user?.id, verification]);

  const handleResubmit = useCallback(() => {
    setShowForm(true);
    setSelectedFile(null);
    setSelectedRegFile(null);
  }, []);

  if (loading) {
    return (
      <View className="flex-1 bg-white">
        <View
          className="flex-row items-center px-5 py-4 border-b border-gray-200 bg-white"
          style={{ paddingTop: insets.top }}
        >
          <Pressable onPress={() => router.back()} className="mr-3">
            <ChevronLeft size={24} color="#1F2937" strokeWidth={2} />
          </Pressable>
          <Text className="text-gray-900 text-xl font-semibold">Company Verification</Text>
        </View>
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#F97316" />
        </View>
      </View>
    );
  }

  if (!company) {
    return (
      <View className="flex-1 bg-white">
        <View
          className="flex-row items-center px-5 py-4 border-b border-gray-200 bg-white"
          style={{ paddingTop: insets.top }}
        >
          <Pressable onPress={() => router.back()} className="mr-3">
            <ChevronLeft size={24} color="#1F2937" strokeWidth={2} />
          </Pressable>
          <Text className="text-gray-900 text-xl font-semibold">Company Verification</Text>
        </View>
        <ScrollView className="flex-1 px-5 py-6">
          <View className="items-center">
            <Building2 size={48} color="#D1D5DB" strokeWidth={1.5} />
            <Text className="text-gray-900 text-lg font-semibold mt-4">
              Please set up your company profile first
            </Text>
            <Pressable
              onPress={() => router.push('/(client)/profile/company' as never)}
              className="mt-6 bg-orange-500 rounded-lg px-6 py-3"
            >
              <Text className="text-white font-semibold">Set Up Company</Text>
            </Pressable>
          </View>
        </ScrollView>
      </View>
    );
  }

  const isVerified = verification?.status === 'approved';
  const isPending = verification?.status === 'pending';
  const isRejected = verification?.status === 'rejected';

  return (
    <View className="flex-1 bg-white">
      <View
        className="flex-row items-center px-5 py-4 border-b border-gray-200 bg-white"
        style={{ paddingTop: insets.top }}
      >
        <Pressable onPress={() => router.back()} className="mr-3">
          <ChevronLeft size={24} color="#1F2937" strokeWidth={2} />
        </Pressable>
        <View className="flex-1">
          <Text className="text-gray-900 text-xl font-semibold">Company Verification</Text>
          <Text className="text-gray-500 text-xs mt-1">
            {isVerified ? 'Verified' : 'Upload documents to verify your company'}
          </Text>
        </View>
      </View>

      <ScrollView className="flex-1 px-5 py-6" contentContainerStyle={{ paddingBottom: 112 }}>
        {/* Hero Section */}
        <Animated.View
          entering={FadeInDown.delay(0)}
          className="bg-orange-50 rounded-3xl border border-orange-200 p-6 mb-6 flex-row items-center"
        >
          <View className="w-14 h-14 rounded-2xl bg-orange-200 items-center justify-center mr-4">
            <Shield size={28} color="#F97316" strokeWidth={2} />
          </View>
          <View className="flex-1">
            <Text className="text-gray-900 text-lg font-semibold">
              {isVerified ? 'Company Verified!' : 'Verify Your Company'}
            </Text>
            <Text className="text-gray-600 text-xs mt-1">
              {isVerified
                ? 'Your company has been verified. You can now book talent with confidence.'
                : 'Upload your trade license to unlock all platform features and build trust with creatives.'}
            </Text>
          </View>
        </Animated.View>

        {/* Status Banners */}
        {isVerified ? (
          <Animated.View
            entering={FadeInDown.delay(100)}
            className="bg-green-50 border border-green-200 rounded-2xl p-5 mb-6 flex-row items-center"
          >
            <View className="w-12 h-12 rounded-full bg-green-200 items-center justify-center mr-4">
              <BadgeCheck size={24} color="#22C55E" strokeWidth={2} />
            </View>
            <View className="flex-1">
              <Text className="text-green-900 font-semibold text-sm">Verified</Text>
              <Text className="text-green-800 text-xs mt-0.5">
                Your company has been verified. Talents can trust your profile.
              </Text>
            </View>
          </Animated.View>
        ) : null}

        {isPending ? (
          <Animated.View
            entering={FadeInDown.delay(100)}
            className="bg-amber-50 border border-amber-200 rounded-2xl p-5 mb-6 flex-row items-center"
          >
            <View className="w-12 h-12 rounded-full bg-amber-200 items-center justify-center mr-4">
              <Clock size={24} color="#F59E0B" strokeWidth={2} />
            </View>
            <View className="flex-1">
              <Text className="text-amber-900 font-semibold text-sm">Verification Pending</Text>
              <Text className="text-amber-800 text-xs mt-0.5">
                Your documents are under review. We'll notify you once verified.
              </Text>
            </View>
          </Animated.View>
        ) : null}

        {isRejected ? (
          <Animated.View
            entering={FadeInDown.delay(100)}
            className="bg-red-50 border border-red-200 rounded-2xl p-5 mb-6"
          >
            <View className="flex-row items-center mb-3">
              <View className="w-12 h-12 rounded-full bg-red-200 items-center justify-center mr-4">
                <AlertCircle size={24} color="#EF4444" strokeWidth={2} />
              </View>
              <View className="flex-1">
                <Text className="text-red-900 font-semibold text-sm">Verification Rejected</Text>
                <Text className="text-red-800 text-xs mt-0.5">
                  Please review the feedback and submit new documents.
                </Text>
              </View>
            </View>
            {verification?.notes ? (
              <View className="bg-red-100 rounded-lg p-3 mt-3">
                <Text className="text-red-900 text-xs font-semibold">Admin Notes:</Text>
                <Text className="text-red-900 text-xs mt-1">{verification.notes}</Text>
              </View>
            ) : null}
            {!showForm ? (
              <Pressable
                onPress={handleResubmit}
                className="mt-4 border border-red-500 rounded-lg py-3 items-center"
              >
                <Text className="text-red-600 font-semibold text-sm">Submit New Documents</Text>
              </Pressable>
            ) : null}
          </Animated.View>
        ) : null}

        {/* Why Verify Card */}
        <Animated.View
          entering={FadeInDown.delay(200)}
          className="bg-white rounded-2xl border border-gray-200 p-5 mb-6 overflow-hidden"
        >
          <View className="h-px bg-orange-500 mb-4" />
          <View className="flex-row items-center mb-4">
            <Sparkles size={20} color="#F97316" strokeWidth={2} />
            <Text className="text-gray-900 font-semibold text-sm ml-2">Why Verify Your Company?</Text>
          </View>

          {[
            'Book verified talent with confidence',
            'Access premium features and priority support',
            'Build trust with creatives on the platform',
            'Unlock advanced booking and payment tools',
          ].map((item, index) => (
            <View key={index} className="flex-row items-center mb-3">
              <CheckCircle2 size={18} color="#22C55E" strokeWidth={2} />
              <Text className="text-gray-700 text-xs ml-2 flex-1">{item}</Text>
            </View>
          ))}
        </Animated.View>

        {/* Upload Form */}
        {showForm && !isVerified ? (
          <>
            {/* Trade License Card */}
            <Animated.View
              entering={FadeInDown.delay(300)}
              className="bg-white rounded-2xl border border-gray-200 p-5 mb-4 overflow-hidden"
            >
              <View className="flex-row items-center justify-between mb-4">
                <View className="flex-row items-center flex-1">
                  <View
                    className="w-12 h-12 rounded-2xl items-center justify-center mr-3"
                    style={{ backgroundColor: 'rgba(249, 115, 22, 0.1)' }}
                  >
                    <FileText size={22} color="#F97316" strokeWidth={1.5} />
                  </View>
                  <View>
                    <View className="flex-row items-center">
                      <Text className="text-gray-900 font-semibold text-sm">Trade License</Text>
                      <View className="ml-2 bg-red-100 rounded-full px-2 py-0.5">
                        <Text className="text-red-600 text-xs font-medium">Required</Text>
                      </View>
                    </View>
                  </View>
                </View>
                {selectedFile ? (
                  <View className="bg-green-100 rounded-full px-2 py-1">
                    <Text className="text-green-600 text-xs font-medium">Ready</Text>
                  </View>
                ) : null}
              </View>

              {selectedFile ? (
                <View className="relative mb-3">
                  <Image
                    source={{ uri: selectedFile.uri }}
                    className="w-full h-40 rounded-xl bg-gray-100"
                    resizeMode="cover"
                  />
                  <Pressable
                    onPress={() => setSelectedFile(null)}
                    className="absolute top-2 right-2 bg-black/50 rounded-full p-2"
                  >
                    <X size={16} color="white" strokeWidth={2} />
                  </Pressable>
                </View>
              ) : (
                <Pressable
                  onPress={() => handleFileUpload('trade_license')}
                  disabled={isUploading}
                  className="border-2 border-dashed border-gray-300 rounded-xl p-8 items-center mb-3 bg-gray-50"
                  style={{ opacity: isUploading ? 0.5 : 1 }}
                >
                  <View className="w-14 h-14 rounded-2xl bg-gray-200 items-center justify-center mb-2">
                    <Upload size={24} color="#6B7280" strokeWidth={1.5} />
                  </View>
                  <Text className="text-gray-900 font-medium text-sm">Upload Trade License</Text>
                  <Text className="text-gray-500 text-xs mt-1">PDF, JPG, PNG up to 10MB</Text>
                </Pressable>
              )}
            </Animated.View>

            {/* Registration Doc Card */}
            <Animated.View
              entering={FadeInDown.delay(400)}
              className="bg-white rounded-2xl border border-gray-200 p-5 mb-6 overflow-hidden"
            >
              <View className="flex-row items-center justify-between mb-4">
                <View className="flex-row items-center flex-1">
                  <View
                    className="w-12 h-12 rounded-2xl items-center justify-center mr-3"
                    style={{ backgroundColor: 'rgba(107, 114, 128, 0.1)' }}
                  >
                    <Building2 size={22} color="#6B7280" strokeWidth={1.5} />
                  </View>
                  <View>
                    <View className="flex-row items-center">
                      <Text className="text-gray-900 font-semibold text-sm">Registration Document</Text>
                      <View className="ml-2 bg-gray-200 rounded-full px-2 py-0.5">
                        <Text className="text-gray-600 text-xs font-medium">Optional</Text>
                      </View>
                    </View>
                  </View>
                </View>
                {selectedRegFile ? (
                  <View className="bg-green-100 rounded-full px-2 py-1">
                    <Text className="text-green-600 text-xs font-medium">Ready</Text>
                  </View>
                ) : null}
              </View>

              {selectedRegFile ? (
                <View className="relative mb-3">
                  <Image
                    source={{ uri: selectedRegFile.uri }}
                    className="w-full h-40 rounded-xl bg-gray-100"
                    resizeMode="cover"
                  />
                  <Pressable
                    onPress={() => setSelectedRegFile(null)}
                    className="absolute top-2 right-2 bg-black/50 rounded-full p-2"
                  >
                    <X size={16} color="white" strokeWidth={2} />
                  </Pressable>
                </View>
              ) : (
                <Pressable
                  onPress={() => handleFileUpload('registration_doc')}
                  disabled={isUploading}
                  className="border-2 border-dashed border-gray-300 rounded-xl p-8 items-center bg-gray-50"
                  style={{ opacity: isUploading ? 0.5 : 1 }}
                >
                  <View className="w-14 h-14 rounded-2xl bg-gray-200 items-center justify-center mb-2">
                    <Upload size={24} color="#6B7280" strokeWidth={1.5} />
                  </View>
                  <Text className="text-gray-900 font-medium text-sm">Upload Registration Doc</Text>
                  <Text className="text-gray-500 text-xs mt-1">PDF, JPG, PNG up to 10MB</Text>
                </Pressable>
              )}
            </Animated.View>

            {/* Submit Button */}
            <Animated.View entering={FadeInDown.delay(500)}>
              <Pressable
                onPress={handleSubmit}
                disabled={!selectedFile || isUploading}
                className="bg-orange-500 rounded-xl py-3 items-center mb-3"
                style={{ opacity: !selectedFile || isUploading ? 0.5 : 1 }}
              >
                {isUploading ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <Text className="text-white font-bold text-base">
                    {isRejected ? 'Resubmit for Verification' : 'Submit for Verification'}
                  </Text>
                )}
              </Pressable>
              <Text className="text-gray-500 text-xs text-center">
                Verification usually takes 1-3 business hours
              </Text>
            </Animated.View>
          </>
        ) : null}

        {/* Toast Message */}
        {toastMessage ? (
          <View className="bg-green-50 border border-green-200 rounded-lg p-4 flex-row items-center mt-4">
            <CheckCircle2 size={20} color="#22C55E" />
            <Text className="text-green-700 text-sm font-medium ml-2 flex-1">{toastMessage}</Text>
          </View>
        ) : null}
      </ScrollView>
    </View>
  );
}
