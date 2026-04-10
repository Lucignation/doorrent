import type { ComponentType } from "react";

export type LandingTemplateThumbnailId =
  | "estate-official"
  | "estate-resident"
  | "estate-fees"
  | "estate-exco"
  | "estate-blank"
  | "property-profile"
  | "property-leasing"
  | "property-portfolio"
  | "property-corporate"
  | "property-blank"
  | "template-estate"
  | "template-company"
  | "template-operations";

interface Props {
  templateId: LandingTemplateThumbnailId | string;
  primaryColor?: string;
  accentColor?: string;
  className?: string;
}

interface ThumbProps {
  color: string;
  accent: string;
  className?: string;
}

// Luxury Estate Showcase — sparse, editorial, high whitespace, premium
function EstateOfficialThumbnail({ color, accent, className }: ThumbProps) {
  return (
    <svg viewBox="0 0 320 200" xmlns="http://www.w3.org/2000/svg" className={className} aria-hidden>
      <rect width="320" height="200" fill="#F7F5F0" />
      {/* Minimal nav — dark bar, logo left, ghost CTA right */}
      <rect width="320" height="20" fill="#111110" />
      <rect x="14" y="7" width="52" height="6" rx="3" fill="rgba(255,255,255,0.88)" />
      <rect x="240" y="8" width="22" height="4" rx="2" fill="rgba(255,255,255,0.3)" />
      <rect x="268" y="6" width="38" height="8" rx="4" fill={accent} />
      {/* Full-width hero — premium gradient, large headline */}
      <defs>
        <linearGradient id="luxury-hero" x1="0" y1="0" x2="0.7" y2="1">
          <stop offset="0%" stopColor={color} />
          <stop offset="100%" stopColor="#0A1A12" />
        </linearGradient>
      </defs>
      <rect y="20" width="320" height="80" fill="url(#luxury-hero)" />
      {/* Eyebrow — small caps, accent color */}
      <rect x="18" y="32" width="62" height="4" rx="2" fill={accent} opacity="0.85" />
      {/* Large headline — 2 lines, white */}
      <rect x="18" y="42" width="190" height="10" rx="2" fill="#FFFFFF" />
      <rect x="18" y="57" width="148" height="10" rx="2" fill="rgba(255,255,255,0.72)" />
      {/* Subtext */}
      <rect x="18" y="73" width="140" height="4" rx="2" fill="rgba(255,255,255,0.45)" />
      {/* CTA buttons */}
      <rect x="18" y="83" width="70" height="11" rx="5" fill="#FFFFFF" />
      <rect x="96" y="83" width="58" height="11" rx="5" fill="rgba(255,255,255,0.18)" stroke="rgba(255,255,255,0.4)" strokeWidth="0.5" />
      {/* Amenity grid — 3 cards, icon + label */}
      <rect x="16" y="112" width="88" height="36" rx="6" fill="#FFFFFF" stroke="#E8E2D8" />
      <rect x="26" y="120" width="12" height="12" rx="3" fill={color} opacity="0.14" />
      <rect x="42" y="121" width="50" height="4" rx="2" fill="#D0C9BC" />
      <rect x="42" y="128" width="36" height="3" rx="2" fill="#E8E3D8" />
      <rect x="116" y="112" width="88" height="36" rx="6" fill="#FFFFFF" stroke="#E8E2D8" />
      <rect x="126" y="120" width="12" height="12" rx="3" fill={accent} opacity="0.18" />
      <rect x="142" y="121" width="50" height="4" rx="2" fill="#D0C9BC" />
      <rect x="142" y="128" width="36" height="3" rx="2" fill="#E8E3D8" />
      <rect x="216" y="112" width="88" height="36" rx="6" fill="#FFFFFF" stroke="#E8E2D8" />
      <rect x="226" y="120" width="12" height="12" rx="3" fill={color} opacity="0.14" />
      <rect x="242" y="121" width="50" height="4" rx="2" fill="#D0C9BC" />
      <rect x="242" y="128" width="36" height="3" rx="2" fill="#E8E3D8" />
      {/* Fee row — gold accent, table layout */}
      <rect x="16" y="158" width="288" height="28" rx="6" fill="#FFFBF2" stroke="#EEE0C0" />
      <rect x="26" y="165" width="48" height="4" rx="2" fill="#C4971E" opacity="0.8" />
      <rect x="26" y="173" width="80" height="3" rx="2" fill="#E5D9B8" />
      <rect x="224" y="165" width="68" height="4" rx="2" fill="#D9C99A" opacity="0.7" />
      <rect x="224" y="172" width="48" height="4" rx="2" fill={accent} opacity="0.82" />
      {/* Footer stripe */}
      <rect y="192" width="320" height="8" fill="#E8E3D8" />
    </svg>
  );
}

