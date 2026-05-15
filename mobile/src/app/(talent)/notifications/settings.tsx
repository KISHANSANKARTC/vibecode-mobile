import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Switch,
  ActivityIndicator,
  StyleSheet,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useNotificationPreferences } from '@/hooks/useNotificationPreferences';
import { useTheme } from '@/lib/theme/ThemeContext';
import { SkeletonLoader } from '@/components/SkeletonLoader';

// ── Toggle Row Component ──
function ToggleRow({ iconName, label, subtitle, value, onValueChange, disabled, isDark }: any) {
  const colors = {
    text: isDark ? '#ffffff' : '#111827',
    textSecondary: isDark ? '#9ca3af' : '#6b7280',
    borderLight: isDark ? '#2d2d2d' : '#f3f4f6',
    border: isDark ? '#374151' : '#e5e7eb',
  };

  return (
    <View style={[settingsStyles.toggleRow, { backgroundColor: colors.borderLight, borderColor: colors.border }]}>
      <View style={settingsStyles.toggleLeft}>
        <View style={settingsStyles.toggleIconBox}>
          <Ionicons name={iconName as any} size={18} color={colors.textSecondary} />
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={[settingsStyles.toggleLabel, { color: colors.text }]}>{label}</Text>
          {subtitle ? (
            <Text style={[settingsStyles.toggleSubtitle, { color: colors.textSecondary }]}>{subtitle}</Text>
          ) : null}
        </View>
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{ false: colors.border, true: '#fa5610' }}
        thumbColor="#ffffff"
        disabled={disabled}
      />
    </View>
  );
}

// ── Hours Picker (replaces Select dropdown) ──
function HoursPicker({ value, options, onChange, label, isDark }: any) {
  const colors = {
    text: isDark ? '#ffffff' : '#111827',
    textSecondary: isDark ? '#9ca3af' : '#6b7280',
    borderLight: isDark ? '#2d2d2d' : '#f3f4f6',
  };

  const currentIdx = options.findIndex((o: any) => o.value === value);
  const handleTap = () => {
    const nextIdx = (currentIdx + 1) % options.length;
    onChange(options[nextIdx].value);
  };
  const currentLabel = options[currentIdx]?.label || `${value}h`;

  return (
    <View style={settingsStyles.hoursPickerRow}>
      <Text style={[settingsStyles.hoursPickerLabel, { color: colors.text }]}>{label}</Text>
      <TouchableOpacity
        onPress={handleTap}
        style={[settingsStyles.hoursPickerChip, { backgroundColor: colors.borderLight }]}
        activeOpacity={0.8}
      >
        <Text style={[settingsStyles.hoursPickerChipText, { color: colors.text }]}>{currentLabel}</Text>
        <Ionicons
          name="chevron-expand-outline"
          size={13}
          color="#fa5610"
        />
      </TouchableOpacity>
      <Text style={[settingsStyles.hoursPickerLabel, { color: colors.textSecondary }]}>before</Text>
    </View>
  );
}

const BOOKING_REMINDER_OPTIONS = [
  { value: 12, label: '12 hours' },
  { value: 24, label: '24 hours' },
  { value: 48, label: '48 hours' },
  { value: 72, label: '72 hours' },
];

const DEADLINE_REMINDER_OPTIONS = [
  { value: 24, label: '24 hours' },
  { value: 48, label: '48 hours' },
  { value: 72, label: '72 hours' },
  { value: 168, label: '1 week' },
];

