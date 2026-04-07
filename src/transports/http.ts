#!/usr/bin/env node
import { randomUUID } from "node:crypto";
import type { Request, Response } from "express";
import { createMcpExpressApp } from "@modelcontextprotocol/sdk/server/express.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { requireBearerAuth } from "@modelcontextprotocol/sdk/server/auth/middleware/bearerAuth.js";
import { mcpAuthRouter } from "@modelcontextprotocol/sdk/server/auth/router.js";
import { config } from "../config.js";
import { logger } from "../logger.js";
import { createServer } from "../server.js";
import { ApiKeyVerifier } from "../auth/api-key-verifier.js";
// import { JwtVerifier } from "../auth/jwt-verifier.js"; // Uncomment for JWT-only auth
import { DemoOAuthProvider } from "../auth/oauth-provider.js";

const sessions = new Map<string, { transport: StreamableHTTPServerTransport }>();

async function main(): Promise<void> {
  const app = createMcpExpressApp({ host: config.httpHost });

  // --- Auth setup ---
  let authMiddleware: ((req: Request, res: Response, next: () => void) => void) | undefined;

  if (config.authMode === "api-key") {
    if (config.apiKeys.length === 0) {
      logger.error("MCP_AUTH_MODE=api-key but no MCP_API_KEYS configured");
      process.exit(1);
    }
    const verifier = new ApiKeyVerifier(config.apiKeys);
    authMiddleware = requireBearerAuth({ verifier });
    logger.info("Auth: API key mode enabled");
  } else if (config.authMode === "oauth") {
    const oauthProvider = new DemoOAuthProvider();
    const issuerUrl = new URL(
      config.oauthIssuerUrl ?? `http://${config.httpHost}:${config.httpPort}`,
    );

    app.use(
      mcpAuthRouter({
        provider: oauthProvider,
        issuerUrl,
      }),
    );

    authMiddleware = requireBearerAuth({ verifier: oauthProvider });
    logger.info("Auth: OAuth 2.1 mode enabled (demo provider)");
  } else if (config.authMode === "none") {
    // For JWT-only verification without full OAuth, you could do:
    // const verifier = new JwtVerifier({ issuer: config.jwtIssuer, ... });
    // authMiddleware = requireBearerAuth({ verifier });
    logger.info("Auth: disabled");
  }

  // --- MCP Routes ---
  const applyAuth = authMiddleware
    ? (handler: (req: Request, res: Response) => Promise<void>) =>
        [authMiddleware!, async (req: Request, res: Response) => handler(req, res)] as const
    : (handler: (req: Request, res: Response) => Promise<void>) =>
        [async (req: Request, res: Response) => handler(req, res)] as const;

  // POST /mcp — client requests (init or message)
  app.post(
    "/mcp",
    ...applyAuth(async (req: Request, res: Response) => {
      const sessionId = req.headers["mcp-session-id"] as string | undefined;

      if (sessionId && sessions.has(sessionId)) {
        const session = sessions.get(sessionId)!;
        await session.transport.handleRequest(req, res, req.body);
        return;
      }

      // New session — create transport and server
      const transport = new StreamableHTTPServerTransport({
        sessionIdGenerator: () => randomUUID(),
      });

      transport.onclose = () => {
        const sid = (transport as unknown as { sessionId?: string }).sessionId;
        if (sid) {
          sessions.delete(sid);
          logger.debug({ sessionId: sid }, "Session closed");
        }
      };

      const server = createServer();
      await server.connect(transport);

      await transport.handleRequest(req, res, req.body);

      // Extract the session ID that was generated
      const newSessionId = (transport as unknown as { sessionId?: string }).sessionId;
      if (newSessionId) {
        sessions.set(newSessionId, { transport });
        logger.debug({ sessionId: newSessionId }, "Session created");
      }
    }),
  );

  // GET /mcp — SSE stream for server-to-client notifications
  app.get(
    "/mcp",
    ...applyAuth(async (req: Request, res: Response) => {
      const sessionId = req.headers["mcp-session-id"] as string | undefined;
      if (!sessionId || !sessions.has(sessionId)) {
        res.status(400).json({ error: "Invalid or missing session ID" });
        return;
      }
      const session = sessions.get(sessionId)!;
      await session.transport.handleRequest(req, res);
    }),
  );

  // DELETE /mcp — terminate session
  app.delete(
    "/mcp",
    ...applyAuth(async (req: Request, res: Response) => {
      const sessionId = req.headers["mcp-session-id"] as string | undefined;
      if (!sessionId || !sessions.has(sessionId)) {
        res.status(400).json({ error: "Invalid or missing session ID" });
        return;
      }
      const session = sessions.get(sessionId)!;
      await session.transport.handleRequest(req, res);
      sessions.delete(sessionId);
    }),
  );

  // Health check
  app.get("/health", (_req: Request, res: Response) => {
    res.json({ status: "ok", sessions: sessions.size });
  });

  // --- Start ---
  app.listen(config.httpPort, config.httpHost, () => {
    logger.info(
      `MCP server listening on http://${config.httpHost}:${config.httpPort}/mcp (auth: ${config.authMode})`,
    );
  });
}

main().catch((error) => {
  logger.fatal(error, "Failed to start HTTP MCP server");
  process.exit(1);
});
