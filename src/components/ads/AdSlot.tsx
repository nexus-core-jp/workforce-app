"use client";

import { useEffect, useRef } from "react";
import { AD_SLOTS, getAdProvider, getAdSenseClientId, getCustomAdHtml, type AdSlotId } from "@/lib/ads";

interface AdSlotProps {
  /** The ad slot to render */
  slotId: AdSlotId;
  /** Custom class name */
  className?: string;
}

/**
 * Renders an ad unit based on the configured provider.
 *
 * Supports:
 * - Google AdSense (provider="adsense")
 * - Custom HTML ads like A8.net affiliates (provider="custom")
 * - Development placeholder (when no provider is configured)
 */
export function AdSlot({ slotId, className }: AdSlotProps) {
  const adRef = useRef<HTMLModElement>(null);
  const config = AD_SLOTS[slotId];
  const provider = getAdProvider();
  const clientId = getAdSenseClientId();
  const customHtml = getCustomAdHtml(slotId);

  useEffect(() => {
    if (provider !== "adsense" || !clientId || !config.slotId) return;
    try {
      const adsbygoogle = (window as unknown as Record<string, unknown[]>).adsbygoogle;
      if (adsbygoogle) {
        adsbygoogle.push({});
      }
    } catch {
      // AdSense not loaded or blocked
    }
  }, [provider, clientId, config.slotId]);

  const removeLink = (
    <div className="ad-remove-link">
      <a href="/admin/billing">広告を非表示にする</a>
    </div>
  );

  // Custom HTML ads (A8.net, affiliate tags, etc.)
  if (provider === "custom" && customHtml) {
    return (
      <div className={`ad-container ${className ?? ""}`}>
        <div className="ad-label">{config.label}</div>
        <div
          className="ad-custom"
          style={{ width: "100%", maxWidth: config.width, minHeight: config.height }}
          dangerouslySetInnerHTML={{ __html: customHtml }}
        />
        {removeLink}
      </div>
    );
  }

  // AdSense ads
  if (provider === "adsense" && clientId && config.slotId) {
    return (
      <div className={`ad-container ${className ?? ""}`}>
        <div className="ad-label">{config.label}</div>
        <ins
          ref={adRef}
          className="adsbygoogle"
          style={{
            display: "block",
            width: "100%",
            maxWidth: config.width,
            height: config.height,
          }}
          data-ad-client={clientId}
          data-ad-slot={config.slotId}
          data-ad-format={config.format === "banner" ? "horizontal" : "rectangle"}
          data-full-width-responsive="true"
        />
        {removeLink}
      </div>
    );
  }

  // Development placeholder
  return (
    <div className={`ad-container ${className ?? ""}`}>
      <div className="ad-label">{config.label}</div>
      <div
        className="ad-placeholder"
        style={{
          width: "100%",
          maxWidth: config.width,
          height: config.height,
        }}
      >
        <span className="ad-placeholder-text">
          広告スペース ({config.width}x{config.height})
        </span>
      </div>
      {removeLink}
    </div>
  );
}
