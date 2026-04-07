import { describe, it, expect, beforeEach } from "vitest";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import * as echo from "../../src/tools/echo.js";

describe("echo tool", () => {
  let client: Client;

  beforeEach(async () => {
    const server = new McpServer({ name: "test", version: "1.0.0" });
    echo.register(server);

    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
    await server.connect(serverTransport);

    client = new Client({ name: "test-client", version: "1.0.0" });
    await client.connect(clientTransport);
  });

  it("echoes the message back", async () => {
    const result = await client.callTool({ name: "echo", arguments: { message: "hello world" } });
    expect(result.content).toEqual([{ type: "text", text: "hello world" }]);
  });
});
