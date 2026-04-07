import { useLocalSearchParams } from 'expo-router';
import AssistantChatScreen from '../../../components/chat/AssistantChatScreen';
import { PostContext } from '../../../services/api/chat';

export default function ConversationScreen() {
  const params = useLocalSearchParams<{
    id?: string;
    title?: string;
    postContext?: string;
  }>();

  let postContext: PostContext | null = null;

  if (params.postContext) {
    try {
      postContext = JSON.parse(decodeURIComponent(params.postContext));
    } catch {
      postContext = null;
    }
  }

  const conversationId = params.id && params.id !== 'new' ? params.id : undefined;

  return (
    <AssistantChatScreen
      initialConversationId={conversationId}
      initialTitle={params.title || 'AI Chat'}
      postContext={postContext}
    />
  );
}
