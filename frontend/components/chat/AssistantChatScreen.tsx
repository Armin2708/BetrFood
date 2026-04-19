import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  ScrollView,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import Markdown from 'react-native-markdown-display';
import * as Clipboard from 'expo-clipboard';
import * as ImagePicker from 'expo-image-picker';
import { useActionSheet } from '@expo/react-native-action-sheet';
import { colors } from '../../constants/theme';
import { getImageUrl } from '../../services/api';
import {
  ChatAttachment,
  ChatMessage,
  PostContext,
  SuggestedPost,
  fetchChatHistory,
  fetchPantrySuggestions,
  renameConversation,
  streamChatMessage,
} from '../../services/api/chat';
import { PromptModal } from '../PromptModal';

type AssistantChatScreenProps = {
  initialConversationId?: string;
  initialTitle?: string;
  postContext?: PostContext | null;
  showBackButton?: boolean;
};

const QUICK_ACTIONS = [
  {
    id: 'carbonara',
    label: 'Pasta Help',
    message: 'How do I make pasta carbonara without scrambling the eggs?',
    icon: 'restaurant-outline' as const,
  },
  {
    id: 'substitute',
    label: 'Substitutions',
    message: 'What is a good substitute for heavy cream in a pasta sauce?',
    icon: 'swap-horizontal-outline' as const,
  },
  {
    id: 'pantry',
    label: 'Use My Pantry',
    message: 'What can I cook with the items in my pantry?',
    icon: 'basket-outline' as const,
  },
];

const ALLERGEN_ALERT_PREFIX = '⚠️ ALLERGEN ALERT:';
const MIN_INPUT_HEIGHT = 48;
const MAX_INPUT_HEIGHT = 132;

async function assetToAttachment(asset: ImagePicker.ImagePickerAsset): Promise<ChatAttachment> {
  if (!asset.base64) {
    throw new Error('Unable to read the selected image.');
  }

  const mimeType = asset.mimeType || 'image/jpeg';

  return {
    type: 'image',
    uri: asset.uri,
    mimeType,
    dataUrl: `data:${mimeType};base64,${asset.base64}`,
  };
}

