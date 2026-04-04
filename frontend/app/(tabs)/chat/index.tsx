import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { router } from 'expo-router';
import { colors } from '../../../constants/theme';
import {
  Conversation,
  fetchConversations,
  deleteConversation,
  renameConversation,
} from '../../../services/api/chat';
import { PromptModal } from '../../../components/PromptModal';

function formatRelativeTime(dateString: string): string {
  const now = Date.now();
  const date = new Date(dateString).getTime();
  const diffMs = now - date;
  const diffSec = Math.floor(diffMs / 1000);
  if (diffSec < 60) return 'just now';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.floor(diffHr / 24);
  return `${diffDay}d ago`;
}

export default function ConversationListScreen() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [conversationsLoading, setConversationsLoading] = useState(true);

  // Prompt modal state
  const [promptVisible, setPromptVisible] = useState(false);
  const [promptValue, setPromptValue] = useState('');
  const [promptConversation, setPromptConversation] = useState<Conversation | null>(null);

  const showPrompt = (conversation: Conversation | null) => {
    setPromptConversation(conversation);
    setPromptValue(conversation?.title || '');
    setPromptVisible(true);
  };

  const handlePromptSubmit = async () => {
    const newTitle = promptValue.trim();
    setPromptVisible(false);
    
    if (!newTitle) {
      setPromptValue('');
      setPromptConversation(null);
      return;
    }

    if (promptConversation) {
      // Rename existing conversation
      try {
        const updated = await renameConversation(promptConversation.id, newTitle);
        setConversations((prev) =>
          prev.map((c) => (c.id === promptConversation.id ? { ...c, title: updated.title } : c))
        );
      } catch {
        Alert.alert('Error', 'Failed to rename conversation.');
      }
    } else {
      // Create new conversation
      router.push({
        pathname: '/chat/[id]',
        params: { isNew: 'true', title: newTitle }
      });
    }
    
    setPromptValue('');
    setPromptConversation(null);
  };

  const handlePromptCancel = () => {
    setPromptVisible(false);
    setPromptValue('');
    setPromptConversation(null);
  };

  const loadConversations = useCallback(async () => {
    try {
      setConversationsLoading(true);
      const convs = await fetchConversations();
      setConversations(convs);
    } catch {
      // silently ignore
    } finally {
      setConversationsLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadConversations();
    }, [loadConversations])
  );

  const openConversation = (conv: Conversation) => {
    router.push({
      pathname: '/chat/[id]',
      params: { id: conv.id, title: conv.title }
    });
  };

  const startNewConversation = () => {
    showPrompt(null);
  };

  const handleDeleteConversation = (conv: Conversation) => {
    Alert.alert('Delete Chat', `Delete "${conv.title}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteConversation(conv.id);
            setConversations((prev) => prev.filter((c) => c.id !== conv.id));
          } catch {
            Alert.alert('Error', 'Failed to delete conversation.');
          }
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Ionicons name="chatbubble-ellipses" size={22} color={colors.white} />
        <Text style={styles.headerTitle}>AI Chat</Text>
        <TouchableOpacity onPress={startNewConversation} style={styles.newChatButton}>
          <Ionicons name="create-outline" size={22} color={colors.white} />
        </TouchableOpacity>
      </View>

      {conversationsLoading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : conversations.length === 0 ? (
        <View style={styles.emptyConversations}>
          <Ionicons name="chatbubbles-outline" size={56} color={colors.textTertiary} />
          <Text style={styles.emptyTitle}>No conversations yet</Text>
          <Text style={styles.emptySubtitle}>Start a new chat with your AI cooking assistant.</Text>
          <TouchableOpacity style={styles.startChatButton} onPress={startNewConversation}>
            <Ionicons name="add" size={20} color={colors.white} />
            <Text style={styles.startChatButtonText}>New Chat</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={conversations}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.conversationList}
          renderItem={({ item }) => (
            <Pressable
              style={styles.conversationItem}
              onPress={() => openConversation(item)}
              onLongPress={() => showPrompt(item)}
            >
              <View style={styles.conversationIcon}>
                <Ionicons name="chatbubble-outline" size={20} color={colors.primary} />
              </View>
              <View style={styles.conversationInfo}>
                <Text style={styles.conversationTitle} numberOfLines={1}>{item.title}</Text>
                <Text style={styles.conversationTime}>{formatRelativeTime(item.updated_at)}</Text>
              </View>
              <TouchableOpacity
                onPress={() => showPrompt(item)}
                style={styles.conversationAction}
                hitSlop={8}
              >
                <Ionicons name="pencil-outline" size={16} color={colors.textTertiary} />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => handleDeleteConversation(item)}
                style={styles.conversationAction}
                hitSlop={8}
              >
                <Ionicons name="trash-outline" size={16} color={colors.textTertiary} />
              </TouchableOpacity>
            </Pressable>
          )}
        />
      )}
      
      <PromptModal
        visible={promptVisible}
        title={promptConversation ? 'Rename Chat' : 'New Chat'}
        value={promptValue}
        onChangeText={setPromptValue}
        onSubmit={handlePromptSubmit}
        onCancel={handlePromptCancel}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.white },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  headerTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '700',
    color: colors.white,
  },
  newChatButton: { padding: 4 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  
  // Conversation list
  conversationList: { paddingVertical: 8 },
  conversationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  conversationIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F0FDF4',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  conversationInfo: { flex: 1 },
  conversationTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  conversationTime: {
    fontSize: 12,
    color: colors.textTertiary,
    marginTop: 2,
  },
  conversationAction: { padding: 8 },
  emptyConversations: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    gap: 12,
  },
  emptyTitle: { 
    fontSize: 18, 
    fontWeight: '600', 
    color: colors.textPrimary, 
    textAlign: 'center' 
  },
  emptySubtitle: { 
    fontSize: 14, 
    color: colors.textSecondary, 
    textAlign: 'center', 
    lineHeight: 20, 
    marginBottom: 4 
  },
  startChatButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 24,
    marginTop: 8,
  },
  startChatButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.white,
  },
});
