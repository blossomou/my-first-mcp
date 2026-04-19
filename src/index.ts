import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import * as fs from 'fs/promises';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { z } from 'zod';

const server = new McpServer(
  {
    name: 'my-first-mcp',
    version: '1.0.0',
  },
  {
    capabilities: {
      // Correct nesting for capabilities
      resources: {},
      tools: {},
    },
  },
);

server.registerTool(
  'add-numbers',
  {
    description: 'Add two numbers',
    inputSchema: {
      a: z.number().describe('First number'),
      b: z.number().describe('Second number'),
    },
  },

  ({ a, b }) => {
    return {
      content: [{ type: 'text', text: `Total is ${a + b}` }],
    };
  },
);

server.registerTool(
  'get_github_repos',
  {
    description: 'Get Github repositories from the given username',
    inputSchema: {
      username: z.string().describe('Github username'),
    },
  },

  async ({ username }) => {
    const res = await fetch(`https://api.github.com/users/${username}/repos`, {
      headers: { 'User-Agent': 'MCP-Server' },
    });

    if (!res.ok) throw new Error('Github API error!');

    const repos = await res.json();

    const repoList = repos
      .map((repo: any, i: number) => `${i + 1}. ${repo.name}`)
      .join('\n\n');

    return {
      content: [
        {
          type: 'text',
          text: `Github repositories for ${username}:(${repos.length} repos): \n\n${repoList}`,
        },
      ],
    };
  },
);

server.registerResource(
  'apartment-rules',
  'rules://all',
  {
    description: 'Resource for all apartment rules',
    mimeType: 'text/plain',
  },
  async (uri) => {
    const uriString = uri.toString();
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);

    const rules = await fs.readFile(
      path.resolve(__dirname, '../src/data/rules.doc'),
      'utf-8',
    );

    return {
      contents: [
        {
          uri: uriString,
          mimeType: 'text/plain',
          text: rules,
        },
      ],
    };
  },
);

server.registerPrompt(
  'explain-sql',
  {
    description: 'Explain the given SQL query',
    argsSchema: {
      sql: z.string().describe('The SQL query to explain'),
    },
  },
  ({ sql }) => {
    return {
      messages: [
        {
          role: 'user',
          content: {
            type: 'text',
            text: `Give me a detailed explanation of the following SQL query in plain Englis: ${sql} Make it very detailed and specific for a beginner to understand`,
          },
        },
      ],
    };
  },
);

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((error) => {
  console.error('Error in main!: ', error);
  process.exit(1);
});
