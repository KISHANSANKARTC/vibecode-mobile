import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  TextInput,
  ActivityIndicator,
  Alert,
  Modal,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { format } from 'date-fns';
import { useRouter } from '@/lib/router-helper';
import {
  ArrowLeft,
  RefreshCw,
  Wallet,
  TrendingUp,
  AlertCircle,
  Building2,
  Plus,
  CheckCircle,
  Trash2,
  Globe,
  Shield,
} from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/lib/state/auth-store';
import { useTheme } from '@/lib/theme/ThemeContext';
import { SkeletonLoader } from '@/components/SkeletonLoader';
import { extractErrorMessage } from '@/lib/errorUtils';
import { useStripeConnect } from '@/hooks/useStripeConnect';

const COUNTRIES = [
  { code: 'AE', name: 'United Arab Emirates', currency: 'AED' },
  { code: 'SA', name: 'Saudi Arabia', currency: 'SAR' },
  { code: 'QA', name: 'Qatar', currency: 'QAR' },
  { code: 'BH', name: 'Bahrain', currency: 'BHD' },
  { code: 'KW', name: 'Kuwait', currency: 'KWD' },
  { code: 'OM', name: 'Oman', currency: 'OMR' },
  { code: 'JO', name: 'Jordan', currency: 'JOD' },
  { code: 'LB', name: 'Lebanon', currency: 'LBP' },
  { code: 'EG', name: 'Egypt', currency: 'EGP' },
  { code: 'DE', name: 'Germany', currency: 'EUR' },
  { code: 'FR', name: 'France', currency: 'EUR' },
  { code: 'IT', name: 'Italy', currency: 'EUR' },
  { code: 'ES', name: 'Spain', currency: 'EUR' },
  { code: 'NL', name: 'Netherlands', currency: 'EUR' },
  { code: 'GB', name: 'United Kingdom', currency: 'GBP' },
  { code: 'US', name: 'United States', currency: 'USD' },
  { code: 'CA', name: 'Canada', currency: 'CAD' },
  { code: 'IN', name: 'India', currency: 'INR' },
  { code: 'AU', name: 'Australia', currency: 'AUD' },
  { code: 'PH', name: 'Philippines', currency: 'PHP' },
  { code: 'PK', name: 'Pakistan', currency: 'PKR' },
  { code: 'SG', name: 'Singapore', currency: 'SGD' },
  { code: 'NG', name: 'Nigeria', currency: 'NGN' },
  { code: 'ZA', name: 'South Africa', currency: 'ZAR' },
  { code: 'BR', name: 'Brazil', currency: 'BRL' },
  { code: 'CH', name: 'Switzerland', currency: 'CHF' },
  { code: 'TR', name: 'Turkey', currency: 'TRY' },
];

const IBAN_LENGTHS: { [key: string]: number } = {
  AE: 23, SA: 24, QA: 29, BH: 22, KW: 30, OM: 23, JO: 30, LB: 28, EG: 29,
  GB: 22, DE: 22, FR: 27, IT: 27, ES: 24, NL: 18, BE: 16, AT: 20, CH: 21, TR: 26,
  BR: 29, MX: 18, PK: 24,
};

interface BankAccount {
  id: string;
  user_id: string;
  account_holder_name: string;
  bank_name: string;
  country_code: string;
  payment_method: string;
  currency: string;
  iban: string;
  swift_code: string | null;
  routing_number: string | null;
  account_number: string | null;
  sort_code: string | null;
  ifsc_code: string | null;
  bsb_code: string | null;
  branch_code: string | null;
  is_primary: boolean;
  verified_at: string | null;
  created_at: string;
  updated_at: string;
}

interface Payout {
  id: string;
  talent_id: string;
  booking_id: string | null;
  amount: number;
  currency: string;
  status: 'pending' | 'completed' | 'failed';
  provider_ref: string | null;
  created_at: string;
}

// Helper function to mask account info
const maskAccountInfo = (account: BankAccount): string => {
  if (account.iban) return `****${account.iban.slice(-4)}`;
  if (account.account_number) return `****${account.account_number.slice(-4)}`;
  return 'Account added';
};

// Helper function to get country name from code
const getCountryName = (code: string): string => {
  return COUNTRIES.find((c) => c.code === code)?.name || code;
};

// Helper function to get payment method label
const getPaymentMethodLabel = (method: string): string => {
  const labels: { [key: string]: string } = {
    iban: 'IBAN Transfer',
    swift: 'SWIFT Transfer',
    account_number: 'Account Transfer',
    sort_code: 'UK Transfer',
    ifsc_code: 'India Transfer',
    bsb_code: 'Australia Transfer',
  };
  return labels[method] || 'Transfer';
};

// Helper function to get account subtext
const getAccountSubtext = (account: BankAccount): string => {
  const parts: string[] = [];
  if (account.country_code) parts.push(getCountryName(account.country_code));
  if (account.payment_method) parts.push(getPaymentMethodLabel(account.payment_method));
  return parts.join(' • ');
};

