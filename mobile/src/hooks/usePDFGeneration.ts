import { useCallback, useState } from 'react';
import * as WebBrowser from 'expo-web-browser';
import { supabase } from '@/lib/supabase';
import { extractErrorMessage } from '@/lib/errorUtils';

/**
 * usePDFGeneration
 *
 * Wraps the three PDF-generating edge functions used on the web:
 *   - generate-contract    → booking contract PDF
 *   - generate-callsheet-pdf → call sheet for production day
 *   - generate-invoice-pdf  → invoice PDF for client
 *
 * Each returns a `pdf_url` stored in Supabase Storage. We expose two
 * helpers per type: `generate*` (call function, return URL) and
 * `openPDF` (open the URL in an in-app browser for download/print).
 */
export function usePDFGeneration() {
  const [isGenerating, setIsGenerating] = useState(false);

  const generateContract = useCallback(async (bookingId: string) => {
    setIsGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-contract', {
        body: { booking_id: bookingId },
      });
      if (error) throw new Error(error.message);
      return { ok: true, url: (data as any)?.pdf_url as string };
    } catch (err) {
      return { ok: false, error: extractErrorMessage(err) };
    } finally {
      setIsGenerating(false);
    }
  }, []);

  const generateCallsheet = useCallback(async (bookingId: string) => {
    setIsGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-callsheet-pdf', {
        body: { booking_id: bookingId },
      });
      if (error) throw new Error(error.message);
      return { ok: true, url: (data as any)?.pdf_url as string };
    } catch (err) {
      return { ok: false, error: extractErrorMessage(err) };
    } finally {
      setIsGenerating(false);
    }
  }, []);

  const generateInvoice = useCallback(async (invoiceId: string) => {
    setIsGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-invoice-pdf', {
        body: { invoice_id: invoiceId },
      });
      if (error) throw new Error(error.message);
      return { ok: true, url: (data as any)?.pdf_url as string };
    } catch (err) {
      return { ok: false, error: extractErrorMessage(err) };
    } finally {
      setIsGenerating(false);
    }
  }, []);

  const openPDF = useCallback(async (url: string) => {
    await WebBrowser.openBrowserAsync(url);
  }, []);

  return { isGenerating, generateContract, generateCallsheet, generateInvoice, openPDF };
}
