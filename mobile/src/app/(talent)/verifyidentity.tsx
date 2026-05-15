import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  Image,
  ActivityIndicator,
  Pressable,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useTheme } from '@/lib/theme/ThemeContext';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/lib/state/auth-store';
import { SkeletonLoader } from '@/components/SkeletonLoader';
import { extractErrorMessage } from '@/lib/errorUtils';

// ─────── Types ───────
interface DocumentData {
  url: string | null;
  storagePath: string | null;
  status: 'not_submitted' | 'pending' | 'approved' | 'rejected';
}

interface VerificationRecord {
  id: string;
  status: 'pending' | 'approved' | 'rejected';
  notes?: string | null;
  created_at: string;
  updated_at: string;
  id_document_url?: string | null;
  selfie_url?: string | null;
}

interface TalentProfile {
  id: string;
  display_name: string | null;
  is_verified: boolean;
}

// ─────── Timeout Helper ───────
const withTimeout = async <T,>(p: PromiseLike<T>, ms = 12000): Promise<T> =>
  Promise.race([
    Promise.resolve(p),
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('Request timeout')), ms)
    ),
  ]);

// ─────── URL Resolution Helper for Admin Preview ───────
function resolvePreviewUrl(value: string | null): string | null {
  if (!value) return null;
  if (value.startsWith('http')) return value; // external URL, use directly
  return null; // local storage path will use signed URL
}

// ─────── Error Normalization Helper ───────
function getErrorMessage(err: any): string {
  if (!err) return 'Unknown error';
  if (typeof err === 'string') return err;
  if (err.message) return err.message;
  if (err.error?.message) return err.error.message;
  if (err.details) return err.details;
  return 'Unknown error';
}

// ─────── Status Banner Components ───────
function VerifiedBanner({ isDark = false }: { isDark?: boolean }) {
  return (
    <View style={{ paddingHorizontal: 16, marginBottom: 24, marginTop: 16 }}>
      <View
        style={{
          backgroundColor: isDark ? 'rgba(16, 185, 129, 0.1)' : '#f0fdf4',
          borderWidth: 1,
          borderColor: isDark ? 'rgba(16, 185, 129, 0.2)' : '#dcfce7',
          borderRadius: 16,
          padding: 16,
          flexDirection: 'row',
          gap: 12,
          alignItems: 'flex-start',
        }}
      >
        <View
          style={{
            width: 40,
            height: 40,
            borderRadius: 20,
            backgroundColor: isDark ? 'rgba(16, 185, 129, 0.2)' : '#dcfce7',
            justifyContent: 'center',
            alignItems: 'center',
          }}
        >
          <Ionicons name="shield-checkmark" size={22} color="#10b981" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 15, fontWeight: '600', color: '#10b981', marginBottom: 4 }}>
            Verified Profile
          </Text>
          <Text style={{ fontSize: 13, color: isDark ? '#34d399' : '#047857' }}>
            Your identity has been verified. Clients can trust your profile.
          </Text>
        </View>
      </View>
    </View>
  );
}

function PendingBanner({ isDark = false }: { isDark?: boolean }) {
  return (
    <View style={{ paddingHorizontal: 16, marginBottom: 24, marginTop: 16 }}>
      <View
        style={{
          backgroundColor: isDark ? 'rgba(245, 158, 11, 0.1)' : '#fffbeb',
          borderWidth: 1,
          borderColor: isDark ? 'rgba(245, 158, 11, 0.2)' : '#fef08a',
          borderRadius: 16,
          padding: 16,
          flexDirection: 'row',
          gap: 12,
          alignItems: 'flex-start',
        }}
      >
        <View
          style={{
            width: 40,
            height: 40,
            borderRadius: 20,
            backgroundColor: isDark ? 'rgba(245, 158, 11, 0.2)' : '#fef08a',
            justifyContent: 'center',
            alignItems: 'center',
          }}
        >
          <Ionicons name="time-outline" size={22} color="#f59e0b" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 15, fontWeight: '600', color: '#f59e0b', marginBottom: 4 }}>
            Under Review
          </Text>
          <Text style={{ fontSize: 13, color: isDark ? '#fbbf24' : '#b45309' }}>
            Your verification documents are being reviewed. This usually takes up to 3 hours.
          </Text>
        </View>
      </View>
    </View>
  );
}

