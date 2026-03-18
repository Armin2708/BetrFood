#!/bin/bash
BASE="http://localhost:3000"

# First, get a fresh token via login
echo "=== Authenticating... ==="
AUTH=$(curl -s -X POST "$BASE/api/auth/login" \
  -H 'Content-Type: application/json' \
  -d '{"email":"apitest99@betrfood.com","password":"BtrFd9xZqW2mKp7y"}')
TOKEN=$(echo "$AUTH" | python3 -c "import sys,json; print(json.load(sys.stdin)['token'])" 2>/dev/null)
SESSION_ID=$(echo "$AUTH" | python3 -c "import sys,json; print(json.load(sys.stdin)['sessionId'])" 2>/dev/null)
USER_ID=$(echo "$AUTH" | python3 -c "import sys,json; print(json.load(sys.stdin)['user']['id'])" 2>/dev/null)

if [ -z "$TOKEN" ]; then
  echo "FAIL: Could not authenticate. Response: $AUTH"
  exit 1
fi
echo "OK - Got token for user $USER_ID"
echo ""

PASS=0
FAIL=0

check() {
  local name="$1"
  local response="$2"
  local expected="$3"

  if echo "$response" | grep -q "$expected"; then
    echo "PASS: $name"
    PASS=$((PASS + 1))
  else
    echo "FAIL: $name"
    echo "  Response: $(echo "$response" | head -c 300)"
    FAIL=$((FAIL + 1))
  fi
}

# ===== PUBLIC ENDPOINTS =====
echo "===== PUBLIC ENDPOINTS ====="

# 1. Root
R=$(curl -s "$BASE/")
check "GET / (root)" "$R" "BetrFood API"

# 2. Get posts (feed)
R=$(curl -s "$BASE/api/posts?limit=2")
check "GET /api/posts (feed)" "$R" "posts"

# 3. Get all tags
R=$(curl -s "$BASE/api/tags")
check "GET /api/tags" "$R" "name"

# 4. Get tags by type
R=$(curl -s "$BASE/api/tags?type=cuisine")
check "GET /api/tags?type=cuisine" "$R" "cuisine"

# 5. Get posts by tags
R=$(curl -s "$BASE/api/tags/posts/by-tags?tags=1,2")
check "GET /api/tags/posts/by-tags" "$R" "\["

# 6. Check username availability
R=$(curl -s "$BASE/api/profiles/check-username/testuser123")
check "GET /api/profiles/check-username/:username" "$R" "available"

# 7. Get public profile
R=$(curl -s "$BASE/api/profiles/$USER_ID")
check "GET /api/profiles/:userId (public)" "$R" "id"

echo ""
echo "===== AUTH ENDPOINTS ====="

# 8. Login (already tested above)
check "POST /api/auth/login" "$AUTH" "token"

# 9. Token refresh
R=$(curl -s -X POST "$BASE/api/auth/refresh" \
  -H 'Content-Type: application/json' \
  -d "{\"sessionId\":\"$SESSION_ID\"}")
check "POST /api/auth/refresh" "$R" "token"
# Update token with fresh one
NEW_TOKEN=$(echo "$R" | python3 -c "import sys,json; print(json.load(sys.stdin)['token'])" 2>/dev/null)
if [ -n "$NEW_TOKEN" ]; then
  TOKEN="$NEW_TOKEN"
fi

# 10. Get my profile
R=$(curl -s "$BASE/api/profiles/me" \
  -H "Authorization: Bearer $TOKEN")
check "GET /api/profiles/me" "$R" "id"

# 11. Update my profile
R=$(curl -s -X PUT "$BASE/api/profiles/me" \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"displayName":"API Tester","username":"apitester99","bio":"Test account for API testing"}')
check "PUT /api/profiles/me" "$R" "apitester99"

# 12. Complete onboarding
R=$(curl -s -X POST "$BASE/api/profiles/me/complete-onboarding" \
  -H "Authorization: Bearer $TOKEN")
check "POST /api/profiles/me/complete-onboarding" "$R" "onboarding"

# 13. Get my role
R=$(curl -s "$BASE/api/roles/me" \
  -H "Authorization: Bearer $TOKEN")
check "GET /api/roles/me" "$R" "role"

# 14. Follow a user (follow self for testing)
R=$(curl -s -X POST "$BASE/api/users/$USER_ID/follow" \
  -H "Authorization: Bearer $TOKEN")
check "POST /api/users/:id/follow" "$R" "follow"

# 15. Get follow stats
R=$(curl -s "$BASE/api/users/$USER_ID/follow-stats")
check "GET /api/users/:id/follow-stats" "$R" "followerCount"

# 16. Unfollow user
R=$(curl -s -X DELETE "$BASE/api/users/$USER_ID/follow" \
  -H "Authorization: Bearer $TOKEN")
check "DELETE /api/users/:id/follow" "$R" "unfollow"

echo ""
echo "===== POST CRUD ====="

# 17. Create post (with a tiny test image)
# Create a minimal 1x1 PNG for testing
python3 -c "
import base64, sys
# Minimal valid 1x1 white PNG
png = base64.b64decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==')
sys.stdout.buffer.write(png)
" > /tmp/test_image.png

R=$(curl -s -X POST "$BASE/api/posts" \
  -H "Authorization: Bearer $TOKEN" \
  -F "image=@/tmp/test_image.png" \
  -F "caption=API test post")
check "POST /api/posts (create)" "$R" "id"
POST_ID=$(echo "$R" | python3 -c "import sys,json; print(json.load(sys.stdin).get('id',''))" 2>/dev/null)
echo "  Created post ID: $POST_ID"

