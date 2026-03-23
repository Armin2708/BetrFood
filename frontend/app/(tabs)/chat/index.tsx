import React, { useState, useEffect, useRef, useCallback } from 'react';
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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import Markdown from 'react-native-markdown-display';
import { colors } from '../../../constants/theme';
import {
  ChatMessage,
  sendChatMessage,
  fetchChatHistory,
  fetchPantrySuggestions,
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

const QUICK_ACTIONS = [
  { id: 'pantry', label: '🥗 What can I cook?', message: 'What can I cook with the items in my pantry?' },
  { id: 'expiring', label: '⏰ Use expiring items', message: 'What should I cook first using my items that are expiring soon?' },
  { id: 'ideas', label: '💡 Meal ideas', message: 'Give me some quick and easy meal ideas for today.' },
];

export default function ChatScreen() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const flatListRef = useRef<FlatList<ChatMessage>>(null);

  const loadHistory = useCallback(async () => {
    try {
      const history = await fetchChatHistory();
      setMessages(history.reverse());
    } catch {
      // silently ignore - empty chat is fine
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadHistory();
    }, [loadHistory])
  );

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
      await sendChatMessage(text);
      const history = await fetchChatHistory();
      setMessages(history.reverse());
    } catch {
      setMessages((prev) => prev.filter((m) => m.id !== tempUserMsg.id));
      if (!overrideText) setInput(text);
      Alert.alert('Oops', 'Failed to get a response. Please try again.');
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
      await fetchPantrySuggestions();
      const history = await fetchChatHistory();
      setMessages(history.reverse());
    } catch {
      setMessages((prev) => prev.filter((m) => m.id !== tempUserMsg.id));
      Alert.alert('Oops', 'Failed to get pantry suggestions. Please try again.');
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
      {/* Header */}
      <View style={styles.header}>
        <Ionicons name="chatbubble-ellipses" size={22} color={colors.white} />
        <Text style={styles.headerTitle} accessibilityRole="header">
          AI Chat
        </Text>
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

        {/* Typing indicator */}
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

        {/* Quick action bar (shown when there are messages) */}
        {messages.length > 0 && (
          <View style={styles.quickActionsBar}>
            <TouchableOpacity
              style={styles.pantryChip}
              onPress={handlePantrySuggestions}
              disabled={isBusy}
              activeOpacity={0.75}
              accessibilityRole="button"
              accessibilityLabel="Get pantry recipe suggestions"
            >
              <Ionicons name="basket-outline" size={14} color={colors.primary} />
              <Text style={styles.pantryChipText}>Pantry Recipes</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Input bar */}
        <View style={styles.inputBar}>
          <TextInput
            style={styles.textInput}
            placeholder="Ask about food or cooking..."
            placeholderTextColor={colors.placeholder}
            value={input}
            onChangeText={setInput}
            multiline
            maxLength={2000}
            returnKeyType="default"
            editable={!isBusy}
            accessibilityLabel="Chat message input"
          />
          <TouchableOpacity
            style={[
              styles.sendButton,
              (!input.trim() || isBusy) && styles.sendButtonDisabled,
            ]}
            onPress={() => handleSend()}
            disabled={!input.trim() || isBusy}
            accessibilityRole="button"
            accessibilityLabel="Send message"
          >
            <Ionicons
              name="arrow-up"
              size={20}
              color={colors.white}
            />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
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
  container: {
    flex: 1,
    backgroundColor: colors.white,
  },
  flex: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.white,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  messageList: {
    paddingHorizontal: 12,
    paddingVertical: 16,
    gap: 12,
  },
  emptyList: {
    flex: 1,
    justifyContent: 'center',
  },
  // Empty state
  emptyState: {
    alignItems: 'center',
    paddingHorizontal: 32,
    gap: 12,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.textPrimary,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 4,
  },
  quickActionsGrid: {
    width: '100%',
    gap: 10,
    marginTop: 4,
  },
  quickActionChip: {
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#BBF7D0',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    alignItems: 'center',
  },
  quickActionText: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.primary,
  },
  // Quick action bar (inline, for when messages exist)
  quickActionsBar: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingBottom: 6,
    gap: 8,
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
  pantryChipText: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.primary,
  },
  // Message rows
  messageBubbleRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
  },
  userRow: {
    justifyContent: 'flex-end',
  },
  assistantRow: {
    justifyContent: 'flex-start',
  },
  avatarCircle: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#F0FDF4',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  // Bubbles
  messageBubble: {
    maxWidth: '75%',
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  userBubble: {
    backgroundColor: colors.primary,
    borderBottomRightRadius: 4,
  },
  assistantBubble: {
    backgroundColor: '#F3F4F6',
    borderBottomLeftRadius: 4,
  },
  messageText: {
    fontSize: 15,
    lineHeight: 21,
    color: colors.textPrimary,
  },
  userMessageText: {
    color: colors.white,
  },
  timestamp: {
    fontSize: 11,
    color: colors.textTertiary,
    marginTop: 4,
    alignSelf: 'flex-end',
  },
  userTimestamp: {
    color: 'rgba(255,255,255,0.7)',
  },
  // Typing indicator
  typingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingBottom: 8,
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
  typingText: {
    fontSize: 13,
    color: colors.textTertiary,
  },
  // Input bar
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
  sendButtonDisabled: {
    opacity: 0.4,
  },
});
