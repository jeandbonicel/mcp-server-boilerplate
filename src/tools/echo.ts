import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

export function register(server: McpServer): void {
  server.registerTool(
    "echo",
    {
      title: "Echo",
      description: "Echoes back the provided message. Useful for testing connectivity.",
      inputSchema: {
        message: z.string().describe("The message to echo back"),
      },
      annotations: {
        readOnlyHint: true,
        openWorldHint: false,
      },
    },
    async ({ message }) => ({
      content: [{ type: "text", text: message }],
    }),
  );
}
