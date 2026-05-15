import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
  RefreshControl,
  LayoutAnimation,
  Platform,
  UIManager,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTheme } from '@/lib/theme/ThemeContext';
import { useNotifications } from '@/hooks/useNotifications';
import {
  getNotificationIconName,
  getTypeDisplayName,
  groupNotificationsByDate,
  timeAgo,
  normalizeDeepLink,
} from '@/helpers/notificationHelpers';
import { SkeletonLoader } from '@/components/SkeletonLoader';
import { extractErrorMessage } from '@/lib/errorUtils';

// Enable LayoutAnimation on Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

// ── Single Notification Card ──
function SingleNotificationCard({ notification, onMarkRead, onDelete, onPress, isDark }: any) {
  const isUnread = !notification.readAt;
  const iconName = getNotificationIconName(notification.type);
  const textColor = isDark ? '#ffffff' : '#111827';
  const secondaryTextColor = isDark ? '#9ca3af' : '#6b7280';
  const cardBg = isDark ? '#1A1A1A' : '#ffffff';
  const cardBorder = isDark ? '#374151' : '#e5e7eb';
  const unreadBg = isDark ? 'rgba(124,58,237,0.15)' : 'rgba(124,58,237,0.04)';
  const unreadBorder = isDark ? 'rgba(124,58,237,0.35)' : 'rgba(124,58,237,0.25)';
  const iconBg = isDark ? 'rgba(124,58,237,0.2)' : 'rgba(124,58,237,0.12)';
  const readIconBg = isDark ? '#374151' : '#f3f4f6';
  const actionBg = isDark ? 'rgba(124,58,237,0.15)' : 'rgba(124,58,237,0.08)';
  const actionDangerBg = isDark ? '#2d2d2d' : '#f9fafb';

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: isUnread ? unreadBg : cardBg,
          borderColor: isUnread ? unreadBorder : cardBorder,
        },
      ]}
    >
      {/* Purple left border strip for unread */}
      {isUnread ? <View style={styles.unreadStrip} /> : null}

      <TouchableOpacity
        onPress={() => {
          onPress?.();
        }}
        style={styles.cardRow}
        activeOpacity={0.7}
      >
        {/* Icon */}
        <View
          style={[
            styles.iconBox,
            {
              backgroundColor: isUnread ? iconBg : readIconBg,
            },
          ]}
        >
          <Ionicons
            name={iconName as any}
            size={18}
            color={isUnread ? '#fa5610' : secondaryTextColor}
          />
        </View>

        {/* Content */}
        <View style={styles.cardContent}>
          {/* Title + timestamp row */}
          <View style={styles.cardTopRow}>
            <Text
              style={[
                styles.cardTitle,
                {
                  color: textColor,
                  fontWeight: isUnread ? '600' : '400',
                },
              ]}
              numberOfLines={2}
            >
              {notification.title}
            </Text>
            <Text style={[styles.cardTime, { color: secondaryTextColor }]}>
              {timeAgo(notification.createdAt)}
            </Text>
          </View>

          {/* Body text */}
          {notification.body ? (
            <Text style={[styles.cardBody, { color: secondaryTextColor }]} numberOfLines={2}>
              {notification.body}
            </Text>
          ) : null}
        </View>
      </TouchableOpacity>

      {/* Action buttons — ALWAYS visible */}
      <View style={styles.cardActions}>
        {isUnread ? (
          <TouchableOpacity
            onPress={() => onMarkRead(notification.id)}
            style={[styles.actionBtnPrimary, { backgroundColor: actionBg }]}
            activeOpacity={0.8}
          >
            <Ionicons name="checkmark" size={13} color="#fa5610" />
            <Text style={styles.actionBtnPrimaryText}>Mark read</Text>
          </TouchableOpacity>
        ) : null}
        <TouchableOpacity
          onPress={() => onDelete(notification.id)}
          style={[styles.actionBtnDanger, { backgroundColor: actionDangerBg }]}
          activeOpacity={0.8}
        >
          <Ionicons name="trash-outline" size={13} color={secondaryTextColor} />
          <Text style={[styles.actionBtnDangerText, { color: secondaryTextColor }]}>Delete</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ── Grouped Notification Card ──