function RejectedBanner({ notes, onResubmit, isDark = false }: { notes?: string | null; onResubmit: () => void; isDark?: boolean }) {
  return (
    <View style={{ paddingHorizontal: 16, marginBottom: 24, marginTop: 16 }}>
      <View
        style={{
          backgroundColor: isDark ? 'rgba(239, 68, 68, 0.1)' : '#fef2f2',
          borderWidth: 1,
          borderColor: isDark ? 'rgba(239, 68, 68, 0.2)' : '#fee2e2',
          borderRadius: 16,
          padding: 16,
        }}
      >
        <View style={{ flexDirection: 'row', gap: 12, marginBottom: 12, alignItems: 'flex-start' }}>
          <View
            style={{
              width: 40,
              height: 40,
              borderRadius: 20,
              backgroundColor: isDark ? 'rgba(239, 68, 68, 0.2)' : '#fee2e2',
              justifyContent: 'center',
              alignItems: 'center',
            }}
          >
            <Ionicons name="alert-circle-outline" size={22} color="#ef4444" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 15, fontWeight: '600', color: '#ef4444', marginBottom: 4 }}>
              Verification Rejected
            </Text>
            <Text style={{ fontSize: 13, color: isDark ? '#f87171' : '#dc2626' }}>
              Your verification request was not approved. Please review the feedback and try again.
            </Text>
          </View>
        </View>
        {notes ? (
          <View
            style={{
              backgroundColor: isDark ? 'rgba(239, 68, 68, 0.1)' : '#fef2f2',
              borderRadius: 12,
              padding: 12,
              marginTop: 12,
              borderLeftWidth: 3,
              borderLeftColor: '#ef4444',
            }}
          >
            <Text style={{ fontSize: 12, color: isDark ? '#f87171' : '#dc2626', fontWeight: '600', marginBottom: 4 }}>
              Reviewer Notes:
            </Text>
            <Text style={{ fontSize: 13, color: isDark ? '#fca5a5' : '#7f1d1d' }}>{notes}</Text>
          </View>
        ) : null}
        <Pressable
          onPress={onResubmit}
          style={({ pressed }) => [
            {
              marginTop: 12,
              paddingHorizontal: 12,
              paddingVertical: 8,
              borderRadius: 8,
              borderWidth: 1,
              borderColor: '#ef4444',
              alignSelf: 'flex-start',
              opacity: pressed ? 0.7 : 1,
            },
          ]}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Ionicons name="refresh-outline" size={14} color="#ef4444" />
            <Text style={{ fontSize: 13, fontWeight: '500', color: '#ef4444' }}>
              Submit New Documents
            </Text>
          </View>
        </Pressable>
      </View>
    </View>
  );
}

