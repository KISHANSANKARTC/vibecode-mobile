import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Modal,
  Image,
  StyleSheet,
  Share,
  Alert,
  Linking,
  Clipboard,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useTalentProfileData } from '@/hooks/useTalentProfileData';
import { useAuthStore } from '@/lib/state/auth-store';
import { useTheme } from '@/lib/theme/ThemeContext';
import { supabase } from '@/lib/supabase';
import { SkeletonLoader, ProfileSkeleton } from '@/components/SkeletonLoader';

function getInitials(name: string | null | undefined): string {
  if (!name) return 'T';
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

interface MenuItemConfig {
  iconName: string;
  label: string;
  action?: string;
  screen?: string;
  badge?: string | null;
  badgeKey?: string;
}

const MENU_ITEMS_CONFIG: MenuItemConfig[] = [
  { iconName: 'share-social-outline', label: 'Share Profile', action: 'share' },
  { iconName: 'layers-outline', label: 'Categories & Specialties', screen: 'categories', badgeKey: 'categories' },
  { iconName: 'person-outline', label: 'Edit Profile', screen: 'EditProfile' },
  { iconName: 'business-outline', label: 'Account Type', screen: 'accounttype', badgeKey: 'accountType' },
  { iconName: 'star-outline', label: 'My Reviews', screen: 'myreviews' },
  { iconName: 'images-outline', label: 'Media', screen: 'portfolio' },
  { iconName: 'cube-outline', label: 'Manage Packages', screen: 'ManagePackages' },
  { iconName: 'calendar-outline', label: 'Availability', screen: 'calendar' },
  { iconName: 'shield-outline', label: 'Verify Identity', screen: 'TalentVerification', badgeKey: 'verification' },
  { iconName: 'card-outline', label: 'Payouts', screen: 'TalentPayouts' },
  { iconName: 'notifications-outline', label: 'Notifications', screen: 'TalentNotifications' },
  { iconName: 'help-circle-outline', label: 'Support', screen: 'support' },
];

interface ShareProfileModalProps {
  visible: boolean;
  onClose: () => void;
  profileUrl: string;
  displayName: string;
  colors: { bg: string; bgSecondary: string; text: string; textSecondary: string; border: string };
}

interface SocialButton {
  label: string;
  iconName: keyof typeof Ionicons.glyphMap;
  gradientColor: string;
  onPress: () => void;
}

function ShareProfileModal({ visible, onClose, profileUrl, displayName, colors }: ShareProfileModalProps) {
  const [copied, setCopied] = useState(false);

  const getModalStyles = () => {
    return {
      urlRowBg: colors.bgSecondary,
      urlRowBorder: colors.border,
      urlTextColor: colors.text,
      closeBtnBg: colors.bgSecondary,
      closeBtnBorder: colors.border,
      closeBtnText: colors.textSecondary,
      copyBtnBg: colors.bgSecondary,
      copyBtnBorder: colors.border,
      copyIconColor: colors.textSecondary,
      sheetHandleBg: colors.border,
    };
  };

  const modalStyles = getModalStyles();

  const handleCopy = async () => {
    Clipboard.setString(profileUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleNativeShare = async () => {
    try {
      await Share.share({
        message: `Check out my profile on Engage!\n${profileUrl}`,
        url: profileUrl,
        title: `Book ${displayName} on Engage`,
      });
    } catch (err) {
      console.error(err);
    }
  };

  const handleWhatsApp = () => {
    const msg = encodeURIComponent(`Check out my profile on Engage! Book me for your next project: ${profileUrl}`);
    Linking.openURL(`whatsapp://send?text=${msg}`).catch(() => {
      Linking.openURL(`https://wa.me/?text=${msg}`);
    });
  };

  const handleLinkedIn = () => {
    Linking.openURL(`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(profileUrl)}`);
  };

  const handleTwitter = () => {
    const text = encodeURIComponent('Check out my profile on Engage! 🎬');
    Linking.openURL(`https://twitter.com/intent/tweet?text=${text}&url=${encodeURIComponent(profileUrl)}`);
  };

  const SOCIAL_BUTTONS: SocialButton[] = [
    {
      label: 'Instagram',
      iconName: 'logo-instagram' as keyof typeof Ionicons.glyphMap,
      gradientColor: '#E1306C',
      onPress: handleNativeShare,
    },
    {
      label: 'WhatsApp',
      iconName: 'logo-whatsapp' as keyof typeof Ionicons.glyphMap,
      gradientColor: '#25D366',
      onPress: handleWhatsApp,
    },
    {
      label: 'X / Twitter',
      iconName: 'logo-twitter' as keyof typeof Ionicons.glyphMap,
      gradientColor: '#000000',
      onPress: handleTwitter,
    },
    {
      label: 'LinkedIn',
      iconName: 'logo-linkedin' as keyof typeof Ionicons.glyphMap,
      gradientColor: '#0077B5',
      onPress: handleLinkedIn,
    },
    {
      label: 'More',
      iconName: 'share-outline' as keyof typeof Ionicons.glyphMap,
      gradientColor: '#6b7280',
      onPress: handleNativeShare,
    },
  ];

  return (
    <Modal visible={visible} animationType="slide" transparent={true} onRequestClose={onClose}>
      <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={onClose}>
        <TouchableOpacity activeOpacity={1} style={[styles.shareSheet, { backgroundColor: colors.bg }]} onPress={() => {}}>
          {/* Handle bar */}
          <View style={[styles.sheetHandle, { backgroundColor: modalStyles.sheetHandleBg }]} />

          {/* Title */}
          <Text style={[styles.shareTitle, { color: colors.text }]}>Share Your Profile</Text>
          <Text style={[styles.shareSubtitle, { color: colors.textSecondary }]}>Share your profile link with clients</Text>

          {/* URL Copy Row */}
          <View style={[styles.urlRow, { backgroundColor: modalStyles.urlRowBg, borderColor: modalStyles.urlRowBorder }]}>
            <Text style={[styles.urlText, { color: modalStyles.urlTextColor }]} numberOfLines={1}>
              {profileUrl}
            </Text>
            <TouchableOpacity
              onPress={handleCopy}
              style={[styles.copyBtn, { backgroundColor: modalStyles.copyBtnBg, borderColor: modalStyles.copyBtnBorder }, copied && styles.copyBtnCopied]}
              activeOpacity={0.8}
            >
              <Ionicons
                name={copied ? 'checkmark' : 'copy-outline'}
                size={18}
                color={copied ? '#10b981' : modalStyles.copyIconColor}
              />
            </TouchableOpacity>
          </View>

          {/* Social share grid */}
          <View style={styles.socialGrid}>
            {SOCIAL_BUTTONS.map((btn) => (
              <TouchableOpacity
                key={btn.label}
                onPress={btn.onPress}
                style={[styles.socialBtn, { backgroundColor: btn.gradientColor }]}
                activeOpacity={0.85}
              >
                <Ionicons name={btn.iconName} size={22} color="#ffffff" />
                <Text style={styles.socialBtnLabel}>{btn.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Close button */}
          <TouchableOpacity onPress={onClose} style={[styles.shareCloseBtn, { backgroundColor: modalStyles.closeBtnBg, borderColor: modalStyles.closeBtnBorder }]} activeOpacity={0.8}>
            <Text style={[styles.shareCloseBtnText, { color: modalStyles.closeBtnText }]}>Close</Text>
          </TouchableOpacity>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}

interface MenuItemProps {
  iconName: string;
  label: string;
  badge?: string | null;
  badgeColor?: string | null;
  onPress: () => void;
  colors?: { bg: string; bgSecondary: string; text: string; textSecondary: string; border: string };
}

function MenuItem({ iconName, label, badge, badgeColor, onPress, colors }: MenuItemProps) {
  const defaultColors = {
    bg: '#ffffff',
    bgSecondary: '#f9fafb',
    text: '#111827',
    textSecondary: '#6b7280',
    border: '#e5e7eb',
  };
  const c = colors || defaultColors;

  const getMenuIconBoxBg = () => {
    return c.bgSecondary === '#1A1A1A' ? '#2d2d2d' : '#f9fafb';
  };

  const getDefaultBadgeStyle = () => {
    if (c.bgSecondary === '#1A1A1A') {
      return { backgroundColor: 'rgba(124,58,237,0.2)' };
    }
    return { backgroundColor: 'rgba(124,58,237,0.10)' };
  };

  return (
    <TouchableOpacity onPress={onPress} style={[styles.menuItem, { backgroundColor: c.bgSecondary, borderColor: c.border }]} activeOpacity={0.75}>
      <View style={styles.menuItemLeft}>
        {/* Icon container */}
        <View style={[styles.menuIconBox, { backgroundColor: getMenuIconBoxBg() }]}>
          <Ionicons name={iconName as keyof typeof Ionicons.glyphMap} size={20} color={c.textSecondary} />
        </View>
        {/* Label */}
        <Text style={[styles.menuItemLabel, { color: c.text }]}>{label}</Text>
        {/* Badge (optional) */}
        {badge ? (
          <View
            style={[
              styles.menuBadge,
              !badgeColor && getDefaultBadgeStyle(),
              badgeColor === 'green' && styles.menuBadgeGreen,
              badgeColor === 'amber' && styles.menuBadgeAmber,
              badgeColor === 'orange' && styles.menuBadgeOrange,
            ]}
          >
            <Text
              style={[
                styles.menuBadgeText,
                badgeColor === 'green' && styles.menuBadgeTextGreen,
                badgeColor === 'amber' && styles.menuBadgeTextAmber,
                badgeColor === 'orange' && styles.menuBadgeTextOrange,
              ]}
            >
              {badge}
            </Text>
          </View>
        ) : null}
      </View>
      {/* Chevron */}
      <Ionicons name="chevron-forward" size={18} color={c.textSecondary} />
    </TouchableOpacity>
  );
}

export default function TalentProfileScreen() {
  const insets = useSafeAreaInsets();
  const { profile, talentProfile, isVerified, hasClientRole, isLoading, userId, refetch } = useTalentProfileData();
  const signOut = useAuthStore((s) => s.signOut);
  const { theme, setTheme } = useTheme();
  const [showShareModal, setShowShareModal] = useState(false);

  // Subscribe to real-time profile changes
  useEffect(() => {
    if (!userId) return;


    const profileSubscription = supabase
      .channel(`profile:${userId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'profiles',
          filter: `id=eq.${userId}`,
        },
        (payload: any) => {
          if (payload.new?.avatar_url) {
            // Refetch all profile data to ensure consistency
            refetch?.();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(profileSubscription);
    };
  }, [userId]);

  // Dynamic colors based on theme
  const isDark = theme === 'dark';
  const colors = {
    bg: isDark ? '#0A0A0A' : '#ffffff',
    bgSecondary: isDark ? '#1A1A1A' : '#f9fafb',
    text: isDark ? '#ffffff' : '#111827',
    textSecondary: isDark ? '#9ca3af' : '#6b7280',
    border: isDark ? '#374151' : '#e5e7eb',
  };

  const isCompany = talentProfile?.account_type === 'company';
  const username = profile?.username;
  const profileUrl = username ? `https://engageapp.co/${username}` : `https://engageapp.co/t/${userId}`;
  const initials = getInitials(profile?.full_name);

  const getBadgeForItem = (badgeKey?: string) => {
    if (!badgeKey) return { badge: null, badgeColor: null };
    if (badgeKey === 'accountType') {
      return isCompany ? { badge: 'Company', badgeColor: 'purple' } : { badge: null, badgeColor: null };
    }
    if (badgeKey === 'verification') {
      if (isVerified) return { badge: 'Verified', badgeColor: 'green' };
      return { badge: 'Required', badgeColor: 'amber' };
    }
    if (badgeKey === 'categories') {
      const category = talentProfile?.category;
      if (category) {
        return { badge: '1', badgeColor: 'orange' };
      }
      return { badge: null, badgeColor: null };
    }
    return { badge: null, badgeColor: null };
  };

  const handleMenuPress = (item: MenuItemConfig) => {
    if (item.action === 'share') {
      router.push({
        pathname: '/(talent)/share-profile',
        params: {
          talentId: userId,
          displayName: profile?.full_name || 'Talent',
          avatarUrl: profile?.avatar_url,
          category: talentProfile?.category || 'Professional',
          location: talentProfile?.location_text || 'Worldwide',
          rating: talentProfile?.rating?.toString() || '5.0',
          completedJobs: talentProfile?.total_completed_bookings?.toString() || '0',
          isVerified: isVerified.toString(),
          username: profile?.username,
        },
      } as any);
      return;
    }
    if (item.screen) {
      try {
        if (item.screen === 'TalentNotifications') {
          router.push('/(talent)/notifications/settings?origin=/(talent)/profile' as any);
        } else if (item.screen === 'TalentPayouts') {
          router.push('/(talent)/payouts' as any);
        } else if (item.screen === 'TalentVerification') {
          router.push('/(talent)/verifyidentity' as any);
        } else if (item.screen === 'availability') {
          router.push('/(talent)/calendar' as any);
        } else if (item.screen === 'ManagePackages') {
          router.push('/(talent)/managepackages' as any);
        } else if (item.screen === 'EditProfile') {
          router.push('/(talent)/editprofile' as any);
        } else {
          router.push(`/(talent)/${item.screen.toLowerCase()}` as any);
        }
      } catch (e) {
        Alert.alert('Navigation Error', `Could not open ${item.label}. Please try again.`);
      }
    }
  };

  const handleLogout = () => {
    Alert.alert('Log Out', 'Are you sure you want to log out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Log Out',
        style: 'destructive',
        onPress: async () => {
          try {
            if (signOut) await signOut();
            router.replace('/onboarding/welcome');
          } catch (err) {
            console.error('Logout error:', err);
            Alert.alert('Error', 'Failed to log out. Please try again.');
          }
        },
      },
    ]);
  };

  if (isLoading) {
    return (
      <View style={{ flex: 1, paddingTop: insets.top, backgroundColor: colors.bg }}>
        <View style={{ paddingHorizontal: 20, paddingVertical: 16, backgroundColor: colors.bg, borderBottomWidth: 1, borderBottomColor: colors.border }}>
          <Text style={{ fontSize: 20, fontWeight: '700', color: colors.text }}>Profile</Text>
        </View>
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16 }}>
          {/* Avatar skeleton */}
          <View style={{ alignItems: 'center', marginBottom: 20 }}>
            <SkeletonLoader width={80} height={80} borderRadius={16} style={{ marginBottom: 16, alignSelf: 'center' }} />
            <SkeletonLoader width="60%" height={20} borderRadius={4} style={{ marginBottom: 8, alignSelf: 'center' }} />
            <SkeletonLoader width="40%" height={16} borderRadius={4} style={{ marginBottom: 24, alignSelf: 'center' }} />
          </View>

          {/* Menu items skeleton */}
          {Array.from({ length: 5 }).map((_, i) => (
            <View key={i} style={{ marginBottom: 8 }}>
              <SkeletonLoader width="100%" height={52} borderRadius={16} />
            </View>
          ))}
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, paddingTop: insets.top, backgroundColor: colors.bg }}>
      {/* STICKY HEADER */}
      <View style={{ paddingHorizontal: 20, paddingVertical: 16, backgroundColor: colors.bg, borderBottomWidth: 1, borderBottomColor: colors.border }}>
        <Text style={{ fontSize: 20, fontWeight: '700', color: colors.text }}>Profile</Text>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 16 }}
        showsVerticalScrollIndicator={false}
      >
        {/* IDENTITY CARD */}
        <View style={[{ backgroundColor: colors.bgSecondary, borderRadius: 20, borderWidth: 1, borderColor: colors.border, padding: 24, alignItems: 'center', marginBottom: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 3 }]}>
          {/* Avatar — 80×80, borderRadius 16 */}
          <View style={{ marginBottom: 16 }}>
            {profile?.avatar_url ? (
              <Image
                source={{ uri: profile.avatar_url }}
                style={{ width: 80, height: 80, borderRadius: 16, backgroundColor: isDark ? '#2d2d2d' : '#f3f4f6' }}
                resizeMode="cover"
              />
            ) : (
              <View style={{ width: 80, height: 80, borderRadius: 16, backgroundColor: isDark ? '#374151' : '#e5e7eb', alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ fontSize: 28, fontWeight: '700', color: '#ffffff' }}>{initials}</Text>
              </View>
            )}
          </View>

          {/* Full Name */}
          <Text style={{ fontSize: 20, fontWeight: '700', color: colors.text, textAlign: 'center', marginBottom: 4 }}>{profile?.full_name || 'Talent'}</Text>

          {/* @username in primary purple */}
          {username ? <Text style={{ fontSize: 14, color: '#fa5610', fontWeight: '500', textAlign: 'center', marginBottom: 4 }}>@{username}</Text> : null}

          {/* Email in muted grey */}
          {profile?.email ? <Text style={{ fontSize: 13, color: colors.textSecondary, textAlign: 'center', marginBottom: 2 }}>{profile.email}</Text> : null}

          {/* engageapp.co/username in tiny muted text */}
          {username ? <Text style={{ fontSize: 11, color: colors.textSecondary, textAlign: 'center', marginBottom: 12 }}>engageapp.co/{username}</Text> : null}

          {/* "Rising" tier badge pill */}
          <View style={{ paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20, backgroundColor: colors.text === '#ffffff' ? 'rgba(124,58,237,0.15)' : 'rgba(17,24,39,0.08)' }}>
            <Text style={{ fontSize: 12, fontWeight: '500', color: colors.text === '#ffffff' ? '#fa5610' : '#111827' }}>Rising</Text>
          </View>
        </View>

        {/* MENU ITEMS LIST */}
        <View style={[styles.menuList, { backgroundColor: colors.bgSecondary }]}>
          {MENU_ITEMS_CONFIG.map((item) => {
            const { badge, badgeColor } = getBadgeForItem(item.badgeKey);
            return (
              <MenuItem
                key={item.label}
                iconName={item.iconName}
                label={item.label}
                badge={item.badge || badge}
                badgeColor={badgeColor}
                onPress={() => handleMenuPress(item)}
                colors={colors}
              />
            );
          })}
        </View>

        {/* THEME TOGGLE ROW */}
        <TouchableOpacity onPress={() => setTheme(theme === 'dark' ? 'light' : 'dark')} style={[styles.menuItem, { backgroundColor: colors.bgSecondary, borderColor: colors.border }]} activeOpacity={0.75}>
          <View style={styles.menuItemLeft}>
            <View style={styles.menuIconBox}>
              <Ionicons
                name={theme === 'dark' ? 'moon-outline' : 'sunny-outline'}
                size={20}
                color={colors.textSecondary}
              />
            </View>
            <Text style={[styles.menuItemLabel, { color: colors.text }]}>{theme === 'dark' ? 'Dark Mode' : 'Light Mode'}</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
        </TouchableOpacity>

        {/* LOG OUT BUTTON */}
        <TouchableOpacity onPress={handleLogout} style={{ backgroundColor: colors.bgSecondary, borderRadius: 16, borderWidth: 1, borderColor: colors.border, paddingHorizontal: 16, paddingVertical: 14, minHeight: 52, flexDirection: 'row', alignItems: 'center', marginTop: 6, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.03, shadowRadius: 2, elevation: 1 }} activeOpacity={0.75}>
          <Text style={{ fontSize: 15, fontWeight: '500', color: '#ef4444' }}>Log Out</Text>
        </TouchableOpacity>

        {/* Bottom spacer */}
        <View style={{ height: 100 }} />
      </ScrollView>

      {/* SHARE PROFILE MODAL */}
      <ShareProfileModal
        visible={showShareModal}
        onClose={() => setShowShareModal(false)}
        profileUrl={profileUrl}
        displayName={profile?.full_name || 'Talent'}
        colors={colors}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 14,
    minHeight: 52,
    marginBottom: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 2,
    elevation: 1,
  },
  menuList: { gap: 6, marginBottom: 6 },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 14,
  },
  menuItemLabel: {
    fontSize: 15,
    fontWeight: '500',
    flex: 1,
  },
  menuIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },

  menuBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 20,
  },
  menuBadgeGreen: { backgroundColor: 'rgba(16,185,129,0.12)' },
  menuBadgeAmber: { backgroundColor: 'rgba(245,158,11,0.12)' },
  menuBadgeOrange: { backgroundColor: 'rgba(250,86,16,0.12)' },
  menuBadgeText: { fontSize: 11, fontWeight: '600', color: '#fa5610' },
  menuBadgeTextGreen: { color: '#059669' },
  menuBadgeTextAmber: { color: '#d97706' },
  menuBadgeTextOrange: { color: '#FA5610' },

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  shareSheet: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 24,
    paddingBottom: 32,
  },
  sheetHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 20,
  },
  shareTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 4,
  },
  shareSubtitle: {
    fontSize: 13,
    marginBottom: 20,
  },

  urlRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 20,
    gap: 10,
    borderWidth: 1,
  },
  urlText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '500',
  },
  copyBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  copyBtnCopied: {
    backgroundColor: 'rgba(16,185,129,0.1)',
    borderColor: 'rgba(16,185,129,0.3)',
  },

  socialGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 20,
  },
  socialBtn: {
    width: '30%',
    aspectRatio: 1,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  socialBtnLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: '#ffffff',
    textAlign: 'center',
  },

  shareCloseBtn: {
    height: 52,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  shareCloseBtnText: {
    fontSize: 15,
    fontWeight: '600',
  },
});
