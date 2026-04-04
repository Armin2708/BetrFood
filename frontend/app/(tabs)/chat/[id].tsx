import React, { useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  Image,
  FlatList,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, router } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import Markdown from 'react-native-markdown-display';
import { colors } from '../../../constants/theme';
import { getImageUrl } from '../../../services/api';
import {
  ChatMessage,
  PostContext,
  sendChatMessage,
  fetchChatHistory,
  fetchPantrySuggestions,
  renameConversation,
  SuggestedPost
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

const QUICK_ACTIONS = [
  { id: 'pantry', label: 'What can I cook?', icon: 'basket-outline' as const, message: 'What can I cook with the items in my pantry?' },
  { id: 'expiring', label: 'Use expiring items', icon: 'time-outline' as const, message: 'What should I cook first using my items that are expiring soon?' },
  { id: 'ideas', label: 'Meal ideas', icon: 'bulb-outline' as const, message: 'Give me some quick and easy meal ideas for today.' },
];

export function PostContextCard({ context }: { context: PostContext }) {
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

export function SuggestedPostCard({ post }: { post: SuggestedPost }) {
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

export default function ConversationScreen() {
  const params = useLocalSearchParams<{ 
    id?: string; 
    title?: string; 
    isNew?: string;
    postContext?: string;
  }>();

  const conversationId = params.id;
  const isNewConversation = params.isNew === 'true';
  const initialTitle = params.title || 'New Chat';

  const postContext: PostContext | null = (() => {
    if (!params.postContext) return null;
    try { return JSON.parse(decodeURIComponent(params.postContext)); }
    catch { return null; }
  })();

  const [activeConversationId, setActiveConversationId] = useState<string | null>(
    isNewConversation ? 'new' : conversationId || null
  );
  const [conversationTitle, setConversationTitle] = useState(initialTitle);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const flatListRef = useRef<FlatList<ChatMessage>>(null);

  // Prompt modal state
  const [promptVisible, setPromptVisible] = useState(false);
  const [promptValue, setPromptValue] = useState('');

  const showPrompt = (defaultValue: string, onSubmit: (value: string) => void) => {
    setPromptValue(defaultValue);
    setPromptVisible(true);
  };

  const handlePromptSubmit = () => {
    setPromptVisible(false);
    if (promptValue.trim()) {
      handleRename(promptValue.trim());
    }
    setPromptValue('');
  };

  const handlePromptCancel = () => {
    setPromptVisible(false);
    setPromptValue('');
  };

  const loadConversationHistory = useCallback(async () => {
    if (!conversationId || isNewConversation) {
      setMessages([]);
      return;
    }

    setLoading(true);
    try {
      const history = await fetchChatHistory(conversationId);
      setMessages(history);
    } catch {
      setMessages([]);
    } finally {
      setLoading(false);
    }
  }, [conversationId, isNewConversation]);

  useFocusEffect(
    useCallback(() => {
      loadConversationHistory();
    }, [loadConversationHistory])
  );

  const handleRename = async (newTitle: string) => {
    if (!activeConversationId || activeConversationId === 'new') return;
    
    try {
      await renameConversation(activeConversationId, newTitle);
      setConversationTitle(newTitle);
    } catch {
      Alert.alert('Error', 'Failed to rename conversation.');
    }
  };

  const handleRenamePress = () => {
    if (activeConversationId === 'new') return;
    showPrompt(conversationTitle, handleRename);
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
      const title = activeConversationId === 'new' ? conversationTitle : undefined;
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

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="chevron-back" size={24} color={colors.white} />
        </TouchableOpacity>
        <TouchableOpacity
          onPress={activeConversationId !== 'new' ? handleRenamePress : undefined}
          style={styles.headerTitleButton}
          activeOpacity={activeConversationId !== 'new' ? 0.7 : 1}
        >
          <Text style={styles.headerTitle} numberOfLines={1}>
            {conversationTitle}
          </Text>
          {activeConversationId !== 'new' && (
            <Ionicons name="pencil-outline" size={14} color="rgba(255,255,255,0.7)" />
          )}
        </TouchableOpacity>
        <View style={{ width: 10 }} />
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
      
      <PromptModal
        visible={promptVisible}
        title="Rename Chat"
        value={promptValue}
        onChangeText={setPromptValue}
        onSubmit={handlePromptSubmit}
        onCancel={handlePromptCancel}
      />
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
  code_inline: { 
    backgroundColor: '#E5E7EB', 
    borderRadius: 4, 
    paddingHorizontal: 4, 
    fontSize: 13, 
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' 
  },
  fence: { 
    backgroundColor: '#E5E7EB', 
    borderRadius: 8, 
    padding: 10, 
    marginVertical: 4, 
    fontSize: 13, 
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' 
  },
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
  backButton: { padding: 4, marginRight: 4 },
  headerTitleButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  
  // Messages
  messageList: { paddingHorizontal: 12, paddingVertical: 16, gap: 12 },
  emptyList: { flex: 1, justifyContent: 'center' },
  emptyState: { alignItems: 'center', paddingHorizontal: 32, gap: 12 },
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
  quickActionsBar: { 
    flexDirection: 'row', 
    paddingHorizontal: 12, 
    paddingBottom: 6, 
    gap: 8 
  },
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
    width: 30, 
    height: 30, 
    borderRadius: 15,
    backgroundColor: '#F0FDF4', 
    alignItems: 'center', 
    justifyContent: 'center', 
    marginBottom: 2,
  },
  messageBubble: { 
    maxWidth: '75%', 
    borderRadius: 18, 
    paddingHorizontal: 14, 
    paddingVertical: 10 
  },
  userBubble: { backgroundColor: colors.primary, borderBottomRightRadius: 4 },
  assistantBubble: { backgroundColor: '#F3F4F6', borderBottomLeftRadius: 4 },
  messageText: { fontSize: 15, lineHeight: 21, color: colors.textPrimary },
  userMessageText: { color: colors.white },
  timestamp: { 
    fontSize: 11, 
    color: colors.textTertiary, 
    marginTop: 4, 
    alignSelf: 'flex-end' 
  },
  userTimestamp: { color: 'rgba(255,255,255,0.7)' },
  typingRow: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: 6, 
    paddingHorizontal: 12, 
    paddingBottom: 8 
  },
  avatarCircleSmall: {
    width: 24, 
    height: 24, 
    borderRadius: 12,
    backgroundColor: '#F0FDF4', 
    alignItems: 'center', 
    justifyContent: 'center',
  },
  typingBubble: {
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: 6,
    backgroundColor: '#F3F4F6', 
    borderRadius: 14, 
    paddingHorizontal: 12, 
    paddingVertical: 8,
  },
  typingText: { fontSize: 13, color: colors.textTertiary },
  inputBar: {
    flexDirection: 'row', 
    alignItems: 'flex-end', 
    gap: 8,
    paddingHorizontal: 12, 
    paddingVertical: 10,
    borderTopWidth: 1, 
    borderColor: colors.border, 
    backgroundColor: colors.white,
  },
  textInput: {
    flex: 1, 
    minHeight: 40, 
    maxHeight: 120,
    borderWidth: 1, 
    borderColor: colors.border, 
    borderRadius: 20,
    paddingHorizontal: 16, 
    paddingTop: 10, 
    paddingBottom: 10,
    fontSize: 15, 
    color: colors.textPrimary, 
    backgroundColor: colors.backgroundSecondary,
  },
  sendButton: {
    width: 40, 
    height: 40, 
    borderRadius: 20,
    backgroundColor: colors.primary, 
    alignItems: 'center', 
    justifyContent: 'center',
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

  // Suggested posts
  suggestedPostsContainer: { marginLeft: 38, marginTop: 6, gap: 8 },
  suggestedCard: {
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: '#fff',
    borderRadius: 12, 
    borderWidth: 1, 
    borderColor: colors.border,
    overflow: 'hidden', 
    padding: 8, 
    gap: 10,
  },
  suggestedCardImage: { 
    width: 52, 
    height: 52, 
    borderRadius: 8, 
    backgroundColor: colors.backgroundSecondary 
  },
  suggestedCardImagePlaceholder: { 
    justifyContent: 'center', 
    alignItems: 'center' 
  },
  suggestedCardInfo: { flex: 1, gap: 2 },
  suggestedCardCaption: { 
    fontSize: 13, 
    fontWeight: '600', 
    color: colors.textPrimary, 
    lineHeight: 18 
  },
  suggestedCardUsername: { fontSize: 12, color: colors.textSecondary },
});