// Community Living Estate — warm, practical, card-based service grid
function EstateResidentThumbnail({ color, accent, className }: ThumbProps) {
  return (
    <svg viewBox="0 0 320 200" xmlns="http://www.w3.org/2000/svg" className={className} aria-hidden>
      <rect width="320" height="200" fill="#F5F7F4" />
      {/* Nav — colored, welcoming */}
      <rect width="320" height="20" fill={color} />
      <rect x="14" y="7" width="50" height="6" rx="3" fill="rgba(255,255,255,0.9)" />
      <rect x="236" y="7" width="70" height="6" rx="3" fill={accent} />
      {/* Hero — warm, community feel, image panel right */}
      <rect y="20" width="320" height="60" fill="#FFFFFF" />
      <rect x="18" y="28" width="56" height="4" rx="2" fill={color} opacity="0.6" />
      <rect x="18" y="37" width="168" height="10" rx="2" fill="#1A1D19" opacity="0.88" />
      <rect x="18" y="52" width="130" height="5" rx="2" fill="#8A9188" />
      <rect x="18" y="63" width="62" height="10" rx="5" fill={color} />
      <rect x="86" y="63" width="54" height="10" rx="5" fill={color} opacity="0.12" />
      {/* Community image panel (right side) */}
      <rect x="220" y="24" width="84" height="52" rx="6" fill={color} opacity="0.1" />
      <rect x="232" y="32" width="60" height="36" rx="4" fill={color} opacity="0.18" />
      {/* Service cards — 2×2 grid */}
      <rect x="16" y="92" width="136" height="38" rx="6" fill="#FFFFFF" stroke="#E2E8DF" />
      <rect x="24" y="100" width="16" height="16" rx="4" fill={color} opacity="0.12" />
      <rect x="46" y="102" width="72" height="4" rx="2" fill="#C8D1C6" />
      <rect x="46" y="110" width="90" height="3" rx="2" fill="#E2E8DF" />
      <rect x="46" y="116" width="68" height="3" rx="2" fill="#E2E8DF" />
      <rect x="168" y="92" width="136" height="38" rx="6" fill="#FFFFFF" stroke="#E2E8DF" />
      <rect x="176" y="100" width="16" height="16" rx="4" fill={accent} opacity="0.2" />
      <rect x="198" y="102" width="72" height="4" rx="2" fill="#C8D1C6" />
      <rect x="198" y="110" width="90" height="3" rx="2" fill="#E2E8DF" />
      <rect x="198" y="116" width="68" height="3" rx="2" fill="#E2E8DF" />
      {/* Notice strip */}
      <rect x="16" y="140" width="288" height="14" rx="4" fill="#EEF3EC" stroke="#D4E0D0" />
      <rect x="24" y="145" width="8" height="4" rx="2" fill={color} opacity="0.7" />
      <rect x="36" y="145" width="110" height="4" rx="2" fill="#8A9C87" />
      <rect x="240" y="143" width="56" height="8" rx="4" fill={color} opacity="0.14" />
      {/* Gallery strip — 3 small thumbnails */}
      <rect x="16" y="162" width="88" height="28" rx="5" fill={color} opacity="0.16" />
      <rect x="116" y="162" width="88" height="28" rx="5" fill={accent} opacity="0.16" />
      <rect x="216" y="162" width="88" height="28" rx="5" fill={color} opacity="0.12" />
      {/* Footer */}
      <rect y="195" width="320" height="5" fill="#DDE5D9" />
    </svg>
  );
}

