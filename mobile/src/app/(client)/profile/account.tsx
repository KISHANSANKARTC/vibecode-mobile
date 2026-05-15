import { View, Text, ScrollView, Pressable, TextInput, Alert, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from '@/lib/router-helper';
import { ChevronLeft } from 'lucide-react-native';
import { useState, useEffect } from 'react';
import { useAuthStore } from '@/lib/state/auth-store';
import { supabase } from '@/lib/supabase';
import { extractErrorMessage } from '@/lib/errorUtils';

export default function AccountSettingsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user } = useAuthStore();
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      if (!user?.id) return;
      try {
        const { data } = await supabase
          .from('profiles')
          .select('phone')
          .eq('id', user.id)
          .maybeSingle();

        setEmail(user.email || '');
        if (data) {
          setPhone(data.phone || '');
        }
      } catch (error) {
        console.error('Error loading profile:', extractErrorMessage(error));
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [user?.id, user?.email]);

  const handleUpdateEmail = async () => {
    if (!email.trim()) {
      Alert.alert('Validation', 'Please enter an email');
      return;
    }

    setUpdating(true);
    try {
      await supabase.auth.updateUser({ email });
      Alert.alert('Success', 'Email updated. Please verify your new email.');
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : typeof error === 'string' ? error : 'Failed to update email';
      Alert.alert('Error', errorMsg);
    } finally {
      setUpdating(false);
    }
  };

  const handleUpdatePhone = async () => {
    if (!phone.trim()) {
      Alert.alert('Validation', 'Please enter a phone number');
      return;
    }

    setUpdating(true);
    try {
      await supabase
        .from('profiles')
        .update({ phone })
        .eq('id', user?.id);
      Alert.alert('Success', 'Phone number updated');
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : typeof error === 'string' ? error : 'Failed to update phone';
      Alert.alert('Error', errorMsg);
    } finally {
      setUpdating(false);
    }
  };

  return (
    <View className="flex-1 bg-[#F8F8F8]">
      <View
        className="flex-row items-center px-5 py-4 border-b border-gray-200 bg-white"
        style={{ paddingTop: insets.top }}
      >
        <Pressable onPress={() => router.back()} className="mr-3">
          <ChevronLeft size={24} color="#1F2937" strokeWidth={2} />
        </Pressable>
        <Text className="text-gray-900 text-xl font-semibold">Account Settings</Text>
      </View>

      <ScrollView className="flex-1 px-5 py-6" showsVerticalScrollIndicator={false}>
        {/* Email Section */}
        <View className="bg-white rounded-2xl p-4 mb-6 border border-gray-200">
          <Text className="text-gray-600 text-sm font-medium mb-3">Email Address</Text>
          <TextInput
            value={email}
            onChangeText={setEmail}
            placeholder="Email address"
            editable={!loading && !updating}
            className="border border-gray-300 rounded-xl px-4 py-3 mb-3 bg-white text-gray-900"
          />
          <Text className="text-gray-500 text-xs mb-3">A verification link will be sent to your new email.</Text>
          <Pressable
            onPress={handleUpdateEmail}
            disabled={updating || loading}
            className="bg-orange-500 rounded-xl py-3 items-center"
            style={{ opacity: updating || loading ? 0.5 : 1 }}
          >
            {updating ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text className="text-white font-semibold">Update Email</Text>
            )}
          </Pressable>
        </View>

        {/* Phone Section */}
        <View className="bg-white rounded-2xl p-4 mb-6 border border-gray-200">
          <Text className="text-gray-600 text-sm font-medium mb-3">Phone Number</Text>
          <TextInput
            value={phone}
            onChangeText={setPhone}
            placeholder="Phone number"
            editable={!loading && !updating}
            className="border border-gray-300 rounded-xl px-4 py-3 mb-3 bg-white text-gray-900"
          />
          <Pressable
            onPress={handleUpdatePhone}
            disabled={updating || loading}
            className="bg-orange-500 rounded-xl py-3 items-center"
            style={{ opacity: updating || loading ? 0.5 : 1 }}
          >
            {updating ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text className="text-white font-semibold">Update Phone</Text>
            )}
          </Pressable>
        </View>

        {/* Danger Zone */}
        <View className="bg-red-50 rounded-2xl p-4 mb-6 border border-red-200">
          <Text className="text-red-900 text-sm font-semibold mb-3">Danger Zone</Text>
          <Pressable
            onPress={() => {
              Alert.alert(
                'Deactivate Account',
                'Are you sure? This action cannot be undone.',
                [
                  { text: 'Cancel', style: 'cancel' },
                  {
                    text: 'Deactivate',
                    style: 'destructive',
                    onPress: () => Alert.alert('Contact Support', 'Please contact support@engageapp.co to deactivate your account.'),
                  },
                ]
              );
            }}
            className="bg-red-500 rounded-xl py-3 items-center"
          >
            <Text className="text-white font-semibold">Deactivate Account</Text>
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}
