import {
  View,
  Text,
  ScrollView,
  Pressable,
  ActivityIndicator,
  Modal,
  TextInput,
  Linking,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from '@/lib/router-helper';
import { useLocalSearchParams } from 'expo-router';
import {
  ChevronLeft,
  Wallet,
  Plus,
  Building2,
  CreditCard,
  CheckCircle,
  Clock,
  XCircle,
  TrendingUp,
  ChevronDown,
  X,
} from 'lucide-react-native';
import { useState, useEffect, useCallback } from 'react';
import { useAuthStore } from '@/lib/state/auth-store';
import { supabase } from '@/lib/supabase';
import { extractErrorMessage } from '@/lib/errorUtils';

interface CompanyData {
  id: string;
  company_name: string;
  currency?: string;
}

interface Wallet {
  id: string;
  balance: number;
  currency: string;
}

interface WalletTransaction {
  id: string;
  amount: number;
  type: 'topup' | 'payment' | 'refund';
  status: string;
  description?: string;
  created_at: string;
}

interface Payment {
  id: string;
  amount: number;
  currency: string;
  status: string;
  created_at: string;
  booking_id: string;
  talentName?: string;
  location?: string;
}

export default function BillingScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const params = useLocalSearchParams();
  const user = useAuthStore((s) => s.user);

  const [loading, setLoading] = useState(true);
  const [company, setCompany] = useState<CompanyData | null>(null);
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [walletTransactions, setWalletTransactions] = useState<WalletTransaction[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [breakdownOpen, setBreakdownOpen] = useState(false);
  const [showTopUpModal, setShowTopUpModal] = useState(false);
  const [selectedAmount, setSelectedAmount] = useState(500);
  const [customAmount, setCustomAmount] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  const displayCurrency = company?.currency || 'AED';

  // Handle URL params for topup success/cancelled
  useEffect(() => {
    if (params.topup === 'success') {
      setToastMessage('Funds added successfully!');
      router.replace('/(client)/profile/billing' as never);
    } else if (params.topup === 'cancelled') {
      setToastMessage('Top-up cancelled');
      router.replace('/(client)/profile/billing' as never);
    }
  }, [params]);

  // Fetch data
  useEffect(() => {
    const fetchData = async () => {
      if (!user?.id) {
        setLoading(false);
        return;
      }

      try {
        // Fetch company
        const { data: companyData } = await supabase
          .from('client_companies')
          .select('id, company_name, currency')
          .eq('user_id', user.id)
          .maybeSingle();

        if (companyData) {
          setCompany(companyData);
        }

        // Fetch wallet
        const { data: walletData } = await supabase
          .from('client_wallets')
          .select('id, balance, currency')
          .eq('user_id', user.id)
          .maybeSingle();

        if (walletData) {
          setWallet(walletData);
        }

        // Fetch wallet transactions
        const { data: walletTxData } = await supabase
          .from('wallet_transactions')
          .select('id, amount, type, status, description, created_at')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(20);

        if (walletTxData) {
          setWalletTransactions(walletTxData);
        }

        // Fetch payments with booking and talent info
        const { data: paymentsData } = await supabase
          .from('payments')
          .select('id, amount, currency, status, created_at, booking_id')
          .eq('payer_user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(20);

        if (paymentsData) {
          // Enrich payments with booking and talent details
          const enrichedPayments = await Promise.all(
            paymentsData.map(async (payment) => {
              try {
                const { data: bookingData } = await supabase
                  .from('bookings')
                  .select('location_text, id')
                  .eq('id', payment.booking_id)
                  .maybeSingle();

                let talentName = 'Talent';
                if (bookingData?.id) {
                  const { data: bookingTalentData } = await supabase
                    .from('booking_talents')
                    .select('talent_id')
                    .eq('booking_id', bookingData.id)
                    .maybeSingle();

                  if (bookingTalentData?.talent_id) {
                    const { data: talentProfile } = await supabase
                      .from('talent_profiles')
                      .select('user_id')
                      .eq('id', bookingTalentData.talent_id)
                      .maybeSingle();

                    if (talentProfile?.user_id) {
                      const { data: profile } = await supabase
                        .from('profiles')
                        .select('full_name')
                        .eq('id', talentProfile.user_id)
                        .maybeSingle();

                      if (profile?.full_name) {
                        talentName = profile.full_name;
                      }
                    }
                  }
                }

                return {
                  ...payment,
                  talentName,
                  location: bookingData?.location_text || 'Location',
                };
              } catch (error) {
                const errorMsg = error instanceof Error ? error.message : typeof error === 'string' ? error : 'Error enriching payment';
                console.error('Error enriching payment:', errorMsg);
                return { ...payment, talentName: 'Talent', location: 'Location' };
              }
            })
          );

          setPayments(enrichedPayments);
        }
      } catch (err) {
        const errorMsg = extractErrorMessage(err);
        console.error('Error fetching data:', errorMsg);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user?.id]);

  // Calculate wallet breakdown
  const calculateBreakdown = () => {
    const totalAdded = walletTransactions
      .filter((tx) => tx.type === 'topup')
      .reduce((sum, tx) => sum + tx.amount, 0) / 100;

    const totalUsed = walletTransactions
      .filter((tx) => tx.type === 'payment')
      .reduce((sum, tx) => sum + tx.amount, 0) / 100;

    const totalRefunded = walletTransactions
      .filter((tx) => tx.type === 'refund')
      .reduce((sum, tx) => sum + tx.amount, 0) / 100;

    return { totalAdded, totalUsed, totalRefunded };
  };

  const calculateTotalSpent = () => {
    return payments
      .filter((p) => p.status === 'completed')
      .reduce((sum, p) => sum + p.amount / 100, 0);
  };

  const handleTopUp = useCallback(async () => {
    const amount = customAmount ? parseInt(customAmount) : selectedAmount;

    if (amount < 1 || amount > 10000) {
      setToastMessage('Amount must be between 1 and 10,000 AED');
      return;
    }

    setIsProcessing(true);

    try {
      const amountInFils = Math.round(amount * 100);
      const response = await supabase.functions.invoke('add-funds', {
        body: { amount: amountInFils, origin: 'https://engage.app' },
      });

      if (response.data?.url) {
        await Linking.openURL(response.data.url);
        setShowTopUpModal(false);
      }
    } catch (err) {
      const errorMsg = extractErrorMessage(err);
      console.error('Error initiating top-up:', errorMsg);
      setToastMessage('Failed to initiate top-up');
    } finally {
      setIsProcessing(false);
    }
  }, [selectedAmount, customAmount]);

  if (loading) {
    return (
      <View className="flex-1 bg-[#F8F8F8] items-center justify-center">
        <ActivityIndicator size="large" color="#F97316" />
      </View>
    );
  }

  const { totalAdded, totalUsed, totalRefunded } = calculateBreakdown();
  const totalSpent = calculateTotalSpent();
  const walletBalance = wallet?.balance ? wallet.balance / 100 : 0;

  return (
    <View className="flex-1 bg-[#F8F8F8]">
      {/* Header */}
      <View
        className="flex-row items-center px-5 py-4 border-b border-gray-200 bg-white"
        style={{ paddingTop: insets.top }}
      >
        <Pressable onPress={() => router.back()} className="mr-3">
          <ChevronLeft size={24} color="#1F2937" strokeWidth={2} />
        </Pressable>
        <Text className="text-gray-900 text-xl font-semibold">
          Billing & Payments
        </Text>
      </View>

      <ScrollView className="flex-1 px-5 py-6" contentContainerStyle={{ paddingBottom: 120 }}>
        {/* Wallet Balance Card */}
        <View className="bg-white rounded-3xl p-6 border border-gray-200 mb-6 overflow-hidden"
          style={{ shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 }}>
          <View className="absolute top-0 right-0 w-32 h-32 bg-orange-50 rounded-full opacity-60" />

          <Pressable onPress={() => setBreakdownOpen(!breakdownOpen)} className="flex-row items-center justify-between">
            <View className="flex-1 z-10">
              <View className="flex-row items-center mb-2">
                <Wallet size={18} color="#9CA3AF" strokeWidth={2} />
                <Text className="text-gray-600 text-sm font-medium ml-2">Wallet Balance</Text>
              </View>
              <Text className="text-gray-900 text-3xl font-bold">
                {displayCurrency} {walletBalance.toFixed(2)}
              </Text>
            </View>

            <View className="z-10">
              <ChevronDown
                size={24}
                color="#1F2937"
                strokeWidth={2}
                style={{
                  transform: [{ rotate: breakdownOpen ? '180deg' : '0deg' }],
                }}
              />
            </View>
          </Pressable>

          {/* Expandable Breakdown */}
          {breakdownOpen ? (
            <View className="mt-4 pt-4 border-t border-gray-200">
              <View className="flex-row items-center justify-between mb-3">
                <Text className="text-gray-600 text-sm">Total Added</Text>
                <Text className="text-green-600 font-semibold">
                  +{displayCurrency} {totalAdded.toFixed(2)}
                </Text>
              </View>
              <View className="flex-row items-center justify-between mb-3">
                <Text className="text-gray-600 text-sm">Total Spent</Text>
                <Text className="text-gray-900 font-semibold">
                  -{displayCurrency} {totalUsed.toFixed(2)}
                </Text>
              </View>
              <View className="flex-row items-center justify-between">
                <Text className="text-gray-600 text-sm">Total Refunded</Text>
                <Text className="text-green-600 font-semibold">
                  +{displayCurrency} {totalRefunded.toFixed(2)}
                </Text>
              </View>
            </View>
          ) : null}

          {/* Add Funds Button */}
          <Pressable
            onPress={() => setShowTopUpModal(true)}
            className="bg-orange-500 rounded-xl py-3 px-4 flex-row items-center justify-center mt-4 gap-2 z-10"
          >
            <Plus size={20} color="#FFFFFF" strokeWidth={2.5} />
            <Text className="text-white font-semibold">Add Funds</Text>
          </Pressable>
        </View>

        {/* Total Spent Card */}
        <View className="bg-white rounded-2xl p-6 border border-gray-200 items-center mb-6">
          <Text className="text-gray-600 text-sm font-medium">
            Total Spent on Bookings
          </Text>
          <Text className="text-gray-900 text-3xl font-bold mt-2">
            {displayCurrency} {totalSpent.toFixed(2)}
          </Text>
        </View>

        {/* Wallet Activity */}
        {walletTransactions.length > 0 && (
          <>
            <Text className="text-gray-900 text-sm font-semibold mb-4">
              Wallet Activity
            </Text>
            <View className="mb-6 space-y-3">
              {walletTransactions.map((transaction) => {
                const amount = transaction.amount / 100;
                const isTopup = transaction.type === 'topup';
                const isRefund = transaction.type === 'refund';
                const amountColor = isTopup || isRefund ? '#16A34A' : '#1F2937';
                const amountPrefix = isTopup || isRefund ? '+' : '-';

                return (
                  <View
                    key={transaction.id}
                    className="bg-white rounded-2xl p-4 border border-gray-200 flex-row items-center justify-between"
                  >
                    <View className="flex-1">
                      <Text className="text-gray-900 font-medium text-sm">
                        {transaction.description || 'Wallet Transaction'}
                      </Text>
                      <Text className="text-gray-500 text-xs mt-1">
                        {new Date(transaction.created_at).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </Text>
                    </View>

                    <View className="items-end">
                      <Text
                        className="font-semibold text-sm"
                        style={{ color: amountColor }}
                      >
                        {amountPrefix}{displayCurrency} {amount.toFixed(2)}
                      </Text>
                      <View
                        className="mt-2 px-2 py-1 rounded-full flex-row items-center gap-1"
                        style={{
                          backgroundColor: isTopup
                            ? '#DCFCE7'
                            : isRefund
                              ? '#FEF3C7'
                              : '#F3F4F6',
                        }}
                      >
                        {isTopup ? <TrendingUp size={14} color="#16A34A" strokeWidth={2} /> : null}
                        {isRefund ? <CreditCard size={14} color="#FBBF24" strokeWidth={2} /> : null}
                        {!isTopup && !isRefund ? <CreditCard size={14} color="#9CA3AF" strokeWidth={2} /> : null}
                        <Text
                          className="text-xs font-semibold capitalize"
                          style={{
                            color: isTopup ? '#16A34A' : isRefund ? '#FBBF24' : '#9CA3AF',
                          }}
                        >
                          {isTopup ? 'Top Up' : isRefund ? 'Refund' : 'Payment'}
                        </Text>
                      </View>
                    </View>
                  </View>
                );
              })}
            </View>
          </>
        )}

        {/* Billing Information */}
        <View className="bg-white rounded-2xl p-6 border border-gray-200 mb-6">
          <View className="flex-row items-start justify-between">
            <View className="flex-1 flex-row items-start">
              <Building2 size={18} color="#9CA3AF" strokeWidth={2} />
              <View className="ml-3 flex-1">
                <Text className="text-gray-600 text-sm font-medium">
                  Billing Address
                </Text>
                <Text className="text-gray-900 font-medium mt-1">
                  Update in Company Profile
                </Text>
              </View>
            </View>
            <Pressable
              onPress={() => router.push('/(client)/profile/company' as never)}
              className="border border-gray-300 rounded-lg px-4 py-2 ml-2"
            >
              <Text className="text-gray-900 text-sm font-medium">Update</Text>
            </Pressable>
          </View>
        </View>

        {/* Booking Payments */}
        <Text className="text-gray-900 text-sm font-semibold mb-4">
          Booking Payments
        </Text>

        {payments.length === 0 ? (
          <View className="bg-white rounded-2xl p-6 border border-gray-200 items-center">
            <CreditCard size={40} color="#9CA3AF" strokeWidth={1.5} />
            <Text className="text-gray-900 font-medium mt-3">
              No booking payments yet
            </Text>
            <Text className="text-gray-600 text-xs text-center mt-1">
              Booking payments will appear here after checkout.
            </Text>
          </View>
        ) : (
          <View className="mb-6 space-y-3">
            {payments.map((payment) => {
              const amount = payment.amount / 100;
              let statusColor = '#9CA3AF';
              let statusBg = '#F3F4F6';
              let StatusIcon = CreditCard;

              if (payment.status === 'completed') {
                statusColor = '#16A34A';
                statusBg = '#DCFCE7';
                StatusIcon = CheckCircle;
              } else if (payment.status === 'pending') {
                statusColor = '#FBBF24';
                statusBg = '#FEF3C7';
                StatusIcon = Clock;
              } else if (payment.status === 'failed') {
                statusColor = '#EF4444';
                statusBg = '#FEE2E2';
                StatusIcon = XCircle;
              }

              return (
                <View
                  key={payment.id}
                  className="bg-white rounded-2xl p-4 border border-gray-200 flex-row items-center justify-between"
                >
                  <View className="flex-1">
                    <Text className="text-gray-900 font-medium text-sm">
                      {payment.talentName}
                    </Text>
                    <Text className="text-gray-500 text-xs mt-1">
                      {payment.location}
                    </Text>
                    <Text className="text-gray-500 text-xs mt-1">
                      {new Date(payment.created_at).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </Text>
                  </View>

                  <View className="items-end">
                    <Text className="text-gray-900 font-semibold text-sm">
                      {displayCurrency} {amount.toFixed(2)}
                    </Text>
                    <View
                      className="mt-2 px-2 py-1 rounded-full flex-row items-center gap-1"
                      style={{ backgroundColor: statusBg }}
                    >
                      <StatusIcon size={14} color={statusColor} strokeWidth={2} />
                      <Text
                        className="text-xs font-semibold capitalize"
                        style={{ color: statusColor }}
                      >
                        {payment.status === 'completed'
                          ? 'Paid'
                          : payment.status === 'pending'
                            ? 'Pending'
                            : payment.status === 'failed'
                              ? 'Failed'
                              : 'Refunded'}
                      </Text>
                    </View>
                  </View>
                </View>
              );
            })}
          </View>
        )}

        {/* Toast Message */}
        {toastMessage ? (
          <View className="bg-green-50 border border-green-200 rounded-lg p-4 flex-row items-center">
            <CheckCircle size={20} color="#22C55E" />
            <Text className="text-green-700 text-sm font-medium ml-2">{toastMessage}</Text>
          </View>
        ) : null}
      </ScrollView>

      {/* Top-Up Modal */}
      <Modal visible={showTopUpModal} transparent animationType="fade">
        <View className="flex-1 bg-black/50 justify-end">
          <View
            className="bg-white rounded-t-3xl p-6"
            style={{ paddingBottom: insets.bottom + 32 }}
          >
            {/* Header */}
            <View className="flex-row items-center justify-between mb-6">
              <View className="flex-row items-center gap-2">
                <Wallet size={24} color="#F97316" strokeWidth={2} />
                <Text className="text-gray-900 text-xl font-bold">
                  Add Funds to Wallet
                </Text>
              </View>
              <Pressable onPress={() => setShowTopUpModal(false)}>
                <X size={24} color="#6B7280" strokeWidth={2} />
              </Pressable>
            </View>

            <Text className="text-gray-600 text-sm mb-6">
              Choose an amount to add to your wallet.
            </Text>

            {/* Preset Amounts */}
            <View className="mb-6">
              <View className="flex-row flex-wrap gap-3">
                {[100, 250, 500, 1000].map((amount) => (
                  <Pressable
                    key={amount}
                    onPress={() => {
                      setSelectedAmount(amount);
                      setCustomAmount('');
                    }}
                    className={`flex-1 rounded-xl py-3 items-center border-2 min-w-[45%] ${
                      selectedAmount === amount && !customAmount
                        ? 'border-orange-500 bg-orange-50'
                        : 'border-gray-200'
                    }`}
                  >
                    <Text
                      className={`font-semibold ${
                        selectedAmount === amount && !customAmount
                          ? 'text-orange-600'
                          : 'text-gray-900'
                      }`}
                    >
                      {displayCurrency} {amount}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>

            {/* Custom Amount */}
            <View className="mb-6">
              <Text className="text-gray-700 text-sm font-semibold mb-2">
                Or Enter Custom Amount
              </Text>
              <View className="flex-row items-center border border-gray-300 rounded-xl px-4 py-3 bg-white">
                <TextInput
                  placeholder="Enter amount (1 - 10,000)"
                  value={customAmount}
                  onChangeText={(text) => {
                    setCustomAmount(text);
                    if (text) setSelectedAmount(0);
                  }}
                  placeholderTextColor="#D1D5DB"
                  keyboardType="number-pad"
                  className="flex-1 text-gray-900 text-base"
                />
                <Text className="text-gray-700 font-semibold ml-2">{displayCurrency}</Text>
              </View>
            </View>

            {/* Summary */}
            {(selectedAmount > 0 || customAmount) ? (
              <View className="bg-gray-50 rounded-xl p-4 mb-6 items-center">
                <Text className="text-gray-600 text-sm">You will add</Text>
                <Text className="text-gray-900 text-2xl font-bold mt-1">
                  {displayCurrency} {(customAmount ? parseInt(customAmount) : selectedAmount).toLocaleString()}
                </Text>
                <Text className="text-gray-600 text-sm mt-1">to your wallet</Text>
              </View>
            ) : null}

            {/* Action Buttons */}
            <View className="flex-row gap-3">
              <Pressable
                onPress={() => setShowTopUpModal(false)}
                className="flex-1 border border-gray-300 rounded-xl py-3 items-center"
              >
                <Text className="text-gray-900 font-semibold">Cancel</Text>
              </Pressable>
              <Pressable
                onPress={handleTopUp}
                disabled={isProcessing || (selectedAmount === 0 && !customAmount)}
                className="flex-1 bg-orange-500 rounded-xl py-3 items-center"
                style={{ opacity: isProcessing || (selectedAmount === 0 && !customAmount) ? 0.5 : 1 }}
              >
                {isProcessing ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <Text className="text-white font-semibold">Proceed to Payment</Text>
                )}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}