// Smart & Tech-Enabled Estate — clean, minimal, grid-based digital services
function EstateFeesThumbnail({ color, accent, className }: ThumbProps) {
  return (
    <svg viewBox="0 0 320 200" xmlns="http://www.w3.org/2000/svg" className={className} aria-hidden>
      <rect width="320" height="200" fill="#F2F4F7" />
      {/* Nav — stark white with color dot */}
      <rect width="320" height="20" fill="#FFFFFF" />
      <rect x="14" y="7" width="10" height="6" rx="2" fill={color} />
      <rect x="28" y="7" width="44" height="6" rx="3" fill="#1A1C1F" opacity="0.85" />
      <rect x="248" y="7" width="58" height="6" rx="3" fill={color} opacity="0.12" />
      <rect x="270" y="6" width="36" height="8" rx="4" fill={color} />
      {/* Hero — white bg, technical headline */}
      <rect y="20" width="320" height="58" fill="#FFFFFF" />
      <rect x="18" y="30" width="52" height="4" rx="2" fill={color} opacity="0.72" />
      <rect x="18" y="39" width="180" height="11" rx="2" fill="#14171C" opacity="0.9" />
      <rect x="18" y="55" width="140" height="5" rx="2" fill="#8A9099" />
      <rect x="18" y="65" width="64" height="9" rx="4" fill={color} />
      <rect x="88" y="65" width="56" height="9" rx="4" fill={color} opacity="0.1" />
      {/* Tech features — horizontal pill grid */}
      <rect x="16" y="90" width="86" height="30" rx="6" fill="#FFFFFF" stroke="#DDE3EC" />
      <rect x="22" y="98" width="10" height="10" rx="3" fill={color} opacity="0.18" />
      <rect x="38" y="99" width="52" height="4" rx="2" fill="#BCC3CE" />
      <rect x="38" y="106" width="40" height="3" rx="2" fill="#DDE3EC" />
      <rect x="118" y="90" width="86" height="30" rx="6" fill="#FFFFFF" stroke="#DDE3EC" />
      <rect x="124" y="98" width="10" height="10" rx="3" fill={accent} opacity="0.22" />
      <rect x="140" y="99" width="52" height="4" rx="2" fill="#BCC3CE" />
      <rect x="140" y="106" width="40" height="3" rx="2" fill="#DDE3EC" />
      <rect x="220" y="90" width="84" height="30" rx="6" fill="#FFFFFF" stroke="#DDE3EC" />
      <rect x="226" y="98" width="10" height="10" rx="3" fill={color} opacity="0.18" />
      <rect x="242" y="99" width="50" height="4" rx="2" fill="#BCC3CE" />
      <rect x="242" y="106" width="38" height="3" rx="2" fill="#DDE3EC" />
      {/* Dues table */}
      <rect x="16" y="130" width="288" height="50" rx="6" fill="#FFFFFF" stroke="#DDE3EC" />
      <rect x="24" y="140" width="50" height="4" rx="2" fill="#BCC3CE" />
      <rect x="24" y="150" width="130" height="4" rx="2" fill="#E2E7EF" />
      <rect x="220" y="148" width="72" height="7" rx="3" fill={color} opacity="0.14" />
      <rect x="24" y="160" width="120" height="4" rx="2" fill="#E2E7EF" />
      <rect x="220" y="158" width="72" height="7" rx="3" fill={accent} opacity="0.18" />
      {/* Footer */}
      <rect y="186" width="320" height="14" fill={color} opacity="0.08" />
      <rect x="16" y="190" width="80" height="5" rx="2" fill={color} opacity="0.3" />
      <rect x="244" y="190" width="60" height="5" rx="2" fill={color} opacity="0.22" />
    </svg>
  );
}

