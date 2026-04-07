import { describe, it, expect } from "vitest";
import { ApiKeyVerifier } from "../../src/auth/api-key-verifier.js";

describe("ApiKeyVerifier", () => {
  const verifier = new ApiKeyVerifier(["valid-key-1", "valid-key-2"]);

  it("accepts a valid API key", async () => {
    const info = await verifier.verifyAccessToken("valid-key-1");
    expect(info.token).toBe("valid-key-1");
    expect(info.clientId).toBe("api-key-client");
    expect(info.scopes).toEqual(["*"]);
  });

  it("rejects an invalid API key", async () => {
    await expect(verifier.verifyAccessToken("bad-key")).rejects.toThrow("Invalid API key");
  });

  it("rejects an empty token", async () => {
    await expect(verifier.verifyAccessToken("")).rejects.toThrow("Invalid API key");
  });
});
