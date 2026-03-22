import Link from "next/link";

export interface NotificationFeedItem {
  id: string;
  title: string;
  body: string;
  time: string;
  tone: "green" | "amber" | "red" | "blue";
  href?: string;
}

interface NotificationFeedProps {
  items: NotificationFeedItem[];
  emptyMessage: string;
}

function toneStyles(tone: NotificationFeedItem["tone"]) {
  if (tone === "green") {
    return { background: "var(--green-light)", color: "var(--green)" };
  }

  if (tone === "amber") {
    return { background: "var(--amber-light)", color: "var(--amber)" };
  }

  if (tone === "red") {
    return { background: "var(--red-light)", color: "var(--red)" };
  }

  return { background: "var(--blue-light)", color: "var(--blue)" };
}

export default function NotificationFeed({
  items,
  emptyMessage,
}: NotificationFeedProps) {
  if (!items.length) {
    return (
      <div className="card">
        <div className="card-body" style={{ color: "var(--ink2)" }}>
          {emptyMessage}
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {items.map((item) => {
        const content = (
          <div className="card-body">
            <div style={{ display: "flex", alignItems: "flex-start", gap: 14 }}>
              <div
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: 12,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                  ...toneStyles(item.tone),
                }}
              >
                !
              </div>
              <div style={{ flex: 1 }}>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    marginBottom: 6,
                  }}
                >
                  <div style={{ fontSize: 14, fontWeight: 600 }}>{item.title}</div>
                  <span
                    style={{ marginLeft: "auto", fontSize: 11, color: "var(--ink3)" }}
                  >
                    {item.time}
                  </span>
                </div>
                <div style={{ fontSize: 13, color: "var(--ink2)", lineHeight: 1.6 }}>
                  {item.body}
                </div>
              </div>
            </div>
          </div>
        );

        return item.href ? (
          <Link
            key={item.id}
            href={item.href}
            className="card"
            style={{ display: "block" }}
          >
            {content}
          </Link>
        ) : (
          <div key={item.id} className="card">
            {content}
          </div>
        );
      })}
    </div>
  );
}
