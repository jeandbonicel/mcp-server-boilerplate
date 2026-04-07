import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

export function register(server: McpServer): void {
  server.registerTool(
    "fetch-api",
    {
      title: "Fetch API",
      description: "Makes HTTP requests to external APIs and returns the response.",
      inputSchema: {
        url: z.string().url().describe("The URL to fetch"),
        method: z.enum(["GET", "POST", "PUT", "DELETE"]).default("GET").describe("HTTP method"),
        headers: z.record(z.string()).optional().describe("Optional HTTP headers"),
        body: z.string().optional().describe("Optional request body (for POST/PUT)"),
      },
      annotations: {
        readOnlyHint: false,
        openWorldHint: true,
      },
    },
    async ({ url, method, headers, body }) => {
      try {
        const response = await fetch(url, {
          method,
          headers: headers as Record<string, string>,
          body: method === "GET" || method === "DELETE" ? undefined : body,
        });

        const text = await response.text();

        return {
          content: [
            {
              type: "text",
              text: `HTTP ${response.status} ${response.statusText}\n\n${text}`,
            },
          ],
          isError: !response.ok,
        };
      } catch (error) {
        return {
          content: [{ type: "text", text: `Fetch error: ${(error as Error).message}` }],
          isError: true,
        };
      }
    },
  );
}
