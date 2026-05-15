import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useAuthStore } from '@/lib/state/auth-store';
import { useTheme } from '@/lib/theme/ThemeContext';
import { supabase } from '@/lib/supabase';
import { extractErrorMessage } from '@/lib/api/api';

interface Notification {
  id: string;
  user_id: string;
  type: 'verification_approved' | 'verification_rejected' | 'message' | 'booking_accepted' | 'payment' | string;
  title: string;
  body: string;
  deep_link?: string;
  created_at: string;
}

const getErrorMessage = (err: unknown): string => {
  return extractErrorMessage(err);
};

export default function NotificationsScreen() {
  const insets = useSafeAreaInsets();
  const user = useAuthStore((s) => s.user);
  const { isDark } = useTheme();

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  // Color tokens based on theme
  const colors = {
    pageBg: isDark ? '#121212' : '#FAF8F5',
    cardBg: isDark ? '#1C1C1C' : '#FFFFFF',
    cardBorder: isDark ? '#2E2E2E' : '#E8E4DF',
    primaryText: isDark ? '#FAFAFA' : '#171717',
    secondaryText: isDark ? '#999999' : '#737373',
    accentOrange: '#FA5610',
    successGreen: '#34D399',
    errorRed: '#EF4444',
    warningYellow: '#F59E0B',
    buttonBg: isDark ? '#2E2E2E' : '#F5F5F5',
    unreadBg: isDark ? 'rgba(250, 86, 16, 0.05)' : 'rgba(250, 86, 16, 0.02)',
  };

  const shadowStyle = {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: isDark ? 1 : 1 },
    shadowOpacity: isDark ? 0.3 : 0.04,
    shadowRadius: isDark ? 3 : 3,
    elevation: isDark ? 2 : 1,
  };

  // Fetch notifications
  const fetchNotifications = async () => {
    if (!user?.id) return;

    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;

      setNotifications(data || []);
      setUnreadCount(data?.length || 0);
    } catch (err) {
      console.warn('[notifications] Error fetching:', getErrorMessage(err));
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  // Load notifications on mount
  useEffect(() => {
    fetchNotifications();
  }, [user?.id]);

  // Real-time subscription
  useEffect(() => {
    if (!user?.id) return;


    const channel = supabase
      .channel(`notifications:${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          const newNotification = payload.new as Notification;
          setNotifications((prev) => [newNotification, ...prev]);
          setUnreadCount((prev) => prev + 1);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id]);

  // Mark notification as read and navigate to message thread
  const handleMarkAsRead = async (notificationId: string, deepLink?: string) => {
    try {

      // Update local state to remove notification and decrement count
      setNotifications((prev) => prev.filter((n) => n.id !== notificationId));
      setUnreadCount((prev) => Math.max(0, prev - 1));

      // Step 1: Navigate if deep_link exists
      if (deepLink) {

        // Handle message notifications with format: "/talent/messages/{thread_id}"
        if (deepLink.includes('/messages/')) {
          const threadId = deepLink.split('/messages/')[1];

          if (threadId) {
            const navigatePath = `/(talent)/messagesGroup/messages/${threadId}`;
            router.push(navigatePath as any);
            return;
          }
        }

        // Handle other deep_links (profile, bookings, etc) by navigating directly
        // Convert deep_link format from "/talent/xxx" to "/(talent)/xxx"
        let navigatePath = deepLink;
        if (deepLink.startsWith('/talent/')) {
          navigatePath = `/(talent)/${deepLink.substring(8)}`; // Remove "/talent/" prefix
        }

        router.push(navigatePath as any);
      } else {
        console.warn('[notifications] No deep_link provided for notification:', notificationId);
      }
    } catch (err) {
      console.error('[notifications] Error in handleMarkAsRead:', getErrorMessage(err));
    }
  };

  // Mark all as read
  const handleMarkAllAsRead = async () => {
    // Just update local state since database doesn't support is_read
    setUnreadCount(0);
  };

  // Get notification icon and colors
  const getNotificationStyle = (type: string) => {
    const baseIconColor = isDark ? colors.secondaryText : '#9CA3AF';

    switch (type) {
      case 'verification_approved':
        return {
          bgColor: isDark ? 'rgba(52, 211, 153, 0.1)' : 'rgba(52, 211, 153, 0.1)',
          iconColor: colors.successGreen,
          icon: 'checkmark-circle',
        };
      case 'verification_rejected':
        return {
          bgColor: isDark ? 'rgba(239, 68, 68, 0.1)' : 'rgba(239, 68, 68, 0.1)',
          iconColor: colors.errorRed,
          icon: 'close-circle',
        };
      case 'booking_accepted':
        return {
          bgColor: isDark ? 'rgba(59, 130, 246, 0.1)' : 'rgba(59, 130, 246, 0.1)',
          iconColor: '#3B82F6',
          icon: 'briefcase',
        };
      case 'payment':
        return {
          bgColor: isDark ? 'rgba(245, 158, 11, 0.1)' : 'rgba(245, 158, 11, 0.1)',
          iconColor: colors.warningYellow,
          icon: 'cash',
        };
      case 'message':
        return {
          bgColor: isDark ? 'rgba(250, 86, 16, 0.1)' : 'rgba(250, 86, 16, 0.1)',
          iconColor: colors.accentOrange,
          icon: 'chatbubble',
        };
      default:
        return {
          bgColor: isDark ? 'rgba(155, 163, 175, 0.1)' : 'rgba(229, 231, 235, 1)',
          iconColor: baseIconColor,
          icon: 'notifications',
        };
    }
  };

  // Format time ago
  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (seconds < 60) return 'just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
    return date.toLocaleDateString();
  };

  if (isLoading) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: 'center',
          alignItems: 'center',
          paddingTop: insets.top,
          backgroundColor: colors.pageBg,
        }}
      >
        <ActivityIndicator size="large" color={colors.accentOrange} />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.pageBg, paddingTop: insets.top }}>
      {/* Header */}
      <View
        style={{
          paddingHorizontal: 16,
          paddingVertical: 12,
          borderBottomWidth: 1,
          borderBottomColor: colors.cardBorder,
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <Pressable
            onPress={() => router.back()}
            style={({ pressed }) => [
              {
                width: 40,
                height: 40,
                borderRadius: 20,
                backgroundColor: colors.buttonBg,
                justifyContent: 'center',
                alignItems: 'center',
                opacity: pressed ? 0.7 : 1,
              },
            ]}
          >
            <Ionicons name="arrow-back" size={20} color={colors.secondaryText} />
          </Pressable>
          <View>
            <Text style={{ fontSize: 18, fontWeight: '700', color: colors.primaryText }}>
              Notifications
            </Text>
            {unreadCount > 0 && (
              <Text style={{ fontSize: 12, color: colors.accentOrange, marginTop: 2, fontWeight: '600' }}>
                {unreadCount} unread
              </Text>
            )}
          </View>
        </View>

        {unreadCount > 0 && (
          <Pressable onPress={handleMarkAllAsRead}>
            <Text style={{ fontSize: 12, color: colors.accentOrange, fontWeight: '600' }}>
              Mark all read
            </Text>
          </Pressable>
        )}
      </View>

      {/* Notifications List */}
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: insets.bottom + 20 }}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={async () => {
              setIsRefreshing(true);
              await fetchNotifications();
            }}
            tintColor={colors.accentOrange}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {notifications.length === 0 ? (
          <View
            style={{
              flex: 1,
              justifyContent: 'center',
              alignItems: 'center',
              paddingVertical: 60,
            }}
          >
            <View
              style={{
                width: 80,
                height: 80,
                borderRadius: 40,
                backgroundColor: colors.cardBg,
                justifyContent: 'center',
                alignItems: 'center',
                marginBottom: 16,
                borderWidth: 1,
                borderColor: colors.cardBorder,
              }}
            >
              <Ionicons name="notifications-off-outline" size={40} color={colors.secondaryText} />
            </View>
            <Text style={{ fontSize: 16, fontWeight: '600', color: colors.primaryText, marginBottom: 8 }}>
              No notifications yet
            </Text>
            <Text style={{ fontSize: 14, color: colors.secondaryText, textAlign: 'center', paddingHorizontal: 20 }}>
              When admins approve or reject your verification, you'll see it here.
            </Text>
          </View>
        ) : (
          <View style={{ paddingHorizontal: 12 }}>
            {notifications.map((notification) => {
              const style = getNotificationStyle(notification.type);
              return (
                <Pressable
                  key={notification.id}
                  onPress={() =>
                    handleMarkAsRead(notification.id, notification.deep_link)
                  }
                  style={({ pressed }) => [
                    {
                      paddingVertical: 12,
                      paddingHorizontal: 12,
                      marginVertical: 4,
                      borderRadius: 12,
                      flexDirection: 'row',
                      gap: 12,
                      backgroundColor: colors.cardBg,
                      borderWidth: 1,
                      borderColor: colors.cardBorder,
                      opacity: pressed ? 0.85 : 1,
                      ...shadowStyle,
                    },
                  ]}
                >
                  {/* Icon */}
                  <View
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: 22,
                      backgroundColor: style.bgColor,
                      justifyContent: 'center',
                      alignItems: 'center',
                      minWidth: 44,
                    }}
                  >
                    <Ionicons name={style.icon as any} size={22} color={style.iconColor} />
                  </View>

                  {/* Content */}
                  <View style={{ flex: 1 }}>
                    <View
                      style={{
                        flexDirection: 'row',
                        justifyContent: 'space-between',
                        alignItems: 'flex-start',
                        marginBottom: 4,
                      }}
                    >
                      <Text
                        style={{
                          fontSize: 14,
                          fontWeight: '600',
                          color: colors.primaryText,
                          flex: 1,
                        }}
                      >
                        {notification.title}
                      </Text>
                      <View
                        style={{
                          width: 8,
                          height: 8,
                          borderRadius: 4,
                          backgroundColor: colors.accentOrange,
                          marginLeft: 8,
                          marginTop: 4,
                        }}
                      />
                    </View>

                    <Text
                      style={{
                        fontSize: 13,
                        color: colors.secondaryText,
                        marginBottom: 6,
                        lineHeight: 18,
                      }}
                      numberOfLines={2}
                    >
                      {notification.body}
                    </Text>

                    <Text style={{ fontSize: 12, color: colors.secondaryText }}>
                      {formatTimeAgo(notification.created_at)}
                    </Text>
                  </View>
                </Pressable>
              );
            })}
          </View>
        )}
      </ScrollView>
    </View>
  );
}
