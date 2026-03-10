import { Tabs, Redirect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { ComponentProps } from 'react';
import { useContext } from "react";
import { AuthContext } from "../../context/AuthenticationContext";

type IoniconName = ComponentProps<typeof Ionicons>['name'];

export default function TabsLayout() {
  const { user, loading } = useContext(AuthContext);

  if (!loading && !user) {
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
