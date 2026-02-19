#!/bin/bash
# =============================================================================
# BetrFood - Create GitHub Project Board & Add Epic Issues
# =============================================================================
#
# This script creates a GitHub ProjectV2 board called "BetrFood Development"
# and adds all epic-labeled issues to it.
#
# Prerequisites:
#   - gh CLI installed and authenticated (run: gh auth login)
#   - Your GitHub account must have the 'project' scope
#     (run: gh auth refresh -s project)
#
# Usage:
#   ./scripts/setup-project-board.sh
#
# =============================================================================

set -euo pipefail

OWNER="Armin2708"
REPO="BetrFood"

echo "=== BetrFood Project Board Setup ==="
echo ""

# Step 0: Check gh auth
if ! gh auth status &>/dev/null; then
  echo "Error: Not authenticated with gh CLI."
  echo "Run: gh auth login"
  exit 1
fi

# Ensure project scope
echo "Ensuring 'project' scope is available..."
gh auth refresh -s project 2>/dev/null || true

# Step 1: Get epic issues
echo ""
echo "=== Step 1: Finding epic issues ==="
ISSUES=$(gh issue list --repo "$OWNER/$REPO" --label epic --state open --json number,title --limit 20)
COUNT=$(echo "$ISSUES" | jq length)
echo "Found $COUNT epic issues:"
echo "$ISSUES" | jq -r '.[] | "  #\(.number): \(.title)"'

if [ "$COUNT" -eq 0 ]; then
  echo "No epic issues found. Please create issues first."
  exit 1
fi

# Step 2: Create ProjectV2
echo ""
echo "=== Step 2: Creating project board ==="
EXISTING=$(gh project list --owner "$OWNER" --format json 2>/dev/null | jq -r '.projects[] | select(.title == "BetrFood Development") | .number' 2>/dev/null || echo "")

if [ -n "$EXISTING" ]; then
  echo "Project already exists: #$EXISTING"
  PROJECT_NUMBER="$EXISTING"
else
  PROJECT_NUMBER=$(gh project create --owner "$OWNER" --title "BetrFood Development" --format json | jq -r '.number')
  echo "Created project #$PROJECT_NUMBER"
fi

# Step 3: Add issues to project
echo ""
echo "=== Step 3: Adding issues to project ==="
for ISSUE_NUM in $(echo "$ISSUES" | jq -r '.[].number'); do
  echo "Adding issue #$ISSUE_NUM..."
  gh project item-add "$PROJECT_NUMBER" --owner "$OWNER" --url "https://github.com/$OWNER/$REPO/issues/$ISSUE_NUM" 2>/dev/null && echo "  Done" || echo "  (may already exist)"
done

# Step 4: Show result
echo ""
echo "=== Setup Complete ==="
echo "Project URL: https://github.com/users/$OWNER/projects/$PROJECT_NUMBER"
echo ""
echo "Issues added:"
echo "$ISSUES" | jq -r '.[] | "  #\(.number): \(.title)"'
echo ""
echo "Next steps:"
echo "  1. Open the project URL above"
echo "  2. Customize Status field options (Backlog, In Progress, Review, Done)"
echo "  3. Add views (Board, Table) as needed"
echo "  4. Move epics through columns as you work on them"
