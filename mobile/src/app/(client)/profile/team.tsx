import {
  View,
  Text,
  ScrollView,
  Pressable,
  Modal,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from '@/lib/router-helper';
import {
  ChevronLeft,
  Users,
  Plus,
  X,
  Mail,
  Shield,
  CheckCircle,
  AlertCircle,
} from 'lucide-react-native';
import { useState, useCallback } from 'react';

interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: 'owner' | 'admin' | 'member';
  status: 'active' | 'pending';
  joinedDate?: string;
}

export default function TeamMembersScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [selectedRole, setSelectedRole] = useState<'admin' | 'member'>('member');
  const [showRoleDropdown, setShowRoleDropdown] = useState(false);
  const [isInviting, setIsInviting] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([
    {
      id: '1',
      name: 'You',
      email: 'owner@engage.com',
      role: 'owner',
      status: 'active',
      joinedDate: new Date().toLocaleDateString(),
    },
  ]);

  const handleInvite = useCallback(async () => {
    if (!inviteEmail.trim()) {
      setToastMessage('Please enter an email address');
      return;
    }

    setIsInviting(true);

    // Simulate invitation delay
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Add new member to list (simulated)
    const newMember: TeamMember = {
      id: Math.random().toString(36).substr(2, 9),
      name: inviteEmail.split('@')[0],
      email: inviteEmail,
      role: selectedRole,
      status: 'pending',
    };

    setTeamMembers([...teamMembers, newMember]);
    setToastMessage(`Invitation sent to ${inviteEmail}`);
    setInviteEmail('');
    setSelectedRole('member');
    setShowInviteModal(false);
    setIsInviting(false);
  }, [inviteEmail, selectedRole, teamMembers]);

  const getRoleColor = (role: 'owner' | 'admin' | 'member') => {
    switch (role) {
      case 'owner':
        return 'bg-orange-100';
      case 'admin':
        return 'bg-blue-100';
      case 'member':
        return 'bg-gray-100';
    }
  };

  const getRoleTextColor = (role: 'owner' | 'admin' | 'member') => {
    switch (role) {
      case 'owner':
        return 'text-orange-700';
      case 'admin':
        return 'text-blue-700';
      case 'member':
        return 'text-gray-700';
    }
  };

  return (
    <View className="flex-1 bg-[#F8F8F8]">
      {/* Header */}
      <View
        className="flex-row items-center px-5 py-4 border-b border-gray-200 bg-white"
        style={{ paddingTop: insets.top }}
      >
        <Pressable onPress={() => router.back()} className="mr-3">
          <ChevronLeft size={24} color="#1F2937" strokeWidth={2} />
        </Pressable>
        <Text className="text-gray-900 text-xl font-semibold">
          Team Members
        </Text>
      </View>

      <ScrollView className="flex-1 px-5 py-6" contentContainerStyle={{ paddingBottom: 120 }}>
        {/* Hero Card */}
        <View className="bg-white rounded-3xl p-6 border border-gray-200 items-center mb-8 shadow-sm"
          style={{ shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 }}>
          <View className="w-14 h-14 rounded-full bg-orange-100 items-center justify-center mb-4">
            <Users size={32} color="#F97316" strokeWidth={2} />
          </View>
          <Text className="text-gray-900 text-2xl font-bold mb-2">
            Build Your Team
          </Text>
          <Text className="text-gray-600 text-center text-sm leading-5 mb-6">
            Invite team members to collaborate on bookings and manage your company account
          </Text>
          <Pressable
            onPress={() => setShowInviteModal(true)}
            className="w-full bg-orange-500 rounded-xl py-3 flex-row items-center justify-center"
          >
            <Plus size={20} color="#FFFFFF" strokeWidth={2.5} />
            <Text className="text-white font-semibold ml-2">Invite Team Member</Text>
          </Pressable>
        </View>

        {/* Team Members List */}
        <View className="mb-6">
          <Text className="text-gray-900 text-sm font-semibold mb-4">
            Team Members ({teamMembers.length})
          </Text>
          <View className="space-y-3">
            {teamMembers.map((member) => (
              <View
                key={member.id}
                className="bg-white rounded-2xl p-4 border border-gray-200 flex-row items-center justify-between"
              >
                <View className="flex-1">
                  <View className="flex-row items-center mb-2">
                    <Text className="text-gray-900 font-semibold text-sm">
                      {member.name}
                    </Text>
                    {member.status === 'active' && (
                      <View className="ml-2 w-2 h-2 rounded-full bg-green-500" />
                    )}
                    {member.status === 'pending' && (
                      <View className="ml-2 px-2 py-0.5 rounded-full bg-amber-50">
                        <Text className="text-amber-700 text-xs font-medium">
                          Pending
                        </Text>
                      </View>
                    )}
                  </View>
                  <Text className="text-gray-500 text-xs mb-2">
                    {member.email}
                  </Text>
                  <View className={`self-start px-2.5 py-1 rounded-full ${getRoleColor(member.role)}`}>
                    <Text className={`text-xs font-semibold capitalize ${getRoleTextColor(member.role)}`}>
                      {member.role}
                    </Text>
                  </View>
                </View>
              </View>
            ))}
          </View>
        </View>

        {/* Role Permissions Info */}
        <View className="bg-white rounded-2xl p-6 border border-gray-200 mb-6">
          <View className="flex-row items-center mb-4">
            <Shield size={20} color="#1F2937" strokeWidth={2} />
            <Text className="text-gray-900 font-semibold ml-3">
              Role Permissions
            </Text>
          </View>

          <View className="space-y-3">
            <View className="pb-3 border-b border-gray-200">
              <View className="flex-row items-center mb-2">
                <View className="w-2 h-2 rounded-full bg-orange-500 mr-2" />
                <Text className="text-gray-900 font-medium text-sm">
                  Owner
                </Text>
              </View>
              <Text className="text-gray-600 text-xs ml-4">
                Full access to all settings and team management
              </Text>
            </View>

            <View className="pb-3 border-b border-gray-200">
              <View className="flex-row items-center mb-2">
                <View className="w-2 h-2 rounded-full bg-blue-500 mr-2" />
                <Text className="text-gray-900 font-medium text-sm">
                  Admin
                </Text>
              </View>
              <Text className="text-gray-600 text-xs ml-4">
                Can manage team members, bookings, and account settings
              </Text>
            </View>

            <View>
              <View className="flex-row items-center mb-2">
                <View className="w-2 h-2 rounded-full bg-gray-500 mr-2" />
                <Text className="text-gray-900 font-medium text-sm">
                  Member
                </Text>
              </View>
              <Text className="text-gray-600 text-xs ml-4">
                Can view and manage assigned bookings only
              </Text>
            </View>
          </View>
        </View>

        {/* Toast Message */}
        {toastMessage ? (
          <View className="bg-green-50 border border-green-200 rounded-lg p-4 flex-row items-center mb-4">
            <CheckCircle size={20} color="#22C55E" />
            <Text className="text-green-700 text-sm font-medium ml-2">{toastMessage}</Text>
          </View>
        ) : null}
      </ScrollView>

      {/* Invite Modal */}
      <Modal
        visible={showInviteModal}
        transparent
        animationType="fade"
      >
        <View className="flex-1 bg-black/50 justify-end">
          <View
            className="bg-white rounded-t-3xl p-6 pb-8"
            style={{ paddingBottom: insets.bottom + 32 }}
          >
            {/* Header */}
            <View className="flex-row items-center justify-between mb-6">
              <Text className="text-gray-900 text-xl font-bold">
                Invite Team Member
              </Text>
              <Pressable onPress={() => setShowInviteModal(false)}>
                <X size={24} color="#6B7280" strokeWidth={2} />
              </Pressable>
            </View>

            {/* Email Input */}
            <View className="mb-5">
              <Text className="text-gray-700 text-sm font-semibold mb-2">
                Email Address
              </Text>
              <View className="flex-row items-center border border-gray-300 rounded-xl px-4 py-3 bg-white">
                <Mail size={18} color="#9CA3AF" strokeWidth={2} />
                <TextInput
                  placeholder="colleague@company.com"
                  value={inviteEmail}
                  onChangeText={setInviteEmail}
                  placeholderTextColor="#D1D5DB"
                  className="flex-1 ml-3 text-gray-900"
                />
              </View>
            </View>

            {/* Role Selector */}
            <View className="mb-6">
              <Text className="text-gray-700 text-sm font-semibold mb-2">
                Role
              </Text>
              <Pressable
                onPress={() => setShowRoleDropdown(!showRoleDropdown)}
                className="flex-row items-center justify-between border border-gray-300 rounded-xl px-4 py-3 bg-white"
              >
                <Text className="text-gray-900 font-medium">
                  {selectedRole.charAt(0).toUpperCase() + selectedRole.slice(1)}
                </Text>
                <View className={`w-1.5 h-1.5 rounded-full ${selectedRole === 'admin' ? 'bg-blue-500' : 'bg-gray-500'}`} />
              </Pressable>

              {/* Role Dropdown */}
              {showRoleDropdown ? (
                <View className="absolute top-24 left-0 right-0 mx-6 bg-white rounded-xl border border-gray-300 z-50"
                  style={{ shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 8, elevation: 5 }}>
                  <Pressable
                    onPress={() => {
                      setSelectedRole('admin');
                      setShowRoleDropdown(false);
                    }}
                    className="px-4 py-3 flex-row items-center justify-between border-b border-gray-100"
                  >
                    <Text className="text-gray-900 font-medium">Admin</Text>
                    {selectedRole === 'admin' ? (
                      <CheckCircle size={18} color="#3B82F6" strokeWidth={2} />
                    ) : null}
                  </Pressable>
                  <Pressable
                    onPress={() => {
                      setSelectedRole('member');
                      setShowRoleDropdown(false);
                    }}
                    className="px-4 py-3 flex-row items-center justify-between"
                  >
                    <Text className="text-gray-900 font-medium">Member</Text>
                    {selectedRole === 'member' ? (
                      <CheckCircle size={18} color="#6B7280" strokeWidth={2} />
                    ) : null}
                  </Pressable>
                </View>
              ) : null}
            </View>

            {/* Action Buttons */}
            <View className="flex-row gap-3">
              <Pressable
                onPress={() => setShowInviteModal(false)}
                className="flex-1 border border-gray-300 rounded-xl py-3 items-center"
              >
                <Text className="text-gray-900 font-semibold">Cancel</Text>
              </Pressable>
              <Pressable
                onPress={handleInvite}
                disabled={isInviting}
                className="flex-1 bg-orange-500 rounded-xl py-3 items-center"
                style={{ opacity: isInviting ? 0.6 : 1 }}
              >
                {isInviting ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <Text className="text-white font-semibold">Send Invite</Text>
                )}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}
