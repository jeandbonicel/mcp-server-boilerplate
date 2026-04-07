import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { config } from "../config.js";

export function register(server: McpServer): void {
  server.registerResource(
    "server-config",
    "config://server/settings",
    {
      description: "Current server configuration (non-sensitive values only)",
      mimeType: "application/json",
    },
    async () => ({
      contents: [
        {
          uri: "config://server/settings",
          mimeType: "application/json",
          text: JSON.stringify(
            {
              serverName: config.serverName,
              serverVersion: config.serverVersion,
              httpPort: config.httpPort,
              httpHost: config.httpHost,
              authMode: config.authMode,
              logLevel: config.logLevel,
              nodeEnv: config.nodeEnv,
            },
            null,
            2,
          ),
        },
      ],
    }),
  );
}
