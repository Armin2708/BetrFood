# BetrFood Design System - AI Development Guide

This document defines the canonical design standards for BetrFood's mobile app UI. All new pages MUST follow these specifications exactly to maintain visual consistency.

---

## Core Design Principles

1. **Modern & Clean**: Minimal, focused interfaces with ample whitespace
2. **Health-Focused Green Palette**: Primary color emphasizes health and food
3. **Rounded & Friendly**: Soft corners throughout (no sharp edges)
4. **Mobile-First**: Optimized for 375x812px iPhone frame
5. **High Contrast**: Accessible text hierarchy with clear visual separation

---

## Color System

### CSS Variables (REQUIRED)
```css
--primary: #22C55E;           /* Main brand green - use for CTAs, active states */
--primary-light: #DCFCE7;     /* Backgrounds, subtle highlights */
--primary-dark: #16A34A;      /* Hover states, darker accents */
--secondary: #10B981;         /* Secondary actions, gradient end */

--background: #F8FAFC;        /* Page background (light gray) */
--surface: #FFFFFF;           /* Card/container backgrounds */

--text-primary: #0F172A;      /* Headings, primary text (near black) */
--text-secondary: #64748B;    /* Body text, descriptions (medium gray) */
--text-muted: #94A3B8;        /* Placeholder text, disabled (light gray) */

--border: #E2E8F0;            /* Borders, dividers */

--danger: #EF4444;            /* Error states, destructive actions */
--danger-light: #FEE2E2;      /* Danger backgrounds */
--warning: #F59E0B;           /* Warning states */
--warning-light: #FEF3C7;     /* Warning backgrounds */
```

### Gradient Patterns
1. **Primary Gradient (Buttons)**: `linear-gradient(135deg, var(--primary) 0%, var(--secondary) 100%)`
2. **Welcome Screen Background**: `linear-gradient(180deg, var(--primary-light) 0%, var(--surface) 40%)`
3. **Avatar Gradients**: Use pastel gradients (see Avatar section)

---

## Typography

### Font Family
```css
font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif;
```
**Import URL**: `https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap`

### Text Hierarchy

| Element | Size | Weight | Color | Usage |
|---------|------|--------|-------|-------|
| **H1 (Welcome)** | 26px | 800 | text-primary | Welcome/landing screens |
| **H1 (Sign Up)** | 24px | 800 | text-primary | Form page titles |
| **H2 (Profile Name)** | 20px | 800 | text-primary | User names, main headings |
| **H2 (List Title)** | 18px | 700 | text-primary | Page headers (Following, Settings) |
| **Body (Profile Bio)** | 13px | 400 | text-secondary | User bios, descriptions |
| **Body (Form Labels)** | 12px | 700 | text-primary | Input field labels |
| **Small (User Handle)** | 12px | 400 | text-muted | @usernames, metadata |
| **Tiny (Stats Label)** | 11px | 500 | text-muted | ALL CAPS labels |
| **Button Primary** | 16px | 700 | white | Main CTA buttons |
| **Button Small** | 14px | 700 | varies | Secondary/tab buttons |
| **Input Text** | 15px | 400 | text-primary | Form inputs |

### Text Styling Rules
- **Line Height**: Body text 1.4-1.5, headings 1.2
- **Letter Spacing**: ALL CAPS text gets 0.3-1px tracking
- **Text Transform**: Use uppercase for stat labels, section headers

---

## Layout Structure

### Mobile Frame
- **Width**: 375px
- **Height**: 812px
- **Border Radius**: 50px
- **Border**: 10px solid #1a1a1a (phone bezel)
- **Notch**: 150px wide × 28px tall, centered at top

### Screen Anatomy (Fixed Structure)
```
┌─────────────────────────────────┐
│   Status Bar (48px)             │
├─────────────────────────────────┤
│   Header/Content Area           │
│   (flex: 1, overflow-y: auto)   │
│                                 │
│                                 │
│                                 │
├─────────────────────────────────┤
│   Navigation Bar (84px)         │  ← ONLY on main app screens
└─────────────────────────────────┘
```

### Spacing Scale (Padding/Margins)
- **4px**: Tight gaps (icon-text, badge spacing)
- **8px**: Standard spacing within components
- **12px**: Component padding, medium gaps
- **14-18px**: Card/section padding
- **20px**: Page side margins
- **24px**: Section spacing
- **28px**: Form page padding
- **32px**: Large section breaks

