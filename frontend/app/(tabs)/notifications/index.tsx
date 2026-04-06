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
  checkExpiringItems,
  acceptFollowRequest,
  denyFollowRequest,
  fetchPendingFollowRequests,
  clearAllNotifications,
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
      return { name: 'person-add', color: '#22C55E' };
    case 'like':
      return { name: 'heart', color: '#E91E63' };
    case 'comment':
      return { name: 'chatbubble', color: '#2196F3' };
    case 'expiring_item':
      return { name: 'alert-circle', color: '#EF4444' };
    case 'follow_request':
      return { name: 'person-add-outline', color: '#F59E0B' };
    case 'follow_request_accepted':
      return { name: 'checkmark-circle', color: '#22C55E' };
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
    case 'expiring_item': {
      const itemName = data?.itemName || 'An item';
      const days = data?.daysUntilExpiry;
      if (days < 0) return `${itemName} has expired!`;
      if (days === 0) return `${itemName} expires today!`;
      if (days === 1) return `${itemName} expires tomorrow`;
      return `${itemName} expires in ${days} days`;
    }
    case 'follow_request': {
      const reqUsername = data?.requesterUsername || 'Someone';
      return `${reqUsername} wants to follow you`;
    }
    case 'follow_request_accepted': {
      const acceptedUsername = data?.acceptedByUsername || 'Someone';
      return `${acceptedUsername} accepted your follow request`;
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
      // Trigger expiring item check before loading notifications
      try {
        const expiringResult = await checkExpiringItems();
        console.log('[EXPIRING] check result:', expiringResult);
      } catch (e) {
        console.error('[EXPIRING] check failed:', e);
      }
      const [result, pendingRequests] = await Promise.all([
        fetchNotifications(0, 50),
        fetchPendingFollowRequests().catch(() => [] as any[]),
      ]);
      // Build set of requester IDs that are still pending
      const pendingIds = new Set(pendingRequests.map((r: any) => r.requesterId));
      // Convert follow_request notifications that are no longer pending to new_follower
      const processed = result.notifications.map((n: Notification) => {
        if (n.type === 'follow_request' && !pendingIds.has(n.data?.requesterId)) {
          return {
            ...n,
            type: 'new_follower',
            read: true,
            data: {
              ...n.data,
              followerId: n.data?.requesterId,
              followerUsername: n.data?.requesterUsername,
            },
          };
        }
        return n;
      });
      setNotifications(processed);
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
            router.push(`/feeds/user-profile?userId=${notification.data.followerId}` as any);
          }
          break;
        case 'like':
        case 'comment':
          // Posts are viewed in the feed, no detail page
          break;
        case 'follow_request':
          if (notification.data?.requesterId) {
            router.push(`/feeds/user-profile?userId=${notification.data.requesterId}` as any);
          }
          break;
        case 'follow_request_accepted':
          if (notification.data?.acceptedBy) {
            router.push(`/feeds/user-profile?userId=${notification.data.acceptedBy}` as any);
          }
          break;
        case 'expiring_item':
          router.push('/(tabs)/pantry' as any);
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

  const handleClearAll = useCallback(async () => {
    try {
      await clearAllNotifications();
      setNotifications([]);
    } catch (error) {
      console.error('Failed to clear notifications:', error);
    }
  }, []);

  const hasUnread = notifications.some((n) => !n.read);

  const convertToFollower = useCallback((notificationId: string) => {
    setNotifications(prev => prev.map(n =>
      n.id === notificationId
        ? {
            ...n,
            type: 'new_follower',
            read: true,
            data: {
              ...n.data,
              followerId: n.data?.requesterId,
              followerUsername: n.data?.requesterUsername,
            },
          }
        : n
    ));
  }, []);

  const handleAcceptFollow = useCallback(async (notification: Notification) => {
    const requesterId = notification.data?.requesterId;
    if (!requesterId) return;
    try {
      await acceptFollowRequest(requesterId);
    } catch (error: any) {
      // If 404, the request was already accepted — still convert the notification
      if (!error.message?.includes('not found')) {
        console.error('Failed to accept follow request:', error);
        return;
      }
    }
    try { await markNotificationRead(notification.id); } catch {}
    convertToFollower(notification.id);
  }, [convertToFollower]);

  const handleDenyFollow = useCallback(async (notification: Notification) => {
    const requesterId = notification.data?.requesterId;
    if (!requesterId) return;
    try {
      await denyFollowRequest(requesterId);
      setNotifications(prev => prev.filter(n => n.id !== notification.id));
    } catch (error) {
      console.error('Failed to deny follow request:', error);
    }
  }, []);

  const renderNotification = ({ item }: { item: Notification }) => {
    const icon = getNotificationIcon(item.type);
    const message = getNotificationMessage(item);
    const timeAgo = getRelativeTime(item.createdAt);
    const isFollowRequest = item.type === 'follow_request';

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
          {isFollowRequest && (
            <View style={styles.followRequestActions}>
              <Pressable
                style={styles.acceptButton}
                onPress={() => handleAcceptFollow(item)}
              >
                <Text style={styles.acceptButtonText}>Accept</Text>
              </Pressable>
              <Pressable
                style={styles.denyButton}
                onPress={() => handleDenyFollow(item)}
              >
                <Text style={styles.denyButtonText}>Deny</Text>
              </Pressable>
            </View>
          )}
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
            notifications.length > 0 ? (
              <View style={styles.headerActions}>
                {hasUnread && (
                  <Pressable onPress={handleMarkAllRead} style={styles.markAllButton}>
                    <Text style={styles.markAllText}>Mark all read</Text>
                  </Pressable>
                )}
                <Pressable onPress={handleClearAll} style={styles.markAllButton}>
                  <Ionicons name="trash-outline" size={18} color="#EF4444" />
                </Pressable>
              </View>
            ) : null,
        }}
      />
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#22C55E" />
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
              tintColor="#22C55E"
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
  followRequestActions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  acceptButton: {
    backgroundColor: '#22C55E',
    paddingVertical: 6,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  acceptButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },
  denyButton: {
    backgroundColor: '#F2F2F7',
    paddingVertical: 6,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  denyButtonText: {
    color: '#666666',
    fontSize: 13,
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
    backgroundColor: '#22C55E',
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
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  markAllButton: {
    marginRight: 8,
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  markAllText: {
    fontSize: 14,
    color: '#22C55E',
    fontWeight: '600',
  },
});
