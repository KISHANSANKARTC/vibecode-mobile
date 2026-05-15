import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { User, Session, AuthError } from '@supabase/supabase-js';
import { supabase } from '../supabase';
import { extractErrorMessage } from '../errorUtils';

export type UserRole = 'client' | 'talent';

interface AuthState {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  userRole: UserRole | null;
  isOnboardingComplete: boolean;
  error: string | null;
}

interface AuthActions {
  signUp: (email: string, password: string, fullName?: string) => Promise<{ success: boolean; error?: string }>;
  signIn: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  signInWithGoogle: (redirectUrl: string) => Promise<{ error?: Error | null }>;
  signInWithApple: (redirectUrl: string) => Promise<{ error?: Error | null }>;
  signOut: () => Promise<void>;
  setUserRole: (role: UserRole) => Promise<void>;
  initialize: () => Promise<void>;
  clearError: () => void;
}

type AuthStore = AuthState & AuthActions;

const USER_ROLE_KEY = 'engage_user_role';

// Helper to format auth errors for users
const formatAuthError = (error: AuthError): string => {
  const errorMessage = error.message.toLowerCase();

  if (errorMessage.includes('invalid login credentials')) {
    return 'Invalid email or password. Please try again.';
  }
  if (errorMessage.includes('email not confirmed')) {
    return 'Please check your email and confirm your account.';
  }
  if (errorMessage.includes('user already registered') || errorMessage.includes('already registered')) {
    return 'An account with this email already exists. Try signing in instead.';
  }
  if (errorMessage.includes('invalid email')) {
    return 'Please enter a valid email address.';
  }
  if (errorMessage.includes('password') && errorMessage.includes('short')) {
    return 'Password must be at least 6 characters long.';
  }
  if (errorMessage.includes('weak password')) {
    return 'Please choose a stronger password (at least 6 characters).';
  }
  if (errorMessage.includes('network') || errorMessage.includes('fetch')) {
    return 'Network error. Please check your connection and try again.';
  }
  if (errorMessage.includes('rate limit')) {
    return 'Too many attempts. Please wait a moment and try again.';
  }

  return error.message;
};

