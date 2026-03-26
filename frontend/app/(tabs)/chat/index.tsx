import React, { useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Pressable,
  Modal,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useLocalSearchParams, router } from 'expo-router';
import Markdown from 'react-native-markdown-display';
import { colors } from '../../../constants/theme';
import { getImageUrl } from '../../../services/api';
import {
  ChatMessage,
  Conversation,
  PostContext,
  SuggestedPost,
  sendChatMessage,
  fetchChatHistory,
  fetchPantrySuggestions,
  fetchConversations,
  createConversation,
  deleteConversation,
  renameConversation,
} from '../../../services/api/chat';

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

function PostContextCard({ context }: { context: PostContext }) {
  return (
    <View style={styles.postContextCard}>
      <View style={styles.postContextIconRow}>
        <Ionicons name="document-text-outline" size={16} color={colors.primary} />
        <Text style={styles.postContextLabel}>Asking about a post</Text>
      </View>
      {context.username && <Text style={styles.postContextUsername}>by @{context.username}</Text>}
      {context.caption ? <Text style={styles.postContextCaption} numberOfLines={2}>{context.caption}</Text> : null}
      {context.recipe && (
        <View style={styles.postContextRecipeBadge}>
          <Ionicons name="restaurant-outline" size={12} color={colors.primary} />
          <Text style={styles.postContextRecipeText}>Recipe included</Text>
        </View>
      )}
    </View>
  );
}

function SuggestedPostCard({ post }: { post: SuggestedPost }) {
  const imageUri = post.imagePath ? getImageUrl(post.imagePath) : null;
  return (
    <TouchableOpacity
      style={styles.suggestedCard}
      onPress={() => router.push(`/post-detail?postId=${post.id}`)}
      activeOpacity={0.8}
    >
      {imageUri ? (
        <Image source={{ uri: imageUri }} style={styles.suggestedCardImage} resizeMode="cover" />
      ) : (
        <View style={[styles.suggestedCardImage, styles.suggestedCardImagePlaceholder]}>
          <Ionicons name="image-outline" size={20} color={colors.textTertiary} />
        </View>
      )}
      <View style={styles.suggestedCardInfo}>
        <Text style={styles.suggestedCardCaption} numberOfLines={2}>{post.caption || 'Untitled post'}</Text>
        <Text style={styles.suggestedCardUsername}>by {post.username}</Text>
      </View>
      <Ionicons name="chevron-forward" size={16} color={colors.textTertiary} />
    </TouchableOpacity>
  );
}

const QUICK_ACTIONS = [
  { id: 'pantry', label: 'What can I cook?', icon: 'basket-outline' as const, message: 'What can I cook with the items in my pantry?' },
  { id: 'expiring', label: 'Use expiring items', icon: 'time-outline' as const, message: 'What should I cook first using my items that are expiring soon?' },
  { id: 'ideas', label: 'Meal ideas', icon: 'bulb-outline' as const, message: 'Give me some quick and easy meal ideas for today.' },
];

