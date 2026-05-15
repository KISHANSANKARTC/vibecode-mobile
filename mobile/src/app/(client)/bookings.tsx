import { View, Text, ScrollView, Pressable, Image, RefreshControl, ActivityIndicator, Modal, TextInput, Platform, AppState } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MapPin, Calendar, Clock, Search, ChevronDown, Check, CreditCard, X, Star, RefreshCw, Wallet, Apple, Smartphone } from 'lucide-react-native';
import Animated, { FadeInDown, FadeInUp, FadeIn } from 'react-native-reanimated';
import { useState, useCallback, useEffect, useRef } from 'react';
import { router } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { format } from 'date-fns';
import { ListItemSkeleton } from '@/components/SkeletonLoader';
import { extractErrorMessage } from '@/lib/errorUtils';
import { useTheme } from '@/lib/theme/ThemeContext';

// Extended status types matching database schema
type BookingStatus =
  | 'pending'
  | 'pending_acceptance'
  | 'pending_payment'
  | 'confirmed'
  | 'in_progress'
  | 'delivered'
  | 'completed'
  | 'cancelled'
  | 'declined';

type FilterType = 'all' | 'pending' | 'pending_payment' | 'confirmed' | 'in_progress' | 'delivered' | 'completed' | 'cancelled';

interface BookingTalent {
  talentId: string;
  talentProfileId: string;
  talentName: string;
  talentAvatar: string;
  roleCategory: string;
  ratePrice: number;
  status: string;
  userId: string;
}

interface Booking {
  id: string;
  bookingName: string;
  talents: BookingTalent[];
  talentCount: number;
  date: string;
  endDate?: string;
  time: string;
  location: string;
  status: BookingStatus;
  totalPrice: number;
  currency: string;
  hasRefundRequest: boolean;
  hasReview: boolean;
  bookingDate: string;
}

interface AvailabilitySlot {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
}

// Default placeholder avatar
const PLACEHOLDER_AVATAR = 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&h=200&fit=crop';