export default function PayoutsScreen() {
  const insets = useSafeAreaInsets();
  const { isDark } = useTheme();
  const user = useAuthStore((s) => s.user);
  const router = useRouter();

  // Data state
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [totalEarnings, setTotalEarnings] = useState(0);
  const [pendingPayouts, setPendingPayouts] = useState(0);
  const [currency, setCurrency] = useState('AED');
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Bank setup modal state
  const [showBankSetup, setShowBankSetup] = useState(false);
  const [isSavingBank, setIsSavingBank] = useState(false);
  const [selectedCountry, setSelectedCountry] = useState('AE');
  const [bankFormData, setBankFormData] = useState({
    account_holder_name: '',
    bank_name: '',
    iban: '',
    swift_code: '',
  });
  const [bankFormErrors, setBankFormErrors] = useState<{ [key: string]: string }>({});

  // Stripe Connect — talent payout onboarding/dashboard/payout request
  const {
    isLoading: isConnectLoading,
    status: connectStatus,
    createConnectAccount,
    openDashboard,
    requestPayout,
  } = useStripeConnect();

  const fetchData = useCallback(async () => {
    if (!user?.id) return;

    try {
      // Get talent profile
      const { data: talentProfile, error: talentError } = await supabase
        .from('talent_profiles')
        .select('id, currency')
        .eq('user_id', user.id)
        .single();

      if (talentError) {
        console.error('Error fetching talent profile:', talentError);
        return;
      }

      const talentId = talentProfile?.id || user.id;
      const currencyCode = talentProfile?.currency || 'AED';
      setCurrency(currencyCode);

      // Fetch bank accounts
      const { data: bankAccountsData, error: banksError } = await supabase
        .from('bank_accounts')
        .select('*')
        .eq('user_id', user.id)
        .order('is_primary', { ascending: false })
        .order('created_at', { ascending: false });

      if (banksError) {
        console.error('Error fetching bank accounts:', banksError);
      } else {
        setBankAccounts(bankAccountsData || []);
      }

      // Fetch payouts
      const { data: payoutsData, error: payoutsError } = await supabase
        .from('payouts')
        .select('*')
        .eq('talent_id', talentId)
        .order('created_at', { ascending: false });

      if (payoutsError) {
        console.error('Error fetching payouts:', payoutsError);
      } else {
        setPayouts(payoutsData || []);

        // Calculate totals
        const completed = (payoutsData || [])
          .filter((p: Payout) => p.status === 'completed')
          .reduce((sum: number, p: Payout) => sum + p.amount, 0);

        const pending = (payoutsData || [])
          .filter((p: Payout) => p.status === 'pending')
          .reduce((sum: number, p: Payout) => sum + p.amount, 0);

        setTotalEarnings(completed);
        setPendingPayouts(pending);
      }
    } catch (err) {
      const errorMsg = extractErrorMessage(err);
      console.error('Error fetching data:', errorMsg);
    } finally {
      setIsLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Refetch data when screen is focused
  useFocusEffect(
    useCallback(() => {
      fetchData();
    }, [fetchData])
  );

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await fetchData();
    setIsRefreshing(false);
  };

  const handleSaveBankAccount = async () => {
    const errors: { [key: string]: string } = {};

    if (!bankFormData.account_holder_name.trim()) {
      errors.account_holder_name = 'Required';
    }
    if (!bankFormData.bank_name.trim()) {
      errors.bank_name = 'Required';
    }

    const cleanedIban = bankFormData.iban.replace(/\s/g, '').toUpperCase();
    if (!cleanedIban) {
      errors.iban = 'IBAN is required';
    } else if (!/^[A-Z]{2}[0-9]{2}[A-Z0-9]{4,30}$/.test(cleanedIban)) {
      errors.iban = 'Invalid IBAN format';
    } else {
      const expectedLen = IBAN_LENGTHS[selectedCountry];
      if (expectedLen && cleanedIban.length !== expectedLen) {
        const countryName = COUNTRIES.find((c) => c.code === selectedCountry)?.name || selectedCountry;
        errors.iban = `Invalid IBAN for ${countryName} (expected ${expectedLen} characters)`;
      }
    }

    if (Object.keys(errors).length > 0) {
      setBankFormErrors(errors);
      return;
    }

    setIsSavingBank(true);
    try {
      const isPrimary = bankAccounts.length === 0;
      const country = COUNTRIES.find((c) => c.code === selectedCountry);

      const { error } = await supabase.from('bank_accounts').insert({
        user_id: user?.id,
        account_holder_name: bankFormData.account_holder_name.trim(),
        bank_name: bankFormData.bank_name.trim(),
        country_code: selectedCountry,
        payment_method: 'iban',
        currency: country?.currency || 'USD',
        iban: cleanedIban,
        swift_code: bankFormData.swift_code.trim().toUpperCase() || null,
        routing_number: null,
        account_number: null,
        sort_code: null,
        ifsc_code: null,
        bsb_code: null,
        branch_code: null,
        is_primary: isPrimary,
      });

      if (error) throw error;

      Alert.alert('Success', 'Bank account added successfully');
      setBankFormData({
        account_holder_name: '',
        bank_name: '',
        iban: '',
        swift_code: '',
      });
      setSelectedCountry('AE');
      setBankFormErrors({});
      setShowBankSetup(false);
      await fetchData();
    } catch (err) {
      const errorMsg = extractErrorMessage(err);
      console.error('Error adding bank account:', errorMsg);
      Alert.alert('Error', 'Failed to add bank account. Please try again.');
    } finally {
      setIsSavingBank(false);
    }
  };

  const handleSetPrimary = async (accountId: string) => {
    try {
      await supabase
        .from('bank_accounts')
        .update({ is_primary: false })
        .eq('user_id', user?.id);

      const { error } = await supabase
        .from('bank_accounts')
        .update({ is_primary: true })
        .eq('id', accountId)
        .eq('user_id', user?.id);

      if (error) throw error;

      Alert.alert('Success', 'Primary account updated');
      await fetchData();
    } catch (err) {
      const errorMsg = extractErrorMessage(err);
      console.error('Error setting primary:', errorMsg);
      Alert.alert('Error', 'Failed to update primary account');
    }
  };

  const handleDeleteBankAccount = (accountId: string) => {
    Alert.alert(
      'Remove Bank Account',
      'Are you sure you want to remove this bank account?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await supabase
                .from('bank_accounts')
                .delete()
                .eq('id', accountId)
                .eq('user_id', user?.id);

              if (error) throw error;

              setBankAccounts((prev) => prev.filter((a) => a.id !== accountId));
              Alert.alert('Success', 'Bank account removed');
            } catch (err) {
              const errorMsg = extractErrorMessage(err);
              console.error('Error deleting bank account:', errorMsg);
              Alert.alert('Error', 'Failed to remove bank account');
            }
          },
        },
      ]
    );
  };

  const hasBankAccount = bankAccounts.length > 0;
  const showBlocker = pendingPayouts > 0 && !hasBankAccount;

  const bgColor = isDark ? '#0A0A0A' : '#FFFFFF';
  const textColor = isDark ? '#FFFFFF' : '#171717';
  const mutedColor = isDark ? '#9CA3AF' : '#737373';
  const borderColor = isDark ? '#374151' : '#E5E7EB';
  const cardBg = isDark ? '#1A1A1A' : '#FFFFFF';
  const accentColor = '#FA5610';
  const successColor = '#10B981';
  const warningColor = '#F59E0B';
  const destructiveColor = '#EF4444';

  if (isLoading) {
    return (
      <View style={{ flex: 1, backgroundColor: bgColor }}>
        {/* Header - always visible */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            paddingHorizontal: 16,
            paddingTop: insets.top + 16,
            paddingBottom: 16,
            borderBottomWidth: 1,
            borderBottomColor: borderColor,
          }}
        >
          <Pressable onPress={() => router.push('/(talent)/profile')} style={{ width: 40, height: 40, justifyContent: 'center' }}>
            <ArrowLeft size={24} color={textColor} strokeWidth={2} />
          </Pressable>
          <Text style={{ fontSize: 20, fontWeight: 'bold', color: textColor, flex: 1, marginLeft: 16 }}>
            Payouts
          </Text>
        </View>

        {/* Skeleton content */}
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 16, paddingBottom: 120 }}
          showsVerticalScrollIndicator={false}
        >
          {/* Balance Cards Skeleton */}
          <View style={{ flexDirection: 'row', gap: 12, marginBottom: 24 }}>
            <View style={{ flex: 1, backgroundColor: cardBg, borderWidth: 1, borderColor: borderColor, borderRadius: 16, padding: 16, alignItems: 'center' }}>
              <SkeletonLoader width={24} height={24} borderRadius={4} style={{ marginBottom: 8 }} />
              <SkeletonLoader width="60%" height={24} borderRadius={4} style={{ marginBottom: 4 }} />
              <SkeletonLoader width="70%" height={12} borderRadius={4} />
            </View>
            <View style={{ flex: 1, backgroundColor: cardBg, borderWidth: 1, borderColor: borderColor, borderRadius: 16, padding: 16, alignItems: 'center' }}>
              <SkeletonLoader width={24} height={24} borderRadius={4} style={{ marginBottom: 8 }} />
              <SkeletonLoader width="60%" height={24} borderRadius={4} style={{ marginBottom: 4 }} />
              <SkeletonLoader width="70%" height={12} borderRadius={4} />
            </View>
          </View>

          {/* Bank Account Section Skeleton */}
          <View style={{ marginBottom: 24 }}>
            <SkeletonLoader width="40%" height={16} borderRadius={4} style={{ marginBottom: 12 }} />
            <View style={{ backgroundColor: cardBg, borderWidth: 1, borderColor: borderColor, borderRadius: 16, padding: 16, marginBottom: 12 }}>
              <View style={{ flexDirection: 'row', gap: 12 }}>
                <SkeletonLoader width={48} height={48} borderRadius={12} />
                <View style={{ flex: 1 }}>
                  <SkeletonLoader width="70%" height={16} borderRadius={4} style={{ marginBottom: 8 }} />
                  <SkeletonLoader width="90%" height={14} borderRadius={4} />
                </View>
              </View>
            </View>
          </View>

          {/* Payout History Skeleton */}
          <View>
            <SkeletonLoader width="40%" height={16} borderRadius={4} style={{ marginBottom: 12 }} />
            {[1, 2, 3].map((i) => (
              <View
                key={i}
                style={{
                  backgroundColor: cardBg,
                  borderWidth: 1,
                  borderColor: borderColor,
                  borderRadius: 16,
                  padding: 16,
                  marginBottom: 12,
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <View style={{ flex: 1 }}>
                  <SkeletonLoader width="40%" height={16} borderRadius={4} style={{ marginBottom: 8 }} />
                  <SkeletonLoader width="30%" height={12} borderRadius={4} />
                </View>
                <SkeletonLoader width={80} height={24} borderRadius={20} />
              </View>
            ))}
          </View>
        </ScrollView>
      </View>
    );
  }

  // Blocker screen
  if (showBlocker) {
    return (
      <View style={{ flex: 1, backgroundColor: bgColor }}>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            paddingHorizontal: 16,
            paddingTop: insets.top + 16,
            paddingBottom: 16,
            borderBottomWidth: 1,
            borderBottomColor: borderColor,
          }}
        >
          <Pressable onPress={() => router.push('/(talent)/profile')} style={{ width: 40, height: 40, justifyContent: 'center' }}>
            <ArrowLeft size={24} color={textColor} strokeWidth={2} />
          </Pressable>
          <Text style={{ fontSize: 20, fontWeight: 'bold', color: textColor, flex: 1, marginLeft: 16 }}>
            Payouts
          </Text>
        </View>

        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 20 }}>
          <View
            style={{
              width: 80,
              height: 80,
              borderRadius: 40,
              backgroundColor: '#FEF3C7',
              justifyContent: 'center',
              alignItems: 'center',
              marginBottom: 20,
            }}
          >
            <Building2 size={40} color={warningColor} strokeWidth={2} />
          </View>

          <Text style={{ fontSize: 24, fontWeight: 'bold', color: textColor, textAlign: 'center', marginBottom: 8 }}>
            Add Bank Details to Receive Payment
          </Text>

          <Text style={{ fontSize: 14, color: mutedColor, textAlign: 'center', marginBottom: 20 }}>
            You have {currency} {pendingPayouts.toLocaleString()} pending. Add your bank details to receive your payout.
          </Text>

          <View
            style={{
              backgroundColor: '#FEF3C7',
              borderWidth: 1,
              borderColor: '#FCD34D',
              borderRadius: 12,
              padding: 16,
              flexDirection: 'row',
              gap: 12,
              marginBottom: 24,
            }}
          >
            <AlertCircle size={20} color="#F59E0B" strokeWidth={2} style={{ marginTop: 2 }} />
            <Text style={{ fontSize: 14, color: mutedColor, flex: 1 }}>
              Payouts are processed within 2-5 business days after you add your bank details.
            </Text>
          </View>

          <Pressable
            onPress={() => setShowBankSetup(true)}
            style={{
              backgroundColor: accentColor,
              paddingHorizontal: 20,
              paddingVertical: 12,
              borderRadius: 12,
              width: '100%',
              height: 48,
              justifyContent: 'center',
              alignItems: 'center',
              flexDirection: 'row',
              gap: 8,
            }}
          >
            <Building2 size={20} color="#FFFFFF" strokeWidth={2} />
            <Text style={{ fontSize: 16, fontWeight: '600', color: '#FFFFFF' }}>Add Bank Details</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  // Normal screen
  return (
    <View style={{ flex: 1, backgroundColor: bgColor }}>
      {/* Header */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: 16,
          paddingTop: insets.top + 16,
          paddingBottom: 16,
          borderBottomWidth: 1,
          borderBottomColor: borderColor,
        }}
      >
        <Pressable onPress={() => router.back()} style={{ width: 40, height: 40, justifyContent: 'center' }}>
          <ArrowLeft size={24} color={textColor} strokeWidth={2} />
        </Pressable>
        <Text style={{ fontSize: 20, fontWeight: 'bold', color: textColor, flex: 1, marginLeft: 16 }}>
          Payouts
        </Text>
        <Pressable
          onPress={handleRefresh}
          disabled={isRefreshing}
          style={{ width: 40, height: 40, justifyContent: 'center', alignItems: 'center' }}
        >
          {isRefreshing ? (
            <ActivityIndicator size="small" color={accentColor} />
          ) : (
            <RefreshCw size={18} color={mutedColor} strokeWidth={2} />
          )}
        </Pressable>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 16, paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Stripe Connect status banner */}
        {!connectStatus?.hasAccount && (
          <Pressable
            disabled={isConnectLoading}
            onPress={async () => {
              const r = await createConnectAccount();
              if (!r.ok && r.error) Alert.alert('Could not start onboarding', r.error);
            }}
            style={{
              backgroundColor: accentColor,
              paddingHorizontal: 16,
              paddingVertical: 14,
              borderRadius: 12,
              marginBottom: 16,
              opacity: isConnectLoading ? 0.6 : 1,
            }}
          >
            <Text style={{ color: '#FFFFFF', textAlign: 'center', fontWeight: '600', fontSize: 15 }}>
              Set up Stripe payouts
            </Text>
          </Pressable>
        )}

        {connectStatus?.hasAccount && !connectStatus?.payoutsEnabled && (
          <View
            style={{
              backgroundColor: isDark ? 'rgba(245, 158, 11, 0.12)' : '#FEF3C7',
              borderWidth: 1,
              borderColor: isDark ? 'rgba(245, 158, 11, 0.4)' : '#FDE68A',
              borderRadius: 12,
              padding: 12,
              marginBottom: 16,
            }}
          >
            <Text style={{ color: isDark ? '#FCD34D' : '#92400E', fontSize: 13, marginBottom: 8 }}>
              Stripe is reviewing your account. Some details may still be required.
            </Text>
            <Pressable
              disabled={isConnectLoading}
              onPress={async () => {
                const r = await openDashboard();
                if (!r.ok && r.error) Alert.alert('Could not open dashboard', r.error);
              }}
            >
              <Text style={{ color: accentColor, fontWeight: '600' }}>
                Open Stripe dashboard →
              </Text>
            </Pressable>
          </View>
        )}

        {connectStatus?.payoutsEnabled && (
          <Pressable
            disabled={isConnectLoading}
            onPress={async () => {
              const r = await openDashboard();
              if (!r.ok && r.error) Alert.alert('Could not open dashboard', r.error);
            }}
            style={{
              backgroundColor: cardBg,
              borderWidth: 1,
              borderColor: borderColor,
              paddingHorizontal: 16,
              paddingVertical: 12,
              borderRadius: 12,
              marginBottom: 16,
            }}
          >
            <Text style={{ color: textColor, textAlign: 'center', fontWeight: '600' }}>
              Manage payouts in Stripe →
            </Text>
          </Pressable>
        )}

        {/* Balance Cards */}
        <View style={{ flexDirection: 'row', gap: 12, marginBottom: 24 }}>
          {/* Total Earned */}
          <View
            style={{
              flex: 1,
              backgroundColor: cardBg,
              borderWidth: 1,
              borderColor: borderColor,
              borderRadius: 16,
              padding: 16,
              alignItems: 'center',
            }}
          >
            <Wallet size={24} color={accentColor} strokeWidth={2} style={{ marginBottom: 8 }} />
            <Text style={{ fontSize: 24, fontWeight: 'bold', color: textColor, marginBottom: 4 }}>
              {currency} {totalEarnings.toLocaleString()}
            </Text>
            <Text style={{ fontSize: 12, color: mutedColor }}>Total Earned</Text>
          </View>

          {/* Pending */}
          <View
            style={{
              flex: 1,
              backgroundColor: cardBg,
              borderWidth: 1,
              borderColor: borderColor,
              borderRadius: 16,
              padding: 16,
              alignItems: 'center',
            }}
          >
            <TrendingUp size={24} color={successColor} strokeWidth={2} style={{ marginBottom: 8 }} />
            <Text style={{ fontSize: 24, fontWeight: 'bold', color: textColor, marginBottom: 4 }}>
              {currency} {pendingPayouts.toLocaleString()}
            </Text>
            <Text style={{ fontSize: 12, color: mutedColor }}>Pending</Text>
          </View>
        </View>

        {/* Bank Account Section */}
        <View style={{ marginBottom: 24 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <Text style={{ fontSize: 16, fontWeight: '600', color: textColor }}>Bank Account</Text>
            {hasBankAccount ? (
              <Pressable
                onPress={() => setShowBankSetup(true)}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}
              >
                <Plus size={16} color={accentColor} strokeWidth={2} />
                <Text style={{ fontSize: 14, fontWeight: '500', color: accentColor }}>Add</Text>
              </Pressable>
            ) : null}
          </View>

          {!hasBankAccount ? (
            <View
              style={{
                backgroundColor: cardBg,
                borderWidth: 1,
                borderColor: borderColor,
                borderRadius: 16,
                padding: 16,
              }}
            >
              <View style={{ flexDirection: 'row', gap: 12 }}>
                <View
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: 12,
                    backgroundColor: 'rgba(250, 86, 16, 0.1)',
                    justifyContent: 'center',
                    alignItems: 'center',
                  }}
                >
                  <Building2 size={24} color={accentColor} strokeWidth={2} />
                </View>
                <View style={{ flex: 1, justifyContent: 'center' }}>
                  <Text style={{ fontSize: 16, fontWeight: '500', color: textColor }}>Add your bank details</Text>
                  <Text style={{ fontSize: 14, color: mutedColor, marginTop: 2 }}>
                    Required to receive payments for completed bookings
                  </Text>
                </View>
              </View>

              <Pressable
                onPress={() => setShowBankSetup(true)}
                style={{
                  backgroundColor: accentColor,
                  borderRadius: 12,
                  paddingVertical: 12,
                  paddingHorizontal: 16,
                  marginTop: 16,
                  flexDirection: 'row',
                  justifyContent: 'center',
                  alignItems: 'center',
                  gap: 8,
                }}
              >
                <Plus size={16} color="#FFFFFF" strokeWidth={2} />
                <Text style={{ fontSize: 14, fontWeight: '600', color: '#FFFFFF' }}>Add Bank Account</Text>
              </Pressable>
            </View>
          ) : (
            bankAccounts.map((account) => (
              <View
                key={account.id}
                style={{
                  backgroundColor: cardBg,
                  borderWidth: 1,
                  borderColor: borderColor,
                  borderRadius: 16,
                  padding: 16,
                  marginBottom: 12,
                  flexDirection: 'row',
                }}
              >
                <View
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 20,
                    backgroundColor: `rgba(250, 86, 16, 0.1)`,
                    justifyContent: 'center',
                    alignItems: 'center',
                    marginRight: 12,
                  }}
                >
                  <Building2 size={20} color={accentColor} strokeWidth={2} />
                </View>

                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    <Text style={{ fontSize: 16, fontWeight: '500', color: textColor }}>{account.bank_name}</Text>
                    {account.is_primary ? (
                      <View
                        style={{
                          backgroundColor: `rgba(250, 86, 16, 0.1)`,
                          paddingHorizontal: 8,
                          paddingVertical: 4,
                          borderRadius: 6,
                        }}
                      >
                        <Text style={{ fontSize: 12, color: accentColor, fontWeight: '500' }}>Primary</Text>
                      </View>
                    ) : null}
                  </View>
                  <Text style={{ fontSize: 14, color: mutedColor, marginBottom: 8 }}>{account.account_holder_name}</Text>
                  <Text
                    style={{
                      fontSize: 12,
                      color: mutedColor,
                      marginBottom: 6,
                      fontFamily: 'monospace',
                    }}
                  >
                    {maskAccountInfo(account)}
                  </Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                    <Globe size={10} color={mutedColor} strokeWidth={2} />
                    <Text style={{ fontSize: 12, color: mutedColor }}>
                      {getAccountSubtext(account)}
                    </Text>
                  </View>
                </View>

                <View style={{ flexDirection: 'row', gap: 8 }}>
                  {!account.is_primary && (
                    <Pressable
                      onPress={() => handleSetPrimary(account.id)}
                      style={{
                        width: 32,
                        height: 32,
                        justifyContent: 'center',
                        alignItems: 'center',
                      }}
                    >
                      <CheckCircle size={20} color={mutedColor} strokeWidth={2} />
                    </Pressable>
                  )}
                  <Pressable
                    onPress={() => handleDeleteBankAccount(account.id)}
                    style={{
                      width: 32,
                      height: 32,
                      justifyContent: 'center',
                      alignItems: 'center',
                    }}
                  >
                    <Trash2 size={20} color={destructiveColor} strokeWidth={2} />
                  </Pressable>
                </View>
              </View>
            ))
          )}
        </View>

        {/* Warning Banner */}
        {!hasBankAccount && (
          <View
            style={{
              backgroundColor: '#FEF3C7',
              borderWidth: 1,
              borderColor: '#FCD34D',
              borderRadius: 12,
              padding: 16,
              flexDirection: 'row',
              gap: 12,
              marginBottom: 24,
            }}
          >
            <AlertCircle size={20} color={warningColor} strokeWidth={2} style={{ marginTop: 2 }} />
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 16, fontWeight: '500', color: '#92400E' }}>
                Add bank details to receive payouts
              </Text>
              <Text style={{ fontSize: 14, color: '#B45309', marginTop: 4 }}>
                You need to add your bank account before you can receive payments for completed bookings.
              </Text>
            </View>
          </View>
        )}

        {/* How Payouts Work */}
        <View
          style={{
            backgroundColor: cardBg,
            borderWidth: 1,
            borderColor: borderColor,
            borderRadius: 16,
            padding: 16,
            marginBottom: 24,
          }}
        >
          <Text style={{ fontSize: 16, fontWeight: '600', color: textColor, marginBottom: 12 }}>How Payouts Work</Text>
          <Text style={{ fontSize: 14, color: mutedColor, lineHeight: 22, marginBottom: 12 }}>
            When a client marks a booking as complete, the funds held in escrow are released to your bank account. You receive the
            full agreed amount -- no fees are deducted from your earnings. Transfers typically take 2-5 business days.
          </Text>

          <View
            style={{
              backgroundColor: 'rgba(107, 114, 128, 0.05)',
              borderRadius: 12,
              padding: 12,
            }}
          >
            <Text style={{ fontSize: 14, fontWeight: '500', color: textColor }}>Pending payouts:</Text>
            <Text style={{ fontSize: 14, color: mutedColor, marginTop: 4 }}>
              {pendingPayouts > 0 ? `${currency} ${pendingPayouts.toLocaleString()}` : 'No pending payouts'}
            </Text>
          </View>
        </View>

        {/* Payout History */}
        <View style={{ marginBottom: 24 }}>
          <Text style={{ fontSize: 16, fontWeight: '600', color: textColor, marginBottom: 12 }}>Payout History</Text>

          {payouts.length === 0 ? (
            <View
              style={{
                backgroundColor: cardBg,
                borderWidth: 1,
                borderColor: borderColor,
                borderRadius: 16,
                paddingVertical: 32,
                alignItems: 'center',
              }}
            >
              <Wallet size={40} color={`rgba(107, 114, 128, 0.5)`} strokeWidth={1.5} style={{ marginBottom: 12 }} />
              <Text style={{ fontSize: 16, color: mutedColor, marginBottom: 4 }}>No payouts yet</Text>
              <Text style={{ fontSize: 14, color: mutedColor }}>Complete bookings to start earning</Text>
            </View>
          ) : (
            payouts.map((payout) => {
              let statusColor = '#6B7280';
              let statusBg = 'rgba(107, 114, 128, 0.1)';
              let statusLabel = payout.status;

              if (payout.status === 'completed') {
                statusColor = successColor;
                statusBg = '#ECFDF5';
              } else if (payout.status === 'pending') {
                statusColor = warningColor;
                statusBg = '#FFFBEB';
              } else if (payout.status === 'failed') {
                statusColor = destructiveColor;
                statusBg = '#FEF2F2';
              }

              return (
                <View
                  key={payout.id}
                  style={{
                    backgroundColor: cardBg,
                    borderWidth: 1,
                    borderColor: borderColor,
                    borderRadius: 16,
                    padding: 16,
                    marginBottom: 12,
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <View>
                    <Text style={{ fontSize: 16, fontWeight: '500', color: textColor }}>
                      {payout.currency.toUpperCase()} {payout.amount.toLocaleString()}
                    </Text>
                    <Text style={{ fontSize: 12, color: mutedColor, marginTop: 4 }}>
                      {format(new Date(payout.created_at), 'MMM d, yyyy')}
                    </Text>
                  </View>

                  <View
                    style={{
                      backgroundColor: statusBg,
                      paddingHorizontal: 12,
                      paddingVertical: 6,
                      borderRadius: 20,
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 12,
                        fontWeight: '500',
                        color: statusColor,
                        textTransform: 'capitalize',
                      }}
                    >
                      {statusLabel}
                    </Text>
                  </View>
                </View>
              );
            })
          )}
        </View>
      </ScrollView>

      {/* Bank Setup Modal */}
      <Modal
        visible={showBankSetup}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowBankSetup(false)}
      >
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
          <View style={{ flex: 1, backgroundColor: bgColor }}>
            {/* Modal Header */}
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                paddingHorizontal: 16,
                paddingTop: insets.top + 16,
                paddingBottom: 16,
                borderBottomWidth: 1,
                borderBottomColor: borderColor,
              }}
            >
              <Pressable onPress={() => setShowBankSetup(false)} style={{ width: 40, height: 40, justifyContent: 'center' }}>
                <ArrowLeft size={24} color={textColor} strokeWidth={2} />
              </Pressable>
              <View style={{ flex: 1, marginLeft: 16 }}>
                <Text style={{ fontSize: 18, fontWeight: 'bold', color: textColor }}>Add Bank Account</Text>
                <Text style={{ fontSize: 14, color: mutedColor }}>Connect your bank for payouts</Text>
              </View>
            </View>

            {/* Form */}
            <ScrollView
              style={{ flex: 1 }}
              contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 20, paddingBottom: 100 }}
              showsVerticalScrollIndicator={false}
            >
              {/* Country Selector */}
              <View style={{ marginBottom: 20 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 8 }}>
                  <Globe size={14} color={textColor} strokeWidth={2} />
                  <Text style={{ fontSize: 14, fontWeight: '500', color: textColor }}>Country *</Text>
                </View>
                <Pressable
                  style={{
                    backgroundColor: cardBg,
                    borderWidth: 1,
                    borderColor: borderColor,
                    borderRadius: 12,
                    paddingHorizontal: 12,
                    paddingVertical: 12,
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <Text style={{ fontSize: 14, color: textColor }}>
                    {COUNTRIES.find((c) => c.code === selectedCountry)?.name} (
                    {COUNTRIES.find((c) => c.code === selectedCountry)?.currency})
                  </Text>
                </Pressable>
                <Text style={{ fontSize: 12, color: mutedColor, marginTop: 6 }}>Payment method: IBAN Transfer</Text>
              </View>

              {/* Account Holder Name */}
              <View style={{ marginBottom: 20 }}>
                <Text style={{ fontSize: 14, fontWeight: '500', color: textColor, marginBottom: 8 }}>Account Holder Name *</Text>
                <TextInput
                  style={{
                    backgroundColor: cardBg,
                    borderWidth: 1,
                    borderColor: bankFormErrors.account_holder_name ? destructiveColor : borderColor,
                    borderRadius: 12,
                    paddingHorizontal: 12,
                    paddingVertical: 12,
                    fontSize: 14,
                    color: textColor,
                  }}
                  placeholder="Your full name as on bank account"
                  placeholderTextColor={mutedColor}
                  value={bankFormData.account_holder_name}
                  onChangeText={(text) => {
                    setBankFormData({ ...bankFormData, account_holder_name: text });
                    setBankFormErrors({ ...bankFormErrors, account_holder_name: '' });
                  }}
                />
                {bankFormErrors.account_holder_name ? (
                  <Text style={{ fontSize: 12, color: destructiveColor, marginTop: 4 }}>{bankFormErrors.account_holder_name}</Text>
                ) : null}
              </View>

              {/* Bank Name */}
              <View style={{ marginBottom: 20 }}>
                <Text style={{ fontSize: 14, fontWeight: '500', color: textColor, marginBottom: 8 }}>Bank Name *</Text>
                <TextInput
                  style={{
                    backgroundColor: cardBg,
                    borderWidth: 1,
                    borderColor: bankFormErrors.bank_name ? destructiveColor : borderColor,
                    borderRadius: 12,
                    paddingHorizontal: 12,
                    paddingVertical: 12,
                    fontSize: 14,
                    color: textColor,
                  }}
                  placeholder="Enter your bank name"
                  placeholderTextColor={mutedColor}
                  value={bankFormData.bank_name}
                  onChangeText={(text) => {
                    setBankFormData({ ...bankFormData, bank_name: text });
                    setBankFormErrors({ ...bankFormErrors, bank_name: '' });
                  }}
                />
                {bankFormErrors.bank_name ? (
                  <Text style={{ fontSize: 12, color: destructiveColor, marginTop: 4 }}>{bankFormErrors.bank_name}</Text>
                ) : null}
              </View>

              {/* IBAN */}
              <View style={{ marginBottom: 20 }}>
                <Text style={{ fontSize: 14, fontWeight: '500', color: textColor, marginBottom: 8 }}>IBAN *</Text>
                <TextInput
                  style={{
                    backgroundColor: cardBg,
                    borderWidth: 1,
                    borderColor: bankFormErrors.iban ? destructiveColor : borderColor,
                    borderRadius: 12,
                    paddingHorizontal: 12,
                    paddingVertical: 12,
                    fontSize: 14,
                    color: textColor,
                    fontFamily: 'monospace',
                  }}
                  placeholder="XX00 0000 0000 0000 0000 00"
                  placeholderTextColor={mutedColor}
                  value={bankFormData.iban}
                  onChangeText={(text) => {
                    const cleaned = text.toUpperCase().replace(/[^A-Z0-9\s]/g, '');
                    setBankFormData({ ...bankFormData, iban: cleaned });
                    setBankFormErrors({ ...bankFormErrors, iban: '' });
                  }}
                />
                {bankFormErrors.iban ? (
                  <Text style={{ fontSize: 12, color: destructiveColor, marginTop: 4 }}>{bankFormErrors.iban}</Text>
                ) : null}
              </View>

              {/* SWIFT Code */}
              <View style={{ marginBottom: 20 }}>
                <Text style={{ fontSize: 14, fontWeight: '500', color: textColor, marginBottom: 8 }}>SWIFT/BIC Code</Text>
                <TextInput
                  style={{
                    backgroundColor: cardBg,
                    borderWidth: 1,
                    borderColor: borderColor,
                    borderRadius: 12,
                    paddingHorizontal: 12,
                    paddingVertical: 12,
                    fontSize: 14,
                    color: textColor,
                    fontFamily: 'monospace',
                  }}
                  placeholder="BANKXXXX"
                  placeholderTextColor={mutedColor}
                  value={bankFormData.swift_code}
                  onChangeText={(text) => {
                    setBankFormData({ ...bankFormData, swift_code: text.toUpperCase() });
                  }}
                />
              </View>

              {/* Security Info */}
              <View
                style={{
                  backgroundColor: 'rgba(0, 0, 0, 0.03)',
                  borderRadius: 8,
                  padding: 12,
                  flexDirection: 'row',
                  gap: 8,
                  marginBottom: 24,
                }}
              >
                <Shield size={16} color={mutedColor} strokeWidth={2} style={{ marginTop: 2 }} />
                <Text style={{ fontSize: 12, color: mutedColor, flex: 1, lineHeight: 18 }}>
                  Your bank details are encrypted and stored securely. We only use them to process your payouts.
                </Text>
              </View>
            </ScrollView>

            {/* Footer Buttons */}
            <View
              style={{
                flexDirection: 'row',
                gap: 8,
                paddingHorizontal: 16,
                paddingBottom: insets.bottom + 16,
                paddingTop: 12,
                borderTopWidth: 1,
                borderTopColor: borderColor,
              }}
            >
              <Pressable
                onPress={() => {
                  setShowBankSetup(false);
                  setBankFormData({
                    account_holder_name: '',
                    bank_name: '',
                    iban: '',
                    swift_code: '',
                  });
                  setBankFormErrors({});
                }}
                style={{
                  flex: 1,
                  backgroundColor: 'transparent',
                  borderWidth: 1,
                  borderColor: borderColor,
                  borderRadius: 12,
                  paddingVertical: 12,
                  justifyContent: 'center',
                  alignItems: 'center',
                }}
              >
                <Text style={{ fontSize: 14, fontWeight: '600', color: textColor }}>Cancel</Text>
              </Pressable>

              <Pressable
                onPress={handleSaveBankAccount}
                disabled={isSavingBank}
                style={{
                  flex: 1,
                  backgroundColor: isSavingBank ? 'rgba(250, 86, 16, 0.5)' : accentColor,
                  borderRadius: 12,
                  paddingVertical: 12,
                  justifyContent: 'center',
                  alignItems: 'center',
                  flexDirection: 'row',
                  gap: 8,
                }}
              >
                {isSavingBank ? (
                  <>
                    <ActivityIndicator size="small" color="#FFFFFF" />
                    <Text style={{ fontSize: 14, fontWeight: '600', color: '#FFFFFF' }}>Saving...</Text>
                  </>
                ) : (
                  <Text style={{ fontSize: 14, fontWeight: '600', color: '#FFFFFF' }}>Save Bank Account</Text>
                )}
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}
