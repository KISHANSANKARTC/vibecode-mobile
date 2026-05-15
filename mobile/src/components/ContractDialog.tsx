import { View, Text, Modal, Pressable, ScrollView } from 'react-native';
import { useTheme } from '@/lib/theme/ThemeContext';
import { X, FileText } from 'lucide-react-native';
import { format } from 'date-fns';

interface ContractDialogProps {
  visible: boolean;
  onClose: () => void;
  booking: {
    id: string;
    status: string;
    total_price: number;
    currency: string;
    scheduled_start?: string;
    scheduled_end?: string;
    location_text?: string;
    created_at: string;
  };
  talentName: string;
  talentRole: string;
  talentEarnings: number;
  clientName?: string;
}

export function ContractDialog({
  visible,
  onClose,
  booking,
  talentName,
  talentRole,
  talentEarnings,
  clientName,
}: ContractDialogProps) {
  const { isDark } = useTheme();

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'TBD';
    try {
      return format(new Date(dateString), 'MMM d, yyyy');
    } catch {
      return dateString;
    }
  };

  const formatDateTime = (dateString?: string) => {
    if (!dateString) return 'TBD';
    try {
      return format(new Date(dateString), 'MMM d, yyyy h:mm a');
    } catch {
      return dateString;
    }
  };

  const contractId = booking.id.substring(0, 8).toUpperCase();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable
        className="flex-1 bg-black/50 justify-center items-center p-4"
        onPress={onClose}
      >
        <Pressable
          onPress={(e) => e.stopPropagation()}
          className={`w-full max-h-[90%] rounded-2xl overflow-hidden ${isDark ? 'bg-[#1A1A1A]' : 'bg-white'}`}
        >
          {/* Header */}
          <View className={`flex-row justify-between items-center px-6 py-5 border-b ${isDark ? 'border-gray-800' : 'border-gray-200'}`}>
            <View className="flex-row items-center gap-3">
              <FileText size={24} color={isDark ? '#E5E7EB' : '#374151'} />
              <Text className={`text-lg font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                Booking Contract
              </Text>
            </View>
            <Pressable onPress={onClose} className="w-8 h-8 rounded-full items-center justify-center">
              <X size={20} color={isDark ? '#9CA3AF' : '#6B7280'} />
            </Pressable>
          </View>

          {/* Content */}
          <ScrollView className="px-6 py-5">
            {/* Contract Details Row */}
            <View className={`mb-6 pb-6 border-b ${isDark ? 'border-gray-800' : 'border-gray-200'}`}>
              <View className="flex-row justify-between mb-4">
                <View>
                  <Text className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                    Contract ID
                  </Text>
                  <Text className={`text-sm font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                    {contractId}
                  </Text>
                </View>
                <View>
                  <Text className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                    Status
                  </Text>
                  <Text className={`text-sm font-semibold capitalize ${isDark ? 'text-white' : 'text-gray-900'}`}>
                    {booking.status.replace(/_/g, ' ')}
                  </Text>
                </View>
              </View>
              <View>
                <Text className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                  Created
                </Text>
                <Text className={`text-sm font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                  {formatDate(booking.created_at)}
                </Text>
              </View>
            </View>

            {/* Parties Section */}
            <View className={`mb-6 pb-6 border-b ${isDark ? 'border-gray-800' : 'border-gray-200'}`}>
              <Text className={`text-base font-semibold mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                Parties
              </Text>

              {/* Service Provider Card */}
              <View className={`p-4 rounded-xl mb-3 ${isDark ? 'bg-gray-900' : 'bg-gray-50'}`}>
                <Text className={`text-xs font-medium mb-1 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                  Service Provider
                </Text>
                <Text className={`text-base font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                  {talentName}
                </Text>
                <Text className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                  {talentRole}
                </Text>
              </View>

              {/* Client Card */}
              {clientName ? (
                <View className={`p-4 rounded-xl ${isDark ? 'bg-gray-900' : 'bg-gray-50'}`}>
                  <Text className={`text-xs font-medium mb-1 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                    Client
                  </Text>
                  <Text className={`text-base font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                    {clientName}
                  </Text>
                </View>
              ) : null}
            </View>

            {/* Booking Details Section */}
            <View className={`mb-6 pb-6 border-b ${isDark ? 'border-gray-800' : 'border-gray-200'}`}>
              <Text className={`text-base font-semibold mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                Booking Details
              </Text>

              <View className="flex-row justify-between mb-4">
                <View>
                  <Text className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                    Date & Time
                  </Text>
                  <Text className={`text-sm font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                    {formatDateTime(booking.scheduled_start)}
                  </Text>
                </View>
              </View>

              {booking.location_text ? (
                <View>
                  <Text className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                    Location
                  </Text>
                  <Text className={`text-sm font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                    {booking.location_text}
                  </Text>
                </View>
              ) : null}
            </View>

            {/* Your Earnings Section */}
            <View>
              <Text className={`text-base font-semibold mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                Your Earnings
              </Text>
              <View className="flex-row justify-between">
                <Text className={`text-base ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                  Amount
                </Text>
                <Text className={`text-base font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                  {booking.currency} {talentEarnings.toLocaleString()}
                </Text>
              </View>
            </View>
          </ScrollView>

          {/* Footer */}
          <View className={`flex-row gap-3 px-6 py-5 border-t ${isDark ? 'border-gray-800' : 'border-gray-200'}`}>
            <Pressable
              onPress={onClose}
              className={`flex-1 py-3 rounded-xl items-center justify-center ${isDark ? 'bg-gray-900' : 'bg-gray-100'}`}
            >
              <Text className={`text-sm font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                Close
              </Text>
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
