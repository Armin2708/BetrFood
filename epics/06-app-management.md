# Epic 6: App Management & Settings

## Overview

Build the app management layer including settings, notifications, appearance preferences, privacy controls, help/support, and general app configuration. This epic covers everything a user needs to customize and control their BetrFood experience outside of the core content and social features.

## Architecture

- **Client**: iOS app (Swift, Xcode)
- **Backend**: Supabase (PostgreSQL) for user-specific settings
- **Local Storage**: UserDefaults / SwiftData for device-specific preferences
- **Notifications**: Apple Push Notification Service (APNs) + Supabase Edge Functions for triggers

## User Stories

### Settings Screen

- **As a user**, I want to access a Settings screen from my profile or a tab so that I can manage my app preferences.
- **As a user**, I want the Settings screen organized into clear sections: Account, Preferences, Notifications, Privacy, Appearance, Help & Support, About.

### Account Management

- **As a user**, I want to change my email address.
- **As a user**, I want to change my password.
- **As a user**, I want to manage linked accounts (Apple, Google).
- **As a user**, I want to deactivate or delete my account with a confirmation flow.
- **As a user**, I want to export my data (posts, recipes, profile info) as a downloadable file (GDPR compliance).

### Notification Settings

- **As a user**, I want to enable/disable push notifications globally.
- **As a user**, I want granular control over notification types:
  - New follower notifications
  - Like notifications
  - Comment notifications
  - Comment reply notifications
  - Pantry expiration reminders
  - AI chat suggestions
  - Weekly digest / trending content
- **As a user**, I want to set quiet hours for push notifications.

### Privacy Settings

- **As a user**, I want to set my profile to public or private.
- **As a user**, I want to control who can see my dietary preferences (everyone, followers only, nobody).
- **As a user**, I want to control who can see my pantry (nobody / only me, by default).
- **As a user**, I want to manage blocked users (view list, unblock).
- **As a user**, I want to manage muted users (view list, unmute).
- **As a user**, I want to control whether my profile appears in search results.

### Appearance Settings

- **As a user**, I want to switch between Light Mode, Dark Mode, and System Default.
- **As a user**, I want to adjust text size for accessibility.
- **As a user**, I want to choose feed layout preference (grid view vs. list view on profile).

### Dietary & Preference Management

- **As a user**, I want to update my dietary preferences from Settings (same UI as onboarding but accessible anytime).
- **As a user**, I want to update my allergies and intolerances.
- **As a user**, I want to update my favorite cuisines.
- **As a user**, I want to reset my content recommendations (clear interaction history for a fresh start).

### Content & Data Management

- **As a user**, I want to clear my search history.
- **As a user**, I want to clear my AI chat history.
- **As a user**, I want to manage my cached data (clear image/video cache to free storage).
- **As a user**, I want to see how much storage the app is using on my device.

### Help & Support

- **As a user**, I want to access a Help/FAQ section within the app.
- **As a user**, I want to contact support (email or in-app form).
- **As a user**, I want to report a bug with the ability to include a screenshot.
- **As a user**, I want to see the app version and build number.

### About & Legal

- **As a user**, I want to read the Terms of Service.
- **As a user**, I want to read the Privacy Policy.
- **As a user**, I want to view open source licenses used in the app.

## Data Model (Supabase/PostgreSQL)

### Tables

```
user_settings
  - user_id (uuid, PK, FK -> profiles)
  - notifications_enabled (boolean, default true)
  - notification_preferences (jsonb)
    -- {
    --   new_follower: true,
    --   likes: true,
    --   comments: true,
    --   comment_replies: true,
    --   pantry_expiration: true,
    --   ai_suggestions: false,
    --   weekly_digest: true
    -- }
  - quiet_hours_start (time, nullable) -- e.g., "22:00"
  - quiet_hours_end (time, nullable)   -- e.g., "07:00"
  - profile_searchable (boolean, default true)
  - appearance_mode (enum: light, dark, system)
  - text_size (enum: small, medium, large, xlarge)
  - feed_layout (enum: grid, list)
  - updated_at (timestamptz)

push_tokens
  - id (uuid, PK)
  - user_id (uuid, FK -> profiles)
  - device_token (text)
  - platform (text)  -- "ios"
  - created_at (timestamptz)
  - updated_at (timestamptz)

support_tickets
  - id (uuid, PK)
  - user_id (uuid, FK -> profiles)
  - subject (text)
  - body (text)
  - screenshot_url (text, nullable)
  - status (enum: open, in_progress, resolved, closed)
  - created_at (timestamptz)
```

