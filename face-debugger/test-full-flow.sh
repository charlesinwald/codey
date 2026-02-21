#!/bin/bash
# Test the full flow from extension → backend → frontend

SESSION_ID="test-flow-$(date +%s)"
BACKEND_URL="http://localhost:8000"

echo "🧪 Testing Full Flow"
echo "==================="
echo ""

# Test 1: Backend health
echo "1️⃣  Testing backend health..."
HEALTH=$(curl -s "$BACKEND_URL/health")
echo "   $HEALTH"
echo ""

# Test 2: Start session
echo "2️⃣  Starting session..."
SESSION=$(curl -s -X POST "$BACKEND_URL/session/start" \
  -H "Content-Type: application/json" \
  -d "{\"session_id\": \"$SESSION_ID\"}")
echo "   $SESSION"
echo ""

# Test 3: Send analyze request with buggy code
echo "3️⃣  Sending analyze request with buggy code..."
ANALYZE=$(curl -s -X POST "$BACKEND_URL/analyze" \
  -H "Content-Type: application/json" \
  -d "{
    \"session_id\": \"$SESSION_ID\",
    \"file_content\": \"function add(a, b) {\n  return a + c;\n}\",
    \"cursor_line\": 2,
    \"language\": \"javascript\"
  }")
echo "   Response: $ANALYZE"
echo ""

# Test 4: Check status immediately
echo "4️⃣  Checking session status..."
sleep 1
STATUS=$(curl -s "$BACKEND_URL/session/$SESSION_ID/status")
echo "   $STATUS"
echo ""

# Test 5: Check debug endpoint
echo "5️⃣  Checking debug endpoint..."
DEBUG=$(curl -s "$BACKEND_URL/debug/last-analysis")
echo "   $DEBUG"
echo ""

# Test 6: Check history
echo "6️⃣  Checking comment history..."
HISTORY=$(curl -s "$BACKEND_URL/session/$SESSION_ID/history")
echo "   $HISTORY"
echo ""

echo "✅ Test complete!"
echo ""
echo "If 'speak: true' in step 3, backend is working."
echo "If 'comment_count > 0' in step 4, Redis storage is working."
echo "Check frontend console to see if it detects the comment."

