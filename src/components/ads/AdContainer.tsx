import { shouldShowAds } from "@/lib/ads";
import type { AdSlotId } from "@/lib/ads";

interface AdContainerProps {
  /** Current tenant plan */
  plan: string;
  /** Which ad slot to display */
  slotId: AdSlotId;
  /** Extra CSS class */
  className?: string;
  /** Children rendered only on free plan as ad content (client component) */
  children: React.ReactNode;
}

/**
 * Server-side wrapper that conditionally renders ad content based on tenant plan.
 * If the plan is PREMIUM/ACTIVE, renders nothing.
 * This prevents even loading the ad script on paid plans.
 */
export function AdContainer({ plan, slotId, className, children }: AdContainerProps) {
  if (!shouldShowAds(plan)) {
    return null;
  }

  return (
    <aside className={`ad-wrapper ${className ?? ""}`} data-ad-slot={slotId} aria-label="広告">
      {children}
    </aside>
  );
}
