import { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
  Image as RNImage,
} from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useRouter } from '@/lib/router-helper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import {
  Mail,
  Lock,
  User,
  Eye,
  EyeOff,
  ChevronLeft,
  AlertCircle,
  Phone,
  MapPin,
  Globe,
  CheckCircle,
  Chrome,
  Apple,
} from 'lucide-react-native';
import Animated, { FadeInDown, FadeIn, FadeOut } from 'react-native-reanimated';
import { useAuthStore, type UserRole } from '@/lib/state/auth-store';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { api } from '@/lib/api/api';
import { extractErrorMessage } from '@/lib/errorUtils';

type AuthMode = 'signup' | 'otp' | 'signin' | 'forgot-password' | 'otp-reset' | 'new-password' | 'success';

interface FormData {
  fullName: string;
  email: string;
  password: string;
  phone: string;
  countryCode: string;
  gender: 'male' | 'female' | 'other' | '';
  country: string;
  city: string;
  remote: boolean;
}

interface FormErrors {
  email?: string;
  password?: string;
  fullName?: string;
  phone?: string;
  gender?: string;
  country?: string;
  city?: string;
  otp?: string;
}

// Country codes
const COUNTRY_CODES = [
  { code: '+1', country: 'US' },
  { code: '+44', country: 'UK' },
  { code: '+91', country: 'India' },
  { code: '+971', country: 'UAE' },
  { code: '+966', country: 'Saudi Arabia' },
  { code: '+212', country: 'Morocco' },
  { code: '+234', country: 'Nigeria' },
  { code: '+27', country: 'South Africa' },
];

// Countries (simplified)
const COUNTRIES = [
  'United States',
  'United Kingdom',
  'India',
  'United Arab Emirates',
  'Saudi Arabia',
  'Morocco',
  'Nigeria',
  'South Africa',
  'Canada',
  'Australia',
];

// Cities by country (simplified)
const CITIES_BY_COUNTRY: Record<string, string[]> = {
  'United States': ['New York', 'Los Angeles', 'Chicago', 'Houston', 'Phoenix'],
  'United Kingdom': ['London', 'Manchester', 'Birmingham', 'Leeds', 'Glasgow'],
  India: ['Mumbai', 'Delhi', 'Bangalore', 'Hyderabad', 'Chennai'],
  'United Arab Emirates': ['Dubai', 'Abu Dhabi', 'Sharjah', 'Ajman', 'Ras Al Khaimah'],
  'Saudi Arabia': ['Riyadh', 'Jeddah', 'Dammam', 'Mecca', 'Medina'],
  Morocco: ['Casablanca', 'Fez', 'Marrakech', 'Tangier', 'Agadir'],
  Nigeria: ['Lagos', 'Abuja', 'Kano', 'Ibadan', 'Port Harcourt'],
  'South Africa': ['Johannesburg', 'Cape Town', 'Durban', 'Pretoria', 'Bloemfontein'],
  Canada: ['Toronto', 'Vancouver', 'Montreal', 'Calgary', 'Ottawa'],
  Australia: ['Sydney', 'Melbourne', 'Brisbane', 'Perth', 'Adelaide'],
};

const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

const calculatePasswordStrength = (password: string): number => {
  let strength = 0;
  if (password.length >= 8) strength++;
  if (/[A-Z]/.test(password)) strength++;
  if (/[0-9]/.test(password)) strength++;
  if (/[^A-Za-z0-9]/.test(password)) strength++;
  return strength;
};

