import Link from "next/link";

export function EmptyState({
  icon,
  title,
  description,
  actionLabel,
  actionHref,
}: {
  icon?: string;
  title: string;
  description?: string;
  actionLabel?: string;
  actionHref?: string;
}) {
  return (
    <div className="empty-state-container">
      {icon && (
        <span className="empty-state-icon" aria-hidden="true">
          {icon}
        </span>
      )}
      <p className="empty-state-title">{title}</p>
      {description && (
        <p className="empty-state-description">{description}</p>
      )}
      {actionLabel && actionHref && (
        <Link href={actionHref} className="empty-state-action">
          {actionLabel}
        </Link>
      )}
    </div>
  );
}