// Affordable Housing Estate — transparent governance, people-led, trustworthy
function EstateExcoThumbnail({ color, accent, className }: ThumbProps) {
  return (
    <svg viewBox="0 0 320 200" xmlns="http://www.w3.org/2000/svg" className={className} aria-hidden>
      <rect width="320" height="200" fill="#F6F5F2" />
      {/* Nav */}
      <rect width="320" height="20" fill={color} />
      <rect x="14" y="7" width="56" height="6" rx="3" fill="rgba(255,255,255,0.88)" />
      <rect x="256" y="7" width="48" height="6" rx="3" fill="rgba(255,255,255,0.34)" />
      {/* Hero — center-aligned, governance framing */}
      <rect y="20" width="320" height="62" fill="#FFFFFF" />
      <rect x="80" y="30" width="160" height="4" rx="2" fill={color} opacity="0.55" />
      <rect x="40" y="40" width="240" height="10" rx="2" fill="#1A1C19" opacity="0.88" />
      <rect x="60" y="55" width="200" height="5" rx="2" fill="#9A9890" />
      <rect x="96" y="66" width="62" height="10" rx="5" fill={color} />
      <rect x="164" y="66" width="58" height="10" rx="5" fill={color} opacity="0.12" />
      {/* Committee member cards */}
      <rect x="16" y="94" width="60" height="50" rx="6" fill="#FFFFFF" stroke="#E4E2DC" />
      <circle cx="46" cy="112" r="10" fill={color} opacity="0.18" />
      <rect x="22" y="126" width="48" height="4" rx="2" fill="#CEC9BF" />
      <rect x="26" y="133" width="40" height="3" rx="2" fill="#E4E2DC" />
      <rect x="86" y="94" width="60" height="50" rx="6" fill="#FFFFFF" stroke="#E4E2DC" />
      <circle cx="116" cy="112" r="10" fill={accent} opacity="0.2" />
      <rect x="92" y="126" width="48" height="4" rx="2" fill="#CEC9BF" />
      <rect x="96" y="133" width="40" height="3" rx="2" fill="#E4E2DC" />
      <rect x="156" y="94" width="60" height="50" rx="6" fill="#FFFFFF" stroke="#E4E2DC" />
      <circle cx="186" cy="112" r="10" fill={color} opacity="0.16" />
      <rect x="162" y="126" width="48" height="4" rx="2" fill="#CEC9BF" />
      <rect x="166" y="133" width="40" height="3" rx="2" fill="#E4E2DC" />
      <rect x="226" y="94" width="78" height="50" rx="6" fill={color} opacity="0.07" stroke={color} strokeWidth="0.5" />
      <rect x="234" y="104" width="62" height="4" rx="2" fill={color} opacity="0.4" />
      <rect x="234" y="112" width="54" height="3" rx="2" fill={color} opacity="0.25" />
      <rect x="234" y="119" width="46" height="3" rx="2" fill={color} opacity="0.2" />
      <rect x="234" y="128" width="54" height="8" rx="4" fill={color} opacity="0.85" />
      {/* Fees table — transparent billing */}
      <rect x="16" y="154" width="288" height="34" rx="6" fill="#FFFFFF" stroke="#E4E2DC" />
      <rect x="24" y="163" width="46" height="4" rx="2" fill="#CEC9BF" />
      <rect x="24" y="172" width="120" height="4" rx="2" fill="#E4E2DC" />
      <rect x="212" y="170" width="80" height="8" rx="3" fill={color} opacity="0.12" />
      <rect x="212" y="170" width="48" height="8" rx="3" fill={accent} opacity="0.78" />
    </svg>
  );
}

