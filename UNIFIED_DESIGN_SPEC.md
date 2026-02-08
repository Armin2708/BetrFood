# BetrFood - Unified Design Specification
## The Single Source of Truth for UI Consistency

**Version**: 2.0
**Date**: 2026-02-07
**Purpose**: Absolute design synchronization across all pages

---

## Part 1: COLOR SYSTEM - Exact Usage Rules

### Color Palette (Required CSS Variables)

```css
:root {
    /* PRIMARY BRAND COLORS */
    --primary: #22C55E;           /* Vibrant Green */
    --primary-light: #DCFCE7;     /* Pale Green */
    --primary-dark: #16A34A;      /* Dark Green */
    --secondary: #10B981;         /* Emerald Green */

    /* BACKGROUNDS */
    --background: #F8FAFC;        /* Page Background (Blue-Gray 50) */
    --surface: #FFFFFF;           /* Cards/Containers (Pure White) */

    /* TEXT COLORS */
    --text-primary: #0F172A;      /* Headings (Slate 900) */
    --text-secondary: #64748B;    /* Body Text (Slate 500) */
    --text-muted: #94A3B8;        /* Meta/Disabled (Slate 400) */

    /* BORDERS */
    --border: #E2E8F0;            /* All Borders (Slate 200) */

    /* SEMANTIC COLORS */
    --danger: #EF4444;            /* Red 500 */
    --danger-light: #FEE2E2;      /* Red 100 */
    --warning: #F59E0B;           /* Amber 500 */
    --warning-light: #FEF3C7;     /* Amber 100 */
    --success: #22C55E;           /* Same as Primary */
    --success-light: #DCFCE7;     /* Same as Primary Light */
}
```

### Color Usage Decision Tree

#### WHEN TO USE EACH COLOR:

**Page Backgrounds** (Only 2 Options):
```
IF page has multiple sections/cards:
    USE: var(--background) #F8FAFC
    EXAMPLES: Profile, Settings, Feed

IF page is a single form/modal:
    USE: var(--surface) #FFFFFF
    EXAMPLES: Sign Up, Login, Forgot Password
```

**Component Backgrounds**:
```
Cards/Containers:        var(--surface) #FFFFFF
Input Fields:            var(--surface) #FFFFFF
Buttons (Secondary):     var(--surface) #FFFFFF
Section Groups:          var(--background) #F8FAFC (when on white page)
Section Groups:          var(--surface) #FFFFFF (when on gray page)
Bottom Navigation:       var(--surface) #FFFFFF
Status Bar:              transparent
```

**Text Colors** (By Hierarchy):
```
H1, H2 (All Headings):      var(--text-primary) #0F172A
Body Text (Primary):        var(--text-primary) #0F172A
Body Text (Secondary):      var(--text-secondary) #64748B
Labels (Form):              var(--text-primary) #0F172A
Descriptions:               var(--text-secondary) #64748B
Metadata (@username, time): var(--text-muted) #94A3B8
Placeholder Text:           var(--text-muted) #94A3B8
Disabled Text:              var(--text-muted) #94A3B8
```

**Button Colors**:
```css
/* PRIMARY CTA BUTTONS */
background: linear-gradient(135deg, var(--primary) 0%, var(--secondary) 100%);
color: #FFFFFF;
box-shadow: 0 4px 14px rgba(34, 197, 94, 0.35);

/* SECONDARY BUTTONS */
background: var(--surface);
border: 2px solid var(--border);
color: var(--text-primary);

/* FOLLOW BUTTON (Inactive) */
background: transparent;
border: 2px solid var(--primary);
color: var(--primary);

/* FOLLOW BUTTON (Active - Following) */
background: var(--primary);
border: 2px solid var(--primary);
color: #FFFFFF;

/* DANGER BUTTONS */
background: var(--danger);
color: #FFFFFF;
```

**Border Colors** (Simple Rule):
```
ALL borders/dividers:  var(--border) #E2E8F0
ALL border-width:      1px (dividers) or 2px (inputs/buttons)
NO OTHER BORDER COLORS ALLOWED
```

**Active/Selected States**:
```
Navigation Active:      background var(--primary-light), icon var(--primary)
Tab Active:             background var(--primary), text #FFFFFF
Checkbox/Radio Active:  border var(--primary), fill var(--primary)
Input Focus:            border var(--primary), glow rgba(34, 197, 94, 0.1)
```

**Semantic Color Usage**:
```
Allergies/Errors:       var(--danger) text + var(--danger-light) background
Warnings/Premium:       var(--warning) text + var(--warning-light) background
Success Messages:       var(--primary) text + var(--primary-light) background
```

### Gradient Rules (Exact Specifications)

**PRIMARY BUTTON GRADIENT** (Most Common):
```css
background: linear-gradient(135deg, #22C55E 0%, #10B981 100%);
/* 135° angle (diagonal top-left to bottom-right) */
/* NEVER use any other angle */
```

