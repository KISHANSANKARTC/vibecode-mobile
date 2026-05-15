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
  Globe,
  CheckCircle,
  Chrome,
  Apple,
  Upload,
} from 'lucide-react-native';
import Animated, { FadeInDown, FadeIn, FadeOut } from 'react-native-reanimated';
import * as ImagePicker from 'expo-image-picker';
import { useAuthStore, type UserRole } from '@/lib/state/auth-store';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { api } from '@/lib/api/api';
import { extractErrorMessage } from '@/lib/errorUtils';

type AuthMode = 'signup' | 'signin' | 'otp' | 'forgot-password' | 'success';

interface ClientFormData {
  accountType: 'individual' | 'company';
  fullName: string;
  email: string;
  password: string;
  phone: string;
  countryCode: string;
  country: string;
  industry: string | null;
  avatarFile: any;
}

interface FormErrors {
  email?: string;
  password?: string;
  fullName?: string;
  phone?: string;
  country?: string;
  avatar?: string;
  general?: string;
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

// Countries with currency codes
const COUNTRIES_WITH_CURRENCY = [
  { name: 'United States', code: 'USD' },
  { name: 'United Kingdom', code: 'GBP' },
  { name: 'India', code: 'INR' },
  { name: 'United Arab Emirates', code: 'AED' },
  { name: 'Saudi Arabia', code: 'SAR' },
  { name: 'Morocco', code: 'MAD' },
  { name: 'Nigeria', code: 'NGN' },
  { name: 'South Africa', code: 'ZAR' },
  { name: 'Canada', code: 'CAD' },
  { name: 'Australia', code: 'AUD' },
];

const INDUSTRIES = [
  'Fashion',
  'Advertising',
  'Marketing',
  'Creative Agency',
  'Production House',
  'E-commerce',
  'Events',
  'Media & Production',
  'Other',
];

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

const getPasswordStrengthColor = (index: number, strength: number): string => {
  if (index >= strength) {
    return 'rgba(255, 255, 255, 0.1)';
  }
  if (index < 2) {
    return '#F97316';
  }
  if (index < 3) {
    return '#EAB308';
  }
  return '#22C55E';
};

export default function ClientAuthScreen() {
  const { role } = useLocalSearchParams<{ role: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [authMode, setAuthMode] = useState<AuthMode>('signup');
  const [showPassword, setShowPassword] = useState(false);
  const [otpDigits, setOtpDigits] = useState<string[]>(['', '', '', '', '', '']);
  const [resendTimer, setResendTimer] = useState(30);
  const [sendingOtp, setSendingOtp] = useState(false);
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);
  const [isCompletingSignup, setIsCompletingSignup] = useState(false);
  const [showCountryCodes, setShowCountryCodes] = useState(false);
  const [showCountries, setShowCountries] = useState(false);
  const [avatarPreviewUri, setAvatarPreviewUri] = useState<string | null>(null);
  const [otpError, setOtpError] = useState('');
  const otpInputRefs = useRef<Array<TextInput | null>>([]);

  const [formData, setFormData] = useState<ClientFormData>({
    accountType: 'company',
    fullName: '',
    email: '',
    password: '',
    phone: '',
    countryCode: '+971',
    country: 'United Arab Emirates',
    industry: null,
    avatarFile: null,
  });

  const [formErrors, setFormErrors] = useState<FormErrors>({});
  const [pendingSignup, setPendingSignup] = useState<ClientFormData | null>(null);
  const [passwordStrength, setPasswordStrength] = useState(0);

  // Sign-in state
  const [signInEmail, setSignInEmail] = useState('');
  const [signInPassword, setSignInPassword] = useState('');
  const [showSignInPassword, setShowSignInPassword] = useState(false);
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [signInError, setSignInError] = useState('');

  // Forgot password state
  const [resetEmail, setResetEmail] = useState('');
  const [resetSending, setResetSending] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const [resetError, setResetError] = useState('');

  const signUp = useAuthStore((s) => s.signUp);
  const signInWithGoogle = useAuthStore((s) => s.signInWithGoogle);
  const signInWithApple = useAuthStore((s) => s.signInWithApple);
  const setUserRole = useAuthStore((s) => s.setUserRole);
  const clearError = useAuthStore((s) => s.clearError);

  const isProcessing = isVerifyingOtp || isCompletingSignup;

  useEffect(() => {
    if (role === 'client') {
      setUserRole('client' as UserRole);
    }
    // Note: Local require() images are bundled at build time, no prefetch needed
  }, [role]);

  useEffect(() => {
    clearError();
    setFormErrors({});
  }, [authMode]);

  useEffect(() => {
    if (authMode !== 'otp') return;
    if (resendTimer <= 0) return;

    const timer = setInterval(() => {
      setResendTimer((prev) => Math.max(0, prev - 1));
    }, 1000);

    return () => clearInterval(timer);
  }, [authMode]);

  const updateFormData = (field: keyof ClientFormData, value: any) => {
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

    if (!formData.fullName.trim()) {
      errors.fullName = formData.accountType === 'company'
        ? 'Company name is required'
        : 'Full name is required';
    } else if (formData.fullName.trim().length < 2) {
      errors.fullName = 'Name must be at least 2 characters';
    }

    if (!formData.phone.trim()) {
      errors.phone = 'Phone number is required';
    }

    if (!formData.country) {
      errors.country = 'Country is required';
    }

    if (!formData.avatarFile) {
      errors.avatar = formData.accountType === 'company'
        ? 'Company logo is required'
        : 'Profile photo is required';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Check if form is valid WITHOUT setting state (safe to call during render)
  const isFormValid = (): boolean => {
    if (!formData.email.trim() || !isValidEmail(formData.email.trim())) return false;
    if (!formData.password || formData.password.length < 6) return false;
    if (!formData.fullName.trim() || formData.fullName.trim().length < 2) return false;
    if (!formData.phone.trim()) return false;
    if (!formData.country) return false;
    if (!formData.avatarFile) return false;
    return true;
  };

  const handlePickAvatar = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled) {
        const asset = result.assets[0];
        if (asset.uri) {
          setAvatarPreviewUri(asset.uri);
          updateFormData('avatarFile', {
            uri: asset.uri,
            name: asset.fileName || `avatar-${Date.now()}.jpg`,
            type: asset.type || 'image/jpeg',
          });
          setFormErrors((prev) => ({ ...prev, avatar: undefined }));
        }
      }
    } catch (err) {
      const errorMsg = extractErrorMessage(err);
      Alert.alert('Error', `Could not pick image: ${errorMsg}`);
    }
  };

