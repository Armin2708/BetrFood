import React, { useState, useContext, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { AuthContext } from '../../context/AuthenticationContext';
import {
  fetchAdminUsers,
  updateUserRole,
  fetchRoleAuditLog,
  AdminUser,
  AuditLogEntry,
} from '../../services/api';

type Tab = 'users' | 'audit';
const ROLES = ['user', 'moderator', 'admin'] as const;
type Role = typeof ROLES[number];

const ROLE_COLORS: Record<Role, string> = {
  user: '#999',
  moderator: '#007AFF',
  admin: '#FF6B35',
};

export default function AdminDashboard() {
  const { token } = useContext(AuthContext) as any;

  const [activeTab, setActiveTab] = useState<Tab>('users');
  const [search, setSearch] = useState('');
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [auditLog, setAuditLog] = useState<AuditLogEntry[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [loadingAudit, setLoadingAudit] = useState(false);
  const [updatingRoleFor, setUpdatingRoleFor] = useState<string | null>(null);

  // ── Load users ────────────────────────────────────────────────────────────

  const loadUsers = useCallback(async (q = '') => {
    setLoadingUsers(true);
    try {
      const data = await fetchAdminUsers(token, q);
      setUsers(data.users);
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to load users.');
    } finally {
      setLoadingUsers(false);
    }
  }, [token]);

  // ── Load audit log ────────────────────────────────────────────────────────

  const loadAuditLog = useCallback(async () => {
    setLoadingAudit(true);
    try {
      const data = await fetchRoleAuditLog(token);
      setAuditLog(data.entries);
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to load audit log.');
    } finally {
      setLoadingAudit(false);
    }
  }, [token]);

  useFocusEffect(
    useCallback(() => {
      loadUsers();
    }, [loadUsers])
  );

  // ── Search ────────────────────────────────────────────────────────────────

  const handleSearch = (text: string) => {
    setSearch(text);
    loadUsers(text);
  };

  // ── Role change ───────────────────────────────────────────────────────────

  const handleRoleChange = (user: AdminUser, newRole: Role) => {
    if (user.role === newRole) return;
    Alert.alert(
      'Change Role',
      `Change @${user.username}'s role from "${user.role}" to "${newRole}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm',
          style: newRole === 'admin' ? 'destructive' : 'default',
          onPress: async () => {
            setUpdatingRoleFor(user.id);
            try {
              await updateUserRole(token, user.id, newRole);
              setUsers((prev) =>
                prev.map((u) => (u.id === user.id ? { ...u, role: newRole } : u))
              );
              // Refresh audit log if it's visible
              if (activeTab === 'audit') loadAuditLog();
            } catch (e: any) {
              Alert.alert('Error', e.message || 'Failed to update role.');
            } finally {
              setUpdatingRoleFor(null);
            }
          },
        },
      ]
    );
  };

  // ── Tab switch ────────────────────────────────────────────────────────────

  const handleTabSwitch = (tab: Tab) => {
    setActiveTab(tab);
    if (tab === 'audit' && auditLog.length === 0) loadAuditLog();
  };

  // ── Render user row ───────────────────────────────────────────────────────

  const renderUser = ({ item }: { item: AdminUser }) => (
    <View style={styles.userRow}>
      <View style={styles.userInfo}>
        <Text style={styles.username}>@{item.username}</Text>
        <Text style={styles.email}>{item.email}</Text>
      </View>
      <View style={styles.roleSection}>
        {updatingRoleFor === item.id ? (
          <ActivityIndicator size="small" color="#FF6B35" />
        ) : (
          <View style={styles.roleButtons}>
            {ROLES.map((role) => (
              <TouchableOpacity
                key={role}
                style={[
                  styles.roleChip,
                  item.role === role && { backgroundColor: ROLE_COLORS[role] },
                ]}
                onPress={() => handleRoleChange(item, role)}
              >
                <Text
                  style={[
                    styles.roleChipText,
                    item.role === role && styles.roleChipTextActive,
                  ]}
                >
                  {role}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>
    </View>
  );

  // ── Render audit row ──────────────────────────────────────────────────────

  const renderAuditEntry = ({ item }: { item: AuditLogEntry }) => (
    <View style={styles.auditRow}>
      <View style={styles.auditLeft}>
        <Text style={styles.auditTarget}>@{item.targetUsername}</Text>
        <View style={styles.auditRoleChange}>
          <Text style={[styles.auditRole, { color: ROLE_COLORS[item.previousRole as Role] }]}>
            {item.previousRole}
          </Text>
          <Ionicons name="arrow-forward" size={12} color="#999" style={{ marginHorizontal: 4 }} />
          <Text style={[styles.auditRole, { color: ROLE_COLORS[item.newRole as Role] }]}>
            {item.newRole}
          </Text>
        </View>
        <Text style={styles.auditMeta}>
          by @{item.adminUsername} · {new Date(item.createdAt).toLocaleDateString()}
        </Text>
      </View>
    </View>
  );

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <View style={styles.container}>

      {/* Tab bar */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'users' && styles.tabActive]}
          onPress={() => handleTabSwitch('users')}
        >
          <Ionicons name="people-outline" size={18} color={activeTab === 'users' ? '#FF6B35' : '#999'} />
          <Text style={[styles.tabText, activeTab === 'users' && styles.tabTextActive]}>Users</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'audit' && styles.tabActive]}
          onPress={() => handleTabSwitch('audit')}
        >
          <Ionicons name="document-text-outline" size={18} color={activeTab === 'audit' ? '#FF6B35' : '#999'} />
          <Text style={[styles.tabText, activeTab === 'audit' && styles.tabTextActive]}>Audit Log</Text>
        </TouchableOpacity>
      </View>

      {/* Users tab */}
      {activeTab === 'users' && (
        <>
          <View style={styles.searchBar}>
            <Ionicons name="search-outline" size={18} color="#999" />
            <TextInput
              style={styles.searchInput}
              placeholder="Search by username or email..."
              placeholderTextColor="#bbb"
              value={search}
              onChangeText={handleSearch}
              autoCapitalize="none"
              autoCorrect={false}
            />
            {search.length > 0 && (
              <TouchableOpacity onPress={() => handleSearch('')}>
                <Ionicons name="close-circle" size={18} color="#ccc" />
              </TouchableOpacity>
            )}
          </View>

          {loadingUsers ? (
            <View style={styles.center}>
              <ActivityIndicator size="large" color="#FF6B35" />
            </View>
          ) : (
            <FlatList
              data={users}
              keyExtractor={(item) => item.id}
              renderItem={renderUser}
              ItemSeparatorComponent={() => <View style={styles.separator} />}
              ListEmptyComponent={
                <View style={styles.center}>
                  <Ionicons name="people-outline" size={40} color="#ccc" />
                  <Text style={styles.emptyText}>No users found</Text>
                </View>
              }
              contentContainerStyle={styles.listContent}
            />
          )}
        </>
      )}

      {/* Audit log tab */}
      {activeTab === 'audit' && (
        loadingAudit ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color="#FF6B35" />
          </View>
        ) : (
          <FlatList
            data={auditLog}
            keyExtractor={(item) => item.id}
            renderItem={renderAuditEntry}
            ItemSeparatorComponent={() => <View style={styles.separator} />}
            ListEmptyComponent={
              <View style={styles.center}>
                <Ionicons name="document-text-outline" size={40} color="#ccc" />
                <Text style={styles.emptyText}>No role changes recorded yet</Text>
              </View>
            }
            contentContainerStyle={styles.listContent}
          />
        )
      )}

    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  tabBar: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderColor: '#eee',
  },
  tab: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: 12, gap: 6, borderBottomWidth: 2, borderBottomColor: 'transparent',
  },
  tabActive: { borderBottomColor: '#FF6B35' },
  tabText: { fontSize: 14, fontWeight: '600', color: '#999' },
  tabTextActive: { color: '#FF6B35' },
  searchBar: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    margin: 16, paddingHorizontal: 14, paddingVertical: 10,
    borderWidth: 1, borderColor: '#eee', borderRadius: 10, backgroundColor: '#fafafa',
  },
  searchInput: { flex: 1, fontSize: 14, color: '#333' },
  listContent: { paddingHorizontal: 16, paddingBottom: 40 },
  userRow: {
    paddingVertical: 14,
  },
  userInfo: { marginBottom: 10 },
  username: { fontSize: 15, fontWeight: '700', color: '#222' },
  email: { fontSize: 12, color: '#999', marginTop: 2 },
  roleSection: { flexDirection: 'row', alignItems: 'center' },
  roleButtons: { flexDirection: 'row', gap: 8 },
  roleChip: {
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20,
    borderWidth: 1, borderColor: '#ddd', backgroundColor: '#fafafa',
  },
  roleChipText: { fontSize: 12, fontWeight: '600', color: '#999' },
  roleChipTextActive: { color: '#fff' },
  separator: { height: 1, backgroundColor: '#f0f0f0' },
  auditRow: { paddingVertical: 14 },
  auditLeft: { gap: 4 },
  auditTarget: { fontSize: 15, fontWeight: '700', color: '#222' },
  auditRoleChange: { flexDirection: 'row', alignItems: 'center' },
  auditRole: { fontSize: 13, fontWeight: '600' },
  auditMeta: { fontSize: 12, color: '#bbb', marginTop: 2 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: 60, gap: 10 },
  emptyText: { fontSize: 15, color: '#ccc', fontWeight: '500' },
});
