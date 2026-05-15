import React, { useRef, useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  Share,
  Linking,
  Image as RNImage,
  Alert,
  Platform,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/lib/theme/ThemeContext';
import { LinearGradient } from 'expo-linear-gradient';
import * as Clipboard from 'expo-clipboard';
import * as Sharing from 'expo-sharing';
import * as MediaLibrary from 'expo-media-library';
import { Download, Share2, Copy, CheckCircle, Gift, Instagram, MessageCircle, Linkedin, MoreHorizontal, Music, Twitter } from 'lucide-react-native';
import ViewShot, { captureRef } from 'react-native-view-shot';
import Svg, { Rect, Defs, LinearGradient as SvgGradient } from 'react-native-svg';
import QRCode from 'react-native-qrcode-svg';
import { supabase } from '@/lib/supabase';

// Passport Card Component
interface PassportCardProps {
  displayName: string;
  avatarUrl?: string;
  category?: string;
  location?: string;
  rating?: number;
  completedJobs?: number;
  isVerified?: boolean;
  username?: string;
  profileUrl?: string;
  isHighRes?: boolean;
  variant?: 'preview' | 'story' | 'square';
  qrCodeRef?: React.RefObject<any>;
}

const PassportCard = React.forwardRef<View, PassportCardProps>(
  (
    {
      displayName,
      avatarUrl,
      category,
      location,
      rating = 5.0,
      completedJobs = 0,
      isVerified = false,
      username,
      profileUrl,
      isHighRes = false,
      variant = 'preview',
      qrCodeRef,
    },
    ref
  ) => {
    // Set dimensions based on variant
    let cardWidth = 270;
    let cardHeight = 480;
    let padding = 10;
    let avatarSize = 50;

    if (isHighRes) {
      if (variant === 'story') {
        cardWidth = 1080;
        cardHeight = 1920;
        padding = 40;
        avatarSize = 200;
      } else if (variant === 'square') {
        cardWidth = 1080;
        cardHeight = 1080;
        padding = 40;
        avatarSize = 160;
      }
    }

    const cardSize = { width: cardWidth, height: cardHeight };
    const fontSize = {
      header: isHighRes && variant === 'story' ? 48 : isHighRes && variant === 'square' ? 40 : 12,
      name: isHighRes && variant === 'story' ? 40 : isHighRes && variant === 'square' ? 32 : 10,
      subtitle: isHighRes && variant === 'story' ? 24 : isHighRes && variant === 'square' ? 18 : 8,
      stat: isHighRes && variant === 'story' ? 32 : isHighRes && variant === 'square' ? 24 : 10,
      statLabel: isHighRes && variant === 'story' ? 16 : isHighRes && variant === 'square' ? 12 : 6,
    };

    return (
      <View
        ref={ref}
        style={[
          styles.passportCard,
          {
            width: cardSize.width,
            height: cardSize.height,
            padding,
            backgroundColor: '#1a1a1a',
          },
        ]}
      >
        {/* Gradient background */}
        <LinearGradient
          colors={['#1a1a1a', '#0f0f0f']}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={[StyleSheet.absoluteFill, { borderRadius: isHighRes ? 40 : 10 }]}
        />

        {/* Corner accent lines - Top Left */}
        <View style={{ position: 'absolute', top: isHighRes ? 40 : 8, left: isHighRes ? 40 : 8, zIndex: 2 }}>
          <View style={{ width: isHighRes ? 60 : 12, height: isHighRes ? 2 : 1, backgroundColor: '#fa5610' }} />
          <View style={{ width: isHighRes ? 2 : 0.5, height: isHighRes ? 60 : 12, backgroundColor: '#fa5610', marginTop: isHighRes ? -2 : -1 }} />
        </View>

        {/* Corner accent lines - Top Right */}
        <View style={{ position: 'absolute', top: isHighRes ? 40 : 8, right: isHighRes ? 40 : 8, zIndex: 2 }}>
          <View style={{ width: isHighRes ? 60 : 12, height: isHighRes ? 2 : 1, backgroundColor: '#fa5610' }} />
          <View style={{ width: isHighRes ? 2 : 0.5, height: isHighRes ? 60 : 12, backgroundColor: '#fa5610', marginTop: isHighRes ? -2 : -1 }} />
        </View>

        {/* Corner accent lines - Bottom Left */}
        <View style={{ position: 'absolute', bottom: isHighRes ? 40 : 8, left: isHighRes ? 40 : 8, zIndex: 2 }}>
          <View style={{ width: isHighRes ? 60 : 12, height: isHighRes ? 2 : 1, backgroundColor: '#fa5610' }} />
          <View style={{ width: isHighRes ? 2 : 0.5, height: isHighRes ? 60 : 12, backgroundColor: '#fa5610', marginBottom: isHighRes ? -2 : -1 }} />
        </View>

        {/* Corner accent lines - Bottom Right */}
        <View style={{ position: 'absolute', bottom: isHighRes ? 40 : 8, right: isHighRes ? 40 : 8, zIndex: 2 }}>
          <View style={{ width: isHighRes ? 60 : 12, height: isHighRes ? 2 : 1, backgroundColor: '#fa5610' }} />
          <View style={{ width: isHighRes ? 2 : 0.5, height: isHighRes ? 60 : 12, backgroundColor: '#fa5610', marginBottom: isHighRes ? -2 : -1 }} />
        </View>

        {/* Content */}
        <View style={{ flex: 1, justifyContent: 'space-between', zIndex: 1 }}>
          {/* Top section */}
          <View>
            {/* ENGAGE logo image */}
            <View style={{ alignItems: 'center', marginBottom: isHighRes ? 20 : 4 }}>
              <RNImage
                source={require('./logo.png')}
                style={{
                  width: isHighRes ? 160 : 140,
                  height: isHighRes ? 160 : 140,
                  resizeMode: 'contain',
                }}
              />
            </View>

            {/* "ENGAGE PASSPORT" header with decorative lines */}
            <View style={{ alignItems: 'center', marginBottom: isHighRes ? 30 : 8, flexDirection: 'row', justifyContent: 'center', gap: isHighRes ? 12 : 2 }}>
              <View style={{ width: isHighRes ? 40 : 8, height: isHighRes ? 1.5 : 0.5, backgroundColor: '#fa5610' }} />
              <Text
                style={{
                  fontSize: fontSize.header,
                  fontWeight: '700',
                  color: '#fa5610',
                  letterSpacing: isHighRes ? 1 : 0.2,
                }}
              >
                ENGAGE PASSPORT
              </Text>
              <View style={{ width: isHighRes ? 40 : 8, height: isHighRes ? 1.5 : 0.5, backgroundColor: '#fa5610' }} />
            </View>

            {/* Avatar with orange ring */}
            <View
              style={{
                alignItems: 'center',
                marginBottom: isHighRes ? 30 : 8,
              }}
            >
              <View
                style={{
                  width: avatarSize,
                  height: avatarSize,
                  borderRadius: avatarSize / 2,
                  borderWidth: isHighRes ? 8 : 2,
                  borderColor: '#fa5610',
                  overflow: 'hidden',
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: '#333333',
                }}
              >
                {avatarUrl ? (
                  <RNImage
                    source={{ uri: avatarUrl }}
                    style={{ width: '100%', height: '100%' }}
                    resizeMode="cover"
                  />
                ) : (
                  <Text
                    style={{
                      fontSize: fontSize.name,
                      fontWeight: '700',
                      color: '#fa5610',
                    }}
                  >
                    {displayName
                      .split(' ')
                      .map((n) => n[0])
                      .join('')
                      .toUpperCase()
                      .slice(0, 2)}
                  </Text>
                )}
              </View>

              {/* Verified badge */}
              {isVerified ? (
                <View
                  style={{
                    position: 'absolute',
                    bottom: 0,
                    right: isHighRes ? '15%' : '45%',
                    width: isHighRes ? 50 : 12,
                    height: isHighRes ? 50 : 12,
                    borderRadius: isHighRes ? 25 : 6,
                    backgroundColor: '#10b981',
                    borderWidth: isHighRes ? 3 : 1,
                    borderColor: '#1a1a1a',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Text style={{ color: '#ffffff', fontWeight: '700', fontSize: isHighRes ? 24 : 6 }}>✓</Text>
                </View>
              ) : null}
            </View>

            {/* Name and details */}
            <View style={{ alignItems: 'center', marginBottom: isHighRes ? 20 : 5 }}>
              <Text
                style={{
                  fontSize: fontSize.name,
                  fontWeight: '700',
                  color: '#ffffff',
                  marginBottom: isHighRes ? 8 : 2,
                }}
              >
                {displayName}
              </Text>
              {category ? (
                <Text
                  style={{
                    fontSize: fontSize.subtitle,
                    color: '#fa5610',
                    marginBottom: isHighRes ? 4 : 1,
                  }}
                >
                  {category}
                </Text>
              ) : null}
              {location ? (
                <Text
                  style={{
                    fontSize: fontSize.subtitle,
                    color: '#9ca3af',
                    marginBottom: isHighRes ? 8 : 2,
                  }}
                >
                  {location}
                </Text>
              ) : null}
              <Text
                style={{
                  fontSize: fontSize.subtitle,
                  color: '#10b981',
                  fontWeight: '600',
                }}
              >
                Available for Hire
              </Text>
            </View>
          </View>

          {/* QR Code section */}
          <View style={{ alignItems: 'center', marginBottom: isHighRes ? 30 : 8 }}>
            <View ref={qrCodeRef} style={{ alignItems: 'center', justifyContent: 'center' }}>
              <QRCode
                value={profileUrl || displayName}
                size={isHighRes ? 200 : 50}
                color="#000000"
                backgroundColor="#ffffff"
                quietZone={0}
              />
            </View>
            {/* Orange corner brackets */}
            <View
              style={{
                position: 'absolute',
                width: isHighRes ? 240 : 60,
                height: isHighRes ? 240 : 60,
                borderWidth: isHighRes ? 4 : 1,
                borderColor: '#fa5610',
                borderRadius: isHighRes ? 20 : 5,
                pointerEvents: 'none',
              }}
            />
          </View>

          {/* Stats bar - only show if there are stats */}
          {rating > 0 || completedJobs > 0 || isVerified ? (
            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'center',
                alignItems: 'center',
                backgroundColor: 'rgba(255, 255, 255, 0.05)',
                borderTopWidth: isHighRes ? 1 : 0.25,
                borderBottomWidth: isHighRes ? 1 : 0.25,
                borderTopColor: 'rgba(107, 114, 128, 0.5)',
                borderBottomColor: 'rgba(107, 114, 128, 0.5)',
                paddingHorizontal: isHighRes ? 20 : 5,
                paddingVertical: isHighRes ? 15 : 4,
                marginBottom: isHighRes ? 15 : 4,
                gap: isHighRes ? 16 : 3,
              }}
            >
              {rating > 0 && (
                <>
                  <View style={{ alignItems: 'center' }}>
                    <Text
                      style={{
                        fontSize: fontSize.stat,
                        fontWeight: '700',
                        color: '#fa5610',
                      }}
                    >
                      {rating.toFixed(1)}
                    </Text>
                    <Text
                      style={{
                        fontSize: fontSize.statLabel,
                        color: '#9ca3af',
                      }}
                    >
                      Rating
                    </Text>
                  </View>
                  {completedJobs > 0 || isVerified ? <View style={{ width: isHighRes ? 1 : 0.25, height: '60%', backgroundColor: '#fa5610' }} /> : null}
                </>
              )}
              {completedJobs > 0 && (
                <>
                  <View style={{ alignItems: 'center' }}>
                    <Text
                      style={{
                        fontSize: fontSize.stat,
                        fontWeight: '700',
                        color: '#fa5610',
                      }}
                    >
                      {completedJobs}
                    </Text>
                    <Text
                      style={{
                        fontSize: fontSize.statLabel,
                        color: '#9ca3af',
                      }}
                    >
                      Projects
                    </Text>
                  </View>
                  {isVerified ? <View style={{ width: isHighRes ? 1 : 0.25, height: '60%', backgroundColor: '#fa5610' }} /> : null}
                </>
              )}
              {isVerified ? (
                <>
                  <View style={{ width: isHighRes ? 1 : 0.25, height: '60%', backgroundColor: '#fa5610' }} />
                  <View style={{ alignItems: 'center' }}>
                    <Text
                      style={{
                        fontSize: fontSize.stat,
                        fontWeight: '700',
                        color: '#10b981',
                      }}
                    >
                      ✓
                    </Text>
                    <Text
                      style={{
                        fontSize: fontSize.statLabel,
                        color: '#9ca3af',
                      }}
                    >
                      Verified Pro
                    </Text>
                  </View>
                </>
              ) : null}
            </View>
          ) : null}

          {/* BOOK NOW section */}
          <View style={{ alignItems: 'center', marginBottom: isHighRes ? 20 : 5 }}>
            <Text
              style={{
                fontSize: fontSize.subtitle,
                fontWeight: '700',
                color: '#fa5610',
                letterSpacing: isHighRes ? 0.5 : 0.1,
              }}
            >
              BOOK NOW
            </Text>
            <Text
              style={{
                fontSize: isHighRes ? 16 : 6,
                color: '#9ca3af',
                marginTop: isHighRes ? 8 : 1,
              }}
            >
              Scan QR to view profile and book
            </Text>
          </View>

          {/* Footer */}
          <View style={{ alignItems: 'center' }}>
            <Text
              style={{
                fontSize: isHighRes ? 14 : 6,
                color: '#9ca3af',
              }}
            >
              Discover Top Talent at
            </Text>
            <Text
              style={{
                fontSize: fontSize.subtitle,
                color: '#fa5610',
                fontWeight: '600',
                letterSpacing: isHighRes ? 0.5 : 0.1,
              }}
            >
              engageapp.co
            </Text>
          </View>
        </View>
      </View>
    );
  }
);

PassportCard.displayName = 'PassportCard';

export default function ShareProfileScreen() {
  const insets = useSafeAreaInsets();
  const { isDark } = useTheme();
  const params = useLocalSearchParams<{
    talentId?: string;
    displayName?: string;
    avatarUrl?: string;
    category?: string;
    location?: string;
    rating?: string;
    completedJobs?: string;
    isVerified?: string;
    username?: string;
  }>();

  const storyCardRef = useRef<ViewShot>(null);
  const squareCardRef = useRef<ViewShot>(null);

  const [copied, setCopied] = useState(false);
  const [downloading, setDownloading] = useState<'story' | 'square' | null>(null);
  const [sharing, setSharing] = useState<string | null>(null);
  const [referralStats, setReferralStats] = useState({ signups: 0, credits: 0 });
  const [preCapturedStoryUri, setPreCapturedStoryUri] = useState<string | null>(null);
  const [preCapturedSquareUri, setPreCapturedSquareUri] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);

  const displayName = params.displayName || 'Talent Member';
  const username = params.username;
  const talentId = params.talentId || userId;

  // Build the correct profile URL
  const profilePath = username ? `/${username}` : talentId ? `/t/${talentId}` : '/profile';
  const profileUrl = `https://engageapp.co${profilePath}`;

  const avatarUrl = params.avatarUrl;
  const category = params.category || 'Professional';
  const location = params.location || 'Worldwide';
  const rating = parseFloat(params.rating || '5.0');
  const completedJobs = parseInt(params.completedJobs || '0');
  const isVerified = params.isVerified === 'true';

  const handleCopy = useCallback(async () => {
    await Clipboard.setStringAsync(profileUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [profileUrl]);

  const capturePassport = useCallback(
    async (format: 'story' | 'square') => {
      try {
        // Skip on web - react-native-view-shot doesn't work properly on web
        if (Platform.OS === 'web') {
          return null;
        }

        const ref = format === 'story' ? storyCardRef : squareCardRef;
        if (!ref.current) {
          throw new Error('Passport card not ready');
        }
        const uri = await captureRef(ref, {
          format: 'png',
          quality: 1,
          result: 'tmpfile',
        });
        return uri;
      } catch (error) {
        // Only log non-web errors
        if (Platform.OS !== 'web') {
          const errorMsg = error instanceof Error ? error.message : typeof error === 'string' ? error : 'An error occurred';
          console.error('Capture error:', errorMsg);
        }
        return null;
      }
    },
    []
  );

  // Fetch referral stats and user ID when screen loads
  useEffect(() => {
    // Note: Local require() images are bundled at build time, no prefetch needed

    const fetchReferralStats = async () => {
      try {
        // Get the current user session
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user?.id) {
          console.warn('No authenticated user');
          return;
        }

        // Set the user ID for building the profile URL
        setUserId(session.user.id);

        // 1. Get signups count: count rows in 'referrals' where referrer_id = current user
        const { data: referrals, error: refError } = await supabase
          .from('referrals')
          .select('*')
          .eq('referrer_id', session.user.id);

        if (refError) {
          console.error('Error fetching referrals:', refError);
        }

        // 2. Get credits: read 'referral_credits' from 'profiles' for current user
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('referral_credits')
          .eq('id', session.user.id)
          .single();

        if (profileError) {
          console.error('Error fetching profile credits:', profileError);
        }

        setReferralStats({
          signups: referrals?.length || 0,
          credits: profile?.referral_credits || 0,
        });
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : typeof error === 'string' ? error : 'An error occurred';
        console.error('Error fetching referral stats:', errorMsg);
        setReferralStats({ signups: 0, credits: 0 });
      }
    };

    fetchReferralStats();
  }, []);

  // Pre-capture images when profile data loads
  useEffect(() => {
    const preCaptureImages = async () => {
      // Skip pre-capture on web - react-native-view-shot doesn't work properly on web
      if (Platform.OS === 'web') {
        return;
      }

      // Wait for off-screen views to fully render (avatar, QR code, etc.)
      await new Promise(resolve => setTimeout(resolve, 1000));

      try {
        if (storyCardRef.current) {
          const storyUri = await captureRef(storyCardRef, {
            format: 'png',
            quality: 1,
            result: 'tmpfile',
          });
          setPreCapturedStoryUri(storyUri);
        }
      } catch (e) {
        console.warn('Pre-capture story failed:', e);
      }

      try {
        if (squareCardRef.current) {
          const squareUri = await captureRef(squareCardRef, {
            format: 'png',
            quality: 1,
            result: 'tmpfile',
          });
          setPreCapturedSquareUri(squareUri);
        }
      } catch (e) {
        console.warn('Pre-capture square failed:', e);
      }
    };

    // Trigger pre-capture when profile data is loaded
    if (displayName) {
      preCaptureImages();
    }
  }, [displayName, avatarUrl, category, profileUrl]);

  const captureAndShare = useCallback(
    async (type: 'story' | 'square') => {
      // Check if on web and show error
      if (Platform.OS === 'web') {
        Alert.alert(
          'Not Available',
          'Download functionality is only available on mobile apps. Please use the native iOS or Android app to save your passport card.',
          [{ text: 'OK', style: 'default' }]
        );
        return;
      }

      setDownloading(type);
      try {
        // Step A: Check current permission status
        let { status } = await MediaLibrary.getPermissionsAsync();

        // Step B: If not granted yet, request permission
        if (status !== 'granted') {
          const request = await MediaLibrary.requestPermissionsAsync();
          status = request.status;
        }

        // Step C: If still not granted after request, guide user to Settings
        if (status !== 'granted') {
          const actions: any[] = [{ text: 'Cancel', style: 'cancel' }];

          // Only add "Open Settings" button on native platforms where it's supported
          actions.push({
            text: 'Open Settings',
            onPress: () => {
              if (Platform.OS === 'ios') {
                Linking.openURL('app-settings:');
              } else if (typeof Linking.openSettings === 'function') {
                Linking.openSettings();
              }
            },
          });

          Alert.alert(
            'Permission Required',
            'To save your passport card, please enable photo library access in your device settings.',
            actions
          );
          setDownloading(null);
          return;
        }

        // Step D: Use pre-captured URI if available, otherwise capture now
        let uri = type === 'story' ? preCapturedStoryUri : preCapturedSquareUri;

        if (!uri) {
          // If pre-capture failed, try capturing now
          const ref = type === 'story' ? storyCardRef : squareCardRef;

          if (!ref.current) {
            Alert.alert('Error', 'Could not capture card');
            setDownloading(null);
            return;
          }

          // Wait for off-screen view to fully render (avatar image, QR code)
          await new Promise(resolve => setTimeout(resolve, 500));

          uri = await captureRef(ref, {
            format: 'png',
            quality: 1,
            result: 'tmpfile',
          });
        }

        if (!uri) {
          throw new Error('Capture returned empty URI');
        }

        // Step E: Save to gallery
        const asset = await MediaLibrary.createAssetAsync(uri);

        if (asset) {
          Alert.alert(
            'Saved!',
            `${type === 'story' ? 'Story (9:16)' : 'Square (1:1)'} passport saved to your gallery!`
          );
        } else {
          throw new Error('Failed to create media asset');
        }
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : typeof error === 'string' ? error : 'An error occurred';
        console.error('Download error:', errorMsg);

        // If the error is specifically a permission error, guide to settings
        if (
          error instanceof Error &&
          (error.message?.includes('permission') ||
            error.message?.includes('Permission') ||
            error.message?.includes('denied') ||
            error.message?.includes('PERMISSION'))
        ) {
          const actions: any[] = [{ text: 'Cancel', style: 'cancel' }];

          actions.push({
            text: 'Open Settings',
            onPress: () => {
              if (Platform.OS === 'ios') {
                Linking.openURL('app-settings:');
              } else if (typeof Linking.openSettings === 'function') {
                Linking.openSettings();
              }
            },
          });

          Alert.alert(
            'Permission Required',
            'Please enable photo library access in your device settings to save images.',
            actions
          );
        } else {
          Alert.alert('Error', 'Failed to save passport image. Please try again.');
        }
      } finally {
        setDownloading(null);
      }
    },
    [preCapturedStoryUri, preCapturedSquareUri]
  );

  const handleSocialShare = useCallback(
    async (platform: string) => {
      setSharing(platform);
      try {
        switch (platform) {
          case 'instagram':
            try {
              // Step 1: Capture the passport card as a story-format image
              const uri = await capturePassport('story');
              if (!uri) throw new Error('Failed to capture passport image');

              // Step 2: Try to open the native share sheet with the image
              const isAvailable = await Sharing.isAvailableAsync();
              if (isAvailable) {
                await Sharing.shareAsync(uri, {
                  mimeType: 'image/png',
                  dialogTitle: 'Share to Instagram Stories',
                  UTI: 'public.png',
                });
              } else {
                // Share sheet not available -- save to gallery instead
                const { status } = await MediaLibrary.requestPermissionsAsync();
                if (status === 'granted') {
                  await MediaLibrary.saveToLibraryAsync(uri);
                }
                Alert.alert(
                  'Image Saved',
                  'Image saved to your gallery! Open Instagram Stories and add it from your gallery.'
                );
              }
            } catch (error) {
              // If user cancelled the share sheet, do nothing
              if (error instanceof Error && error.message === 'User did not share') {
                setSharing(null);
                return;
              }
              // For any other error, fall back to saving to gallery
              try {
                const uri = await capturePassport('story');
                if (uri) {
                  const { status } = await MediaLibrary.requestPermissionsAsync();
                  if (status === 'granted') {
                    await MediaLibrary.saveToLibraryAsync(uri);
                  }
                }
              } catch (e) {
                // ignore secondary errors
              }
              Alert.alert(
                'Image Saved',
                'Image saved to your gallery! Open Instagram Stories and add it from your gallery.'
              );
            }
            break;

          case 'tiktok':
            try {
              // On web, just open TikTok with the link
              if (Platform.OS === 'web') {
                await Linking.openURL('https://www.tiktok.com');
                Alert.alert('TikTok', 'Please share the following link: ' + profileUrl);
              } else {
                // Save to gallery first (so user can pick it in TikTok)
                if (preCapturedStoryUri) {
                  const { status } = await MediaLibrary.requestPermissionsAsync();
                  if (status === 'granted') {
                    await MediaLibrary.createAssetAsync(preCapturedStoryUri);
                  }
                }

                // Try to open TikTok
                const tiktokUrl = 'snssdk1233://camera';
                const canOpen = await Linking.canOpenURL(tiktokUrl);
                if (canOpen) {
                  await Linking.openURL(tiktokUrl);
                } else {
                  await Linking.openURL('https://www.tiktok.com/upload');
                }
                Alert.alert('Image Saved', 'Passport saved to gallery! Select it from your gallery in TikTok.');
              }
            } catch (err) {
              console.error('TikTok share error:', err);
              Alert.alert('Info', 'Open TikTok and share your profile link: ' + profileUrl);
            }
            break;

          case 'whatsapp':
            try {
              // Step 1: Capture the passport card as a square-format image
              const uri = await capturePassport('square');
              if (!uri) throw new Error('Failed to capture passport image');

              // Step 2: Try to open the native share sheet with the image
              const isAvailable = await Sharing.isAvailableAsync();
              if (isAvailable) {
                await Sharing.shareAsync(uri, {
                  mimeType: 'image/png',
                  dialogTitle: 'Share to WhatsApp',
                  UTI: 'public.png',
                });
              } else {
                // Share sheet not available -- open WhatsApp with text only
                const text = encodeURIComponent(`Check out my profile on Engage! Book me for your next project: ${profileUrl}`);
                const whatsappUrl = `whatsapp://send?text=${text}`;
                const canOpen = await Linking.canOpenURL(whatsappUrl);
                if (canOpen) {
                  await Linking.openURL(whatsappUrl);
                } else {
                  await Linking.openURL(`https://wa.me/?text=${text}`);
                }
              }
            } catch (error) {
              // If user cancelled the share sheet, do nothing
              if (error instanceof Error && error.message === 'User did not share') {
                setSharing(null);
                return;
              }
              // For any other error, fall back to text-only share
              const text = encodeURIComponent(`Check out my profile on Engage! Book me for your next project: ${profileUrl}`);
              try {
                await Linking.openURL(`https://wa.me/?text=${text}`);
              } catch {
                Alert.alert('WhatsApp', 'Please share this link via WhatsApp manually: ' + profileUrl);
              }
            }
            break;

          case 'x':
            const xText = encodeURIComponent(
              `Check out my profile on Engage! 🎬\n${profileUrl}`
            );
            const xUrl = `https://twitter.com/intent/tweet?text=${xText}`;
            try {
              await Linking.openURL(xUrl);
            } catch {
              Alert.alert('X (Twitter)', 'Could not open X. Please share manually.');
            }
            break;

          case 'linkedin':
            const liUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(
              profileUrl
            )}`;
            try {
              await Linking.openURL(liUrl);
            } catch {
              Alert.alert('LinkedIn', 'Could not open LinkedIn. Please share manually.');
            }
            break;

          case 'more':
            try {
              // Step 1: Capture the passport card as a story-format image
              const uri = await capturePassport('story');
              if (!uri) throw new Error('Failed to capture passport image');

              // Step 2: Try to open the native share sheet with the image
              const isAvailable = await Sharing.isAvailableAsync();
              if (isAvailable) {
                await Sharing.shareAsync(uri, {
                  mimeType: 'image/png',
                  dialogTitle: `Book ${displayName} on Engage`,
                  UTI: 'public.png',
                });
              } else {
                // Share sheet not available -- copy link to clipboard instead
                await Clipboard.setStringAsync(profileUrl);
                Alert.alert('Copied!', 'Profile link copied to clipboard. Share it with others!');
              }
            } catch (error) {
              // If user cancelled the share sheet, do nothing
              if (error instanceof Error && error.message === 'User did not share') {
                setSharing(null);
                return;
              }
              // For any other error, fall back to copying link
              try {
                await Clipboard.setStringAsync(profileUrl);
                Alert.alert('Copied!', 'Profile link copied to clipboard. Share it with others!');
              } catch (e) {
                Alert.alert('Error', 'Could not share. Please try again.');
              }
            }
            break;
        }
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : typeof error === 'string' ? error : 'An error occurred';
        console.error(`Error sharing to ${platform}:`, errorMsg);
      } finally {
        setSharing(null);
      }
    },
    [preCapturedStoryUri, preCapturedSquareUri, profileUrl, displayName]
  );

  const socialPlatforms: Array<{ id: string; label: string; color: string; icon: any | null }> = [
    { id: 'instagram', label: 'Instagram', color: '#E1306C', icon: Instagram },
    { id: 'tiktok', label: 'TikTok', color: '#000000', icon: Music },
    { id: 'whatsapp', label: 'WhatsApp', color: '#25D366', icon: MessageCircle },
    { id: 'x', label: 'X', color: '#000000', icon: Twitter },
    { id: 'linkedin', label: 'LinkedIn', color: '#0077B5', icon: Linkedin },
    { id: 'more', label: 'More', color: '#6b7280', icon: MoreHorizontal },
  ];

  return (
    <View style={[styles.container, { paddingTop: insets.top, backgroundColor: isDark ? '#0A0A0A' : '#ffffff' }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: isDark ? '#0A0A0A' : '#ffffff', borderBottomColor: isDark ? '#374151' : '#e5e7eb' }]}>
        <Pressable
          onPress={() => router.replace('/(talent)/profile')}
          style={({ pressed }) => [
            styles.backButton,
            pressed && { backgroundColor: isDark ? '#1A1A1A' : '#f3f4f6' },
          ]}
        >
          <Text style={[styles.backButtonText, { color: isDark ? '#9ca3af' : '#6b7280' }]}>×</Text>
        </Pressable>
        <Text style={[styles.headerTitle, { color: isDark ? '#ffffff' : '#111827' }]}>Share Your Profile</Text>
        <View style={{ width: 44 }} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollContent, { paddingHorizontal: 0 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Hidden high-res cards for capture - positioned off-screen */}
        <ViewShot
          ref={storyCardRef}
          options={{ format: 'png', quality: 1 }}
          style={{ position: 'absolute', left: -9999, width: 1080, height: 1920, backgroundColor: '#1a1a1a' }}
        >
          <PassportCard
            displayName={displayName}
            avatarUrl={avatarUrl}
            category={category}
            location={location}
            rating={rating}
            completedJobs={completedJobs}
            isVerified={isVerified}
            username={username}
            profileUrl={profileUrl}
            isHighRes={true}
            variant="story"
          />
        </ViewShot>

        <ViewShot
          ref={squareCardRef}
          options={{ format: 'png', quality: 1 }}
          style={{ position: 'absolute', left: -9999, width: 1080, height: 1080, backgroundColor: '#1a1a1a' }}
        >
          <PassportCard
            displayName={displayName}
            avatarUrl={avatarUrl}
            category={category}
            location={location}
            rating={rating}
            completedJobs={completedJobs}
            isVerified={isVerified}
            username={username}
            profileUrl={profileUrl}
            isHighRes={true}
            variant="square"
          />
        </ViewShot>

        {/* Preview Card */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: isDark ? '#ffffff' : '#111827' }]}>Passport Preview</Text>
          <View style={[styles.previewContainer, { backgroundColor: isDark ? '#1A1A1A' : '#f9fafb', borderColor: isDark ? '#374151' : '#e5e7eb' }]}>
            <PassportCard
              displayName={displayName}
              avatarUrl={avatarUrl}
              category={category}
              location={location}
              rating={rating}
              completedJobs={completedJobs}
              isVerified={isVerified}
              username={username}
              profileUrl={profileUrl}
            />
          </View>
        </View>

        {/* Download Buttons */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: isDark ? '#ffffff' : '#111827' }]}>Download</Text>
          {Platform.OS === 'web' ? (
            <View style={[styles.webDisabledMessage, { backgroundColor: isDark ? 'rgba(245,158,11,0.1)' : '#fef3c7', borderColor: isDark ? 'rgba(245,158,11,0.3)' : '#fcd34d' }]}>
              <Text style={[styles.webDisabledText, { color: isDark ? '#f59e0b' : '#92400e' }]}>
                Download is only available on native mobile apps. Please use the iOS or Android app to download your passport card.
              </Text>
            </View>
          ) : (
            <View style={styles.downloadGrid}>
              <Pressable
                onPress={() => captureAndShare('story')}
                disabled={!!downloading}
                style={({ pressed }) => [
                  styles.downloadButton,
                  styles.downloadButtonPrimary,
                  pressed && styles.downloadButtonPressed,
                ]}
              >
                {downloading === 'story' ? (
                  <ActivityIndicator size={20} color="#ffffff" />
                ) : (
                  <>
                    <Download size={20} color="#ffffff" />
                    <Text style={styles.downloadButtonText}>Story 9:16</Text>
                  </>
                )}
              </Pressable>

              <Pressable
                onPress={() => captureAndShare('square')}
                disabled={!!downloading}
                style={({ pressed }) => [
                  styles.downloadButton,
                  styles.downloadButtonSecondary,
                  pressed && styles.downloadButtonPressed,
                  { borderColor: isDark ? '#555555' : '#d1d5db' }
                ]}
              >
                {downloading === 'square' ? (
                  <ActivityIndicator size={20} color={isDark ? '#9ca3af' : '#6b7280'} />
                ) : (
                  <>
                    <Download size={20} color={isDark ? '#9ca3af' : '#6b7280'} />
                    <Text style={[styles.downloadButtonTextSecondary, { color: isDark ? '#9ca3af' : '#6b7280' }]}>Square 1:1</Text>
                  </>
                )}
              </Pressable>
            </View>
          )}
        </View>

        {/* Link Copy Row */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: isDark ? '#ffffff' : '#111827' }]}>Copy Link</Text>
          <View style={[styles.urlRow, { backgroundColor: isDark ? '#1A1A1A' : '#f3f4f6', borderColor: isDark ? '#374151' : '#e5e7eb' }]}>
            <Text style={[styles.urlText, { color: isDark ? '#9ca3af' : '#6b7280' }]} numberOfLines={1}>
              {profileUrl}
            </Text>
            <Pressable
              onPress={handleCopy}
              style={({ pressed }) => [
                styles.copyButton,
                copied && styles.copyButtonCopied,
                pressed && { backgroundColor: isDark ? '#2d2d2d' : '#f3f4f6' },
                { borderColor: isDark ? '#374151' : '#e5e7eb' }
              ]}
            >
              {copied ? (
                <CheckCircle size={18} color="#10b981" />
              ) : (
                <Copy size={18} color={isDark ? '#9ca3af' : '#6b7280'} />
              )}
            </Pressable>
          </View>
        </View>

        {/* Social Share Grid */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: isDark ? '#ffffff' : '#111827' }]}>Share Profile</Text>
          <View style={styles.socialGrid}>
            {socialPlatforms.map((platform) => (
              <Pressable
                key={platform.id}
                onPress={() => handleSocialShare(platform.id)}
                disabled={!!sharing}
                style={({ pressed }) => [
                  styles.socialButton,
                  { backgroundColor: platform.color },
                  pressed && { opacity: 0.8 },
                ]}
              >
                {sharing === platform.id ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <View style={styles.socialButtonContent}>
                    {platform.icon ? (
                      <View style={{ width: 20, height: 20, justifyContent: 'center', alignItems: 'center' }}>
                        {React.createElement(platform.icon, {
                          size: 20,
                          color: '#ffffff',
                          strokeWidth: 2,
                        })}
                      </View>
                    ) : (
                      <Text style={{ fontSize: 16, fontWeight: '600', color: '#ffffff' }}>
                        {platform.id === 'tiktok' ? '♪' : platform.id === 'x' ? '𝕏' : ''}
                      </Text>
                    )}
                    <Text style={styles.socialButtonLabel}>{platform.label}</Text>
                  </View>
                )}
              </Pressable>
            ))}
          </View>
        </View>

        {/* Referral Stats Card */}
        <View style={styles.section}>
          <View style={[styles.referralCard, { backgroundColor: isDark ? '#1A1A1A' : '#f9fafb', borderColor: isDark ? '#374151' : '#e5e7eb' }]}>
            <View style={[styles.referralIconContainer, { backgroundColor: isDark ? 'rgba(250, 86, 16, 0.15)' : 'rgba(250, 86, 16, 0.1)' }]}>
              <Gift size={28} color="#fa5610" />
            </View>
            <View style={styles.referralContent}>
              <Text style={[styles.referralTitle, { color: isDark ? '#ffffff' : '#111827' }]}>Earn with Referrals</Text>
              <Text style={[styles.referralSubtitle, { color: isDark ? '#9ca3af' : '#6b7280' }]}>
                Share your passport and earn credits when people join
              </Text>
            </View>
            <View style={styles.referralStats}>
              <View style={styles.referralStat}>
                <Text style={styles.referralStatValue}>{referralStats.signups}</Text>
                <Text style={[styles.referralStatLabel, { color: isDark ? '#9ca3af' : '#9ca3af' }]}>Signups</Text>
              </View>
              <View style={styles.referralStat}>
                <Text style={styles.referralStatValue}>+{referralStats.credits}</Text>
                <Text style={[styles.referralStatLabel, { color: isDark ? '#9ca3af' : '#9ca3af' }]}>Credits</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Bottom spacer */}
        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backButtonText: {
    fontSize: 32,
    color: '#6b7280',
    fontWeight: '300',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    flex: 1,
    textAlign: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingVertical: 16,
    paddingHorizontal: 0,
  },
  section: {
    paddingHorizontal: 16,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 12,
  },
  previewContainer: {
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#f9fafb',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  passportCard: {
    borderRadius: 10,
    overflow: 'hidden',
  },
  downloadGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  downloadButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 12,
    minHeight: 52,
  },
  downloadButtonPrimary: {
    backgroundColor: '#fa5610',
  },
  downloadButtonSecondary: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#d1d5db',
  },
  downloadButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff',
  },
  downloadButtonTextSecondary: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6b7280',
  },
  downloadButtonPressed: {
    opacity: 0.8,
  },
  webDisabledMessage: {
    backgroundColor: '#fef3c7',
    borderWidth: 1,
    borderColor: '#fcd34d',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  webDisabledText: {
    fontSize: 13,
    color: '#92400e',
    lineHeight: 18,
  },
  urlRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f3f4f6',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    gap: 10,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  urlText: {
    flex: 1,
    fontSize: 13,
    color: '#6b7280',
    fontWeight: '500',
  },
  copyButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  copyButtonCopied: {
    backgroundColor: 'rgba(16,185,129,0.1)',
    borderColor: 'rgba(16,185,129,0.3)',
  },
  socialGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    justifyContent: 'space-between',
  },
  socialButton: {
    width: '48%',
    paddingHorizontal: 12,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 90,
  },
  socialButtonContent: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  socialButtonIcon: {
    fontSize: 20,
  },
  socialButtonLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#ffffff',
    textAlign: 'center',
  },
  referralCard: {
    backgroundColor: '#f9fafb',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  referralIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 12,
    backgroundColor: 'rgba(250, 86, 16, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  referralContent: {
    flex: 1,
  },
  referralTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 2,
  },
  referralSubtitle: {
    fontSize: 12,
    color: '#6b7280',
  },
  referralStats: {
    flexDirection: 'row',
    gap: 16,
    alignItems: 'center',
  },
  referralStat: {
    alignItems: 'center',
  },
  referralStatValue: {
    fontSize: 14,
    fontWeight: '700',
    color: '#fa5610',
  },
  referralStatLabel: {
    fontSize: 10,
    color: '#9ca3af',
    marginTop: 2,
  },
});
