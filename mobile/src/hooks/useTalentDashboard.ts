import { useState, useEffect, useCallback, useRef } from 'react';
import { startOfMonth, endOfMonth } from 'date-fns';
import { InteractionManager } from 'react-native';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/lib/state/auth-store';

/**
 * Profile Completion Status
 * Tracks which profile setup steps are completed
 */
export interface ProfileCompletionStep {
  id: number;
  label: string;
  completed: boolean;
  count?: string;
  href: string;
}

/**
 * Core user profile information
 */
export interface UserProfile {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  username: string | null;
  referral_code: string | null;
}

/**
 * Talent-specific profile data
 */
export interface TalentProfileData {
  id: string;
  user_id: string;
  bio: string | null;
  location_text: string | null;
  category: string | null;
  subcategories?: string[] | null;
  hourly_rate: number | null;
  day_rate: number | null;
  session_rate: number | null;
  is_verified: boolean;
  banner_url: string | null;
  instant_book_master_enabled: boolean;
  live_location_enabled: boolean;
  is_available?: boolean;
  avatar_url?: string | null;
  reliability_score?: number | null;
  avg_response_time_hours?: number | null;
  created_at: string;
}

/**
 * Portfolio and media summary
 */
export interface PortfolioSummary {
  projectsCount: number;
  mediaCount: number;
}

/**
 * Availability slot information
 */
export interface AvailabilitySlot {
  id: string;
  talent_id: string;
  date: string;
  time_from: string;
  time_to: string;
  status: string;
  created_at: string;
}

/**
 * Bank account information
 */
export interface BankAccountInfo {
  count: number;
  primary: {
    id: string;
    account_holder_name: string | null;
    bank_name: string | null;
    account_number: string | null;
    iban: string | null;
    currency: string | null;
  } | null;
}

/**
 * Pending booking request from client
 */
export interface PendingRequest {
  id: string;
  booking_id: string;
  talent_id: string;
  status: string;
  clientName: string | null;
  clientAvatar: string | null;
  clientCompany: string | null;
  amount: number;
  currency: string;
  location: string | null;
  datetime: string;
  created_at: string;
  // New fields for detailed card display
  rate_price?: number;
  role_category?: string;
  booking?: {
    id: string;
    status: string;
    scheduled_start: string | null;
    scheduled_end: string | null;
    location_text: string | null;
    total_price: number;
    platform_fee: number;
    currency: string;
    client_id: string;
    is_custom_offer: boolean | null;
  };
}

/**
 * Weekly schedule booking
 */
export interface WeeklyBooking {
  id: string;
  date: string;
  time_from: string;
  time_to: string;
  clientName: string | null;
  clientAvatar: string | null;
  location: string | null;
  bookingId: string;
}

/**
 * Review/rating information
 */
export interface Review {
  id: string;
  rating: number;
  comment: string | null;
  reviewer_name: string;
  created_at: string;
}

/**
 * Monthly earnings breakdown
 */
export interface MonthlyEarnings {
  earnings: number;
  pending: number;
  bookingsCount: number;
  activeBookingsCount: number;
  currency: string;
  lastMonthEarnings: number;
}

/**
 * Dashboard completion metrics
 */
