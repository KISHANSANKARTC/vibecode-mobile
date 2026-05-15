import { Stack } from 'expo-router';

export default function PortfolioLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen name="index" />
      <Stack.Screen name="new-case-study" />
      <Stack.Screen name="case-study-editor/[projectId]" />
    </Stack>
  );
}
