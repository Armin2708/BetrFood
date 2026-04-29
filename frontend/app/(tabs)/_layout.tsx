import { Tabs, Redirect, useRouter, useSegments } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { ComponentProps, useState, useCallback, useContext } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Pressable, Platform } from 'react-native';
import { useAuth } from "@clerk/clerk-expo";
import { useFocusEffect } from '@react-navigation/native';
import { fetchUnreadNotificationCount } from '../../services/api';
import { AuthContext } from '../../context/AuthenticationContext';
import { useAppTheme } from '../../context/ThemeContext';

type IoniconName = ComponentProps<typeof Ionicons>['name'];

const shouldHideTabs = (segments: string[]): boolean => {
  const path = segments.join('/');
  console.log(path)
  const hiddenRoutePatterns: RegExp[] = [
    /(^|\/)settings(\/|$)/,
    /(^|\/)editProfile$/,
    /(^|\/)FollowersScreen$/,
    /(^|\/)FollowingScreen$/,
  ];

  return hiddenRoutePatterns.some(pattern => pattern.test(path));
};

function TabIcon({
  name,
  focusedName,
  color,
  focused,
  colors,
}: {
  name: IoniconName;
  focusedName: IoniconName;
  color: string;
  focused: boolean;
  colors: ReturnType<typeof useAppTheme>['colors'];
}) {
  return (
    <View style={styles.tabIconWrap}>
      {focused && <View style={[styles.activeIndicator, { backgroundColor: colors.tabBarActive }]} />}
      <Ionicons name={focused ? focusedName : name} size={22} color={color} />
    </View>
  );
}

function NotificationIcon({
  color,
  focused,
  badge,
  colors,
}: {
  color: string;
  focused: boolean;
  badge: number;
  colors: ReturnType<typeof useAppTheme>['colors'];
}) {
  return (
    <View style={styles.tabIconWrap}>
      {focused && <View style={[styles.activeIndicator, { backgroundColor: colors.tabBarActive }]} />}
      <View>
        <Ionicons name={focused ? 'notifications' : 'notifications-outline'} size={22} color={color} />
        {badge > 0 && (
          <View style={[styles.badge, { backgroundColor: colors.tabBarBadgeBackground }]}>
            <Text style={[styles.badgeText, { color: colors.tabBarBadgeText }]}>
              {badge > 99 ? '99+' : badge}
            </Text>
          </View>
        )}
      </View>
    </View>
  );
}

export default function TabsLayout() {
  const { colors } = useAppTheme();
  const { isSignedIn, isLoaded } = useAuth();
  const { loading: authLoading, token } = useContext(AuthContext);
  const [unreadCount, setUnreadCount] = useState(0);
  const router = useRouter();
  const segments = useSegments();
  const activeTab = segments[1] ?? 'feeds';
  const hideTabs = shouldHideTabs(segments);

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
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.backgroundPrimary }}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!isSignedIn) {
    return <Redirect href="/(auth)/login" />;
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.backgroundPrimary }}>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: colors.tabBarActive,
          tabBarInactiveTintColor: colors.tabBarInactive,
          tabBarStyle: {
            display: hideTabs ? 'none' : 'flex',
            backgroundColor: colors.tabBarBackground,
            borderTopWidth: 0,
            height: Platform.OS === 'ios' ? 88 : 68,
            paddingBottom: Platform.OS === 'ios' ? 28 : 10,
            paddingTop: 6,
            elevation: 0,
            shadowOpacity: 0,
            borderTopLeftRadius: 20,
            borderTopRightRadius: 20,
          },
          tabBarLabelStyle: {
            fontSize: 10,
            fontWeight: '600',
            letterSpacing: 0.2,
          },
          tabBarItemStyle: {
            paddingTop: 4,
          },
        }}
      >
        <Tabs.Screen
          name="feeds"
          options={{
            title: 'Home',
            tabBarIcon: ({ color, focused }) => (
              <TabIcon name="home-outline" focusedName="home" color={color} focused={focused} colors={colors} />
            ),
          }}
        />

        <Tabs.Screen
          name="notifications"
          options={{
            title: 'Activity',
            tabBarIcon: ({ color, focused }) => (
              <NotificationIcon color={color} focused={focused} badge={unreadCount} colors={colors} />
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
            tabBarIcon: ({ color, focused }) => (
              <TabIcon name="chatbubble-ellipses-outline" focusedName="chatbubble-ellipses" color={color} focused={focused} colors={colors} />
            ),
          }}
        />

        <Tabs.Screen
          name="pantry"
          options={{
            title: 'Pantry',
            tabBarIcon: ({ color, focused }) => (
              <TabIcon name="basket-outline" focusedName="basket" color={color} focused={focused} colors={colors} />
            ),
          }}
        />

        <Tabs.Screen
          name="profile"
          options={{
            title: 'Profile',
            tabBarIcon: ({ color, focused }) => (
              <TabIcon name="person-outline" focusedName="person" color={color} focused={focused} colors={colors} />
            ),
          }}
        />
      </Tabs>

      {/* Floating Create Button — only on Home tab */}
      {activeTab === 'feeds' && !hideTabs && (
        <Pressable
          style={[
            styles.fab,
            {
              backgroundColor: colors.fabBackground,
              shadowColor: colors.cardShadow,
            },
          ]}
          onPress={() => router.push('/create-post')}
          accessibilityRole="button"
          accessibilityLabel="Create post"
        >
          <Ionicons name="add" size={26} color={colors.fabIcon} />
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  tabIconWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  activeIndicator: {
    position: 'absolute',
    top: -8,
    width: 20,
    height: 3,
    borderRadius: 1.5,
  },
  badge: {
    position: 'absolute',
    right: -9,
    top: -5,
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 3,
  },
  badgeText: {
    fontSize: 9,
    fontWeight: '800',
  },
  fab: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 100 : 78,
    right: 20,
    width: 52,
    height: 52,
    borderRadius: 26,
    justifyContent: 'center',
    alignItems: 'center',
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
    elevation: 8,
  },
});
