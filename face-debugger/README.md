# Face-to-Face Debugging

An AI pair programmer that watches your code in VS Code and reacts via a Three.js–rendered 3D avatar. Think of it as having a grumpy senior engineer looking over your shoulder — but in a helpful way.

## Architecture

```
┌─────────────────────┐     HTTP POST      ┌─────────────────────┐
│   VS Code Extension │ ─────────────────► │   FastAPI Backend   │
│   (polls every 8s)  │                    │                     │
└─────────────────────┘                    │  ┌───────────────┐  │
         │                                 │  │ Claude Sonnet │  │
         │ WebView                         │  └───────────────┘  │
         ▼                                 │          │          │
┌─────────────────────┐                    │          ▼          │
│   React Frontend    │ ◄──────────────────│  ┌───────────────┐  │
│   (Three.js Avatar) │   Speech as Text   │  │    Redis      │  │
└─────────────────────┘                    │  └───────────────┘  │
                                           └─────────────────────┘
```

## Features

- **3D Avatar**: Three.js-rendered robot avatar with idle animations and speaking indicators
- **Speech Bubbles**: AI commentary displayed as animated text with typing effect
- **Custom GLTF Support**: Bring your own 3D model for a personalized avatar
- **Smart Debouncing**: Content hash checks and time-based debouncing to minimize API costs
- **VS Code Integration**: Runs in a sidebar WebView panel

## Prerequisites

- Node.js 18+
- Python 3.11+
- Redis (local or Docker)
- [Anthropic API Key](https://console.anthropic.com/)

## Quick Start

### 1. Start Redis

```bash
docker run -d --name face-debugger-redis -p 6379:6379 redis:alpine
```

### 2. Backend Setup

```bash
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt

# Copy and configure environment
cp .env.example .env
# Edit .env and add your ANTHROPIC_API_KEY

uvicorn main:app --reload --port 8000
```

### 3. Frontend Setup

```bash
cd frontend
npm install
cp .env.example .env
npm run dev
```

### 4. VS Code Extension

```bash
cd extension
npm install
npm run compile

# Press F5 in VS Code to launch Extension Development Host
# Or package for installation:
npx vsce package
```

## Usage

1. Open VS Code with the extension installed
2. Open any code file (TypeScript, Python, JavaScript, etc.)
3. Run command: `Face Debugger: Toggle` to start watching
4. Run command: `Face Debugger: Open Panel` to see the avatar
5. Code as usual — the avatar will comment when it spots issues

## Custom 3D Avatar

To use a custom GLTF model instead of the default robot:

1. Place your `.glb` or `.gltf` file in `frontend/public/models/`
2. Update `App.tsx` to pass the model URL:

```tsx
<DebugSession
  sessionId={sessionId}
  backendUrl={backendUrl}
  modelUrl="/models/your-avatar.glb"
/>
```

The model should be roughly human-scale and centered at origin for best results.

## Configuration

### VS Code Settings

| Setting | Default | Description |
|---------|---------|-------------|
| `faceDebugger.backendUrl` | `http://localhost:8000` | Backend API URL |
| `faceDebugger.pollInterval` | `8000` | Polling interval in ms |
| `faceDebugger.ignoredLanguages` | `["plaintext", "markdown", "json"]` | Languages to skip |

### Environment Variables

#### Backend (.env)

| Variable | Required | Description |
|----------|----------|-------------|
| `ANTHROPIC_API_KEY` | Yes | Your Anthropic API key |
| `REDIS_URL` | No | Redis connection URL (default: localhost:6379) |
| `ALLOWED_ORIGINS` | No | CORS origins |

#### Frontend (.env)

| Variable | Required | Description |
|----------|----------|-------------|
| `VITE_BACKEND_URL` | Yes | Backend API URL |

## How It Works

### Polling Logic

The extension polls every 8 seconds and sends:
- Full file content
- Current cursor line number
- File language

### Smart Debouncing

The backend prevents excessive API calls:
1. **Content hash check**: Skips if file hasn't changed (MD5 comparison)
2. **Time debounce**: Blocks if avatar spoke within last 12 seconds
3. **History check**: Claude sees recent comments to avoid repetition

### Claude's Behavior

Claude acts as a grumpy senior engineer who:
- Points out bugs, edge cases, and dangerous patterns
- Comments on severe naming/readability issues
- Occasionally acknowledges clever solutions
- Stays silent when code looks fine

### Avatar Display

When Claude decides to speak:
1. Backend stores the comment in Redis history
2. Frontend polls for status updates
3. New comments trigger speech bubble animation
4. Avatar's eyes and mouth animate during "speaking"

## Development

### Running Tests

```bash
# Backend
cd backend
pytest

# Extension
cd extension
npm test

# Frontend
cd frontend
npm test
```

### Building for Production

```bash
# Extension
cd extension
npm run compile
npx vsce package

# Frontend
cd frontend
npm run build
```

## Troubleshooting

### Avatar not animating?
- Check browser console for Three.js errors
- Ensure WebGL is enabled in your browser/VS Code

### Comments not appearing?
- Check Redis is running: `redis-cli ping`
- Check backend logs for Claude API errors
- Verify `ANTHROPIC_API_KEY` is set

### Extension not polling?
- Check status bar shows "👁 Watching"
- Verify backend URL in settings
- Check VS Code Developer Tools for errors

## License

MIT
