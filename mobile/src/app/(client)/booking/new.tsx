import { useEffect, useMemo, useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  TextInput,
  ActivityIndicator,
  Image,
  Platform,
  Modal,
  KeyboardAvoidingView,
  Keyboard,
} from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useRouter } from '@/lib/router-helper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  ArrowLeft,
  Calendar as CalendarIcon,
  Clock,
  MapPin,
  CheckCircle,
  AlertCircle,
  Minus,
  Plus,
  Send,
  Sparkles,
  Zap,
  Shield,
  ChevronDown,
} from 'lucide-react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { format } from 'date-fns';
import { supabase } from '@/lib/supabase';
import { extractErrorMessage } from '@/lib/errorUtils';
import { useBookingPayment } from '@/hooks/useBookingPayment';

type RateType = 'hourly' | 'session' | 'day' | 'project' | 'custom';

interface TalentInfo {
  id: string;
  user_id: string | null;
  category: string;
  hourly_rate: number | null;
  session_rate: number | null;
  day_rate: number | null;
  project_rate: number | null;
  currency: string;
  display_name: string;
  avatar_url: string | null;
  instant_book_master_enabled: boolean | null;
}

interface PackageInfo {
  id: string;
  name: string;
  base_price: number;
  duration_hours: number | null;
  currency: string;
  instant_book_enabled: boolean | null;
}

const ORANGE = '#FA5610';
const BG = '#0A0A0A';
const CARD = '#1C1C1E';
const CARD_INNER = '#2A2A2C';
const SUBTLE = '#9CA3AF';

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((w) => w.charAt(0))
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

function getCategoryLabel(cat: string | null | undefined): string {
  if (!cat) return 'Creative';
  const mapping: Record<string, string> = {
    model: 'Model',
    influencer: 'Influencer',
    photographer: 'Photographer',
    videographer: 'Videographer',
    makeup_artist: 'Makeup Artist',
    hair_stylist: 'Hair Stylist',
    stylist: 'Stylist',
    drone_operator: 'Drone Operator',
  };
  return mapping[cat.toLowerCase()] || cat.charAt(0).toUpperCase() + cat.slice(1);
}

function getRateUnit(rateType: RateType): string {
  switch (rateType) {
    case 'hourly':
      return '/hour';
    case 'session':
      return '/session';
    case 'day':
      return '/day';
    case 'project':
      return '/project';
    case 'custom':
      return '';
  }
}

function getRateDurationLabel(rateType: RateType, hours: number): string {
  switch (rateType) {
    case 'hourly':
      return `${hours} hours`;
    case 'session':
      return '1 session';
    case 'day':
      return '1 day';
    case 'project':
      return '1 project';
    case 'custom':
      return 'Custom';
  }
}

function getRateBookingTitle(rateType: RateType): string {
  switch (rateType) {
    case 'hourly':
      return 'Hourly Booking';
    case 'session':
      return 'Session Booking';
    case 'day':
      return 'Day Booking';
    case 'project':
      return 'Project Booking';
    case 'custom':
      return 'Custom Booking';
  }
}

