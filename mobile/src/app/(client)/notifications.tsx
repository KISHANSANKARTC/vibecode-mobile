import { View, Text, ScrollView, Pressable, StyleSheet, ActivityIndicator, FlatList } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { useState, useCallback, useMemo } from 'react';
import { useRouter } from '@/lib/router-helper';
import { useNotifications, Notification } from '@/hooks/useNotifications';
import { isToday, isYesterday, isThisWeek, formatDistanceToNow } from 'date-fns';
import { normalizeDeepLink } from '@/helpers/notificationHelpers';
import { useTheme } from '@/lib/theme/ThemeContext';
import { extractErrorMessage } from '@/lib/errorUtils';

// HELPER FUNCTIONS

function getNotificationIconName(type: string) {
  const map: { [key: string]: string } = {
    booking_request: 'calendar-outline',
    booking_accepted: 'calendar-outline',
    booking_declined: 'calendar-outline',
    booking_cancelled: 'calendar-outline',
    booking_completed: 'calendar-outline',
    booking_reminder: 'calendar-outline',
    booking: 'calendar-outline',
    message: 'chatbubble-outline',
    new_message: 'chatbubble-outline',
    payment: 'card-outline',
    payment_success: 'card-outline',
    payment_received: 'card-outline',
    payout_ready: 'card-outline',
    file: 'folder-outline',
    file_uploaded: 'folder-outline',
    quote: 'document-text-outline',
    quote_accepted: 'document-text-outline',
    quote_declined: 'document-text-outline',
    custom_offer_received: 'document-text-outline',
    verification_approved: 'shield-checkmark-outline',
    verification_rejected: 'shield-checkmark-outline',
    influencer_verification_approved: 'shield-checkmark-outline',
    influencer_verification_rejected: 'shield-checkmark-outline',
    company_verification_approved: 'shield-checkmark-outline',
    company_verification_rejected: 'shield-checkmark-outline',
    welcome: 'hand-left-outline',
    welcome_client: 'hand-left-outline',
    inquiry: 'mail-outline',
    portfolio_request: 'mail-outline',
  };
  return map[type] || 'notifications-outline';
}

function getNotificationIconColor(type: string) {
  if (type.includes('booking')) return { bg: 'rgba(99,102,241,0.15)', color: '#6366f1' };
  if (type.includes('message')) return { bg: 'rgba(59,130,246,0.15)', color: '#3b82f6' };
  if (type.includes('payment') || type.includes('payout')) return { bg: 'rgba(16,185,129,0.15)', color: '#10b981' };
  if (type.includes('file')) return { bg: 'rgba(245,158,11,0.15)', color: '#f59e0b' };
  if (type.includes('quote') || type.includes('offer')) return { bg: 'rgba(139,92,246,0.15)', color: '#8b5cf6' };
  if (type.includes('verification')) return { bg: 'rgba(20,184,166,0.15)', color: '#14b8a6' };
  if (type.includes('welcome')) return { bg: 'rgba(236,72,153,0.15)', color: '#ec4899' };
  return { bg: 'rgba(107,114,128,0.15)', color: '#6b7280' };
}

function getTypeDisplayName(type: string) {
  const map: { [key: string]: string } = {
    booking_request: 'Booking Requests',
    booking_accepted: 'Bookings Accepted',
    booking_declined: 'Bookings Declined',
    booking_cancelled: 'Bookings Cancelled',
    booking_completed: 'Bookings Completed',
    booking_reminder: 'Booking Reminders',
    booking: 'Bookings',
    message: 'Messages',
    new_message: 'New Messages',
    payment: 'Payments',
    payment_success: 'Payment Confirmations',
    payment_received: 'Payments Received',
    payout_ready: 'Payouts Ready',
    file: 'Files',
    file_uploaded: 'Files Uploaded',
    quote: 'Quotes',
    quote_accepted: 'Quotes Accepted',
    quote_declined: 'Quotes Declined',
    custom_offer_received: 'Custom Offers',
    verification_approved: 'Verification Approved',
    verification_rejected: 'Verification Rejected',
    influencer_verification_approved: 'Influencer Verified',
    influencer_verification_rejected: 'Influencer Verification Rejected',
    company_verification_approved: 'Company Verified',
    company_verification_rejected: 'Company Verification Rejected',
    welcome: 'Welcome',
    welcome_client: 'Welcome',
    inquiry: 'Inquiries',
    portfolio_request: 'Portfolio Requests',
  };
  return map[type] || type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
}

