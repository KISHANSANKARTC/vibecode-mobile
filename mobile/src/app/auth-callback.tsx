import { useEffect, useState } from 'react';
import { View, Text, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '@/lib/theme/ThemeContext';

export default function AuthCallbackScreen() {
  const { isDark } = useTheme();
  const router = useRouter();
  const [showSlowMessage, setShowSlowMessage] = useState(false);

  useEffect(() => {
    const slowTimer = setTimeout(() => setShowSlowMessage(true), 4000);

    const timeout = setTimeout(() => {
      router.replace('/onboarding/auth');
    }, 8000);

    return () => {
      clearTimeout(slowTimer);
      clearTimeout(timeout);
    };
  }, [router]);

  return (
    <View
      style={{
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: isDark ? '#0A0A0A' : '#F8F8F8',
      }}
    >
      <ActivityIndicator size="large" color="#F97316" />
      <Text
        style={{
          marginTop: 16,
          color: isDark ? '#FFFFFF' : '#000000',
          fontSize: 16,
        }}
      >
        Completing sign-in...
      </Text>
      {showSlowMessage ? (
        <Text
          style={{
            marginTop: 12,
            color: isDark ? '#9CA3AF' : '#6B7280',
            fontSize: 13,
            textAlign: 'center',
            paddingHorizontal: 32,
          }}
        >
          This is taking longer than expected. You'll be redirected shortly.
        </Text>
      ) : null}
    </View>
  );
}
