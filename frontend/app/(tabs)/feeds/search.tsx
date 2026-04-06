import React, { useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  Image,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { searchUsers, getAvatarUrl, SearchUserResult } from '../../../services/api';

function UserRow({ item, onPress }: { item: SearchUserResult; onPress: (id: string) => void }) {
  const avatarUri = getAvatarUrl(item.avatarUrl, item.displayName || item.username || item.id);
  const [avatarError, setAvatarError] = useState(false);
  const initial = (item.displayName || item.username || '?')[0].toUpperCase();

  return (
    <TouchableOpacity
      style={styles.userRow}
      onPress={() => onPress(item.id)}
      activeOpacity={0.7}
    >
      {avatarError ? (
        <View style={[styles.avatar, styles.avatarFallback]}>
          <Text style={styles.avatarFallbackText}>{initial}</Text>
        </View>
      ) : (
        <Image
          source={{ uri: avatarUri }}
          style={styles.avatar}
          onError={() => setAvatarError(true)}
        />
      )}
      <View style={styles.userInfo}>
        <View style={styles.nameRow}>
          <Text style={styles.displayName} numberOfLines={1}>
            {item.displayName || item.username || 'User'}
          </Text>
          {item.verified && (
            <Ionicons name="checkmark-circle" size={16} color="#22C55E" style={{ marginLeft: 4 }} />
          )}
        </View>
        {item.username && (
          <Text style={styles.username} numberOfLines={1}>@{item.username}</Text>
        )}
        {item.bio ? (
          <Text style={styles.bio} numberOfLines={1}>{item.bio}</Text>
        ) : null}
      </View>
    </TouchableOpacity>
  );
}

export default function SearchScreen() {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchUserResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputRef = useRef<TextInput>(null);

  const handleSearch = useCallback((text: string) => {
    setQuery(text);
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (text.trim().length === 0) {
      setResults([]);
      setSearched(false);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      setSearched(true);
      try {
        const users = await searchUsers(text.trim());
        setResults(users);
      } catch (err) {
        console.error('Search error:', err);
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 300);
  }, []);

  const handleUserPress = (userId: string) => {
    router.push(`/feeds/user-profile?userId=${userId}` as any);
  };

  const renderUser = ({ item }: { item: SearchUserResult }) => (
    <UserRow item={item} onPress={handleUserPress} />
  );

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          headerShown: true,
          title: '',
          headerLeft: () => (
            <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
              <Ionicons name="arrow-back" size={24} color="#000" />
            </TouchableOpacity>
          ),
          headerTitle: () => (
            <View style={styles.searchBarContainer}>
              <Ionicons name="search-outline" size={18} color="#999" style={styles.searchIcon} />
              <TextInput
                ref={inputRef}
                style={styles.searchInput}
                placeholder="Search users..."
                placeholderTextColor="#999"
                value={query}
                onChangeText={handleSearch}
                autoFocus
                returnKeyType="search"
                autoCapitalize="none"
                autoCorrect={false}
              />
              {query.length > 0 && (
                <TouchableOpacity onPress={() => handleSearch('')} style={styles.clearButton}>
                  <Ionicons name="close-circle" size={18} color="#999" />
                </TouchableOpacity>
              )}
            </View>
          ),
          headerRight: () => null,
        }}
      />

      {loading && results.length === 0 ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#22C55E" />
        </View>
      ) : (
        <FlatList
          data={results}
          keyExtractor={(item) => item.id}
          renderItem={renderUser}
          keyboardShouldPersistTaps="handled"
          ListEmptyComponent={
            searched && !loading ? (
              <View style={styles.emptyContainer}>
                <Ionicons name="person-outline" size={48} color="#CCC" />
                <Text style={styles.emptyTitle}>No users found</Text>
                <Text style={styles.emptySubtitle}>Try a different search term</Text>
              </View>
            ) : !searched ? (
              <View style={styles.emptyContainer}>
                <Ionicons name="search-outline" size={48} color="#CCC" />
                <Text style={styles.emptyTitle}>Search for people</Text>
                <Text style={styles.emptySubtitle}>Find friends, chefs, and food lovers</Text>
              </View>
            ) : null
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
  backButton: {
    padding: 4,
  },
  searchBarContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F2F2F7',
    borderRadius: 10,
    paddingHorizontal: 10,
    height: 36,
    marginHorizontal: 8,
  },
  searchIcon: {
    marginRight: 6,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#000',
    paddingVertical: 0,
  },
  clearButton: {
    padding: 4,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#EEE',
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 12,
    backgroundColor: '#F0F0F0',
  },
  avatarFallback: {
    backgroundColor: '#22C55E',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarFallbackText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  userInfo: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  displayName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
  },
  username: {
    fontSize: 14,
    color: '#666',
    marginTop: 1,
  },
  bio: {
    fontSize: 13,
    color: '#999',
    marginTop: 2,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 80,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginTop: 16,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#999',
    marginTop: 8,
  },
});
