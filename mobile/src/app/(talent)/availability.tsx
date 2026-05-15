import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  Modal,
  TextInput,
  Switch,
  Alert,
  FlatList,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import {
  ChevronLeft,
  ChevronRight,
  Calendar,
  Clock,
  AlertCircle,
  Briefcase,
  X,
  Trash2,
  Check,
  Ban,
  Plus,
} from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/lib/state/auth-store';
import {
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  format,
  getDay,
  isBefore,
  isToday,
  isSameDay,
  addDays,
  parseISO,
  setHours,
  setMinutes,
  startOfDay,
  endOfDay,
  isAfter,
  isSameMonth,
  getDaysInMonth,
} from 'date-fns';
import { SkeletonLoader } from '@/components/SkeletonLoader';
import { extractErrorMessage } from '@/lib/errorUtils';

// Type definitions
interface TimeOffPeriod {
  id: string;
  talent_id: string;
  start_at: string;
  end_at: string;
  reason?: string;
}

interface CalendarEvent {
  id: string;
  talent_id: string;
  event_date: string;
  start_time: string;
  end_time: string;
  type: string;
  title?: string;
}

interface RecurringTimeOff {
  id: string;
  talent_id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
}

interface Booking {
  id: string;
  scheduled_start: string;
  scheduled_end: string;
  location?: string;
  status: string;
}

interface DayAvailability {
  date: Date;
  isTimeOff: boolean;
  hasBookings: boolean;
  availableHours: number;
  bookedHours: number;
  blockedHours: number;
  status: 'available' | 'partial' | 'booked' | 'unavailable';
  bookings: Booking[];
}

// Utility functions
const getAllDayHours = (): number[] => Array.from({ length: 24 }, (_, i) => i);

const getHoursInRange = (startTime: string, endTime: string): number[] => {
  const [startH] = startTime.split(':').map(Number);
  const [endH] = endTime.split(':').map(Number);
  const hours = [];
  for (let i = startH; i < endH; i++) {
    hours.push(i);
  }
  return hours;
};

const isDateInTimeOff = (date: Date, timeOffPeriods: TimeOffPeriod[]): boolean => {
  return timeOffPeriods.some((period) => {
    const start = parseISO(period.start_at);
    const end = parseISO(period.end_at);
    return isAfter(date, start) && isBefore(date, end);
  });
};

const getBookedHoursForDate = (date: Date, bookings: Booking[]): number[] => {
  const bookedHours = new Set<number>();
  bookings.forEach((booking) => {
    const bookStart = parseISO(booking.scheduled_start);
    const bookEnd = parseISO(booking.scheduled_end);
    if (isSameDay(bookStart, date)) {
      for (let i = bookStart.getHours(); i < bookEnd.getHours(); i++) {
        bookedHours.add(i);
      }
    }
  });
  return Array.from(bookedHours).sort((a, b) => a - b);
};

const getPrivateBlockHoursForDate = (date: Date, events: CalendarEvent[]): number[] => {
  const blockedHours = new Set<number>();
  events.forEach((event) => {
    if (event.type === 'private_block' && isSameDay(parseISO(event.event_date), date)) {
      getHoursInRange(event.start_time, event.end_time).forEach((h) => blockedHours.add(h));
    }
  });
  return Array.from(blockedHours).sort((a, b) => a - b);
};

const getRecurringBlocksForDate = (date: Date, recurring: RecurringTimeOff[]): number[] => {
  const dayOfWeek = getDay(date);
  const blockedHours = new Set<number>();
  recurring.forEach((pattern) => {
    if (pattern.day_of_week === dayOfWeek) {
      getHoursInRange(pattern.start_time, pattern.end_time).forEach((h) => blockedHours.add(h));
    }
  });
  return Array.from(blockedHours).sort((a, b) => a - b);
};

const computeDayAvailability = (
  date: Date,
  timeOffPeriods: TimeOffPeriod[],
  events: CalendarEvent[],
  recurring: RecurringTimeOff[],
  bookings: Booking[]
): DayAvailability => {
  const isTimeOff = isDateInTimeOff(date, timeOffPeriods);
  const bookedHours = getBookedHoursForDate(date, bookings);
  const blockedHours = getPrivateBlockHoursForDate(date, events);
  const recurringBlocks = getRecurringBlocksForDate(date, recurring);

  const allBlockedHours = new Set([...blockedHours, ...recurringBlocks]);
  const totalUnavailable = new Set([...bookedHours, ...allBlockedHours]);

  let status: 'available' | 'partial' | 'booked' | 'unavailable' = 'available';
  if (isTimeOff) {
    status = 'unavailable';
  } else if (bookedHours.length > 0 && totalUnavailable.size === 24) {
    status = 'booked';
  } else if (totalUnavailable.size > 0) {
    status = 'partial';
  }

  const availableHours = 24 - totalUnavailable.size;

  return {
    date,
    isTimeOff,
    hasBookings: bookedHours.length > 0,
    availableHours: isTimeOff ? 0 : availableHours,
    bookedHours: bookedHours.length,
    blockedHours: allBlockedHours.size,
    status,
    bookings: bookings.filter((b) => isSameDay(parseISO(b.scheduled_start), date)),
  };
};