// Helper to format category string
function formatCategory(category: string | null): string {
  if (!category) return 'Creative';
  return category
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

// Helper to format date range
function formatDateRange(startDate: string | undefined, endDate?: string): string {
  if (!startDate) return 'Date TBD';

  try {
    const dateStr = String(startDate).trim();

    // Check for null strings or empty values
    if (!dateStr || dateStr.toLowerCase() === 'null' || dateStr === '') {
      return 'Date TBD';
    }

    // Create Date object - JavaScript automatically converts UTC to local timezone
    // Do NOT split the string - this loses timezone conversion
    const start = new Date(dateStr);

    // Check if date is valid
    if (isNaN(start.getTime())) {
      console.warn('Invalid start date:', startDate);
      return 'Date TBD';
    }

    // Format using date-fns - automatically uses local timezone
    const startFormatted = format(start, 'MMM d');

    if (!endDate) {
      return startFormatted;
    }

    const endDateStr = String(endDate).trim();

    // Check if end date is empty or null
    if (!endDateStr || endDateStr.toLowerCase() === 'null' || endDateStr === '') {
      return startFormatted;
    }

    const end = new Date(endDateStr);

    // Check if end date is valid
    if (isNaN(end.getTime())) {
      console.warn('Invalid end date:', endDate);
      return startFormatted;
    }

    if (start.toDateString() === end.toDateString()) {
      return startFormatted;
    }

    // Same month and year - return "MMM d - d"
    if (start.getMonth() === end.getMonth() && start.getFullYear() === end.getFullYear()) {
      return `${format(start, 'MMM d')} - ${format(end, 'd')}`;
    }

    // Different month or year - return "MMM d - MMM d"
    return `${format(start, 'MMM d')} - ${format(end, 'MMM d')}`;
  } catch (error) {
    console.error('Error formatting date range:', startDate, endDate, error);
    return 'Date TBD';
  }
}

// Helper to format time - uses local timezone automatically
function formatTime(time: string | null | undefined): string {
  if (!time) return 'TBD';

  try {
    const timeStr = String(time).trim();

    if (!timeStr || timeStr.toLowerCase() === 'null' || timeStr === '') {
      return 'TBD';
    }

    // Create Date object - JavaScript automatically converts UTC to local timezone
    // Do NOT parse manually - just pass the full timestamp to new Date()
    const dateObj = new Date(timeStr);

    // Check if date is valid
    if (isNaN(dateObj.getTime())) {
      console.warn('Invalid time:', timeStr);
      return 'TBD';
    }

    // Format using date-fns - automatically uses local timezone
    // Format as "h:mm a" (e.g., "2:30 PM" or "12:00 AM")
    return format(dateObj, 'h:mm a');
  } catch (error) {
    console.error('Error formatting time:', time, error);
    return 'TBD';
  }
}

// Status badge styles
const STATUS_STYLES: Record<string, { bg: string; text: string; border: string; filled: boolean }> = {
  pending: { bg: 'transparent', text: '#F97316', border: '#F97316', filled: false },
  pending_acceptance: { bg: 'transparent', text: '#F97316', border: '#F97316', filled: false },
  pending_payment: { bg: 'transparent', text: '#F97316', border: '#F97316', filled: false },
  confirmed: { bg: '#22C55E', text: '#FFFFFF', border: '#22C55E', filled: true },
  in_progress: { bg: '#3B82F6', text: '#FFFFFF', border: '#3B82F6', filled: true },
  delivered: { bg: '#8B5CF6', text: '#FFFFFF', border: '#8B5CF6', filled: true },
  completed: { bg: '#9CA3AF', text: '#FFFFFF', border: '#9CA3AF', filled: true },
  cancelled: { bg: '#EF4444', text: '#FFFFFF', border: '#EF4444', filled: true },
  declined: { bg: '#EF4444', text: '#FFFFFF', border: '#EF4444', filled: true },
  refund_requested: { bg: '#EF4444', text: '#FFFFFF', border: '#EF4444', filled: true },
};

const STATUS_LABELS: Record<string, string> = {
  pending: 'Awaiting Payment',
  pending_acceptance: 'Pending Response',
  pending_payment: 'Awaiting Payment',
  confirmed: 'Confirmed',
  in_progress: 'In Progress',
  delivered: 'Delivered',
  completed: 'Completed',
  cancelled: 'Cancelled',
  declined: 'Declined',
  refund_requested: 'Refund Requested',
};

// Filter options for bottom sheet
const FILTER_OPTIONS: { key: FilterType; label: string; statuses: string[] }[] = [
  { key: 'all', label: 'All Bookings', statuses: [] },
  { key: 'pending', label: 'Pending Response', statuses: ['pending', 'pending_acceptance'] },
  { key: 'pending_payment', label: 'Payment Required', statuses: ['pending_payment'] },
  { key: 'confirmed', label: 'Confirmed', statuses: ['confirmed'] },
  { key: 'in_progress', label: 'In Progress', statuses: ['in_progress'] },
  { key: 'delivered', label: 'Delivered', statuses: ['delivered'] },
  { key: 'completed', label: 'Completed', statuses: ['completed'] },
  { key: 'cancelled', label: 'Cancelled / Declined', statuses: ['cancelled', 'declined'] },
];

// Status categories for section grouping
const UPCOMING_STATUSES = ['confirmed', 'pending', 'pending_acceptance', 'pending_payment', 'in_progress', 'delivered'];
const PAST_STATUSES = ['completed', 'cancelled', 'declined'];

// Review tags
const REVIEW_TAGS = [
  'Professional',
  'On Time',
  'Great Communication',
  'Creative',
  'High Quality',
  'Fast Delivery',
  'Would Book Again',
];

// Fallback data
const FALLBACK_BOOKINGS: Booking[] = [];

// Status Badge Component
function StatusBadge({ status }: { status: string }) {
  const style = STATUS_STYLES[status] || STATUS_STYLES.pending;
  const label = STATUS_LABELS[status] || status;

  return (
    <View
      className="px-3 py-1 rounded-full"
      style={{
        backgroundColor: style.filled ? style.bg : 'transparent',
        borderWidth: style.filled ? 0 : 1.5,
        borderColor: style.border,
      }}
    >
      <Text className="text-xs font-medium" style={{ color: style.text }}>
        {label}
      </Text>
    </View>
  );
}

// Filter Bottom Sheet Component
function FilterBottomSheet({
  visible,
  currentFilter,
  onSelect,
  onClose,
}: {
  visible: boolean;
  currentFilter: FilterType;
  onSelect: (filter: FilterType) => void;
  onClose: () => void;
}) {
  const insets = useSafeAreaInsets();

  if (!visible) return null;

  return (
    <Modal transparent visible={visible} animationType="slide" onRequestClose={onClose}>
      <Pressable className="flex-1 bg-black/50" onPress={onClose}>
        <Pressable
          className="absolute bottom-0 left-0 right-0 bg-white rounded-t-3xl"
          style={{ paddingBottom: insets.bottom + 16 }}
          onPress={() => {}}
        >
          {/* Handle */}
          <View className="items-center py-3">
            <View className="w-10 h-1 rounded-full bg-gray-300" />
          </View>

          {/* Title */}
          <Text className="text-gray-900 text-lg font-semibold px-5 mb-2">Filter Bookings</Text>

          {/* Options */}
          <View className="px-3">
            {FILTER_OPTIONS.map((option) => (
              <Pressable
                key={option.key}
                onPress={() => {
                  onSelect(option.key);
                  onClose();
                }}
                className="flex-row items-center px-4 py-3.5 rounded-xl mb-1"
                style={{
                  backgroundColor: currentFilter === option.key ? '#FFF7ED' : 'transparent',
                }}
              >
                <Text
                  className="flex-1 text-base"
                  style={{
                    color: currentFilter === option.key ? '#F97316' : '#374151',
                    fontWeight: currentFilter === option.key ? '600' : '400',
                  }}
                >
                  {option.label}
                </Text>
                {currentFilter === option.key ? (
                  <Check size={20} color="#F97316" />
                ) : null}
              </Pressable>
            ))}
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

// Payment Method Dialog Component
function PaymentMethodDialog({
  visible,
  booking,
  walletBalance,
  onClose,
  onPaymentSuccess,
}: {
  visible: boolean;
  booking: Booking | null;
  walletBalance: number;
  onClose: () => void;
  onPaymentSuccess: () => void;
}) {
  const insets = useSafeAreaInsets();
  const [isProcessing, setIsProcessing] = useState(false);

  if (!visible || !booking) return null;

  const amountInFils = booking.totalPrice * 100;
  const canPayWithWallet = walletBalance >= booking.totalPrice;
  const shortfall = booking.totalPrice - walletBalance;
  const isIOS = Platform.OS === 'ios';
  const isAndroid = Platform.OS === 'android';

  const handleWalletPayment = async () => {
    if (!canPayWithWallet) return;
    setIsProcessing(true);
    try {
      // Deduct from wallet and update booking status
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Update wallet balance
      await supabase
        .from('client_wallets')
        .update({ balance: walletBalance - booking.totalPrice })
        .eq('user_id', user.id);

      // Update booking status
      await supabase
        .from('bookings')
        .update({ status: 'confirmed' })
        .eq('id', booking.id);

      onPaymentSuccess();
      onClose();
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : typeof error === 'string' ? error : 'Wallet payment error';
      console.error('Wallet payment error:', errorMsg);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCardPayment = async () => {
    setIsProcessing(true);
    try {
      // TODO: Redirect to Stripe Checkout
      console.log('Card payment initiated for booking:', booking.id, 'amount:', amountInFils);
      // After Stripe checkout completes, the webhook will update the booking status
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : typeof error === 'string' ? error : 'Card payment error';
      console.error('Card payment error:', errorMsg);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleApplePay = async () => {
    setIsProcessing(true);
    try {
      // TODO: Call create-apple-pay-checkout edge function
      console.log('Apple Pay initiated for booking:', booking.id);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : typeof error === 'string' ? error : 'Apple Pay error';
      console.error('Apple Pay error:', errorMsg);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleGooglePay = async () => {
    setIsProcessing(true);
    try {
      // TODO: Stripe Google Pay flow
      console.log('Google Pay initiated for booking:', booking.id);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : typeof error === 'string' ? error : 'Google Pay error';
      console.error('Google Pay error:', errorMsg);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Modal transparent visible={visible} animationType="fade" onRequestClose={onClose}>
      <Pressable className="flex-1 bg-black/50 items-center justify-center px-5" onPress={onClose}>
        <Pressable
          className="bg-white rounded-2xl w-full max-w-sm overflow-hidden"
          onPress={() => {}}
        >
          {/* Header */}
          <View className="flex-row items-center justify-between p-4 border-b border-gray-100">
            <Text className="text-gray-900 text-lg font-semibold">Payment Method</Text>
            <Pressable onPress={onClose} className="p-1">
              <X size={20} color="#6B7280" />
            </Pressable>
          </View>

          {/* Amount */}
          <View className="p-4 bg-gray-50">
            <Text className="text-gray-500 text-sm">Total Amount</Text>
            <Text className="text-gray-900 text-2xl font-bold">
              {booking.currency} {booking.totalPrice.toLocaleString()}
            </Text>
          </View>

          {/* Payment Options */}
          <View className="p-4">
            {/* Apple Pay - iOS only */}
            {isIOS ? (
              <Pressable
                onPress={handleApplePay}
                disabled={isProcessing}
                className="flex-row items-center p-4 rounded-xl mb-3"
                style={{ backgroundColor: '#000000' }}
              >
                <Apple size={24} color="#FFFFFF" />
                <Text className="text-white font-semibold text-base ml-3">Pay with Apple Pay</Text>
              </Pressable>
            ) : null}

            {/* Google Pay - Android only */}
            {isAndroid ? (
              <Pressable
                onPress={handleGooglePay}
                disabled={isProcessing}
                className="flex-row items-center p-4 rounded-xl mb-3 border border-gray-200"
              >
                <Smartphone size={24} color="#4285F4" />
                <Text className="text-gray-900 font-semibold text-base ml-3">Pay with Google Pay</Text>
              </Pressable>
            ) : null}

            {/* Wallet */}
            <Pressable
              onPress={handleWalletPayment}
              disabled={!canPayWithWallet || isProcessing}
              className="flex-row items-center p-4 rounded-xl mb-3"
              style={{
                backgroundColor: canPayWithWallet ? '#F0FDF4' : '#F9FAFB',
                borderWidth: 1,
                borderColor: canPayWithWallet ? '#22C55E' : '#E5E7EB',
                opacity: canPayWithWallet ? 1 : 0.6,
              }}
            >
              <Wallet size={24} color={canPayWithWallet ? '#22C55E' : '#9CA3AF'} />
              <View className="flex-1 ml-3">
                <Text
                  className="font-semibold text-base"
                  style={{ color: canPayWithWallet ? '#166534' : '#6B7280' }}
                >
                  Pay with Wallet
                </Text>
                <Text className="text-sm" style={{ color: canPayWithWallet ? '#22C55E' : '#9CA3AF' }}>
                  Balance: {booking.currency} {walletBalance.toLocaleString()}
                </Text>
              </View>
              {!canPayWithWallet ? (
                <Text className="text-red-500 text-xs">
                  Need {booking.currency} {shortfall.toLocaleString()} more
                </Text>
              ) : null}
            </Pressable>

            {/* Card */}
            <Pressable
              onPress={handleCardPayment}
              disabled={isProcessing}
              className="flex-row items-center p-4 rounded-xl"
              style={{
                backgroundColor: '#FFF7ED',
                borderWidth: 1,
                borderColor: '#F97316',
              }}
            >
              <CreditCard size={24} color="#F97316" />
              <Text className="text-orange-600 font-semibold text-base ml-3">Pay with Card</Text>
            </Pressable>
          </View>

          {isProcessing ? (
            <View className="absolute inset-0 bg-white/80 items-center justify-center">
              <ActivityIndicator size="large" color="#F97316" />
            </View>
          ) : null}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

// Review Dialog Component
function ReviewDialog({
  visible,
  booking,
  onClose,
  onSubmitSuccess,
}: {
  visible: boolean;
  booking: Booking | null;
  onClose: () => void;
  onSubmitSuccess: () => void;
}) {
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!visible || !booking) return null;

  const primaryTalent = booking.talents[0];

  const toggleTag = (tag: string) => {
    setSelectedTags(prev =>
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    );
  };

  const handleSubmit = async () => {
    if (rating === 0) return;
    setIsSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Insert review
      await supabase.from('reviews').insert({
        booking_id: booking.id,
        reviewer_id: user.id,
        reviewee_user_id: primaryTalent?.userId,
        rating,
        comment: comment.trim() || null,
        tags: selectedTags.length > 0 ? selectedTags : null,
      });

      onSubmitSuccess();
      onClose();
      // Reset state
      setRating(0);
      setComment('');
      setSelectedTags([]);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : typeof error === 'string' ? error : 'Review submission error';
      console.error('Review submission error:', errorMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal transparent visible={visible} animationType="fade" onRequestClose={onClose}>
      <Pressable className="flex-1 bg-black/50 items-center justify-center px-5" onPress={onClose}>
        <Pressable
          className="bg-white rounded-2xl w-full max-w-sm overflow-hidden"
          onPress={() => {}}
        >
          {/* Header */}
          <View className="flex-row items-center justify-between p-4 border-b border-gray-100">
            <Text className="text-gray-900 text-lg font-semibold">Leave a Review</Text>
            <Pressable onPress={onClose} className="p-1">
              <X size={20} color="#6B7280" />
            </Pressable>
          </View>

          {/* Talent Info */}
          <View className="items-center p-4 bg-gray-50">
            <Image
              source={{ uri: primaryTalent?.talentAvatar || PLACEHOLDER_AVATAR }}
              style={{ width: 64, height: 64, borderRadius: 32 }}
            />
            <Text className="text-gray-900 font-semibold text-base mt-2">
              {primaryTalent?.talentName || 'Unknown'}
            </Text>
            <Text className="text-gray-500 text-sm">
              {formatCategory(primaryTalent?.roleCategory || null)}
            </Text>
          </View>

          {/* Rating */}
          <View className="p-4">
            <Text className="text-gray-700 font-medium mb-2">Rating *</Text>
            <View className="flex-row justify-center gap-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <Pressable key={star} onPress={() => setRating(star)}>
                  <Star
                    size={36}
                    color={star <= rating ? '#F97316' : '#E5E7EB'}
                    fill={star <= rating ? '#F97316' : 'transparent'}
                  />
                </Pressable>
              ))}
            </View>
          </View>

          {/* Comment */}
          <View className="px-4 pb-4">
            <Text className="text-gray-700 font-medium mb-2">Comment (optional)</Text>
            <TextInput
              value={comment}
              onChangeText={setComment}
              placeholder="Share your experience..."
              placeholderTextColor="#9CA3AF"
              multiline
              numberOfLines={3}
              className="bg-gray-50 rounded-xl p-3 text-gray-900"
              style={{ minHeight: 80, textAlignVertical: 'top' }}
            />
          </View>

          {/* Tags */}
          <View className="px-4 pb-4">
            <Text className="text-gray-700 font-medium mb-2">Tags (optional)</Text>
            <View className="flex-row flex-wrap gap-2">
              {REVIEW_TAGS.map((tag) => (
                <Pressable
                  key={tag}
                  onPress={() => toggleTag(tag)}
                  className="px-3 py-1.5 rounded-full"
                  style={{
                    backgroundColor: selectedTags.includes(tag) ? '#FFF7ED' : '#F3F4F6',
                    borderWidth: 1,
                    borderColor: selectedTags.includes(tag) ? '#F97316' : '#E5E7EB',
                  }}
                >
                  <Text
                    className="text-sm"
                    style={{ color: selectedTags.includes(tag) ? '#F97316' : '#6B7280' }}
                  >
                    {tag}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>

          {/* Submit Button */}
          <View className="p-4 border-t border-gray-100">
            <Pressable
              onPress={handleSubmit}
              disabled={rating === 0 || isSubmitting}
              className="py-3.5 rounded-xl items-center"
              style={{
                backgroundColor: rating === 0 ? '#E5E7EB' : '#F97316',
              }}
            >
              {isSubmitting ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text
                  className="font-semibold text-base"
                  style={{ color: rating === 0 ? '#9CA3AF' : '#FFFFFF' }}
                >
                  Submit Review
                </Text>
              )}
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

// Rebook Drawer Component
function RebookDrawer({
  visible,
  booking,
  onClose,
  onRebookSuccess,
}: {
  visible: boolean;
  booking: Booking | null;
  onClose: () => void;
  onRebookSuccess: (newBookingId: string) => void;
}) {
  const insets = useSafeAreaInsets();
  const [availableSlots, setAvailableSlots] = useState<AvailabilitySlot[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<AvailabilitySlot | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isRebooking, setIsRebooking] = useState(false);

  const primaryTalent = booking?.talents[0];

  useEffect(() => {
    if (visible && primaryTalent?.talentProfileId) {
      fetchAvailableSlots();
    }
  }, [visible, primaryTalent?.talentProfileId]);

  const fetchAvailableSlots = async () => {
    if (!primaryTalent?.talentProfileId) return;
    setIsLoading(true);
    try {
      const today = new Date();
      const twoWeeksLater = new Date();
      twoWeeksLater.setDate(today.getDate() + 14);

      const { data, error } = await supabase
        .from('availability_slots')
        .select('id, date, start_time, end_time')
        .eq('talent_profile_id', primaryTalent.talentProfileId)
        .eq('status', 'available')
        .gte('date', today.toISOString().split('T')[0])
        .lte('date', twoWeeksLater.toISOString().split('T')[0])
        .order('date', { ascending: true })
        .order('start_time', { ascending: true });

      if (!error && data) {
        setAvailableSlots(data.map(slot => ({
          id: slot.id,
          date: slot.date,
          startTime: slot.start_time,
          endTime: slot.end_time,
        })));
      }
    } catch (err) {
      const errorMsg = extractErrorMessage(err);
      console.error('Error fetching slots:', errorMsg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfirmRebook = async () => {
    if (!selectedSlot || !booking || !primaryTalent) return;
    setIsRebooking(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Create new booking
      const { data: newBooking, error: bookingError } = await supabase
        .from('bookings')
        .insert({
          client_id: user.id,
          status: 'confirmed',
          booking_date: selectedSlot.date,
          start_time: selectedSlot.startTime,
          end_time: selectedSlot.endTime,
          location: booking.location,
          total_price: booking.totalPrice,
          currency: booking.currency,
          rebooked_from_id: booking.id,
        })
        .select('id')
        .single();

      if (bookingError || !newBooking) throw bookingError;

      // Create booking_talents entry
      await supabase.from('booking_talents').insert({
        booking_id: newBooking.id,
        talent_id: primaryTalent.talentProfileId,
        role_category: primaryTalent.roleCategory,
        rate_price: primaryTalent.ratePrice,
        status: 'accepted',
      });

      // Update availability slot
      await supabase
        .from('availability_slots')
        .update({ status: 'booked' })
        .eq('id', selectedSlot.id);

      // Create chat thread
      await supabase.from('chat_threads').insert({
        booking_id: newBooking.id,
        participant_1: user.id,
        participant_2: primaryTalent.userId,
      });

      onRebookSuccess(newBooking.id);
      onClose();
    } catch (err) {
      const errorMsg = extractErrorMessage(err);
      console.error('Rebook error:', errorMsg);
    } finally {
      setIsRebooking(false);
    }
  };

  if (!visible || !booking) return null;

  return (
    <Modal transparent visible={visible} animationType="slide" onRequestClose={onClose}>
      <Pressable className="flex-1 bg-black/50" onPress={onClose}>
        <Pressable
          className="absolute bottom-0 left-0 right-0 bg-white rounded-t-3xl"
          style={{ paddingBottom: insets.bottom + 16, maxHeight: '80%' }}
          onPress={() => {}}
        >
          {/* Handle */}
          <View className="items-center py-3">
            <View className="w-10 h-1 rounded-full bg-gray-300" />
          </View>

          {/* Header */}
          <View className="flex-row items-center justify-between px-5 pb-4 border-b border-gray-100">
            <Text className="text-gray-900 text-lg font-semibold">Rebook Talent</Text>
            <Pressable onPress={onClose} className="p-1">
              <X size={20} color="#6B7280" />
            </Pressable>
          </View>

          {/* Talent Info */}
          <View className="flex-row items-center px-5 py-4 bg-gray-50">
            <Image
              source={{ uri: primaryTalent?.talentAvatar || PLACEHOLDER_AVATAR }}
              style={{ width: 48, height: 48, borderRadius: 24 }}
            />
            <View className="ml-3">
              <Text className="text-gray-900 font-semibold">{primaryTalent?.talentName}</Text>
              <Text className="text-gray-500 text-sm">Previous: {booking.date}</Text>
            </View>
          </View>

          {/* Available Slots */}
          <View className="px-5 py-4">
            <Text className="text-gray-700 font-medium mb-3">Available Time Slots</Text>
            {isLoading ? (
              <ActivityIndicator size="small" color="#F97316" />
            ) : availableSlots.length === 0 ? (
              <Text className="text-gray-500 text-center py-4">No available slots in the next 14 days</Text>
            ) : (
              <ScrollView style={{ maxHeight: 200 }} showsVerticalScrollIndicator={false}>
                {availableSlots.map((slot) => (
                  <Pressable
                    key={slot.id}
                    onPress={() => setSelectedSlot(slot)}
                    className="flex-row items-center p-3 rounded-xl mb-2"
                    style={{
                      backgroundColor: selectedSlot?.id === slot.id ? '#FFF7ED' : '#F9FAFB',
                      borderWidth: 1,
                      borderColor: selectedSlot?.id === slot.id ? '#F97316' : '#E5E7EB',
                    }}
                  >
                    <Calendar size={18} color={selectedSlot?.id === slot.id ? '#F97316' : '#6B7280'} />
                    <Text
                      className="flex-1 ml-2"
                      style={{ color: selectedSlot?.id === slot.id ? '#F97316' : '#374151' }}
                    >
                      {new Date(slot.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                    </Text>
                    <Clock size={18} color={selectedSlot?.id === slot.id ? '#F97316' : '#6B7280'} />
                    <Text
                      className="ml-2"
                      style={{ color: selectedSlot?.id === slot.id ? '#F97316' : '#374151' }}
                    >
                      {formatTime(slot.startTime)} - {formatTime(slot.endTime)}
                    </Text>
                  </Pressable>
                ))}
              </ScrollView>
            )}
          </View>

          {/* Selected Slot Confirmation */}
          {selectedSlot ? (
            <View className="mx-5 p-4 rounded-xl bg-green-50 border border-green-200 mb-4">
              <Text className="text-green-800 font-medium">Selected:</Text>
              <Text className="text-green-700">
                {new Date(selectedSlot.date).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })} at {formatTime(selectedSlot.startTime)}
              </Text>
            </View>
          ) : null}

          {/* Confirm Button */}
          <View className="px-5">
            <Pressable
              onPress={handleConfirmRebook}
              disabled={!selectedSlot || isRebooking}
              className="py-3.5 rounded-xl items-center"
              style={{
                backgroundColor: !selectedSlot ? '#E5E7EB' : '#F97316',
              }}
            >
              {isRebooking ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text
                  className="font-semibold text-base"
                  style={{ color: !selectedSlot ? '#9CA3AF' : '#FFFFFF' }}
                >
                  Confirm Rebook
                </Text>
              )}
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

// Booking Card Component
function BookingCard({
  booking,
  index,
  isLast,
  walletBalance,
  onPayNow,
  onRefreshStatus,
  onRebook,
  onReview,
  isDark,
}: {
  booking: Booking;
  index: number;
  isLast: boolean;
  walletBalance: number;
  onPayNow: (booking: Booking) => void;
  onRefreshStatus: (bookingId: string) => void;
  onRebook: (booking: Booking) => void;
  onReview: (booking: Booking) => void;
  isDark: boolean;
}) {
  const displayStatus = booking.hasRefundRequest ? 'refund_requested' : booking.status;
  const primaryTalent = booking.talents[0];
  const showPayNow = booking.status === 'pending_payment' || booking.status === 'pending';
  const showRebookReview = booking.status === 'completed';

  const handlePress = () => {
    router.push(`/(client)/bookings/${booking.id}` as never);
  };

  return (
    <Animated.View
      entering={FadeInUp.delay(index * 80).duration(400)}
      className="flex-row"
    >
      {/* Timeline indicator */}
      <View className="w-6 items-center">
        <View
          className="w-2 h-2 rounded-full mt-6"
          style={{ backgroundColor: isDark ? 'rgba(255,255,255,0.2)' : '#E5E7EB' }}
        />
        {!isLast ? (
          <View className="w-0.5 flex-1" style={{ backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : '#E5E7EB' }} />
        ) : null}
      </View>

      {/* Card */}
      <Pressable
        onPress={handlePress}
        className="flex-1 mb-4 mr-4"
        style={{
          backgroundColor: isDark ? '#1A1A1A' : '#FFFFFF',
          borderRadius: 16,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: isDark ? 0.3 : 0.05,
          shadowRadius: 8,
          elevation: 2,
        }}
      >
        <View className="p-4">
          {/* Header: Booking Name + Status */}
          <View className="flex-row items-start justify-between mb-1">
            <Text
              className="font-semibold text-base flex-1 mr-2"
              style={{ color: isDark ? '#FFFFFF' : '#111827' }}
            >
              {booking.bookingName || primaryTalent?.talentName || 'Booking'}
            </Text>
            <StatusBadge status={displayStatus} />
          </View>

          {/* Location */}
          <View className="flex-row items-center mb-4">
            <MapPin size={14} color={isDark ? '#6B7280' : '#9CA3AF'} />
            <Text
              className="text-sm ml-1"
              style={{ color: isDark ? '#9CA3AF' : '#9CA3AF' }}
            >
              {booking.location || 'Location TBD'}
            </Text>
          </View>

          {/* Talent Info */}
          <View className="flex-row items-center mb-4">
            <Image
              source={{ uri: primaryTalent?.talentAvatar || PLACEHOLDER_AVATAR }}
              style={{ width: 44, height: 44, borderRadius: 22 }}
            />
            <View className="ml-3">
              <Text
                className="font-medium text-sm"
                style={{ color: isDark ? '#FFFFFF' : '#111827' }}
              >
                {primaryTalent?.talentName || 'Unknown'}
              </Text>
              <Text
                className="text-xs"
                style={{ color: isDark ? '#9CA3AF' : '#9CA3AF' }}
              >
                {formatCategory(primaryTalent?.roleCategory || null)}
              </Text>
            </View>
          </View>

          {/* Date, Time, Price Row */}
          <View className="flex-row items-center justify-between mb-4">
            <View className="flex-row items-center">
              <Calendar size={14} color={isDark ? '#6B7280' : '#9CA3AF'} />
              <Text
                className="text-sm ml-1.5"
                style={{ color: isDark ? '#D1D5DB' : '#4B5563' }}
              >
                {booking.date}
              </Text>
            </View>
            <View className="flex-row items-center">
              <Clock size={14} color={isDark ? '#6B7280' : '#9CA3AF'} />
              <Text
                className="text-sm ml-1.5"
                style={{ color: isDark ? '#D1D5DB' : '#4B5563' }}
              >
                {booking.time}
              </Text>
            </View>
            <Text
              className="font-semibold text-sm"
              style={{ color: isDark ? '#FFFFFF' : '#111827' }}
            >
              {booking.currency} {booking.totalPrice.toLocaleString()}
            </Text>
          </View>

          {/* Action Buttons - Payment Required */}
          {showPayNow ? (
            <View className="flex-row justify-end gap-3">
              <Pressable
                onPress={() => onRefreshStatus(booking.id)}
                className="w-10 h-10 rounded-full items-center justify-center"
                style={{ borderWidth: 1.5, borderColor: isDark ? 'rgba(255,255,255,0.2)' : '#E5E7EB' }}
              >
                <Check size={18} color={isDark ? '#9CA3AF' : '#9CA3AF'} />
              </Pressable>
              <Pressable
                onPress={() => onPayNow(booking)}
                className="flex-row items-center px-5 py-2.5 rounded-full"
                style={{ backgroundColor: '#F97316' }}
              >
                <CreditCard size={16} color="#FFFFFF" />
                <Text className="text-white font-semibold text-sm ml-2">Pay Now</Text>
              </Pressable>
            </View>
          ) : null}

          {/* Action Buttons - Completed */}
          {showRebookReview ? (
            <View className="flex-row justify-end gap-3">
              <Pressable
                onPress={() => onRebook(booking)}
                className="flex-row items-center px-4 py-2.5 rounded-full"
                style={{ borderWidth: 1.5, borderColor: isDark ? 'rgba(255,255,255,0.2)' : '#E5E7EB' }}
              >
                <RefreshCw size={16} color={isDark ? '#9CA3AF' : '#6B7280'} />
                <Text
                  className="font-medium text-sm ml-1.5"
                  style={{ color: isDark ? '#D1D5DB' : '#4B5563' }}
                >
                  Rebook
                </Text>
              </Pressable>
              {!booking.hasReview ? (
                <Pressable
                  onPress={() => onReview(booking)}
                  className="flex-row items-center px-4 py-2.5 rounded-full"
                  style={{ backgroundColor: '#F97316' }}
                >
                  <Star size={16} color="#FFFFFF" />
                  <Text className="text-white font-semibold text-sm ml-1.5">Review</Text>
                </Pressable>
              ) : null}
            </View>
          ) : null}
        </View>
      </Pressable>
    </Animated.View>
  );
}

// Empty State Component
function EmptyState({ isDark }: { isDark: boolean }) {
  return (
    <View className="flex-1 items-center justify-center px-8 py-16">
      <View
        className="w-20 h-20 rounded-full items-center justify-center mb-6"
        style={{ backgroundColor: 'rgba(249, 115, 22, 0.1)' }}
      >
        <Calendar size={36} color="#F97316" />
      </View>
      <Text
        className="text-xl font-semibold mb-2"
        style={{ color: isDark ? '#FFFFFF' : '#111827' }}
      >
        No bookings yet
      </Text>
      <Text
        className="text-center mb-6"
        style={{ color: isDark ? '#9CA3AF' : '#6B7280' }}
      >
        Start exploring talent and book your first project
      </Text>
      <Pressable
        onPress={() => router.push('/(client)/search' as never)}
        className="flex-row items-center px-6 py-3 rounded-full"
        style={{ backgroundColor: '#F97316' }}
      >
        <Search size={18} color="#FFFFFF" />
        <Text className="text-white font-semibold ml-2">Find Talent</Text>
      </Pressable>
    </View>
  );
}

export default function BookingsScreen() {
  const insets = useSafeAreaInsets();
  const { isDark } = useTheme();
  const [filter, setFilter] = useState<FilterType>('all');
  const [showFilterSheet, setShowFilterSheet] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [allBookings, setAllBookings] = useState<Booking[]>(FALLBACK_BOOKINGS);
  const [walletBalance, setWalletBalance] = useState(0);

  // Modal states
  const [paymentBooking, setPaymentBooking] = useState<Booking | null>(null);
  const [reviewBooking, setReviewBooking] = useState<Booking | null>(null);
  const [rebookBooking, setRebookBooking] = useState<Booking | null>(null);

  // Fetch bookings from Supabase
  const fetchBookings = useCallback(async () => {
    try {
      setLoading(true);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setAllBookings(FALLBACK_BOOKINGS);
        setLoading(false);
        return;
      }

      // Fetch wallet balance
      const { data: walletData } = await supabase
        .from('client_wallets')
        .select('balance')
        .eq('user_id', user.id)
        .single();

      if (walletData) {
        setWalletBalance(walletData.balance || 0);
      }

      // STEP 1: Fetch bookings for this client
      const { data: bookingsData, error: bookingsError } = await supabase
        .from('bookings')
        .select('*')
        .eq('client_id', user.id)
        .order('created_at', { ascending: false });

      if (bookingsError) {
        console.log('Bookings table not available:', bookingsError.message);
        setAllBookings(FALLBACK_BOOKINGS);
        setLoading(false);
        return;
      }

      if (!bookingsData || bookingsData.length === 0) {
        setAllBookings(FALLBACK_BOOKINGS);
        setLoading(false);
        return;
      }

      const bookingIds = bookingsData.map(b => b.id);

      // STEP 2: Fetch booking_talents
      const { data: talentsData } = await supabase
        .from('booking_talents')
        .select('*')
        .in('booking_id', bookingIds);

      // STEP 3: Get talent_profiles
      const talentIds = [...new Set((talentsData || []).map(t => t.talent_id))];
      const { data: talentProfiles } = await supabase
        .from('talent_profiles')
        .select('id, category, user_id')
        .in('id', talentIds);

      // STEP 4: Get profiles for talent names and avatars
      const talentUserIds = (talentProfiles || []).map(t => t.user_id);
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url')
        .in('id', talentUserIds);

      // Create maps for quick lookup
      const talentProfileMap = Object.fromEntries((talentProfiles || []).map(t => [t.id, t]));
      const profileMap = Object.fromEntries((profiles || []).map(p => [p.id, p]));

      // Group talents by booking
      const talentsByBooking: Record<string, any[]> = {};
      (talentsData || []).forEach(t => {
        if (!talentsByBooking[t.booking_id]) {
          talentsByBooking[t.booking_id] = [];
        }
        const tp = talentProfileMap[t.talent_id];
        const userProfile = tp?.user_id ? profileMap[tp.user_id] : null;

        talentsByBooking[t.booking_id].push({
          ...t,
          talentProfileId: t.talent_id,
          talentName: userProfile?.full_name || 'Unknown',
          talentAvatar: userProfile?.avatar_url || PLACEHOLDER_AVATAR,
          roleCategory: t.role_category || tp?.category || '',
          userId: tp?.user_id || '',
        });
      });

      // Check disputes
      const { data: disputes } = await supabase
        .from('disputes')
        .select('booking_id')
        .in('booking_id', bookingIds)
        .eq('status', 'open')
        .like('reason', 'refund_request:%');

      // Check reviews
      const { data: reviews } = await supabase
        .from('reviews')
        .select('booking_id')
        .in('booking_id', bookingIds)
        .eq('reviewer_id', user.id);

      const disputeBookingIds = new Set((disputes || []).map(d => d.booking_id));
      const reviewedBookingIds = new Set((reviews || []).map(r => r.booking_id));

      // Format bookings
      const formattedBookings: Booking[] = bookingsData.map(booking => {
        const talents = talentsByBooking[booking.id] || [];
        const primaryTalent = talents[0];

        return {
          id: booking.id,
          bookingName: booking.title || booking.name || (talents.length > 1 ? `Team Booking (${talents.length})` : primaryTalent?.talentName) || 'Booking',
          talents,
          talentCount: talents.length || 1,
          date: formatDateRange(booking.scheduled_start, booking.scheduled_end),
          endDate: booking.scheduled_end,
          time: formatTime(booking.scheduled_start),
          location: booking.location_text || 'TBD',
          status: booking.status as BookingStatus,
          totalPrice: booking.total_price || 0,
          currency: booking.currency || 'AED',
          hasRefundRequest: disputeBookingIds.has(booking.id),
          hasReview: reviewedBookingIds.has(booking.id),
          bookingDate: booking.scheduled_start,
        };
      });

      setAllBookings(formattedBookings);
    } catch (err) {
      const errorMsg = extractErrorMessage(err);
      console.error('Error fetching bookings:', errorMsg);
      setAllBookings(FALLBACK_BOOKINGS);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBookings();
  }, [fetchBookings]);

  // Refetch bookings when app comes to foreground (after payment flow or navigation)
  useEffect(() => {
    const appStateSubscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        fetchBookings();
      }
    });

    return () => {
      appStateSubscription?.remove?.();
    };
  }, [fetchBookings]);

  // Subscribe to realtime updates on bookings status changes
  useEffect(() => {
    let channel: any;

    const setupRealtimeSubscription = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      channel = supabase
        .channel('client-bookings-updates')
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'bookings',
            filter: `client_id=eq.${user.id}`,
          },
          (payload) => {
            // Refetch bookings when any booking for this client is updated
            fetchBookings();
          }
        )
        .subscribe();
    };

    setupRealtimeSubscription();

    return () => {
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, [fetchBookings]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchBookings().finally(() => setRefreshing(false));
  }, [fetchBookings]);

  // Handle refresh status
  const handleRefreshStatus = async (bookingId: string) => {
    try {
      // TODO: Call verify-payment edge function
      console.log('Verifying payment for booking:', bookingId);
      // For now, just refresh the bookings list
      await fetchBookings();
    } catch (err) {
      const errorMsg = extractErrorMessage(err);
      console.error('Error verifying payment:', errorMsg);
    }
  };

  // Handle rebook success
  const handleRebookSuccess = (newBookingId: string) => {
    fetchBookings();
    router.push(`/(client)/bookings/${newBookingId}` as never);
  };

  // Filter bookings
  const selectedFilterOption = FILTER_OPTIONS.find(o => o.key === filter);
  const filteredBookings = allBookings.filter(booking => {
    if (filter === 'all') return true;
    return selectedFilterOption?.statuses.includes(booking.status);
  });

  // Group by section
  const upcomingBookings = filteredBookings.filter(b => UPCOMING_STATUSES.includes(b.status));
  const pastBookings = filteredBookings.filter(b => PAST_STATUSES.includes(b.status));

  const filterLabel = FILTER_OPTIONS.find(o => o.key === filter)?.label || 'All';

  return (
    <View className="flex-1" style={{ backgroundColor: isDark ? '#0A0A0A' : '#F8F8F8' }}>
      <View style={{ paddingTop: insets.top, backgroundColor: isDark ? '#0A0A0A' : '#FFFFFF' }} />

      {/* Header */}
      <Animated.View
        entering={FadeInDown.delay(100).duration(500)}
        className="px-5 py-4 flex-row items-center justify-between"
        style={{ backgroundColor: isDark ? '#0A0A0A' : '#FFFFFF' }}
      >
        <Text style={{ color: isDark ? '#FFFFFF' : '#111827' }} className="text-2xl font-bold">Bookings</Text>
        <Pressable
          onPress={() => setShowFilterSheet(true)}
          className="flex-row items-center px-3 py-1.5 rounded-lg"
          style={{
            backgroundColor: isDark ? '#1A1A1A' : '#F9FAFB',
            borderWidth: 1,
            borderColor: isDark ? 'rgba(255,255,255,0.1)' : '#E5E7EB',
          }}
        >
          <Text
            className="text-sm font-medium mr-1"
            style={{ color: isDark ? '#FFFFFF' : '#374151' }}
          >
            {filter === 'all' ? 'All' : filterLabel}
          </Text>
          <ChevronDown size={16} color={isDark ? '#9CA3AF' : '#6B7280'} />
        </Pressable>
      </Animated.View>

      {/* Content */}
      {loading ? (
        <View className="flex-1 items-center justify-center" style={{ backgroundColor: isDark ? '#0A0A0A' : '#F8F8F8' }}>
          <ActivityIndicator size="large" color="#F97316" />
        </View>
      ) : filteredBookings.length > 0 ? (
        <ScrollView
          className="flex-1"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#F97316" />
          }
        >
          {/* Upcoming */}
          {upcomingBookings.length > 0 ? (
            <View className="mt-4">
              <Animated.Text
                entering={FadeInDown.delay(150).duration(400)}
                className="font-semibold text-base px-5 mb-3"
                style={{ color: isDark ? '#FFFFFF' : '#111827' }}
              >
                Upcoming
              </Animated.Text>
              <View className="pl-3">
                {upcomingBookings.map((booking, index) => (
                  <BookingCard
                    key={booking.id}
                    booking={booking}
                    index={index}
                    isLast={index === upcomingBookings.length - 1 && pastBookings.length === 0}
                    walletBalance={walletBalance}
                    onPayNow={setPaymentBooking}
                    onRefreshStatus={handleRefreshStatus}
                    onRebook={setRebookBooking}
                    onReview={setReviewBooking}
                    isDark={isDark}
                  />
                ))}
              </View>
            </View>
          ) : null}

          {/* Past */}
          {pastBookings.length > 0 ? (
            <View className="mt-4">
              <Animated.Text
                entering={FadeInDown.delay(150).duration(400)}
                className="font-semibold text-base px-5 mb-3"
                style={{ color: isDark ? '#FFFFFF' : '#111827' }}
              >
                Past
              </Animated.Text>
              <View className="pl-3">
                {pastBookings.map((booking, index) => (
                  <BookingCard
                    key={booking.id}
                    booking={booking}
                    index={index + upcomingBookings.length}
                    isLast={index === pastBookings.length - 1}
                    walletBalance={walletBalance}
                    onPayNow={setPaymentBooking}
                    onRefreshStatus={handleRefreshStatus}
                    onRebook={setRebookBooking}
                    onReview={setReviewBooking}
                    isDark={isDark}
                  />
                ))}
              </View>
            </View>
          ) : null}
        </ScrollView>
      ) : (
        <EmptyState isDark={isDark} />
      )}

      {/* Modals */}
      <FilterBottomSheet
        visible={showFilterSheet}
        currentFilter={filter}
        onSelect={setFilter}
        onClose={() => setShowFilterSheet(false)}
      />

      <PaymentMethodDialog
        visible={!!paymentBooking}
        booking={paymentBooking}
        walletBalance={walletBalance}
        onClose={() => setPaymentBooking(null)}
        onPaymentSuccess={fetchBookings}
      />

      <ReviewDialog
        visible={!!reviewBooking}
        booking={reviewBooking}
        onClose={() => setReviewBooking(null)}
        onSubmitSuccess={fetchBookings}
      />

      <RebookDrawer
        visible={!!rebookBooking}
        booking={rebookBooking}
        onClose={() => setRebookBooking(null)}
        onRebookSuccess={handleRebookSuccess}
      />
    </View>
  );
}
