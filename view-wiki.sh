#!/bin/bash
# Quick script to open the BetrFood wiki in your browser

WIKI_URL="https://github.com/Armin2708/BetrFood/wiki"

echo "Opening BetrFood Wiki..."
echo "URL: $WIKI_URL"
echo ""

# Open in default browser
if [[ "$OSTYPE" == "darwin"* ]]; then
    # macOS
    open "$WIKI_URL"
elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
    # Linux
    xdg-open "$WIKI_URL"
elif [[ "$OSTYPE" == "msys" || "$OSTYPE" == "win32" ]]; then
    # Windows
    start "$WIKI_URL"
else
    echo "Please visit: $WIKI_URL"
fi
