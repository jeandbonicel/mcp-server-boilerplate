import { describe, it, expect, beforeEach } from "vitest";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import * as calculator from "../../src/tools/calculator.js";

describe("calculator tool", () => {
  let client: Client;

  beforeEach(async () => {
    const server = new McpServer({ name: "test", version: "1.0.0" });
    calculator.register(server);

    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
    await server.connect(serverTransport);

    client = new Client({ name: "test-client", version: "1.0.0" });
    await client.connect(clientTransport);
  });

  it("adds two numbers", async () => {
    const result = await client.callTool({
      name: "calculator",
      arguments: { operation: "add", a: 2, b: 3 },
    });
    expect(result.content).toEqual([{ type: "text", text: "2 add 3 = 5" }]);
  });

  it("divides two numbers", async () => {
    const result = await client.callTool({
      name: "calculator",
      arguments: { operation: "divide", a: 10, b: 2 },
    });
    expect(result.content).toEqual([{ type: "text", text: "10 divide 2 = 5" }]);
  });

  it("returns error on division by zero", async () => {
    const result = await client.callTool({
      name: "calculator",
      arguments: { operation: "divide", a: 5, b: 0 },
    });
    expect(result.isError).toBe(true);
    expect(result.content).toEqual([{ type: "text", text: "Error: Division by zero" }]);
  });
});
