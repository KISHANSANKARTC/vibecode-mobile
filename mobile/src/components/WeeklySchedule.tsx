import { View, Text, Pressable } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

interface DaySchedule {
  date: number;
  dayName: string;
  hasBooking: boolean;
  isToday: boolean;
}

interface WeeklyScheduleProps {
  days: DaySchedule[];
  onDayPress?: (date: number) => void;
}

export function WeeklySchedule({ days, onDayPress }: WeeklyScheduleProps) {
  return (
    <Animated.View
      entering={FadeInDown.delay(300).duration(500)}
      className="mx-4 rounded-2xl p-4"
      style={{
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.08)',
      }}
    >
      <Text className="text-white text-lg font-semibold mb-4">This Week</Text>

      <View className="flex-row justify-between">
        {days.map((day, index) => (
          <Pressable
            key={index}
            onPress={() => onDayPress?.(day.date)}
            className="items-center"
          >
            <Text
              className={`text-xs mb-2 ${
                day.isToday ? 'text-orange-500 font-semibold' : 'text-neutral-400'
              }`}
            >
              {day.dayName}
            </Text>
            <View
              className={`w-10 h-10 rounded-full items-center justify-center ${
                day.isToday ? 'bg-orange-500' : 'bg-transparent'
              }`}
              style={
                !day.isToday
                  ? {
                      borderWidth: 1,
                      borderColor: 'rgba(255, 255, 255, 0.1)',
                    }
                  : undefined
              }
            >
              <Text
                className={`text-sm font-medium ${
                  day.isToday ? 'text-white' : 'text-white'
                }`}
              >
                {day.date}
              </Text>
            </View>
            {/* Booking indicator dot */}
            {day.hasBooking ? (
              <View
                className="w-1.5 h-1.5 rounded-full mt-2"
                style={{
                  backgroundColor: day.isToday ? '#FFFFFF' : '#F97316',
                }}
              />
            ) : (
              <View className="w-1.5 h-1.5 mt-2" />
            )}
          </Pressable>
        ))}
      </View>
    </Animated.View>
  );
}

// Helper function to generate current week data
export function generateCurrentWeek(): DaySchedule[] {
  const today = new Date();
  const dayOfWeek = today.getDay();
  const startOfWeek = new Date(today);
  startOfWeek.setDate(today.getDate() - dayOfWeek);

  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const days: DaySchedule[] = [];

  // Mock bookings on specific days
  const bookingDays = [1, 3, 5]; // Mon, Wed, Fri have bookings

  for (let i = 0; i < 7; i++) {
    const date = new Date(startOfWeek);
    date.setDate(startOfWeek.getDate() + i);

    days.push({
      date: date.getDate(),
      dayName: dayNames[i],
      hasBooking: bookingDays.includes(i),
      isToday: date.toDateString() === today.toDateString(),
    });
  }

  return days;
}