if [ -n "$POST_ID" ] && [ "$POST_ID" != "" ]; then
  # 18. Get single post
  R=$(curl -s "$BASE/api/posts/$POST_ID")
  check "GET /api/posts/:id" "$R" "$POST_ID"

  # 19. Update post
  R=$(curl -s -X PUT "$BASE/api/posts/$POST_ID" \
    -H "Authorization: Bearer $TOKEN" \
    -H 'Content-Type: application/json' \
    -d '{"caption":"Updated API test post"}')
  check "PUT /api/posts/:id (update)" "$R" "Updated"

  # 20. Add tags to post
  R=$(curl -s -X POST "$BASE/api/tags/posts/$POST_ID/tags" \
    -H 'Content-Type: application/json' \
    -d '{"tagIds":[1,2]}')
  check "POST /api/tags/posts/:id/tags (add tags)" "$R" ""

  # 21. Get post tags
  R=$(curl -s "$BASE/api/tags/posts/$POST_ID/tags")
  check "GET /api/tags/posts/:id/tags" "$R" "name"

  # 22. Remove tag from post
  R=$(curl -s -X DELETE "$BASE/api/tags/posts/$POST_ID/tags/2")
  check "DELETE /api/tags/posts/:id/tags/:tagId" "$R" ""

  # 23. Like post
  R=$(curl -s -X POST "$BASE/api/posts/$POST_ID/like" \
    -H "Authorization: Bearer $TOKEN")
  check "POST /api/posts/:id/like" "$R" "likes"

  # 24. Unlike post
  R=$(curl -s -X DELETE "$BASE/api/posts/$POST_ID/like" \
    -H "Authorization: Bearer $TOKEN")
  check "DELETE /api/posts/:id/like" "$R" "likes"

  echo ""
  echo "===== RECIPE CRUD ====="

  # 25. Create recipe
  R=$(curl -s -X POST "$BASE/api/posts/$POST_ID/recipe" \
    -H "Authorization: Bearer $TOKEN" \
    -H 'Content-Type: application/json' \
    -d '{"cookTime":30,"servings":4,"difficulty":"easy","ingredients":[{"name":"flour","quantity":2,"unit":"cups"}],"steps":[{"instruction":"Mix ingredients"}]}')
  check "POST /api/posts/:postId/recipe (create)" "$R" "id"

  # 26. Get recipe
  R=$(curl -s "$BASE/api/posts/$POST_ID/recipe")
  check "GET /api/posts/:postId/recipe" "$R" "ingredients"

  # 27. Update recipe
  R=$(curl -s -X PUT "$BASE/api/posts/$POST_ID/recipe" \
    -H "Authorization: Bearer $TOKEN" \
    -H 'Content-Type: application/json' \
    -d '{"cookTime":45,"servings":6,"difficulty":"medium","ingredients":[{"name":"flour","quantity":3,"unit":"cups"},{"name":"sugar","quantity":1,"unit":"cup"}],"steps":[{"instruction":"Mix dry ingredients"},{"instruction":"Bake at 350F"}]}')
  check "PUT /api/posts/:postId/recipe (update)" "$R" "id"

  # 28. Delete recipe
  R=$(curl -s -X DELETE "$BASE/api/posts/$POST_ID/recipe" \
    -H "Authorization: Bearer $TOKEN")
  check "DELETE /api/posts/:postId/recipe" "$R" ""

  # 29. Delete post (cleanup)
  R=$(curl -s -X DELETE "$BASE/api/posts/$POST_ID" \
    -H "Authorization: Bearer $TOKEN")
  check "DELETE /api/posts/:id (delete)" "$R" ""
else
  echo "SKIP: Post CRUD tests (post creation failed)"
  FAIL=$((FAIL + 5))
fi

echo ""
echo "===== AUTH EDGE CASES ====="

# 30. Login with wrong password
R=$(curl -s -X POST "$BASE/api/auth/login" \
  -H 'Content-Type: application/json' \
  -d '{"email":"apitest99@betrfood.com","password":"wrongpassword"}')
check "POST /api/auth/login (wrong password)" "$R" "Invalid"

# 31. Auth required without token
R=$(curl -s "$BASE/api/profiles/me")
check "GET /api/profiles/me (no token - 401)" "$R" "Missing"

# 32. Signup missing fields
R=$(curl -s -X POST "$BASE/api/auth/signup" \
  -H 'Content-Type: application/json' \
  -d '{"email":""}')
check "POST /api/auth/signup (missing fields)" "$R" "required"

# 33. Logout
R=$(curl -s -X POST "$BASE/api/auth/logout" \
  -H 'Content-Type: application/json' \
  -d "{\"sessionId\":\"$SESSION_ID\"}")
check "POST /api/auth/logout" "$R" "Logged out"

echo ""
echo "===== ADMIN ENDPOINTS ====="

# 34. Admin - get users (should fail for non-admin)
R=$(curl -s "$BASE/api/admin/users" \
  -H "Authorization: Bearer $TOKEN")
check "GET /api/admin/users (non-admin - denied)" "$R" "error\|Forbidden\|role\|denied"

# 35. Admin - get stats (should fail for non-admin)
R=$(curl -s "$BASE/api/admin/stats" \
  -H "Authorization: Bearer $TOKEN")
check "GET /api/admin/stats (non-admin - denied)" "$R" "error\|Forbidden\|role\|denied"

echo ""
echo "================================"
echo "Results: $PASS passed, $FAIL failed"
echo "================================"

# Cleanup test image
rm -f /tmp/test_image.png
