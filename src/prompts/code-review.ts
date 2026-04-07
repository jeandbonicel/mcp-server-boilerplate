import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

export function register(server: McpServer): void {
  server.registerPrompt(
    "code-review",
    {
      title: "Code Review",
      description: "Generate a code review prompt for the given code snippet.",
      argsSchema: {
        code: z.string().describe("The code to review"),
        language: z.string().optional().describe("Programming language (e.g., typescript, python)"),
        focus: z
          .string()
          .optional()
          .describe("What to focus on: security, performance, readability, or all"),
      },
    },
    async ({ code, language, focus }) => ({
      messages: [
        {
          role: "user" as const,
          content: {
            type: "text" as const,
            text: [
              "Please review the following code.",
              language ? `Language: ${language}` : null,
              focus ? `Focus area: ${focus}` : null,
              "",
              "```",
              code,
              "```",
              "",
              "Provide feedback on:",
              "1. Correctness — are there any bugs or logic errors?",
              "2. Security — any vulnerabilities or unsafe patterns?",
              "3. Performance — any inefficiencies?",
              "4. Readability — is it clear and well-structured?",
              "5. Suggestions — concrete improvements with examples.",
            ]
              .filter((line) => line !== null)
              .join("\n"),
          },
        },
      ],
    }),
  );
}
