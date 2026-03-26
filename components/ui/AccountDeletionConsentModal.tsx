import { useEffect, useId, useState } from "react";

interface AccountDeletionConsentModalProps {
  open: boolean;
  title: string;
  description: string;
  consequences: string[];
  consentLabel: string;
  confirmLabel?: string;
  busy?: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
}

export default function AccountDeletionConsentModal({
  open,
  title,
  description,
  consequences,
  consentLabel,
  confirmLabel = "Delete Account",
  busy = false,
  onClose,
  onConfirm,
}: AccountDeletionConsentModalProps) {
  const titleId = useId();
  const descriptionId = useId();
  const [consented, setConsented] = useState(false);

  useEffect(() => {
    if (open) {
      setConsented(false);
    }
  }, [open]);

  useEffect(() => {
    if (!open) {
      return undefined;
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && !busy) {
        onClose();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [busy, onClose, open]);

  if (!open) {
    return null;
  }

  return (
    <div
      className="modal-overlay open"
      onClick={(event) => {
        if (event.target === event.currentTarget && !busy) {
          onClose();
        }
      }}
      role="presentation"
    >
      <div
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
      >
        <div className="modal-header">
          <div className="modal-title" id={titleId}>
            {title}
          </div>
          <button type="button" className="modal-close" onClick={onClose} disabled={busy}>
            ✕
          </button>
        </div>
        <div className="modal-body">
          <p id={descriptionId} style={{ marginTop: 0, color: "var(--ink2)", lineHeight: 1.7 }}>
            {description}
          </p>

          <div
            style={{
              border: "1px solid rgba(220, 64, 64, 0.18)",
              background: "rgba(220, 64, 64, 0.05)",
              borderRadius: 14,
              padding: 16,
              marginTop: 18,
            }}
          >
            <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 10 }}>
              Before you continue
            </div>
            <ul style={{ margin: 0, paddingLeft: 18, color: "var(--ink2)" }}>
              {consequences.map((item) => (
                <li key={item} style={{ marginBottom: 8 }}>
                  {item}
                </li>
              ))}
            </ul>
          </div>

          <label
            style={{
              display: "flex",
              alignItems: "flex-start",
              gap: 10,
              marginTop: 18,
              fontSize: 13,
              color: "var(--ink)",
            }}
          >
            <input
              type="checkbox"
              checked={consented}
              onChange={(event) => setConsented(event.target.checked)}
              disabled={busy}
              style={{ marginTop: 2 }}
            />
            <span>{consentLabel}</span>
          </label>
        </div>
        <div className="modal-footer">
          <button type="button" className="btn btn-secondary btn-sm" onClick={onClose} disabled={busy}>
            Cancel
          </button>
          <button
            type="button"
            className="btn btn-danger btn-sm"
            onClick={() => void onConfirm()}
            disabled={busy || !consented}
          >
            {busy ? "Deleting..." : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
