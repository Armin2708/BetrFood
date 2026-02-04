# GitHub Wiki Setup Instructions

I've created all the wiki documentation files in the `wiki/` directory. To complete the setup, follow these steps:

## Wiki Files Created

The following wiki pages have been created:

1. **Home.md** - Welcome page with overview and navigation
2. **Features.md** - Complete feature specifications from FEATURES.md
3. **UI-Pages.md** - All 77+ screen specifications from UI_PAGES.md
4. **Design-Screens.md** - Links and descriptions for HTML design mockups

## How to Enable and Push to GitHub Wiki

GitHub wikis need to be enabled first. Here's how:

### Step 1: Enable Wiki on GitHub

1. Go to your repository: https://github.com/Armin2708/BetrFood
2. Click on **Settings** tab
3. Scroll down to the **Features** section
4. Check the box next to **Wikis** to enable it
5. Click **Save** (if required)

### Step 2: Create Initial Wiki Page

1. Go to the **Wiki** tab in your repository
2. Click **Create the first page**
3. Add any temporary content (you can delete it later)
4. Click **Save Page**

This creates the wiki repository at `https://github.com/Armin2708/BetrFood.wiki.git`

### Step 3: Push Your Wiki Content

Once the wiki is enabled, run these commands from your project directory:

```bash
# Navigate to the wiki directory
cd wiki

# Push to the wiki repository
git remote add origin https://github.com/Armin2708/BetrFood.wiki.git
git branch -M master
git push -u origin master
```

### Alternative: Manual Upload

If you prefer, you can also manually create pages through GitHub's web interface:

1. Go to your repository's Wiki tab
2. Click **New Page**
3. Copy content from each .md file in the wiki/ directory
4. Paste into the web editor
5. Set the page title (Home, Features, UI-Pages, Design-Screens)
6. Click **Save Page**

## Verifying Your Wiki

After pushing, verify your wiki at:
https://github.com/Armin2708/BetrFood/wiki

You should see:
- Home page as the landing page
- Navigation sidebar with links to all pages
- Features, UI-Pages, and Design-Screens pages

## Wiki Structure

```
wiki/
├── Home.md              # Landing page with overview
├── Features.md          # Complete feature specifications
├── UI-Pages.md          # All 77+ screen descriptions
└── Design-Screens.md    # HTML mockup references
```

---

All files are ready and committed locally. Just enable the wiki on GitHub and push!
