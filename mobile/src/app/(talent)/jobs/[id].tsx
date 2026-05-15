import { View, Text, ScrollView, Pressable, Image, Modal, RefreshControl, TextInput, Linking, Clipboard } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useRouter } from '@/lib/router-helper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '@/lib/theme/ThemeContext';
import { ContractDialog } from '@/components/ContractDialog';
import { FileDelivery } from '@/components/FileDelivery';
import { ProjectChat } from '@/components/workspace/ProjectChat';
import { ActionBanner } from '@/components/ActionBanner';
import { ConfirmWorkCompletionDialog } from '@/components/ConfirmWorkCompletionDialog';
import { useWorkCompletion } from '@/hooks/useWorkCompletion';
import { useReschedule } from '@/hooks/useReschedule';
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
  Copy,
  Navigation,
} from 'lucide-react-native';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { format, differenceInHours, isSameDay } from 'date-fns';
import { SkeletonLoader } from '@/components/SkeletonLoader';
import { extractErrorMessage } from '@/lib/errorUtils';

const PLACEHOLDER_AVATAR = 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&h=200&fit=crop';

// Service-based categories where Files tab is hidden
const SERVICE_BASED_CATEGORIES = [
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
];

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
  call_sheet_json?: any;
  created_at: string;
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

interface ClientCompanyData {
  company_name?: string;
  account_type?: string;
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

interface JobWorkspaceData {
  booking: BookingData;
  clientProfile: ProfileData & ClientCompanyData;
  currentUserProfile?: ProfileData;
  currentUserTalent: TalentData;
  talentProfile: TalentProfile;
  brief?: Brief;
  payout?: Payout;
  payments: Payment[];
  milestones: Milestone[];
  invoices: Invoice[];
  fileAssets: FileAsset[];
  disputes: Dispute[];
  bankAccount?: any;
  isVerified: boolean;
}

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
  const { isDark } = useTheme();
  return (
    <View
      className={`mx-4 mb-4 p-4 rounded-2xl ${isDark ? 'bg-[#1A1A1A]' : 'bg-white'}`}
      style={{
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
        elevation: 3,
      }}
    >
      {title ? (
        <Text className={`text-xs font-semibold uppercase tracking-wider mb-3 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
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
  onPress,
}: {
  icon: React.ComponentType<{ size: number; color: string }>;
  iconColor?: string;
  label: string;
  value: string;
  valueColor?: string;
  onPress?: () => void;
}) {
  const { isDark } = useTheme();
  return (
    <Pressable onPress={onPress}>
      <View className={`flex-row items-center py-3 border-b ${isDark ? 'border-gray-700' : 'border-gray-100'}`}>
        <View className={`w-10 h-10 rounded-full ${isDark ? 'bg-gray-800' : 'bg-gray-50'} items-center justify-center mr-3`}>
          <Icon size={18} color={iconColor} />
        </View>
        <View className="flex-1">
          <Text className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>{label}</Text>
          <Text className={`text-sm font-medium mt-0.5 ${isDark ? 'text-white' : 'text-gray-900'} ${valueColor || ''}`}>
            {value}
          </Text>
        </View>
      </View>
    </Pressable>
  );
}

// Tab Navigation Component
function TabNavigation({
  activeTab,
  onTabChange,
  visibleTabs,
}: {
  activeTab: string;
  onTabChange: (tab: string) => void;
  visibleTabs: string[];
}) {
  const { isDark } = useTheme();
  return (
    <View className={`flex-row ${isDark ? 'bg-[#1A1A1A] border-gray-800' : 'bg-white border-gray-200'} border-b`}>
      {visibleTabs.map((tab) => (
        <Pressable
          key={tab}
          onPress={() => onTabChange(tab.toLowerCase())}
          className="flex-1 py-3 border-b-2"
          style={{
            borderBottomColor: activeTab === tab.toLowerCase() ? '#FA5610' : 'transparent',
          }}
        >
          <Text
            className={`text-center text-sm font-semibold ${
              activeTab === tab.toLowerCase()
                ? 'text-orange-500'
                : isDark ? 'text-gray-400' : 'text-gray-500'
            }`}
          >
            {tab}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

export default function TalentJobWorkspaceScreen() {
  const { id, tab } = useLocalSearchParams<{ id: string; tab?: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { isDark } = useTheme();

  const [jobData, setJobData] = useState<JobWorkspaceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState(tab || 'gig details');
  const [menuVisible, setMenuVisible] = useState(false);
  const [showMarkDeliveredDialog, setShowMarkDeliveredDialog] = useState(false);
  const [showContractDialog, setShowContractDialog] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  // Initialize work completion hook
  const { markWorkDelivered, isMarkingDelivered } = useWorkCompletion({
    bookingId: id || '',
    onSuccess: () => {
      setShowMarkDeliveredDialog(false);
      // Refetch job data to update the banner
      fetchJobData();
    },
  });

  const fetchJobData = useCallback(async () => {
    if (!id) {
      console.warn('No job ID provided');
      return;
    }


    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Store current user ID
      setCurrentUserId(user.id);

      // BATCH 1: Fetch primary booking + get talent profile ID (sequential, needed for next batch)
      const { data: booking, error: bookingError } = await supabase
        .from('bookings')
        .select('id, client_id, status, scheduled_start, scheduled_end, location_text, total_price, currency, brief_id, created_at, talent_marked_delivered_at, client_marked_completed_at, call_sheet_json')
        .eq('id', id)
        .maybeSingle();

      if (bookingError) {
        console.error('Booking fetch error details:', {
          message: bookingError.message,
          code: bookingError.code,
          details: bookingError.details,
        });
        throw new Error(`Failed to fetch booking: ${bookingError.message}`);
      }

      if (!booking) {
        console.warn('Booking not found for ID:', id);
        throw new Error('Booking not found');
      }


      // Get talent profile ID (needed for parallel batch 2)
      const { data: talentProfile } = await supabase
        .from('talent_profiles')
        .select('id, user_id, category, bio, rating, is_verified')
        .eq('user_id', user.id)
        .maybeSingle();

      if (!talentProfile) throw new Error('Talent profile not found');

      // BATCH 2: All queries that depend only on booking/user IDs (parallel)
      const batch2Results = await Promise.all([
        // Fetch client profile
        supabase
          .from('profiles')
          .select('id, full_name, avatar_url, email, phone')
          .eq('id', booking.client_id)
          .maybeSingle(),
        // Fetch current user (talent) profile
        supabase
          .from('profiles')
          .select('id, full_name, avatar_url, email, phone')
          .eq('id', user.id)
          .maybeSingle(),
        // Fetch client company info
        supabase
          .from('client_companies')
          .select('company_name, account_type')
          .eq('user_id', booking.client_id)
          .maybeSingle(),
        // Fetch booking_talents entry - try without talent_id filter first if it fails
        supabase
          .from('booking_talents')
          .select('id, talent_id, role_category, rate_price, status')
          .eq('booking_id', id)
          .maybeSingle(),
        // Fetch bank account
        supabase
          .from('bank_accounts')
          .select('id, user_id, account_holder, bank_name, iban, swift_code, country, is_primary')
          .eq('user_id', user.id)
          .maybeSingle(),
      ]);

      const [clientProfileResult, currentUserProfileResult, clientCompanyResult, bookingTalentResult, bankDataResult] = batch2Results;
      const clientProfile = clientProfileResult.data;
      const currentUserProfile = currentUserProfileResult.data;
      const clientCompany = clientCompanyResult.data;
      let bookingTalent = bookingTalentResult.data;
      const bankData = bankDataResult.data;

      // If bookingTalent is not found, create a default one with basic info
      if (!bookingTalent) {
        console.warn('booking_talents entry not found, using fallback');
        bookingTalent = {
          id: `fallback-${id}`,
          talent_id: talentProfile.id,
          role_category: talentProfile.category || 'unknown',
          rate_price: booking.total_price || 0,
          status: booking.status || 'pending_acceptance',
        };
      }

      // BATCH 3: All financial and document queries (parallel)
      const batch3Results = await Promise.all([
        // Fetch payout
        supabase
          .from('payouts')
          .select('id, amount, currency, status, stripe_transfer_id, transferred_at')
          .eq('booking_id', id)
          .maybeSingle(),
        // Fetch payments
        supabase
          .from('payments')
          .select('id, amount, status, created_at')
          .eq('booking_id', id)
          .eq('status', 'completed')
          .order('created_at', { ascending: false }),
        // Fetch milestones
        supabase
          .from('milestones')
          .select('id, name, description, amount, status, paid_at, due_at')
          .eq('booking_id', id)
          .order('created_at', { ascending: true }),
        // Fetch invoices
        supabase
          .from('invoices')
          .select('id, invoice_number, status, issued_at, pdf_url')
          .eq('booking_id', id)
          .order('issued_at', { ascending: false }),
        // Fetch file assets
        supabase
          .from('file_assets')
          .select('id, name, file_type, url, created_at')
          .eq('booking_id', id)
          .order('created_at', { ascending: false }),
        // Fetch disputes
        supabase
          .from('disputes')
          .select('id, booking_id, opened_by_user_id, reason, details, status, created_at, resolved_at')
          .eq('booking_id', id)
          .order('created_at', { ascending: false }),
      ]);

      const [payoutResult, paymentsResult, milestonesResult, invoicesResult, fileAssetsResult, disputesResult] = batch3Results;
      const payoutData = payoutResult.data || undefined;
      const paymentsData = paymentsResult.data || [];
      const milestonesData = milestonesResult.data || [];
      const invoicesData = invoicesResult.data || [];
      const fileAssetsData = fileAssetsResult.data || [];
      const disputesData = disputesResult.data || [];

      // BATCH 4: Fetch brief if it exists (single query, no dependency)
      let brief: Brief | undefined;
      if (booking.brief_id) {
        const { data: briefData } = await supabase
          .from('briefs')
          .select('id, title, objective, duration_hours, notes_text')
          .eq('id', booking.brief_id)
          .maybeSingle();
        brief = briefData || undefined;
      }

      setJobData({
        booking,
        clientProfile: {
          ...(clientProfile || { id: booking.client_id, full_name: 'Unknown' }),
          company_name: clientCompany?.company_name,
          account_type: clientCompany?.account_type,
        },
        currentUserProfile: currentUserProfile || undefined,
        currentUserTalent: bookingTalent,
        talentProfile: talentProfile || { id: '', user_id: user.id, category: 'unknown' },
        brief,
        payout: payoutData,
        payments: paymentsData || [],
        milestones: milestonesData || [],
        invoices: invoicesData || [],
        fileAssets: fileAssetsData || [],
        disputes: disputesData || [],
        bankAccount: bankData,
        isVerified: talentProfile?.is_verified || false,
      });
    } catch (err) {
      const errorMsg = extractErrorMessage(err);
      console.error('Error fetching job data:', errorMsg);
      // Redirect back to jobs page on error
      setTimeout(() => {
        router.back();
      }, 500);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [id]);

  useEffect(() => {
    fetchJobData();

    // Set up real-time subscriptions for payment updates
    if (!id) return;

    // Subscribe to payment changes
    const paymentChannel = supabase.channel(`payments:${id}`).on(
      'postgres_changes',
      {
        event: '*', // Listen to all changes
        schema: 'public',
        table: 'payments',
        filter: `booking_id=eq.${id}`,
      },
      (payload) => {
        // Refetch job data when payments change
        fetchJobData();
      }
    ).subscribe();

    // Subscribe to payout changes
    const payoutChannel = supabase.channel(`payouts:${id}`).on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'payouts',
        filter: `booking_id=eq.${id}`,
      },
      (payload) => {
        // Refetch job data when payouts change
        fetchJobData();
      }
    ).subscribe();

    // Subscribe to milestone changes
    const milestoneChannel = supabase.channel(`milestones:${id}`).on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'milestones',
        filter: `booking_id=eq.${id}`,
      },
      (payload) => {
        // Refetch job data when milestones change
        fetchJobData();
      }
    ).subscribe();

    // Cleanup subscriptions on unmount
    return () => {
      paymentChannel.unsubscribe();
      payoutChannel.unsubscribe();
      milestoneChannel.unsubscribe();
    };
  }, [fetchJobData, id]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchJobData();
  }, [fetchJobData]);

  const handleMarkWorkDelivered = useCallback(async () => {
    if (!id) return;
    try {
      const { error } = await supabase
        .from('bookings')
        .update({ talent_marked_delivered_at: new Date().toISOString() })
        .eq('id', id);

      if (error) throw error;
      setShowMarkDeliveredDialog(false);
      fetchJobData();
    } catch (err) {
      const errorMsg = extractErrorMessage(err);
      console.error('Error marking work delivered:', errorMsg);
    }
  }, [id, fetchJobData]);

  if (loading) {
    return (
      <View className={`flex-1 ${isDark ? 'bg-[#0A0A0A]' : 'bg-white'}`}>
        <LinearGradient colors={isDark ? ['#1A1A1A', '#0F0F0F'] : ['#FFFFFF', '#F8F8F8']} style={{ paddingTop: insets.top }}>
          <View className="flex-row items-center justify-between px-4 py-3">
            <View className={`w-10 h-10 rounded-full ${isDark ? 'bg-gray-800' : 'bg-gray-100'}`} />
            <View className="flex-row items-center gap-2 flex-1 ml-3">
              <SkeletonLoader width={40} height={40} borderRadius={20} />
              <View className="flex-1">
                <SkeletonLoader width="60%" height={16} borderRadius={4} style={{ marginBottom: 4 }} />
                <SkeletonLoader width="40%" height={12} borderRadius={4} />
              </View>
            </View>
            <View className={`w-10 h-10 rounded-full ${isDark ? 'bg-gray-800' : 'bg-gray-100'}`} />
          </View>
        </LinearGradient>
        <ScrollView className="flex-1" contentContainerStyle={{ paddingBottom: 100 }} scrollEnabled={false}>
          <View className="mx-4 mb-4 mt-2">
            <SkeletonLoader width="100%" height={60} borderRadius={12} />
          </View>
          <View className="mx-4 mb-4">
            <SkeletonLoader width="100%" height={150} borderRadius={12} />
          </View>
          <View className="mx-4 mb-4">
            <SkeletonLoader width="100%" height={200} borderRadius={12} />
          </View>
        </ScrollView>
      </View>
    );
  }

  if (!jobData) {
    return (
      <View className={`flex-1 ${isDark ? 'bg-[#0A0A0A]' : 'bg-white'} items-center justify-center`}>
        <Text className={isDark ? 'text-gray-400' : 'text-gray-500'}>Job not found</Text>
      </View>
    );
  }

  const { booking, clientProfile, currentUserTalent, talentProfile, brief, payout, payments, milestones, invoices, fileAssets, disputes } = jobData;
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

  // Determine visible tabs (hide Files for service-based categories)
  const isServiceBased = SERVICE_BASED_CATEGORIES.includes(talentProfile.category?.toLowerCase() || '');
  const visibleTabs = ['Gig Details', 'Chat', 'Files', 'Payments'];

  const callSheet = booking.call_sheet_json || {};
  const teamContacts = callSheet.team_contacts || [];
  const wardrobeTags = callSheet.wardrobe_tags || [];
  const wardrobeNotes = callSheet.wardrobe_notes || '';

  // Open refund disputes
  const refundDisputes = disputes.filter((d) => d.reason.startsWith('refund_request:') && d.status === 'open');

  return (
    <View className={`flex-1 ${isDark ? 'bg-[#0A0A0A]' : 'bg-[#F8F8F8]'}`}>
      {/* Header */}
      <LinearGradient colors={isDark ? ['#1A1A1A', '#0F0F0F'] : ['#FFFFFF', '#F8F8F8']} style={{ paddingTop: insets.top }}>
        <Animated.View
          entering={FadeInDown.delay(100).duration(400)}
          className="flex-row items-center justify-between px-4 py-3"
        >
          <Pressable
            onPress={() => router.back()}
            className={`w-10 h-10 rounded-full ${isDark ? 'bg-gray-800' : 'bg-gray-100'} items-center justify-center`}
          >
            <ArrowLeft size={20} color={isDark ? '#D1D5DB' : '#374151'} />
          </Pressable>

          {/* Client Info */}
          <View className="flex-row items-center gap-2 flex-1 ml-3">
            <Image
              source={{ uri: clientProfile.avatar_url || PLACEHOLDER_AVATAR }}
              className="w-8 h-8 rounded-full"
            />
            <View className="flex-1">
              <Text className={`text-sm font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                {clientProfile.account_type === 'organization' && clientProfile.company_name
                  ? clientProfile.company_name
                  : clientProfile.full_name}
              </Text>
              <Text className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{talentProfile.category || 'Service'}</Text>
            </View>
          </View>

          <Pressable
            onPress={() => setMenuVisible(true)}
            className={`w-10 h-10 rounded-full ${isDark ? 'bg-gray-800' : 'bg-gray-100'} items-center justify-center`}
          >
            <MoreVertical size={20} color={isDark ? '#D1D5DB' : '#374151'} />
          </Pressable>
        </Animated.View>
      </LinearGradient>

      {/* Tab Navigation - Outside ScrollView so it's always visible */}
      <TabNavigation activeTab={activeTab} onTabChange={setActiveTab} visibleTabs={visibleTabs} />

      {activeTab === 'chat' ? (
        /* CHAT TAB - Full Screen with its own scroll */
        <View className="flex-1">
          <ProjectChat bookingId={booking.id} />
        </View>
      ) : (
        /* OTHER TABS - In ScrollView */
        <ScrollView
          className="flex-1"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#FA5610" />}
        >
          {/* Action Banner - Moved to top */}
          <ActionBanner
            bookingStatus={booking.status}
            talentMarkedDeliveredAt={booking.talent_marked_delivered_at || null}
            clientMarkedCompletedAt={booking.client_marked_completed_at || null}
            scheduledEnd={booking.scheduled_end || null}
            currency={booking.currency}
            totalPrice={booking.total_price}
            payoutAmount={jobData?.currentUserTalent?.rate_price}
            isClient={false}
            talentCategory={talentProfile.category}
            onMarkDelivered={() => setShowMarkDeliveredDialog(true)}
            isMarkingDelivered={isMarkingDelivered}
          />

          {/* Quick Summary - Date, Time, Duration, Location */}
          {startDate ? (
            <Animated.View entering={FadeInUp.delay(250).duration(400)} className="mx-4 mb-3">
            <Text className={`text-xs font-medium ${isDark ? 'text-gray-400' : 'text-gray-600'}`} numberOfLines={2}>
              {dateDisplay} · {timeDisplay}{booking.location_text ? ` · ${booking.location_text}` : ''}
            </Text>
          </Animated.View>
        ) : null}

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

        {/* Refund Alert Banner */}
        {refundDisputes.length > 0 && (
          <Animated.View entering={FadeInDown.delay(200).duration(400)} className="mx-4 mb-4">
            <View className="bg-red-50 border border-red-200 rounded-xl p-4 flex-row items-start gap-3">
              <AlertCircle size={20} color="#EF4444" className="mt-0.5" />
              <View className="flex-1">
                <Text className="text-red-900 font-semibold text-sm">Refund Dispute Open</Text>
                <Text className="text-red-800 text-xs mt-1">
                  {refundDisputes[0]?.details || 'A refund dispute has been opened for this booking'}
                </Text>
              </View>
            </View>
          </Animated.View>
        )}

        {/* Accept/Decline Buttons for pending_acceptance */}
        {currentUserTalent.status === 'pending' && (
          <Animated.View entering={FadeInUp.delay(300).duration(400)} className="mx-4 mb-4 flex-row gap-3">
            <Pressable
              onPress={() => {
                // Validate verification and bank account before accepting
                if (!jobData.isVerified) {
                  router.push('/(talent)/verify' as any);
                  return;
                }
                if (!jobData.bankAccount) {
                  router.push('/(talent)/payouts' as any);
                  return;
                }
                // Accept logic here
              }}
              className="flex-1 py-3 rounded-xl bg-green-500 flex-row items-center justify-center"
            >
              <CheckCircle size={18} color="white" className="mr-2" />
              <Text className="text-white text-sm font-semibold">Accept</Text>
            </Pressable>
            <Pressable
              className="flex-1 py-3 rounded-xl border-2 border-red-500"
            >
              <Text className="text-red-500 text-sm font-semibold text-center">Decline</Text>
            </Pressable>
          </Animated.View>
        )}

        {/* GIG DETAILS TAB */}
        {activeTab === 'gig details' ? (
          <>
            {/* Schedule Card */}
            {startDate ? (
              <Animated.View entering={FadeInUp.delay(250).duration(400)}>
                <SectionCard title="Schedule & Location">
                  <DetailRow
                    icon={Calendar}
                    iconColor="#FA5610"
                    label="Date"
                    value={dateDisplay}
                  />
                  <DetailRow
                    icon={Clock}
                    iconColor="#3B82F6"
                    label="Time"
                    value={timeDisplay}
                  />
                  {booking.location_text ? (
                    <View className="px-4 py-3 rounded-2xl border border-gray-700 bg-gray-800/50 flex-row items-center justify-between">
                      <View className="flex-1">
                        <Text className="text-gray-400 text-xs font-medium mb-1">Location</Text>
                        <Text className="text-white text-sm font-medium">{booking.location_text}</Text>
                      </View>
                      <View className="flex-row items-center gap-3">
                        <Pressable
                          onPress={() => {
                            if (booking.location_text) {
                              Clipboard.setString(booking.location_text);
                            }
                          }}
                          className="w-10 h-10 rounded-lg border border-gray-600 items-center justify-center"
                        >
                          <Copy size={18} color="#9CA3AF" />
                        </Pressable>
                        <Pressable
                          onPress={() => {
                            if (booking.location_text) {
                              Linking.openURL(`https://www.google.com/maps/?q=${encodeURIComponent(booking.location_text)}`);
                            }
                          }}
                          className="w-10 h-10 rounded-lg border border-gray-600 items-center justify-center"
                        >
                          <Navigation size={18} color="#9CA3AF" />
                        </Pressable>
                      </View>
                    </View>
                  ) : null}
                </SectionCard>
              </Animated.View>
            ) : null}

            {/* Client Card */}
            <Animated.View entering={FadeInUp.delay(300).duration(400)}>
              <SectionCard title="Client">
                <View className="flex-row items-center mb-4">
                  <Image
                    source={{ uri: clientProfile.avatar_url || PLACEHOLDER_AVATAR }}
                    className="w-12 h-12 rounded-full"
                  />
                  <View className="flex-1 ml-3">
                    <Text className="text-gray-900 font-semibold text-sm">
                      {clientProfile.account_type === 'organization' && clientProfile.company_name
                        ? clientProfile.company_name
                        : clientProfile.full_name}
                    </Text>
                    {clientProfile.account_type === 'organization' && clientProfile.company_name ? (
                      <Text className="text-gray-500 text-xs mt-0.5">{clientProfile.full_name}</Text>
                    ) : null}
                  </View>
                </View>
                {clientProfile.email ? (
                  <Pressable className="flex-row items-center py-2 gap-2">
                    <Mail size={14} color="#3B82F6" />
                    <Text className="text-blue-600 text-xs">{clientProfile.email}</Text>
                  </Pressable>
                ) : null}
                {clientProfile.phone ? (
                  <Pressable className="flex-row items-center py-2 gap-2">
                    <Phone size={14} color="#22C55E" />
                    <Text className="text-green-600 text-xs">{clientProfile.phone}</Text>
                  </Pressable>
                ) : null}
              </SectionCard>
            </Animated.View>

            {/* Team Contacts */}
            {teamContacts.length > 0 ? (
              <Animated.View entering={FadeInUp.delay(350).duration(400)}>
                <SectionCard title="Team Contacts">
                  {teamContacts.map((contact: any, idx: number) => (
                    <View key={contact.email || contact.phone || `contact-${idx}`} className={idx > 0 ? 'border-t border-gray-100 pt-3 mt-3' : ''}>
                      <Text className="text-gray-900 font-semibold text-sm">{contact.name}</Text>
                      <Text className="text-gray-500 text-xs mt-0.5">{contact.role}</Text>
                      {contact.phone ? (
                        <Pressable className="flex-row items-center py-1 gap-2 mt-1">
                          <Phone size={12} color="#22C55E" />
                          <Text className="text-green-600 text-xs">{contact.phone}</Text>
                        </Pressable>
                      ) : null}
                      {contact.email ? (
                        <Pressable className="flex-row items-center py-1 gap-2">
                          <Mail size={12} color="#3B82F6" />
                          <Text className="text-blue-600 text-xs">{contact.email}</Text>
                        </Pressable>
                      ) : null}
                    </View>
                  ))}
                </SectionCard>
              </Animated.View>
            ) : null}

            {/* Wardrobe Notes */}
            {wardrobeTags.length > 0 || wardrobeNotes ? (
              <Animated.View entering={FadeInUp.delay(400).duration(400)}>
                <SectionCard title="Wardrobe Notes">
                  {wardrobeTags.length > 0 ? (
                    <View className="flex-row flex-wrap gap-2 mb-3">
                      {wardrobeTags.map((tag: string) => (
                        <View key={tag} className="bg-orange-100 px-2 py-1 rounded-full">
                          <Text className="text-orange-700 text-xs font-medium">{tag}</Text>
                        </View>
                      ))}
                    </View>
                  ) : null}
                  {wardrobeNotes ? (
                    <Text className="text-gray-700 text-sm">{wardrobeNotes}</Text>
                  ) : null}
                </SectionCard>
              </Animated.View>
            ) : null}

            {/* Project Details */}
            {brief ? (
              <Animated.View entering={FadeInUp.delay(450).duration(400)}>
                <SectionCard title="Project Details">
                  <Text className="text-gray-900 text-base font-semibold mb-2">{brief.title}</Text>
                  {brief.objective ? (
                    <Text className="text-gray-600 text-sm mb-3">{brief.objective}</Text>
                  ) : null}
                  {brief.notes_text ? (
                    <Text className="text-gray-500 text-sm italic border-t border-gray-100 pt-2 mt-2">
                      {brief.notes_text}
                    </Text>
                  ) : null}
                </SectionCard>
              </Animated.View>
            ) : null}
          </>
        ) : null}

        {/* FILES TAB */}
        {activeTab === 'files' ? (
          <FileDelivery
            bookingId={booking.id}
            isClient={false}
            talentCategory={talentProfile.category}
            bookingStatus={booking.status}
          />
        ) : null}

        {/* PAYMENTS TAB */}
        {activeTab === 'payments' ? (
          <>
            {/* Payment Receipt */}
            {payments.length > 0 && (
              <Animated.View entering={FadeInUp.delay(250).duration(400)}>
                <SectionCard title="Payment Receipt">
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
            )}

            {/* Payment Timeline / Milestones */}
            {milestones.length > 0 && (
              <Animated.View entering={FadeInUp.delay(300).duration(400)}>
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
            )}

            {/* Documents */}
            {(invoices.length > 0 || fileAssets.length > 0) && (
              <Animated.View entering={FadeInUp.delay(350).duration(400)}>
                <SectionCard title="Documents">
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
                      {index < invoices.length - 1 ? (
                        <View className="border-t border-gray-100" />
                      ) : null}
                    </View>
                  ))}
                </SectionCard>
              </Animated.View>
            )}

            {/* Report an Issue Button */}
            <Animated.View entering={FadeInUp.delay(400).duration(400)}>
              <Pressable
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
      )}

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
          <View className={`absolute top-20 right-4 rounded-xl shadow-lg overflow-hidden ${isDark ? 'bg-[#1A1A1A]' : 'bg-white'}`} style={{ width: 200 }}>
            <Pressable className="px-4 py-3" onPress={() => {
              setMenuVisible(false);
              setShowContractDialog(true);
            }}>
              <Text className={`text-sm ${isDark ? 'text-white' : 'text-gray-900'}`}>View Contract</Text>
            </Pressable>
          </View>
        </Pressable>
      </Modal>

      {/* Contract Dialog */}
      {jobData ? (
        <ContractDialog
          visible={showContractDialog}
          onClose={() => setShowContractDialog(false)}
          booking={jobData.booking}
          talentName={jobData.currentUserProfile?.full_name || 'Service Provider'}
          talentRole={jobData.talentProfile?.category || 'Professional'}
          talentEarnings={jobData.currentUserTalent?.rate_price || 0}
          clientName={jobData.clientProfile?.company_name || jobData.clientProfile?.full_name}
        />
      ) : null}

      {/* Confirm Work Completion Dialog */}
      <ConfirmWorkCompletionDialog
        visible={showMarkDeliveredDialog}
        onClose={() => setShowMarkDeliveredDialog(false)}
        onConfirm={() => {
          markWorkDelivered();
          setShowMarkDeliveredDialog(false);
        }}
        isLoading={isMarkingDelivered}
        variant="talent-deliver"
      />
    </View>
  );
}
