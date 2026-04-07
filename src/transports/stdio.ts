#!/usr/bin/env node
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { createServer } from "../server.js";
import { logger } from "../logger.js";

async function main(): Promise<void> {
  const server = createServer();
  const transport = new StdioServerTransport();

  await server.connect(transport);
  logger.info("MCP server started on stdio transport");
}

main().catch((error) => {
  logger.fatal(error, "Failed to start MCP server");
  process.exit(1);
});
