import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { User, Session, AuthError } from '@supabase/supabase-js';
import { supabase } from '../supabase';
import { extractErrorMessage } from '../errorUtils';

// IMPORTANT: includes 'admin' so admin users coming back from the DB don't get
// silently coerced into the client/talent flow. Admin UI is web-only — the app
// should show a "use the web dashboard" screen for admins (see ProtectedRoute).
export type UserRole = 'client' | 'talent' | 'admin';

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
  refetchUserData: () => Promise<void>;
  initialize: () => Promise<void>;
  clearError: () => void;
}

type AuthStore = AuthState & AuthActions;

const USER_ROLE_KEY = 'engage_user_role';
const REFERRAL_CODE_KEY = 'engage_referral_code';
const SIGNUP_SOURCE_KEY = 'engage_signup_source';

const formatAuthError = (error: AuthError): string => {
  const msg = error.message.toLowerCase();
  if (msg.includes('invalid login credentials')) return 'Invalid email or password. Please try again.';
  if (msg.includes('email not confirmed')) return 'Please check your email and confirm your account.';
  if (msg.includes('user already registered') || msg.includes('already registered')) {
    return 'An account with this email already exists. Try signing in instead.';
  }
  if (msg.includes('invalid email')) return 'Please enter a valid email address.';
  if (msg.includes('password') && msg.includes('short')) return 'Password must be at least 6 characters long.';
  if (msg.includes('weak password')) return 'Please choose a stronger password (at least 6 characters).';
  if (msg.includes('network') || msg.includes('fetch')) return 'Network error. Please check your connection and try again.';
  if (msg.includes('rate limit')) return 'Too many attempts. Please wait a moment and try again.';
  return error.message;
};

/**
 * Compute onboarding-complete status from the database.
 * - Talent: `talent_profiles.onboarding_completed = true`
 * - Client: `client_companies` row exists AND `profiles.phone` is set
 * - Admin:  always true (admin onboarding is implicit)
 */
async function computeIsOnboardingComplete(userId: string, role: UserRole | null): Promise<boolean> {
  if (!role) return false;
  if (role === 'admin') return true;

  if (role === 'talent') {
    const { data } = await supabase
      .from('talent_profiles')
      .select('onboarding_completed')
      .eq('user_id', userId)
      .maybeSingle();
    return data?.onboarding_completed === true;
  }

  if (role === 'client') {
    const [companyRes, profileRes] = await Promise.all([
      supabase.from('client_companies').select('id').eq('user_id', userId).maybeSingle(),
      supabase.from('profiles').select('phone').eq('id', userId).maybeSingle(),
    ]);
    return !!companyRes.data && !!profileRes.data?.phone;
  }

  return false;
}

/**
 * Process any pending referral signup. Reads code/source from AsyncStorage
 * (deep-link handler should store them on app launch) and fires the
 * process-referral-signup edge function. Failures are non-fatal.
 */
async function processPendingReferral(userId: string, role: UserRole) {
  try {
    const [referralCode, signupSource] = await Promise.all([
      AsyncStorage.getItem(REFERRAL_CODE_KEY),
      AsyncStorage.getItem(SIGNUP_SOURCE_KEY),
    ]);
    if (!referralCode && !signupSource) return;

    await supabase.functions.invoke('process-referral-signup', {
      body: {
        newUserId: userId,
        referralCode: referralCode || null,
        signupSource: signupSource || 'organic',
        newUserType: role,
      },
    });

    await Promise.all([
      AsyncStorage.removeItem(REFERRAL_CODE_KEY),
      AsyncStorage.removeItem(SIGNUP_SOURCE_KEY),
    ]);
  } catch (err) {
    console.warn('[auth-store] Referral processing skipped:', extractErrorMessage(err));
  }
}

