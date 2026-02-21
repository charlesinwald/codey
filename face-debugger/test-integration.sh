#!/bin/bash
# Test script for frontend-backend integration

SESSION_ID="test-integration-$(date +%s)"
BACKEND_URL="http://localhost:8000"
FRONTEND_URL="http://localhost:5173"

echo "🧪 Testing Face Debugger Integration"
echo "======================================"
echo ""
echo "Session ID: $SESSION_ID"
echo ""

# Step 1: Start a session
echo "1️⃣  Starting session..."
SESSION_RESPONSE=$(curl -s -X POST "$BACKEND_URL/session/start" \
  -H "Content-Type: application/json" \
  -d "{\"session_id\": \"$SESSION_ID\"}")

echo "   Response: $SESSION_RESPONSE"
echo ""

# Step 2: Open frontend with session ID
echo "2️⃣  Open frontend in browser:"
echo "   $FRONTEND_URL?sessionId=$SESSION_ID"
echo ""
echo "   (Press Enter after opening the frontend in your browser...)"
read -r

# Step 3: Send analyze request with buggy code
echo "3️⃣  Sending analyze request with buggy code..."
ANALYZE_RESPONSE=$(curl -s -X POST "$BACKEND_URL/analyze" \
  -H "Content-Type: application/json" \
  -d "{
    \"session_id\": \"$SESSION_ID\",
    \"file_content\": \"function add(a, b) {\n  return a + c;\n}\",
    \"cursor_line\": 2,
    \"language\": \"javascript\"
  }")

echo "   Response: $ANALYZE_RESPONSE"
echo ""

# Step 4: Check status
echo "4️⃣  Checking session status..."
sleep 2
STATUS_RESPONSE=$(curl -s "$BACKEND_URL/session/$SESSION_ID/status")
echo "   Status: $STATUS_RESPONSE"
echo ""

echo "✅ Test complete!"
echo ""
echo "The frontend should display the comment within 3 seconds if it's connected."
echo "If not, check:"
echo "  - Frontend is running on $FRONTEND_URL"
echo "  - Frontend URL includes ?sessionId=$SESSION_ID"
echo "  - Browser console for any errors"

