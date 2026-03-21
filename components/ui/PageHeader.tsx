import Link from "next/link";
import { usePrototypeUI } from "../../context/PrototypeUIContext";
import type { ActionLink } from "../../types/app";

interface PageHeaderProps {
  title: string;
  description: string;
  actions?: ActionLink[];
}

export default function PageHeader({
  title,
  description,
  actions = [],
}: PageHeaderProps) {
  const { openModal, showToast } = usePrototypeUI();

  return (
    <div className="page-header">
      <div className="page-header-left">
        <h1>{title}</h1>
        <p>{description}</p>
      </div>

      <div className="page-header-right">
        {actions.map((action) =>
          action.modal || action.toastMessage || !action.href ? (
            <button
              key={action.label}
              type="button"
              className={`btn ${action.variant === "primary" ? "btn-primary" : "btn-secondary"} btn-sm`}
              onClick={() => {
                if (action.modal) {
                  openModal(action.modal);
                }

                if (action.toastMessage) {
                  showToast(action.toastMessage, action.toastTone);
                }
              }}
            >
              {action.label}
            </button>
          ) : (
            <Link
              key={`${action.href}-${action.label}`}
              href={action.href}
              className={`btn ${action.variant === "primary" ? "btn-primary" : "btn-secondary"} btn-sm`}
            >
              {action.label}
            </Link>
          ),
        )}
      </div>
    </div>
  );
}