function GroupedNotificationCard({
  group,
  sectionKey,
  expandedGroups,
  onToggle,
  onMarkGroupRead,
  onDeleteGroup,
  onNotificationPress,
  isDark,
}: any) {
  const { type, notifications: groupNotifications, latestNotification } = group;
  const count = groupNotifications.length;
  const unreadCount = groupNotifications.filter((n: any) => !n.readAt).length;
  const hasUnread = unreadCount > 0;
  const groupKey = `${sectionKey}-${type}`;
  const isExpanded = expandedGroups.has(groupKey);
  const iconName = getNotificationIconName(type);
  const textColor = isDark ? '#ffffff' : '#111827';
  const secondaryTextColor = isDark ? '#9ca3af' : '#6b7280';
  const cardBg = isDark ? '#1A1A1A' : '#ffffff';
  const cardBorder = isDark ? '#374151' : '#e5e7eb';
  const unreadBg = isDark ? 'rgba(124,58,237,0.15)' : 'rgba(124,58,237,0.04)';
  const unreadBorder = isDark ? 'rgba(124,58,237,0.35)' : 'rgba(124,58,237,0.25)';
  const iconBg = isDark ? 'rgba(124,58,237,0.2)' : 'rgba(124,58,237,0.12)';
  const readIconBg = isDark ? '#374151' : '#f3f4f6';
  const actionBg = isDark ? 'rgba(124,58,237,0.15)' : 'rgba(124,58,237,0.08)';
  const actionDangerBg = isDark ? '#2d2d2d' : '#f9fafb';
  const expandedBg = isDark ? '#262626' : '#ffffff';
  const expandedBorder = isDark ? '#374151' : '#e5e7eb';

  return (
    <View>
      {/* Group Header Card */}
      <TouchableOpacity
        onPress={() => {
          LayoutAnimation.configureNext(
            LayoutAnimation.Presets.easeInEaseOut
          );
          onToggle(groupKey);
        }}
        style={[
          styles.card,
          {
            backgroundColor: hasUnread ? unreadBg : cardBg,
            borderColor: hasUnread ? unreadBorder : cardBorder,
          },
        ]}
        activeOpacity={0.8}
      >
        {hasUnread ? <View style={styles.unreadStrip} /> : null}

        <View style={styles.cardRow}>
          {/* Icon with count badge */}
          <View style={{ position: 'relative' }}>
            <View
              style={[
                styles.iconBox,
                {
                  backgroundColor: hasUnread ? iconBg : readIconBg,
                },
              ]}
            >
              <Ionicons
                name={iconName as any}
                size={18}
                color={hasUnread ? '#fa5610' : secondaryTextColor}
              />
            </View>
            {/* Count badge */}
            <View
              style={[
                styles.countBadge,
                {
                  backgroundColor: hasUnread ? '#fa5610' : '#6b7280',
                },
              ]}
            >
              <Text
                style={[
                  styles.countBadgeText,
                  { color: '#ffffff' },
                ]}
              >
                {count}
              </Text>
            </View>
          </View>

          {/* Content */}
          <View style={styles.cardContent}>
            {/* Group name + timestamp + chevron */}
            <View style={styles.cardTopRow}>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text
                  style={[
                    styles.cardTitle,
                    {
                      color: textColor,
                      fontWeight: hasUnread ? '600' : '400',
                    },
                  ]}
                  numberOfLines={1}
                >
                  {getTypeDisplayName(type)}
                  {unreadCount > 0 ? (
                    <Text style={{ color: '#fa5610' }}>
                      {' '}
                      · {unreadCount} unread
                    </Text>
                  ) : null}
                </Text>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <Text style={[styles.cardTime, { color: secondaryTextColor }]}>
                  {timeAgo(latestNotification.createdAt)}
                </Text>
                <Ionicons
                  name={isExpanded ? 'chevron-up' : 'chevron-down'}
                  size={15}
                  color={secondaryTextColor}
                />
              </View>
            </View>

            {/* Preview of latest (only when collapsed) */}
            {!isExpanded ? (
              <Text style={[styles.cardBody, { color: secondaryTextColor }]} numberOfLines={1}>
                {latestNotification.title}
              </Text>
            ) : null}

            {/* Group action buttons */}
            <View style={styles.cardActions}>
              {hasUnread ? (
                <TouchableOpacity
                  onPress={() => {
                    onMarkGroupRead(group);
                  }}
                  style={[styles.actionBtnPrimary, { backgroundColor: actionBg }]}
                  activeOpacity={0.8}
                >
                  <Ionicons name="checkmark-done" size={13} color="#fa5610" />
                  <Text style={styles.actionBtnPrimaryText}>
                    Mark all read
                  </Text>
                </TouchableOpacity>
              ) : null}
              <TouchableOpacity
                onPress={() => onDeleteGroup(group)}
                style={[styles.actionBtnDanger, { backgroundColor: actionDangerBg }]}
                activeOpacity={0.8}
              >
                <Ionicons name="trash-outline" size={13} color={secondaryTextColor} />
                <Text style={[styles.actionBtnDangerText, { color: secondaryTextColor }]}>Delete all</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </TouchableOpacity>

      {/* Expanded individual notifications — indented with left border line */}
      {isExpanded ? (
        <View style={[styles.expandedContainer, { borderLeftColor: isDark ? '#374151' : '#e5e7eb' }]}>
          {groupNotifications.map((n: any) => (
            <TouchableOpacity
              key={n.id}
              onPress={() => onNotificationPress?.(n)}
              style={[
                styles.expandedCard,
                {
                  backgroundColor: !n.readAt ? unreadBg : expandedBg,
                  borderColor: !n.readAt ? unreadBorder : expandedBorder,
                },
              ]}
              activeOpacity={0.8}
            >
              <View style={styles.expandedTopRow}>
                <Text
                  style={[
                    styles.expandedTitle,
                    {
                      color: textColor,
                      fontWeight: !n.readAt ? '600' : '400',
                    },
                  ]}
                  numberOfLines={2}
                >
                  {n.title}
                </Text>
                <Text style={[styles.cardTime, { color: secondaryTextColor }]}>
                  {timeAgo(n.createdAt)}
                </Text>
              </View>
              {n.body ? (
                <Text style={[styles.cardBody, { color: secondaryTextColor }]} numberOfLines={1}>
                  {n.body}
                </Text>
              ) : null}
            </TouchableOpacity>
          ))}
        </View>
      ) : null}
    </View>
  );
}