**WELCOME SCREEN BACKGROUND**:
```css
background: linear-gradient(180deg, #DCFCE7 0%, #FFFFFF 40%);
/* 180° angle (vertical top to bottom) */
/* Green fades to white at 40% mark */
```

**AVATAR GRADIENTS** (8 Pastel Options - 135° diagonal):
```css
/* Yellow */  linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)
/* Green */   linear-gradient(135deg, #dcfce7 0%, #bbf7d0 100%)
/* Red */     linear-gradient(135deg, #fee2e2 0%, #fecaca 100%)
/* Blue */    linear-gradient(135deg, #e0e7ff 0%, #c7d2fe 100%)
/* Pink */    linear-gradient(135deg, #fce7f3 0%, #fbcfe8 100%)
/* Cyan */    linear-gradient(135deg, #cffafe 0%, #a5f3fc 100%)
/* Purple */  linear-gradient(135deg, #f3e8ff 0%, #e9d5ff 100%)
/* Lime */    linear-gradient(135deg, #ecfccb 0%, #d9f99d 100%)
```

**POST GRID PLACEHOLDER**:
```css
background: linear-gradient(135deg, #f1f5f9 0%, #e2e8f0 100%);
/* Gray gradient for loading states */
```

---

## Part 2: SHAPE SYSTEM - Exact Border Radius Rules

### Border Radius Scale (Only These Values Allowed)

```
0px   → NEVER USE (no sharp corners in BetrFood)
6px   → NOT IN SYSTEM
8px   → Post Grid Items ONLY
10px  → Small Buttons, Small Badges
12px  → Standard Buttons, Input Fields, Navigation Items, Tabs
14px  → Large Inputs, Search Bars, Small Avatars
16px  → NOT IN SYSTEM
18px  → Cards, Sections, Medium Containers
20px  → Logo Containers, Large Badges
22px  → NOT IN SYSTEM
24px  → Profile Avatars (Medium Size)
28px  → Profile Header (Bottom Corners)
50px  → Circular Buttons (or use 50% for perfect circles)
```

### Component-Specific Border Radius Rules

```css
/* BUTTONS */
.btn-primary          { border-radius: 14px; }  /* CTA buttons */
.btn-secondary        { border-radius: 12px; }  /* Standard buttons */
.btn-small            { border-radius: 10px; }  /* Follow buttons */
.btn-icon-circular    { border-radius: 50%; }   /* Round icon buttons */

/* INPUTS */
.input-standard       { border-radius: 14px; }  /* Form inputs */
.input-search         { border-radius: 14px; }  /* Search bars */
.textarea             { border-radius: 14px; }  /* Text areas */

/* CONTAINERS */
.card                 { border-radius: 18px; }  /* Cards/sections */
.modal                { border-radius: 24px; }  /* Modals/dialogs */
.section-group        { border-radius: 18px; }  /* Settings groups */
.profile-header       { border-radius: 0 0 28px 28px; } /* Bottom only */

/* AVATARS */
.avatar-small         { border-radius: 14px; }  /* 50×50px avatars */
.avatar-medium        { border-radius: 18px; }  /* 64×64px avatars */
.avatar-large         { border-radius: 24px; }  /* 88×88px avatars */
.avatar-circular      { border-radius: 50%; }   /* Circular avatars */

/* NAVIGATION */
.nav-item             { border-radius: 12px; }  /* Bottom nav items */
.tab-item             { border-radius: 10px; }  /* Tab buttons */
.header-button        { border-radius: 50%; }   /* Back/close buttons */

/* SPECIAL CASES */
.post-grid-item       { border-radius: 8px; }   /* 3-column grid items */
.badge-small          { border-radius: 10px; }  /* Badges/tags */
.badge-large          { border-radius: 12px; }  /* Larger badges */
.phone-frame          { border-radius: 50px; }  /* iPhone frame */
```

### Corner Rounding Philosophy

**Rule**: The larger the element, the larger the border-radius
**Exception**: Interactive elements (buttons/inputs) use 12-14px regardless of size
**Never**: Use border-radius below 8px (except 0px which is forbidden)

---

## Part 3: STRUCTURE SYSTEM - Page Architecture

### Universal Page Template (Every Page MUST Follow)

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>[Page Name] - BetrFood</title>

    <!-- REQUIRED: Google Font -->
    <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet">

    <style>
        /* REQUIRED: Reset */
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        /* REQUIRED: CSS Variables */
        :root {
            --primary: #22C55E;
            --primary-light: #DCFCE7;
            --primary-dark: #16A34A;
            --secondary: #10B981;
            --background: #F8FAFC;
            --surface: #FFFFFF;
            --text-primary: #0F172A;
            --text-secondary: #64748B;
            --text-muted: #94A3B8;
            --border: #E2E8F0;
            --danger: #EF4444;
            --danger-light: #FEE2E2;
            --warning: #F59E0B;
            --warning-light: #FEF3C7;
        }

        /* REQUIRED: Base Font */
        body {
            font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 40px 20px;
        }

        /* REQUIRED: Phone Frame */
        .phone-frame {
            width: 375px;
            height: 812px;
            background: var(--surface);
            border-radius: 50px;
            box-shadow:
                0 50px 100px rgba(0,0,0,0.3),
                0 15px 35px rgba(0,0,0,0.2),
                inset 0 0 0 2px rgba(255,255,255,0.1);
            overflow: hidden;
            position: relative;
            border: 10px solid #1a1a1a;
        }

        /* REQUIRED: Screen Container */
        .screen {
            width: 100%;
            height: 100%;
            background: var(--background); /* OR var(--surface) for forms */
            display: flex;
            flex-direction: column;
        }

        /* Component styles below... */
    </style>
