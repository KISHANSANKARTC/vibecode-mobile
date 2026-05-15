import { View, Text, Modal, Pressable, ActivityIndicator } from 'react-native';
import { AlertCircle, X } from 'lucide-react-native';
import { useTheme } from '@/lib/theme/ThemeContext';
import Animated, { FadeInUp } from 'react-native-reanimated';

interface ConfirmWorkCompletionDialogProps {
  visible: boolean;
  onClose: () => void;
  onConfirm: () => void;
  isLoading: boolean;
  talentName?: string;
  variant?: 'talent-deliver' | 'client-approve';
}

export function ConfirmWorkCompletionDialog({
  visible,
  onClose,
  onConfirm,
  isLoading,
  talentName = 'the talent',
  variant = 'client-approve',
}: ConfirmWorkCompletionDialogProps) {
  const { isDark } = useTheme();

  if (!visible) return null;

  const isTalentDeliver = variant === 'talent-deliver';

  return (
    <Modal transparent animationType="fade" onRequestClose={onClose}>
      <Pressable className="flex-1 bg-black/50 items-center justify-center px-5" onPress={onClose}>
        <Animated.View
          entering={FadeInUp.duration(300)}
          className={`rounded-3xl w-full max-w-sm overflow-hidden ${isDark ? 'bg-[#1A1A1A]' : 'bg-white'}`}>
          {/* Header */}
          <View className={`flex-row items-center gap-3 p-5 border-b ${isDark ? 'border-gray-800' : 'border-gray-100'}`}>
            <AlertCircle size={24} color={isTalentDeliver ? '#D97706' : '#F59E0B'} />
            <Text className={`text-lg font-semibold flex-1 ${isDark ? 'text-white' : 'text-gray-900'}`}>
              {isTalentDeliver ? 'Mark Work as Delivered?' : 'Approve & Release Payment?'}
            </Text>
            <Pressable onPress={onClose} className="p-1">
              <X size={18} color={isDark ? '#9CA3AF' : '#6B7280'} />
            </Pressable>
          </View>

          {/* Content */}
          <View className="p-5">
            <Text className={`text-sm leading-6 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
              {isTalentDeliver
                ? 'Are you sure you want to mark this work as delivered? The client will be notified to review and approve your work.'
                : `Are you sure you want to approve this work? This will release payment to ${talentName}.`}
            </Text>
          </View>

          {/* Buttons */}
          <View className={`flex-row gap-3 p-5 border-t ${isDark ? 'border-gray-800' : 'border-gray-100'}`}>
            <Pressable
              onPress={onClose}
              disabled={isLoading}
              className={`flex-1 py-3 rounded-xl ${isDark ? 'bg-gray-800' : 'bg-gray-100'}`}
              style={{ opacity: isLoading ? 0.5 : 1 }}>
              <Text className={`text-sm font-semibold text-center ${isDark ? 'text-white' : 'text-gray-900'}`}>
                Cancel
              </Text>
            </Pressable>

            <Pressable
              onPress={onConfirm}
              disabled={isLoading}
              className={`flex-1 py-3 rounded-xl ${isTalentDeliver ? 'bg-amber-500' : 'bg-orange-500'}`}
              style={{ opacity: isLoading ? 0.5 : 1 }}>
              {isLoading ? (
                <View className="flex-row items-center justify-center">
                  <ActivityIndicator size="small" color="white" />
                  <Text className="text-white text-sm font-semibold ml-2">
                    {isTalentDeliver ? 'Marking...' : 'Processing...'}
                  </Text>
                </View>
              ) : (
                <Text className="text-white text-sm font-semibold text-center">
                  {isTalentDeliver ? 'Yes, Mark Delivered' : 'Yes, Approve & Pay'}
                </Text>
              )}
            </Pressable>
          </View>
        </Animated.View>
      </Pressable>
    </Modal>
  );
}
