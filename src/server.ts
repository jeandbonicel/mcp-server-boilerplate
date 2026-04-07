import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { config } from "./config.js";
import { getVersion } from "./utils/version.js";
import { registerAll as registerTools } from "./tools/index.js";
import { registerAll as registerResources } from "./resources/index.js";
import { registerAll as registerPrompts } from "./prompts/index.js";

export function createServer(): McpServer {
  const server = new McpServer(
    {
      name: config.serverName,
      version: getVersion(),
    },
    {
      capabilities: {
        logging: {},
      },
    },
  );

  registerTools(server);
  registerResources(server);
  registerPrompts(server);

  return server;
}
