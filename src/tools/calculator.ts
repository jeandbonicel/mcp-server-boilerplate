import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

export function register(server: McpServer): void {
  server.registerTool(
    "calculator",
    {
      title: "Calculator",
      description: "Performs basic arithmetic operations: add, subtract, multiply, divide.",
      inputSchema: {
        operation: z
          .enum(["add", "subtract", "multiply", "divide"])
          .describe("The operation to perform"),
        a: z.number().describe("First operand"),
        b: z.number().describe("Second operand"),
      },
      annotations: {
        readOnlyHint: true,
        openWorldHint: false,
      },
    },
    async ({ operation, a, b }) => {
      let result: number;

      switch (operation) {
        case "add":
          result = a + b;
          break;
        case "subtract":
          result = a - b;
          break;
        case "multiply":
          result = a * b;
          break;
        case "divide":
          if (b === 0) {
            return {
              content: [{ type: "text", text: "Error: Division by zero" }],
              isError: true,
            };
          }
          result = a / b;
          break;
      }

      return {
        content: [{ type: "text", text: `${a} ${operation} ${b} = ${result}` }],
      };
    },
  );
}
