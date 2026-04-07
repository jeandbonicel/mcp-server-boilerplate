import * as jose from "jose";
import { InvalidTokenError } from "@modelcontextprotocol/sdk/server/auth/errors.js";
import type { AuthInfo } from "@modelcontextprotocol/sdk/server/auth/types.js";
import type { OAuthTokenVerifier } from "@modelcontextprotocol/sdk/server/auth/provider.js";

export interface JwtVerifierOptions {
  issuer?: string;
  audience?: string;
  secret?: string;
  jwksUri?: string;
}

export class JwtVerifier implements OAuthTokenVerifier {
  private readonly options: JwtVerifierOptions;
  private jwks?: ReturnType<typeof jose.createRemoteJWKSet>;

  constructor(options: JwtVerifierOptions) {
    this.options = options;
    if (options.jwksUri) {
      this.jwks = jose.createRemoteJWKSet(new URL(options.jwksUri));
    }
  }

  async verifyAccessToken(token: string): Promise<AuthInfo> {
    try {
      let payload: jose.JWTPayload;

      if (this.jwks) {
        const result = await jose.jwtVerify(token, this.jwks, {
          issuer: this.options.issuer,
          audience: this.options.audience,
        });
        payload = result.payload;
      } else if (this.options.secret) {
        const secret = new TextEncoder().encode(this.options.secret);
        const result = await jose.jwtVerify(token, secret, {
          issuer: this.options.issuer,
          audience: this.options.audience,
        });
        payload = result.payload;
      } else {
        throw new Error("No JWKS URI or shared secret configured for JWT verification");
      }

      return {
        token,
        clientId: (payload.sub ?? payload.client_id ?? "unknown") as string,
        scopes: typeof payload.scope === "string" ? payload.scope.split(" ") : [],
        expiresAt: payload.exp,
      };
    } catch (error) {
      if (error instanceof jose.errors.JWTExpired) {
        throw new InvalidTokenError("Token expired");
      }
      if (error instanceof jose.errors.JWTClaimValidationFailed) {
        throw new InvalidTokenError(`Token validation failed: ${error.message}`);
      }
      throw new InvalidTokenError(`JWT verification failed: ${(error as Error).message}`);
    }
  }
}
