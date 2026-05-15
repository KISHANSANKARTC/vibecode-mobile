import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/lib/state/auth-store';

export interface EnrichedBookingTalent {
  id: string;
  talent_id: string;
  booking_id: string;
  status: 'pending' | 'accepted' | 'declined' | 'cancelled';
  rate_price: number;
  role_category?: string | null;
  created_at: string;
  booking?: {
    id: string;
    status: string;
    scheduled_start: string;
    scheduled_end: string;
    location_text: string | null;
    total_price: number;
    platform_fee: number;
    currency: string;
    client_id: string;
    is_custom_offer: boolean;
  } | null;
  client?: {
    id: string;
    full_name: string | null;
    avatar_url: string | null;
    account_type?: 'individual' | 'organization' | null;
    company_name?: string | null;
  } | null;
  hasRefundRequest?: boolean;
}

export interface BookingCategories {
  pending: EnrichedBookingTalent[];
  accepted: EnrichedBookingTalent[];
  active: EnrichedBookingTalent[];
  completed: EnrichedBookingTalent[];
}

export interface UseBookingTalentsResult {
  bookings: EnrichedBookingTalent[];
  categories: BookingCategories;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

/**
 * Calculate earnings for a single booking talent
 * Custom offers: rate_price is the total
 * Hourly/package: rate_price * duration in hours
 */
export function calculateEarnings(bt: EnrichedBookingTalent): number {
  if (bt.booking?.is_custom_offer) {
    return bt.rate_price;
  }

  if (bt.booking?.scheduled_start && bt.booking?.scheduled_end) {
    const start = new Date(bt.booking.scheduled_start);
    const end = new Date(bt.booking.scheduled_end);
    const durationHours = Math.max(1, (end.getTime() - start.getTime()) / (1000 * 60 * 60));
    return bt.rate_price * durationHours;
  }

  return bt.rate_price;
}

/**
 * Get display name for client (company for orgs, full_name for individuals)
 */
export function getClientName(bt: EnrichedBookingTalent): string {
  if (bt.client?.account_type === 'organization') {
    return bt.client?.company_name || bt.client?.full_name || 'Client';
  }
  return bt.client?.full_name || 'Client';
}

/**
 * Hook to fetch and categorize all booking_talents for current talent
 * Fetches all data separately and combines in JavaScript
 */
/**
 * Calculate total gigs count for dashboard header ("X gigs")
 * Counts all accepted bookings with valid statuses
 */
export async function getTotalGigsCount(talentId: string): Promise<number> {
  try {
    // Fetch all accepted booking_talents
    const { data: allAccepted } = await supabase
      .from('booking_talents')
      .select('booking_id')
      .eq('talent_id', talentId)
      .eq('status', 'accepted');

    if (!allAccepted || allAccepted.length === 0) {
      return 0;
    }

    const allBookingIds = allAccepted.map((bt) => bt.booking_id);
    const { data: allBookings } = await supabase
      .from('bookings')
      .select('id, status')
      .in('id', allBookingIds);

    const validStatuses = ['confirmed', 'pending_contract', 'pending_payment', 'in_progress', 'delivered', 'completed'];
    const totalGigs = (allBookings || []).filter((b) => validStatuses.includes(b.status)).length;

    return totalGigs;
  } catch (err) {
    console.error('Error fetching total gigs count:', err);
    return 0;
  }
}

export function useBookingTalents(): UseBookingTalentsResult {
  const user = useAuthStore((s) => s.user);
  const [data, setData] = useState<UseBookingTalentsResult>({
    bookings: [],
    categories: {
      pending: [],
      accepted: [],
      active: [],
      completed: [],
    },
    isLoading: true,
    error: null,
    refetch: async () => {},
  });

  const fetchData = useCallback(async () => {
    try {
      if (!user?.id) {
        setData((prev) => ({
          ...prev,
          isLoading: false,
          error: 'User not found',
        }));
        return;
      }

      // 1. Get talent profile
      const { data: talentProfileResult } = await supabase
        .from('talent_profiles')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (!talentProfileResult?.id) {
        setData((prev) => ({
          ...prev,
          isLoading: false,
          error: 'Talent profile not found',
        }));
        return;
      }

      const talentId = talentProfileResult.id;

      // 2. Fetch ALL booking_talents
      const { data: bookingTalentsData } = await supabase
        .from('booking_talents')
        .select('*')
        .eq('talent_id', talentId)
        .order('created_at', { ascending: false });

      const bookingTalents = bookingTalentsData || [];

      if (bookingTalents.length === 0) {
        setData((prev) => ({
          ...prev,
          bookings: [],
          categories: {
            pending: [],
            accepted: [],
            active: [],
            completed: [],
          },
          isLoading: false,
          error: null,
        }));
        return;
      }

      // 3. Fetch related bookings
      const bookingIds = [...new Set(bookingTalents.map((bt) => bt.booking_id))];
      const { data: bookingsData } = await supabase
        .from('bookings')
        .select('id, status, scheduled_start, scheduled_end, location_text, total_price, platform_fee, currency, client_id, is_custom_offer')
        .in('id', bookingIds);

      // 4. Create bookings map
      const bookingsMap = (bookingsData || []).reduce((acc, b) => {
        acc[b.id] = b;
        return acc;
      }, {} as Record<string, any>);

      // 5. Fetch client profiles
      const clientIds = [...new Set((bookingsData || []).map((b) => b.client_id).filter(Boolean))];
      let clientsMap: Record<string, any> = {};

      if (clientIds.length > 0) {
        const [{ data: clientProfiles }, { data: companiesData }] = await Promise.all([
          supabase.from('profiles').select('id, full_name, avatar_url').in('id', clientIds),
          supabase.from('client_companies').select('user_id, company_name, account_type').in('user_id', clientIds),
        ]);

        const companiesMap = (companiesData || []).reduce((acc: Record<string, any>, c) => {
          acc[c.user_id] = c;
          return acc;
        }, {});

        clientsMap = (clientProfiles || []).reduce((acc: Record<string, any>, p) => {
          const company = companiesMap[p.id];
          acc[p.id] = {
            ...p,
            company_name: company?.company_name || null,
            account_type: company?.account_type || null,
          };
          return acc;
        }, {});
      }

      // 6. Fetch refund disputes
      let refundBookingIds = new Set<string>();
      if (bookingIds.length > 0) {
        const { data: disputes } = await supabase
          .from('disputes')
          .select('booking_id')
          .in('booking_id', bookingIds)
          .eq('status', 'open')
          .like('reason', 'refund_request:%');

        (disputes || []).forEach((d) => refundBookingIds.add(d.booking_id));
      }

      // 7. Enrich data
      const enrichedData: EnrichedBookingTalent[] = bookingTalents.map((bt) => ({
        ...bt,
        booking: bookingsMap[bt.booking_id] || null,
        client: bookingsMap[bt.booking_id]?.client_id ? clientsMap[bookingsMap[bt.booking_id].client_id] : null,
        hasRefundRequest: refundBookingIds.has(bt.booking_id),
      }));

      // Categorize bookings
      const pending = enrichedData.filter((bt) => bt.status === 'pending');
      const accepted = enrichedData.filter((bt) => bt.status === 'accepted');
      const active = accepted.filter(
        (bt) =>
          bt.booking &&
          ['pending_contract', 'pending_payment', 'confirmed', 'in_progress', 'delivered'].includes(
            bt.booking.status
          )
      );
      const completed = accepted.filter((bt) => bt.booking?.status === 'completed');

      setData({
        bookings: enrichedData,
        categories: {
          pending,
          accepted,
          active,
          completed,
        },
        isLoading: false,
        error: null,
        refetch: fetchData,
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch bookings';
      setData((prev) => ({
        ...prev,
        isLoading: false,
        error: errorMessage,
      }));
    }
  }, [user?.id]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return data;
}
