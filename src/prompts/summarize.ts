import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

export function register(server: McpServer): void {
  server.registerPrompt(
    "summarize",
    {
      title: "Summarize",
      description: "Generate a summarization prompt with configurable style.",
      argsSchema: {
        text: z.string().describe("The text to summarize"),
        style: z
          .enum(["brief", "detailed", "bullet-points"])
          .default("brief")
          .describe("Summarization style"),
        maxLength: z
          .string()
          .optional()
          .describe("Approximate max length (e.g., '100 words', '3 sentences')"),
      },
    },
    async ({ text, style, maxLength }) => {
      const styleInstructions: Record<string, string> = {
        brief: "Provide a concise summary in 1-2 sentences.",
        detailed: "Provide a thorough summary covering all key points.",
        "bullet-points": "Summarize as a bulleted list of key points.",
      };

      return {
        messages: [
          {
            role: "user" as const,
            content: {
              type: "text" as const,
              text: [
                "Please summarize the following text.",
                "",
                styleInstructions[style],
                maxLength ? `Target length: ${maxLength}.` : null,
                "",
                "---",
                text,
                "---",
              ]
                .filter((line) => line !== null)
                .join("\n"),
            },
          },
        ],
      };
    },
  );
}
