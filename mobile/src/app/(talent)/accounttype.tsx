import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TextInput,
  Pressable,
  Modal,
  ActivityIndicator,
  Alert,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/lib/state/auth-store';
import { useTheme } from '@/lib/theme/ThemeContext';
import { SkeletonLoader } from '@/components/SkeletonLoader';

export default function AccountTypeScreen() {
  const insets = useSafeAreaInsets();
  const user = useAuthStore((s) => s.user);
  const { theme } = useTheme();

  // Dynamic colors based on theme
  const isDark = theme === 'dark';
  const colors = {
    bg: isDark ? '#0A0A0A' : '#ffffff',
    bgSecondary: isDark ? '#1A1A1A' : '#f9fafb',
    text: isDark ? '#ffffff' : '#111827',
    textSecondary: isDark ? '#9ca3af' : '#6b7280',
    border: isDark ? '#374151' : '#e5e7eb',
  };

  // State for current account type data
  const [currentType, setCurrentType] = useState<'individual' | 'company' | null>(null);
  const [companyName, setCompanyName] = useState<string>('');
  const [vatNumber, setVatNumber] = useState<string>('');

  // State for switching
  const [switchingTo, setSwitchingTo] = useState<'individual' | 'company' | null>(null);
  const [showDialog, setShowDialog] = useState(false);
  const [tempCompanyName, setTempCompanyName] = useState<string>('');
  const [tempVatNumber, setTempVatNumber] = useState<string>('');

  // Loading states
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const loadProfileData = async () => {
    if (!user?.id) {
      setIsLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('talent_profiles')
        .select('id, account_type, company_name, business_vat_number')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        const type = data.account_type as 'individual' | 'company' | null;
        setCurrentType(type || 'individual');
        setCompanyName(data.company_name || '');
        setVatNumber(data.business_vat_number || '');
      } else {
        // Default to individual if no profile yet
        setCurrentType('individual');
      }
    } catch (err) {
      console.error('Error loading profile:', err);
      Alert.alert('Error', 'Failed to load account type');
    } finally {
      setIsLoading(false);
    }
  };

  // Load profile data on mount
  useEffect(() => {
    loadProfileData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const handleAccountTypePress = (type: 'individual' | 'company') => {
    if (type === currentType) {
      return; // Already on this type
    }

    setSwitchingTo(type);
    if (type === 'company') {
      setTempCompanyName(companyName);
      setTempVatNumber(vatNumber);
    }
    setShowDialog(true);
  };

  const handleConfirmSwitch = async () => {
    if (!user?.id) {
      Alert.alert('Error', 'User not found');
      return;
    }

    // Validation
    if (switchingTo === 'company') {
      if (!tempCompanyName.trim()) {
        Alert.alert('Required', 'Please enter your business name');
        return;
      }
    }

    setIsSaving(true);
    try {
      if (switchingTo === 'company') {
        // Switch to company account
        const { error } = await supabase
          .from('talent_profiles')
          .update({
            account_type: 'company',
            company_name: tempCompanyName.trim(),
            business_vat_number: tempVatNumber.trim() || null,
          })
          .eq('user_id', user.id);

        if (error) throw error;

        setCurrentType('company');
        setCompanyName(tempCompanyName.trim());
        setVatNumber(tempVatNumber.trim());
        setShowDialog(false);
        Alert.alert('Success', 'Switched to company account');
      } else if (switchingTo === 'individual') {
        // Switch to individual account
        const { error } = await supabase
          .from('talent_profiles')
          .update({
            account_type: 'individual',
            company_name: null,
            business_vat_number: null,
          })
          .eq('user_id', user.id);

        if (error) throw error;

        setCurrentType('individual');
        setCompanyName('');
        setVatNumber('');
        setShowDialog(false);
        Alert.alert('Success', 'Switched to individual account');
      }
    } catch (err) {
      console.error('Error switching account type:', err);
      Alert.alert('Error', 'Failed to switch account type');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setShowDialog(false);
    setSwitchingTo(null);
    setTempCompanyName('');
    setTempVatNumber('');
  };

  if (isLoading) {
    return (
      <View style={{ flex: 1, paddingTop: insets.top, backgroundColor: colors.bg }}>
        {/* Header - always visible */}
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: colors.border }}>
          <Pressable
            onPress={() => router.replace('/(talent)/profile')}
            style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: colors.bgSecondary, justifyContent: 'center', alignItems: 'center' }}
          >
            <Ionicons name="arrow-back" size={20} color={colors.text} />
          </Pressable>
          <Text style={{ fontSize: 20, fontWeight: '700', color: colors.text }}>Account Type</Text>
          <View style={{ width: 40, height: 40 }} />
        </View>

        {/* Skeleton Content */}
        <ScrollView
          contentContainerStyle={[
            styles.scrollContent,
            { paddingBottom: Math.max(insets.bottom + 100, 100), backgroundColor: colors.bg },
          ]}
          showsVerticalScrollIndicator={false}
        >
          {/* Card Skeleton */}
          <View style={{ backgroundColor: colors.bgSecondary, borderWidth: 1, borderColor: colors.border, borderRadius: 12, padding: 16, marginBottom: 24 }}>
            <SkeletonLoader width="30%" height={16} borderRadius={4} style={{ marginBottom: 16 }} />

            {/* Type Buttons Skeleton */}
            <View style={{ flexDirection: 'row', gap: 12 }}>
              <View style={{ flex: 1, paddingVertical: 16, paddingHorizontal: 12, borderRadius: 12, borderWidth: 2, borderColor: colors.border, alignItems: 'center', gap: 8 }}>
                <SkeletonLoader width={32} height={32} borderRadius={16} />
                <SkeletonLoader width="60%" height={16} borderRadius={4} />
                <SkeletonLoader width="70%" height={12} borderRadius={4} />
              </View>
              <View style={{ flex: 1, paddingVertical: 16, paddingHorizontal: 12, borderRadius: 12, borderWidth: 2, borderColor: colors.border, alignItems: 'center', gap: 8 }}>
                <SkeletonLoader width={32} height={32} borderRadius={16} />
                <SkeletonLoader width="60%" height={16} borderRadius={4} />
                <SkeletonLoader width="70%" height={12} borderRadius={4} />
              </View>
            </View>
          </View>

          {/* Footer Text Skeleton */}
          <View style={{ gap: 12, marginHorizontal: 16 }}>
            <SkeletonLoader width="100%" height={14} borderRadius={4} />
            <SkeletonLoader width="100%" height={14} borderRadius={4} />
            <SkeletonLoader width="70%" height={14} borderRadius={4} />
          </View>
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, paddingTop: insets.top, backgroundColor: colors.bg }}>
      {/* Header */}
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: colors.border }}>
        <Pressable
          onPress={() => router.replace('/(talent)/profile')}
          style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: colors.bgSecondary, justifyContent: 'center', alignItems: 'center' }}
        >
          <Ionicons name="arrow-back" size={20} color={colors.text} />
        </Pressable>
        <Text style={{ fontSize: 20, fontWeight: '700', color: colors.text }}>Account Type</Text>
        <View style={{ width: 40, height: 40 }} />
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: Math.max(insets.bottom + 100, 100), backgroundColor: colors.bg },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Account Type Selection Card */}
        <View style={{ backgroundColor: colors.bgSecondary, borderWidth: 1, borderColor: colors.border, borderRadius: 12, padding: 16, marginBottom: 24 }}>
          {/* Card Header */}
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <Text style={{ fontSize: 16, fontWeight: '600', color: colors.text }}>Account Type</Text>
            {currentType === 'company' ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 6, backgroundColor: 'rgba(124, 58, 237, 0.1)', borderRadius: 9999 }}>
                <Ionicons name="business-outline" size={14} color="#fa5610" />
                <Text style={{ fontSize: 12, fontWeight: '500', color: '#fa5610' }}>Business</Text>
              </View>
            ) : null}
          </View>

          {/* Account Type Buttons Grid */}
          <View style={{ flexDirection: 'row', gap: 12 }}>
            {/* Individual Button */}
            <Pressable
              onPress={() => handleAccountTypePress('individual')}
              style={[
                styles.typeButton,
                { borderColor: currentType === 'individual' ? '#fa5610' : colors.border, backgroundColor: currentType === 'individual' ? 'rgba(124, 58, 237, 0.05)' : colors.bgSecondary },
              ]}
            >
              <Ionicons
                name="person-outline"
                size={32}
                color={currentType === 'individual' ? '#fa5610' : colors.textSecondary}
                style={{ marginBottom: 8 }}
              />
              <Text
                style={{
                  fontSize: 16,
                  fontWeight: '500',
                  color: currentType === 'individual' ? '#fa5610' : colors.text,
                  marginBottom: 4,
                }}
              >
                Individual
              </Text>
              <Text
                style={{
                  fontSize: 12,
                  color: currentType === 'individual' ? '#fa5610' : colors.textSecondary,
                }}
              >
                Personal account
              </Text>
            </Pressable>

            {/* Company Button */}
            <Pressable
              onPress={() => handleAccountTypePress('company')}
              style={[
                styles.typeButton,
                { borderColor: currentType === 'company' ? '#fa5610' : colors.border, backgroundColor: currentType === 'company' ? 'rgba(124, 58, 237, 0.05)' : colors.bgSecondary },
              ]}
            >
              <Ionicons
                name="business-outline"
                size={32}
                color={currentType === 'company' ? '#fa5610' : colors.textSecondary}
                style={{ marginBottom: 8 }}
              />
              <Text
                style={{
                  fontSize: 16,
                  fontWeight: '500',
                  color: currentType === 'company' ? '#fa5610' : colors.text,
                  marginBottom: 4,
                }}
              >
                Company
              </Text>
              <Text
                style={{
                  fontSize: 12,
                  color: currentType === 'company' ? '#fa5610' : colors.textSecondary,
                }}
              >
                Business account
              </Text>
            </Pressable>
          </View>

          {/* Company Details Section */}
          {currentType === 'company' && companyName ? (
            <>
              <View style={{ height: 1, backgroundColor: colors.border, marginVertical: 12 }} />
              <View style={{ gap: 8 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text style={{ fontSize: 14, color: colors.textSecondary }}>Company Name</Text>
                  <Text style={{ fontSize: 14, color: colors.text, fontWeight: '500' }}>{companyName}</Text>
                </View>
                {vatNumber ? (
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text style={{ fontSize: 14, color: colors.textSecondary }}>VAT Number</Text>
                    <Text style={{ fontSize: 14, color: colors.text, fontWeight: '500' }}>{vatNumber}</Text>
                  </View>
                ) : null}
              </View>
            </>
          ) : null}
        </View>

        {/* Footer Text */}
        <Text style={{ fontSize: 14, color: colors.textSecondary, textAlign: 'center', marginHorizontal: 16, marginBottom: 24, lineHeight: 20 }}>
          Switching to a company account allows you to operate under your business name.
          Your existing bookings and portfolio will remain unchanged.
        </Text>
      </ScrollView>

      {/* Confirmation Dialog / Modal */}
      <Modal
        visible={showDialog}
        transparent
        animationType="fade"
        onRequestClose={handleCancel}
      >
        <View style={{ flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.5)', justifyContent: 'flex-end' }}>
          <View style={{ backgroundColor: colors.bg, borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingHorizontal: 16, paddingTop: 24, paddingBottom: 32 }}>
            {/* Modal Title */}
            <Text style={{ fontSize: 18, fontWeight: '700', color: colors.text, marginBottom: 12 }}>
              Switch to {switchingTo === 'company' ? 'Company' : 'Individual'} Account
            </Text>

            {/* Modal Description */}
            <Text style={{ fontSize: 14, color: colors.textSecondary, marginBottom: 24, lineHeight: 20 }}>
              {switchingTo === 'company'
                ? 'Enter your business details to switch to a company account.'
                : 'You will switch back to an individual account. Your company details will be removed.'}
            </Text>

            {/* Form Fields - Only for Company */}
            {switchingTo === 'company' && (
              <>
                {/* Company Name Input */}
                <View style={{ marginBottom: 16 }}>
                  <Text style={{ fontSize: 14, fontWeight: '500', color: colors.text, marginBottom: 8 }}>
                    Company Name <Text style={{ color: '#ef4444' }}>*</Text>
                  </Text>
                  <TextInput
                    style={{ height: 44, borderWidth: 1, borderColor: colors.border, borderRadius: 12, paddingHorizontal: 12, fontSize: 14, color: colors.text, backgroundColor: colors.bgSecondary }}
                    placeholder="Your business name"
                    placeholderTextColor={colors.textSecondary}
                    value={tempCompanyName}
                    onChangeText={setTempCompanyName}
                    editable={!isSaving}
                  />
                </View>

                {/* VAT Number Input */}
                <View style={{ marginBottom: 16 }}>
                  <Text style={{ fontSize: 14, fontWeight: '500', color: colors.text, marginBottom: 8 }}>VAT Number (Optional)</Text>
                  <TextInput
                    style={{ height: 44, borderWidth: 1, borderColor: colors.border, borderRadius: 12, paddingHorizontal: 12, fontSize: 14, color: colors.text, backgroundColor: colors.bgSecondary }}
                    placeholder="e.g., AE123456789"
                    placeholderTextColor={colors.textSecondary}
                    value={tempVatNumber}
                    onChangeText={setTempVatNumber}
                    editable={!isSaving}
                  />
                </View>

                {/* Info Box */}
                <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12, backgroundColor: colors.bgSecondary, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 12, marginBottom: 24 }}>
                  <Ionicons name="shield-outline" size={16} color={colors.textSecondary} />
                  <Text style={{ fontSize: 12, color: colors.textSecondary, flex: 1, lineHeight: 16 }}>
                    Company accounts may require additional verification for certain features.
                  </Text>
                </View>
              </>
            )}

            {/* Buttons */}
            <View style={{ flexDirection: 'row', gap: 12 }}>
              <Pressable
                onPress={handleCancel}
                disabled={isSaving}
                style={[{ flex: 1, height: 44, borderRadius: 12, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.bgSecondary, justifyContent: 'center', alignItems: 'center' }, isSaving && { opacity: 0.6 }]}
              >
                <Text style={{ fontSize: 14, fontWeight: '600', color: colors.text }}>Cancel</Text>
              </Pressable>

              <Pressable
                onPress={handleConfirmSwitch}
                disabled={isSaving}
                style={[{ flex: 1, height: 44, borderRadius: 12, backgroundColor: '#fa5610', justifyContent: 'center', alignItems: 'center' }, isSaving && { opacity: 0.6 }]}
              >
                {isSaving ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={{ fontSize: 14, fontWeight: '600', color: '#ffffff' }}>Confirm Switch</Text>
                )}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 24,
  },
  typeButton: {
    flex: 1,
    paddingVertical: 16,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
