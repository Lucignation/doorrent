interface EmptyStateProps {
  title: string;
  description?: string;
}

export default function EmptyState({
  title,
  description = "This view is part of the complete implementation. Navigate to other sections.",
}: EmptyStateProps) {
  return (
    <div className="empty-state">
      <div className="empty-icon">🚧</div>
      <div className="empty-title">{title}</div>
      <div className="empty-desc">{description}</div>
    </div>
  );
}
