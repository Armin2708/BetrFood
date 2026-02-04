# BetrFood HTML Prototypes

This directory contains HTML prototype screens for the BetrFood mobile app, organized according to the [UI Pages documentation](../wiki/UI-Pages.md).

## Folder Structure

```
html/
├── demos/                          # Multi-screen comprehensive demos
│   ├── betrfood-screens.html       # Complete app screen collection
│   ├── betrfood-ai-chatbot-screens.html  # AI chatbot screens demo
│   ├── betrfood-ai-chatbot-screens-new.html  # Updated AI chatbot demo
│   └── upload-camera-pantry-screens.html  # Upload, camera, and pantry flow
│
└── pages/                          # Individual screen prototypes (organized by feature)
    ├── ai/                         # AI Chatbot screens (Wiki: §41-43)
    │   ├── chat-active.html        # Active chat conversation
    │   ├── chat-empty.html         # Empty chat state
    │   ├── chat-history.html       # Chat history list
    │   ├── payment.html            # AI subscription payment
    │   ├── scanner.html            # Food/barcode scanner
    │   └── upgrade.html            # Premium upgrade screen
    │
    ├── auth/                       # Authentication & Onboarding (Wiki: §1-7)
    │   ├── welcome.html            # Welcome/splash screen
    │   └── signup.html             # Sign up form
    │
    ├── communities/                # Communities (Wiki: §34-40)
    │   └── [To be added]
    │
    ├── content/                    # Content Creation (Wiki: §14-18)
    │   ├── camera.html             # Camera interface for posts
    │   └── upload.html             # Upload/editor screen
    │
    ├── feed/                       # Home & Feed (Wiki: §9-13)
    │   ├── index.html              # Main feed/home screen
    │   ├── comments.html           # Comments screen
    │   ├── liked-by.html           # Users who liked a post
    │   └── share.html              # Share sheet
    │
    ├── meal-planning/              # Meal Planning & Pantry (Wiki: §44-53)
    │   ├── pantry-simple.html      # Simple pantry view
    │   ├── pantry-full.html        # Full pantry interface
    │   ├── pantry-keyboard.html    # Pantry with keyboard
    │   └── recipe.html             # Recipe detail view
    │
    ├── profile/                    # User Profiles (Wiki: §24-33)
    │   ├── user-profile.html       # User profile screen
    │   ├── profile.html            # Profile overview
    │   ├── followers.html          # Followers list
    │   ├── following.html          # Following list
    │   ├── health-info.html        # Dietary/health information
    │   └── settings.html           # Profile settings
    │
    ├── search/                     # Search & Explore (Wiki: §19-23)
    │   └── search.html             # Search screen
    │
    └── settings/                   # Settings & Account (Wiki: §55-65)
        └── [To be added]
```

## Organization by Wiki Categories

The folder structure directly maps to the [UI-Pages Wiki](../wiki/UI-Pages.md) documentation:

| Wiki Section | Folder | Screen Count |
|-------------|--------|--------------|
| **Authentication & Onboarding** (§1-7) | `pages/auth/` | 2/7 screens |
| **Home & Feed** (§9-13) | `pages/feed/` | 4/5 screens |
| **Content Creation** (§14-18) | `pages/content/` | 2/5 screens |
| **Search & Explore** (§19-23) | `pages/search/` | 1/5 screens |
| **User Profiles** (§24-33) | `pages/profile/` | 6/10 screens |
| **Communities** (§34-40) | `pages/communities/` | 0/7 screens |
| **AI Chatbot** (§41-43) | `pages/ai/` | 6/3 screens + extras |
| **Meal Planning** (§44-53) | `pages/meal-planning/` | 4/10 screens |
| **Settings & Account** (§55-65) | `pages/settings/` | 0/11 screens |

## Development Priority

Based on the wiki's phase breakdown:

### Phase 1 - MVP (Essential)
- Feed screens: `pages/feed/index.html`, `pages/feed/comments.html`
- Profile screens: `pages/profile/user-profile.html`
- AI Chatbot: `pages/ai/chat-*.html`
- Meal Planning: `pages/meal-planning/pantry-*.html`, `pages/meal-planning/recipe.html`

### Phase 2 - Core Features
- Auth: `pages/auth/welcome.html`, `pages/auth/signup.html`
- Content Creation: `pages/content/camera.html`, `pages/content/upload.html`
- Search: `pages/search/search.html`
- Profile Management: `pages/profile/followers.html`, `pages/profile/following.html`

### Phase 3 - Enhanced Features
- Communities (to be implemented)
- Advanced Settings (to be implemented)
- Additional social features

## Usage

### Viewing Individual Screens
Open any HTML file in a web browser to view the prototype:
```bash
open html/pages/feed/index.html
```

### Viewing Multi-Screen Demos
The `demos/` folder contains comprehensive HTML files with multiple screens:
```bash
open html/demos/betrfood-screens.html
```

## Adding New Screens

When creating new HTML prototypes:

1. Determine the screen's category based on the [UI-Pages Wiki](../wiki/UI-Pages.md)
2. Place the file in the appropriate `pages/` subdirectory
3. Name the file descriptively (e.g., `create-post.html`, `meal-plan-detail.html`)
4. Update this README if adding a new category

## Related Documentation

- [UI Pages Wiki](../wiki/UI-Pages.md) - Complete list of all 77 app screens
- [Features Wiki](../wiki/Features.md) - Feature specifications
- [Design Screens Wiki](../wiki/Design-Screens.md) - Design mockup references
- [Main README](../README.md) - Project overview

## Screen Naming Convention

- Use lowercase with hyphens: `user-profile.html`
- Be descriptive: `chat-active.html` not `chat1.html`
- Match wiki terminology when possible
- Group related variations: `pantry-simple.html`, `pantry-full.html`
