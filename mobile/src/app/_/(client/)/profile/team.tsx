import {
  View,
  Text,
  ScrollView,
  Pressable,
  TextInput,
  Modal,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import {
  ArrowLeft,
  Users,
  Plus,
  Mail,
  Shield,
  Trash2,
  Loader2,
  Crown,
  UserCheck,
  ChevronDown,
  X,
} from 'lucide-react-native';
import { useState, useCallback, useMemo } from 'react';
import { useAuthStore } from '@/lib/state/auth-store';

interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: 'owner' | 'admin' | 'member';
  status: 'active' | 'pending';
}

export default function TeamMembersScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const user = useAuthStore((s) => s.user);

  const [showInviteDialog, setShowInviteDialog] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'admin' | 'member'>('member');
  const [showRoleDropdown, setShowRoleDropdown] = useState(false);
  const [inviteSending, setInviteSending] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  // Initial team data - only the current user as owner
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([
    {
      id: '1',
      name: user?.user_metadata?.full_name || 'You',
      email: user?.email || '',
      role: 'owner',
      status: 'active',
    },
  ]);

  const handleInvite = useCallback(async () => {
    if (!inviteEmail.trim()) {
      setToastMessage('Please enter an email address');
      return;
    }

    try {
      setInviteSending(true);

      // Simulate API call with 1 second delay
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Add new member to the list with pending status
      const newMember: TeamMember = {
        id: Date.now().toString(),
        name: inviteEmail.split('@')[0],
        email: inviteEmail,
        role: inviteRole,
        status: 'pending',
      };

      setTeamMembers((prev) => [...prev, newMember]);
      setToastMessage(`Invitation sent to ${inviteEmail}`);
      setShowInviteDialog(false);
      setInviteEmail('');
      setInviteRole('member');
    } finally {
      setInviteSending(false);
    }
  }, [inviteEmail, inviteRole]);

  const handleRemoveMember = useCallback((memberId: string) => {
    setTeamMembers((prev) => prev.filter((m) => m.id !== memberId));
  }, []);

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'owner':
        return <Crown size={14} color="#9CA3AF" strokeWidth={2} />;
      case 'admin':
        return <Shield size={14} color="#9CA3AF" strokeWidth={2} />;
      case 'member':
        return <UserCheck size={14} color="#9CA3AF" strokeWidth={2} />;
      default:
        return null;
    }
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'owner':
        return 'Owner';
      case 'admin':
        return 'Admin';
      case 'member':
        return 'Member';
      default:
        return '';
    }
  };

  const getRoleDescription = (role: string) => {
    switch (role) {
      case 'owner':
        return 'Full access, billing, team management';
      case 'admin':
        return 'Create bookings, view team activity';
      case 'member':
        return 'View bookings, communicate with talent';
      default:
        return '';
    }
  };

  return (
    <View className="flex-1 bg-white">
      {/* Header */}
      <View
        className="flex-row items-center px-5 py-4 border-b border-gray-200 bg-white z-40"
        style={{ paddingTop: insets.top }}
      >
        <Pressable
          onPress={() => navigation.goBack()}
          className="w-10 h-10 rounded-full bg-gray-100 items-center justify-center mr-4"
        >
          <ArrowLeft size={20} color="#6B7280" strokeWidth={2} />
        </Pressable>
        <Text className="text-gray-900 text-xl font-bold">Team Members</Text>
      </View>

      <ScrollView
        className="flex-1 px-5 py-6"
        contentContainerStyle={{ paddingBottom: 80 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero Card */}
        <View
          className="rounded-2xl border border-gray-200 p-4 items-center mb-6 bg-white"
          style={{
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.1,
            shadowRadius: 4,
            elevation: 3,
          }}
        >
          <View
            className="w-16 h-16 rounded-2xl items-center justify-center"
            style={{ backgroundColor: 'rgba(249, 115, 22, 0.1)' }}
          >
            <Users size={28} color="#F97316" strokeWidth={1.5} />
          </View>
          <Text className="text-gray-900 font-semibold text-base mt-4">
            Manage Your Team
          </Text>
          <Text className="text-gray-500 text-sm mt-1 text-center">
            Invite team members to collaborate on bookings
          </Text>
        </View>

        {/* Invite Button */}
        <Pressable
          onPress={() => setShowInviteDialog(true)}
          className="bg-orange-500 rounded-lg py-3 items-center justify-center flex-row mb-6 active:bg-orange-600"
        >
          <Plus size={18} color="white" strokeWidth={2} />
          <Text className="text-white font-semibold ml-2">Invite Team Member</Text>
        </Pressable>

        {/* Team Members List */}
        <View className="mb-6">
          <Text className="text-gray-900 font-semibold text-base mb-3">
            Team ({teamMembers.length})
          </Text>
          {teamMembers.map((member) => (
            <View
              key={member.id}
              className="rounded-2xl border border-gray-200 p-4 mb-3 bg-white flex-row items-center justify-between"
            >
              <View className="flex-row items-center flex-1">
                {/* Avatar */}
                <View
                  className="w-10 h-10 rounded-full items-center justify-center mr-3"
                  style={{ backgroundColor: 'rgba(249, 115, 22, 0.1)' }}
                >
                  <Text className="text-orange-600 font-semibold text-sm">
                    {member.name.charAt(0).toUpperCase()}
                  </Text>
                </View>

                {/* Member Info */}
                <View className="flex-1">
                  <View className="flex-row items-center">
                    <Text className="text-gray-900 font-semibold text-base">
                      {member.name}
                    </Text>
                    {member.role === 'owner' ? (
                      <View className="ml-2 bg-gray-100 rounded-full px-2 py-0.5">
                        <Text className="text-gray-600 text-xs font-medium">You</Text>
                      </View>
                    ) : null}
                  </View>
                  <Text className="text-gray-500 text-xs mt-0.5">{member.email}</Text>
                </View>
              </View>

              {/* Right Side Actions */}
              <View className="flex-row items-center gap-2">
                {/* Role Indicator */}
                <View className="flex-row items-center gap-1">
                  {getRoleIcon(member.role)}
                  <Text className="text-gray-500 text-xs">
                    {getRoleLabel(member.role)}
                  </Text>
                </View>

                {/* Status Badge or Delete Button */}
                {member.status === 'pending' ? (
                  <View className="border border-gray-300 rounded-full px-2 py-0.5">
                    <Text className="text-gray-600 text-xs font-medium">Pending</Text>
                  </View>
                ) : member.role !== 'owner' ? (
                  <Pressable
                    onPress={() => handleRemoveMember(member.id)}
                    className="px-1.5 py-1.5 rounded-lg active:bg-red-50"
                  >
                    <Trash2 size={14} color="#EF4444" strokeWidth={2} />
                  </Pressable>
                ) : null}
              </View>
            </View>
          ))}
        </View>

        {/* Role Permissions Info Card */}
        <View className="rounded-2xl border border-gray-200 p-4 bg-white">
          <Text className="text-gray-900 font-semibold text-base mb-3">
            Role Permissions
          </Text>

          {/* Owner Role */}
          <View className="flex-row items-center mb-3">
            <View className="w-6 h-6 rounded bg-gray-200 items-center justify-center">
              <Crown size={12} color="#9CA3AF" strokeWidth={2} />
            </View>
            <View className="ml-3 flex-1">
              <Text className="text-gray-900 font-semibold text-sm">Owner</Text>
              <Text className="text-gray-500 text-xs mt-0.5">
                Full access, billing, team management
              </Text>
            </View>
          </View>

          {/* Admin Role */}
          <View className="flex-row items-center mb-3">
            <View className="w-6 h-6 rounded bg-gray-200 items-center justify-center">
              <Shield size={12} color="#9CA3AF" strokeWidth={2} />
            </View>
            <View className="ml-3 flex-1">
              <Text className="text-gray-900 font-semibold text-sm">Admin</Text>
              <Text className="text-gray-500 text-xs mt-0.5">
                Create bookings, view team activity
              </Text>
            </View>
          </View>

          {/* Member Role */}
          <View className="flex-row items-center">
            <View className="w-6 h-6 rounded bg-gray-200 items-center justify-center">
              <UserCheck size={12} color="#9CA3AF" strokeWidth={2} />
            </View>
            <View className="ml-3 flex-1">
              <Text className="text-gray-900 font-semibold text-sm">Member</Text>
              <Text className="text-gray-500 text-xs mt-0.5">
                View bookings, communicate with talent
              </Text>
            </View>
          </View>
        </View>

        {/* Toast Message */}
        {toastMessage ? (
          <View className="bg-green-50 border border-green-200 rounded-lg p-4 flex-row items-center mt-6">
            <View className="w-5 h-5 rounded-full bg-green-500 items-center justify-center mr-2">
              <Text className="text-white text-xs font-bold">✓</Text>
            </View>
            <Text className="text-green-700 text-sm font-medium flex-1">
              {toastMessage}
            </Text>
          </View>
        ) : null}
      </ScrollView>

      {/* Invite Dialog Modal */}
      <Modal
        visible={showInviteDialog}
        transparent
        animationType="fade"
        onRequestClose={() => {
          setShowInviteDialog(false);
          setShowRoleDropdown(false);
        }}
      >
        <Pressable
          className="flex-1 bg-black/40 items-center justify-center px-5"
          onPress={() => {
            setShowInviteDialog(false);
            setShowRoleDropdown(false);
          }}
        >
          <Pressable
            onPress={(e) => e.stopPropagation()}
            className="bg-white rounded-2xl p-6 w-full max-w-sm"
          >
            {/* Header */}
            <View className="flex-row items-center justify-between mb-6">
              <Text className="text-gray-900 font-semibold text-lg">
                Invite Team Member
              </Text>
              <Pressable
                onPress={() => {
                  setShowInviteDialog(false);
                  setShowRoleDropdown(false);
                }}
                hitSlop={8}
              >
                <X size={24} color="#6B7280" strokeWidth={2} />
              </Pressable>
            </View>

            {/* Email Field */}
            <View className="mb-4">
              <Text className="text-gray-700 font-medium text-sm mb-2">
                Email Address
              </Text>
              <View className="border border-gray-300 rounded-lg px-3 py-2.5 bg-white flex-row items-center">
                <Mail size={16} color="#9CA3AF" strokeWidth={1.5} />
                <TextInput
                  value={inviteEmail}
                  onChangeText={setInviteEmail}
                  placeholder="colleague@company.com"
                  placeholderTextColor="#9CA3AF"
                  editable={!inviteSending}
                  className="flex-1 ml-3 text-gray-900 text-sm"
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              </View>
            </View>

            {/* Role Dropdown */}
            <View className="mb-6">
              <Text className="text-gray-700 font-medium text-sm mb-2">Role</Text>
              <View style={{ position: 'relative' }}>
                <Pressable
                  onPress={() => setShowRoleDropdown(!showRoleDropdown)}
                  className="border border-gray-300 rounded-lg px-3 py-2.5 bg-white flex-row items-center justify-between"
                  disabled={inviteSending}
                >
                  <Text className="text-gray-900 text-sm">
                    {inviteRole === 'admin' ? 'Admin' : 'Member'}
                  </Text>
                  <ChevronDown
                    size={18}
                    color="#6B7280"
                    strokeWidth={2}
                    style={{
                      transform: [
                        { rotate: showRoleDropdown ? '180deg' : '0deg' },
                      ],
                    }}
                  />
                </Pressable>

                {/* Dropdown Menu */}
                {showRoleDropdown ? (
                  <View
                    style={{
                      position: 'absolute',
                      top: 44,
                      left: 0,
                      right: 0,
                      backgroundColor: '#FFFFFF',
                      borderRadius: 8,
                      borderWidth: 1,
                      borderColor: '#D1D5DB',
                      zIndex: 50,
                      shadowColor: '#000',
                      shadowOffset: { width: 0, height: 4 },
                      shadowOpacity: 0.15,
                      shadowRadius: 8,
                      elevation: 8,
                    }}
                  >
                    <Pressable
                      onPress={() => {
                        setInviteRole('admin');
                        setShowRoleDropdown(false);
                      }}
                      className="px-4 py-3 border-b border-gray-100"
                      style={{
                        backgroundColor:
                          inviteRole === 'admin' ? '#FEF3F2' : '#FFFFFF',
                      }}
                    >
                      <Text
                        style={{
                          color: inviteRole === 'admin' ? '#F97316' : '#374151',
                          fontSize: 14,
                          fontWeight: inviteRole === 'admin' ? '600' : '400',
                        }}
                      >
                        Admin
                      </Text>
                    </Pressable>

                    <Pressable
                      onPress={() => {
                        setInviteRole('member');
                        setShowRoleDropdown(false);
                      }}
                      className="px-4 py-3"
                      style={{
                        backgroundColor:
                          inviteRole === 'member' ? '#FEF3F2' : '#FFFFFF',
                      }}
                    >
                      <Text
                        style={{
                          color:
                            inviteRole === 'member' ? '#F97316' : '#374151',
                          fontSize: 14,
                          fontWeight: inviteRole === 'member' ? '600' : '400',
                        }}
                      >
                        Member
                      </Text>
                    </Pressable>
                  </View>
                ) : null}
              </View>
            </View>

            {/* Buttons */}
            <View className="flex-row gap-3 justify-end">
              <Pressable
                onPress={() => {
                  setShowInviteDialog(false);
                  setShowRoleDropdown(false);
                }}
                disabled={inviteSending}
                className="px-6 py-2.5 rounded-lg border border-gray-300 bg-white"
                style={{ opacity: inviteSending ? 0.5 : 1 }}
              >
                <Text className="text-gray-700 font-medium text-sm">Cancel</Text>
              </Pressable>

              <Pressable
                onPress={handleInvite}
                disabled={inviteSending || !inviteEmail.trim()}
                className="px-6 py-2.5 rounded-lg bg-orange-500 flex-row items-center gap-2"
                style={{
                  opacity:
                    inviteSending || !inviteEmail.trim() ? 0.6 : 1,
                }}
              >
                {inviteSending ? (
                  <Loader2 size={16} color="white" strokeWidth={2} />
                ) : null}
                <Text className="text-white font-semibold text-sm">
                  {inviteSending ? 'Sending...' : 'Send Invite'}
                </Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}
