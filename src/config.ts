import "dotenv/config";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { parse as parseToml } from "smol-toml";
import { z } from "zod";

const configSchema = z.object({
  serverName: z.string().default("mcp-server"),
  serverVersion: z.string().default("1.0.0"),

  httpPort: z.coerce.number().int().min(1).max(65535).default(3000),
  httpHost: z.string().default("127.0.0.1"),

  logLevel: z.enum(["fatal", "error", "warn", "info", "debug", "trace"]).default("info"),
  nodeEnv: z.enum(["development", "production", "test"]).default("development"),

  authMode: z.enum(["none", "api-key", "oauth"]).default("none"),
  apiKeys: z.array(z.string()).default([]),

  jwtIssuer: z.string().optional(),
  jwtAudience: z.string().optional(),
  jwtSecret: z.string().optional(),
  jwksUri: z.string().url().optional(),

  oauthIssuerUrl: z.string().url().optional(),
});

export type Config = z.infer<typeof configSchema>;

interface TomlConfig {
  server?: { name?: string; version?: string };
  http?: { port?: number; host?: string };
  logging?: { level?: string };
  auth?: {
    mode?: string;
    keys?: string[];
    jwt?: { issuer?: string; audience?: string; secret?: string; jwks_uri?: string };
    oauth?: { issuer_url?: string };
  };
}

function loadToml(): TomlConfig {
  const configPath = process.env.MCP_CONFIG_PATH ?? resolve(process.cwd(), "config.toml");
  try {
    const content = readFileSync(configPath, "utf-8");
    return parseToml(content) as unknown as TomlConfig;
  } catch {
    return {};
  }
}

function envOrToml<T>(envValue: string | undefined, tomlValue: T): T | string | undefined {
  return envValue !== undefined ? envValue : tomlValue;
}

function loadConfig(): Config {
  const toml = loadToml();

  // Environment variables take precedence over TOML config
  const apiKeysFromEnv = process.env.MCP_API_KEYS
    ? process.env.MCP_API_KEYS.split(",").map((k) => k.trim())
    : undefined;

  const result = configSchema.safeParse({
    serverName: envOrToml(process.env.MCP_SERVER_NAME, toml.server?.name),
    serverVersion: envOrToml(process.env.MCP_SERVER_VERSION, toml.server?.version),
    httpPort: envOrToml(process.env.MCP_HTTP_PORT, toml.http?.port),
    httpHost: envOrToml(process.env.MCP_HTTP_HOST, toml.http?.host),
    logLevel: envOrToml(process.env.LOG_LEVEL, toml.logging?.level),
    nodeEnv: process.env.NODE_ENV,
    authMode: envOrToml(process.env.MCP_AUTH_MODE, toml.auth?.mode),
    apiKeys: apiKeysFromEnv ?? toml.auth?.keys,
    jwtIssuer: envOrToml(process.env.MCP_JWT_ISSUER, toml.auth?.jwt?.issuer),
    jwtAudience: envOrToml(process.env.MCP_JWT_AUDIENCE, toml.auth?.jwt?.audience),
    jwtSecret: envOrToml(process.env.MCP_JWT_SECRET, toml.auth?.jwt?.secret),
    jwksUri: envOrToml(process.env.MCP_JWKS_URI, toml.auth?.jwt?.jwks_uri),
    oauthIssuerUrl: envOrToml(process.env.MCP_OAUTH_ISSUER_URL, toml.auth?.oauth?.issuer_url),
  });

  if (!result.success) {
    console.error("Invalid configuration:", result.error.format());
    process.exit(1);
  }

  return result.data;
}

export const config = loadConfig();
