"use client";

import Link from "next/link";

interface PremiumUpsellProps {
  /** Whether the current user is an admin (shows billing link) */
  isAdmin: boolean;
}

/**
 * A subtle banner encouraging upgrade to the Premium (ad-free) plan.
 * Only rendered on FREE plan pages.
 */
export function PremiumUpsell({ isAdmin }: PremiumUpsellProps) {
  return (
    <div className="premium-upsell">
      <div className="premium-upsell-content">
        <div className="premium-upsell-text">
          <strong>プレミアムプラン</strong>で広告なしの快適な環境を
        </div>
        {isAdmin ? (
          <Link href="/admin/billing" className="premium-upsell-btn">
            アップグレード
          </Link>
        ) : (
          <span className="premium-upsell-hint">
            管理者にお問い合わせください
          </span>
        )}
      </div>
    </div>
  );
}
