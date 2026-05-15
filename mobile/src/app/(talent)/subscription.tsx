import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  TextInput,
  ActivityIndicator,
  Alert,
  Linking,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import Animated, { FadeInDown } from 'react-native-reanimated';
import {
  ChevronLeft,
  Crown,
  TrendingUp,
  Image,
  BarChart,
  Sparkles,
  Ticket,
  Check,
  X,
} from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '@/lib/supabase';
import { SkeletonLoader } from '@/components/SkeletonLoader';

const COLORS = {
  primary: '#FA5610',
  gradientEnd: '#FF7A3D',
  foreground: '#171717',
  muted: '#737373',
  border: '#E5E5E5',
  success: '#10B981',
  error: '#EF4444',
  accentLightBg: 'rgba(250,86,16,0.1)',
  accentBadgeBg: 'rgba(250,86,16,0.2)',
  premiumGradientFrom: 'rgba(250,86,16,0.1)',
  premiumGradientTo: 'rgba(250,86,16,0.05)',
  white: '#FFFFFF',
  pageBg: '#FAFAFA',
};

const CACHE_KEY = 'premium_subscription_status';
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

interface CachedPremiumStatus {
  isPremium: boolean;
  renewalDate: string | null;
  timestamp: number;
}

function FreeFeature({ label }: { label: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 }}>
      <View
        style={{
          width: 24,
          height: 24,
          borderRadius: 12,
          backgroundColor: COLORS.success,
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        <Check size={14} color="white" />
      </View>
      <Text style={{ color: COLORS.foreground, fontSize: 14, fontWeight: '500', flex: 1 }}>
        {label}
      </Text>
    </View>
  );
}

interface PremiumFeatureProps {
  icon: React.ComponentType<{ size: number; color: string }>;
  label: string;
}

function PremiumFeature({ icon: Icon, label }: PremiumFeatureProps) {
  return (
    <View style={{ alignItems: 'center', gap: 8, marginBottom: 16 }}>
      <View
        style={{
          width: 48,
          height: 48,
          borderRadius: 24,
          backgroundColor: COLORS.accentBadgeBg,
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        <Icon size={24} color={COLORS.primary} />
      </View>
      <Text style={{ color: COLORS.foreground, fontSize: 12, fontWeight: '500', textAlign: 'center' }}>
        {label}
      </Text>
    </View>
  );
}

function StickyHeader({ onBackPress }: { onBackPress: () => void }) {
  return (
    <View
      style={{
        paddingHorizontal: 16,
        paddingVertical: 12,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.8)',
        borderBottomWidth: 1,
        borderBottomColor: COLORS.border,
        backdropFilter: 'blur(10px)',
      }}
    >
      <Pressable onPress={onBackPress} style={{ width: 40, height: 40, justifyContent: 'center' }}>
        <ChevronLeft size={24} color={COLORS.foreground} />
      </Pressable>
      <Text style={{ fontSize: 18, fontWeight: '700', color: COLORS.foreground, flex: 1, textAlign: 'center', marginRight: 40 }}>
        Subscription
      </Text>
    </View>
  );
}

function CurrentPlanCard({
  renewalDate,
}: {
  renewalDate: string | null;
}) {
  const handleManageSubscription = async () => {
    try {
      const result = await supabase.functions.invoke('customer-portal');
      if (result.data?.portal_url) {
        await Linking.openURL(result.data.portal_url);
      } else {
        Alert.alert('Error', 'Unable to open customer portal.');
      }
    } catch (error) {
      const err = error as any;
      const errorMsg = err instanceof Error ? err.message : typeof err === 'string' ? err : 'An error occurred';
      Alert.alert('Error', 'Failed to open customer portal.');
      console.error('Customer portal error:', errorMsg);
    }
  };

  const formattedDate = renewalDate
    ? new Date(renewalDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    : 'Unknown';

  return (
    <Animated.View entering={FadeInDown.delay(100).duration(400)}>
      <View
        style={{
          marginHorizontal: 16,
          marginBottom: 24,
          borderRadius: 16,
          borderWidth: 2,
          borderColor: COLORS.primary,
          backgroundColor: COLORS.white,
          padding: 20,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.08,
          shadowRadius: 12,
          elevation: 4,
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 }}>
          <View
            style={{
              width: 56,
              height: 56,
              borderRadius: 28,
              backgroundColor: COLORS.accentLightBg,
              justifyContent: 'center',
              alignItems: 'center',
            }}
          >
            <Crown size={28} color={COLORS.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ color: COLORS.foreground, fontSize: 16, fontWeight: '700' }}>
              Premium Active
            </Text>
            <View
              style={{
                paddingHorizontal: 8,
                paddingVertical: 4,
                borderRadius: 6,
                backgroundColor: 'rgba(16,185,129,0.15)',
                marginTop: 6,
                alignSelf: 'flex-start',
              }}
            >
              <Text style={{ color: COLORS.success, fontSize: 11, fontWeight: '600' }}>
                Active
              </Text>
            </View>
          </View>
        </View>

        <Text style={{ color: COLORS.muted, fontSize: 13, marginBottom: 16 }}>
          Renews {formattedDate}
        </Text>

        <Pressable
          onPress={handleManageSubscription}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: COLORS.primary,
            borderRadius: 10,
            paddingVertical: 12,
            gap: 8,
          }}
        >
          <Text style={{ color: COLORS.white, fontSize: 14, fontWeight: '600' }}>
            Manage Subscription
          </Text>
        </Pressable>
      </View>
    </Animated.View>
  );
}