</head>
<body>
    <div class="phone-frame">
        <div class="screen">
            <!-- Status Bar (REQUIRED) -->
            <!-- Header (OPTIONAL based on page type) -->
            <!-- Content (REQUIRED - flex: 1) -->
            <!-- Navigation (OPTIONAL - only main app screens) -->
        </div>
    </div>
</body>
</html>
```

### Screen Anatomy (Fixed Structure)

**TWO LAYOUTS BASED ON PAGE TYPE:**

#### Layout A: Main App Pages (WITH Bottom Nav)
**Pages**: Home/Feed, Search, AI Chat, Profile
```
┌─────────────────────────────────────┐
│  Status Bar                   48px  │ ← ALWAYS PRESENT
├─────────────────────────────────────┤
│  Header (Optional)            ~56px │ ← Page title/actions (optional)
├─────────────────────────────────────┤
│                                     │
│  Content Area                       │
│  (flex: 1)                          │ ← SCROLLABLE
│  (overflow-y: auto)                 │
│  (padding: 20px)                    │
│                                     │
├─────────────────────────────────────┤
│  Bottom Navigation            84px  │ ← REQUIRED on main app pages
└─────────────────────────────────────┘
```

#### Layout B: Secondary Pages (NO Bottom Nav)
**Pages**: Auth, Settings, Detail pages, Forms, Premium
```
┌─────────────────────────────────────┐
│  Status Bar                   48px  │ ← ALWAYS PRESENT
├─────────────────────────────────────┤
│  Header with Back Button      56px  │ ← Usually has back button
├─────────────────────────────────────┤
│                                     │
│  Content Area                       │
│  (flex: 1)                          │ ← SCROLLABLE
│  (overflow-y: auto)                 │
│  (padding: 20px or 28px)            │
│                                     │
│                                     │
│                                     │
└─────────────────────────────────────┘
```

**Total Height**: 812px (iPhone X/11/12/13/14)
**Total Width**: 375px

### Component: Status Bar (REQUIRED ON ALL PAGES)

```css
.status-bar {
    height: 48px;
    padding: 14px 24px 0;
    display: flex;
    justify-content: space-between;
    align-items: center;
    flex-shrink: 0;
    background: transparent;
}

.status-time {
    font-size: 15px;
    font-weight: 600;
    color: var(--text-primary);
}

.status-icons {
    display: flex;
    gap: 5px;
    align-items: center;
}

.status-icons svg {
    width: 18px;
    height: 18px;
    fill: var(--text-primary);
}
```

**HTML Structure**:
```html
<div class="status-bar">
    <span class="status-time">9:41</span>
    <div class="status-icons">
        <!-- Signal, WiFi, Battery icons -->
    </div>
</div>
```

### Component: Header (Use When Needed)

```css
.header {
    padding: 16px 20px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    background: var(--surface);
    border-bottom: 1px solid var(--border); /* Optional */
    flex-shrink: 0;
}

.header-left {
    display: flex;
    align-items: center;
    gap: 12px;
}

.back-button {
    width: 36px;
    height: 36px;
    border-radius: 50%;
    background: var(--background);
    display: flex;
    align-items: center;
    justify-content: center;
    border: none;
    cursor: pointer;
}

.back-button svg {
    width: 20px;
    height: 20px;
    stroke: var(--text-primary);
    stroke-width: 2;
    fill: none;
}

.header-title {
    font-size: 18px;
    font-weight: 700;
    color: var(--text-primary);
}
```

### Component: Content Area (REQUIRED)

```css
.content {
    flex: 1;
    overflow-y: auto;
    padding: 20px;
}

/* For pages with cards/sections */
.content-with-background {
    background: var(--background);
}

