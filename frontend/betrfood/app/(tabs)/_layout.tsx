import { Tabs, Redirect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { ComponentProps, useState, useCallback, useContext } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useAuth } from "@clerk/clerk-expo";
import { useFocusEffect } from '@react-navigation/native';
import { fetchUnreadNotificationCount } from '../../services/api';
import { AuthContext } from '../../context/AuthenticationContext';

type IoniconName = ComponentProps<typeof Ionicons>['name'];

function NotificationIcon({ color, size, badge }: { color: string; size: number; badge: number }) {
  return (
    <View>
      <Ionicons name={'notifications-outline' as IoniconName} size={size} color={color} />
      {badge > 0 && (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{badge > 99 ? '99+' : badge}</Text>
        </View>
      )}
    </View>
  );
}

export default function TabsLayout() {
  const { isSignedIn, isLoaded } = useAuth();
  const { loading: authLoading, token } = useContext(AuthContext);
  const [unreadCount, setUnreadCount] = useState(0);

  useFocusEffect(
    useCallback(() => {
      if (!isSignedIn || authLoading || !token) return;

      let cancelled = false;

      const loadCount = async () => {
        try {
          const count = await fetchUnreadNotificationCount();
          if (!cancelled) setUnreadCount(count);
        } catch {
          // silently ignore
        }
      };

      loadCount();
      const interval = setInterval(loadCount, 30000);

      return () => {
        cancelled = true;
        clearInterval(interval);
      };
    }, [isSignedIn, authLoading, token])
  );

  if (isLoaded && !isSignedIn) {
    return <Redirect href="/(auth)/login" />;
  }

  return (
    <Tabs screenOptions={{ headerShown: false }}>
      <Tabs.Screen
        name="feeds"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name={'home' as IoniconName} size={size} color={color} />
          ),
        }}
      />

      <Tabs.Screen
        name="notifications"
        options={{
          title: 'Notifications',
          tabBarIcon: ({ color, size }) => (
            <NotificationIcon color={color} size={size} badge={unreadCount} />
          ),
        }}
        listeners={{
          focus: () => {
            if (!token) return;
            fetchUnreadNotificationCount()
              .then(setUnreadCount)
              .catch(() => {});
          },
        }}
      />

      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name={'person' as IoniconName} size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  badge: {
    position: 'absolute',
    right: -8,
    top: -4,
    backgroundColor: '#FF6B35',
    borderRadius: 9,
    minWidth: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
  },
});