## iOS Implementation Notes

### Settings Screen Structure

```
SettingsView (SwiftUI List with sections)
├── Account Section
│   ├── Change Email
│   ├── Change Password
│   ├── Linked Accounts
│   ├── Export Data
│   └── Delete Account
├── Dietary Preferences Section
│   ├── Dietary Preferences
│   ├── Allergies
│   └── Favorite Cuisines
├── Notifications Section
│   ├── Push Notifications Toggle
│   ├── Notification Types (granular toggles)
│   └── Quiet Hours
├── Privacy Section
│   ├── Profile Visibility
│   ├── Dietary Info Visibility
│   ├── Pantry Visibility
│   ├── Search Visibility
│   ├── Blocked Users
│   └── Muted Users
├── Appearance Section
│   ├── Theme (Light / Dark / System)
│   ├── Text Size
│   └── Feed Layout
├── Data & Storage Section
│   ├── Clear Search History
│   ├── Clear Chat History
│   ├── Clear Cache
│   └── Storage Usage
├── Help & Support Section
│   ├── FAQ / Help Center
│   ├── Contact Support
│   └── Report a Bug
└── About Section
    ├── App Version
    ├── Terms of Service
    ├── Privacy Policy
    └── Open Source Licenses
```

### Key Implementation Details

- **Theme Management**: Use `@AppStorage` with `ColorScheme` and apply via `.preferredColorScheme()` modifier at the app root.
- **Text Size**: Use SwiftUI `@ScaledMetric` and `DynamicTypeSize` environment values. Store preference in UserDefaults.
- **Push Notifications**: Register for APNs via `UNUserNotificationCenter`, send device token to `push_tokens` table. Supabase Edge Function triggers push via APNs when notification events occur.
- **Cache Management**: Calculate cache size from URLCache and Supabase local storage. Clear with `URLCache.shared.removeAllCachedResponses()`.
- **Data Export**: Supabase Edge Function that compiles user data (profile, posts, recipes, chat history) into a JSON/ZIP file and returns a download URL.
- **Account Deletion**: Multi-step confirmation with password re-entry. Supabase Edge Function cascades deletion across all tables.
- **Settings Sync**: Hybrid approach — device-specific settings (theme, text size, cache) in UserDefaults; account settings (notifications, privacy) synced to Supabase.

### Local vs. Remote Settings

| Setting | Storage | Reason |
|---------|---------|--------|
| Theme mode | UserDefaults | Device-specific |
| Text size | UserDefaults | Device-specific |
| Feed layout | UserDefaults | Device-specific |
| Cache settings | Local only | Device-specific |
| Notification prefs | Supabase | Account-level, cross-device |
| Privacy settings | Supabase | Account-level, affects backend queries |
| Dietary preferences | Supabase | Account-level, used by recommendation engine |

## Acceptance Criteria

- [ ] Settings screen is accessible from the profile tab
- [ ] Settings are organized into clear sections
- [ ] User can change email with verification
- [ ] User can change password with current password confirmation
- [ ] User can view and manage linked social accounts
- [ ] User can export their data as a downloadable file
- [ ] User can delete their account with confirmation flow
- [ ] Push notification toggle works and syncs with APNs registration
- [ ] Granular notification type toggles are functional
- [ ] Quiet hours setting prevents notifications during specified window
- [ ] Profile visibility toggle (public/private) works
- [ ] Dietary info visibility control works
- [ ] Blocked and muted user lists are viewable with unblock/unmute actions
- [ ] Theme switching (light/dark/system) applies immediately
- [ ] Text size adjustment works across the app
- [ ] Search history can be cleared
- [ ] Chat history can be cleared
- [ ] Cache can be cleared with storage size displayed
- [ ] Help/FAQ content is accessible
- [ ] Support contact form works with optional screenshot attachment
- [ ] Bug report form works
- [ ] App version is displayed
- [ ] Terms of Service and Privacy Policy are viewable
- [ ] Settings persist across app launches

## Dependencies

- Epic 2 (User Management) — requires authenticated user with profile
- Apple Developer account for APNs configuration
- Supabase Edge Functions for push notification delivery and data export
