# How to Run BetrFood HTML Prototypes

There are several ways to view and interact with the HTML prototypes depending on your needs.

## Quick Start - Option 1: Multi-Screen Demos (Recommended for Overview)

The easiest way to see multiple screens at once is to open the comprehensive demo files:

### Using a Web Browser
```bash
# From the project root
open html/demos/betrfood-screens.html

# Or specific demos
open html/demos/betrfood-ai-chatbot-screens.html
open html/demos/upload-camera-pantry-screens.html
```

### What You'll See
- **betrfood-screens.html** - Shows multiple screens in a grid layout with full styling
- **betrfood-ai-chatbot-screens.html** - AI chatbot flow with all screens
- **upload-camera-pantry-screens.html** - Content upload and pantry management flow

These demos have **all styles embedded** and work perfectly by just double-clicking the file.

## Option 2: Individual Pages with Live Server (Best for Development)

Individual pages in `html/pages/` reference a missing `styles.css` file. To view them properly, you have two options:

### A. Using Python's Built-in Server
```bash
# Navigate to the html directory
cd html

# Start a simple HTTP server
python3 -m http.server 8000

# Open in browser
open http://localhost:8000/pages/feed/index.html
```

### B. Using Node.js Live Server
```bash
# Install live-server globally (one-time)
npm install -g live-server

# Navigate to html directory
cd html

# Start live server
live-server

# It will auto-open your browser to http://localhost:8080
```

### C. Using VS Code Live Server Extension
1. Install the "Live Server" extension in VS Code
2. Right-click any HTML file
3. Select "Open with Live Server"

### D. Using WebStorm's Built-in Server
Since you're using WebStorm:
1. Right-click any HTML file (e.g., `html/pages/feed/index.html`)
2. Select **"Open in Browser"** or press `Ctrl+Shift+X` (Windows/Linux) or `Cmd+Shift+X` (Mac)
3. WebStorm will automatically start its built-in server

## Option 3: Fix Individual Pages (Create Missing CSS)

The individual pages need a `styles.css` file. Here's how to create one:

### Quick Fix - Create a Basic Stylesheet
```bash
# Create styles.css in the html directory
cat > html/styles.css << 'EOF'
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
    --warning: #F59E0B;
}

* {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
}

body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    background: var(--background);
    color: var(--text-primary);
    max-width: 430px;
    margin: 0 auto;
    min-height: 100vh;
}

.header {
    background: var(--surface);
    padding: 16px;
    border-bottom: 1px solid var(--border);
    display: flex;
    align-items: center;
    justify-content: space-between;
}

.header-tabs {
    display: flex;
    gap: 16px;
}

.header-tab {
    padding: 8px 16px;
    border-radius: 20px;
    cursor: pointer;
    font-weight: 500;
    color: var(--text-secondary);
}

.header-tab.active {
    background: var(--primary-light);
    color: var(--primary-dark);
}

.icon-button {
    background: none;
    border: none;
    font-size: 20px;
    cursor: pointer;
    padding: 8px;
}

.feed-container {
    padding: 16px;
}

.feed-item {
    background: var(--surface);
    border-radius: 12px;
    padding: 16px;
    margin-bottom: 16px;
    box-shadow: 0 1px 3px rgba(0,0,0,0.1);
}

.feed-item-header {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-bottom: 12px;
}

.avatar {
    width: 40px;
    height: 40px;
    border-radius: 50%;
    background: var(--primary-light);
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: 600;
    color: var(--primary-dark);
}

.feed-item-content {
    font-size: 15px;
    line-height: 1.5;
    margin-bottom: 12px;
}

.feed-item-meta {
    display: flex;
    gap: 16px;
    color: var(--text-secondary);
    font-size: 14px;
}

.button {
    background: var(--primary);
    color: white;
    border: none;
    padding: 12px 24px;
    border-radius: 8px;
    font-weight: 600;
    cursor: pointer;
    width: 100%;
    font-size: 16px;
}

.button:hover {
    background: var(--primary-dark);
}

.bottom-nav {
    position: fixed;
    bottom: 0;
    left: 50%;
    transform: translateX(-50%);
    max-width: 430px;
    width: 100%;
    background: var(--surface);
    border-top: 1px solid var(--border);
    display: flex;
    justify-content: space-around;
    padding: 12px 0;
}

.nav-item {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 4px;
    font-size: 12px;
    color: var(--text-secondary);
    text-decoration: none;
    padding: 8px 16px;
}

.nav-item.active {
    color: var(--primary);
}
EOF
```

## Option 4: Mobile View Simulation

To better simulate the mobile app experience:

### Chrome DevTools
1. Open any HTML file in Chrome
2. Press `F12` or `Cmd+Option+I` (Mac) / `Ctrl+Shift+I` (Windows)
3. Click the device toggle icon (📱) or press `Cmd+Shift+M` / `Ctrl+Shift+M`
4. Select a mobile device (e.g., iPhone 14 Pro, Pixel 7)
5. Refresh the page

### Firefox Responsive Design Mode
1. Open any HTML file in Firefox
2. Press `Cmd+Option+M` (Mac) / `Ctrl+Shift+M` (Windows)
3. Select a mobile device preset
4. Refresh the page

## Recommended Viewing Order

### For Quick Overview
1. Start with `html/demos/betrfood-screens.html` - See all main screens at once
2. Explore `html/demos/betrfood-ai-chatbot-screens.html` - AI features
3. Check `html/demos/upload-camera-pantry-screens.html` - Content creation flow

### For Detailed Exploration
1. **Feed Experience**: `html/pages/feed/index.html`
2. **Social Features**: `html/pages/feed/comments.html`, `html/pages/profile/user-profile.html`
3. **Content Creation**: `html/pages/content/camera.html`, `html/pages/content/upload.html`
4. **AI Features**: `html/pages/ai/chat-active.html`, `html/pages/ai/scanner.html`
5. **Meal Planning**: `html/pages/meal-planning/pantry-simple.html`, `html/pages/meal-planning/recipe.html`

## Troubleshooting

### Issue: Individual pages show no styling
**Solution**: Use Option 2 (live server) or Option 3 (create styles.css)

### Issue: Links between pages don't work
**Solution**: The prototypes are mostly standalone mockups. Navigation between pages may not be fully implemented.

### Issue: Images or icons are missing
**Solution**: The prototypes use emoji icons (🔍, 👍, 💬, etc.) which should work in all browsers. If they don't display, try a different browser.

### Issue: Pages look broken on desktop
**Solution**: These are mobile prototypes. Use Chrome DevTools device mode or resize your browser window to ~375-430px width.

## Next Steps

- **For Development**: Use Option 2 (live server) for the best development experience
- **For Quick Demo**: Use Option 1 (demo files) to show stakeholders
- **For Production**: Consider migrating to a proper frontend framework (React, Vue, etc.)

## File Path Reference

```
html/
├── demos/                          # ✅ Work out of the box
│   ├── betrfood-screens.html       # Best for overview
│   ├── betrfood-ai-chatbot-screens.html
│   └── upload-camera-pantry-screens.html
│
└── pages/                          # ⚠️  Need styles.css or live server
    ├── feed/index.html             # Home feed
    ├── profile/user-profile.html   # User profile
    ├── ai/chat-active.html         # AI chat
    └── ...
```

---

**Quick Command Reference:**
```bash
# Best option - WebStorm (if using)
# Right-click HTML file → "Open in Browser"

# Python server
cd html && python3 -m http.server 8000

# View demos directly
open html/demos/betrfood-screens.html
```
