import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  StyleSheet,
  Image,
  RefreshControl,
  Alert,
  Pressable,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTheme } from '@/lib/theme/ThemeContext';
import { useGigs } from '@/hooks/useGigs';
import { useNavigation } from '@react-navigation/native';
import { SkeletonLoader, ListItemSkeleton } from '@/components/SkeletonLoader';

// --- StatusBadge Component ---
const STATUS_COLORS: Record<string, { bg: string; text: string; label: string }> = {
  draft: {
    bg: 'rgba(107,114,128,0.12)',
    text: '#6b7280',
    label: 'Draft',
  },
  pending: {
    bg: 'rgba(245,158,11,0.12)',
    text: '#d97706',
    label: 'Pending',
  },
  pending_acceptance: {
    bg: 'rgba(245,158,11,0.12)',
    text: '#d97706',
    label: 'Pending',
  },
  pending_payment: {
    bg: 'rgba(245,158,11,0.12)',
    text: '#d97706',
    label: 'Awaiting Payment',
  },
  pending_contract: {
    bg: 'rgba(59,130,246,0.12)',
    text: '#2563eb',
    label: 'Contract Pending',
  },
  confirmed: { bg: 'rgba(16,185,129,0.12)', text: '#059669', label: 'Confirmed' },
  in_progress: {
    bg: 'rgba(59,130,246,0.12)',
    text: '#2563eb',
    label: 'In Progress',
  },
  delivered: {
    bg: 'rgba(245,158,11,0.12)',
    text: '#d97706',
    label: 'Waiting for Review',
  },
  awaiting_delivery: {
    bg: 'rgba(59,130,246,0.12)',
    text: '#2563eb',
    label: 'Awaiting Delivery',
  },
  in_review: {
    bg: 'rgba(59,130,246,0.12)',
    text: '#2563eb',
    label: 'In Review',
  },
  completed: { bg: 'rgba(16,185,129,0.12)', text: '#059669', label: 'Completed' },
  cancelled: { bg: 'rgba(239,68,68,0.12)', text: '#dc2626', label: 'Cancelled' },
  disputed: { bg: 'rgba(239,68,68,0.12)', text: '#dc2626', label: 'Disputed' },
  accepted: { bg: 'rgba(16,185,129,0.12)', text: '#059669', label: 'Accepted' },
  declined: { bg: 'rgba(239,68,68,0.12)', text: '#dc2626', label: 'Declined' },
  refund_requested: {
    bg: 'rgba(239,68,68,0.12)',
    text: '#dc2626',
    label: 'Refund Requested',
  },
};

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_COLORS[status] || {
    bg: 'rgba(107,114,128,0.12)',
    text: '#6b7280',
    label: status || 'Unknown',
  };
  return (
    <View style={{ paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20, backgroundColor: cfg.bg }}>
      <Text style={{ fontSize: 10, fontWeight: '600', color: cfg.text }}>{cfg.label}</Text>
    </View>
  );
}

// --- Date/Time format helpers ---
function formatDateTime(isoString: string): string {
  if (!isoString) return '';
  const d = new Date(isoString);
  return (
    d.toLocaleDateString('en-GB', { weekday: 'short', month: 'short', day: 'numeric' }) +
    ' · ' +
    d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
  );
}

