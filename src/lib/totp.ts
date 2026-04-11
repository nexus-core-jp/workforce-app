import crypto from "node:crypto";

import bcrypt from "bcryptjs";
import * as OTPAuth from "otpauth";

const ISSUER = "Workforce Nexus";
const RECOVERY_CODE_COUNT = 10;
const RECOVERY_CODE_BYTES = 5; // → 10 hex chars

/**
 * Generate a new TOTP secret and return the URI for QR code generation.
 */
export function generateTotpSecret(email: string) {
  const totp = new OTPAuth.TOTP({
    issuer: ISSUER,
    label: email,
    algorithm: "SHA1",
    digits: 6,
    period: 30,
  });

  return {
    secret: totp.secret.base32,
    uri: totp.toString(),
  };
}

/**
 * Validate a TOTP code against a stored base32 secret.
 * Allows a 1-period window (±30s) for clock drift.
 */
export function verifyTotp(secret: string, code: string): boolean {
  const totp = new OTPAuth.TOTP({
    issuer: ISSUER,
    algorithm: "SHA1",
    digits: 6,
    period: 30,
    secret: OTPAuth.Secret.fromBase32(secret),
  });

  const delta = totp.validate({ token: code, window: 1 });
  return delta !== null;
}

/**
 * Generate N single-use recovery codes in the form "xxxxx-xxxxx" (10 hex chars
 * with a hyphen). Returns both the plaintext codes (shown once to the user)
 * and the bcrypt-hashed values (stored in the DB).
 */
export async function generateRecoveryCodes(): Promise<{
  plaintext: string[];
  hashes: string[];
}> {
  const plaintext: string[] = [];
  const hashes: string[] = [];
  for (let i = 0; i < RECOVERY_CODE_COUNT; i++) {
    const raw = crypto.randomBytes(RECOVERY_CODE_BYTES).toString("hex");
    const formatted = `${raw.slice(0, 5)}-${raw.slice(5, 10)}`;
    plaintext.push(formatted);
    hashes.push(await bcrypt.hash(formatted, 10));
  }
  return { plaintext, hashes };
}

/**
 * Verify a user-provided recovery code against the stored hash array.
 * Returns the index of the matched hash, or -1 if no match.
 *
 * Caller is responsible for removing the matched hash from storage so the
 * code cannot be reused.
 */
export async function verifyRecoveryCode(
  inputCode: string,
  hashes: string[],
): Promise<number> {
  // Normalize: lowercase, strip spaces, allow with or without hyphen
  const normalized = inputCode.trim().toLowerCase().replace(/\s+/g, "");
  const withHyphen =
    normalized.length === 10 && !normalized.includes("-")
      ? `${normalized.slice(0, 5)}-${normalized.slice(5, 10)}`
      : normalized;

  for (let i = 0; i < hashes.length; i++) {
    if (await bcrypt.compare(withHyphen, hashes[i])) return i;
  }
  return -1;
}