export interface DashboardData {
  profile: UserProfile | null;
  talentProfile: TalentProfileData | null;
  portfolio: PortfolioSummary;
  availabilitySlots: AvailabilitySlot[];
  bankAccounts: BankAccountInfo;
  pendingRequests: PendingRequest[];
  weeklySchedule: WeeklyBooking[];
  reviews: Review[];
  profileViews: number;
  totalJobs: number;
  totalBookings: number;
  monthlyEarnings: MonthlyEarnings;
  replyRate: number; // percentage
  profileCompletion: {
    percentage: number;
    steps: ProfileCompletionStep[];
  };
  visibilityScore: number; // calculated score 0-100
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

/**
 * Hook that fetches all 13 Supabase queries in parallel for the Talent Dashboard
 * Returns comprehensive data with proper typing
 */
export function useTalentDashboard(): DashboardData {
  const user = useAuthStore((s) => s.user);
  const [data, setData] = useState<DashboardData>({
    profile: null,
    talentProfile: null,
    portfolio: { projectsCount: 0, mediaCount: 0 },
    availabilitySlots: [],
    bankAccounts: { count: 0, primary: null },
    pendingRequests: [],
    weeklySchedule: [],
    reviews: [],
    profileViews: 0,
    totalJobs: 0,
    totalBookings: 0,
    monthlyEarnings: { earnings: 0, pending: 0, bookingsCount: 0, activeBookingsCount: 0, currency: 'AED', lastMonthEarnings: 0 },
    replyRate: 0,
    profileCompletion: { percentage: 0, steps: [] },
    visibilityScore: 0,
    isLoading: true,
    error: null,
    refetch: async () => {},
  });

  const fetchDashboardData = useCallback(async () => {
    if (!user?.id) {
      setData((prev) => ({ ...prev, isLoading: false, error: 'User not authenticated' }));
      return;
    }

    try {
      setData((prev) => ({ ...prev, isLoading: true, error: null }));

      // Query 1: Profile
      const profilePromise = supabase
        .from('profiles')
        .select('id, full_name, avatar_url, username, referral_code')
        .eq('id', user.id)
        .single();

      // Query 2: Talent Profile
      const talentProfilePromise = supabase
        .from('talent_profiles')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      // Query 3: Portfolio Projects Count
      // Will fetch after talent profile is available

      // Query 4: Portfolio Media Count
      // Will fetch after talent profile is available

      // Query 5: Availability Slots
      // Will fetch after talent profile is available

      // Query 6: Bank Accounts
      // Will fetch for user

      // Query 7: Pending Requests
      // Will fetch after talent profile is available

      // Query 8: Weekly Schedule
      // Will fetch after talent profile is available

      // Query 9: Reviews
      // Will fetch for user

      // Query 10: Profile Views
      // Will fetch after talent profile is available

      // Query 11: Total Jobs
      // Will fetch after talent profile is available

      // Query 12: Monthly Earnings
      // Will fetch after talent profile is available

      // Query 13: Reply Rate
      // Will fetch after talent profile is available

      const [profileResult, talentProfileResult, bankAccountsResult, reviewsResult] = await Promise.all([
        profilePromise,
        talentProfilePromise,
        supabase.from('bank_accounts').select('id, account_holder_name, bank_name, account_number, iban, currency').eq('user_id', user.id),
        supabase.from('reviews').select('id, rating, comment, reviewer_user_id, created_at').eq('reviewee_user_id', user.id).order('created_at', { ascending: false }).limit(5),
      ]);

      const profile = profileResult.data || null;
      const talentProfile = talentProfileResult.data || null;

      if (!talentProfile) {
        setData((prev) => ({
          ...prev,
          profile,
          talentProfile: null,
          isLoading: false,
          error: 'Talent profile not found',
        }));
        return;
      }

      // Now fetch remaining queries with talent_id
      const [
        portfolioProjectsResult,
        portfolioItemsResult,
        availabilitySlotsResult,
        pendingRequestsResult,
        weeklyScheduleResult,
        profileViewsResult,
        totalJobsResult,
        monthlyEarningsResult,
        bookingTalentsForReplyRateResult,
        monthlyBookingTalentsResult,
        allBookingsResult,
        acceptedBookingTalentsResult,
      ] = await Promise.all([
        // Query 3: Portfolio Projects Count
        supabase.from('portfolio_projects').select('id', { count: 'exact' }).eq('talent_id', talentProfile.id),

        // Query 4: Portfolio Media Count
        supabase
          .from('portfolio_items')
          .select('id', { count: 'exact' })
          .eq('talent_id', talentProfile.id)
          .eq('approved_status', 'approved'),

        // Query 5: Availability Slots
        supabase
          .from('availability_slots')
          .select('*')
          .eq('talent_id', talentProfile.id)
          .eq('status', 'available'),

        // Query 7: Pending booking_talents (no joins - will fetch bookings separately)
        supabase
          .from('booking_talents')
          .select('id, booking_id, talent_id, status, rate_price, role_category, created_at')
          .eq('talent_id', talentProfile.id)
          .eq('status', 'pending')
          .order('created_at', { ascending: false }),

        // Query 8: Weekly Schedule
        supabase
          .from('booking_talents')
          .select(
            `
            id,
            booking_id,
            talent_id,
            bookings:booking_id(
              id,
              status,
              scheduled_start,
              scheduled_end,
              location_text,
              client_id
            )
          `
          )
          .eq('talent_id', talentProfile.id)
          .eq('status', 'accepted'),

        // Query 10: Profile Views (last 30 days)
        supabase
          .from('profile_views')
          .select('*', { count: 'exact', head: true })
          .eq('talent_id', talentProfile.id)
          .gte('viewed_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()),

        // Query 11: Total Jobs (count booking_talents with accepted status)
        supabase
          .from('booking_talents')
          .select('id', { count: 'exact' })
          .eq('talent_id', talentProfile.id)
          .eq('status', 'accepted'),

        // Query 12: Monthly Earnings from payouts table
        supabase
          .from('payouts')
          .select('id, amount, status, transferred_at, created_at, booking_id')
          .eq('talent_id', talentProfile.id)
          .gte('created_at', new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString()),

        // Query 13: All booking_talents for reply rate calculation (no date filter, no status filter except cancelled)
        supabase
          .from('booking_talents')
          .select('id, status, auto_declined_at')
          .eq('talent_id', talentProfile.id)
          .neq('status', 'cancelled'),

        // Query 14: ALL accepted booking_talents with parent booking details for monthly earnings calculation
        supabase
          .from('booking_talents')
          .select('id, status, booking_id, created_at, accepted_at, rate_price, bookings:booking_id(id, status, scheduled_start)')
          .eq('talent_id', talentProfile.id)
          .eq('status', 'accepted'),

        // Query 15: bookings for monthly bookings join
        supabase
          .from('bookings')
          .select('id, status, scheduled_start'),

        // Query 16: Accepted booking_talents for total bookings calculation
        supabase
          .from('booking_talents')
          .select('booking_id')
          .eq('talent_id', talentProfile.id)
          .eq('status', 'accepted'),
      ]);

      // Process Profile Views
      const profileViews = profileViewsResult.count || 0;

      // Process Total Jobs
      const totalJobs = totalJobsResult.count || 0;

      // Process Portfolio
      const portfolioProjectsCount = portfolioProjectsResult.count || 0;
      const portfolioMediaCount = portfolioItemsResult.count || 0;

      // Process Availability Slots
      const availabilitySlots = (availabilitySlotsResult.data || []) as AvailabilitySlot[];

      // Process Bank Accounts
      const bankAccountsData = bankAccountsResult.data || [];
      const bankAccountInfo: BankAccountInfo = {
        count: bankAccountsData.length,
        primary: bankAccountsData.length > 0 ? {
          id: bankAccountsData[0].id,
          account_holder_name: bankAccountsData[0].account_holder_name,
          bank_name: bankAccountsData[0].bank_name,
          account_number: bankAccountsData[0].account_number,
          iban: bankAccountsData[0].iban,
          currency: bankAccountsData[0].currency,
        } : null,
      };

      // Process Pending Requests with 3-query approach
      const bookingTalentsRaw = (pendingRequestsResult.data || []) as any[];

      // Step 1: Extract booking IDs and fetch bookings
      const bookingIds = [...new Set(bookingTalentsRaw.map((bt) => bt.booking_id))];

      let pendingBookingsData: any[] = [];
      let pendingBookingsMap: Record<string, any> = {};

      if (bookingIds.length > 0) {
        const bookingsResult = await supabase
          .from('bookings')
          .select('id, status, scheduled_start, scheduled_end, location_text, total_price, platform_fee, currency, client_id, is_custom_offer')
          .in('id', bookingIds);

        pendingBookingsData = bookingsResult.data || [];
        pendingBookingsMap = pendingBookingsData.reduce((acc, b) => {
          acc[b.id] = b;
          return acc;
        }, {} as Record<string, any>);
      }

      // Step 2: Extract client IDs from bookings
      const clientIds = [...new Set(pendingBookingsData.map((b) => b.client_id).filter(Boolean))];

      // Step 3: Fetch client profiles and company data
      let clientsMap: Record<string, any> = {};

      if (clientIds.length > 0) {
        const [clientProfilesResult, clientCompaniesResult] = await Promise.all([
          supabase
            .from('profiles')
            .select('id, full_name, avatar_url')
            .in('id', clientIds),
          supabase
            .from('client_companies')
            .select('user_id, company_name, account_type')
            .in('user_id', clientIds),
        ]);

        console.log('[useTalentDashboard] Client data fetched:', {
          profilesCount: clientProfilesResult.data?.length,
          companiesCount: clientCompaniesResult.data?.length,
          profilesData: clientProfilesResult.data?.slice(0, 2),
          companiesData: clientCompaniesResult.data?.slice(0, 2),
        });

        // Build companiesMap
        const companiesMap = (clientCompaniesResult.data || []).reduce((acc, c) => {
          acc[c.user_id] = {
            company_name: c.company_name,
            account_type: c.account_type,
          };
          return acc;
        }, {} as Record<string, any>);

        // Build clientsMap by merging profiles and companies
        clientsMap = (clientProfilesResult.data || []).reduce((acc, p) => {
          const company = companiesMap[p.id];
          acc[p.id] = {
            id: p.id,
            full_name: p.full_name,
            avatar_url: p.avatar_url,
            company_name: company?.company_name || null,
            account_type: company?.account_type || null,
          };
          return acc;
        }, {} as Record<string, any>);

        console.log('[useTalentDashboard] ClientsMap built:', {
          clientCount: Object.keys(clientsMap).length,
          sample: Object.values(clientsMap).slice(0, 2),
        });
      }

      // Step 4: Combine everything
      const pendingRequests: PendingRequest[] = bookingTalentsRaw.map((bt) => {
        const booking = pendingBookingsMap[bt.booking_id] || {};
        const clientId = booking.client_id;
        const client = clientsMap[clientId] || {};
        const scheduledStart = booking.scheduled_start ? new Date(booking.scheduled_start) : null;

        const formatDateTime = (date: Date | null): string => {
          if (!date) return 'TBD';
          const today = new Date();
          const isToday = date.toDateString() === today.toDateString();
          const tomorrow = new Date(today);
          tomorrow.setDate(tomorrow.getDate() + 1);
          const isTomorrow = date.toDateString() === tomorrow.toDateString();

          const timeStr = date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
          if (isToday) return `Today at ${timeStr}`;
          if (isTomorrow) return `Tomorrow at ${timeStr}`;
          return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) + ` at ${timeStr}`;
        };

        // Calculate earnings
        let earnings = bt.rate_price || 0;
        if (booking.is_custom_offer) {
          earnings = bt.rate_price;
        } else if (booking.scheduled_start && booking.scheduled_end) {
          const start = new Date(booking.scheduled_start);
          const end = new Date(booking.scheduled_end);
          const durationHours = Math.max(1, (end.getTime() - start.getTime()) / (1000 * 60 * 60));
          earnings = bt.rate_price * durationHours;
        }

        // Determine client name - organization gets company_name, individual gets full_name
        const clientName =
          client.account_type === 'organization' && client.company_name
            ? client.company_name
            : client.full_name || 'Client';

        console.log('[useTalentDashboard] Pending request mapping:', {
          bt_id: bt.id,
          booking_id: booking.id,
          client_id: clientId,
          client_full_name: client.full_name,
          client_company_name: client.company_name,
          client_account_type: client.account_type,
          resolved_clientName: clientName,
        });

        return {
          id: bt.id,
          booking_id: bt.booking_id,
          talent_id: bt.talent_id,
          status: bt.status,
          clientName,
          clientAvatar: client.avatar_url,
          clientCompany: client.company_name,
          amount: earnings,
          currency: booking.currency || 'AED',
          location: booking.location_text,
          datetime: formatDateTime(scheduledStart),
          created_at: bt.created_at,
          rate_price: bt.rate_price,
          role_category: bt.role_category,
          booking: {
            id: booking.id,
            status: booking.status,
            scheduled_start: booking.scheduled_start,
            scheduled_end: booking.scheduled_end,
            location_text: booking.location_text,
            total_price: booking.total_price,
            platform_fee: booking.platform_fee || 0,
            currency: booking.currency || 'AED',
            client_id: booking.client_id,
            is_custom_offer: booking.is_custom_offer,
          },
        };
      });

      // Process Weekly Schedule
      const weeklyScheduleRaw = (weeklyScheduleResult.data || []) as any[];
      const weeklyClientIds = [
        ...new Set(
          weeklyScheduleRaw
            .filter((r) => r.bookings?.[0]?.client_id)
            .map((r) => r.bookings[0].client_id)
        ),
      ];

      let weeklyClientsMap: Record<string, any> = {};
      if (weeklyClientIds.length > 0) {
        const weeklyClientProfilesResult = await supabase
          .from('profiles')
          .select('id, full_name, avatar_url')
          .in('id', weeklyClientIds);

        weeklyClientsMap = (weeklyClientProfilesResult.data || []).reduce((acc, p) => {
          acc[p.id] = {
            full_name: p.full_name,
            avatar_url: p.avatar_url,
          };
          return acc;
        }, {} as Record<string, any>);
      }

      const weeklySchedule: WeeklyBooking[] = weeklyScheduleRaw.map((r) => {
        const booking = r.bookings?.[0] || {};
        const client = weeklyClientsMap[booking.client_id] || {};

        return {
          id: r.id,
          date: booking.scheduled_start || '',
          time_from: booking.scheduled_start || '',
          time_to: booking.scheduled_end || '',
          clientName: client.full_name,
          clientAvatar: client.avatar_url,
          location: booking.location_text,
          bookingId: booking.id,
        };
      });

      // Process Reviews - mask last names for privacy
      const maskLastName = (fullName: string | null | undefined): string => {
        if (!fullName) return 'Anonymous';
        const parts = fullName.trim().split(/\s+/);
        if (parts.length === 1) return parts[0];
        const firstName = parts[0];
        const lastName = parts[parts.length - 1];
        return `${firstName} ${lastName.replace(/./g, '*')}`;
      };

      const reviewsData = (reviewsResult.data || []) as any[];
      const reviewerIds = reviewsData.map((r) => r.reviewer_user_id).filter(Boolean);

      let reviewerMap: Record<string, string> = {};
      if (reviewerIds.length > 0) {
        const { data: profilesData } = await supabase
          .from('profiles')
          .select('id, full_name')
          .in('id', reviewerIds);

        if (profilesData) {
          reviewerMap = profilesData.reduce((acc, p) => {
            acc[p.id] = p.full_name || 'Anonymous';
            return acc;
          }, {} as Record<string, string>);
        }
      }

      const reviews: Review[] = reviewsData.map((r) => {
        const reviewerName = reviewerMap[r.reviewer_user_id] || 'Anonymous';
        return {
          id: r.id,
          rating: r.rating || 0,
          comment: r.comment,
          reviewer_name: reviewerName,
          created_at: r.created_at,
        };
      });

      // Process Monthly Earnings
      // Get current month date range for filtering
      const now = new Date();
      const currentYear = now.getFullYear();
      const currentMonth = now.getMonth();
      const monthStartDate = new Date(currentYear, currentMonth, 1);

      // Step 1: Calculate monthlyEarnings = sum of payouts.amount where:
      // - (transferred_at OR created_at) is on or after 1st of current month
      // - status is one of: 'pending', 'completed', or 'processing'
      const monthlyPayoutsData = monthlyEarningsResult.data || [];
      let monthlyEarningsAmount = 0;

      monthlyPayoutsData.forEach((payout: any) => {
        const payoutDate = payout.transferred_at ? new Date(payout.transferred_at) : new Date(payout.created_at);
        const isCurrentMonth = payoutDate.getFullYear() === currentYear && payoutDate.getMonth() === currentMonth;
        const isValidStatus = ['pending', 'completed', 'processing'].includes(payout.status);

        if (isCurrentMonth && isValidStatus) {
          monthlyEarningsAmount += payout.amount || 0;
        }
      });

      // Calculate lastMonthEarnings for trend percentage
      const lastMonth = currentMonth === 0 ? 11 : currentMonth - 1;
      const lastMonthYear = currentMonth === 0 ? currentYear - 1 : currentYear;
      let lastMonthEarningsAmount = 0;

      monthlyPayoutsData.forEach((payout: any) => {
        const payoutDate = payout.transferred_at ? new Date(payout.transferred_at) : new Date(payout.created_at);
        const isLastMonth = payoutDate.getFullYear() === lastMonthYear && payoutDate.getMonth() === lastMonth;
        const isValidStatus = ['pending', 'completed', 'processing'].includes(payout.status);

        if (isLastMonth && isValidStatus) {
          lastMonthEarningsAmount += payout.amount || 0;
        }
      });

      // Step 2: Calculate pendingPayouts = sum of amount from payouts where status = 'pending'
      const pendingPayoutsAmount = monthlyPayoutsData
        .filter((p: any) => p.status === 'pending')
        .reduce((sum: number, p: any) => sum + (p.amount || 0), 0);

      // Step 3: Calculate availableBalance = monthlyEarnings - pendingPayouts
      const availableBalance = monthlyEarningsAmount - pendingPayoutsAmount;

      // ===== CORRECT BOOKING COUNT LOGIC =====
      // Step 1: Get all accepted booking_talents (NO date filter)
      const bookingTalentsData = monthlyBookingTalentsResult.data || [];

      // Step 2: Build map of bookings by ID for quick lookup
      const allBookingsData = allBookingsResult.data || [];
      const bookingsMap: Record<string, any> = (allBookingsData || []).reduce((acc: Record<string, any>, b: any) => {
        acc[b.id] = b;
        return acc;
      }, {} as Record<string, any>);

      // Calculate total active/completed bookings (for Search Visibility widget)
      // Count booking_talents with status='accepted' whose bookings status is in valid statuses
      const acceptedBTsForTotal = acceptedBookingTalentsResult.data || [];
      const validStatuses = ['confirmed', 'pending_contract', 'pending_payment', 'in_progress', 'delivered', 'completed'];
      const totalActiveBookings = (acceptedBTsForTotal || []).filter((bt: any) => {
        const booking = bookingsMap[bt.booking_id];
        return booking && validStatuses.includes(booking.status);
      }).length;

      // Step 3: Calculate monthly bookings (accepted_at within current month)
      // Use the date-fns functions to get accurate month boundaries
      const monthStart = startOfMonth(new Date());
      const monthEnd = endOfMonth(new Date());

      const monthlyBookingsCount = (bookingTalentsData || []).filter((bt: any) => {
        // Use accepted_at date to determine if booking was accepted this month
        if (!bt.accepted_at) return false;
        const acceptedDate = new Date(bt.accepted_at);
        return acceptedDate.getTime() >= monthStart.getTime() && acceptedDate.getTime() <= monthEnd.getTime();
      }).length;

      // Step 4: Calculate total bookings (completed bookings only)
      const completedBookings = (bookingTalentsData || []).filter((bt: any) => {
        const booking = bookingsMap[bt.booking_id];
        return booking?.status === 'completed';
      });

      const totalBookings = completedBookings.length;

      const monthlyEarnings: MonthlyEarnings = {
        earnings: monthlyEarningsAmount,
        pending: pendingPayoutsAmount,
        bookingsCount: monthlyBookingsCount,
        activeBookingsCount: totalBookings,
        currency: talentProfile.currency || 'AED',
        lastMonthEarnings: lastMonthEarningsAmount,
      };

      // Process Reply Rate (all-time, not just this month)
      const allBookingTalents = bookingTalentsForReplyRateResult.data || [];

      // Total received = all except cancelled
      const totalReceived = (allBookingTalents || []).filter(
        bt => bt.status !== 'cancelled'
      ).length;

      // Responded = accepted or declined, but NOT auto-declined
      const responded = (allBookingTalents || []).filter(
        bt => (bt.status === 'accepted' || bt.status === 'declined')
          && !bt.auto_declined_at
      ).length;

      // Calculate percentage
      const replyRate = totalReceived > 0
        ? Math.round((responded / totalReceived) * 100)
        : 0;

      // Calculate Profile Completion for the Banner (6-7 steps)
      const bannerSteps: ProfileCompletionStep[] = [];

      bannerSteps.push({
        id: 1,
        label: 'Write your bio',
        completed: !!(talentProfile.bio && talentProfile.bio.trim().length >= 10),
        href: 'editprofile',
      });

      bannerSteps.push({
        id: 2,
        label: 'Add specialties',
        completed: !!(talentProfile.subcategories && typeof talentProfile.subcategories === 'object' && Object.keys(talentProfile.subcategories).length > 0),
        href: 'categories',
      });

      // Conditional model specs step
      if (talentProfile.category === 'model' && !(talentProfile.height_cm && talentProfile.build && talentProfile.nationality)) {
        bannerSteps.push({
          id: 3,
          label: 'Complete model details',
          completed: false,
          href: 'editprofile',
        });
      }

      bannerSteps.push({
        id: bannerSteps.length + 1,
        label: 'Upload portfolio',
        completed: portfolioMediaCount >= 3,
        count: portfolioMediaCount > 0 ? `${portfolioMediaCount}/3` : undefined,
        href: 'portfolio',
      });

      bannerSteps.push({
        id: bannerSteps.length + 1,
        label: 'Verify your identity',
        completed: talentProfile.is_verified,
        href: 'editprofile',
      });

      bannerSteps.push({
        id: bannerSteps.length + 1,
        label: 'Add cover photo',
        completed: !!talentProfile.banner_url,
        href: 'editprofile',
      });

      bannerSteps.push({
        id: bannerSteps.length + 1,
        label: 'Add payout method',
        completed: bankAccountInfo.count > 0,
        href: 'payouts',
      });

      const bannerCompletedCount = bannerSteps.filter((s) => s.completed).length;
      const bannerPercentage = Math.round((bannerCompletedCount / bannerSteps.length) * 100);

      // DEBUG: Log all banner step completions
      console.log('BANNER DEBUG:', {
        bio: talentProfile?.bio,
        bioLength: talentProfile?.bio?.trim()?.length,
        bioCompleted: !!(talentProfile.bio && talentProfile.bio.trim().length >= 10),
        subcategories: talentProfile?.subcategories,
        hasSpecialties: !!(talentProfile?.subcategories && typeof talentProfile.subcategories === 'object' && Object.keys(talentProfile.subcategories).length > 0),
        portfolioCount: portfolioMediaCount,
        portfolioCompleted: portfolioMediaCount >= 3,
        isVerified: talentProfile?.is_verified,
        bannerUrl: talentProfile?.banner_url,
        bannerCompleted: !!talentProfile?.banner_url,
        hasBankAccount: bankAccountInfo.count > 0,
        completedCount: bannerCompletedCount,
        totalCount: bannerSteps.length,
        percentage: bannerPercentage,
        bannerSteps: bannerSteps.map(s => ({ label: s.label, completed: s.completed })),
      });

      // Calculate Overall Profile Completion (10 steps for visibility/stats)
      let overallCompleted = 0;
      const overallTotal = 10;

      if (profile?.avatar_url) overallCompleted++;
      if (talentProfile.bio && talentProfile.bio.trim().length >= 10) overallCompleted++;
      if (talentProfile.location_text) overallCompleted++;
      if (talentProfile.category) overallCompleted++;
      if (talentProfile.subcategories && typeof talentProfile.subcategories === 'object' && Object.keys(talentProfile.subcategories).length > 0) overallCompleted++;
      if (portfolioMediaCount >= 3) overallCompleted++;
      if (talentProfile.hourly_rate || talentProfile.day_rate || talentProfile.session_rate) overallCompleted++;
      if (talentProfile.is_verified) overallCompleted++;
      if (talentProfile.banner_url) overallCompleted++;
      if (bankAccountInfo.count > 0) overallCompleted++;

      const overallPercentage = Math.round((overallCompleted / overallTotal) * 100);

      // Calculate Visibility Score (uses overall percentage)
      let visibilityScore = 0;
      visibilityScore += (overallPercentage / 100) * 40; // Completion: max 40
      if (talentProfile.bio && talentProfile.bio.trim().length >= 10) visibilityScore += 15; // Bio: max 15
      visibilityScore += Math.min(portfolioMediaCount * 5, 20); // Portfolio: max 20
      if (talentProfile.is_verified) visibilityScore += 25; // Verification: max 25
      visibilityScore = Math.min(visibilityScore, 100); // Cap at 100

      setData({
        profile,
        talentProfile,
        portfolio: {
          projectsCount: portfolioProjectsCount,
          mediaCount: portfolioMediaCount,
        },
        availabilitySlots,
        bankAccounts: bankAccountInfo,
        pendingRequests: pendingRequests.slice(0, 10), // Limit to 10 for dashboard
        weeklySchedule,
        reviews,
        profileViews,
        totalJobs,
        totalBookings: totalActiveBookings,
        monthlyEarnings,
        replyRate: Math.round(replyRate),
        profileCompletion: {
          percentage: bannerPercentage,
          steps: bannerSteps,
        },
        visibilityScore: Math.round(visibilityScore),
        isLoading: false,
        error: null,
        refetch: fetchDashboardData,
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch dashboard data';
      console.error('useTalentDashboard error:', err);
      setData((prev) => ({
        ...prev,
        isLoading: false,
        error: errorMessage,
      }));
    }
  }, [user?.id]);

  // Use ref to prevent double fetching on mount in StrictMode
  const hasFetchedRef = useRef(false);

  useEffect(() => {
    // Prevent double fetch
    if (hasFetchedRef.current) return;
    hasFetchedRef.current = true;

    // Use InteractionManager to defer initial fetch until after animations complete
    const interactionTask = InteractionManager.runAfterInteractions(() => {
      fetchDashboardData();
    });

    return () => {
      interactionTask.cancel();
    };
  }, [fetchDashboardData]);

  return {
    ...data,
    refetch: fetchDashboardData,
  };
}