// ── Section Header ──
function SectionHeader({ title, isDark }: any) {
  return (
    <View style={[styles.sectionHeader, { borderBottomColor: isDark ? '#374151' : '#e5e7eb' }]}>
      <Text style={[styles.sectionHeaderText, { color: isDark ? '#9ca3af' : '#9ca3af' }]}>
        {title.toUpperCase()}
      </Text>
    </View>
  );
}

// ===================== MAIN SCREEN =====================
export default function TalentNotificationsFeedScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { isDark } = useTheme();
  const {
    notifications,
    unreadCount,
    isLoading,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    refetch,
  } = useNotifications();

  const [filter, setFilter] = useState<'all' | 'unread' | 'read'>('all');
  const [expandedGroups, setExpandedGroups] = useState(new Set<string>());
  const [refreshing, setRefreshing] = useState(false);

  // Mark all notifications as read when screen mounts
  useEffect(() => {
    markAllAsRead();
  }, [markAllAsRead]);

  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const toggleGroup = useCallback((groupKey: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(groupKey)) next.delete(groupKey);
      else next.add(groupKey);
      return next;
    });
  }, []);

  const handleMarkGroupRead = useCallback(
    (group: any) => {
      group.notifications.forEach((n: any) => {
        if (!n.readAt) markAsRead(n.id);
      });
    },
    [markAsRead]
  );

  const handleDeleteGroup = useCallback(
    (group: any) => {
      Alert.alert(
        'Delete All?',
        `Delete all ${group.notifications.length} notifications in this group?`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Delete All',
            style: 'destructive',
            onPress: () => {
              group.notifications.forEach((n: any) =>
                deleteNotification(n.id)
              );
            },
          },
        ]
      );
    },
    [deleteNotification]
  );

  const handleNotificationPress = useCallback(
    (notification: any) => {

      markAsRead(notification.id);

      // ALWAYS use deepLink if available - normalize it for Expo Router
      if (notification.deepLink) {
        const normalizedLink = normalizeDeepLink(notification.deepLink);
        if (normalizedLink) {
          try {
            router.push(normalizedLink as any);
          } catch (err) {
            const errorMsg = extractErrorMessage(err);
            console.error('[NOTIFICATION DEBUG] router.push() threw error:', errorMsg);
          }
        } else {
        }
      } else {
      }
    },
    [markAsRead, router]
  );

  // Filter
  const filteredNotifications = notifications.filter((n) => {
    if (filter === 'unread') return !n.readAt;
    if (filter === 'read') return !!n.readAt;
    return true;
  });

  const filterCounts = {
    all: notifications.length,
    unread: notifications.filter((n) => !n.readAt).length,
    read: notifications.filter((n) => !!n.readAt).length,
  };

  // Group by date
  const { today, yesterday, thisWeek, earlier } = React.useMemo(
    () => groupNotificationsByDate(filteredNotifications),
    [filteredNotifications]
  );

  const hasAny = filteredNotifications.length > 0;

  const renderSection = (title: string, groups: any[]) => {
    if (!groups || groups.length === 0) return null;
    return (
      <View key={title} style={styles.section}>
        <SectionHeader title={title} isDark={isDark} />
        <View style={{ gap: 8 }}>
          {groups.map((group) =>
            group.notifications.length === 1 ? (
              <SingleNotificationCard
                key={group.latestNotification.id}
                notification={group.latestNotification}
                onMarkRead={markAsRead}
                onDelete={deleteNotification}
                onPress={() => handleNotificationPress(group.latestNotification)}
                isDark={isDark}
              />
            ) : (
              <GroupedNotificationCard
                key={`${title}-${group.type}`}
                group={group}
                sectionKey={title}
                expandedGroups={expandedGroups}
                onToggle={toggleGroup}
                onMarkGroupRead={handleMarkGroupRead}
                onDeleteGroup={handleDeleteGroup}
                onNotificationPress={handleNotificationPress}
                isDark={isDark}
              />
            )
          )}
        </View>
      </View>
    );
  };

  if (isLoading) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        {/* Header - always visible */}
        <View style={styles.header}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <TouchableOpacity
              onPress={() => router.back()}
              style={styles.backBtn}
              activeOpacity={0.8}
            >
              <Ionicons name="chevron-back" size={22} color="#111827" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Notifications</Text>
          </View>
        </View>

        {/* Animated Skeleton Loading Content */}
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Filter Tabs Skeleton */}
          <View style={styles.filterTabsContainer}>
            {[1, 2, 3].map((i) => (
              <View key={i} style={{ flex: 1 }}>
                <SkeletonLoader width="100%" height={40} borderRadius={12} />
              </View>
            ))}
          </View>

          {/* Notification Cards Skeleton */}
          <View style={{ gap: 12 }}>
            {[1, 2, 3, 4, 5].map((i) => (
              <View key={`skeleton-${i}`} style={[styles.card, styles.cardRead]}>
                {/* Skeleton left border (hidden for skeleton) */}
                <View style={styles.cardRow}>
                  {/* Icon Skeleton */}
                  <View
                    style={[
                      styles.iconBox,
                      { backgroundColor: '#f3f4f6' },
                    ]}
                  />
                  {/* Content Skeleton */}
                  <View style={styles.cardContent}>
                    {/* Title line */}
                    <View
                      style={{
                        height: 14,
                        backgroundColor: '#f3f4f6',
                        borderRadius: 7,
                        width: '70%',
                        marginBottom: 8,
                      }}
                    />
                    {/* Subtitle line */}
                    <View
                      style={{
                        height: 12,
                        backgroundColor: '#f3f4f6',
                        borderRadius: 6,
                        width: '90%',
                        marginBottom: 8,
                      }}
                    />
                    {/* Action buttons skeleton */}
                    <View
                      style={{
                        height: 28,
                        backgroundColor: '#f3f4f6',
                        borderRadius: 8,
                        width: '40%',
                      }}
                    />
                  </View>
                </View>
              </View>
            ))}
          </View>

          <View style={{ height: 40 }} />
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
    <View style={[styles.container, { paddingTop: insets.top, backgroundColor: colors.bg }]}>
      {/* ─── STICKY HEADER ─── */}
      <View
        style={[
          styles.header,
          {
            backgroundColor: colors.bg,
            borderBottomColor: colors.border,
          },
        ]}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backBtn}
            activeOpacity={0.8}
          >
            <Ionicons name="chevron-back" size={22} color={colors.text} />
          </TouchableOpacity>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Text style={[styles.headerTitle, { color: colors.text }]}>Notifications</Text>
            {unreadCount > 0 && (
              <View style={styles.headerUnreadBadge}>
                <Text style={styles.headerUnreadText}>{unreadCount}</Text>
              </View>
            )}
          </View>
        </View>

        {/* Mark all read button (right side) */}
        {unreadCount > 0 && (
          <TouchableOpacity
            onPress={markAllAsRead}
            style={[styles.markAllBtn, { borderColor: colors.border }]}
            activeOpacity={0.8}
          >
            <Ionicons name="checkmark-done" size={14} color={colors.text} />
            <Text style={[styles.markAllText, { color: colors.text }]}>Mark all</Text>
          </TouchableOpacity>
        )}
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
        {/* ─── SEGMENTED FILTER TABS ─── */}
        <View
          style={[
            styles.filterTabsContainer,
            {
              backgroundColor: isDark
                ? 'rgba(124,58,237,0.1)'
                : 'rgba(107,114,128,0.1)',
            },
          ]}
        >
          {(['all', 'unread', 'read'] as const).map((tab) => (
            <TouchableOpacity
              key={tab}
              onPress={() => setFilter(tab)}
              style={[
                styles.filterTab,
                filter === tab && styles.filterTabActive,
              ]}
              activeOpacity={0.8}
            >
              <Text
                style={[
                  styles.filterTabText,
                  {
                    color: filter === tab ? '#ffffff' : colors.textSecondary,
                  },
                ]}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
                {filterCounts[tab] > 0 ? ` (${filterCounts[tab]})` : ''}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* ─── NOTIFICATIONS LIST ─── */}
        {!hasAny ? (
          <View style={styles.emptyState}>
            <View
              style={[
                styles.emptyIconBox,
                {
                  backgroundColor: isDark ? '#2d2d2d' : '#f3f4f6',
                },
              ]}
            >
              <Ionicons
                name="notifications-outline"
                size={36}
                color={isDark ? '#6b7280' : 'rgba(107,114,128,0.4)'}
              />
            </View>
            <Text
              style={[
                styles.emptyTitle,
                {
                  color: isDark ? '#ffffff' : '#111827',
                },
              ]}
            >
              {filter === 'all'
                ? 'No notifications yet'
                : `No ${filter} notifications`}
            </Text>
            <Text
              style={[
                styles.emptySubtitle,
                {
                  color: isDark ? '#9ca3af' : '#9ca3af',
                },
              ]}
            >
              {filter === 'all'
                ? "When you receive updates about bookings, messages, or payments, they'll appear here"
                : filter === 'unread'
                ? "You're all caught up! No new notifications to review"
                : "Notifications you've read will show up here"}
            </Text>
          </View>
        ) : (
          <View style={{ gap: 24 }}>
            {renderSection('Today', today)}
            {renderSection('Yesterday', yesterday)}
            {renderSection('This Week', thisWeek)}
            {renderSection('Earlier', earlier)}
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

// ===================== STYLES =====================
const styles = StyleSheet.create({
  container: { flex: 1 },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: { fontSize: 20, fontWeight: '700', color: '#111827' },
  headerUnreadBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    backgroundColor: '#fa5610',
    borderRadius: 20,
  },
  headerUnreadText: { color: '#ffffff', fontSize: 12, fontWeight: '700' },
  markAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  markAllText: { fontSize: 13, fontWeight: '600', color: '#111827' },

  // Scroll
  scrollView: { flex: 1 },
  scrollContent: { padding: 16 },

  // Filter tabs
  filterTabsContainer: {
    flexDirection: 'row',
    backgroundColor: 'rgba(107,114,128,0.1)',
    borderRadius: 16,
    padding: 4,
    marginBottom: 20,
    gap: 4,
  },
  filterTab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 12,
  },
  filterTabActive: {
    backgroundColor: '#fa5610',
    shadowColor: '#fa5610',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 3,
  },
  filterTabText: { fontSize: 13, fontWeight: '600', color: '#6b7280' },
  filterTabTextActive: { color: '#ffffff' },

  // Notification card base
  card: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    position: 'relative',
    overflow: 'hidden',
  },
  cardRead: {
    borderColor: 'rgba(229,231,235,0.6)',
  },
  cardUnread: {
    backgroundColor: 'rgba(124,58,237,0.04)',
    borderColor: 'rgba(124,58,237,0.25)',
  },

  // Unread left border strip
  unreadStrip: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
    backgroundColor: '#fa5610',
    borderTopLeftRadius: 16,
    borderBottomLeftRadius: 16,
  },

  cardRow: { flexDirection: 'row', gap: 12, paddingLeft: 4 },

  // Icon box
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  iconBoxUnread: { backgroundColor: 'rgba(124,58,237,0.12)' },
  iconBoxRead: { backgroundColor: '#f3f4f6' },

  // Card content
  cardContent: { flex: 1, minWidth: 0 },
  cardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 8,
    marginBottom: 4,
  },
  cardTitle: {
    flex: 1,
    fontSize: 14,
    color: '#111827',
    lineHeight: 20,
  },
  cardTitleUnread: { fontWeight: '600' },
  cardTime: { fontSize: 11, color: '#9ca3af', flexShrink: 0 },
  cardBody: { fontSize: 13, color: '#6b7280', lineHeight: 18, marginBottom: 8 },
  unreadCountText: {
    fontSize: 12,
    color: '#fa5610',
    fontWeight: '400',
  },

  // Action buttons
  cardActions: { flexDirection: 'row', gap: 6, marginTop: 4 },
  actionBtnPrimary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: 'rgba(124,58,237,0.08)',
  },
  actionBtnPrimaryText: {
    fontSize: 12,
    color: '#fa5610',
    fontWeight: '600',
  },
  actionBtnDanger: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#f9fafb',
  },
  actionBtnDangerText: {
    fontSize: 12,
    color: '#9ca3af',
    fontWeight: '500',
  },

  // Count badge on grouped card icon
  countBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  countBadgeUnread: { backgroundColor: '#fa5610' },
  countBadgeRead: { backgroundColor: '#6b7280' },
  countBadgeText: { fontSize: 10, fontWeight: '700' },
  countBadgeTextUnread: { color: '#ffffff' },
  countBadgeTextRead: { color: '#ffffff' },

  // Expanded group
  expandedContainer: {
    marginLeft: 20,
    paddingLeft: 16,
    borderLeftWidth: 2,
    borderLeftColor: 'rgba(229,231,235,0.8)',
    marginTop: 8,
    gap: 8,
  },
  expandedCard: {
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  expandedCardUnread: {
    backgroundColor: 'rgba(124,58,237,0.04)',
    borderColor: 'rgba(124,58,237,0.2)',
  },
  expandedCardRead: {
    backgroundColor: 'rgba(255,255,255,0.5)',
    borderColor: 'rgba(229,231,235,0.4)',
  },
  expandedTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 8,
    marginBottom: 4,
  },
  expandedTitle: { flex: 1, fontSize: 13, color: '#111827' },
  expandedTitleUnread: { fontWeight: '600' },

  // Section header
  section: { gap: 10 },
  sectionHeader: {
    paddingVertical: 6,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(229,231,235,0.6)',
  },
  sectionHeaderText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#9ca3af',
    letterSpacing: 0.8,
  },

  // Empty state
  emptyState: { alignItems: 'center', paddingTop: 60, paddingHorizontal: 32 },
  emptyIconBox: {
    width: 80,
    height: 80,
    borderRadius: 24,
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#9ca3af',
    textAlign: 'center',
    lineHeight: 22,
    maxWidth: 280,
  },
});