/* For form pages */
.content-form {
    background: var(--surface);
    padding: 16px 28px 30px;
}
```

### Component: Bottom Navigation
**See dedicated "BOTTOM NAVIGATION - When to Include" section below for:**
- When to include bottom nav (decision tree)
- Complete HTML structure
- CSS implementation
- Icon specifications
- Active state rules

---

## Part 4: SPACING SYSTEM - Exact Pixel Values

### Spacing Scale (Only These Values)

```
4px   → Icon-to-text gaps, tight internal spacing
8px   → Standard component gaps, small padding
12px  → Component padding, medium gaps
14px  → Special: input padding, medium spacing
16px  → Section padding, list item padding
18px  → Card/section internal padding
20px  → Page side margins (STANDARD)
24px  → Section separation, large gaps
28px  → Form page horizontal padding
32px  → Large section breaks
40px  → Extra large breaks (rare)
```

### Page Padding Rules

```css
/* ALL PAGES (Side Margins) */
.content {
    padding: 20px;  /* Top, Right, Bottom, Left */
}

/* FORM PAGES (More Horizontal Padding) */
.content-form {
    padding: 16px 28px 30px;  /* Top=16px, Sides=28px, Bottom=30px */
}

/* PROFILE HEADER (Specific Padding) */
.profile-header {
    padding: 16px 20px 20px;  /* Top=16px, Sides=20px, Bottom=20px */
}

/* CARD PADDING */
.card {
    padding: 18px;  /* All sides equal */
}

/* SECTION SPACING */
.section {
    margin-bottom: 14px;  /* Between sections */
}

.section-large-gap {
    margin-bottom: 24px;  /* Larger gaps */
}
```

### List Item Spacing

```css
/* USER LIST ITEM */
.user-item {
    padding: 12px 0;  /* Vertical only */
    border-bottom: 1px solid var(--border);
}

.user-item:last-child {
    border-bottom: none;
}

/* SETTINGS ITEM */
.settings-item {
    padding: 14px 16px;  /* Vertical=14px, Horizontal=16px */
    border-bottom: 1px solid var(--border);
}
```

### Gap Rules (Flexbox/Grid)

```css
/* NAVIGATION ITEMS */
.bottom-nav {
    gap: 0;  /* No gap, use justify-content: space-around */
}

/* STAT DISPLAY */
.stats {
    gap: 24px;  /* Space between stat items */
}

/* BUTTON GROUPS */
.button-group {
    gap: 12px;  /* Between buttons */
}

/* POST GRID */
.post-grid {
    gap: 3px;  /* Tight grid */
}

/* FORM FIELDS */
.form-fields {
    gap: 16px;  /* Between input fields */
}
```

---

## Part 5: TYPOGRAPHY SYSTEM - Exact Specifications

### Font Import (REQUIRED)

```html
<link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet">
```

### Font Family Declaration

```css
body {
    font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif;
}
```

### Type Scale (Exact CSS Classes)

```css
/* HEADINGS */
.h1-welcome {
    font-size: 26px;
    font-weight: 800;
    color: var(--text-primary);
    line-height: 1.2;
}

.h1-form {
    font-size: 24px;
    font-weight: 800;
    color: var(--text-primary);
    line-height: 1.2;
}

.h2-name {
    font-size: 20px;
    font-weight: 800;
    color: var(--text-primary);
    line-height: 1.2;
}

.h2-header {
    font-size: 18px;
    font-weight: 700;
    color: var(--text-primary);
    line-height: 1.2;
}

.h3-section {
    font-size: 16px;
    font-weight: 700;
    color: var(--text-primary);
    line-height: 1.3;
}

/* BODY TEXT */
.body-primary {
    font-size: 15px;
    font-weight: 400;
    color: var(--text-primary);
    line-height: 1.5;
}

.body-secondary {
    font-size: 13px;
    font-weight: 400;
    color: var(--text-secondary);
    line-height: 1.5;
}

.body-small {
    font-size: 12px;
    font-weight: 400;
    color: var(--text-secondary);
    line-height: 1.4;
}

/* LABELS */
.label-form {
    font-size: 12px;
    font-weight: 700;
    color: var(--text-primary);
    margin-bottom: 8px;
}

.label-stat {
    font-size: 11px;
    font-weight: 500;
    color: var(--text-muted);
    text-transform: uppercase;
    letter-spacing: 0.5px;
}

/* META TEXT */
.meta-username {
    font-size: 12px;
    font-weight: 400;
    color: var(--text-muted);
}

.meta-timestamp {
    font-size: 11px;
    font-weight: 400;
    color: var(--text-muted);
}

/* BUTTONS */
.btn-text-primary {
    font-size: 16px;
    font-weight: 700;
    color: white;
}

.btn-text-secondary {
    font-size: 14px;
    font-weight: 700;
}

.btn-text-small {
    font-size: 12px;
    font-weight: 700;
}

/* INPUT TEXT */
.input-text {
    font-size: 15px;
    font-weight: 400;
    color: var(--text-primary);
}

