"use client";

import Script from "next/script";
import { getAdSenseClientId } from "@/lib/ads";

/**
 * Loads the Google AdSense script globally.
 * Only renders if the ADSENSE_CLIENT_ID env var is configured.
 */
export function AdSenseScript() {
  const clientId = getAdSenseClientId();

  if (!clientId) {
    return null;
  }

  return (
    <Script
      async
      src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${clientId}`}
      crossOrigin="anonymous"
      strategy="lazyOnload"
    />
  );
}