// ─────── Why Verify Card ───────
function WhyVerifyCard({ isDark = false }: { isDark?: boolean }) {
  const benefits = [
    'Get a verified badge on your profile',
    'Build trust with potential clients',
    'Appear higher in search results',
    'Access to premium features',
  ];

  const cardColors = {
    bg: isDark ? '#1A1A1A' : '#f9fafb',
    border: isDark ? '#374151' : '#e5e7eb',
    text: isDark ? '#ffffff' : '#1f2937',
    textSecondary: isDark ? '#d1d5db' : '#374151',
  };

  return (
    <View style={{ paddingHorizontal: 16, marginBottom: 24 }}>
      <View
        style={{
          backgroundColor: cardColors.bg,
          borderWidth: 1,
          borderColor: cardColors.border,
          borderRadius: 16,
          padding: 16,
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16 }}>
          <View
            style={{
              width: 32,
              height: 32,
              borderRadius: 8,
              backgroundColor: '#fa5610',
              justifyContent: 'center',
              alignItems: 'center',
            }}
          >
            <Ionicons name="checkmark-circle" size={16} color="#ffffff" />
          </View>
          <Text style={{ fontSize: 15, fontWeight: '700', color: cardColors.text }}>Why Verify?</Text>
        </View>
        {benefits.map((benefit, idx) => (
          <View
            key={benefit}
            style={{
              flexDirection: 'row',
              gap: 10,
              marginBottom: idx < benefits.length - 1 ? 10 : 0,
              alignItems: 'flex-start',
            }}
          >
            <Ionicons
              name="checkmark-circle"
              size={14}
              color="#10b981"
              style={{ marginTop: 2, minWidth: 14 }}
            />
            <Text style={{ fontSize: 13, color: cardColors.textSecondary, flex: 1, fontWeight: '500', lineHeight: 18 }}>
              {benefit}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

// ─────── Document Upload Card ───────
function DocumentCard({
  title,
  subtitle,
  icon,
  doc,
  onUpload,
  onRemove,
  isSquare = false,
  isUploading = false,
  isDark = false,
}: {
  title: string;
  subtitle: string;
  icon: keyof typeof Ionicons.glyphMap;
  doc: DocumentData;
  onUpload: () => void;
  onRemove: () => void;
  isSquare?: boolean;
  isUploading?: boolean;
  isDark?: boolean;
}) {
  const showImage = !!doc.url;

  const cardColors = {
    bg: isDark ? '#1A1A1A' : '#ffffff',
    border: isDark ? '#374151' : '#e5e7eb',
    iconBg: isDark ? '#2A2A2A' : '#f3f4f6',
    text: isDark ? '#ffffff' : '#1f2937',
    textSecondary: isDark ? '#9ca3af' : '#6b7280',
    uploadBg: isDark ? '#0F0F0F' : '#fafafa',
    uploadBorder: isDark ? '#2A2A2A' : '#d1d5db',
  };

  return (
    <View style={{ paddingHorizontal: 16, marginBottom: 16 }}>
      <View
        style={{
          backgroundColor: cardColors.bg,
          borderWidth: 1,
          borderColor: cardColors.border,
          borderRadius: 16,
          padding: 16,
        }}
      >
        {/* Header */}
        <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 16 }}>
          <View
            style={{
              width: 44,
              height: 44,
              borderRadius: 12,
              backgroundColor: cardColors.iconBg,
              justifyContent: 'center',
              alignItems: 'center',
              minWidth: 44,
            }}
          >
            <Ionicons name={icon} size={22} color={cardColors.textSecondary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 15, fontWeight: '600', color: cardColors.text, marginBottom: 2 }}>
              {title}
            </Text>
            <Text style={{ fontSize: 12, color: cardColors.textSecondary }}>{subtitle}</Text>
          </View>
          {showImage && doc.status !== 'not_submitted' ? (
            <View
              style={{
                paddingHorizontal: 8,
                paddingVertical: 4,
                borderRadius: 6,
                backgroundColor:
                  doc.status === 'approved'
                    ? '#d1fae5'
                    : doc.status === 'pending'
                      ? '#fef3c7'
                      : '#fee2e2',
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <Ionicons
                  name={
                    doc.status === 'approved'
                      ? 'checkmark-circle'
                      : doc.status === 'pending'
                        ? 'time-outline'
                        : 'alert-circle-outline'
                  }
                  size={12}
                  color={
                    doc.status === 'approved'
                      ? '#10b981'
                      : doc.status === 'pending'
                        ? '#f59e0b'
                        : '#ef4444'
                  }
                />
                <Text
                  style={{
                    fontSize: 11,
                    fontWeight: '600',
                    color:
                      doc.status === 'approved'
                        ? '#065f46'
                        : doc.status === 'pending'
                          ? '#92400e'
                          : '#991b1b',
                  }}
                >
                  {doc.status === 'approved'
                    ? 'Verified'
                    : doc.status === 'pending'
                      ? 'Pending'
                      : 'Rejected'}
                </Text>
              </View>
            </View>
          ) : null}
        </View>

        {/* Upload Area */}
        {showImage && doc.url ? (
          <View style={{ position: 'relative' }}>
            <Image
              source={{ uri: doc.url }}
              style={{
                width: '100%',
                aspectRatio: isSquare ? 1 : 16 / 9,
                borderRadius: 12,
                backgroundColor: cardColors.iconBg,
              }}
            />
            {doc.status === 'not_submitted' && (
              <Pressable
                onPress={onRemove}
                style={{
                  position: 'absolute',
                  top: 8,
                  right: 8,
                  width: 32,
                  height: 32,
                  borderRadius: 16,
                  backgroundColor: 'rgba(255, 255, 255, 0.95)',
                  justifyContent: 'center',
                  alignItems: 'center',
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.15,
                  shadowRadius: 4,
                  elevation: 4,
                }}
              >
                <Ionicons name="close" size={18} color="#1f2937" />
              </Pressable>
            )}
          </View>
        ) : isUploading ? (
          <View
            style={{
              aspectRatio: isSquare ? 1 : 16 / 9,
              backgroundColor: cardColors.uploadBg,
              borderRadius: 12,
              justifyContent: 'center',
              alignItems: 'center',
              borderStyle: 'dashed',
              borderWidth: 2,
              borderColor: cardColors.uploadBorder,
            }}
          >
            <ActivityIndicator size="large" color="#fa5610" />
            <Text style={{ fontSize: 12, color: cardColors.textSecondary, marginTop: 8, fontWeight: '500' }}>
              Uploading...
            </Text>
          </View>
        ) : (
          <Pressable
            onPress={onUpload}
            style={({ pressed }) => [
              {
                aspectRatio: isSquare ? 1 : 16 / 9,
                backgroundColor: pressed ? cardColors.iconBg : cardColors.uploadBg,
                borderRadius: 12,
                justifyContent: 'center',
                alignItems: 'center',
                borderStyle: 'dashed',
                borderWidth: 2,
                borderColor: cardColors.uploadBorder,
              },
            ]}
          >
            <Ionicons name={icon} size={32} color={cardColors.textSecondary} />
            <Text style={{ fontSize: 13, color: cardColors.textSecondary, marginTop: 8, fontWeight: '500' }}>
              Tap to upload
            </Text>
            {isSquare ? (
              <Text style={{ fontSize: 11, color: cardColors.textSecondary, marginTop: 4 }}>Square format</Text>
            ) : null}
          </Pressable>
        )}
      </View>
    </View>
  );
}

// ─────── Main Screen ───────
export default function VerifyIdentityScreen() {
  const insets = useSafeAreaInsets();
  const { isDark } = useTheme();
  const user = useAuthStore((s) => s.user);

  // State
  const [isLoading, setIsLoading] = useState(true);
  const [talentProfile, setTalentProfile] = useState<TalentProfile | null>(null);
  const [verification, setVerification] = useState<VerificationRecord | null>(null);
  const [isVerified, setIsVerified] = useState(false);

  const [idDoc, setIdDoc] = useState<DocumentData>({ url: null, storagePath: null, status: 'not_submitted' });
  const [selfieDoc, setSelfieDoc] = useState<DocumentData>({ url: null, storagePath: null, status: 'not_submitted' });

  const [isUploading, setIsUploading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isResubmitting, setIsResubmitting] = useState(false);

  const loadData = async () => {
    if (!user?.id) {
      setIsLoading(false);
      return;
    }

    try {
      // Get talent profile
      const { data: profileData, error: profileError } = await supabase
        .from('talent_profiles')
        .select('id, display_name, is_verified')
        .eq('user_id', user.id)
        .maybeSingle();

      if (profileError) throw profileError;

      if (profileData) {
        setTalentProfile(profileData as TalentProfile);
        setIsVerified(profileData.is_verified === true);

        // Get verification record using talent_id (get latest one only)
        let verificationData: VerificationRecord | null = null;
        try {
          const { data, error } = await supabase
            .from('talent_verifications')
            .select('id, status, notes, created_at, updated_at, id_document_url, selfie_url')
            .eq('talent_id', profileData.id)
            .order('created_at', { ascending: false })
            .limit(1)
            .single();

          if (error) {
            // If no verification record exists, that's ok - not an error
            if (error.code === 'PGRST116') {
            } else {
              console.error('[verifyidentity] Error loading verification:', getErrorMessage(error));
            }
          } else if (data) {
            verificationData = data as VerificationRecord;
            setVerification(verificationData);
          }
        } catch (err) {
          console.error('[verifyidentity] Exception loading verification:', getErrorMessage(err));
        }

        if (verificationData) {

          // Load signed URLs for documents
          if (verificationData.id_document_url) {
            const idUrl = await generateSignedUrl(verificationData.id_document_url);
            if (idUrl) {
              setIdDoc({
                url: idUrl,
                storagePath: verificationData.id_document_url,
                status: verificationData.status,
              });
            }
          }

          if (verificationData.selfie_url) {
            const selfieUrl = await generateSignedUrl(verificationData.selfie_url);
            if (selfieUrl) {
              setSelfieDoc({
                url: selfieUrl,
                storagePath: verificationData.selfie_url,
                status: verificationData.status,
              });
            }
          }
        }
      }
    } catch (err) {
      const msg = getErrorMessage(err);
      console.error('Error loading verification data:', msg);
    } finally {
      setIsLoading(false);
    }
  };

  // Load data on mount
  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const generateSignedUrl = async (path: string): Promise<string | null> => {
    try {
      const { data, error } = await supabase.storage.from('verifications').createSignedUrl(path, 3600);

      if (error) {
        console.error('Error generating signed URL:', extractErrorMessage(error));
        return null;
      }
      return data?.signedUrl || null;
    } catch (err) {
      console.error('Error in generateSignedUrl:', err);
      return null;
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

  const handlePickImage = async (type: 'id' | 'selfie') => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: type === 'selfie' ? [1, 1] : [16, 9],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        await uploadImage(asset, type);
      }
    } catch (err) {
      console.error('Error picking image:', err);
      Alert.alert('Error', 'Failed to pick image');
    }
  };

  const uploadImage = async (asset: ImagePicker.ImagePickerAsset, type: 'id' | 'selfie') => {
    if (!user?.id) {
      Alert.alert('Error', 'User not found');
      return;
    }

    try {
      setIsUploading(true);

      // Get file extension
      const filename = asset.fileName || asset.uri.split('/').pop() || 'file.jpg';
      const ext = filename.split('.').pop() || 'jpg';
      // Use asset.mimeType if available (actual MIME type from OS), otherwise guess from filename
      const mimeType = asset.mimeType || getMimeType(filename);
      const timestamp = Date.now();
      const storagePath = `${user.id}/${type}-${timestamp}.${ext}`;


      // Read file - handle both web and native
      let bytes: Uint8Array;

      const uri = asset.uri;

      if (uri.startsWith('file://') || uri.startsWith('/')) {
        // Native platform - use FileSystem
        const base64 = await FileSystem.readAsStringAsync(uri, { encoding: 'base64' });
        const binaryString = atob(base64);
        bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
      } else {
        // Web platform - fetch from blob URL
        const response = await fetch(uri);
        const blob = await response.blob();
        bytes = new Uint8Array(await blob.arrayBuffer());
      }

      // Upload to private bucket
      const { error: uploadError } = await supabase.storage
        .from('verifications')
        .upload(storagePath, bytes, {
          contentType: mimeType,
          upsert: false,
        });

      if (uploadError) {
        console.error(`[talent-setup] Upload error for ${type}:`, uploadError);
        throw uploadError;
      }


      // Generate signed URL
      const signedUrl = await generateSignedUrl(storagePath);
      if (!signedUrl) throw new Error('Failed to generate signed URL');

      // Update state
      if (type === 'id') {
        setIdDoc({ url: signedUrl, storagePath, status: 'not_submitted' });
      } else {
        setSelfieDoc({ url: signedUrl, storagePath, status: 'not_submitted' });
      }

    } catch (err) {
      console.error(`[talent-setup] Error uploading ${type}:`, err);
      const errorMsg = extractErrorMessage(err);
      Alert.alert('Upload Failed', errorMsg || `Failed to upload ${type}`);
    } finally {
      setIsUploading(false);
    }
  };

  const handleRemoveDocument = (type: 'id' | 'selfie') => {
    if (type === 'id') {
      setIdDoc({ url: null, storagePath: null, status: 'not_submitted' });
    } else {
      setSelfieDoc({ url: null, storagePath: null, status: 'not_submitted' });
    }
  };

  const handleSubmitForVerification = async () => {
    // Validate document paths
    if (!idDoc.storagePath || !selfieDoc.storagePath) {
      Alert.alert('Error', 'Please upload both ID and selfie');
      return;
    }

    if (isSubmitting) return;
    setIsSubmitting(true);

    try {

      // Resolve auth user safely
      const { data: authData } = await supabase.auth.getUser();
      const authUserId = authData?.user?.id;
      if (!authUserId) throw new Error('Not authenticated');

      // Resolve correct talent profile id
      const { data: profile, error: profileError } = await supabase
        .from('talent_profiles')
        .select('id')
        .eq('user_id', authUserId)
        .maybeSingle();

      if (profileError) throw profileError;
      if (!profile?.id) throw new Error('Talent profile not found');

      const talentId = profile.id;

      // Find latest existing verification safely
      const { data: existing, error: existingError } = await supabase
        .from('talent_verifications')
        .select('id')
        .eq('talent_id', talentId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (existingError) throw existingError;

      let verificationId: string | null = null;

      // Update or insert verification record
      if (existing?.id) {
        const { data: updated, error: updateError } = await supabase
          .from('talent_verifications')
          .update({
            id_document_url: idDoc.storagePath,
            selfie_url: selfieDoc.storagePath,
            status: 'pending',
            notes: null,
            updated_at: new Date().toISOString(),
          })
          .eq('id', existing.id)
          .select('id')
          .maybeSingle();

        if (updateError) throw updateError;
        verificationId = updated?.id ?? existing.id;
      } else {
        const { data: inserted, error: insertError } = await supabase
          .from('talent_verifications')
          .insert({
            talent_id: talentId,
            id_document_url: idDoc.storagePath,
            selfie_url: selfieDoc.storagePath,
            status: 'pending',
          })
          .select('id')
          .maybeSingle();

        if (insertError) throw insertError;
        verificationId = inserted?.id ?? null;
      }

      // SUCCESS BOUNDARY: once DB save worked, do not show failure anymore
      Alert.alert('Success', "Verification submitted! We'll review within up to 3 hours.");

      // Move user forward immediately
      router.replace('/(talent)/profile');

      // Notification must be non-blocking - fire and forget
      void supabase.functions
        .invoke('send-verification-notification', {
          body: {
            type: 'talent',
            talentId,
            verificationId,
            userName: authData?.user?.email || 'Unknown',
          },
        })
        .catch((err) => {
          console.warn('[verification] notification failed after successful save (this is OK):', err);
          // Do NOT throw or show error - notification failure is not a submit failure
        });
    } catch (error: any) {
      console.error('[verification] submit failed:', extractErrorMessage(error));
      const msg = getErrorMessage(error);
      console.error('[verification] formatted error:', msg);
      Alert.alert('Verification Failed', msg || 'Failed to submit verification');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResubmit = () => {
    setIsResubmitting(true);
    setIdDoc({ url: null, storagePath: null, status: 'not_submitted' });
    setSelfieDoc({ url: null, storagePath: null, status: 'not_submitted' });
  };

  const handleSkipVerification = async () => {
    router.replace('/(talent)/profile');
  };

  // Determine if we should show the submit button
  const canSubmit =
    !!idDoc.storagePath &&
    !!selfieDoc.storagePath &&
    idDoc.status === 'not_submitted' &&
    selfieDoc.status === 'not_submitted' &&
    !isSubmitting &&
    !isUploading;

  const shouldShowUploadCards = !isVerified && (!verification?.status || verification.status === 'rejected' || isResubmitting);

  const colors = {
    bg: isDark ? '#0A0A0A' : '#ffffff',
    bgSecondary: isDark ? '#1A1A1A' : '#f9fafb',
    text: isDark ? '#ffffff' : '#111827',
    textSecondary: isDark ? '#9ca3af' : '#6b7280',
    border: isDark ? '#374151' : '#e5e7eb',
  };

  if (isLoading) {
    return (
      <View style={[{ flex: 1, backgroundColor: colors.bg, paddingTop: insets.top }]}>
        {/* Fixed Header - always visible */}
        <View
          style={{
            paddingHorizontal: 16,
            paddingVertical: 12,
            borderBottomWidth: 1,
            borderBottomColor: colors.border,
            backgroundColor: colors.bg,
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 8 }}>
            <Pressable
              onPress={() => router.replace('/(talent)/profile')}
              style={{
                width: 40,
                height: 40,
                borderRadius: 20,
                backgroundColor: '#f3f4f6',
                justifyContent: 'center',
                alignItems: 'center',
              }}
            >
              <Ionicons name="arrow-back" size={20} color="#6b7280" />
            </Pressable>
            <View>
              <Text style={{ fontSize: 18, fontWeight: '700', color: '#1f2937' }}>ID Verification</Text>
            </View>
          </View>
          <SkeletonLoader width="50%" height={12} borderRadius={4} style={{ marginLeft: 52 }} />
        </View>

        {/* Skeleton Loading Content */}
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingBottom: insets.bottom + 20 }}
          showsVerticalScrollIndicator={false}
        >
          {/* Why Verify Card Skeleton */}
          <View style={{ paddingHorizontal: 16, marginBottom: 24, marginTop: 16 }}>
            <View
              style={{
                backgroundColor: '#f9fafb',
                borderWidth: 1,
                borderColor: '#e5e7eb',
                borderRadius: 16,
                padding: 16,
              }}
            >
              <SkeletonLoader width="30%" height={16} borderRadius={4} style={{ marginBottom: 16 }} />
              {[1, 2, 3, 4].map((i) => (
                <View key={i} style={{ flexDirection: 'row', gap: 10, marginBottom: 12, alignItems: 'flex-start' }}>
                  <SkeletonLoader width={14} height={14} borderRadius={7} style={{ marginTop: 2 }} />
                  <SkeletonLoader width="85%" height={14} borderRadius={4} />
                </View>
              ))}
            </View>
          </View>

          {/* Document Card Skeleton */}
          <View style={{ paddingHorizontal: 16, marginBottom: 16 }}>
            <View
              style={{
                backgroundColor: '#ffffff',
                borderWidth: 1,
                borderColor: '#e5e7eb',
                borderRadius: 16,
                padding: 16,
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 16 }}>
                <SkeletonLoader width={44} height={44} borderRadius={12} />
                <View style={{ flex: 1 }}>
                  <SkeletonLoader width="60%" height={15} borderRadius={4} style={{ marginBottom: 8 }} />
                  <SkeletonLoader width="80%" height={12} borderRadius={4} />
                </View>
              </View>
              <SkeletonLoader width="100%" height={150} borderRadius={12} />
            </View>
          </View>

          {/* Second Document Card Skeleton */}
          <View style={{ paddingHorizontal: 16, marginBottom: 16 }}>
            <View
              style={{
                backgroundColor: '#ffffff',
                borderWidth: 1,
                borderColor: '#e5e7eb',
                borderRadius: 16,
                padding: 16,
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 16 }}>
                <SkeletonLoader width={44} height={44} borderRadius={12} />
                <View style={{ flex: 1 }}>
                  <SkeletonLoader width="60%" height={15} borderRadius={4} style={{ marginBottom: 8 }} />
                  <SkeletonLoader width="80%" height={12} borderRadius={4} />
                </View>
              </View>
              <SkeletonLoader width="100%" height={150} borderRadius={12} />
            </View>
          </View>

          {/* Submit Button Skeleton */}
          <View style={{ paddingHorizontal: 16, marginBottom: 24, marginTop: 8 }}>
            <SkeletonLoader width="100%" height={48} borderRadius={12} />
            <SkeletonLoader width="70%" height={12} borderRadius={4} style={{ marginTop: 12, alignSelf: 'center' }} />
          </View>
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg, paddingTop: insets.top }}>
      {/* Fixed Header */}
      <View
        style={{
          paddingHorizontal: 16,
          paddingVertical: 12,
          borderBottomWidth: 1,
          borderBottomColor: colors.border,
          backgroundColor: colors.bg,
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 8 }}>
          <Pressable
            onPress={() => router.replace('/(talent)/profile')}
            style={({ pressed }) => [
              {
                width: 40,
                height: 40,
                borderRadius: 20,
                backgroundColor: pressed ? colors.border : colors.bgSecondary,
                justifyContent: 'center',
                alignItems: 'center',
              },
            ]}
          >
            <Ionicons name="arrow-back" size={20} color={colors.textSecondary} />
          </Pressable>
          <View>
            <Text style={{ fontSize: 18, fontWeight: '700', color: colors.text }}>ID Verification</Text>
          </View>
        </View>
        <Text style={{ fontSize: 13, color: colors.textSecondary, marginLeft: 52 }}>
          {isVerified ? 'Your profile is verified' : verification?.status === 'pending' ? 'Under review' : 'Verify your identity'}
        </Text>
      </View>

      {/* Scrollable Content */}
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: insets.bottom + 20 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Status Banners */}
        {isVerified ? <VerifiedBanner isDark={isDark} /> : null}
        {!isVerified && verification?.status === 'pending' ? <PendingBanner isDark={isDark} /> : null}
        {!isVerified && verification?.status === 'rejected' ? (
          <RejectedBanner notes={verification.notes} onResubmit={handleResubmit} isDark={isDark} />
        ) : null}

        {/* Why Verify Card */}
        {!isVerified ? <WhyVerifyCard isDark={isDark} /> : null}

        {/* Pending Document Preview (read-only) */}
        {!isVerified && verification?.status === 'pending' && !isResubmitting ? (
          <>
            {/* ID Document Preview */}
            {idDoc.url ? (
              <View style={{ paddingHorizontal: 16, marginBottom: 16 }}>
                <View
                  style={{
                    backgroundColor: isDark ? '#1A1A1A' : '#ffffff',
                    borderWidth: 1,
                    borderColor: isDark ? '#374151' : '#e5e7eb',
                    borderRadius: 16,
                    padding: 16,
                  }}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 16 }}>
                    <View
                      style={{
                        width: 44,
                        height: 44,
                        borderRadius: 12,
                        backgroundColor: isDark ? '#2A2A2A' : '#f3f4f6',
                        justifyContent: 'center',
                        alignItems: 'center',
                      }}
                    >
                      <Ionicons name="document-text-outline" size={22} color={isDark ? '#9ca3af' : '#6b7280'} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 15, fontWeight: '600', color: isDark ? '#ffffff' : '#1f2937', marginBottom: 2 }}>
                        ID Document
                      </Text>
                      <Text style={{ fontSize: 12, color: isDark ? '#9ca3af' : '#6b7280' }}>
                        Emirates ID, Passport, or License
                      </Text>
                    </View>
                    <View
                      style={{
                        paddingHorizontal: 8,
                        paddingVertical: 4,
                        borderRadius: 6,
                        backgroundColor: '#fef3c7',
                      }}
                    >
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                        <Ionicons name="time-outline" size={12} color="#f59e0b" />
                        <Text style={{ fontSize: 11, fontWeight: '600', color: '#92400e' }}>Pending</Text>
                      </View>
                    </View>
                  </View>
                  <View style={{ position: 'relative' }}>
                    <Image
                      source={{ uri: idDoc.url }}
                      style={{
                        width: '100%',
                        aspectRatio: 16 / 9,
                        borderRadius: 12,
                        backgroundColor: isDark ? '#2A2A2A' : '#f3f4f6',
                      }}
                    />
                    {/* Pending overlay badge */}
                    <View
                      style={{
                        position: 'absolute',
                        top: 8,
                        right: 8,
                        paddingHorizontal: 10,
                        paddingVertical: 6,
                        borderRadius: 8,
                        backgroundColor: 'rgba(245, 158, 11, 0.9)',
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 4,
                      }}
                    >
                      <Ionicons name="time-outline" size={14} color="#ffffff" />
                      <Text style={{ fontSize: 12, fontWeight: '600', color: '#ffffff' }}>Pending</Text>
                    </View>
                  </View>
                </View>
              </View>
            ) : null}

            {/* Selfie Preview */}
            {selfieDoc.url ? (
              <View style={{ paddingHorizontal: 16, marginBottom: 16 }}>
                <View
                  style={{
                    backgroundColor: isDark ? '#1A1A1A' : '#ffffff',
                    borderWidth: 1,
                    borderColor: isDark ? '#374151' : '#e5e7eb',
                    borderRadius: 16,
                    padding: 16,
                  }}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 16 }}>
                    <View
                      style={{
                        width: 44,
                        height: 44,
                        borderRadius: 12,
                        backgroundColor: isDark ? '#2A2A2A' : '#f3f4f6',
                        justifyContent: 'center',
                        alignItems: 'center',
                      }}
                    >
                      <Ionicons name="camera-outline" size={22} color={isDark ? '#9ca3af' : '#6b7280'} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 15, fontWeight: '600', color: isDark ? '#ffffff' : '#1f2937', marginBottom: 2 }}>
                        Selfie Photo
                      </Text>
                      <Text style={{ fontSize: 12, color: isDark ? '#9ca3af' : '#6b7280' }}>
                        A clear photo of your face
                      </Text>
                    </View>
                    <View
                      style={{
                        paddingHorizontal: 8,
                        paddingVertical: 4,
                        borderRadius: 6,
                        backgroundColor: '#fef3c7',
                      }}
                    >
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                        <Ionicons name="time-outline" size={12} color="#f59e0b" />
                        <Text style={{ fontSize: 11, fontWeight: '600', color: '#92400e' }}>Pending</Text>
                      </View>
                    </View>
                  </View>
                  <View style={{ position: 'relative' }}>
                    <Image
                      source={{ uri: selfieDoc.url }}
                      style={{
                        width: '100%',
                        aspectRatio: 1,
                        borderRadius: 12,
                        backgroundColor: isDark ? '#2A2A2A' : '#f3f4f6',
                      }}
                    />
                    {/* Pending overlay badge */}
                    <View
                      style={{
                        position: 'absolute',
                        top: 8,
                        right: 8,
                        paddingHorizontal: 10,
                        paddingVertical: 6,
                        borderRadius: 8,
                        backgroundColor: 'rgba(245, 158, 11, 0.9)',
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 4,
                      }}
                    >
                      <Ionicons name="time-outline" size={14} color="#ffffff" />
                      <Text style={{ fontSize: 12, fontWeight: '600', color: '#ffffff' }}>Pending</Text>
                    </View>
                  </View>
                </View>
              </View>
            ) : null}

            {/* Info text for pending state */}
            <View style={{ paddingHorizontal: 16, marginBottom: 24 }}>
              <Text style={{ fontSize: 13, color: colors.textSecondary, textAlign: 'center', lineHeight: 18 }}>
                Your documents are being reviewed. We'll notify you once the verification is complete.
              </Text>
            </View>
          </>
        ) : null}

        {/* Upload Cards */}
        {shouldShowUploadCards ? (
          <>
            <DocumentCard
              title="ID Document"
              subtitle="Emirates ID, Passport, or License"
              icon="document-text-outline"
              doc={idDoc}
              onUpload={() => handlePickImage('id')}
              onRemove={() => handleRemoveDocument('id')}
              isUploading={isUploading}
              isDark={isDark}
            />
            <DocumentCard
              title="Selfie Photo"
              subtitle="A clear photo of your face"
              icon="camera-outline"
              doc={selfieDoc}
              onUpload={() => handlePickImage('selfie')}
              onRemove={() => handleRemoveDocument('selfie')}
              isSquare
              isUploading={isUploading}
              isDark={isDark}
            />

            {/* Submit Button */}
            <View style={{ paddingHorizontal: 16, marginBottom: 24, marginTop: 8 }}>
              <Pressable
                onPress={handleSubmitForVerification}
                disabled={!canSubmit}
                style={({ pressed }) => [
                  {
                    backgroundColor: canSubmit ? (pressed ? '#fa5610' : '#fa5610') : '#d1d5db',
                    height: 48,
                    borderRadius: 12,
                    justifyContent: 'center',
                    alignItems: 'center',
                    flexDirection: 'row',
                    gap: 8,
                  },
                ]}
              >
                {isSubmitting ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <Ionicons name="cloud-upload-outline" size={16} color="#ffffff" />
                )}
                <Text style={{ fontSize: 15, fontWeight: '600', color: '#ffffff' }}>
                  {isSubmitting ? 'Submitting...' : isResubmitting ? 'Resubmit' : 'Submit for Verification'}
                </Text>
              </Pressable>
              <Text style={{ fontSize: 12, color: '#6b7280', marginTop: 12, textAlign: 'center', lineHeight: 16 }}>
                Verification usually takes up to 3 hours.
              </Text>

              {/* Skip for now button */}
              <Pressable
                onPress={handleSkipVerification}
                disabled={isSubmitting}
                style={({ pressed }) => [
                  {
                    marginTop: 12,
                    paddingVertical: 12,
                    opacity: pressed ? 0.7 : 1,
                  },
                ]}
              >
                <Text style={{ fontSize: 14, color: '#fa5610', fontWeight: '600', textAlign: 'center' }}>
                  Skip for now
                </Text>
              </Pressable>
            </View>
          </>
        ) : null}
      </ScrollView>
    </View>
  );
}