### Border Radius Scale
- **8px**: Small items (post grid items)
- **10px**: Small buttons, badges
- **12px**: Standard buttons, input fields, tabs
- **14px**: Large input fields, search bars
- **18px**: Cards, sections
- **20px**: Logo containers
- **24px**: Profile avatars (medium)
- **50px**: Circular buttons (use 50% for true circles)

---

## Components

### 1. Status Bar
```css
height: 48px;
padding: 14px 24px 0;
display: flex;
justify-content: space-between;
align-items: center;
background: transparent;
flex-shrink: 0;
```
- **Left**: Time (15px, weight 600, text-primary)
- **Right**: Signal/battery icons (18×18px, filled)

### 2. Navigation Bar (Bottom Nav)
```css
height: 84px;
background: var(--surface);
border-top: 1px solid var(--border);
display: flex;
justify-content: space-around;
padding: 12px 8px 0;
flex-shrink: 0;
```

**Nav Item Structure**:
- Icons: 24×24px, stroke-width: 2, no fill
- Active state: background var(--primary-light), icon stroke var(--primary)
- Inactive state: icon stroke var(--text-muted)
- Padding: 8px 12px, border-radius: 12px

**Standard Icons Order**: Home → Search → Add Post → Favorites → Profile

### 3. Buttons

#### Primary Button (CTAs)
```css
height: 52px;
background: linear-gradient(135deg, var(--primary) 0%, var(--secondary) 100%);
border-radius: 14px;
color: white;
font-size: 16px;
font-weight: 700;
box-shadow: 0 4px 14px rgba(34, 197, 94, 0.35);
```
**Hover**: `transform: translateY(-2px)` + stronger shadow

#### Secondary Button (Border Style)
```css
height: 42px;
border: 2px solid var(--border);
border-radius: 12px;
background: var(--surface);
```

#### Small Follow Button
```css
padding: 8px 16px;
border-radius: 10px;
border: 2px solid var(--primary);
background: transparent;
color: var(--primary);
font-size: 12px;
font-weight: 700;
```
**Following State**: Fill with var(--primary), white text

#### Social Login Buttons
```css
height: 50px;
border: 2px solid var(--border);
border-radius: 14px;
background: var(--surface);
```
**Hover**: border-color var(--primary), background var(--primary-light)

### 4. Input Fields

#### Standard Input
```css
height: 52px;
border: 2px solid var(--border);
border-radius: 14px;
padding: 0 18px;
font-size: 15px;
background: var(--surface);
color: var(--text-primary);
```
**Focus State**: border-color var(--primary), box-shadow `0 0 0 4px rgba(34, 197, 94, 0.1)`
**Placeholder**: color var(--text-muted)

#### Search Input
```css
height: 46px;
border: none;
border-radius: 14px;
padding: 0 18px 0 46px;  /* Left space for icon */
background: var(--background);
```
**Icon Position**: absolute left 16px, 18×18px, stroke var(--text-muted)

### 5. Cards & Containers

#### Profile Header Card
```css
background: var(--surface);
padding: 16px 20px 20px;
border-radius: 0 0 28px 28px;
box-shadow: 0 4px 20px rgba(0,0,0,0.05);
```

#### Health Info Section
```css
background: var(--background);
border-radius: 18px;
padding: 18px;
margin-bottom: 14px;
```

#### Settings Group
```css
background: var(--surface);
border-radius: 18px;
overflow: hidden;  /* For internal borders */
```

### 6. Avatars

#### Large Profile Avatar
```css
width: 88px;
height: 88px;
border-radius: 24px;
box-shadow: 0 6px 20px rgba(0,0,0,0.12);
```
**Background**: Use food-themed emoji (50px font-size) over gradient

#### Small User Avatar (Lists)
```css
width: 50px;
height: 50px;
border-radius: 14px;
```
**Background**: Pastel gradients at 135deg

