import { describe, it, expect } from "vitest";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { createServer } from "../src/server.js";

describe("MCP Server", () => {
  it("creates a server and lists tools", async () => {
    const server = createServer();
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
    await server.connect(serverTransport);

    const client = new Client({ name: "test-client", version: "1.0.0" });
    await client.connect(clientTransport);

    const tools = await client.listTools();
    const toolNames = tools.tools.map((t) => t.name).sort();

    expect(toolNames).toEqual(["calculator", "database", "echo", "fetch-api", "file-ops"]);
  });

  it("lists resources", async () => {
    const server = createServer();
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
    await server.connect(serverTransport);

    const client = new Client({ name: "test-client", version: "1.0.0" });
    await client.connect(clientTransport);

    const resources = await client.listResources();
    expect(resources.resources.length).toBeGreaterThanOrEqual(1);
  });

  it("lists prompts", async () => {
    const server = createServer();
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
    await server.connect(serverTransport);

    const client = new Client({ name: "test-client", version: "1.0.0" });
    await client.connect(clientTransport);

    const prompts = await client.listPrompts();
    const promptNames = prompts.prompts.map((p) => p.name).sort();

    expect(promptNames).toEqual(["code-review", "summarize"]);
  });
});