// Corporate Property Brand — authoritative, dark hero, editorial type scale
function PropertyProfileThumbnail({ color, accent, className }: ThumbProps) {
  return (
    <svg viewBox="0 0 320 200" xmlns="http://www.w3.org/2000/svg" className={className} aria-hidden>
      <rect width="320" height="200" fill="#F4F2EE" />
      {/* Dark authority nav */}
      <rect width="320" height="20" fill="#111110" />
      <rect x="14" y="7" width="56" height="6" rx="3" fill="rgba(255,255,255,0.88)" />
      <rect x="220" y="8" width="28" height="4" rx="2" fill="rgba(255,255,255,0.28)" />
      <rect x="254" y="8" width="28" height="4" rx="2" fill="rgba(255,255,255,0.28)" />
      <rect x="286" y="6" width="20" height="8" rx="4" fill={accent} />
      {/* Full-width dark hero — typographic authority */}
      <defs>
        <linearGradient id="corp-brand-hero" x1="0" y1="0" x2="0.6" y2="1">
          <stop offset="0%" stopColor="#1C1917" />
          <stop offset="100%" stopColor={color} />
        </linearGradient>
      </defs>
      <rect y="20" width="320" height="86" fill="url(#corp-brand-hero)" />
      {/* Eyebrow */}
      <rect x="20" y="32" width="68" height="4" rx="2" fill={accent} opacity="0.9" />
      {/* Large headline — 3 lines */}
      <rect x="20" y="42" width="200" height="11" rx="2" fill="#FFFFFF" />
      <rect x="20" y="58" width="164" height="11" rx="2" fill="rgba(255,255,255,0.82)" />
      <rect x="20" y="74" width="118" height="5" rx="2" fill="rgba(255,255,255,0.42)" />
      <rect x="20" y="86" width="74" height="12" rx="6" fill={accent} />
      <rect x="100" y="86" width="56" height="12" rx="6" fill="rgba(255,255,255,0.16)" />
      {/* About + services side-by-side */}
      <rect x="16" y="118" width="142" height="42" rx="6" fill="#FFFFFF" stroke="#E6E0D4" />
      <rect x="24" y="126" width="44" height="5" rx="2" fill="#D0C9BC" />
      <rect x="24" y="136" width="118" height="4" rx="2" fill="#EAE4D8" />
      <rect x="24" y="143" width="100" height="4" rx="2" fill="#EAE4D8" />
      <rect x="24" y="150" width="86" height="4" rx="2" fill="#EAE4D8" />
      <rect x="170" y="118" width="134" height="42" rx="6" fill="#FFFFFF" stroke="#E6E0D4" />
      <rect x="178" y="126" width="40" height="5" rx="2" fill="#D0C9BC" />
      {/* Service bullets */}
      <rect x="184" y="136" width="6" height="4" rx="2" fill={color} opacity="0.5" />
      <rect x="194" y="136" width="96" height="4" rx="2" fill="#EAE4D8" />
      <rect x="184" y="144" width="6" height="4" rx="2" fill={color} opacity="0.5" />
      <rect x="194" y="144" width="86" height="4" rx="2" fill="#EAE4D8" />
      <rect x="184" y="152" width="6" height="4" rx="2" fill={color} opacity="0.5" />
      <rect x="194" y="152" width="76" height="4" rx="2" fill="#EAE4D8" />
      {/* CTA bar */}
      <rect x="16" y="170" width="288" height="20" rx="6" fill={color} opacity="0.08" />
      <rect x="24" y="177" width="90" height="5" rx="2" fill={color} opacity="0.5" />
      <rect x="220" y="166" width="76" height="14" rx="6" fill={accent} />
    </svg>
  );
}

// Developer Sales Funnel — listing cards, urgency, conversion-first
function PropertyLeasingThumbnail({ color, accent, className }: ThumbProps) {
  return (
    <svg viewBox="0 0 320 200" xmlns="http://www.w3.org/2000/svg" className={className} aria-hidden>
      <rect width="320" height="200" fill="#F5F3EF" />
      {/* Nav */}
      <rect width="320" height="20" fill="#161513" />
      <rect x="14" y="7" width="52" height="6" rx="3" fill="rgba(255,255,255,0.88)" />
      <rect x="246" y="6" width="60" height="8" rx="4" fill={accent} />
      {/* Urgency hero — color with availability badge */}
      <rect y="20" width="320" height="66" fill={color} opacity="0.94" />
      {/* Urgency pill */}
      <rect x="18" y="28" width="88" height="10" rx="5" fill={accent} opacity="0.95" />
      <rect x="24" y="31" width="76" height="4" rx="2" fill="rgba(255,255,255,0.88)" />
      <rect x="18" y="44" width="192" height="12" rx="2" fill="#FFFFFF" />
      <rect x="18" y="61" width="140" height="5" rx="2" fill="rgba(255,255,255,0.55)" />
      <rect x="18" y="71" width="72" height="11" rx="5" fill="#FFFFFF" />
      <rect x="96" y="71" width="62" height="11" rx="5" fill="rgba(255,255,255,0.2)" />
      {/* Property listing cards — image header, badge, price */}
      <rect x="16" y="96" width="88" height="54" rx="6" fill="#FFFFFF" stroke="#E6E0D3" />
      <rect x="16" y="96" width="88" height="26" rx="6" fill={color} opacity="0.22" />
      <rect x="20" y="100" width="28" height="7" rx="3" fill={accent} opacity="0.9" />
      <rect x="22" y="130" width="50" height="4" rx="2" fill="#D4CBBF" />
      <rect x="22" y="137" width="66" height="4" rx="2" fill="#EAE4D8" />
      <rect x="22" y="143" width="42" height="7" rx="3" fill={color} opacity="0.85" />
      <rect x="116" y="96" width="88" height="54" rx="6" fill="#FFFFFF" stroke="#E6E0D3" />
      <rect x="116" y="96" width="88" height="26" rx="6" fill={color} opacity="0.16" />
      <rect x="120" y="100" width="36" height="7" rx="3" fill={accent} opacity="0.7" />
      <rect x="122" y="130" width="50" height="4" rx="2" fill="#D4CBBF" />
      <rect x="122" y="137" width="66" height="4" rx="2" fill="#EAE4D8" />
      <rect x="122" y="143" width="42" height="7" rx="3" fill={color} opacity="0.85" />
      <rect x="216" y="96" width="88" height="54" rx="6" fill="#FFFFFF" stroke="#E6E0D3" />
      <rect x="216" y="96" width="88" height="26" rx="6" fill={color} opacity="0.12" />
      <rect x="222" y="130" width="50" height="4" rx="2" fill="#D4CBBF" />
      <rect x="222" y="137" width="66" height="4" rx="2" fill="#EAE4D8" />
      <rect x="222" y="143" width="42" height="7" rx="3" fill={color} opacity="0.85" />
      {/* Inspection booking CTA */}
      <rect x="16" y="160" width="288" height="26" rx="6" fill={color} opacity="0.07" stroke={color} strokeWidth="0.5" />
      <rect x="24" y="169" width="90" height="5" rx="2" fill={color} opacity="0.5" />
      <rect x="194" y="163" width="98" height="14" rx="6" fill={accent} />
    </svg>
  );
}

