import { View, Text, ScrollView, Pressable, Image, ActivityIndicator, Modal, RefreshControl, TextInput, Alert, Share } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useRouter } from '@/lib/router-helper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import {
  ArrowLeft,
  BadgeCheck,
  MapPin,
  Calendar,
  Clock,
  DollarSign,
  MessageCircle,
  MoreVertical,
  FileText,
  Mail,
  Phone,
  Download,
  AlertCircle,
  Wallet,
  ExternalLink,
  ChevronRight,
  Star,
  CreditCard,
  X,
  CheckCircle,
} from 'lucide-react-native';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { useState, useCallback, useEffect, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { format, differenceInHours, isSameDay } from 'date-fns';
import { useWorkCompletion } from '@/hooks/useWorkCompletion';
import { ConfirmWorkCompletionDialog } from '@/components/ConfirmWorkCompletionDialog';
import { extractErrorMessage } from '@/lib/errorUtils';

const PLACEHOLDER_AVATAR = 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&h=200&fit=crop';

interface BookingData {
  id: string;
  title?: string;
  name?: string;
  status: string;
  client_id: string;
  scheduled_start?: string;
  scheduled_end?: string;
  location_text?: string;
  total_price: number;
  currency: string;
  brief_id?: string;
  talent_marked_delivered_at?: string;
  client_marked_completed_at?: string;
}

interface TalentData {
  id: string;
  talent_id: string;
  role_category: string;
  rate_price: number;
  status: string;
  accepted_at?: string;
}

interface TalentProfile {
  id: string;
  user_id: string;
  category: string;
  bio?: string;
  rating?: number;
  is_verified?: boolean;
}

interface ProfileData {
  id: string;
  full_name: string;
  avatar_url?: string;
  email?: string;
  phone?: string;
}

interface Brief {
  id: string;
  title: string;
  objective: string;
  duration_hours?: number;
  notes_text?: string;
}

interface Payout {
  id: string;
  amount: number;
  currency: string;
  status: string;
  stripe_transfer_id?: string;
  transferred_at?: string;
}

interface Payment {
  id: string;
  amount: number;
  status: string;
  created_at: string;
}

interface Milestone {
  id: string;
  name: string;
  description?: string;
  amount: number;
  status: string;
  paid_at?: string;
  due_at?: string;
}

interface Invoice {
  id: string;
  invoice_number: string;
  status: string;
  issued_at: string;
  pdf_url?: string;
}

interface FileAsset {
  id: string;
  name: string;
  file_type: string;
  url: string;
  created_at: string;
}

interface Dispute {
  id: string;
  booking_id: string;
  opened_by_user_id: string;
  reason: string;
  details: string;
  status: string;
  created_at: string;
  resolved_at?: string;
}

interface EnrichedTalent {
  id: string;
  talentId: string;
  roleCategory: string;
  ratePrice: number;
  status: string;
  acceptedAt?: string;
  talentProfile: TalentProfile;
  profile: ProfileData;
}

interface BookingDetailPageData {
  booking: BookingData;
  clientProfile: ProfileData;
  talents: EnrichedTalent[];
  brief?: Brief;
  payout?: Payout;
  payments: Payment[];
  milestones: Milestone[];
  invoices: Invoice[];
  fileAssets: FileAsset[];
  disputes: Dispute[];
}

// Status badge colors
const STATUS_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  pending_acceptance: { bg: 'rgba(249, 115, 22, 0.15)', text: '#F97316', border: 'rgba(249, 115, 22, 0.3)' },
  pending_payment: { bg: 'rgba(249, 115, 22, 0.15)', text: '#F97316', border: 'rgba(249, 115, 22, 0.3)' },
  pending_contract: { bg: 'rgba(59, 130, 246, 0.15)', text: '#3B82F6', border: 'rgba(59, 130, 246, 0.3)' },
  confirmed: { bg: 'rgba(34, 197, 94, 0.15)', text: '#22C55E', border: 'rgba(34, 197, 94, 0.3)' },
  in_progress: { bg: 'rgba(59, 130, 246, 0.15)', text: '#3B82F6', border: 'rgba(59, 130, 246, 0.3)' },
  delivered: { bg: 'rgba(249, 115, 22, 0.15)', text: '#F97316', border: 'rgba(249, 115, 22, 0.3)' },
  completed: { bg: 'rgba(156, 163, 175, 0.15)', text: '#9CA3AF', border: 'rgba(156, 163, 175, 0.3)' },
  cancelled: { bg: 'rgba(239, 68, 68, 0.15)', text: '#EF4444', border: 'rgba(239, 68, 68, 0.3)' },
  declined: { bg: 'rgba(239, 68, 68, 0.15)', text: '#EF4444', border: 'rgba(239, 68, 68, 0.3)' },
};

const STATUS_LABELS: Record<string, string> = {
  pending_acceptance: 'Pending Response',
  pending_payment: 'Awaiting Payment',
  pending_contract: 'Contract Pending',
  confirmed: 'Confirmed',
  in_progress: 'In Progress',
  delivered: 'Waiting for Review',
  completed: 'Completed',
  cancelled: 'Cancelled',
  declined: 'Declined',
};

// Section Card Component
function SectionCard({ children, title }: { children: React.ReactNode; title?: string }) {
  return (
    <View
      className="mx-4 mb-4 p-4 bg-white rounded-2xl"
      style={{
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
        elevation: 3,
      }}
    >
      {title ? (
        <Text className="text-gray-500 text-xs font-semibold uppercase tracking-wider mb-3">
          {title}
        </Text>
      ) : null}
      {children}
    </View>
  );
}

// Detail Row Component
function DetailRow({
  icon: Icon,
  iconColor = '#6B7280',
  label,
  value,
  valueColor,
}: {
  icon: React.ComponentType<{ size: number; color: string }>;
  iconColor?: string;
  label: string;
  value: string;
  valueColor?: string;
}) {
  return (
    <View className="flex-row items-center py-3 border-b border-gray-100">
      <View className="w-10 h-10 rounded-full bg-gray-50 items-center justify-center mr-3">
        <Icon size={18} color={iconColor} />
      </View>
      <View className="flex-1">
        <Text className="text-gray-400 text-xs">{label}</Text>
        <Text className={`text-gray-900 text-sm font-medium mt-0.5 ${valueColor || ''}`}>
          {value}
        </Text>
      </View>
    </View>
  );
}