// ===================== MAIN SCREEN =====================
export default function TalentNotificationsSettingsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const params = useLocalSearchParams();
  const { isDark } = useTheme();
  const { preferences, isLoading, isSaving, updatePreference, savePreferences } =
    useNotificationPreferences();

  // Determine where to go back to - default to profile
  const origin = (params.origin as string) || '/(talent)/profile';

  const handleBackPress = () => {
    router.push(origin as any);
  };

  const handleSave = async () => {
    try {
      await savePreferences();
      Alert.alert('✓ Saved', 'Your notification preferences have been saved.');
    } catch (error) {
      Alert.alert('Error', 'Failed to save preferences. Please try again.');
    }
  };

  // Loading state
  if (isLoading || !preferences) {
    const colors = {
      bg: isDark ? '#0A0A0A' : '#ffffff',
      text: isDark ? '#ffffff' : '#111827',
      border: isDark ? '#374151' : '#e5e7eb',
    };

    return (
      <View style={[settingsStyles.container, { paddingTop: insets.top, backgroundColor: colors.bg }]}>
        <View style={[settingsStyles.header, { backgroundColor: colors.bg, borderBottomColor: colors.border }]}>
          <TouchableOpacity
            onPress={handleBackPress}
            style={settingsStyles.backBtn}
            activeOpacity={0.8}
          >
            <Ionicons name="chevron-back" size={22} color={colors.text} />
          </TouchableOpacity>
          <Text style={[settingsStyles.headerTitle, { color: colors.text }]}>Notifications</Text>
        </View>
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={settingsStyles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Hero card skeleton */}
          <View style={settingsStyles.heroCard}>
            <SkeletonLoader width={64} height={64} borderRadius={18} style={{ marginBottom: 16 }} />
            <SkeletonLoader width="60%" height={16} borderRadius={4} style={{ marginBottom: 8 }} />
            <SkeletonLoader width="50%" height={13} borderRadius={4} />
          </View>

          {/* Section skeletons */}
          {[1, 2, 3, 4].map((i) => (
            <View key={`skeleton-section-${i}`} style={{ marginBottom: 16 }}>
              <SkeletonLoader width="30%" height={12} borderRadius={4} style={{ marginBottom: 8 }} />
              <View style={[settingsStyles.card, { height: i === 1 ? 140 : 72 }]}>
                <View style={{ padding: 16 }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                    <View style={{ flex: 1 }}>
                      <SkeletonLoader width="60%" height={14} borderRadius={4} style={{ marginBottom: 4 }} />
                      <SkeletonLoader width="80%" height={12} borderRadius={4} />
                    </View>
                    <SkeletonLoader width={50} height={30} borderRadius={15} />
                  </View>
                </View>
              </View>
            </View>
          ))}

          <SkeletonLoader width="100%" height={54} borderRadius={16} style={{ marginTop: 8 }} />
          <View style={{ height: 60 }} />
        </ScrollView>
      </View>
    );
  }

  // Dynamic colors based on theme
  const colors = {
    bg: isDark ? '#0A0A0A' : '#ffffff',
    bgSecondary: isDark ? '#1A1A1A' : '#f9fafb',
    text: isDark ? '#ffffff' : '#111827',
    textSecondary: isDark ? '#9ca3af' : '#6b7280',
    border: isDark ? '#374151' : '#e5e7eb',
    borderLight: isDark ? '#2d2d2d' : '#f3f4f6',
  };

  return (
    <View style={[settingsStyles.container, { paddingTop: insets.top, backgroundColor: colors.bg }]}>
      {/* ─── STICKY HEADER ─── */}
      <View style={[settingsStyles.header, { backgroundColor: colors.bg, borderBottomColor: colors.border }]}>
        <TouchableOpacity
          onPress={handleBackPress}
          style={settingsStyles.backBtn}
          activeOpacity={0.8}
        >
          <Ionicons name="chevron-back" size={22} color={colors.text} />
        </TouchableOpacity>
        <Text style={[settingsStyles.headerTitle, { color: colors.text }]}>Notifications</Text>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={settingsStyles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ─── HERO CARD ─── */}
        <View style={settingsStyles.heroCard}>
          <View style={settingsStyles.heroBellBox}>
            <Ionicons name="notifications" size={28} color="#fa5610" />
          </View>
          <Text style={settingsStyles.heroTitle}>Stay in the Loop</Text>
          <Text style={settingsStyles.heroSubtitle}>Never miss an opportunity</Text>
        </View>

        {/* ─── NOTIFICATION CHANNELS ─── */}
        <Text style={settingsStyles.sectionLabel}>Notification Channels</Text>
        <View style={settingsStyles.card}>
          <ToggleRow
            iconName="logo-whatsapp"
            label="WhatsApp Reminders"
            subtitle="Receive reminders via WhatsApp"
            value={preferences.whatsappReminderEnabled}
            onValueChange={(v: boolean) =>
              updatePreference('whatsappReminderEnabled', v)
            }
            isDark={isDark}
          />
          <View style={settingsStyles.divider} />
          <ToggleRow
            iconName="mail-outline"
            label="Email Reminders"
            subtitle="Receive reminders via Email"
            value={preferences.emailReminderEnabled}
            onValueChange={(v: boolean) =>
              updatePreference('emailReminderEnabled', v)
            }
            isDark={isDark}
          />
        </View>

        {/* ─── NOTIFICATION SETTINGS ─── */}
        <Text style={settingsStyles.sectionLabel}>Notification Settings</Text>

        {/* New Booking Requests */}
        <View style={settingsStyles.card}>
          <ToggleRow
            iconName="briefcase-outline"
            label="New Booking Requests"
            subtitle="When a client wants to book you"
            value={preferences.newBookingEnabled}
            onValueChange={(v: boolean) =>
              updatePreference('newBookingEnabled', v)
            }
            isDark={isDark}
          />
        </View>

        {/* Job Reminders — with hours picker when ON */}
        <View style={settingsStyles.card}>
          <ToggleRow
            iconName="calendar-outline"
            label="Job Reminders"
            subtitle="Remind before scheduled jobs"
            value={preferences.bookingReminderEnabled}
            onValueChange={(v: boolean) =>
              updatePreference('bookingReminderEnabled', v)
            }
            isDark={isDark}
          />
          {preferences.bookingReminderEnabled ? (
            <View style={{ paddingLeft: 54, paddingTop: 4, paddingBottom: 4 }}>
              <HoursPicker
                label="Remind me"
                value={preferences.bookingReminderHours}
                options={BOOKING_REMINDER_OPTIONS}
                onChange={(v: number) =>
                  updatePreference('bookingReminderHours', v)
                }
                isDark={isDark}
              />
            </View>
          ) : null}
        </View>

        {/* New Messages */}
        <View style={settingsStyles.card}>
          <ToggleRow
            iconName="chatbubble-outline"
            label="New Messages"
            subtitle="When you receive a message"
            value={preferences.newMessageEnabled}
            onValueChange={(v: boolean) =>
              updatePreference('newMessageEnabled', v)
            }
            isDark={isDark}
          />
        </View>

        {/* Payment Notifications */}
        <View style={settingsStyles.card}>
          <ToggleRow
            iconName="card-outline"
            label="Payment Notifications"
            subtitle="When you receive a payout"
            value={preferences.paymentReceivedEnabled}
            onValueChange={(v: boolean) =>
              updatePreference('paymentReceivedEnabled', v)
            }
            isDark={isDark}
          />
        </View>

        {/* New Reviews */}
        <View style={settingsStyles.card}>
          <ToggleRow
            iconName="star-outline"
            label="New Reviews"
            subtitle="When a client leaves a review"
            value={preferences.newReviewEnabled}
            onValueChange={(v: boolean) =>
              updatePreference('newReviewEnabled', v)
            }
            isDark={isDark}
          />
        </View>

        {/* Tips & Updates */}
        <View style={settingsStyles.card}>
          <ToggleRow
            iconName="notifications-outline"
            label="Tips & Updates"
            subtitle="Platform tips and new features"
            value={preferences.marketingEnabled}
            onValueChange={(v: boolean) =>
              updatePreference('marketingEnabled', v)
            }
            isDark={isDark}
          />
        </View>

        {/* ─── SAVE BUTTON ─── */}
        <TouchableOpacity
          onPress={handleSave}
          disabled={isSaving}
          style={[settingsStyles.saveBtn, isSaving && { opacity: 0.7 }]}
          activeOpacity={0.85}
        >
          {isSaving ? (
            <ActivityIndicator size="small" color="#ffffff" />
          ) : (
            <>
              <Ionicons name="save-outline" size={18} color="#ffffff" />
              <Text style={settingsStyles.saveBtnText}>Save Preferences</Text>
            </>
          )}
        </TouchableOpacity>

        <View style={{ height: 60 }} />
      </ScrollView>
    </View>
  );
}