.input-placeholder {
    color: var(--text-muted);
}
```

### Typography Decision Matrix

| Element | Class | Size | Weight | Color |
|---------|-------|------|--------|-------|
| Welcome screen title | `.h1-welcome` | 26px | 800 | text-primary |
| Sign up title | `.h1-form` | 24px | 800 | text-primary |
| User name (profile) | `.h2-name` | 20px | 800 | text-primary |
| Page header | `.h2-header` | 18px | 700 | text-primary |
| Section title | `.h3-section` | 16px | 700 | text-primary |
| Primary body text | `.body-primary` | 15px | 400 | text-primary |
| Bio/description | `.body-secondary` | 13px | 400 | text-secondary |
| Small text | `.body-small` | 12px | 400 | text-secondary |
| Form label | `.label-form` | 12px | 700 | text-primary |
| Stat label (Posts/Followers) | `.label-stat` | 11px | 500 | text-muted |
| @username | `.meta-username` | 12px | 400 | text-muted |
| Timestamp | `.meta-timestamp` | 11px | 400 | text-muted |
| Primary button text | `.btn-text-primary` | 16px | 700 | white |
| Secondary button text | `.btn-text-secondary` | 14px | 700 | varies |
| Small button text | `.btn-text-small` | 12px | 700 | varies |
| Input field text | `.input-text` | 15px | 400 | text-primary |

---

## Part 6: COMPONENT LIBRARY - Copy-Paste Ready

### Primary Button

```css
.btn-primary {
    height: 52px;
    width: 100%;
    background: linear-gradient(135deg, var(--primary) 0%, var(--secondary) 100%);
    border: none;
    border-radius: 14px;
    color: white;
    font-size: 16px;
    font-weight: 700;
    font-family: inherit;
    cursor: pointer;
    box-shadow: 0 4px 14px rgba(34, 197, 94, 0.35);
    transition: all 0.2s;
}

.btn-primary:hover {
    transform: translateY(-2px);
    box-shadow: 0 6px 20px rgba(34, 197, 94, 0.4);
}

.btn-primary:active {
    transform: translateY(0);
}
```

### Secondary Button

```css
.btn-secondary {
    height: 48px;
    padding: 0 24px;
    background: var(--surface);
    border: 2px solid var(--border);
    border-radius: 12px;
    color: var(--text-primary);
    font-size: 14px;
    font-weight: 700;
    font-family: inherit;
    cursor: pointer;
    transition: all 0.2s;
}

.btn-secondary:hover {
    border-color: var(--primary);
    background: var(--primary-light);
}
```

### Follow Button

```css
.btn-follow {
    height: 32px;
    padding: 0 16px;
    border-radius: 10px;
    border: 2px solid var(--primary);
    background: transparent;
    color: var(--primary);
    font-size: 12px;
    font-weight: 700;
    font-family: inherit;
    cursor: pointer;
    transition: all 0.2s;
}

.btn-follow.following {
    background: var(--primary);
    color: white;
}
```

### Input Field

```css
.input-standard {
    width: 100%;
    height: 52px;
    border: 2px solid var(--border);
    border-radius: 14px;
    padding: 0 18px;
    font-size: 15px;
    font-family: inherit;
    background: var(--surface);
    color: var(--text-primary);
    transition: all 0.2s;
}

.input-standard:focus {
    outline: none;
    border-color: var(--primary);
    box-shadow: 0 0 0 4px rgba(34, 197, 94, 0.1);
}

.input-standard::placeholder {
    color: var(--text-muted);
}
```

### Card Container

```css
.card {
    background: var(--surface);
    border-radius: 18px;
    padding: 18px;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.05);
}
```

### Avatar (Small)

```css
.avatar-small {
    width: 50px;
    height: 50px;
    border-radius: 14px;
    background: linear-gradient(135deg, #dcfce7 0%, #bbf7d0 100%);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 24px;
    flex-shrink: 0;
}
```

### Avatar (Large - Profile)

```css
.avatar-large {
    width: 88px;
    height: 88px;
    border-radius: 24px;
    background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 50px;
    box-shadow: 0 6px 20px rgba(0, 0, 0, 0.12);
}
```

### Tag/Badge

```css
.tag {
    display: inline-block;
    padding: 8px 12px;
    border-radius: 10px;
    background: var(--surface);
    border: 1px solid var(--border);
    font-size: 12px;
    font-weight: 600;
    color: var(--text-primary);
}

.tag-danger {
    background: var(--danger-light);
    border-color: #FECACA;
    color: var(--danger);
}

.tag-warning {
    background: var(--warning-light);
    border-color: #FDE68A;
    color: #B45309;
}
```

### Stat Display

```css
.stats {
    display: flex;
    gap: 24px;
    margin-top: 16px;
}

.stat-item {
    text-align: center;
}

.stat-value {
    font-size: 18px;
    font-weight: 800;
    color: var(--text-primary);
    margin-bottom: 4px;
}

.stat-label {
    font-size: 11px;
    font-weight: 500;
    color: var(--text-muted);
    text-transform: uppercase;
    letter-spacing: 0.3px;
}
```

### Post Grid

```css
.post-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 3px;
}

