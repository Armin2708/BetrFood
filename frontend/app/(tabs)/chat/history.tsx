import React, { useCallback, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Swipeable from 'react-native-gesture-handler/Swipeable';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { router } from 'expo-router';
import { colors } from '../../../constants/theme';
import {
  Conversation,
  clearAllConversations,
  deleteConversation,
  fetchConversations,
  renameConversation,
} from '../../../services/api/chat';
import { PromptModal } from '../../../components/PromptModal';

function formatRelativeTime(dateString: string) {
  const now = Date.now();
  const date = new Date(dateString).getTime();
  const diffMinutes = Math.floor((now - date) / (1000 * 60));

  if (diffMinutes < 1) return 'just now';
  if (diffMinutes < 60) return `${diffMinutes}m ago`;

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours}h ago`;

  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d ago`;
}

export default function ChatHistoryScreen() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [promptVisible, setPromptVisible] = useState(false);
  const [promptValue, setPromptValue] = useState('');
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const swipeableRefs = useRef<Map<string, Swipeable | null>>(new Map());

  const loadConversations = useCallback(async () => {
    setLoading(true);

    try {
      const data = await fetchConversations();
      setConversations(data);
    } catch {
      setConversations([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadConversations();
    }, [loadConversations])
  );

  const openRenamePrompt = useCallback((conversation: Conversation) => {
    setSelectedConversation(conversation);
    setPromptValue(conversation.title);
    setPromptVisible(true);
  }, []);

  const handleRename = useCallback(async () => {
    const nextTitle = promptValue.trim();
    setPromptVisible(false);

    if (!selectedConversation || !nextTitle) {
      setSelectedConversation(null);
      setPromptValue('');
      return;
    }

    try {
      const updated = await renameConversation(selectedConversation.id, nextTitle);
      setConversations((current) =>
        current.map((conversation) =>
          conversation.id === selectedConversation.id
            ? { ...conversation, title: updated.title }
            : conversation
        )
      );
    } catch {
      Alert.alert('Rename failed', 'Unable to rename this chat right now.');
    } finally {
      setSelectedConversation(null);
      setPromptValue('');
    }
  }, [promptValue, selectedConversation]);

  const handleDelete = useCallback((conversation: Conversation) => {
    swipeableRefs.current.get(conversation.id)?.close();
    Alert.alert('Delete chat', `Delete "${conversation.title}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteConversation(conversation.id);
            setConversations((current) =>
              current.filter((item) => item.id !== conversation.id)
            );
          } catch {
            Alert.alert('Delete failed', 'Unable to delete this chat right now.');
          }
        },
      },
    ]);
  }, []);

  const handleClearAll = useCallback(() => {
    Alert.alert(
      'Clear all chats',
      'This will permanently delete all your chat sessions. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear All',
          style: 'destructive',
          onPress: async () => {
            try {
              await clearAllConversations();
              setConversations([]);
            } catch {
              Alert.alert('Failed', 'Unable to clear chats right now.');
            }
          },
        },
      ]
    );
  }, []);

  return (
    <SafeAreaView style={styles.container} edges={[]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.iconButton}>
          <Ionicons name="chevron-back" size={20} color={colors.textPrimary} />
        </TouchableOpacity>
        <View style={styles.headerCopy}>
          <Text style={styles.title}>History</Text>
        </View>
        <TouchableOpacity onPress={() => router.replace('/chat')} style={styles.iconButton}>
          <Ionicons name="create-outline" size={18} color={colors.textPrimary} />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.primaryDark} />
        </View>
      ) : conversations.length === 0 ? (
        <View style={styles.emptyState}>
          <View style={styles.emptyIcon}>
            <Ionicons name="chatbubbles-outline" size={24} color={colors.primaryDark} />
          </View>
          <Text style={styles.emptyTitle}>No saved chats yet</Text>
          <Text style={styles.emptySubtitle}>
            Start a conversation from the Chat tab and it will appear here.
          </Text>
          <TouchableOpacity style={styles.primaryButton} onPress={() => router.replace('/chat')}>
            <Text style={styles.primaryButtonText}>Start chatting</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={conversations}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => (
            <Swipeable
              ref={(ref) => swipeableRefs.current.set(item.id, ref)}
              renderRightActions={() => (
                <TouchableOpacity
                  style={styles.swipeDeleteAction}
                  onPress={() => handleDelete(item)}
                >
                  <Ionicons name="trash-outline" size={20} color={colors.white} />
                  <Text style={styles.swipeDeleteText}>Delete</Text>
                </TouchableOpacity>
              )}
              rightThreshold={60}
              overshootRight={false}
            >
              <Pressable
                style={styles.card}
                onPress={() =>
                  router.push({
                    pathname: '/chat/[id]',
                    params: { id: item.id, title: item.title },
                  })
                }
              >
                <View style={styles.cardIcon}>
                  <Ionicons name="sparkles" size={16} color={colors.white} />
                </View>
                <View style={styles.cardBody}>
                  <Text style={styles.cardTitle} numberOfLines={1}>
                    {item.title}
                  </Text>
                  {item.last_message_preview ? (
                    <Text style={styles.cardPreview} numberOfLines={1}>
                      {item.last_message_preview}
                    </Text>
                  ) : null}
                  <Text style={styles.cardMeta}>{formatRelativeTime(item.updated_at)}</Text>
                </View>
                <TouchableOpacity onPress={() => openRenamePrompt(item)} style={styles.inlineButton}>
                  <Ionicons name="pencil-outline" size={16} color={colors.textSecondary} />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => handleDelete(item)} style={styles.inlineButton}>
                  <Ionicons name="trash-outline" size={16} color={colors.textSecondary} />
                </TouchableOpacity>
              </Pressable>
            </Swipeable>
          )}
          ListFooterComponent={
            <TouchableOpacity style={styles.clearAllButton} onPress={handleClearAll}>
              <Ionicons name="trash-outline" size={16} color="#DC2626" />
              <Text style={styles.clearAllText}>Clear all chats</Text>
            </TouchableOpacity>
          }
        />
      )}

      <PromptModal
        visible={promptVisible}
        title="Rename Chat"
        value={promptValue}
        onChangeText={setPromptValue}
        onCancel={() => {
          setPromptVisible(false);
          setPromptValue('');
          setSelectedConversation(null);
        }}
        onSubmit={handleRename}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.white,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#D6E8DB',
    backgroundColor: 'rgba(255,255,255,0.92)',
  },
  headerCopy: {
    flex: 1,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  subtitle: {
    marginTop: 2,
    fontSize: 12,
    color: colors.textSecondary,
  },
  iconButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EEF5EF',
    borderWidth: 1,
    borderColor: '#D9E9DD',
  },
  listContent: {
    padding: 14,
    gap: 10,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.white,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#D9E9DD',
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  cardIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primaryDark,
  },
  cardBody: {
    flex: 1,
    gap: 2,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  cardPreview: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  cardMeta: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  inlineButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EEF5EF',
  },
  swipeDeleteAction: {
    backgroundColor: '#DC2626',
    justifyContent: 'center',
    alignItems: 'center',
    width: 80,
    borderRadius: 18,
    marginLeft: 8,
    gap: 4,
  },
  swipeDeleteText: {
    color: colors.white,
    fontSize: 12,
    fontWeight: '600',
  },
  clearAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 8,
    marginBottom: 16,
    paddingVertical: 12,
  },
  clearAllText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#DC2626',
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
  },
  emptyIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E7F6EA',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  emptySubtitle: {
    marginTop: 8,
    textAlign: 'center',
    fontSize: 14,
    lineHeight: 20,
    color: colors.textSecondary,
  },
  primaryButton: {
    marginTop: 20,
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 999,
    backgroundColor: colors.primaryDark,
  },
  primaryButtonText: {
    color: colors.white,
    fontSize: 14,
    fontWeight: '700',
  },
});
