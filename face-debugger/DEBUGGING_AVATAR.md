# Debugging: Avatar Not Reacting in VS Code Panel

If the avatar panel is open but not reacting to code changes, follow these debugging steps:

## Step 1: Check Browser Console in VS Code Panel

1. **Right-click inside the avatar panel** (the iframe area)
2. Select **"Inspect"** or **"Inspect Element"**
3. This opens the browser DevTools for the iframe
4. Go to the **Console** tab

You should see logs like:
```
DebugSession: Initialized with sessionId: <id> backendUrl: http://localhost:8000
DebugSession: Fetching status from http://localhost:8000/session/<id>/status
DebugSession: Status received - count: 0, last: null
```

## Step 2: Verify Session ID Match

**Check Extension Output:**
1. In VS Code, go to `View > Output`
2. Select **"Face Debugger"** from the dropdown
3. Look for: `Face Debugger: Session started - <session-id>`

**Check Frontend Console:**
- The console should show the same session ID
- If they don't match, that's the problem!

## Step 3: Check Network Requests

In the browser DevTools Console:
1. Go to **Network** tab
2. Filter by: `status`
3. You should see requests to `/session/{id}/status` every 3 seconds
4. Check if they're returning 200 OK
5. Check the response - does it have `comment_count` and `last_comment`?

## Step 4: Verify Backend is Receiving Analyze Requests

**Check Backend Terminal:**
- When you write code, you should see:
  ```
  Claude analysis result: speak=True, line="..."
  ```
- If you don't see this, the extension isn't sending requests

**Check Extension Output:**
- Look for: `Face Debugger: Comment: "..."` 
- This means the extension received a response from backend

## Step 5: Test with Manual Curl

While the panel is open, in a terminal:

```bash
# Get the session ID from extension output or frontend console
SESSION_ID="your-session-id-here"

# Send a test analyze request
curl -X POST http://localhost:8000/analyze \
  -H "Content-Type: application/json" \
  -d "{
    \"session_id\": \"$SESSION_ID\",
    \"file_content\": \"function add(a, b) {\\n  return a + c;\\n}\",
    \"cursor_line\": 2,
    \"language\": \"javascript\"
  }"
```

Then check:
1. Backend terminal - should show Claude response
2. Frontend console - should show new comment within 3 seconds
3. Avatar panel - should display the comment

## Common Issues

### Issue: "No sessionId provided"
**Solution:** The frontend isn't receiving the session ID from the extension. Check:
- Extension output for session ID
- Frontend console for initialization logs
- URL parameters in the iframe (should have `?sessionId=...`)

### Issue: Network requests failing
**Solution:** CORS or connection issue. Check:
- Backend is running on port 8000
- Frontend can reach backend (try `curl http://localhost:8000/health`)
- CORS is configured in backend (should allow all origins in dev)

### Issue: Status requests return 404
**Solution:** Session doesn't exist. Check:
- Extension successfully started session (check extension output)
- Session ID matches between extension and frontend
- Try restarting: `Face Debugger: Toggle` off and on

### Issue: Status returns but comment_count doesn't increase
**Solution:** Comments aren't being stored. Check:
- Redis is running (`redis-cli ping`)
- Backend is storing comments (check backend logs)
- Session ID in analyze request matches status request

### Issue: Frontend sees new comments but avatar doesn't react
**Solution:** UI state issue. Check:
- Console logs show `New comment detected!`
- `setCurrentSpeech` is being called
- Speech bubble component is rendering

## Quick Diagnostic Commands

```bash
# Check backend health
curl http://localhost:8000/health

# Check if Redis is working
redis-cli ping

# Check session status (replace SESSION_ID)
curl http://localhost:8000/session/SESSION_ID/status

# Check session history
curl http://localhost:8000/session/SESSION_ID/history
```

## Expected Flow

1. **Extension polls** → Sends `/analyze` request every 8 seconds
2. **Backend analyzes** → Calls Claude, stores comment in Redis
3. **Frontend polls** → Fetches `/session/{id}/status` every 3 seconds  
4. **Frontend detects** → Sees `comment_count` increased
5. **Frontend displays** → Shows speech bubble with comment

If any step fails, check the logs for that step!

