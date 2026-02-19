# Epic 2: User Management System (Roles & Registration)

## Overview

Build a complete user management system with authentication, registration flows, user profiles, roles, and social connections (follow/unfollow). This is the foundation for all other features — every interaction in BetrFood requires an authenticated, profiled user.

## Architecture

- **Client**: iOS app (Swift, Xcode)
- **Auth**: Supabase Auth (email/password, Apple Sign-In, Google Sign-In)
- **Backend**: Supabase (PostgreSQL + Auth + Row Level Security)
- **Profile Storage**: Supabase Storage for avatars

## User Stories

### Registration & Authentication

- **As a new user**, I want to sign up with my email and password so that I can create an account.
- **As a new user**, I want to sign up with Apple Sign-In so that I can register quickly and securely.
- **As a new user**, I want to sign up with Google Sign-In so that I have an alternative social login option.
- **As a new user**, I want to complete an onboarding flow after registration where I set my display name, username, avatar, and dietary preferences.
- **As a user**, I want to log in with my credentials (email/password or social login).
- **As a user**, I want to log out of my account.
- **As a user**, I want to reset my password via email if I forget it.
- **As a user**, I want my session to persist so that I don't have to log in every time I open the app.

### User Profiles

- **As a user**, I want to set and update my profile picture, display name, username, and bio.
- **As a user**, I want to view my profile page showing my posts, stats (post count, followers, following), and collections.
- **As a user**, I want to view other users' profiles with their posts and public info.
- **As a user**, I want to set my dietary preferences (vegetarian, vegan, keto, gluten-free, etc.) during onboarding and update them later.
- **As a user**, I want to set my food allergies and intolerances with severity levels.
- **As a user**, I want to set my favorite cuisines and cooking preferences.

### Roles & Permissions

- **As the system**, I need to support the following roles:
  - **User** (default): Can browse, post, comment, like, save.
  - **Creator** (verified): Enhanced analytics, structured recipe posting, future monetization access.
  - **Moderator**: Can review reported content, hide/remove posts, issue warnings.
  - **Admin**: Full platform management, user management, role assignment.
- **As an admin**, I want to assign and revoke roles for users.
- **As a creator**, I want a verification badge on my profile.

### Social Connections

- **As a user**, I want to follow/unfollow other users.
- **As a user**, I want to see my followers and following lists.
- **As a user**, I want to see follower/following counts on profiles.
- **As a user**, I want to block and mute other users.
- **As a user**, I want to receive notifications when someone follows me.

### Privacy & Security

- **As a user**, I want to set my profile visibility (public or private).
- **As a user**, I want to control who can see my dietary information.
- **As a user**, I want to delete my account and all associated data.

## Data Model (Supabase/PostgreSQL)

### Tables

```
profiles
  - id (uuid, PK, FK -> auth.users)
  - username (text, UNIQUE)
  - display_name (text)
  - bio (text)
  - avatar_url (text)
  - role (enum: user, creator, moderator, admin)
  - is_verified (boolean, default false)
  - is_private (boolean, default false)
  - dietary_preferences (jsonb) -- {vegetarian: true, keto: false, ...}
  - allergies (jsonb)           -- [{name: "peanuts", severity: "severe"}, ...]
  - favorite_cuisines (text[])
  - cooking_preferences (jsonb)
  - dietary_visibility (enum: public, followers_only, private)
  - created_at (timestamptz)
  - updated_at (timestamptz)

follows
  - follower_id (uuid, FK -> profiles)
  - following_id (uuid, FK -> profiles)
  - created_at (timestamptz)
  - PK(follower_id, following_id)

blocks
  - blocker_id (uuid, FK -> profiles)
  - blocked_id (uuid, FK -> profiles)
  - created_at (timestamptz)
  - PK(blocker_id, blocked_id)

mutes
  - muter_id (uuid, FK -> profiles)
  - muted_id (uuid, FK -> profiles)
  - created_at (timestamptz)
  - PK(muter_id, muted_id)
```

### Row Level Security (RLS) Policies

```sql
-- Profiles: anyone can read public profiles, only owner can update
-- Follows: authenticated users can follow/unfollow
-- Blocks: only the blocker can manage their blocks
-- Posts: blocked users' content is hidden from the blocker's feed
-- Admin/Moderator: bypass RLS for moderation actions
```

## iOS Implementation Notes

- Use Supabase Swift SDK (`supabase-swift`) for Auth flows.
- Apple Sign-In via `AuthenticationServices` framework.
- Google Sign-In via Google Sign-In SDK for iOS.
- Store session tokens securely in iOS Keychain.
- Onboarding flow as a multi-step SwiftUI view sequence (name -> avatar -> dietary prefs -> cuisines).
- Profile view with `TabView` or segmented control for posts/collections/about tabs.
- Follow/unfollow with optimistic UI (instant count update, background sync).
- Use Supabase Realtime to subscribe to follower count changes.

## Registration Flow

```
1. Welcome Screen
   ├── Sign Up with Email
   │   ├── Enter email + password
   │   ├── Email verification
   │   └── → Onboarding
   ├── Sign Up with Apple
   │   └── → Onboarding
   └── Sign Up with Google
       └── → Onboarding

2. Onboarding (post-registration)
   ├── Step 1: Set display name + username
   ├── Step 2: Upload avatar (optional, skip)
   ├── Step 3: Select dietary preferences
   ├── Step 4: Set allergies (optional, skip)
   ├── Step 5: Pick favorite cuisines
   └── → Home Feed
```

## Acceptance Criteria

- [ ] User can register with email/password
- [ ] User can register with Apple Sign-In
- [ ] User can register with Google Sign-In
- [ ] Email verification flow works correctly
- [ ] Password reset via email works
- [ ] Onboarding flow captures display name, username, avatar, dietary prefs, allergies, cuisines
- [ ] User can skip optional onboarding steps
- [ ] Session persists across app launches (Keychain storage)
- [ ] User can view and edit their own profile
- [ ] User can view other users' profiles
- [ ] User can follow/unfollow other users
- [ ] Follower/following counts update correctly
- [ ] User can block and mute other users
- [ ] Blocked users' content is hidden
- [ ] Roles (user, creator, moderator, admin) are enforced via RLS
- [ ] Verified badge displays for creators
- [ ] User can set profile to private
- [ ] User can delete their account
- [ ] RLS policies enforce proper data access

## Dependencies

- Supabase project with Auth, Database, and Storage configured
- Apple Developer account for Sign-In with Apple
- Google Cloud project for Google Sign-In
