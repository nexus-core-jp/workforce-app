import * as OTPAuth from "otpauth";

const ISSUER = "Workforce Nexus";

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
