import { describe, it, expect, beforeEach } from "vitest";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import * as database from "../../src/tools/database.js";

describe("database tool", () => {
  let client: Client;

  beforeEach(async () => {
    database.store.clear();

    const server = new McpServer({ name: "test", version: "1.0.0" });
    database.register(server);

    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
    await server.connect(serverTransport);

    client = new Client({ name: "test-client", version: "1.0.0" });
    await client.connect(clientTransport);
  });

  it("creates and reads a value", async () => {
    await client.callTool({
      name: "database",
      arguments: { operation: "create", key: "test", value: { hello: "world" } },
    });

    const result = await client.callTool({
      name: "database",
      arguments: { operation: "read", key: "test" },
    });
    expect(result.content).toEqual([
      { type: "text", text: JSON.stringify({ hello: "world" }, null, 2) },
    ]);
  });

  it("lists keys", async () => {
    await client.callTool({
      name: "database",
      arguments: { operation: "create", key: "a", value: 1 },
    });
    await client.callTool({
      name: "database",
      arguments: { operation: "create", key: "b", value: 2 },
    });

    const result = await client.callTool({
      name: "database",
      arguments: { operation: "list" },
    });
    expect(result.content).toEqual([{ type: "text", text: "a\nb" }]);
  });

  it("returns error for duplicate create", async () => {
    await client.callTool({
      name: "database",
      arguments: { operation: "create", key: "dup", value: 1 },
    });
    const result = await client.callTool({
      name: "database",
      arguments: { operation: "create", key: "dup", value: 2 },
    });
    expect(result.isError).toBe(true);
  });

  it("deletes a key", async () => {
    await client.callTool({
      name: "database",
      arguments: { operation: "create", key: "del", value: "x" },
    });
    const delResult = await client.callTool({
      name: "database",
      arguments: { operation: "delete", key: "del" },
    });
    expect(delResult.isError).toBeUndefined();

    const readResult = await client.callTool({
      name: "database",
      arguments: { operation: "read", key: "del" },
    });
    expect(readResult.isError).toBe(true);
  });
});
