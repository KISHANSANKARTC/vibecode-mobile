import { Stack } from 'expo-router';

export default function ProfileLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: '#F8F8F8' },
      }}
    >
      <Stack.Screen name="index" />
      <Stack.Screen name="info" />
      <Stack.Screen name="account" />
      <Stack.Screen name="billing" />
      <Stack.Screen name="invoices" />
      <Stack.Screen name="notifications" />
      <Stack.Screen name="support" />
      <Stack.Screen name="company" />
      <Stack.Screen name="verification" />
      <Stack.Screen name="team" />
      <Stack.Screen name="id-verification" />
    </Stack>
  );
}
