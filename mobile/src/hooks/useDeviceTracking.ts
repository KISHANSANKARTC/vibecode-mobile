import { useEffect } from 'react';
import { Platform } from 'react-native';
import * as Application from 'expo-application';
import * as Device from 'expo-device';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/lib/state/auth-store';
import { extractErrorMessage } from '@/lib/errorUtils';

/**
 * useDeviceTracking
 *
 * Registers the current device in the `user_devices` table so server-side
 * notification senders know how to reach this user. Currently stores
 * device metadata only — push token wiring is commented because
 * `expo-notifications` is not in package.json. Uncomment the push-token
 * block after `bun add expo-notifications`.
 *
 * Also calls `check-known-ip` once per app session to surface "Known device
 * detected" UX during auth (the web uses this to skip the welcome screen).
 *
 * Web parity: lovable-web/src/hooks/useDeviceTracking.ts +
 * lovable-web/src/hooks/useCheckKnownIP.ts.
 */
export function useDeviceTracking() {
  const userId = useAuthStore((s) => s.user?.id);

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;

    (async () => {
      try {
        // ---- (optional) Expo push token ----
        // Uncomment after `bun add expo-notifications` and the user grants
        // notification permission.
        //
        // import * as Notifications from 'expo-notifications';
        // const { status } = await Notifications.requestPermissionsAsync();
        // const tokenResp = status === 'granted' ? await Notifications.getExpoPushTokenAsync() : null;
        // const pushToken = tokenResp?.data || null;

        const pushToken: string | null = null;

        const deviceMeta = {
          user_id: userId,
          push_token: pushToken,
          platform: Platform.OS, // 'ios' | 'android' | 'web'
          device_name: Device.deviceName || null,
          device_model: Device.modelName || null,
          os_version: Device.osVersion || null,
          app_version: Application.nativeApplicationVersion || null,
          last_active_at: new Date().toISOString(),
        };

        // Upsert by (user_id, platform). RLS should allow users to upsert
        // their own row only — confirm policy if you hit a 403.
        const { error } = await supabase
          .from('user_devices')
          .upsert(deviceMeta, { onConflict: 'user_id,platform' });

        if (error && !cancelled) {
          console.warn('[useDeviceTracking] upsert failed:', error.message);
        }

        // Fire-and-forget known-IP check. Result powers welcome-screen logic
        // elsewhere; we don't block on it here.
        try {
          await supabase.functions.invoke('check-known-ip', {});
        } catch {
          // ignore
        }
      } catch (err) {
        if (!cancelled) {
          console.warn('[useDeviceTracking] error:', extractErrorMessage(err));
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [userId]);
}
