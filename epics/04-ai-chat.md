# Epic 4: AI Chat (OpenRouter-Powered Food Assistant)

## Overview

Build an AI-powered chat interface where users can ask cooking questions, get recipe suggestions, request ingredient substitutions, and get context-aware help. The chat uses a free ChatGPT model via OpenRouter and can reference posts from the BetrFood platform, pantry items, and the user's dietary profile to give personalized answers.

## Architecture

- **Client**: iOS app (Swift, Xcode)
- **AI Backend**: OpenRouter API (free ChatGPT model)
- **Context Storage**: Supabase (PostgreSQL) for chat history
- **Post References**: Supabase queries to fetch referenced post data
- **User Context**: Dietary preferences, allergies, pantry items from Supabase

## User Stories

### Core Chat

- **As a user**, I want to open a chat screen and type a food/cooking question in natural language.
- **As a user**, I want to receive AI-generated responses about cooking techniques, ingredient info, recipe ideas, and food facts.
- **As a user**, I want the chat to feel conversational with multi-turn context (the AI remembers what we discussed earlier in the session).
- **As a user**, I want to start new chat sessions and access my chat history.
- **As a user**, I want to delete chat sessions I no longer need.

### Post-Aware Chat (Reference Posts)

- **As a user**, I want to open the AI chat directly from a post detail screen so that the AI has context about that specific recipe/post.
- **As a user**, I want to ask questions about a specific post (e.g., "Can I substitute the butter in this recipe?" while viewing a butter-heavy recipe).
- **As a user**, I want the AI to reference the recipe's ingredients, steps, and metadata when answering.
- **As a user**, I want the AI to suggest posts from BetrFood that are relevant to my question (e.g., "Show me pasta recipes" → AI suggests matching posts).

### Personalized Responses

- **As a user**, I want the AI to know my dietary preferences and allergies so that it gives safe, personalized advice.
- **As a user**, I want the AI to reference my pantry items when I ask "What can I cook tonight?" so that it suggests recipes based on what I have.
- **As a user**, I want the AI to warn me if a suggestion contains an allergen I've flagged.

### Chat Features

- **As a user**, I want to see the AI's response stream in real-time (typing indicator / streamed text) for a responsive feel.
- **As a user**, I want to copy AI responses to my clipboard.
- **As a user**, I want to see recipe suggestions from the AI as tappable cards that navigate to the actual post.

## Data Model (Supabase/PostgreSQL)

### Tables

```
chat_sessions
  - id (uuid, PK)
  - user_id (uuid, FK -> profiles)
  - title (text)                   -- auto-generated from first message or user-set
  - referenced_post_id (uuid, FK -> posts, nullable) -- if started from a post
  - created_at (timestamptz)
  - updated_at (timestamptz)

chat_messages
  - id (uuid, PK)
  - session_id (uuid, FK -> chat_sessions)
  - role (enum: user, assistant, system)
  - content (text)
  - referenced_post_ids (uuid[], nullable) -- posts mentioned in response
  - created_at (timestamptz)
```

## OpenRouter Integration

### API Configuration

```swift
// OpenRouter API endpoint
let endpoint = "https://openrouter.ai/api/v1/chat/completions"

// Request structure
struct ChatRequest: Codable {
    let model: String          // free ChatGPT model ID
    let messages: [Message]
    let stream: Bool           // true for streaming responses
}
```

### System Prompt Construction

The system prompt is dynamically built per session to include user context:

```
You are BetrFood AI, a friendly and knowledgeable cooking assistant.

User Profile:
- Dietary preferences: {user.dietary_preferences}
- Allergies: {user.allergies} (ALWAYS warn about these)
- Favorite cuisines: {user.favorite_cuisines}

{if referenced_post}
The user is asking about this recipe:
- Title: {post.caption}
- Ingredients: {post.recipe_data.ingredients}
- Steps: {post.recipe_data.steps}
- Cook time: {post.recipe_data.cook_time}
{/if}

{if pantry_context}
The user's pantry contains: {pantry_items.names}
{/if}

Guidelines:
- Always respect the user's dietary restrictions and allergies.
- If a suggestion contains a known allergen, clearly warn the user.
- Give practical, actionable cooking advice.
- When suggesting recipes, prefer ones the user can make with their pantry items.
- Keep responses concise but helpful.
```

### Post Reference Search

When the AI needs to suggest BetrFood posts:

```sql
-- Search posts matching AI-determined keywords
SELECT id, caption, media_urls, recipe_data
FROM posts
WHERE to_tsvector('english', caption || ' ' || recipe_data::text)
      @@ plainto_tsquery('english', :search_terms)
  AND is_draft = false
ORDER BY created_at DESC
LIMIT 5;
```

## iOS Implementation Notes

### Chat UI

- SwiftUI chat interface with `ScrollView` and `LazyVStack` for message bubbles.
- User messages aligned right, AI messages aligned left.
- Streaming response display: append text chunks as they arrive via SSE (Server-Sent Events) from OpenRouter.
- "Typing..." indicator while waiting for first chunk.
- Post reference cards rendered as tappable inline views within AI messages.

### Networking

- Use `URLSession` with streaming support for SSE responses from OpenRouter.
- Parse `data: {...}` lines from the stream and extract `delta.content` tokens.
- Handle connection errors with retry logic and user-friendly error messages.

### Context Management

- Build the `messages` array for OpenRouter from chat history (last N messages to stay within token limits).
- Inject system prompt with user context at the start of each request.
- When started from a post, include the post's recipe data in the system prompt.
- When the user asks about pantry, fetch current pantry items and inject into context.

### Key Components

```
ChatListView          -- list of chat sessions
ChatView              -- single chat session with messages
ChatInputBar          -- text input with send button
MessageBubble         -- individual message display
PostReferenceCard     -- tappable card showing a referenced post
OpenRouterService     -- API client for OpenRouter
ChatContextBuilder    -- constructs system prompt with user context
```

## Acceptance Criteria

- [ ] User can open AI chat from the main tab bar
- [ ] User can type a question and receive an AI response
- [ ] AI responses stream in real-time (token by token)
- [ ] Chat supports multi-turn conversation (context preserved within a session)
- [ ] User can start a new chat session
- [ ] User can view and resume previous chat sessions
- [ ] User can delete chat sessions
- [ ] User can open AI chat from a post detail screen with post context pre-loaded
- [ ] AI responses account for user's dietary preferences
- [ ] AI warns about allergens in its suggestions
- [ ] User can ask "What can I cook?" and AI references pantry items
- [ ] AI can suggest BetrFood posts as tappable cards in responses
- [ ] Chat history is persisted to Supabase
- [ ] Error states are handled gracefully (network errors, API rate limits)
- [ ] User can copy AI response text

## Dependencies

- Epic 2 (User Management) — requires authenticated users with dietary profiles
- Epic 3 (Pantry) — for pantry-aware suggestions
- Epic 1 (Content System) — for post reference/search capabilities
- OpenRouter API key and free ChatGPT model access
- Network connectivity for AI responses