// ===================== STYLES =====================
const settingsStyles = StyleSheet.create({
  container: { flex: 1 },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: { fontSize: 20, fontWeight: '700', color: '#111827' },

  scrollContent: { padding: 16, gap: 12 },

  // Hero card
  heroCard: {
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
    marginBottom: 8,
  },
  heroBellBox: {
    width: 64,
    height: 64,
    borderRadius: 18,
    backgroundColor: 'rgba(124,58,237,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  heroTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  heroSubtitle: { fontSize: 13, color: '#9ca3af' },

  // Section label
  sectionLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#9ca3af',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginTop: 8,
    marginBottom: 4,
    paddingHorizontal: 4,
  },

  // Card wrapper for each section
  card: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 2,
    elevation: 1,
  },
  divider: { height: 1, backgroundColor: '#f3f4f6', marginHorizontal: 16 },

  // Toggle row
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
  },
  toggleLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
    minWidth: 0,
  },
  toggleIconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  toggleLabel: { fontSize: 14, fontWeight: '500', color: '#111827' },
  toggleSubtitle: { fontSize: 12, color: '#9ca3af', marginTop: 2 },

  // Hours picker
  hoursPickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
  },
  hoursPickerLabel: { fontSize: 13, color: '#6b7280' },
  hoursPickerChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
    backgroundColor: 'rgba(124,58,237,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(124,58,237,0.2)',
  },
  hoursPickerChipText: { fontSize: 13, fontWeight: '600', color: '#fa5610' },

  // Save button
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    height: 54,
    borderRadius: 16,
    backgroundColor: '#fa5610',
    marginTop: 8,
    shadowColor: '#fa5610',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  saveBtnText: { fontSize: 16, fontWeight: '700', color: '#ffffff' },
});
