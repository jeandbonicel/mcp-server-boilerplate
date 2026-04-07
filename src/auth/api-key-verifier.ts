import { InvalidTokenError } from "@modelcontextprotocol/sdk/server/auth/errors.js";
import type { AuthInfo } from "@modelcontextprotocol/sdk/server/auth/types.js";
import type { OAuthTokenVerifier } from "@modelcontextprotocol/sdk/server/auth/provider.js";

export class ApiKeyVerifier implements OAuthTokenVerifier {
  private readonly validKeys: Set<string>;

  constructor(apiKeys: string[]) {
    this.validKeys = new Set(apiKeys);
  }

  async verifyAccessToken(token: string): Promise<AuthInfo> {
    if (!this.validKeys.has(token)) {
      throw new InvalidTokenError("Invalid API key");
    }

    return {
      token,
      clientId: "api-key-client",
      scopes: ["*"],
    };
  }
}
