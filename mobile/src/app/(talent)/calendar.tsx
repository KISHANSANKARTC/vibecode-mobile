import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  ActivityIndicator,
  Alert,
  TextInput,
  Modal,
  TouchableOpacity,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { router } from 'expo-router';
import {
  ChevronLeft,
  ChevronRight,
  Calendar,
  MapPin,
  CheckCircle2,
  Briefcase,
  Clock,
  Trash2,
  Plus,
  X,
  Grid3x3,
  List,
} from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { extractErrorMessage } from '@/lib/errorUtils';
import { useAuthStore } from '@/lib/state/auth-store';
import { TableSkeleton } from '@/components/SkeletonLoader';
import { useTheme } from '@/lib/theme/ThemeContext';

interface DayStatus {
  date: Date;
  status: 'available' | 'booked' | 'unavailable' | 'partial';
  availableHours: number;
  hasBooking: boolean;
  bookings: any[];
}

interface DayAvailability {
  status: 'available' | 'booked' | 'unavailable' | 'partial';
  availableHours: number[];
  blockedHours: number[];
  isTimeOff: boolean;
  timeOffReason: string | null;
  bookings: any[];
}

interface TimeOffPeriod {
  id: string;
  talent_id: string;
  start_at: string;
  end_at: string;
  reason?: string;
}

interface RecurringTimeOff {
  id: string;
  talent_id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  is_active?: boolean;
}

// Constants and helper functions
const DAYS_OF_WEEK = [
  { value: 0, label: 'Sunday', short: 'Sun' },
  { value: 1, label: 'Monday', short: 'Mon' },
  { value: 2, label: 'Tuesday', short: 'Tue' },
  { value: 3, label: 'Wednesday', short: 'Wed' },
  { value: 4, label: 'Thursday', short: 'Thu' },
  { value: 5, label: 'Friday', short: 'Fri' },
  { value: 6, label: 'Saturday', short: 'Sat' },
];

function generateTimeOptions() {
  const options: Array<{ value: string; label: string }> = [];
  for (let i = 0; i < 24; i++) {
    for (let m = 0; m < 60; m += 30) {
      const hour = String(i).padStart(2, '0');
      const minute = String(m).padStart(2, '0');
      const timeStr = `${hour}:${minute}`;
      const h = i % 12 || 12;
      const ampm = i >= 12 ? 'PM' : 'AM';
      const displayStr = `${h}:${minute} ${ampm}`;
      options.push({ value: timeStr, label: displayStr });
    }
  }
  return options;
}

const TIME_OPTIONS = generateTimeOptions();

function formatTime(isoTime: string): string {
  // Handle both "HH:MM" and "HH:MM:SS" formats by taking first 5 characters
  const timeStr = isoTime.substring(0, 5);
  const [hour, minute] = timeStr.split(':').map(Number);
  const h = hour % 12 || 12;
  const ampm = hour >= 12 ? 'PM' : 'AM';
  return `${h}:${String(minute).padStart(2, '0')} ${ampm}`;
}

function formatTimeOffDisplay(startAt: string, endAt: string): string {
  const start = new Date(startAt);
  const end = new Date(endAt);

  const startDate = start.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
  });

  const endDate = end.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  const isSameDay =
    start.toISOString().split('T')[0] === end.toISOString().split('T')[0];

  if (isSameDay) {
    const startHour = start.getHours();
    const endHour = end.getHours();
    const startMin = start.getMinutes();
    const endMin = end.getMinutes();

    // Check if it's a full day block
    if (startHour === 0 && startMin === 0 && endHour === 23 && endMin === 59) {
      return startDate;
    }

    // It's a partial day
    const startTimeStr = formatTime(
      `${String(startHour).padStart(2, '0')}:${String(startMin).padStart(2, '0')}`
    );
    const endTimeStr = formatTime(
      `${String(endHour).padStart(2, '0')}:${String(endMin).padStart(2, '0')}`
    );
    return `${startDate}, ${startTimeStr} - ${endTimeStr}`;
  }

  // Multi-day range
  return `${start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${endDate}`;
}

// Helper function: Compare two dates in LOCAL timezone (not UTC)
const isSameLocalDate = (date1: string | Date, date2: Date): boolean => {
  const d1 = new Date(date1);
  const d2 = new Date(date2);
  return (
    d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate()
  );
};

