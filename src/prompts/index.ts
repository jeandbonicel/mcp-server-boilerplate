import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import * as codeReview from "./code-review.js";
import * as summarize from "./summarize.js";

export function registerAll(server: McpServer): void {
  codeReview.register(server);
  summarize.register(server);
}
