"use client";

import { useEffect, useRef } from "react";
import { AD_SLOTS, getAdSenseClientId, type AdSlotId } from "@/lib/ads";

interface AdSlotProps {
  /** The ad slot to render */
  slotId: AdSlotId;
  /** Custom class name */
  className?: string;
}

/**
 * Renders a Google AdSense ad unit.
 * In development (no client ID configured), shows a placeholder.
 */
export function AdSlot({ slotId, className }: AdSlotProps) {
  const adRef = useRef<HTMLModElement>(null);
  const config = AD_SLOTS[slotId];
  const clientId = getAdSenseClientId();

  useEffect(() => {
    if (!clientId || !config.slotId) return;
    try {
      // Push the ad to AdSense
      const adsbygoogle = (window as unknown as Record<string, unknown[]>).adsbygoogle;
      if (adsbygoogle) {
        adsbygoogle.push({});
      }
    } catch {
      // AdSense not loaded or blocked
    }
  }, [clientId, config.slotId]);

  // Development placeholder when AdSense is not configured
  if (!clientId || !config.slotId) {
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
        <div className="ad-remove-link">
          <a href="/admin/billing">広告を非表示にする</a>
        </div>
      </div>
    );
  }

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
      <div className="ad-remove-link">
        <a href="/admin/billing">広告を非表示にする</a>
      </div>
    </div>
  );
}