export default function CalendarScreen() {
  const insets = useSafeAreaInsets();
  const user = useAuthStore((s) => s.user);
  const { isDark } = useTheme();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [activeTab, setActiveTab] = useState<'calendar' | 'timeoff'>('calendar');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [isLoading, setIsLoading] = useState(true);
  const [talentId, setTalentId] = useState<string | null>(null);
  const [dayStatuses, setDayStatuses] = useState<Map<string, DayStatus>>(new Map());
  const [upcomingBookings, setUpcomingBookings] = useState<any[]>([]);
  const [allBookings, setAllBookings] = useState<any[]>([]);
  const [allCalendarEvents, setAllCalendarEvents] = useState<any[]>([]);
  const [talentTimeOff, setTalentTimeOff] = useState<TimeOffPeriod[]>([]);
  const [recurringTimeOff, setRecurringTimeOff] = useState<RecurringTimeOff[]>([]);

  // Bottom sheet state
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [isBlocking, setIsBlocking] = useState(false);
  const [blockReason, setBlockReason] = useState('');
  const [dayAvailability, setDayAvailability] = useState<DayAvailability | null>(null);

  // Time Off Tab state
  const [showAddTimeOffSheet, setShowAddTimeOffSheet] = useState(false);
  const [showAddRecurringSheet, setShowAddRecurringSheet] = useState(false);
  const [timeOffStartDate, setTimeOffStartDate] = useState<Date | null>(null);
  const [timeOffEndDate, setTimeOffEndDate] = useState<Date | null>(null);
  const [timeOffFromTime, setTimeOffFromTime] = useState('09:00');
  const [timeOffToTime, setTimeOffToTime] = useState('17:00');
  const [timeOffIsFullDay, setTimeOffIsFullDay] = useState(true);
  const [recurringSelectedDays, setRecurringSelectedDays] = useState<number[]>([]);
  const [recurringFromTime, setRecurringFromTime] = useState('09:00');
  const [recurringToTime, setRecurringToTime] = useState('17:00');
  const [isAddingTimeOff, setIsAddingTimeOff] = useState(false);

  // Fetch calendar data
  const fetchCalendarData = useCallback(async () => {
    try {
      setIsLoading(true);
      if (!user?.id) {
        setIsLoading(false);
        return;
      }

      // Get talent profile
      const { data: talentProfile } = await supabase
        .from('talent_profiles')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (!talentProfile?.id) {
        setIsLoading(false);
        return;
      }

      setTalentId(talentProfile.id);

      // Fetch talent_time_off (full-day blocks from "Block This Day")
      const { data: timeOff } = await supabase
        .from('talent_time_off')
        .select('*')
        .eq('talent_id', talentProfile.id)
        .gte('end_at', new Date().toISOString())
        .order('start_at', { ascending: true });

      setTalentTimeOff(timeOff || []);

      // Fetch talent_recurring_time_off
      const { data: recurring } = await supabase
        .from('talent_recurring_time_off')
        .select('*')
        .eq('talent_id', talentProfile.id)
        .order('day_of_week', { ascending: true });

      setRecurringTimeOff(recurring || []);

      // Fetch calendar events (time off/private blocks)
      const { data: calendarEvents } = await supabase
        .from('calendar_events')
        .select('*')
        .eq('talent_id', talentProfile.id);

      setAllCalendarEvents(calendarEvents || []);

      // Fetch booking_talents
      const { data: bookingTalents } = await supabase
        .from('booking_talents')
        .select('*')
        .eq('talent_id', talentProfile.id)
        .eq('status', 'accepted');

      // Fetch bookings
      let bookingsMap: Record<string, any> = {};
      if (bookingTalents && bookingTalents.length > 0) {
        const bookingIds = bookingTalents.map((bt) => bt.booking_id);
        const { data: bookings } = await supabase
          .from('bookings')
          .select('*')
          .in('id', bookingIds)
          .eq('status', 'confirmed');

        bookingsMap = (bookings || []).reduce((acc, b) => {
          acc[b.id] = b;
          return acc;
        }, {} as Record<string, any>);

        setAllBookings((bookings || []).map((b) => bookingsMap[b.id]));
      }

      // Build day statuses for the month
      const statuses = computeDayStatuses(currentMonth, timeOff || [], calendarEvents || [], bookingTalents || [], bookingsMap);
      setDayStatuses(statuses);

      // Get upcoming bookings
      const upcoming = (bookingTalents || [])
        .filter((bt) => bookingsMap[bt.booking_id] && new Date(bookingsMap[bt.booking_id].scheduled_start) > new Date())
        .sort((a, b) =>
          new Date(bookingsMap[a.booking_id].scheduled_start).getTime() -
          new Date(bookingsMap[b.booking_id].scheduled_start).getTime()
        )
        .slice(0, 5)
        .map((bt) => ({
          ...bt,
          booking: bookingsMap[bt.booking_id],
        }));

      setUpcomingBookings(upcoming);
      setIsLoading(false);
    } catch (err) {
      console.error('Error fetching calendar data:', err);
      setIsLoading(false);
    }
  }, [user?.id, currentMonth]);

  useEffect(() => {
    fetchCalendarData();
  }, [fetchCalendarData]);

  // Refetch calendar data whenever this screen comes into focus
  useFocusEffect(
    useCallback(() => {
      fetchCalendarData();
    }, [fetchCalendarData])
  );

  const computeDayStatuses = (
    month: Date,
    talentTimeOff: any[],
    calendarEvents: any[],
    bookingTalents: any[],
    bookingsMap: Record<string, any>
  ): Map<string, DayStatus> => {
    const statuses = new Map<string, DayStatus>();
    const year = month.getFullYear();
    const monthNum = month.getMonth();
    const firstDay = new Date(year, monthNum, 1);
    const lastDay = new Date(year, monthNum + 1, 0);

    for (let day = 1; day <= lastDay.getDate(); day++) {
      const date = new Date(year, monthNum, day);
      const dateStr = date.toISOString().split('T')[0];

      // Check for bookings on this day using LOCAL TIMEZONE comparison
      const dayBookings = bookingTalents
        .filter((bt) => {
          const booking = bookingsMap[bt.booking_id];
          return booking && isSameLocalDate(booking.scheduled_start, date);
        })
        .map((bt) => bookingsMap[bt.booking_id]);

      // Check talent_time_off (full-day blocks from "Block This Day")
      const isTimeOffDay = talentTimeOff.some((period) => {
        // Use local timezone comparison instead of string comparison
        return isSameLocalDate(period.start_at, date);
      });

      // Check for partial blocks in calendar_events using LOCAL TIMEZONE comparison
      const hasPartialBlock = calendarEvents.some((event) => {
        if (event.type !== 'private_block') return false;
        return isSameLocalDate(event.start_at, date);
      });

      // Check for recurring time off blocks on this day of week
      const dayOfWeek = date.getDay();
      const hasRecurringBlock = recurringTimeOff.some(
        (r) => r.day_of_week === dayOfWeek && (r.is_active !== false)
      );

      let status: 'available' | 'booked' | 'unavailable' | 'partial' = 'available';

      // Priority: bookings > time off > partial/recurring blocks > available
      if (dayBookings.length > 0) {
        status = 'booked';
      } else if (isTimeOffDay) {
        status = 'unavailable';
      } else if (hasPartialBlock || hasRecurringBlock) {
        status = 'partial';
      }

      let availableHours = 0;
      if ((status as string) === 'available') {
        availableHours = 24;
      } else if ((status as string) === 'partial') {
        availableHours = 12;
      }

      statuses.set(dateStr, {
        date,
        status,
        availableHours,
        hasBooking: dayBookings.length > 0,
        bookings: dayBookings,
      });
    }

    return statuses;
  };

  const computeDayAvailability = (date: Date): DayAvailability => {
    let allHours = Array.from({ length: 24 }, (_, i) => i);
    let blockedHours: number[] = [];
    let isTimeOff = false;
    let timeOffReason: string | null = null;
    let hasBooking = false;

    const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

    // Check talent_time_off first (primary source of truth for full-day blocks)
    const timeOffPeriod = talentTimeOff.find((period) => {
      const startStr = period.start_at.split('T')[0];
      const endStr = period.end_at.split('T')[0];
      return dateStr >= startStr && dateStr <= endStr;
    });

    if (timeOffPeriod) {
      isTimeOff = true;
      timeOffReason = timeOffPeriod.reason || null;
      return {
        status: 'unavailable',
        availableHours: [],
        blockedHours: allHours,
        isTimeOff: true,
        timeOffReason,
        bookings: [],
      };
    }

    // Check for bookings on this date using LOCAL TIMEZONE comparison
    const dayBookings = allBookings.filter((b) => {
      return isSameLocalDate(b.scheduled_start, date);
    });
    hasBooking = dayBookings.length > 0;

    // Extract booked hours using LOCAL TIMEZONE hours
    dayBookings.forEach((booking) => {
      const startHour = new Date(booking.scheduled_start).getHours(); // LOCAL timezone
      const endHour = booking.scheduled_end ? new Date(booking.scheduled_end).getHours() : startHour + 1; // LOCAL timezone
      for (let h = startHour; h < endHour; h++) {
        if (!blockedHours.includes(h)) blockedHours.push(h);
      }
    });

    // Check for partial private blocks in calendar_events using LOCAL TIMEZONE comparison
    const partialBlocks = allCalendarEvents.filter((event) => {
      if (event.type !== 'private_block') return false;
      return isSameLocalDate(event.start_at, date);
    });

    // Extract block hours using LOCAL TIMEZONE hours
    partialBlocks.forEach((block) => {
      const startHour = new Date(block.start_at).getHours(); // LOCAL timezone
      const endHour = new Date(block.end_at).getHours(); // LOCAL timezone
      for (let h = startHour; h <= endHour; h++) {
        if (!blockedHours.includes(h)) blockedHours.push(h);
      }
    });

    // Check for recurring time off blocks on this day of week
    const dayOfWeek = date.getDay();
    const recurringBlocksForDay = recurringTimeOff.filter(
      (r) => r.day_of_week === dayOfWeek && (r.is_active !== false)
    );

    recurringBlocksForDay.forEach((block) => {
      const [startHourStr] = block.start_time.split(':');
      const [endHourStr] = block.end_time.split(':');
      const startHour = parseInt(startHourStr, 10);
      const endHour = parseInt(endHourStr, 10);

      for (let h = startHour; h < endHour; h++) {
        if (!blockedHours.includes(h)) blockedHours.push(h);
      }
    });

    const availableHours = allHours.filter((h) => !blockedHours.includes(h));

    // Determine status
    let status: 'available' | 'booked' | 'unavailable' | 'partial' = 'available';
    if (hasBooking) {
      status = 'booked';
    } else if (blockedHours.length > 0 && availableHours.length > 0) {
      status = 'partial';
    } else if (blockedHours.length > 0 && availableHours.length === 0) {
      status = 'unavailable';
    }

    return {
      status,
      availableHours,
      blockedHours,
      isTimeOff,
      timeOffReason,
      bookings: dayBookings,
    };
  };

  const handleDayPress = (date: Date) => {
    // Create a clean date at midnight for comparison
    const dateAtMidnight = new Date(date);
    dateAtMidnight.setHours(0, 0, 0, 0);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Allow today and future dates only
    if (dateAtMidnight < today) return;

    const availability = computeDayAvailability(dateAtMidnight);
    setSelectedDay(dateAtMidnight);
    setDayAvailability(availability);
    setBlockReason('');
    setIsSheetOpen(true);
  };

  const handleCloseSheet = () => {
    setIsSheetOpen(false);
    setSelectedDay(null);
    setBlockReason('');
    setDayAvailability(null);
  };

  const handleBlockDay = async () => {
    if (!selectedDay || isBlocking || !talentId) return;

    setIsBlocking(true);

    try {
      const year = selectedDay.getFullYear();
      const month = String(selectedDay.getMonth() + 1).padStart(2, '0');
      const day = String(selectedDay.getDate()).padStart(2, '0');
      const dateStr = `${year}-${month}-${day}`;

      // Insert into talent_time_off (primary source for full-day blocks)
      const { error } = await supabase.from('talent_time_off').insert({
        talent_id: talentId,
        start_at: `${dateStr}T00:00:00Z`,
        end_at: `${dateStr}T23:59:59.999Z`,
        reason: blockReason || null,
      });

      if (error) {
        Alert.alert('Error', 'Failed to block this day. Please try again.');
        console.error('Block day error:', extractErrorMessage(error));
        setIsBlocking(false);
      } else {
        // Refetch talent_time_off directly to get the fresh blocked data
        const { data: updatedTimeOff } = await supabase
          .from('talent_time_off')
          .select('*')
          .eq('talent_id', talentId)
          .gte('end_at', new Date().toISOString())
          .order('start_at', { ascending: true });

        // Update state with fresh data
        setTalentTimeOff(updatedTimeOff || []);

        // CRITICAL: Recompute dayStatuses for the calendar grid to show updated colors
        const statuses = computeDayStatuses(currentMonth, updatedTimeOff || [], allCalendarEvents, [], {});
        setDayStatuses(statuses);

        // Recompute availability for the selected day using the fresh time off data
        if (selectedDay) {
          // Manually compute with the updated time off
          let allHours = Array.from({ length: 24 }, (_, i) => i);
          const dateStr = `${selectedDay.getFullYear()}-${String(selectedDay.getMonth() + 1).padStart(2, '0')}-${String(selectedDay.getDate()).padStart(2, '0')}`;

          const timeOffPeriod = (updatedTimeOff || []).find((period) => {
            const startStr = period.start_at.split('T')[0];
            const endStr = period.end_at.split('T')[0];
            return dateStr >= startStr && dateStr <= endStr;
          });

          if (timeOffPeriod) {
            // Day is now blocked - update availability to show unavailable
            const updatedAvailability: DayAvailability = {
              status: 'unavailable',
              availableHours: [],
              blockedHours: allHours,
              isTimeOff: true,
              timeOffReason: blockReason || null,
              bookings: [],
            };
            setDayAvailability(updatedAvailability);
          }
        }

        Alert.alert('Success', 'Day has been blocked successfully.');
        setBlockReason('');
        setIsSheetOpen(false);
        setSelectedDay(null);
        setIsBlocking(false);
      }
    } catch (err) {
      console.error('Block day exception:', err);
      Alert.alert('Error', 'Something went wrong. Please try again.');
      setIsBlocking(false);
    }
  };

  const handleUnblockDay = async () => {
    if (!selectedDay || isBlocking || !talentId) return;

    setIsBlocking(true);

    try {
      const year = selectedDay.getFullYear();
      const month = String(selectedDay.getMonth() + 1).padStart(2, '0');
      const day = String(selectedDay.getDate()).padStart(2, '0');
      const dateStr = `${year}-${month}-${day}`;

      // Find and delete the time off record for this date
      const timeOffRecord = talentTimeOff.find((period) => {
        const startStr = period.start_at.split('T')[0];
        const endStr = period.end_at.split('T')[0];
        return dateStr >= startStr && dateStr <= endStr;
      });

      if (!timeOffRecord) {
        Alert.alert('Error', 'No time off found for this day.');
        setIsBlocking(false);
        return;
      }

      const { error } = await supabase
        .from('talent_time_off')
        .delete()
        .eq('id', timeOffRecord.id);

      if (error) {
        Alert.alert('Error', 'Failed to unblock this day. Please try again.');
        console.error('Unblock day error:', extractErrorMessage(error));
        setIsBlocking(false);
      } else {
        // Refetch talent_time_off directly without going through fetchCalendarData
        const { data: updatedTimeOff } = await supabase
          .from('talent_time_off')
          .select('*')
          .eq('talent_id', talentId)
          .gte('end_at', new Date().toISOString())
          .order('start_at', { ascending: true });

        // Update state with fresh data
        setTalentTimeOff(updatedTimeOff || []);

        // Recompute availability for the selected day using the fresh time off data
        if (selectedDay) {
          // Manually compute with the updated time off
          let allHours = Array.from({ length: 24 }, (_, i) => i);
          const dateStr = `${selectedDay.getFullYear()}-${String(selectedDay.getMonth() + 1).padStart(2, '0')}-${String(selectedDay.getDate()).padStart(2, '0')}`;

          const timeOffPeriod = (updatedTimeOff || []).find((period) => {
            const startStr = period.start_at.split('T')[0];
            const endStr = period.end_at.split('T')[0];
            return dateStr >= startStr && dateStr <= endStr;
          });

          if (!timeOffPeriod) {
            // No time off anymore - compute full availability
            const updatedAvailability: DayAvailability = {
              status: 'available',
              availableHours: allHours,
              blockedHours: [],
              isTimeOff: false,
              timeOffReason: null,
              bookings: [],
            };
            setDayAvailability(updatedAvailability);
          }
        }

        Alert.alert('Success', 'Day has been unblocked successfully.');
        setIsSheetOpen(false);
        setSelectedDay(null);
        setIsBlocking(false);
      }
    } catch (err) {
      console.error('Unblock day exception:', err);
      Alert.alert('Error', 'Something went wrong. Please try again.');
      setIsBlocking(false);
    }
  };

  // Time Off Tab Handlers
  const handleAddSpecificTimeOff = async () => {
    if (!timeOffStartDate || !talentId || isAddingTimeOff) return;

    // Validate dates
    if (timeOffEndDate && timeOffEndDate < timeOffStartDate) {
      Alert.alert('Error', 'End date must be after start date');
      return;
    }

    // Validate times if not full day
    if (!timeOffIsFullDay) {
      if (timeOffFromTime >= timeOffToTime) {
        Alert.alert('Error', 'End time must be after start time');
        return;
      }
    }

    setIsAddingTimeOff(true);

    try {
      const year = timeOffStartDate.getFullYear();
      const month = String(timeOffStartDate.getMonth() + 1).padStart(2, '0');
      const day = String(timeOffStartDate.getDate()).padStart(2, '0');
      const startDateStr = `${year}-${month}-${day}`;

      let endAtStr: string;

      if (timeOffIsFullDay) {
        const endDate = timeOffEndDate || timeOffStartDate;
        const endYear = endDate.getFullYear();
        const endMonth = String(endDate.getMonth() + 1).padStart(2, '0');
        const endDay = String(endDate.getDate()).padStart(2, '0');
        endAtStr = `${endYear}-${endMonth}-${endDay}T23:59:59.999Z`;
      } else {
        // Partial day
        const endDate = timeOffEndDate || timeOffStartDate;
        const endYear = endDate.getFullYear();
        const endMonth = String(endDate.getMonth() + 1).padStart(2, '0');
        const endDay = String(endDate.getDate()).padStart(2, '0');
        endAtStr = `${endYear}-${endMonth}-${endDay}T${timeOffToTime}:00Z`;
      }

      const startAtStr = `${startDateStr}T${timeOffFromTime}:00Z`;

      const { error } = await supabase.from('talent_time_off').insert({
        talent_id: talentId,
        start_at: startAtStr,
        end_at: endAtStr,
        reason: null,
      });

      if (error) {
        Alert.alert('Error', 'Failed to add time off. Please try again.');
        console.error('Add time off error:', extractErrorMessage(error));
        setIsAddingTimeOff(false);
      } else {
        // Refetch time off data
        const { data: updatedTimeOff } = await supabase
          .from('talent_time_off')
          .select('*')
          .eq('talent_id', talentId)
          .gte('end_at', new Date().toISOString())
          .order('start_at', { ascending: true });

        setTalentTimeOff(updatedTimeOff || []);

        // Refetch calendar data for grid update
        await fetchCalendarData();

        Alert.alert('Success', 'Time off added successfully');
        setShowAddTimeOffSheet(false);
        setTimeOffStartDate(null);
        setTimeOffEndDate(null);
        setTimeOffFromTime('09:00');
        setTimeOffToTime('17:00');
        setTimeOffIsFullDay(true);
        setIsAddingTimeOff(false);
      }
    } catch (err) {
      console.error('Add time off exception:', err);
      Alert.alert('Error', 'Something went wrong. Please try again.');
      setIsAddingTimeOff(false);
    }
  };

  const handleDeleteTimeOff = async (id: string) => {
    Alert.alert('Delete Time Off', 'Are you sure you want to delete this time off?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            const { error } = await supabase
              .from('talent_time_off')
              .delete()
              .eq('id', id);

            if (error) {
              Alert.alert('Error', 'Failed to delete time off. Please try again.');
              console.error('Delete time off error:', extractErrorMessage(error));
            } else {
              // Refetch time off data
              const { data: updatedTimeOff } = await supabase
                .from('talent_time_off')
                .select('*')
                .eq('talent_id', talentId)
                .gte('end_at', new Date().toISOString())
                .order('start_at', { ascending: true });

              setTalentTimeOff(updatedTimeOff || []);

              // Refetch calendar data for grid update
              await fetchCalendarData();

              Alert.alert('Success', 'Time off deleted successfully');
            }
          } catch (err) {
            console.error('Delete time off exception:', err);
            Alert.alert('Error', 'Something went wrong. Please try again.');
          }
        },
      },
    ]);
  };

  const handleAddRecurringTimeOff = async () => {
    if (recurringSelectedDays.length === 0 || !talentId || isAddingTimeOff) {
      Alert.alert('Error', 'Please select at least one day');
      return;
    }

    if (recurringFromTime >= recurringToTime) {
      Alert.alert('Error', 'End time must be after start time');
      return;
    }

    setIsAddingTimeOff(true);

    try {
      const recordsToInsert = recurringSelectedDays.map((dayOfWeek) => ({
        talent_id: talentId,
        day_of_week: dayOfWeek,
        start_time: recurringFromTime,
        end_time: recurringToTime,
        is_active: true,
      }));

      const { error } = await supabase
        .from('talent_recurring_time_off')
        .insert(recordsToInsert);

      if (error) {
        Alert.alert('Error', 'Failed to add recurring pattern. Please try again.');
        console.error('Add recurring error:', extractErrorMessage(error));
        setIsAddingTimeOff(false);
      } else {
        // Refetch recurring data
        const { data: updatedRecurring } = await supabase
          .from('talent_recurring_time_off')
          .select('*')
          .eq('talent_id', talentId)
          .order('day_of_week', { ascending: true });

        setRecurringTimeOff(updatedRecurring || []);

        // Refetch calendar data for grid update
        await fetchCalendarData();

        Alert.alert('Success', 'Recurring pattern added successfully');
        setShowAddRecurringSheet(false);
        setRecurringSelectedDays([]);
        setRecurringFromTime('09:00');
        setRecurringToTime('17:00');
        setIsAddingTimeOff(false);
      }
    } catch (err) {
      console.error('Add recurring exception:', err);
      Alert.alert('Error', 'Something went wrong. Please try again.');
      setIsAddingTimeOff(false);
    }
  };

  const handleDeleteRecurringTimeOff = async (id: string) => {
    Alert.alert('Delete Pattern', 'Are you sure you want to delete this recurring pattern?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            const { error } = await supabase
              .from('talent_recurring_time_off')
              .delete()
              .eq('id', id);

            if (error) {
              Alert.alert('Error', 'Failed to delete pattern. Please try again.');
              console.error('Delete recurring error:', extractErrorMessage(error));
            } else {
              // Refetch recurring data
              const { data: updatedRecurring } = await supabase
                .from('talent_recurring_time_off')
                .select('*')
                .eq('talent_id', talentId)
                .order('day_of_week', { ascending: true });

              setRecurringTimeOff(updatedRecurring || []);

              // Refetch calendar data for grid update
              await fetchCalendarData();

              Alert.alert('Success', 'Pattern deleted successfully');
            }
          } catch (err) {
            console.error('Delete recurring exception:', err);
            Alert.alert('Error', 'Something went wrong. Please try again.');
          }
        },
      },
    ]);
  };

  const groupRecurringByDay = (): Map<number, RecurringTimeOff[]> => {
    const grouped = new Map<number, RecurringTimeOff[]>();
    recurringTimeOff.forEach((record) => {
      if (!grouped.has(record.day_of_week)) {
        grouped.set(record.day_of_week, []);
      }
      grouped.get(record.day_of_week)!.push(record);
    });
    return grouped;
  };

  const getStatusColors = (status: string) => {
    switch (status) {
      case 'available':
        return { bg: '#dcfce7', icon: '#10b981' };
      case 'partial':
        return { bg: '#fef3c7', icon: '#f59e0b' };
      case 'booked':
        return { bg: '#fed7aa', icon: '#f97316' };
      case 'unavailable':
        return { bg: '#f3f4f6', icon: '#9ca3af' };
      default:
        return { bg: '#f3f4f6', icon: '#9ca3af' };
    }
  };

  const getStatusText = (availability: DayAvailability | null) => {
    if (!availability) return '';
    switch (availability.status) {
      case 'available':
        return `${availability.availableHours.length} hours available`;
      case 'partial':
        return `${availability.availableHours.length} hours available, some blocked`;
      case 'booked':
        return 'Fully booked';
      case 'unavailable':
        return availability.isTimeOff ? 'Time off' : 'Unavailable';
      default:
        return '';
    }
  };

  const formatHour = (hour: number) => {
    const h = hour % 12 || 12;
    const ampm = hour >= 12 ? 'pm' : 'am';
    return `${h}${ampm}`;
  };

  // Format booking time for display using local timezone
  const formatBookingTime = (isoString: string): string => {
    const d = new Date(isoString);
    let hours = d.getHours(); // LOCAL timezone
    const minutes = d.getMinutes();
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12 || 12;
    const mins = minutes === 0 ? ':00' : `:${String(minutes).padStart(2, '0')}`;
    return `${hours}${mins} ${ampm}`;
  };

  const renderCalendarGrid = () => {
    const year = currentMonth.getFullYear();
    const monthNum = currentMonth.getMonth();
    const firstDay = new Date(year, monthNum, 1);
    const lastDay = new Date(year, monthNum + 1, 0);
    const startDayOfWeek = firstDay.getDay();

    const daysInMonth = [];
    for (let i = 1; i <= lastDay.getDate(); i++) {
      const d = new Date(year, monthNum, i);
      d.setHours(0, 0, 0, 0);
      daysInMonth.push(d);
    }

    const prevPadding = Array(startDayOfWeek)
      .fill(null)
      .map((_, i) => {
        const d = new Date(firstDay);
        d.setDate(d.getDate() - (startDayOfWeek - i));
        d.setHours(0, 0, 0, 0);
        return d;
      });

    const endDayOfWeek = lastDay.getDay();
    const nextPadding = Array(6 - endDayOfWeek)
      .fill(null)
      .map((_, i) => {
        const d = new Date(lastDay);
        d.setDate(d.getDate() + i + 1);
        d.setHours(0, 0, 0, 0);
        return d;
      });

    const allDays = [...prevPadding, ...daysInMonth, ...nextPadding];
    const weeks = [];
    for (let i = 0; i < allDays.length; i += 7) {
      weeks.push(allDays.slice(i, i + 7));
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Helper function to get day cell styling based on status
    const getDayCellStyle = (status: string, isCurrentMonth: boolean, isPast: boolean) => {
      let backgroundColor = 'transparent';
      let borderColor = 'transparent';
      let borderWidth = 2;
      let opacity = 1;

      if (!isCurrentMonth) {
        opacity = 0.2;
      } else if (isPast) {
        opacity = 0.4;
      }

      switch (status) {
        case 'available':
          backgroundColor = 'rgba(16, 185, 129, 0.2)';  // green 20%
          borderColor = 'rgba(16, 185, 129, 0.4)';      // green 40%
          break;
        case 'partial':
          backgroundColor = 'rgba(245, 158, 11, 0.2)';   // yellow 20%
          borderColor = 'rgba(245, 158, 11, 0.4)';       // yellow 40%
          break;
        case 'booked':
          backgroundColor = 'rgba(249, 115, 22, 0.15)';  // orange 15%
          borderColor = 'rgba(249, 115, 22, 0.3)';       // orange 30%
          break;
        case 'unavailable':
          backgroundColor = 'rgba(156, 163, 175, 0.15)'; // gray 15%
          borderColor = '#e5e7eb';                        // gray border
          break;
        default:
          borderColor = '#e5e7eb';
          break;
      }

      return { backgroundColor, borderColor, borderWidth, opacity, borderRadius: 12 };
    };

    // Helper function to get day text styling
    const getDayTextStyle = (status: string, isToday: boolean) => {
      let color = '#6b7280';  // default gray
      let fontWeight: '400' | '500' | '600' | '700' = '500';

      if (isToday) {
        color = '#f97316';     // orange/accent for today
        fontWeight = '700';
      } else {
        switch (status) {
          case 'available':
            color = '#10b981';   // green
            fontWeight = '600';
            break;
          case 'partial':
            color = '#f59e0b';   // yellow/warning
            fontWeight = '600';
            break;
          case 'booked':
            color = '#f97316';   // orange/accent
            break;
          case 'unavailable':
            color = '#9ca3af';   // gray
            break;
        }
      }

      return { color, fontWeight, fontSize: 14 };
    };

    // Helper to get hours label
    const getHoursLabel = (availableHours: number) => {
      if (availableHours === 0) return null;
      if (availableHours >= 20) return 'All day';
      return `${availableHours}h`;
    };

    return (
      <View>
        {/* Weekday headers */}
        <View style={{ flexDirection: 'row', marginBottom: 8 }}>
          {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, index) => (
            <View key={`weekday-${day}-${index}`} style={{ flex: 1, alignItems: 'center' }}>
              <Text style={{ color: '#6b7280', fontSize: 12, fontWeight: '600' }}>{day}</Text>
            </View>
          ))}
        </View>

        {/* Calendar grid */}
        {weeks.map((week, weekIndex) => (
          <View key={`week-${weekIndex}-${week[0]?.toISOString().split('T')[0]}`} style={{ flexDirection: 'row', marginBottom: 8 }}>
            {week.map((day, dayIndex) => {
              const dateStr = day.toISOString().split('T')[0];
              const dayStatus = dayStatuses.get(dateStr);
              const isCurrentMonth = day.getMonth() === monthNum;
              const isPast = day < today;
              const isToday = day.getTime() === today.getTime();
              const status = dayStatus?.status || 'unavailable';
              const availableHours = dayStatus?.availableHours || 0;
              const hoursLabel = getHoursLabel(availableHours);
              const cellStyle = getDayCellStyle(status, isCurrentMonth, isPast);
              const textStyle = getDayTextStyle(status, isToday);

              return (
                <Pressable
                  key={dayIndex}
                  style={{ flex: 1, aspectRatio: 1 }}
                  onPress={() => handleDayPress(day)}
                  disabled={isPast || !isCurrentMonth}
                >
                  <View
                    style={{
                      flex: 1,
                      justifyContent: 'center',
                      alignItems: 'center',
                      borderRadius: cellStyle.borderRadius,
                      borderWidth: cellStyle.borderWidth,
                      borderColor: cellStyle.borderColor,
                      backgroundColor: cellStyle.backgroundColor,
                      opacity: cellStyle.opacity,
                    }}
                  >
                    <View style={{ alignItems: 'center' }}>
                      <Text style={[{ ...textStyle, lineHeight: 18 }]}>
                        {day.getDate()}
                      </Text>

                      {/* Sub-indicators below date */}
                      {(status === 'available' || status === 'partial') && hoursLabel ? (
                        <Text
                          style={{
                            fontSize: 9,
                            fontWeight: '500',
                            marginTop: 1,
                            color: status === 'available' ? '#10b981' : '#f59e0b',
                          }}
                        >
                          {hoursLabel}
                        </Text>
                      ) : status === 'booked' ? (
                        <View
                          style={{
                            width: 5,
                            height: 5,
                            borderRadius: 2.5,
                            backgroundColor: '#f97316',
                            marginTop: 2,
                          }}
                        />
                      ) : status === 'unavailable' ? (
                        <View
                          style={{
                            width: 5,
                            height: 5,
                            borderRadius: 2.5,
                            backgroundColor: '#9ca3af',
                            marginTop: 2,
                          }}
                        />
                      ) : null}
                    </View>
                  </View>
                </Pressable>
              );
            })}
          </View>
        ))}
      </View>
    );
  };

  const renderCalendarList = () => {
    const year = currentMonth.getFullYear();
    const monthNum = currentMonth.getMonth();
    const firstDay = new Date(year, monthNum, 1);
    const lastDay = new Date(year, monthNum + 1, 0);

    const daysInMonth = [];
    for (let i = 1; i <= lastDay.getDate(); i++) {
      const d = new Date(year, monthNum, i);
      d.setHours(0, 0, 0, 0);
      daysInMonth.push(d);
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const getStatusColor = (status: string) => {
      switch (status) {
        case 'available':
          return '#10b981';
        case 'partial':
          return '#f59e0b';
        case 'booked':
          return '#f97316';
        case 'unavailable':
          return '#9ca3af';
        default:
          return '#d1d5db';
      }
    };

    const getStatusLabel = (status: string) => {
      return status.charAt(0).toUpperCase() + status.slice(1);
    };

    return (
      <View>
        {daysInMonth.map((date) => {
          const dateStr = date.toISOString().split('T')[0];
          const dayStatus = dayStatuses.get(dateStr);
          const status = dayStatus?.status || 'unavailable';
          const isToday = date.getTime() === today.getTime();
          const isPast = date < today;

          return (
            <Pressable
              key={dateStr}
              onPress={() => {
                setSelectedDay(date);
                setIsSheetOpen(true);
              }}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                paddingVertical: 12,
                paddingHorizontal: 16,
                borderBottomWidth: 1,
                borderBottomColor: colors.border,
                opacity: isPast ? 0.5 : 1,
              }}
            >
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 14, fontWeight: isToday ? '700' : '600', color: colors.text }}>
                  {date.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
                </Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 }}>
                  <View
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: 4,
                      backgroundColor: getStatusColor(status),
                    }}
                  />
                  <Text style={{ fontSize: 12, color: colors.textSecondary }}>
                    {getStatusLabel(status)}
                  </Text>
                </View>
              </View>

              {dayStatus?.hasBooking ? (
                <View
                  style={{
                    paddingHorizontal: 8,
                    paddingVertical: 4,
                    borderRadius: 6,
                    backgroundColor: 'rgba(249, 115, 22, 0.1)',
                  }}
                >
                  <Text style={{ fontSize: 11, fontWeight: '600', color: '#f97316' }}>
                    {dayStatus.bookings?.length || 1} booking
                  </Text>
                </View>
              ) : null}
            </Pressable>
          );
        })}
      </View>
    );
  };

  if (isLoading) {
    return (
      <View style={{ flex: 1, backgroundColor: '#ffffff', paddingTop: insets.top }}>
        {/* Header */}
        <View
          style={{
            paddingHorizontal: 16,
            paddingBottom: 16,
            borderBottomWidth: 1,
            borderBottomColor: '#e5e7eb',
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
            <Pressable onPress={() => router.back()}>
              <ChevronLeft size={24} color="#111827" />
            </Pressable>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 18, fontWeight: '700', color: '#111827' }}>My Calendar</Text>
            </View>
          </View>
        </View>
        <TableSkeleton count={6} columns={3} />
      </View>
    );
  }

  // Dynamic colors based on theme
  const colors = {
    bg: isDark ? '#0A0A0A' : '#ffffff',
    bgSecondary: isDark ? '#1A1A1A' : '#f9fafb',
    text: isDark ? '#ffffff' : '#111827',
    textSecondary: isDark ? '#9ca3af' : '#6b7280',
    border: isDark ? '#374151' : '#e5e7eb',
    borderLight: isDark ? '#2d2d2d' : '#f3f4f6',
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      {/* Header */}
      <View
        style={{
          paddingTop: insets.top + 16,
          paddingHorizontal: 16,
          paddingBottom: 16,
          borderBottomWidth: 1,
          borderBottomColor: colors.border,
          backgroundColor: colors.bg,
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
          <Pressable onPress={() => router.back()}>
            <ChevronLeft size={24} color={colors.text} />
          </Pressable>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 18, fontWeight: '700', color: colors.text }}>My Calendar</Text>
            <Text style={{ fontSize: 12, color: colors.textSecondary, marginTop: 2 }}>
              {upcomingBookings.length} upcoming bookings
            </Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <View
              style={{
                backgroundColor: isDark ? '#1A4D2E' : '#dcfce7',
                paddingHorizontal: 10,
                paddingVertical: 4,
                borderRadius: 12,
              }}
            >
              <Text style={{ fontSize: 11, fontWeight: '600', color: '#059669' }}>Active</Text>
            </View>

            {/* Grid/List View Toggle */}
            <View style={{ flexDirection: 'row', gap: 4 }}>
              <Pressable
                onPress={() => setViewMode('grid')}
                style={{
                  padding: 6,
                  borderRadius: 8,
                  backgroundColor: viewMode === 'grid' ? '#fa5610' : 'transparent',
                }}
              >
                <Grid3x3 size={18} color={viewMode === 'grid' ? '#ffffff' : colors.text} />
              </Pressable>

              <Pressable
                onPress={() => setViewMode('list')}
                style={{
                  padding: 6,
                  borderRadius: 8,
                  backgroundColor: viewMode === 'list' ? '#fa5610' : 'transparent',
                }}
              >
                <List size={18} color={viewMode === 'list' ? '#ffffff' : colors.text} />
              </Pressable>
            </View>
          </View>
        </View>
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: insets.bottom + 20 }}>
        {/* Tabs */}
        <View
          style={{
            flexDirection: 'row',
            paddingHorizontal: 16,
            paddingVertical: 12,
            borderBottomWidth: 1,
            borderBottomColor: colors.border,
            backgroundColor: colors.bg,
          }}
        >
          <Pressable
            style={{
              flex: 1,
              paddingBottom: 12,
              borderBottomWidth: 2,
              borderBottomColor: activeTab === 'calendar' ? '#fa5610' : 'transparent',
            }}
            onPress={() => setActiveTab('calendar')}
          >
            <Text
              style={{
                fontSize: 14,
                fontWeight: activeTab === 'calendar' ? '700' : '500',
                color: activeTab === 'calendar' ? '#fa5610' : colors.textSecondary,
              }}
            >
              Calendar
            </Text>
          </Pressable>
          <Pressable
            style={{
              flex: 1,
              paddingBottom: 12,
              borderBottomWidth: 2,
              borderBottomColor: activeTab === 'timeoff' ? '#fa5610' : 'transparent',
            }}
            onPress={() => setActiveTab('timeoff')}
          >
            <Text
              style={{
                fontSize: 14,
                fontWeight: activeTab === 'timeoff' ? '700' : '500',
                color: activeTab === 'timeoff' ? '#fa5610' : colors.textSecondary,
              }}
            >
              Time Off
            </Text>
          </Pressable>
        </View>

        {activeTab === 'calendar' ? (
          <View style={{ padding: 16 }}>
            {/* Month Navigation */}
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
              <Pressable
                onPress={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1))}
              >
                <ChevronLeft size={24} color="#fa5610" />
              </Pressable>
              <Text style={{ fontSize: 16, fontWeight: '600', color: colors.text }}>
                {currentMonth.toLocaleString('default', { month: 'long', year: 'numeric' })}
              </Text>
              <Pressable
                onPress={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1))}
              >
                <ChevronRight size={24} color="#fa5610" />
              </Pressable>
            </View>

            {/* Calendar Grid or List View */}
            {viewMode === 'grid' ? renderCalendarGrid() : renderCalendarList()}

            {/* Legend */}
            <View style={{ marginTop: 20, flexDirection: 'row', gap: 12, alignItems: 'center', justifyContent: 'center', flexWrap: 'wrap' }}>
              {/* Available */}
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <View
                  style={{
                    width: 18,
                    height: 18,
                    borderRadius: 3,
                    backgroundColor: 'rgba(16, 185, 129, 0.2)',
                    borderWidth: 2,
                    borderColor: 'rgba(16, 185, 129, 0.4)',
                    justifyContent: 'center',
                    alignItems: 'center',
                  }}
                >
                  <Text style={{ fontSize: 10, fontWeight: '700', color: '#10b981' }}>✓</Text>
                </View>
                <Text style={{ fontSize: 12, color: colors.textSecondary, fontWeight: '500' }}>Available</Text>
              </View>

              {/* Booked */}
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <View
                  style={{
                    width: 18,
                    height: 18,
                    borderRadius: 3,
                    backgroundColor: 'rgba(249, 115, 22, 0.15)',
                    borderWidth: 2,
                    borderColor: 'rgba(249, 115, 22, 0.3)',
                    justifyContent: 'center',
                    alignItems: 'center',
                  }}
                >
                  <View
                    style={{
                      width: 5,
                      height: 5,
                      borderRadius: 2.5,
                      backgroundColor: '#f97316',
                    }}
                  />
                </View>
                <Text style={{ fontSize: 12, color: colors.textSecondary, fontWeight: '500' }}>Booked</Text>
              </View>

              {/* Off */}
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <View
                  style={{
                    width: 18,
                    height: 18,
                    borderRadius: 3,
                    backgroundColor: 'rgba(156, 163, 175, 0.15)',
                    borderWidth: 2,
                    borderColor: '#e5e7eb',
                  }}
                />
                <Text style={{ fontSize: 12, color: colors.textSecondary, fontWeight: '500' }}>Off</Text>
              </View>
            </View>

            {/* Helper Text */}
            <Text style={{ fontSize: 12, color: colors.textSecondary, marginTop: 10, textAlign: 'center' }}>
              Tap any date to view details or add time off.
            </Text>

            {/* Upcoming Bookings */}
            <View style={{ marginTop: 24 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                <Briefcase size={18} color="#fa5610" />
                <Text style={{ fontSize: 14, fontWeight: '700', color: '#111827' }}>Upcoming Bookings</Text>
              </View>

              {upcomingBookings.length === 0 ? (
                <View
                  style={{
                    padding: 16,
                    backgroundColor: '#f9fafb',
                    borderRadius: 12,
                    alignItems: 'center',
                    gap: 8,
                  }}
                >
                  <Briefcase size={32} color={colors.textSecondary} />
                  <Text style={{ fontSize: 13, color: colors.textSecondary, fontWeight: '500' }}>No upcoming bookings</Text>
                </View>
              ) : (
                upcomingBookings.map((booking, index) => (
                  <Pressable key={`booking-${booking.id || index}`} onPress={() => router.push('/(talent)/jobs')}>
                    <View
                      style={{
                        flexDirection: 'row',
                        padding: 12,
                        backgroundColor: '#f9fafb',
                        borderRadius: 12,
                        marginBottom: 8,
                        alignItems: 'center',
                        gap: 12,
                      }}
                    >
                      <View
                        style={{
                          width: 40,
                          height: 40,
                          borderRadius: 8,
                          backgroundColor: '#ede9fe',
                          justifyContent: 'center',
                          alignItems: 'center',
                        }}
                      >
                        <Calendar size={20} color="#fa5610" />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 13, fontWeight: '600', color: colors.text }}>
                          {new Date(booking.booking.scheduled_start).toLocaleDateString('en-US', {
                            weekday: 'long',
                            month: 'short',
                            day: 'numeric',
                          })}
                        </Text>
                        <Text style={{ fontSize: 12, color: colors.textSecondary, marginTop: 2 }}>
                          {new Date(booking.booking.scheduled_start).toLocaleTimeString('en-US', {
                            hour: 'numeric',
                            minute: '2-digit',
                            hour12: true,
                          })}
                        </Text>
                      </View>
                      <ChevronRight size={20} color={colors.textSecondary} />
                    </View>
                  </Pressable>
                ))
              )}
            </View>
          </View>
        ) : (
          <View style={{ flex: 1 }}>
            <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 20, padding: 16 }} showsVerticalScrollIndicator={false}>
              {/* Info Card */}
              <View
                style={{
                  backgroundColor: '#dbeafe',
                  padding: 12,
                  borderRadius: 8,
                  marginBottom: 24,
                  borderLeftWidth: 4,
                  borderLeftColor: '#0284c7',
                }}
              >
                <Text style={{ fontSize: 13, color: '#0369a1', fontWeight: '500', lineHeight: 18 }}>
                  You're available 24/7 by default. Use Specific Time Off to block particular dates/hours, or Recurring Unavailability for regular weekly patterns.
                </Text>
              </View>

              {/* Section 1: Specific Time Off */}
              <View style={{ marginBottom: 24 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Calendar size={18} color="#fa5610" />
                    <Text style={{ fontSize: 14, fontWeight: '700', color: '#111827' }}>Specific Time Off</Text>
                  </View>
                  <Pressable
                    onPress={() => setShowAddTimeOffSheet(true)}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 4,
                      paddingHorizontal: 10,
                      paddingVertical: 6,
                      backgroundColor: '#ede9fe',
                      borderRadius: 8,
                    }}
                  >
                    <Plus size={14} color="#fa5610" />
                    <Text style={{ fontSize: 12, fontWeight: '600', color: '#fa5610' }}>Add</Text>
                  </Pressable>
                </View>

                {talentTimeOff.length === 0 ? (
                  <View
                    style={{
                      padding: 16,
                      backgroundColor: '#f9fafb',
                      borderRadius: 12,
                      alignItems: 'center',
                      gap: 8,
                    }}
                  >
                    <Calendar size={32} color={colors.textSecondary} />
                    <Text style={{ fontSize: 13, color: colors.textSecondary, fontWeight: '500' }}>No time off scheduled</Text>
                    <Text style={{ fontSize: 12, color: colors.textSecondary }}>Add your first time off period</Text>
                  </View>
                ) : (
                  <View style={{ gap: 8 }}>
                    {talentTimeOff.map((period) => (
                      <View
                        key={period.id}
                        style={{
                          padding: 12,
                          backgroundColor: '#f9fafb',
                          borderRadius: 12,
                          flexDirection: 'row',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          borderWidth: 1,
                          borderColor: '#e5e7eb',
                        }}
                      >
                        <View style={{ flex: 1 }}>
                          <Text style={{ fontSize: 13, fontWeight: '600', color: colors.text }}>
                            {formatTimeOffDisplay(period.start_at, period.end_at)}
                          </Text>
                          {period.reason ? (
                            <Text style={{ fontSize: 12, color: colors.textSecondary, marginTop: 4 }}>
                              {period.reason}
                            </Text>
                          ) : null}
                        </View>
                        <Pressable
                          onPress={() => handleDeleteTimeOff(period.id)}
                          style={{ padding: 8 }}
                        >
                          <Trash2 size={16} color="#ef4444" />
                        </Pressable>
                      </View>
                    ))}
                  </View>
                )}
              </View>

              {/* Section 2: Recurring Unavailability */}
              <View>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Clock size={18} color="#fa5610" />
                    <Text style={{ fontSize: 14, fontWeight: '700', color: colors.text }}>Recurring Unavailability</Text>
                  </View>
                  <Pressable
                    onPress={() => setShowAddRecurringSheet(true)}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 4,
                      paddingHorizontal: 10,
                      paddingVertical: 6,
                      backgroundColor: '#ede9fe',
                      borderRadius: 8,
                    }}
                  >
                    <Plus size={14} color="#fa5610" />
                    <Text style={{ fontSize: 12, fontWeight: '600', color: '#fa5610' }}>Add Pattern</Text>
                  </Pressable>
                </View>

                {recurringTimeOff.length === 0 ? (
                  <View
                    style={{
                      padding: 16,
                      backgroundColor: '#f9fafb',
                      borderRadius: 12,
                      alignItems: 'center',
                      gap: 8,
                    }}
                  >
                    <Clock size={32} color="#d1d5db" />
                    <Text style={{ fontSize: 13, color: '#6b7280', fontWeight: '500' }}>No recurring patterns</Text>
                    <Text style={{ fontSize: 12, color: '#9ca3af' }}>Set up weekly unavailability</Text>
                  </View>
                ) : (
                  <View style={{ gap: 8 }}>
                    {DAYS_OF_WEEK.map((day) => {
                      const blocks = recurringTimeOff.filter((r) => r.day_of_week === day.value);
                      if (blocks.length === 0) return null;

                      return (
                        <View key={day.value}>
                          <Text style={{ fontSize: 12, fontWeight: '600', color: '#6b7280', marginBottom: 6, marginLeft: 4 }}>
                            Every {day.label}
                          </Text>
                          {blocks.map((block) => (
                            <View
                              key={block.id}
                              style={{
                                padding: 12,
                                backgroundColor: colors.bgSecondary,
                                borderRadius: 12,
                                flexDirection: 'row',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                borderWidth: 1,
                                borderColor: '#e5e7eb',
                                marginBottom: 6,
                                marginLeft: 12,
                              }}
                            >
                              <Text style={{ fontSize: 12, fontWeight: '500', color: '#111827' }}>
                                {formatTime(block.start_time)} - {formatTime(block.end_time)}
                              </Text>
                              <Pressable
                                onPress={() => handleDeleteRecurringTimeOff(block.id)}
                                style={{ padding: 8 }}
                              >
                                <Trash2 size={14} color="#ef4444" />
                              </Pressable>
                            </View>
                          ))}
                        </View>
                      );
                    })}
                  </View>
                )}
              </View>
            </ScrollView>

            {/* Add Specific Time Off Bottom Sheet */}
            <Modal
              visible={showAddTimeOffSheet}
              animationType="slide"
              transparent={true}
              onRequestClose={() => setShowAddTimeOffSheet(false)}
            >
              <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}>
                <View
                  style={{
                    backgroundColor: '#ffffff',
                    borderTopLeftRadius: 24,
                    borderTopRightRadius: 24,
                    padding: 20,
                    paddingBottom: insets.bottom + 20,
                  }}
                >
                  <ScrollView showsVerticalScrollIndicator={false}>
                    {/* Header */}
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
                      <Text style={{ fontSize: 16, fontWeight: '700', color: '#111827' }}>Add Time Off</Text>
                      <Pressable onPress={() => setShowAddTimeOffSheet(false)}>
                        <X size={24} color="#6b7280" />
                      </Pressable>
                    </View>

                    {/* Start Date */}
                    <View style={{ marginBottom: 16 }}>
                      <Text style={{ fontSize: 12, fontWeight: '600', color: '#111827', marginBottom: 6 }}>
                        Start Date
                      </Text>
                      <Pressable
                        onPress={() => {
                          const newDate = new Date();
                          newDate.setDate(newDate.getDate() + 1);
                          setTimeOffStartDate(newDate);
                        }}
                        style={{
                          borderWidth: 1,
                          borderColor: '#e5e7eb',
                          borderRadius: 8,
                          padding: 12,
                          backgroundColor: '#f9fafb',
                        }}
                      >
                        <Text style={{ fontSize: 13, color: timeOffStartDate ? '#111827' : '#9ca3af' }}>
                          {timeOffStartDate
                            ? timeOffStartDate.toLocaleDateString('en-US', {
                                weekday: 'short',
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric',
                              })
                            : 'Select start date'}
                        </Text>
                      </Pressable>
                    </View>

                    {/* Full Day Toggle */}
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, paddingVertical: 12 }}>
                      <Text style={{ fontSize: 13, fontWeight: '600', color: '#111827' }}>Full Day</Text>
                      <Pressable
                        onPress={() => setTimeOffIsFullDay(!timeOffIsFullDay)}
                        style={{
                          width: 50,
                          height: 28,
                          borderRadius: 14,
                          backgroundColor: timeOffIsFullDay ? '#10b981' : '#e5e7eb',
                          justifyContent: 'center',
                          paddingHorizontal: 2,
                        }}
                      >
                        <View
                          style={{
                            width: 24,
                            height: 24,
                            borderRadius: 12,
                            backgroundColor: '#ffffff',
                            marginLeft: timeOffIsFullDay ? 24 : 0,
                          }}
                        />
                      </Pressable>
                    </View>

                    {/* End Date */}
                    <View style={{ marginBottom: 16 }}>
                      <Text style={{ fontSize: 12, fontWeight: '600', color: '#111827', marginBottom: 6 }}>
                        End Date
                      </Text>
                      <Pressable
                        onPress={() => {
                          const newDate = timeOffStartDate ? new Date(timeOffStartDate) : new Date();
                          setTimeOffEndDate(newDate);
                        }}
                        style={{
                          borderWidth: 1,
                          borderColor: '#e5e7eb',
                          borderRadius: 8,
                          padding: 12,
                          backgroundColor: '#f9fafb',
                        }}
                      >
                        <Text style={{ fontSize: 13, color: timeOffEndDate ? '#111827' : '#9ca3af' }}>
                          {timeOffEndDate
                            ? timeOffEndDate.toLocaleDateString('en-US', {
                                weekday: 'short',
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric',
                              })
                            : 'Select end date (optional)'}
                        </Text>
                      </Pressable>
                    </View>

                    {/* From Time */}
                    {!timeOffIsFullDay && (
                      <>
                        <View style={{ marginBottom: 16 }}>
                          <Text style={{ fontSize: 12, fontWeight: '600', color: '#111827', marginBottom: 6 }}>
                            From
                          </Text>
                          <ScrollView
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            style={{ marginBottom: 12 }}
                            contentContainerStyle={{ gap: 8 }}
                          >
                            {TIME_OPTIONS.slice(0, 24).map((option) => (
                              <Pressable
                                key={option.value}
                                onPress={() => setTimeOffFromTime(option.value)}
                                style={{
                                  paddingHorizontal: 12,
                                  paddingVertical: 8,
                                  borderRadius: 8,
                                  backgroundColor: timeOffFromTime === option.value ? '#fa5610' : '#f3f4f6',
                                  borderWidth: 1,
                                  borderColor: timeOffFromTime === option.value ? '#fa5610' : '#e5e7eb',
                                }}
                              >
                                <Text
                                  style={{
                                    fontSize: 12,
                                    fontWeight: '600',
                                    color: timeOffFromTime === option.value ? '#ffffff' : '#6b7280',
                                  }}
                                >
                                  {option.label}
                                </Text>
                              </Pressable>
                            ))}
                          </ScrollView>
                        </View>

                        {/* To Time */}
                        <View style={{ marginBottom: 24 }}>
                          <Text style={{ fontSize: 12, fontWeight: '600', color: '#111827', marginBottom: 6 }}>
                            To
                          </Text>
                          <ScrollView
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            style={{ marginBottom: 12 }}
                            contentContainerStyle={{ gap: 8 }}
                          >
                            {TIME_OPTIONS.slice(0, 24).map((option) => (
                              <Pressable
                                key={option.value}
                                onPress={() => setTimeOffToTime(option.value)}
                                style={{
                                  paddingHorizontal: 12,
                                  paddingVertical: 8,
                                  borderRadius: 8,
                                  backgroundColor: timeOffToTime === option.value ? '#fa5610' : '#f3f4f6',
                                  borderWidth: 1,
                                  borderColor: timeOffToTime === option.value ? '#fa5610' : '#e5e7eb',
                                }}
                              >
                                <Text
                                  style={{
                                    fontSize: 12,
                                    fontWeight: '600',
                                    color: timeOffToTime === option.value ? '#ffffff' : '#6b7280',
                                  }}
                                >
                                  {option.label}
                                </Text>
                              </Pressable>
                            ))}
                          </ScrollView>
                        </View>
                      </>
                    )}

                    {/* Buttons */}
                    <View style={{ gap: 10, marginTop: 16 }}>
                      <TouchableOpacity
                        onPress={handleAddSpecificTimeOff}
                        disabled={!timeOffStartDate || isAddingTimeOff}
                        style={{
                          backgroundColor: timeOffStartDate && !isAddingTimeOff ? '#fa5610' : '#d8b4fe',
                          borderRadius: 12,
                          paddingVertical: 14,
                          alignItems: 'center',
                        }}
                      >
                        <Text style={{ color: '#ffffff', fontWeight: '700', fontSize: 14 }}>
                          {isAddingTimeOff ? 'Adding...' : 'Add Time Off'}
                        </Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        onPress={() => setShowAddTimeOffSheet(false)}
                        style={{
                          backgroundColor: '#f3f4f6',
                          borderRadius: 12,
                          paddingVertical: 14,
                          alignItems: 'center',
                        }}
                      >
                        <Text style={{ color: '#6b7280', fontWeight: '600', fontSize: 14 }}>Cancel</Text>
                      </TouchableOpacity>
                    </View>
                  </ScrollView>
                </View>
              </View>
            </Modal>

            {/* Add Recurring Pattern Bottom Sheet */}
            <Modal
              visible={showAddRecurringSheet}
              animationType="slide"
              transparent={true}
              onRequestClose={() => setShowAddRecurringSheet(false)}
            >
              <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}>
                <View
                  style={{
                    backgroundColor: '#ffffff',
                    borderTopLeftRadius: 24,
                    borderTopRightRadius: 24,
                    padding: 20,
                    paddingBottom: insets.bottom + 20,
                  }}
                >
                  <ScrollView showsVerticalScrollIndicator={false}>
                    {/* Header */}
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
                      <Text style={{ fontSize: 16, fontWeight: '700', color: '#111827' }}>Add Recurring Pattern</Text>
                      <Pressable onPress={() => setShowAddRecurringSheet(false)}>
                        <X size={24} color="#6b7280" />
                      </Pressable>
                    </View>

                    {/* Day Selection */}
                    <View style={{ marginBottom: 24 }}>
                      <Text style={{ fontSize: 12, fontWeight: '600', color: '#111827', marginBottom: 12 }}>
                        Days of Week
                      </Text>
                      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                        {DAYS_OF_WEEK.map((day) => (
                          <Pressable
                            key={day.value}
                            onPress={() => {
                              if (recurringSelectedDays.includes(day.value)) {
                                setRecurringSelectedDays(
                                  recurringSelectedDays.filter((d) => d !== day.value)
                                );
                              } else {
                                setRecurringSelectedDays([...recurringSelectedDays, day.value]);
                              }
                            }}
                            style={{
                              flex: 1,
                              minWidth: '30%',
                              paddingVertical: 12,
                              borderRadius: 8,
                              backgroundColor: recurringSelectedDays.includes(day.value) ? '#fa5610' : '#f3f4f6',
                              borderWidth: 1,
                              borderColor: recurringSelectedDays.includes(day.value) ? '#fa5610' : '#e5e7eb',
                              alignItems: 'center',
                            }}
                          >
                            <Text
                              style={{
                                fontSize: 12,
                                fontWeight: '600',
                                color: recurringSelectedDays.includes(day.value) ? '#ffffff' : '#6b7280',
                              }}
                            >
                              {day.short}
                            </Text>
                          </Pressable>
                        ))}
                      </View>
                    </View>

                    {/* From Time */}
                    <View style={{ marginBottom: 16 }}>
                      <Text style={{ fontSize: 12, fontWeight: '600', color: '#111827', marginBottom: 6 }}>
                        From
                      </Text>
                      <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        style={{ marginBottom: 12 }}
                        contentContainerStyle={{ gap: 8 }}
                      >
                        {TIME_OPTIONS.slice(0, 24).map((option) => (
                          <Pressable
                            key={option.value}
                            onPress={() => setRecurringFromTime(option.value)}
                            style={{
                              paddingHorizontal: 12,
                              paddingVertical: 8,
                              borderRadius: 8,
                              backgroundColor: recurringFromTime === option.value ? '#fa5610' : '#f3f4f6',
                              borderWidth: 1,
                              borderColor: recurringFromTime === option.value ? '#fa5610' : '#e5e7eb',
                            }}
                          >
                            <Text
                              style={{
                                fontSize: 12,
                                fontWeight: '600',
                                color: recurringFromTime === option.value ? '#ffffff' : '#6b7280',
                              }}
                            >
                              {option.label}
                            </Text>
                          </Pressable>
                        ))}
                      </ScrollView>
                    </View>

                    {/* To Time */}
                    <View style={{ marginBottom: 24 }}>
                      <Text style={{ fontSize: 12, fontWeight: '600', color: '#111827', marginBottom: 6 }}>
                        To
                      </Text>
                      <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        style={{ marginBottom: 12 }}
                        contentContainerStyle={{ gap: 8 }}
                      >
                        {TIME_OPTIONS.slice(0, 24).map((option) => (
                          <Pressable
                            key={option.value}
                            onPress={() => setRecurringToTime(option.value)}
                            style={{
                              paddingHorizontal: 12,
                              paddingVertical: 8,
                              borderRadius: 8,
                              backgroundColor: recurringToTime === option.value ? '#fa5610' : '#f3f4f6',
                              borderWidth: 1,
                              borderColor: recurringToTime === option.value ? '#fa5610' : '#e5e7eb',
                            }}
                          >
                            <Text
                              style={{
                                fontSize: 12,
                                fontWeight: '600',
                                color: recurringToTime === option.value ? '#ffffff' : '#6b7280',
                              }}
                            >
                              {option.label}
                            </Text>
                          </Pressable>
                        ))}
                      </ScrollView>
                    </View>

                    {/* Buttons */}
                    <View style={{ gap: 10, marginTop: 16 }}>
                      <TouchableOpacity
                        onPress={handleAddRecurringTimeOff}
                        disabled={recurringSelectedDays.length === 0 || isAddingTimeOff}
                        style={{
                          backgroundColor:
                            recurringSelectedDays.length > 0 && !isAddingTimeOff ? '#fa5610' : '#d8b4fe',
                          borderRadius: 12,
                          paddingVertical: 14,
                          alignItems: 'center',
                        }}
                      >
                        <Text style={{ color: '#ffffff', fontWeight: '700', fontSize: 14 }}>
                          {isAddingTimeOff ? 'Adding...' : 'Add Pattern'}
                        </Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        onPress={() => setShowAddRecurringSheet(false)}
                        style={{
                          backgroundColor: '#f3f4f6',
                          borderRadius: 12,
                          paddingVertical: 14,
                          alignItems: 'center',
                        }}
                      >
                        <Text style={{ color: '#6b7280', fontWeight: '600', fontSize: 14 }}>Cancel</Text>
                      </TouchableOpacity>
                    </View>
                  </ScrollView>
                </View>
              </View>
            </Modal>
          </View>
        )}
      </ScrollView>

      {/* Day Detail Modal */}
      <Modal visible={isSheetOpen} animationType="slide" transparent={true} onRequestClose={handleCloseSheet}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}>
          <View
            style={{
              backgroundColor: '#ffffff',
              borderTopLeftRadius: 24,
              borderTopRightRadius: 24,
              padding: 20,
              paddingBottom: insets.bottom + 20,
              maxHeight: '90%',
            }}
          >
            {selectedDay && dayAvailability ? (
              <ScrollView showsVerticalScrollIndicator={false}>
                {/* Header with Icon */}
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16, marginBottom: 24 }}>
                  <View
                    style={{
                      width: 48,
                      height: 48,
                      borderRadius: 12,
                      backgroundColor: getStatusColors(dayAvailability.status).bg,
                      justifyContent: 'center',
                      alignItems: 'center',
                    }}
                  >
                    <Calendar size={24} color={getStatusColors(dayAvailability.status).icon} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 18, fontWeight: '700', color: '#111827' }}>
                      {selectedDay.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                    </Text>
                    <Text style={{ fontSize: 13, color: '#6b7280', marginTop: 2 }}>
                      {getStatusText(dayAvailability)}
                    </Text>
                  </View>
                </View>

                {/* Availability Info */}
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'flex-start',
                    gap: 12,
                    backgroundColor: '#f9fafb',
                    padding: 16,
                    borderRadius: 12,
                    marginBottom: 20,
                  }}
                >
                  <Clock size={20} color="#fa5610" style={{ marginTop: 2 }} />
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 14, fontWeight: '700', color: '#111827', marginBottom: 4 }}>
                      {selectedDay.toLocaleDateString('en-US', { weekday: 'long' })} Availability
                    </Text>
                    <Text style={{ fontSize: 13, color: '#6b7280' }}>
                      {dayAvailability.isTimeOff
                        ? 'Time off is set for this day.'
                        : dayAvailability.blockedHours.length === 0
                          ? 'Available 24/7 by default. No blocks set.'
                          : `Available 24/7 by default. ${dayAvailability.blockedHours.length} hour(s) blocked.`}
                    </Text>
                  </View>
                </View>

                {/* Time Off Warning */}
                {dayAvailability.isTimeOff ? (
                  <View
                    style={{
                      backgroundColor: '#fef3c7',
                      padding: 12,
                      borderRadius: 8,
                      marginBottom: 16,
                      borderWidth: 1,
                      borderColor: '#fde047',
                    }}
                  >
                    <Text style={{ fontSize: 13, fontWeight: '600', color: '#92400e' }}>⚠ Time Off</Text>
                    {dayAvailability.timeOffReason ? (
                      <Text style={{ fontSize: 12, color: '#92400e', marginTop: 4 }}>
                        Reason: {dayAvailability.timeOffReason}
                      </Text>
                    ) : null}
                  </View>
                ) : null}

                {/* Bookings on this day */}
                {dayAvailability.bookings && dayAvailability.bookings.length > 0 ? (
                  <View style={{ marginBottom: 20 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                      <CheckCircle2 size={18} color="#fa5610" />
                      <Text style={{ fontSize: 14, fontWeight: '700', color: '#111827' }}>Bookings</Text>
                    </View>
                    {dayAvailability.bookings.map((booking, idx) => (
                      <View
                        key={`booking-${booking.id || idx}`}
                        style={{
                          backgroundColor: '#f9fafb',
                          padding: 12,
                          borderRadius: 8,
                          marginBottom: 8,
                          borderWidth: 1,
                          borderColor: '#e5e7eb',
                        }}
                      >
                        <Text style={{ fontSize: 13, fontWeight: '600', color: colors.text }}>
                          {new Date(booking.scheduled_start).toLocaleTimeString('en-US', {
                            hour: 'numeric',
                            minute: '2-digit',
                            hour12: true,
                          })}{' '}
                          -{' '}
                          {new Date(booking.scheduled_end).toLocaleTimeString('en-US', {
                            hour: 'numeric',
                            minute: '2-digit',
                            hour12: true,
                          })}
                        </Text>
                        {booking.location_text ? (
                          <Text style={{ fontSize: 12, color: '#6b7280', marginTop: 4 }}>
                            📍 {booking.location_text}
                          </Text>
                        ) : null}
                      </View>
                    ))}
                  </View>
                ) : null}

                {/* Available Hours - Always show if available */}
                {dayAvailability && !dayAvailability.isTimeOff && dayAvailability.status === 'available' ? (
                  <View style={{ marginBottom: 24 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                      <Clock size={18} color="#10b981" />
                      <Text style={{ fontSize: 14, fontWeight: '700', color: '#111827' }}>
                        Available Hours (24)
                      </Text>
                    </View>
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
                      {Array.from({ length: 24 }, (_, i) => i).slice(0, 12).map((hour) => (
                        <View
                          key={hour}
                          style={{
                            paddingHorizontal: 14,
                            paddingVertical: 8,
                            backgroundColor: '#dcfce7',
                            borderRadius: 8,
                            borderWidth: 1,
                            borderColor: '#86efac',
                          }}
                        >
                          <Text style={{ fontSize: 12, fontWeight: '600', color: '#10b981' }}>
                            {formatHour(hour)}
                          </Text>
                        </View>
                      ))}
                    </View>
                    <Text style={{ fontSize: 13, fontWeight: '600', color: '#6b7280', marginTop: 12 }}>
                      +12 more
                    </Text>
                  </View>
                ) : dayAvailability && dayAvailability.availableHours && dayAvailability.availableHours.length > 0 && !dayAvailability.isTimeOff ? (
                  <View style={{ marginBottom: 24 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                      <Clock size={18} color="#10b981" />
                      <Text style={{ fontSize: 14, fontWeight: '700', color: '#111827' }}>
                        Available Hours ({dayAvailability.availableHours.length})
                      </Text>
                    </View>
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
                      {dayAvailability.availableHours.slice(0, 12).map((hour) => (
                        <View
                          key={hour}
                          style={{
                            paddingHorizontal: 14,
                            paddingVertical: 8,
                            backgroundColor: '#dcfce7',
                            borderRadius: 8,
                            borderWidth: 1,
                            borderColor: '#86efac',
                          }}
                        >
                          <Text style={{ fontSize: 12, fontWeight: '600', color: '#10b981' }}>
                            {formatHour(hour)}
                          </Text>
                        </View>
                      ))}
                    </View>
                    {dayAvailability.availableHours.length > 12 ? (
                      <Text style={{ fontSize: 13, fontWeight: '600', color: '#6b7280', marginTop: 12 }}>
                        +{dayAvailability.availableHours.length - 12} more
                      </Text>
                    ) : null}
                  </View>
                ) : null}

                {/* Block This Day / Unblock Section */}
                {dayAvailability.isTimeOff ? (
                  <View style={{ borderTopWidth: 1, borderTopColor: '#e5e7eb', paddingTop: 20, marginBottom: 16 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 12 }}>
                      <View
                        style={{
                          width: 24,
                          height: 24,
                          borderRadius: 6,
                          backgroundColor: '#fef3c7',
                          justifyContent: 'center',
                          alignItems: 'center',
                          marginTop: 2,
                        }}
                      >
                        <Trash2 size={14} color="#d97706" />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 14, fontWeight: '700', color: '#111827', marginBottom: 4 }}>
                          Unblock This Day
                        </Text>
                        <Text style={{ fontSize: 13, color: '#6b7280' }}>
                          Remove time off for this day. Clients will be able to book you again.
                        </Text>
                        {dayAvailability.timeOffReason ? (
                          <Text style={{ fontSize: 12, color: '#6b7280', marginTop: 4, fontStyle: 'italic' }}>
                            Reason: {dayAvailability.timeOffReason}
                          </Text>
                        ) : null}
                      </View>
                    </View>

                    <TouchableOpacity
                      onPress={handleUnblockDay}
                      disabled={isBlocking}
                      style={{
                        backgroundColor: isBlocking ? '#fed7aa' : '#f59e0b',
                        opacity: isBlocking ? 0.7 : 1,
                        borderRadius: 12,
                        paddingVertical: 14,
                        alignItems: 'center',
                        flexDirection: 'row',
                        justifyContent: 'center',
                        gap: 8,
                        width: '100%',
                      }}
                    >
                      <Text style={{ color: 'white', fontWeight: '700', fontSize: 14 }}>
                        {isBlocking ? 'Unblocking...' : '✓ Unblock This Day'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <View style={{ borderTopWidth: 1, borderTopColor: '#e5e7eb', paddingTop: 20, marginBottom: 16 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 12 }}>
                      <View
                        style={{
                          width: 24,
                          height: 24,
                          borderRadius: 6,
                          backgroundColor: '#fee2e2',
                          justifyContent: 'center',
                          alignItems: 'center',
                          marginTop: 2,
                        }}
                      >
                        <Text style={{ fontSize: 14, fontWeight: 'bold', color: '#dc2626' }}>⊘</Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 14, fontWeight: '700', color: '#111827', marginBottom: 4 }}>
                          Block This Day
                        </Text>
                        <Text style={{ fontSize: 13, color: '#6b7280' }}>
                          Add time off for this specific day. Clients won't be able to book you.
                        </Text>
                      </View>
                    </View>

                    <View style={{ gap: 12 }}>
                      <View>
                        <Text style={{ fontSize: 12, fontWeight: '600', color: '#111827', marginBottom: 6 }}>
                          Reason (optional)
                        </Text>
                        <TextInput
                          placeholder="e.g., Personal appointment"
                          value={blockReason}
                          onChangeText={setBlockReason}
                          editable={!isBlocking}
                          style={{
                            borderWidth: 1,
                            borderColor: '#e5e7eb',
                            borderRadius: 8,
                            padding: 12,
                            fontSize: 13,
                            color: '#111827',
                            backgroundColor: '#f9fafb',
                          }}
                          placeholderTextColor="#9ca3af"
                        />
                      </View>

                      <TouchableOpacity
                        onPress={handleBlockDay}
                        disabled={isBlocking}
                        style={{
                          backgroundColor: isBlocking ? '#f87171' : '#dc2626',
                          opacity: isBlocking ? 0.7 : 1,
                          borderRadius: 12,
                          paddingVertical: 14,
                          alignItems: 'center',
                          flexDirection: 'row',
                          justifyContent: 'center',
                          gap: 8,
                          width: '100%',
                        }}
                      >
                        <Text style={{ color: 'white', fontWeight: '700', fontSize: 14 }}>
                          {isBlocking ? 'Blocking...' : '⊘ Block This Day'}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                )}

                {/* Close Button */}
                <Pressable
                  style={{
                    paddingVertical: 14,
                    borderRadius: 12,
                    alignItems: 'center',
                  }}
                  onPress={handleCloseSheet}
                >
                  <Text style={{ fontSize: 14, fontWeight: '600', color: '#111827' }}>Close</Text>
                </Pressable>
              </ScrollView>
            ) : null}
          </View>
        </View>
      </Modal>
    </View>
  );
}
