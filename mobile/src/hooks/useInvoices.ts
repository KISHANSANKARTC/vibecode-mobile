import { useState, useEffect, useCallback } from 'react';
import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { useAuthStore } from '@/lib/state/auth-store';
import { supabase } from '@/lib/supabase';

export interface InvoiceLineItem {
  description: string;
  quantity: number;
  unit_price: number;
  amount: number;
}

export interface Invoice {
  id: string;
  invoice_number: string;
  booking_id: string;
  payment_id: string | null;
  client_id: string;
  company_id: string | null;
  subtotal: number;
  vat_rate: number;
  vat_amount: number;
  platform_fee: number;
  total_amount: number;
  currency: string;
  status: 'pending' | 'paid' | 'overdue' | 'cancelled';
  issued_at: string;
  due_at: string | null;
  paid_at: string | null;
  line_items_json: InvoiceLineItem[];
  notes: string | null;
  pdf_url: string | null;
  created_at: string;
  updated_at: string;
  booking?: {
    scheduled_start: string | null;
    scheduled_end: string | null;
    location_text: string | null;
  };
  company?: {
    company_name: string;
    vat_number: string | null;
    billing_address: string | null;
  };
}

export type InvoiceFilter = 'all' | 'paid' | 'pending' | 'overdue';

interface UseInvoicesReturn {
  invoices: Invoice[];
  isLoading: boolean;
  error: Error | null;
  totalPaid: number;
  totalPending: number;
  refetch: () => Promise<void>;
  getInvoiceById: (id: string) => Invoice | undefined;
  downloadInvoicePdf: (invoiceId: string) => Promise<void>;
}

export const useInvoices = (filter: InvoiceFilter): UseInvoicesReturn => {
  const user = useAuthStore((s) => s.user);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchInvoices = useCallback(async () => {
    if (!user?.id) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      let query = supabase
        .from('invoices')
        .select(
          `
          *,
          booking:bookings(scheduled_start, scheduled_end, location_text),
          company:client_companies(company_name, vat_number, billing_address)
        `
        )
        .eq('client_id', user.id)
        .order('issued_at', { ascending: false });

      const { data, error: fetchError } = await query;

      if (fetchError) throw fetchError;

      let processedInvoices: Invoice[] = (data || []).map((inv: any) => {
        // Override status if pending and due date is past
        let status = inv.status;
        if (
          status === 'pending' &&
          inv.due_at &&
          new Date(inv.due_at) < new Date()
        ) {
          status = 'overdue';
        }

        return {
          ...inv,
          status,
          line_items_json: inv.line_items_json || [],
        };
      });

      // Apply filter
      if (filter === 'paid') {
        processedInvoices = processedInvoices.filter((i) => i.status === 'paid');
      } else if (filter === 'pending') {
        processedInvoices = processedInvoices.filter(
          (i) => i.status === 'pending'
        );
      } else if (filter === 'overdue') {
        processedInvoices = processedInvoices.filter(
          (i) => i.status === 'overdue'
        );
      }

      setInvoices(processedInvoices);
    } catch (err) {
      console.error('Error fetching invoices:', err);
      setError(err instanceof Error ? err : new Error('Failed to fetch invoices'));
    } finally {
      setIsLoading(false);
    }
  }, [user?.id, filter]);

  useEffect(() => {
    fetchInvoices();
  }, [fetchInvoices]);

  const totalPaid = invoices
    .filter((i) => i.status === 'paid')
    .reduce((sum, i) => sum + i.total_amount, 0);

  const totalPending = invoices
    .filter((i) => i.status === 'pending' || i.status === 'overdue')
    .reduce((sum, i) => sum + i.total_amount, 0);

  const getInvoiceById = useCallback(
    (id: string) => invoices.find((i) => i.id === id),
    [invoices]
  );

  const downloadInvoicePdf = useCallback(
    async (invoiceId: string) => {
      try {
        const { data: sessionData } = await supabase.auth.getSession();
        const session = sessionData?.session;

        if (!session) {
          throw new Error('Not authenticated');
        }

        const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || '';

        if (Platform.OS === 'web') {
          const response = await fetch(
            `${supabaseUrl}/functions/v1/generate-invoice-pdf`,
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${session.access_token}`,
              },
              body: JSON.stringify({ invoiceId }),
            }
          );

          if (!response.ok) {
            throw new Error('Failed to generate PDF');
          }

          const blob = await response.blob();
          const url = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = `invoice-${invoiceId}.pdf`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          URL.revokeObjectURL(url);
          return;
        }

        const fileUri = `${FileSystem.cacheDirectory}invoice-${invoiceId}.pdf`;
        const downloadResult = await FileSystem.downloadAsync(
          `${supabaseUrl}/functions/v1/generate-invoice-pdf?invoiceId=${invoiceId}`,
          fileUri,
          {
            headers: {
              Authorization: `Bearer ${session.access_token}`,
            },
          }
        );

        if (downloadResult.status !== 200) {
          throw new Error('Failed to generate PDF');
        }

        const canShare = await Sharing.isAvailableAsync();
        if (canShare) {
          await Sharing.shareAsync(downloadResult.uri, {
            mimeType: 'application/pdf',
            dialogTitle: `Invoice ${invoiceId}`,
            UTI: 'com.adobe.pdf',
          });
        }
      } catch (err) {
        console.error('Error downloading PDF:', err);
        throw err;
      }
    },
    []
  );

  return {
    invoices,
    isLoading,
    error,
    totalPaid: totalPaid / 100,
    totalPending: totalPending / 100,
    refetch: fetchInvoices,
    getInvoiceById,
    downloadInvoicePdf,
  };
};