const generateRequestId = () => `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

export default function AuthScreen() {
  const { role } = useLocalSearchParams<{ role: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [authMode, setAuthMode] = useState<AuthMode>('signin');
  const [showPassword, setShowPassword] = useState(false);
  const [showPassword2, setShowPassword2] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [otpDigits, setOtpDigits] = useState<string[]>(['', '', '', '', '', '']);
  const [resendTimer, setResendTimer] = useState(60);
  const [sendingOtp, setSendingOtp] = useState(false);
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);
  const [isCompletingSignup, setIsCompletingSignup] = useState(false);
  const [isCompletingOtp, setIsCompletingOtp] = useState(false);
  const [otpError, setOtpError] = useState('');
  const [showCountryCodes, setShowCountryCodes] = useState(false);
  const [showCountries, setShowCountries] = useState(false);
  const [showCities, setShowCities] = useState(false);
  const otpInputRefs = useRef<(TextInput | null)[]>([]);

  // Forgot password state
  const [resetEmail, setResetEmail] = useState('');
  const [resetPassword, setResetPassword] = useState('');
  const [resetConfirmPassword, setResetConfirmPassword] = useState('');
  const [resetPasswordStrength, setResetPasswordStrength] = useState(0);
  const [resetErrors, setResetErrors] = useState<{ email?: string; password?: string; confirmPassword?: string }>({});
  const [isResettingPassword, setIsResettingPassword] = useState(false);
  const [resetPasswordVerified, setResetPasswordVerified] = useState(false);

  const [formData, setFormData] = useState<FormData>({
    fullName: '',
    email: '',
    password: '',
    phone: '',
    countryCode: '+971',
    gender: '',
    country: '',
    city: '',
    remote: false,
  });
  const [formErrors, setFormErrors] = useState<FormErrors>({});
  const [pendingSignup, setPendingSignup] = useState<FormData | null>(null);
  const [passwordStrength, setPasswordStrength] = useState(0);

  const signUp = useAuthStore((s) => s.signUp);
  const signIn = useAuthStore((s) => s.signIn);
  const signInWithGoogle = useAuthStore((s) => s.signInWithGoogle);
  const signInWithApple = useAuthStore((s) => s.signInWithApple);
  const setUserRole = useAuthStore((s) => s.setUserRole);
  const isLoading = useAuthStore((s) => s.isLoading);
  const error = useAuthStore((s) => s.error);
  const clearError = useAuthStore((s) => s.clearError);

  const isProcessing = isVerifyingOtp || isCompletingSignup;

  useEffect(() => {
    if (role === 'client' || role === 'talent') {
      setUserRole(role as UserRole);
    }
    // Note: Local require() images are bundled at build time, no prefetch needed
  }, [role]);

  useEffect(() => {
    clearError();
    setFormErrors({});
  }, [authMode]);

  // Resend timer countdown
  useEffect(() => {
    if (authMode !== 'otp' && authMode !== 'otp-reset') return;

    if (resendTimer <= 0) return;

    const timer = setInterval(() => {
      setResendTimer((prev) => Math.max(0, prev - 1));
    }, 1000);

    return () => clearInterval(timer);
  }, [authMode]);

  const updateFormData = (field: keyof FormData, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (formErrors[field as keyof FormErrors]) {
      setFormErrors((prev) => ({ ...prev, [field]: undefined }));
    }

    if (field === 'password') {
      setPasswordStrength(calculatePasswordStrength(value));
    }
  };

  const validateForm = (): boolean => {
    const errors: FormErrors = {};

    if (!formData.email.trim()) {
      errors.email = 'Email is required';
    } else if (!isValidEmail(formData.email.trim())) {
      errors.email = 'Please enter a valid email address';
    }

    if (!formData.password) {
      errors.password = 'Password is required';
    } else if (formData.password.length < 6) {
      errors.password = 'Password must be at least 6 characters';
    }

    if (authMode === 'signup') {
      if (!formData.fullName.trim()) {
        errors.fullName = 'Full name is required';
      }
      if (!formData.phone.trim()) {
        errors.phone = 'Phone is required';
      }
      if (!formData.gender) {
        errors.gender = 'Please select a gender';
      }
      if (!formData.country) {
        errors.country = 'Country is required';
      }
      if (!formData.city && !formData.remote) {
        errors.city = 'Please select a city or mark as remote';
      }
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSendOtp = async () => {
    if (!validateForm()) {
      return;
    }

    setSendingOtp(true);
    clearError();
    const requestId = generateRequestId();

    try {
      const normalizedEmail = formData.email.trim().toLowerCase();
      setPendingSignup({ ...formData, email: normalizedEmail });

      console.log(`[OTP_SEND_START] requestId=${requestId} email=${normalizedEmail} name=${formData.fullName.trim()}`);

      // Call Supabase Edge Function directly
      const { data, error } = await supabase.functions.invoke('send-otp', {
        body: {
          email: normalizedEmail,
          name: formData.fullName.trim(),
          event: 'new_user',
        },
      });

      console.log(`[OTP_SEND_RESPONSE] requestId=${requestId} data=`, JSON.stringify(data, null, 2), 'error=', error);

      if (error) {
        console.log(`[OTP_SEND_FAIL] requestId=${requestId} error=${error.message}`);
        Alert.alert('Error', 'Failed to send OTP. Please try again.');
        setPendingSignup(null);
        return;
      }

      // Check if email already exists (has a talent profile)
      // NOTE: If a profile exists, we still allow signup to proceed
      // The recovery flow will handle it if the account also exists
      if (data?.success === false && data?.code === 'EMAIL_EXISTS') {
        console.log(`[OTP_SEND_EMAIL_EXISTS] requestId=${requestId} email=${normalizedEmail} - allowing recovery flow`);
        // Don't block here - let the user proceed and the recovery flow will handle it
        // Show OTP screen anyway
        setAuthMode('otp');
        setOtpCode('');
        setOtpDigits(['', '', '', '', '', '']);
        setResendTimer(60);
        setOtpError('');
        Alert.alert('OTP Sent', `A 6-digit code has been sent to ${normalizedEmail}`);
        return;
      }

      // Success - OTP sent
      if (data?.success === true) {
        console.log(`[OTP_SEND_SUCCESS] requestId=${requestId} email=${normalizedEmail}`);
        setAuthMode('otp');
        setOtpCode('');
        setOtpDigits(['', '', '', '', '', '']);
        setResendTimer(60);
        setOtpError('');
        Alert.alert('OTP Sent', `A 6-digit code has been sent to ${normalizedEmail}`);
      } else {
        console.log(`[OTP_SEND_FAIL] requestId=${requestId} unexpected response`);
        Alert.alert('Error', 'Failed to send OTP. Please try again.');
        setPendingSignup(null);
      }
    } catch (err) {
      console.error(`[OTP_SEND_FAIL] requestId=${requestId} error=`, extractErrorMessage(err));
      const errorMsg = extractErrorMessage(err);
      console.error(`[OTP_SEND_FAIL] error message: "${errorMsg}"`);
      Alert.alert('Error', errorMsg);
      setPendingSignup(null);
    } finally {
      setSendingOtp(false);
    }
  };

  const handleCompleteSignup = async (): Promise<{ success: boolean; message?: string }> => {
    if (!pendingSignup) {
      return { success: false, message: 'Session expired. Please try again.' };
    }

    const requestId = generateRequestId();
    const normalizedEmail = pendingSignup.email.trim().toLowerCase();

    try {
      console.log(`[SIGNUP_START] requestId=${requestId} email=${normalizedEmail}`);

      if (!isSupabaseConfigured) {
        return {
          success: false,
          message: 'Configuration required. Please check ENV variables.',
        };
      }

      // Try to create Supabase account
      let currentUser = null;
      const signupResult = await signUp(
        normalizedEmail,
        pendingSignup.password,
        pendingSignup.fullName.trim()
      );

      if (signupResult.success) {
        console.log(`[SIGNUP_SUCCESS] requestId=${requestId} email=${normalizedEmail}`);
        const { data: { user } } = await supabase.auth.getUser();
        currentUser = user;
      } else {
        // Signup failed - check if it's because account already exists
        const errorMsg = signupResult.error?.toLowerCase() || '';
        if (errorMsg.includes('already registered') || errorMsg.includes('already exists')) {
          console.log(`[SIGNUP_RECOVERY] requestId=${requestId} account exists, attempting sign-in fallback`);

          // Try to sign in with the password as recovery
          const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
            email: normalizedEmail,
            password: pendingSignup.password,
          });

          if (signInError) {
            console.log(`[SIGNUP_RECOVERY_FAIL] requestId=${requestId} sign-in failed: ${signInError.message}`);
            return {
              success: false,
              message: 'This account already exists. Please sign in or reset your password.',
            };
          }

          if (signInData?.user) {
            console.log(`[SIGNUP_RECOVERY_SUCCESS] requestId=${requestId} signed in with existing account`);
            currentUser = signInData.user;
          } else {
            return {
              success: false,
              message: 'Account recovery failed. Please try signing in instead.',
            };
          }
        } else {
          console.log(`[SIGNUP_FAIL] requestId=${requestId} error=${signupResult.error}`);
          return {
            success: false,
            message: signupResult.error || 'Code verified but account creation failed.',
          };
        }
      }

      // Now we have a currentUser (either from signup or recovery sign-in)
      if (!currentUser?.id) {
        return {
          success: false,
          message: 'Account setup failed. Please try again.',
        };
      }

      // Save user email for reference
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem('engage_user_email', normalizedEmail);
      }

      console.log(`[PROFILE_SETUP_START] requestId=${requestId} userId=${currentUser.id}`);

      // Upsert profile row (repair if missing)
      const { error: profileError } = await supabase
        .from('talent_profiles')
        .upsert(
          {
            user_id: currentUser.id,
          },
          { onConflict: 'user_id' }
        );

      if (profileError) {
        console.error(`[PROFILE_SETUP_FAIL] requestId=${requestId} error=${profileError.message}`);
        // Don't fail the whole flow if profile upsert fails
      } else {
        console.log(`[PROFILE_SETUP_SUCCESS] requestId=${requestId}`);
      }

      // Ensure talent role exists (idempotent)
      const { error: roleError } = await supabase
        .from('user_roles')
        .upsert(
          {
            user_id: currentUser.id,
            role: 'talent',
          },
          { onConflict: 'user_id,role' }
        );

      if (roleError) {
        console.error(`[ROLE_SETUP_FAIL] requestId=${requestId} error=${roleError.message}`);
        // Don't fail the whole flow if role upsert fails
      } else {
        console.log(`[ROLE_SETUP_SUCCESS] requestId=${requestId}`);
      }

      return { success: true };
    } catch (err) {
      console.error(`[SIGNUP_FAIL] requestId=${requestId} error=`, extractErrorMessage(err));
      return {
        success: false,
        message: 'Code verified but account setup failed. Please try again.',
      };
    }
  };

  const handleVerifyOtp = async () => {
    // Prevent double-submit
    if (isProcessing) {
      console.log('[OTP_VERIFY] Skipped: already processing');
      return;
    }

    // Validate code from digits array
    const fullCode = otpDigits.join('').replace(/\D/g, '');
    if (fullCode.length !== 6) {
      setOtpError('Please enter a valid 6-digit code');
      return;
    }

    if (!pendingSignup) {
      setOtpError('Session expired. Please try again.');
      return;
    }

    const requestId = generateRequestId();
    const normalizedEmail = pendingSignup.email.trim().toLowerCase();

    setIsVerifyingOtp(true);
    setOtpError('');

    try {
      console.log(`[OTP_VERIFY_START] requestId=${requestId} email=${normalizedEmail} code=${fullCode}`);

      // Call Supabase Edge Function directly
      const { data, error } = await supabase.functions.invoke('verify-otp', {
        body: {
          email: normalizedEmail,
          otp: fullCode,
          event: 'new_user',
        },
      });

      console.log(`[OTP_VERIFY_RESPONSE] requestId=${requestId} data=`, JSON.stringify(data, null, 2), 'error=', error);

      if (error) {
        console.error(`[OTP_VERIFY_FAIL] requestId=${requestId} error=`, extractErrorMessage(error));
        console.error(`[OTP_VERIFY_FAIL] error message: ${error.message}`);
        console.error(`[OTP_VERIFY_FAIL] error status: ${(error as any).status}`);

        // Handle specific error messages
        let userMessage = 'Invalid or expired code. Please try again.';
        if (error.message?.includes('non-2xx')) {
          userMessage = 'Service error. Please try again.';
        } else if (error.message?.includes('timeout')) {
          userMessage = 'Request timed out. Please try again.';
        }

        setOtpError(userMessage);
        setOtpCode('');
        setOtpDigits(['', '', '', '', '', '']);
        setIsVerifyingOtp(false);
        return;
      }

      // Check if OTP verification was successful
      if (data?.success !== true) {
        console.log(`[OTP_VERIFY_FAIL] requestId=${requestId} success=false data=`, JSON.stringify(data));
        setOtpError(data?.message || 'Invalid or expired code. Please try again.');
        setOtpCode('');
        setOtpDigits(['', '', '', '', '', '']);
        setIsVerifyingOtp(false);
        return;
      }

      console.log(`[OTP_VERIFY_SUCCESS] requestId=${requestId} proceeding to signup`);

      // OTP verified, now complete signup
      setIsCompletingSignup(true);

      const signupResult = await handleCompleteSignup();

      if (signupResult.success) {
        console.log(`[OTP_FLOW_COMPLETE] requestId=${requestId} email=${normalizedEmail}`);

        // Clear OTP state
        setOtpCode('');
        setOtpDigits(['', '', '', '', '', '']);
        setOtpError('');
        setPendingSignup(null);

        // Small delay to ensure state is updated
        await new Promise(resolve => setTimeout(resolve, 500));

        // Navigate to onboarding
        router.replace({
          pathname: '/onboarding/talent-setup',
          params: {
            email: normalizedEmail,
            phone: pendingSignup.phone,
            countryCode: pendingSignup.countryCode,
            gender: pendingSignup.gender,
            country: pendingSignup.country,
            city: pendingSignup.city,
          },
        });
      } else {
        console.log(`[OTP_SIGNUP_FAIL] requestId=${requestId} reason=${signupResult.message}`);
        setOtpError(signupResult.message || 'Account setup failed. Please try again.');
        setOtpCode('');
      }
    } catch (err) {
      console.error(`[OTP_VERIFY_FAIL] requestId=${requestId} caught error:`, extractErrorMessage(err));
      let errorMsg = 'Invalid or expired code. Please try again.';

      if (err instanceof Error) {
        errorMsg = err.message;
      } else if (typeof err === 'object' && err !== null && 'message' in err) {
        const errorObj = err as any;
        errorMsg = errorObj.message || errorObj.msg || errorObj.error || errorObj.error_description || 'Invalid or expired code. Please try again.';
      } else if (typeof err === 'string') {
        errorMsg = err;
      }

      console.error(`[OTP_VERIFY_FAIL] error message: "${errorMsg}"`);
      setOtpError(errorMsg);
      setOtpCode('');
    } finally {
      setIsVerifyingOtp(false);
      setIsCompletingSignup(false);
    }
  };

  // Forgot Password Flow Handlers
  const handleForgotPasswordEmail = async () => {
    setResetErrors({});

    if (!resetEmail.trim()) {
      setResetErrors({ email: 'Email is required' });
      return;
    }

    if (!isValidEmail(resetEmail.trim())) {
      setResetErrors({ email: 'Please enter a valid email address' });
      return;
    }

    setSendingOtp(true);
    const requestId = generateRequestId();

    try {
      const normalizedEmail = resetEmail.trim().toLowerCase();
      console.log(`[RESET_OTP_SEND] requestId=${requestId} email=${normalizedEmail}`);

      const { data, error } = await supabase.functions.invoke('send-otp', {
        body: {
          email: normalizedEmail,
          name: normalizedEmail.split('@')[0],
          event: 'update_password',
        },
      });

      console.log(`[RESET_OTP_RESPONSE] requestId=${requestId} data=`, JSON.stringify(data), 'error=', error);

      if (error) {
        console.error(`[RESET_OTP_SEND_ERROR] requestId=${requestId} error=`, extractErrorMessage(error));
        Alert.alert('Error', 'Failed to send verification code. Please try again.');
        setSendingOtp(false);
        return;
      }

      // CRITICAL: Check if the email exists BEFORE proceeding to OTP screen
      if (data?.success === false) {
        if (data?.code === 'EMAIL_NOT_FOUND') {
          console.log(`[RESET_OTP_EMAIL_NOT_FOUND] requestId=${requestId} email=${normalizedEmail}`);
          Alert.alert('Account Not Found', data?.error || 'No account found with this email address.');
          setSendingOtp(false);
          return; // Do NOT navigate to OTP screen
        }

        // Handle other failure cases
        console.log(`[RESET_OTP_SEND_FAIL] requestId=${requestId} code=${data?.code}`);
        Alert.alert('Error', data?.error || 'Failed to send verification code. Please try again.');
        setSendingOtp(false);
        return;
      }

      // Only proceed to OTP screen if success is true
      if (data?.success === true) {
        console.log(`[RESET_OTP_SENT] requestId=${requestId}`);
        setAuthMode('otp-reset');
        setOtpCode('');
        setOtpDigits(['', '', '', '', '', '']);
        setResendTimer(60);
        setOtpError('');
        Alert.alert('OTP Sent', `A 6-digit code has been sent to ${normalizedEmail}`);
      } else {
        console.log(`[RESET_OTP_UNEXPECTED] requestId=${requestId} unexpected response`);
        Alert.alert('Error', 'Failed to send verification code. Please try again.');
      }

      setSendingOtp(false);
    } catch (err) {
      console.error('[RESET_OTP_SEND_ERROR]', extractErrorMessage(err));
      const errorMsg = extractErrorMessage(err);
      Alert.alert('Error', errorMsg);
      setSendingOtp(false);
    }
  };

  const handleVerifyOtpForReset = async () => {
    if (isProcessing) return;

    const fullCode = otpDigits.join('').replace(/\D/g, '');
    if (fullCode.length !== 6) {
      setOtpError('Please enter a valid 6-digit code');
      return;
    }

    const requestId = generateRequestId();
    const normalizedEmail = resetEmail.trim().toLowerCase();

    setIsVerifyingOtp(true);
    setOtpError('');

    try {
      console.log(`[RESET_OTP_VERIFY] requestId=${requestId} email=${normalizedEmail}`);

      const { data, error } = await supabase.functions.invoke('verify-otp', {
        body: {
          email: normalizedEmail,
          otp: fullCode,
          event: 'update_password',
        },
      });

      if (error || data?.success !== true) {
        setOtpError(data?.message || 'Invalid or expired code. Please try again.');
        setOtpCode('');
        setOtpDigits(['', '', '', '', '', '']);
        setIsVerifyingOtp(false);
        return;
      }

      console.log(`[RESET_OTP_VERIFIED] requestId=${requestId}`);
      setResetPasswordVerified(true);
      setOtpCode('');
      setOtpDigits(['', '', '', '', '', '']);
      setOtpError('');
      setAuthMode('new-password');
      setIsVerifyingOtp(false);
    } catch (err) {
      console.error('[RESET_OTP_VERIFY_ERROR]', extractErrorMessage(err));
      setOtpError('Verification failed. Please try again.');
      setOtpCode('');
      setOtpDigits(['', '', '', '', '', '']);
      setIsVerifyingOtp(false);
    }
  };

  const handleResetPassword = async () => {
    setResetErrors({});

    // Validation
    if (resetPassword.length < 6) {
      setResetErrors({ password: 'Password must be at least 6 characters' });
      return;
    }

    if (resetPassword !== resetConfirmPassword) {
      setResetErrors({ confirmPassword: 'Passwords do not match' });
      return;
    }

    if (!resetPasswordVerified) {
      Alert.alert('Error', 'Please verify your email first');
      return;
    }

    setIsResettingPassword(true);

    try {
      const normalizedEmail = resetEmail.trim().toLowerCase();
      console.log('[RESET_PASSWORD_START]', normalizedEmail);

      // Use Supabase Edge Function to reset password (handles OTP verification internally)
      const { data, error } = await supabase.functions.invoke('reset-password', {
        body: {
          email: normalizedEmail,
          newPassword: resetPassword,
        },
      });

      console.log('[RESET_PASSWORD_RESPONSE]', { data, error });

      if (error || !data?.success) {
        throw new Error(data?.error || error?.message || 'Failed to reset password');
      }

      console.log('[RESET_PASSWORD_SUCCESS]');
      setAuthMode('success');
      setIsResettingPassword(false);

      // Auto-redirect after 2 seconds
      setTimeout(() => {
        setAuthMode('signin');
        setResetEmail('');
        setResetPassword('');
        setResetConfirmPassword('');
        setResetPasswordStrength(0);
        setResetPasswordVerified(false);
        setOtpCode('');
        setOtpDigits(['', '', '', '', '', '']);
      }, 2000);
    } catch (err) {
      console.error('[RESET_PASSWORD_ERROR]', extractErrorMessage(err));
      const errorMsg = extractErrorMessage(err);
      Alert.alert('Error', errorMsg);
      setIsResettingPassword(false);
    }
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      return;
    }

    if (authMode === 'signup' && role === 'talent') {
      await handleSendOtp();
      return;
    }

    if (!isSupabaseConfigured) {
      Alert.alert(
        'Configuration Required',
        'Please add EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY to the Frontend ENV tab.',
        [{ text: 'OK' }]
      );
      return;
    }

    clearError();

    try {
      if (authMode === 'signup') {
        const result = await signUp(
          formData.email.trim(),
          formData.password,
          formData.fullName.trim()
        );

        if (result.success) {
          Alert.alert(
            'Account Created',
            'Please check your email to confirm your account, then sign in.',
            [
              {
                text: 'OK',
                onPress: () => setAuthMode('signin'),
              },
            ]
          );
        }
      } else {
        const result = await signIn(formData.email.trim(), formData.password);

        if (result.success) {
          // AuthStateHandler will redirect
        }
      }
    } catch (err) {
      console.error('Auth error:', extractErrorMessage(err));
    }
  };

  const handleOAuth = async (provider: 'google' | 'apple') => {
    if (!isSupabaseConfigured) {
      Alert.alert(
        'Configuration Required',
        'Please add EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY to the Frontend ENV tab.',
        [{ text: 'OK' }]
      );
      return;
    }

    const redirectUrl = 'engage://auth-callback';

    try {
      if (provider === 'google') {
        await signInWithGoogle(redirectUrl);
      } else if (provider === 'apple') {
        await signInWithApple(redirectUrl);
      }
    } catch (err) {
      console.error(`${provider} sign-in error:`, extractErrorMessage(err));
      Alert.alert('Sign-In Error', `Failed to sign in with ${provider}. Please try again.`);
    }
  };

  const roleLabel = role === 'talent' ? 'Talent' : 'Client';
  const availableCities = formData.country ? CITIES_BY_COUNTRY[formData.country] || [] : [];

  return (
    <View className="flex-1 bg-[#0A0A0A]">
      {/* Background Image */}
      <RNImage
        source={require('./signin-bg.png')}
        style={{
          position: 'absolute',
          width: '100%',
          height: '100%',
          resizeMode: 'cover',
        }}
      />

      {/* Dark Overlay */}
      <View
        style={{
          position: 'absolute',
          width: '100%',
          height: '100%',
          backgroundColor: 'rgba(10, 10, 10, 0.65)',
        }}
      />

      <LinearGradient
        colors={['rgba(26, 26, 26, 0.3)', 'rgba(10, 10, 10, 0.5)', 'rgba(10, 10, 10, 0.6)']}
        style={{ flex: 1 }}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          className="flex-1"
        >
          <ScrollView
            contentContainerStyle={{
              flexGrow: 1,
              paddingTop: insets.top,
              paddingBottom: insets.bottom + 16,
            }}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {/* Header with Back Button */}
            <View className="flex-row items-center px-4 py-1">
              <Pressable
                onPress={() => {
                  if (authMode === 'forgot-password' || authMode === 'otp-reset' || authMode === 'new-password' || authMode === 'success') {
                    setAuthMode('signin');
                    setResetEmail('');
                    setResetPassword('');
                    setResetConfirmPassword('');
                    setResetPasswordStrength(0);
                    setResetPasswordVerified(false);
                    setOtpCode('');
                    setOtpDigits(['', '', '', '', '', '']);
                    setOtpError('');
                    setResetErrors({});
                  } else {
                    router.back();
                  }
                }}
                className="p-2 rounded-full"
                style={{ backgroundColor: 'rgba(255,255,255,0.1)' }}
              >
                <ChevronLeft size={24} color="#FFFFFF" />
              </Pressable>
            </View>

            {/* Logo */}
            <Animated.View
              entering={FadeIn.delay(100).duration(500)}
              className="items-center mt-0 mb-2"
            >
              <RNImage
                source={require('../(talent)/logo.png')}
                style={{
                  width: 160,
                  height: 160,
                  resizeMode: 'contain',
                }}
              />
            </Animated.View>

            {/* Main Content */}
            <View className="px-6 flex-1">
              {/* Title */}
              <Animated.View
                entering={FadeInDown.delay(150).duration(500)}
                className="mb-4"
              >
                <Text className="text-2xl text-white font-bold text-center mb-2">
                  {authMode === 'otp'
                    ? 'Verify Email'
                    : authMode === 'otp-reset'
                      ? 'Verify Email'
                      : authMode === 'forgot-password'
                        ? 'Reset password'
                        : authMode === 'new-password'
                          ? 'Create new password'
                          : authMode === 'success'
                            ? 'Password Updated!'
                            : authMode === 'signup'
                              ? 'Create Account'
                              : 'Welcome Back'}
                </Text>
                <Text className="text-neutral-400 text-center text-sm">
                  {authMode === 'otp'
                    ? `Enter the 6-digit code sent to ${pendingSignup?.email}`
                    : authMode === 'otp-reset'
                      ? `Enter the 6-digit code sent to ${resetEmail}`
                      : authMode === 'forgot-password'
                        ? 'Enter your email to receive a verification code'
                        : authMode === 'new-password'
                          ? `Enter a new password for ${resetEmail}`
                          : authMode === 'success'
                            ? 'Redirecting you to sign in...'
                            : authMode === 'signup'
                              ? `Sign up as a ${roleLabel}`
                              : 'Sign in to your account'}
                </Text>
              </Animated.View>

              {/* Error Message */}
              {error ? (
                <Animated.View
                  entering={FadeInDown.duration(300)}
                  className="mb-4 p-4 rounded-2xl flex-row items-center"
                  style={{
                    backgroundColor: 'rgba(239, 68, 68, 0.15)',
                    borderWidth: 1,
                    borderColor: 'rgba(239, 68, 68, 0.3)',
                  }}
                >
                  <AlertCircle size={20} color="#EF4444" />
                  <Text className="text-red-400 flex-1 ml-3 text-sm">{error}</Text>
                </Animated.View>
              ) : null}

              {/* OTP Error */}
              {authMode === 'otp' && otpError ? (
                <Animated.View
                  entering={FadeInDown.duration(300)}
                  className="mb-4 p-4 rounded-2xl flex-row items-center"
                  style={{
                    backgroundColor: 'rgba(239, 68, 68, 0.15)',
                    borderWidth: 1,
                    borderColor: 'rgba(239, 68, 68, 0.3)',
                  }}
                >
                  <AlertCircle size={20} color="#EF4444" />
                  <Text className="text-red-400 flex-1 ml-3 text-sm">{otpError}</Text>
                </Animated.View>
              ) : null}

              {/* Reset Password Errors */}
              {(authMode === 'forgot-password' || authMode === 'otp-reset' || authMode === 'new-password') && resetErrors.email ? (
                <Animated.View
                  entering={FadeInDown.duration(300)}
                  className="mb-4 p-4 rounded-2xl flex-row items-center"
                  style={{
                    backgroundColor: 'rgba(239, 68, 68, 0.15)',
                    borderWidth: 1,
                    borderColor: 'rgba(239, 68, 68, 0.3)',
                  }}
                >
                  <AlertCircle size={20} color="#EF4444" />
                  <Text className="text-red-400 flex-1 ml-3 text-sm">{resetErrors.email}</Text>
                </Animated.View>
              ) : null}

              {/* OTP Reset Error */}
              {authMode === 'otp-reset' && otpError ? (
                <Animated.View
                  entering={FadeInDown.duration(300)}
                  className="mb-4 p-4 rounded-2xl flex-row items-center"
                  style={{
                    backgroundColor: 'rgba(239, 68, 68, 0.15)',
                    borderWidth: 1,
                    borderColor: 'rgba(239, 68, 68, 0.3)',
                  }}
                >
                  <AlertCircle size={20} color="#EF4444" />
                  <Text className="text-red-400 flex-1 ml-3 text-sm">{otpError}</Text>
                </Animated.View>
              ) : null}

              {/* OTP Input Screen */}
              {authMode === 'otp' ? (
                <Animated.View
                  entering={FadeInDown.duration(300)}
                  className="gap-3"
                >
                  {/* OTP Input - Single hidden input with visual display boxes */}
                  <View className="gap-2">
                    <Text className="text-neutral-400 text-sm mb-1">
                      Verification Code
                    </Text>

                    {/* Single hidden input field */}
                    <TextInput
                      ref={(ref) => {
                        otpInputRefs.current[0] = ref;
                      }}
                      value={otpCode}
                      onChangeText={(text) => {
                        // Filter to numbers only and limit to 6 digits
                        const filtered = text.replace(/[^0-9]/g, '').slice(0, 6);
                        setOtpCode(filtered);

                        // Update display digits
                        const digits = filtered.split('');
                        while (digits.length < 6) {
                          digits.push('');
                        }
                        setOtpDigits(digits);
                      }}
                      placeholder="000000"
                      placeholderTextColor="#9CA3AF"
                      keyboardType="numeric"
                      editable={!isProcessing}
                      maxLength={6}
                      autoFocus={true}
                      style={{
                        position: 'absolute',
                        width: 0,
                        height: 0,
                        opacity: 0,
                      }}
                    />

                    {/* Visual display boxes */}
                    <Pressable onPress={() => otpInputRefs.current[0]?.focus()}>
                      <View className="flex-row justify-between gap-2">
                        {otpDigits.map((digit, index) => (
                          <View
                            key={index}
                            className="flex-1"
                            style={{
                              backgroundColor: 'rgba(255, 255, 255, 0.05)',
                              borderWidth: 2,
                              borderColor: otpError
                                ? 'rgba(239, 68, 68, 0.8)'
                                : 'rgba(255, 255, 255, 0.4)',
                              borderRadius: 12,
                              paddingVertical: 14,
                              alignItems: 'center',
                              justifyContent: 'center',
                            }}
                          >
                            <Text className="text-white text-2xl text-center font-semibold">
                              {digit}
                            </Text>
                          </View>
                        ))}
                      </View>
                    </Pressable>

                    {otpError ? (
                      <Text className="text-red-400 text-sm">{otpError}</Text>
                    ) : null}
                  </View>

                  {/* Resend Timer */}
                  <View className="items-center py-1">
                    {resendTimer > 0 ? (
                      <Text className="text-neutral-400 text-sm">
                        Resend code in{' '}
                        <Text className="text-orange-500 font-semibold">
                          {resendTimer}s
                        </Text>
                      </Text>
                    ) : (
                      <Pressable
                        onPress={() => {
                          setAuthMode('signup');
                          setOtpCode('');
                          setOtpDigits(['', '', '', '', '', '']);
                          setOtpError('');
                        }}
                        disabled={isProcessing}
                      >
                        <Text className="text-neutral-400 text-center text-sm">
                          Didn't receive code?{' '}
                          <Text className="text-orange-500 font-semibold">
                            Send Again
                          </Text>
                        </Text>
                      </Pressable>
                    )}
                  </View>
                </Animated.View>
              ) : null}

              {/* SCREEN 1: Forgot Password - Email Input */}
              {authMode === 'forgot-password' ? (
                <Animated.View
                  entering={FadeInDown.duration(300)}
                  className="rounded-3xl px-6 py-6 mx-6"
                  style={{
                    backgroundColor: 'rgba(0, 0, 0, 0.4)',
                    borderWidth: 1,
                    borderColor: 'rgba(255, 255, 255, 0.15)',
                  }}
                >
                  {/* Email Input */}
                  <View
                    className="rounded-2xl p-4 flex-row items-center"
                    style={{
                      backgroundColor: 'rgba(255, 255, 255, 0.08)',
                      borderWidth: 1,
                      borderColor: resetErrors.email
                        ? 'rgba(239, 68, 68, 0.5)'
                        : 'rgba(255, 255, 255, 0.15)',
                    }}
                  >
                    <Mail size={18} color="#80808080" />
                    <TextInput
                      placeholder="Email address"
                      placeholderTextColor="#FFFFFF"
                      value={resetEmail}
                      onChangeText={setResetEmail}
                      className="flex-1 ml-3 text-white text-base"
                      keyboardType="email-address"
                      autoCapitalize="none"
                      editable={!sendingOtp}
                    />
                  </View>
                </Animated.View>
              ) : null}

              {/* SCREEN 2: OTP Reset - Code Input */}
              {authMode === 'otp-reset' ? (
                <Animated.View
                  entering={FadeInDown.duration(300)}
                  className="gap-3"
                >
                  {/* OTP Input - Single hidden input with visual display boxes */}
                  <View className="gap-2">
                    <Text className="text-neutral-400 text-sm mb-1">
                      Verification Code
                    </Text>

                    {/* Single hidden input field */}
                    <TextInput
                      ref={(ref) => {
                        otpInputRefs.current[0] = ref;
                      }}
                      value={otpCode}
                      onChangeText={(text) => {
                        // Filter to numbers only and limit to 6 digits
                        const filtered = text.replace(/[^0-9]/g, '').slice(0, 6);
                        setOtpCode(filtered);

                        // Update display digits
                        const digits = filtered.split('');
                        while (digits.length < 6) {
                          digits.push('');
                        }
                        setOtpDigits(digits);
                      }}
                      placeholder="000000"
                      placeholderTextColor="#9CA3AF"
                      keyboardType="numeric"
                      editable={!isVerifyingOtp}
                      maxLength={6}
                      autoFocus={true}
                      style={{
                        position: 'absolute',
                        width: 0,
                        height: 0,
                        opacity: 0,
                      }}
                    />

                    {/* Visual display boxes */}
                    <Pressable onPress={() => otpInputRefs.current[0]?.focus()}>
                      <View className="flex-row justify-between gap-2">
                        {otpDigits.map((digit, index) => (
                          <View
                            key={index}
                            className="flex-1"
                            style={{
                              backgroundColor: 'rgba(255, 255, 255, 0.05)',
                              borderWidth: 2,
                              borderColor: otpError
                                ? 'rgba(239, 68, 68, 0.8)'
                                : 'rgba(255, 255, 255, 0.4)',
                              borderRadius: 12,
                              paddingVertical: 14,
                              alignItems: 'center',
                              justifyContent: 'center',
                            }}
                          >
                            <Text className="text-white text-2xl text-center font-semibold">
                              {digit}
                            </Text>
                          </View>
                        ))}
                      </View>
                    </Pressable>

                    {otpError ? (
                      <Text className="text-red-400 text-sm">{otpError}</Text>
                    ) : null}
                  </View>

                  {/* Resend Timer */}
                  <View className="items-center py-1">
                    {resendTimer > 0 ? (
                      <Text className="text-neutral-400 text-sm">
                        Resend code in{' '}
                        <Text className="text-orange-500 font-semibold">
                          {resendTimer}s
                        </Text>
                      </Text>
                    ) : (
                      <Pressable
                        onPress={() => {
                          setOtpCode('');
                          setOtpDigits(['', '', '', '', '', '']);
                          setOtpError('');
                          handleForgotPasswordEmail();
                        }}
                        disabled={isVerifyingOtp || sendingOtp}
                      >
                        <Text className="text-neutral-400 text-center text-sm">
                          Didn't receive code?{' '}
                          <Text className="text-orange-500 font-semibold">
                            Send Again
                          </Text>
                        </Text>
                      </Pressable>
                    )}
                  </View>
                </Animated.View>
              ) : null}

              {/* SCREEN 3: New Password - Password Fields */}
              {authMode === 'new-password' ? (
                <Animated.View
                  entering={FadeInDown.duration(300)}
                  className="gap-4"
                >
                  {/* Success Banner */}
                  <Animated.View
                    entering={FadeInDown.duration(300)}
                    className="rounded-2xl p-4 flex-row items-center gap-3 mb-2"
                    style={{
                      backgroundColor: 'rgba(16, 185, 129, 0.15)',
                      borderWidth: 1,
                      borderColor: 'rgba(16, 185, 129, 0.3)',
                    }}
                  >
                    <CheckCircle size={20} color="#10B981" />
                    <Text className="text-green-400 font-semibold flex-1">
                      Verification successful!
                    </Text>
                  </Animated.View>

                  {/* New Password */}
                  <View
                    className="rounded-2xl p-4 flex-row items-center"
                    style={{
                      backgroundColor: 'rgba(255, 255, 255, 0.08)',
                      borderWidth: 1,
                      borderColor: resetErrors.password
                        ? 'rgba(239, 68, 68, 0.5)'
                        : 'rgba(255, 255, 255, 0.1)',
                    }}
                  >
                    <Lock size={18} color="#9CA3AF" />
                    <TextInput
                      placeholder="New password (min 6 characters)"
                      placeholderTextColor="#FFFFFF"
                      value={resetPassword}
                      onChangeText={(text) => {
                        setResetPassword(text);
                        setResetPasswordStrength(calculatePasswordStrength(text));
                      }}
                      className="flex-1 ml-3 text-white text-base"
                      secureTextEntry={!showPassword}
                      editable={!isResettingPassword}
                    />
                    <Pressable
                      onPress={() => setShowPassword(!showPassword)}
                      disabled={isResettingPassword}
                    >
                      {showPassword ? (
                        <EyeOff size={18} color="#9CA3AF" />
                      ) : (
                        <Eye size={18} color="#9CA3AF" />
                      )}
                    </Pressable>
                  </View>

                  {resetErrors.password ? (
                    <Text className="text-red-500 text-sm ml-1">{resetErrors.password}</Text>
                  ) : null}

                  {/* Confirm Password */}
                  <View
                    className="rounded-2xl p-4 flex-row items-center"
                    style={{
                      backgroundColor: 'rgba(255, 255, 255, 0.08)',
                      borderWidth: 1,
                      borderColor: resetErrors.confirmPassword
                        ? 'rgba(239, 68, 68, 0.5)'
                        : 'rgba(255, 255, 255, 0.1)',
                    }}
                  >
                    <Lock size={18} color="#9CA3AF" />
                    <TextInput
                      placeholder="Confirm new password"
                      placeholderTextColor="#FFFFFF"
                      value={resetConfirmPassword}
                      onChangeText={setResetConfirmPassword}
                      className="flex-1 ml-3 text-white text-base"
                      secureTextEntry={!showPassword2}
                      editable={!isResettingPassword}
                    />
                    <Pressable
                      onPress={() => setShowPassword2(!showPassword2)}
                      disabled={isResettingPassword}
                    >
                      {showPassword2 ? (
                        <EyeOff size={18} color="#9CA3AF" />
                      ) : (
                        <Eye size={18} color="#9CA3AF" />
                      )}
                    </Pressable>
                  </View>

                  {resetErrors.confirmPassword ? (
                    <Text className="text-red-500 text-sm ml-1">{resetErrors.confirmPassword}</Text>
                  ) : null}
                </Animated.View>
              ) : null}

              {/* SCREEN 4: Success - Password Updated */}
              {authMode === 'success' ? (
                <Animated.View
                  entering={FadeInDown.duration(300)}
                  className="gap-4 items-center py-12"
                >
                  {/* Success Icon */}
                  <View
                    className="w-20 h-20 rounded-full items-center justify-center"
                    style={{ backgroundColor: 'rgba(16, 185, 129, 0.1)' }}
                  >
                    <CheckCircle size={40} color="#10B981" />
                  </View>

                  {/* Success Message */}
                  <Text className="text-white text-2xl font-bold text-center">
                    Password Updated!
                  </Text>
                  <Text className="text-neutral-400 text-center">
                    Redirecting you to sign in...
                  </Text>
                </Animated.View>
              ) : null}

              {/* OAuth Buttons - Show for signup/signin (before form divider) */}
              {authMode !== 'otp' && authMode !== 'otp-reset' && authMode !== 'forgot-password' && authMode !== 'new-password' && authMode !== 'success' ? (
                <Animated.View
                  entering={FadeInDown.delay(200).duration(500)}
                  className="gap-3 mb-6"
                >
                  {/* Google */}
                  <Pressable
                    onPress={() => handleOAuth('google')}
                    disabled={isLoading}
                    className="flex-row items-center justify-center py-3 rounded-full gap-3"
                    style={{
                      backgroundColor: '#FFFFFF',
                      opacity: isLoading ? 0.6 : 1,
                    }}
                  >
                    <RNImage
                      source={require('./google-icon.png')}
                      style={{
                        width: 20,
                        height: 20,
                        resizeMode: 'contain',
                      }}
                    />
                    <Text className="text-neutral-800 font-semibold text-base">
                      Continue with Google
                    </Text>
                  </Pressable>

                  {/* Apple */}
                  <Pressable
                    onPress={() => handleOAuth('apple')}
                    disabled={isLoading}
                    className="flex-row items-center justify-center py-3 rounded-full gap-3"
                    style={{
                      backgroundColor: 'rgba(0, 0, 0, 0.5)',
                      borderWidth: 1,
                      borderColor: 'rgba(255, 255, 255, 0.3)',
                      opacity: isLoading ? 0.6 : 1,
                    }}
                  >
                    <RNImage
                      source={require('./apple-icon.png')}
                      style={{
                        width: 20,
                        height: 20,
                        resizeMode: 'contain',
                      }}
                    />
                    <Text className="text-white font-semibold text-base">
                      Continue with Apple
                    </Text>
                  </Pressable>
                </Animated.View>
              ) : null}

              {/* Divider */}
              {authMode !== 'otp' && authMode !== 'forgot-password' && authMode !== 'otp-reset' && authMode !== 'new-password' && authMode !== 'success' ? (
                <Animated.View
                  entering={FadeInDown.delay(250).duration(500)}
                  className="flex-row items-center my-6"
                >
                  <View
                    className="flex-1 h-px"
                    style={{ backgroundColor: 'rgba(255,255,255,0.1)' }}
                  />
                  <Text className="text-neutral-500 mx-4 text-sm">or</Text>
                  <View
                    className="flex-1 h-px"
                    style={{ backgroundColor: 'rgba(255,255,255,0.1)' }}
                  />
                </Animated.View>
              ) : null}

              {/* Signup/Signin Form */}
              {authMode !== 'otp' && authMode !== 'forgot-password' && authMode !== 'otp-reset' && authMode !== 'new-password' && authMode !== 'success' ? (
                <Animated.View
                  entering={FadeInDown.delay(300).duration(500)}
                  className="gap-4 mb-4"
                >
                  {/* Full Name - Sign Up Only */}
                  {authMode === 'signup' ? (
                    <View>
                      <Text className="text-neutral-400 text-sm mb-2 ml-1">
                        Full Name
                      </Text>
                      <View
                        className="flex-row items-center px-4 py-4 rounded-2xl"
                        style={{
                          backgroundColor: 'rgba(255, 255, 255, 0.08)',
                          borderWidth: 1,
                          borderColor: formErrors.fullName
                            ? 'rgba(239, 68, 68, 0.5)'
                            : 'rgba(255, 255, 255, 0.1)',
                        }}
                      >
                        <User size={20} color="#737373" />
                        <TextInput
                          placeholder="Enter your full name"
                          placeholderTextColor="#525252"
                          value={formData.fullName}
                          onChangeText={(text) => updateFormData('fullName', text)}
                          className="flex-1 ml-3 text-white text-base"
                          autoCapitalize="words"
                          editable={!isLoading && !sendingOtp}
                        />
                      </View>
                      {formErrors.fullName ? (
                        <Text className="text-red-500 text-xs mt-2 ml-1">
                          {formErrors.fullName}
                        </Text>
                      ) : null}
                    </View>
                  ) : null}

                  {/* Email */}
                  <View>
                    <Text className="text-neutral-400 text-sm mb-2 ml-1">Email</Text>
                    <View
                      className="flex-row items-center px-4 py-4 rounded-2xl"
                      style={{
                        backgroundColor: 'rgba(255, 255, 255, 0.08)',
                        borderWidth: 1,
                        borderColor: formErrors.email
                          ? 'rgba(239, 68, 68, 0.5)'
                          : 'rgba(255, 255, 255, 0.1)',
                      }}
                    >
                      <Mail size={20} color="#737373" />
                      <TextInput
                        placeholder="Enter your email"
                        placeholderTextColor="#525252"
                        value={formData.email}
                        onChangeText={(text) => updateFormData('email', text)}
                        className="flex-1 ml-3 text-white text-base"
                        keyboardType="email-address"
                        autoCapitalize="none"
                        autoCorrect={false}
                        editable={!isLoading && !sendingOtp}
                      />
                    </View>
                    {formErrors.email ? (
                      <Text className="text-red-500 text-xs mt-2 ml-1">
                        {formErrors.email}
                      </Text>
                    ) : null}
                  </View>

                  {/* Password */}
                  <View>
                    <Text className="text-neutral-400 text-sm mb-2 ml-1">
                      Password
                    </Text>
                    <View
                      className="flex-row items-center px-4 py-4 rounded-2xl"
                      style={{
                        backgroundColor: 'rgba(255, 255, 255, 0.08)',
                        borderWidth: 1,
                        borderColor: formErrors.password
                          ? 'rgba(239, 68, 68, 0.5)'
                          : 'rgba(255, 255, 255, 0.1)',
                      }}
                    >
                      <Lock size={20} color="#737373" />
                      <TextInput
                        placeholder={
                          authMode === 'signup'
                            ? 'Create a password'
                            : 'Enter your password'
                        }
                        placeholderTextColor="#525252"
                        value={formData.password}
                        onChangeText={(text) => updateFormData('password', text)}
                        className="flex-1 ml-3 text-white text-base"
                        secureTextEntry={!showPassword}
                        autoCapitalize="none"
                        editable={!isLoading && !sendingOtp}
                      />
                      <Pressable
                        onPress={() => setShowPassword(!showPassword)}
                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                      >
                        {showPassword ? (
                          <EyeOff size={20} color="#737373" />
                        ) : (
                          <Eye size={20} color="#737373" />
                        )}
                      </Pressable>
                    </View>
                    {formErrors.password ? (
                      <Text className="text-red-500 text-xs mt-2 ml-1">
                        {formErrors.password}
                      </Text>
                    ) : null}
                  </View>

                  {/* Password Strength Indicator - Sign Up Only */}
                  {authMode === 'signup' && formData.password ? (
                    <View className="flex-row gap-2 mt-2">
                      {[0, 1, 2, 3].map((i) => (
                        <View
                          key={i}
                          className="flex-1 h-1 rounded-full"
                          style={{
                            backgroundColor:
                              i < passwordStrength
                                ? passwordStrength === 1
                                  ? '#EF4444'
                                  : passwordStrength === 2
                                    ? '#F97316'
                                    : passwordStrength === 3
                                      ? '#EAB308'
                                      : '#10B981'
                                : 'rgba(255, 255, 255, 0.1)',
                          }}
                        />
                      ))}
                    </View>
                  ) : null}

                  {/* Phone - Sign Up Only */}
                  {authMode === 'signup' ? (
                    <View>
                      <Text className="text-neutral-400 text-sm mb-2 ml-1">
                        Phone Number
                      </Text>
                      <View className="flex-row gap-2">
                        {/* Country Code Selector */}
                        <Pressable
                          onPress={() => setShowCountryCodes(!showCountryCodes)}
                          style={{
                            backgroundColor: 'rgba(255, 255, 255, 0.08)',
                            borderWidth: 1,
                            borderColor: 'rgba(255, 255, 255, 0.1)',
                          }}
                          className="px-3 py-4 rounded-2xl justify-center items-center w-20"
                        >
                          <Text className="text-white font-medium text-sm">
                            {formData.countryCode}
                          </Text>
                        </Pressable>

                        {/* Phone Input */}
                        <View
                          className="flex-1 flex-row items-center px-4 py-4 rounded-2xl"
                          style={{
                            backgroundColor: 'rgba(255, 255, 255, 0.08)',
                            borderWidth: 1,
                            borderColor: formErrors.phone
                              ? 'rgba(239, 68, 68, 0.5)'
                              : 'rgba(255, 255, 255, 0.1)',
                          }}
                        >
                          <Phone size={20} color="#737373" />
                          <TextInput
                            placeholder="123 456 7890"
                            placeholderTextColor="#525252"
                            value={formData.phone}
                            onChangeText={(text) => updateFormData('phone', text.replace(/\D/g, ''))}
                            className="flex-1 ml-3 text-white text-base"
                            keyboardType="phone-pad"
                            editable={!isLoading && !sendingOtp}
                          />
                        </View>
                      </View>

                      {/* Country Code Dropdown */}
                      {showCountryCodes ? (
                        <View
                          className="mt-2 rounded-2xl overflow-hidden"
                          style={{
                            backgroundColor: 'rgba(255, 255, 255, 0.08)',
                            borderWidth: 1,
                            borderColor: 'rgba(255, 255, 255, 0.1)',
                          }}
                        >
                          {COUNTRY_CODES.map((item) => (
                            <Pressable
                              key={item.code}
                              onPress={() => {
                                updateFormData('countryCode', item.code);
                                setShowCountryCodes(false);
                              }}
                              className="px-4 py-3 flex-row justify-between items-center border-b"
                              style={{ borderColor: 'rgba(255, 255, 255, 0.05)' }}
                            >
                              <Text className="text-white">{item.country}</Text>
                              <Text className="text-neutral-400">{item.code}</Text>
                            </Pressable>
                          ))}
                        </View>
                      ) : null}

                      {formErrors.phone ? (
                        <Text className="text-red-500 text-xs mt-2 ml-1">
                          {formErrors.phone}
                        </Text>
                      ) : null}
                    </View>
                  ) : null}

                  {/* Gender - Sign Up Only */}
                  {authMode === 'signup' ? (
                    <View>
                      <Text className="text-neutral-400 text-sm mb-2 ml-1">Gender</Text>
                      <View className="flex-row gap-3">
                        {(['male', 'female', 'other'] as const).map((option) => (
                          <Pressable
                            key={option}
                            onPress={() => updateFormData('gender', option)}
                            className="flex-1 py-3 px-4 rounded-2xl items-center"
                            style={{
                              backgroundColor:
                                formData.gender === option
                                  ? '#FA5610'
                                  : 'rgba(255, 255, 255, 0.08)',
                              borderWidth: 1,
                              borderColor:
                                formData.gender === option
                                  ? '#FA5610'
                                  : 'rgba(255, 255, 255, 0.1)',
                            }}
                          >
                            <Text
                              className="text-white font-medium capitalize"
                              style={{
                                color: formData.gender === option ? '#FFFFFF' : '#D1D5DB',
                              }}
                            >
                              {option}
                            </Text>
                          </Pressable>
                        ))}
                      </View>
                      {formErrors.gender ? (
                        <Text className="text-red-500 text-xs mt-2 ml-1">
                          {formErrors.gender}
                        </Text>
                      ) : null}
                    </View>
                  ) : null}

                  {/* Location Section - Sign Up Only */}
                  {authMode === 'signup' ? (
                    <View className="mt-2">
                      <Text className="text-neutral-400 text-sm mb-2 ml-1">Location</Text>

                      {/* Country Selector */}
                      <View>
                        <Pressable
                          onPress={() => setShowCountries(!showCountries)}
                          style={{
                            backgroundColor: 'rgba(255, 255, 255, 0.08)',
                            borderWidth: 1,
                            borderColor: formErrors.country
                              ? 'rgba(239, 68, 68, 0.5)'
                              : 'rgba(255, 255, 255, 0.1)',
                          }}
                          className="flex-row items-center px-4 py-4 rounded-2xl"
                        >
                          <Globe size={20} color="#737373" />
                          <Text className="flex-1 ml-3 text-white">
                            {formData.country || 'Select country'}
                          </Text>
                        </Pressable>

                        {/* Countries Dropdown */}
                        {showCountries ? (
                          <View
                            className="mt-2 rounded-2xl overflow-hidden max-h-48"
                            style={{
                              backgroundColor: 'rgba(255, 255, 255, 0.08)',
                              borderWidth: 1,
                              borderColor: 'rgba(255, 255, 255, 0.1)',
                            }}
                          >
                            {COUNTRIES.map((country) => (
                              <Pressable
                                key={country}
                                onPress={() => {
                                  updateFormData('country', country);
                                  updateFormData('city', '');
                                  setShowCountries(false);
                                }}
                                className="px-4 py-3 border-b"
                                style={{ borderColor: 'rgba(255, 255, 255, 0.05)' }}
                              >
                                <Text className="text-white">{country}</Text>
                              </Pressable>
                            ))}
                          </View>
                        ) : null}

                        {formErrors.country ? (
                          <Text className="text-red-500 text-xs mt-2 ml-1">
                            {formErrors.country}
                          </Text>
                        ) : null}
                      </View>

                      {/* City Selector */}
                      {formData.country && availableCities.length > 0 ? (
                        <View className="mt-3">
                          <Pressable
                            onPress={() => setShowCities(!showCities)}
                            style={{
                              backgroundColor: 'rgba(255, 255, 255, 0.08)',
                              borderWidth: 1,
                              borderColor: formErrors.city
                                ? 'rgba(239, 68, 68, 0.5)'
                                : 'rgba(255, 255, 255, 0.1)',
                            }}
                            className="flex-row items-center px-4 py-4 rounded-2xl"
                          >
                            <MapPin size={20} color="#737373" />
                            <Text className="flex-1 ml-3 text-white">
                              {formData.city || 'Select city'}
                            </Text>
                          </Pressable>

                          {/* Cities Dropdown */}
                          {showCities ? (
                            <View
                              className="mt-2 rounded-2xl overflow-hidden"
                              style={{
                                backgroundColor: 'rgba(255, 255, 255, 0.08)',
                                borderWidth: 1,
                                borderColor: 'rgba(255, 255, 255, 0.1)',
                              }}
                            >
                              {availableCities.map((city) => (
                                <Pressable
                                  key={city}
                                  onPress={() => {
                                    updateFormData('city', city);
                                    setShowCities(false);
                                  }}
                                  className="px-4 py-3 border-b"
                                  style={{ borderColor: 'rgba(255, 255, 255, 0.05)' }}
                                >
                                  <Text className="text-white">{city}</Text>
                                </Pressable>
                              ))}
                            </View>
                          ) : null}

                          {formErrors.city ? (
                            <Text className="text-red-500 text-xs mt-2 ml-1">
                              {formErrors.city}
                            </Text>
                          ) : null}
                        </View>
                      ) : null}

                      {/* Remote Toggle */}
                      <Pressable
                        onPress={() => updateFormData('remote', !formData.remote)}
                        style={{
                          backgroundColor: formData.remote
                            ? 'rgba(16, 185, 129, 0.2)'
                            : 'rgba(255, 255, 255, 0.08)',
                          borderWidth: 1,
                          borderColor: formData.remote
                            ? 'rgba(16, 185, 129, 0.3)'
                            : 'rgba(255, 255, 255, 0.1)',
                        }}
                        className="mt-3 flex-row items-center px-4 py-4 rounded-2xl"
                      >
                        <View
                          className="w-5 h-5 rounded-md mr-3 items-center justify-center"
                          style={{
                            backgroundColor: formData.remote ? '#10B981' : 'transparent',
                            borderWidth: 2,
                            borderColor: formData.remote ? '#10B981' : 'rgba(255, 255, 255, 0.3)',
                          }}
                        >
                          {formData.remote ? <Text className="text-white text-xs font-bold">✓</Text> : null}
                        </View>
                        <Text className="text-white flex-1">🌐 Remote / Work from Anywhere</Text>
                      </Pressable>
                    </View>
                  ) : null}
                </Animated.View>
              ) : null}

              {/* Sign In Forgot Password */}
              {authMode === 'signin' ? (
                <Animated.View
                  entering={FadeInDown.delay(350).duration(500)}
                  className="mb-6"
                >
                  <Pressable onPress={() => setAuthMode('forgot-password')} className="self-end">
                    <Text className="text-orange-500 text-sm font-medium">
                      Forgot Password?
                    </Text>
                  </Pressable>
                </Animated.View>
              ) : null}

              {/* Submit Button */}
              <Animated.View
                entering={FadeInDown.delay(400).duration(500)}
                className="mt-4"
              >
                <Pressable
                  onPress={() => {
                    if (authMode === 'otp') {
                      handleVerifyOtp();
                    } else if (authMode === 'forgot-password') {
                      handleForgotPasswordEmail();
                    } else if (authMode === 'otp-reset') {
                      handleVerifyOtpForReset();
                    } else if (authMode === 'new-password') {
                      handleResetPassword();
                    } else {
                      handleSubmit();
                    }
                  }}
                  disabled={
                    isProcessing ||
                    (authMode === 'otp' && otpDigits.join('').length !== 6) ||
                    (authMode === 'otp-reset' && otpDigits.join('').length !== 6) ||
                    (authMode === 'forgot-password' && !resetEmail.trim()) ||
                    (authMode === 'new-password' && (resetPassword.length < 6 || resetPassword !== resetConfirmPassword)) ||
                    isLoading ||
                    sendingOtp ||
                    isVerifyingOtp ||
                    isResettingPassword
                  }
                  className="py-4 rounded-2xl items-center flex-row justify-center"
                  style={{
                    backgroundColor:
                      isProcessing || isLoading || sendingOtp || isVerifyingOtp || isResettingPassword
                        ? 'rgba(250, 86, 16, 0.5)'
                        : '#FA5610',
                  }}
                >
                  {isProcessing || isVerifyingOtp ? (
                    <>
                      <ActivityIndicator size="small" color="#FFFFFF" />
                      <Text className="text-white font-semibold text-base ml-2">
                        {isCompletingSignup ? 'Creating Account...' : 'Verifying...'}
                      </Text>
                    </>
                  ) : isLoading || sendingOtp ? (
                    <>
                      <ActivityIndicator size="small" color="#FFFFFF" />
                      <Text className="text-white font-semibold text-base ml-2">
                        {authMode === 'signup'
                          ? 'Creating Account...'
                          : authMode === 'forgot-password'
                            ? 'Sending...'
                            : 'Signing In...'}
                      </Text>
                    </>
                  ) : isResettingPassword ? (
                    <>
                      <ActivityIndicator size="small" color="#FFFFFF" />
                      <Text className="text-white font-semibold text-base ml-2">
                        Updating...
                      </Text>
                    </>
                  ) : (
                    <Text className="text-white font-semibold text-base">
                      {authMode === 'otp'
                        ? 'Verify Code'
                        : authMode === 'forgot-password'
                          ? 'Send Verification Code'
                          : authMode === 'otp-reset'
                            ? 'Verify Code'
                            : authMode === 'new-password'
                              ? 'Update Password'
                              : authMode === 'signup'
                                ? 'Create Account'
                                : 'Sign In'}
                    </Text>
                  )}
                </Pressable>
              </Animated.View>

              {/* Toggle Auth Mode */}
              <Animated.View
                entering={FadeInDown.delay(450).duration(500)}
                className="mt-8 mb-4"
              >
                {authMode === 'forgot-password' ? (
                  <Pressable
                    onPress={() => {
                      setAuthMode('signin');
                      setResetEmail('');
                      setResetErrors({});
                    }}
                    disabled={sendingOtp}
                    className="py-4"
                  >
                    <Text className="text-neutral-400 text-center text-sm">
                      Remember your password?{' '}
                      <Text className="text-orange-500 font-semibold">Sign in</Text>
                    </Text>
                  </Pressable>
                ) : authMode === 'otp-reset' || authMode === 'new-password' ? (
                  <Pressable
                    onPress={() => {
                      setAuthMode('signin');
                      setResetEmail('');
                      setResetPassword('');
                      setResetConfirmPassword('');
                      setResetPasswordStrength(0);
                      setResetPasswordVerified(false);
                      setOtpCode('');
                      setOtpDigits(['', '', '', '', '', '']);
                      setOtpError('');
                      setResetErrors({});
                    }}
                    disabled={isVerifyingOtp || isResettingPassword}
                    className="py-4"
                  >
                    <Text className="text-neutral-400 text-center text-sm">
                      Remember your password?{' '}
                      <Text className="text-orange-500 font-semibold">Sign in</Text>
                    </Text>
                  </Pressable>
                ) : (
                  <Pressable
                    onPress={() => {
                      setAuthMode('signup');
                      clearError();
                      setFormErrors({});
                    }}
                    disabled={isLoading || sendingOtp}
                    className="py-4"
                  >
                    <Text className="text-neutral-400 text-center text-sm">
                      Don't have an account?{' '}
                      <Text className="text-orange-500 font-semibold">Sign Up</Text>
                    </Text>
                  </Pressable>
                )}
              </Animated.View>

              {/* Terms */}
              {authMode === 'signup' ? (
                <Animated.View
                  entering={FadeInDown.delay(500).duration(500)}
                  className="mt-2"
                >
                  <Text className="text-neutral-500 text-xs text-center leading-5">
                    By signing up, you agree to our{' '}
                    <Pressable onPress={() => router.push('/terms')}>
                      <Text className="text-neutral-400 underline">
                        Terms of Service
                      </Text>
                    </Pressable>
                    {' '}and{' '}
                    <Pressable onPress={() => router.push('/privacy')}>
                      <Text className="text-neutral-400 underline">
                        Privacy Policy
                      </Text>
                    </Pressable>
                  </Text>
                </Animated.View>
              ) : null}
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </LinearGradient>
    </View>
  );
}
