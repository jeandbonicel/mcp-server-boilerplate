import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import * as configResource from "./config-resource.js";
import * as itemsResource from "./items-resource.js";
import * as userResource from "./user-resource.js";

export function registerAll(server: McpServer): void {
  configResource.register(server);
  itemsResource.register(server);
  userResource.register(server);
}
