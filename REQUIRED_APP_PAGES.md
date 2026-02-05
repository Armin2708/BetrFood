# BetrFood - Required App Pages (Complete)

**Document Purpose**: Comprehensive list of all required UI pages based on product requirements, competitive analysis, and user flows.

**Total Pages**: 95 (up from 77 - added 18 critical pages)

**Status**: ✅ Aligned with Product Overview and Features

---

## Gap Analysis Summary

### Missing Pages Added (18 New Pages)
Based on product overview requirements, the following critical pages were missing:

1. **Forgot Password Flow** (3 pages) - Essential for user authentication
2. **Email Verification** (1 page) - Security requirement
3. **Premium/Subscription** (4 pages) - Monetization strategy
4. **Creator Earnings Dashboard** (1 page) - Creator economy
5. **Ingredient Substitution** (1 page) - AI-powered feature
6. **Meal Plan Sharing** (1 page) - Social/viral feature
7. **Recipe Import** (1 page) - User convenience
8. **Verification Badge Request Detail** (1 page) - Trust & credibility
9. **Content Reporting Detail** (1 page) - Community safety
10. **Onboarding Skip Confirmation** (1 page) - UX best practice
11. **Account Deletion Confirmation** (1 page) - Legal requirement
12. **Post Scheduling** (1 page) - Creator tool
13. **Community Member Management** (1 page) - Moderation

---

## Authentication & Onboarding (11 pages)

### 1. Splash Screen ✅
- App logo and branding
- Loading animation
- Version number display

### 2. Welcome Screen ✅
- App introduction
- Sign Up button
- Log In button
- Continue as Guest option

### 3. Sign Up Screen ✅
- Email/phone input
- Password creation with strength indicator
- Social sign-up options (Google, Apple, Facebook)
- Terms and privacy links
- CAPTCHA if needed

### 4. Log In Screen ✅
- Email/phone input
- Password input
- Show/hide password toggle
- Forgot password link
- Social login options
- Remember me checkbox

### 5. **Forgot Password Screen** 🆕
- Email/phone input
- Send reset link button
- Back to login link
- Confirmation message after sending

### 6. **Reset Password Screen** 🆕
- New password input
- Confirm password input
- Password strength indicator
- Submit button
- Success confirmation

### 7. **Email Verification Screen** 🆕
- Verification code input (6-digit)
- Resend code button
- Change email option
- Auto-verify on code entry
- Countdown timer for resend

### 8. Onboarding Flow (Slides) ✅
- **Slide 1**: Welcome to BetrFood
- **Slide 2**: Discover recipes and share your creations
- **Slide 3**: Connect with food lovers
- **Slide 4**: AI-powered meal planning
- Skip button on each
- Progress indicators
- Next/Get Started buttons

### 9. **Onboarding Skip Confirmation** 🆕
- "Are you sure?" message
- Benefits of completing setup
- Skip anyway button
- Continue setup button

### 10. Dietary Profile Setup ✅
- Select dietary preferences (vegan, vegetarian, keto, etc.)
- Input allergies and intolerances
- Set dietary restrictions
- Nutritional goals
- Skip option with explanation
- Multi-step progress indicator

### 11. Interest Selection ✅
- Choose favorite cuisines (multi-select with images)
- Select cooking skill level
- Pick content preferences
- Follow suggested accounts (with preview cards)
- Number of selections indicator
- Continue button

---

## Main Navigation (1 page)

### 12. Bottom Navigation Bar ✅
Present on most screens with 5 tabs:
- **Home** (Feed icon)
- **Search/Explore** (Magnifying glass)
- **Create Post** (+) - Center, elevated
- **Communities** (People icon)
- **Profile** (User avatar)
- Active state indicators
- Badge notifications

---

## Home & Feed (6 pages)

### 13. Home Feed Screen ✅
- Scrollable vertical feed of posts
- Post cards with:
  - User profile picture and name (tappable)
  - Post image/video
  - Like, comment, share, save buttons with counts
  - Caption with "Read more" truncation
  - Hashtags (tappable)
  - View comments link with count
  - Timestamp/date
  - Three-dot menu (report, hide, etc.)
- Feed filter toggle (Following/For You) at top
- Stories bar at top (horizontal scrollable)
- Pull to refresh
- Infinite scroll
- Quick action: Create Meal Plan button on recipe posts

### 14. Post Detail Screen ✅
- Full post view
- High-resolution image/video
- All post information
- Complete caption (expanded)
- Recipe card (if recipe post):
  - Servings, prep time, cook time
  - Difficulty level
  - Calorie count
  - View full recipe button
- Like, comment, share, save buttons
- Full comments section preview
- Related posts carousel at bottom
- "Create Meal Plan" button (prominent)
- "Ask AI About This" button
- Share button with count

### 15. Recipe Full View Screen ✅
- Recipe title
- Photo/video
- Author info
- Servings adjuster
- Ingredients list with checkboxes
- Step-by-step instructions (numbered)
- Prep time, cook time, total time
- Difficulty level
- Nutritional information table
- Print recipe button
- Share recipe button
- Add to meal plan button
- Save to collection button
- Dietary tags/badges
- Allergy warnings (if applicable)

### 16. Comments Screen ✅
- Full comment thread
- Comment input field with user avatar
- Character counter
- Post comment button
- Like comments (heart icon with count)
- Reply to comments (nested threading)
- Sort options (Top, Newest, Oldest)
- Report/block options (three-dot menu)
- Delete own comments
- Edit own comments
- Pin comment (for post author)
- Tag users in comments
- Collapse/expand threads

### 17. Likes List Screen ✅
- List of users who liked a post
- User avatars and names
- Follow/Following buttons per user
- Tap to view profiles
- Search within likes
- Mutual followers indicator
- Verified badges shown

### 18. Video Player Screen ✅
- Full-screen vertical video playback
- Swipe up/down for next/previous video
- Like, comment, share overlays
- Audio control (mute/unmute)
- Creator info overlay (avatar, name, follow button)
- Caption overlay (expandable)
- Progress indicator
- Pause on tap
- Auto-play next
- Recipe quick view button (for recipe videos)

---

## Content Creation (8 pages)

### 19. Create Post Screen ✅
- Camera interface with filters preview
- Gallery selection button
- Multiple photo/video selection (up to 10)
- Record video button (with timer)
- Flash control
- Flip camera (front/back)
- Grid overlay toggle
- Photo/video preview thumbnails at bottom
- Next button

### 20. Post Editor Screen ✅
- Image/video preview (swipeable for multiple)
- Apply filters (scrollable filter options)
- Crop and rotate tools
- Adjust brightness, contrast, saturation
- Add text overlays (with font and color options)
- Add stickers/emojis
- Drawing tools (brush, eraser)
- Undo/redo buttons
- Save draft button
- Next button

### 21. Post Caption Screen ✅
- Caption text input (with character counter)
- Hashtag suggestions (as you type)
- Tag people (search and select)
- Add location (with map picker)
- Category selection:
  - Meal type (breakfast, lunch, dinner, snack, dessert)
  - Cuisine type (Italian, Mexican, Asian, etc.)
- Recipe details toggle switch
- Dietary tags (multi-select: vegan, gluten-free, etc.)
- Advanced options button
- Post button (primary CTA)
- Save as draft button

### 22. Recipe Details Entry Screen ✅
- Recipe title input
- Servings number picker
- Prep time input (hours/minutes)
- Cook time input (hours/minutes)
- Difficulty level selector (Easy, Medium, Hard)
- Ingredients section:
  - Add ingredient button
  - Ingredient fields (quantity, unit, name)
  - Reorder ingredients (drag handles)
  - Remove ingredient
- Instructions section:
  - Add step button
  - Step text inputs (numbered automatically)
  - Reorder steps (drag handles)
  - Remove step
- Nutritional information (optional):
  - Calories, protein, carbs, fat
  - Calculate automatically option
- Save button
- Preview recipe button

### 23. Draft Posts Screen ✅
- List/grid toggle view
- Draft preview thumbnails
- Draft metadata (date saved, caption preview)
- Edit button per draft
- Delete button per draft
- Select multiple drafts
- Delete selected button
- Empty state (no drafts)
- Search drafts

### 24. **Post Scheduling Screen** 🆕
- Calendar picker
- Time picker
- Time zone selector
- Preview scheduled post
- Schedule button
- Timezone warning if needed
- List of scheduled posts
- Edit/delete scheduled posts
- Schedule limits indicator (for premium/free)

### 25. Tag People Screen ✅
- Search users to tag
- Tap on photo to add tag
- Position tag on image
- Multiple tags supported
- Remove tag option
- Tagged users list
- Done button

