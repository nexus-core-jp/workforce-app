import type { OAuthConfig, OAuthUserConfig } from "next-auth/providers";

export interface LineProfile {
  userId: string;
  displayName: string;
  pictureUrl?: string;
  statusMessage?: string;
  email?: string;
}

export function LineProvider<P extends LineProfile>(
  options?: OAuthUserConfig<P>,
): OAuthConfig<P> {
  return {
    id: "line",
    name: "LINE",
    type: "oauth",
    checks: ["state"],
    authorization: {
      url: "https://access.line.me/oauth2/v2.1/authorize",
      params: {
        scope: "profile openid email",
        bot_prompt: "normal",
      },
    },
    token: "https://api.line.me/oauth2/v2.1/token",
    userinfo: "https://api.line.me/v2/profile",
    clientId: process.env.LINE_CLIENT_ID,
    clientSecret: process.env.LINE_CLIENT_SECRET,
    profile(profile) {
      return {
        id: profile.userId,
        name: profile.displayName,
        image: profile.pictureUrl,
        email: profile.email,
      };
    },
    ...options,
  } as OAuthConfig<P>;
}
