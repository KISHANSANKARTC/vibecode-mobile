import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { extractErrorMessage } from '@/lib/errorUtils';

let cachedToken: { value: string; fetchedAt: number } | null = null;
const TTL_MS = 60 * 60 * 1000; // 1 hour — Mapbox tokens are long-lived

/**
 * useMapboxToken
 *
 * Fetches a short-lived Mapbox token via the `get-mapbox-token` edge function.
 * The token is cached in-module for an hour to avoid hitting the function
 * on every map render.
 *
 * Web parity: lovable-web uses this to keep the token off the client bundle.
 *
 * NOTE: requires `@rnmapbox/maps` to render an actual map view. That install
 * triggers a native rebuild — separate decision, not included here.
 */
export function useMapboxToken() {
  const [token, setToken] = useState<string | null>(cachedToken?.value || null);
  const [isLoading, setIsLoading] = useState(!cachedToken);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (cachedToken && Date.now() - cachedToken.fetchedAt < TTL_MS) {
      setToken(cachedToken.value);
      setIsLoading(false);
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        setIsLoading(true);
        const { data, error: invokeErr } = await supabase.functions.invoke('get-mapbox-token', {});
        if (invokeErr) throw new Error(invokeErr.message);
        const fetched: string = (data as any)?.token || '';
        if (!fetched) throw new Error('No token returned');
        cachedToken = { value: fetched, fetchedAt: Date.now() };
        if (!cancelled) setToken(fetched);
      } catch (err) {
        if (!cancelled) setError(extractErrorMessage(err));
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  return { token, isLoading, error };
}

/**
 * reverseGeocode — convert lat/lng to a human-readable location string.
 * Mirrors the web's reverse-geocode edge function.
 */
export async function reverseGeocode(lat: number, lng: number): Promise<string | null> {
  try {
    const { data, error } = await supabase.functions.invoke('reverse-geocode', {
      body: { lat, lng },
    });
    if (error) throw new Error(error.message);
    return (data as any)?.location_text || null;
  } catch {
    return null;
  }
}
