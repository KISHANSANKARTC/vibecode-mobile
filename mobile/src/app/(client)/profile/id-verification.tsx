import { View, Text, ScrollView, Pressable, ActivityIndicator, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from '@/lib/router-helper';
import { ChevronLeft, Upload, Camera, CheckCircle, AlertCircle } from 'lucide-react-native';
import { useState } from 'react';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import { uploadFileToStorage } from '@/helpers/uploadToStorage';
import { useAuthStore } from '@/lib/state/auth-store';
import { LinearGradient } from 'expo-linear-gradient';

const ALLOWED_DOCUMENT_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'application/pdf'];

export default function IDVerificationScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const TITLE = 'ID Verification';

  const [idDocument, setIdDocument] = useState<{ name: string; uri: string; type: string } | null>(null);
  const [selfie, setSelfie] = useState<{ name: string; uri: string; type: string } | null>(null);
  const [isUploadingId, setIsUploadingId] = useState(false);
  const [isUploadingSelfie, setIsUploadingSelfie] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const validateDocumentType = (mimeType: string): boolean => {
    return ALLOWED_DOCUMENT_TYPES.includes(mimeType);
  };

  const handleSelectIDDocument = async () => {
    try {
      setError(null);
      const result = await DocumentPicker.getDocumentAsync({
        type: ALLOWED_DOCUMENT_TYPES,
      });

      if (result.canceled) {
        return;
      }

      const file = result.assets[0];
      const mimeType = file.mimeType || 'image/jpeg'; // Default to JPEG instead of octet-stream


      if (!validateDocumentType(mimeType)) {
        setError('Please upload an image (JPG, PNG, WebP, HEIC) or PDF file');
        return;
      }

      setIdDocument({
        name: file.name,
        uri: file.uri,
        type: mimeType,
      });
      setError(null);
    } catch (err: any) {
      setError(err?.message || 'Failed to select document');
    }
  };

  const handleTakeSelfie = async () => {
    try {
      setError(null);
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        setError('Camera permission is required');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (result.canceled) {
        return;
      }

      const uri = result.assets[0].uri;
      setSelfie({
        name: `selfie-${Date.now()}.jpg`,
        uri,
        type: 'image/jpeg',
      });
      setError(null);
    } catch (err: any) {
      setError(err?.message || 'Failed to take selfie');
    }
  };

  const handleUploadIdDocument = async () => {
    if (!idDocument || !user?.id) {
      setError('Please select a document and ensure you are logged in');
      return;
    }

    try {
      setError(null);
      setIsUploadingId(true);

      // For web, convert URI to File object
      let fileData: File | string = idDocument.uri;

      if (typeof fileData === 'string' && fileData.startsWith('file://')) {
        // For native, keep as URI - uploadFileToStorage will handle it
        fileData = idDocument.uri;
      } else if (typeof fileData === 'string' && (fileData.startsWith('data:') || fileData.startsWith('http'))) {
        // For web File objects passed as data URI or blob URI
        const response = await fetch(fileData);
        const blob = await response.blob();
        fileData = new File([blob], idDocument.name, { type: idDocument.type });
      }

      const fileName = `${user.id}/id-document-${Date.now()}.${idDocument.name.split('.').pop()}`;
      const { publicUrl, error } = await uploadFileToStorage(
        'verifications',
        fileName,
        fileData,
        idDocument.type
      );

      if (error) {
        setError(error);
        return;
      }

      setIdDocument(null);
      Alert.alert('Success', 'ID document uploaded successfully');
    } catch (err: any) {
      setError(err?.message || 'Failed to upload document');
    } finally {
      setIsUploadingId(false);
    }
  };

  const handleUploadSelfie = async () => {
    if (!selfie || !user?.id) {
      setError('Please take a selfie and ensure you are logged in');
      return;
    }

    try {
      setError(null);
      setIsUploadingSelfie(true);

      const fileName = `${user.id}/selfie-${Date.now()}.jpg`;
      const { publicUrl, error } = await uploadFileToStorage(
        'verifications',
        fileName,
        selfie.uri,
        selfie.type
      );

      if (error) {
        setError(error);
        return;
      }

      setSelfie(null);
      Alert.alert('Success', 'Selfie uploaded successfully');
    } catch (err: any) {
      setError(err?.message || 'Failed to upload selfie');
    } finally {
      setIsUploadingSelfie(false);
    }
  };

  return (
    <View className="flex-1 bg-gray-50">
      <View
        className="flex-row items-center px-5 py-4 border-b border-gray-200 bg-white"
        style={{ paddingTop: insets.top }}
      >
        <Pressable onPress={() => router.back()} className="mr-3">
          <ChevronLeft size={24} color="#1F2937" strokeWidth={2} />
        </Pressable>
        <Text className="text-gray-900 text-xl font-semibold">{TITLE}</Text>
      </View>

      <ScrollView className="flex-1 px-5 py-6" contentContainerStyle={{ paddingBottom: 32 }}>
        {/* Error Banner */}
        {error ? (
          <View className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6 flex-row items-start">
            <AlertCircle size={20} color="#DC2626" className="mt-0.5 mr-3" />
            <Text className="flex-1 text-red-800 text-sm font-medium">{error}</Text>
          </View>
        ) : null}

        {/* ID Document Section */}
        <View className="mb-6">
          <Text className="text-gray-900 text-lg font-semibold mb-3">ID Document</Text>
          <Text className="text-gray-600 text-sm mb-4">
            Upload a clear image or PDF of your government-issued ID (passport, driver's license, etc.)
          </Text>

          {idDocument ? (
            <View className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
              <View className="flex-row items-center mb-2">
                <CheckCircle size={20} color="#16A34A" className="mr-2" />
                <Text className="text-green-800 font-medium">{idDocument.name}</Text>
              </View>
              <Pressable
                onPress={handleUploadIdDocument}
                disabled={isUploadingId}
                className="bg-blue-600 rounded-lg py-3 mt-2"
              >
                {isUploadingId ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <Text className="text-white text-center font-semibold">Upload Document</Text>
                )}
              </Pressable>
            </View>
          ) : (
            <Pressable
              onPress={handleSelectIDDocument}
              className="bg-white border-2 border-dashed border-gray-300 rounded-lg py-8 items-center"
            >
              <Upload size={32} color="#9CA3AF" className="mb-2" />
              <Text className="text-gray-600 font-medium">Select ID Document</Text>
              <Text className="text-gray-500 text-xs mt-1">JPG, PNG, WebP, HEIC or PDF</Text>
            </Pressable>
          )}
        </View>

        {/* Selfie Section */}
        <View className="mb-6">
          <Text className="text-gray-900 text-lg font-semibold mb-3">Selfie Verification</Text>
          <Text className="text-gray-600 text-sm mb-4">
            Take a clear selfie with good lighting. Make sure your face is clearly visible.
          </Text>

          {selfie ? (
            <View className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
              <View className="flex-row items-center mb-2">
                <CheckCircle size={20} color="#16A34A" className="mr-2" />
                <Text className="text-green-800 font-medium">{selfie.name}</Text>
              </View>
              <Pressable
                onPress={handleUploadSelfie}
                disabled={isUploadingSelfie}
                className="bg-blue-600 rounded-lg py-3 mt-2"
              >
                {isUploadingSelfie ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <Text className="text-white text-center font-semibold">Upload Selfie</Text>
                )}
              </Pressable>
            </View>
          ) : (
            <Pressable
              onPress={handleTakeSelfie}
              className="bg-white border-2 border-dashed border-gray-300 rounded-lg py-8 items-center"
            >
              <Camera size={32} color="#9CA3AF" className="mb-2" />
              <Text className="text-gray-600 font-medium">Take Selfie</Text>
              <Text className="text-gray-500 text-xs mt-1">Use your front camera</Text>
            </Pressable>
          )}
        </View>

        {/* Info Box */}
        <LinearGradient
          colors={['#EFF6FF', '#DBEAFE']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          className="rounded-lg p-4"
        >
          <Text className="text-blue-900 text-sm font-semibold mb-2">Verification Requirements</Text>
          <Text className="text-blue-800 text-xs leading-5">
            • Your ID must be clear and readable{'\n'}
            • Face must be fully visible in both documents{'\n'}
            • Recent photo with good lighting{'\n'}
            • We use these to prevent fraud and ensure safety
          </Text>
        </LinearGradient>
      </ScrollView>
    </View>
  );
}
