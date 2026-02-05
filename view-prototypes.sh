#!/bin/bash

# BetrFood HTML Prototype Viewer
# Quick script to view prototypes in different ways

echo "🍔 BetrFood HTML Prototype Viewer"
echo ""
echo "Choose an option:"
echo ""
echo "1. View all screens demo (comprehensive)"
echo "2. View AI chatbot screens"
echo "3. View upload/camera/pantry flow"
echo "4. Start live server for individual pages"
echo "5. Open specific page category"
echo ""
read -p "Enter your choice (1-5): " choice

case $choice in
    1)
        echo "Opening comprehensive screens demo..."
        open html/demos/betrfood-screens.html
        ;;
    2)
        echo "Opening AI chatbot screens..."
        open html/demos/betrfood-ai-chatbot-screens.html
        ;;
    3)
        echo "Opening upload/camera/pantry flow..."
        open html/demos/upload-camera-pantry-screens.html
        ;;
    4)
        echo "Starting live server on http://localhost:8000"
        echo "Press Ctrl+C to stop the server"
        cd html && python3 -m http.server 8000
        ;;
    5)
        echo ""
        echo "Available categories:"
        echo "  a. Feed/Home"
        echo "  b. Profile"
        echo "  c. AI Chatbot"
        echo "  d. Content Creation"
        echo "  e. Meal Planning"
        echo "  f. Search"
        echo "  g. Auth"
        echo ""
        read -p "Choose category (a-g): " category

        case $category in
            a) open html/pages/feed/index.html ;;
            b) open html/pages/profile/user-profile.html ;;
            c) open html/pages/ai/chat-active.html ;;
            d) open html/pages/content/camera.html ;;
            e) open html/pages/meal-planning/pantry-simple.html ;;
            f) open html/pages/search/search.html ;;
            g) open html/pages/auth/welcome.html ;;
            *) echo "Invalid category" ;;
        esac
        ;;
    *)
        echo "Invalid choice"
        ;;
esac
