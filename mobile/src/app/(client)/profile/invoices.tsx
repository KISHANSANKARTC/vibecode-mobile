import {
  View,
  Text,
  ScrollView,
  Pressable,
  ActivityIndicator,
  Modal,
  FlatList,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from '@/lib/router-helper';
import {
  ChevronLeft,
  FileText,
  Eye,
  Calendar,
  DollarSign,
  Download,
  Loader2,
  MapPin,
  X,
  ArrowLeft,
} from 'lucide-react-native';
import { useState, useCallback, useRef, useEffect } from 'react';
import { useInvoices, Invoice, InvoiceFilter } from '@/hooks/useInvoices';
import { supabase } from '@/lib/supabase';
import { extractErrorMessage } from '@/lib/errorUtils';

export default function ClientInvoices() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [filter, setFilter] = useState<InvoiceFilter>('all');
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [viewInvoiceId, setViewInvoiceId] = useState<string | null>(null);

  const { invoices, isLoading, totalPaid, totalPending, downloadInvoicePdf } =
    useInvoices(filter);

  const handleOpenDetail = (invoice: Invoice) => {
    setSelectedInvoice(invoice);
    setSheetOpen(true);
  };

  const handleOpenView = (invoice: Invoice) => {
    setViewInvoiceId(invoice.id);
    setViewDialogOpen(true);
  };

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
        <Text className="text-gray-900 text-xl font-semibold">Invoices</Text>
      </View>

      <ScrollView
        className="flex-1 px-5 py-6"
        contentContainerStyle={{ paddingBottom: 100 }}
      >
        {/* Summary Cards */}
        <View className="flex-row gap-3 mb-6">
          {/* Total Paid */}
          <View className="flex-1 bg-white rounded-2xl p-4 border border-gray-200">
            <View className="flex-row items-center mb-2">
              <DollarSign size={18} color="#16A34A" strokeWidth={2} />
              <Text className="text-gray-600 text-xs font-medium ml-1">
                Total Paid
              </Text>
            </View>
            {isLoading ? (
              <View className="h-8 bg-gray-200 rounded" />
            ) : (
              <Text className="text-gray-900 text-xl font-bold">
                AED{' '}
                {totalPaid.toLocaleString('en-US', {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </Text>
            )}
          </View>

          {/* Total Pending */}
          <View className="flex-1 bg-white rounded-2xl p-4 border border-gray-200">
            <View className="flex-row items-center mb-2">
              <DollarSign size={18} color="#FBBF24" strokeWidth={2} />
              <Text className="text-gray-600 text-xs font-medium ml-1">
                Pending
              </Text>
            </View>
            {isLoading ? (
              <View className="h-8 bg-gray-200 rounded" />
            ) : (
              <Text className="text-gray-900 text-xl font-bold">
                AED{' '}
                {totalPending.toLocaleString('en-US', {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </Text>
            )}
          </View>
        </View>

        {/* Filter Tabs */}
        <View className="flex-row gap-2 mb-6">
          {(['all', 'paid', 'pending', 'overdue'] as InvoiceFilter[]).map(
            (tab) => (
              <Pressable
                key={tab}
                onPress={() => setFilter(tab)}
                className={`flex-1 py-2 px-3 rounded-lg border ${
                  filter === tab
                    ? 'bg-orange-500 border-orange-500'
                    : 'border-gray-200 bg-white'
                }`}
              >
                <Text
                  className={`text-xs font-semibold text-center capitalize ${
                    filter === tab ? 'text-white' : 'text-gray-900'
                  }`}
                >
                  {tab}
                </Text>
              </Pressable>
            )
          )}
        </View>

        {/* Loading State */}
        {isLoading ? (
          <View>
            {[1, 2, 3].map((i) => (
              <View
                key={`skeleton-${i}`}
                className="bg-white rounded-2xl p-4 border border-gray-200 mb-3"
              >
                <View className="h-5 bg-gray-200 rounded w-3/4 mb-2" />
                <View className="h-4 bg-gray-100 rounded w-1/2 mb-3" />
                <View className="flex-row gap-2">
                  <View className="flex-1 h-10 bg-gray-100 rounded" />
                  <View className="flex-1 h-10 bg-gray-100 rounded" />
                </View>
              </View>
            ))}
          </View>
        ) : invoices.length === 0 ? (
          // Empty State
          <View className="bg-white rounded-2xl p-8 border border-gray-200 items-center">
            <FileText size={40} color="#9CA3AF" strokeWidth={1.5} />
            <Text className="text-gray-900 font-semibold mt-3">
              No invoices yet
            </Text>
            <Text className="text-gray-600 text-xs text-center mt-1">
              Invoices will appear here after bookings are paid
            </Text>
          </View>
        ) : (
          // Invoice List
          <View className="space-y-3">
            {invoices.map((invoice) => {
              const badgeColor = getBadgeColor(invoice.status);

              return (
                <View
                  key={invoice.id}
                  className="bg-white rounded-2xl border border-gray-200 overflow-hidden"
                >
                  {/* Row 1: Invoice Number + Badge + Amount */}
                  <View className="flex-row items-center justify-between px-4 py-3 border-b border-gray-100">
                    <View className="flex-row items-center gap-2">
                      <Text className="text-gray-900 font-bold text-sm">
                        {invoice.invoice_number}
                      </Text>
                      <View
                        className="px-2 py-1 rounded-full"
                        style={{ backgroundColor: badgeColor.bg }}
                      >
                        <Text
                          className="text-xs font-semibold capitalize"
                          style={{ color: badgeColor.text }}
                        >
                          {invoice.status}
                        </Text>
                      </View>
                    </View>
                    <Text className="text-gray-900 font-semibold text-sm">
                      {invoice.currency}{' '}
                      {(invoice.total_amount / 100).toLocaleString('en-US', {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </Text>
                  </View>

                  {/* Row 2: Company Name */}
                  <View className="px-4 py-2 border-b border-gray-100">
                    <Text className="text-gray-600 text-xs">
                      {invoice.company?.company_name || 'Booking payment'}
                    </Text>
                  </View>

                  {/* Row 3: Dates */}
                  <View className="px-4 py-3 flex-row items-center gap-4 border-b border-gray-100">
                    <View className="flex-row items-center gap-1">
                      <Calendar size={12} color="#9CA3AF" strokeWidth={2} />
                      <Text className="text-gray-600 text-xs">
                        Issued:{' '}
                        {new Date(invoice.issued_at).toLocaleDateString(
                          'en-US',
                          {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                          }
                        )}
                      </Text>
                    </View>
                    {invoice.due_at ? (
                      <View className="flex-row items-center gap-1">
                        <Calendar size={12} color="#9CA3AF" strokeWidth={2} />
                        <Text className="text-gray-600 text-xs">
                          Due:{' '}
                          {new Date(invoice.due_at).toLocaleDateString(
                            'en-US',
                            {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric',
                            }
                          )}
                        </Text>
                      </View>
                    ) : null}
                  </View>

                  {/* Row 4: Buttons */}
                  <View className="flex-row gap-2 p-3">
                    <Pressable
                      onPress={() => handleOpenDetail(invoice)}
                      className="flex-1 border border-gray-300 rounded-lg py-2 flex-row items-center justify-center gap-1"
                    >
                      <Eye size={16} color="#1F2937" strokeWidth={2} />
                      <Text className="text-gray-900 text-sm font-medium">
                        Details
                      </Text>
                    </Pressable>
                    <Pressable
                      onPress={() => handleOpenView(invoice)}
                      className="flex-1 border border-gray-300 rounded-lg py-2 flex-row items-center justify-center gap-1"
                    >
                      <FileText size={16} color="#1F2937" strokeWidth={2} />
                      <Text className="text-gray-900 text-sm font-medium">
                        View
                      </Text>
                    </Pressable>
                  </View>
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>

      {/* Detail Sheet Modal */}
      {selectedInvoice ? (
        <InvoiceDetailSheet
          invoice={selectedInvoice}
          open={sheetOpen}
          onOpenChange={setSheetOpen}
          onDownload={downloadInvoicePdf}
        />
      ) : null}

      {/* View Invoice Modal */}
      <InvoiceViewDialog
        open={viewDialogOpen}
        onOpenChange={setViewDialogOpen}
        invoiceId={viewInvoiceId}
        invoiceNumber={invoices.find((i) => i.id === viewInvoiceId)?.invoice_number}
      />
    </View>
  );
}

// Helper function for badge colors
function getBadgeColor(
  status: 'paid' | 'pending' | 'overdue' | 'cancelled'
): { bg: string; text: string } {
  switch (status) {
    case 'paid':
      return { bg: '#DCFCE7', text: '#16A34A' };
    case 'pending':
      return { bg: '#FEF3C7', text: '#FBBF24' };
    case 'overdue':
      return { bg: '#FEE2E2', text: '#EF4444' };
    case 'cancelled':
      return { bg: '#F3F4F6', text: '#9CA3AF' };
  }
}

// COMPONENT 2: InvoiceDetailSheet
interface InvoiceDetailSheetProps {
  invoice: Invoice | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDownload: (invoiceId: string) => Promise<void>;
}

function InvoiceDetailSheet({
  invoice,
  open,
  onOpenChange,
  onDownload,
}: InvoiceDetailSheetProps) {
  const insets = useSafeAreaInsets();
  const [isDownloading, setIsDownloading] = useState(false);

  if (!invoice) return null;

  const badgeColor = getBadgeColor(invoice.status);

  const handleDownload = async () => {
    setIsDownloading(true);
    try {
      await onDownload(invoice.id);
    } catch (err) {
      const errorMsg = extractErrorMessage(err);
      console.error('Download failed:', errorMsg);
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <Modal visible={open} transparent animationType="slide">
      <View className="flex-1 bg-black/50 justify-end">
        <View
          className="bg-white rounded-t-3xl max-h-[90%]"
          style={{ paddingBottom: insets.bottom + 16 }}
        >
          {/* Header */}
          <View className="flex-row items-center justify-between px-6 py-4 border-b border-gray-200">
            <View className="flex-row items-center gap-2">
              <Text className="text-gray-900 text-lg font-bold">
                {invoice.invoice_number}
              </Text>
              <View
                className="px-2 py-1 rounded-full"
                style={{ backgroundColor: badgeColor.bg }}
              >
                <Text
                  className="text-xs font-semibold capitalize"
                  style={{ color: badgeColor.text }}
                >
                  {invoice.status}
                </Text>
              </View>
            </View>
            <Pressable onPress={() => onOpenChange(false)}>
              <X size={24} color="#6B7280" strokeWidth={2} />
            </Pressable>
          </View>

          <ScrollView className="flex-1 px-6 py-4">
            {/* Dates Grid */}
            <View className="flex-row gap-4 mb-4">
              <View className="flex-1">
                <Text className="text-gray-600 text-xs font-medium mb-1">
                  Issued Date
                </Text>
                <Text className="text-gray-900 font-semibold text-sm">
                  {new Date(invoice.issued_at).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  })}
                </Text>
              </View>
              {invoice.due_at ? (
                <View className="flex-1">
                  <Text className="text-gray-600 text-xs font-medium mb-1">
                    Due Date
                  </Text>
                  <Text className="text-gray-900 font-semibold text-sm">
                    {new Date(invoice.due_at).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </Text>
                </View>
              ) : null}
              {invoice.paid_at ? (
                <View className="flex-1">
                  <Text className="text-gray-600 text-xs font-medium mb-1">
                    Paid Date
                  </Text>
                  <Text className="text-green-600 font-semibold text-sm">
                    {new Date(invoice.paid_at).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </Text>
                </View>
              ) : null}
            </View>

            <View className="border-b border-gray-200 my-4" />

            {/* Billed To */}
            {invoice.company ? (
              <>
                <View className="bg-gray-50 rounded-lg p-3 mb-4">
                  <Text className="text-gray-900 font-bold text-sm">
                    {invoice.company.company_name}
                  </Text>
                  {invoice.company.vat_number ? (
                    <Text className="text-gray-600 text-xs mt-1">
                      VAT: {invoice.company.vat_number}
                    </Text>
                  ) : null}
                  {invoice.company.billing_address ? (
                    <Text className="text-gray-600 text-xs mt-1">
                      {invoice.company.billing_address}
                    </Text>
                  ) : null}
                </View>
              </>
            ) : null}

            {/* Booking Details */}
            {invoice.booking ? (
              <>
                <View className="bg-gray-50 rounded-lg p-3 mb-4">
                  {invoice.booking.scheduled_start ? (
                    <View className="flex-row items-start gap-2 mb-2">
                      <Calendar size={14} color="#9CA3AF" strokeWidth={2} />
                      <Text className="text-gray-700 text-xs flex-1">
                        {new Date(
                          invoice.booking.scheduled_start
                        ).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}{' '}
                        -{' '}
                        {new Date(
                          invoice.booking.scheduled_start
                        ).toLocaleTimeString('en-US', {
                          hour: 'numeric',
                          minute: '2-digit',
                          hour12: true,
                        })}
                      </Text>
                    </View>
                  ) : null}
                  {invoice.booking.location_text ? (
                    <View className="flex-row items-start gap-2">
                      <MapPin size={14} color="#9CA3AF" strokeWidth={2} />
                      <Text className="text-gray-700 text-xs flex-1">
                        {invoice.booking.location_text}
                      </Text>
                    </View>
                  ) : null}
                </View>
              </>
            ) : null}

            <View className="border-b border-gray-200 my-4" />

            {/* Line Items */}
            {invoice.line_items_json &&
            invoice.line_items_json.length > 0 ? (
              <>
                {invoice.line_items_json.map((item, idx) => (
                  <View key={`item-${idx}`} className="flex-row justify-between mb-3">
                    <View className="flex-1">
                      <Text className="text-gray-900 font-bold text-sm">
                        {item.description}
                      </Text>
                      <Text className="text-gray-600 text-xs">
                        Qty: {item.quantity}
                      </Text>
                    </View>
                    <Text className="text-gray-900 font-semibold text-sm">
                      AED{' '}
                      {(item.amount / 100).toLocaleString('en-US', {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </Text>
                  </View>
                ))}
                <View className="border-b border-gray-200 my-4" />
              </>
            ) : null}

            {/* Totals */}
            <View className="space-y-2 mb-4">
              <View className="flex-row justify-between">
                <Text className="text-gray-600 text-sm">Subtotal</Text>
                <Text className="text-gray-900 text-sm">
                  AED{' '}
                  {(invoice.subtotal / 100).toLocaleString('en-US', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </Text>
              </View>

              <View className="flex-row justify-between">
                <Text className="text-gray-600 text-sm">
                  VAT ({invoice.vat_rate}%)
                </Text>
                <Text className="text-gray-900 text-sm">
                  AED{' '}
                  {(invoice.vat_amount / 100).toLocaleString('en-US', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </Text>
              </View>

              {invoice.platform_fee > 0 ? (
                <View className="flex-row justify-between">
                  <Text className="text-gray-600 text-sm">Platform Fee</Text>
                  <Text className="text-gray-900 text-sm">
                    AED{' '}
                    {(invoice.platform_fee / 100).toLocaleString('en-US', {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </Text>
                </View>
              ) : null}

              <View className="border-b border-gray-200 my-2" />

              <View className="flex-row justify-between">
                <Text className="text-gray-900 font-bold text-base">Total</Text>
                <Text className="text-gray-900 font-bold text-base">
                  AED{' '}
                  {(invoice.total_amount / 100).toLocaleString('en-US', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </Text>
              </View>
            </View>

            {/* Notes */}
            {invoice.notes ? (
              <>
                <View className="border-b border-gray-200 my-4" />
                <View>
                  <Text className="text-gray-900 font-semibold text-sm mb-2">
                    Notes
                  </Text>
                  <Text className="text-gray-700 text-xs">{invoice.notes}</Text>
                </View>
              </>
            ) : null}
          </ScrollView>

          {/* Download Button */}
          <Pressable
            onPress={handleDownload}
            disabled={isDownloading}
            className="mx-6 mb-4 bg-orange-500 rounded-lg py-3 flex-row items-center justify-center gap-2"
            style={{ opacity: isDownloading ? 0.6 : 1 }}
          >
            {isDownloading ? (
              <>
                <ActivityIndicator color="#FFFFFF" size="small" />
                <Text className="text-white font-semibold">
                  Generating PDF...
                </Text>
              </>
            ) : (
              <>
                <Download size={18} color="#FFFFFF" strokeWidth={2} />
                <Text className="text-white font-semibold">
                  Download Invoice PDF
                </Text>
              </>
            )}
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

// COMPONENT 3: InvoiceViewDialog
interface InvoiceViewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  invoiceId: string | null;
  invoiceNumber?: string;
}

function InvoiceViewDialog({
  open,
  onOpenChange,
  invoiceId,
  invoiceNumber,
}: InvoiceViewDialogProps) {
  const insets = useSafeAreaInsets();
  const [htmlContent, setHtmlContent] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open && invoiceId) {
      loadInvoiceHtml();
    } else {
      setHtmlContent('');
      setError(null);
    }
  }, [open, invoiceId]);

  const loadInvoiceHtml = async () => {
    if (!invoiceId) return;

    setIsLoading(true);
    setError(null);

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const session = sessionData?.session;

      if (!session) {
        throw new Error('Not authenticated');
      }

      const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || '';

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
        throw new Error('Failed to load invoice');
      }

      const html = await response.text();
      setHtmlContent(html);
    } catch (err) {
      console.error('Error loading invoice:', err);
      setError(err instanceof Error ? err.message : 'Failed to load invoice');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownloadPrint = () => {
    if (!htmlContent) return;

    try {
      const printWindow = window.open('', '_blank');
      if (!printWindow) {
        console.error('Popup blocked');
        return;
      }

      printWindow.document.open();
      printWindow.document.write(htmlContent);
      printWindow.document.close();

      setTimeout(() => {
        printWindow.print();
      }, 250);
    } catch (err) {
      console.error('Error opening print dialog:', err);
    }
  };

  return (
    <Modal visible={open} transparent animationType="fade">
      <View className="flex-1 bg-white" style={{ paddingTop: insets.top }}>
        {/* Header */}
        <View className="flex-row items-center justify-between px-5 py-4 border-b border-gray-200 bg-white">
          <Text className="text-gray-900 text-lg font-bold">
            Invoice #{invoiceNumber}
          </Text>
          <View className="flex-row items-center gap-2">
            <Pressable
              onPress={handleDownloadPrint}
              disabled={!htmlContent || isLoading}
              className="border border-gray-300 rounded-lg px-3 py-2"
              style={{ opacity: !htmlContent || isLoading ? 0.5 : 1 }}
            >
              <Download size={18} color="#1F2937" strokeWidth={2} />
            </Pressable>
            <Pressable onPress={() => onOpenChange(false)}>
              <X size={24} color="#6B7280" strokeWidth={2} />
            </Pressable>
          </View>
        </View>

        {/* Content */}
        <View className="flex-1 bg-gray-50">
          {isLoading ? (
            <View className="flex-1 items-center justify-center">
              <ActivityIndicator size="large" color="#F97316" />
              <Text className="text-gray-600 text-sm mt-3">
                Loading invoice...
              </Text>
            </View>
          ) : error ? (
            <View className="flex-1 items-center justify-center">
              <FileText size={40} color="#9CA3AF" strokeWidth={1.5} />
              <Text className="text-gray-900 font-semibold mt-3">
                No invoice content
              </Text>
            </View>
          ) : htmlContent ? (
            <ScrollView className="flex-1 bg-white">
              <View className="p-4">
                <Text className="text-gray-700 text-sm">{htmlContent}</Text>
              </View>
            </ScrollView>
          ) : null}
        </View>
      </View>
    </Modal>
  );
}