export const useAuthStore = create<AuthStore>((set, get) => ({
  user: null,
  session: null,
  isLoading: true,
  isAuthenticated: false,
  userRole: null,
  isOnboardingComplete: false,
  error: null,

  signUp: async (email: string, password: string, fullName?: string) => {
    set({ isLoading: true, error: null });

    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
            role: get().userRole,
          },
        },
      });

      if (error) {
        const formattedError = formatAuthError(error);
        set({ isLoading: false, error: formattedError });
        return { success: false, error: formattedError };
      }

      if (data.user) {
        set({
          user: data.user,
          session: data.session,
          isAuthenticated: !!data.session,
          isLoading: false,
        });
        return { success: true };
      }

      set({ isLoading: false });
      return { success: true }; // Email confirmation may be required
    } catch (err) {
      const errorMessage = 'An unexpected error occurred. Please try again.';
      set({ isLoading: false, error: errorMessage });
      return { success: false, error: errorMessage };
    }
  },

  signIn: async (email: string, password: string) => {
    set({ isLoading: true, error: null });

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        const formattedError = formatAuthError(error);
        set({ isLoading: false, error: formattedError });
        return { success: false, error: formattedError };
      }

      if (data.user && data.session) {
        // Fetch actual role from database (source of truth)
        const { data: roleData } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', data.user.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .single();

        const userRole = (roleData?.role as UserRole) ?? null;

        // Check onboarding completion for talents
        let isOnboardingComplete = true; // Default to true for non-talents
        if (userRole === 'talent') {
          const { data: profileData } = await supabase
            .from('talent_profiles')
            .select('onboarding_completed')
            .eq('user_id', data.user.id)
            .single();

          isOnboardingComplete = profileData?.onboarding_completed === true;
        }

        // Store role in AsyncStorage for persistence
        if (userRole) {
          await AsyncStorage.setItem(USER_ROLE_KEY, userRole);
        }

        set({
          user: data.user,
          session: data.session,
          isAuthenticated: true,
          isLoading: false,
          userRole,
          isOnboardingComplete,
        });
        return { success: true };
      }

      set({ isLoading: false });
      return { success: false, error: 'Failed to sign in. Please try again.' };
    } catch (err) {
      const errorMessage = 'An unexpected error occurred. Please try again.';
      set({ isLoading: false, error: errorMessage });
      return { success: false, error: errorMessage };
    }
  },

  signOut: async () => {
    set({ isLoading: true });

    try {
      await supabase.auth.signOut();
      await AsyncStorage.removeItem(USER_ROLE_KEY);

      set({
        user: null,
        session: null,
        isAuthenticated: false,
        userRole: null,
        isLoading: false,
        error: null,
      });
    } catch (err) {
      set({ isLoading: false });
    }
  },

  signInWithGoogle: async (redirectUrl: string) => {
    set({ isLoading: true, error: null });

    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectUrl,
        },
      });

      if (error) {
        const errorMessage = `Google sign-in error: ${error.message}`;
        set({ isLoading: false, error: errorMessage });
        return { error };
      }

      set({ isLoading: false });
      return { error: null };
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Unknown error');
      const errorMessage = `Google sign-in error: ${error.message}`;
      set({ isLoading: false, error: errorMessage });
      return { error };
    }
  },

  signInWithApple: async (redirectUrl: string) => {
    set({ isLoading: true, error: null });

    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'apple',
        options: {
          redirectTo: redirectUrl,
          scopes: 'email name',
        },
      });

      if (error) {
        const errorMessage = `Apple sign-in error: ${error.message}`;
        set({ isLoading: false, error: errorMessage });
        return { error };
      }

      set({ isLoading: false });
      return { error: null };
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Unknown error');
      const errorMessage = `Apple sign-in error: ${error.message}`;
      set({ isLoading: false, error: errorMessage });
      return { error };
    }
  },

  setUserRole: async (role: UserRole) => {
    await AsyncStorage.setItem(USER_ROLE_KEY, role);
    set({ userRole: role });
  },

  initialize: async () => {
    try {
      // Get current session
      const { data: { session } } = await supabase.auth.getSession();

      if (session?.user) {
        // Fetch actual role from database (source of truth)
        const { data: roleData } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', session.user.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .single();

        const userRole = (roleData?.role as UserRole) ?? null;

        // Check onboarding completion for talents
        let isOnboardingComplete = true; // Default to true for non-talents
        if (userRole === 'talent') {
          const { data: profileData } = await supabase
            .from('talent_profiles')
            .select('onboarding_completed')
            .eq('user_id', session.user.id)
            .single();

          isOnboardingComplete = profileData?.onboarding_completed === true;
        }

        // Store in AsyncStorage if found
        if (userRole) {
          await AsyncStorage.setItem(USER_ROLE_KEY, userRole);
        }

        set({
          user: session.user,
          session,
          isAuthenticated: true,
          userRole,
          isOnboardingComplete,
          isLoading: false,
        });
      } else {
        set({
          user: null,
          session: null,
          isAuthenticated: false,
          userRole: null,
          isOnboardingComplete: false,
          isLoading: false,
        });
      }

      // Listen for auth state changes
      supabase.auth.onAuthStateChange(async (event, session) => {
        try {
          if (event === 'SIGNED_IN' && session?.user) {
            // Fetch role from database on sign in
            const { data: roleData } = await supabase
              .from('user_roles')
              .select('role')
              .eq('user_id', session.user.id)
              .order('created_at', { ascending: false })
              .limit(1)
              .single();

            const userRole = (roleData?.role as UserRole) ?? null;

            // Check onboarding completion for talents
            let isOnboardingComplete = true;
            if (userRole === 'talent') {
              const { data: profileData } = await supabase
                .from('talent_profiles')
                .select('onboarding_completed')
                .eq('user_id', session.user.id)
                .single();

              isOnboardingComplete = profileData?.onboarding_completed === true;
            }

            if (userRole) {
              await AsyncStorage.setItem(USER_ROLE_KEY, userRole);
            }

            set({
              user: session.user,
              session,
              isAuthenticated: true,
              userRole,
              isOnboardingComplete,
            });
          } else if (event === 'SIGNED_OUT') {
            await AsyncStorage.removeItem(USER_ROLE_KEY);
            set({
              user: null,
              session: null,
              isAuthenticated: false,
              userRole: null,
              isOnboardingComplete: false,
            });
          } else if (event === 'TOKEN_REFRESHED' && session) {
            set({
              session,
            });
          }
        } catch {
          // Silently handle auth state change errors to prevent {"isTrusted":true}
        }
      });
    } catch (err) {
      set({ isLoading: false });
    }
  },

  clearError: () => {
    set({ error: null });
  },
}));