export default function NewBookingScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{
    talent?: string;
    rateType?: string;
    package?: string;
    category?: string;
  }>();

  const talentId = typeof params.talent === 'string' ? params.talent : '';
  const rawRateType = typeof params.rateType === 'string' ? params.rateType : 'hourly';
  const packageId = typeof params.package === 'string' ? params.package : '';
  const categoryParam = typeof params.category === 'string' ? params.category : '';

  const rateType: RateType = (
    ['hourly', 'session', 'day', 'project', 'custom'].includes(rawRateType)
      ? rawRateType
      : 'hourly'
  ) as RateType;

  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [talent, setTalent] = useState<TalentInfo | null>(null);
  const [pkg, setPkg] = useState<PackageInfo | null>(null);

  // Wizard step
  const [step, setStep] = useState<1 | 2 | 3>(1);

  // Form state
  const [hours, setHours] = useState<number>(2);
  const [customAmount, setCustomAmount] = useState<string>('');
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedTime, setSelectedTime] = useState<Date | null>(null);
  const [location, setLocation] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [notesFocused, setNotesFocused] = useState<boolean>(false);

  // Picker visibility
  const [pickerMode, setPickerMode] = useState<null | 'date' | 'time'>(null);
  // iOS spinner draft — what's currently shown in the wheel before Done is pressed.
  const pickerDraftRef = useRef<Date | null>(null);

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Hosted Stripe Checkout for instant-book packages
  const { payWithCard } = useBookingPayment();

  // Keyboard tracking — hide the sticky CTA so it can't cover inputs.
  const [keyboardOpen, setKeyboardOpen] = useState(false);
  useEffect(() => {
    const showSub = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      () => setKeyboardOpen(true)
    );
    const hideSub = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => setKeyboardOpen(false)
    );
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!talentId) {
        setLoadError('Missing talent id');
        setIsLoading(false);
        return;
      }
      try {
        setIsLoading(true);
        setLoadError(null);

        const { data: talentProfile, error: profileError } = await supabase
          .from('talent_profiles')
          .select(
            'id, user_id, category, hourly_rate, session_rate, day_rate, project_rate, currency, display_name, instant_book_master_enabled'
          )
          .eq('id', talentId)
          .maybeSingle();

        if (profileError) throw profileError;
        if (!talentProfile) throw new Error('Talent not found');

        let fullName = talentProfile.display_name || 'Talent';
        let avatarUrl: string | null = null;
        if (talentProfile.user_id) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('full_name, avatar_url')
            .eq('id', talentProfile.user_id)
            .maybeSingle();
          if (profile) {
            fullName = talentProfile.display_name || profile.full_name || 'Talent';
            avatarUrl = profile.avatar_url || null;
          }
        }

        if (cancelled) return;

        setTalent({
          id: talentProfile.id,
          user_id: talentProfile.user_id,
          category: categoryParam || talentProfile.category || 'creative',
          hourly_rate: talentProfile.hourly_rate ?? null,
          session_rate: talentProfile.session_rate ?? null,
          day_rate: talentProfile.day_rate ?? null,
          project_rate: talentProfile.project_rate ?? null,
          currency: talentProfile.currency || 'AED',
          display_name: fullName,
          avatar_url: avatarUrl,
          instant_book_master_enabled: (talentProfile as any).instant_book_master_enabled ?? null,
        });

        if (packageId) {
          const { data: pkgData, error: pkgError } = await supabase
            .from('packages')
            .select('id, name, base_price, duration_hours, currency, instant_book_enabled')
            .eq('id', packageId)
            .maybeSingle();
          if (pkgError) throw pkgError;
          if (pkgData) {
            setPkg({
              id: pkgData.id,
              name: pkgData.name || 'Package',
              base_price: Number(pkgData.base_price) || 0,
              duration_hours: pkgData.duration_hours ?? null,
              currency: pkgData.currency || talentProfile.currency || 'AED',
              instant_book_enabled: (pkgData as any).instant_book_enabled ?? null,
            });

            if (pkgData.duration_hours && pkgData.duration_hours > 0) {
              setHours(Math.max(1, Math.floor(Number(pkgData.duration_hours))));
            }
            // Skip step 1 for packages — go straight to details
            setStep(2);
          }
        }
      } catch (err) {
        if (cancelled) return;
        setLoadError(extractErrorMessage(err));
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [talentId, packageId, categoryParam]);

  // Selected unit price (per hour / per session / etc.) or package base price
  const unitPrice: number = useMemo(() => {
    if (pkg) return pkg.base_price;
    if (!talent) return 0;
    switch (rateType) {
      case 'hourly':
        return talent.hourly_rate ?? 0;
      case 'session':
        return talent.session_rate ?? 0;
      case 'day':
        return talent.day_rate ?? 0;
      case 'project':
        return talent.project_rate ?? 0;
      case 'custom':
        return parseFloat(customAmount) || 0;
    }
  }, [pkg, talent, rateType, customAmount]);

  const currency = pkg?.currency || talent?.currency || 'AED';

  // For hourly bookings: total = unitPrice * hours
  // For session/day/project/package/custom: total = unitPrice
  const isHourly = !pkg && rateType === 'hourly';
  const total: number = useMemo(() => {
    if (isHourly) return unitPrice * hours;
    return unitPrice;
  }, [isHourly, unitPrice, hours]);

  // Step 1 → Step 2 should be allowed only when:
  // - Hourly: hours >= 1
  // - Custom: customAmount > 0
  // - Other rate types: unitPrice > 0
  const canContinueStep1 = useMemo(() => {
    if (rateType === 'custom') {
      const v = parseFloat(customAmount);
      return !isNaN(v) && v > 0;
    }
    if (isHourly) return hours >= 1;
    return unitPrice > 0;
  }, [rateType, customAmount, isHourly, hours, unitPrice]);

  // Combine date+time for storage
  const combinedStart: Date | null = useMemo(() => {
    if (!selectedDate || !selectedTime) return null;
    const d = new Date(selectedDate);
    d.setHours(selectedTime.getHours(), selectedTime.getMinutes(), 0, 0);
    return d;
  }, [selectedDate, selectedTime]);

  const durationHours = useMemo(() => {
    if (pkg?.duration_hours) return pkg.duration_hours;
    if (rateType === 'hourly') return hours;
    if (rateType === 'day') return 8;
    return 1;
  }, [pkg, rateType, hours]);

  const combinedEnd: Date | null = useMemo(() => {
    if (!combinedStart) return null;
    const d = new Date(combinedStart);
    d.setHours(d.getHours() + durationHours);
    return d;
  }, [combinedStart, durationHours]);

  const canContinueStep2 = useMemo(() => {
    return Boolean(selectedDate && selectedTime && location.trim().length > 0);
  }, [selectedDate, selectedTime, location]);

  // Picker handler
  const onChangePicker = useCallback(
    (event: any, selected?: Date) => {
      if (Platform.OS === 'android') {
        const mode = pickerMode;
        setPickerMode(null);
        if (event?.type === 'dismissed' || !selected) return;
        if (mode === 'date') {
          console.log('[BookNow] date selected', selected.toISOString());
          setSelectedDate(selected);
        } else if (mode === 'time') {
          console.log('[BookNow] time selected', selected.toISOString());
          setSelectedTime(selected);
        }
        return;
      }
      // iOS: track what's showing in the wheel; commit on Done.
      if (!selected) return;
      pickerDraftRef.current = selected;
    },
    [pickerMode]
  );

  const handlePickerDone = useCallback(() => {
    const draft = pickerDraftRef.current;
    // If user opened the picker but didn't spin, save the default value so the
    // selection isn't lost (default = current value or now).
    const fallback =
      pickerMode === 'date'
        ? selectedDate || new Date()
        : selectedTime || new Date();
    const value = draft ?? fallback;
    if (pickerMode === 'date') {
      console.log('[BookNow] date confirmed', value.toISOString());
      setSelectedDate(value);
    } else if (pickerMode === 'time') {
      console.log('[BookNow] time confirmed', value.toISOString());
      setSelectedTime(value);
    }
    pickerDraftRef.current = null;
    setPickerMode(null);
  }, [pickerMode, selectedDate, selectedTime]);

  const handlePickerCancel = useCallback(() => {
    pickerDraftRef.current = null;
    setPickerMode(null);
  }, []);

  // Step transitions
  const handleStep1Continue = useCallback(() => {
    console.log('[BookNow] step 1 → 2', { rateType, hours, customAmount });
    setStep(2);
  }, [rateType, hours, customAmount]);

  const handleStep2Continue = useCallback(() => {
    console.log('[BookNow] step 2 → 3 fired', {
      hasDate: Boolean(selectedDate),
      hasTime: Boolean(selectedTime),
      hasLocation: location.trim().length > 0,
    });
    if (!selectedDate || !selectedTime) {
      setSubmitError('Please pick a date and time');
      return;
    }
    if (!location.trim()) {
      setSubmitError('Please add a location');
      return;
    }
    setSubmitError(null);
    Keyboard.dismiss();
    setStep(3);
  }, [selectedDate, selectedTime, location]);

  const handleBack = useCallback(() => {
    console.log('[BookNow] back from step', step);
    if (step === 1) {
      router.back();
    } else if (step === 2) {
      // If we're using a package we never showed step 1, so go back to talent page
      if (pkg) router.back();
      else setStep(1);
    } else {
      setStep(2);
    }
  }, [step, router, pkg]);

  const handleSubmit = useCallback(async () => {
    setSubmitError(null);

    if (!talent) {
      setSubmitError('Talent data not loaded');
      return;
    }
    if (!combinedStart || !combinedEnd) {
      setSubmitError('Please pick a date and time');
      return;
    }
    if (!location.trim()) {
      setSubmitError('Please add a location');
      return;
    }
    if (!unitPrice || unitPrice <= 0) {
      setSubmitError('Please set a valid amount');
      return;
    }

    try {
      setSubmitting(true);

      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError) throw userError;
      const user = userData.user;
      if (!user) throw new Error('You must be signed in to book');

      const titleText = pkg
        ? pkg.name
        : rateType === 'custom'
          ? notes.trim() || 'Custom Offer'
          : `${getCategoryLabel(talent.category)} — ${getRateBookingTitle(rateType)}`;

      const bookingPayload = {
        client_id: user.id,
        status: 'pending_acceptance',
        scheduled_start: combinedStart.toISOString(),
        scheduled_end: combinedEnd.toISOString(),
        location_text: location.trim(),
        total_price: total,
        currency,
        title: titleText,
        is_custom_offer: rateType === 'custom',
      };

      console.log('[BookNow] submit start', bookingPayload);

      const { data: insertedBooking, error: bookingErr } = await supabase
        .from('bookings')
        .insert(bookingPayload)
        .select('id')
        .single();

      if (bookingErr) throw bookingErr;
      if (!insertedBooking?.id) throw new Error('Booking creation failed');

      const bookingTalentPayload = {
        booking_id: insertedBooking.id,
        talent_id: talent.id,
        role_category: talent.category,
        rate_price: total,
        status: 'pending',
      };

      const { error: btError } = await supabase
        .from('booking_talents')
        .insert(bookingTalentPayload);

      if (btError) throw btError;

      // Instant-book packages go straight to Stripe Checkout. Non-instant
      // bookings remain `pending` and require talent acceptance before
      // payment is collected (existing behaviour).
      const isInstantBook =
        pkg?.instant_book_enabled === true &&
        talent?.instant_book_master_enabled !== false;

      if (isInstantBook) {
        const payResult = await payWithCard(insertedBooking.id);
        if (payResult.ok) {
          router.replace(`/(client)/bookings/${insertedBooking.id}` as never);
          return;
        }
        // Payment cancelled / failed — fall through to the standard pending flow.
      }

      console.log('[BookNow] submit success', insertedBooking.id);
      router.replace(`/(client)/bookings/${insertedBooking.id}` as never);
    } catch (err) {
      const msg = extractErrorMessage(err);
      console.log('[BookNow] submit error', msg);
      setSubmitError(msg);
    } finally {
      setSubmitting(false);
    }
  }, [
    talent,
    pkg,
    rateType,
    combinedStart,
    combinedEnd,
    location,
    unitPrice,
    total,
    currency,
    notes,
    router,
    payWithCard,
  ]);

  if (isLoading) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: BG,
          alignItems: 'center',
          justifyContent: 'center',
          paddingTop: insets.top,
        }}
      >
        <ActivityIndicator size="large" color={ORANGE} />
        <Text style={{ color: SUBTLE, marginTop: 12 }}>Loading booking…</Text>
      </View>
    );
  }

  if (loadError || !talent) {
    return (
      <View style={{ flex: 1, backgroundColor: BG, paddingTop: insets.top }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12 }}>
          <Pressable onPress={() => router.back()} hitSlop={8} style={{ padding: 6, marginLeft: -6 }}>
            <ArrowLeft size={22} color="#FFFFFF" />
          </Pressable>
          <Text style={{ color: '#FFFFFF', fontSize: 18, fontWeight: '600', marginLeft: 8 }}>
            New Booking
          </Text>
        </View>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 }}>
          <AlertCircle size={36} color="#EF4444" />
          <Text style={{ color: '#FFFFFF', fontSize: 16, fontWeight: '600', marginTop: 12, textAlign: 'center' }}>
            Couldn't load talent
          </Text>
          <Text style={{ color: SUBTLE, fontSize: 14, marginTop: 8, textAlign: 'center' }}>
            {loadError || 'Please try again.'}
          </Text>
          <Pressable
            onPress={() => router.back()}
            style={{ backgroundColor: ORANGE, borderRadius: 999, paddingHorizontal: 24, paddingVertical: 12, marginTop: 24 }}
          >
            <Text style={{ color: '#FFFFFF', fontWeight: '600' }}>Go back</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={{ flex: 1, backgroundColor: BG, paddingTop: insets.top }}
    >
      {/* Header */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: 16,
          paddingVertical: 10,
        }}
      >
        <Pressable
          onPress={handleBack}
          hitSlop={8}
          style={{
            width: 40,
            height: 40,
            borderRadius: 20,
            backgroundColor: '#1C1C1E',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <ArrowLeft size={20} color="#FFFFFF" />
        </Pressable>
        <Text style={{ color: '#FFFFFF', fontSize: 16, fontWeight: '700', marginLeft: 12, flex: 1 }}>
          Book {talent.display_name}
        </Text>
        {talent.avatar_url ? (
          <Image
            source={{ uri: talent.avatar_url }}
            style={{ width: 36, height: 36, borderRadius: 18 }}
          />
        ) : (
          <View
            style={{
              width: 36,
              height: 36,
              borderRadius: 18,
              backgroundColor: ORANGE,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Text style={{ color: '#FFFFFF', fontWeight: '700' }}>
              {getInitials(talent.display_name)}
            </Text>
          </View>
        )}
      </View>

      {/* Step indicator */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: 16,
          paddingTop: 4,
          paddingBottom: 12,
          borderBottomWidth: 1,
          borderBottomColor: '#1F1F22',
        }}
      >
        <StepIndicator num={1} label="Hours" active={step === 1} done={step > 1} />
        <View style={{ height: 1, flex: 1, backgroundColor: '#3F3F46', marginHorizontal: 6 }} />
        <StepIndicator num={2} label="Details" active={step === 2} done={step > 2} />
        <View style={{ height: 1, flex: 1, backgroundColor: '#3F3F46', marginHorizontal: 6 }} />
        <StepIndicator num={3} label="Confirm" active={step === 3} done={false} />
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: 200 + insets.bottom }}
        keyboardShouldPersistTaps="always"
        keyboardDismissMode="interactive"
        showsVerticalScrollIndicator={false}
        automaticallyAdjustKeyboardInsets={Platform.OS === 'ios'}
      >
        {step === 1 ? (
          <Step1Hours
            talent={talent}
            currency={currency}
            unitPrice={unitPrice}
            rateType={rateType}
            hours={hours}
            setHours={setHours}
            customAmount={customAmount}
            setCustomAmount={setCustomAmount}
            isHourly={isHourly}
            total={total}
          />
        ) : null}

        {step === 2 ? (
          <Step2Details
            selectedDate={selectedDate}
            selectedTime={selectedTime}
            location={location}
            setLocation={setLocation}
            notes={notes}
            setNotes={setNotes}
            notesFocused={notesFocused}
            setNotesFocused={setNotesFocused}
            durationHours={durationHours}
            onPickDate={() => {
              console.log('[BookNow] open date picker');
              Keyboard.dismiss();
              setPickerMode('date');
            }}
            onPickTime={() => {
              if (!selectedDate) return;
              console.log('[BookNow] open time picker');
              Keyboard.dismiss();
              setPickerMode('time');
            }}
          />
        ) : null}

        {step === 3 ? (
          <Step3Confirm
            talent={talent}
            currency={currency}
            unitPrice={unitPrice}
            rateType={rateType}
            hours={hours}
            isHourly={isHourly}
            total={total}
            combinedStart={combinedStart}
            location={location}
            durationHours={durationHours}
            pkg={pkg}
            submitError={submitError}
          />
        ) : null}
      </ScrollView>

      {/* Sticky bottom CTA — hidden while keyboard is open so it can't cover inputs */}
      <View
        pointerEvents={keyboardOpen ? 'none' : 'auto'}
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: BG,
          paddingHorizontal: 16,
          paddingTop: 12,
          paddingBottom: insets.bottom + 16,
          opacity: keyboardOpen ? 0 : 1,
        }}
      >
        {step === 1 ? (
          <Pressable
            onPress={handleStep1Continue}
            disabled={!canContinueStep1}
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: 999,
              minHeight: 52,
              alignItems: 'center',
              justifyContent: 'center',
              flexDirection: 'row',
              opacity: canContinueStep1 ? 1 : 0.4,
            }}
          >
            <Clock size={18} color="#000000" />
            <Text style={{ color: '#000000', fontSize: 15, fontWeight: '700', marginLeft: 8 }}>
              {rateType === 'custom'
                ? `Continue${unitPrice > 0 ? ` - ${currency} ${total.toLocaleString()}` : ''}`
                : `Continue - ${currency} ${total.toLocaleString()}`}
            </Text>
          </Pressable>
        ) : null}

        {step === 2 ? (
          <Pressable
            onPress={handleStep2Continue}
            disabled={!canContinueStep2}
            style={{
              backgroundColor: canContinueStep2 ? '#FFFFFF' : '#3F3F46',
              borderRadius: 999,
              minHeight: 52,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Text style={{ color: canContinueStep2 ? '#000000' : '#9CA3AF', fontSize: 15, fontWeight: '700' }}>
              Continue
            </Text>
          </Pressable>
        ) : null}

        {step === 3 ? (
          <>
            <Pressable
              onPress={handleSubmit}
              disabled={submitting}
              style={{
                backgroundColor: '#FFFFFF',
                borderRadius: 999,
                minHeight: 52,
                alignItems: 'center',
                justifyContent: 'center',
                flexDirection: 'row',
                opacity: submitting ? 0.7 : 1,
              }}
            >
              {submitting ? (
                <ActivityIndicator color="#000000" />
              ) : (
                <>
                  <Send size={18} color="#000000" />
                  <Text style={{ color: '#000000', fontSize: 15, fontWeight: '700', marginLeft: 8 }}>
                    Send Booking Request
                  </Text>
                </>
              )}
            </Pressable>
            <Text style={{ color: SUBTLE, fontSize: 12, textAlign: 'center', marginTop: 10 }}>
              No payment required now • Pay after talent accepts
            </Text>
          </>
        ) : null}
      </View>

      {/* iOS picker modal */}
      {pickerMode && Platform.OS === 'ios' ? (
        <Modal transparent animationType="fade" visible onRequestClose={handlePickerCancel}>
          <Pressable
            style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}
            onPress={handlePickerCancel}
          >
            <View
              style={{
                backgroundColor: '#1C1C1E',
                borderTopLeftRadius: 24,
                borderTopRightRadius: 24,
                paddingBottom: insets.bottom + 16,
                paddingTop: 8,
                paddingHorizontal: 12,
              }}
              onStartShouldSetResponder={() => true}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 8, paddingVertical: 8 }}>
                <Pressable onPress={handlePickerCancel} hitSlop={8} style={{ paddingHorizontal: 8, paddingVertical: 4 }}>
                  <Text style={{ color: SUBTLE, fontSize: 16, fontWeight: '600' }}>Cancel</Text>
                </Pressable>
                <Text style={{ color: '#FFFFFF', fontSize: 16, fontWeight: '700' }}>
                  {pickerMode === 'date' ? 'Pick a date' : 'Pick a time'}
                </Text>
                <Pressable onPress={handlePickerDone} hitSlop={8} style={{ paddingHorizontal: 8, paddingVertical: 4 }}>
                  <Text style={{ color: ORANGE, fontSize: 16, fontWeight: '700' }}>Done</Text>
                </Pressable>
              </View>
              <DateTimePicker
                value={
                  pickerMode === 'date'
                    ? selectedDate || new Date()
                    : selectedTime || new Date()
                }
                mode={pickerMode}
                display="spinner"
                onChange={onChangePicker}
                themeVariant="dark"
                minimumDate={pickerMode === 'date' ? new Date() : undefined}
              />
            </View>
          </Pressable>
        </Modal>
      ) : null}

      {/* Android one-shot picker */}
      {pickerMode && Platform.OS === 'android' ? (
        <DateTimePicker
          value={
            pickerMode === 'date'
              ? selectedDate || new Date()
              : selectedTime || new Date()
          }
          mode={pickerMode}
          display="default"
          onChange={onChangePicker}
          minimumDate={pickerMode === 'date' ? new Date() : undefined}
        />
      ) : null}
    </KeyboardAvoidingView>
  );
}

