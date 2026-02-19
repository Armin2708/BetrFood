# Epic 5: Content Suggestion & Discovery (Search + For You)

## Overview

Build the content discovery system that helps users find relevant food content through search, personalized "For You" recommendations, and category browsing. The system uses user preferences, interaction history, dietary profile, and pantry data to surface the most relevant content.

## Architecture

- **Client**: iOS app (Swift, Xcode)
- **Backend**: Supabase (PostgreSQL with full-text search + custom scoring)
- **Personalization**: Server-side scoring functions in PostgreSQL / Supabase Edge Functions
- **Search**: PostgreSQL full-text search (`tsvector` / `tsquery`)

## User Stories

### Search

- **As a user**, I want to search for posts by keywords (e.g., "chicken pasta", "vegan dessert") so that I can find specific recipes.
- **As a user**, I want to search for users by username or display name.
- **As a user**, I want to apply filters to my search results:
  - Dietary tags (vegan, vegetarian, gluten-free, keto, etc.)
  - Cuisine type (Italian, Mexican, Thai, Indian, etc.)
  - Meal type (breakfast, lunch, dinner, snack, dessert)
  - Cooking time (under 15 min, under 30 min, under 1 hour)
  - Difficulty (easy, medium, hard)
- **As a user**, I want to see search suggestions/autocomplete as I type.
- **As a user**, I want to see my recent searches for quick re-access.
- **As a user**, I want to clear my search history.

### For You Feed (Personalized Recommendations)

- **As a user**, I want to see a "For You" feed of posts that match my interests, dietary preferences, and interaction patterns.
- **As a user**, I want the recommendations to improve over time as I interact with more content.
- **As a new user**, I want reasonable recommendations even before I have much interaction history (cold start using onboarding preferences).

### Explore / Discover

- **As a user**, I want to browse an Explore page with curated sections:
  - **Trending Now**: Posts with high recent engagement.
  - **Popular This Week**: Top-performing posts of the week.
  - **Based on Your Preferences**: Posts matching dietary profile and favorite cuisines.
  - **New from Creators You Follow**: Fresh content from followed accounts.
  - **Categories**: Browse by cuisine, meal type, or dietary tag.
- **As a user**, I want to tap into a category and see all matching posts with sort options (most popular, newest, most saved).

### Trending & Hashtags

- **As a user**, I want to see trending hashtags related to food.
- **As a user**, I want to tap a hashtag and see all posts with that tag.

## Recommendation Algorithm

### Scoring Model

The "For You" feed scores each post for each user based on multiple signals:

```
score = w1 * dietary_match
      + w2 * cuisine_match
      + w3 * interaction_similarity
      + w4 * recency
      + w5 * engagement_score
      + w6 * creator_follow_score
      + w7 * pantry_match

Where:
- dietary_match:       Does this post respect the user's dietary restrictions?
                       (binary filter — allergic items are excluded entirely)
- cuisine_match:       Does the post's cuisine match user's favorite cuisines?
- interaction_similarity: Cosine similarity with posts the user has liked/saved
                          (based on tags and categories)
- recency:             Time decay — newer posts score higher
- engagement_score:    Normalized likes + comments + saves
- creator_follow_score: Bonus if user follows the creator
- pantry_match:        How many of the recipe's ingredients are in the user's pantry
```

### Implementation Approach

Phase 1 (MVP): PostgreSQL-based scoring with Supabase RPC functions:

```sql
CREATE OR REPLACE FUNCTION get_for_you_feed(
  p_user_id uuid,
  p_limit int DEFAULT 20,
  p_offset int DEFAULT 0
)
RETURNS TABLE(post_id uuid, score float) AS $$
  -- Query that joins posts with user preferences,
  -- calculates weighted score, filters out allergens,
  -- and returns ranked results
$$ LANGUAGE sql;
```

Phase 2 (Future): Move to a dedicated recommendation service if scale demands it.

### Cold Start Strategy

For new users with minimal interaction history:

1. Use onboarding dietary preferences and favorite cuisines as primary signals.
2. Show globally trending content filtered by dietary restrictions.
3. After 10+ interactions, blend in interaction-based signals.
4. After 50+ interactions, full personalization kicks in.

