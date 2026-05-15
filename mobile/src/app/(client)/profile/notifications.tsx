import {
  View,
  Text,
  ScrollView,
  Pressable,
  ActivityIndicator,
  Switch,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from '@/lib/router-helper';
import {
  ChevronLeft,
  Bell,
  MessageCircle,
  Calendar,
  DollarSign,
  Star,
  Save,
  Loader2,
  Clock,
  Mail,
  ChevronDown,
  CheckCircle,
} from 'lucide-react-native';
import { useState, useCallback } from 'react';
import { useNotificationPreferences } from '@/hooks/useNotificationPreferences';
import { useScheduledNotifications } from '@/hooks/useScheduledNotifications';
import { extractErrorMessage } from '@/lib/errorUtils';

export default function ClientNotifications() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const {
    preferences,
    isLoading,
    isSaving,
    updatePreference,
    savePreferences,
  } = useNotificationPreferences();
  const { scheduledNotifications } = useScheduledNotifications();
  const [toastMessage, setToastMessage] = useState('');
  const [showReminderDropdown, setShowReminderDropdown] = useState(false);

  const handleSave = async () => {
    try {
      await savePreferences();
      setToastMessage('Notification preferences saved');
      setTimeout(() => setToastMessage(''), 3000);
    } catch (err) {
      const errorMsg = err instanceof Error ? `Failed to save: ${err.message}` : 'Failed to save preferences';
      setToastMessage(errorMsg);
      setTimeout(() => setToastMessage(''), 3000);
    }
  };

  if (isLoading) {
    return (
      <View className="flex-1 bg-[#F8F8F8]">
        {/* Header */}
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

        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#F97316" />
        </View>
      </View>
    );
  }

  if (!preferences) {
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

        <View className="flex-1 items-center justify-center px-4">
          <Text className="text-gray-600 text-center">
            Failed to load notification preferences
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-[#F8F8F8]">
      {/* Header */}
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

      <ScrollView
        className="flex-1 px-4 py-6"
        contentContainerStyle={{ paddingBottom: 128 }}
      >
        {/* Hero Card */}
        <View className="bg-white rounded-2xl p-6 border border-gray-200 items-center mb-6">
          <View className="w-16 h-16 rounded-2xl bg-orange-100 items-center justify-center mb-4">
            <Bell size={28} color="#F97316" strokeWidth={2} />
          </View>
          <Text className="text-gray-900 text-2xl font-bold mb-2">
            Stay Updated
          </Text>
          <Text className="text-gray-600 text-center text-sm">
            Choose how you want to be notified
          </Text>
        </View>

        {/* Upcoming Reminders */}
        {scheduledNotifications.length > 0 && (
          <>
            <Text className="text-gray-900 text-sm font-semibold mb-3">
              Upcoming Reminders
            </Text>
            <View className="mb-6 space-y-2">
              {scheduledNotifications.slice(0, 3).map((notification) => (
                <View
                  key={notification.id}
                  className="bg-white rounded-xl p-3 border border-gray-200 flex-row items-center gap-3"
                >
                  <View className="w-10 h-10 rounded-lg bg-orange-100 items-center justify-center">
                    <Clock size={18} color="#F97316" strokeWidth={2} />
                  </View>
                  <View className="flex-1">
                    <Text className="text-gray-900 font-medium text-sm truncate">
                      {notification.title}
                    </Text>
                    <Text className="text-gray-500 text-xs mt-1">
                      {new Date(notification.scheduledFor).toLocaleDateString(
                        'en-US',
                        {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                          hour: 'numeric',
                          minute: '2-digit',
                          hour12: true,
                        }
                      )}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          </>
        )}

        {/* Notification Channels */}
        <Text className="text-gray-900 text-sm font-semibold mb-3">
          Notification Channels
        </Text>
        <View className="mb-6 space-y-3">
          {/* WhatsApp Reminders */}
          <View className="bg-white rounded-xl p-4 border border-gray-200 flex-row items-center justify-between">
            <View className="flex-row items-center gap-3 flex-1">
              <View className="w-10 h-10 rounded-lg bg-gray-100 items-center justify-center">
                <MessageCircle size={18} color="#9CA3AF" strokeWidth={2} />
              </View>
              <View className="flex-1">
                <Text className="text-gray-900 font-medium text-sm">
                  WhatsApp Reminders
                </Text>
                <Text className="text-gray-500 text-xs mt-0.5">
                  Receive reminders via WhatsApp
                </Text>
              </View>
            </View>
            <Switch
              value={preferences.whatsappReminderEnabled}
              onValueChange={(value) =>
                updatePreference('whatsappReminderEnabled', value)
              }
            />
          </View>

          {/* Email Reminders */}
          <View className="bg-white rounded-xl p-4 border border-gray-200 flex-row items-center justify-between">
            <View className="flex-row items-center gap-3 flex-1">
              <View className="w-10 h-10 rounded-lg bg-gray-100 items-center justify-center">
                <Mail size={18} color="#9CA3AF" strokeWidth={2} />
              </View>
              <View className="flex-1">
                <Text className="text-gray-900 font-medium text-sm">
                  Email Reminders
                </Text>
                <Text className="text-gray-500 text-xs mt-0.5">
                  Receive reminders via Email
                </Text>
              </View>
            </View>
            <Switch
              value={preferences.emailReminderEnabled}
              onValueChange={(value) =>
                updatePreference('emailReminderEnabled', value)
              }
            />
          </View>
        </View>

        {/* Notification Settings */}
        <Text className="text-gray-900 text-sm font-semibold mb-3">
          Notification Settings
        </Text>
        <View className="mb-6 space-y-3">
          {/* Booking Reminders */}
          <View>
            <View className="bg-white rounded-xl p-4 border border-gray-200 flex-row items-center justify-between">
              <View className="flex-row items-center gap-3 flex-1">
                <View className="w-10 h-10 rounded-lg bg-gray-100 items-center justify-center">
                  <Calendar size={18} color="#9CA3AF" strokeWidth={2} />
                </View>
                <View className="flex-1">
                  <Text className="text-gray-900 font-medium text-sm">
                    Booking Reminders
                  </Text>
                  <Text className="text-gray-500 text-xs mt-0.5">
                    Remind before scheduled bookings
                  </Text>
                </View>
              </View>
              <Switch
                value={preferences.bookingReminderEnabled}
                onValueChange={(value) =>
                  updatePreference('bookingReminderEnabled', value)
                }
              />
            </View>

            {/* Booking Reminder Hours Dropdown */}
            {preferences.bookingReminderEnabled ? (
              <View className="mt-3">
                <Pressable
                  onPress={() => setShowReminderDropdown(!showReminderDropdown)}
                  className="bg-white rounded-xl p-3 border border-gray-200 flex-row items-center justify-between"
                >
                  <Text className="text-gray-700 text-sm">
                    Remind me {preferences.bookingReminderHours} hours before
                  </Text>
                  <ChevronDown
                    size={18}
                    color="#9CA3AF"
                    strokeWidth={2}
                    style={{
                      transform: [
                        {
                          rotate: showReminderDropdown ? '180deg' : '0deg',
                        },
                      ],
                    }}
                  />
                </Pressable>

                {/* Reminder Hours Dropdown Menu */}
                {showReminderDropdown ? (
                  <View className="absolute top-20 left-0 right-0 mx-4 bg-white rounded-lg border border-gray-200 z-50"
                    style={{
                      shadowColor: '#000',
                      shadowOpacity: 0.1,
                      shadowRadius: 8,
                      elevation: 5,
                    }}>
                    {[12, 24, 48, 72].map((hours, index) => (
                      <Pressable
                        key={hours}
                        onPress={() => {
                          updatePreference('bookingReminderHours', hours);
                          setShowReminderDropdown(false);
                        }}
                        className={`px-4 py-3 flex-row items-center justify-between ${
                          index < 3 ? 'border-b border-gray-100' : ''
                        }`}
                      >
                        <Text className="text-gray-900 text-sm">
                          {hours} hours
                        </Text>
                        {preferences.bookingReminderHours === hours ? (
                          <CheckCircle
                            size={18}
                            color="#F97316"
                            strokeWidth={2}
                          />
                        ) : null}
                      </Pressable>
                    ))}
                  </View>
                ) : null}
              </View>
            ) : null}
          </View>

          {/* Booking Updates */}
          <View className="bg-white rounded-xl p-4 border border-gray-200 flex-row items-center justify-between">
            <View className="flex-row items-center gap-3 flex-1">
              <View className="w-10 h-10 rounded-lg bg-gray-100 items-center justify-center">
                <Calendar size={18} color="#9CA3AF" strokeWidth={2} />
              </View>
              <View className="flex-1">
                <Text className="text-gray-900 font-medium text-sm">
                  Booking Updates
                </Text>
                <Text className="text-gray-500 text-xs mt-0.5">
                  When talent accepts or declines
                </Text>
              </View>
            </View>
            <Switch
              value={preferences.bookingStatusEnabled}
              onValueChange={(value) =>
                updatePreference('bookingStatusEnabled', value)
              }
            />
          </View>

          {/* New Messages */}
          <View className="bg-white rounded-xl p-4 border border-gray-200 flex-row items-center justify-between">
            <View className="flex-row items-center gap-3 flex-1">
              <View className="w-10 h-10 rounded-lg bg-gray-100 items-center justify-center">
                <MessageCircle size={18} color="#9CA3AF" strokeWidth={2} />
              </View>
              <View className="flex-1">
                <Text className="text-gray-900 font-medium text-sm">
                  New Messages
                </Text>
                <Text className="text-gray-500 text-xs mt-0.5">
                  When you receive a message
                </Text>
              </View>
            </View>
            <Switch
              value={preferences.newMessageEnabled}
              onValueChange={(value) =>
                updatePreference('newMessageEnabled', value)
              }
            />
          </View>

          {/* Payment Alerts */}
          <View className="bg-white rounded-xl p-4 border border-gray-200 flex-row items-center justify-between">
            <View className="flex-row items-center gap-3 flex-1">
              <View className="w-10 h-10 rounded-lg bg-gray-100 items-center justify-center">
                <DollarSign size={18} color="#9CA3AF" strokeWidth={2} />
              </View>
              <View className="flex-1">
                <Text className="text-gray-900 font-medium text-sm">
                  Payment Alerts
                </Text>
                <Text className="text-gray-500 text-xs mt-0.5">
                  Payment confirmations and reminders
                </Text>
              </View>
            </View>
            <Switch
              value={preferences.paymentDueEnabled}
              onValueChange={(value) =>
                updatePreference('paymentDueEnabled', value)
              }
            />
          </View>

          {/* Milestone Updates */}
          <View className="bg-white rounded-xl p-4 border border-gray-200 flex-row items-center justify-between">
            <View className="flex-row items-center gap-3 flex-1">
              <View className="w-10 h-10 rounded-lg bg-gray-100 items-center justify-center">
                <DollarSign size={18} color="#9CA3AF" strokeWidth={2} />
              </View>
              <View className="flex-1">
                <Text className="text-gray-900 font-medium text-sm">
                  Milestone Updates
                </Text>
                <Text className="text-gray-500 text-xs mt-0.5">
                  When milestones are completed
                </Text>
              </View>
            </View>
            <Switch
              value={preferences.milestoneReminderEnabled}
              onValueChange={(value) =>
                updatePreference('milestoneReminderEnabled', value)
              }
            />
          </View>

          {/* Review Requests */}
          <View className="bg-white rounded-xl p-4 border border-gray-200 flex-row items-center justify-between">
            <View className="flex-row items-center gap-3 flex-1">
              <View className="w-10 h-10 rounded-lg bg-gray-100 items-center justify-center">
                <Star size={18} color="#9CA3AF" strokeWidth={2} />
              </View>
              <View className="flex-1">
                <Text className="text-gray-900 font-medium text-sm">
                  Review Requests
                </Text>
                <Text className="text-gray-500 text-xs mt-0.5">
                  Reminders to review bookings
                </Text>
              </View>
            </View>
            <Switch
              value={preferences.newReviewEnabled}
              onValueChange={(value) =>
                updatePreference('newReviewEnabled', value)
              }
            />
          </View>

          {/* Promotions */}
          <View className="bg-white rounded-xl p-4 border border-gray-200 flex-row items-center justify-between">
            <View className="flex-row items-center gap-3 flex-1">
              <View className="w-10 h-10 rounded-lg bg-gray-100 items-center justify-center">
                <Bell size={18} color="#9CA3AF" strokeWidth={2} />
              </View>
              <View className="flex-1">
                <Text className="text-gray-900 font-medium text-sm">
                  Promotions
                </Text>
                <Text className="text-gray-500 text-xs mt-0.5">
                  Special offers and new features
                </Text>
              </View>
            </View>
            <Switch
              value={preferences.marketingEnabled}
              onValueChange={(value) =>
                updatePreference('marketingEnabled', value)
              }
            />
          </View>
        </View>

        {/* Toast Message */}
        {toastMessage ? (
          <View className="bg-green-50 border border-green-200 rounded-lg p-4 flex-row items-center mb-4">
            <CheckCircle size={20} color="#22C55E" />
            <Text className="text-green-700 text-sm font-medium ml-2">
              {toastMessage}
            </Text>
          </View>
        ) : null}
      </ScrollView>

      {/* Save Button */}
      <View className="absolute bottom-0 left-0 right-0 px-4 py-4 bg-white border-t border-gray-200"
        style={{ paddingBottom: insets.bottom + 16 }}>
        <Pressable
          onPress={handleSave}
          disabled={isSaving}
          className="w-full bg-orange-500 rounded-xl py-3 flex-row items-center justify-center gap-2"
          style={{ opacity: isSaving ? 0.6 : 1 }}
        >
          {isSaving ? (
            <>
              <ActivityIndicator color="#FFFFFF" size="small" />
              <Text className="text-white font-semibold">Saving...</Text>
            </>
          ) : (
            <>
              <Save size={16} color="#FFFFFF" strokeWidth={2} />
              <Text className="text-white font-semibold">Save Preferences</Text>
            </>
          )}
        </Pressable>
      </View>
    </View>
  );
}
