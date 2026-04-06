// SVG mini-layout previews for each estate landing page template.
// Each thumbnail is a scaled-down visual representation of what the
// actual published page looks like — not just a text label.

type TemplateId = "template-estate" | "template-company" | "template-operations";

interface Props {
  templateId: TemplateId | string;
  primaryColor?: string;
  className?: string;
}

// ── template-estate: Estate Official Landing ─────────────────────────────
// Layout: nav → full-width hero → two-col (about | fee table) → notice strip → footer
function EstateOfficialThumbnail({ color }: { color: string }) {
  return (
    <svg
      viewBox="0 0 320 200"
      xmlns="http://www.w3.org/2000/svg"
      className="estate-template-thumbnail"
      aria-hidden
    >
      {/* bg */}
      <rect width="320" height="200" fill="#F5F4F0" />

      {/* nav bar */}
      <rect width="320" height="22" fill={color} />
      <rect x="12" y="7" width="40" height="8" rx="2" fill="rgba(255,255,255,0.8)" />
      <rect x="230" y="8" width="28" height="6" rx="2" fill="rgba(255,255,255,0.5)" />
      <rect x="264" y="8" width="28" height="6" rx="2" fill="rgba(255,255,255,0.9)" />

      {/* hero section */}
      <rect y="22" width="320" height="72" fill={color} opacity="0.9" />
      <rect x="12" y="34" width="60" height="5" rx="2" fill="rgba(255,255,255,0.45)" />
      <rect x="12" y="44" width="140" height="12" rx="2" fill="rgba(255,255,255,0.95)" />
      <rect x="12" y="60" width="100" height="6" rx="2" fill="rgba(255,255,255,0.6)" />
      <rect x="12" y="72" width="56" height="14" rx="4" fill="rgba(255,255,255,0.95)" />
      <rect x="76" y="72" width="56" height="14" rx="4" fill="rgba(255,255,255,0.3)" />

      {/* two-col content */}
      {/* left col — about */}
      <rect x="12" y="104" width="140" height="52" rx="6" fill="#fff" stroke="#E8E6DF" strokeWidth="1" />
      <rect x="20" y="112" width="36" height="5" rx="2" fill="#D4D1C7" />
      <rect x="20" y="121" width="120" height="3" rx="1" fill="#E8E6DF" />
      <rect x="20" y="127" width="100" height="3" rx="1" fill="#E8E6DF" />
      <rect x="20" y="133" width="112" height="3" rx="1" fill="#E8E6DF" />
      <rect x="20" y="139" width="80" height="3" rx="1" fill="#E8E6DF" />

      {/* right col — fees table */}
      <rect x="160" y="104" width="148" height="52" rx="6" fill="#fff" stroke="#E8E6DF" strokeWidth="1" />
      <rect x="168" y="112" width="36" height="5" rx="2" fill="#D4D1C7" />
      <rect x="168" y="122" width="130" height="1" fill="#E8E6DF" />
      <rect x="168" y="126" width="80" height="3" rx="1" fill="#E8E6DF" />
      <rect x="248" y="126" width="30" height="3" rx="1" fill={color} opacity="0.5" />
      <rect x="168" y="132" width="1" height="0" fill="transparent" />
      <rect x="168" y="133" width="80" height="3" rx="1" fill="#E8E6DF" />
      <rect x="248" y="133" width="30" height="3" rx="1" fill={color} opacity="0.5" />
      <rect x="168" y="140" width="80" height="3" rx="1" fill="#E8E6DF" />
      <rect x="248" y="140" width="30" height="3" rx="1" fill={color} opacity="0.5" />

      {/* notice strip */}
      <rect x="12" y="163" width="296" height="18" rx="4" fill="#FDF6EA" stroke="#E8E6DF" strokeWidth="1" />
      <rect x="20" y="169" width="8" height="6" rx="1" fill="#C8A96E" />
      <rect x="32" y="170" width="80" height="4" rx="1" fill="#B07D2A" opacity="0.7" />
      <rect x="120" y="170" width="60" height="4" rx="1" fill="#D4D1C7" />

      {/* footer bar */}
      <rect y="186" width="320" height="14" fill="#E8E6DF" />
      <rect x="12" y="190" width="60" height="3" rx="1" fill="#A8A59E" />
      <rect x="200" y="190" width="40" height="3" rx="1" fill="#A8A59E" />
      <rect x="248" y="190" width="40" height="3" rx="1" fill="#A8A59E" />
    </svg>
  );
}

