import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

const store = new Map<string, unknown>();

export function register(server: McpServer): void {
  server.registerTool(
    "database",
    {
      title: "Database",
      description:
        "In-memory key-value store. Supports create, read, update, delete, and list operations. Data persists for the session lifetime.",
      inputSchema: {
        operation: z
          .enum(["create", "read", "update", "delete", "list"])
          .describe("The database operation"),
        key: z.string().optional().describe("The key to operate on (not needed for list)"),
        value: z
          .unknown()
          .optional()
          .describe("The value to store (required for create/update). Can be any JSON value."),
      },
      annotations: {
        readOnlyHint: false,
        openWorldHint: false,
      },
    },
    async ({ operation, key, value }) => {
      switch (operation) {
        case "create": {
          if (!key) {
            return { content: [{ type: "text", text: "Error: key is required" }], isError: true };
          }
          if (store.has(key)) {
            return {
              content: [
                { type: "text", text: `Error: key "${key}" already exists. Use update instead.` },
              ],
              isError: true,
            };
          }
          store.set(key, value);
          return { content: [{ type: "text", text: `Created "${key}"` }] };
        }
        case "read": {
          if (!key) {
            return { content: [{ type: "text", text: "Error: key is required" }], isError: true };
          }
          if (!store.has(key)) {
            return {
              content: [{ type: "text", text: `Error: key "${key}" not found` }],
              isError: true,
            };
          }
          return { content: [{ type: "text", text: JSON.stringify(store.get(key), null, 2) }] };
        }
        case "update": {
          if (!key) {
            return { content: [{ type: "text", text: "Error: key is required" }], isError: true };
          }
          if (!store.has(key)) {
            return {
              content: [{ type: "text", text: `Error: key "${key}" not found` }],
              isError: true,
            };
          }
          store.set(key, value);
          return { content: [{ type: "text", text: `Updated "${key}"` }] };
        }
        case "delete": {
          if (!key) {
            return { content: [{ type: "text", text: "Error: key is required" }], isError: true };
          }
          if (!store.delete(key)) {
            return {
              content: [{ type: "text", text: `Error: key "${key}" not found` }],
              isError: true,
            };
          }
          return { content: [{ type: "text", text: `Deleted "${key}"` }] };
        }
        case "list": {
          const keys = Array.from(store.keys());
          return {
            content: [{ type: "text", text: keys.length ? keys.join("\n") : "(empty store)" }],
          };
        }
      }
    },
  );
}

export { store };
