import { describe, expect, it } from "vitest";
import * as OTPAuth from "otpauth";
import { generateTotpSecret, verifyTotp } from "@/lib/totp";

describe("TOTP", () => {
  it("generates a secret and URI", () => {
    const { secret, uri } = generateTotpSecret("test@example.com");
    expect(secret).toBeTruthy();
    expect(secret.length).toBeGreaterThan(10);
    expect(uri).toContain("otpauth://totp/");
    expect(uri).toContain("Workforce%20Nexus");
    expect(uri).toContain("test%40example.com");
  });

  it("verifies a valid TOTP code", () => {
    const { secret } = generateTotpSecret("test@example.com");
    const totp = new OTPAuth.TOTP({
      issuer: "Workforce Nexus",
      algorithm: "SHA1",
      digits: 6,
      period: 30,
      secret: OTPAuth.Secret.fromBase32(secret),
    });
    const code = totp.generate();
    expect(verifyTotp(secret, code)).toBe(true);
  });

  it("rejects an invalid TOTP code", () => {
    const { secret } = generateTotpSecret("test@example.com");
    expect(verifyTotp(secret, "000000")).toBe(false);
  });
});
