import { useEffect } from 'react';
import { View, Text, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/lib/state/auth-store';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function LogoutScreen() {
  const signOut = useAuthStore((s) => s.signOut);

  useEffect(() => {
    const performLogout = async () => {
      try {
        console.log('[LOGOUT] Starting logout process...');

        // Use auth store's signOut which handles everything
        await signOut();
        console.log('[LOGOUT] Auth store signOut completed');

        // Also try to clear any Supabase session data directly
        try {
          await AsyncStorage.removeItem('SUPABASE_AUTH');
          console.log('[LOGOUT] Cleared Supabase session data');
        } catch (e) {
          console.log('[LOGOUT] Could not clear SUPABASE_AUTH');
        }

        // Clear any other stored data
        try {
          await AsyncStorage.removeItem('engage_user_email');
          console.log('[LOGOUT] Cleared email data');
        } catch (e) {
          console.log('[LOGOUT] Could not clear email data');
        }
      } catch (err) {
        console.error('[LOGOUT] Exception during logout:', err);
      } finally {
        // Always navigate back to splash after attempting logout
        console.log('[LOGOUT] Navigating to splash screen');
        // Use a small delay to ensure state is cleared
        setTimeout(() => {
          router.replace('/');
        }, 500);
      }
    };

    performLogout();
  }, [signOut]);

  return (
    <View className="flex-1 bg-[#0A0A0A] items-center justify-center">
      <ActivityIndicator size="large" color="#FA5610" />
      <Text className="text-white mt-4">Signing out...</Text>
    </View>
  );
}