export const useAuthStore = create<AuthStore>((set, get) => ({
  user: null,
  session: null,
  isLoading: true,
  isAuthenticated: false,
  userRole: null,
  isOnboardingComplete: false,
  error: null,

  signUp: async (email, password, fullName) => {
    set({ isLoading: true, error: null });
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { full_name: fullName } },
      });

      if (error) {
        const formatted = formatAuthError(error);
        set({ isLoading: false, error: formatted });
        return { success: false, error: formatted };
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
      return { success: true };
    } catch (err) {
      const msg = 'An unexpected error occurred. Please try again.';
      set({ isLoading: false, error: msg });
      return { success: false, error: msg };
    }
  },

  signIn: async (email, password) => {
    set({ isLoading: true, error: null });
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });

      if (error) {
        const formatted = formatAuthError(error);
        set({ isLoading: false, error: formatted });
        return { success: false, error: formatted };
      }

      if (data.user && data.session) {
        const { data: roleData } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', data.user.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        const userRole = (roleData?.role as UserRole) ?? null;
        const isOnboardingComplete = await computeIsOnboardingComplete(data.user.id, userRole);

        if (userRole) await AsyncStorage.setItem(USER_ROLE_KEY, userRole);

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
      const msg = 'An unexpected error occurred. Please try again.';
      set({ isLoading: false, error: msg });
      return { success: false, error: msg };
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
        isOnboardingComplete: false,
        isLoading: false,
        error: null,
      });
    } catch (err) {
      set({ isLoading: false });
    }
  },

  signInWithGoogle: async (redirectUrl) => {
    set({ isLoading: true, error: null });
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: redirectUrl },
      });
      if (error) {
        const msg = `Google sign-in error: ${error.message}`;
        set({ isLoading: false, error: msg });
        return { error };
      }
      set({ isLoading: false });
      return { error: null };
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Unknown error');
      set({ isLoading: false, error: `Google sign-in error: ${error.message}` });
      return { error };
    }
  },

  signInWithApple: async (redirectUrl) => {
    set({ isLoading: true, error: null });
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'apple',
        options: { redirectTo: redirectUrl, scopes: 'email name' },
      });
      if (error) {
        const msg = `Apple sign-in error: ${error.message}`;
        set({ isLoading: false, error: msg });
        return { error };
      }
      set({ isLoading: false });
      return { error: null };
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Unknown error');
      set({ isLoading: false, error: `Apple sign-in error: ${error.message}` });
      return { error };
    }
  },

  setUserRole: async (role) => {
    const user = get().user;
    if (!user) {
      // Defensive: only update local state if no user yet (pre-signup pending role).
      await AsyncStorage.setItem(USER_ROLE_KEY, role);
      set({ userRole: role });
      return;
    }

    // Persist to DB (canonical source of truth). If an admin row exists we don't
    // overwrite it from the client — admin can only be granted server-side.
    const { error } = await supabase
      .from('user_roles')
      .upsert(
        { user_id: user.id, role },
        { onConflict: 'user_id,role' }
      );

    if (error) {
      console.error('[auth-store] setUserRole error:', extractErrorMessage(error));
    }

    await AsyncStorage.setItem(USER_ROLE_KEY, role);

    // Process referral signup once we know the role (only for non-admin).
    if (role !== 'admin') {
      await processPendingReferral(user.id, role);
    }

    const isOnboardingComplete = await computeIsOnboardingComplete(user.id, role);
    set({ userRole: role, isOnboardingComplete });
  },

  refetchUserData: async () => {
    const user = get().user;
    if (!user) return;

    const { data: roleData } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    const userRole = (roleData?.role as UserRole) ?? null;
    const isOnboardingComplete = await computeIsOnboardingComplete(user.id, userRole);

    if (userRole) await AsyncStorage.setItem(USER_ROLE_KEY, userRole);
    set({ userRole, isOnboardingComplete });
  },

  initialize: async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();

      if (session?.user) {
        const { data: roleData } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', session.user.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        const userRole = (roleData?.role as UserRole) ?? null;
        const isOnboardingComplete = await computeIsOnboardingComplete(session.user.id, userRole);

        if (userRole) await AsyncStorage.setItem(USER_ROLE_KEY, userRole);

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

      supabase.auth.onAuthStateChange(async (event, session) => {
        try {
          if (event === 'SIGNED_IN' && session?.user) {
            const { data: roleData } = await supabase
              .from('user_roles')
              .select('role')
              .eq('user_id', session.user.id)
              .order('created_at', { ascending: false })
              .limit(1)
              .maybeSingle();

            const userRole = (roleData?.role as UserRole) ?? null;
            const isOnboardingComplete = await computeIsOnboardingComplete(session.user.id, userRole);

            if (userRole) await AsyncStorage.setItem(USER_ROLE_KEY, userRole);

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
            set({ session });
          }
        } catch (listenerErr) {
          // Don't stringify event objects; log a useful message at debug level.
          console.debug(
            '[auth-store] onAuthStateChange listener error:',
            extractErrorMessage(listenerErr)
          );
        }
      });
    } catch (err) {
      console.warn('[auth-store] initialize failed:', extractErrorMessage(err));
      set({ isLoading: false });
    }
  },

  clearError: () => {
    set({ error: null });
  },
}));

// Public helper for deep-link / inbound URL handlers to record a referral.
export async function storePendingReferral(referralCode?: string, signupSource?: string) {
  if (referralCode) await AsyncStorage.setItem(REFERRAL_CODE_KEY, referralCode);
  if (signupSource) await AsyncStorage.setItem(SIGNUP_SOURCE_KEY, signupSource);
}
