import {
  View,
  Text,
  ScrollView,
  Pressable,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import {
  ChevronLeft,
  FileText,
} from 'lucide-react-native';
import { useState, useEffect } from 'react';
import { useAuthStore } from '@/lib/state/auth-store';
import { supabase } from '@/lib/supabase';

interface Invoice {
  id: string;
  invoice_number: string;
  amount: number;
  status: string;
  created_at: string;
  due_date?: string;
}

export default function InvoicesScreen() {
  const insets = useSafeAreaInsets();
  const user = useAuthStore((s) => s.user);
  const [loading, setLoading] = useState(true);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [filterStatus, setFilterStatus] = useState('all');

  useEffect(() => {
    const fetchInvoices = async () => {
      if (!user?.id) {
        setLoading(false);
        return;
      }

      try {
        const { data } = await supabase
          .from('invoices')
          .select('*')
          .eq('client_id', user.id)
          .order('created_at', { ascending: false });

        setInvoices(data || []);
      } catch (error) {
        console.error('Error fetching invoices:', extractErrorMessage(error));
      } finally {
        setLoading(false);
      }
    };

    fetchInvoices();
  }, [user?.id]);

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'paid':
        return '#22C55E';
      case 'pending':
        return '#FBBF24';
      case 'overdue':
        return '#EF4444';
      case 'cancelled':
        return '#9CA3AF';
      default:
        return '#6B7280';
    }
  };

  const getStatusBg = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'paid':
        return '#DCFCE7';
      case 'pending':
        return '#FEF3C7';
      case 'overdue':
        return '#FEE2E2';
      case 'cancelled':
        return '#F3F4F6';
      default:
        return '#F3F4F6';
    }
  };

  const filteredInvoices = filterStatus === 'all'
    ? invoices
    : invoices.filter(inv => inv.status?.toLowerCase() === filterStatus.toLowerCase());

  if (loading) {
    return (
      <View className="flex-1 bg-[#F8F8F8] items-center justify-center">
        <ActivityIndicator size="large" color="#F97316" />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-[#F8F8F8]">
      <View
        className="flex-row items-center px-5 py-4 border-b border-gray-200 bg-white"
        style={{ paddingTop: insets.top }}
      >
        <Pressable onPress={() => router.back()} className="mr-3">
          <ChevronLeft size={24} color="#1F2937" strokeWidth={2} />
        </Pressable>
        <Text className="text-gray-900 text-xl font-semibold">
          Invoices
        </Text>
      </View>

      <ScrollView className="flex-1 px-5 py-6" contentContainerStyle={{ paddingBottom: 120 }}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          className="mb-6 -mx-5 px-5"
        >
          {['all', 'paid', 'pending', 'overdue'].map((status) => (
            <Pressable
              key={status}
              onPress={() => setFilterStatus(status)}
              className={`px-4 py-2 rounded-full mr-3 ${
                filterStatus === status
                  ? 'bg-orange-500'
                  : 'bg-white border border-gray-200'
              }`}
            >
              <Text
                className={`capitalize font-medium text-sm ${
                  filterStatus === status ? 'text-white' : 'text-gray-700'
                }`}
              >
                {status === 'all' ? 'All' : status}
              </Text>
            </Pressable>
          ))}
        </ScrollView>

        {filteredInvoices.length === 0 ? (
          <View className="bg-white rounded-2xl p-6 border border-gray-200 items-center">
            <FileText size={48} color="#9CA3AF" strokeWidth={1.5} />
            <Text className="text-gray-900 text-lg font-semibold mt-4">
              No invoices yet
            </Text>
            <Text className="text-gray-600 text-center text-sm mt-2">
              Your invoices will appear here
            </Text>
          </View>
        ) : (
          filteredInvoices.map((invoice) => (
            <Pressable
              key={invoice.id}
              className="bg-white rounded-2xl p-4 border border-gray-200 mb-3 flex-row items-center justify-between"
            >
              <View className="flex-1">
                <Text className="text-gray-900 font-medium text-sm">
                  {invoice.invoice_number}
                </Text>
                <Text className="text-gray-500 text-xs mt-1">
                  {new Date(invoice.created_at).toLocaleDateString()}
                </Text>
              </View>
              <View className="items-end">
                <Text className="text-gray-900 font-semibold text-sm">
                  AED {invoice.amount}
                </Text>
                <View
                  className="mt-1 px-2 py-1 rounded-full"
                  style={{ backgroundColor: getStatusBg(invoice.status) }}
                >
                  <Text
                    className="text-xs font-medium capitalize"
                    style={{ color: getStatusColor(invoice.status) }}
                  >
                    {invoice.status}
                  </Text>
                </View>
              </View>
            </Pressable>
          ))
        )}
      </ScrollView>
    </View>
  );
}