**Gradient Examples**:
- Yellow: `linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)`
- Green: `linear-gradient(135deg, #dcfce7 0%, #bbf7d0 100%)`
- Red: `linear-gradient(135deg, #fee2e2 0%, #fecaca 100%)`
- Blue: `linear-gradient(135deg, #e0e7ff 0%, #c7d2fe 100%)`
- Pink: `linear-gradient(135deg, #fce7f3 0%, #fbcfe8 100%)`
- Cyan: `linear-gradient(135deg, #cffafe 0%, #a5f3fc 100%)`
- Purple: `linear-gradient(135deg, #f3e8ff 0%, #e9d5ff 100%)`
- Lime: `linear-gradient(135deg, #ecfccb 0%, #d9f99d 100%)`

### 7. Tags & Badges

#### Standard Tag
```css
padding: 8px 12px;
border-radius: 10px;
background: var(--surface);
font-size: 12px;
font-weight: 600;
color: var(--text-primary);
border: 1px solid var(--border);
```

#### Danger Tag (Allergies)
```css
background: var(--danger-light);
border-color: #FECACA;
color: var(--danger);
```

#### Warning Tag
```css
background: var(--warning-light);
border-color: #FDE68A;
color: #B45309;
```

### 8. Lists

#### User List Item
```css
display: flex;
align-items: center;
padding: 12px 0;
border-bottom: 1px solid var(--border);
```
**Structure**: Avatar (50px) → Details (flex: 1) → Action Button

**Remove border on last child**: `.user-item:last-child { border-bottom: none; }`

#### Settings Item
```css
display: flex;
align-items: center;
padding: 14px 16px;
border-bottom: 1px solid var(--border);
cursor: pointer;
```
**Structure**: Icon Container (36×36px) → Label (flex: 1) → Arrow Icon (18×18px)
**Hover**: background var(--background)

### 9. Tabs

#### Segmented Control Style
```css
display: flex;
gap: 6px;
background: var(--surface);
padding: 4px;
border-radius: 12px;
```

**Tab Item**:
```css
flex: 1;
padding: 10px 16px;
border-radius: 10px;
font-size: 13px;
font-weight: 600;
color: var(--text-muted);
background: transparent;
```
**Active State**: background var(--primary), color white

### 10. Post Grid
```css
display: grid;
grid-template-columns: repeat(3, 1fr);
gap: 3px;
```

**Post Item**:
```css
aspect-ratio: 1;
border-radius: 8px;
background: linear-gradient(135deg, #f1f5f9 0%, #e2e8f0 100%);
```
**Featured Post**: background `linear-gradient(135deg, var(--primary-light) 0%, #bbf7d0 100%)`

### 11. Stats Display
```css
display: flex;
gap: 24px;
margin-top: 16px;
```

**Stat Item**:
- Value: 18px, weight 800, text-primary
- Label: 11px, weight 500, text-muted, uppercase, letter-spacing 0.3px

### 12. Icons

**Standard Rules**:
- Default size: 20×24px (context-dependent)
- Stroke width: 2px (consistent)
- Fill: none (stroke-only, except social icons)
- Use Feather Icons or similar stroke-based library

**Size Guidelines**:
- Nav icons: 24×24px
- Header icons (settings, back): 20×18px
- Close button: 18×18px
- Section title icons: 16×16px

---

## Screen Types & Templates

### Type 1: Welcome/Login Screen
- Gradient background: 180deg, primary-light → surface at 40%
- Close button: top-left 56px from top, 20px from left
- Logo: 72×72px with gradient, centered
- Content padding: 40px 28px 30px
- Scrollable content area

### Type 2: Profile Screen
- Background: var(--background)
- Rounded header card (28px bottom radius)
- Scrollable posts section
- Bottom navigation bar

### Type 3: List Screen (Following/Followers)
- Background: var(--surface)
- Back button + title header
- Search bar below header
- Scrollable user list
- Bottom navigation bar

### Type 4: Form Screen (Sign Up)
- Background: var(--surface)
- Back button header
- Content padding: 16px 28px 30px
- Labeled inputs (12px bold labels with 8px margin-bottom)
- Scrollable form area

### Type 5: Settings Screen
- Background: var(--background)
- Back button + title header
- Section groups with uppercase 11px titles
- Rounded 18px setting groups
- Scrollable content

---

## Shadows

### Component Shadows
- **Cards**: `0 4px 20px rgba(0,0,0,0.05)`
- **Buttons (Primary)**: `0 4px 14px rgba(34, 197, 94, 0.35)`
- **Button Hover**: `0 6px 20px rgba(34, 197, 94, 0.4)`
- **Avatars**: `0 6px 20px rgba(0,0,0,0.12)`
- **Logo**: `0 8px 24px rgba(34, 197, 94, 0.35)`
- **Phone Frame**: Multi-layer (see below)