// ── template-company: Property Company Showcase ──────────────────────────
// Layout: nav → large hero image → 3-col portfolio grid → listings list → team row → CTA
function PropertyCompanyThumbnail({ color }: { color: string }) {
  return (
    <svg
      viewBox="0 0 320 200"
      xmlns="http://www.w3.org/2000/svg"
      className="estate-template-thumbnail"
      aria-hidden
    >
      {/* bg */}
      <rect width="320" height="200" fill="#F5F4F0" />

      {/* nav */}
      <rect width="320" height="20" fill="#1A1916" />
      <rect x="12" y="7" width="44" height="6" rx="2" fill="rgba(255,255,255,0.85)" />
      <rect x="190" y="8" width="24" height="4" rx="1" fill="rgba(255,255,255,0.4)" />
      <rect x="220" y="8" width="24" height="4" rx="1" fill="rgba(255,255,255,0.4)" />
      <rect x="250" y="7" width="30" height="6" rx="2" fill={color} />

      {/* full-bleed hero image */}
      <defs>
        <linearGradient id="heroGrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#2D3A2E" />
          <stop offset="100%" stopColor="#1A1916" />
        </linearGradient>
      </defs>
      <rect y="20" width="320" height="80" fill="url(#heroGrad)" />
      {/* subtle building silhouette */}
      <rect x="220" y="40" width="20" height="60" fill="rgba(255,255,255,0.07)" />
      <rect x="246" y="52" width="16" height="48" fill="rgba(255,255,255,0.05)" />
      <rect x="268" y="44" width="24" height="56" fill="rgba(255,255,255,0.06)" />
      <rect x="296" y="60" width="18" height="40" fill="rgba(255,255,255,0.04)" />

      <rect x="20" y="38" width="56" height="5" rx="2" fill="rgba(255,255,255,0.4)" />
      <rect x="20" y="48" width="160" height="14" rx="2" fill="rgba(255,255,255,0.95)" />
      <rect x="20" y="66" width="120" height="5" rx="2" fill="rgba(255,255,255,0.55)" />
      <rect x="20" y="78" width="72" height="14" rx="4" fill={color} />

      {/* portfolio grid — 3 cards */}
      <rect x="12" y="110" width="90" height="44" rx="5" fill="#fff" stroke="#E8E6DF" strokeWidth="1" />
      <rect x="12" y="110" width="90" height="22" rx="5" fill="#D4D1C7" />
      <rect x="12" y="127" width="90" height="5" fill="#D4D1C7" /> {/* square bottom of image */}
      <rect x="18" y="136" width="50" height="4" rx="1" fill="#E8E6DF" />
      <rect x="18" y="143" width="36" height="3" rx="1" fill="#E8E6DF" />

      <rect x="115" y="110" width="90" height="44" rx="5" fill="#fff" stroke="#E8E6DF" strokeWidth="1" />
      <rect x="115" y="110" width="90" height="22" rx="5" fill="#C8C5BC" />
      <rect x="115" y="127" width="90" height="5" fill="#C8C5BC" />
      <rect x="121" y="136" width="50" height="4" rx="1" fill="#E8E6DF" />
      <rect x="121" y="143" width="36" height="3" rx="1" fill="#E8E6DF" />

      <rect x="218" y="110" width="90" height="44" rx="5" fill="#fff" stroke="#E8E6DF" strokeWidth="1" />
      <rect x="218" y="110" width="90" height="22" rx="5" fill="#BCBAB2" />
      <rect x="218" y="127" width="90" height="5" fill="#BCBAB2" />
      <rect x="224" y="136" width="50" height="4" rx="1" fill="#E8E6DF" />
      <rect x="224" y="143" width="36" height="3" rx="1" fill="#E8E6DF" />

      {/* team strip */}
      <rect x="12" y="162" width="296" height="28" rx="6" fill="#fff" stroke="#E8E6DF" strokeWidth="1" />
      <circle cx="30" cy="176" r="8" fill="#E8E6DF" />
      <circle cx="52" cy="176" r="8" fill="#D4D1C7" />
      <circle cx="74" cy="176" r="8" fill="#BCBAB2" />
      <rect x="90" y="171" width="60" height="4" rx="1" fill="#D4D1C7" />
      <rect x="90" y="179" width="40" height="3" rx="1" fill="#E8E6DF" />
      <rect x="232" y="170" width="64" height="12" rx="4" fill={color} />
      <rect x="240" y="174" width="48" height="4" rx="1" fill="rgba(255,255,255,0.8)" />
    </svg>
  );
}