function groupByType(notifications: Notification[]) {
  const typeMap = new Map<string, Notification[]>();
  notifications.forEach((n) => {
    const existing = typeMap.get(n.type) || [];
    existing.push(n);
    typeMap.set(n.type, existing);
  });

  return Array.from(typeMap.entries())
    .map(([type, items]) => {
      const sorted = items.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
      return {
        type,
        notifications: sorted,
        latestNotification: sorted[0],
      };
    })
    .sort((a, b) => b.latestNotification.createdAt.getTime() - a.latestNotification.createdAt.getTime());
}

function groupByDate(notifications: Notification[]) {
  const today: Notification[] = [];
  const yesterday: Notification[] = [];
  const thisWeek: Notification[] = [];
  const earlier: Notification[] = [];

  notifications.forEach((n) => {
    if (isToday(n.createdAt)) today.push(n);
    else if (isYesterday(n.createdAt)) yesterday.push(n);
    else if (isThisWeek(n.createdAt)) thisWeek.push(n);
    else earlier.push(n);
  });

  return {
    today: groupByType(today),
    yesterday: groupByType(yesterday),
    thisWeek: groupByType(thisWeek),
    earlier: groupByType(earlier),
  };
}

// DYNAMIC STYLES FUNCTION

function getThemeStyles(isDark: boolean) {
  return {
    container: {
      flex: 1,
      backgroundColor: isDark ? '#0A0A0A' : '#FAFAFA',
    },
    header: {
      backgroundColor: isDark ? '#1A1A1A' : '#FFF',
      borderBottomWidth: 1,
      borderBottomColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)',
    },
    backButton: {
      backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
    },
    headerTitle: {
      color: isDark ? '#FFF' : '#1F2937',
    },
    markAllButton: {
      backgroundColor: isDark ? 'rgba(250,86,16,0.2)' : 'rgba(250,86,16,0.1)',
    },
    unreadText: {
      color: isDark ? '#A0A0A0' : '#6B7280',
    },
    filterTabs: {
      backgroundColor: isDark ? '#1A1A1A' : '#FFF',
      borderBottomColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)',
    },
    filterTab: {
      backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
    },
    filterTabText: {
      color: isDark ? '#A0A0A0' : '#6B7280',
    },
    filterTabCount: {
      color: isDark ? '#6B7280' : '#9CA3AF',
    },
    dateSectionTitle: {
      color: isDark ? '#6B7280' : '#9CA3AF',
    },
    typeGroupCard: {
      backgroundColor: isDark ? '#1A1A1A' : '#FFF',
      borderColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)',
    },
    typeGroupTitle: {
      color: isDark ? '#FFF' : '#1F2937',
    },
    typeGroupBadge: {
      backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
    },
    typeGroupBadgeText: {
      color: isDark ? '#A0A0A0' : '#6B7280',
    },
    notificationRow: {
      borderTopColor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)',
    },
    notificationRowUnread: {
      backgroundColor: isDark ? 'rgba(250,86,16,0.1)' : 'rgba(250,86,16,0.03)',
    },
    notificationTitle: {
      color: isDark ? '#FFF' : '#1F2937',
    },
    notificationBody: {
      color: isDark ? '#A0A0A0' : '#6B7280',
    },
    notificationTime: {
      color: isDark ? '#6B7280' : '#9CA3AF',
    },
    emptyTitle: {
      color: isDark ? '#FFF' : '#1F2937',
    },
    emptyText: {
      color: isDark ? '#A0A0A0' : '#6B7280',
    },
  };
}