  // Sign-in handler
  const handleSignIn = async () => {
    setSignInError('');
    if (!signInEmail.trim() || !signInPassword) {
      setSignInError('Please enter your email and password.');
      return;
    }
    if (!isValidEmail(signInEmail.trim())) {
      setSignInError('Please enter a valid email address.');
      return;
    }

    setIsSigningIn(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: signInEmail.trim().toLowerCase(),
        password: signInPassword,
      });

      if (error) {
        setSignInError(error.message === 'Invalid login credentials'
          ? 'Incorrect email or password. Please try again.'
          : extractErrorMessage(error));
      }
    } catch (err) {
      setSignInError(extractErrorMessage(err));
    } finally {
      setIsSigningIn(false);
    }
  };

  // Forgot password handler
  const handleForgotPassword = async () => {
    setResetError('');
    if (!resetEmail.trim()) {
      setResetError('Please enter your email address.');
      return;
    }
    if (!isValidEmail(resetEmail.trim())) {
      setResetError('Please enter a valid email address.');
      return;
    }

    setResetSending(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(
        resetEmail.trim().toLowerCase(),
        { redirectTo: 'engage://auth-callback' }
      );

      if (error) {
        setResetError(extractErrorMessage(error));
      } else {
        setResetSent(true);
      }
    } catch (err) {
      setResetError(extractErrorMessage(err));
    } finally {
      setResetSending(false);
    }
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

      console.log(`[OTP_SEND_START] requestId=${requestId} email=${normalizedEmail} accountType=${formData.accountType}`);

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

      if (data?.success === false && data?.code === 'EMAIL_EXISTS') {
        console.log(`[OTP_SEND_EMAIL_EXISTS] requestId=${requestId} email=${normalizedEmail} - allowing recovery flow`);
        setAuthMode('otp');
        setOtpDigits(['', '', '', '', '', '']);
        setResendTimer(30);
        setOtpError('');
        Alert.alert('OTP Sent', `A 6-digit code has been sent to ${normalizedEmail}`);
        return;
      }

      if (data?.success === true) {
        console.log(`[OTP_SEND_SUCCESS] requestId=${requestId} email=${normalizedEmail}`);
        setAuthMode('otp');
        setOtpDigits(['', '', '', '', '', '']);
        setResendTimer(30);
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

      let userId: string | null = null;

      // Step 1: Create the auth account
      console.log(`[SIGNUP_CREATE_AUTH] requestId=${requestId}`);
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email: normalizedEmail,
        password: pendingSignup.password,
        options: {
          data: { full_name: pendingSignup.fullName.trim() },
        },
      });

      if (signUpError) {
        // If "already registered", try signing in instead
        if (signUpError.message.toLowerCase().includes('already registered') ||
            signUpError.message.toLowerCase().includes('already exists')) {
          console.log(`[SIGNUP_RECOVERY] requestId=${requestId} account exists, attempting sign-in`);

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

          if (!signInData?.user?.id) {
            return {
              success: false,
              message: 'Account recovery failed. Please try signing in instead.',
            };
          }

          userId = signInData.user.id;
          console.log(`[SIGNUP_RECOVERY_SUCCESS] requestId=${requestId} userId=${userId}`);
        } else {
          console.log(`[SIGNUP_FAIL] requestId=${requestId} error=${signUpError.message}`);
          return {
            success: false,
            message: signUpError.message || 'Account creation failed.',
          };
        }
      } else {
        // SignUp succeeded
        if (signUpData?.user?.id) {
          userId = signUpData.user.id;
          console.log(`[SIGNUP_AUTH_CREATED] requestId=${requestId} userId=${userId}`);

          // If no session returned, sign in to get one
          if (!signUpData.session) {
            console.log(`[SIGNUP_NO_SESSION] requestId=${requestId} signing in to get session`);
            const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
              email: normalizedEmail,
              password: pendingSignup.password,
            });

            if (signInError) {
              console.log(`[SIGNUP_SESSION_FAIL] requestId=${requestId} sign-in failed: ${signInError.message}`);
              return {
                success: false,
                message: 'Account created but could not establish session. Please try signing in.',
              };
            }

            if (signInData?.user?.id) {
              userId = signInData.user.id;
            }
          }
        } else {
          return {
            success: false,
            message: 'Account creation failed. Please try again.',
          };
        }
      }

      if (!userId) {
        return {
          success: false,
          message: 'Account setup failed. Please try again.',
        };
      }

      // Step 2: NOW the user is authenticated, so we can insert the role
      console.log(`[SIGNUP_INSERT_ROLE] requestId=${requestId} userId=${userId}`);
      const { error: roleError } = await supabase
        .from('user_roles')
        .insert({ user_id: userId, role: 'client' });

      // Handle unique violation (role already exists) as success
      if (roleError && roleError.code !== '23505') {
        console.error(`[SIGNUP_ROLE_ERROR] requestId=${requestId}`, extractErrorMessage(roleError));
        return {
          success: false,
          message: 'Failed to set user role. Please try again.',
        };
      }
      console.log(`[SIGNUP_ROLE_DONE] requestId=${requestId}`);

      // Step 3: Update profile with phone
      if (pendingSignup.phone) {
        const cleanPhone = pendingSignup.phone.replace(/[\s\-\(\)]/g, '');
        console.log(`[SIGNUP_UPDATE_PROFILE] requestId=${requestId} phone=${cleanPhone}`);
        await supabase
          .from('profiles')
          .update({ phone: cleanPhone })
          .eq('id', userId);
      }

      // Step 4: Create client company record
      const countryData = COUNTRIES_WITH_CURRENCY.find(
        (c) => c.name === pendingSignup.country
      );
      const currency = countryData?.code || 'AED';

      console.log(`[SIGNUP_CREATE_COMPANY] requestId=${requestId}`);
      const { error: companyError } = await supabase
        .from('client_companies')
        .upsert(
          {
            user_id: userId,
            company_name: pendingSignup.fullName.trim(),
            account_type: pendingSignup.accountType === 'company' ? 'organization' : 'individual',
            country: pendingSignup.country,
            industry: pendingSignup.industry || null,
            currency,
          },
          { onConflict: 'user_id' }
        );

      if (companyError) {
        console.error(`[SIGNUP_COMPANY_ERROR] requestId=${requestId}`, extractErrorMessage(companyError));
        return {
          success: false,
          message: 'Failed to create company profile. Please try again.',
        };
      }

      // Step 5: Upload avatar if provided
      if (pendingSignup.avatarFile) {
        try {
          const avatarFileName = `client-avatars/${userId}/${Date.now()}-${pendingSignup.avatarFile.name}`;

          const { error: uploadError } = await supabase.storage
            .from('app-content')
            .upload(avatarFileName, {
              uri: pendingSignup.avatarFile.uri,
              type: pendingSignup.avatarFile.type,
              name: pendingSignup.avatarFile.name,
            } as any, {
              upsert: true,
            });

          if (!uploadError) {
            const { data: publicUrl } = supabase.storage
              .from('app-content')
              .getPublicUrl(avatarFileName);

            await supabase
              .from('client_companies')
              .update({ logo_url: publicUrl.publicUrl })
              .eq('user_id', userId);
          }
        } catch (uploadErr) {
          console.error(`[SIGNUP_AVATAR_ERROR] requestId=${requestId}`, extractErrorMessage(uploadErr));
        }
      }

      console.log(`[SIGNUP_COMPLETE] requestId=${requestId} email=${normalizedEmail}`);
      return { success: true };
    } catch (err) {
      console.error(`[SIGNUP_ERROR] requestId=${requestId}`, extractErrorMessage(err));
      const errorMsg = extractErrorMessage(err);
      return {
        success: false,
        message: errorMsg || 'Account creation failed. Please try again.',
      };
    }
  };

  const handleResendOtp = async () => {
    if (!pendingSignup) {
      Alert.alert('Error', 'Session expired. Please go back and try again.');
      return;
    }

    setOtpDigits(['', '', '', '', '', '']);
    setResendTimer(30);
    setOtpError('');
    setSendingOtp(true);

    try {
      const { data, error } = await supabase.functions.invoke('send-otp', {
        body: {
          email: pendingSignup.email.trim().toLowerCase(),
          name: pendingSignup.fullName.trim(),
          event: 'new_user',
        },
      });

      if (error) {
        Alert.alert('Error', 'Failed to resend OTP. Please try again.');
        return;
      }

      if (data?.success) {
        Alert.alert('OTP Sent', `A new 6-digit code has been sent to ${pendingSignup.email}`);
      } else {
        Alert.alert('Error', 'Failed to resend OTP. Please try again.');
      }
    } catch (err) {
      const errorMsg = extractErrorMessage(err);
      Alert.alert('Error', errorMsg);
    } finally {
      setSendingOtp(false);
    }
  };

  const handleVerifyOtp = async () => {
    const fullCode = otpDigits.join('');

    if (!fullCode || fullCode.length !== 6) {
      setOtpError('Please enter a 6-digit code');
      return;
    }

    if (!pendingSignup?.email) {
      setOtpError('Session expired. Please go back and try again.');
      return;
    }

    setIsVerifyingOtp(true);
    setOtpError('');

    try {
      const email = pendingSignup.email.trim().toLowerCase();
      console.log('[OTP_VERIFY_START] email=', email, 'otp=', fullCode);
      const { data, error } = await supabase.functions.invoke('verify-otp', {
        body: {
          email,
          otp: fullCode,
          event: 'new_user',
        },
      });

      console.log('[OTP_VERIFY_RESPONSE]', JSON.stringify(data, null, 2), error);

      if (error) {
        const message = error instanceof Error ? error.message : 'Verification failed. Please try again.';
        console.log('[OTP_VERIFY_FAIL] error:', message);
        setOtpError(message);
        setIsVerifyingOtp(false);
        return;
      }

      if (!data?.success) {
        const errorMsg = data?.message || 'Invalid OTP code';
        console.log('[OTP_VERIFY_FAIL]', errorMsg);
        setOtpError(errorMsg);
        setIsVerifyingOtp(false);
        return;
      }

      setIsCompletingSignup(true);
      const result = await handleCompleteSignup();

      if (result.success) {
        console.log('[SIGNUP_FLOW_COMPLETE] navigating to client-setup');
        setPendingSignup(null);
        setOtpDigits(['', '', '', '', '', '']);
        router.replace('/onboarding/client-setup');
      } else {
        Alert.alert('Error', result.message || 'Account creation failed');
        setAuthMode('otp');
      }
    } catch (err) {
      console.error('[OTP_VERIFY_ERROR]', extractErrorMessage(err));
      const errorMsg = extractErrorMessage(err);
      setOtpError(errorMsg || 'Verification failed. Please try again.');
    } finally {
      setIsVerifyingOtp(false);
      setIsCompletingSignup(false);
    }
  };

  const handleOtpDigitChange = (index: number, value: string) => {
    // Handle paste - if user pastes a full code, distribute across all boxes
    if (value.length > 1) {
      const digits = value.replace(/\D/g, '').slice(0, 6).split('');
      const newDigits = [...otpDigits];
      digits.forEach((digit, i) => {
        if (i < 6) newDigits[i] = digit;
      });
      setOtpDigits(newDigits);
      // Focus last filled box or last box
      const lastIndex = Math.min(digits.length - 1, 5);
      otpInputRefs.current[lastIndex]?.focus();
      return;
    }

    // Single digit input
    if (!/^\d?$/.test(value)) return;

    const newDigits = [...otpDigits];
    newDigits[index] = value;
    setOtpDigits(newDigits);

    if (value && index < 5) {
      otpInputRefs.current[index + 1]?.focus();
    }
  };

  const handleBackspace = (index: number) => {
    if (index > 0 && !otpDigits[index]) {
      otpInputRefs.current[index - 1]?.focus();
    }
  };

  if (authMode === 'success') {
    return (
      <View className="flex-1 bg-[#0A0A0A]">
        <LinearGradient
          colors={['rgba(26, 26, 26, 0.4)', 'rgba(10, 10, 10, 0.6)', 'rgba(10, 10, 10, 0.7)']}
          style={{ flex: 1 }}
        >
          <ScrollView
            contentContainerStyle={{
              flexGrow: 1,
              paddingTop: insets.top + 48,
              paddingBottom: insets.bottom + 24,
              paddingHorizontal: 24,
              justifyContent: 'center',
              alignItems: 'center',
            }}
            showsVerticalScrollIndicator={false}
          >
            <Animated.View
              entering={FadeInDown.delay(100).duration(600)}
              className="items-center"
            >
              <View className="w-20 h-20 rounded-full bg-orange-500 items-center justify-center mb-6">
                <CheckCircle size={48} color="#FFFFFF" strokeWidth={1.5} />
              </View>

              <Text className="text-2xl text-white text-center mb-3" style={{ fontWeight: '600' }}>
                Welcome!
              </Text>
              <Text className="text-neutral-400 text-center text-sm mb-8">
                Your account has been created successfully. Let's complete your profile.
              </Text>

              <Pressable
                onPress={() => router.replace('/(client)')}
                className="w-full py-4 rounded-2xl items-center justify-center"
                style={{ backgroundColor: '#F97316' }}
              >
                <Text className="text-white font-semibold text-base">Get Started</Text>
              </Pressable>
            </Animated.View>
          </ScrollView>
        </LinearGradient>
      </View>
    );
  }

  if (authMode === 'otp') {
    return (
      <View className="flex-1 bg-[#0A0A0A]">
        <LinearGradient
          colors={['rgba(26, 26, 26, 0.4)', 'rgba(10, 10, 10, 0.6)', 'rgba(10, 10, 10, 0.7)']}
          style={{ flex: 1 }}
        >
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={{ flex: 1 }}
          >
            <ScrollView
              contentContainerStyle={{
                flexGrow: 1,
                paddingTop: insets.top + 24,
                paddingBottom: insets.bottom + 24,
                paddingHorizontal: 24,
              }}
              showsVerticalScrollIndicator={false}
            >
              <Pressable
                onPress={() => {
                  setAuthMode('signup');
                  setPendingSignup(null);
                  setOtpDigits(['', '', '', '', '', '']);
                }}
                className="flex-row items-center mb-8"
              >
                <ChevronLeft size={24} color="#FFFFFF" />
                <Text className="text-white ml-2">Back</Text>
              </Pressable>

              <Animated.View entering={FadeInDown.delay(100).duration(600)} className="mb-8">
                <Text className="text-2xl text-white mb-2" style={{ fontWeight: '600' }}>
                  Verify Your Email
                </Text>
                <Text className="text-neutral-400 text-sm">
                  We've sent a 6-digit code to {pendingSignup?.email}
                </Text>
              </Animated.View>

              <Animated.View entering={FadeInDown.delay(200).duration(600)} className="mb-8">
                <View
                  style={{
                    flexDirection: 'row',
                    justifyContent: 'center',
                    alignItems: 'center',
                    width: '100%',
                  }}
                >
                  {otpDigits.map((digit, index) => (
                    <TextInput
                      key={index}
                      ref={(ref) => {
                        if (ref) otpInputRefs.current[index] = ref;
                      }}
                      maxLength={6}
                      keyboardType="number-pad"
                      value={digit}
                      onChangeText={(value) => handleOtpDigitChange(index, value)}
                      onKeyPress={({ nativeEvent }) => {
                        if (nativeEvent.key === 'Backspace') {
                          handleBackspace(index);
                        }
                      }}
                      style={{
                        width: 44,
                        height: 52,
                        marginHorizontal: 4,
                        borderRadius: 10,
                        backgroundColor: '#111',
                        borderWidth: 2,
                        borderColor: digit ? '#F97316' : '#444',
                        color: '#FFFFFF',
                        fontSize: 20,
                        fontWeight: 'bold',
                        textAlign: 'center',
                      }}
                      placeholderTextColor="rgba(255, 255, 255, 0.4)"
                    />
                  ))}
                </View>
              </Animated.View>

              {otpError ? (
                <Animated.View entering={FadeIn} className="flex-row mb-6 p-4 rounded-lg" style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)' }}>
                  <AlertCircle size={20} color="#EF4444" className="mr-3" />
                  <Text className="text-red-500 flex-1 text-sm">{otpError}</Text>
                </Animated.View>
              ) : null}

              <Pressable
                onPress={() => handleVerifyOtp()}
                disabled={isProcessing}
                className="w-full py-4 rounded-2xl items-center justify-center mb-6"
                style={{
                  backgroundColor: isProcessing ? 'rgba(249, 115, 22, 0.5)' : '#F97316',
                }}
              >
                {isProcessing ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text className="text-white font-semibold text-base">Verify Code</Text>
                )}
              </Pressable>

              <View className="items-center">
                {resendTimer > 0 ? (
                  <Text className="text-neutral-400 text-sm">
                    Resend code in {resendTimer}s
                  </Text>
                ) : (
                  <Pressable
                    onPress={handleResendOtp}
                    disabled={sendingOtp}
                  >
                    <Text className="text-orange-500 text-sm font-semibold">
                      {sendingOtp ? 'Sending...' : 'Resend Code'}
                    </Text>
                  </Pressable>
                )}
              </View>
            </ScrollView>
          </KeyboardAvoidingView>
        </LinearGradient>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-[#0A0A0A]">
      <LinearGradient
        colors={['rgba(26, 26, 26, 0.4)', 'rgba(10, 10, 10, 0.6)', 'rgba(10, 10, 10, 0.7)']}
        style={{ flex: 1 }}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1 }}
        >
          <ScrollView
            contentContainerStyle={{
              flexGrow: 1,
              paddingTop: insets.top + 24,
              paddingBottom: insets.bottom + 24,
              paddingHorizontal: 24,
            }}
            showsVerticalScrollIndicator={false}
          >
            <Pressable
              onPress={() => {
                if (authMode === 'signin' || authMode === 'forgot-password') {
                  setAuthMode('signup');
                  setSignInError('');
                  setResetError('');
                  setResetSent(false);
                } else {
                  router.back();
                }
              }}
              className="flex-row items-center mb-8"
            >
              <ChevronLeft size={24} color="#FFFFFF" />
              <Text className="text-white ml-2">Back</Text>
            </Pressable>

            {authMode === 'signin' ? (
              <Animated.View entering={FadeInDown.delay(50).duration(600)} className="items-center mb-6">
                <Text className="text-neutral-400 text-sm">
                  {"Don't have an account? "}
                  <Text onPress={() => { setAuthMode('signup'); setSignInError(''); }} className="text-orange-500 font-semibold">Sign up</Text>
                </Text>
              </Animated.View>
            ) : authMode === 'forgot-password' ? null : (
              <Animated.View entering={FadeInDown.delay(50).duration(600)} className="items-center mb-6">
                <Text className="text-neutral-400 text-sm">
                  {'Already have an account? '}
                  <Text onPress={() => setAuthMode('signin')} className="text-orange-500 font-semibold">Sign in</Text>
                </Text>
              </Animated.View>
            )}

            <Animated.View entering={FadeInDown.delay(100).duration(600)} className="mb-8">
              <Text className="text-3xl text-white mb-2" style={{ fontWeight: '700' }}>
                {authMode === 'signin' ? 'Welcome Back' : authMode === 'forgot-password' ? 'Reset Password' : 'Join as a Client'}
              </Text>
              <Text className="text-neutral-400 text-sm">
                {authMode === 'signin' ? 'Sign in to your client account' : authMode === 'forgot-password' ? 'Enter your email to receive a reset link' : 'Book creatives and manage your projects'}
              </Text>
            </Animated.View>

            {/* SIGN IN SCREEN */}
            {authMode === 'signin' ? (
              <>
                <Animated.View entering={FadeInDown.delay(200).duration(600)} className="mb-4">
                  <Text className="text-white text-sm font-semibold mb-2">Email *</Text>
                  <View
                    className="flex-row items-center px-4 py-3 rounded-xl"
                    style={{
                      backgroundColor: 'rgba(255, 255, 255, 0.08)',
                      borderWidth: 1,
                      borderColor: 'rgba(255, 255, 255, 0.2)',
                    }}
                  >
                    <Mail size={20} color="rgba(255, 255, 255, 0.5)" />
                    <TextInput
                      placeholder="your@email.com"
                      placeholderTextColor="rgba(255, 255, 255, 0.3)"
                      value={signInEmail}
                      onChangeText={setSignInEmail}
                      keyboardType="email-address"
                      autoCapitalize="none"
                      className="flex-1 text-white text-base ml-3"
                    />
                  </View>
                </Animated.View>

                <Animated.View entering={FadeInDown.delay(250).duration(600)} className="mb-2">
                  <Text className="text-white text-sm font-semibold mb-2">Password *</Text>
                  <View
                    className="flex-row items-center px-4 py-3 rounded-xl"
                    style={{
                      backgroundColor: 'rgba(255, 255, 255, 0.08)',
                      borderWidth: 1,
                      borderColor: 'rgba(255, 255, 255, 0.2)',
                    }}
                  >
                    <Lock size={20} color="rgba(255, 255, 255, 0.5)" />
                    <TextInput
                      placeholder="Enter your password"
                      placeholderTextColor="rgba(255, 255, 255, 0.3)"
                      value={signInPassword}
                      onChangeText={setSignInPassword}
                      secureTextEntry={!showSignInPassword}
                      className="flex-1 text-white text-base ml-3"
                    />
                    <Pressable onPress={() => setShowSignInPassword(!showSignInPassword)}>
                      {showSignInPassword ? (
                        <EyeOff size={20} color="rgba(255, 255, 255, 0.5)" />
                      ) : (
                        <Eye size={20} color="rgba(255, 255, 255, 0.5)" />
                      )}
                    </Pressable>
                  </View>
                </Animated.View>

                <Animated.View entering={FadeInDown.delay(300).duration(600)} className="mb-6">
                  <Pressable onPress={() => { setAuthMode('forgot-password'); setResetEmail(signInEmail); setResetError(''); setResetSent(false); }}>
                    <Text className="text-orange-500 text-sm font-semibold text-right">Forgot Password?</Text>
                  </Pressable>
                </Animated.View>

                {signInError ? (
                  <Animated.View entering={FadeIn.duration(300)} className="mb-4">
                    <View className="flex-row items-center px-4 py-3 rounded-xl" style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', borderWidth: 1, borderColor: 'rgba(239, 68, 68, 0.3)' }}>
                      <AlertCircle size={16} color="#EF4444" />
                      <Text className="text-red-400 text-sm ml-2 flex-1">{signInError}</Text>
                    </View>
                  </Animated.View>
                ) : null}

                <Animated.View entering={FadeInDown.delay(350).duration(600)} className="mb-4">
                  <Pressable
                    onPress={handleSignIn}
                    disabled={isSigningIn || !signInEmail.trim() || !signInPassword}
                    className="w-full py-4 rounded-2xl items-center justify-center"
                    style={{
                      backgroundColor: (!signInEmail.trim() || !signInPassword) ? 'rgba(249, 115, 22, 0.3)' : '#F97316',
                    }}
                  >
                    {isSigningIn ? (
                      <ActivityIndicator color="#FFFFFF" />
                    ) : (
                      <Text className="text-white font-semibold text-base">Sign In</Text>
                    )}
                  </Pressable>
                </Animated.View>
              </>
            ) : null}

            {/* FORGOT PASSWORD SCREEN */}
            {authMode === 'forgot-password' ? (
              <>
                {resetSent ? (
                  <Animated.View entering={FadeIn.duration(400)} className="items-center py-8">
                    <CheckCircle size={48} color="#22C55E" />
                    <Text className="text-white text-lg font-semibold mt-4">Check Your Email</Text>
                    <Text className="text-neutral-400 text-sm text-center mt-2 px-4">
                      {"We've sent a password reset link to "}
                      <Text className="text-orange-500 font-semibold">{resetEmail}</Text>
                      {". Check your inbox and follow the link to reset your password."}
                    </Text>
                    <Pressable
                      onPress={() => { setAuthMode('signin'); setResetSent(false); }}
                      className="mt-6 py-3 px-8 rounded-2xl"
                      style={{ backgroundColor: '#F97316' }}
                    >
                      <Text className="text-white font-semibold">Back to Sign In</Text>
                    </Pressable>
                  </Animated.View>
                ) : (
                  <>
                    <Animated.View entering={FadeInDown.delay(200).duration(600)} className="mb-4">
                      <Text className="text-white text-sm font-semibold mb-2">Email Address *</Text>
                      <View
                        className="flex-row items-center px-4 py-3 rounded-xl"
                        style={{
                          backgroundColor: 'rgba(255, 255, 255, 0.08)',
                          borderWidth: 1,
                          borderColor: resetError ? '#EF4444' : 'rgba(255, 255, 255, 0.2)',
                        }}
                      >
                        <Mail size={20} color="rgba(255, 255, 255, 0.5)" />
                        <TextInput
                          placeholder="your@email.com"
                          placeholderTextColor="rgba(255, 255, 255, 0.3)"
                          value={resetEmail}
                          onChangeText={(t) => { setResetEmail(t); setResetError(''); }}
                          keyboardType="email-address"
                          autoCapitalize="none"
                          className="flex-1 text-white text-base ml-3"
                        />
                      </View>
                      {resetError ? (
                        <Text className="text-red-500 text-xs mt-1">{resetError}</Text>
                      ) : null}
                    </Animated.View>

                    <Animated.View entering={FadeInDown.delay(300).duration(600)} className="mb-4">
                      <Pressable
                        onPress={handleForgotPassword}
                        disabled={resetSending || !resetEmail.trim()}
                        className="w-full py-4 rounded-2xl items-center justify-center"
                        style={{
                          backgroundColor: (!resetEmail.trim()) ? 'rgba(249, 115, 22, 0.3)' : '#F97316',
                        }}
                      >
                        {resetSending ? (
                          <ActivityIndicator color="#FFFFFF" />
                        ) : (
                          <Text className="text-white font-semibold text-base">Send Reset Link</Text>
                        )}
                      </Pressable>
                    </Animated.View>
                  </>
                )}
              </>
            ) : null}

            {/* SIGNUP SCREEN */}
            {authMode === 'signup' ? (
            <>
            <Animated.View entering={FadeInDown.delay(200).duration(600)} className="gap-3 mb-6">
              <Pressable
                onPress={() => signInWithGoogle('engage://auth-callback')}
                className="flex-row items-center justify-center py-3 rounded-2xl"
                style={{ backgroundColor: 'rgba(255, 255, 255, 0.08)', borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.2)' }}
              >
                <RNImage
                  source={require('./google-icon.png')}
                  style={{ width: 20, height: 20, marginRight: 10 }}
                />
                <Text className="text-white font-semibold">Sign up with Google</Text>
              </Pressable>

              <Pressable
                onPress={() => signInWithApple('engage://auth-callback')}
                className="flex-row items-center justify-center py-3 rounded-2xl"
                style={{ backgroundColor: 'rgba(255, 255, 255, 0.08)', borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.2)' }}
              >
                <Apple size={20} color="#FFFFFF" style={{ marginRight: 10 }} />
                <Text className="text-white font-semibold">Sign up with Apple</Text>
              </Pressable>
            </Animated.View>

            <Animated.View entering={FadeInDown.delay(250).duration(600)} className="flex-row items-center mb-6">
              <View className="flex-1 h-px" style={{ backgroundColor: 'rgba(255, 255, 255, 0.1)' }} />
              <Text className="text-neutral-500 text-xs px-3">or continue with email</Text>
              <View className="flex-1 h-px" style={{ backgroundColor: 'rgba(255, 255, 255, 0.1)' }} />
            </Animated.View>

            <Animated.View entering={FadeInDown.delay(300).duration(600)} className="mb-6">
              <Text className="text-white text-sm font-semibold mb-3">Account Type</Text>
              <View className="flex-row gap-3">
                <Pressable
                  onPress={() => updateFormData('accountType', 'company')}
                  className="flex-1 py-3 rounded-xl items-center justify-center border-2"
                  style={{
                    borderColor: formData.accountType === 'company' ? '#F97316' : 'rgba(255, 255, 255, 0.2)',
                    backgroundColor: formData.accountType === 'company' ? 'rgba(249, 115, 22, 0.1)' : 'transparent',
                  }}
                >
                  <Text
                    className={formData.accountType === 'company' ? 'text-orange-500 font-semibold' : 'text-neutral-400'}
                  >
                    Company
                  </Text>
                </Pressable>

                <Pressable
                  onPress={() => updateFormData('accountType', 'individual')}
                  className="flex-1 py-3 rounded-xl items-center justify-center border-2"
                  style={{
                    borderColor: formData.accountType === 'individual' ? '#F97316' : 'rgba(255, 255, 255, 0.2)',
                    backgroundColor: formData.accountType === 'individual' ? 'rgba(249, 115, 22, 0.1)' : 'transparent',
                  }}
                >
                  <Text
                    className={formData.accountType === 'individual' ? 'text-orange-500 font-semibold' : 'text-neutral-400'}
                  >
                    Individual
                  </Text>
                </Pressable>
              </View>
            </Animated.View>

            <Animated.View entering={FadeInDown.delay(350).duration(600)} className="mb-6">
              <Text className="text-white text-sm font-semibold mb-3">
                {formData.accountType === 'company' ? 'Company Logo *' : 'Profile Photo *'}
              </Text>

              <Pressable
                onPress={handlePickAvatar}
                className="border-2 border-dashed rounded-xl items-center justify-center py-8"
                style={{
                  borderColor: formErrors.avatar ? '#EF4444' : 'rgba(255, 255, 255, 0.2)',
                  backgroundColor: avatarPreviewUri ? 'transparent' : 'rgba(255, 255, 255, 0.05)',
                }}
              >
                {avatarPreviewUri ? (
                  <View className="items-center">
                    <RNImage
                      source={{ uri: avatarPreviewUri }}
                      style={{
                        width: 80,
                        height: 80,
                        borderRadius: 40,
                        marginBottom: 8,
                      }}
                    />
                    <Text className="text-orange-500 text-sm font-semibold">Change Image</Text>
                  </View>
                ) : (
                  <View className="items-center">
                    <Upload size={32} color="rgba(255, 255, 255, 0.5)" />
                    <Text className="text-white text-sm font-semibold mt-2">Upload Image</Text>
                    <Text className="text-neutral-500 text-xs mt-1">Tap to select from gallery</Text>
                  </View>
                )}
              </Pressable>

              {formErrors.avatar ? (
                <View className="flex-row mt-2 items-center">
                  <AlertCircle size={16} color="#EF4444" className="mr-2" />
                  <Text className="text-red-500 text-xs flex-1">{formErrors.avatar}</Text>
                </View>
              ) : null}
            </Animated.View>

            <Animated.View entering={FadeInDown.delay(400).duration(600)} className="mb-4">
              <Text className="text-white text-sm font-semibold mb-2">
                {formData.accountType === 'company' ? 'Company Name' : 'Full Name'} *
              </Text>
              <View
                className="flex-row items-center px-4 py-3 rounded-xl"
                style={{
                  backgroundColor: 'rgba(255, 255, 255, 0.08)',
                  borderWidth: 1,
                  borderColor: formErrors.fullName ? '#EF4444' : 'rgba(255, 255, 255, 0.2)',
                }}
              >
                <User size={20} color="rgba(255, 255, 255, 0.5)" className="mr-3" />
                <TextInput
                  placeholder={formData.accountType === 'company' ? 'Acme Inc.' : 'John Doe'}
                  placeholderTextColor="rgba(255, 255, 255, 0.4)"
                  value={formData.fullName}
                  onChangeText={(value) => updateFormData('fullName', value)}
                  className="flex-1 text-white text-base"
                  autoCapitalize="words"
                />
              </View>
              {formErrors.fullName ? (
                <Text className="text-red-500 text-xs mt-1">{formErrors.fullName}</Text>
              ) : null}
            </Animated.View>

            <Animated.View entering={FadeInDown.delay(450).duration(600)} className="mb-4">
              <Text className="text-white text-sm font-semibold mb-2">Phone Number *</Text>
              <View className="flex-row gap-2">
                <Pressable
                  onPress={() => setShowCountryCodes(!showCountryCodes)}
                  className="px-3 py-3 rounded-xl items-center justify-center"
                  style={{
                    backgroundColor: 'rgba(255, 255, 255, 0.08)',
                    borderWidth: 1,
                    borderColor: 'rgba(255, 255, 255, 0.2)',
                    width: 80,
                  }}
                >
                  <Text className="text-white font-semibold text-sm">{formData.countryCode}</Text>
                </Pressable>

                <View
                  className="flex-1 flex-row items-center px-4 py-3 rounded-xl"
                  style={{
                    backgroundColor: 'rgba(255, 255, 255, 0.08)',
                    borderWidth: 1,
                    borderColor: formErrors.phone ? '#EF4444' : 'rgba(255, 255, 255, 0.2)',
                  }}
                >
                  <Phone size={20} color="rgba(255, 255, 255, 0.5)" className="mr-3" />
                  <TextInput
                    placeholder="555 123 4567"
                    placeholderTextColor="rgba(255, 255, 255, 0.4)"
                    value={formData.phone}
                    onChangeText={(value) => updateFormData('phone', value)}
                    keyboardType="phone-pad"
                    className="flex-1 text-white text-base"
                  />
                </View>
              </View>

              {showCountryCodes ? (
                <View className="mt-2 bg-neutral-900 rounded-xl border border-neutral-800 max-h-40">
                  <ScrollView nestedScrollEnabled>
                    {COUNTRY_CODES.map((item) => (
                      <Pressable
                        key={item.code}
                        onPress={() => {
                          updateFormData('countryCode', item.code);
                          setShowCountryCodes(false);
                        }}
                        className="px-4 py-3 border-b border-neutral-800"
                        style={{
                          backgroundColor: formData.countryCode === item.code ? 'rgba(249, 115, 22, 0.2)' : 'transparent',
                        }}
                      >
                        <Text className={formData.countryCode === item.code ? 'text-orange-500 font-semibold' : 'text-white'}>
                          {item.code} {item.country}
                        </Text>
                      </Pressable>
                    ))}
                  </ScrollView>
                </View>
              ) : null}

              {formErrors.phone ? (
                <Text className="text-red-500 text-xs mt-1">{formErrors.phone}</Text>
              ) : null}
            </Animated.View>

            <Animated.View entering={FadeInDown.delay(500).duration(600)} className="mb-4">
              <Text className="text-white text-sm font-semibold mb-2">Country *</Text>
              <Pressable
                onPress={() => setShowCountries(!showCountries)}
                className="flex-row items-center px-4 py-3 rounded-xl"
                style={{
                  backgroundColor: 'rgba(255, 255, 255, 0.08)',
                  borderWidth: 1,
                  borderColor: formErrors.country ? '#EF4444' : 'rgba(255, 255, 255, 0.2)',
                }}
              >
                <Globe size={20} color="rgba(255, 255, 255, 0.5)" className="mr-3" />
                <Text className="flex-1 text-white text-base">{formData.country}</Text>
              </Pressable>

              {showCountries ? (
                <View className="mt-2 bg-neutral-900 rounded-xl border border-neutral-800 max-h-40">
                  <ScrollView nestedScrollEnabled>
                    {COUNTRIES_WITH_CURRENCY.map((item) => (
                      <Pressable
                        key={item.name}
                        onPress={() => {
                          updateFormData('country', item.name);
                          setShowCountries(false);
                        }}
                        className="px-4 py-3 border-b border-neutral-800"
                        style={{
                          backgroundColor: formData.country === item.name ? 'rgba(249, 115, 22, 0.2)' : 'transparent',
                        }}
                      >
                        <Text className={formData.country === item.name ? 'text-orange-500 font-semibold' : 'text-white'}>
                          {item.name} ({item.code})
                        </Text>
                      </Pressable>
                    ))}
                  </ScrollView>
                </View>
              ) : null}

              {formErrors.country ? (
                <Text className="text-red-500 text-xs mt-1">{formErrors.country}</Text>
              ) : null}
            </Animated.View>

            <Animated.View entering={FadeInDown.delay(550).duration(600)} className="mb-4">
              <Text className="text-white text-sm font-semibold mb-3">Industry (Optional)</Text>
              <View className="flex-row flex-wrap gap-2">
                {INDUSTRIES.map((industry) => (
                  <Pressable
                    key={industry}
                    onPress={() => updateFormData('industry', formData.industry === industry ? null : industry)}
                    className="px-4 py-2 rounded-full border-2"
                    style={{
                      borderColor: formData.industry === industry ? '#F97316' : 'rgba(255, 255, 255, 0.2)',
                      backgroundColor: formData.industry === industry ? 'rgba(249, 115, 22, 0.1)' : 'transparent',
                    }}
                  >
                    <Text
                      className={formData.industry === industry ? 'text-orange-500 font-semibold text-xs' : 'text-neutral-400 text-xs'}
                    >
                      {industry}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </Animated.View>

            <Animated.View entering={FadeInDown.delay(600).duration(600)} className="mb-4">
              <Text className="text-white text-sm font-semibold mb-2">Email *</Text>
              <View
                className="flex-row items-center px-4 py-3 rounded-xl"
                style={{
                  backgroundColor: 'rgba(255, 255, 255, 0.08)',
                  borderWidth: 1,
                  borderColor: formErrors.email ? '#EF4444' : 'rgba(255, 255, 255, 0.2)',
                }}
              >
                <Mail size={20} color="rgba(255, 255, 255, 0.5)" className="mr-3" />
                <TextInput
                  placeholder="you@example.com"
                  placeholderTextColor="rgba(255, 255, 255, 0.4)"
                  value={formData.email}
                  onChangeText={(value) => updateFormData('email', value)}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  className="flex-1 text-white text-base"
                />
              </View>
              {formErrors.email ? (
                <Text className="text-red-500 text-xs mt-1">{formErrors.email}</Text>
              ) : null}
            </Animated.View>

            <Animated.View entering={FadeInDown.delay(650).duration(600)} className="mb-4">
              <Text className="text-white text-sm font-semibold mb-2">Password *</Text>
              <View
                className="flex-row items-center px-4 py-3 rounded-xl"
                style={{
                  backgroundColor: 'rgba(255, 255, 255, 0.08)',
                  borderWidth: 1,
                  borderColor: formErrors.password ? '#EF4444' : 'rgba(255, 255, 255, 0.2)',
                }}
              >
                <Lock size={20} color="rgba(255, 255, 255, 0.5)" className="mr-3" />
                <TextInput
                  placeholder="Min. 6 characters"
                  placeholderTextColor="rgba(255, 255, 255, 0.4)"
                  value={formData.password}
                  onChangeText={(value) => updateFormData('password', value)}
                  secureTextEntry={!showPassword}
                  className="flex-1 text-white text-base"
                />
                <Pressable onPress={() => setShowPassword(!showPassword)}>
                  {showPassword ? (
                    <EyeOff size={20} color="rgba(255, 255, 255, 0.5)" />
                  ) : (
                    <Eye size={20} color="rgba(255, 255, 255, 0.5)" />
                  )}
                </Pressable>
              </View>
              {formErrors.password ? (
                <Text className="text-red-500 text-xs mt-1">{formErrors.password}</Text>
              ) : null}

              {formData.password ? (
                <View className="flex-row gap-1 mt-3">
                  {[0, 1, 2, 3].map((index) => (
                    <View
                      key={index}
                      className="flex-1 h-1 rounded-full"
                      style={{
                        backgroundColor: getPasswordStrengthColor(index, passwordStrength),
                      }}
                    />
                  ))}
                </View>
              ) : null}
            </Animated.View>

            <Animated.View entering={FadeInDown.delay(700).duration(600)} className="mb-4">
              <Pressable
                onPress={() => handleSendOtp()}
                disabled={sendingOtp || !isFormValid()}
                className="w-full py-4 rounded-2xl items-center justify-center"
                style={{
                  backgroundColor: !isFormValid() ? 'rgba(249, 115, 22, 0.3)' : '#F97316',
                }}
              >
                {sendingOtp ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text className="text-white font-semibold text-base">Create Account</Text>
                )}
              </Pressable>
            </Animated.View>
            </>
            ) : null}
          </ScrollView>
        </KeyboardAvoidingView>
      </LinearGradient>
    </View>
  );
}
