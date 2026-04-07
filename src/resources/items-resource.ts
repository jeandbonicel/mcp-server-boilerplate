import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { ResourceTemplate } from "@modelcontextprotocol/sdk/server/mcp.js";
import { store } from "../tools/database.js";

export function register(server: McpServer): void {
  const template = new ResourceTemplate("items://store/{key}", { list: listItems });

  server.registerResource(
    "store-item",
    template,
    {
      description: "Read a value from the in-memory key-value store by key",
      mimeType: "application/json",
    },
    async (uri, { key }) => {
      const value = store.get(key as string);
      if (value === undefined) {
        return {
          contents: [
            {
              uri: uri.href,
              mimeType: "text/plain",
              text: `Key "${key}" not found`,
            },
          ],
        };
      }
      return {
        contents: [
          {
            uri: uri.href,
            mimeType: "application/json",
            text: JSON.stringify(value, null, 2),
          },
        ],
      };
    },
  );
}

async function listItems() {
  return {
    resources: Array.from(store.keys()).map((key) => ({
      uri: `items://store/${key}`,
      name: key,
      description: `Stored item: ${key}`,
      mimeType: "application/json" as const,
    })),
  };
}
