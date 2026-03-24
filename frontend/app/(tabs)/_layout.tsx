import { Tabs, Redirect, useRouter, useSegments } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { ComponentProps, useState, useCallback, useContext } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Pressable } from 'react-native';
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
  const router = useRouter();
  const segments = useSegments();
  const activeTab = segments[1] ?? 'feeds';

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

  if (!isLoaded || authLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#22C55E" />
      </View>
    );
  }

  if (!isSignedIn) {
    return <Redirect href="/(auth)/login" />;
  }

  return (
    <View style={{ flex: 1 }}>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: '#FFFFFF',
          tabBarInactiveTintColor: 'rgba(255,255,255,0.6)',
          tabBarStyle: {
            backgroundColor: '#22C55E',
            borderTopWidth: 0,
            height: 80,
            paddingBottom: 20,
            paddingTop: 8,
            elevation: 0,
            shadowOpacity: 0,
          },
          tabBarLabelStyle: {
            fontSize: 10,
            fontWeight: '700',
          },
        }}
      >
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
          name="chat"
          options={{
            title: 'Chat',
            tabBarIcon: ({ color, size }) => (
              <Ionicons name={'chatbubble-ellipses-outline' as IoniconName} size={size} color={color} />
            ),
          }}
        />

        <Tabs.Screen
          name="pantry"
          options={{
            title: 'Pantry',
            tabBarIcon: ({ color, size }) => (
              <Ionicons name={'basket-outline' as IoniconName} size={size} color={color} />
            ),
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

      {/* Floating Create Button — only on Home tab */}
      {activeTab === 'feeds' && (
        <Pressable
          style={styles.fab}
          onPress={() => router.push('/create-post')}
          accessibilityRole="button"
          accessibilityLabel="Create post"
        >
          <Ionicons name="add" size={28} color="#FFFFFF" />
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    position: 'absolute',
    right: -8,
    top: -4,
    backgroundColor: '#FFFFFF',
    borderRadius: 9,
    minWidth: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  badgeText: {
    color: '#22C55E',
    fontSize: 10,
    fontWeight: '700',
  },
  fab: {
    position: 'absolute',
    bottom: 96,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#22C55E',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
});
