import {
  View,
  Text,
  ScrollView,
  Pressable,
  Switch,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import {
  ChevronLeft,
  Calendar,
  MessageCircle,
  DollarSign,
  Star,
  Save,
} from 'lucide-react-native';
import { useState, useEffect, useCallback } from 'react';
import { useAuthStore } from '@/lib/state/auth-store';
import { supabase } from '@/lib/supabase';
import { extractErrorMessage } from '@/lib/errorUtils';

interface NotificationPreference {
  booking_updates: boolean;
  messages: boolean;
  payments: boolean;
  promotional: boolean;
}

export default function NotificationsScreen() {
  const insets = useSafeAreaInsets();
  const user = useAuthStore((s) => s.user);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [preferences, setPreferences] = useState<NotificationPreference>({
    booking_updates: true,
    messages: true,
    payments: true,
    promotional: false,
  });

  useEffect(() => {
    const fetchPreferences = async () => {
      if (!user?.id) return;

      try {
        setLoading(true);
        const { data } = await supabase
          .from('notification_preferences')
          .select('*')
          .eq('user_id', user.id)
          .maybeSingle();

        if (data) {
          setPreferences({
            booking_updates: data.booking_updates ?? true,
            messages: data.messages ?? true,
            payments: data.payments ?? true,
            promotional: data.promotional ?? false,
          });
        }
      } catch (error) {
        console.error('Error fetching preferences:', extractErrorMessage(error));
      } finally {
        setLoading(false);
      }
    };

    fetchPreferences();
  }, [user?.id]);

  const handleSave = useCallback(async () => {
    if (!user?.id) return;

    try {
      setSaving(true);
      await supabase.from('notification_preferences').upsert(
        {
          user_id: user.id,
          booking_updates: preferences.booking_updates,
          messages: preferences.messages,
          payments: preferences.payments,
          promotional: preferences.promotional,
        },
        { onConflict: 'user_id' }
      );
      setToastMessage('Preferences saved successfully');
    } catch (error) {
      console.error('Error saving preferences:', extractErrorMessage(error));
      setToastMessage('Failed to save preferences');
    } finally {
      setSaving(false);
    }
  }, [user?.id, preferences]);

  if (loading) {
    return (
      <View className="flex-1 bg-[#F8F8F8] items-center justify-center">
        <ActivityIndicator size="large" color="#F97316" />
      </View>
    );
  }

  const notificationCategories = [
    {
      key: 'booking_updates',
      icon: Calendar,
      label: 'Booking Updates',
      description: 'Get notified about booking status changes',
    },
    {
      key: 'messages',
      icon: MessageCircle,
      label: 'Messages',
      description: 'New message notifications',
    },
    {
      key: 'payments',
      icon: DollarSign,
      label: 'Payment Alerts',
      description: 'Payment and billing notifications',
    },
    {
      key: 'promotional',
      icon: Star,
      label: 'Promotional',
      description: 'Special offers and platform updates',
    },
  ];

  return (
    <View className="flex-1 bg-[#F8F8F8]">
      <View
        className="flex-row items-center px-5 py-4 border-b border-gray-200 bg-white"
        style={{ paddingTop: insets.top }}
      >
        <Pressable onPress={() => router.back()} className="mr-3">
          <ChevronLeft size={24} color="#1F2937" strokeWidth={2} />
        </Pressable>
        <Text className="text-gray-900 text-xl font-semibold">
          Notifications
        </Text>
      </View>

      <ScrollView className="flex-1 px-5 py-6" contentContainerStyle={{ paddingBottom: 120 }}>
        <Text className="text-gray-600 text-sm font-medium mb-4">
          Notification Preferences
        </Text>

        {notificationCategories.map((category) => {
          const Icon = category.icon;
          const isEnabled = preferences[category.key as keyof NotificationPreference];

          return (
            <View
              key={category.key}
              className="bg-white rounded-2xl p-4 border border-gray-200 mb-3 flex-row items-center justify-between"
            >
              <View className="flex-1 flex-row items-center mr-4">
                <View
                  className="w-10 h-10 rounded-full items-center justify-center mr-3"
                  style={{
                    backgroundColor: isEnabled ? '#FEF3F2' : '#F3F4F6',
                  }}
                >
                  <Icon
                    size={20}
                    color={isEnabled ? '#F97316' : '#9CA3AF'}
                    strokeWidth={1.5}
                  />
                </View>
                <View className="flex-1">
                  <Text className="text-gray-900 font-semibold text-sm">
                    {category.label}
                  </Text>
                  <Text className="text-gray-500 text-xs mt-0.5">
                    {category.description}
                  </Text>
                </View>
              </View>
              <Switch
                value={isEnabled}
                onValueChange={(newValue) =>
                  setPreferences((prev) => ({
                    ...prev,
                    [category.key]: newValue,
                  }))
                }
                trackColor={{ false: '#E5E7EB', true: '#FED7AA' }}
                thumbColor={isEnabled ? '#F97316' : '#9CA3AF'}
              />
            </View>
          );
        })}

        <Pressable
          onPress={handleSave}
          disabled={saving}
          className="bg-orange-500 rounded-2xl py-3 items-center justify-center flex-row mt-6"
          style={{ opacity: saving ? 0.6 : 1 }}
        >
          {saving ? (
            <ActivityIndicator color="white" />
          ) : (
            <>
              <Save size={20} color="white" strokeWidth={2} />
              <Text className="text-white font-semibold ml-2">Save Preferences</Text>
            </>
          )}
        </Pressable>

        {toastMessage ? (
          <View className="bg-green-50 border border-green-200 rounded-lg p-4 mt-4 flex-row items-center">
            <View className="w-5 h-5 rounded-full bg-green-500 items-center justify-center mr-2">
              <Text className="text-white text-xs font-bold">✓</Text>
            </View>
            <Text className="text-green-700 text-sm font-medium flex-1">
              {toastMessage}
            </Text>
          </View>
        ) : null}
      </ScrollView>
    </View>
  );
}