// STYLES

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAFAFA',
  },
  header: {
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    backgroundColor: 'rgba(0,0,0,0.05)',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
  },
  markAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(250,86,16,0.1)',
  },
  markAllText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#fa5610',
    marginLeft: 6,
  },
  unreadBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  unreadDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#fa5610',
    marginRight: 8,
  },
  unreadText: {
    fontSize: 13,
    color: '#6B7280',
  },
  filterTabs: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 12,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  filterTab: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    marginRight: 8,
    borderRadius: 16,
    backgroundColor: 'rgba(0,0,0,0.05)',
  },
  filterTabActive: {
    backgroundColor: '#fa5610',
  },
  filterTabText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
  },
  filterTabTextActive: {
    color: '#FFF',
  },
  filterTabCount: {
    fontSize: 11,
    fontWeight: '600',
    color: '#9CA3AF',
    marginLeft: 4,
  },
  filterTabCountActive: {
    color: 'rgba(255,255,255,0.8)',
  },
  dateSection: {
    marginTop: 16,
  },
  dateSectionHeader: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: 'transparent',
  },
  dateSectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#9CA3AF',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  typeGroupCard: {
    marginHorizontal: 16,
    marginVertical: 6,
    backgroundColor: '#FFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
  },
  typeGroupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  typeGroupTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
  },
  typeGroupBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
    backgroundColor: 'rgba(0,0,0,0.05)',
  },
  typeGroupBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#6B7280',
  },
  typeGroupBadgeExpanded: {
    backgroundColor: '#fa5610',
  },
  typeGroupBadgeExpandedText: {
    color: '#FFF',
  },
  notificationRow: {
    flexDirection: 'row',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.03)',
  },
  notificationRowUnread: {
    backgroundColor: 'rgba(250,86,16,0.03)',
    borderLeftWidth: 3,
    borderLeftColor: '#fa5610',
    marginLeft: -14,
    marginRight: -14,
    paddingLeft: 14 + 3,
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  notificationContent: {
    flex: 1,
  },
  notificationTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 2,
  },
  notificationBody: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 4,
    lineHeight: 16,
  },
  notificationTime: {
    fontSize: 11,
    color: '#9CA3AF',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  emptyIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    paddingHorizontal: 32,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  contentContainer: {
    paddingBottom: 24,
  },
});

// NOTIFICATION ITEM COMPONENT

function NotificationItem({
  notification,
  onPress,
  onDelete,
  isDark,
  isLoading,
}: {
  notification: Notification;
  onPress?: () => void;
  onDelete?: () => void;
  isDark?: boolean;
  isLoading?: boolean;
}) {
  const colors = getNotificationIconColor(notification.type);
  const iconName = getNotificationIconName(notification.type);
  const isUnread = !notification.readAt;
  const themeStyles = getThemeStyles(isDark ?? false);

  return (
    <Pressable
      onPress={() => {
        try {
          onPress?.();
        } catch (error) {
          const errorMsg = error instanceof Error ? error.message : typeof error === 'string' ? error : 'Unknown error';
          console.error('[NotificationItem] Press error:', errorMsg);
        }
      }}
      disabled={isLoading}
      style={[
        styles.notificationRow,
        themeStyles.notificationRow,
        isUnread && styles.notificationRowUnread,
        isUnread && themeStyles.notificationRowUnread,
        isLoading && { opacity: 0.6 },
      ]}
    >
      <View
        style={[
          styles.iconContainer,
          { backgroundColor: colors.bg },
        ]}
      >
        {isLoading ? (
          <ActivityIndicator size="small" color={colors.color} />
        ) : (
          <Ionicons name={iconName as any} size={18} color={colors.color} />
        )}
      </View>
      <View style={styles.notificationContent}>
        <Text style={[styles.notificationTitle, themeStyles.notificationTitle]} numberOfLines={1}>
          {notification.title}
        </Text>
        {notification.body ? (
          <Text style={[styles.notificationBody, themeStyles.notificationBody]} numberOfLines={2}>
            {notification.body}
          </Text>
        ) : null}
        <Text style={[styles.notificationTime, themeStyles.notificationTime]}>
          {formatDistanceToNow(notification.createdAt, { addSuffix: true })}
        </Text>
      </View>
      {onDelete ? (
        <Pressable
          onPress={onDelete}
          hitSlop={8}
          style={{ marginLeft: 8, padding: 4 }}
        >
          <Ionicons name="trash-outline" size={16} color={isDark ? '#6B7280' : '#9CA3AF'} />
        </Pressable>
      ) : isUnread && !isLoading ? (
        <View
          style={{
            width: 8,
            height: 8,
            borderRadius: 4,
            backgroundColor: '#fa5610',
            marginLeft: 8,
            marginTop: 4,
          }}
        />
      ) : null}
    </Pressable>
  );
}

// TYPE GROUP CARD COMPONENT

