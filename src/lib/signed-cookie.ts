import { createHmac, timingSafeEqual } from "node:crypto";

interface SignedPayload<T> {
  exp: number;
  data: T;
}

function base64urlEncode(input: string): string {
  return Buffer.from(input, "utf8").toString("base64url");
}

function base64urlDecode(input: string): string {
  return Buffer.from(input, "base64url").toString("utf8");
}

function signPart(part: string, secret: string): string {
  return createHmac("sha256", secret).update(part).digest("base64url");
}

export function createSignedCookieValue<T>(
  data: T,
  secret: string,
  ttlMs: number,
): string {
  const payload: SignedPayload<T> = {
    exp: Date.now() + ttlMs,
    data,
  };
  const encodedPayload = base64urlEncode(JSON.stringify(payload));
  const signature = signPart(encodedPayload, secret);
  return `${encodedPayload}.${signature}`;
}

export function readSignedCookieValue<T>(
  token: string | undefined,
  secret: string,
): T | null {
  if (!token) return null;
  const [encodedPayload, signature] = token.split(".");
  if (!encodedPayload || !signature) return null;

  const expected = signPart(encodedPayload, secret);
  const validSig =
    expected.length === signature.length &&
    timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
  if (!validSig) return null;

  try {
    const payload = JSON.parse(base64urlDecode(encodedPayload)) as SignedPayload<T>;
    if (!payload?.exp || payload.exp < Date.now()) return null;
    return payload.data;
  } catch {
    return null;
  }
}
