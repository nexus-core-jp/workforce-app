/**
 * Ad monetization configuration and helpers.
 *
 * Ad slots are defined here with their Google AdSense slot IDs.
 * Components reference these slot definitions to render ads.
 */

export type AdSlotId =
  | "dashboard-top"
  | "dashboard-bottom"
  | "admin-sidebar"
  | "daily-reports-footer"
  | "post-clockout";

export interface AdSlotConfig {
  id: AdSlotId;
  /** Google AdSense ad slot ID */
  slotId: string;
  /** Display format */
  format: "banner" | "rectangle" | "infeed";
  /** Desktop width */
  width: number;
  /** Desktop height */
  height: number;
  /** Mobile width (defaults to 320) */
  mobileWidth?: number;
  /** Mobile height (defaults to 50 for banners, 250 for rectangles) */
  mobileHeight?: number;
  /** Label shown in the ad container */
  label: string;
}

const ENV_SLOT_MAP: Record<AdSlotId, string> = {
  "dashboard-top": process.env.NEXT_PUBLIC_ADSENSE_SLOT_DASHBOARD_TOP ?? "",
  "dashboard-bottom": process.env.NEXT_PUBLIC_ADSENSE_SLOT_DASHBOARD_BOTTOM ?? "",
  "admin-sidebar": process.env.NEXT_PUBLIC_ADSENSE_SLOT_ADMIN_SIDEBAR ?? "",
  "daily-reports-footer": process.env.NEXT_PUBLIC_ADSENSE_SLOT_REPORTS_FOOTER ?? "",
  "post-clockout": process.env.NEXT_PUBLIC_ADSENSE_SLOT_POST_CLOCKOUT ?? "",
};

export const AD_SLOTS: Record<AdSlotId, AdSlotConfig> = {
  "dashboard-top": {
    id: "dashboard-top",
    slotId: ENV_SLOT_MAP["dashboard-top"],
    format: "banner",
    width: 728,
    height: 90,
    mobileWidth: 320,
    mobileHeight: 50,
    label: "スポンサー",
  },
  "dashboard-bottom": {
    id: "dashboard-bottom",
    slotId: ENV_SLOT_MAP["dashboard-bottom"],
    format: "rectangle",
    width: 300,
    height: 250,
    label: "スポンサー",
  },
  "admin-sidebar": {
    id: "admin-sidebar",
    slotId: ENV_SLOT_MAP["admin-sidebar"],
    format: "rectangle",
    width: 300,
    height: 250,
    label: "スポンサー",
  },
  "daily-reports-footer": {
    id: "daily-reports-footer",
    slotId: ENV_SLOT_MAP["daily-reports-footer"],
    format: "banner",
    width: 728,
    height: 90,
    mobileWidth: 320,
    mobileHeight: 50,
    label: "スポンサー",
  },
  "post-clockout": {
    id: "post-clockout",
    slotId: ENV_SLOT_MAP["post-clockout"],
    format: "infeed",
    width: 468,
    height: 60,
    mobileWidth: 320,
    mobileHeight: 50,
    label: "スポンサー",
  },
};

/** Ad provider type */
export type AdProvider = "adsense" | "custom";

/** Returns the configured ad provider */
export function getAdProvider(): AdProvider {
  const provider = process.env.NEXT_PUBLIC_AD_PROVIDER ?? "adsense";
  return provider === "custom" ? "custom" : "adsense";
}

/** Returns the Google AdSense client ID from env */
export function getAdSenseClientId(): string {
  return process.env.NEXT_PUBLIC_ADSENSE_CLIENT_ID ?? "";
}

/**
 * Returns custom ad HTML for a given slot.
 * Used for affiliate ads (A8.net, etc.) via environment variables.
 *
 * Env var naming: NEXT_PUBLIC_AD_CUSTOM_HTML_{SLOT_ID_UPPER}
 * e.g. NEXT_PUBLIC_AD_CUSTOM_HTML_DASHBOARD_TOP
 */
export function getCustomAdHtml(slotId: AdSlotId): string {
  const envKey = slotId.replace(/-/g, "_").toUpperCase();
  return process.env[`NEXT_PUBLIC_AD_CUSTOM_HTML_${envKey}`] ?? "";
}

/** Check if ads should be shown for a given plan */
export function shouldShowAds(plan: string): boolean {
  return plan === "FREE" || plan === "TRIAL";
}
