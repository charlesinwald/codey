# Face-to-Face Debugging

An AI pair programmer that watches your code in VS Code and reacts via a photorealistic Tavus video avatar. Think of it as having a grumpy senior engineer looking over your shoulder — but in a helpful way.

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
│   React Frontend    │                    │  ┌───────────────┐  │
│   (Tavus Avatar)    │ ◄────────────────  │  │  Tavus API    │  │
└─────────────────────┘   WebRTC/Speech    │  └───────────────┘  │
                                           │          │          │
                                           │          ▼          │
                                           │  ┌───────────────┐  │
                                           │  │    Redis      │  │
                                           │  └───────────────┘  │
                                           └─────────────────────┘
```

## Prerequisites

- Node.js 18+
- Python 3.11+
- Redis (local or Docker)
- API Keys:
  - [Anthropic API Key](https://console.anthropic.com/)
  - [Tavus API Key](https://platform.tavus.io/)

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
# Edit .env with your API keys
```

### 3. Create Tavus Persona

Before starting the backend, create your Tavus persona:

```bash
cd scripts
python create_persona.py
# Copy the printed persona_id into backend/.env as TAVUS_PERSONA_ID
```

### 4. Start Backend

```bash
cd backend
uvicorn main:app --reload --port 8000
```

### 5. Frontend Setup

```bash
cd frontend
npm install
cp .env.example .env
npm run dev
```

### 6. VS Code Extension

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
| `TAVUS_API_KEY` | Yes | Your Tavus API key |
| `TAVUS_REPLICA_ID` | Yes | Tavus replica ID (default provided) |
| `TAVUS_PERSONA_ID` | Yes | Created via `create_persona.py` |
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

### Avatar Speech

When Claude decides to speak:
1. Backend calls Tavus `/say` endpoint
2. Avatar speaks the comment in real-time via WebRTC
3. Comment is stored in Redis history

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

### Avatar not speaking?
- Check Redis is running: `redis-cli ping`
- Verify Tavus credentials in `.env`
- Check backend logs for Tavus API errors

### Extension not polling?
- Check status bar shows "👁 Watching"
- Verify backend URL in settings
- Check VS Code Developer Tools for errors

### Claude not responding?
- Verify `ANTHROPIC_API_KEY` is set
- Check backend logs for API errors
- Ensure content is actually changing between polls

## License

MIT