function formatTimestamp(dateString: string) {
  return new Intl.DateTimeFormat(undefined, {
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(dateString));
}

function formatMessageMeta(message: ChatMessage) {
  if (message.status === 'sending') return 'Sending...';
  if (message.status === 'error') return 'Not sent';
  return `Sent ${formatTimestamp(message.created_at)}`;
}

function stripMarkdown(text: string) {
  return text
    .replace(/```[\s\S]*?```/g, (match) => match.replace(/```[^\n]*\n?|```/g, ''))
    .replace(/`([^`]+)`/g, '$1')
    .replace(/#{1,6}\s+/gm, '')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/__([^_]+)__/g, '$1')
    .replace(/_([^_]+)_/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/^[-*+]\s+/gm, '• ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function renderAssistantContent(content: string) {
  const lines = content.split('\n');
  const segments: { type: 'text' | 'allergen'; value: string }[] = [];
  let textBuffer = '';

  for (const line of lines) {
    if (line.trimStart().startsWith(ALLERGEN_ALERT_PREFIX)) {
      if (textBuffer.trim()) {
        segments.push({ type: 'text', value: textBuffer });
        textBuffer = '';
      }
      segments.push({ type: 'allergen', value: line.trim() });
      continue;
    }

    textBuffer += `${line}\n`;
  }

  if (textBuffer.trim()) {
    segments.push({ type: 'text', value: textBuffer });
  }

  if (segments.length === 0) {
    return <Markdown style={markdownStyles} rules={markdownRules}>{content}</Markdown>;
  }

  return (
    <View style={styles.segmentStack}>
      {segments.map((segment, index) => {
        if (segment.type === 'allergen') {
          return (
            <View key={`${segment.type}-${index}`} style={styles.allergenWarning}>
              <Ionicons name="warning" size={15} color="#B45309" />
              <Text style={styles.allergenText}>{segment.value}</Text>
            </View>
          );
        }

        return (
          <Markdown key={`${segment.type}-${index}`} style={markdownStyles} rules={markdownRules}>
            {segment.value}
          </Markdown>
        );
      })}
    </View>
  );
}

function SuggestedPostCard({ post }: { post: SuggestedPost }) {
  const imageUri = post.imagePath ? getImageUrl(post.imagePath) : null;

  return (
    <TouchableOpacity
      style={styles.suggestedCard}
      activeOpacity={0.82}
      onPress={() => router.push(`/post/${post.id}`)}
    >
      {imageUri ? (
        <Image source={{ uri: imageUri }} style={styles.suggestedCardImage} resizeMode="cover" />
      ) : (
        <View style={[styles.suggestedCardImage, styles.suggestedCardImagePlaceholder]}>
          <Ionicons name="image-outline" size={18} color={colors.textTertiary} />
        </View>
      )}
      <View style={styles.suggestedCardBody}>
        <Text numberOfLines={2} style={styles.suggestedCardTitle}>
          {post.caption || 'Untitled recipe'}
        </Text>
        <Text style={styles.suggestedCardMeta}>by {post.username}</Text>
      </View>
      <Ionicons name="chevron-forward" size={16} color={colors.textTertiary} />
    </TouchableOpacity>
  );
}

function PostContextCard({ context }: { context: PostContext }) {
  return (
    <View style={styles.postContextCard}>
      <View style={styles.postContextHeader}>
        <Ionicons name="document-text-outline" size={14} color={colors.primaryDark} />
        <Text style={styles.postContextEyebrow}>Asking about a post</Text>
      </View>
      {context.username ? <Text style={styles.postContextMeta}>@{context.username}</Text> : null}
      {context.caption ? (
        <Text numberOfLines={3} style={styles.postContextCaption}>
          {context.caption}
        </Text>
      ) : null}
      {context.recipe ? (
        <View style={styles.postContextRecipe}>
          {context.recipe.cookTime ? (
            <Text style={styles.postContextRecipeMeta}>⏱️ {context.recipe.cookTime}</Text>
          ) : null}
          {context.recipe.servings ? (
            <Text style={styles.postContextRecipeMeta}>🍽️ {context.recipe.servings} servings</Text>
          ) : null}
          {context.recipe.difficulty ? (
            <Text style={styles.postContextRecipeMeta}>📊 {context.recipe.difficulty}</Text>
          ) : null}
          {context.recipe.ingredients?.length ? (
            <Text style={styles.postContextRecipeMeta}>📦 {context.recipe.ingredients.length} ingredients</Text>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

export default function AssistantChatScreen({
  initialConversationId,
  initialTitle = 'AI Chat',
  postContext = null,
  showBackButton = false,
}: AssistantChatScreenProps) {
  const { showActionSheetWithOptions } = useActionSheet();
  const flatListRef = useRef<FlatList<ChatMessage>>(null);
  const cancelStreamRef = useRef<(() => void) | null>(null);
  const toastOpacity = useRef(new Animated.Value(0)).current;
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(
    initialConversationId ?? null
  );
  const [conversationTitle, setConversationTitle] = useState(initialTitle);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(Boolean(initialConversationId));
  const [sending, setSending] = useState(false);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [streamingContent, setStreamingContent] = useState<string | null>(null);
  const [pendingAttachment, setPendingAttachment] = useState<ChatAttachment | null>(null);
  const [promptVisible, setPromptVisible] = useState(false);
  const [promptValue, setPromptValue] = useState('');

  const isBusy = sending || loadingSuggestions || streamingContent !== null;

  const showToast = useCallback(() => {
    if (toastTimer.current) {
      clearTimeout(toastTimer.current);
    }

    Animated.sequence([
      Animated.timing(toastOpacity, { toValue: 1, duration: 180, useNativeDriver: true }),
      Animated.delay(1400),
      Animated.timing(toastOpacity, { toValue: 0, duration: 260, useNativeDriver: true }),
    ]).start();

    toastTimer.current = setTimeout(() => {
      toastOpacity.setValue(0);
    }, 2000);
  }, [toastOpacity]);

  const handleCopy = useCallback(
    async (content: string) => {
      await Clipboard.setStringAsync(stripMarkdown(content));
      showToast();
    },
    [showToast]
  );

  const scrollToBottom = useCallback((animated = true) => {
    requestAnimationFrame(() => {
      flatListRef.current?.scrollToEnd({ animated });
    });
  }, []);

  useEffect(() => {
    if (messages.length > 0) {
      scrollToBottom(false);
    }
  }, [messages.length, scrollToBottom]);

  useEffect(() => {
    if (streamingContent !== null) {
      scrollToBottom(false);
    }
  }, [streamingContent, scrollToBottom]);

  const loadConversationHistory = useCallback(async (conversationId?: string) => {
    if (!conversationId) {
      setMessages([]);
      setLoading(false);
      return;
    }

    setLoading(true);

    try {
      const history = await fetchChatHistory(conversationId);
      setMessages(history.map((message) => ({ ...message, status: 'sent' })));
    } catch {
      setMessages([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadConversationHistory(initialConversationId);

    return () => {
      cancelStreamRef.current?.();

      if (toastTimer.current) {
        clearTimeout(toastTimer.current);
      }
    };
  }, [initialConversationId, loadConversationHistory]);

  const handleRename = useCallback(async (title: string) => {
    if (!activeConversationId) {
      return;
    }

    try {
      await renameConversation(activeConversationId, title);
      setConversationTitle(title);
    } catch {
      Alert.alert('Rename failed', 'Unable to update the conversation title right now.');
    }
  }, [activeConversationId]);

  const resetForNewChat = useCallback(() => {
    cancelStreamRef.current?.();
    cancelStreamRef.current = null;
    setMessages([]);
    setInput('');
    setSending(false);
    setLoading(false);
    setLoadingSuggestions(false);
    setStreamingContent(null);
    setPendingAttachment(null);
    setActiveConversationId(null);
    setConversationTitle('AI Chat');
  }, []);

  const handleNewChat = useCallback(() => {
    if (showBackButton) {
      router.replace('/chat');
      return;
    }

    resetForNewChat();
  }, [resetForNewChat, showBackButton]);

  const markMessageSent = useCallback((messageId: number) => {
    setMessages((current) =>
      current.map((message) =>
        message.id === messageId
          ? { ...message, status: 'sent', created_at: new Date().toISOString() }
          : message
      )
    );
  }, []);

  const handleSend = useCallback((overrideText?: string) => {
    const text = (overrideText ?? input).trim();
    const attachments = pendingAttachment ? [pendingAttachment] : [];

    if ((!text && attachments.length === 0) || isBusy) {
      return;
    }

    const tempUserMessage: ChatMessage = {
      id: Date.now(),
      role: 'user',
      content: text,
      created_at: new Date().toISOString(),
      status: 'sending',
      attachments,
    };

    setMessages((current) => [...current, tempUserMessage]);
    setSending(true);
    setStreamingContent('');
    if (!overrideText) {
      setInput('');
      setPendingAttachment(null);
    }
    scrollToBottom();

    cancelStreamRef.current = streamChatMessage(
      text,
      (token) => {
        setStreamingContent((current) => (current ?? '') + token);
        scrollToBottom(false);
      },
      (savedMessage, returnedConversationId) => {
        cancelStreamRef.current = null;
        setSending(false);
        setStreamingContent(null);
        markMessageSent(tempUserMessage.id);

        if (returnedConversationId && !activeConversationId) {
          setActiveConversationId(returnedConversationId);
        }

        if (savedMessage) {
          setMessages((current) => [
            ...current.filter((message) => message.id !== savedMessage.id),
            { ...savedMessage, status: 'sent' },
          ]);
        } else {
          fetchChatHistory(returnedConversationId || activeConversationId || undefined)
            .then((history) => {
              setMessages(history.map((message) => ({ ...message, status: 'sent' })));
            })
            .catch(() => {});
        }

        scrollToBottom();
      },
      (errorMessage) => {
        cancelStreamRef.current = null;
        setSending(false);
        setStreamingContent(null);
        if (attachments.length > 0) {
          setPendingAttachment(attachments[0]);
        }
        setMessages((current) =>
          current.map((message) =>
            message.id === tempUserMessage.id ? { ...message, status: 'error' } : message
          )
        );

        if (!overrideText) {
          setInput(text);
        }

        Alert.alert('Chat error', errorMessage || 'Unable to get a response right now.');
      },
      activeConversationId ?? undefined,
      !activeConversationId ? conversationTitle : undefined,
      postContext ?? undefined,
      attachments
    );
  }, [activeConversationId, conversationTitle, input, isBusy, markMessageSent, pendingAttachment, postContext, scrollToBottom]);

  const handleAddImage = useCallback(async (mode: 'library' | 'camera') => {
    try {
      if (mode === 'camera') {
        const permission = await ImagePicker.requestCameraPermissionsAsync();
        if (!permission.granted) {
          Alert.alert('Camera access needed', 'Allow camera access to take a photo.');
          return;
        }
      } else {
        const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!permission.granted) {
          Alert.alert('Photo access needed', 'Allow photo library access to attach an image.');
          return;
        }
      }

      const result = mode === 'camera'
        ? await ImagePicker.launchCameraAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            quality: 0.7,
            base64: true,
          })
        : await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            quality: 0.7,
            base64: true,
          });

      if (result.canceled || !result.assets?.[0]) {
        return;
      }

      const attachment = await assetToAttachment(result.assets[0]);
      setPendingAttachment(attachment);
      scrollToBottom(false);
    } catch (error) {
      Alert.alert('Image failed', 'Unable to attach this image right now.');
    }
  }, [scrollToBottom]);

  const openAttachmentMenu = useCallback(() => {
    showActionSheetWithOptions(
      {
        options: ['Choose Photo', 'Take Picture', 'Cancel'],
        cancelButtonIndex: 2,
      },
      (selectedIndex) => {
        if (selectedIndex === 0) {
          void handleAddImage('library');
        }
        if (selectedIndex === 1) {
          void handleAddImage('camera');
        }
      }
    );
  }, [handleAddImage, showActionSheetWithOptions]);

  const handlePantrySuggestions = useCallback(async () => {
    if (isBusy) {
      return;
    }

    const tempUserMessage: ChatMessage = {
      id: Date.now(),
      role: 'user',
      content: QUICK_ACTIONS[2].message,
      created_at: new Date().toISOString(),
      status: 'sending',
    };

    setLoadingSuggestions(true);
    setMessages((current) => [...current, tempUserMessage]);
    scrollToBottom();

    try {
      const result = await fetchPantrySuggestions(activeConversationId ?? undefined);

      if (!activeConversationId) {
        setActiveConversationId(result.conversationId);
      }

      const history = await fetchChatHistory(result.conversationId);
      setMessages(history.map((message) => ({ ...message, status: 'sent' })));
    } catch (error: any) {
      setMessages((current) =>
        current.map((message) =>
          message.id === tempUserMessage.id ? { ...message, status: 'error' } : message
        )
      );

      Alert.alert(
        'Pantry chat failed',
        error?.message || 'Unable to generate pantry-based suggestions right now.'
      );
    } finally {
      setLoadingSuggestions(false);
      scrollToBottom();
    }
  }, [activeConversationId, isBusy, scrollToBottom]);

  const openHistory = useCallback(() => {
    router.push('/chat/history');
  }, []);

  const renderMessage = useCallback(({ item }: { item: ChatMessage }) => {
    const isUser = item.role === 'user';
    const hasSuggestedPosts = !isUser && (item.suggestedPosts?.length ?? 0) > 0;
    const visibleContent = item.content === '[Image attached]' ? '' : item.content;

    return (
      <View style={styles.messageBlock}>
        {isUser ? (
          <View style={styles.userMessageWrap}>
            <View style={styles.userBubble}>
              {item.attachments?.map((attachment, index) => (
                <Image
                  key={`${attachment.uri}-${index}`}
                  source={{ uri: attachment.uri }}
                  style={styles.userAttachmentImage}
                  resizeMode="cover"
                />
              ))}
              {visibleContent ? (
                <Text style={styles.userMessageText}>{visibleContent}</Text>
              ) : null}
            </View>
            <Text style={styles.userMeta}>{formatMessageMeta(item)}</Text>
          </View>
        ) : (
          <View style={styles.assistantMessageWrap}>
            <View style={styles.assistantAvatar}>
              <Ionicons name="sparkles" size={15} color={colors.white} />
            </View>
            <View style={styles.assistantBody}>
              <View style={styles.assistantBubble}>{renderAssistantContent(item.content)}</View>
              <View style={styles.assistantFooter}>
                <TouchableOpacity style={styles.actionButton} onPress={() => handleCopy(item.content)}>
                  <Ionicons name="copy-outline" size={15} color={colors.textSecondary} />
                </TouchableOpacity>
                <Text style={styles.assistantMeta}>{formatTimestamp(item.created_at)}</Text>
              </View>
            </View>
          </View>
        )}

        {hasSuggestedPosts ? (
          <View style={styles.suggestedPostsWrap}>
            <Text style={styles.suggestedPostsLabel}>Suggested recipes</Text>
              <ScrollView 
                horizontal 
                showsHorizontalScrollIndicator={false}
                style={styles.suggestedPostsScroll}
                contentContainerStyle={styles.suggestedPostsContent}
              >
                {item.suggestedPosts?.map((post) => <SuggestedPostCard key={post.id} post={post} />)}
              </ScrollView>
          </View>
        ) : null}
      </View>
    );
  }, [handleCopy]);

  const renderEmptyState = useCallback(() => {
    if (loading) {
      return null;
    }

    return (
      <View style={styles.emptyState}>
        <View style={styles.heroBadge}>
          <Ionicons name="sparkles" size={18} color={colors.primaryDark} />
          <Text style={styles.heroBadgeText}>BetrFood Assistant</Text>
        </View>
        <Text style={styles.heroTitle}>Ask any food or cooking question</Text>
        <Text style={styles.heroSubtitle}>
          Get recipe help, ingredient swaps, meal ideas, and pantry-aware suggestions without leaving the app.
        </Text>
        <View style={styles.quickActionsGrid}>
          {QUICK_ACTIONS.map((action) => (
            <Pressable
              key={action.id}
              style={styles.quickActionCard}
              disabled={isBusy}
              onPress={() =>
                action.id === 'pantry' ? handlePantrySuggestions() : handleSend(action.message)
              }
            >
              <View style={styles.quickActionIcon}>
                <Ionicons name={action.icon} size={18} color={colors.primaryDark} />
              </View>
              <View style={styles.quickActionContent}>
                <Text style={styles.quickActionLabel}>{action.label}</Text>
                <Text numberOfLines={2} style={styles.quickActionHint}>
                  {action.message}
                </Text>
              </View>
            </Pressable>
          ))}
        </View>
      </View>
    );
  }, [handlePantrySuggestions, handleSend, isBusy, loading]);

  return (
    <SafeAreaView style={styles.safeArea} edges={[]}>
      <View style={styles.shell}>
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            {showBackButton ? (
              <TouchableOpacity onPress={() => router.back()} style={styles.iconButton}>
                <Ionicons name="chevron-back" size={20} color={colors.textPrimary} />
              </TouchableOpacity>
            ) : null}
            <View>
              <Text style={styles.headerTitle}>{conversationTitle}</Text>
            </View>
          </View>
          <View style={styles.headerActions}>
            <TouchableOpacity onPress={openHistory} style={styles.iconButton}>
              <Ionicons name="time-outline" size={18} color={colors.textPrimary} />
            </TouchableOpacity>
            <TouchableOpacity onPress={handleNewChat} style={styles.iconButton}>
              <Ionicons name="create-outline" size={18} color={colors.textPrimary} />
            </TouchableOpacity>
            {activeConversationId ? (
              <TouchableOpacity
                onPress={() => {
                  setPromptValue(conversationTitle);
                  setPromptVisible(true);
                }}
                style={styles.iconButton}
              >
                <Ionicons name="pencil-outline" size={18} color={colors.textPrimary} />
              </TouchableOpacity>
            ) : null}
          </View>
        </View>

        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={0}
        >
          <View style={styles.flex}>
            {postContext ? <PostContextCard context={postContext} /> : null}

            {loading ? (
              <View style={styles.centered}>
                <ActivityIndicator size="large" color={colors.primaryDark} />
              </View>
            ) : messages.length === 0 ? (
              renderEmptyState()
            ) : (
              <FlatList
                ref={flatListRef}
                data={messages}
                keyExtractor={(item) => `${item.id}`}
                renderItem={renderMessage}
                contentContainerStyle={styles.listContent}
                showsVerticalScrollIndicator={false}
              />
            )}

            {(streamingContent === '' || loadingSuggestions) ? (
              <View style={styles.typingRow}>
                <View style={styles.assistantAvatar}>
                  <Ionicons name="sparkles" size={15} color={colors.white} />
                </View>
                <View style={styles.typingBubble}>
                  <ActivityIndicator size="small" color={colors.primaryDark} />
                  <Text style={styles.typingText}>Thinking...</Text>
                </View>
              </View>
            ) : null}

            {streamingContent && streamingContent.length > 0 ? (
              <View style={styles.typingRow}>
                <View style={styles.assistantAvatar}>
                  <Ionicons name="sparkles" size={15} color={colors.white} />
                </View>
                <View style={styles.streamingBubble}>{renderAssistantContent(streamingContent)}</View>
              </View>
            ) : null}
          </View>

          <View style={styles.composerWrap}>
            {pendingAttachment ? (
              <View style={styles.attachmentPreviewCard}>
                <Image source={{ uri: pendingAttachment.uri }} style={styles.attachmentPreviewImage} />
                <TouchableOpacity
                  style={styles.attachmentRemoveButton}
                  onPress={() => setPendingAttachment(null)}
                >
                  <Ionicons name="close" size={14} color={colors.white} />
                </TouchableOpacity>
              </View>
            ) : null}
            <View
              style={[
                styles.composerRow,
                { paddingBottom: 10 },
              ]}
            >
              <TouchableOpacity style={styles.attachButton} onPress={openAttachmentMenu}>
                <Ionicons name="add" size={24} color={colors.white} />
              </TouchableOpacity>

              <View style={styles.inputShell}>
                <TextInput
                  style={styles.input}
                  maxLength={2000}
                  placeholder="Ask something"
                  placeholderTextColor="#7FA78B"
                  value={input}
                  onChangeText={setInput}
                  editable={!isBusy}
                  returnKeyType="send"
                  blurOnSubmit={false}
                  multiline
                  scrollEnabled
                />
                <TouchableOpacity
                  style={[styles.sendButton, (!input.trim() || isBusy) && styles.sendButtonDisabled]}
                  disabled={!input.trim() || isBusy}
                  onPress={() => handleSend()}
                >
                  <Ionicons name="arrow-up" size={18} color="#111111" style={styles.sendIcon} />
                </TouchableOpacity>
              </View>
            </View>
          </View>

          <Animated.View pointerEvents="none" style={[styles.toast, { opacity: toastOpacity }]}>
            <Ionicons name="checkmark-circle" size={16} color={colors.white} />
            <Text style={styles.toastText}>Copied</Text>
          </Animated.View>
        </KeyboardAvoidingView>
      </View>

      <PromptModal
        visible={promptVisible}
        title="Rename Chat"
        value={promptValue}
        onChangeText={setPromptValue}
        onCancel={() => {
          setPromptVisible(false);
          setPromptValue('');
        }}
        onSubmit={() => {
          const nextTitle = promptValue.trim();
          setPromptVisible(false);
          setPromptValue('');
          if (nextTitle) {
            handleRename(nextTitle);
          }
        }}
      />
    </SafeAreaView>
  );
}

// Matches emoji characters — Emoji_Presentation covers symbols like ✅🛒
// and Extended_Pictographic covers ZWJ sequences and newer emoji blocks.
// The 'u' flag enables \p{} Unicode property escapes (Hermes supports this).
const EMOJI_RE = /(\p{Emoji_Presentation}|\p{Extended_Pictographic})/gu;

function renderTextWithEmoji(text: string, key: string): React.ReactNode {
  EMOJI_RE.lastIndex = 0;
  if (!EMOJI_RE.test(text)) {
    EMOJI_RE.lastIndex = 0;
    return <Text key={key}>{text}</Text>;
  }
  EMOJI_RE.lastIndex = 0;

  const parts: React.ReactNode[] = [];
  let last = 0;
  let i = 0;
  let m: RegExpExecArray | null;

  while ((m = EMOJI_RE.exec(text)) !== null) {
    if (m.index > last) {
      parts.push(<Text key={`${key}t${i++}`}>{text.slice(last, m.index)}</Text>);
    }
    // Render each emoji in isolation so the OS emoji font fallback kicks in
    parts.push(
      <Text key={`${key}e${i++}`} style={markdownStyles.emoji}>
        {m[0]}
      </Text>
    );
    last = m.index + m[0].length;
  }
  if (last < text.length) {
    parts.push(<Text key={`${key}t${i++}`}>{text.slice(last)}</Text>);
  }

  return <Text key={key}>{parts}</Text>;
}

const markdownRules = {
  text: (node: any) => renderTextWithEmoji(node.content ?? '', node.key),
};

const markdownStyles = StyleSheet.create({
  emoji: {
    includeFontPadding: false,
  },
  body: {
    fontSize: 15,
    lineHeight: 26,
    color: colors.textPrimary,
  },
  strong: {
    fontWeight: '700',
  },
  bullet_list: {
    marginVertical: 4,
  },
  ordered_list: {
    marginVertical: 4,
  },
  list_item: {
    marginVertical: 2,
  },
  paragraph: {
    marginVertical: 2,
  },
  code_inline: {
    backgroundColor: '#E2E8F0',
    borderRadius: 4,
    paddingHorizontal: 4,
    fontSize: 13,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  fence: {
    backgroundColor: '#E2E8F0',
    borderRadius: 10,
    padding: 10,
    fontSize: 13,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
});

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.white,
  },
  shell: {
    flex: 1,
    backgroundColor: colors.white,
  },
  flex: {
    flex: 1,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 8,
    backgroundColor: colors.white,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E5E7EB',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginLeft: 12,
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
    paddingHorizontal: 14,
    paddingTop: 4,
    paddingBottom: 18,
    gap: 18,
  },
  emptyState: {
    paddingHorizontal: 10,
    paddingTop: 24,
    alignItems: 'center',
  },
  heroBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: '#E4F4E8',
    borderWidth: 1,
    borderColor: '#C6E7CF',
    marginBottom: 18,
  },
  heroBadgeText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.primaryDark,
  },
  heroTitle: {
    fontSize: 28,
    lineHeight: 34,
    fontWeight: '800',
    textAlign: 'center',
    color: colors.textPrimary,
    maxWidth: 340,
  },
  heroSubtitle: {
    marginTop: 12,
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
    color: colors.textSecondary,
    maxWidth: 360,
  },
  quickActionsGrid: {
    width: '100%',
    gap: 12,
    marginTop: 24,
  },
  quickActionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    borderRadius: 20,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: '#D9E9DD',
    paddingHorizontal: 16,
    paddingVertical: 15,
  },
  quickActionIcon: {
    width: 40,
    height: 40,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E7F6EA',
  },
  quickActionContent: {
    flex: 1,
    gap: 2,
  },
  quickActionLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  quickActionHint: {
    fontSize: 13,
    lineHeight: 18,
    color: colors.textSecondary,
  },
  messageBlock: {
    gap: 8,
  },
  userMessageWrap: {
    alignItems: 'flex-end',
    gap: 6,
  },
  userBubble: {
    maxWidth: '84%',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 24,
    borderBottomRightRadius: 8,
    backgroundColor: colors.primaryDark,
  },
  userMessageText: {
    color: colors.white,
    fontSize: 15,
    lineHeight: 21,
  },
  userAttachmentImage: {
    width: 180,
    height: 180,
    borderRadius: 16,
    marginBottom: 10,
  },
  userMeta: {
    fontSize: 11,
    color: colors.textTertiary,
    paddingHorizontal: 4,
  },
  assistantMessageWrap: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  assistantAvatar: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primaryDark,
    marginTop: 2,
  },
  assistantBody: {
    flex: 1,
    gap: 8,
  },
  assistantBubble: {
    backgroundColor: colors.white,
    borderRadius: 22,
    borderTopLeftRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  assistantFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingLeft: 4,
  },
  assistantMeta: {
    fontSize: 11,
    color: colors.textTertiary,
  },
  actionButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EDF3EE',
  },
  segmentStack: {
    gap: 6,
  },
  allergenWarning: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    borderRadius: 12,
    backgroundColor: '#FEF3C7',
    borderWidth: 1,
    borderColor: '#FACC15',
    padding: 10,
  },
  allergenText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
    color: '#92400E',
    fontWeight: '600',
  },
  typingRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    paddingHorizontal: 14,
    paddingBottom: 10,
  },
  typingBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: 22,
    borderTopLeftRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  typingText: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  streamingBubble: {
    flex: 1,
    borderRadius: 22,
    borderTopLeftRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  composerWrap: {
    paddingHorizontal: 12,
    paddingTop: 0,
    paddingBottom: 0,
    backgroundColor: colors.white,
  },
  attachmentPreviewCard: {
    alignSelf: 'flex-end',
    width: 88,
    height: 88,
    borderRadius: 18,
    marginBottom: 10,
    overflow: 'hidden',
    backgroundColor: '#F4FBF5',
    borderWidth: 1,
    borderColor: '#CFE5D4',
  },
  attachmentPreviewImage: {
    width: '100%',
    height: '100%',
  },
  attachmentRemoveButton: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(15,23,42,0.78)',
  },
  composerRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 10,
    minHeight: 52,
  },
  attachButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primaryDark,
    borderWidth: 1,
    borderColor: '#4BAE68',
    alignSelf: 'flex-end',
  },
  inputShell: {
    flex: 1,
    position: 'relative',
    overflow: 'hidden',
    justifyContent: 'flex-start',
    backgroundColor: '#F4FBF5',
    borderWidth: 1,
    borderColor: '#CFE5D4',
    borderRadius: 24,
    paddingLeft: 18,
    paddingRight: 18,
    paddingTop: 0,
    paddingBottom: 0,
    minHeight: MIN_INPUT_HEIGHT,
    maxHeight: MAX_INPUT_HEIGHT,
  },
  input: {
    width: '100%',
    maxWidth: '100%',
    minWidth: 0,
    fontSize: 15,
    lineHeight: 22,
    color: colors.textPrimary,
    alignSelf: 'stretch',
    paddingTop: 13,
    paddingBottom: 13,
    paddingHorizontal: 0,
    paddingRight: 52,
    marginVertical: 0,
    includeFontPadding: false,
    textAlign: 'left',
    textAlignVertical: 'top',
    maxHeight: MAX_INPUT_HEIGHT,
  },
  sendButton: {
    position: 'absolute',
    right: 8,
    bottom: 6,
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#BEE8C8',
  },
  sendIcon: {
    transform: [{ rotate: '90deg' }],
  },
  sendButtonDisabled: {
    opacity: 0.45,
  },
  postContextCard: {
    marginHorizontal: 14,
    marginTop: 12,
    marginBottom: 4,
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: '#E7F6EA',
    borderWidth: 1,
    borderColor: '#C6E7CF',
    gap: 4,
  },
  postContextHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  postContextEyebrow: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primaryDark,
  },
  postContextMeta: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  postContextCaption: {
    fontSize: 13,
    lineHeight: 18,
    color: colors.textPrimary,
  },
  postContextRecipe: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 6,
  },
  postContextRecipeMeta: {
    fontSize: 12,
    color: colors.primaryDark,
    fontWeight: '500',
    paddingHorizontal: 8,
    paddingVertical: 2,
    backgroundColor: colors.white,
    borderRadius: 10,
  },
  suggestedPostsWrap: {
    marginLeft: 40,
    gap: 8,
  },
  suggestedPostsLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primaryDark,
  },
  suggestedPostsScroll: {
    marginHorizontal: -14,
  },
  suggestedPostsContent: {
    paddingHorizontal: 14,
    gap: 10,
  },
  suggestedCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: 16,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    padding: 10,
    minWidth: 200,
  },
  suggestedCardImage: {
    width: 52,
    height: 52,
    borderRadius: 12,
    backgroundColor: '#EDF3EE',
  },
  suggestedCardImagePlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  suggestedCardBody: {
    flex: 1,
    gap: 2,
  },
  suggestedCardTitle: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  suggestedCardMeta: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  toast: {
    position: 'absolute',
    bottom: 96,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: 'rgba(15, 23, 42, 0.88)',
  },
  toastText: {
    color: colors.white,
    fontSize: 13,
    fontWeight: '600',
  },
});
