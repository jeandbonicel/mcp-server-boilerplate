/**
 * Demo OAuth 2.1 Server Provider
 *
 * This is a demonstration implementation for development and testing.
 * In production, replace this with your real identity provider (Auth0, Keycloak, etc.)
 * or implement the OAuthServerProvider interface with your own authorization logic.
 */
import { randomUUID, randomBytes } from "node:crypto";
import type { Response } from "express";
import type {
  OAuthServerProvider,
  AuthorizationParams,
} from "@modelcontextprotocol/sdk/server/auth/provider.js";
import type { OAuthRegisteredClientsStore } from "@modelcontextprotocol/sdk/server/auth/clients.js";
import type {
  OAuthClientInformationFull,
  OAuthTokens,
  OAuthTokenRevocationRequest,
} from "@modelcontextprotocol/sdk/shared/auth.js";
import type { AuthInfo } from "@modelcontextprotocol/sdk/server/auth/types.js";
import {
  InvalidGrantError,
  InvalidTokenError,
} from "@modelcontextprotocol/sdk/server/auth/errors.js";

interface AuthCode {
  clientId: string;
  codeChallenge: string;
  redirectUri: string;
  scopes: string[];
  expiresAt: number;
}

interface TokenRecord {
  clientId: string;
  scopes: string[];
  expiresAt: number;
}

class InMemoryClientsStore implements OAuthRegisteredClientsStore {
  private clients = new Map<string, OAuthClientInformationFull>();

  getClient(clientId: string): OAuthClientInformationFull | undefined {
    return this.clients.get(clientId);
  }

  registerClient(
    client: Omit<OAuthClientInformationFull, "client_id" | "client_id_issued_at">,
  ): OAuthClientInformationFull {
    const full: OAuthClientInformationFull = {
      ...client,
      client_id: randomUUID(),
      client_id_issued_at: Math.floor(Date.now() / 1000),
      client_secret: randomBytes(32).toString("hex"),
      client_secret_expires_at: 0, // never expires in demo
    };
    this.clients.set(full.client_id, full);
    return full;
  }
}

export class DemoOAuthProvider implements OAuthServerProvider {
  private readonly _clientsStore = new InMemoryClientsStore();
  private readonly authCodes = new Map<string, AuthCode>();
  private readonly accessTokens = new Map<string, TokenRecord>();
  private readonly refreshTokens = new Map<string, TokenRecord>();

  get clientsStore(): OAuthRegisteredClientsStore {
    return this._clientsStore;
  }

  async authorize(
    client: OAuthClientInformationFull,
    params: AuthorizationParams,
    res: Response,
  ): Promise<void> {
    // In a real implementation, you'd show a login page here.
    // For the demo, we auto-approve and redirect immediately.
    const code = randomBytes(16).toString("hex");
    this.authCodes.set(code, {
      clientId: client.client_id,
      codeChallenge: params.codeChallenge,
      redirectUri: params.redirectUri,
      scopes: params.scopes ?? [],
      expiresAt: Date.now() + 10 * 60 * 1000, // 10 minutes
    });

    const redirectUrl = new URL(params.redirectUri);
    redirectUrl.searchParams.set("code", code);
    if (params.state) {
      redirectUrl.searchParams.set("state", params.state);
    }
    res.redirect(redirectUrl.toString());
  }

  async challengeForAuthorizationCode(
    _client: OAuthClientInformationFull,
    authorizationCode: string,
  ): Promise<string> {
    const record = this.authCodes.get(authorizationCode);
    if (!record) {
      throw new InvalidGrantError("Unknown authorization code");
    }
    return record.codeChallenge;
  }

  async exchangeAuthorizationCode(
    client: OAuthClientInformationFull,
    authorizationCode: string,
  ): Promise<OAuthTokens> {
    const record = this.authCodes.get(authorizationCode);
    if (!record || record.clientId !== client.client_id) {
      throw new InvalidGrantError("Invalid authorization code");
    }
    if (Date.now() > record.expiresAt) {
      this.authCodes.delete(authorizationCode);
      throw new InvalidGrantError("Authorization code expired");
    }
    this.authCodes.delete(authorizationCode);

    return this.issueTokens(client.client_id, record.scopes);
  }

  async exchangeRefreshToken(
    client: OAuthClientInformationFull,
    refreshToken: string,
    scopes?: string[],
  ): Promise<OAuthTokens> {
    const record = this.refreshTokens.get(refreshToken);
    if (!record || record.clientId !== client.client_id) {
      throw new InvalidGrantError("Invalid refresh token");
    }
    this.refreshTokens.delete(refreshToken);

    return this.issueTokens(client.client_id, scopes ?? record.scopes);
  }

  async verifyAccessToken(token: string): Promise<AuthInfo> {
    const record = this.accessTokens.get(token);
    if (!record) {
      throw new InvalidTokenError("Invalid access token");
    }
    if (Date.now() / 1000 > record.expiresAt) {
      this.accessTokens.delete(token);
      throw new InvalidTokenError("Access token expired");
    }

    return {
      token,
      clientId: record.clientId,
      scopes: record.scopes,
      expiresAt: record.expiresAt,
    };
  }

  async revokeToken(
    _client: OAuthClientInformationFull,
    request: OAuthTokenRevocationRequest,
  ): Promise<void> {
    this.accessTokens.delete(request.token);
    this.refreshTokens.delete(request.token);
  }

  private issueTokens(clientId: string, scopes: string[]): OAuthTokens {
    const accessToken = randomBytes(32).toString("hex");
    const refreshToken = randomBytes(32).toString("hex");
    const expiresIn = 3600; // 1 hour

    this.accessTokens.set(accessToken, {
      clientId,
      scopes,
      expiresAt: Math.floor(Date.now() / 1000) + expiresIn,
    });
    this.refreshTokens.set(refreshToken, {
      clientId,
      scopes,
      expiresAt: Math.floor(Date.now() / 1000) + 7 * 24 * 3600, // 7 days
    });

    return {
      access_token: accessToken,
      token_type: "bearer",
      expires_in: expiresIn,
      refresh_token: refreshToken,
    };
  }
}
