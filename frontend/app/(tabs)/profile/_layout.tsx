import { Stack } from 'expo-router';

export default function ProfileStack() {
  return (
    <Stack screenOptions={{ headerShown: true, headerBackTitle: 'Back' }}>
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="info/editProfile" options={{ title: 'Edit Profile' }} />
      <Stack.Screen name="info/FollowersScreen" options={{ title: 'Followers' }} />
      <Stack.Screen name="info/FollowingScreen" options={{ title: 'Following' }} />
      <Stack.Screen name="collections" options={{ headerShown: false }} />
      <Stack.Screen name="settings/index" options={{ title: 'Settings' }} />
      <Stack.Screen name="settings/preferences" options={{ title: 'Food Preferences' }} />
      <Stack.Screen name="settings/privacy" options={{ title: 'Privacy' }} />
      <Stack.Screen name="settings/terms" options={{ title: 'Terms of Service' }} />
      <Stack.Screen name="settings/privacy-policy" options={{ title: 'Privacy Policy' }} />
      <Stack.Screen name="settings/blocked" options={{ title: 'Blocked & Muted' }} />
    </Stack>
  );
}
