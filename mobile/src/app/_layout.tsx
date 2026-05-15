import React, { useEffect, useState, useRef } from 'react';
import { View, Text } from 'react-native';
import { Stack, router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { InteractionManager } from 'react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useAuthStore } from '@/lib/state/auth-store';
import { ThemeProvider as AppThemeProvider, useTheme } from '@/lib/theme/ThemeContext';

// Safely import KeyboardProvider - it may crash on some builds
let KeyboardProviderComponent: React.ComponentType<{ children: React.ReactNode }> | null = null;
try {
  const kbModule = require('react-native-keyboard-controller');
  KeyboardProviderComponent = kbModule.KeyboardProvider;
} catch (e) {
  console.warn('KeyboardProvider not available:', e);
}

// Safely handle splash screen
let SplashScreen: any = null;
try {
  SplashScreen = require('expo-splash-screen');
  SplashScreen.preventAutoHideAsync();
} catch (e) {
  console.warn('SplashScreen not available:', e);
}

// Import error handler safely
try {
  require('@/lib/errorHandler');
} catch (e) {
  console.warn('Error handler not available:', e);
}

// Create query client once
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 1000 * 60 * 5,
    },
  },
});

function AuthStateHandler() {
  const initialize = useAuthStore((s) => s.initialize);
  const isLoading = useAuthStore((s) => s.isLoading);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const userRole = useAuthStore((s) => s.userRole);
  const isOnboardingComplete = useAuthStore((s) => s.isOnboardingComplete);
  const [hasInitialized, setHasInitialized] = useState(false);
  const initializationRef = useRef(false);

  useEffect(() => {
    if (initializationRef.current) return;
    initializationRef.current = true;

    const interactionTask = InteractionManager.runAfterInteractions(async () => {
      try {
        await initialize();
      } catch (err) {
        console.log('Auth init error:', err);
      } finally {
        setHasInitialized(true);
        try {
          SplashScreen?.hideAsync();
        } catch {
          // ignore
        }
      }
    });

    return () => interactionTask.cancel();
  }, [initialize]);

  useEffect(() => {
    if (!hasInitialized || isLoading) return;

    if (isAuthenticated && userRole) {
      if (userRole === 'talent' && !isOnboardingComplete) {
        router.replace('/onboarding/talent-setup');
        return;
      }

      if (userRole === 'client') {
        router.replace('/(client)');
      } else if (userRole === 'talent') {
        router.replace('/(talent)');
      }
    }
  }, [hasInitialized, isLoading, isAuthenticated, userRole, isOnboardingComplete]);

  return null;
}

function KeyboardWrapper({ children }: { children: React.ReactNode }) {
  if (KeyboardProviderComponent) {
    return <KeyboardProviderComponent>{children}</KeyboardProviderComponent>;
  }
  return <>{children}</>;
}

function RootLayoutContent() {
  const { theme } = useTheme();

  return (
    <QueryClientProvider client={queryClient}>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <KeyboardWrapper>
          <AuthStateHandler />
          <StatusBar style={theme === 'dark' ? 'light' : 'dark'} />
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="index" />
            <Stack.Screen name="onboarding" />
            <Stack.Screen name="(talent)" />
            <Stack.Screen name="(client)" />
            <Stack.Screen name="(tabs)" />
          </Stack>
        </KeyboardWrapper>
      </GestureHandlerRootView>
    </QueryClientProvider>
  );
}

class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error: string }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: '' };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error: error?.message || 'Unknown error' };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('App crash:', error?.message, errorInfo?.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0A0A0A', padding: 20 }}>
          <Text style={{ color: '#FF6B6B', fontSize: 18, fontWeight: 'bold', marginBottom: 10 }}>
            Something went wrong
          </Text>
          <Text style={{ color: '#888', fontSize: 14, textAlign: 'center' }}>
            {this.state.error}
          </Text>
        </View>
      );
    }
    return this.props.children;
  }
}

export default function RootLayout() {
  return (
    <ErrorBoundary>
      <AppThemeProvider>
        <RootLayoutContent />
      </AppThemeProvider>
    </ErrorBoundary>
  );
}