// Luxury Real Estate Agency — gallery-led, aspirational, exclusive
function PropertyPortfolioThumbnail({ color, accent, className }: ThumbProps) {
  return (
    <svg viewBox="0 0 320 200" xmlns="http://www.w3.org/2000/svg" className={className} aria-hidden>
      <rect width="320" height="200" fill="#F3F1EC" />
      {/* Minimal luxury nav — white */}
      <rect width="320" height="20" fill="#FAFAF8" />
      <rect x="14" y="7" width="60" height="6" rx="3" fill="#18171A" opacity="0.85" />
      <rect x="240" y="8" width="22" height="4" rx="2" fill="#A09888" />
      <rect x="268" y="8" width="22" height="4" rx="2" fill="#A09888" />
      {/* Full-bleed image hero */}
      <defs>
        <linearGradient id="luxury-agency-hero" x1="0" y1="0" x2="0.4" y2="1">
          <stop offset="0%" stopColor="#1A1614" />
          <stop offset="100%" stopColor={color} />
        </linearGradient>
      </defs>
      <rect y="20" width="320" height="90" fill="url(#luxury-agency-hero)" />
      {/* Eyebrow — italic / spaced */}
      <rect x="20" y="34" width="80" height="3" rx="1.5" fill={accent} opacity="0.7" />
      {/* Giant headline */}
      <rect x="20" y="43" width="210" height="13" rx="2" fill="#FFFFFF" />
      <rect x="20" y="61" width="170" height="13" rx="2" fill="rgba(255,255,255,0.78)" />
      <rect x="20" y="79" width="118" height="5" rx="2" fill="rgba(255,255,255,0.38)" />
      <rect x="20" y="90" width="68" height="12" rx="6" fill="rgba(255,255,255,0.14)" stroke="rgba(255,255,255,0.5)" strokeWidth="0.5" />
      <rect x="96" y="90" width="70" height="12" rx="6" fill={accent} />
      {/* Gallery — large + 2 small */}
      <rect x="16" y="122" width="168" height="62" rx="6" fill={color} opacity="0.2" />
      <rect x="194" y="122" width="60" height="28" rx="5" fill={accent} opacity="0.2" />
      <rect x="260" y="122" width="44" height="28" rx="5" fill={color} opacity="0.14" />
      <rect x="194" y="156" width="60" height="28" rx="5" fill={color} opacity="0.12" />
      <rect x="260" y="156" width="44" height="28" rx="5" fill={accent} opacity="0.14" />
      {/* Caption over large image */}
      <rect x="24" y="164" width="94" height="5" rx="2" fill="rgba(255,255,255,0.82)" />
      <rect x="24" y="172" width="62" height="4" rx="2" fill="rgba(255,255,255,0.5)" />
    </svg>
  );
}