function formatDate(isoString: string): string {
  if (!isoString) return '';
  return new Date(isoString).toLocaleDateString('en-GB', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function formatTime(isoString: string): string {
  if (!isoString) return '';
  return new Date(isoString).toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatDateShort(isoString: string): string {
  if (!isoString) return '';
  return new Date(isoString).toLocaleDateString('en-GB', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}

function getDurationHours(start: string, end: string): number | null {
  if (!start || !end) return null;
  const diff = (new Date(end).getTime() - new Date(start).getTime()) / (1000 * 60 * 60);
  return Math.max(1, Math.round(diff));
}

// ===================== MAIN SCREEN =====================
export default function TalentGigsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { isDark } = useTheme();
  const navigation = useNavigation<any>();
  const {
    pendingBookings,
    activeBookings,
    completedBookings,
    isLoading,
    isVerified,
    hasBankAccount,
    calculateEarnings,
    acceptBooking,
    declineBooking,
    refetch,
  } = useGigs();

  const [processedIds, setProcessedIds] = useState<string[]>([]);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  // Handle navigation to job workspace
  const handleNavigateToJob = (bookingTalent: any) => {
    const bookingId = bookingTalent.booking_id || bookingTalent.booking?.id;
    if (!bookingId) {
      console.error('No booking ID found for booking talent:', bookingTalent.id);
      return;
    }
    router.push(`/(talent)/jobs/${bookingId}`);
  };

  // Pull to refresh
  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const handleAccept = async (bt: any) => {
    setProcessingId(bt.id);
    const success = await acceptBooking(bt.id, navigation);
    if (success) setProcessedIds((prev) => [...prev, bt.id]);
    setProcessingId(null);
  };

  const handleDecline = async (bt: any) => {
    Alert.alert(
      'Decline Booking',
      'Are you sure you want to decline this booking request?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Decline',
          style: 'destructive',
          onPress: async () => {
            setProcessingId(bt.id);
            const success = await declineBooking(bt.id);
            if (success) setProcessedIds((prev) => [...prev, bt.id]);
            setProcessingId(null);
          },
        },
      ]
    );
  };

  // Filter out processed ones from pending list
  const visiblePending = pendingBookings.filter((bt) => !processedIds.includes(bt.id));

  // Loading state
  if (isLoading) {
    return (
      <View style={[styles.container, { paddingTop: insets.top, backgroundColor: isDark ? '#0A0A0A' : '#ffffff' }]}>
        {/* Sticky header */}
        <View style={[styles.header, { backgroundColor: isDark ? '#0A0A0A' : '#ffffff', borderBottomColor: isDark ? '#374151' : '#e5e7eb' }]}>
          <Text style={[styles.headerTitle, { color: isDark ? '#ffffff' : '#111827' }]}>Gigs</Text>
        </View>
        <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent} scrollEnabled={false}>
          <ListItemSkeleton count={5} isDark={isDark} />
        </ScrollView>
      </View>
    );
  }

  const colors = {
    bg: isDark ? '#0A0A0A' : '#ffffff',
    bgSecondary: isDark ? '#1A1A1A' : '#f9fafb',
    bgTertiary: isDark ? '#2d2d2d' : '#f3f4f6',
    text: isDark ? '#ffffff' : '#111827',
    textSecondary: isDark ? '#9ca3af' : '#6b7280',
    border: isDark ? '#374151' : '#e5e7eb',
  };

  const allEmpty =
    visiblePending.length === 0 &&
    pendingBookings.length === 0 &&
    activeBookings.length === 0 &&
    completedBookings.length === 0;

  return (
    <View style={[styles.container, { paddingTop: insets.top, backgroundColor: colors.bg }]}>
      {/* ─── STICKY HEADER ─── */}
      <View style={[styles.header, { backgroundColor: colors.bg, borderBottomColor: colors.border }]}>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Gigs</Text>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#fa5610"
            colors={['#fa5610']}
          />
        }
      >
        {/* ─── VERIFICATION REQUIRED BANNER ─── */}
        {!isVerified && (
          <View style={[styles.banner, styles.bannerRed]}>
            {/* Red left border strip */}
            <View style={[styles.bannerStrip, { backgroundColor: '#ef4444' }]} />
            <View style={[styles.bannerIcon, { backgroundColor: 'rgba(239,68,68,0.15)' }]}>
              <Ionicons name="shield-outline" size={20} color="#ef4444" />
            </View>
            <View style={styles.bannerContent}>
              <Text style={[styles.bannerTitle, { color: '#dc2626' }]}>Verification Required</Text>
              <Text style={[styles.bannerSubtitle, { color: isDark ? '#9ca3af' : '#6b7280' }]}>
                Complete ID verification to accept booking requests. You can still view incoming gigs.
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => router.push('/(talent)/verifyidentity')}
              style={[styles.bannerButton, { backgroundColor: '#ef4444' }]}
              activeOpacity={0.8}
            >
              <Text style={{ color: '#ffffff', fontSize: 12, fontWeight: '700' }}>Verify Now</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ─── BANK DETAILS REQUIRED BANNER ─── */}
        {isVerified ? (
          !hasBankAccount ? (
            <View style={[styles.banner, styles.bannerAmber]}>
              <View style={[styles.bannerStrip, { backgroundColor: '#f59e0b' }]} />
              <View style={[styles.bannerIcon, { backgroundColor: 'rgba(245,158,11,0.15)' }]}>
                <Ionicons name="card-outline" size={20} color="#f59e0b" />
              </View>
              <View style={styles.bannerContent}>
                <Text style={[styles.bannerTitle, { color: '#d97706' }]}>Bank Details Required</Text>
                <Text style={[styles.bannerSubtitle, { color: isDark ? '#9ca3af' : '#6b7280' }]}>
                  Add bank details to receive your payments. You can still view incoming gigs.
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => router.push('/(talent)/payouts')}
                style={[styles.bannerButton, styles.bannerButtonAmber]}
                activeOpacity={0.8}
              >
                <Text style={{ color: '#d97706', fontSize: 12, fontWeight: '700' }}>Add Bank</Text>
              </TouchableOpacity>
            </View>
          ) : null
        ) : null}

        {/* ─── PROCESSED CONFIRMATION ─── */}
        {processedIds.length > 0 ? (
          <TouchableOpacity
            onPress={() => router.push('/(talent)/calendar')}
            style={styles.processedBanner}
            activeOpacity={0.8}
          >
            <View style={styles.processedIconBox}>
              <Ionicons name="checkmark" size={18} color="#10b981" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.processedTitle, { color: isDark ? '#e5e7eb' : '#111827' }]}>
                {processedIds.length} gig{processedIds.length > 1 ? 's' : ''} processed
              </Text>
              <Text style={[styles.processedSub, { color: isDark ? '#9ca3af' : '#6b7280' }]}>Check your calendar</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#10b981" />
          </TouchableOpacity>
        ) : null}

        {/* ─── NEW REQUESTS SECTION ─── */}
        {visiblePending.length > 0 && (
          <View style={styles.section}>
            {/* Section header */}
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: isDark ? '#e5e7eb' : '#111827' }]}>New Requests</Text>
              <View style={styles.countPill}>
                <Text style={styles.countPillText}>{visiblePending.length} pending</Text>
              </View>
            </View>

            {/* Show only the FIRST pending card at a time */}
            {visiblePending.slice(0, 1).map((bt) => {
              const clientName =
                bt.client?.account_type === 'organization'
                  ? bt.client?.company_name || bt.client?.full_name || 'Client'
                  : bt.client?.full_name || 'Client';
              const earnings = calculateEarnings(bt);
              const duration = getDurationHours(bt.booking?.scheduled_start, bt.booking?.scheduled_end);
              const isProcessing = processingId === bt.id;

              return (
                <View key={bt.id} style={[styles.pendingCard, { backgroundColor: isDark ? '#1A1A1A' : '#ffffff', borderColor: isDark ? '#374151' : '#e5e7eb' }]}>
                  {/* Processing overlay */}
                  {isProcessing ? (
                    <View style={[styles.processingOverlay, { backgroundColor: isDark ? 'rgba(26,26,26,0.85)' : 'rgba(255,255,255,0.85)' }]}>
                      <ActivityIndicator size="large" color="#fa5610" />
                    </View>
                  ) : null}

                  {/* Client info row — tappable to view detail */}
                  <Pressable
                    onPress={() => handleNavigateToJob(bt)}
                    style={styles.clientRow}
                  >
                    {/* Avatar */}
                    <View style={[styles.avatar, { backgroundColor: isDark ? '#2d2d2d' : '#f3f4f6' }]}>
                      {bt.client?.avatar_url ? (
                        <Image
                          source={{ uri: bt.client.avatar_url }}
                          style={{ width: 48, height: 48, borderRadius: 12 }}
                        />
                      ) : (
                        <Text style={[styles.avatarInitial, { color: isDark ? '#ffffff' : '#111827' }]}>
                          {clientName.charAt(0).toUpperCase()}
                        </Text>
                      )}
                    </View>
                    {/* Name + label */}
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.clientLabel, { color: isDark ? '#9ca3af' : '#111827' }]}>Booking Request</Text>
                      <Text style={[styles.clientName, { color: isDark ? '#e5e7eb' : '#6b7280' }]}>{clientName}</Text>
                    </View>
                    {/* Chevron */}
                    <Ionicons name="chevron-forward" size={18} color={isDark ? '#6b7280' : '#9ca3af'} />
                  </Pressable>

                  {/* ── 2×2 Details Grid ── */}
                  <View style={styles.detailsGrid}>
                    {/* Date */}
                    <View style={[styles.detailCell, { backgroundColor: isDark ? '#2d2d2d' : '#f9fafb' }]}>
                      <View style={styles.detailLabelRow}>
                        <Ionicons name="calendar-outline" size={13} color={isDark ? '#6b7280' : '#9ca3af'} />
                        <Text style={[styles.detailLabel, { color: isDark ? '#9ca3af' : '#9ca3af' }]}>Date</Text>
                      </View>
                      <Text style={[styles.detailValue, { color: isDark ? '#e5e7eb' : '#111827' }]}>
                        {bt.booking?.scheduled_start
                          ? formatDateShort(bt.booking.scheduled_start)
                          : 'TBD'}
                      </Text>
                    </View>

                    {/* Time */}
                    <View style={[styles.detailCell, { backgroundColor: isDark ? '#2d2d2d' : '#f9fafb' }]}>
                      <View style={styles.detailLabelRow}>
                        <Ionicons name="time-outline" size={13} color={isDark ? '#6b7280' : '#9ca3af'} />
                        <Text style={[styles.detailLabel, { color: isDark ? '#9ca3af' : '#9ca3af' }]}>Time</Text>
                      </View>
                      <Text style={[styles.detailValue, { color: isDark ? '#e5e7eb' : '#111827' }]}>
                        {bt.booking?.scheduled_start ? formatTime(bt.booking.scheduled_start) : 'TBD'}
                      </Text>
                    </View>

                    {/* Location */}
                    <View style={[styles.detailCell, { backgroundColor: isDark ? '#2d2d2d' : '#f9fafb' }]}>
                      <View style={styles.detailLabelRow}>
                        <Ionicons name="location-outline" size={13} color={isDark ? '#6b7280' : '#9ca3af'} />
                        <Text style={[styles.detailLabel, { color: isDark ? '#9ca3af' : '#9ca3af' }]}>Location</Text>
                      </View>
                      <Text style={[styles.detailValue, { color: isDark ? '#e5e7eb' : '#111827' }]} numberOfLines={1}>
                        {bt.booking?.location_text || 'TBD'}
                      </Text>
                    </View>

                    {/* Total Amount */}
                    <View style={[styles.detailCell, { backgroundColor: isDark ? '#2d2d2d' : '#f9fafb' }]}>
                      <View style={styles.detailLabelRow}>
                        <Ionicons name="cash-outline" size={13} color={isDark ? '#6b7280' : '#9ca3af'} />
                        <Text style={[styles.detailLabel, { color: isDark ? '#9ca3af' : '#9ca3af' }]}>Total Amount</Text>
                      </View>
                      <Text style={[styles.detailValue, { fontWeight: '700', color: isDark ? '#e5e7eb' : '#111827' }]}>
                        {bt.booking?.currency || 'AED'} {earnings.toLocaleString()}
                      </Text>
                    </View>
                  </View>

                  {/* Role category pill */}
                  <View style={styles.rolePill}>
                    <Text style={styles.rolePillText}>{bt.role_category}</Text>
                  </View>

                  {/* ── Warnings ── */}
                  {!isVerified ? (
                    <View style={styles.warningBox}>
                      <Ionicons name="shield-outline" size={15} color="#f59e0b" />
                      <Text style={styles.warningText}>
                        Complete ID verification to accept this booking
                      </Text>
                    </View>
                  ) : null}
                  {isVerified ? (
                    !hasBankAccount ? (
                      <View style={styles.warningBox}>
                        <Ionicons name="cash-outline" size={15} color="#f59e0b" />
                        <Text style={styles.warningText}>Add bank details to accept this booking</Text>
                      </View>
                    ) : null
                  ) : null}

                  {/* ── Duration row (if calculable) ── */}
                  {duration ? (
                    <View style={styles.durationRow}>
                      <Ionicons name="hourglass-outline" size={13} color={isDark ? '#9ca3af' : '#9ca3af'} />
                      <Text style={[styles.durationText, { color: isDark ? '#9ca3af' : '#9ca3af' }]}>
                        {duration} hour{duration !== 1 ? 's' : ''}
                      </Text>
                    </View>
                  ) : null}

                  {/* ── Decline + Accept Buttons ── */}
                  <View style={[styles.actionButtonsRow, { borderTopColor: isDark ? '#374151' : '#e5e7eb' }]}>
                    {/* Decline */}
                    <TouchableOpacity
                      onPress={() => handleDecline(bt)}
                      style={[styles.declineButton, { borderColor: isDark ? 'rgba(239,68,68,0.3)' : 'rgba(239,68,68,0.3)' }]}
                      activeOpacity={0.8}
                      disabled={isProcessing}
                    >
                      <Ionicons name="close" size={18} color="#ef4444" />
                      <Text style={styles.declineText}>Decline</Text>
                    </TouchableOpacity>

                    {/* Accept — locked if not verified or no bank */}
                    {!isVerified || !hasBankAccount ? (
                      <View style={[styles.acceptButton, styles.acceptButtonLocked, { backgroundColor: isDark ? '#2d2d2d' : '#f3f4f6' }]}>
                        <Ionicons name="lock-closed" size={16} color={isDark ? '#6b7280' : '#9ca3af'} />
                        <Text style={[styles.acceptTextLocked, { color: isDark ? '#6b7280' : '#9ca3af' }]}>Accept</Text>
                      </View>
                    ) : (
                      <TouchableOpacity
                        onPress={() => handleAccept(bt)}
                        style={styles.acceptButton}
                        activeOpacity={0.9}
                        disabled={isProcessing}
                      >
                        <Ionicons name="checkmark" size={18} color="#ffffff" />
                        <Text style={styles.acceptText}>Accept</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              );
            })}

            {/* "+N more requests waiting" */}
            {visiblePending.length > 1 && (
              <Text style={[styles.moreRequestsText, { color: isDark ? '#6b7280' : '#9ca3af' }]}>
                +{visiblePending.length - 1} more request{visiblePending.length > 2 ? 's' : ''}
                waiting
              </Text>
            )}
          </View>
        )}

        {/* ─── ALL CAUGHT UP (no pending) ─── */}
        {visiblePending.length === 0 && pendingBookings.length === 0 && (
          <View style={[styles.emptyCard, { backgroundColor: isDark ? '#1A1A1A' : '#ffffff', borderColor: isDark ? '#374151' : '#e5e7eb' }]}>
            <View style={[styles.emptyIconBox, { backgroundColor: isDark ? '#2d2d2d' : '#f3f4f6' }]}>
              <Ionicons name="checkmark" size={24} color="#10b981" />
            </View>
            <Text style={[styles.emptyTitle, { color: isDark ? '#e5e7eb' : '#111827' }]}>All caught up!</Text>
            <Text style={[styles.emptySubtitle, { color: isDark ? '#9ca3af' : '#9ca3af' }]}>No pending requests. New bookings will appear here.</Text>
          </View>
        )}

        {/* ─── UPCOMING (ACTIVE) GIGS ─── */}
        {activeBookings.length > 0 && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: isDark ? '#e5e7eb' : '#111827' }]}>Upcoming ({activeBookings.length})</Text>
            <View style={styles.listContainer}>
              {activeBookings.map((bt) => {
                const isOrg = bt.client?.account_type === 'organization';
                const companyName = bt.client?.company_name;
                const clientName = bt.client?.full_name || 'Client';
                const earnings = calculateEarnings(bt);
                const bookingStatus = bt.hasRefundRequest
                  ? 'refund_requested'
                  : bt.booking?.status || 'confirmed';

                return (
                  <Pressable
                    key={bt.id}
                    onPress={() => handleNavigateToJob(bt)}
                    style={({ pressed }) => [
                      styles.gigCard,
                      { backgroundColor: isDark ? '#1A1A1A' : '#ffffff', borderColor: isDark ? '#374151' : '#e5e7eb' },
                      pressed && { opacity: 0.7 },
                    ]}
                  >
                    <View style={{ flex: 1, gap: 2 }}>
                      {/* Company name (if org) */}
                      {isOrg && companyName ? (
                        <Text style={[styles.gigCompany, { color: isDark ? '#e5e7eb' : '#111827' }]}>{companyName}</Text>
                      ) : null}
                      {/* Client name */}
                      <Text
                        style={[isOrg && companyName ? styles.gigClientSecondary : styles.gigCompany, { color: isDark ? (isOrg && companyName ? '#9ca3af' : '#e5e7eb') : (isOrg && companyName ? '#6b7280' : '#111827') }]}
                      >
                        {clientName}
                      </Text>
                      {/* Location */}
                      <Text style={[styles.gigLocation, { color: isDark ? '#9ca3af' : '#6b7280' }]}>
                        {bt.booking?.location_text || 'Location TBD'}
                      </Text>
                      {/* Date/time */}
                      <Text style={[styles.gigDateTime, { color: isDark ? '#6b7280' : '#9ca3af' }]}>
                        {bt.booking?.scheduled_start ? formatDateTime(bt.booking.scheduled_start) : ''}
                      </Text>
                    </View>
                    <View style={{ alignItems: 'flex-end', gap: 6 }}>
                      <Text style={[styles.gigEarnings, { color: isDark ? '#e5e7eb' : '#111827' }]}>
                        {bt.booking?.currency || 'AED'} {earnings.toLocaleString()}
                      </Text>
                      <StatusBadge status={bookingStatus} />
                    </View>
                  </Pressable>
                );
              })}
            </View>
          </View>
        )}

        {/* ─── COMPLETED GIGS ─── */}
        {completedBookings.length > 0 && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: isDark ? '#e5e7eb' : '#111827' }]}>Completed ({completedBookings.length})</Text>
            <View style={styles.listContainer}>
              {completedBookings.map((bt) => {
                const earnings = calculateEarnings(bt);
                return (
                  <Pressable
                    key={bt.id}
                    onPress={() => handleNavigateToJob(bt)}
                    style={({ pressed }) => [
                      styles.gigCard,
                      { backgroundColor: isDark ? '#1A1A1A' : '#ffffff', borderColor: isDark ? '#374151' : '#e5e7eb' },
                      pressed && { opacity: 0.7 },
                    ]}
                  >
                    <View style={{ flex: 1, gap: 2 }}>
                      <Text style={[styles.gigCompany, { color: isDark ? '#e5e7eb' : '#111827' }]}>
                        {bt.booking?.location_text || 'Completed'}
                      </Text>
                      <Text style={[styles.gigDateTime, { color: isDark ? '#6b7280' : '#9ca3af' }]}>
                        {bt.booking?.scheduled_start ? formatDate(bt.booking.scheduled_start) : ''}
                      </Text>
                    </View>
                    <View style={{ alignItems: 'flex-end', gap: 4 }}>
                      <Text style={[styles.gigEarnings, { color: isDark ? '#e5e7eb' : '#111827' }]}>
                        {bt.booking?.currency || 'AED'} {earnings.toLocaleString()}
                      </Text>
                      <Text style={[styles.completedBadge, { color: isDark ? '#9ca3af' : '#6b7280' }]}>Completed</Text>
                    </View>
                  </Pressable>
                );
              })}
            </View>
          </View>
        )}

        {/* ─── FULL EMPTY STATE (no gigs at all) ─── */}
        {allEmpty ? (
          <View style={[styles.emptyCard, { backgroundColor: isDark ? '#1A1A1A' : '#ffffff', borderColor: isDark ? '#374151' : '#e5e7eb' }]}>
            <View style={[styles.emptyIconBox, { backgroundColor: isDark ? '#2d2d2d' : '#f3f4f6' }]}>
              <Ionicons name="briefcase-outline" size={24} color={isDark ? '#e5e7eb' : '#111827'} />
            </View>
            <Text style={[styles.emptyTitle, { color: isDark ? '#e5e7eb' : '#111827' }]}>No gigs yet</Text>
            <Text style={[styles.emptySubtitle, { color: isDark ? '#9ca3af' : '#9ca3af' }]}>
              Complete your profile to start receiving booking requests
            </Text>
          </View>
        ) : null}

        {/* Bottom padding */}
        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

