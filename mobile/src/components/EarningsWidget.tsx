import { View, Text } from 'react-native';
import { TrendingUp, Clock, Calendar } from 'lucide-react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

interface EarningsWidgetProps {
  monthlyEarnings: number;
  pendingPayouts: number;
  activeBookings: number;
  currency?: string;
}

export function EarningsWidget({
  monthlyEarnings,
  pendingPayouts,
  activeBookings,
  currency = 'AED',
}: EarningsWidgetProps) {
  const formatCurrency = (amount: number) => {
    return amount.toLocaleString('en-US');
  };

  return (
    <Animated.View
      entering={FadeInDown.delay(100).duration(500)}
      className="mx-4 rounded-3xl overflow-hidden"
      style={{
        backgroundColor: 'rgba(249, 115, 22, 0.15)',
        borderWidth: 1,
        borderColor: 'rgba(249, 115, 22, 0.3)',
      }}
    >
      {/* Main Earnings Section */}
      <View className="p-5">
        <View className="flex-row items-center mb-2">
          <TrendingUp size={18} color="#F97316" />
          <Text className="text-orange-500 text-sm ml-2 font-medium">
            Monthly Earnings
          </Text>
        </View>
        <Text className="text-white text-4xl font-bold mb-1">
          {currency} {formatCurrency(monthlyEarnings)}
        </Text>
        <Text className="text-neutral-400 text-sm">
          This month's revenue
        </Text>
      </View>

      {/* Stats Row */}
      <View
        className="flex-row"
        style={{
          backgroundColor: 'rgba(0, 0, 0, 0.3)',
          borderTopWidth: 1,
          borderTopColor: 'rgba(249, 115, 22, 0.2)',
        }}
      >
        {/* Pending Payouts */}
        <View className="flex-1 p-4 items-center border-r border-orange-500/20">
          <View className="flex-row items-center mb-1">
            <Clock size={14} color="#9CA3AF" />
            <Text className="text-neutral-400 text-xs ml-1">Pending</Text>
          </View>
          <Text className="text-white text-lg font-semibold">
            {currency} {formatCurrency(pendingPayouts)}
          </Text>
        </View>

        {/* Active Bookings */}
        <View className="flex-1 p-4 items-center">
          <View className="flex-row items-center mb-1">
            <Calendar size={14} color="#9CA3AF" />
            <Text className="text-neutral-400 text-xs ml-1">Active</Text>
          </View>
          <Text className="text-white text-lg font-semibold">
            {activeBookings} Bookings
          </Text>
        </View>
      </View>
    </Animated.View>
  );
}