function TypeGroupCard({
  typeGroup,
  isExpanded,
  onPress,
  onNotificationPress,
  onNotificationDelete,
  isDark,
  selectedNotificationId,
}: {
  typeGroup: {
    type: string;
    notifications: Notification[];
    latestNotification: Notification;
  };
  isExpanded: boolean;
  onPress?: () => void;
  onNotificationPress?: (notification: Notification) => void;
  onNotificationDelete?: (notification: Notification) => void;
  isDark?: boolean;
  selectedNotificationId?: string | null;
}) {
  const colors = getNotificationIconColor(typeGroup.type);
  const displayName = getTypeDisplayName(typeGroup.type);
  const themeStyles = getThemeStyles(isDark ?? false);

  return (
    <View style={[styles.typeGroupCard, themeStyles.typeGroupCard]}>
      <Pressable
        onPress={() => {
          try {
            onPress?.();
          } catch (error) {
            const errorMsg = error instanceof Error ? error.message : typeof error === 'string' ? error : 'Unknown error';
            console.error('[TypeGroupCard] Press error:', errorMsg);
          }
        }}
        style={styles.typeGroupHeader}
      >
        <Text style={[styles.typeGroupTitle, themeStyles.typeGroupTitle]}>{displayName}</Text>
        <View
          style={[
            styles.typeGroupBadge,
            themeStyles.typeGroupBadge,
            isExpanded && styles.typeGroupBadgeExpanded,
          ]}
        >
          <Text
            style={[
              styles.typeGroupBadgeText,
              themeStyles.typeGroupBadgeText,
              isExpanded && styles.typeGroupBadgeExpandedText,
            ]}
          >
            {typeGroup.notifications.length}
          </Text>
        </View>
      </Pressable>

      {isExpanded ? (
        <View>
          {typeGroup.notifications.map((notif, idx) => (
            <NotificationItem
              key={notif.id}
              notification={notif}
              onPress={() => onNotificationPress?.(notif)}
              onDelete={() => onNotificationDelete?.(notif)}
              isDark={isDark}
              isLoading={selectedNotificationId === notif.id}
            />
          ))}
        </View>
      ) : null}
    </View>
  );
}

// MAIN SCREEN

