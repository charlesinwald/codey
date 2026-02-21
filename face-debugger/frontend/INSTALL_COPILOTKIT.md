# Installing CopilotKit

The CopilotKit packages have been added to `package.json`, but they need to be installed.

## Installation

Run one of these commands in the `face-debugger/frontend` directory:

### Using npm:
```bash
cd face-debugger/frontend
npm install
```

### Using yarn:
```bash
cd face-debugger/frontend
yarn install
```

This will install all dependencies including:
- `@copilotkit/react-core` - Core CopilotKit functionality
- `@copilotkit/react-ui` - UI components (CopilotSidebar, etc.)

## After Installation

Once installed, restart your dev server:
```bash
npm run dev
# or
yarn dev
```

The CopilotKit sidebar should now appear in your application.

## Troubleshooting

If you encounter SSL certificate errors, try:
```bash
npm config set strict-ssl false
npm install
```

Or with yarn:
```bash
yarn config set strict-ssl false
yarn install
```