// =============== STEP INDICATOR ===============
function StepIndicator({
  num,
  label,
  active,
  done,
}: {
  num: number;
  label: string;
  active: boolean;
  done: boolean;
}) {
  const filled = active || done;
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
      <View
        style={{
          width: 24,
          height: 24,
          borderRadius: 12,
          backgroundColor: filled ? '#FFFFFF' : '#1C1C1E',
          borderWidth: filled ? 0 : 1,
          borderColor: '#3F3F46',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Text style={{ color: filled ? '#000000' : '#9CA3AF', fontSize: 12, fontWeight: '700' }}>
          {num}
        </Text>
      </View>
      <Text
        style={{
          color: filled ? '#FFFFFF' : '#9CA3AF',
          fontSize: 13,
          fontWeight: '600',
          marginLeft: 6,
        }}
      >
        {label}
      </Text>
    </View>
  );
}

// =============== STEP 1: HOURS ===============
function Step1Hours({
  talent,
  currency,
  unitPrice,
  rateType,
  hours,
  setHours,
  customAmount,
  setCustomAmount,
  isHourly,
  total,
}: {
  talent: TalentInfo;
  currency: string;
  unitPrice: number;
  rateType: RateType;
  hours: number;
  setHours: (n: number) => void;
  customAmount: string;
  setCustomAmount: (v: string) => void;
  isHourly: boolean;
  total: number;
}) {
  const dec = () => setHours(Math.max(1, hours - 1));
  const inc = () => setHours(Math.min(24, hours + 1));

  return (
    <View style={{ paddingHorizontal: 16, paddingTop: 16 }}>
      {/* Talent summary */}
      <View
        style={{
          backgroundColor: CARD,
          borderRadius: 16,
          padding: 12,
          flexDirection: 'row',
          alignItems: 'center',
          marginBottom: 24,
        }}
      >
        {talent.avatar_url ? (
          <Image
            source={{ uri: talent.avatar_url }}
            style={{ width: 48, height: 48, borderRadius: 12 }}
          />
        ) : (
          <View
            style={{
              width: 48,
              height: 48,
              borderRadius: 12,
              backgroundColor: ORANGE,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Text style={{ color: '#FFFFFF', fontWeight: '700' }}>
              {getInitials(talent.display_name)}
            </Text>
          </View>
        )}
        <View style={{ marginLeft: 12, flex: 1 }}>
          <Text style={{ color: '#FFFFFF', fontSize: 16, fontWeight: '700' }} numberOfLines={1}>
            {talent.display_name}
          </Text>
          <Text style={{ color: SUBTLE, fontSize: 13, marginTop: 2 }} numberOfLines={1}>
            {getCategoryLabel(talent.category)}
          </Text>
        </View>
      </View>

      {/* Rate display */}
      <View style={{ alignItems: 'center', marginBottom: 24 }}>
        <Text style={{ color: SUBTLE, fontSize: 13, marginBottom: 8 }}>
          {rateType === 'hourly'
            ? 'Hourly Rate'
            : rateType === 'session'
              ? 'Session Rate'
              : rateType === 'day'
                ? 'Day Rate'
                : rateType === 'project'
                  ? 'Project Rate'
                  : 'Set your offer'}
        </Text>
        {rateType === 'custom' ? null : (
          <View style={{ flexDirection: 'row', alignItems: 'baseline' }}>
            <Text style={{ color: '#FFFFFF', fontSize: 36, fontWeight: '800' }}>
              {currency} {unitPrice.toLocaleString()}
            </Text>
            <Text style={{ color: SUBTLE, fontSize: 16, fontWeight: '500', marginLeft: 4 }}>
              {getRateUnit(rateType)}
            </Text>
          </View>
        )}
      </View>

      {/* Hours stepper / Custom amount input */}
      {isHourly ? (
        <View style={{ backgroundColor: CARD, borderRadius: 16, padding: 16 }}>
          <Text style={{ color: SUBTLE, fontSize: 13, textAlign: 'center', marginBottom: 12 }}>
            How many hours do you need?
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 24 }}>
            <Pressable
              onPress={dec}
              disabled={hours <= 1}
              style={{
                width: 44,
                height: 44,
                borderRadius: 22,
                backgroundColor: CARD_INNER,
                alignItems: 'center',
                justifyContent: 'center',
                opacity: hours <= 1 ? 0.4 : 1,
              }}
            >
              <Minus size={18} color="#FFFFFF" />
            </Pressable>
            <View style={{ flex: 1, alignItems: 'center' }}>
              <View style={{ flexDirection: 'row', alignItems: 'baseline' }}>
                <Text style={{ color: '#FFFFFF', fontSize: 32, fontWeight: '800' }}>
                  {hours}
                </Text>
                <Text style={{ color: SUBTLE, fontSize: 16, marginLeft: 6 }}>hours</Text>
              </View>
            </View>
            <Pressable
              onPress={inc}
              disabled={hours >= 24}
              style={{
                width: 44,
                height: 44,
                borderRadius: 22,
                backgroundColor: CARD_INNER,
                alignItems: 'center',
                justifyContent: 'center',
                opacity: hours >= 24 ? 0.4 : 1,
              }}
            >
              <Plus size={18} color="#FFFFFF" />
            </Pressable>
          </View>

          <View
            style={{
              marginTop: 20,
              paddingTop: 16,
              borderTopWidth: 1,
              borderTopColor: '#2A2A2C',
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <Text style={{ color: SUBTLE, fontSize: 14 }}>Subtotal</Text>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={{ color: '#FFFFFF', fontSize: 22, fontWeight: '800' }}>
                {currency} {total.toLocaleString()}
              </Text>
              <Text style={{ color: SUBTLE, fontSize: 11, marginTop: 2 }}>
                + platform fee & VAT at checkout
              </Text>
            </View>
          </View>
        </View>
      ) : null}

      {rateType === 'custom' ? (
        <View style={{ backgroundColor: CARD, borderRadius: 16, padding: 16 }}>
          <Text style={{ color: SUBTLE, fontSize: 13, textAlign: 'center', marginBottom: 12 }}>
            Your offer amount
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ color: '#FFFFFF', fontSize: 22, fontWeight: '700', marginRight: 8 }}>
              {currency}
            </Text>
            <TextInput
              value={customAmount}
              onChangeText={(v) => setCustomAmount(v.replace(/[^0-9.]/g, ''))}
              placeholder="0"
              placeholderTextColor={SUBTLE}
              keyboardType="decimal-pad"
              style={{
                color: '#FFFFFF',
                fontSize: 32,
                fontWeight: '800',
                minWidth: 100,
                textAlign: 'center',
                borderBottomWidth: 1,
                borderBottomColor: '#3F3F46',
                paddingVertical: 4,
              }}
            />
          </View>

          <View
            style={{
              marginTop: 20,
              paddingTop: 16,
              borderTopWidth: 1,
              borderTopColor: '#2A2A2C',
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <Text style={{ color: SUBTLE, fontSize: 14 }}>Total</Text>
            <Text style={{ color: '#FFFFFF', fontSize: 22, fontWeight: '800' }}>
              {currency} {total.toLocaleString()}
            </Text>
          </View>
        </View>
      ) : null}

      {/* For session/day/project: just show subtotal card */}
      {!isHourly && rateType !== 'custom' ? (
        <View style={{ backgroundColor: CARD, borderRadius: 16, padding: 16 }}>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <Text style={{ color: SUBTLE, fontSize: 14 }}>Subtotal</Text>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={{ color: '#FFFFFF', fontSize: 22, fontWeight: '800' }}>
                {currency} {total.toLocaleString()}
              </Text>
              <Text style={{ color: SUBTLE, fontSize: 11, marginTop: 2 }}>
                + platform fee & VAT at checkout
              </Text>
            </View>
          </View>
        </View>
      ) : null}
    </View>
  );
}

// =============== STEP 2: DETAILS ===============
function Step2Details({
  selectedDate,
  selectedTime,
  location,
  setLocation,
  notes,
  setNotes,
  notesFocused,
  setNotesFocused,
  durationHours,
  onPickDate,
  onPickTime,
}: {
  selectedDate: Date | null;
  selectedTime: Date | null;
  location: string;
  setLocation: (v: string) => void;
  notes: string;
  setNotes: (v: string) => void;
  notesFocused: boolean;
  setNotesFocused: (v: boolean) => void;
  durationHours: number;
  onPickDate: () => void;
  onPickTime: () => void;
}) {
  return (
    <View style={{ paddingHorizontal: 16, paddingTop: 8 }}>
      <Text style={{ color: '#FFFFFF', fontSize: 24, fontWeight: '800', marginTop: 8 }}>
        When & Where
      </Text>
      <Text style={{ color: SUBTLE, fontSize: 13, marginTop: 4, marginBottom: 16 }}>
        Select an available time slot
      </Text>

      {/* Date + Time card */}
      <View style={{ backgroundColor: CARD, borderRadius: 16, padding: 16 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
          <CalendarIcon size={16} color="#FFFFFF" />
          <Text style={{ color: '#FFFFFF', fontSize: 14, fontWeight: '700', marginLeft: 8 }}>
            Date
          </Text>
        </View>
        <Pressable
          onPress={onPickDate}
          style={{
            backgroundColor: '#0F0F11',
            borderRadius: 12,
            paddingVertical: 14,
            paddingHorizontal: 14,
            flexDirection: 'row',
            alignItems: 'center',
            borderWidth: 1,
            borderColor: '#2A2A2C',
          }}
        >
          <CalendarIcon size={16} color={SUBTLE} />
          <Text
            style={{
              color: selectedDate ? '#FFFFFF' : SUBTLE,
              fontSize: 14,
              fontWeight: selectedDate ? '600' : '400',
              marginLeft: 8,
              flex: 1,
            }}
          >
            {selectedDate
              ? format(selectedDate, 'EEEE, MMMM d, yyyy')
              : 'Select a date'}
          </Text>
        </Pressable>

        <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 14, marginBottom: 8 }}>
          <Clock size={16} color="#FFFFFF" />
          <Text style={{ color: '#FFFFFF', fontSize: 14, fontWeight: '700', marginLeft: 8 }}>
            Time
          </Text>
        </View>
        <Pressable
          onPress={onPickTime}
          disabled={!selectedDate}
          style={{
            backgroundColor: '#0F0F11',
            borderRadius: 12,
            paddingVertical: 14,
            paddingHorizontal: 14,
            flexDirection: 'row',
            alignItems: 'center',
            borderWidth: 1,
            borderColor: '#2A2A2C',
            opacity: selectedDate ? 1 : 0.6,
          }}
        >
          <Text
            style={{
              color: selectedTime ? '#FFFFFF' : SUBTLE,
              fontSize: 14,
              fontWeight: selectedTime ? '600' : '400',
              flex: 1,
            }}
          >
            {selectedTime
              ? format(selectedTime, 'h:mm a')
              : !selectedDate
                ? 'Select date first'
                : 'Select a time'}
          </Text>
          <ChevronDown size={16} color={SUBTLE} />
        </Pressable>
      </View>

      {/* Confirmation status */}
      {selectedDate && selectedTime ? (
        <>
          <View
            style={{
              backgroundColor: 'rgba(34,197,94,0.1)',
              borderColor: 'rgba(34,197,94,0.3)',
              borderWidth: 1,
              borderRadius: 16,
              padding: 14,
              flexDirection: 'row',
              alignItems: 'center',
              marginTop: 16,
            }}
          >
            <View
              style={{
                width: 36,
                height: 36,
                borderRadius: 18,
                backgroundColor: 'rgba(34,197,94,0.2)',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Zap size={18} color="#22C55E" />
            </View>
            <View style={{ marginLeft: 12, flex: 1 }}>
              <Text style={{ color: '#FFFFFF', fontSize: 14, fontWeight: '700' }}>
                {format(selectedDate, 'EEEE, MMMM d')}
              </Text>
              <Text style={{ color: SUBTLE, fontSize: 12, marginTop: 2 }}>
                {format(selectedTime, 'h:mm a')} • {durationHours}h session
              </Text>
            </View>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 8 }}>
            <Sparkles size={12} color={ORANGE} />
            <Text style={{ color: ORANGE, fontSize: 12, fontWeight: '600', marginLeft: 4 }}>
              Instant confirmation
            </Text>
          </View>
        </>
      ) : null}

      {/* Location */}
      <View style={{ marginTop: 20 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
          <MapPin size={16} color="#FFFFFF" />
          <Text style={{ color: '#FFFFFF', fontSize: 14, fontWeight: '700', marginLeft: 8 }}>
            Location
          </Text>
        </View>
        <TextInput
          value={location}
          onChangeText={setLocation}
          onFocus={() => console.log('[BookNow] location focused')}
          placeholder="e.g., Dubai Marina, Studio address..."
          placeholderTextColor={SUBTLE}
          autoCapitalize="words"
          autoCorrect={false}
          returnKeyType="next"
          selectionColor={ORANGE}
          style={{
            backgroundColor: '#0F0F11',
            borderRadius: 12,
            paddingVertical: 14,
            paddingHorizontal: 14,
            color: '#FFFFFF',
            fontSize: 16,
            minHeight: 48,
            borderWidth: 1,
            borderColor: '#2A2A2C',
          }}
        />
      </View>

      {/* Notes */}
      <View style={{ marginTop: 16 }}>
        <Text style={{ color: '#FFFFFF', fontSize: 14, fontWeight: '700', marginBottom: 8 }}>
          Notes (optional)
        </Text>
        <TextInput
          value={notes}
          onChangeText={setNotes}
          onFocus={() => {
            console.log('[BookNow] notes focused');
            setNotesFocused(true);
          }}
          onBlur={() => setNotesFocused(false)}
          placeholder="Any special requirements or details..."
          placeholderTextColor={SUBTLE}
          multiline
          autoCorrect
          selectionColor={ORANGE}
          style={{
            backgroundColor: '#0F0F11',
            borderRadius: 12,
            paddingVertical: 14,
            paddingHorizontal: 14,
            color: '#FFFFFF',
            fontSize: 16,
            minHeight: 96,
            textAlignVertical: 'top',
            borderWidth: 1,
            borderColor: notesFocused ? ORANGE : '#2A2A2C',
          }}
        />
      </View>
    </View>
  );
}

// =============== STEP 3: CONFIRM ===============
function Step3Confirm({
  talent,
  currency,
  unitPrice,
  rateType,
  hours,
  isHourly,
  total,
  combinedStart,
  location,
  durationHours,
  pkg,
  submitError,
}: {
  talent: TalentInfo;
  currency: string;
  unitPrice: number;
  rateType: RateType;
  hours: number;
  isHourly: boolean;
  total: number;
  combinedStart: Date | null;
  location: string;
  durationHours: number;
  pkg: PackageInfo | null;
  submitError: string | null;
}) {
  const dateText = combinedStart
    ? `${format(combinedStart, 'MMM d, yyyy')} • ${format(combinedStart, 'HH:mm')}`
    : '—';

  const lineLabel = pkg
    ? pkg.name
    : rateType === 'custom'
      ? 'Custom Booking'
      : `${getRateBookingTitle(rateType)}`;

  const lineSub = pkg
    ? `${pkg.duration_hours || 1} hours`
    : isHourly
      ? `${hours} hours × ${currency} ${unitPrice.toLocaleString()}/hr`
      : rateType === 'custom'
        ? `Custom amount`
        : `${getRateDurationLabel(rateType, hours)} × ${currency} ${unitPrice.toLocaleString()}${getRateUnit(rateType)}`;

  return (
    <View style={{ paddingHorizontal: 16, paddingTop: 8 }}>
      <Text style={{ color: '#FFFFFF', fontSize: 24, fontWeight: '800', marginTop: 8 }}>
        Review & Send Request
      </Text>
      <Text style={{ color: SUBTLE, fontSize: 13, marginTop: 4, marginBottom: 16 }}>
        Talent will review and accept before payment
      </Text>

      {/* Talent summary */}
      <View
        style={{
          backgroundColor: CARD,
          borderRadius: 16,
          padding: 12,
          flexDirection: 'row',
          alignItems: 'center',
          marginBottom: 12,
        }}
      >
        {talent.avatar_url ? (
          <Image
            source={{ uri: talent.avatar_url }}
            style={{ width: 48, height: 48, borderRadius: 24 }}
          />
        ) : (
          <View
            style={{
              width: 48,
              height: 48,
              borderRadius: 24,
              backgroundColor: ORANGE,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Text style={{ color: '#FFFFFF', fontWeight: '700' }}>
              {getInitials(talent.display_name)}
            </Text>
          </View>
        )}
        <View style={{ marginLeft: 12, flex: 1 }}>
          <Text style={{ color: '#FFFFFF', fontSize: 16, fontWeight: '700' }} numberOfLines={1}>
            {talent.display_name}
          </Text>
          <Text style={{ color: SUBTLE, fontSize: 13, marginTop: 2 }} numberOfLines={1}>
            {getCategoryLabel(talent.category)}
          </Text>
        </View>
      </View>

      {/* Details card */}
      <View style={{ backgroundColor: CARD, borderRadius: 16, padding: 16, marginBottom: 12 }}>
        <Text style={{ color: '#FFFFFF', fontSize: 16, fontWeight: '700', marginBottom: 12 }}>
          Details
        </Text>

        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 6 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <CalendarIcon size={14} color={SUBTLE} />
            <Text style={{ color: SUBTLE, fontSize: 13, marginLeft: 8 }}>Date</Text>
          </View>
          <Text style={{ color: ORANGE, fontSize: 13, fontWeight: '700' }}>{dateText}</Text>
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 6 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Clock size={14} color={SUBTLE} />
            <Text style={{ color: SUBTLE, fontSize: 13, marginLeft: 8 }}>Duration</Text>
          </View>
          <Text style={{ color: ORANGE, fontSize: 13, fontWeight: '700' }}>{durationHours} hours</Text>
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 6 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <MapPin size={14} color={SUBTLE} />
            <Text style={{ color: SUBTLE, fontSize: 13, marginLeft: 8 }}>Location</Text>
          </View>
          <Text style={{ color: ORANGE, fontSize: 13, fontWeight: '700', flex: 1, textAlign: 'right' }} numberOfLines={1}>
            {location || '—'}
          </Text>
        </View>
      </View>

      {/* Selected booking summary */}
      <View style={{ backgroundColor: CARD, borderRadius: 16, padding: 16, marginBottom: 12 }}>
        <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' }}>
          <View style={{ flex: 1 }}>
            <Text style={{ color: '#FFFFFF', fontSize: 16, fontWeight: '700' }}>{lineLabel}</Text>
            <Text style={{ color: SUBTLE, fontSize: 12, marginTop: 4 }}>{lineSub}</Text>
          </View>
          <Text style={{ color: '#FFFFFF', fontSize: 16, fontWeight: '700' }}>
            {currency} {total.toLocaleString()}
          </Text>
        </View>
      </View>

      {/* Price Breakdown (white card) */}
      <View
        style={{
          backgroundColor: '#FFFFFF',
          borderRadius: 16,
          padding: 16,
          marginBottom: 12,
        }}
      >
        <Text style={{ color: '#0A0A0A', fontSize: 16, fontWeight: '700', marginBottom: 12 }}>
          Price Breakdown
        </Text>
        <PriceRow label="Talent Rate" value={`${currency} ${total.toLocaleString()}`} />
        <PriceRow label="Platform Fee (49 AED)" value={`${currency} 0`} />
        <PriceRow label="Banking Fee (2.9%)" value={`${currency} 0`} />
        <PriceRow label="VAT (5% on fee)" value={`${currency} 0`} />
        <View style={{ height: 1, backgroundColor: '#E5E7EB', marginVertical: 10 }} />
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <Text style={{ color: '#0A0A0A', fontSize: 16, fontWeight: '800' }}>Total</Text>
          <Text style={{ color: '#0A0A0A', fontSize: 18, fontWeight: '800' }}>
            {currency} {total.toLocaleString()}
          </Text>
        </View>
      </View>

      {/* Awaiting Response pill */}
      <View
        style={{
          backgroundColor: 'rgba(245,158,11,0.12)',
          borderColor: 'rgba(245,158,11,0.35)',
          borderWidth: 1,
          borderRadius: 16,
          padding: 14,
          flexDirection: 'row',
          alignItems: 'center',
          marginBottom: 12,
        }}
      >
        <View
          style={{
            width: 36,
            height: 36,
            borderRadius: 18,
            backgroundColor: 'rgba(245,158,11,0.25)',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Clock size={18} color="#F59E0B" />
        </View>
        <View style={{ marginLeft: 12, flex: 1 }}>
          <Text style={{ color: '#FFFFFF', fontSize: 14, fontWeight: '700' }}>Awaiting Response</Text>
          <Text style={{ color: SUBTLE, fontSize: 12, marginTop: 2 }}>Waiting for talent to accept</Text>
        </View>
        <Text style={{ color: '#FFFFFF', fontSize: 14, fontWeight: '700' }}>
          {currency} {total.toLocaleString()}
        </Text>
      </View>

      {/* Escrow card */}
      <View
        style={{
          backgroundColor: 'rgba(250,86,16,0.1)',
          borderColor: 'rgba(250,86,16,0.4)',
          borderWidth: 1,
          borderRadius: 16,
          padding: 14,
          marginBottom: 12,
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
          <Shield size={16} color={ORANGE} />
          <Text style={{ color: ORANGE, fontSize: 14, fontWeight: '700', marginLeft: 8 }}>
            100% Secure Escrow
          </Text>
        </View>
        <Text style={{ color: SUBTLE, fontSize: 12, lineHeight: 18 }}>
          Payment is only required after the talent accepts. Funds are held securely until both parties confirm the gig is complete.
        </Text>
      </View>

      <Text style={{ color: SUBTLE, fontSize: 11, textAlign: 'center', paddingHorizontal: 8, lineHeight: 16 }}>
        Free cancellation before talent accepts. After payment, 48hr notice required for full refund.
      </Text>

      {submitError ? (
        <View
          style={{
            marginTop: 12,
            backgroundColor: 'rgba(239,68,68,0.12)',
            borderColor: 'rgba(239,68,68,0.4)',
            borderWidth: 1,
            borderRadius: 12,
            padding: 12,
            flexDirection: 'row',
            alignItems: 'flex-start',
          }}
        >
          <AlertCircle size={16} color="#EF4444" />
          <Text style={{ color: '#FCA5A5', fontSize: 13, marginLeft: 8, flex: 1 }}>{submitError}</Text>
        </View>
      ) : null}
    </View>
  );
}

function PriceRow({ label, value }: { label: string; value: string }) {
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 4,
      }}
    >
      <Text style={{ color: '#374151', fontSize: 14 }}>{label}</Text>
      <Text style={{ color: '#0A0A0A', fontSize: 14, fontWeight: '600' }}>{value}</Text>
    </View>
  );
}
