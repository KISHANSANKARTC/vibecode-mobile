import { Stack } from 'expo-router';

export default function MessagesGroupLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="messages" />
      <Stack.Screen name="messages/[id]" />
      <Stack.Screen name="inquiry/[id]" />
    </Stack>
  );
}
