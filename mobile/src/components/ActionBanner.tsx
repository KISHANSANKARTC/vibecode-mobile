import { View, Text, Pressable } from 'react-native';
import { useTheme } from '@/lib/theme/ThemeContext';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { AlertCircle, CheckCircle, Clock, Zap } from 'lucide-react-native';
import { differenceInHours } from 'date-fns';

interface ActionBannerProps {
  bookingStatus: string;
  talentMarkedDeliveredAt: string | null;
  clientMarkedCompletedAt: string | null;
  scheduledEnd?: string | null;
  currency: string;
  totalPrice: number;
  payoutAmount?: number;
  isClient: boolean;
  talentCategory?: string | null;
  talentName?: string;
  payoutStatus?: 'pending' | 'processing' | 'completed' | 'failed' | null;
  hasBankAccount?: boolean;
  onMarkDelivered?: () => void;
  onAddBankDetails?: () => void;
  isMarkingDelivered?: boolean;
}

interface BannerState {
  type: 'primary' | 'warning' | 'success' | 'info' | 'muted';
  title: string;
  description: string;
  buttonLabel?: string;
  onButtonPress?: () => void;
  icon: 'alert' | 'check' | 'clock' | 'zap';
  isLoading?: boolean;
}

export function ActionBanner({
  bookingStatus,
  talentMarkedDeliveredAt,
  clientMarkedCompletedAt,
  scheduledEnd,
  currency,
  totalPrice,
  payoutAmount,
  isClient,
  talentCategory,
  talentName,
  payoutStatus,
  hasBankAccount,
  onMarkDelivered,
  onAddBankDetails,
  isMarkingDelivered,
}: ActionBannerProps) {
  const { isDark } = useTheme();

  // Helper to check if session has passed
  const hasSessionPassed = scheduledEnd
    ? differenceInHours(new Date(), new Date(scheduledEnd)) > 0
    : false;

  const isServiceBased = [
    'makeup_artist',
    'stylist',
    'photographer',
    'videographer',
    'dj',
    'mc_host',
    'musician',
    'dancer',
    'fitness_trainer',
    'chef',
    'tutor',
    'personal_assistant',
  ].includes(talentCategory?.toLowerCase() || '');

  let banner: BannerState | null = null;

  if (!isClient) {
    // Talent side logic
    if (bookingStatus === 'completed') {
      // Payment status banner
      if (!hasBankAccount) {
        banner = {
          type: 'warning',
          title: 'Bank Details Required',
          description: 'Add your bank account to receive payments',
          buttonLabel: 'Add Bank Details',
          onButtonPress: onAddBankDetails,
          icon: 'alert',
        };
      } else if (payoutStatus === 'completed') {
        banner = {
          type: 'success',
          title: 'Payment Transferred!',
          description: `${currency} ${payoutAmount?.toLocaleString() || totalPrice.toLocaleString()} has been transferred to your account`,
          icon: 'check',
        };
      } else if (payoutStatus === 'processing') {
        banner = {
          type: 'info',
          title: 'Payment Processing',
          description: 'Your payment is being processed and will be transferred shortly',
          icon: 'clock',
        };
      } else {
        banner = {
          type: 'info',
          title: 'Payment Pending',
          description: 'Your payment will be processed after client approval',
          icon: 'clock',
        };
      }
    } else if (talentMarkedDeliveredAt && !clientMarkedCompletedAt) {
      // Awaiting client approval
      banner = {
        type: 'info',
        title: 'Awaiting Client Approval',
        description: 'Client is reviewing your work',
        icon: 'clock',
      };
    } else if (
      (bookingStatus === 'confirmed' || bookingStatus === 'in_progress') &&
      !talentMarkedDeliveredAt
    ) {
      // Ready to deliver
      if (hasSessionPassed) {
        banner = {
          type: 'primary',
          title: isServiceBased ? 'Session Complete' : 'Ready to Deliver?',
          description: isServiceBased
            ? 'Mark your session as complete for client review'
            : 'Mark your work as delivered for client review',
          buttonLabel: 'Mark Work Delivered',
          onButtonPress: onMarkDelivered,
          icon: 'zap',
          isLoading: isMarkingDelivered,
        };
      } else {
        banner = {
          type: 'muted',
          title: 'Work in Progress',
          description: 'Submit your work when ready for client review',
          buttonLabel: 'Mark Work Delivered',
          onButtonPress: onMarkDelivered,
          icon: 'clock',
          isLoading: isMarkingDelivered,
        };
      }
    } else if (bookingStatus === 'pending_payment') {
      banner = {
        type: 'info',
        title: 'Accepted - Awaiting Payment',
        description: 'Client payment is being processed',
        icon: 'clock',
      };
    } else if (bookingStatus === 'pending_acceptance') {
      banner = {
        type: 'muted',
        title: 'New Booking Request',
        description: 'Review the details and decide whether to accept',
        icon: 'clock',
      };
    }
  }

  if (!banner) {
    return null;
  }

  const getColors = () => {
    switch (banner.type) {
      case 'primary':
        return {
          bg: isDark ? 'bg-amber-900/30' : 'bg-amber-50',
          border: isDark ? 'border-amber-800' : 'border-amber-200',
          dot: 'bg-amber-500',
          title: isDark ? 'text-amber-100' : 'text-amber-900',
          desc: isDark ? 'text-amber-200/70' : 'text-amber-700/70',
          button: 'bg-amber-500',
        };
      case 'warning':
        return {
          bg: isDark ? 'bg-red-900/30' : 'bg-red-50',
          border: isDark ? 'border-red-800' : 'border-red-200',
          dot: 'bg-red-500',
          title: isDark ? 'text-red-100' : 'text-red-900',
          desc: isDark ? 'text-red-200/70' : 'text-red-700/70',
          button: 'bg-red-500',
        };
      case 'success':
        return {
          bg: isDark ? 'bg-green-900/30' : 'bg-green-50',
          border: isDark ? 'border-green-800' : 'border-green-200',
          dot: 'bg-green-500',
          title: isDark ? 'text-green-100' : 'text-green-900',
          desc: isDark ? 'text-green-200/70' : 'text-green-700/70',
          button: 'bg-green-500',
        };
      case 'info':
        return {
          bg: isDark ? 'bg-blue-900/30' : 'bg-blue-50',
          border: isDark ? 'border-blue-800' : 'border-blue-200',
          dot: 'bg-blue-500',
          title: isDark ? 'text-blue-100' : 'text-blue-900',
          desc: isDark ? 'text-blue-200/70' : 'text-blue-700/70',
          button: 'bg-blue-500',
        };
      case 'muted':
      default:
        return {
          bg: isDark ? 'bg-gray-900/30' : 'bg-gray-50',
          border: isDark ? 'border-gray-800' : 'border-gray-200',
          dot: 'bg-gray-500',
          title: isDark ? 'text-gray-100' : 'text-gray-900',
          desc: isDark ? 'text-gray-200/70' : 'text-gray-700/70',
          button: 'bg-gray-500',
        };
    }
  };

  const colors = getColors();

  const getIcon = () => {
    switch (banner.icon) {
      case 'alert':
        return <AlertCircle size={20} color={colors.dot.split('-')[1]} />;
      case 'check':
        return <CheckCircle size={20} color={colors.dot.split('-')[1]} />;
      case 'zap':
        return <Zap size={20} color={colors.dot.split('-')[1]} />;
      case 'clock':
      default:
        return <Clock size={20} color={colors.dot.split('-')[1]} />;
    }
  };

  return (
    <Animated.View entering={FadeInUp.delay(100).duration(400)} className={`mx-4 mb-4 p-4 rounded-2xl border ${colors.bg} ${colors.border}`}>
      <View className="flex-row items-start gap-3">
        {/* Dot indicator */}
        <View className={`w-2 h-2 rounded-full mt-2 ${colors.dot}`} />

        {/* Content */}
        <View className="flex-1">
          <Text className={`text-sm font-semibold ${colors.title}`}>{banner.title}</Text>
          <Text className={`text-xs mt-1 ${colors.desc}`}>{banner.description}</Text>
        </View>

        {/* Button */}
        {banner.buttonLabel ? (
          <Pressable
            onPress={banner.onButtonPress}
            disabled={banner.isLoading}
            className={`px-4 py-2 rounded-lg items-center justify-center ${colors.button} ${banner.isLoading ? 'opacity-60' : ''}`}>
            <Text className="text-white text-xs font-semibold">{banner.isLoading ? 'Marking...' : banner.buttonLabel}</Text>
          </Pressable>
        ) : null}
      </View>
    </Animated.View>
  );
}
