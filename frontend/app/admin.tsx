import React, { useState, useEffect, useContext, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput,
  Alert, ActivityIndicator, RefreshControl, Modal, Pressable, Image, Platform,
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
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);
  const [actionModalVisible, setActionModalVisible] = useState(false);

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
    setSelectedUser(targetUser);
    setActionModalVisible(true);
  };

  const changeRole = async (targetUser: AdminUser, newRole: string) => {
    const doChange = async () => {
      setActionModalVisible(false);
      try {
        await updateUserRole(targetUser.id, newRole);
        setUsers((prev) =>
          prev.map((u) => (u.id === targetUser.id ? { ...u, role: newRole } : u))
        );
      } catch (error: any) {
        Alert.alert('Error', error.message || 'Failed to update role');
      }
    };

    const displayName = targetUser.displayName || targetUser.username || 'this user';
    if (Platform.OS === 'web') {
      if (window.confirm(`Change ${displayName}'s role to ${newRole}?`)) {
        await doChange();
      }
    } else {
      Alert.alert(
        'Confirm Role Change',
        `Change ${displayName}'s role to ${newRole}?`,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Confirm', style: 'destructive', onPress: doChange },
        ]
      );
    }
  };

  const toggleVerification = async (targetUser: AdminUser) => {
    setActionModalVisible(false);
    try {
      await updateUserVerification(targetUser.id, !targetUser.verified);
      setUsers((prev) =>
        prev.map((u) =>
          u.id === targetUser.id ? { ...u, verified: !targetUser.verified } : u
        )
      );
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
        <ActivityIndicator size="large" color="#22C55E" />
        <Text style={styles.loadingText}>Loading admin panel...</Text>
      </View>
    );
  }

  const renderUserItem = ({ item }: { item: AdminUser }) => (
    <TouchableOpacity style={styles.userItem} onPress={() => handleUserAction(item)}>
      {item.avatarUrl ? (
        <Image source={{ uri: item.avatarUrl.startsWith('/uploads/') ? getImageUrl(item.avatarUrl) : item.avatarUrl }} style={styles.userAvatar} />
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
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#22C55E" />
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>
              {search ? 'No users match your search.' : 'No users found.'}
            </Text>
          </View>
        }
      />

      {/* User action modal */}
      <Modal
        visible={actionModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setActionModalVisible(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setActionModalVisible(false)}>
          <Pressable style={styles.modalSheet} onPress={e => e.stopPropagation()}>
            {selectedUser && (
              <>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>
                    {selectedUser.displayName || selectedUser.username || 'User'}
                  </Text>
                  <Text style={styles.modalSubtitle}>
                    Current role: <Text style={styles.modalRoleBold}>{selectedUser.role}</Text>
                    {' · '}Verified: {selectedUser.verified ? 'Yes' : 'No'}
                  </Text>
                </View>

                {user?.role === 'admin' && (
                  <>
                    <Text style={styles.modalSectionLabel}>Change Role</Text>
                    {selectedUser.id === user?.id ? (
                      <Text style={{ color: '#999', fontSize: 14, marginBottom: 16 }}>
                        Cannot change your own role.
                      </Text>
                    ) : (
                      <View style={styles.roleGrid}>
                        {ROLE_OPTIONS.map(r => (
                          <Pressable
                            key={r}
                            style={[
                              styles.roleOption,
                              selectedUser.role === r && styles.roleOptionActive,
                            ]}
                            onPress={() => selectedUser.role !== r && changeRole(selectedUser, r)}
                          >
                            <Text style={[
                              styles.roleOptionText,
                              selectedUser.role === r && styles.roleOptionTextActive,
                            ]}>
                              {r}
                            </Text>
                          </Pressable>
                        ))}
                      </View>
                    )}

                    <Pressable
                      style={[styles.verifyButton, selectedUser.verified && styles.verifyButtonActive]}
                      onPress={() => toggleVerification(selectedUser)}
                    >
                      <Ionicons
                        name={selectedUser.verified ? 'close-circle-outline' : 'checkmark-circle-outline'}
                        size={18}
                        color={selectedUser.verified ? '#e74c3c' : '#22C55E'}
                        style={{ marginRight: 8 }}
                      />
                      <Text style={[styles.verifyButtonText, selectedUser.verified && styles.verifyButtonTextActive]}>
                        {selectedUser.verified ? 'Remove Verification' : 'Verify User'}
                      </Text>
                    </Pressable>
                  </>
                )}

                <Pressable
                  style={styles.modalCancelButton}
                  onPress={() => setActionModalVisible(false)}
                >
                  <Text style={styles.modalCancelText}>Cancel</Text>
                </Pressable>
              </>
            )}
          </Pressable>
        </Pressable>
      </Modal>
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
    color: '#22C55E',
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
    color: '#22C55E',
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
    color: '#22C55E',
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
    backgroundColor: '#22C55E',
    borderRadius: 8,
  },
  backButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: 36,
  },
  modalHeader: {
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
  },
  modalSubtitle: {
    fontSize: 13,
    color: '#999',
    marginTop: 4,
  },
  modalRoleBold: {
    fontWeight: '700',
    color: '#333',
    textTransform: 'capitalize',
  },
  modalSectionLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#999',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 10,
  },
  roleGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  roleOption: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#ddd',
    backgroundColor: '#f9f9f9',
  },
  roleOptionActive: {
    backgroundColor: '#22C55E',
    borderColor: '#22C55E',
  },
  roleOptionText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    textTransform: 'capitalize',
  },
  roleOptionTextActive: {
    color: '#fff',
  },
  verifyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#22C55E',
    marginBottom: 12,
  },
  verifyButtonActive: {
    borderColor: '#e74c3c',
  },
  verifyButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#22C55E',
  },
  verifyButtonTextActive: {
    color: '#e74c3c',
  },
  modalCancelButton: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  modalCancelText: {
    fontSize: 15,
    color: '#999',
    fontWeight: '500',
  },
});
