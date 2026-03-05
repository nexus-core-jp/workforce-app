/**
 * Whether the face-auth feature is available in this deployment.
 *
 * Set NEXT_PUBLIC_FACE_AUTH_AVAILABLE=true to enable.
 * When false the UI hides the feature and all face-auth API routes reject requests.
 */
export function isFaceAuthAvailable(): boolean {
  return process.env.NEXT_PUBLIC_FACE_AUTH_AVAILABLE === "true";
}
