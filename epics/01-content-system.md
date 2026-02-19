# Epic 1: Content System (Instagram-Style Feed & Interactions)

## Overview

Build an Instagram-style content system where users can create, browse, and interact with food posts. This is the core social experience of BetrFood — a visual feed of food photos/videos with structured recipe data, supporting both consumer and creator workflows.

## Architecture

- **Client**: iOS app (Swift, Xcode)
- **Backend**: Supabase (PostgreSQL + Auth + Storage + Realtime)
- **Storage**: Supabase Storage for images/videos
- **Realtime**: Supabase Realtime for live feed updates

## User Stories

### Post Creation (Creator)

- **As a creator**, I want to upload a food photo with a caption so that I can share my culinary creations with the community.
- **As a creator**, I want to attach structured recipe data (ingredients, steps, cook time, servings, difficulty) to my post so that followers can actually cook the dish.
- **As a creator**, I want to upload multiple images in a single post (carousel) so that I can show the cooking process or different angles.
- **As a creator**, I want to upload short-form video content so that I can share cooking tutorials and food reels.
- **As a creator**, I want to tag my post with categories (cuisine type, meal type, dietary tags) so that it is discoverable.
- **As a creator**, I want to save a post as a draft before publishing so that I can refine it later.
- **As a creator**, I want to edit my post caption, tags, and recipe data after publishing so that I can correct mistakes.
- **As a creator**, I want to delete my own posts.

### Feed & Browsing (Consumer)

- **As a user**, I want to scroll through a personalized home feed of food posts so that I can discover content relevant to my interests.
- **As a user**, I want to switch between a "For You" algorithmic feed and a "Following" chronological feed.
- **As a user**, I want to view a full post detail screen with the complete recipe, ingredients, and cooking steps.
- **As a user**, I want the feed to load fast with optimized image/video delivery and pagination (infinite scroll).
- **As a user**, I want to pull-to-refresh the feed to see the latest posts.

### Post Interactions (Consumer)

- **As a user**, I want to like/unlike a post so that I can express appreciation.
- **As a user**, I want to comment on a post so that I can ask questions or share thoughts.
- **As a user**, I want to reply to comments (threaded comments) so that conversations stay organized.
- **As a user**, I want to save/bookmark a post to a collection so that I can find it later.
- **As a user**, I want to share a post externally (copy link, share to other apps).
- **As a user**, I want to report inappropriate content.

### Collections

- **As a user**, I want to create named collections (e.g., "Weeknight Dinners", "Desserts") to organize saved posts.
- **As a user**, I want to add/remove posts from collections.
- **As a user**, I want to browse my collections from my profile.

## Data Model (Supabase/PostgreSQL)

### Tables

```
posts
  - id (uuid, PK)
  - user_id (uuid, FK -> users)
  - caption (text)
  - post_type (enum: photo, video, recipe)
  - media_urls (jsonb)  -- array of storage paths
  - recipe_data (jsonb) -- ingredients, steps, cook_time, servings, difficulty
  - tags (text[])       -- cuisine, meal type, dietary tags
  - is_draft (boolean)
  - created_at (timestamptz)
  - updated_at (timestamptz)

post_likes
  - id (uuid, PK)
  - post_id (uuid, FK -> posts)
  - user_id (uuid, FK -> users)
  - created_at (timestamptz)
  - UNIQUE(post_id, user_id)

comments
  - id (uuid, PK)
  - post_id (uuid, FK -> posts)
  - user_id (uuid, FK -> users)
  - parent_comment_id (uuid, FK -> comments, nullable) -- for threads
  - body (text)
  - created_at (timestamptz)

collections
  - id (uuid, PK)
  - user_id (uuid, FK -> users)
  - name (text)
  - created_at (timestamptz)

collection_posts
  - collection_id (uuid, FK -> collections)
  - post_id (uuid, FK -> posts)
  - added_at (timestamptz)
  - PK(collection_id, post_id)

post_reports
  - id (uuid, PK)
  - post_id (uuid, FK -> posts)
  - reporter_id (uuid, FK -> users)
  - reason (text)
  - created_at (timestamptz)
```

## iOS Implementation Notes

- Use `UICollectionView` with compositional layout or SwiftUI `LazyVGrid` for the feed.
- Image loading via `URLSession` with in-memory + disk caching (or a lightweight library like Kingfisher if desired).
- Video playback with `AVPlayer` — auto-play on scroll, mute by default.
- Supabase Swift SDK (`supabase-swift`) for all DB operations and storage uploads.
- Pagination via cursor-based queries (`created_at < last_post_timestamp`).
- Optimistic UI updates for likes (update UI immediately, sync in background).
- Use Supabase Storage with image transformations for thumbnails.

## Acceptance Criteria

- [ ] User can create a photo post with caption and optional recipe data
- [ ] User can create a multi-image carousel post
- [ ] User can upload and post short-form video
- [ ] User can tag posts with cuisine, meal type, and dietary tags
- [ ] User can save drafts and publish later
- [ ] User can edit and delete their own posts
- [ ] Feed displays posts with infinite scroll pagination
- [ ] User can switch between "For You" and "Following" feeds
- [ ] User can like/unlike posts with optimistic UI
- [ ] User can comment and reply to comments (threaded)
- [ ] User can save posts to named collections
- [ ] User can share posts externally
- [ ] User can report posts
- [ ] Images load efficiently with caching and thumbnails
- [ ] Video auto-plays on scroll with mute by default

## Dependencies

- Epic 2 (User Management) — requires authenticated users
- Supabase project setup with Storage and Realtime enabled
