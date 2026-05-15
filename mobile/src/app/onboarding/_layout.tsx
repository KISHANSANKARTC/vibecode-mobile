import { Stack } from 'expo-router';

export default function OnboardingLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: 'fade',
        contentStyle: { backgroundColor: '#0A0A0A' },
      }}
    >
      <Stack.Screen name="slides" />
      <Stack.Screen name="welcome" />
      <Stack.Screen name="auth" />
      <Stack.Screen name="client-auth" />
      <Stack.Screen name="talent-setup" />
      <Stack.Screen name="client-setup" />
    </Stack>
  );
}
