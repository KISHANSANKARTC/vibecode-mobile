import { View, Text, ScrollView, Pressable, Image, Alert, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';
import { router } from 'expo-router';
import Animated, { FadeInDown, useSharedValue, useAnimatedStyle, withTiming } from 'react-native-reanimated';
import { useTheme } from '@/lib/theme/ThemeContext';
import {
  User,
  Settings,
  Building2,
  Shield,
  CreditCard,
  Wallet,
  Bell,
  HelpCircle,
  FileText,
  Lock,
  LogOut,
  ChevronRight,
  BadgeCheck,
  Camera,
  Briefcase,
  Moon,
  Sun,
} from 'lucide-react-native';
import type { LucideIcon } from 'lucide-react-native';
import { useAuthStore } from '@/lib/state/auth-store';
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { ProfileSkeleton } from '@/components/SkeletonLoader';
import { extractErrorMessage } from '@/lib/errorUtils';

// Default placeholder avatar
const PLACEHOLDER_AVATAR = 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&h=200&fit=crop';

// User profile type
interface UserProfile {
  fullName: string;
  username: string;
  email: string;
  avatar: string;
  accountType: string; // 'Organization' or 'Individual'
  companyName?: string;
  verificationStatus: 'Verified' | 'Pending' | 'Rejected' | 'Not Verified';
  isOrganization: boolean;
  isOrgVerified: boolean;
}

interface MenuItemProps {
  icon: LucideIcon;
  label: string;
  subtitle?: string;
  showBadge?: boolean;
  isDestructive?: boolean;
  isLoading?: boolean;
  onPress: () => void;
}

interface MenuItemPropsExtended extends MenuItemProps {
  isDark?: boolean;
}

function MenuItem({ icon: Icon, label, subtitle, showBadge, isDestructive, isLoading, onPress, isDark = false }: MenuItemPropsExtended) {
  return (
    <Pressable
      onPress={onPress}
      disabled={isLoading}
      className="flex-row items-center py-4 px-4"
      style={({ pressed }) => ({
        opacity: pressed ? 0.7 : isLoading ? 0.5 : 1,
      })}
    >
      <View
        className="w-10 h-10 rounded-xl items-center justify-center mr-4"
        style={{
          backgroundColor: isDestructive ? 'rgba(239, 68, 68, 0.15)' : 'rgba(249, 115, 22, 0.15)',
        }}
      >
        <Icon size={20} color={isDestructive ? '#EF4444' : '#F97316'} strokeWidth={1.5} />
      </View>
      <View className="flex-1">
        <View className="flex-row items-center">
          <Text
            className="text-base font-medium"
            style={{ color: isDestructive ? '#EF4444' : (isDark ? '#FFFFFF' : '#1F2937') }}
          >
            {label}
          </Text>
          {showBadge ? (
            <View className="ml-2 px-2 py-0.5 rounded-full bg-green-100">
              <Text className="text-green-700 text-xs font-medium">Verified</Text>
            </View>
          ) : null}
        </View>
        {subtitle ? (
          <Text className="text-sm mt-0.5" style={{ color: isDark ? '#9CA3AF' : '#737373' }}>{subtitle}</Text>
        ) : null}
      </View>
      {isLoading ? (
        <ActivityIndicator size="small" color={isDestructive ? '#EF4444' : '#9CA3AF'} />
      ) : !isDestructive ? (
        <ChevronRight size={20} color={isDark ? '#6B7280' : '#D1D5DB'} strokeWidth={1.5} />
      ) : null}
    </Pressable>
  );
}

function GlassCard({ children, delay = 0, isDark = false }: { children: React.ReactNode; delay?: number; isDark?: boolean }) {
  return (
    <Animated.View
      entering={FadeInDown.delay(delay).duration(400)}
      className="mx-5 mb-4 overflow-hidden rounded-2xl"
    >
      <BlurView
        intensity={30}
        tint={isDark ? 'dark' : 'light'}
        style={{
          backgroundColor: isDark ? 'rgba(26, 26, 26, 0.95)' : 'rgba(255, 255, 255, 0.95)',
          borderWidth: 1,
          borderColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(229, 231, 235, 0.8)',
          borderRadius: 16,
          overflow: 'hidden',
        }}
      >
        {children}
      </BlurView>
    </Animated.View>
  );
}

function Divider() {
  return (
    <View
      className="mx-4"
      style={{
        height: 1,
        backgroundColor: 'rgba(229, 231, 235, 0.6)',
      }}
    />
  );
}

export default function ClientProfileScreen() {
  const insets = useSafeAreaInsets();
  const { theme, setTheme } = useTheme();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [loading, setLoading] = useState(true);

  // Avatar fade-in animation
  const avatarOpacity = useSharedValue(0);
  const avatarAnimatedStyle = useAnimatedStyle(() => ({
    opacity: avatarOpacity.value,
  }));

  const handleAvatarLoad = () => {
    avatarOpacity.value = withTiming(1, { duration: 200 });
  };

  // Auth store - get user early
  const user = useAuthStore((s) => s.user);

  // Initialize with auth user data if available, to avoid placeholder flicker
  const [userProfile, setUserProfile] = useState<UserProfile>({
    fullName: user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'User',
    username: `@${user?.email?.split('@')[0] || 'user'}`,
    email: user?.email || 'user@example.com',
    avatar: user?.user_metadata?.avatar_url || PLACEHOLDER_AVATAR,
    accountType: 'Individual',
    verificationStatus: 'Not Verified',
    isOrganization: false,
    isOrgVerified: false,
  });
  const signOut = useAuthStore((s) => s.signOut);

  // Fetch user profile from Supabase
  const fetchUserProfile = useCallback(async () => {
    try {
      setLoading(true);

      if (!user) {
        setLoading(false);
        return;
      }

      // Execute all queries in parallel for better performance
      const [profileResult, companyResult, verificationResult] = await Promise.all([
        supabase
          .from('profiles')
          .select('id, full_name, avatar_url, username')
          .eq('id', user.id)
          .single(),
        supabase
          .from('client_companies')
          .select('company_name, is_verified')
          .eq('user_id', user.id)
          .maybeSingle(),
        supabase
          .from('client_verifications')
          .select('status')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle(),
      ]);

      const { data: profileData, error: profileError } = profileResult;
      const { data: companyData } = companyResult;
      const { data: verificationData } = verificationResult;

      if (profileError) {
        console.log('Profile fetch error:', profileError.message);
      } else {
        console.log('Profile data fetched:', profileData);
      }

      // Check if user has a company record (determines if organization)
      let companyName: string | undefined;
      let isOrgVerified = false;
      let isOrganization = false;

      if (companyData) {
        isOrganization = true;
        companyName = companyData.company_name;
        // Properly convert is_verified to boolean (handles true, "true", 1, "1")
        isOrgVerified = companyData.is_verified === true
          || companyData.is_verified === "true"
          || companyData.is_verified === 1
          || companyData.is_verified === "1";
        console.log('Company data found:', companyData, 'isOrgVerified:', isOrgVerified);
      } else {
        console.log('No company data found - user is individual');
      }

      // Fetch verification status for individuals
      let verificationStatus: 'Verified' | 'Pending' | 'Rejected' | 'Not Verified' = 'Not Verified';
      if (!isOrganization) {
        if (verificationData && verificationData.status) {
          const status = verificationData.status.toLowerCase().trim();
          console.log('Individual verification data:', verificationData, 'status:', status);
          if (status === 'approved') {
            verificationStatus = 'Verified';
          } else if (status === 'pending') {
            verificationStatus = 'Pending';
          } else if (status === 'rejected') {
            verificationStatus = 'Rejected';
          } else {
            console.log('Unknown status value:', verificationData.status);
          }
        } else {
          console.log('No verification data found for individual user');
        }
      }

      console.log('Final verification status:', verificationStatus, 'isOrganization:', isOrganization);

      // Build user profile from available data
      setUserProfile({
        fullName: profileData?.full_name || user.user_metadata?.full_name || user.email?.split('@')[0] || 'User',
        username: profileData?.username || `@${user.email?.split('@')[0] || 'user'}`,
        email: user.email || 'user@example.com',
        avatar: profileData?.avatar_url || user.user_metadata?.avatar_url || PLACEHOLDER_AVATAR,
        accountType: isOrganization ? 'Organization' : 'Individual',
        companyName: companyName,
        verificationStatus: isOrganization ? (isOrgVerified ? 'Verified' : 'Not Verified') : verificationStatus,
        isOrganization: isOrganization,
        isOrgVerified: isOrgVerified,
      });
    } catch (err) {
      const errorMsg = extractErrorMessage(err);
      console.error('Error fetching profile:', errorMsg);
      // Use auth user data as fallback
      setUserProfile({
        fullName: user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'User',
        username: `@${user?.email?.split('@')[0] || 'user'}`,
        email: user?.email || 'user@example.com',
        avatar: user?.user_metadata?.avatar_url || PLACEHOLDER_AVATAR,
        accountType: 'Individual',
        verificationStatus: 'Not Verified',
        isOrganization: false,
        isOrgVerified: false,
      });
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchUserProfile();
  }, [fetchUserProfile]);

  const handleHapticPress = (item: string) => {
    // Placeholder for haptic feedback
    console.log(`Tapped: ${item}`);
  };

  const handleLogout = () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            setIsLoggingOut(true);
            await signOut();
            setIsLoggingOut(false);
            router.replace('/onboarding/welcome');
          },
        },
      ]
    );
  };

  const handleThemeToggle = async () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    await setTheme(newTheme);
    console.log(`Theme switched to: ${newTheme}`);
  };

  return (
    <View className="flex-1" style={{ backgroundColor: theme === 'dark' ? '#0A0A0A' : '#F8F8F8' }}>
      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}
      >
        {/* Loading State */}
        {loading ? (
          <ProfileSkeleton />
        ) : (
          <>
            {/* Header Section */}
            <Animated.View
              entering={FadeInDown.delay(100).duration(500)}
              className="items-center pt-4 pb-2"
              style={{ paddingTop: insets.top + 16 }}
            >
              <Text className="text-2xl font-bold mb-6" style={{ color: theme === 'dark' ? '#FFFFFF' : '#1F2937' }}>Profile</Text>
            </Animated.View>

            {/* Profile Card */}
            <GlassCard delay={150} isDark={theme === 'dark'}>
              <View className="items-center py-6 px-4">
                {/* Avatar with Camera Overlay */}
                <View className="relative mb-4">
                  {userProfile.avatar ? (
                    <Animated.Image
                      source={{ uri: userProfile.avatar }}
                      className="w-24 h-24 rounded-full"
                      onLoad={handleAvatarLoad}
                      style={[
                        {
                          borderWidth: 2,
                          borderColor: '#FBBF24',
                          backgroundColor: '#F3F4F6',
                        },
                        avatarAnimatedStyle,
                      ]}
                    />
                  ) : (
                    <View
                      className="w-24 h-24 rounded-full items-center justify-center"
                      style={{
                        borderWidth: 2,
                        borderColor: '#FBBF24',
                        backgroundColor: '#9333EA',
                      }}
                    >
                      <Text className="text-2xl font-bold text-white">
                        {userProfile.fullName.charAt(0).toUpperCase()}
                      </Text>
                    </View>
                  )}
                  <View
                    className="absolute bottom-0 right-0 rounded-full items-center justify-center"
                    style={{
                      width: 40,
                      height: 40,
                      backgroundColor: '#FBBF24',
                    }}
                  >
                    <Camera size={20} color="#FFFFFF" strokeWidth={2} />
                  </View>
                </View>

                {/* Display Name */}
                <Text className="text-xl font-semibold" style={{ color: theme === 'dark' ? '#FFFFFF' : '#1F2937' }}>
                  {userProfile.companyName || userProfile.fullName}
                </Text>

                {/* Username */}
                <Text className="text-blue-600 text-sm font-medium mt-1">
                  {userProfile.username}
                </Text>

                {/* Email */}
                <Text className="text-sm mt-1" style={{ color: theme === 'dark' ? '#9CA3AF' : '#6B7280' }}>{userProfile.email}</Text>

                {/* Account Type Label */}
                <Text className="text-orange-600 text-sm font-medium mt-3">
                  {userProfile.accountType}
                  {userProfile.companyName && userProfile.isOrganization
                    ? ` • ${userProfile.companyName}`
                    : null}
                </Text>

                {/* Verification Badge */}
                <View
                  className="mt-3 px-3 py-1 rounded-full"
                  style={{
                    backgroundColor:
                      userProfile.verificationStatus === 'Verified'
                        ? 'rgba(34, 197, 94, 0.1)'
                        : userProfile.verificationStatus === 'Pending'
                        ? 'rgba(251, 191, 36, 0.1)'
                        : userProfile.verificationStatus === 'Rejected'
                        ? 'rgba(239, 68, 68, 0.1)'
                        : 'rgba(107, 114, 128, 0.1)',
                  }}
                >
                  <Text
                    className="text-xs font-medium"
                    style={{
                      color:
                        userProfile.verificationStatus === 'Verified'
                          ? '#22C55E'
                          : userProfile.verificationStatus === 'Pending'
                          ? '#FBBF24'
                          : userProfile.verificationStatus === 'Rejected'
                          ? '#EF4444'
                          : '#6B7280',
                    }}
                  >
                    {userProfile.verificationStatus}
                  </Text>
                </View>
              </View>
            </GlassCard>

            {/* Menu Items Section */}
            <View className="mt-4">
              {/* My Info */}
              <GlassCard delay={200} isDark={theme === 'dark'}>
                <MenuItem
                  icon={User}
                  label="My Info"
                  isDark={theme === 'dark'}
                  onPress={() => router.push('/(client)/profile/info' as never)}
                />
              </GlassCard>

              {/* My Shortlist */}
              <GlassCard delay={250} isDark={theme === 'dark'}>
                <MenuItem
                  icon={Briefcase}
                  label="My Shortlist"
                  isDark={theme === 'dark'}
                  onPress={() => router.push('/(client)/shortlist' as never)}
                />
              </GlassCard>

              {/* Account Settings */}
              <GlassCard delay={300} isDark={theme === 'dark'}>
                <MenuItem
                  icon={Settings}
                  label="Account Settings"
                  isDark={theme === 'dark'}
                  onPress={() => router.push('/(client)/profile/account' as never)}
                />
              </GlassCard>

              {/* Company-Related Items (only for organizations) */}
              {userProfile.isOrganization ? (
                <>
                  <GlassCard delay={350} isDark={theme === 'dark'}>
                    <MenuItem
                      icon={Building2}
                      label="Company Profile"
                      isDark={theme === 'dark'}
                      onPress={() => router.push('/(client)/profile/company' as never)}
                    />
                  </GlassCard>

                  <GlassCard delay={400} isDark={theme === 'dark'}>
                    <MenuItem
                      icon={Shield}
                      label="Company Verification"
                      showBadge={userProfile.isOrgVerified}
                      isDark={theme === 'dark'}
                      onPress={() => router.push('/(client)/profile/verification' as never)}
                    />
                  </GlassCard>

                  <GlassCard delay={450} isDark={theme === 'dark'}>
                    <MenuItem
                      icon={User}
                      label="Team Members"
                      isDark={theme === 'dark'}
                      onPress={() => router.push('/(client)/profile/team' as never)}
                    />
                  </GlassCard>
                </>
              ) : null}

              {/* Billing & Payments */}
              <GlassCard delay={500} isDark={theme === 'dark'}>
                <MenuItem
                  icon={CreditCard}
                  label="Billing & Payments"
                  isDark={theme === 'dark'}
                  onPress={() => router.push('/(client)/profile/billing' as never)}
                />
              </GlassCard>

              {/* Invoices */}
              <GlassCard delay={550} isDark={theme === 'dark'}>
                <MenuItem
                  icon={FileText}
                  label="Invoices"
                  isDark={theme === 'dark'}
                  onPress={() => router.push('/(client)/profile/invoices' as never)}
                />
              </GlassCard>

              {/* Notifications */}
              <GlassCard delay={600} isDark={theme === 'dark'}>
                <MenuItem
                  icon={Bell}
                  label="Notifications"
                  isDark={theme === 'dark'}
                  onPress={() => router.push('/(client)/profile/notifications' as never)}
                />
              </GlassCard>

              {/* Help & Support */}
              <GlassCard delay={650} isDark={theme === 'dark'}>
                <MenuItem
                  icon={HelpCircle}
                  label="Help & Support"
                  isDark={theme === 'dark'}
                  onPress={() => router.push('/(client)/profile/support' as never)}
                />
              </GlassCard>

              {/* ID Verification (only for individuals) */}
              {!userProfile.isOrganization ? (
                <GlassCard delay={550} isDark={theme === 'dark'}>
                  <MenuItem
                    icon={Shield}
                    label="ID Verification"
                    isDark={theme === 'dark'}
                    onPress={() => router.push('/(client)/profile/id-verification' as never)}
                  />
                </GlassCard>
              ) : null}

              {/* Light Mode Toggle */}
              <GlassCard delay={700} isDark={theme === 'dark'}>
                <MenuItem
                  icon={theme === 'dark' ? Moon : Sun}
                  label={theme === 'dark' ? 'Dark Mode' : 'Light Mode'}
                  isDark={theme === 'dark'}
                  onPress={handleThemeToggle}
                />
              </GlassCard>

              {/* Sign Out Button */}
              <GlassCard delay={750} isDark={theme === 'dark'}>
                <MenuItem
                  icon={LogOut}
                  label="Sign Out"
                  isDestructive
                  isDark={theme === 'dark'}
                  isLoading={isLoggingOut}
                  onPress={handleLogout}
                />
              </GlassCard>

              {/* App Version */}
              <Animated.View
                entering={FadeInDown.delay(600).duration(400)}
                className="items-center mt-4 mb-6"
              >
                <Text className="text-xs" style={{ color: theme === 'dark' ? '#9CA3AF' : '#6B7280' }}>Version 1.0.0</Text>
              </Animated.View>
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );
}
