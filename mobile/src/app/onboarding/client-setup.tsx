import { useState, useEffect } from 'react';
import {
  View,
  Text,
  Pressable,
  ScrollView,
  ActivityIndicator,
  Alert,
  Image,
} from 'react-native';
import { useRouter } from '@/lib/router-helper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import {
  Upload,
  Camera,
  CheckCircle,
  Shield,
  ChevronRight,
  ChevronLeft,
  X,
  IdCard,
  Building2,
  CircleCheck,
} from 'lucide-react-native';
import Animated, { FadeInDown, FadeInRight, FadeOutLeft } from 'react-native-reanimated';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import { useAuthStore } from '@/lib/state/auth-store';
import { supabase } from '@/lib/supabase';
import { uploadFileToStorage } from '@/helpers/uploadToStorage';
import { extractErrorMessage } from '@/lib/errorUtils';

type ScreenView = 'selection' | 'id-verification' | 'trade-license';

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'application/pdf'];

interface FileData {
  name: string;
  uri: string;
  type: string;
}

export default function ClientSetupScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const user = useAuthStore((s) => s.user);

  const [screen, setScreen] = useState<ScreenView>('selection');
  const [userName, setUserName] = useState<string>('');

  // ID Verification state
  const [idDocument, setIdDocument] = useState<FileData | null>(null);
  const [selfie, setSelfie] = useState<FileData | null>(null);
  const [isSubmittingId, setIsSubmittingId] = useState(false);

  // Trade License state
  const [tradeLicense, setTradeLicense] = useState<FileData | null>(null);
  const [isSubmittingTrade, setIsSubmittingTrade] = useState(false);
  const [companyId, setCompanyId] = useState<string | null>(null);

  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const name = user?.user_metadata?.full_name || user?.email?.split('@')[0] || '';
    setUserName(name);

    // Fetch company ID for trade license flow
    if (user?.id) {
      supabase
        .from('client_companies')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle()
        .then(({ data }) => {
          if (data?.id) setCompanyId(data.id);
        });
    }
  }, [user?.id, user?.user_metadata?.full_name, user?.email]);

  // --- File Picking ---
  const pickDocument = async (): Promise<FileData | null> => {
    try {
      setError(null);
      const result = await DocumentPicker.getDocumentAsync({ type: ALLOWED_TYPES });
      if (result.canceled) return null;

      const file = result.assets[0];
      if ((file.size || 0) > 10 * 1024 * 1024) {
        setError('File size must be less than 10MB');
        return null;
      }

      const mimeType = file.mimeType || 'image/jpeg';
      if (!ALLOWED_TYPES.includes(mimeType)) {
        setError('Please upload an image or PDF file');
        return null;
      }

      return { name: file.name, uri: file.uri, type: mimeType };
    } catch (err) {
      setError(extractErrorMessage(err));
      return null;
    }
  };

  const takePhoto = async (): Promise<FileData | null> => {
    try {
      setError(null);
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        setError('Camera permission is required');
        return null;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        quality: 0.8,
      });

      if (result.canceled) return null;
      const asset = result.assets[0];
      return {
        name: `photo-${Date.now()}.jpg`,
        uri: asset.uri,
        type: 'image/jpeg',
      };
    } catch (err) {
      setError(extractErrorMessage(err));
      return null;
    }
  };

  const takeSelfie = async (): Promise<FileData | null> => {
    try {
      setError(null);
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        setError('Camera permission is required');
        return null;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
        cameraType: ImagePicker.CameraType.front,
      });

      if (result.canceled) return null;
      const asset = result.assets[0];
      return {
        name: `selfie-${Date.now()}.jpg`,
        uri: asset.uri,
        type: 'image/jpeg',
      };
    } catch (err) {
      setError(extractErrorMessage(err));
      return null;
    }
  };

  // --- Submissions ---
  const handleSubmitIdVerification = async () => {
    if (!idDocument || !user?.id) return;
    setIsSubmittingId(true);
    setError(null);

    try {
      const ts = Date.now();
      const idExt = idDocument.name.split('.').pop()?.toLowerCase() || 'jpg';
      const idPath = `${user.id}/client/id-${ts}.${idExt}`;

      const { error: idUploadErr } = await uploadFileToStorage(
        'verifications', idPath, idDocument.uri, idDocument.type,
      );
      if (idUploadErr) { setError(idUploadErr); setIsSubmittingId(false); return; }

      let selfiePath: string | null = null;
      if (selfie) {
        const selfieName = `${user.id}/client/selfie-${ts}.jpg`;
        const { error: selfieErr } = await uploadFileToStorage(
          'verifications', selfieName, selfie.uri, selfie.type,
        );
        if (!selfieErr) selfiePath = selfieName;
      }

      // Insert into client_verifications
      await supabase.from('client_verifications').insert({
        user_id: user.id,
        id_document_url: idPath,
        selfie_url: selfiePath,
        status: 'pending',
      });

      Alert.alert('Verification Submitted', 'Your ID verification has been submitted for review.', [
        { text: 'Continue', onPress: () => router.replace('/(client)') },
      ]);
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setIsSubmittingId(false);
    }
  };

  const handleSubmitTradeLicense = async () => {
    if (!tradeLicense || !user?.id) return;
    setIsSubmittingTrade(true);
    setError(null);

    try {
      const ts = Date.now();
      const ext = tradeLicense.name.split('.').pop()?.toLowerCase() || 'pdf';
      const cid = companyId || 'unknown';
      const filePath = `${user.id}/company/${cid}/trade_license-${ts}.${ext}`;

      const { error: uploadErr } = await uploadFileToStorage(
        'verifications', filePath, tradeLicense.uri, tradeLicense.type,
      );
      if (uploadErr) { setError(uploadErr); setIsSubmittingTrade(false); return; }

      if (companyId) {
        // Check for existing verification
        const { data: existing } = await supabase
          .from('company_verifications')
          .select('id')
          .eq('company_id', companyId)
          .maybeSingle();

        if (existing?.id) {
          await supabase.from('company_verifications')
            .update({ trade_license_url: filePath, status: 'pending' })
            .eq('id', existing.id);
        } else {
          await supabase.from('company_verifications').insert({
            company_id: companyId,
            trade_license_url: filePath,
            status: 'pending',
          });
        }
      }

      Alert.alert('Verification Submitted', 'Your trade license has been submitted for review.', [
        { text: 'Continue', onPress: () => router.replace('/(client)') },
      ]);
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setIsSubmittingTrade(false);
    }
  };

  const handleSkip = () => {
    Alert.alert(
      'Skip Verification',
      'You can verify later from your profile settings. Continue without verification?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Continue', onPress: () => router.replace('/(client)') },
      ]
    );
  };

  // ─────────── SCREEN: Selection ───────────
  if (screen === 'selection') {
    return (
      <View className="flex-1" style={{ backgroundColor: '#121212' }}>
        <LinearGradient
          colors={['rgba(250, 86, 16, 0.08)', 'rgba(18, 18, 18, 1)', 'rgba(18, 18, 18, 1)']}
          style={{ flex: 1 }}
        >
          <ScrollView
            contentContainerStyle={{
              flexGrow: 1,
              paddingTop: insets.top + 40,
              paddingBottom: insets.bottom + 32,
              paddingHorizontal: 24,
            }}
            showsVerticalScrollIndicator={false}
          >
            {/* Shield Icon */}
            <Animated.View entering={FadeInDown.delay(100).duration(500)} className="items-center mb-6">
              <View
                className="w-16 h-16 rounded-2xl items-center justify-center"
                style={{ backgroundColor: '#FA5610' }}
              >
                <Shield size={32} color="#FFFFFF" strokeWidth={1.8} />
              </View>
            </Animated.View>

            {/* Title */}
            <Animated.View entering={FadeInDown.delay(150).duration(500)} className="items-center mb-8">
              <Text className="text-white text-center mb-2" style={{ fontSize: 26, fontWeight: '700' }}>
                Verify Your Account
              </Text>
              <Text className="text-neutral-500 text-center text-sm">
                Hey {userName || 'there'}, choose how you'd like to verify
              </Text>
            </Animated.View>

            {/* Why Verify Card */}
            <Animated.View entering={FadeInDown.delay(200).duration(500)} className="mb-6">
              <View
                className="rounded-2xl p-5"
                style={{ backgroundColor: '#1C1C1C', borderWidth: 1, borderColor: '#2A2A2A' }}
              >
                <Text className="text-white text-base mb-4" style={{ fontWeight: '700' }}>
                  Why verify?
                </Text>
                <View className="mb-3 flex-row items-start">
                  <CircleCheck size={18} color="#22C55E" strokeWidth={2} style={{ marginTop: 1 }} />
                  <Text className="text-neutral-300 text-sm ml-3 flex-1 leading-5">
                    Build trust with talent and get faster responses
                  </Text>
                </View>
                <View className="mb-3 flex-row items-start">
                  <CircleCheck size={18} color="#22C55E" strokeWidth={2} style={{ marginTop: 1 }} />
                  <Text className="text-neutral-300 text-sm ml-3 flex-1 leading-5">
                    Unlock all platform features
                  </Text>
                </View>
                <View className="flex-row items-start">
                  <CircleCheck size={18} color="#22C55E" strokeWidth={2} style={{ marginTop: 1 }} />
                  <Text className="text-neutral-300 text-sm ml-3 flex-1 leading-5">
                    Verified badge on your profile
                  </Text>
                </View>
              </View>
            </Animated.View>

            {/* ID Verification Card */}
            <Animated.View entering={FadeInDown.delay(300).duration(500)} className="mb-3">
              <Pressable
                onPress={() => { setScreen('id-verification'); setError(null); }}
                className="rounded-2xl p-5 flex-row items-center"
                style={{ backgroundColor: '#1C1C1C', borderWidth: 1, borderColor: '#2A2A2A' }}
              >
                <View
                  className="w-11 h-11 rounded-xl items-center justify-center mr-4"
                  style={{ backgroundColor: 'rgba(250, 86, 16, 0.12)' }}
                >
                  <IdCard size={22} color="#FA5610" strokeWidth={1.8} />
                </View>
                <View className="flex-1">
                  <Text className="text-white text-base" style={{ fontWeight: '600' }}>
                    ID Verification
                  </Text>
                  <Text className="text-neutral-500 text-xs mt-1">
                    ID, Passport + Selfie
                  </Text>
                </View>
                <ChevronRight size={20} color="#666" strokeWidth={1.5} />
              </Pressable>
            </Animated.View>

            {/* Trade License Card */}
            <Animated.View entering={FadeInDown.delay(400).duration(500)} className="mb-8">
              <Pressable
                onPress={() => { setScreen('trade-license'); setError(null); }}
                className="rounded-2xl p-5 flex-row items-center"
                style={{ backgroundColor: '#1C1C1C', borderWidth: 1, borderColor: '#2A2A2A' }}
              >
                <View
                  className="w-11 h-11 rounded-xl items-center justify-center mr-4"
                  style={{ backgroundColor: 'rgba(250, 86, 16, 0.12)' }}
                >
                  <Building2 size={22} color="#FA5610" strokeWidth={1.8} />
                </View>
                <View className="flex-1">
                  <Text className="text-white text-base" style={{ fontWeight: '600' }}>
                    Trade License
                  </Text>
                  <Text className="text-neutral-500 text-xs mt-1">
                    Official business license document
                  </Text>
                </View>
                <ChevronRight size={20} color="#666" strokeWidth={1.5} />
              </Pressable>
            </Animated.View>

            {/* Spacer */}
            <View className="flex-1" />

            {/* Skip */}
            <Animated.View entering={FadeInDown.delay(500).duration(500)} className="items-center">
              <Pressable onPress={handleSkip} className="py-3 px-6">
                <Text className="text-neutral-500 text-sm">Skip for now</Text>
              </Pressable>
            </Animated.View>
          </ScrollView>
        </LinearGradient>
      </View>
    );
  }

  // ─────────── SCREEN: ID Verification ───────────
  if (screen === 'id-verification') {
    return (
      <View className="flex-1" style={{ backgroundColor: '#121212' }}>
        <ScrollView
          contentContainerStyle={{
            flexGrow: 1,
            paddingTop: insets.top + 16,
            paddingBottom: insets.bottom + 32,
            paddingHorizontal: 24,
          }}
          showsVerticalScrollIndicator={false}
        >
          {/* Back */}
          <Pressable
            onPress={() => { setScreen('selection'); setError(null); }}
            className="flex-row items-center mb-6"
          >
            <ChevronLeft size={22} color="#FFFFFF" strokeWidth={2} />
            <Text className="text-white ml-1 text-sm">Back</Text>
          </Pressable>

          {/* Title */}
          <Animated.View entering={FadeInRight.delay(50).duration(400)} className="mb-8">
            <Text className="text-white text-xl" style={{ fontWeight: '700' }}>
              ID Verification
            </Text>
            <Text className="text-neutral-500 text-sm mt-2 leading-5">
              Upload a clear image of your government-issued ID and take a selfie for verification.
            </Text>
          </Animated.View>

          {/* Government ID Section */}
          <Animated.View entering={FadeInRight.delay(100).duration(400)} className="mb-6">
            <Text className="text-white text-base mb-3" style={{ fontWeight: '600' }}>
              Government ID
            </Text>

            {idDocument ? (
              <View
                className="rounded-2xl p-4"
                style={{ backgroundColor: 'rgba(34, 197, 94, 0.08)', borderWidth: 1, borderColor: 'rgba(34, 197, 94, 0.2)' }}
              >
                {idDocument.type.startsWith('image/') ? (
                  <Image
                    source={{ uri: idDocument.uri }}
                    style={{ width: '100%', height: 160, borderRadius: 12, marginBottom: 12 }}
                    resizeMode="cover"
                    onError={() => {}}
                  />
                ) : null}
                <View className="flex-row items-center">
                  <CheckCircle size={18} color="#22C55E" />
                  <Text className="text-green-400 text-sm flex-1 ml-2" numberOfLines={1}>
                    {idDocument.name}
                  </Text>
                  <Pressable onPress={() => setIdDocument(null)} className="p-1">
                    <X size={18} color="#9CA3AF" />
                  </Pressable>
                </View>
              </View>
            ) : (
              <View>
                <Pressable
                  onPress={async () => {
                    const file = await pickDocument();
                    if (file) setIdDocument(file);
                  }}
                  className="rounded-2xl py-8 items-center"
                  style={{
                    borderWidth: 2,
                    borderStyle: 'dashed',
                    borderColor: '#333',
                    backgroundColor: 'rgba(255, 255, 255, 0.02)',
                  }}
                >
                  <Upload size={28} color="#666" strokeWidth={1.5} />
                  <Text className="text-neutral-300 text-sm mt-3" style={{ fontWeight: '500' }}>
                    Upload Document
                  </Text>
                  <Text className="text-neutral-600 text-xs mt-1">
                    JPG, PNG, HEIC, or PDF (max 10MB)
                  </Text>
                </Pressable>

                <Pressable
                  onPress={async () => {
                    const file = await takePhoto();
                    if (file) setIdDocument(file);
                  }}
                  className="flex-row items-center justify-center mt-3 py-3 rounded-xl"
                  style={{ backgroundColor: 'rgba(255, 255, 255, 0.04)' }}
                >
                  <Camera size={18} color="#888" strokeWidth={1.5} />
                  <Text className="text-neutral-400 text-sm ml-2">Take a Photo Instead</Text>
                </Pressable>
              </View>
            )}
          </Animated.View>

          {/* Selfie Section */}
          <Animated.View entering={FadeInRight.delay(200).duration(400)} className="mb-6">
            <Text className="text-white text-base mb-3" style={{ fontWeight: '600' }}>
              Selfie
            </Text>

            {selfie ? (
              <View
                className="rounded-2xl p-4"
                style={{ backgroundColor: 'rgba(34, 197, 94, 0.08)', borderWidth: 1, borderColor: 'rgba(34, 197, 94, 0.2)' }}
              >
                <Image
                  source={{ uri: selfie.uri }}
                  style={{ width: 80, height: 80, borderRadius: 40, alignSelf: 'center', marginBottom: 12 }}
                  onError={() => {}}
                />
                <View className="flex-row items-center">
                  <CheckCircle size={18} color="#22C55E" />
                  <Text className="text-green-400 text-sm flex-1 ml-2" numberOfLines={1}>
                    {selfie.name}
                  </Text>
                  <Pressable onPress={() => setSelfie(null)} className="p-1">
                    <X size={18} color="#9CA3AF" />
                  </Pressable>
                </View>
              </View>
            ) : (
              <Pressable
                onPress={async () => {
                  const file = await takeSelfie();
                  if (file) setSelfie(file);
                }}
                className="rounded-2xl py-8 items-center"
                style={{
                  borderWidth: 2,
                  borderStyle: 'dashed',
                  borderColor: '#333',
                  backgroundColor: 'rgba(255, 255, 255, 0.02)',
                }}
              >
                <Camera size={28} color="#666" strokeWidth={1.5} />
                <Text className="text-neutral-300 text-sm mt-3" style={{ fontWeight: '500' }}>
                  Take a Selfie
                </Text>
                <Text className="text-neutral-600 text-xs mt-1">
                  Use your front camera
                </Text>
              </Pressable>
            )}
          </Animated.View>

          {/* Error */}
          {error ? (
            <View
              className="rounded-xl p-3 mb-4"
              style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', borderWidth: 1, borderColor: 'rgba(239, 68, 68, 0.2)' }}
            >
              <Text className="text-red-400 text-sm">{error}</Text>
            </View>
          ) : null}

          {/* Spacer */}
          <View className="flex-1" />

          {/* Submit Button */}
          <Pressable
            onPress={handleSubmitIdVerification}
            disabled={!idDocument || isSubmittingId}
            className="w-full py-4 rounded-2xl items-center justify-center"
            style={{
              backgroundColor: idDocument ? '#FA5610' : 'rgba(255, 255, 255, 0.06)',
              opacity: isSubmittingId ? 0.7 : 1,
            }}
          >
            {isSubmittingId ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <Text
                className="text-base"
                style={{
                  fontWeight: '600',
                  color: idDocument ? '#FFFFFF' : 'rgba(255, 255, 255, 0.3)',
                }}
              >
                Submit for Verification
              </Text>
            )}
          </Pressable>
        </ScrollView>
      </View>
    );
  }

  // ─────────── SCREEN: Trade License ───────────
  return (
    <View className="flex-1" style={{ backgroundColor: '#121212' }}>
      <ScrollView
        contentContainerStyle={{
          flexGrow: 1,
          paddingTop: insets.top + 16,
          paddingBottom: insets.bottom + 32,
          paddingHorizontal: 24,
        }}
        showsVerticalScrollIndicator={false}
      >
        {/* Back */}
        <Pressable
          onPress={() => { setScreen('selection'); setError(null); }}
          className="flex-row items-center mb-6"
        >
          <ChevronLeft size={22} color="#FFFFFF" strokeWidth={2} />
          <Text className="text-white ml-1 text-sm">Back</Text>
        </Pressable>

        {/* Title */}
        <Animated.View entering={FadeInRight.delay(50).duration(400)} className="mb-8">
          <Text className="text-white text-xl" style={{ fontWeight: '700' }}>
            Trade License Verification
          </Text>
          <Text className="text-neutral-500 text-sm mt-2 leading-5">
            Upload your official trade license document for business verification.
          </Text>
        </Animated.View>

        {/* Trade License Upload */}
        <Animated.View entering={FadeInRight.delay(100).duration(400)} className="mb-6">
          <Text className="text-white text-base mb-3" style={{ fontWeight: '600' }}>
            Trade License Document
          </Text>

          {tradeLicense ? (
            <View
              className="rounded-2xl p-4"
              style={{ backgroundColor: 'rgba(34, 197, 94, 0.08)', borderWidth: 1, borderColor: 'rgba(34, 197, 94, 0.2)' }}
            >
              {tradeLicense.type.startsWith('image/') ? (
                <Image
                  source={{ uri: tradeLicense.uri }}
                  style={{ width: '100%', height: 160, borderRadius: 12, marginBottom: 12 }}
                  resizeMode="cover"
                  onError={() => {}}
                />
              ) : null}
              <View className="flex-row items-center">
                <CheckCircle size={18} color="#22C55E" />
                <Text className="text-green-400 text-sm flex-1 ml-2" numberOfLines={1}>
                  {tradeLicense.name}
                </Text>
                <Pressable onPress={() => setTradeLicense(null)} className="p-1">
                  <X size={18} color="#9CA3AF" />
                </Pressable>
              </View>
            </View>
          ) : (
            <Pressable
              onPress={async () => {
                const file = await pickDocument();
                if (file) setTradeLicense(file);
              }}
              className="rounded-2xl py-10 items-center"
              style={{
                borderWidth: 2,
                borderStyle: 'dashed',
                borderColor: '#333',
                backgroundColor: 'rgba(255, 255, 255, 0.02)',
              }}
            >
              <Upload size={32} color="#666" strokeWidth={1.5} />
              <Text className="text-neutral-300 text-sm mt-3" style={{ fontWeight: '500' }}>
                Upload Document
              </Text>
              <Text className="text-neutral-600 text-xs mt-1">
                JPG, PNG, or PDF (max 10MB)
              </Text>
            </Pressable>
          )}
        </Animated.View>

        {/* Error */}
        {error ? (
          <View
            className="rounded-xl p-3 mb-4"
            style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', borderWidth: 1, borderColor: 'rgba(239, 68, 68, 0.2)' }}
          >
            <Text className="text-red-400 text-sm">{error}</Text>
          </View>
        ) : null}

        {/* Spacer */}
        <View className="flex-1" />

        {/* Submit Button */}
        <Pressable
          onPress={handleSubmitTradeLicense}
          disabled={!tradeLicense || isSubmittingTrade}
          className="w-full py-4 rounded-2xl items-center justify-center"
          style={{
            backgroundColor: tradeLicense ? '#FA5610' : 'rgba(255, 255, 255, 0.06)',
            opacity: isSubmittingTrade ? 0.7 : 1,
          }}
        >
          {isSubmittingTrade ? (
            <ActivityIndicator color="#FFFFFF" size="small" />
          ) : (
            <Text
              className="text-base"
              style={{
                fontWeight: '600',
                color: tradeLicense ? '#FFFFFF' : 'rgba(255, 255, 255, 0.3)',
              }}
            >
              Submit for Verification
            </Text>
          )}
        </Pressable>
      </ScrollView>
    </View>
  );
}
