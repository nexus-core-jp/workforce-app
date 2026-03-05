/**
 * Whether the face-auth feature is available in this deployment.
 *
 * Set NEXT_PUBLIC_FACE_AUTH_AVAILABLE=true to enable.
 * When false the UI shows the feature as "requires setup" and all
 * face-auth API routes reject requests.
 */
export function isFaceAuthAvailable(): boolean {
  return process.env.NEXT_PUBLIC_FACE_AUTH_AVAILABLE === "true";
}