## Data Model (Supabase/PostgreSQL)

### Tables & Indexes

```
-- Full-text search index on posts
ALTER TABLE posts ADD COLUMN search_vector tsvector
  GENERATED ALWAYS AS (
    to_tsvector('english', coalesce(caption, '') || ' ' || coalesce(recipe_data::text, ''))
  ) STORED;

CREATE INDEX idx_posts_search ON posts USING GIN(search_vector);

-- Interaction tracking for recommendations
user_interactions
  - id (uuid, PK)
  - user_id (uuid, FK -> profiles)
  - post_id (uuid, FK -> posts)
  - interaction_type (enum: view, like, save, comment, share)
  - created_at (timestamptz)
  - INDEX on (user_id, interaction_type)

-- Search history
search_history
  - id (uuid, PK)
  - user_id (uuid, FK -> profiles)
  - query (text)
  - filters (jsonb)
  - created_at (timestamptz)

-- Trending hashtags (materialized view, refreshed periodically)
CREATE MATERIALIZED VIEW trending_tags AS
  SELECT unnest(tags) as tag, count(*) as usage_count
  FROM posts
  WHERE created_at > now() - interval '7 days'
    AND is_draft = false
  GROUP BY tag
  ORDER BY usage_count DESC
  LIMIT 50;
```

## iOS Implementation Notes

### Search UI

- **Search Bar**: SwiftUI `TextField` with debounced input (300ms) triggering search.
- **Autocomplete**: Query `search_history` + popular tags as user types.
- **Results View**: Segmented into "Posts" and "Users" tabs.
- **Filters**: Bottom sheet or expandable filter bar with multi-select chips for dietary, cuisine, meal type, time, difficulty.
- **Recent Searches**: Stored locally (UserDefaults or SwiftData) with clear option.

### Explore UI

- **Explore Page**: SwiftUI `ScrollView` with horizontal carousels for each section (Trending, Popular, By Preference, etc.).
- **Category Grid**: Grid of cuisine/meal type icons that navigate to filtered post lists.
- **Hashtag Cloud**: Tappable trending hashtags at the top.

### For You Feed

- Integrated as a tab in the main feed (tab bar or segmented control toggling "For You" / "Following").
- Fetches from the `get_for_you_feed` RPC function.
- Infinite scroll pagination with cursor-based loading.
- Track view events for interaction logging (used to improve future recommendations).

### Key Components

```
SearchView              -- search bar, recent searches, results
SearchResultsView       -- posts and users results with filters
FilterSheet             -- filter selection bottom sheet
ExploreView             -- curated sections and categories
CategoryFeedView        -- filtered post list for a category
TrendingTagsView        -- trending hashtag display
ForYouFeedViewModel     -- manages personalized feed data
InteractionTracker      -- logs user interactions for recommendation
```

## Acceptance Criteria

- [ ] User can search posts by keywords with full-text search
- [ ] User can search users by username or display name
- [ ] Search supports filters: dietary, cuisine, meal type, cook time, difficulty
- [ ] Autocomplete suggestions appear as user types
- [ ] Recent searches are saved and displayed
- [ ] User can clear search history
- [ ] Explore page shows Trending, Popular, By Preference, and Category sections
- [ ] User can browse posts by category (cuisine, meal type, dietary tag)
- [ ] Trending hashtags are displayed and tappable
- [ ] "For You" feed shows personalized content based on preferences and interactions
- [ ] New users see reasonable recommendations based on onboarding choices (cold start)
- [ ] Recommendations improve as user interacts with more content
- [ ] Posts containing user's allergens are filtered out of all feeds
- [ ] User interactions (view, like, save) are tracked for recommendation improvement
- [ ] Search and feed loading is performant with pagination

## Dependencies

- Epic 1 (Content System) — requires posts to exist and be queryable
- Epic 2 (User Management) — requires dietary profiles and preferences
- Epic 3 (Pantry) — for pantry-based recipe matching (optional enhancement)
- PostgreSQL full-text search indexes configured in Supabase