### Phone Frame Shadow
```css
box-shadow:
  0 50px 100px rgba(0,0,0,0.3),
  0 15px 35px rgba(0,0,0,0.2),
  inset 0 0 0 2px rgba(255,255,255,0.1);
```

---

## Transitions & Animations

### Standard Transitions
```css
transition: all 0.2s;  /* Default for most interactive elements */
```

### Hover Effects
- **Buttons**: `transform: translateY(-2px)` + shadow increase
- **Settings Items**: `background: var(--background)`
- **Social Buttons**: border-color change + background tint
- **Nav Items**: background change to primary-light

---

## Accessibility Standards

1. **Color Contrast**: All text meets WCAG AA (4.5:1 for normal text)
2. **Focus States**: 4px outer glow with 10% primary opacity
3. **Touch Targets**: Minimum 42px height for interactive elements
4. **Readable Font Sizes**: Minimum 11px, body text 13-15px
5. **Semantic Color Usage**: Red for danger/allergies, orange for warnings

---

## Implementation Checklist

When creating a new page, verify:

- [ ] CSS variables imported from root
- [ ] Plus Jakarta Sans font loaded
- [ ] Phone frame dimensions: 375×812px
- [ ] Status bar at top (48px)
- [ ] Bottom nav bar if main app screen (84px)
- [ ] All border-radius values match scale (no 5px, 7px, etc.)
- [ ] Primary gradient on CTA buttons (135deg angle)
- [ ] Box shadows match component type
- [ ] Text hierarchy uses exact sizes/weights from table
- [ ] Icons are 2px stroke, no fill
- [ ] Hover states have 0.2s transition
- [ ] Focus states have 4px glow
- [ ] Background is #F8FAFC or #FFFFFF only
- [ ] All interactive elements ≥42px height
- [ ] Padding/margins use spacing scale

---

## AI Coding Instructions

**When asked to create a new page:**

1. Start with the phone frame structure (375×812px, 50px radius, #1a1a1a border)
2. Add status bar (48px, time left, icons right)
3. Determine screen type (Welcome/Profile/List/Form/Settings)
4. Apply appropriate background color (var(--background) or var(--surface))
5. Use flex column layout with `flex: 1` for scrollable content
6. Add bottom nav if main app screen (copy nav-bar structure exactly)
7. Import Plus Jakarta Sans in `<head>`
8. Copy CSS variables block to `:root`
9. Match component styles exactly (copy from templates above)
10. Use primary gradient for all CTA buttons (135deg angle)
11. Apply consistent border-radius from scale
12. Add shadows to elevated elements
13. Use stroke-based icons (24×24px for nav, 20×18px for headers)
14. Test hover/focus states with 0.2s transitions
15. Verify text hierarchy matches font table

**Color Selection Rules:**
- Page backgrounds: ONLY use var(--background) or var(--surface)
- Buttons: Primary gradient for CTAs, border style for secondary
- Text: Follow hierarchy table (primary/secondary/muted)
- Borders: Always var(--border)
- Active states: var(--primary) or var(--primary-light)
- Danger/Warning: Use variables, not custom colors

**Forbidden Patterns:**
- Do NOT use sharp corners (0px border-radius)
- Do NOT use colors outside the variable system
- Do NOT use font weights other than 400/500/600/700/800
- Do NOT use filled icons (except social logos)
- Do NOT use box-shadows without rgba opacity
- Do NOT mix spacing units (stick to the 4px scale)
- Do NOT create buttons shorter than 42px

---

## File Structure Reference

**Location**: `/Users/arminrad/WebstormProjects/BetrFood/html/demos/betrfood-screens.html`

**Key Sections to Reference**:
- Lines 15-30: Color variables
- Lines 32-36: Typography setup
- Lines 290-309: Primary button
- Lines 267-288: Input fields
- Lines 373-538: Profile components
- Lines 595-732: List components
- Lines 733-806: Health tags/sections
- Lines 859-951: Settings components

**When in doubt**, directly reference the source file for exact CSS values.

---

## Version

**Design System Version**: 1.0
**Last Updated**: 2026-02-05
**Source File**: betrfood-screens.html
**Maintained By**: BetrFood Design Team
