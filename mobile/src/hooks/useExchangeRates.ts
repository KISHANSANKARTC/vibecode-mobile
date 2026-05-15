import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

export type ExchangeRates = Record<string, number>; // base AED → currency
// Example: { USD: 0.272, GBP: 0.215, EUR: 0.249 }

let cache: { rates: ExchangeRates; fetchedAt: number } | null = null;
const TTL_MS = 60 * 60 * 1000; // 1 hour

/**
 * useExchangeRates
 *
 * Returns current FX rates with AED as the base currency (matches the
 * `exchange_rates` table). Rates are cached in-module for 1 hour to avoid
 * spamming the edge function. The web has the same hook.
 *
 * Usage:
 *   const { rates, convert } = useExchangeRates();
 *   const usdPrice = convert(amountInAED, 'USD');
 */
export function useExchangeRates() {
  const [rates, setRates] = useState<ExchangeRates>(cache?.rates || {});
  const [isLoading, setIsLoading] = useState(!cache);

  const fetchRates = useCallback(async () => {
    // Prefer DB read first (fast, no function cold-start), then refresh via
    // the edge function if the row is stale.
    try {
      const { data: dbRates } = await supabase
        .from('exchange_rates')
        .select('currency, rate, updated_at');

      if (dbRates && dbRates.length) {
        const map: ExchangeRates = {};
        dbRates.forEach((r: any) => {
          if (r?.currency && typeof r.rate === 'number') map[r.currency] = r.rate;
        });
        cache = { rates: map, fetchedAt: Date.now() };
        setRates(map);
      }
    } catch {
      // ignore — fall through to edge function
    }

    if (cache && Date.now() - cache.fetchedAt < TTL_MS && Object.keys(cache.rates).length) {
      setIsLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase.functions.invoke('fetch-exchange-rates', {});
      if (!error && (data as any)?.rates) {
        const next: ExchangeRates = (data as any).rates;
        cache = { rates: next, fetchedAt: Date.now() };
        setRates(next);
      }
    } catch {
      // keep whatever we got from DB
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!cache || Date.now() - cache.fetchedAt > TTL_MS) {
      fetchRates();
    } else {
      setIsLoading(false);
    }
  }, [fetchRates]);

  const convert = useCallback(
    (amount: number, fromCurrency: string, toCurrency: string = 'AED') => {
      if (fromCurrency === toCurrency) return amount;

      // All stored rates are AED-based. amount_in_target = amount_in_aed * rate[target].
      const aedAmount = fromCurrency === 'AED' ? amount : amount / (rates[fromCurrency] || 1);
      return toCurrency === 'AED' ? aedAmount : aedAmount * (rates[toCurrency] || 1);
    },
    [rates]
  );

  return { rates, isLoading, convert, refetch: fetchRates };
}
