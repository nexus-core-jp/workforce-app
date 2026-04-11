import { describe, expect, it } from "vitest";
import * as OTPAuth from "otpauth";
import {
  generateRecoveryCodes,
  generateTotpSecret,
  verifyRecoveryCode,
  verifyTotp,
} from "@/lib/totp";

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

describe("Recovery codes", () => {
  it("generates 10 formatted codes and matching hashes", async () => {
    const { plaintext, hashes } = await generateRecoveryCodes();
    expect(plaintext).toHaveLength(10);
    expect(hashes).toHaveLength(10);
    for (const code of plaintext) {
      expect(code).toMatch(/^[a-f0-9]{5}-[a-f0-9]{5}$/);
    }
  });

  it("verifies a matching recovery code and returns its index", async () => {
    const { plaintext, hashes } = await generateRecoveryCodes();
    const idx = await verifyRecoveryCode(plaintext[3], hashes);
    expect(idx).toBe(3);
  });

  it("accepts recovery codes without hyphens", async () => {
    const { plaintext, hashes } = await generateRecoveryCodes();
    const flat = plaintext[0].replace("-", "");
    expect(await verifyRecoveryCode(flat, hashes)).toBe(0);
  });

  it("returns -1 for an invalid code", async () => {
    const { hashes } = await generateRecoveryCodes();
    expect(await verifyRecoveryCode("00000-00000", hashes)).toBe(-1);
  });
});