### 26. Add Location Screen ✅
- Search locations
- Recent locations
- Nearby locations (map view)
- Select location from map
- Create custom location
- Remove location option
- Done button

---

## Search & Explore (7 pages)

### 27. Search Screen ✅
- Search bar (with voice search icon)
- Search categories tabs:
  - All
  - Posts
  - Accounts
  - Recipes
  - Communities
- Recent searches (with clear all button)
- Trending hashtags (scrollable chips)
- Trending searches list
- Suggested accounts carousel
- Popular categories grid (with images)
- Clear recent searches

### 28. Search Results Screen ✅
- Search query displayed at top
- Tabbed results:
  - Top (mixed results)
  - Posts (grid view)
  - Accounts (list with follow buttons)
  - Recipes (card view with key info)
  - Communities (list with member count)
- Filter button (with active filter indicator)
- Sort dropdown (Relevance, Recent, Popular)
- Result count
- Empty state (no results found)
- Did you mean suggestions

### 29. Search Filters Screen ✅
- Dietary filters checkboxes:
  - Vegan, Vegetarian, Pescatarian
  - Gluten-free, Dairy-free, Nut-free
  - Keto, Paleo, Low-carb
  - Halal, Kosher
- Cuisine type multi-select (with search)
- Meal type multi-select
- Cooking time slider (0-240 minutes)
- Difficulty level selector (Easy, Medium, Hard, All)
- Calorie range slider
- Ingredient filters:
  - Include ingredients (add multiple)
  - Exclude ingredients (add multiple)
- Apply button (with count of active filters)
- Clear all button
- Save filter preset button

### 30. Explore Grid Screen ✅
- Grid layout of popular posts (3 columns)
- Category tabs at top (scrollable):
  - For You
  - Trending
  - New
  - [Cuisine types]
  - [Meal types]
- Post preview (image with engagement metrics overlay)
- Infinite scroll
- Tap to view post detail
- Pull to refresh
- Filter button

### 31. Trending Screen ✅
- Trending recipes carousel (horizontal scroll)
- Viral posts section (grid)
- Rising creators section (horizontal scroll with profile cards)
- Trending hashtags list (with post count)
- Trending communities (with join buttons)
- Time filter (Today, This Week, This Month)
- Refresh button

### 32. Category Browse Screen ✅
- Category title (e.g., "Italian Cuisine")
- Category description
- Filter/sort options
- Grid/list toggle view
- Posts in category (infinite scroll)
- Related categories chips
- Follow category option
- Share category button

