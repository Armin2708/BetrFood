#!/usr/bin/env python3
"""
Add phone frame wrapper to BetrFood HTML pages
Wraps existing mobile layouts in iPhone frame structure
"""

import re
from pathlib import Path

# Phone frame CSS and HTML to add
PHONE_FRAME_CSS = """
        body {
            font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 40px 20px;
        }

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

        .phone-frame::before {
            content: '';
            position: absolute;
            top: 0;
            left: 50%;
            transform: translateX(-50%);
            width: 150px;
            height: 28px;
            background: #1a1a1a;
            border-radius: 0 0 20px 20px;
            z-index: 100;
        }

        .phone-frame::after {
            content: '';
            position: absolute;
            top: 8px;
            left: 50%;
            transform: translateX(-50%);
            width: 60px;
            height: 6px;
            background: #333;
            border-radius: 3px;
            z-index: 101;
        }
"""

def add_phone_frame(file_path):
    """Add phone frame wrapper to a single HTML file"""
    print(f"Processing: {file_path}")

    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()

    # Check if already has phone frame
    if 'phone-frame' in content:
        print(f"  ✅ Already has phone frame, skipping")
        return False

    # 1. Update body CSS - remove existing body styles and add phone frame styles
    body_pattern = r'(\s+body\s*{[^}]*})'
    if re.search(body_pattern, content):
        content = re.sub(body_pattern, PHONE_FRAME_CSS, content, count=1)

    # 2. Wrap the .screen div with phone-frame
    # Find the opening <body> tag and the .screen div
    screen_start = content.find('<div class="screen">')
    if screen_start == -1:
        # Try alternative patterns
        screen_start = content.find('<body>')
        if screen_start != -1:
            # For pages without .screen class, wrap entire body content
            body_end = content.find('</body>')
            if body_end != -1:
                before_body = content[:screen_start + 6]  # Include <body>
                body_content = content[screen_start + 6:body_end]
                after_body = content[body_end:]

                content = (before_body +
                          '\n    <div class="phone-frame">\n        <div class="screen">\n' +
                          body_content +
                          '\n        </div>\n    </div>\n' +
                          after_body)

                print(f"  ✅ Added phone frame wrapper (no .screen)")

                with open(file_path, 'w', encoding='utf-8') as f:
                    f.write(content)
                return True
        else:
            print(f"  ⚠️  Could not find body or .screen, skipping")
            return False

    # Find the matching closing </div> for .screen
    # Count nested divs to find the right closing tag
    depth = 1
    i = screen_start + len('<div class="screen">')
    screen_end = -1

    while i < len(content) and depth > 0:
        if content[i:i+5] == '<div ':
            depth += 1
        elif content[i:i+6] == '</div>':
            depth -= 1
            if depth == 0:
                screen_end = i + 6
                break
        i += 1

    if screen_end == -1:
        print(f"  ⚠️  Could not find closing </div> for .screen, skipping")
        return False

    # Insert phone-frame wrapper
    before_screen = content[:screen_start]
    screen_content = content[screen_start:screen_end]
    after_screen = content[screen_end:]

    content = (before_screen +
              '<div class="phone-frame">\n        ' +
              screen_content +
              '\n    </div>' +
              after_screen)

    print(f"  ✅ Added phone frame wrapper")

    # Write back
    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(content)

    return True

def main():
    """Process all HTML files in pages directory"""
    pages_dir = Path('html/pages')

    # Files to process (from our scan)
    files_to_process = [
        'meal-planning/pantry-keyboard.html',
        'meal-planning/recipe.html',
        'meal-planning/pantry-full.html',
        'meal-planning/pantry-simple.html',
        'auth/welcome.html',
        'auth/signup.html',
        'content/camera.html',
        'content/upload.html',
        'search/search.html',
        'profile/profile.html',
        'profile/following.html',
        'profile/health-info.html',
        'profile/followers.html',
        'profile/user-profile.html',
        'profile/settings.html',
        'ai/scanner.html',
        'ai/payment.html',
        'ai/chat-history.html',
        'ai/upgrade.html',
        'ai/chat-active.html',
        'ai/chat-empty.html',
        'feed/index.html',
        'feed/comments.html',
        'feed/share.html',
        'feed/liked-by.html',
    ]

    processed = 0
    skipped = 0

    print("🍽️  Adding phone frames to BetrFood pages\n")

    for file_rel in files_to_process:
        file_path = pages_dir / file_rel
        if file_path.exists():
            if add_phone_frame(file_path):
                processed += 1
            else:
                skipped += 1
        else:
            print(f"❌ File not found: {file_path}")
            skipped += 1

    print(f"\n✅ Complete!")
    print(f"   Processed: {processed} files")
    print(f"   Skipped: {skipped} files")
    print(f"   Total: {processed + skipped} files")

if __name__ == '__main__':
    main()