// ── template-operations: Resident Operations Portal ───────────────────────
// Layout: nav → compact hero → 3 pass status cards → worker roster list → service requests → emergency contacts
function OperationsPortalThumbnail({ color }: { color: string }) {
  return (
    <svg
      viewBox="0 0 320 200"
      xmlns="http://www.w3.org/2000/svg"
      className="estate-template-thumbnail"
      aria-hidden
    >
      {/* bg */}
      <rect width="320" height="200" fill="#F5F4F0" />

      {/* nav */}
      <rect width="320" height="20" fill={color} />
      <rect x="12" y="7" width="40" height="6" rx="2" fill="rgba(255,255,255,0.8)" />
      <rect x="220" y="8" width="36" height="4" rx="1" fill="rgba(255,255,255,0.5)" />
      <rect x="262" y="7" width="44" height="6" rx="3" fill="rgba(255,255,255,0.25)" />

      {/* compact hero — operations feel */}
      <rect y="20" width="320" height="48" fill={color} opacity="0.85" />
      <rect x="12" y="28" width="56" height="4" rx="2" fill="rgba(255,255,255,0.45)" />
      <rect x="12" y="36" width="180" height="10" rx="2" fill="rgba(255,255,255,0.92)" />
      {/* duty badge */}
      <rect x="240" y="28" width="68" height="28" rx="5" fill="rgba(255,255,255,0.15)" />
      <rect x="248" y="33" width="30" height="4" rx="1" fill="rgba(255,255,255,0.6)" />
      <rect x="248" y="41" width="20" height="7" rx="2" fill="rgba(255,255,255,0.9)" />

      {/* 3 pass/status cards */}
      <rect x="12" y="76" width="90" height="40" rx="5" fill="#fff" stroke="#E8E6DF" strokeWidth="1" />
      <rect x="18" y="83" width="20" height="4" rx="1" fill="#D4D1C7" />
      <rect x="18" y="91" width="46" height="8" rx="2" fill={color} opacity="0.15" />
      <rect x="22" y="94" width="38" height="3" rx="1" fill={color} opacity="0.7" />
      <rect x="18" y="104" width="60" height="3" rx="1" fill="#E8E6DF" />

      <rect x="115" y="76" width="90" height="40" rx="5" fill="#fff" stroke="#E8E6DF" strokeWidth="1" />
      <rect x="121" y="83" width="20" height="4" rx="1" fill="#D4D1C7" />
      <rect x="121" y="91" width="46" height="8" rx="2" fill="#E6F4EE" />
      <rect x="125" y="94" width="38" height="3" rx="1" fill="#1A6B4A" opacity="0.7" />
      <rect x="121" y="104" width="60" height="3" rx="1" fill="#E8E6DF" />

      <rect x="218" y="76" width="90" height="40" rx="5" fill="#fff" stroke="#E8E6DF" strokeWidth="1" />
      <rect x="224" y="83" width="20" height="4" rx="1" fill="#D4D1C7" />
      <rect x="224" y="91" width="46" height="8" rx="2" fill="#FDF3E0" />
      <rect x="228" y="94" width="38" height="3" rx="1" fill="#B07D2A" opacity="0.7" />
      <rect x="224" y="104" width="60" height="3" rx="1" fill="#E8E6DF" />

      {/* roster list */}
      <rect x="12" y="124" width="296" height="12" rx="3" fill="#fff" stroke="#E8E6DF" strokeWidth="1" />
      <circle cx="22" cy="130" r="4" fill="#D4D1C7" />
      <rect x="30" y="127" width="50" height="3" rx="1" fill="#D4D1C7" />
      <rect x="30" y="132" width="36" height="3" rx="1" fill="#E8E6DF" />
      <rect x="260" y="127" width="40" height="6" rx="2" fill={color} opacity="0.2" />
      <rect x="264" y="129" width="32" height="2" rx="1" fill={color} opacity="0.6" />

      <rect x="12" y="140" width="296" height="12" rx="3" fill="#fff" stroke="#E8E6DF" strokeWidth="1" />
      <circle cx="22" cy="146" r="4" fill="#C8C5BC" />
      <rect x="30" y="143" width="50" height="3" rx="1" fill="#D4D1C7" />
      <rect x="30" y="148" width="36" height="3" rx="1" fill="#E8E6DF" />
      <rect x="260" y="143" width="40" height="6" rx="2" fill="#E6F4EE" />
      <rect x="264" y="145" width="32" height="2" rx="1" fill="#1A6B4A" opacity="0.6" />

      {/* emergency contacts strip */}
      <rect x="12" y="160" width="296" height="30" rx="5" fill="#FDECEA" stroke="#F5C6C3" strokeWidth="1" />
      <rect x="20" y="167" width="8" height="8" rx="1" fill="#C0392B" opacity="0.6" />
      <rect x="32" y="168" width="60" height="4" rx="1" fill="#C0392B" opacity="0.7" />
      <rect x="32" y="176" width="40" height="3" rx="1" fill="#C0392B" opacity="0.4" />
      <rect x="120" y="168" width="1" height="16" fill="#F5C6C3" />
      <rect x="128" y="168" width="60" height="4" rx="1" fill="#C0392B" opacity="0.7" />
      <rect x="128" y="176" width="40" height="3" rx="1" fill="#C0392B" opacity="0.4" />
    </svg>
  );
}

const THUMBNAIL_MAP: Record<TemplateId, React.ComponentType<{ color: string }>> = {
  "template-estate": EstateOfficialThumbnail,
  "template-company": PropertyCompanyThumbnail,
  "template-operations": OperationsPortalThumbnail,
};

export default function LandingTemplateThumbnail({ templateId, primaryColor = "#1A3A2A", className }: Props) {
  const Component = THUMBNAIL_MAP[templateId as TemplateId];
  if (!Component) {
    // Fallback for unknown template ids — generic placeholder
    return (
      <svg viewBox="0 0 320 200" xmlns="http://www.w3.org/2000/svg" className={className ?? "estate-template-thumbnail"} aria-hidden>
        <rect width="320" height="200" fill="#F5F4F0" />
        <rect width="320" height="20" fill={primaryColor} />
        <rect x="12" y="80" width="160" height="12" rx="2" fill="#D4D1C7" />
        <rect x="12" y="96" width="120" height="6" rx="2" fill="#E8E6DF" />
      </svg>
    );
  }
  return <Component color={primaryColor} />;
}
