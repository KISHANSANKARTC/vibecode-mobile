import { useState, useEffect, useCallback } from 'react';
import { Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useNavigation } from '@react-navigation/native';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/lib/state/auth-store';

export interface BookingTalent {
  id: string;
  booking_id: string;
  talent_id: string;
  status: 'pending' | 'accepted' | 'declined';
  rate_price: number;
  role_category?: string;
  accepted_at?: string;
  declined_at?: string;
  created_at: string;
  booking?: any;
  client?: any;
  hasRefundRequest?: boolean;
}

export function useGigs() {
  const user = useAuthStore((state) => state.user);
  const router = useRouter();
  const navigation = useNavigation();
  const [bookingTalents, setBookingTalents] = useState<BookingTalent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [talentProfileId, setTalentProfileId] = useState<string | null>(null);
  const [isVerified, setIsVerified] = useState(false);
  const [hasBankAccount, setHasBankAccount] = useState(false);

  const fetchAll = useCallback(async () => {
    if (!user?.id) {
      setIsLoading(false);
      return;
    }

    try {
      // Step 1: Get talent profile
      const { data: talentProfile } = await supabase
        .from('talent_profiles')
        .select('id, is_verified')
        .eq('user_id', user.id)
        .maybeSingle();

      if (!talentProfile) {
        setIsLoading(false);
        return;
      }

      setTalentProfileId(talentProfile.id);
      setIsVerified(talentProfile.is_verified === true);

      // Step 2: Check bank account
      const { data: bankData } = await supabase
        .from('bank_accounts')
        .select('id')
        .eq('user_id', user.id)
        .limit(1);

      setHasBankAccount((bankData || []).length > 0);

      // Step 3: Fetch booking_talents
      const { data: bts, error } = await supabase
        .from('booking_talents')
        .select('*')
        .eq('talent_id', talentProfile.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (!bts || bts.length === 0) {
        setBookingTalents([]);
        setIsLoading(false);
        return;
      }

      // Step 4: Fetch bookings
      const bookingIds = [...new Set(bts.map((b) => b.booking_id))];
      const { data: bookingsData } = await supabase
        .from('bookings')
        .select(
          'id, status, scheduled_start, scheduled_end, location_text, total_price, platform_fee, currency, client_id, is_custom_offer'
        )
        .in('id', bookingIds);

      const bookingsMap = (bookingsData || []).reduce(
        (acc, b) => {
          acc[b.id] = b;
          return acc;
        },
        {} as Record<string, any>
      );

      // Step 5: Fetch client profiles + companies
      const clientIds = [
        ...new Set(
          (bookingsData || [])
            .map((b) => b.client_id)
            .filter(Boolean)
        ),
      ];

      let clientsMap: Record<string, any> = {};

      if (clientIds.length > 0) {
        const { data: profilesData } = await supabase
          .from('profiles')
          .select('id, full_name, avatar_url')
          .in('id', clientIds);

        const { data: companiesData } = await supabase
          .from('client_companies')
          .select('user_id, company_name, account_type')
          .in('user_id', clientIds);

        const companiesMap = (companiesData || []).reduce(
          (acc, c) => {
            acc[c.user_id] = c;
            return acc;
          },
          {} as Record<string, any>
        );

        clientsMap = (profilesData || []).reduce(
          (acc, p) => {
            const company = companiesMap[p.id];
            acc[p.id] = {
              ...p,
              company_name: company?.company_name || null,
              account_type: company?.account_type || null,
            };
            return acc;
          },
          {} as Record<string, any>
        );
      }

      // Step 6: Check for refund requests (open disputes with refund_request reason)
      let refundMap: Record<string, boolean> = {};
      if (bookingIds.length > 0) {
        const { data: refundData } = await supabase
          .from('disputes')
          .select('booking_id')
          .in('booking_id', bookingIds)
          .eq('status', 'open')
          .like('reason', 'refund_request:%');

        refundMap = (refundData || []).reduce(
          (acc, r) => {
            acc[r.booking_id] = true;
            return acc;
          },
          {} as Record<string, boolean>
        );
      }

      // Step 7: Enrich and set
      const enriched = bts.map((bt) => {
        const booking = bookingsMap[bt.booking_id];
        return {
          ...bt,
          booking,
          client: booking?.client_id ? clientsMap[booking.client_id] : null,
          hasRefundRequest: refundMap[bt.booking_id] || false,
        };
      });

      setBookingTalents(enriched);
    } catch (err) {
      console.error('useGigs error:', err);
    } finally {
      setIsLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  // Earnings calculation
  const calculateEarnings = (bt: BookingTalent): number => {
    if (bt.booking?.is_custom_offer) return bt.rate_price;
    if (bt.booking?.scheduled_start && bt.booking?.scheduled_end) {
      const start = new Date(bt.booking.scheduled_start).getTime();
      const end = new Date(bt.booking.scheduled_end).getTime();
      const hours = Math.max(1, (end - start) / (1000 * 60 * 60));
      return Math.round(bt.rate_price * hours);
    }
    return bt.rate_price;
  };

  // ACCEPT booking
  const acceptBooking = async (bookingTalentId: string, navigation: any): Promise<boolean> => {
    const bt = bookingTalents.find((b) => b.id === bookingTalentId);
    if (!bt) return false;

    // Check verification docs
    const { data: verif } = await supabase
      .from('talent_verifications')
      .select('id_document_url, selfie_url')
      .eq('talent_id', talentProfileId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!verif?.id_document_url || !verif?.selfie_url) {
      Alert.alert('Verification Required', 'Please upload your ID verification documents before accepting jobs.', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Verify Now', onPress: () => router.push('/(talent)/verifyidentity') },
      ]);
      return false;
    }

    // Check bank account
    const { data: bankData } = await supabase
      .from('bank_accounts')
      .select('id')
      .eq('user_id', user?.id)
      .limit(1);

    if (!bankData || bankData.length === 0) {
      Alert.alert('Bank Details Required', 'Please add bank details before accepting jobs.', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Add Now', onPress: () => router.push('/(talent)/payouts') },
      ]);
      return false;
    }

    // Update booking_talents status
    const { error: btError } = await supabase
      .from('booking_talents')
      .update({ status: 'accepted', accepted_at: new Date().toISOString() })
      .eq('id', bookingTalentId);

    if (btError) {
      console.error(btError);
      return false;
    }

    // Update booking status to pending_contract
    await supabase
      .from('bookings')
      .update({ status: 'pending_contract', updated_at: new Date().toISOString() })
      .eq('id', bt.booking_id);

    // Insert notification for client
    if (bt.booking?.client_id) {
      await supabase.from('notifications').insert({
        user_id: bt.booking.client_id,
        type: 'booking_accepted',
        title: 'Booking Accepted!',
        body: 'Your booking request has been accepted. Sign the contract to proceed.',
        deep_link: `/client/bookings/${bt.booking_id}`,
      });
    }

    // Update local state
    setBookingTalents((prev) =>
      prev.map((b) =>
        b.id === bookingTalentId
          ? { ...b, status: 'accepted', accepted_at: new Date().toISOString() }
          : b
      )
    );

    Alert.alert('🎉 Gig Accepted!', 'The client will be notified to sign the contract.');
    return true;
  };

  // DECLINE booking
  const declineBooking = async (bookingTalentId: string): Promise<boolean> => {
    const bt = bookingTalents.find((b) => b.id === bookingTalentId);
    if (!bt) return false;

    const { error } = await supabase
      .from('booking_talents')
      .update({ status: 'declined', declined_at: new Date().toISOString() })
      .eq('id', bookingTalentId);

    if (error) {
      console.error(error);
      return false;
    }

    await supabase
      .from('bookings')
      .update({ status: 'cancelled', updated_at: new Date().toISOString() })
      .eq('id', bt.booking_id);

    if (bt.booking?.client_id) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', user?.id)
        .single();

      await supabase.from('notifications').insert({
        user_id: bt.booking.client_id,
        type: 'booking_declined',
        title: 'Booking Declined',
        body: `${profile?.full_name || 'Talent'} declined your booking request.`,
        deep_link: `/client/bookings`,
      });
    }

    setBookingTalents((prev) =>
      prev.map((b) =>
        b.id === bookingTalentId ? { ...b, status: 'declined', declined_at: new Date().toISOString() } : b
      )
    );

    Alert.alert('Declined', 'The client has been notified.');
    return true;
  };

  // Filtered lists
  const pendingBookings = bookingTalents.filter((bt) => bt.status === 'pending');
  const activeBookings = bookingTalents.filter(
    (bt) =>
      bt.status === 'accepted' &&
      bt.booking &&
      ['pending_contract', 'pending_payment', 'confirmed', 'in_progress', 'delivered'].includes(
        bt.booking.status
      )
  );
  const completedBookings = bookingTalents.filter(
    (bt) => bt.status === 'accepted' && bt.booking?.status === 'completed'
  );

  return {
    pendingBookings,
    activeBookings,
    completedBookings,
    isLoading,
    isVerified,
    hasBankAccount,
    calculateEarnings,
    acceptBooking,
    declineBooking,
    refetch: fetchAll,
  };
}