// Property Management SaaS Profile — system-forward, metrics, enterprise grid
function PropertyCorporateThumbnail({ color, accent, className }: ThumbProps) {
  return (
    <svg viewBox="0 0 320 200" xmlns="http://www.w3.org/2000/svg" className={className} aria-hidden>
      <rect width="320" height="200" fill="#F3F4F6" />
      {/* Dark enterprise nav */}
      <rect width="320" height="20" fill="#14161A" />
      <rect x="14" y="7" width="54" height="6" rx="3" fill="rgba(255,255,255,0.88)" />
      <rect x="208" y="8" width="26" height="4" rx="2" fill="rgba(255,255,255,0.28)" />
      <rect x="240" y="8" width="26" height="4" rx="2" fill="rgba(255,255,255,0.28)" />
      <rect x="272" y="6" width="34" height="8" rx="4" fill={accent} />
      {/* White hero — product-led copy, metrics strip */}
      <rect y="20" width="320" height="62" fill="#FFFFFF" />
      <rect x="18" y="30" width="60" height="4" rx="2" fill={color} opacity="0.65" />
      <rect x="18" y="39" width="188" height="11" rx="2" fill="#14161A" opacity="0.9" />
      <rect x="18" y="55" width="148" height="5" rx="2" fill="#858C96" />
      <rect x="18" y="65" width="68" height="11" rx="5" fill={color} />
      <rect x="92" y="65" width="62" height="11" rx="5" fill={color} opacity="0.1" />
      {/* Stats strip — 4 KPIs */}
      <rect x="16" y="94" width="66" height="30" rx="5" fill="#FFFFFF" stroke="#E0E4EA" />
      <rect x="22" y="102" width="28" height="8" rx="2" fill={color} opacity="0.85" />
      <rect x="22" y="114" width="46" height="4" rx="2" fill="#C8CDD6" />
      <rect x="94" y="94" width="66" height="30" rx="5" fill="#FFFFFF" stroke="#E0E4EA" />
      <rect x="100" y="102" width="28" height="8" rx="2" fill={accent} opacity="0.85" />
      <rect x="100" y="114" width="46" height="4" rx="2" fill="#C8CDD6" />
      <rect x="172" y="94" width="66" height="30" rx="5" fill="#FFFFFF" stroke="#E0E4EA" />
      <rect x="178" y="102" width="28" height="8" rx="2" fill={color} opacity="0.72" />
      <rect x="178" y="114" width="46" height="4" rx="2" fill="#C8CDD6" />
      <rect x="250" y="94" width="54" height="30" rx="5" fill={color} opacity="0.1" />
      <rect x="256" y="102" width="28" height="8" rx="2" fill={color} opacity="0.6" />
      <rect x="256" y="114" width="36" height="4" rx="2" fill="#C8CDD6" />
      {/* Service bullets — clean left border */}
      <rect x="16" y="136" width="288" height="46" rx="6" fill="#FFFFFF" stroke="#E0E4EA" />
      <rect x="16" y="136" width="3" height="46" rx="1.5" fill={color} />
      <rect x="26" y="144" width="50" height="4" rx="2" fill="#C4CAD4" />
      <rect x="26" y="152" width="160" height="4" rx="2" fill="#E0E4EA" />
      <rect x="26" y="160" width="140" height="4" rx="2" fill="#E0E4EA" />
      <rect x="26" y="168" width="120" height="4" rx="2" fill="#E0E4EA" />
      <rect x="220" y="148" width="76" height="28" rx="5" fill={accent} opacity="0.12" />
      <rect x="228" y="156" width="60" height="12" rx="4" fill={accent} />
    </svg>
  );
}