function FreePlanCard({
  isPremium,
}: {
  isPremium: boolean;
}) {
  return (
    <Animated.View entering={FadeInDown.delay(150).duration(400)}>
      <View
        style={{
          marginHorizontal: 16,
          marginBottom: 24,
          borderRadius: 16,
          borderWidth: 2,
          borderColor: isPremium ? COLORS.border : COLORS.primary,
          backgroundColor: COLORS.white,
          padding: 20,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.08,
          shadowRadius: 12,
          elevation: 4,
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <Text style={{ color: COLORS.foreground, fontSize: 16, fontWeight: '700' }}>Free Plan</Text>
          {!isPremium && (
            <View
              style={{
                paddingHorizontal: 10,
                paddingVertical: 6,
                borderRadius: 6,
                backgroundColor: COLORS.accentBadgeBg,
              }}
            >
              <Text style={{ color: COLORS.primary, fontSize: 11, fontWeight: '600' }}>
                Current Plan
              </Text>
            </View>
          )}
        </View>

        <FreeFeature label="Build your portfolio" />
        <FreeFeature label="Get discovered by clients" />
        <FreeFeature label="Receive booking requests" />
        <FreeFeature label="Connect with other talents" />
      </View>
    </Animated.View>
  );
}

function PremiumPlanCard({
  isPremium,
  onUpgradePress,
  isLoading,
}: {
  isPremium: boolean;
  onUpgradePress: () => void;
  isLoading: boolean;
}) {
  return (
    <Animated.View entering={FadeInDown.delay(200).duration(400)}>
      <View
        style={{
          marginHorizontal: 16,
          marginBottom: 24,
          borderRadius: 16,
          overflow: 'hidden',
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.12,
          shadowRadius: 16,
          elevation: 6,
        }}
      >
        {/* Gradient background */}
        <View
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: COLORS.premiumGradientFrom,
          }}
        />

        <View
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: COLORS.premiumGradientTo,
          }}
        />

        <View style={{ position: 'relative', zIndex: 1, padding: 20, backgroundColor: COLORS.white }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
            <View>
              <Text style={{ color: COLORS.foreground, fontSize: 16, fontWeight: '700' }}>Premium Plan</Text>
              <Text style={{ color: COLORS.muted, fontSize: 13, marginTop: 4 }}>Get the most out of Engage</Text>
            </View>
            <View
              style={{
                width: 48,
                height: 48,
                borderRadius: 24,
                backgroundColor: COLORS.accentLightBg,
                justifyContent: 'center',
                alignItems: 'center',
              }}
            >
              <Crown size={24} color={COLORS.primary} />
            </View>
          </View>

          <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginBottom: 24, marginHorizontal: -8 }}>
            <View style={{ width: '50%', paddingHorizontal: 8, marginBottom: 16 }}>
              <PremiumFeature icon={TrendingUp} label="Featured on discovery" />
            </View>
            <View style={{ width: '50%', paddingHorizontal: 8, marginBottom: 16 }}>
              <PremiumFeature icon={BarChart} label="Priority in search" />
            </View>
            <View style={{ width: '50%', paddingHorizontal: 8, marginBottom: 16 }}>
              <PremiumFeature icon={Sparkles} label="Verified badge" />
            </View>
            <View style={{ width: '50%', paddingHorizontal: 8, marginBottom: 16 }}>
              <PremiumFeature icon={Image} label="Advanced analytics" />
            </View>
          </View>

          {!isPremium ? (
            <>
              <View style={{ marginBottom: 16, paddingVertical: 12, borderTopWidth: 1, borderBottomWidth: 1, borderColor: COLORS.border }}>
                <Text style={{ color: COLORS.foreground, fontSize: 24, fontWeight: '700' }}>
                  AED 149<Text style={{ fontSize: 14, fontWeight: '500', color: COLORS.muted }}>/mo</Text>
                </Text>
              </View>

              <Pressable
                onPress={onUpgradePress}
                disabled={isLoading}
                style={({ pressed }) => ({
                  backgroundColor: isLoading ? 'rgba(250,86,16,0.6)' : COLORS.primary,
                  borderRadius: 10,
                  paddingVertical: 14,
                  alignItems: 'center',
                  opacity: pressed ? 0.8 : 1,
                })}
              >
                {isLoading ? (
                  <ActivityIndicator size="small" color="white" />
                ) : (
                  <Text style={{ color: COLORS.white, fontSize: 15, fontWeight: '600' }}>
                    Upgrade to Premium
                  </Text>
                )}
              </Pressable>
            </>
          ) : (
            <View style={{ paddingVertical: 12, alignItems: 'center' }}>
              <Text style={{ color: COLORS.success, fontSize: 14, fontWeight: '600' }}>
                Already subscribed
              </Text>
            </View>
          )}
        </View>
      </View>
    </Animated.View>
  );
}

