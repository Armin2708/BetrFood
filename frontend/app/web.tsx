import React, { useState, useEffect, useCallback, useContext } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput,
  ActivityIndicator, Image, Platform,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { AuthContext } from '../context/AuthenticationContext';
import { useRole } from '../hooks/useRole';
import {
  fetchAdminUsers, fetchAdminStats, updateUserRole, updateUserVerification,
  AdminUser, AdminStats, getImageUrl,
} from '../services/api';

const ROLE_OPTIONS = ['user', 'creator', 'moderator', 'admin'] as const;
const ITEMS_PER_PAGE = 20;

const ROLE_COLORS: Record<string, string> = {
  admin: '#EF4444',
  moderator: '#22C55E',
  creator: '#3B82F6',
  user: '#6B7280',
};

// ─── Stat Card ───────────────────────────────────────────────────────────────

function StatCard({ icon, label, value, color }: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: number | string;
  color: string;
}) {
  return (
    <View style={styles.statCard}>
      <View style={[styles.statIconWrap, { backgroundColor: color + '14' }]}>
        <Ionicons name={icon} size={22} color={color} />
      </View>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

// ─── Role Badge ──────────────────────────────────────────────────────────────

function RoleBadge({ role }: { role: string }) {
  const color = ROLE_COLORS[role] || '#6B7280';
  return (
    <View style={[styles.roleBadge, { backgroundColor: color + '14', borderColor: color + '33' }]}>
      <Text style={[styles.roleBadgeText, { color }]}>{role}</Text>
    </View>
  );
}

// ─── Main Screen ─────────────────────────────────────────────────────────────

export default function WebAdminScreen() {
  // Gate to web only
  if (Platform.OS !== 'web') {
    return (
      <View style={[styles.container, styles.centered]}>
        <Ionicons name="desktop-outline" size={48} color="#ccc" />
        <Text style={styles.accessTitle}>Desktop Only</Text>
        <Text style={styles.accessSubtitle}>
          This dashboard is designed for web browsers. Use the mobile admin panel instead.
        </Text>
        <TouchableOpacity style={styles.greenButton} onPress={() => router.replace('/admin')}>
          <Text style={styles.greenButtonText}>Open Mobile Admin</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const { user } = useContext(AuthContext);
  const { isAdmin, isAtLeast } = useRole();
  const isAllowed = isAtLeast('moderator');

  const [stats, setStats] = useState<AdminStats | null>(null);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [totalUsers, setTotalUsers] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [tableLoading, setTableLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [actionInProgress, setActionInProgress] = useState<string | null>(null);

  // ── Data loading ────────────────────────────────────────────────────────

  const loadStats = useCallback(async () => {
    try {
      const data = await fetchAdminStats();
      setStats(data);
    } catch (err: any) {
      console.error('Failed to load stats:', err.message);
    }
  }, []);

  const loadUsers = useCallback(async (targetPage: number) => {
    setTableLoading(true);
    try {
      const result = await fetchAdminUsers(targetPage, ITEMS_PER_PAGE);
      setUsers(result.users);
      setTotalUsers(result.total);
      setPage(targetPage);
    } catch (err: any) {
      console.error('Failed to load users:', err.message);
    } finally {
      setTableLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isAllowed) return;
    const init = async () => {
      setLoading(true);
      await Promise.all([loadStats(), loadUsers(1)]);
      setLoading(false);
    };
    init();
  }, [isAllowed, loadStats, loadUsers]);

  // ── Actions ─────────────────────────────────────────────────────────────

  const handleRoleChange = useCallback(async (targetUser: AdminUser, newRole: string) => {
    if (targetUser.id === user?.id) {
      window.alert('You cannot change your own role.');
      return;
    }
    if (targetUser.role === newRole) return;
    const displayName = targetUser.displayName || targetUser.username || 'this user';
    if (!window.confirm(`Change ${displayName}'s role to ${newRole}?`)) return;

    setActionInProgress(targetUser.id);
    try {
      await updateUserRole(targetUser.id, newRole);
      setUsers(prev => prev.map(u => u.id === targetUser.id ? { ...u, role: newRole } : u));
      await loadStats();
    } catch (err: any) {
      window.alert(err.message || 'Failed to update role');
    } finally {
      setActionInProgress(null);
    }
  }, [user?.id, loadStats]);

  const handleToggleVerify = useCallback(async (targetUser: AdminUser) => {
    const action = targetUser.verified ? 'remove verification from' : 'verify';
    const displayName = targetUser.displayName || targetUser.username || 'this user';
    if (!window.confirm(`${action.charAt(0).toUpperCase() + action.slice(1)} ${displayName}?`)) return;

    setActionInProgress(targetUser.id);
    try {
      await updateUserVerification(targetUser.id, !targetUser.verified);
      setUsers(prev => prev.map(u => u.id === targetUser.id ? { ...u, verified: !targetUser.verified } : u));
    } catch (err: any) {
      window.alert(err.message || 'Failed to update verification');
    } finally {
      setActionInProgress(null);
    }
  }, []);

  // ── Derived data ────────────────────────────────────────────────────────

  const filteredUsers = users.filter(u => {
    const matchesSearch = !search.trim() ||
      (u.username || '').toLowerCase().includes(search.toLowerCase()) ||
      (u.displayName || '').toLowerCase().includes(search.toLowerCase());
    const matchesRole = roleFilter === 'all' || u.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  const totalPages = Math.ceil(totalUsers / ITEMS_PER_PAGE);

  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleDateString('en-US', {
        year: 'numeric', month: 'short', day: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  // ── Access denied ───────────────────────────────────────────────────────

  if (!isAllowed) {
    return (
      <View style={[styles.container, styles.centered]}>
        <Ionicons name="lock-closed" size={56} color="#D1D5DB" />
        <Text style={styles.accessTitle}>Access Denied</Text>
        <Text style={styles.accessSubtitle}>
          You need admin or moderator privileges to access this dashboard.
        </Text>
        <TouchableOpacity style={styles.greenButton} onPress={() => router.back()}>
          <Text style={styles.greenButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // ── Loading ─────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color="#22C55E" />
        <Text style={styles.loadingText}>Loading dashboard...</Text>
      </View>
    );
  }

  // ── Main Render ─────────────────────────────────────────────────────────

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity onPress={() => router.back()} style={styles.headerBackBtn}>
            <Ionicons name="arrow-back" size={20} color="#6B7280" />
          </TouchableOpacity>
          <View>
            <Text style={styles.headerTitle}>Admin Dashboard</Text>
            <Text style={styles.headerSubtitle}>
              Manage users, roles, and platform statistics
            </Text>
          </View>
        </View>
        <TouchableOpacity
          style={styles.refreshButton}
          onPress={async () => {
            setLoading(true);
            await Promise.all([loadStats(), loadUsers(1)]);
            setLoading(false);
          }}
        >
          <Ionicons name="refresh" size={18} color="#22C55E" />
          <Text style={styles.refreshButtonText}>Refresh</Text>
        </TouchableOpacity>
      </View>

      {/* Stats Row */}
      {stats && (
        <View style={styles.statsRow}>
          <StatCard icon="people" label="Total Users" value={stats.totalUsers} color="#22C55E" />
          <StatCard icon="document-text" label="Total Posts" value={stats.totalPosts} color="#3B82F6" />
          {Object.entries(stats.usersByRole).map(([role, count]) => (
            <StatCard
              key={role}
              icon={role === 'admin' ? 'shield' : role === 'moderator' ? 'shield-half' : role === 'creator' ? 'create' : 'person'}
              label={role.charAt(0).toUpperCase() + role.slice(1) + 's'}
              value={count}
              color={ROLE_COLORS[role] || '#6B7280'}
            />
          ))}
        </View>
      )}

      {/* Table Section */}
      <View style={styles.tableSection}>
        <View style={styles.tableHeader}>
          <Text style={styles.tableSectionTitle}>
            Users ({totalUsers})
          </Text>
        </View>

        {/* Filters */}
        <View style={styles.filtersRow}>
          <View style={styles.searchWrap}>
            <Ionicons name="search" size={16} color="#9CA3AF" style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search by username or display name..."
              placeholderTextColor="#9CA3AF"
              value={search}
              onChangeText={setSearch}
            />
            {search.length > 0 && (
              <TouchableOpacity onPress={() => setSearch('')} style={styles.searchClear}>
                <Ionicons name="close-circle" size={16} color="#9CA3AF" />
              </TouchableOpacity>
            )}
          </View>

          <View style={styles.roleFilterWrap}>
            <Text style={styles.filterLabel}>Role:</Text>
            {['all', ...ROLE_OPTIONS].map(option => (
              <TouchableOpacity
                key={option}
                style={[
                  styles.filterChip,
                  roleFilter === option && styles.filterChipActive,
                ]}
                onPress={() => setRoleFilter(option)}
              >
                <Text style={[
                  styles.filterChipText,
                  roleFilter === option && styles.filterChipTextActive,
                ]}>
                  {option === 'all' ? 'All' : option.charAt(0).toUpperCase() + option.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Table */}
        <View style={styles.table}>
          {/* Table head */}
          <View style={styles.tableRow}>
            <View style={[styles.tableCell, styles.cellAvatar]}>
              <Text style={styles.tableHeadText}>{''}</Text>
            </View>
            <View style={[styles.tableCell, styles.cellUsername]}>
              <Text style={styles.tableHeadText}>Username</Text>
            </View>
            <View style={[styles.tableCell, styles.cellDisplayName]}>
              <Text style={styles.tableHeadText}>Display Name</Text>
            </View>
            <View style={[styles.tableCell, styles.cellRole]}>
              <Text style={styles.tableHeadText}>Role</Text>
            </View>
            <View style={[styles.tableCell, styles.cellVerified]}>
              <Text style={styles.tableHeadText}>Verified</Text>
            </View>
            <View style={[styles.tableCell, styles.cellDate]}>
              <Text style={styles.tableHeadText}>Created</Text>
            </View>
            {isAdmin && (
              <View style={[styles.tableCell, styles.cellActions]}>
                <Text style={styles.tableHeadText}>Actions</Text>
              </View>
            )}
          </View>

          {/* Table body */}
          {tableLoading ? (
            <View style={styles.tableEmpty}>
              <ActivityIndicator size="small" color="#22C55E" />
              <Text style={styles.tableEmptyText}>Loading users...</Text>
            </View>
          ) : filteredUsers.length === 0 ? (
            <View style={styles.tableEmpty}>
              <Ionicons name="search" size={24} color="#D1D5DB" />
              <Text style={styles.tableEmptyText}>
                {search || roleFilter !== 'all' ? 'No users match your filters.' : 'No users found.'}
              </Text>
            </View>
          ) : (
            filteredUsers.map((item, index) => (
              <View
                key={item.id}
                style={[
                  styles.tableRow,
                  styles.tableBodyRow,
                  index % 2 === 0 && styles.tableRowEven,
                ]}
              >
                {/* Avatar */}
                <View style={[styles.tableCell, styles.cellAvatar]}>
                  {item.avatarUrl ? (
                    <Image
                      source={{
                        uri: item.avatarUrl.startsWith('/uploads/')
                          ? getImageUrl(item.avatarUrl)
                          : item.avatarUrl,
                      }}
                      style={styles.avatar}
                    />
                  ) : (
                    <View style={[styles.avatar, styles.avatarFallback]}>
                      <Ionicons name="person" size={16} color="#9CA3AF" />
                    </View>
                  )}
                </View>

                {/* Username */}
                <View style={[styles.tableCell, styles.cellUsername]}>
                  <Text style={styles.cellText} numberOfLines={1}>
                    @{item.username || 'unknown'}
                  </Text>
                </View>

                {/* Display Name */}
                <View style={[styles.tableCell, styles.cellDisplayName]}>
                  <Text style={styles.cellText} numberOfLines={1}>
                    {item.displayName || '-'}
                  </Text>
                </View>

                {/* Role */}
                <View style={[styles.tableCell, styles.cellRole]}>
                  {isAdmin && item.id !== user?.id ? (
                    <View style={styles.roleSelectWrap}>
                      {actionInProgress === item.id ? (
                        <ActivityIndicator size="small" color="#22C55E" />
                      ) : (
                        /* Using TouchableOpacity chips for role selection on web */
                        <View style={styles.inlineRoleOptions}>
                          {ROLE_OPTIONS.map(r => (
                            <TouchableOpacity
                              key={r}
                              style={[
                                styles.inlineRoleChip,
                                item.role === r && {
                                  backgroundColor: (ROLE_COLORS[r] || '#6B7280') + '1A',
                                  borderColor: ROLE_COLORS[r] || '#6B7280',
                                },
                              ]}
                              onPress={() => handleRoleChange(item, r)}
                            >
                              <Text style={[
                                styles.inlineRoleChipText,
                                item.role === r && { color: ROLE_COLORS[r] || '#6B7280', fontWeight: '700' },
                              ]}>
                                {r.charAt(0).toUpperCase() + r.slice(1)}
                              </Text>
                            </TouchableOpacity>
                          ))}
                        </View>
                      )}
                    </View>
                  ) : (
                    <RoleBadge role={item.role} />
                  )}
                </View>

                {/* Verified */}
                <View style={[styles.tableCell, styles.cellVerified]}>
                  {item.verified ? (
                    <View style={styles.verifiedYes}>
                      <Ionicons name="checkmark-circle" size={16} color="#22C55E" />
                      <Text style={styles.verifiedYesText}>Yes</Text>
                    </View>
                  ) : (
                    <Text style={styles.verifiedNo}>No</Text>
                  )}
                </View>

                {/* Date */}
                <View style={[styles.tableCell, styles.cellDate]}>
                  <Text style={styles.cellTextMuted}>{formatDate(item.createdAt)}</Text>
                </View>

                {/* Actions */}
                {isAdmin && (
                  <View style={[styles.tableCell, styles.cellActions]}>
                    {item.id !== user?.id && (
                      <TouchableOpacity
                        style={[
                          styles.actionButton,
                          item.verified ? styles.actionButtonDanger : styles.actionButtonSuccess,
                        ]}
                        onPress={() => handleToggleVerify(item)}
                        disabled={actionInProgress === item.id}
                      >
                        <Ionicons
                          name={item.verified ? 'close-circle-outline' : 'checkmark-circle-outline'}
                          size={14}
                          color={item.verified ? '#EF4444' : '#22C55E'}
                        />
                        <Text style={[
                          styles.actionButtonText,
                          { color: item.verified ? '#EF4444' : '#22C55E' },
                        ]}>
                          {item.verified ? 'Unverify' : 'Verify'}
                        </Text>
                      </TouchableOpacity>
                    )}
                  </View>
                )}
              </View>
            ))
          )}
        </View>

        {/* Pagination */}
        {totalPages > 1 && (
          <View style={styles.pagination}>
            <TouchableOpacity
              style={[styles.pageButton, page <= 1 && styles.pageButtonDisabled]}
              onPress={() => page > 1 && loadUsers(page - 1)}
              disabled={page <= 1}
            >
              <Ionicons name="chevron-back" size={16} color={page <= 1 ? '#D1D5DB' : '#374151'} />
              <Text style={[styles.pageButtonText, page <= 1 && styles.pageButtonTextDisabled]}>
                Previous
              </Text>
            </TouchableOpacity>

            <View style={styles.pageInfo}>
              {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
                let pageNum: number;
                if (totalPages <= 7) {
                  pageNum = i + 1;
                } else if (page <= 4) {
                  pageNum = i + 1;
                } else if (page >= totalPages - 3) {
                  pageNum = totalPages - 6 + i;
                } else {
                  pageNum = page - 3 + i;
                }
                return (
                  <TouchableOpacity
                    key={pageNum}
                    style={[styles.pageNumber, page === pageNum && styles.pageNumberActive]}
                    onPress={() => loadUsers(pageNum)}
                  >
                    <Text style={[styles.pageNumberText, page === pageNum && styles.pageNumberTextActive]}>
                      {pageNum}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <TouchableOpacity
              style={[styles.pageButton, page >= totalPages && styles.pageButtonDisabled]}
              onPress={() => page < totalPages && loadUsers(page + 1)}
              disabled={page >= totalPages}
            >
              <Text style={[styles.pageButtonText, page >= totalPages && styles.pageButtonTextDisabled]}>
                Next
              </Text>
              <Ionicons name="chevron-forward" size={16} color={page >= totalPages ? '#D1D5DB' : '#374151'} />
            </TouchableOpacity>
          </View>
        )}
      </View>
    </ScrollView>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  scrollContent: {
    paddingBottom: 60,
    minWidth: 1024,
  },

  // Access denied / platform gate
  accessTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#333',
    marginTop: 16,
  },
  accessSubtitle: {
    fontSize: 15,
    color: '#6B7280',
    textAlign: 'center',
    marginTop: 8,
    maxWidth: 400,
    lineHeight: 22,
  },
  greenButton: {
    marginTop: 24,
    paddingHorizontal: 28,
    paddingVertical: 12,
    backgroundColor: '#22C55E',
    borderRadius: 8,
  },
  greenButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 15,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 15,
    color: '#6B7280',
  },

  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingTop: 28,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    backgroundColor: '#fff',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  headerBackBtn: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#111827',
  },
  headerSubtitle: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 2,
  },
  refreshButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#22C55E',
    backgroundColor: '#F0FDF4',
  },
  refreshButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#22C55E',
  },

  // Stats
  statsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    paddingHorizontal: 32,
    paddingTop: 24,
    paddingBottom: 8,
  },
  statCard: {
    flex: 1,
    minWidth: 160,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  statIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  statValue: {
    fontSize: 28,
    fontWeight: '700',
    color: '#111827',
  },
  statLabel: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 4,
  },

  // Table section
  tableSection: {
    marginHorizontal: 32,
    marginTop: 24,
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    overflow: 'hidden',
  },
  tableHeader: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 4,
  },
  tableSectionTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#111827',
  },

  // Filters
  filtersRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    gap: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    flexWrap: 'wrap',
  },
  searchWrap: {
    flex: 1,
    minWidth: 280,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingHorizontal: 12,
    height: 40,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: '#333',
    // @ts-ignore — web-only property
    outlineStyle: 'none',
  },
  searchClear: {
    padding: 4,
  },
  roleFilterWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  filterLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6B7280',
    marginRight: 4,
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#F9FAFB',
  },
  filterChipActive: {
    backgroundColor: '#22C55E',
    borderColor: '#22C55E',
  },
  filterChipText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#6B7280',
  },
  filterChipTextActive: {
    color: '#fff',
  },

  // Table
  table: {
    // container for rows
  },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    backgroundColor: '#F9FAFB',
  },
  tableBodyRow: {
    backgroundColor: '#fff',
  },
  tableRowEven: {
    backgroundColor: '#FAFAFA',
  },
  tableHeadText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  tableCell: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  cellAvatar: {
    width: 52,
  },
  cellUsername: {
    flex: 1.2,
    minWidth: 120,
  },
  cellDisplayName: {
    flex: 1.5,
    minWidth: 140,
  },
  cellRole: {
    flex: 2,
    minWidth: 200,
  },
  cellVerified: {
    width: 90,
    alignItems: 'center',
  },
  cellDate: {
    width: 120,
  },
  cellActions: {
    width: 110,
    alignItems: 'center',
  },
  cellText: {
    fontSize: 14,
    color: '#111827',
  },
  cellTextMuted: {
    fontSize: 13,
    color: '#6B7280',
  },

  // Avatar
  avatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
  },
  avatarFallback: {
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Role badge
  roleBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
  },
  roleBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'capitalize',
  },

  // Inline role selector
  roleSelectWrap: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  inlineRoleOptions: {
    flexDirection: 'row',
    gap: 4,
    flexWrap: 'wrap',
  },
  inlineRoleChip: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#F9FAFB',
  },
  inlineRoleChipText: {
    fontSize: 11,
    fontWeight: '500',
    color: '#6B7280',
  },

  // Verified
  verifiedYes: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  verifiedYesText: {
    fontSize: 13,
    color: '#22C55E',
    fontWeight: '600',
  },
  verifiedNo: {
    fontSize: 13,
    color: '#9CA3AF',
  },

  // Action buttons
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
  },
  actionButtonSuccess: {
    borderColor: '#BBF7D0',
    backgroundColor: '#F0FDF4',
  },
  actionButtonDanger: {
    borderColor: '#FECACA',
    backgroundColor: '#FEF2F2',
  },
  actionButtonText: {
    fontSize: 12,
    fontWeight: '600',
  },

  // Table empty
  tableEmpty: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  tableEmptyText: {
    fontSize: 14,
    color: '#9CA3AF',
  },

  // Pagination
  pagination: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  pageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#fff',
  },
  pageButtonDisabled: {
    opacity: 0.4,
  },
  pageButtonText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#374151',
  },
  pageButtonTextDisabled: {
    color: '#D1D5DB',
  },
  pageInfo: {
    flexDirection: 'row',
    gap: 4,
  },
  pageNumber: {
    width: 34,
    height: 34,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  pageNumberActive: {
    backgroundColor: '#22C55E',
    borderColor: '#22C55E',
  },
  pageNumberText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#6B7280',
  },
  pageNumberTextActive: {
    color: '#fff',
    fontWeight: '700',
  },
});