.post-item {
    aspect-ratio: 1;
    border-radius: 8px;
    background: linear-gradient(135deg, #f1f5f9 0%, #e2e8f0 100%);
    cursor: pointer;
}
```

---

## Part 7: SHADOW SYSTEM - Exact Specifications

### Shadow Scale

```css
/* NO SHADOW */
box-shadow: none;

/* SUBTLE (Cards, Sections) */
box-shadow: 0 4px 20px rgba(0, 0, 0, 0.05);

/* MEDIUM (Avatars) */
box-shadow: 0 6px 20px rgba(0, 0, 0, 0.12);

/* PRIMARY BUTTON (Default) */
box-shadow: 0 4px 14px rgba(34, 197, 94, 0.35);

/* PRIMARY BUTTON (Hover) */
box-shadow: 0 6px 20px rgba(34, 197, 94, 0.4);

/* LOGO/SPECIAL */
box-shadow: 0 8px 24px rgba(34, 197, 94, 0.35);

/* PHONE FRAME */
box-shadow:
    0 50px 100px rgba(0, 0, 0, 0.3),
    0 15px 35px rgba(0, 0, 0, 0.2),
    inset 0 0 0 2px rgba(255, 255, 255, 0.1);
```

### Shadow Usage Rules

```
Cards/Containers:     0 4px 20px rgba(0, 0, 0, 0.05)
Avatars (All Sizes):  0 6px 20px rgba(0, 0, 0, 0.12)
Primary Buttons:      0 4px 14px rgba(34, 197, 94, 0.35)
Button Hover:         0 6px 20px rgba(34, 197, 94, 0.4)
Logo Containers:      0 8px 24px rgba(34, 197, 94, 0.35)
Phone Frame:          Multi-layer (see above)
Input Focus:          0 0 0 4px rgba(34, 197, 94, 0.1) (GLOW, not shadow)
```

---

## Part 8: ICON SYSTEM - Specifications

### Icon Rules (Absolute)

```css
/* ALL ICONS MUST FOLLOW THESE RULES */
.icon {
    stroke-width: 2px;
    fill: none;
    stroke-linecap: round;
    stroke-linejoin: round;
}

/* SIZE RULES */
.icon-nav {
    width: 24px;
    height: 24px;
}

.icon-header {
    width: 20px;
    height: 20px;
}

.icon-close {
    width: 18px;
    height: 18px;
}

.icon-section {
    width: 16px;
    height: 16px;
}

/* COLOR RULES */
.icon-default {
    stroke: var(--text-muted);
}

.icon-active {
    stroke: var(--primary);
}

.icon-header {
    stroke: var(--text-primary);
}
```

### Icon Library

**Recommended**: Feather Icons (https://feathericons.com/)
**Reason**: All stroke-based, consistent 2px width, perfect for BetrFood

**Common Icons**:
- Home: `<svg viewBox="0 0 24 24"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></svg>`
- Search: `<svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>`
- Plus: `<svg viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>`
- User: `<svg viewBox="0 0 24 24"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>`
- Back: `<svg viewBox="0 0 24 24"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>`

---

## Part 9: PAGE TYPE SPECIFICATIONS

### Type 1: Main App Pages (WITH Bottom Nav) ⭐
**Examples**: Home/Feed, Search/Explore, AI Chat, Profile

**Background**: `var(--background)` #F8FAFC
**Bottom Navigation**: ✅ **REQUIRED** (84px)
**Structure**:
- Status Bar (48px)
- Header (optional - page title/actions)
- Content area (scrollable, padding: 20px)
- Bottom Navigation (84px) ← **MUST INCLUDE**

```css
.main-app-page .screen {
    background: var(--background);
}
```

**Reference File**: `/html/pages/ai/chat-active.html`

---

### Type 2: Authentication Pages (NO Bottom Nav)
**Examples**: Welcome, Sign Up, Login, Forgot Password

**Background**: `var(--surface)` #FFFFFF OR gradient for welcome
**Bottom Navigation**: ❌ **NONE**
**Structure**:
- Status Bar (48px)
- Close button (top-left, optional)
- Logo (centered, 72×72px)
- Form content (scrollable, padding: 40px 28px 30px)
- Primary CTA button at bottom

```css
.auth-page .screen {
    background: var(--surface);
}

.auth-welcome .screen {
    background: linear-gradient(180deg, var(--primary-light) 0%, var(--surface) 40%);
}
```

**Reference File**: `/html/pages/auth/forgot-password.html`

---

### Type 3: Secondary List Pages (NO Bottom Nav)
**Examples**: Followers, Following, Likes List

**Background**: `var(--surface)` #FFFFFF
**Bottom Navigation**: ❌ **NONE**
**Structure**:
- Status Bar (48px)
- Header with back button + title (56px)
- Search bar (optional)
- Scrollable list (padding: 20px)

```css
.list-page .screen {
    background: var(--surface);
}
```

---

### Type 4: Settings Pages (NO Bottom Nav)
**Examples**: Settings, Edit Profile, Health Info, Account Settings

**Background**: `var(--background)` #F8FAFC
**Bottom Navigation**: ❌ **NONE**
**Structure**:
- Status Bar (48px)
- Header with back button + title (56px)
- Section groups (cards on gray background, padding: 20px)
- Scrollable content

```css
.settings-page .screen {
    background: var(--background);
}

.settings-section {
    background: var(--surface);
    border-radius: 18px;
    overflow: hidden;
    margin-bottom: 14px;
}
```

---

### Type 5: Modal/Detail Pages (NO Bottom Nav)
**Examples**: Post Detail, Premium Subscription, Creator Earnings

**Background**: `var(--surface)` #FFFFFF
**Bottom Navigation**: ❌ **NONE**
**Structure**:
- Status Bar (48px)
- Header with back button (56px)
- Full content area (padding: 20px)

```css
.modal-page .screen {
    background: var(--surface);
}
```

**Reference File**: `/html/pages/premium/subscription.html`

---

### Quick Reference: Bottom Nav Decision

```
INCLUDE Bottom Nav (✅):     EXCLUDE Bottom Nav (❌):
- Home/Feed                  - Sign Up/Login
- Search/Explore             - Forgot Password
- AI Chat                    - Settings
- Profile                    - Edit Profile
                             - Followers/Following
                             - Post Detail
                             - Premium pages
                             - Health Info
                             - Any page with "Back" button
```

---

## Part 10: QUALITY CHECKLIST

### Before Publishing ANY Page, Verify:

**Colors** ✓
- [ ] All colors use CSS variables (no hardcoded hex)
- [ ] Background is either `#F8FAFC` or `#FFFFFF`
- [ ] All text uses `text-primary`, `text-secondary`, or `text-muted`
- [ ] All borders use `var(--border)`
- [ ] Primary buttons use gradient (135deg)

**Shapes** ✓
- [ ] NO border-radius values outside the scale (8/10/12/14/18/20/24/28/50)
- [ ] NO sharp corners (0px) anywhere
- [ ] Buttons use 12px or 14px radius
- [ ] Cards use 18px radius
- [ ] Avatars use appropriate radius for size

**Structure** ✓
- [ ] Phone frame is 375×812px
- [ ] Status bar is present (48px height)
- [ ] Content area has `flex: 1` and `overflow-y: auto`
- [ ] Bottom nav is 84px (if present)
- [ ] Plus Jakarta Sans font is loaded

**Spacing** ✓
- [ ] Page padding is 20px (or 28px for forms)
- [ ] All spacing uses the 4px scale
- [ ] No random padding/margin values

**Typography** ✓
- [ ] Font family is Plus Jakarta Sans
- [ ] Font sizes match the type scale exactly
- [ ] Font weights are 400/500/600/700/800 only
- [ ] Line heights are appropriate (1.2-1.5)

**Shadows** ✓
- [ ] Shadows match the shadow scale
- [ ] Primary buttons have green shadow
- [ ] Cards have subtle black shadow
- [ ] Focus states have 4px glow

**Icons** ✓
- [ ] All icons are 2px stroke, no fill
- [ ] Icon sizes are 24/20/18/16px only
- [ ] Icons use stroke colors from variables

**Interactions** ✓
- [ ] All transitions are 0.2s
- [ ] Hover states work correctly
- [ ] Focus states visible
- [ ] Buttons have proper touch targets (≥42px)

---

## Part 11: DECISION FLOWCHARTS

### "What background color should I use?"

```
START
  ↓
Is this a form page (Sign Up, Login, etc.)?
  ├─ YES → Use var(--surface) #FFFFFF
  └─ NO → ↓
         Does it have multiple sections/cards?
           ├─ YES → Use var(--background) #F8FAFC
           └─ NO → Use var(--surface) #FFFFFF
```

### "What border-radius should I use?"

```
START
  ↓
What element is it?
  ├─ Button → 12px or 14px (14px for large CTAs)
  ├─ Input → 14px
  ├─ Card → 18px
  ├─ Avatar → 14px (small), 18px (medium), 24px (large)
  ├─ Nav Item → 12px
  ├─ Badge → 10px
  ├─ Post Grid → 8px
  └─ Icon Button → 50% (circular)
```

### "Does this page need bottom navigation?"

```
START
  ↓
Is this one of the main app screens?
  ├─ Home/Feed → YES
  ├─ Search → YES
  ├─ Profile → YES
  └─ All others (Settings, Sign Up, Detail pages) → NO
```

### "What text color should I use?"

```
START
  ↓
What is the text?
  ├─ Heading/Title → var(--text-primary)
  ├─ Primary body text → var(--text-primary)
  ├─ Description/Bio → var(--text-secondary)
  ├─ @username/timestamp → var(--text-muted)
  ├─ Placeholder → var(--text-muted)
  └─ Label (form) → var(--text-primary)
```

---

## Part 12: FORBIDDEN PATTERNS

### NEVER DO THESE:

❌ **Colors**:
- Custom hex colors not in the variable system
- Background colors other than `#F8FAFC` or `#FFFFFF`
- Border colors other than `#E2E8F0`

❌ **Shapes**:
- Sharp corners (0px border-radius)
- Random border-radius values (5px, 7px, 15px, etc.)
- Inconsistent corner rounding

❌ **Typography**:
- System fonts (Arial, Helvetica, etc.)
- Font weights other than 400/500/600/700/800
- Random font sizes not in the scale

❌ **Spacing**:
- Non-4px-scale values (3px, 5px, 11px, etc.)
- Inconsistent padding across similar components

❌ **Shadows**:
- Shadows with hard black colors
- Random shadow values
- Missing shadows on buttons

❌ **Icons**:
- Filled icons (except social logos)
- Inconsistent stroke widths
- Icons not from Feather or similar stroke libraries

❌ **Structure**:
- Missing status bar
- Wrong phone frame dimensions
- Missing overflow-y on content area

---

## FINAL RULE: When in Doubt, Reference Existing

**Use the correct reference file for your page type:**

### Reference Files (100% Design System Compliant)

**For pages WITHOUT bottom navigation** (Auth, Settings, Detail pages):
- `/Users/arminrad/WebstormProjects/BetrFood/html/pages/auth/forgot-password.html`
- `/Users/arminrad/WebstormProjects/BetrFood/html/pages/premium/subscription.html`

**For pages WITH bottom navigation** (Main app screens):
- `/Users/arminrad/WebstormProjects/BetrFood/html/pages/ai/chat-active.html`
- `/Users/arminrad/WebstormProjects/BetrFood/html/pages/profile/profile.html`

### How to Use Reference Files:

1. Determine if your page needs bottom nav (see decision tree below)
2. Open the appropriate reference file
3. Copy the exact structure, colors, and spacing
4. Modify only the content, not the design system

---

## BOTTOM NAVIGATION - When to Include

### Decision Tree: "Does my page need bottom navigation?"

```
START
  ↓
Is this one of the 4 MAIN APP SCREENS?
  ├─ Home/Feed → YES (Home icon active)
  ├─ Search/Explore → YES (Search icon active)
  ├─ AI Chat → YES (Chat/Circle icon active)
  ├─ Profile → YES (Profile icon active)
  └─ All other pages → NO
       Examples:
       - Sign Up/Login → NO
       - Forgot Password → NO
       - Settings → NO
       - Edit Profile → NO
       - Followers/Following → NO
       - Post Detail → NO
       - Health Info → NO
       - Premium pages → NO
       - Any page with a "Back" button → NO
```

### Bottom Navigation Structure (Copy This Exactly)

```html
<!-- Place AFTER content area, BEFORE closing .screen div -->
<div class="nav-bar">
    <div class="nav-item">
        <svg viewBox="0 0 24 24">
            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
            <polyline points="9 22 9 12 15 12 15 22"/>
        </svg>
    </div>
    <div class="nav-item">
        <svg viewBox="0 0 24 24">
            <circle cx="11" cy="11" r="8"/>
            <path d="m21 21-4.35-4.35"/>
        </svg>
    </div>
    <div class="nav-item active">
        <svg viewBox="0 0 24 24">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
        </svg>
    </div>
    <div class="nav-item">
        <svg viewBox="0 0 24 24">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
            <circle cx="12" cy="7" r="4"/>
        </svg>
    </div>
</div>
```

### Bottom Navigation CSS (Required)

```css
.nav-bar {
    background: var(--surface);
    border-top: 1px solid var(--border);
    display: flex;
    justify-content: space-around;
    align-items: flex-start;
    padding: 8px 8px 20px;
    flex-shrink: 0;
}

.nav-item {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 4px;
    padding: 8px 12px;
    border-radius: 12px;
    cursor: pointer;
    transition: all 0.2s;
}

.nav-item.active {
    background: var(--primary-light);
}

.nav-item svg {
    width: 24px;
    height: 24px;
    stroke: var(--text-muted);
    fill: none;
    stroke-width: 2;
}

.nav-item.active svg {
    stroke: var(--primary);
}
```

### Navigation Icons (4 Items - Standard Order)

| Position | Icon | Active On | SVG Path |
|----------|------|-----------|----------|
| 1 (Left) | Home | Feed/Home page | `<path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>` |
| 2 | Search | Search/Explore page | `<circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>` |
| 3 | AI Chat | AI Chat & Messages page | `<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>` (chat bubble icon) |
| 4 (Right) | Profile | Profile page | `<path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>` |

### Active State Rules

**Set `.active` class on the nav-item that corresponds to the current page:**
- Feed page → 1st nav-item (Home)
- Search page → 2nd nav-item (Search)
- AI Chat page → 3rd nav-item (AI/Create)
- Profile page → 4th nav-item (Profile)

---

**End of Unified Design Specification**

This document is the single source of truth. Any conflicts between this and other documents should be resolved in favor of this specification.