export default function NotificationsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { isDark } = useTheme();
  const { notifications, unreadCount, isLoading, markAsRead, markAllAsRead, deleteNotification } = useNotifications();
  const [filter, setFilter] = useState<'all' | 'unread' | 'read'>('all');
  const [expandedTypes, setExpandedTypes] = useState<Set<string>>(new Set());
  const [selectedNotificationId, setSelectedNotificationId] = useState<string | null>(null);

  const themeStyles = getThemeStyles(isDark);

  // Filter notifications
  const filteredNotifications = useMemo(() => {
    if (filter === 'unread') {
      return notifications.filter(n => !n.readAt);
    }
    if (filter === 'read') {
      return notifications.filter(n => !!n.readAt);
    }
    return notifications;
  }, [notifications, filter]);

  // Group by date and type
  const grouped = useMemo(() => {
    return groupByDate(filteredNotifications);
  }, [filteredNotifications]);

  // Count notifications by filter
  const counts = useMemo(() => ({
    all: notifications.length,
    unread: notifications.filter(n => !n.readAt).length,
    read: notifications.filter(n => !!n.readAt).length,
  }), [notifications]);

  const handleNotificationPress = useCallback((notification: Notification) => {
    setSelectedNotificationId(notification.id);
    markAsRead(notification.id);

    // ALWAYS use deepLink if available - normalize it for Expo Router
    if (notification.deepLink) {
      const normalizedLink = normalizeDeepLink(notification.deepLink);
      console.log(`[Notification Client] Original: ${notification.deepLink}, Normalized: ${normalizedLink}`);
      if (normalizedLink) {
        // Navigate and clear loading state after a short delay
        setTimeout(() => {
          try {
            router.push(normalizedLink as any);
          } catch (error) {
            const errorMsg = error instanceof Error ? error.message : typeof error === 'string' ? error : 'Navigation error';
            console.error('[Notification Client] Navigation error:', errorMsg);
          }
          setSelectedNotificationId(null);
        }, 300);
      } else {
        setSelectedNotificationId(null);
      }
    } else {
      console.log(`[Notification Client] No deepLink, notification type: ${notification.type}`);
      setSelectedNotificationId(null);
    }
  }, [markAsRead, router]);

  const toggleTypeExpand = useCallback((type: string) => {
    setExpandedTypes(prev => {
      const next = new Set(prev);
      if (next.has(type)) {
        next.delete(type);
      } else {
        next.add(type);
      }
      return next;
    });
  }, []);

  const renderDateSection = (title: string, typeGroups: any[]) => {
    if (typeGroups.length === 0) return null;

    return (
      <View key={title} style={styles.dateSection}>
        <View style={styles.dateSectionHeader}>
          <Text style={[styles.dateSectionTitle, themeStyles.dateSectionTitle]}>{title}</Text>
        </View>
        {typeGroups.map((tg) => (
          <TypeGroupCard
            key={tg.type}
            typeGroup={tg}
            isExpanded={expandedTypes.has(tg.type)}
            onPress={() => toggleTypeExpand(tg.type)}
            onNotificationPress={handleNotificationPress}
            onNotificationDelete={(notif) => deleteNotification(notif.id)}
            isDark={isDark}
            selectedNotificationId={selectedNotificationId}
          />
        ))}
      </View>
    );
  };

  if (isLoading) {
    return (
      <View style={[styles.container, themeStyles.container, { paddingTop: insets.top }]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#fa5610" />
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, themeStyles.container]}>
      {/* Sticky Header */}
      <Animated.View
        entering={FadeInDown.duration(300)}
        style={[
          styles.header,
          themeStyles.header,
          { paddingTop: insets.top + 8 },
        ]}
      >
        <View style={styles.headerContent}>
          <View style={styles.headerLeft}>
            <Pressable
              onPress={() => {
                try {
                  router.back();
                } catch (err) {
                  const errorMsg = extractErrorMessage(err);
                  console.error('[Notifications] Back navigation error:', errorMsg);
                }
              }}
              style={[styles.backButton, themeStyles.backButton]}
            >
              <Ionicons name="arrow-back" size={20} color={isDark ? '#FFF' : '#1F2937'} />
            </Pressable>
            <Text style={[styles.headerTitle, themeStyles.headerTitle]}>Notifications</Text>
          </View>
          {unreadCount > 0 ? (
            <Pressable
              onPress={() => {
                try {
                  markAllAsRead();
                } catch (err) {
                  const errorMsg = extractErrorMessage(err);
                  console.error('[Notifications] Mark all error:', errorMsg);
                }
              }}
              style={[styles.markAllButton, themeStyles.markAllButton]}
            >
              <Ionicons name="checkmark-circle" size={14} color="#fa5610" />
              <Text style={styles.markAllText}>Mark all</Text>
            </Pressable>
          ) : null}
        </View>
        {unreadCount > 0 ? (
          <View style={[styles.headerContent, { paddingBottom: 4, paddingTop: 0 }]}>
            <View style={styles.unreadBadge}>
              <View style={styles.unreadDot} />
              <Text style={[styles.unreadText, themeStyles.unreadText]}>
                {unreadCount} unread notification{unreadCount !== 1 ? 's' : ''}
              </Text>
            </View>
          </View>
        ) : null}
      </Animated.View>

      {/* Filter Tabs */}
      <View style={[styles.filterTabs, themeStyles.filterTabs]}>
        {(['all', 'unread', 'read'] as const).map((tab) => (
          <Pressable
            key={tab}
            onPress={() => {
              try {
                setFilter(tab);
              } catch (err) {
                const errorMsg = extractErrorMessage(err);
                console.error('[Notifications] Filter error:', errorMsg);
              }
            }}
            style={[
              styles.filterTab,
              themeStyles.filterTab,
              filter === tab && styles.filterTabActive,
            ]}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Text
                style={[
                  styles.filterTabText,
                  themeStyles.filterTabText,
                  filter === tab && styles.filterTabTextActive,
                ]}
              >
                {tab === 'all' ? 'All' : tab === 'unread' ? 'Unread' : 'Read'}
              </Text>
              <Text
                style={[
                  styles.filterTabCount,
                  themeStyles.filterTabCount,
                  filter === tab && styles.filterTabCountActive,
                ]}
              >
                {counts[tab]}
              </Text>
            </View>
          </Pressable>
        ))}
      </View>

      {/* Content */}
      {filteredNotifications.length === 0 ? (
        <View style={styles.emptyContainer}>
          <View
            style={[
              styles.emptyIcon,
              { backgroundColor: 'rgba(250,86,16,0.1)' },
            ]}
          >
            <Ionicons name="notifications-off-outline" size={40} color="#fa5610" />
          </View>
          <Text style={[styles.emptyTitle, themeStyles.emptyTitle]}>No notifications</Text>
          <Text style={[styles.emptyText, themeStyles.emptyText]}>
            {filter === 'unread'
              ? 'You are all caught up!'
              : filter === 'read'
              ? 'No read notifications yet'
              : 'When you receive notifications, they will appear here'}
          </Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={[
            styles.contentContainer,
            { paddingBottom: insets.bottom + 16 },
          ]}
          showsVerticalScrollIndicator={false}
        >
          {grouped.today.length > 0 && renderDateSection('Today', grouped.today)}
          {grouped.yesterday.length > 0 && renderDateSection('Yesterday', grouped.yesterday)}
          {grouped.thisWeek.length > 0 && renderDateSection('This Week', grouped.thisWeek)}
          {grouped.earlier.length > 0 && renderDateSection('Earlier', grouped.earlier)}
        </ScrollView>
      )}
    </View>
  );
}