export default function AvailabilityScreen() {
  const insets = useSafeAreaInsets();
  const user = useAuthStore((s) => s.user);

  // State
  const [isLoading, setIsLoading] = useState(true);
  const [timeOffPeriods, setTimeOffPeriods] = useState<TimeOffPeriod[]>([]);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [recurringTimeOff, setRecurringTimeOff] = useState<RecurringTimeOff[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [talentId, setTalentId] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<'calendar' | 'timeoff'>('calendar');
  const [viewMode, setViewMode] = useState<'month' | 'day'>('month');
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [hourlyViewDate, setHourlyViewDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  // Sheet states
  const [showDayDetail, setShowDayDetail] = useState(false);
  const [showAddTimeOff, setShowAddTimeOff] = useState(false);
  const [showAddRecurring, setShowAddRecurring] = useState(false);

  // Form states
  const [timeOffFormData, setTimeOffFormData] = useState({
    startDate: null as Date | null,
    endDate: null as Date | null,
    startTime: '09:00',
    endTime: '17:00',
    isFullDay: true,
  });

  const [recurringFormData, setRecurringFormData] = useState({
    selectedDays: new Set<number>(),
    startTime: '09:00',
    endTime: '17:00',
  });

  // Data fetching
  const fetchData = useCallback(async () => {
    if (!user?.id) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);

      // Get talent profile
      const { data: talentData } = await supabase
        .from('talent_profiles')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (!talentData) {
        setIsLoading(false);
        return;
      }

      setTalentId(talentData.id);

      // Fetch all data in parallel
      const [timeOffRes, eventsRes, recurringRes, bookingsRes] = await Promise.all([
        // Time off periods (future only)
        supabase
          .from('talent_time_off')
          .select('*')
          .eq('talent_id', talentData.id)
          .gte('end_at', new Date().toISOString()),

        // Calendar events (private blocks)
        supabase
          .from('calendar_events')
          .select('*')
          .eq('talent_id', talentData.id)
          .eq('type', 'private_block')
          .gte('event_date', format(new Date(), 'yyyy-MM-dd')),

        // Recurring time off
        supabase
          .from('talent_recurring_time_off')
          .select('*')
          .eq('talent_id', talentData.id),

        // Confirmed bookings
        supabase
          .from('booking_talents')
          .select(
            `
            bookings (
              id,
              scheduled_start,
              scheduled_end,
              location,
              status
            )
          `
          )
          .eq('talent_id', talentData.id)
          .eq('bookings.status', 'confirmed'),
      ]);

      if (timeOffRes.data) setTimeOffPeriods(timeOffRes.data);
      if (eventsRes.data) setEvents(eventsRes.data);
      if (recurringRes.data) setRecurringTimeOff(recurringRes.data);

      // Extract bookings from the booking_talents join
      if (bookingsRes.data) {
        const extractedBookings = bookingsRes.data
          .flatMap((bt: any) => bt.bookings || [])
          .filter((b: any) => b.scheduled_start);
        setBookings(extractedBookings);
      }
    } catch (err) {
      const errorMsg = extractErrorMessage(err);
      console.error('Error fetching availability data:', errorMsg);
      Alert.alert('Error', 'Failed to load availability data');
    } finally {
      setIsLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Computed values
  const monthDays = useMemo(() => {
    const start = startOfMonth(currentMonth);
    const end = endOfMonth(currentMonth);
    return eachDayOfInterval({ start, end });
  }, [currentMonth]);

  const dayAvailabilities = useMemo(() => {
    return monthDays.map((date) =>
      computeDayAvailability(date, timeOffPeriods, events, recurringTimeOff, bookings)
    );
  }, [monthDays, timeOffPeriods, events, recurringTimeOff, bookings]);

  const availableDaysCount = useMemo(() => {
    const nextDays = eachDayOfInterval({
      start: new Date(),
      end: addDays(new Date(), 30),
    });
    return nextDays.filter(
      (date) =>
        !isBefore(date, new Date()) &&
        !isDateInTimeOff(date, timeOffPeriods)
    ).length;
  }, [timeOffPeriods]);

  const upcomingBookings = useMemo(() => {
    return bookings
      .filter((b) => isAfter(parseISO(b.scheduled_start), new Date()))
      .sort((a, b) => new Date(a.scheduled_start).getTime() - new Date(b.scheduled_start).getTime())
      .slice(0, 5);
  }, [bookings]);

  const todayBooking = useMemo(() => {
    const today = new Date();
    return bookings.find((b) => isSameDay(parseISO(b.scheduled_start), today));
  }, [bookings]);

  const selectedDateAvailability = useMemo(() => {
    if (!selectedDate) return null;
    return computeDayAvailability(
      selectedDate,
      timeOffPeriods,
      events,
      recurringTimeOff,
      bookings
    );
  }, [selectedDate, timeOffPeriods, events, recurringTimeOff, bookings]);

  // Event handlers
  const handleAddTimeOff = async () => {
    if (!talentId || !timeOffFormData.startDate || !timeOffFormData.endDate) {
      Alert.alert('Error', 'Please select dates');
      return;
    }

    try {
      const startDate = timeOffFormData.startDate;
      const endDate = addDays(timeOffFormData.endDate, 1);

      const startDateTime = timeOffFormData.isFullDay
        ? startOfDay(startDate)
        : setMinutes(setHours(startDate, parseInt(timeOffFormData.startTime.split(':')[0])), parseInt(timeOffFormData.startTime.split(':')[1]));

      const endDateTime = timeOffFormData.isFullDay
        ? startOfDay(endDate)
        : setMinutes(setHours(endDate, parseInt(timeOffFormData.endTime.split(':')[0])), parseInt(timeOffFormData.endTime.split(':')[1]));

      const { error } = await supabase.from('talent_time_off').insert([
        {
          talent_id: talentId,
          start_at: startDateTime.toISOString(),
          end_at: endDateTime.toISOString(),
          reason: 'User blocked',
        },
      ]);

      if (error) throw error;

      Alert.alert('Success', 'Time off added');
      setShowAddTimeOff(false);
      setTimeOffFormData({
        startDate: null,
        endDate: null,
        startTime: '09:00',
        endTime: '17:00',
        isFullDay: true,
      });
      await fetchData();
    } catch (err) {
      const errorMsg = extractErrorMessage(err);
      console.error('Error adding time off:', errorMsg);
      Alert.alert('Error', 'Failed to add time off');
    }
  };

  const handleDeleteTimeOff = async (id: string) => {
    try {
      const { error } = await supabase.from('talent_time_off').delete().eq('id', id);

      if (error) throw error;

      Alert.alert('Success', 'Time off removed');
      await fetchData();
    } catch (err) {
      const errorMsg = extractErrorMessage(err);
      console.error('Error deleting time off:', errorMsg);
      Alert.alert('Error', 'Failed to delete time off');
    }
  };

  const handleAddRecurring = async () => {
    if (recurringFormData.selectedDays.size === 0) {
      Alert.alert('Error', 'Please select at least one day');
      return;
    }

    if (!talentId) return;

    try {
      const inserts = Array.from(recurringFormData.selectedDays).map((day) => ({
        talent_id: talentId,
        day_of_week: day,
        start_time: recurringFormData.startTime,
        end_time: recurringFormData.endTime,
      }));

      const { error } = await supabase.from('talent_recurring_time_off').insert(inserts);

      if (error) throw error;

      Alert.alert('Success', 'Recurring pattern added');
      setShowAddRecurring(false);
      setRecurringFormData({
        selectedDays: new Set<number>(),
        startTime: '09:00',
        endTime: '17:00',
      });
      await fetchData();
    } catch (err) {
      const errorMsg = extractErrorMessage(err);
      console.error('Error adding recurring:', errorMsg);
      Alert.alert('Error', 'Failed to add recurring pattern');
    }
  };

  const handleDeleteRecurring = async (id: string) => {
    try {
      const { error } = await supabase
        .from('talent_recurring_time_off')
        .delete()
        .eq('id', id);

      if (error) throw error;

      Alert.alert('Success', 'Recurring pattern removed');
      await fetchData();
    } catch (err) {
      const errorMsg = extractErrorMessage(err);
      console.error('Error deleting recurring:', errorMsg);
      Alert.alert('Error', 'Failed to delete recurring pattern');
    }
  };

  const handleBlockDay = async () => {
    if (!selectedDate || !talentId) return;

    try {
      const startOfSelectedDay = startOfDay(selectedDate);
      const endOfSelectedDay = endOfDay(selectedDate);

      const { error } = await supabase.from('talent_time_off').insert([
        {
          talent_id: talentId,
          start_at: startOfSelectedDay.toISOString(),
          end_at: endOfSelectedDay.toISOString(),
          reason: 'Day blocked',
        },
      ]);

      if (error) throw error;

      Alert.alert('Success', 'Day blocked');
      setShowDayDetail(false);
      await fetchData();
    } catch (err) {
      const errorMsg = extractErrorMessage(err);
      console.error('Error blocking day:', errorMsg);
      Alert.alert('Error', 'Failed to block day');
    }
  };

  const handleClearDay = async () => {
    if (!selectedDate || !talentId) return;

    try {
      // Delete all private blocks for this day
      const { error } = await supabase
        .from('calendar_events')
        .delete()
        .eq('talent_id', talentId)
        .eq('event_date', format(selectedDate, 'yyyy-MM-dd'))
        .eq('type', 'private_block');

      if (error) throw error;

      Alert.alert('Success', 'Day cleared');
      await fetchData();
    } catch (err) {
      const errorMsg = extractErrorMessage(err);
      console.error('Error clearing day:', errorMsg);
      Alert.alert('Error', 'Failed to clear day');
    }
  };

  const handleTogglePrivateBlock = async (hour: number) => {
    if (!selectedDate || !talentId) return;

    try {
      const eventDate = format(selectedDate, 'yyyy-MM-dd');
      const startTime = `${String(hour).padStart(2, '0')}:00`;
      const endTime = `${String(hour + 1).padStart(2, '0')}:00`;

      // Check if block exists
      const { data: existing } = await supabase
        .from('calendar_events')
        .select('id')
        .eq('talent_id', talentId)
        .eq('event_date', eventDate)
        .eq('start_time', startTime)
        .eq('type', 'private_block')
        .maybeSingle();

      if (existing) {
        // Delete
        await supabase.from('calendar_events').delete().eq('id', existing.id);
      } else {
        // Create
        await supabase.from('calendar_events').insert([
          {
            talent_id: talentId,
            event_date: eventDate,
            start_time: startTime,
            end_time: endTime,
            type: 'private_block',
            title: 'Private Block',
          },
        ]);
      }

      await fetchData();
    } catch (err) {
      const errorMsg = extractErrorMessage(err);
      console.error('Error toggling private block:', errorMsg);
      Alert.alert('Error', 'Failed to update block');
    }
  };

  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-white dark:bg-[#0A0A0A]">
        <ScrollView contentContainerStyle={{ flex: 1, justifyContent: 'center', padding: 16 }} scrollEnabled={false}>
          <SkeletonLoader width="100%" height={60} borderRadius={12} style={{ marginBottom: 16 }} />
          <SkeletonLoader width="100%" height={200} borderRadius={12} style={{ marginBottom: 16 }} />
          <SkeletonLoader width="100%" height={100} borderRadius={12} />
        </ScrollView>
      </View>
    );
  }

  // Calendar cell status colors
  const getStatusColor = (status: string): { bg: string; border: string; text: string } => {
    switch (status) {
      case 'available':
        return { bg: '#dcfce7', border: '#86efac', text: '#166534' };
      case 'partial':
        return { bg: '#fef3c7', border: '#fde047', text: '#92400e' };
      case 'booked':
        return { bg: '#ede9fe', border: '#ddd6fe', text: '#fa5610' };
      case 'unavailable':
        return { bg: '#f3f4f6', border: '#f3f4f6', text: '#9ca3af' };
      default:
        return { bg: '#fff', border: '#e5e7eb', text: '#000' };
    }
  };

  // Render month view
  const renderMonthView = () => {
    const weekDays = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
    const firstDay = getDay(startOfMonth(currentMonth));
    const daysInMonth = getDaysInMonth(currentMonth);

    const cells = [];
    for (let i = 0; i < firstDay; i++) {
      cells.push(null);
    }
    for (let i = 1; i <= daysInMonth; i++) {
      cells.push(i);
    }

    return (
      <ScrollView
        showsVerticalScrollIndicator={false}
        className="flex-1 bg-white dark:bg-[#0A0A0A]"
        contentContainerStyle={{ paddingBottom: 100 }}
      >
        {/* Month navigation */}
        <View className="flex-row items-center justify-between px-4 py-4">
          <Pressable onPress={() => setCurrentMonth(addDays(currentMonth, -28))}>
            <ChevronLeft size={20} color="#9ca3af" />
          </Pressable>
          <Text className="text-lg font-semibold text-gray-900">
            {format(currentMonth, 'MMMM yyyy')}
          </Text>
          <Pressable onPress={() => setCurrentMonth(addDays(currentMonth, 28))}>
            <ChevronRight size={20} color="#9ca3af" />
          </Pressable>
        </View>

        {/* Weekday headers */}
        <View className="flex-row px-4 mb-2">
          {weekDays.map((day) => (
            <View key={day} className="flex-1 items-center py-2">
              <Text className="text-xs font-medium text-gray-500">{day}</Text>
            </View>
          ))}
        </View>

        {/* Calendar grid */}
        <View className="px-4">
          <View className="flex-row flex-wrap">
            {cells.map((dayNum, index) => {
              if (dayNum === null) {
                return (
                  <View key={`empty-${index}`} className="w-1/7 aspect-square" />
                );
              }

              const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), dayNum);
              const availability = dayAvailabilities.find((a) => isSameDay(a.date, date));
              const isPast = isBefore(date, startOfDay(new Date()));
              const isCurrentDay = isToday(date);

              const colors = availability ? getStatusColor(availability.status) : { bg: '#fff', border: '#e5e7eb', text: '#000' };

              return (
                <Pressable
                  key={`${currentMonth.getFullYear()}-${currentMonth.getMonth()}-${dayNum}`}
                  disabled={isPast}
                  onPress={() => {
                    setSelectedDate(date);
                    setShowDayDetail(true);
                  }}
                  className="w-1/7 aspect-square mb-2"
                  style={{
                    opacity: isPast ? 0.4 : 1,
                  }}
                >
                  <View
                    className="flex-1 rounded-xl items-center justify-center border"
                    style={{
                      backgroundColor: colors.bg,
                      borderColor: colors.border,
                    }}
                  >
                    <Text
                      className="text-sm font-semibold"
                      style={{
                        color: isCurrentDay ? '#fa5610' : colors.text,
                        fontWeight: isCurrentDay ? '700' : '600',
                      }}
                    >
                      {dayNum}
                    </Text>
                    {availability ? (
                      <Text className="text-xs mt-0.5" style={{ color: colors.text }}>
                        {availability.status === 'unavailable'
                          ? null
                          : `${availability.availableHours}h`}
                      </Text>
                    ) : null}
                  </View>
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* Legend */}
        <View className="px-4 mt-6 mb-4">
          <View className="flex-row gap-4">
            <View className="flex-row items-center gap-2">
              <View className="w-3 h-3 rounded-full bg-green-500" />
              <Text className="text-xs text-gray-600">Available</Text>
            </View>
            <View className="flex-row items-center gap-2">
              <View className="w-3 h-3 rounded-full bg-purple-500" />
              <Text className="text-xs text-gray-600">Booked</Text>
            </View>
            <View className="flex-row items-center gap-2">
              <View className="w-3 h-3 rounded-full bg-gray-400" />
              <Text className="text-xs text-gray-600">Off</Text>
            </View>
          </View>
        </View>

        {/* Help text */}
        <View className="px-4 mb-6">
          <Text className="text-xs text-gray-500">Tap any date to view details or add time off.</Text>
        </View>

        {/* Today's booking */}
        {todayBooking ? (
          <View className="px-4 mb-6">
            <View
              className="border rounded-4xl p-4 flex-row items-center gap-3"
              style={{ backgroundColor: '#ede9fe', borderColor: '#ddd6fe' }}
            >
              <Clock size={20} color="#fa5610" />
              <View className="flex-1">
                <Text className="text-sm font-semibold text-gray-900">Booked Today</Text>
                <Text className="text-xs text-gray-600">
                  {format(parseISO(todayBooking.scheduled_start), 'h:mm a')}
                </Text>
              </View>
            </View>
          </View>
        ) : null}

        {/* Upcoming bookings */}
        <View className="px-4 mb-6">
          {upcomingBookings.length === 0 ? (
            <View className="items-center py-8">
              <Briefcase size={40} color="#d1d5db" />
              <Text className="text-base font-semibold text-gray-900 mt-2">No upcoming bookings</Text>
              <Text className="text-xs text-gray-500 text-center mt-1">
                You're all set! More bookings coming soon.
              </Text>
            </View>
          ) : (
            <View>
              <Text className="text-sm font-semibold text-gray-900 mb-3">Upcoming Bookings</Text>
              {upcomingBookings.map((booking) => (
                <View
                  key={booking.id}
                  className="border border-gray-200 rounded-xl p-3 mb-2 flex-row items-center justify-between"
                >
                  <View className="flex-1">
                    <Text className="text-sm font-medium text-gray-900">
                      {format(parseISO(booking.scheduled_start), 'MMM d')}
                    </Text>
                    <Text className="text-xs text-gray-600">
                      {format(parseISO(booking.scheduled_start), 'h:mm a')}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          )}
        </View>
      </ScrollView>
    );
  };

  // Render day view
  const renderDayView = () => {
    const hours = getAllDayHours();

    return (
      <ScrollView
        showsVerticalScrollIndicator={false}
        className="flex-1 bg-white dark:bg-[#0A0A0A]"
        contentContainerStyle={{ paddingBottom: 100 }}
      >
        {/* Day navigation */}
        <View className="flex-row items-center justify-between px-4 py-4">
          <Pressable onPress={() => setHourlyViewDate(addDays(hourlyViewDate, -1))}>
            <ChevronLeft size={20} color="#9ca3af" />
          </Pressable>
          <Text className="text-lg font-semibold text-gray-900">
            {format(hourlyViewDate, 'EEEE, MMMM d, yyyy')}
          </Text>
          <Pressable onPress={() => setHourlyViewDate(addDays(hourlyViewDate, 1))}>
            <ChevronRight size={20} color="#9ca3af" />
          </Pressable>
        </View>

        {/* Quick actions */}
        <View className="px-4 py-4 flex-row gap-2">
          <Pressable
            onPress={() => handleClearDay()}
            className="flex-1 border border-gray-200 rounded-xl py-3 items-center"
          >
            <Text className="text-sm font-medium text-gray-900">All Day</Text>
          </Pressable>
          <Pressable
            onPress={() => {
              setSelectedDate(hourlyViewDate);
              setShowDayDetail(true);
            }}
            className="flex-1 border border-red-300 rounded-xl py-3 items-center bg-red-50"
          >
            <Text className="text-sm font-medium text-red-600">Block Day</Text>
          </Pressable>
        </View>

        {/* Hourly timeline */}
        <View className="px-4 gap-0">
          {hours.map((hour) => {
            const dayAvail = computeDayAvailability(
              hourlyViewDate,
              timeOffPeriods,
              events,
              recurringTimeOff,
              bookings
            );
            const hourStr = String(hour).padStart(2, '0');
            const bookedHours = getBookedHoursForDate(hourlyViewDate, bookings);
            const blockedHours = getPrivateBlockHoursForDate(hourlyViewDate, events);
            const recurringBlocks = getRecurringBlocksForDate(hourlyViewDate, recurringTimeOff);

            const isBooked = bookedHours.includes(hour);
            const isBlocked = blockedHours.includes(hour) || recurringBlocks.includes(hour);
            const isTimeOff = dayAvail.isTimeOff;

            let bgColor = '#dcfce7';
            let borderColor = '#86efac';
            if (isTimeOff) {
              bgColor = '#f3f4f6';
              borderColor = '#e5e7eb';
            } else if (isBooked) {
              bgColor = '#ede9fe';
              borderColor = '#ddd6fe';
            } else if (isBlocked) {
              bgColor = '#fef3c7';
              borderColor = '#fde047';
            }

            return (
              <Pressable
                key={hour}
                onPress={() => !isTimeOff && !isBooked && handleTogglePrivateBlock(hour)}
                disabled={isTimeOff || isBooked}
                className="py-3 flex-row items-center border-b border-gray-100"
              >
                <Text className="w-16 text-xs font-medium text-gray-500">
                  {hourStr}:00
                </Text>
                <View
                  className="flex-1 h-10 rounded-lg border"
                  style={{ backgroundColor: bgColor, borderColor }}
                />
                <Text className="w-20 text-xs text-gray-600 text-right">
                  {isTimeOff ? 'Off' : isBooked ? 'Booked' : isBlocked ? 'Blocked' : 'Free'}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </ScrollView>
    );
  };

  // Render time off tab
  const renderTimeOffTab = () => {
    const groupedRecurring = recurringTimeOff.reduce(
      (acc, pattern) => {
        const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        const key = dayNames[pattern.day_of_week];
        if (!acc[key]) acc[key] = [];
        acc[key].push(pattern);
        return acc;
      },
      {} as Record<string, RecurringTimeOff[]>
    );

    return (
      <ScrollView
        showsVerticalScrollIndicator={false}
        className="flex-1 bg-white dark:bg-[#0A0A0A]"
        contentContainerStyle={{ paddingBottom: 100 }}
      >
        {/* Specific time off section */}
        <View className="px-4 py-6">
          <View className="flex-row items-center justify-between mb-4">
            <View className="flex-row items-center gap-2">
              <Calendar size={18} color="#fa5610" />
              <View className="flex-1">
                <Text className="text-base font-semibold text-gray-900">Specific Time Off</Text>
                <Text className="text-xs text-gray-500">Block specific dates and times</Text>
              </View>
            </View>
            <Pressable
              onPress={() => setShowAddTimeOff(true)}
              className="bg-purple-100 px-3 py-2 rounded-lg"
            >
              <Plus size={16} color="#fa5610" />
            </Pressable>
          </View>

          {timeOffPeriods.length === 0 ? (
            <View className="items-center py-8">
              <Calendar size={40} color="#d1d5db" />
              <Text className="text-sm text-gray-600 mt-2">No time off scheduled</Text>
            </View>
          ) : (
            <View>
              {timeOffPeriods.map((period) => {
                const startDate = parseISO(period.start_at);
                const endDate = parseISO(period.end_at);
                const isSameDate = isSameDay(startDate, addDays(endDate, -1));
                const isSameHour = startDate.getHours() === 0 && endDate.getHours() === 0;

                let dateText = '';
                if (isSameDate && isSameHour) {
                  dateText = format(startDate, 'EEEE, MMM d');
                } else if (isSameHour) {
                  dateText = `${format(startDate, 'MMM d')} - ${format(
                    addDays(endDate, -1),
                    'MMM d, yyyy'
                  )}`;
                } else if (isSameDate) {
                  dateText = `${format(startDate, 'MMM d, h:mm a')} - ${format(
                    endDate,
                    'h:mm a'
                  )}`;
                } else {
                  dateText = `${format(startDate, 'MMM d, h:mm a')} - ${format(
                    addDays(endDate, -1),
                    'MMM d, h:mm a'
                  )}`;
                }

                return (
                  <View
                    key={period.id}
                    className="border border-gray-200 rounded-xl p-3 mb-2 flex-row items-center justify-between"
                  >
                    <View className="flex-row items-center gap-3 flex-1">
                      <View className="w-10 h-10 rounded-lg bg-red-100 items-center justify-center">
                        <Calendar size={16} color="#ef4444" />
                      </View>
                      <View className="flex-1">
                        <Text className="text-sm font-medium text-gray-900">{dateText}</Text>
                      </View>
                    </View>
                    <Pressable onPress={() => handleDeleteTimeOff(period.id)}>
                      <Trash2 size={16} color="#ef4444" />
                    </Pressable>
                  </View>
                );
              })}
            </View>
          )}
        </View>

        {/* Recurring unavailability section */}
        <View className="px-4 py-6 border-t border-gray-100">
          <View className="flex-row items-center justify-between mb-4">
            <View className="flex-row items-center gap-2">
              <Ban size={18} color="#fa5610" />
              <View className="flex-1">
                <Text className="text-base font-semibold text-gray-900">Recurring Unavailability</Text>
                <Text className="text-xs text-gray-500">Block the same hours every week</Text>
              </View>
            </View>
            <Pressable
              onPress={() => setShowAddRecurring(true)}
              className="bg-purple-100 px-3 py-2 rounded-lg"
            >
              <Plus size={16} color="#fa5610" />
            </Pressable>
          </View>

          {recurringTimeOff.length === 0 ? (
            <View className="items-center py-8">
              <Ban size={40} color="#d1d5db" />
              <Text className="text-sm text-gray-600 mt-2">No recurring patterns</Text>
            </View>
          ) : (
            <View>
              {Object.entries(groupedRecurring).map(([day, patterns], idx) => (
                <View key={`recurring-${day}-${idx}`} className="mb-3">
                  <Text className="text-sm font-medium text-gray-900 mb-2">Every {day}</Text>
                  {patterns.map((pattern) => (
                    <View
                      key={pattern.id}
                      className="border border-gray-200 rounded-lg p-3 mb-2 flex-row items-center justify-between"
                    >
                      <View className="flex-row items-center gap-2">
                        <Clock size={14} color="#fa5610" />
                        <Text className="text-xs text-gray-600">
                          {pattern.start_time} - {pattern.end_time}
                        </Text>
                      </View>
                      <Pressable onPress={() => handleDeleteRecurring(pattern.id)}>
                        <Trash2 size={14} color="#ef4444" />
                      </Pressable>
                    </View>
                  ))}
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Info box */}
        <View className="mx-4 mb-6 p-4 rounded-xl border border-blue-200 bg-blue-50">
          <View className="flex-row items-start gap-3">
            <AlertCircle size={16} color="#3b82f6" />
            <View className="flex-1">
              <Text className="text-sm font-medium text-blue-900">How it works</Text>
              <Text className="text-xs text-blue-700 mt-1">
                You're available 24/7 by default. Use this section to block times when you're not
                available.
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>
    );
  };

  return (
    <View className="flex-1 bg-white dark:bg-[#0A0A0A]" style={{ paddingTop: insets.top }}>
      {/* Header */}
      <View className="px-4 py-4 flex-row items-center justify-between">
        <Pressable
          onPress={() => router.replace('/(talent)/profile')}
          className="w-10 h-10 rounded-full bg-gray-100 items-center justify-center"
        >
          <ChevronLeft size={20} color="#374151" />
        </Pressable>
        <View className="flex-1 ml-3">
          <Text className="text-xl font-bold text-gray-900">My Calendar</Text>
          <Text className="text-sm text-gray-500 mt-0.5">
            {availableDaysCount} days available · {upcomingBookings.length} upcoming
          </Text>
        </View>
        <View
          className="px-3 py-1.5 rounded-full flex-row items-center gap-1"
          style={{ backgroundColor: '#dcfce7' }}
        >
          <Check size={14} color="#16a34a" />
          <Text className="text-xs font-medium text-green-700">Active</Text>
        </View>
        <Pressable
          onPress={() => router.push('/(talent)/availability')}
          className="ml-3 px-3 py-1.5 rounded-full bg-[#fa5610] flex-row items-center"
        >
          <Text className="text-xs font-medium text-white">Manage</Text>
        </Pressable>
      </View>

      {/* Tab bar */}
      <View className="flex-row border-b border-gray-200 px-4">
        <Pressable
          onPress={() => setActiveTab('calendar')}
          className="flex-1 py-4 border-b-2 flex-row items-center justify-center gap-2"
          style={{
            borderBottomColor: activeTab === 'calendar' ? '#fa5610' : 'transparent',
          }}
        >
          <Calendar size={14} color={activeTab === 'calendar' ? '#fa5610' : '#9ca3af'} />
          <Text
            className="text-sm font-medium"
            style={{
              color: activeTab === 'calendar' ? '#fa5610' : '#9ca3af',
            }}
          >
            Calendar
          </Text>
        </Pressable>
        <Pressable
          onPress={() => setActiveTab('timeoff')}
          className="flex-1 py-4 border-b-2 flex-row items-center justify-center gap-2"
          style={{
            borderBottomColor: activeTab === 'timeoff' ? '#fa5610' : 'transparent',
          }}
        >
          <Ban size={14} color={activeTab === 'timeoff' ? '#fa5610' : '#9ca3af'} />
          <Text
            className="text-sm font-medium"
            style={{
              color: activeTab === 'timeoff' ? '#fa5610' : '#9ca3af',
            }}
          >
            Time Off
          </Text>
        </Pressable>
      </View>

      {/* Content */}
      {activeTab === 'calendar' && (
        <View className="flex-1 flex-row border-b border-gray-200">
          <Pressable
            onPress={() => setViewMode('month')}
            className="flex-1 py-3 items-center border-b-2"
            style={{
              borderBottomColor: viewMode === 'month' ? '#fa5610' : 'transparent',
            }}
          >
            <Text
              className="text-xs font-medium"
              style={{
                color: viewMode === 'month' ? '#fa5610' : '#9ca3af',
              }}
            >
              Month
            </Text>
          </Pressable>
          <Pressable
            onPress={() => setViewMode('day')}
            className="flex-1 py-3 items-center border-b-2"
            style={{
              borderBottomColor: viewMode === 'day' ? '#fa5610' : 'transparent',
            }}
          >
            <Text
              className="text-xs font-medium"
              style={{
                color: viewMode === 'day' ? '#fa5610' : '#9ca3af',
              }}
            >
              Day
            </Text>
          </Pressable>
        </View>
      )}

      {activeTab === 'calendar' && viewMode === 'month' && renderMonthView()}
      {activeTab === 'calendar' && viewMode === 'day' && renderDayView()}
      {activeTab === 'timeoff' && renderTimeOffTab()}

      {/* Day detail bottom sheet */}
      <Modal visible={showDayDetail} transparent animationType="slide">
        <View className="flex-1 bg-black/50" onTouchEnd={() => setShowDayDetail(false)}>
          <Pressable
            className="flex-1"
            onPress={() => setShowDayDetail(false)}
          />
          <View className="bg-white dark:bg-[#1A1A1A] rounded-t-3xl p-6 max-h-4/5">
            <View className="flex-row items-center justify-between mb-4">
              <View className="flex-row items-center gap-3">
                <View
                  className="w-10 h-10 rounded-lg items-center justify-center"
                  style={{
                    backgroundColor: selectedDateAvailability
                      ? getStatusColor(selectedDateAvailability.status).bg
                      : '#fff',
                  }}
                >
                  <Calendar
                    size={20}
                    color={
                      selectedDateAvailability
                        ? getStatusColor(selectedDateAvailability.status).text
                        : '#000'
                    }
                  />
                </View>
                <View>
                  <Text className="text-base font-semibold text-gray-900">
                    {selectedDate ? format(selectedDate, 'EEEE') : 'Date'}
                  </Text>
                  <Text className="text-xs text-gray-500">
                    {selectedDate ? format(selectedDate, 'MMM d, yyyy') : ''}
                  </Text>
                </View>
              </View>
              <Pressable onPress={() => setShowDayDetail(false)}>
                <X size={20} color="#9ca3af" />
              </Pressable>
            </View>

            {selectedDateAvailability ? (
              <ScrollView showsVerticalScrollIndicator={false}>
                {/* Availability info */}
                <View className="bg-gray-50 rounded-xl p-4 mb-4">
                  <Text className="text-xs font-medium text-gray-600 mb-2">Availability</Text>
                  <Text className="text-lg font-bold text-gray-900">
                    {selectedDateAvailability.availableHours}h available
                  </Text>
                  {selectedDateAvailability.bookedHours > 0 && (
                    <Text className="text-xs text-gray-600 mt-1">
                      {selectedDateAvailability.bookedHours}h booked
                    </Text>
                  )}
                </View>

                {/* Bookings */}
                {selectedDateAvailability.bookings.length > 0 && (
                  <View className="mb-4">
                    <Text className="text-xs font-medium text-gray-600 mb-2">Bookings</Text>
                    {selectedDateAvailability.bookings.map((booking) => (
                      <View key={booking.id} className="bg-purple-50 border border-purple-200 rounded-lg p-3">
                        <Text className="text-sm font-medium text-gray-900">
                          {format(parseISO(booking.scheduled_start), 'h:mm a')} -{' '}
                          {format(parseISO(booking.scheduled_end), 'h:mm a')}
                        </Text>
                        {booking.location ? (
                          <Text className="text-xs text-gray-600 mt-1">{booking.location}</Text>
                        ) : null}
                      </View>
                    ))}
                  </View>
                )}

                {/* Block day button */}
                <View className="flex-row gap-2 mt-6">
                  <Pressable
                    onPress={() => handleBlockDay()}
                    className="flex-1 bg-red-600 rounded-lg py-3 items-center"
                  >
                    <Text className="text-white font-semibold text-sm">Block This Day</Text>
                  </Pressable>
                  <Pressable
                    onPress={() => setShowDayDetail(false)}
                    className="flex-1 border border-gray-200 rounded-lg py-3 items-center"
                  >
                    <Text className="text-gray-900 font-semibold text-sm">Close</Text>
                  </Pressable>
                </View>
              </ScrollView>
            ) : null}
          </View>
        </View>
      </Modal>

      {/* Add time off sheet */}
      <Modal visible={showAddTimeOff} transparent animationType="slide">
        <View className="flex-1 bg-black/50" onTouchEnd={() => setShowAddTimeOff(false)}>
          <Pressable className="flex-1" onPress={() => setShowAddTimeOff(false)} />
          <View className="bg-white dark:bg-[#1A1A1A] rounded-t-3xl p-6 max-h-4/5">
            <View className="flex-row items-center justify-between mb-4">
              <View className="flex-row items-center gap-3">
                <Calendar size={20} color="#fa5610" />
                <View>
                  <Text className="text-base font-semibold text-gray-900">Add Time Off</Text>
                  <Text className="text-xs text-gray-500">Block dates from bookings</Text>
                </View>
              </View>
              <Pressable onPress={() => setShowAddTimeOff(false)}>
                <X size={20} color="#9ca3af" />
              </Pressable>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <View className="flex-row gap-2 mb-4">
                <Pressable
                  onPress={() =>
                    setTimeOffFormData({ ...timeOffFormData, isFullDay: true })
                  }
                  className={`flex-1 py-2 px-3 rounded-lg border ${
                    timeOffFormData.isFullDay
                      ? 'bg-purple-100 border-purple-300'
                      : 'bg-white dark:bg-[#1A1A1A] border-gray-200 dark:border-[#374151]'
                  }`}
                >
                  <Text
                    className="text-xs font-medium text-center"
                    style={{
                      color: timeOffFormData.isFullDay ? '#fa5610' : '#9ca3af',
                    }}
                  >
                    Full Day
                  </Text>
                </Pressable>
                <Pressable
                  onPress={() =>
                    setTimeOffFormData({ ...timeOffFormData, isFullDay: false })
                  }
                  className={`flex-1 py-2 px-3 rounded-lg border ${
                    !timeOffFormData.isFullDay
                      ? 'bg-purple-100 border-purple-300'
                      : 'bg-white dark:bg-[#1A1A1A] border-gray-200 dark:border-[#374151]'
                  }`}
                >
                  <Text
                    className="text-xs font-medium text-center"
                    style={{
                      color: !timeOffFormData.isFullDay ? '#fa5610' : '#9ca3af',
                    }}
                  >
                    Specific Hours
                  </Text>
                </Pressable>
              </View>

              {/* Date picker - simplified */}
              <View className="mb-4">
                <Text className="text-xs font-medium text-gray-600 mb-2">Start Date</Text>
                <Pressable
                  onPress={() => setTimeOffFormData({ ...timeOffFormData, startDate: new Date() })}
                  className="border border-gray-300 rounded-lg p-3 flex-row items-center"
                >
                  <Calendar size={16} color="#fa5610" />
                  <Text className="text-sm text-gray-900 ml-2">
                    {timeOffFormData.startDate
                      ? format(timeOffFormData.startDate, 'MMM d, yyyy')
                      : 'Select date'}
                  </Text>
                </Pressable>
              </View>

              <View className="mb-4">
                <Text className="text-xs font-medium text-gray-600 mb-2">End Date</Text>
                <Pressable
                  onPress={() => setTimeOffFormData({ ...timeOffFormData, endDate: new Date() })}
                  className="border border-gray-300 rounded-lg p-3 flex-row items-center"
                >
                  <Calendar size={16} color="#fa5610" />
                  <Text className="text-sm text-gray-900 ml-2">
                    {timeOffFormData.endDate
                      ? format(timeOffFormData.endDate, 'MMm d, yyyy')
                      : 'Select date'}
                  </Text>
                </Pressable>
              </View>

              {!timeOffFormData.isFullDay && (
                <>
                  <View className="mb-4">
                    <Text className="text-xs font-medium text-gray-600 mb-2">Start Time</Text>
                    <TextInput
                      placeholder="09:00"
                      value={timeOffFormData.startTime}
                      onChangeText={(text) =>
                        setTimeOffFormData({ ...timeOffFormData, startTime: text })
                      }
                      className="border border-gray-300 rounded-lg p-3 text-sm"
                    />
                  </View>

                  <View className="mb-4">
                    <Text className="text-xs font-medium text-gray-600 mb-2">End Time</Text>
                    <TextInput
                      placeholder="17:00"
                      value={timeOffFormData.endTime}
                      onChangeText={(text) =>
                        setTimeOffFormData({ ...timeOffFormData, endTime: text })
                      }
                      className="border border-gray-300 rounded-lg p-3 text-sm"
                    />
                  </View>
                </>
              )}

              <View className="flex-row gap-2 mt-6">
                <Pressable
                  onPress={() => handleAddTimeOff()}
                  className="flex-1 bg-purple-600 rounded-lg py-3 items-center"
                >
                  <Text className="text-white font-semibold text-sm">Add Time Off</Text>
                </Pressable>
                <Pressable
                  onPress={() => setShowAddTimeOff(false)}
                  className="flex-1 border border-gray-200 rounded-lg py-3 items-center"
                >
                  <Text className="text-gray-900 font-semibold text-sm">Cancel</Text>
                </Pressable>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Add recurring sheet */}
      <Modal visible={showAddRecurring} transparent animationType="slide">
        <View className="flex-1 bg-black/50" onTouchEnd={() => setShowAddRecurring(false)}>
          <Pressable className="flex-1" onPress={() => setShowAddRecurring(false)} />
          <View className="bg-white dark:bg-[#1A1A1A] rounded-t-3xl p-6 max-h-4/5">
            <View className="flex-row items-center justify-between mb-4">
              <View className="flex-row items-center gap-3">
                <Ban size={20} color="#fa5610" />
                <View>
                  <Text className="text-base font-semibold text-gray-900">Add Recurring</Text>
                  <Text className="text-xs text-gray-500">Block specific hours every week</Text>
                </View>
              </View>
              <Pressable onPress={() => setShowAddRecurring(false)}>
                <X size={20} color="#9ca3af" />
              </Pressable>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {/* Day selector */}
              <View className="mb-4">
                <Text className="text-xs font-medium text-gray-600 mb-2">Days of week</Text>
                <View className="flex-row gap-2 flex-wrap">
                  {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day, idx) => (
                    <Pressable
                      key={day}
                      onPress={() => {
                        const newDays = new Set(recurringFormData.selectedDays);
                        if (newDays.has(idx)) {
                          newDays.delete(idx);
                        } else {
                          newDays.add(idx);
                        }
                        setRecurringFormData({ ...recurringFormData, selectedDays: newDays });
                      }}
                      className={`flex-1 py-2 px-2 rounded-lg border ${
                        recurringFormData.selectedDays.has(idx)
                          ? 'bg-purple-600 border-purple-600'
                          : 'bg-white dark:bg-[#1A1A1A] border-gray-200 dark:border-[#374151]'
                      }`}
                    >
                      <Text
                        className="text-xs font-medium text-center"
                        style={{
                          color: recurringFormData.selectedDays.has(idx) ? '#fff' : '#9ca3af',
                        }}
                      >
                        {day}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </View>

              <View className="mb-4">
                <Text className="text-xs font-medium text-gray-600 mb-2">Start Time</Text>
                <TextInput
                  placeholder="09:00"
                  value={recurringFormData.startTime}
                  onChangeText={(text) =>
                    setRecurringFormData({ ...recurringFormData, startTime: text })
                  }
                  className="border border-gray-300 rounded-lg p-3 text-sm"
                />
              </View>

              <View className="mb-4">
                <Text className="text-xs font-medium text-gray-600 mb-2">End Time</Text>
                <TextInput
                  placeholder="17:00"
                  value={recurringFormData.endTime}
                  onChangeText={(text) =>
                    setRecurringFormData({ ...recurringFormData, endTime: text })
                  }
                  className="border border-gray-300 rounded-lg p-3 text-sm"
                />
              </View>

              <View className="flex-row gap-2 mt-6">
                <Pressable
                  onPress={() => handleAddRecurring()}
                  className="flex-1 bg-purple-600 rounded-lg py-3 items-center"
                >
                  <Text className="text-white font-semibold text-sm">Add Pattern</Text>
                </Pressable>
                <Pressable
                  onPress={() => setShowAddRecurring(false)}
                  className="flex-1 border border-gray-200 rounded-lg py-3 items-center"
                >
                  <Text className="text-gray-900 font-semibold text-sm">Cancel</Text>
                </Pressable>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}