export default function ChatScreen() {
  const params = useLocalSearchParams<{ postContext?: string }>();

  const postContext: PostContext | null = (() => {
    if (!params.postContext) return null;
    try { return JSON.parse(decodeURIComponent(params.postContext)); }
    catch { return null; }
  })();

  // Conversation list state
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [conversationsLoading, setConversationsLoading] = useState(true);

  // Active conversation state
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [activeConversationTitle, setActiveConversationTitle] = useState('New Chat');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const flatListRef = useRef<FlatList<ChatMessage>>(null);

  // Prompt modal state
  const [promptVisible, setPromptVisible] = useState(false);
  const [promptTitle, setPromptTitle] = useState('');
  const [promptValue, setPromptValue] = useState('');
  const [promptCallback, setPromptCallback] = useState<((value: string) => void) | null>(null);
  const promptInputRef = useRef<TextInput>(null);

  const showPrompt = (title: string, defaultValue: string, onSubmit: (value: string) => void) => {
    setPromptTitle(title);
    setPromptValue(defaultValue);
    setPromptCallback(() => onSubmit);
    setPromptVisible(true);
    setTimeout(() => promptInputRef.current?.focus(), 100);
  };

  const handlePromptSubmit = () => {
    setPromptVisible(false);
    if (promptCallback && promptValue.trim()) {
      promptCallback(promptValue.trim());
    }
    setPromptValue('');
    setPromptCallback(null);
  };

  const handlePromptCancel = () => {
    setPromptVisible(false);
    setPromptValue('');
    setPromptCallback(null);
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
      if (!activeConversationId) {
        loadConversations();
      }
    }, [activeConversationId, loadConversations])
  );

  const openConversation = async (convId: string, title?: string) => {
    setActiveConversationId(convId);
    setActiveConversationTitle(title || 'Chat');
    setLoading(true);
    try {
      const history = await fetchChatHistory(convId);
      setMessages(history);
    } catch {
      setMessages([]);
    } finally {
      setLoading(false);
    }
  };

  const startNewConversation = () => {
    showPrompt('New Chat', '', (name) => {
      const title = name || 'New Chat';
      setActiveConversationId('new');
      setActiveConversationTitle(title);
      setMessages([]);
    });
  };

  const goBackToList = () => {
    setActiveConversationId(null);
    setActiveConversationTitle('New Chat');
    setMessages([]);
    setInput('');
    loadConversations();
  };

  const handleRenameActive = () => {
    if (!activeConversationId || activeConversationId === 'new') return;
    showPrompt('Rename Chat', activeConversationTitle, async (newTitle) => {
      try {
        await renameConversation(activeConversationId, newTitle);
        setActiveConversationTitle(newTitle);
      } catch {
        Alert.alert('Error', 'Failed to rename conversation.');
      }
    });
  };

  const handleRenameConversation = (conv: Conversation) => {
    showPrompt('Rename Chat', conv.title, async (newTitle) => {
      try {
        const updated = await renameConversation(conv.id, newTitle);
        setConversations((prev) =>
          prev.map((c) => (c.id === conv.id ? { ...c, title: updated.title } : c))
        );
      } catch {
        Alert.alert('Error', 'Failed to rename conversation.');
      }
    });
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

  const scrollToBottom = (animated = true) => {
    setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated });
    }, 100);
  };

  const handleSend = async (overrideText?: string) => {
    const text = (overrideText ?? input).trim();
    if (!text || sending) return;

    const tempUserMsg: ChatMessage = {
      id: Date.now(),
      role: 'user',
      content: text,
      created_at: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, tempUserMsg]);
    if (!overrideText) setInput('');
    setSending(true);
    scrollToBottom();

    try {
      const convId = activeConversationId === 'new' ? undefined : activeConversationId ?? undefined;
      const title = activeConversationId === 'new' ? activeConversationTitle : undefined;
      const result = await sendChatMessage(text, convId, title);
      if (result.conversationId && (activeConversationId === 'new' || !activeConversationId)) {
        setActiveConversationId(result.conversationId);
      }
      const history = await fetchChatHistory(result.conversationId);
      setMessages(history);
    } catch (err: any) {
      setMessages((prev) => prev.filter((m) => m.id !== tempUserMsg.id));
      if (!overrideText) setInput(text);
      Alert.alert('Chat Error', err?.message || 'Failed to get a response. Please try again.');
    } finally {
      setSending(false);
      scrollToBottom();
    }
  };

  const handlePantrySuggestions = async () => {
    if (sending || loadingSuggestions) return;
    setLoadingSuggestions(true);

    const tempUserMsg: ChatMessage = {
      id: Date.now(),
      role: 'user',
      content: 'What can I cook with the items in my pantry?',
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, tempUserMsg]);
    scrollToBottom();

    try {
      const convId = activeConversationId === 'new' ? undefined : activeConversationId ?? undefined;
      const result = await fetchPantrySuggestions(convId);
      if (result.conversationId && (activeConversationId === 'new' || !activeConversationId)) {
        setActiveConversationId(result.conversationId);
      }
      const history = await fetchChatHistory(result.conversationId);
      setMessages(history);
    } catch (err: any) {
      setMessages((prev) => prev.filter((m) => m.id !== tempUserMsg.id));
      Alert.alert('Chat Error', err?.message || 'Failed to get pantry suggestions. Please try again.');
    } finally {
      setLoadingSuggestions(false);
      scrollToBottom();
    }
  };

  const handleQuickAction = (action: typeof QUICK_ACTIONS[0]) => {
    if (action.id === 'pantry') {
      handlePantrySuggestions();
    } else {
      handleSend(action.message);
    }
  };

  const renderMessage = ({ item }: { item: ChatMessage }) => {
    const isUser = item.role === 'user';
    return (
      <View
        style={[
          styles.messageBubbleRow,
          isUser ? styles.userRow : styles.assistantRow,
        ]}
      >
        {!isUser && (
          <View style={styles.avatarCircle}>
            <Ionicons name="restaurant-outline" size={16} color={colors.primary} />
          </View>
        )}
        <View
          style={[
            styles.messageBubble,
            isUser ? styles.userBubble : styles.assistantBubble,
          ]}
          accessibilityRole="text"
          accessibilityLabel={`${isUser ? 'You' : 'Assistant'}: ${item.content}`}
        >
          {isUser ? (
            <Text style={[styles.messageText, styles.userMessageText]}>
              {item.content}
            </Text>
          ) : (
            <Markdown style={markdownStyles}>{item.content}</Markdown>
          )}
          <Text style={[styles.timestamp, isUser && styles.userTimestamp]}>
            {formatRelativeTime(item.created_at)}
          </Text>
        </View>
        {!isUser && item.suggestedPosts && item.suggestedPosts.length > 0 && (
          <View style={styles.suggestedPostsContainer}>
            {item.suggestedPosts.map(post => (
              <SuggestedPostCard key={post.id} post={post} />
            ))}
          </View>
        )}
      </View>
    );
  };

  const renderEmpty = () => {
    if (loading) return null;
    return (
      <View style={styles.emptyState}>
        <Ionicons name="restaurant-outline" size={56} color={colors.textTertiary} />
        <Text style={styles.emptyTitle}>Your AI cooking assistant</Text>
        <Text style={styles.emptySubtitle}>
          Ask me anything about food, recipes, or tap a suggestion below to get started.
        </Text>
        <View style={styles.quickActionsGrid}>
          {QUICK_ACTIONS.map((action) => (
            <TouchableOpacity
              key={action.id}
              style={styles.quickActionChip}
              onPress={() => handleQuickAction(action)}
              disabled={sending || loadingSuggestions}
              activeOpacity={0.75}
            >
              <Ionicons name={action.icon} size={18} color={colors.primary} />
              <Text style={styles.quickActionText}>{action.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    );
  };

  const isBusy = sending || loadingSuggestions;

  const promptModal = (
    <Modal visible={promptVisible} transparent animationType="fade" onRequestClose={handlePromptCancel}>
      <Pressable style={styles.promptOverlay} onPress={handlePromptCancel}>
        <Pressable style={styles.promptBox} onPress={(e) => e.stopPropagation()}>
          <Text style={styles.promptTitle}>{promptTitle}</Text>
          <TextInput
            ref={promptInputRef}
            style={styles.promptInput}
            value={promptValue}
            onChangeText={setPromptValue}
            placeholder="Enter a name..."
            placeholderTextColor={colors.placeholder}
            maxLength={100}
            returnKeyType="done"
            onSubmitEditing={handlePromptSubmit}
            autoFocus
          />
          <View style={styles.promptButtons}>
            <TouchableOpacity style={styles.promptCancelBtn} onPress={handlePromptCancel}>
              <Text style={styles.promptCancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.promptConfirmBtn} onPress={handlePromptSubmit}>
              <Text style={styles.promptConfirmText}>OK</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );

  // ─── Conversation List View ────────────────────────────────────
  if (!activeConversationId) {
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
                onPress={() => openConversation(item.id, item.title)}
                onLongPress={() => handleRenameConversation(item)}
              >
                <View style={styles.conversationIcon}>
                  <Ionicons name="chatbubble-outline" size={20} color={colors.primary} />
                </View>
                <View style={styles.conversationInfo}>
                  <Text style={styles.conversationTitle} numberOfLines={1}>{item.title}</Text>
                  <Text style={styles.conversationTime}>{formatRelativeTime(item.updated_at)}</Text>
                </View>
                <TouchableOpacity
                  onPress={() => handleRenameConversation(item)}
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
        {promptModal}
      </SafeAreaView>
    );
  }

  // ─── Active Conversation View ──────────────────────────────────
  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={goBackToList} style={styles.backButton}>
          <Ionicons name="chevron-back" size={24} color={colors.white} />
        </TouchableOpacity>
        <TouchableOpacity
          onPress={activeConversationId !== 'new' ? handleRenameActive : undefined}
          style={styles.headerTitleButton}
          activeOpacity={activeConversationId !== 'new' ? 0.7 : 1}
        >
          <Text style={styles.headerTitle} numberOfLines={1}>
            {activeConversationTitle}
          </Text>
          {activeConversationId !== 'new' && (
            <Ionicons name="pencil-outline" size={14} color="rgba(255,255,255,0.7)" />
          )}
        </TouchableOpacity>
        <View style={{ width: 40 }} />
      </View>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={0}
      >
        {loading ? (
          <View style={styles.centered}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : (
          <FlatList
            ref={flatListRef}
            data={messages}
            keyExtractor={(item) => String(item.id)}
            renderItem={renderMessage}
            contentContainerStyle={[
              styles.messageList,
              messages.length === 0 && styles.emptyList,
            ]}
            ListEmptyComponent={renderEmpty}
            showsVerticalScrollIndicator={false}
            onContentSizeChange={() => {
              if (messages.length > 0) {
                flatListRef.current?.scrollToEnd({ animated: false });
              }
            }}
          />
        )}

        {isBusy && (
          <View style={styles.typingRow}>
            <View style={styles.avatarCircleSmall}>
              <Ionicons name="restaurant-outline" size={12} color={colors.primary} />
            </View>
            <View style={styles.typingBubble}>
              <ActivityIndicator size="small" color={colors.textTertiary} />
              <Text style={styles.typingText}>Thinking...</Text>
            </View>
          </View>
        )}

        {messages.length > 0 && (
          <View style={styles.quickActionsBar}>
            <TouchableOpacity
              style={styles.pantryChip}
              onPress={handlePantrySuggestions}
              disabled={isBusy}
              activeOpacity={0.75}
            >
              <Ionicons name="basket-outline" size={14} color={colors.primary} />
              <Text style={styles.pantryChipText}>Pantry Recipes</Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={styles.inputBar}>
          <TextInput
            style={styles.textInput}
            placeholder="Ask about food or cooking..."
            placeholderTextColor={colors.placeholder}
            value={input}
            onChangeText={setInput}
            maxLength={2000}
            returnKeyType="send"
            blurOnSubmit={false}
            onSubmitEditing={() => handleSend()}
            editable={!isBusy}
          />
          <TouchableOpacity
            style={[
              styles.sendButton,
              (!input.trim() || isBusy) && styles.sendButtonDisabled,
            ]}
            onPress={() => handleSend()}
            disabled={!input.trim() || isBusy}
          >
            <Ionicons name="arrow-up" size={20} color={colors.white} />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
      {promptModal}
    </SafeAreaView>
  );
}

const markdownStyles = StyleSheet.create({
  body: { fontSize: 15, lineHeight: 21, color: colors.textPrimary },
  strong: { fontWeight: '700' },
  em: { fontStyle: 'italic' },
  bullet_list: { marginVertical: 4 },
  ordered_list: { marginVertical: 4 },
  list_item: { marginVertical: 2 },
  heading1: { fontSize: 18, fontWeight: '700', marginVertical: 4 },
  heading2: { fontSize: 16, fontWeight: '700', marginVertical: 4 },
  heading3: { fontSize: 15, fontWeight: '700', marginVertical: 2 },
  paragraph: { marginVertical: 2 },
  code_inline: { backgroundColor: '#E5E7EB', borderRadius: 4, paddingHorizontal: 4, fontSize: 13, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' },
  fence: { backgroundColor: '#E5E7EB', borderRadius: 8, padding: 10, marginVertical: 4, fontSize: 13, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' },
});

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.white },
  flex: { flex: 1 },
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
  backButton: { padding: 4, marginRight: 4 },
  headerTitleButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
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
  // Messages
  messageList: { paddingHorizontal: 12, paddingVertical: 16, gap: 12 },
  emptyList: { flex: 1, justifyContent: 'center' },
  emptyState: { alignItems: 'center', paddingHorizontal: 32, gap: 12 },
  emptyTitle: { fontSize: 18, fontWeight: '600', color: colors.textPrimary, textAlign: 'center' },
  emptySubtitle: { fontSize: 14, color: colors.textSecondary, textAlign: 'center', lineHeight: 20, marginBottom: 4 },
  quickActionsGrid: { width: '100%', gap: 10, marginTop: 4 },
  quickActionChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#BBF7D0',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  quickActionText: { fontSize: 14, fontWeight: '500', color: colors.primary },
  quickActionsBar: { flexDirection: 'row', paddingHorizontal: 12, paddingBottom: 6, gap: 8 },
  pantryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#BBF7D0',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  pantryChipText: { fontSize: 13, fontWeight: '500', color: colors.primary },
  messageBubbleRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 8 },
  userRow: { justifyContent: 'flex-end' },
  assistantRow: { justifyContent: 'flex-start' },
  avatarCircle: {
    width: 30, height: 30, borderRadius: 15,
    backgroundColor: '#F0FDF4', alignItems: 'center', justifyContent: 'center', marginBottom: 2,
  },
  messageBubble: { maxWidth: '75%', borderRadius: 18, paddingHorizontal: 14, paddingVertical: 10 },
  userBubble: { backgroundColor: colors.primary, borderBottomRightRadius: 4 },
  assistantBubble: { backgroundColor: '#F3F4F6', borderBottomLeftRadius: 4 },
  messageText: { fontSize: 15, lineHeight: 21, color: colors.textPrimary },
  userMessageText: { color: colors.white },
  timestamp: { fontSize: 11, color: colors.textTertiary, marginTop: 4, alignSelf: 'flex-end' },
  userTimestamp: { color: 'rgba(255,255,255,0.7)' },
  typingRow: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingBottom: 8 },
  avatarCircleSmall: {
    width: 24, height: 24, borderRadius: 12,
    backgroundColor: '#F0FDF4', alignItems: 'center', justifyContent: 'center',
  },
  typingBubble: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#F3F4F6', borderRadius: 14, paddingHorizontal: 12, paddingVertical: 8,
  },
  typingText: { fontSize: 13, color: colors.textTertiary },
  inputBar: {
    flexDirection: 'row', alignItems: 'flex-end', gap: 8,
    paddingHorizontal: 12, paddingVertical: 10,
    borderTopWidth: 1, borderColor: colors.border, backgroundColor: colors.white,
  },
  textInput: {
    flex: 1, minHeight: 40, maxHeight: 120,
    borderWidth: 1, borderColor: colors.border, borderRadius: 20,
    paddingHorizontal: 16, paddingTop: 10, paddingBottom: 10,
    fontSize: 15, color: colors.textPrimary, backgroundColor: colors.backgroundSecondary,
  },
  sendButton: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center',
  },
  sendButtonDisabled: { opacity: 0.4 },
  // Post context card
  postContextCard: {
    backgroundColor: '#F0FDF4',
    borderBottomWidth: 1,
    borderColor: '#BBF7D0',
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 4,
  },
  postContextIconRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  postContextLabel: { fontSize: 12, fontWeight: '600', color: colors.primary },
  postContextUsername: { fontSize: 12, color: colors.textSecondary },
  postContextCaption: { fontSize: 13, color: colors.textPrimary, fontStyle: 'italic' },
  postContextRecipeBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  postContextRecipeText: { fontSize: 11, color: colors.primary, fontWeight: '600' },
  // Suggested post cards
  suggestedPostsContainer: { marginLeft: 38, marginTop: 6, gap: 8 },
  suggestedCard: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff',
    borderRadius: 12, borderWidth: 1, borderColor: colors.border,
    overflow: 'hidden', padding: 8, gap: 10,
  },
  suggestedCardImage: { width: 52, height: 52, borderRadius: 8, backgroundColor: colors.backgroundSecondary },
  suggestedCardImagePlaceholder: { justifyContent: 'center', alignItems: 'center' },
  suggestedCardInfo: { flex: 1, gap: 2 },
  suggestedCardCaption: { fontSize: 13, fontWeight: '600', color: colors.textPrimary, lineHeight: 18 },
  suggestedCardUsername: { fontSize: 12, color: colors.textSecondary },
  // Prompt modal
  promptOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  promptBox: {
    backgroundColor: colors.white,
    borderRadius: 14,
    padding: 24,
    width: 300,
  },
  promptTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 16,
  },
  promptInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 15,
    color: colors.textPrimary,
    marginBottom: 16,
  },
  promptButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  promptCancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
  },
  promptCancelText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  promptConfirmBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: colors.primary,
    alignItems: 'center',
  },
  promptConfirmText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.white,
  },
});
