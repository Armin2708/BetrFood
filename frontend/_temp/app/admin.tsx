import React, { useState, useEffect, useContext, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput,
  Alert, ActivityIndicator, RefreshControl, ActionSheetIOS, Platform, Image,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { AuthContext } from '../context/AuthenticationContext';
import {
  fetchAdminUsers, fetchAdminStats, updateUserRole, updateUserVerification,
  AdminUser, AdminStats, getImageUrl,
} from '../services/api';

const ROLE_OPTIONS = ['user', 'creator', 'moderator', 'admin'];

export default function AdminScreen() {
  const { user } = useContext(AuthContext);
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<AdminUser[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [totalUsers, setTotalUsers] = useState(0);

  // Check access
  const isAllowed = user?.role === 'admin' || user?.role === 'moderator';

  useEffect(() => {
    if (isAllowed) {
      loadData();
    }
  }, [isAllowed]);

  useEffect(() => {
    if (!search.trim()) {
      setFilteredUsers(users);
    } else {
      const q = search.toLowerCase();
      setFilteredUsers(
        users.filter(
          (u) =>
            (u.username || '').toLowerCase().includes(q) ||
            (u.displayName || '').toLowerCase().includes(q)
        )
      );
    }
  }, [search, users]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [statsData, usersData] = await Promise.all([
        fetchAdminStats(),
        fetchAdminUsers(1, 50),
      ]);
      setStats(statsData);
      setUsers(usersData.users);
      setTotalUsers(usersData.total);
      setPage(1);
      setHasMore(usersData.users.length < usersData.total);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to load admin data');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, []);

  const loadMore = async () => {
    if (!hasMore || loading) return;
    try {
      const nextPage = page + 1;
      const result = await fetchAdminUsers(nextPage, 50);
      setUsers((prev) => [...prev, ...result.users]);
      setPage(nextPage);
      setHasMore(users.length + result.users.length < result.total);
    } catch {}
  };

  const handleUserAction = (targetUser: AdminUser) => {
    const isAdmin = user?.role === 'admin';

    const options = [
      ...ROLE_OPTIONS.map((r) => `Set role: ${r}${targetUser.role === r ? ' (current)' : ''}`),
      targetUser.verified ? 'Remove verification' : 'Verify user',
      'Cancel',
    ];
    const cancelIndex = options.length - 1;

    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options,
          cancelButtonIndex: cancelIndex,
          title: `${targetUser.displayName || targetUser.username || 'User'}`,
          message: `Current role: ${targetUser.role}`,
        },
        (buttonIndex) => handleActionSelection(buttonIndex, targetUser, isAdmin, cancelIndex)
      );
    } else {
      // Android fallback: use Alert with buttons
      Alert.alert(
        targetUser.displayName || targetUser.username || 'User',
        `Current role: ${targetUser.role}\nVerified: ${targetUser.verified ? 'Yes' : 'No'}`,
        [
          ...ROLE_OPTIONS.map((r) => ({
            text: `Role: ${r}`,
            onPress: () => {
              if (!isAdmin) {
                Alert.alert('Permission denied', 'Only admins can change roles.');
                return;
              }
              if (r !== targetUser.role) {
                changeRole(targetUser, r);
              }
            },
          })),
          {
            text: targetUser.verified ? 'Remove verification' : 'Verify user',
            onPress: () => {
              if (!isAdmin) {
                Alert.alert('Permission denied', 'Only admins can change verification.');
                return;
              }
              toggleVerification(targetUser);
            },
          },
          { text: 'Cancel', style: 'cancel' },
        ]
      );
    }
  };

  const handleActionSelection = (
    buttonIndex: number,
    targetUser: AdminUser,
    isAdmin: boolean,
    cancelIndex: number
  ) => {
    if (buttonIndex === cancelIndex) return;

    if (buttonIndex < ROLE_OPTIONS.length) {
      const newRole = ROLE_OPTIONS[buttonIndex];
      if (!isAdmin) {
        Alert.alert('Permission denied', 'Only admins can change roles.');
        return;
      }
      if (newRole !== targetUser.role) {
        changeRole(targetUser, newRole);
      }
    } else if (buttonIndex === ROLE_OPTIONS.length) {
      if (!isAdmin) {
        Alert.alert('Permission denied', 'Only admins can change verification.');
        return;
      }
      toggleVerification(targetUser);
    }
  };

  const changeRole = async (targetUser: AdminUser, newRole: string) => {
    try {
      await updateUserRole(targetUser.id, newRole);
      setUsers((prev) =>
        prev.map((u) => (u.id === targetUser.id ? { ...u, role: newRole } : u))
      );
      Alert.alert('Success', `Role updated to ${newRole}`);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to update role');
    }
  };

  const toggleVerification = async (targetUser: AdminUser) => {
    try {
      await updateUserVerification(targetUser.id, !targetUser.verified);
      setUsers((prev) =>
        prev.map((u) =>
          u.id === targetUser.id ? { ...u, verified: !targetUser.verified } : u
        )
      );
      Alert.alert('Success', targetUser.verified ? 'Verification removed' : 'User verified');
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to update verification');
    }
  };

  if (!isAllowed) {
    return (
      <View style={[styles.container, styles.centered]}>
        <Ionicons name="lock-closed" size={48} color="#ccc" />
        <Text style={styles.accessDeniedTitle}>Access Denied</Text>
        <Text style={styles.accessDeniedText}>
          You need admin or moderator privileges to access this panel.
        </Text>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (loading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color="#FF6B35" />
        <Text style={styles.loadingText}>Loading admin panel...</Text>
      </View>
    );
  }

  const renderUserItem = ({ item }: { item: AdminUser }) => (
    <TouchableOpacity style={styles.userItem} onPress={() => handleUserAction(item)}>
      {item.avatarUrl ? (
        <Image source={{ uri: item.avatarUrl }} style={styles.userAvatar} />
      ) : (
        <View style={[styles.userAvatar, styles.avatarFallback]}>
          <Ionicons name="person" size={20} color="#999" />
        </View>
      )}
      <View style={styles.userInfo}>
        <View style={styles.userNameRow}>
          <Text style={styles.userName} numberOfLines={1}>
            {item.displayName || item.username || 'Unknown'}
          </Text>
          {item.verified && (
            <Text style={styles.verifiedBadge}>{'\u2713'}</Text>
          )}
        </View>
        {item.username && (
          <Text style={styles.userUsername}>@{item.username}</Text>
        )}
      </View>
      <View style={styles.roleBadge}>
        <Text style={[
          styles.roleText,
          item.role === 'admin' && styles.roleAdmin,
          item.role === 'moderator' && styles.roleModerator,
          item.role === 'creator' && styles.roleCreator,
        ]}>
          {item.role}
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color="#ccc" />
    </TouchableOpacity>
  );

  const renderHeader = () => (
    <View>
      {/* Stats Section */}
      {stats && (
        <View style={styles.statsSection}>
          <Text style={styles.sectionTitle}>Overview</Text>
          <View style={styles.statsGrid}>
            <View style={styles.statCard}>
              <Text style={styles.statNumber}>{stats.totalUsers}</Text>
              <Text style={styles.statLabel}>Total Users</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statNumber}>{stats.totalPosts}</Text>
              <Text style={styles.statLabel}>Total Posts</Text>
            </View>
          </View>
          {stats.usersByRole && Object.keys(stats.usersByRole).length > 0 && (
            <View style={styles.roleBreakdown}>
              <Text style={styles.roleBreakdownTitle}>Users by Role</Text>
              {Object.entries(stats.usersByRole).map(([role, count]) => (
                <View key={role} style={styles.roleRow}>
                  <Text style={styles.roleRowLabel}>{role}</Text>
                  <Text style={styles.roleRowCount}>{count}</Text>
                </View>
              ))}
            </View>
          )}
        </View>
      )}

      {/* Search */}
      <View style={styles.searchSection}>
        <Text style={styles.sectionTitle}>
          Users ({totalUsers})
        </Text>
        <View style={styles.searchBar}>
          <Ionicons name="search" size={18} color="#999" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by name or username..."
            placeholderTextColor="#999"
            value={search}
            onChangeText={setSearch}
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch('')}>
              <Ionicons name="close-circle" size={18} color="#999" />
            </TouchableOpacity>
          )}
        </View>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Admin Panel</Text>
        <View style={{ width: 24 }} />
      </View>

      <FlatList
        data={filteredUsers}
        keyExtractor={(item) => item.id}
        renderItem={renderUserItem}
        ListHeaderComponent={renderHeader}
        contentContainerStyle={styles.list}
        onEndReached={loadMore}
        onEndReachedThreshold={0.5}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#FF6B35" />
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>
              {search ? 'No users match your search.' : 'No users found.'}
            </Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 60,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderColor: '#eee',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  list: {
    paddingBottom: 40,
  },

  // Stats
  statsSection: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#FFF8F0',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#FFE0C2',
    padding: 16,
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FF6B35',
  },
  statLabel: {
    fontSize: 13,
    color: '#666',
    marginTop: 4,
  },
  roleBreakdown: {
    marginTop: 12,
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    padding: 12,
  },
  roleBreakdownTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginBottom: 8,
  },
  roleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  roleRowLabel: {
    fontSize: 14,
    color: '#333',
    textTransform: 'capitalize',
  },
  roleRowCount: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FF6B35',
  },

  // Search
  searchSection: {
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: '#333',
  },

  // User list
  userItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  userAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  avatarFallback: {
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  userInfo: {
    flex: 1,
    marginLeft: 12,
  },
  userNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  userName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
  },
  verifiedBadge: {
    color: '#1DA1F2',
    fontSize: 14,
    fontWeight: 'bold',
    marginLeft: 4,
  },
  userUsername: {
    fontSize: 13,
    color: '#999',
    marginTop: 1,
  },
  roleBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: '#f0f0f0',
    marginRight: 8,
  },
  roleText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
    textTransform: 'capitalize',
  },
  roleAdmin: {
    color: '#ff3b30',
  },
  roleModerator: {
    color: '#FF6B35',
  },
  roleCreator: {
    color: '#34C759',
  },

  // Empty / Loading
  emptyState: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 15,
    color: '#999',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 15,
    color: '#666',
  },

  // Access denied
  accessDeniedTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 16,
  },
  accessDeniedText: {
    fontSize: 15,
    color: '#666',
    textAlign: 'center',
    marginTop: 8,
    paddingHorizontal: 40,
  },
  backButton: {
    marginTop: 24,
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: '#FF6B35',
    borderRadius: 8,
  },
  backButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
});