// Tab Navigation Component
function TabNavigation({
  activeTab,
  onTabChange,
}: {
  activeTab: string;
  onTabChange: (tab: string) => void;
}) {
  const tabs = ['Overview', 'Chat', 'Files', 'Payments'];

  return (
    <View className="flex-row bg-white border-b border-gray-200">
      {tabs.map((tab) => (
        <Pressable
          key={tab}
          onPress={() => onTabChange(tab.toLowerCase())}
          className="flex-1 py-3 border-b-2"
          style={{
            borderBottomColor: activeTab === tab.toLowerCase() ? '#F97316' : 'transparent',
          }}
        >
          <Text
            className={`text-center text-sm font-semibold ${
              activeTab === tab.toLowerCase() ? 'text-orange-500' : 'text-gray-500'
            }`}
          >
            {tab}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

// Action Banner Component
interface ActionBannerProps {
  status: string;
  currency: string;
  totalPrice: number;
  talentName: string;
  onPayNow?: () => void;
  onApprove?: () => void;
  onReview?: () => void;
  talentMarkedDeliveredAt?: string;
  clientMarkedCompletedAt?: string;
}

interface BannerConfig {
  variant: 'warning' | 'muted' | 'info' | 'primary' | 'success';
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
}

const BANNER_VARIANT_STYLES: Record<string, { bg: string; border: string; dot: string; button: string }> = {
  warning: {
    bg: 'rgba(251, 191, 36, 0.1)',
    border: '#FCD34D',
    dot: '#F59E0B',
    button: '#F59E0B',
  },
  muted: {
    bg: 'rgba(107, 114, 128, 0.1)',
    border: '#D1D5DB',
    dot: '#9CA3AF',
    button: '#6B7280',
  },
  info: {
    bg: 'rgba(59, 130, 246, 0.1)',
    border: '#93C5FD',
    dot: '#3B82F6',
    button: '#3B82F6',
  },
  primary: {
    bg: 'rgba(249, 115, 22, 0.1)',
    border: '#FBDDD7',
    dot: '#F97316',
    button: '#F97316',
  },
  success: {
    bg: 'rgba(34, 197, 94, 0.1)',
    border: '#BBEF63',
    dot: '#22C55E',
    button: '#22C55E',
  },
};

// Review Dialog Component
function ReviewDialog({
  visible,
  onClose,
  onSubmit,
  talentName,
  talentAvatar,
}: {
  visible: boolean;
  onClose: () => void;
  onSubmit: (rating: number, comment: string, tags: string[]) => Promise<void>;
  talentName: string;
  talentAvatar: string;
}) {
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const REVIEW_TAGS = [
    'Professional',
    'On Time',
    'Great Communication',
    'Creative',
    'High Quality',
    'Fast Delivery',
    'Would Book Again',
  ];

  const toggleTag = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const handleSubmit = async () => {
    if (rating === 0) return;
    setIsSubmitting(true);
    try {
      await onSubmit(rating, comment, selectedTags);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!visible) return null;

  return (
    <Modal transparent animationType="fade" onRequestClose={onClose}>
      <Pressable className="flex-1 bg-black/50 items-center justify-center px-5" onPress={onClose}>
        <Pressable
          className="bg-white rounded-3xl w-full max-w-sm overflow-hidden"
          onPress={() => {}}
        >
          {/* Header */}
          <View className="flex-row items-center justify-between p-5 border-b border-gray-100">
            <Text className="text-gray-900 text-lg font-semibold">Leave a Review</Text>
            <Pressable onPress={onClose} className="p-1">
              <X size={20} color="#6B7280" />
            </Pressable>
          </View>

          {/* Content */}
          <ScrollView className="max-h-96 p-5">
            {/* Talent Info */}
            <View className="flex-row items-center mb-5">
              <Image
                source={{ uri: talentAvatar }}
                className="w-12 h-12 rounded-full"
              />
              <View className="flex-1 ml-3">
                <Text className="text-gray-900 font-semibold text-sm">{talentName}</Text>
                <Text className="text-gray-600 text-xs mt-0.5">How was your experience?</Text>
              </View>
            </View>

            {/* Star Rating */}
            <View className="mb-5">
              <Text className="text-gray-600 text-sm font-medium mb-2">Rating</Text>
              <View className="flex-row gap-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Pressable
                    key={star}
                    onPress={() => setRating(star)}
                    className="p-1"
                  >
                    <Star
                      size={28}
                      color={star <= rating ? '#F59E0B' : '#D1D5DB'}
                      fill={star <= rating ? '#F59E0B' : 'none'}
                    />
                  </Pressable>
                ))}
              </View>
            </View>

            {/* Comment */}
            <View className="mb-5">
              <Text className="text-gray-600 text-sm font-medium mb-2">Your Feedback</Text>
              <TextInput
                className="border border-gray-200 rounded-xl p-3 bg-white text-gray-700 text-sm"
                style={{ minHeight: 80 }}
                editable
                multiline
                numberOfLines={4}
                placeholder="Share your experience (optional)"
                placeholderTextColor="#9CA3AF"
                value={comment}
                onChangeText={setComment}
              />
            </View>

            {/* Tags */}
            <View className="mb-5">
              <Text className="text-gray-600 text-sm font-medium mb-2">Highlights (optional)</Text>
              <View className="flex-row flex-wrap gap-2">
                {REVIEW_TAGS.map((tag) => (
                  <Pressable
                    key={tag}
                    onPress={() => toggleTag(tag)}
                    className={`px-3 py-2 rounded-full ${
                      selectedTags.includes(tag)
                        ? 'bg-orange-100'
                        : 'bg-gray-100'
                    }`}
                  >
                    <Text
                      className={`text-xs font-medium ${
                        selectedTags.includes(tag) ? 'text-orange-700' : 'text-gray-600'
                      }`}
                    >
                      {tag}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>
          </ScrollView>

          {/* Actions */}
          <View className="flex-row gap-3 p-5 border-t border-gray-100">
            <Pressable
              onPress={onClose}
              className="flex-1 py-3 rounded-xl bg-gray-100"
            >
              <Text className="text-gray-900 text-sm font-semibold text-center">Cancel</Text>
            </Pressable>
            <Pressable
              onPress={handleSubmit}
              disabled={rating === 0 || isSubmitting}
              className="flex-1 py-3 rounded-xl bg-orange-500"
              style={{ opacity: rating === 0 || isSubmitting ? 0.5 : 1 }}
            >
              <Text className="text-white text-sm font-semibold text-center">
                {isSubmitting ? 'Submitting...' : 'Submit Review'}
              </Text>
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

// Payment Dialog Component
function PaymentDialog({
  visible,
  onClose,
  onPayWithWallet,
  onPayWithCard,
  bookingId,
  totalPrice,
  currency,
  walletBalance,
}: {
  visible: boolean;
  onClose: () => void;
  onPayWithWallet: () => Promise<void>;
  onPayWithCard: () => Promise<void>;
  bookingId: string;
  totalPrice: number;
  currency: string;
  walletBalance: number;
}) {
  const [isProcessing, setIsProcessing] = useState(false);

  const handleWalletPayment = async () => {
    setIsProcessing(true);
    try {
      await onPayWithWallet();
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCardPayment = async () => {
    setIsProcessing(true);
    try {
      await onPayWithCard();
    } finally {
      setIsProcessing(false);
    }
  };

  const canPayWithWallet = walletBalance >= totalPrice;
  const shortfall = totalPrice - walletBalance;

  if (!visible) return null;

  return (
    <Modal transparent animationType="fade" onRequestClose={onClose}>
      <Pressable className="flex-1 bg-black/50 items-center justify-center px-5" onPress={onClose}>
        <Pressable
          className="bg-white rounded-3xl w-full max-w-sm overflow-hidden"
          onPress={() => {}}
        >
          {/* Header */}
          <View className="flex-row items-center justify-between p-5 border-b border-gray-100">
            <Text className="text-gray-900 text-lg font-semibold">Choose Payment Method</Text>
            <Pressable onPress={onClose} className="p-1">
              <X size={20} color="#6B7280" />
            </Pressable>
          </View>

          {/* Amount */}
          <View className="p-5 bg-gray-50">
            <Text className="text-gray-500 text-sm">Total Amount</Text>
            <Text className="text-gray-900 text-2xl font-bold mt-1">
              {currency} {totalPrice.toLocaleString()}
            </Text>
          </View>

          {/* Payment Options */}
          <View className="p-5 gap-3">
            {/* Wallet */}
            <Pressable
              onPress={handleWalletPayment}
              disabled={!canPayWithWallet || isProcessing}
              className="flex-row items-center p-4 rounded-xl"
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
                  Balance: {currency} {walletBalance.toLocaleString()}
                </Text>
              </View>
              {!canPayWithWallet && (
                <Text className="text-red-500 text-xs font-medium">
                  Need {currency} {shortfall.toLocaleString()} more
                </Text>
              )}
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
              <View className="flex-1 ml-3">
                <Text className="text-orange-600 font-semibold text-base">Pay with Card</Text>
                <Text className="text-sm text-orange-500">Visa, Mastercard, etc.</Text>
              </View>
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

// Dispute Dialog Component
const DISPUTE_REASONS = [
  { label: 'Talent did not show up', value: 'no_show' },
  { label: 'Late or missing deliverables', value: 'late_delivery' },
  { label: 'Quality does not match expectations', value: 'quality_issue' },
  { label: 'Communication issues', value: 'communication' },
  { label: 'Payment dispute', value: 'payment' },
  { label: 'Other issue', value: 'other' },
];

function DisputeDialog({
  visible,
  onClose,
  onSubmit,
  bookingId,
  talentName,
  showRefundResult,
  refundData,
  isSubmitting,
}: {
  visible: boolean;
  onClose: () => void;
  onSubmit: (reason: string, details: string) => Promise<void>;
  bookingId: string;
  talentName: string;
  showRefundResult: boolean;
  refundData: { amount: number; currency: string } | null;
  isSubmitting: boolean;
}) {
  const [reason, setReason] = useState('');
  const [details, setDetails] = useState('');

  const handleSubmit = async () => {
    if (!reason) {
      console.warn('Please select a reason');
      return;
    }
    if (!details.trim()) {
      console.warn('Please provide details about the issue');
      return;
    }
    await onSubmit(reason, details);
  };

  const handleClose = () => {
    setReason('');
    setDetails('');
    onClose();
  };

  if (!visible) return null;

  const submitButtonText = reason === 'no_show' ? 'Report and Get Refund' : 'Submit Dispute';
  const canSubmit = reason && details.trim() && !isSubmitting;

  return (
    <Modal transparent animationType="fade" onRequestClose={handleClose}>
      <Pressable className="flex-1 bg-black/50 items-center justify-center px-5" onPress={handleClose}>
        <Pressable
          className="bg-white rounded-3xl w-full max-w-sm overflow-hidden"
          onPress={() => {}}
        >
          {showRefundResult && refundData ? (
            // Refund Result Screen (for no-show)
            <View className="p-5 items-center">
              <View className="w-16 h-16 rounded-full bg-green-100 items-center justify-center mb-4">
                <CheckCircle size={32} color="#22C55E" />
              </View>
              <Text className="text-gray-900 text-xl font-semibold mb-2">Refund Processed</Text>
              <Text className="text-gray-600 text-sm text-center mb-4">
                {refundData.currency} {refundData.amount.toLocaleString()} has been credited to your wallet.
              </Text>
              <View className="bg-green-50 rounded-xl p-4 w-full mb-5">
                <Text className="text-gray-600 text-xs mb-1">Refund Amount</Text>
                <Text className="text-gray-900 text-2xl font-bold">
                  {refundData.currency} {refundData.amount.toLocaleString()}
                </Text>
              </View>
              <Pressable
                onPress={handleClose}
                className="w-full py-3 rounded-xl bg-orange-500"
              >
                <Text className="text-white text-sm font-semibold text-center">Done</Text>
              </Pressable>
            </View>
          ) : (
            // Dispute Form
            <>
              <View className="flex-row items-center justify-between p-5 border-b border-gray-100">
                <View className="flex-row items-center gap-2">
                  <AlertCircle size={20} color="#EF4444" />
                  <Text className="text-gray-900 text-lg font-semibold">Report an Issue</Text>
                </View>
                <Pressable onPress={handleClose} className="p-1">
                  <X size={20} color="#6B7280" />
                </Pressable>
              </View>

              <ScrollView className="max-h-96 p-5">
                <View className="mb-4">
                  <Text className="text-gray-600 text-sm font-medium mb-2">What's the issue?</Text>
                  <View className="border border-gray-200 rounded-xl overflow-hidden">
                    {DISPUTE_REASONS.map((item) => (
                      <Pressable
                        key={item.value}
                        onPress={() => setReason(item.value)}
                        className={`px-4 py-3 border-b border-gray-100 flex-row items-center justify-between ${
                          reason === item.value ? 'bg-orange-50' : 'bg-white'
                        }`}
                      >
                        <Text
                          className={`text-sm font-medium ${
                            reason === item.value ? 'text-orange-700' : 'text-gray-700'
                          }`}
                        >
                          {item.label}
                        </Text>
                        {reason === item.value && (
                          <View className="w-5 h-5 rounded-full bg-orange-500 items-center justify-center">
                            <Text className="text-white text-xs font-bold">✓</Text>
                          </View>
                        )}
                      </Pressable>
                    ))}
                  </View>
                </View>

                <View className="mb-5">
                  <Text className="text-gray-600 text-sm font-medium mb-2">Provide details</Text>
                  <TextInput
                    className="border border-gray-200 rounded-xl p-3 bg-white text-gray-700 text-sm"
                    style={{ minHeight: 100 }}
                    editable
                    multiline
                    numberOfLines={5}
                    placeholder="Please describe the issue in detail..."
                    placeholderTextColor="#9CA3AF"
                    value={details}
                    onChangeText={setDetails}
                  />
                </View>

                {reason === 'no_show' && (
                  <View className="bg-green-50 rounded-xl p-4 mb-5 flex-row">
                    <Text className="text-green-700 text-xs flex-1">
                      You will receive an immediate refund to your wallet when you report a no-show.
                    </Text>
                  </View>
                )}

                {reason && reason !== 'no_show' ? (
                  <Text className="text-gray-600 text-xs mb-5">
                    Our support team will review your case within up to 3 hours.
                  </Text>
                ) : null}
              </ScrollView>

              <View className="flex-row gap-3 p-5 border-t border-gray-100">
                <Pressable
                  onPress={handleClose}
                  disabled={isSubmitting}
                  className="flex-1 py-3 rounded-xl bg-gray-100"
                  style={{ opacity: isSubmitting ? 0.5 : 1 }}
                >
                  <Text className="text-gray-900 text-sm font-semibold text-center">Cancel</Text>
                </Pressable>
                <Pressable
                  onPress={handleSubmit}
                  disabled={!canSubmit}
                  className="flex-1 py-3 rounded-xl"
                  style={{
                    backgroundColor: canSubmit ? '#EF4444' : '#D1D5DB',
                  }}
                >
                  <Text className="text-white text-sm font-semibold text-center">
                    {isSubmitting ? 'Submitting...' : submitButtonText}
                  </Text>
                </Pressable>
              </View>
            </>
          )}

          {isSubmitting && !showRefundResult ? (
            <View className="absolute inset-0 bg-white/80 items-center justify-center">
              <ActivityIndicator size="large" color="#F97316" />
            </View>
          ) : null}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function ActionBanner({
  status,
  currency,
  totalPrice,
  talentName,
  onPayNow,
  onApprove,
  onReview,
  talentMarkedDeliveredAt,
  clientMarkedCompletedAt,
}: ActionBannerProps) {
  // Determine which banner to show based on status and delivery state
  let bannerConfig: BannerConfig | null = null;

  if (status === 'pending_payment') {
    bannerConfig = {
      variant: 'warning',
      title: 'Payment Required',
      description: 'Complete payment to confirm your booking',
      actionLabel: `Pay ${currency} ${totalPrice.toLocaleString()}`,
      onAction: onPayNow,
    };
  } else if (status === 'pending_acceptance') {
    bannerConfig = {
      variant: 'muted',
      title: 'Awaiting Response',
      description: `Waiting for ${talentName} to accept`,
    };
  } else if (status === 'confirmed' && !talentMarkedDeliveredAt) {
    bannerConfig = {
      variant: 'info',
      title: 'In Progress',
      description: `Waiting for ${talentName} to deliver work`,
    };
  } else if (talentMarkedDeliveredAt && !clientMarkedCompletedAt) {
    bannerConfig = {
      variant: 'primary',
      title: 'Work Delivered',
      description: `${talentName} has submitted their work`,
      actionLabel: 'Approve & Release Payment',
      onAction: onApprove,
    };
  } else if (clientMarkedCompletedAt || status === 'completed') {
    bannerConfig = {
      variant: 'success',
      title: 'Project Complete!',
      description: `Share your experience with ${talentName}`,
      actionLabel: 'Leave a Review',
      onAction: onReview,
    };
  }

  if (!bannerConfig) {
    return null;
  }

  const style = BANNER_VARIANT_STYLES[bannerConfig.variant];

  return (
    <Animated.View
      entering={FadeInDown.delay(200).duration(400)}
      className="mx-4 mb-4 px-4 py-4 rounded-3xl flex-row items-center"
      style={{
        backgroundColor: style.bg,
        borderWidth: 1,
        borderColor: style.border,
      }}
    >
      {/* Dot */}
      <View
        className="w-2.5 h-2.5 rounded-full mr-3 mt-0.5"
        style={{ backgroundColor: style.dot }}
      />

      {/* Text Content */}
      <View className="flex-1">
        <Text className="font-semibold text-sm" style={{ color: style.dot }}>
          {bannerConfig.title}
        </Text>
        <Text className="text-gray-600 text-xs mt-0.5">
          {bannerConfig.description}
        </Text>
      </View>

      {/* Action Button */}
      {bannerConfig.actionLabel && bannerConfig.onAction ? (
        <Pressable
          onPress={bannerConfig.onAction}
          className="ml-3 px-3 py-2 rounded-lg"
          style={{ backgroundColor: style.button }}
        >
          <Text className="text-white text-xs font-semibold">
            {bannerConfig.actionLabel}
          </Text>
        </Pressable>
      ) : null}
    </Animated.View>
  );
}

export default function BookingDetailScreen() {
  const { id, tab } = useLocalSearchParams<{ id: string; tab?: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [bookingData, setBookingData] = useState<BookingDetailPageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState(tab || 'overview');
  const [menuVisible, setMenuVisible] = useState(false);
  const [reviewDialogOpen, setReviewDialogOpen] = useState(false);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [disputeDialogOpen, setDisputeDialogOpen] = useState(false);
  const [showConfirmApproveDialog, setShowConfirmApproveDialog] = useState(false);
  const [walletBalance, setWalletBalance] = useState(0);
  const [reason, setReason] = useState('');
  const [details, setDetails] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showRefundResult, setShowRefundResult] = useState(false);
  const [refundData, setRefundData] = useState<{ amount: number; currency: string } | null>(null);

  // Work completion hook
  const { approveWork, isApprovingWork } = useWorkCompletion({
    bookingId: id || '',
    onSuccess: () => {
      setShowConfirmApproveDialog(false);
      fetchBookingData();
    },
  });

  const feeBreakdown = useMemo(() => {
    const talentFee = bookingData?.talents?.[0]?.ratePrice || 0;
    const platformFee = talentFee <= 500 ? 49 : 99;
    const vat = Math.round(platformFee * 0.05);
    const bankingFee = Math.round((talentFee + platformFee + vat) * 0.029);
    return { talentFee, platformFee, vat, bankingFee };
  }, [bookingData?.talents]);

  // Fetch all booking data
  const fetchBookingData = useCallback(async () => {
    if (!id) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Fetch wallet balance
      const { data: walletData } = await supabase
        .from('client_wallets')
        .select('balance')
        .eq('user_id', user.id)
        .single();

      if (walletData) {
        setWalletBalance(walletData.balance || 0);
      }

      // STEP 1: Fetch the booking
      const { data: booking, error: bookingError } = await supabase
        .from('bookings')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (bookingError || !booking) {
        console.error('Booking fetch error:', bookingError);
        return;
      }

      // STEP 2: Fetch client profile
      const { data: clientProfile } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url, email, phone')
        .eq('id', booking.client_id)
        .maybeSingle();

      // STEP 3: Fetch booking talents
      const { data: talentsData } = await supabase
        .from('booking_talents')
        .select('id, talent_id, role_category, rate_price, status, accepted_at')
        .eq('booking_id', id);

      // STEP 4: For each talent, fetch their talent_profile and user profile
      const enrichedTalents: EnrichedTalent[] = [];

      for (const talent of talentsData || []) {
        const { data: talentProfile } = await supabase
          .from('talent_profiles')
          .select('id, user_id, category, bio, rating, is_verified')
          .eq('id', talent.talent_id)
          .single();

        if (talentProfile) {
          const { data: profileData } = await supabase
            .from('profiles')
            .select('id, full_name, avatar_url, email, phone')
            .eq('id', talentProfile.user_id)
            .maybeSingle();

          enrichedTalents.push({
            id: talent.id,
            talentId: talent.talent_id,
            roleCategory: talent.role_category,
            ratePrice: talent.rate_price,
            status: talent.status,
            acceptedAt: talent.accepted_at,
            talentProfile,
            profile: profileData || {
              id: talentProfile.user_id,
              full_name: 'Unknown',
              avatar_url: PLACEHOLDER_AVATAR,
            },
          });
        }
      }

      // STEP 5: Fetch brief if booking has brief_id
      let brief: Brief | undefined;
      if (booking.brief_id) {
        const { data: briefData } = await supabase
          .from('briefs')
          .select('id, title, objective, duration_hours, notes_text')
          .eq('id', booking.brief_id)
          .maybeSingle();
        brief = briefData || undefined;
      }

      // STEP 6: Fetch payout info
      const { data: payoutData } = await supabase
        .from('payouts')
        .select('id, amount, currency, status, stripe_transfer_id, transferred_at')
        .eq('booking_id', id)
        .maybeSingle();

      // STEP 7: Fetch payments
      const { data: paymentsData } = await supabase
        .from('payments')
        .select('id, amount, status, created_at')
        .eq('booking_id', id)
        .eq('status', 'completed')
        .order('created_at', { ascending: false });

      // STEP 8: Fetch milestones
      const { data: milestonesData } = await supabase
        .from('milestones')
        .select('id, name, description, amount, status, paid_at, due_at')
        .eq('booking_id', id)
        .order('created_at', { ascending: true });

      // STEP 9: Fetch invoices
      const { data: invoicesData } = await supabase
        .from('invoices')
        .select('id, invoice_number, status, issued_at, pdf_url')
        .eq('booking_id', id)
        .order('issued_at', { ascending: false });

      // STEP 10: Fetch file assets (documents)
      const { data: fileAssetsData } = await supabase
        .from('file_assets')
        .select('id, name, file_type, url, created_at')
        .eq('booking_id', id)
        .order('created_at', { ascending: false });

      // STEP 11: Fetch disputes
      const { data: disputesData } = await supabase
        .from('disputes')
        .select('id, booking_id, opened_by_user_id, reason, details, status, created_at, resolved_at')
        .eq('booking_id', id)
        .order('created_at', { ascending: false });

      setBookingData({
        booking,
        clientProfile: clientProfile || {
          id: booking.client_id,
          full_name: 'Unknown',
          avatar_url: PLACEHOLDER_AVATAR,
        },
        talents: enrichedTalents,
        brief,
        payout: payoutData || undefined,
        payments: paymentsData || [],
        milestones: milestonesData || [],
        invoices: invoicesData || [],
        fileAssets: fileAssetsData || [],
        disputes: disputesData || [],
      });
    } catch (err) {
      const errorMsg = extractErrorMessage(err);
      console.error('Error fetching booking data:', errorMsg);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [id]);

  useEffect(() => {
    fetchBookingData();
  }, [fetchBookingData]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchBookingData();
  }, [fetchBookingData]);

  // Action handlers for banner buttons
  const handlePayNow = useCallback(() => {
    setPaymentDialogOpen(true);
  }, []);

  const handleApproveWork = useCallback(() => {
    setShowConfirmApproveDialog(true);
  }, []);

  const handleLeaveReview = useCallback(() => {
    setReviewDialogOpen(true);
  }, []);

  // Define memoized handlers upfront (before early returns)
  const handleReviewSubmit = useCallback(
    async (rating: number, comment: string, tags: string[]) => {
      if (!bookingData) return;

      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('Not authenticated');

        const talent = bookingData.talents[0];
        if (!talent) return;

        // Get talent's user_id
        const { data: tp } = await supabase
          .from('talent_profiles')
          .select('user_id')
          .eq('id', talent.talentId)
          .single();

        if (!tp) throw new Error('Talent profile not found');

        // Insert review
        const { error } = await supabase.from('reviews').insert({
          booking_id: id,
          reviewee_user_id: tp.user_id,
          rating,
          comment: comment.trim() || null,
          tags: tags.length > 0 ? tags : [],
        });

        if (error) throw error;

        setReviewDialogOpen(false);
        // Refresh booking data to update the banner
        fetchBookingData();
      } catch (err) {
        const errorMsg = extractErrorMessage(err);
        console.error('Error submitting review:', errorMsg);
      }
    },
    [id, bookingData, fetchBookingData]
  );

  // Payment handlers
  const handlePayWithWallet = useCallback(async () => {
    if (!id) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Update booking status to confirmed
      const { error } = await supabase
        .from('bookings')
        .update({ status: 'confirmed' })
        .eq('id', id);

      if (error) throw error;

      setPaymentDialogOpen(false);
      fetchBookingData();
    } catch (err) {
      const errorMsg = extractErrorMessage(err);
      console.error('Error processing wallet payment:', errorMsg);
    }
  }, [id, fetchBookingData]);

  const handlePayWithCard = useCallback(async () => {
    if (!id) return;

    try {
      // Call Stripe edge function (placeholder)
      console.log('Initiating card payment for booking:', id);
      // TODO: Call create-checkout edge function
      setPaymentDialogOpen(false);
    } catch (err) {
      const errorMsg = extractErrorMessage(err);
      console.error('Error initiating card payment:', errorMsg);
    }
  }, [id]);

  const handleDisputeSubmit = useCallback(async (disputeReason: string, disputeDetails: string) => {
    if (!id) return;

    setIsSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.error('User not authenticated');
        return;
      }

      // Special handling for no-show disputes
      if (disputeReason === 'no_show') {
        // Call report-no-show edge function
        const { data, error } = await supabase.functions.invoke('report-no-show', {
          body: {
            booking_id: id,
            reason: disputeReason,
            details: disputeDetails,
          },
        });

        if (error) {
          console.error('Edge function error:', extractErrorMessage(error));
          return;
        }

        // Show refund result
        if (data && data.refund_amount && data.currency) {
          setRefundData({
            amount: data.refund_amount,
            currency: data.currency,
          });
          setShowRefundResult(true);
          // Refresh booking data after showing refund result
          setTimeout(() => {
            fetchBookingData();
          }, 2000);
        }
      } else {
        // For other dispute reasons, insert directly to disputes table
        const { error } = await supabase.from('disputes').insert({
          booking_id: id,
          opened_by_user_id: user.id,
          reason: disputeReason,
          details: disputeDetails,
          status: 'open',
        });

        if (error) {
          console.error('Dispute insertion error:', extractErrorMessage(error));
          if (error.code === '42501') {
            console.error('Permission denied. Please ensure you have access to this booking.');
          }
          return;
        }

        // Close dialog after successful submission
        setDisputeDialogOpen(false);
        setReason('');
        setDetails('');

        // Refresh booking data to show updated disputes
        fetchBookingData();
      }
    } catch (err) {
      const errorMsg = extractErrorMessage(err);
      console.error('Error submitting dispute:', errorMsg);
    } finally {
      setIsSubmitting(false);
    }
  }, [id, fetchBookingData]);

  if (loading) {
    return (
      <View className="flex-1 bg-white items-center justify-center">
        <ActivityIndicator size="large" color="#F97316" />
      </View>
    );
  }

  if (!bookingData) {
    return (
      <View className="flex-1 bg-white items-center justify-center">
        <Text className="text-gray-500">Booking not found</Text>
      </View>
    );
  }

  const { booking, talents, brief, payout, payments, milestones, invoices, fileAssets, disputes } = bookingData;
  const primaryTalent = talents[0];
  const statusStyle = STATUS_COLORS[booking.status] || STATUS_COLORS.pending_acceptance;

  // Format dates
  const startDate = booking.scheduled_start ? new Date(booking.scheduled_start) : null;
  const endDate = booking.scheduled_end ? new Date(booking.scheduled_end) : null;

  // Format dates for display
  let dateDisplay = 'TBD';
  if (startDate && endDate) {
    const startDateFormatted = format(startDate, 'EEEE, MMMM d');
    const endDateFormatted = format(endDate, 'EEEE, MMMM d, yyyy');
    // If same day, show just the day. If different days, show both
    if (isSameDay(startDate, endDate)) {
      dateDisplay = format(startDate, 'EEEE, MMMM d, yyyy');
    } else {
      dateDisplay = `${startDateFormatted} - ${endDateFormatted}`;
    }
  } else if (startDate) {
    dateDisplay = format(startDate, 'EEEE, MMMM d, yyyy');
  }

  const startTimeDisplay = startDate ? format(startDate, 'h:mm a') : 'TBD';
  const endTimeDisplay = endDate ? format(endDate, 'h:mm a') : 'TBD';
  const timeDisplay = startDate && endDate ? `${startTimeDisplay} - ${endTimeDisplay}` : (startDate ? `${startTimeDisplay}` : 'TBD');
  const fullDateDisplay = startDate ? format(startDate, 'EEEE, MMMM d, yyyy') : 'TBD';
  const durationHours = startDate && endDate ? differenceInHours(endDate, startDate) : 0;

  // Check if contact info should be shown
  const showContactInfo = ['confirmed', 'in_progress', 'delivered', 'completed'].includes(booking.status);

  return (
    <View className="flex-1 bg-[#F8F8F8]">
      {/* Header */}
      <LinearGradient colors={['#FFFFFF', '#F8F8F8']} style={{ paddingTop: insets.top }}>
        <Animated.View
          entering={FadeInDown.delay(100).duration(400)}
          className="flex-row items-center justify-between px-4 py-3"
        >
          <Pressable
            onPress={() => router.back()}
            className="w-10 h-10 rounded-full bg-gray-100 items-center justify-center"
          >
            <ArrowLeft size={20} color="#374151" />
          </Pressable>
          <Text className="text-gray-900 text-lg font-semibold">Booking Details</Text>
          <Pressable
            onPress={() => setMenuVisible(true)}
            className="w-10 h-10 rounded-full bg-gray-100 items-center justify-center"
          >
            <MoreVertical size={20} color="#374151" />
          </Pressable>
        </Animated.View>
      </LinearGradient>

      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#F97316" />}
      >
        {/* Action Banner */}
        <ActionBanner
          status={booking.status}
          currency={booking.currency}
          totalPrice={booking.total_price}
          talentName={primaryTalent?.profile.full_name || 'Talent'}
          onPayNow={handlePayNow}
          onApprove={handleApproveWork}
          onReview={handleLeaveReview}
          talentMarkedDeliveredAt={booking.talent_marked_delivered_at}
          clientMarkedCompletedAt={booking.client_marked_completed_at}
        />

        {/* Status Badge */}
        <Animated.View entering={FadeInDown.delay(150).duration(400)} className="mx-4 mb-4 mt-2">
          <View
            className="px-4 py-3 rounded-xl flex-row items-center"
            style={{
              backgroundColor: statusStyle.bg,
              borderWidth: 1,
              borderColor: statusStyle.border,
            }}
          >
            <View className="w-2 h-2 rounded-full mr-3" style={{ backgroundColor: statusStyle.text }} />
            <Text className="font-semibold flex-1" style={{ color: statusStyle.text }}>
              {STATUS_LABELS[booking.status] || booking.status}
            </Text>
          </View>
        </Animated.View>

        {/* Talent Info Card */}
        {primaryTalent ? (
          <Animated.View entering={FadeInUp.delay(200).duration(400)}>
            <SectionCard>
              <Pressable
                className="flex-row items-center"
                onPress={() => router.push(`/(client)/talent/${primaryTalent.talentId}` as never)}
              >
                <Image
                  source={{ uri: primaryTalent.profile.avatar_url || PLACEHOLDER_AVATAR }}
                  className="w-16 h-16 rounded-full"
                  style={{ borderWidth: 2, borderColor: 'rgba(249, 115, 22, 0.2)' }}
                />
                <View className="flex-1 ml-4">
                  <View className="flex-row items-center">
                    <Text className="text-gray-900 text-lg font-semibold">
                      {primaryTalent.profile.full_name}
                    </Text>
                    {primaryTalent.talentProfile.is_verified ? (
                      <BadgeCheck size={18} color="#F97316" className="ml-1" />
                    ) : null}
                  </View>
                  <Text className="text-gray-500 text-sm mt-0.5">
                    {primaryTalent.talentProfile.category}
                  </Text>
                  {primaryTalent.talentProfile.rating ? (
                    <Text className="text-gray-600 text-xs mt-1">
                      ⭐ {primaryTalent.talentProfile.rating.toFixed(1)}
                    </Text>
                  ) : null}
                </View>
                <View className="w-8 h-8 rounded-full bg-gray-100 items-center justify-center">
                  <ArrowLeft size={16} color="#6B7280" style={{ transform: [{ rotate: '180deg' }] }} />
                </View>
              </Pressable>
            </SectionCard>
          </Animated.View>
        ) : null}

        {/* Tab Navigation */}
        <TabNavigation activeTab={activeTab} onTabChange={setActiveTab} />

        {/* OVERVIEW TAB */}
        {activeTab === 'overview' ? (
          <>
            {/* Project Details */}
            {brief ? (
              <Animated.View entering={FadeInUp.delay(250).duration(400)}>
                <SectionCard title="Project Details">
                  <Text className="text-gray-900 text-base font-semibold mb-2">{brief.title}</Text>
                  {brief.objective ? (
                    <>
                      <Text className="text-gray-600 text-sm mb-2">{brief.objective}</Text>
                    </>
                  ) : null}
                  {brief.notes_text ? (
                    <Text className="text-gray-500 text-sm italic border-t border-gray-100 pt-2 mt-2">
                      {brief.notes_text}
                    </Text>
                  ) : null}
                </SectionCard>
              </Animated.View>
            ) : null}

            {/* Schedule & Location */}
            {startDate ? (
              <Animated.View entering={FadeInUp.delay(300).duration(400)}>
                <SectionCard title="Schedule & Location">
                  <DetailRow
                    icon={Calendar}
                    iconColor="#F97316"
                    label="Date"
                    value={dateDisplay}
                  />
                  <DetailRow
                    icon={Clock}
                    iconColor="#3B82F6"
                    label="Time"
                    value={`${timeDisplay} (${durationHours} ${durationHours === 1 ? 'hour' : 'hours'})`}
                  />
                  {booking.location_text ? (
                    <DetailRow
                      icon={MapPin}
                      iconColor="#22C55E"
                      label="Location"
                      value={booking.location_text}
                    />
                  ) : null}
                </SectionCard>
              </Animated.View>
            ) : null}

            {/* Talent Contact Information */}
            {primaryTalent ? (
              <Animated.View entering={FadeInUp.delay(350).duration(400)}>
                <SectionCard title="Contact Information">
                  {showContactInfo ? (
                    <>
                      {primaryTalent.profile.email ? (
                        <DetailRow
                          icon={Mail}
                          iconColor="#3B82F6"
                          label="Email"
                          value={primaryTalent.profile.email}
                        />
                      ) : null}
                      {primaryTalent.profile.phone ? (
                        <DetailRow
                          icon={Phone}
                          iconColor="#22C55E"
                          label="Phone"
                          value={primaryTalent.profile.phone}
                        />
                      ) : null}
                      {!primaryTalent.profile.email && !primaryTalent.profile.phone ? (
                        <Text className="text-gray-500 text-sm">No contact information available</Text>
                      ) : null}
                    </>
                  ) : (
                    <Text className="text-gray-500 text-sm">
                      Contact information will be available once the booking is confirmed and paid.
                    </Text>
                  )}
                </SectionCard>
              </Animated.View>
            ) : null}

            {/* Bio (if available) */}
            {primaryTalent?.talentProfile.bio ? (
              <Animated.View entering={FadeInUp.delay(400).duration(400)}>
                <SectionCard title="About">
                  <Text className="text-gray-700 text-sm leading-5">
                    {primaryTalent.talentProfile.bio}
                  </Text>
                </SectionCard>
              </Animated.View>
            ) : null}
          </>
        ) : null}

        {/* CHAT TAB */}
        {activeTab === 'chat' && (
          <Animated.View entering={FadeInUp.delay(250).duration(400)} className="mx-4 my-4">
            <Pressable
              onPress={() => router.push(`/(client)/messages?booking=${id}` as never)}
              className="bg-white rounded-2xl p-4 flex-row items-center justify-between"
              style={{
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.06,
                shadowRadius: 8,
                elevation: 3,
              }}
            >
              <View className="flex-1">
                <Text className="text-gray-900 font-semibold">Continue conversation</Text>
                <Text className="text-gray-500 text-sm mt-1">Open chat with {primaryTalent?.profile.full_name}</Text>
              </View>
              <MessageCircle size={20} color="#F97316" />
            </Pressable>
          </Animated.View>
        )}

        {/* FILES TAB */}
        {activeTab === 'files' && (
          <Animated.View entering={FadeInUp.delay(250).duration(400)} className="mx-4 my-4">
            <SectionCard title="Deliverables">
              <View className="items-center justify-center py-8">
                <FileText size={32} color="#D1D5DB" />
                <Text className="text-gray-500 text-sm mt-3">No files delivered yet</Text>
              </View>
            </SectionCard>
          </Animated.View>
        )}

        {/* PAYMENTS TAB */}
        {activeTab === 'payments' ? (
          <>
            {/* SECTION 1: Payment Breakdown */}
            <Animated.View entering={FadeInUp.delay(250).duration(400)}>
              <SectionCard title="Payment Breakdown">
                {/* Talent Fee */}
                <View className="flex-row items-center justify-between py-3 border-b border-gray-100">
                  <Text className="text-gray-600 text-sm">Talent Fee</Text>
                  <Text className="text-gray-900 text-sm font-semibold">
                    {booking.currency} {primaryTalent?.ratePrice.toLocaleString() || '0'}
                  </Text>
                </View>

                {/* Platform Fee */}
                <View className="flex-row items-center justify-between py-3 border-b border-gray-100">
                  <Text className="text-gray-600 text-sm">Platform Fee ({feeBreakdown.platformFee} {booking.currency})</Text>
                  <Text className="text-gray-900 text-sm font-semibold">
                    {booking.currency} {feeBreakdown.platformFee.toLocaleString()}
                  </Text>
                </View>

                {/* VAT (5%) */}
                <View className="flex-row items-center justify-between py-3 border-b border-gray-100">
                  <Text className="text-gray-600 text-sm">VAT (5% on fee)</Text>
                  <Text className="text-gray-900 text-sm font-semibold">
                    {booking.currency} {feeBreakdown.vat.toLocaleString()}
                  </Text>
                </View>

                {/* Banking Fee (2.9%) */}
                <View className="flex-row items-center justify-between py-3 border-b border-gray-100">
                  <Text className="text-gray-600 text-sm">Banking Fee (2.9%)</Text>
                  <Text className="text-gray-900 text-sm font-semibold">
                    {booking.currency} {feeBreakdown.bankingFee.toLocaleString()}
                  </Text>
                </View>

                {/* Total */}
                <View className="flex-row items-center justify-between py-3 pt-4 border-t-2 border-gray-200">
                  <Text className="text-gray-900 text-base font-bold">Total</Text>
                  <Text className="text-orange-600 text-lg font-bold">
                    {booking.currency} {booking.total_price.toLocaleString()}
                  </Text>
                </View>
              </SectionCard>
            </Animated.View>

            {/* Payment Receipt */}
            {payments.length > 0 ? (
              <Animated.View entering={FadeInUp.delay(300).duration(400)}>
                <SectionCard>
                  {payments.map((payment, index) => (
                    <View key={payment.id}>
                      <View className="flex-row items-center justify-between">
                        <View className="flex-1">
                          <Text className="text-gray-900 text-sm font-semibold">Payment</Text>
                          <Text className="text-gray-500 text-xs mt-0.5">
                            Paid on {format(new Date(payment.created_at), 'MMM d, yyyy')}
                          </Text>
                        </View>
                        <View className="flex-row items-center gap-2">
                          <Text className="text-orange-600 font-semibold">
                            {booking.currency} {payment.amount.toLocaleString()}
                          </Text>
                          <View className="bg-green-100 px-2 py-1 rounded-full">
                            <Text className="text-green-700 text-xs font-semibold">Paid</Text>
                          </View>
                        </View>
                      </View>
                      {index < payments.length - 1 ? (
                        <View className="border-t border-gray-100 mt-3 pt-3" />
                      ) : null}
                    </View>
                  ))}
                </SectionCard>
              </Animated.View>
            ) : null}

            {/* Payment Timeline / Milestones */}
            {milestones.length > 0 ? (
              <Animated.View entering={FadeInUp.delay(350).duration(400)}>
                <SectionCard title="Payment Timeline">
                  {milestones.map((milestone, index) => {
                    const statusColors: Record<string, { bg: string; text: string }> = {
                      paid: { bg: 'bg-green-100', text: 'text-green-700' },
                      pending: { bg: 'bg-yellow-100', text: 'text-yellow-700' },
                      in_escrow: { bg: 'bg-blue-100', text: 'text-blue-700' },
                    };
                    const colors = statusColors[milestone.status] || { bg: 'bg-gray-100', text: 'text-gray-700' };
                    const displayDate = milestone.paid_at || milestone.due_at;

                    return (
                      <View key={milestone.id}>
                        <View className="flex-row items-start justify-between">
                          <View className="flex-1">
                            <Text className="text-gray-900 font-semibold text-sm">{milestone.name}</Text>
                            {milestone.description ? (
                              <Text className="text-gray-600 text-xs mt-0.5">{milestone.description}</Text>
                            ) : null}
                            {displayDate ? (
                              <Text className="text-gray-500 text-xs mt-1">
                                {format(new Date(displayDate), 'MMM d, yyyy')}
                              </Text>
                            ) : null}
                          </View>
                          <View className="ml-2 items-end">
                            <Text className="text-gray-900 font-semibold">
                              {booking.currency} {milestone.amount.toLocaleString()}
                            </Text>
                            <View className={`${colors.bg} px-2 py-1 rounded-full mt-1`}>
                              <Text className={`${colors.text} text-xs font-semibold`}>
                                {milestone.status === 'in_escrow' ? 'In Escrow' : milestone.status.charAt(0).toUpperCase() + milestone.status.slice(1)}
                              </Text>
                            </View>
                          </View>
                        </View>
                        {index < milestones.length - 1 ? (
                          <View className="border-t border-gray-100 mt-3 pt-3" />
                        ) : null}
                      </View>
                    );
                  })}
                </SectionCard>
              </Animated.View>
            ) : null}

            {/* SECTION 2: Documents */}
            <Animated.View entering={FadeInUp.delay(400).duration(400)}>
              <SectionCard title="Documents">
                {invoices.length === 0 && fileAssets.length === 0 ? (
                  <View className="items-center justify-center py-6">
                    <Text className="text-gray-500 text-sm">No documents available yet</Text>
                  </View>
                ) : (
                  <>
                    {/* Invoices */}
                    {invoices.map((invoice, index) => (
                      <View key={invoice.id}>
                        <Pressable className="flex-row items-center justify-between py-3">
                          <View className="flex-row items-center flex-1">
                            <FileText size={18} color="#6B7280" />
                            <View className="ml-3 flex-1">
                              <Text className="text-gray-900 text-sm font-medium">Invoice #{invoice.invoice_number}</Text>
                              <Text className="text-gray-500 text-xs mt-0.5">
                                {format(new Date(invoice.issued_at), 'MMM d, yyyy')}
                              </Text>
                            </View>
                          </View>
                          <View className="flex-row items-center gap-2">
                            <View className="bg-green-100 px-2 py-1 rounded-full">
                              <Text className="text-green-700 text-xs font-semibold">
                                {invoice.status === 'paid' ? 'Paid' : invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1)}
                              </Text>
                            </View>
                            <ExternalLink size={16} color="#6B7280" />
                          </View>
                        </Pressable>
                        {index < invoices.length - 1 || fileAssets.length > 0 ? (
                          <View className="border-t border-gray-100" />
                        ) : null}
                      </View>
                    ))}

                    {/* Document Files */}
                    {fileAssets
                      .filter((file) =>
                        ['pdf', 'document', 'word'].some((type) => file.file_type?.toLowerCase().includes(type))
                      )
                      .map((file, index, filteredFiles) => (
                        <View key={file.id}>
                          <Pressable className="flex-row items-center justify-between py-3">
                            <View className="flex-row items-center flex-1">
                              <FileText size={18} color="#6B7280" />
                              <View className="ml-3 flex-1">
                                <Text className="text-gray-900 text-sm font-medium">{file.name}</Text>
                                <Text className="text-gray-500 text-xs mt-0.5">
                                  {format(new Date(file.created_at), 'MMM d, yyyy')}
                                </Text>
                              </View>
                            </View>
                            <ExternalLink size={16} color="#6B7280" />
                          </Pressable>
                          {index < filteredFiles.length - 1 ? (
                            <View className="border-t border-gray-100" />
                          ) : null}
                        </View>
                      ))}
                  </>
                )}
              </SectionCard>
            </Animated.View>

            {/* SECTION 3: Request Refund & Report Issue */}
            {['confirmed', 'in_progress'].includes(booking.status) ? (
              <Animated.View entering={FadeInUp.delay(450).duration(400)}>
                <Pressable
                  onPress={() => setDisputeDialogOpen(true)}
                  className="mx-4 mb-4 px-4 py-3 rounded-xl flex-row items-center"
                  style={{
                    backgroundColor: '#FEF3C7',
                    borderWidth: 1,
                    borderColor: '#FDE047',
                  }}
                >
                  <Wallet size={18} color="#F59E0B" />
                  <Text className="text-amber-900 text-sm font-semibold ml-2 flex-1">Request Refund</Text>
                  <ChevronRight size={18} color="#F59E0B" />
                </Pressable>
              </Animated.View>
            ) : null}

            {/* Refund Cases */}
            {disputes
              .filter((d) => d.reason.startsWith('refund_request:'))
              .map((dispute) => (
                <Animated.View key={dispute.id} entering={FadeInUp.delay(500).duration(400)}>
                  <SectionCard>
                    <View className="flex-row items-start gap-3">
                      <AlertCircle size={20} color="#F97316" />
                      <View className="flex-1">
                        <View className="flex-row items-center justify-between">
                          <Text className="text-gray-900 font-semibold">Refund Request</Text>
                          <View className="bg-yellow-100 px-2 py-1 rounded-full">
                            <Text className="text-yellow-700 text-xs font-semibold">Under Review</Text>
                          </View>
                        </View>
                        <Text className="text-gray-600 text-sm mt-2">
                          {dispute.reason.replace('refund_request:', '').replace(/_/g, ' ')}
                        </Text>
                        <Text className="text-gray-500 text-xs mt-1">
                          Submitted {format(new Date(dispute.created_at), 'MMM d, yyyy')}
                        </Text>
                        <Pressable
                          className="mt-2 px-3 py-1.5 rounded-lg bg-red-100"
                          onPress={() => {
                            Alert.alert(
                              'Cancel Refund Request',
                              'Are you sure you want to cancel this refund request?',
                              [
                                { text: 'No', style: 'cancel' },
                                {
                                  text: 'Yes, Cancel',
                                  style: 'destructive',
                                  onPress: async () => {
                                    const { error } = await supabase
                                      .from('disputes')
                                      .update({ status: 'cancelled' })
                                      .eq('id', dispute.id);
                                    if (!error) fetchBookingData();
                                  },
                                },
                              ]
                            );
                          }}
                        >
                          <Text className="text-red-600 text-xs font-semibold">Cancel Request</Text>
                        </Pressable>
                      </View>
                    </View>
                  </SectionCard>
                </Animated.View>
              ))}

            {/* Report an Issue Button */}
            <Animated.View entering={FadeInUp.delay(550).duration(400)}>
              <Pressable
                onPress={() => setDisputeDialogOpen(true)}
                className="mx-4 mb-4 px-4 py-3 rounded-xl flex-row items-center"
                style={{
                  backgroundColor: 'rgba(239, 68, 68, 0.1)',
                  borderWidth: 1,
                  borderColor: '#FECACA',
                }}
              >
                <AlertCircle size={18} color="#EF4444" />
                <Text className="text-red-600 text-sm font-semibold ml-2 flex-1">Report an Issue</Text>
                <ChevronRight size={18} color="#EF4444" />
              </Pressable>
            </Animated.View>
          </>
        ) : null}
      </ScrollView>

      {/* Review Dialog */}
      <ReviewDialog
        visible={reviewDialogOpen}
        onClose={() => setReviewDialogOpen(false)}
        onSubmit={handleReviewSubmit}
        talentName={primaryTalent?.profile.full_name || 'Talent'}
        talentAvatar={primaryTalent?.profile.avatar_url || PLACEHOLDER_AVATAR}
      />

      {/* Payment Dialog */}
      <PaymentDialog
        visible={paymentDialogOpen}
        onClose={() => setPaymentDialogOpen(false)}
        onPayWithWallet={handlePayWithWallet}
        onPayWithCard={handlePayWithCard}
        bookingId={id || ''}
        totalPrice={booking.total_price}
        currency={booking.currency}
        walletBalance={walletBalance}
      />

      {/* Dispute Dialog */}
      <DisputeDialog
        visible={disputeDialogOpen}
        onClose={() => {
          setDisputeDialogOpen(false);
          setShowRefundResult(false);
          setRefundData(null);
          setReason('');
          setDetails('');
        }}
        onSubmit={handleDisputeSubmit}
        bookingId={id || ''}
        talentName={primaryTalent?.profile.full_name || 'Talent'}
        showRefundResult={showRefundResult}
        refundData={refundData}
        isSubmitting={isSubmitting}
      />

      {/* Confirm Work Completion Dialog */}
      <ConfirmWorkCompletionDialog
        visible={showConfirmApproveDialog}
        onClose={() => setShowConfirmApproveDialog(false)}
        onConfirm={approveWork}
        isLoading={isApprovingWork}
        talentName={primaryTalent?.profile.full_name || 'the talent'}
      />

      {/* Menu Modal */}
      <Modal
        visible={menuVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setMenuVisible(false)}
      >
        <Pressable
          className="flex-1 bg-black/50"
          onPress={() => setMenuVisible(false)}
        >
          <View className="absolute top-20 right-4 bg-white rounded-xl shadow-lg overflow-hidden" style={{ width: 200 }}>
            <Pressable className="px-4 py-3 border-b border-gray-100" onPress={() => {
              setMenuVisible(false);
              Alert.alert('Contract', 'No contract available for this booking yet.');
            }}>
              <Text className="text-gray-900 text-sm">View Contract</Text>
            </Pressable>
            <Pressable className="px-4 py-3 border-b border-gray-100" onPress={() => {
              setMenuVisible(false);
              Share.share({ message: `Check out my booking on Engage: ${booking.title || booking.name || 'Booking'}` });
            }}>
              <Text className="text-gray-900 text-sm">Share Workspace</Text>
            </Pressable>
            <Pressable className="px-4 py-3 border-b border-gray-100" onPress={() => {
              setMenuVisible(false);
              setDisputeDialogOpen(true);
            }}>
              <Text className="text-gray-900 text-sm">Report Issue</Text>
            </Pressable>
            <Pressable className="px-4 py-3" onPress={() => {
              setMenuVisible(false);
              Alert.alert(
                'Cancel Booking',
                'Are you sure you want to cancel this booking? This action cannot be undone.',
                [
                  { text: 'Keep Booking', style: 'cancel' },
                  {
                    text: 'Cancel Booking',
                    style: 'destructive',
                    onPress: async () => {
                      const { error } = await supabase
                        .from('bookings')
                        .update({ status: 'cancelled' })
                        .eq('id', id);
                      if (!error) fetchBookingData();
                    },
                  },
                ]
              );
            }}>
              <Text className="text-red-500 text-sm">Cancel Booking</Text>
            </Pressable>
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}
