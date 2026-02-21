#!/usr/bin/env node

/**
 * Script to query CopilotKit MCP server for available tools
 * Uses the MCP protocol to list tools
 */

const { spawn } = require('child_process');
const readline = require('readline');

// MCP protocol uses JSON-RPC over stdio
const mcpServer = spawn('npx', ['mcp-remote', 'https://mcp.copilotkit.ai'], {
  stdio: ['pipe', 'pipe', 'pipe']
});

const rl = readline.createInterface({
  input: mcpServer.stdout,
  output: process.stdout
});

let requestId = 1;

// Send initialize request
const initRequest = {
  jsonrpc: '2.0',
  id: requestId++,
  method: 'initialize',
  params: {
    protocolVersion: '2024-11-05',
    capabilities: {},
    clientInfo: {
      name: 'mcp-tool-query',
      version: '1.0.0'
    }
  }
};

mcpServer.stdin.write(JSON.stringify(initRequest) + '\n');

// After initialization, request tools list
setTimeout(() => {
  const toolsRequest = {
    jsonrpc: '2.0',
    id: requestId++,
    method: 'tools/list',
    params: {}
  };
  
  mcpServer.stdin.write(JSON.stringify(toolsRequest) + '\n');
}, 1000);

// Handle responses
let buffer = '';
mcpServer.stdout.on('data', (data) => {
  buffer += data.toString();
  const lines = buffer.split('\n');
  buffer = lines.pop() || '';
  
  for (const line of lines) {
    if (line.trim()) {
      try {
        const response = JSON.parse(line);
        if (response.result && response.result.tools) {
          console.log('\n=== Available MCP Tools ===\n');
          response.result.tools.forEach((tool, index) => {
            console.log(`${index + 1}. ${tool.name}`);
            if (tool.description) {
              console.log(`   Description: ${tool.description}`);
            }
            if (tool.inputSchema && tool.inputSchema.properties) {
              console.log(`   Parameters:`);
              Object.entries(tool.inputSchema.properties).forEach(([key, value]) => {
                console.log(`     - ${key}: ${value.type || 'any'}${value.description ? ` (${value.description})` : ''}`);
              });
            }
            console.log('');
          });
          mcpServer.kill();
          process.exit(0);
        } else if (response.result) {
          console.log('Response:', JSON.stringify(response.result, null, 2));
        }
      } catch (e) {
        // Not JSON, might be error output
        if (line.trim()) {
          console.log('Output:', line);
        }
      }
    }
  }
});

mcpServer.stderr.on('data', (data) => {
  console.error('Error:', data.toString());
});

mcpServer.on('close', (code) => {
  console.log(`\nProcess exited with code ${code}`);
  process.exit(code);
});

// Timeout after 10 seconds
setTimeout(() => {
  console.log('\nTimeout: Could not get tools list');
  mcpServer.kill();
  process.exit(1);
}, 10000);