function CouponSection({
  isPremium,
  onApplyCoupon,
  isLoading,
}: {
  isPremium: boolean;
  onApplyCoupon: (code: string) => void;
  isLoading: boolean;
}) {
  const [couponCode, setCouponCode] = useState('');

  const handleApply = () => {
    if (couponCode.trim()) {
      onApplyCoupon(couponCode.trim());
    }
  };

  if (isPremium) return null;

  return (
    <Animated.View entering={FadeInDown.delay(250).duration(400)}>
      <View
        style={{
          marginHorizontal: 16,
          marginBottom: 24,
          borderRadius: 16,
          borderWidth: 2,
          borderStyle: 'dashed',
          borderColor: COLORS.border,
          padding: 16,
          backgroundColor: COLORS.white,
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 }}>
          <Ticket size={18} color={COLORS.primary} />
          <Text style={{ color: COLORS.foreground, fontSize: 14, fontWeight: '600', flex: 1 }}>
            Have a coupon code?
          </Text>
        </View>

        <View style={{ flexDirection: 'row', gap: 8 }}>
          <TextInput
            placeholder="Enter coupon code"
            value={couponCode}
            onChangeText={setCouponCode}
            style={{
              flex: 1,
              borderWidth: 1,
              borderColor: COLORS.border,
              borderRadius: 8,
              paddingHorizontal: 12,
              paddingVertical: 10,
              fontSize: 14,
              color: COLORS.foreground,
            }}
            editable={!isLoading}
          />
          <Pressable
            onPress={handleApply}
            disabled={isLoading || !couponCode.trim()}
            style={({ pressed }) => ({
              backgroundColor: isLoading || !couponCode.trim() ? 'rgba(250,86,16,0.4)' : COLORS.primary,
              borderRadius: 8,
              paddingHorizontal: 16,
              paddingVertical: 10,
              justifyContent: 'center',
              opacity: pressed ? 0.8 : 1,
            })}
          >
            {isLoading ? (
              <ActivityIndicator size="small" color="white" />
            ) : (
              <Text style={{ color: COLORS.white, fontSize: 13, fontWeight: '600' }}>Apply</Text>
            )}
          </Pressable>
        </View>
      </View>
    </Animated.View>
  );
}

function WhyGoPremiumSection() {
  return (
    <Animated.View entering={FadeInDown.delay(300).duration(400)}>
      <View style={{ marginHorizontal: 16, marginBottom: 24 }}>
        <Text style={{ color: COLORS.foreground, fontSize: 16, fontWeight: '700', marginBottom: 16 }}>
          Why Go Premium?
        </Text>

        <View style={{ gap: 12 }}>
          <Text style={{ color: COLORS.muted, fontSize: 13, lineHeight: 20 }}>
            Premium members get featured on our discovery page, making it easier for clients to find and book you. Join top talents and increase your visibility.
          </Text>

          <Text style={{ color: COLORS.muted, fontSize: 13, lineHeight: 20 }}>
            Premium members appear at the top of search results when clients are looking for your category. Stand out from the competition and get more bookings.
          </Text>

          <Text style={{ color: COLORS.muted, fontSize: 13, lineHeight: 20 }}>
            Build trust with a verified badge on your profile and in search results. Clients feel more confident booking premium members who have been verified.
          </Text>
        </View>
      </View>
    </Animated.View>
  );
}

