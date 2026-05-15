import { useEffect, useRef } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { useAuthStore } from '@/lib/state/auth-store';
import { supabase } from '@/lib/supabase';
import { useTheme } from '@/lib/theme/ThemeContext';
import type { UserRole } from '@/lib/state/auth-store';
import { extractErrorMessage } from '@/lib/errorUtils';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole: UserRole;
}

export function ProtectedRoute({ children, requiredRole }: ProtectedRouteProps) {
  const { isDark } = useTheme();
  const user = useAuthStore((s) => s.user);
  const userRole = useAuthStore((s) => s.userRole);
  const isLoading = useAuthStore((s) => s.isLoading);
  const setUserRole = useAuthStore((s) => s.setUserRole);

  // Prevent redundant role checks
  const hasCheckedRoleRef = useRef(false);

  useEffect(() => {
    let isMounted = true;

    const checkAndEnforceRole = async () => {
      if (!user) return;

      if (userRole && userRole === requiredRole) return;

      if (hasCheckedRoleRef.current) return;
      hasCheckedRoleRef.current = true;

      try {
        const { data: roleData, error } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .single();

        if (!isMounted) return;

        if (error) {
          const msg = extractErrorMessage(error);
          if (msg.includes('AbortError') || msg.includes('aborted')) return;
          console.error('Error fetching user role:', msg);
          router.replace('/');
          return;
        }

        const actualRole = roleData?.role as UserRole | null;

        if (!actualRole) {
          router.replace('/onboarding/welcome');
          return;
        }

        await setUserRole(actualRole);

        if (actualRole !== requiredRole) {
          router.replace(`/(${actualRole})`);
        }
      } catch (err) {
        if (!isMounted) return;
        const msg = extractErrorMessage(err);
        if (msg.includes('AbortError') || msg.includes('aborted')) return;
        console.error('Error in ProtectedRoute:', msg);
        router.replace('/');
      }
    };

    checkAndEnforceRole();
    return () => { isMounted = false; };
  }, [user, userRole, requiredRole, setUserRole]);

  // Show loading while checking auth and role
  if (isLoading || !user) {
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
      </View>
    );
  }

  // If role doesn't match, show loading while redirecting
  if (userRole !== requiredRole) {
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
      </View>
    );
  }

  return <>{children}</>;
}
