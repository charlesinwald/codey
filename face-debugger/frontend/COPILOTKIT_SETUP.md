# CopilotKit Integration

This document describes the CopilotKit integration in the Face Debugger project.

## Installation

CopilotKit packages have been added to `package.json`:
- `@copilotkit/react-core` - Core CopilotKit functionality
- `@copilotkit/react-ui` - UI components (Chat, Sidebar, etc.)
- `@copilotkit/runtime` - Runtime utilities

## Architecture

CopilotKit is integrated to work alongside the existing Claude API backend:

1. **Frontend**: CopilotKit React components for chat interface
2. **Backend**: Custom CopilotKit runtime adapter that connects to Claude API
3. **Integration**: CopilotKit chat appears as a sidebar/panel alongside the avatar

## Components

- `CopilotKit` - Main provider component
- `CopilotSidebar` - Sidebar chat interface
- `CopilotPopup` - Popup chat interface (alternative)
- Custom runtime adapter connecting to Claude API

## Configuration

CopilotKit is configured to use the existing backend Claude API endpoint, maintaining consistency with the existing code analysis functionality.