// ===================== STYLES =====================
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#ffffff' }, // Dynamic in JSX

  // Header
  header: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#ffffff', // Dynamic in JSX
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  headerTitle: { fontSize: 20, fontWeight: '700', color: '#111827' }, // Dynamic in JSX

  // ScrollView
  scrollView: { flex: 1 },
  scrollContent: { padding: 16 },

  // Banners
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    paddingLeft: 20,
    marginBottom: 16,
    overflow: 'hidden',
    position: 'relative',
  },
  bannerRed: {
    backgroundColor: 'rgba(239,68,68,0.08)',
    borderColor: 'rgba(239,68,68,0.25)',
  },
  bannerAmber: {
    backgroundColor: 'rgba(245,158,11,0.08)',
    borderColor: 'rgba(245,158,11,0.25)',
  },
  bannerStrip: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
    borderRadius: 4,
  },
  bannerIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  bannerContent: { flex: 1 },
  bannerTitle: { fontSize: 13, fontWeight: '700', marginBottom: 2 },
  bannerSubtitle: { fontSize: 11, color: '#6b7280', lineHeight: 16 }, // Dynamic in JSX
  bannerButton: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 10, flexShrink: 0 },
  bannerButtonAmber: {
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: 'rgba(245,158,11,0.4)',
  },

  // Processed banner
  processedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: 'rgba(16,185,129,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(16,185,129,0.2)',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  processedIconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(16,185,129,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  processedTitle: { fontSize: 14, fontWeight: '600', color: '#111827' }, // Dynamic in JSX
  processedSub: { fontSize: 12, color: '#6b7280' }, // Dynamic in JSX

  // Sections
  section: { marginBottom: 24 },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  sectionTitle: { fontSize: 17, fontWeight: '700', color: '#111827', marginBottom: 14 }, // Dynamic in JSX
  countPill: { paddingHorizontal: 10, paddingVertical: 4, backgroundColor: '#fa5610', borderRadius: 20 },
  countPillText: { fontSize: 11, fontWeight: '700', color: '#ffffff' },

  // Pending card
  pendingCard: {
    backgroundColor: '#ffffff', // Dynamic in JSX
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
    position: 'relative',
    overflow: 'hidden',
  },
  processingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255,255,255,0.85)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 20,
    borderRadius: 20,
  },

  // Client row inside pending card
  clientRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarInitial: { fontSize: 18, fontWeight: '700', color: '#111827' }, // Dynamic in JSX
  clientLabel: { fontSize: 13, fontWeight: '600', color: '#111827' }, // Dynamic in JSX
  clientName: { fontSize: 12, color: '#6b7280', marginTop: 2 }, // Dynamic in JSX

  // 2x2 details grid
  detailsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 14,
  },
  detailCell: {
    width: '47%',
    backgroundColor: '#f9fafb',
    borderRadius: 14,
    padding: 12,
  },
  detailLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 5 },
  detailLabel: { fontSize: 11, color: '#9ca3af' }, // Already correct, but may need override in JSX for light mode
  detailValue: { fontSize: 13, fontWeight: '600', color: '#111827' }, // Dynamic in JSX

  // Role pill
  rolePill: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: 'rgba(124,58,237,0.10)',
    marginBottom: 12,
  },
  rolePillText: { fontSize: 12, fontWeight: '600', color: '#fa5610' }, // Accent color, keep as is

  // Warning box
  warningBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 10,
    borderRadius: 12,
    backgroundColor: 'rgba(245,158,11,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(245,158,11,0.2)',
    marginBottom: 12,
  },
  warningText: { fontSize: 11, color: '#d97706', flex: 1 }, // Accent color, keep as is

  // Duration row
  durationRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 12 },
  durationText: { fontSize: 12, color: '#9ca3af' }, // Dynamic in JSX

  // Action buttons
  actionButtonsRow: {
    flexDirection: 'row',
    gap: 12,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  declineButton: {
    flex: 1,
    height: 48,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1.5,
    borderColor: 'rgba(239,68,68,0.3)',
    backgroundColor: 'transparent',
  },
  declineText: { fontSize: 14, fontWeight: '600', color: '#ef4444' },
  acceptButton: {
    flex: 1,
    height: 48,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#10b981',
  },
  acceptButtonLocked: { backgroundColor: '#f3f4f6' },
  acceptText: { fontSize: 14, fontWeight: '600', color: '#ffffff' },
  acceptTextLocked: { fontSize: 14, fontWeight: '600', color: '#9ca3af' },

  // More requests text
  moreRequestsText: { textAlign: 'center', fontSize: 13, color: '#9ca3af', marginTop: 12 },

  // Empty state card
  emptyCard: {
    backgroundColor: '#ffffff', // Dynamic in JSX
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    padding: 32,
    alignItems: 'center',
    marginBottom: 16,
  },
  emptyIconBox: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: '#111827', marginBottom: 6 }, // Dynamic in JSX
  emptySubtitle: { fontSize: 13, color: '#9ca3af', textAlign: 'center', lineHeight: 20 }, // Dynamic in JSX

  // Active/Completed gig list
  listContainer: { gap: 10 },
  gigCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#ffffff', // Dynamic in JSX
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  gigCompany: { fontSize: 14, fontWeight: '600', color: '#111827' }, // Dynamic in JSX
  gigClientSecondary: { fontSize: 13, color: '#6b7280' }, // Dynamic in JSX
  gigLocation: { fontSize: 12, color: '#6b7280', marginTop: 2 }, // Dynamic in JSX
  gigDateTime: { fontSize: 11, color: '#9ca3af', marginTop: 2 }, // Dynamic in JSX
  gigEarnings: { fontSize: 14, fontWeight: '700', color: '#111827' }, // Dynamic in JSX
  completedBadge: { fontSize: 11, color: '#6b7280' }, // Dynamic in JSX
});
