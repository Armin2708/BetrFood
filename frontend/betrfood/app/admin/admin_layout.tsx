import { useContext, useEffect } from 'react';
import { Stack, useRouter } from 'expo-router';
import { AuthContext } from '../../context/AuthenticationContext';

export default function AdminLayout() {
  const { user, loading } = useContext(AuthContext);
  const router = useRouter();

  // Guard — non-admin users are immediately bounced back
  useEffect(() => {
    if (!loading && (!user || (user as any).role !== 'admin')) {
      router.replace('/feeds');
    }
  }, [user, loading]);

  if (!user || (user as any).role !== 'admin') return null;

  return (
    <Stack screenOptions={{ headerShown: true }}>
      <Stack.Screen name="index" options={{ title: 'Admin Dashboard' }} />
    </Stack>
  );
}
