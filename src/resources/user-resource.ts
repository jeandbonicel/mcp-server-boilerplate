import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { ResourceTemplate } from "@modelcontextprotocol/sdk/server/mcp.js";

const MOCK_USERS: Record<string, { name: string; email: string; role: string }> = {
  "1": { name: "Alice Johnson", email: "alice@example.com", role: "admin" },
  "2": { name: "Bob Smith", email: "bob@example.com", role: "editor" },
  "3": { name: "Charlie Brown", email: "charlie@example.com", role: "viewer" },
};

export function register(server: McpServer): void {
  const template = new ResourceTemplate("users://directory/{userId}", { list: listUsers });

  server.registerResource(
    "user",
    template,
    {
      description: "Look up a user from the mock directory by their ID",
      mimeType: "application/json",
    },
    async (uri, { userId }) => {
      const user = MOCK_USERS[userId as string];
      if (!user) {
        return {
          contents: [{ uri: uri.href, mimeType: "text/plain", text: `User "${userId}" not found` }],
        };
      }
      return {
        contents: [
          {
            uri: uri.href,
            mimeType: "application/json",
            text: JSON.stringify({ id: userId, ...user }, null, 2),
          },
        ],
      };
    },
  );
}

async function listUsers() {
  return {
    resources: Object.entries(MOCK_USERS).map(([id, user]) => ({
      uri: `users://directory/${id}`,
      name: user.name,
      description: `${user.role} — ${user.email}`,
      mimeType: "application/json" as const,
    })),
  };
}