// Blank Canvas — empty grid, dashed outlines, "start here" feel
function BlankCanvasThumbnail({ color, accent, className }: ThumbProps) {
  return (
    <svg viewBox="0 0 320 200" xmlns="http://www.w3.org/2000/svg" className={className} aria-hidden>
      <rect width="320" height="200" fill="#F8F8F7" />
      {/* Nav — thin dashed outline */}
      <rect width="320" height="20" fill="#FFFFFF" stroke="#E2E0DC" strokeWidth="0.5" />
      <rect x="14" y="7" width="40" height="6" rx="3" fill="#E8E5DF" />
      <rect x="260" y="7" width="46" height="6" rx="3" fill="#E8E5DF" />
      {/* Hero — large dashed placeholder */}
      <rect x="14" y="28" width="292" height="54" rx="6" fill="#FFFFFF" stroke={color} strokeWidth="1" strokeDasharray="4 3" opacity="0.35" />
      <rect x="80" y="40" width="160" height="8" rx="4" fill="#E8E5DF" />
      <rect x="100" y="54" width="120" height="5" rx="2.5" fill="#EEECE8" />
      <rect x="118" y="65" width="84" height="9" rx="4" fill={color} opacity="0.14" />
      {/* Section placeholders — 2 col */}
      <rect x="14" y="92" width="140" height="44" rx="6" fill="#FFFFFF" stroke="#DEDBD4" strokeWidth="0.75" strokeDasharray="3 2.5" />
      <rect x="30" y="104" width="60" height="5" rx="2.5" fill="#E8E5DF" />
      <rect x="30" y="114" width="96" height="4" rx="2" fill="#EEECEA" />
      <rect x="30" y="122" width="76" height="4" rx="2" fill="#EEECEA" />
      <rect x="166" y="92" width="140" height="44" rx="6" fill="#FFFFFF" stroke="#DEDBD4" strokeWidth="0.75" strokeDasharray="3 2.5" />
      <rect x="182" y="104" width="60" height="5" rx="2.5" fill="#E8E5DF" />
      <rect x="182" y="114" width="96" height="4" rx="2" fill="#EEECEA" />
      <rect x="182" y="122" width="76" height="4" rx="2" fill="#EEECEA" />
      {/* Add section hint */}
      <rect x="14" y="146" width="292" height="30" rx="6" fill="#FFFFFF" stroke={accent} strokeWidth="1" strokeDasharray="4 3" opacity="0.4" />
      <rect x="130" y="157" width="60" height="8" rx="4" fill={accent} opacity="0.18" />
      <rect x="196" y="157" width="4" height="8" rx="2" fill={accent} opacity="0.4" />
      <rect x="128" y="159" width="8" height="4" rx="2" fill={accent} opacity="0.4" />
      {/* Footer */}
      <rect y="192" width="320" height="8" fill="#EEECEA" />
    </svg>
  );
}

const THUMBNAIL_MAP: Record<string, ComponentType<ThumbProps>> = {
  "estate-official": EstateOfficialThumbnail,
  "estate-resident": EstateResidentThumbnail,
  "estate-fees": EstateFeesThumbnail,
  "estate-exco": EstateExcoThumbnail,
  "property-profile": PropertyProfileThumbnail,
  "property-leasing": PropertyLeasingThumbnail,
  "property-portfolio": PropertyPortfolioThumbnail,
  "property-corporate": PropertyCorporateThumbnail,
  "estate-blank": BlankCanvasThumbnail,
  "property-blank": BlankCanvasThumbnail,
  "template-estate": EstateOfficialThumbnail,
  "template-company": PropertyProfileThumbnail,
  "template-operations": EstateResidentThumbnail,
};

export default function LandingTemplateThumbnail({
  templateId,
  primaryColor = "#1A5C42",
  accentColor = "#D2A85A",
  className,
}: Props) {
  const Component = THUMBNAIL_MAP[templateId];

  if (!Component) {
    return (
      <svg viewBox="0 0 320 200" xmlns="http://www.w3.org/2000/svg" className={className} aria-hidden>
        <rect width="320" height="200" fill="#F5F4F0" />
        <rect width="320" height="20" fill={primaryColor} />
        <rect x="16" y="34" width="64" height="6" rx="3" fill="#D6D0C4" />
        <rect x="16" y="48" width="160" height="14" rx="3" fill="#E7E2D6" />
        <rect x="16" y="72" width="126" height="6" rx="3" fill="#E7E2D6" />
      </svg>
    );
  }

  return (
    <Component
      color={primaryColor}
      accent={accentColor}
      className={className}
    />
  );
}
