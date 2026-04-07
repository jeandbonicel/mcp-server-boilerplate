import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import * as echo from "./echo.js";
import * as calculator from "./calculator.js";
import * as fetchApi from "./fetch-api.js";
import * as fileOps from "./file-ops.js";
import * as database from "./database.js";

export function registerAll(server: McpServer): void {
  echo.register(server);
  calculator.register(server);
  fetchApi.register(server);
  fileOps.register(server);
  database.register(server);
}
