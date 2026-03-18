import {
  View,
  Text,
  FlatList,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useState, useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
  fetchNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  Notification,
} from '../../../services/api';

function getRelativeTime(dateString: string): string {
  const now = new Date();
  const date = new Date(dateString);
  const diffMs = now.getTime() - date.getTime();
  const diffSeconds = Math.floor(diffMs / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);
  const diffWeeks = Math.floor(diffDays / 7);

  if (diffSeconds < 60) return 'just now';
  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  if (diffWeeks < 4) return `${diffWeeks}w ago`;
  return date.toLocaleDateString();
}

function getNotificationIcon(type: string): { name: string; color: string } {
  switch (type) {
    case 'new_follower':
      return { name: 'person-add', color: '#FF6B35' };
    case 'like':
      return { name: 'heart', color: '#E91E63' };
    case 'comment':
      return { name: 'chatbubble', color: '#2196F3' };
    default:
      return { name: 'notifications', color: '#757575' };
  }
}

function getNotificationMessage(notification: Notification): string {
  const { type, data } = notification;
  switch (type) {
    case 'new_follower': {
      const username = data?.followerUsername || 'Someone';
      return `${username} started following you`;
    }
    case 'like': {
      const username = data?.username || 'Someone';
      return `${username} liked your post`;
    }
    case 'comment': {
      const username = data?.username || 'Someone';
      return `${username} commented on your post`;
    }
    default:
      return 'You have a new notification';
  }
}

export default function NotificationsScreen() {
  const router = useRouter();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadNotifications = useCallback(async () => {
    try {
      const result = await fetchNotifications(0, 50);
      setNotifications(result.notifications);
    } catch (error) {
      console.error('Failed to load notifications:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadNotifications();
    }, [loadNotifications])
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadNotifications();
  }, [loadNotifications]);

  const handleNotificationPress = useCallback(
    async (notification: Notification) => {
      // Mark as read
      if (!notification.read) {
        try {
          await markNotificationRead(notification.id);
          setNotifications((prev) =>
            prev.map((n) => (n.id === notification.id ? { ...n, read: true } : n))
          );
        } catch (error) {
          console.error('Failed to mark notification as read:', error);
        }
      }

      // Navigate based on type
      switch (notification.type) {
        case 'new_follower':
          if (notification.data?.followerId) {
            router.push(`/user/${notification.data.followerId}` as any);
          }
          break;
        case 'like':
        case 'comment':
          if (notification.data?.postId) {
            router.push(`/post-detail?postId=${notification.data.postId}`);
          }
          break;
      }
    },
    [router]
  );

  const handleMarkAllRead = useCallback(async () => {
    try {
      await markAllNotificationsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    } catch (error) {
      console.error('Failed to mark all as read:', error);
    }
  }, []);

  const hasUnread = notifications.some((n) => !n.read);

  const renderNotification = ({ item }: { item: Notification }) => {
    const icon = getNotificationIcon(item.type);
    const message = getNotificationMessage(item);
    const timeAgo = getRelativeTime(item.createdAt);

    return (
      <Pressable
        style={[styles.notificationItem, !item.read && styles.unreadItem]}
        onPress={() => handleNotificationPress(item)}
      >
        <View style={[styles.iconContainer, { backgroundColor: icon.color + '15' }]}>
          <Ionicons name={icon.name as any} size={22} color={icon.color} />
        </View>
        <View style={styles.contentContainer}>
          <Text style={[styles.messageText, !item.read && styles.unreadText]}>
            {message}
          </Text>
          <Text style={styles.timeText}>{timeAgo}</Text>
        </View>
        {!item.read && <View style={styles.unreadDot} />}
      </Pressable>
    );
  };

  const renderEmpty = () => {
    if (loading) return null;
    return (
      <View style={styles.emptyContainer}>
        <Ionicons name="notifications-off-outline" size={64} color="#CCC" />
        <Text style={styles.emptyTitle}>No notifications yet</Text>
        <Text style={styles.emptySubtitle}>
          When someone interacts with you, you'll see it here
        </Text>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          headerShown: true,
          title: 'Notifications',
          headerRight: () =>
            hasUnread ? (
              <Pressable onPress={handleMarkAllRead} style={styles.markAllButton}>
                <Text style={styles.markAllText}>Mark all read</Text>
              </Pressable>
            ) : null,
        }}
      />
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FF6B35" />
        </View>
      ) : (
        <FlatList
          data={notifications}
          renderItem={renderNotification}
          keyExtractor={(item) => item.id}
          ListEmptyComponent={renderEmpty}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#FF6B35"
            />
          }
          contentContainerStyle={
            notifications.length === 0 ? styles.emptyList : undefined
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  notificationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#EEEEEE',
  },
  unreadItem: {
    backgroundColor: '#FFF5F0',
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  contentContainer: {
    flex: 1,
    marginRight: 8,
  },
  messageText: {
    fontSize: 15,
    color: '#333333',
    lineHeight: 20,
  },
  unreadText: {
    fontWeight: '600',
  },
  timeText: {
    fontSize: 13,
    color: '#999999',
    marginTop: 2,
  },
  unreadDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#FF6B35',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 80,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333333',
    marginTop: 16,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#999999',
    marginTop: 8,
    textAlign: 'center',
    paddingHorizontal: 40,
  },
  emptyList: {
    flexGrow: 1,
  },
  markAllButton: {
    marginRight: 8,
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  markAllText: {
    fontSize: 14,
    color: '#FF6B35',
    fontWeight: '600',
  },
});
