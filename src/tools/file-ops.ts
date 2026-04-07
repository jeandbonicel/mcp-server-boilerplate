import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { readFile, writeFile, readdir, mkdir } from "node:fs/promises";
import { join, resolve, relative } from "node:path";

const SANDBOX_DIR = join(process.cwd(), ".mcp-files");

function safePath(userPath: string): string {
  const resolved = resolve(SANDBOX_DIR, userPath);
  const rel = relative(SANDBOX_DIR, resolved);
  if (rel.startsWith("..") || resolve(resolved) !== resolved) {
    throw new Error("Path traversal not allowed");
  }
  return resolved;
}

export function register(server: McpServer): void {
  server.registerTool(
    "file-ops",
    {
      title: "File Operations",
      description:
        "Read, write, or list files in a sandboxed directory (.mcp-files/). Paths are relative to the sandbox.",
      inputSchema: {
        operation: z.enum(["read", "write", "list"]).describe("The file operation to perform"),
        path: z.string().default(".").describe("Relative file path within the sandbox"),
        content: z.string().optional().describe("Content to write (required for write operation)"),
      },
      annotations: {
        readOnlyHint: false,
        destructiveHint: true,
        openWorldHint: false,
      },
    },
    async ({ operation, path, content }) => {
      try {
        await mkdir(SANDBOX_DIR, { recursive: true });

        switch (operation) {
          case "read": {
            const data = await readFile(safePath(path), "utf-8");
            return { content: [{ type: "text", text: data }] };
          }
          case "write": {
            if (!content) {
              return {
                content: [{ type: "text", text: "Error: content is required for write operation" }],
                isError: true,
              };
            }
            const filePath = safePath(path);
            const dir = filePath.substring(0, filePath.lastIndexOf("/"));
            await mkdir(dir, { recursive: true });
            await writeFile(filePath, content, "utf-8");
            return {
              content: [{ type: "text", text: `Written ${content.length} bytes to ${path}` }],
            };
          }
          case "list": {
            const entries = await readdir(safePath(path), { withFileTypes: true });
            const listing = entries
              .map((e) => `${e.isDirectory() ? "[dir]" : "[file]"} ${e.name}`)
              .join("\n");
            return { content: [{ type: "text", text: listing || "(empty directory)" }] };
          }
        }
      } catch (error) {
        return {
          content: [{ type: "text", text: `File operation error: ${(error as Error).message}` }],
          isError: true,
        };
      }
    },
  );
}