export default function SubscriptionScreen() {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams();
  const [isPremium, setIsPremium] = useState<boolean>(false);
  const [renewalDate, setRenewalDate] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isCheckingPremium, setIsCheckingPremium] = useState(true);
  const [toastMessage, setToastMessage] = useState('');

  // Check premium status with caching
  const checkPremiumStatus = useCallback(async (forceRefresh = false) => {
    try {
      setIsCheckingPremium(true);

      // Check cache first
      if (!forceRefresh) {
        const cached = await AsyncStorage.getItem(CACHE_KEY);
        if (cached) {
          const parsedCache = JSON.parse(cached) as CachedPremiumStatus;
          const isValid = Date.now() - parsedCache.timestamp < CACHE_DURATION;
          if (isValid) {
            setIsPremium(parsedCache.isPremium);
            setRenewalDate(parsedCache.renewalDate);
            setIsCheckingPremium(false);
            return;
          }
        }
      }

      // Fetch fresh status
      const result = await supabase.functions.invoke('check-premium-subscription');
      if (result.data) {
        const isPrem = result.data.subscribed === true;
        const renewDate = result.data.subscription_end || null;

        setIsPremium(isPrem);
        setRenewalDate(renewDate);

        // Cache the result
        const cacheData: CachedPremiumStatus = {
          isPremium: isPrem,
          renewalDate: renewDate,
          timestamp: Date.now(),
        };
        await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(cacheData));
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : typeof error === 'string' ? error : 'An error occurred';
      Alert.alert('Error', 'Unable to load subscription status. Please try again.');
      console.error('Error checking premium status:', errorMsg);
    } finally {
      setIsCheckingPremium(false);
    }
  }, []);

  // Handle checkout success/cancel URL params
  useEffect(() => {
    if (params.success === 'true') {
      setToastMessage('Subscription created successfully!');
      checkPremiumStatus(true);
      // Clear the URL param
      setTimeout(() => {
        router.replace('/(talent)/subscription');
      }, 1500);
    } else if (params.canceled === 'true') {
      setToastMessage('Checkout was canceled.');
      // Clear the URL param
      setTimeout(() => {
        router.replace('/(talent)/subscription');
      }, 1500);
    }
  }, [params, checkPremiumStatus]);

  // Initial load
  useEffect(() => {
    checkPremiumStatus();
  }, [checkPremiumStatus]);

  const handleUpgradePress = async () => {
    try {
      setIsLoading(true);
      const result = await supabase.functions.invoke('create-premium-checkout');
      if (result.data?.checkout_url) {
        await Linking.openURL(result.data.checkout_url);
      } else {
        Alert.alert('Error', 'Unable to create checkout session. Please try again.');
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : typeof error === 'string' ? error : 'An error occurred';
      console.error('Premium checkout error:', errorMsg);
      Alert.alert('Error', 'Failed to initiate checkout. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleApplyCoupon = async (code: string) => {
    try {
      setIsLoading(true);
      const result = await supabase.functions.invoke('validate-premium-coupon', {
        body: { coupon_code: code },
      });

      if (result.data?.valid) {
        setToastMessage(`Coupon applied! Discount: ${result.data.discount || ''}%`);
        // Proceed to checkout with coupon
        setTimeout(() => {
          handleUpgradePress();
        }, 500);
      } else {
        Alert.alert('Invalid Coupon', result.data?.message || 'This coupon code is invalid or expired.');
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : typeof error === 'string' ? error : 'An error occurred';
      console.error('Coupon validation error:', errorMsg);
      Alert.alert('Error', 'Failed to validate coupon. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  if (isCheckingPremium) {
    return (
      <View style={{ flex: 1, backgroundColor: COLORS.pageBg, paddingTop: insets.top }}>
        {/* Header - always visible */}
        <View
          style={{
            paddingHorizontal: 16,
            paddingVertical: 12,
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: 'rgba(255,255,255,0.8)',
            borderBottomWidth: 1,
            borderBottomColor: COLORS.border,
            backdropFilter: 'blur(10px)',
          }}
        >
          <Pressable onPress={() => router.push('/(talent)/profile')} style={{ width: 40, height: 40, justifyContent: 'center' }}>
            <ChevronLeft size={24} color={COLORS.foreground} />
          </Pressable>
          <Text style={{ fontSize: 18, fontWeight: '700', color: COLORS.foreground, flex: 1, textAlign: 'center', marginRight: 40 }}>
            Subscription
          </Text>
        </View>

        {/* Skeleton Loading Content */}
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingBottom: insets.bottom + 32 }}
          showsVerticalScrollIndicator={false}
        >
          {/* Plan Cards Skeleton */}
          <View style={{ marginHorizontal: 16, marginBottom: 24, marginTop: 24 }}>
            {/* Free Plan Card Skeleton */}
            <View
              style={{
                borderRadius: 16,
                borderWidth: 2,
                borderColor: COLORS.border,
                backgroundColor: COLORS.white,
                padding: 20,
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.08,
                shadowRadius: 12,
                elevation: 4,
              }}
            >
              <SkeletonLoader width="30%" height={20} borderRadius={4} style={{ marginBottom: 16 }} />
              <SkeletonLoader width="100%" height={60} borderRadius={4} style={{ marginBottom: 16 }} />
              <SkeletonLoader width="100%" height={60} borderRadius={4} />
            </View>
          </View>

          {/* Premium Plan Card Skeleton */}
          <View style={{ marginHorizontal: 16, marginBottom: 24 }}>
            <View
              style={{
                borderRadius: 16,
                overflow: 'hidden',
                backgroundColor: COLORS.white,
                padding: 20,
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.12,
                shadowRadius: 16,
                elevation: 6,
              }}
            >
              <SkeletonLoader width="40%" height={20} borderRadius={4} style={{ marginBottom: 12 }} />
              <SkeletonLoader width="80%" height={16} borderRadius={4} style={{ marginBottom: 24 }} />
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginBottom: 24, marginHorizontal: -8, gap: 16 }}>
                {[1, 2, 3, 4].map((i) => (
                  <View key={i} style={{ width: '50%', paddingHorizontal: 8 }}>
                    <SkeletonLoader width={48} height={48} borderRadius={24} style={{ marginBottom: 8, alignSelf: 'center' }} />
                    <SkeletonLoader width="80%" height={12} borderRadius={4} style={{ alignSelf: 'center' }} />
                  </View>
                ))}
              </View>
              <SkeletonLoader width="100%" height={50} borderRadius={10} />
            </View>
          </View>

          {/* Why Go Premium Skeleton */}
          <View style={{ marginHorizontal: 16 }}>
            <SkeletonLoader width="50%" height={20} borderRadius={4} style={{ marginBottom: 16 }} />
            {[1, 2, 3].map((i) => (
              <SkeletonLoader key={i} width="100%" height={60} borderRadius={4} style={{ marginBottom: 12 }} />
            ))}
          </View>
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.pageBg, paddingTop: insets.top }}>
      <StickyHeader onBackPress={() => router.push('/(talent)/profile')} />

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: insets.bottom + 32 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Current Plan Card - Only if Premium */}
        {isPremium ? <CurrentPlanCard renewalDate={renewalDate} /> : null}

        {/* Free Plan Card */}
        <FreePlanCard isPremium={isPremium} />

        {/* Premium Plan Card */}
        <PremiumPlanCard isPremium={isPremium} onUpgradePress={handleUpgradePress} isLoading={isLoading} />

        {/* Coupon Section - Only if Not Premium */}
        <CouponSection isPremium={isPremium} onApplyCoupon={handleApplyCoupon} isLoading={isLoading} />

        {/* Why Go Premium Section */}
        <WhyGoPremiumSection />
      </ScrollView>

      {/* Toast Message */}
      {toastMessage ? (
        <Animated.View
          entering={FadeInDown.duration(300)}
          style={{
            position: 'absolute',
            bottom: insets.bottom + 20,
            left: 16,
            right: 16,
            backgroundColor: COLORS.foreground,
            borderRadius: 12,
            padding: 14,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 12,
          }}
        >
          <Text style={{ color: COLORS.white, fontSize: 14, fontWeight: '500', flex: 1 }}>
            {toastMessage}
          </Text>
          <Pressable onPress={() => setToastMessage('')}>
            <X size={18} color={COLORS.white} />
          </Pressable>
        </Animated.View>
      ) : null}
    </View>
  );
}