### 33. Hashtag Page Screen ✅
- Hashtag name (e.g., #Vegan)
- Post count
- Follow hashtag button
- Recent posts grid
- Top posts section
- Related hashtags
- Share hashtag button

---

## User Profiles (15 pages)

### 34. Profile Screen (Own Profile) ✅
- Profile header:
  - Profile picture (tappable to view full size)
  - Cover photo (optional)
  - Username and display name
  - Verification badge (if verified)
  - Bio (with links)
  - Website link
  - Location
  - Follower/following counts (tappable)
  - Edit Profile button
  - Menu button (three dots - settings, share profile)
- Stats bar:
  - Posts count
  - Followers count
  - Following count
  - Likes received count
- Action buttons row:
  - Create Meal Plan
  - Saved Posts
  - Settings
- Tab navigation:
  - Posts grid (default)
  - Saved posts
  - Tagged posts
  - Meal plans
  - Collections
- Empty states for each tab
- Infinite scroll on grids

### 35. Profile Screen (Other Users) ✅
- Same header as own profile
- Follow/Following button (state-aware)
- Message button
- Three-dot menu:
  - Share profile
  - Copy profile URL
  - Report user
  - Block user
  - Mute user
  - Add to close friends
- Tab navigation:
  - Posts grid
  - Tagged posts
  - Meal plans (if public)
- Following status indicator
- Mutual followers indicator
- Recent activity preview (if following)

### 36. Edit Profile Screen ✅
- Change profile picture (with crop tool)
- Change cover photo (optional)
- Edit display name (with character limit)
- Edit username (availability check)
- Edit bio (with character counter, max 150)
- Add/edit website link
- Add/edit location
- Social media links (Instagram, YouTube, TikTok)
- Professional info:
  - Account type (Personal, Creator, Business)
  - Category (Chef, Home Cook, Food Blogger, etc.)
- Verification badge request button
- Save changes button
- Cancel button
- Unsaved changes warning

### 37. Followers List Screen ✅
- Tab toggle (Followers / Following)
- Scrollable list of followers
- User cards with:
  - Avatar
  - Name and username
  - Bio preview (truncated)
  - Follow back/Following button
  - Verified badge
  - Mutual followers indicator
- Search followers (search bar at top)
- Sort options (All, Verified, Mutual)
- Remove follower option (own profile only - three dots)
- Empty state (no followers yet)
- Pull to refresh

### 38. Following List Screen ✅
- Same layout as Followers List
- Scrollable list of following
- User cards with:
  - Avatar
  - Name and username
  - Following button (to unfollow)
  - Notification settings icon (bell)
- Search following
- Sort options (All, Recent, Active)
- Categories filter (Friends, Creators, etc.)
- Manage following button (bulk unfollow)

### 39. Mutual Followers Screen ✅
- List of mutual followers
- User cards with follow buttons
- Count indicator
- Empty state
- Back to profile button

### 40. Dietary Profile Screen ✅
- Header with edit all button
- Food preferences section:
  - Favorite cuisines (chips)
  - Cooking methods (chips)
  - Flavor preferences (chips)
  - Edit button
- Allergies section:
  - Allergen list with severity badges
  - Add allergy button
  - Edit button
- Dietary restrictions section:
  - Restriction chips (vegan, gluten-free, etc.)
  - Edit button
- Nutritional goals section:
  - Daily calorie target (with progress bar)
  - Macro breakdown (protein, carbs, fat percentages)
  - Health objectives list
  - Edit button
- Privacy toggle (show/hide on profile)
- Save changes button
- Reset to defaults option

### 41. Edit Dietary Preferences Screen ✅
- Favorite cuisines multi-select:
  - Grid of cuisine options with images
  - Search cuisines
  - Select multiple
- Cooking methods preferences:
  - Baking, Grilling, Roasting, etc.
  - Multi-select checkboxes
- Flavor preferences:
  - Spicy, Sweet, Savory, Sour, Bitter, Umami
  - Intensity sliders per flavor
- Meal complexity preference:
  - Simple, Moderate, Complex
  - Slider
- Save button
- Cancel button

### 42. Edit Allergies Screen ✅
- Common allergens checklist:
  - Peanuts, Tree nuts, Dairy, Eggs, Soy, Wheat/Gluten, Fish, Shellfish
  - Checkboxes with icons
- Add custom allergy:
  - Text input
  - Add button
- Severity level per allergy:
  - Mild, Moderate, Severe
  - Radio buttons per allergen
- Warning message about severity importance
- Delete custom allergies
- Save button
- Cancel button

### 43. Edit Dietary Restrictions Screen ✅
- Dietary type selection:
  - Vegan, Vegetarian, Pescatarian, Flexitarian
  - Keto, Paleo, Low-carb, Mediterranean
  - Radio button or multi-select
- Religious restrictions:
  - Halal, Kosher
  - Checkboxes
- Medical diet requirements:
  - Low sodium, Diabetic-friendly, Low FODMAP, etc.
  - Multi-select checkboxes
- Exclude ingredients list:
  - Add ingredients to never include
  - Remove button per ingredient
- Save button
- Cancel button
- Learn more links per restriction

### 44. Edit Nutritional Goals Screen ✅
- Daily calorie target:
  - Number input
  - Slider (1000-4000 cal)
  - Suggested range based on profile
- Macro nutrient targets:
  - Protein slider (percentage or grams)
  - Carbs slider
  - Fat slider
  - Visual pie chart showing distribution
  - Auto-balance option
- Health objectives multi-select:
  - Weight loss, Muscle gain, Maintain weight
  - Heart health, Diabetes management
  - Improve energy, Better digestion
- Activity level selector:
  - Sedentary, Lightly active, Moderately active, Very active
  - Affects calorie suggestions
- Save button
- Reset to recommended button
- Cancel button

### 45. **Verification Badge Request Screen** 🆕
- Verification information
- Eligibility criteria checklist
- Required documents:
  - Government ID upload
  - Proof of authenticity (for chefs/nutritionists)
- Reason for verification (dropdown)
- Additional information text area
- Submit request button
- Request status (if already submitted)
- Learn more link

### 46. Profile Photo Viewer ✅
- Full-screen profile photo
- Pinch to zoom
- Change profile photo button (own profile)
- Close button
- Share button

### 47. Cover Photo Viewer ✅
- Full-screen cover photo
- Pinch to zoom
- Change cover photo button (own profile)
- Close button

### 48. Account Type Selection Screen ✅
- Personal account option
- Creator account option
- Business account option
- Comparison table of features
- Continue button
- Learn more links

---

## Communities (11 pages)

### 49. Communities Home Screen ✅
- Header with search button
- Joined communities section:
  - Horizontal scroll
  - Community cards (with cover image, name, member count)
- Discover communities section:
  - Category filters (Cuisine, Diet, Technique, Location)
  - Community cards in list/grid
  - Join button per community
- Create community button (FAB)
- Trending communities section
- Recommended for you section
- Pull to refresh
- Empty state (no joined communities)

### 50. Community Detail Screen ✅
- Community header:
  - Cover image
  - Community icon
  - Community name
  - Description (expandable)
  - Member count
  - Online members count
  - Join/Joined button (with dropdown: Leave, Notifications)
  - Share button
  - Three-dot menu (Report, Mute, Settings if mod)
- Tab navigation:
  - Posts (with sort: Hot, New, Top, Rising)
  - About
  - Rules
  - Members (if joined)
- Create post FAB (if member)
- Pinned posts section (at top)
- Post preview cards:
  - Author info
  - Post title
  - Preview text
  - Upvote/downvote buttons with count
  - Comment count
  - Award icons
  - Thumbnail (if has image)
- Infinite scroll

### 51. Community Post Detail Screen ✅
- Post header:
  - Community name and icon
  - Author info (with flair)
  - Timestamp
  - Three-dot menu (Save, Report, etc.)
- Original post:
  - Title (large text)
  - Body text (full content)
  - Images (if any, expandable)
  - Video (if any, embedded player)
  - Poll (if any, with vote button)
  - External link preview (if any)
- Post flair badge
- Upvote/downvote buttons with score
- Awards section (if any)
- Share, save, hide buttons
- Comments section:
  - Sort dropdown (Best, Top, New, Controversial, Old)
  - Comment threads
  - Upvote/downvote per comment
  - Reply button per comment
  - Collapse/expand threads
  - Award comment option
  - Report comment option
- Comment input field (at bottom, sticky)
- Load more comments button

### 52. Create Community Post Screen ✅
- Post to community dropdown (select community)
- Flair selection (required in some communities)
- Post type selector:
  - Text
  - Image/Video
  - Link
  - Poll
- Title input (required, character limit)
- Body text input (markdown supported)
- Add images/videos button (up to 10)
- Add link (with preview)
- Poll options (for poll type):
  - Poll question
  - Options (2-6)
  - Duration
  - Multiple choice toggle
- NSFW toggle
- Spoiler toggle
- Community rules reminder (collapsible)
- Post button
- Save draft button
- Preview button

### 53. Create Community Screen ✅
- Community name input:
  - Availability check
  - Character limit
  - Naming rules
- Display name (optional)
- Description text area (required, 100-500 chars)
- Category selection (dropdown)
- Topics/tags (multi-select or text input)
- Cover image upload (with crop tool)
- Community icon upload (with crop tool)
- Community type:
  - Public (anyone can view and join)
  - Restricted (anyone can view, must request to join)
  - Private (invite-only)
  - Radio buttons
- NSFW toggle (with warning)
- Community rules section:
  - Add rule button
  - Rule title and description inputs
  - Reorder rules
  - Delete rule
- Create button
- Cancel button
- Preview community button

### 54. Community Settings Screen (Moderators) ✅
- Edit community info:
  - Name, description, cover, icon
  - Edit button
- Manage rules:
  - Add, edit, delete rules
  - Reorder rules
- Appearance settings:
  - Colors, theme
  - Custom CSS (advanced)
- Post settings:
  - Required flair
  - Allowed post types
  - Approval required toggle
- Moderate posts queue:
  - Pending posts count
  - Reported posts count
  - View queue button
- Banned users list:
  - Unban option
  - Ban reason
- Moderator management:
  - Add moderators
  - Remove moderators
  - Moderator permissions
- Community analytics:
  - Member growth chart
  - Post activity
  - Engagement metrics
- Delete community option (with confirmation)

### 55. **Community Members Screen** 🆕
- Search members
- Filter options:
  - All members
  - Moderators
  - Recent joiners
  - Most active
- Member list:
  - Avatar, name, username
  - Join date
  - Role badge (mod, founder)
  - Three-dot menu (View profile, Message, Ban if mod)
- Member count at top
- Invite members button
- Export members list (for mods)

### 56. Community Search Results Screen ✅
- List of matching communities
- Community preview cards:
  - Cover image
  - Icon
  - Name and description preview
  - Member count
  - Activity indicator (posts/day)
  - Join button
  - Tags/topics
- Filter dropdown:
  - By size (Small, Medium, Large)
  - By activity (Active, Growing, New)
  - By type (Public, Private)
- Sort options (Relevance, Members, Activity)
- Empty state (no results)

### 57. Community Rules Screen ✅
- Community name at top
- List of rules:
  - Rule number and title
  - Full description
  - Collapsible sections
- Consequences section (what happens if rules broken)
- Moderator contact button
- Report rule violation button
- Back button

### 58. Community About Screen ✅
- Full community description
- Community stats:
  - Created date
  - Member count
  - Online members
  - Posts per day average
- Moderators list (with avatars)
- Related communities
- Community topics/tags
- Contact moderators button
- Report community button

### 59. Moderation Queue Screen ✅
- Tabs:
  - Pending (posts awaiting approval)
  - Reported (user reports)
  - Spam (auto-flagged)
- Item cards:
  - Post preview/full content
  - Reporter info (for reported)
  - Report reason
  - Timestamp
  - Author info
- Actions per item:
  - Approve button
  - Remove button
  - Ban user button
  - Ignore report button
- Bulk actions:
  - Select multiple
  - Approve selected
  - Remove selected
- Filter options
- Empty state (queue clear)

---

## AI Chatbot (4 pages)

### 60. AI Chatbot Screen ✅
- Chat header:
  - "BetrFood AI" title
  - Clear chat button
  - Settings/info button
- Chat interface:
  - Message bubbles (user and AI)
  - Timestamp per message
  - Copy text button per AI message
  - Regenerate response button
- Text input field:
  - Placeholder text
  - Character counter (if limit)
  - Send button
- Voice input button (mic icon)
- Suggested questions chips:
  - Context-aware suggestions
  - Tap to send
  - Scroll horizontally
- Quick actions (if applicable):
  - Add to meal plan
  - Save recipe
  - Share conversation
- Loading indicator while AI responds
- Error state (if API fails)
- Empty state (start of new chat, with examples)

### 61. AI Chat with Post Context Screen ✅
- Post preview at top:
  - Thumbnail image
  - Recipe title
  - Author name
  - Collapse/expand button
- Divider line
- Chat interface (same as above)
- Context-aware suggested questions:
  - "What can I substitute for [ingredient]?"
  - "How do I make this vegan?"
  - "What wine pairs with this?"
  - "Can I make this ahead?"
- Quick actions:
  - Add this recipe to meal plan
  - Save recipe to collection
  - View full post
- Back to post button

### 62. Chat History Screen ✅
- List of previous conversations:
  - Preview of first message
  - Timestamp/date
  - Category icon (general, recipe-specific, etc.)
  - Swipe to delete
- Search chat history:
  - Search bar at top
  - Search within conversation content
- Filter options:
  - All chats
  - With recipes
  - General questions
  - Recent (last 7 days)
- Delete all button (with confirmation)
- Empty state (no chat history)
- Tap conversation to reopen

### 63. AI Chat Settings Screen ✅
- AI personality selector:
  - Professional chef
  - Friendly home cook
  - Nutritionist
  - Radio buttons
- Response length preference:
  - Brief, Moderate, Detailed
  - Slider or radio buttons
- Auto-save recipes toggle
- Show nutritional info toggle
- Language preference
- Clear all history button (with confirmation)
- About AI section (capabilities and limitations)
- Privacy info link
- Send feedback button

---

## Meal Planning (14 pages)

### 64. Meal Plans Home Screen ✅
- Header with calendar icon and "My Meal Plans"
- Current active meal plan card:
  - Week range
  - Preview of upcoming meals (today, tomorrow)
  - Quick access: View full plan, Shopping list, Start cooking
  - Nutritional summary bar
- Upcoming meals section:
  - List of next 3-5 meals
  - Meal cards (image, name, time, prep time)
  - Check off completed button
- Past meal plans list:
  - Collapsible section
  - List/grid of previous plans
  - Tap to view or reuse
- Create new meal plan button (FAB)
- Calendar view toggle button
- Empty state (no meal plans yet, with CTA)
- Meal plan templates section (premade plans)

### 65. Create Meal Plan Screen (from Post) ✅
- Selected post preview:
  - Image
  - Recipe title
  - Author
  - Change recipe button
- Meal configuration:
  - Meal type selection (Breakfast, Lunch, Dinner, Snack)
    - Radio buttons with icons
  - Date picker (calendar popup)
  - Time picker (optional)
  - Serving size adjustment
    - Number picker (1-20 servings)
    - Scales ingredients automatically
- Dietary substitutions section:
  - Toggle switch
  - Auto-replace based on dietary profile
  - Manual substitutions button
- Add more meals toggle (create multi-day plan)
- Nutritional preview:
  - Calories
  - Macros (protein, carbs, fat)
  - Alignment with goals (color-coded)
- Generate plan button (primary CTA)
- Save as template toggle
- Cancel button

### 66. Create Custom Meal Plan Screen ✅
- Plan settings:
  - Plan name input
  - Duration selection (3 days, 1 week, 2 weeks, custom)
  - Start date picker
- Meal selection interface:
  - Tab selector (Breakfast, Lunch, Dinner, Snacks)
  - Search/browse saved posts
  - Recent posts
  - Recommended based on diet
  - Add meal button per post
- Weekly calendar view:
  - 7-day grid
  - Drag and drop meals to slots
  - Empty slot indicators
  - Quick copy to other days
- AI suggestion button:
  - "Let AI fill empty slots"
  - Based on nutritional balance
- Selected meals list:
  - Reorder meals
  - Remove meal
  - Duplicate meal to other days
- Nutritional goals consideration toggle
- Generate plan button
- Save draft button

### 67. Meal Plan Detail Screen ✅
- Plan header:
  - Plan name (editable)
  - Date range
  - Edit plan button
  - Three-dot menu (Share, Duplicate, Delete, Export)
- Weekly calendar view:
  - 7-day horizontal scroll
  - Daily meal cards per day
  - Meal cards show:
    - Meal type icon
    - Image
    - Recipe name
    - Time (if set)
    - Checkmark if completed
    - Tap to expand
- Daily view toggle (switch to list view)
- Nutritional summary section:
  - Daily average calories
  - Macro breakdown (pie chart)
  - Weekly nutrition graph
  - Goals comparison (on track / over / under)
  - View detailed nutrition button
- Quick actions bar:
  - View shopping list button
  - Start cooking mode button
  - Share meal plan button
- Prep instructions button
- Notes section (add custom notes)
- Reuse this plan button

### 68. Meal Plan Calendar View ✅
- Month calendar view:
  - Current month displayed
  - Navigate previous/next month arrows
  - Today indicator
  - Days with meals have colored dots (color per meal type)
- Tap date to see meals:
  - Bottom sheet pops up
  - Meals for that day listed
  - Add meal to this day button
- Week view toggle
- Filter by meal type (show only breakfast, lunch, etc.)
- Add meal FAB
- Jump to today button
- Meal count per day indicator
- Empty days show "+"

### 69. Meal Plan Edit Screen ✅
- Same layout as Meal Plan Detail
- Edit mode enabled:
  - Remove meal (X button on cards)
  - Add meal (+ button on each day/slot)
  - Reorder meals (drag handles)
  - Change serving sizes per meal
  - Reschedule meal (drag to different day)
- Add meal search interface
- Save changes button
- Cancel button (with unsaved changes warning)
- Recalculate nutrition button

### 70. **Meal Plan Sharing Screen** 🆕
- Preview of meal plan to share
- Sharing options:
  - Share as post to feed
  - Share to communities
  - Share to stories
  - Copy link
  - Send to BetrFood friends
  - Export as PDF
  - Export to external apps
- Privacy settings:
  - Public (anyone with link can view)
  - Followers only
  - Private (specific people)
- Add caption/message
- Share button
- Cancel button

### 71. Meal Plan Templates Screen ✅
- Featured templates section:
  - Staff picks
  - Template cards (image, name, description, meal count)
- Browse by goal:
  - Weight loss
  - Muscle gain
  - Healthy eating
  - Quick & easy
  - Budget-friendly
  - Meal prep
- Browse by diet:
  - Vegan, Keto, Mediterranean, etc.
- Template detail (tap on template):
  - Full week preview
  - Nutritional summary
  - Recipe list
  - User ratings and reviews
  - Use this template button
  - Save template button
- Search templates
- Create your own template button

### 72. Shopping List Screen ✅
- List header:
  - Meal plan name (linked)
  - Grocery store selector (optional)
  - Total items count
  - Checked off count
- Ingredients grouped by category:
  - Produce
  - Meat & Seafood
  - Dairy & Eggs
  - Pantry Staples
  - Baking
  - Frozen
  - Other
  - Collapsible sections
- Ingredient items:
  - Checkbox (to mark purchased)
  - Quantity and unit
  - Ingredient name
  - Which recipe it's for (small text)
  - Strikethrough when checked
- Add custom items:
  - Input field
  - Category selector
  - Add button
- Smart features:
  - Duplicate detection (combined quantities)
  - Uncheck all button
  - Remove checked items button
- Actions:
  - Share list (text, email, etc.)
  - Print list
  - Export to:
    - Amazon Fresh
    - Instacart
    - Other grocery apps
  - Check all button
- Notes section (add shopping notes)

### 73. Shopping List Share Screen ✅
- Share options:
  - Send via text/email
  - Copy to clipboard
  - Print
  - Export to grocery apps
  - Share with household members (in-app)
- Format options:
  - By category (default)
  - Alphabetical
  - By store aisle (if store selected)
- Include options:
  - Checked items toggle
  - Recipe names toggle
  - Notes toggle
- Preview before sharing
- Share button
- Cancel button

### 74. Meal Prep Instructions Screen ✅
- Prep overview:
  - Total prep time estimate
  - Number of meals to prep
  - Servings covered
- Step-by-step prep schedule:
  - Chronological order
  - Time estimates per step
  - Recipe it's for
  - Checkboxes (mark as done)
  - Expandable details per step
- Batch cooking tips:
  - Which recipes share prep steps
  - Cook together suggestions
  - Time-saving tips
- Make-ahead suggestions:
  - What can be prepped in advance
  - Storage instructions
  - How far ahead (days)
- Timer buttons per step
- Mark all done button
- Print instructions button

### 75. Cooking Mode Screen ✅
- Full-screen recipe view:
  - Recipe name at top
  - Exit cooking mode button
- Step-by-step navigation:
  - Current step highlighted (large text)
  - Step number indicator
  - Previous/Next step buttons (large, easy to tap)
  - Swipe to navigate steps
  - Progress bar
- Hands-free features:
  - Voice control toggle
  - Voice commands (next, previous, repeat, set timer)
  - Keep screen awake
  - Screen brightness boost
- Timer integration:
  - Set timer button per step
  - Multiple timers supported
  - Timer countdown displayed prominently
  - Alarm when timer ends
- Ingredients list (collapsible at bottom):
  - Quick reference
  - Checkbox to mark as added
- Tips and notes per step (expandable)
- Zoom text size buttons
- Landscape orientation support
- Pause/Resume cooking
- Mark recipe as completed button

### 76. Nutritional Overview Screen ✅
- Time period selector:
  - Today, This week, This month
  - Custom date range
- Daily calorie breakdown:
  - Bar chart by day
  - Goal line overlay
  - Color coding (under/on track/over)
- Macro nutrient distribution:
  - Pie charts (protein, carbs, fat)
  - Percentage and grams
  - Goal vs actual comparison
- Weekly nutrition trends:
  - Line graph (calories over time)
  - Macro trends
- Micronutrients section:
  - Vitamins and minerals
  - Percentage of daily value
  - Color-coded (adequate, low, high)
- Goal progress indicators:
  - Calories: on track/over/under
  - Macros: goal alignment
  - Streak counter (days on goal)
- Detailed nutrient list:
  - Expandable sections
  - Per meal breakdown
  - Per recipe contribution
- Export data button (CSV, PDF)
- Share progress button
- Adjust goals button

### 77. Saved Meal Plans Screen ✅
- View toggle (Grid / List)
- Filter options:
  - All plans
  - Favorites
  - By date range
  - By diet type
- Plan preview cards:
  - Plan name
  - Date range or duration
  - Thumbnail images (4 meal collage)
  - Meal count
  - Nutritional summary preview
  - Favorite toggle (star icon)
- Actions per plan:
  - View plan
  - Reuse plan button
  - Edit plan
  - Duplicate plan
  - Delete plan
  - Share plan
- Search saved plans:
  - By name
  - By recipe included
  - By date
- Sort options:
  - Recent, Oldest, Name, Most used
- Empty state (no saved plans)

---

## Notifications (2 pages)

### 78. Notifications Screen ✅
- Header with "Notifications" title
- Mark all as read button
- Notification settings button (gear icon)
- Tabbed notifications:
  - **All** (default)
  - **Likes**
  - **Comments**
  - **Followers**
  - **Communities**
  - **Meal Plans** (reminders, prep alerts)
- Notification cards:
  - User avatar (tappable to profile)
  - Action description with bolded user/item
  - Time stamp (relative: "2h ago")
  - Related content preview (image thumbnail)
  - Tap to view related content
  - Swipe to dismiss
  - Read/unread indicator
- Group similar notifications ("John and 12 others liked your post")
- Clear all button (per tab)
- Load more (infinite scroll)
- Empty state (no notifications)

### 79. Notification Settings Screen ✅
- Push notifications master toggle
- Notification categories:
  - **Social**:
    - Likes on posts
    - Comments on posts
    - New followers
    - Mentions and tags
    - Follow requests (private account)
  - **Communities**:
    - New posts in followed communities
    - Replies to your comments
    - Community announcements
    - Pinned posts
  - **Meal Planning**:
    - Meal prep reminders
    - Cooking time alerts
    - Shopping list reminders
    - Weekly plan suggestions
  - **AI Chat**:
    - Response ready notifications
  - **Updates**:
    - Product updates
    - Feature announcements
    - Newsletter
- Toggle per notification type
- Quiet hours:
  - Enable toggle
  - Start time picker
  - End time picker
- Notification frequency:
  - Real-time, Hourly digest, Daily digest
  - Radio buttons
- Sound and vibration toggles
- Preview notifications toggle
- Test notification button
- Save changes button

---

## Settings & Account (17 pages)

### 80. Settings Home Screen ✅
- Profile preview card:
  - Avatar and name
  - View profile button
- Settings sections:
  - **Account**
    - Email, password, connected accounts
  - **Privacy and Security**
    - Profile visibility, blocked accounts
  - **Notifications**
    - Push, email, in-app settings
  - **Dietary Profile**
    - Preferences, allergies, goals
  - **Appearance**
    - Theme, language, display
  - **Accessibility**
    - Screen reader, contrast, motion
  - **Data and Storage**
    - Cache, downloads, data usage
  - **About**
    - Version, licenses, credits
  - **Help and Support**
    - FAQ, contact, report issue
  - **Premium/Subscription** 🆕
    - Upgrade, manage subscription
- Log out button (at bottom, red)
- Delete account option (at very bottom)

### 81. Account Settings Screen ✅
- Email/Phone section:
  - Current email displayed
  - Change email button
  - Verify email button (if unverified)
  - Current phone (if added)
  - Add/change phone button
- Password section:
  - Change password button
  - Password strength indicator
  - Last changed date
- Connected accounts:
  - Google (connected / connect button)
  - Apple (connected / connect button)
  - Facebook (connected / connect button)
  - Disconnect button per account
- Two-factor authentication:
  - Enable 2FA button
  - Setup instructions
  - Status indicator
- Active sessions:
  - List of devices logged in
  - Log out of all devices button
- Download your data:
  - Request data export button
  - Export format options (JSON, CSV)
- Delete account:
  - Delete my account button (red)
  - Warning message

### 82. Change Email Screen ✅
- Current email displayed
- New email input
- Confirm new email input
- Password input (for security)
- Change email button
- Verification required message
- Cancel button

### 83. Change Password Screen ✅
- Current password input
- New password input
- Confirm new password input
- Password strength indicator
- Password requirements checklist:
  - At least 8 characters
  - One uppercase letter
  - One number
  - One special character
- Show/hide password toggles
- Change password button
- Forgot current password link
- Cancel button

### 84. Two-Factor Authentication Setup Screen ✅
- 2FA explanation
- Setup methods:
  - Authenticator app (recommended)
  - SMS
  - Email
- QR code (for authenticator app)
- Manual entry code
- Verify code input
- Backup codes:
  - Generate backup codes button
  - Download backup codes
  - Print backup codes
- Enable 2FA button
- Cancel button

### 85. **Account Deletion Confirmation Screen** 🆕
- Warning header
- Consequences list:
  - All posts will be deleted
  - Meal plans will be lost
  - Followers will be removed
  - Cannot be undone
- Re-enter password for confirmation
- Reason for deletion (dropdown, optional)
- Additional feedback (text area, optional)
- Final confirmation checkbox:
  - "I understand my account will be permanently deleted"
- Delete my account button (red, requires checkbox)
- Cancel button (green)
- Contact support link

### 86. Privacy Settings Screen ✅
- Profile visibility:
  - Public, Private, Friends-only
  - Radio buttons
  - Explanation per option
- Post visibility:
  - Who can see your posts
  - Who can comment
  - Who can share
- Story settings:
  - Who can view stories
  - Hide story from specific users
  - Allow story replies
- Activity status:
  - Show when active toggle
  - Last seen visibility
- Dietary info visibility:
  - Show on profile toggle
  - Who can see (Public, Followers, Only me)
- Search visibility:
  - Allow profile to appear in search toggle
  - Show up in suggested users toggle
- Blocked accounts:
  - View blocked accounts button
  - Blocked count indicator
- Muted accounts:
  - View muted accounts button
  - Muted count indicator
- Data sharing:
  - Share data for personalization toggle
  - Share analytics with creators toggle
- Save changes button

### 87. Notification Settings Screen ✅
(Duplicate of #79, included here for settings navigation flow)

### 88. Appearance Settings Screen ✅
- Theme selection:
  - Light mode
  - Dark mode
  - Auto (system default)
  - Radio buttons
  - Live preview
- Color accent:
  - Primary color picker
  - Preset color options
- Font size:
  - Small, Medium, Large, Extra Large
  - Radio buttons
  - Preview text
- Display language:
  - Language selector dropdown
  - Supported languages list
- Date and time format:
  - 12-hour / 24-hour toggle
  - Date format (MM/DD/YYYY, DD/MM/YYYY, etc.)
- Measurement units:
  - Metric / Imperial toggle
- Feed preferences:
  - Autoplay videos toggle
  - High quality images toggle
  - Data saver mode toggle
- Save changes button

### 89. Accessibility Settings Screen ✅
- Screen reader support:
  - Enable toggle
  - Description labels detail level
- High contrast mode toggle:
  - Preview
- Reduce motion toggle:
  - Disable animations
- Captions and subtitles:
  - Auto-generate captions for videos toggle
  - Caption font size
  - Caption background
- Text size adjustment:
  - Slider (50% - 200%)
  - Live preview
- Button size:
  - Standard, Large, Extra Large
  - Radio buttons
- Voice navigation:
  - Enable voice commands toggle
  - Voice command help
- Focus indicators:
  - Enhanced focus outlines toggle
- Color blind mode:
  - Deuteranopia, Protanopia, Tritanopia filters
  - None
- Haptic feedback:
  - Enable vibration feedback toggle
  - Intensity slider
- Save changes button

### 90. Data and Storage Settings Screen ✅
- Storage usage:
  - Total app storage
  - Breakdown (cache, downloads, offline data)
  - Bar chart visualization
- Cache:
  - Clear cache button
  - Last cleared date
  - Cache size
- Downloads:
  - Manage downloaded content button
  - Auto-download toggle (on WiFi only)
  - Download quality (Low, Medium, High)
- Data usage:
  - Data saver mode toggle
  - WiFi only mode toggle
  - Usage statistics (current month)
- Offline mode:
  - Enable offline access toggle
  - Sync saved posts for offline
  - Sync meal plans for offline
- Clear all data button (red, with confirmation)

### 91. Blocked Accounts Screen ✅
- List of blocked users:
  - User avatar
  - Username and name
  - Date blocked
  - Unblock button per user
- Search blocked accounts
- Sort by (Recent, Alphabetical)
- Bulk unblock:
  - Select multiple
  - Unblock selected button
- Empty state (no blocked accounts)
- Info section (what happens when you block)

### 92. Muted Accounts Screen ✅
- List of muted users:
  - User avatar
  - Username and name
  - Mute duration (if temporary)
  - Unmute button per user
- Mute duration settings per user:
  - 24 hours, 7 days, 30 days, Indefinite
  - Dropdown or radio buttons
- Search muted accounts
- Sort by (Recent, Alphabetical, Duration)
- Empty state (no muted accounts)
- Info section (what happens when you mute)

### 93. Help & Support Screen ✅
- Search help topics (search bar)
- Quick links:
  - Getting started guide
  - How to create meal plans
  - Understanding nutrition tracking
  - Community guidelines
  - Tips for creators
- FAQ section:
  - Expandable categories
  - Common questions
- Contact support:
  - Email support button
  - Chat with support (if available)
  - Support hours
- Report a problem:
  - Report issue button
  - Bug report
  - Feature request
- Legal:
  - Terms of service
  - Privacy policy
  - Community guidelines
  - Cookie policy
- Social media links:
  - Follow us section
  - Links to Twitter, Instagram, etc.

### 94. Report Problem Screen ✅
- Problem category selection:
  - Account issue
  - Technical bug
  - Content issue
  - Payment/subscription issue
  - Feature request
  - Other
  - Dropdown
- Issue title (short description)
- Description text area:
  - Detailed explanation
  - Character counter
  - Placeholder with examples
- Attach screenshots:
  - Upload button
  - Up to 5 images
  - Thumbnail previews
- Device information (auto-collected):
  - App version
  - Device model
  - OS version
  - Editable
- Contact information:
  - Email (pre-filled)
  - Include my account info toggle
- Submit button
- Cancel button
- Confirmation message after submission
- Track your report link

### 95. About Screen ✅
- App logo
- App name and tagline
- Version number
- Build number (smaller text)
- What's new button (changelog)
- Credits:
  - Developed by
  - Design team
  - Contributors list
- Open source licenses:
  - View licenses button
  - List of OSS used
- Acknowledgements
- Social media links:
  - Instagram, Twitter, TikTok, YouTube
  - Icons with links
- Website link
- Privacy policy link
- Terms of service link
- Copyright notice

### 96. **Premium/Subscription Screen** 🆕
- Current plan indicator (Free / Premium)
- Premium features list:
  - Unlimited meal plans per week
  - Unlimited AI chat queries
  - Advanced nutrition analytics
  - Ad-free experience
  - Priority support
  - Exclusive creator content
  - Early access to features
  - Custom nutrition goals
  - Export meal plans to PDF
  - Shopping list sync with delivery apps
- Pricing:
  - Monthly: $9.99/month
  - Yearly: $79.99/year (save 33%)
  - Toggle between monthly/yearly
  - Free trial available (7 days)
- Upgrade button (prominent)
- Compare plans table
- Manage subscription button (if subscribed):
  - Change plan
  - Update payment method
  - Cancel subscription
  - View billing history
- Restore purchases button
- Terms and conditions link

### 97. **Subscription Management Screen** 🆕
- Current subscription:
  - Plan name (Premium Monthly/Yearly)
  - Status (Active, Cancelled, Expired)
  - Next billing date
  - Amount
- Payment method:
  - Card ending in XXXX
  - Update payment method button
  - Add payment method
- Billing history:
  - List of past payments
  - Date, amount, status
  - Download receipt button per item
- Change plan:
  - Upgrade/downgrade options
  - Immediate or at renewal
- Cancel subscription:
  - Cancel button
  - Reason for cancellation (dropdown)
  - Offer to pause instead
  - Confirmation
- Reactivate subscription button (if cancelled)

### 98. **Creator Earnings Dashboard** 🆕
- Header with total earnings
- Earnings overview:
  - This month
  - Last month
  - All time
  - Graph of earnings over time
- Revenue breakdown:
  - Meal plan sales
  - Recipe ebook sales
  - Sponsored posts
  - Tips received
  - Platform fee deducted (20%)
- Top selling content:
  - List of best-performing items
  - Thumbnail, title, revenue
- Payout information:
  - Current balance
  - Minimum payout threshold
  - Next payout date
  - Payout method (bank, PayPal)
- Payout history:
  - List of past payouts
  - Date, amount, status
  - Download statement
- Payment settings:
  - Add/edit payout method
  - Tax information (for compliance)
- Earnings reports:
  - Download monthly reports
  - Tax documents (1099, etc.)

---

## Additional Screens (20 pages)

### 99. Stories Viewer Screen ✅
- Full-screen story playback:
  - Image or video
  - Auto-advance to next story
  - Pause on tap and hold
- Progress bars at top:
  - One per story in sequence
  - Current story progress filling
- Story navigation:
  - Tap left side: previous story
  - Tap right side: next story
  - Swipe right: exit stories or previous user
  - Swipe left: next user's stories
- Story reactions:
  - Quick reactions (❤️ 😂 😮 etc.)
  - Send message (reply to story)
- Story info overlay:
  - User avatar and name (top left)
  - Timestamp
  - Follow button (if not following)
  - Three-dot menu:
    - Report story
    - Mute user
    - Share story (if allowed)
- Swipe up for more info:
  - Recipe link (if food story)
  - Location tag
  - Product links
- Close button (X at top right)
- Mute/unmute audio button

### 100. Create Story Screen ✅
- Camera interface:
  - Live camera view
  - Capture button
  - Flash toggle
  - Flip camera button
  - Gallery button (add from gallery)
- Story filters and effects:
  - Swipeable filter options
  - Face filters (AR effects)
  - Color filters
- Text and stickers:
  - Add text button
  - Text editor (font, color, size, alignment)
  - Sticker library (emojis, GIFs, custom)
  - Location sticker
  - Hashtag sticker
  - Time sticker
  - Poll sticker
  - Question sticker
  - Recipe link sticker
- Drawing tools:
  - Brush tool with color picker
  - Eraser
  - Brush size slider
  - Undo/redo
- Music/audio:
  - Add music from library
  - Trim audio
- Privacy settings:
  - Share to (All followers, Close friends, Custom)
  - Allow replies toggle
  - Allow sharing toggle
- Share to story button
- Save to camera roll option
- Discard button

### 101. Close Friends List Screen ✅
- List of close friends:
  - User avatars and names
  - Remove from list button
- Add to close friends:
  - Search followers
  - Add button per user
- Info section (what close friends can see)
- Suggested close friends
- Sort options (Alphabetical, Recently added)
- Empty state (no close friends)

### 102. Saved Posts Screen ✅
- View toggle (Grid / List)
- Tab navigation:
  - All saved
  - Collections
- Grid of saved posts:
  - Post thumbnails
  - Engagement indicators
  - Tap to view post
  - Long-press for options:
    - Unsave
    - Add to collection
    - Share
- Create new collection button (FAB)
- Search saved posts
- Sort options:
  - Recent, Oldest, Most liked
- Filter by:
  - Post type (Photos, Videos, Recipes)
  - Cuisine type
  - Meal type
- Empty state (no saved posts)

### 103. Collections Screen ✅
- List of post collections:
  - Collection cover image (first 4 posts grid)
  - Collection name
  - Post count
  - Privacy indicator (Public, Private)
  - Tap to view collection
- Create new collection button
- Edit collections mode:
  - Reorder collections (drag handles)
  - Delete collections (swipe or select)
- Search collections
- Sort options (Name, Recent, Most items)
- Empty state (no collections)

### 104. Collection Detail Screen ✅
- Collection header:
  - Collection name (editable)
  - Description (editable)
  - Post count
  - Privacy toggle (Public, Only me)
  - Share collection button
  - Three-dot menu:
    - Edit collection
    - Delete collection
    - Change cover
- Grid of posts in collection:
  - Post thumbnails
  - Remove from collection (X button in edit mode)
  - Reorder posts (drag in edit mode)
- Add more posts button
- Search within collection
- Sort posts (Recent, Oldest, Popular)
- Empty state (no posts in collection)
- Back button

### 105. Edit Collection Screen ✅
- Collection name input
- Description text area
- Cover photo selection:
  - Auto (first 4 posts)
  - Choose custom cover
- Privacy setting:
  - Public, Only me
  - Radio buttons
- Collaborate toggle:
  - Allow others to add posts
  - Invite collaborators
- Save changes button
- Delete collection button (red)
- Cancel button

### 106. Share Sheet ✅
- Share options:
  - **Share to BetrFood**:
    - Share to your story
    - Share to a community
    - Send to friends (list of recent chats)
  - **Share to other apps**:
    - Copy link
    - Instagram
    - Facebook
    - Twitter/X
    - WhatsApp
    - iMessage / SMS
    - Email
    - More apps (system share)
- Preview of content being shared
- Add message/caption (optional)
- Cancel button
- Confirmation after sharing

### 107. Direct Messages Screen ✅
- Header with "Messages" title
- New message button (compose icon)
- Search conversations (search bar)
- Conversation list:
  - User avatar
  - Name
  - Last message preview
  - Timestamp
  - Unread indicator (badge)
  - Swipe actions:
    - Delete conversation
    - Mute notifications
    - Pin conversation
- Pinned conversations section (at top)
- Filter tabs:
  - All
  - Unread
  - Groups (future feature)
- Empty state (no messages yet)

### 108. Conversation Screen ✅
- Header:
  - User avatar and name (tap to view profile)
  - Active status indicator (green dot)
  - Video call button (future feature)
  - Info button (three dots)
- Message thread:
  - Message bubbles (left for received, right for sent)
  - Timestamps (grouped by time)
  - Read receipts (seen / delivered)
  - Message status (sending, sent, failed)
  - Image/video messages (tap to view full)
  - Shared posts (preview card)
  - Shared recipes (preview card)
  - Voice messages (play button with waveform)
  - Link previews
- Text input:
  - Message text field
  - Emoji picker button
  - Send button (icon becomes active when typing)
- Attachment options:
  - Photo/video from gallery
  - Camera
  - Share post from feed
  - Share recipe
  - Voice message (tap and hold)
  - Location (future feature)
- Scroll to bottom button (when not at bottom)
- Typing indicator ("User is typing...")
- Swipe reply (quote message)
- Message actions (long-press):
  - Reply
  - React (emoji reactions)
  - Copy
  - Delete
  - Report

### 109. New Message Screen ✅
- Search users to message:
  - Search bar
  - Recent chats
  - Followers list
  - Following list
- User selection:
  - User cards with avatars and names
  - Checkboxes (for group messages, future)
  - Mutual followers indicator
- Selected recipients chips (at top)
- Next button (to start conversation)
- Cancel button

### 110. Message Info Screen ✅
- Conversation settings:
  - Mute notifications toggle
  - Custom nickname for user
  - Disappearing messages toggle (future)
- Media, links, and files:
  - Shared photos and videos
  - Shared links
  - Shared recipes
  - Grid/list view
- Search in conversation
- Block user
- Report user
- Delete conversation (red)
- Back button

### 111. User Suggestions Screen ✅
- Section headers:
  - Suggested for you
  - Based on your interests
  - Popular in your area
  - Mutual followers
- User cards:
  - Avatar
  - Name and username
  - Bio preview
  - Mutual followers count
  - Follow button
  - Dismiss (X button)
- Refresh suggestions button
- See all button per section
- Tap user card to view profile
- Empty state (no suggestions)

### 112. Follow Requests Screen ✅
(For private accounts)
- List of follow requests:
  - User avatar
  - Name and username
  - Bio preview
  - Mutual followers
  - Actions:
    - Approve button
    - Decline button
  - Tap user to view profile preview
- Select multiple:
  - Approve all
  - Decline all
- Search requests
- Empty state (no requests)

### 113. Analytics Dashboard Screen (Creators) ✅
- Time period selector (Last 7 days, 30 days, 90 days, All time)
- Overview cards:
  - Total followers (with change %)
  - Total likes (with change %)
  - Post reach (with change %)
  - Engagement rate (with change %)
- Follower growth chart:
  - Line graph over time
  - Followers gained/lost
- Post performance metrics:
  - Total posts
  - Avg likes per post
  - Avg comments per post
  - Top post (thumbnail and stats)
- Top performing posts:
  - List of posts with highest engagement
  - Thumbnail, likes, comments, saves, shares
- Engagement rate graph:
  - Trend over time
- Audience demographics:
  - Top locations (bar chart)
  - Age distribution (pie chart)
  - Gender distribution (if available)
- Best times to post:
  - Heatmap by day and hour
  - Recommendation
- Content insights:
  - Most used hashtags
  - Most engaging post types (photo, video, recipe)
- Export data button
- Learn more (tips to grow)

### 114. Creator Analytics - Post Detail ✅
- Post preview (image/video)
- Post metadata (date, time posted)
- Performance summary:
  - Total reach
  - Impressions
  - Likes
  - Comments
  - Saves
  - Shares
  - Profile visits from post
- Engagement rate
- Engagement over time graph (first 48 hours)
- Audience demographics for this post:
  - Locations
  - Age, gender
- Traffic source:
  - Home feed
  - Explore page
  - Hashtags
  - Profile
  - Other
- Actions taken:
  - Profile visits
  - Follows gained
  - Link clicks (if any)
  - Meal plans created from post
- Comments breakdown:
  - Sentiment analysis (positive, neutral, negative)
  - Top comments
- Compare to your average
- Promote post button (future feature)
- Export post data

### 115. **Recipe Import Screen** 🆕
- Import methods:
  - Paste recipe URL
  - Import from other apps (Paprika, Whisk, etc.)
  - Scan physical recipe (photo OCR)
  - Manual entry
- URL input field:
  - Paste URL
  - Import button
  - Supported sites list
- Import progress indicator
- Preview imported recipe:
  - Title
  - Ingredients
  - Instructions
  - Servings, time, etc.
  - Edit before posting option
- Post immediately or save as draft
- Add to meal plan option
- Cancel button

### 116. **Ingredient Substitution Screen** 🆕
- Recipe context displayed (which recipe)
- Ingredient to substitute (highlighted)
- Why substitute? (optional):
  - Allergy
  - Dietary preference
  - Not available
  - Cost
- AI-generated substitutions:
  - List of alternatives
  - Conversion ratios
  - Taste/texture impact notes
  - Difficulty of substitution (Easy, Moderate, Complex)
- Select substitution:
  - Radio buttons
  - Apply button
- Manual substitution input
- Save to my common substitutions
- Learn more (substitution guide)
- Cancel button

### 117. Common Substitutions Library Screen ✅
- Personal substitution library:
  - List of saved substitutions
  - Original ingredient → Substitute
  - Reason
  - Edit/delete
- Add custom substitution button
- Browse common substitutions:
  - By category (dairy, eggs, flour, etc.)
  - Substitution cards with details
- Search substitutions
- Dietary filter (vegan, gluten-free, etc.)
- Apply to recipe (if viewing from recipe context)

### 118. Recipe Scaling Screen ✅
- Current serving size
- Target serving size input:
  - Number picker
  - Or percentage slider
- Scaled ingredients preview:
  - Ingredient list with new quantities
  - Unit conversions (if needed)
  - Rounding options (exact, practical, imperial)
- Scaled instructions:
  - Adjusted cooking times (estimated)
  - Adjusted temperatures (if needed)
- Scaling notes/warnings:
  - What scales well
  - What may need manual adjustment
- Apply scaling button
- Reset button
- Save as new recipe
- Cancel button

---

## Error & Loading States (5 pages)

### 119. Error/Empty States ✅
Context-aware error and empty states for various scenarios:

**No Internet Connection**
- Airplane icon
- "No internet connection" message
- "Check your connection and try again"
- Retry button
- View offline content button (if available)

**Content Not Available**
- Broken image icon
- "This content is no longer available"
- Possible reasons (deleted, removed, private)
- Go back button

**No Posts Yet**
- Empty state illustration
- "No posts yet"
- "Start sharing your culinary creations!"
- Create post button

**No Followers Yet**
- Illustration
- "No followers yet"
- "Share great content to grow your audience"
- Invite friends button
- Explore button

**No Following**
- Illustration
- "You're not following anyone yet"
- "Discover creators and start building your feed"
- Explore button

**Search No Results**
- Magnifying glass icon
- "No results found for '[query]'"
- Suggestions to try:
  - Check spelling
  - Try different keywords
  - Browse categories
- Clear filters button (if filters applied)

**Feed Empty (Following feed when following no one)**
- Illustration
- "Your feed is empty"
- "Follow creators to see their posts here"
- Explore button

**Community Empty**
- Illustration
- "No posts in this community yet"
- "Be the first to post!"
- Create post button

**Meal Plan Empty**
- Illustration
- "No meal plans yet"
- "Start planning delicious meals"
- Create meal plan button

**Server Error (500)**
- Error illustration
- "Something went wrong"
- "We're working to fix it"
- Error code
- Retry button
- Go home button

### 120. Loading States ✅
Loading skeletons and indicators for various screens:

**Feed Loading Skeleton**
- Animated shimmer effect
- Post card placeholders:
  - User avatar circle
  - Username rectangle
  - Image rectangle
  - Action buttons
  - Caption lines
- Multiple cards visible

**Profile Loading Skeleton**
- Header section:
  - Avatar circle
  - Name and bio rectangles
  - Stats rectangles
- Post grid placeholders:
  - 3-column grid of squares

**Search Loading**
- Search bar (active)
- Result placeholders
- "Searching..." text

**Image Upload Progress**
- Circular progress indicator
- Percentage text
- "Uploading image..." status
- Cancel upload button
- Thumbnail preview with overlay

**Video Upload Progress**
- Linear progress bar
- Percentage
- "Uploading video..." status
- Time remaining estimate
- Cancel upload button

**Meal Plan Generation Loading**
- Animated cooking illustration
- "Creating your meal plan..." text
- Progress steps:
  - Analyzing recipes ✓
  - Calculating nutrition ✓
  - Generating shopping list...
  - Optimizing schedule

**AI Chat Loading (Thinking)**
- Three-dot animation
- "AI is thinking..." text
- Typing indicator bubble

**Infinite Scroll Loading**
- Spinner at bottom of feed
- "Loading more..." text

**Pull to Refresh**
- Pull-down animation
- Spinner at top
- "Refreshing..." text

### 121. Onboarding Tooltips/Coachmarks ✅
First-time user education overlays:

**Home Feed - First Visit**
- Spotlight on Stories bar
- "Swipe to view stories from people you follow"
- Next button

**Post Detail - First Recipe Post**
- Spotlight on "Create Meal Plan" button
- "Turn any recipe into a meal plan with one tap"
- Got it button

**Meal Plan Created - First Time**
- Spotlight on Shopping List button
- "Your ingredients are auto-organized into a shopping list"
- Next button

**AI Chat - First Open**
- "Ask me anything about cooking, ingredients, or recipes!"
- Example questions chips
- Try it button

**Communities - First Visit**
- "Join communities to discuss your favorite food topics"
- Browse button

**Profile - First Visit**
- Spotlight on Edit Profile
- "Set up your profile to connect with others"
- Set up now / Later buttons

### 122. Success/Confirmation States ✅
Confirmation messages and success screens:

**Post Published**
- Checkmark animation
- "Post published!"
- View post button
- Share button
- Post another button
- Auto-dismiss after 3 seconds

**Meal Plan Created**
- Success animation
- "Meal plan created!"
- View meal plan button
- Create shopping list button

**Recipe Saved**
- Heart fill animation
- "Recipe saved to [Collection name]"
- Undo button
- Auto-dismiss after 2 seconds

**Follow Confirmed**
- "Following [Username]"
- Undo button
- Auto-dismiss after 2 seconds

**Comment Posted**
- Checkmark
- Scroll to comment
- Auto-dismiss after 1 second

**Profile Updated**
- "Profile updated successfully"
- Dismiss button
- Auto-dismiss after 2 seconds

**Meal Completed**
- Celebration animation
- "Meal completed! How was it?"
- Rating stars
- Add photo of your creation button
- Skip button

### 123. Permission Requests ✅
System permission request screens:

**Camera Permission**
- Camera icon
- "BetrFood needs access to your camera"
- "Take photos and videos to share your culinary creations"
- Allow button
- Not now button
- Privacy policy link

**Photo Library Permission**
- Photos icon
- "BetrFood needs access to your photos"
- "Share photos from your library"
- Allow button
- Not now button

**Notifications Permission**
- Bell icon
- "Stay updated with notifications"
- "Get notified when others interact with your posts"
- Enable button
- Not now button

**Location Permission**
- Map pin icon
- "Add your location to posts"
- "Help others discover local food"
- Benefits list
- Allow once / Allow while using / Don't allow

**Microphone Permission (for voice messages)**
- Microphone icon
- "BetrFood needs microphone access"
- "Send voice messages and use voice commands in cooking mode"
- Allow button
- Not now button

---

## Total Screen Count: 123 Unique UI Pages

### New Pages Added: 26 pages
78-95 (original), plus 18 new pages integrated throughout, plus 5 additional states/screens

---

## Updated Screen Priority Levels

### Phase 1 - MVP (Essential) - 35 pages
**Authentication & Core Features**
- Pages: 1-7, 12-18, 27-28, 34-35, 60, 64-67, 72, 75-76, 78, 80, 119-120

**Focus**: Launch-ready app with core posting, feed, basic meal planning, and AI chat

---

### Phase 2 - Core Features (Enhanced) - 50 pages
**Full Social & Planning Features**
- Pages: 8-11, 19-26, 29-33, 36-48, 49-59, 68-74, 77, 81-95, 102-106, 121-122

**Focus**: Complete social features, communities, advanced meal planning, settings

---

### Phase 3 - Advanced Features (Premium) - 38 pages
**Monetization & Advanced Tools**
- Pages: 61-63, 96-98, 99-101, 107-118, 123

**Focus**: Stories, DMs, creator tools, premium features, analytics, advanced utilities

---

## Key Additions Justification

### Authentication Enhancements (5 pages)
- **Forgot/Reset Password (5-6)**: Industry standard, users expect it
- **Email Verification (7)**: Security best practice, prevents fake accounts
- **Skip Confirmation (9)**: UX best practice, reduces abandonment
- **Account Deletion Confirmation (85)**: Legal requirement (GDPR, CCPA)

### Monetization Pages (4 pages)
- **Premium/Subscription (96-97)**: Core to business model from product overview
- **Creator Earnings Dashboard (98)**: Essential for creator economy
- **Post Scheduling (24)**: Expected creator tool

### Feature Gaps (9 pages)
- **Meal Plan Sharing (70)**: Viral growth mechanic from product overview
- **Recipe Import (115)**: User convenience, competitive parity
- **Ingredient Substitution (116)**: AI-powered feature highlighted in overview
- **Community Members (55)**: Moderation necessity
- **Content Reporting Detail**: Community safety
- **Verification Request Detail (45)**: Trust & credibility system

### User Experience (5 pages)
- **Tooltips/Coachmarks (121)**: First-time user education
- **Success States (122)**: Feedback and delight
- **Permission Requests (123)**: iOS/Android requirement

---

## Navigation Flow Summary (Updated)

**App Launch Path**:
```
Splash → Welcome → Sign Up → Email Verification → Onboarding Slides →
Skip Confirmation (if skip) → Dietary Setup → Interest Selection → Home Feed
```

**Main User Flows**:

1. **Content Discovery → Action**:
   ```
   Feed → Post Detail → Create Meal Plan → Shopping List → Cooking Mode →
   Mark Complete → Share Result
   ```

2. **Social Engagement**:
   ```
   Explore → Discover User → View Profile → Follow → View Posts →
   Comment → Direct Message
   ```

3. **Community Participation**:
   ```
   Communities Home → Join Community → Read Posts → Create Discussion →
   Engage in Comments → Build Reputation
   ```

4. **Creator Journey**:
   ```
   Create Post → Add Recipe Details → Publish → View Analytics →
   Grow Audience → Monetize (Premium Phase) → Earnings Dashboard
   ```

5. **Health Management**:
   ```
   Settings → Dietary Profile → Set Goals → Browse Feed (personalized) →
   Create Meal Plan → Track Nutrition → Adjust Goals
   ```

6. **Premium Conversion**:
   ```
   Hit Free Limit → View Premium Benefits → Compare Plans → Subscribe →
   Manage Subscription
   ```

---

## Design System Compliance

All 123 pages must follow the design specifications in **DESIGN_SYSTEM.md**:

✅ Mobile frame: 375×812px
✅ Plus Jakarta Sans font
✅ CSS variables for colors
✅ Consistent border-radius scale
✅ Primary gradient for CTAs
✅ Bottom navigation on main screens
✅ Status bar on all screens
✅ Touch targets ≥42px height

---

## Conclusion

This comprehensive 123-page specification covers all features outlined in the Product Overview, including:

✅ Complete authentication flow with security best practices
✅ Rich social features (feed, profiles, follows, DMs)
✅ Topic-based communities with Reddit-style discussions
✅ AI chatbot for cooking assistance
✅ Advanced meal planning with shopping lists and cooking mode
✅ Nutrition tracking and dietary management
✅ Creator tools and analytics
✅ Monetization infrastructure (premium, creator earnings)
✅ Complete settings and account management
✅ Stories and ephemeral content
✅ Error handling and loading states
✅ User onboarding and education
✅ All features needed for product-market fit and scaling

The app is now fully specified and ready for development in three phases, with clear prioritization aligned to the business model and user needs outlined in the Product Overview.

---

*Document Version: 2.0*
*Last Updated: February 5, 2025*
*Maintained By: BetrFood Product Team*
