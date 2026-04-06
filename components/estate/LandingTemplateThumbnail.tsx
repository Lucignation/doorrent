import type { ComponentType } from "react";

export type LandingTemplateThumbnailId =
  | "estate-official"
  | "estate-resident"
  | "estate-fees"
  | "estate-exco"
  | "property-profile"
  | "property-leasing"
  | "property-portfolio"
  | "property-corporate"
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

function EstateOfficialThumbnail({ color, accent, className }: ThumbProps) {
  return (
    <svg viewBox="0 0 320 200" xmlns="http://www.w3.org/2000/svg" className={className} aria-hidden>
      <rect width="320" height="200" fill="#F5F3EE" />
      <rect width="320" height="22" fill={color} />
      <rect x="12" y="8" width="48" height="6" rx="2" fill="rgba(255,255,255,0.85)" />
      <rect x="242" y="8" width="24" height="5" rx="2" fill="rgba(255,255,255,0.4)" />
      <rect x="272" y="7" width="34" height="8" rx="4" fill={accent} />

      <rect y="22" width="320" height="72" fill={color} opacity="0.93" />
      <rect x="18" y="34" width="74" height="5" rx="2" fill="rgba(255,255,255,0.35)" />
      <rect x="18" y="46" width="172" height="14" rx="3" fill="#FFFFFF" />
      <rect x="18" y="66" width="136" height="6" rx="3" fill="rgba(255,255,255,0.65)" />
      <rect x="18" y="78" width="72" height="12" rx="6" fill="#FFFFFF" />
      <rect x="98" y="78" width="72" height="12" rx="6" fill="rgba(255,255,255,0.28)" />

      <rect x="16" y="106" width="136" height="50" rx="8" fill="#FFFFFF" stroke="#E6E1D5" />
      <rect x="26" y="116" width="46" height="5" rx="2" fill="#D7CFBE" />
      <rect x="26" y="126" width="110" height="4" rx="2" fill="#ECE7DB" />
      <rect x="26" y="133" width="96" height="4" rx="2" fill="#ECE7DB" />
      <rect x="26" y="140" width="104" height="4" rx="2" fill="#ECE7DB" />

      <rect x="164" y="106" width="140" height="50" rx="8" fill="#FFFFFF" stroke="#E6E1D5" />
      <rect x="174" y="116" width="42" height="5" rx="2" fill="#D7CFBE" />
      <rect x="174" y="127" width="84" height="4" rx="2" fill="#ECE7DB" />
      <rect x="264" y="127" width="24" height="4" rx="2" fill={accent} opacity="0.8" />
      <rect x="174" y="135" width="84" height="4" rx="2" fill="#ECE7DB" />
      <rect x="264" y="135" width="24" height="4" rx="2" fill={accent} opacity="0.8" />
      <rect x="174" y="143" width="84" height="4" rx="2" fill="#ECE7DB" />
      <rect x="264" y="143" width="24" height="4" rx="2" fill={accent} opacity="0.8" />

      <rect x="16" y="164" width="288" height="18" rx="6" fill="#FFF7E7" stroke="#E6E1D5" />
      <rect x="24" y="170" width="10" height="6" rx="2" fill={accent} />
      <rect x="40" y="170" width="88" height="4" rx="2" fill="#B88727" opacity="0.72" />
      <rect x="136" y="170" width="62" height="4" rx="2" fill="#D8D2C5" />

      <rect y="188" width="320" height="12" fill="#E6E1D5" />
    </svg>
  );
}

function EstateResidentThumbnail({ color, accent, className }: ThumbProps) {
  return (
    <svg viewBox="0 0 320 200" xmlns="http://www.w3.org/2000/svg" className={className} aria-hidden>
      <rect width="320" height="200" fill="#F6F5F1" />
      <rect width="320" height="20" fill="#1D1F1C" />
      <rect x="14" y="7" width="46" height="6" rx="3" fill="rgba(255,255,255,0.82)" />
      <rect x="248" y="7" width="56" height="7" rx="4" fill={accent} />

      <rect y="20" width="320" height="56" fill={color} opacity="0.88" />
      <rect x="18" y="31" width="68" height="5" rx="3" fill="rgba(255,255,255,0.35)" />
      <rect x="18" y="42" width="184" height="12" rx="3" fill="#FFFFFF" />
      <rect x="18" y="60" width="122" height="5" rx="3" fill="rgba(255,255,255,0.55)" />
      <rect x="228" y="32" width="74" height="30" rx="10" fill="rgba(255,255,255,0.14)" />
      <rect x="238" y="40" width="30" height="4" rx="2" fill="rgba(255,255,255,0.55)" />
      <rect x="238" y="48" width="44" height="7" rx="3" fill="#FFFFFF" />

      <rect x="16" y="88" width="90" height="42" rx="8" fill="#FFFFFF" stroke="#E7E4D8" />
      <rect x="26" y="98" width="44" height="5" rx="2" fill="#D5CEBF" />
      <rect x="26" y="108" width="58" height="8" rx="4" fill={color} opacity="0.14" />
      <rect x="30" y="111" width="50" height="3" rx="2" fill={color} opacity="0.65" />
      <rect x="26" y="120" width="54" height="3" rx="2" fill="#ECE7DB" />

      <rect x="115" y="88" width="90" height="42" rx="8" fill="#FFFFFF" stroke="#E7E4D8" />
      <rect x="125" y="98" width="44" height="5" rx="2" fill="#D5CEBF" />
      <rect x="125" y="108" width="58" height="8" rx="4" fill="#E8F5F0" />
      <rect x="129" y="111" width="50" height="3" rx="2" fill="#1B6B4C" opacity="0.6" />
      <rect x="125" y="120" width="54" height="3" rx="2" fill="#ECE7DB" />

      <rect x="214" y="88" width="90" height="42" rx="8" fill="#FFFFFF" stroke="#E7E4D8" />
      <rect x="224" y="98" width="44" height="5" rx="2" fill="#D5CEBF" />
      <rect x="224" y="108" width="58" height="8" rx="4" fill="#FFF4E2" />
      <rect x="228" y="111" width="50" height="3" rx="2" fill={accent} opacity="0.75" />
      <rect x="224" y="120" width="54" height="3" rx="2" fill="#ECE7DB" />

      <rect x="16" y="140" width="288" height="20" rx="6" fill="#FFFFFF" stroke="#E7E4D8" />
      <circle cx="28" cy="150" r="5" fill="#D5CEBF" />
      <rect x="38" y="147" width="72" height="4" rx="2" fill="#D5CEBF" />
      <rect x="38" y="154" width="42" height="3" rx="2" fill="#ECE7DB" />
      <rect x="246" y="145" width="46" height="9" rx="4" fill={color} opacity="0.16" />

      <rect x="16" y="168" width="288" height="20" rx="6" fill="#FFF1EE" stroke="#F3CBC4" />
      <rect x="24" y="175" width="8" height="6" rx="2" fill="#C2473A" />
      <rect x="38" y="175" width="74" height="4" rx="2" fill="#C2473A" opacity="0.78" />
      <rect x="126" y="175" width="54" height="4" rx="2" fill="#E6C7C1" />
    </svg>
  );
}

function EstateFeesThumbnail({ color, accent, className }: ThumbProps) {
  return (
    <svg viewBox="0 0 320 200" xmlns="http://www.w3.org/2000/svg" className={className} aria-hidden>
      <rect width="320" height="200" fill="#F5F3ED" />
      <rect width="320" height="22" fill={accent} />
      <rect x="14" y="8" width="52" height="6" rx="3" fill="rgba(255,255,255,0.8)" />
      <rect x="248" y="7" width="56" height="8" rx="4" fill="rgba(255,255,255,0.26)" />

      <rect y="22" width="320" height="54" fill="#FFFFFF" />
      <rect x="18" y="34" width="70" height="5" rx="2" fill="#D6D0C4" />
      <rect x="18" y="45" width="164" height="12" rx="3" fill="#1E231D" opacity="0.88" />
      <rect x="18" y="63" width="130" height="5" rx="3" fill="#A49B8B" />
      <rect x="232" y="34" width="70" height="30" rx="10" fill={color} opacity="0.12" />
      <rect x="242" y="42" width="22" height="4" rx="2" fill={color} opacity="0.45" />
      <rect x="242" y="50" width="44" height="7" rx="4" fill={color} opacity="0.85" />

      <rect x="16" y="90" width="288" height="62" rx="10" fill="#FFFFFF" stroke="#E7E1D5" />
      <rect x="28" y="102" width="48" height="5" rx="3" fill="#D5CEBF" />
      <rect x="28" y="114" width="116" height="4" rx="2" fill="#ECE7DB" />
      <rect x="214" y="114" width="56" height="4" rx="2" fill={accent} opacity="0.75" />
      <rect x="28" y="125" width="116" height="4" rx="2" fill="#ECE7DB" />
      <rect x="214" y="125" width="56" height="4" rx="2" fill={accent} opacity="0.75" />
      <rect x="28" y="136" width="116" height="4" rx="2" fill="#ECE7DB" />
      <rect x="214" y="136" width="56" height="4" rx="2" fill={accent} opacity="0.75" />

      <rect x="16" y="162" width="138" height="22" rx="6" fill="#FFF7E8" stroke="#E7E1D5" />
      <rect x="26" y="170" width="10" height="6" rx="2" fill={accent} />
      <rect x="42" y="171" width="80" height="4" rx="2" fill="#B27C22" opacity="0.7" />

      <rect x="166" y="162" width="138" height="22" rx="6" fill="#FFFFFF" stroke="#E7E1D5" />
      <rect x="176" y="170" width="68" height="4" rx="2" fill="#D5CEBF" />
      <rect x="250" y="168" width="42" height="8" rx="4" fill={color} opacity="0.15" />
    </svg>
  );
}

function EstateExcoThumbnail({ color, accent, className }: ThumbProps) {
  return (
    <svg viewBox="0 0 320 200" xmlns="http://www.w3.org/2000/svg" className={className} aria-hidden>
      <rect width="320" height="200" fill="#F6F4EF" />
      <rect width="320" height="22" fill={color} />
      <rect x="14" y="8" width="58" height="6" rx="3" fill="rgba(255,255,255,0.85)" />
      <rect x="254" y="8" width="50" height="6" rx="3" fill="rgba(255,255,255,0.4)" />

      <rect y="22" width="320" height="58" fill="url(#estate-exco-hero)" />
      <defs>
        <linearGradient id="estate-exco-hero" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={color} />
          <stop offset="100%" stopColor="#24352D" />
        </linearGradient>
      </defs>
      <rect x="18" y="36" width="72" height="5" rx="2" fill="rgba(255,255,255,0.35)" />
      <rect x="18" y="47" width="164" height="12" rx="3" fill="#FFFFFF" />
      <rect x="18" y="64" width="112" height="5" rx="3" fill="rgba(255,255,255,0.6)" />

      <rect x="16" y="92" width="138" height="40" rx="8" fill="#FFFFFF" stroke="#E7E1D5" />
      <circle cx="36" cy="112" r="10" fill="#D8D2C5" />
      <circle cx="64" cy="112" r="10" fill="#C9C2B2" />
      <circle cx="92" cy="112" r="10" fill="#BBB39F" />
      <rect x="110" y="106" width="28" height="5" rx="2" fill="#D8D2C5" />
      <rect x="110" y="115" width="20" height="4" rx="2" fill="#ECE7DB" />

      <rect x="166" y="92" width="138" height="40" rx="8" fill="#FFFFFF" stroke="#E7E1D5" />
      <rect x="176" y="102" width="48" height="5" rx="2" fill="#D8D2C5" />
      <rect x="176" y="113" width="116" height="4" rx="2" fill="#ECE7DB" />
      <rect x="176" y="120" width="84" height="4" rx="2" fill="#ECE7DB" />

      <rect x="16" y="144" width="88" height="40" rx="8" fill="#D7D2C6" />
      <rect x="116" y="144" width="88" height="40" rx="8" fill="#C7C0B2" />
      <rect x="216" y="144" width="88" height="40" rx="8" fill="#B7AE9D" />
      <rect x="28" y="172" width="64" height="4" rx="2" fill="rgba(255,255,255,0.8)" />
      <rect x="128" y="172" width="64" height="4" rx="2" fill="rgba(255,255,255,0.8)" />
      <rect x="228" y="172" width="64" height="4" rx="2" fill="rgba(255,255,255,0.8)" />
      <rect x="248" y="96" width="40" height="10" rx="5" fill={accent} opacity="0.95" />
    </svg>
  );
}

function PropertyProfileThumbnail({ color, accent, className }: ThumbProps) {
  return (
    <svg viewBox="0 0 320 200" xmlns="http://www.w3.org/2000/svg" className={className} aria-hidden>
      <rect width="320" height="200" fill="#F5F2EC" />
      <rect width="320" height="20" fill="#1B1814" />
      <rect x="14" y="7" width="54" height="6" rx="3" fill="rgba(255,255,255,0.85)" />
      <rect x="252" y="7" width="50" height="6" rx="3" fill={accent} />

      <defs>
        <linearGradient id="property-profile-hero" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#2C3640" />
          <stop offset="100%" stopColor="#181714" />
        </linearGradient>
      </defs>
      <rect y="20" width="320" height="78" fill="url(#property-profile-hero)" />
      <rect x="22" y="38" width="64" height="5" rx="2" fill="rgba(255,255,255,0.35)" />
      <rect x="22" y="48" width="174" height="14" rx="3" fill="#FFFFFF" />
      <rect x="22" y="68" width="124" height="5" rx="3" fill="rgba(255,255,255,0.58)" />
      <rect x="22" y="80" width="74" height="12" rx="6" fill={accent} />
      <rect x="220" y="44" width="20" height="54" fill="rgba(255,255,255,0.08)" />
      <rect x="246" y="52" width="18" height="46" fill="rgba(255,255,255,0.07)" />
      <rect x="270" y="40" width="24" height="58" fill="rgba(255,255,255,0.09)" />

      <rect x="16" y="110" width="136" height="38" rx="8" fill="#FFFFFF" stroke="#E8E2D4" />
      <rect x="26" y="120" width="44" height="5" rx="2" fill="#D6CFBF" />
      <rect x="26" y="130" width="108" height="4" rx="2" fill="#ECE7DB" />
      <rect x="26" y="137" width="88" height="4" rx="2" fill="#ECE7DB" />

      <rect x="168" y="110" width="136" height="38" rx="8" fill="#FFFFFF" stroke="#E8E2D4" />
      <circle cx="188" cy="129" r="8" fill="#D6CFBF" />
      <circle cx="210" cy="129" r="8" fill="#C8C0AF" />
      <circle cx="232" cy="129" r="8" fill="#B6AE9B" />
      <rect x="246" y="124" width="42" height="5" rx="2" fill="#D6CFBF" />
      <rect x="246" y="133" width="28" height="4" rx="2" fill="#ECE7DB" />

      <rect x="16" y="160" width="288" height="24" rx="8" fill={color} opacity="0.12" />
      <rect x="26" y="168" width="92" height="5" rx="2" fill={color} opacity="0.62" />
      <rect x="228" y="164" width="64" height="14" rx="7" fill={accent} />
    </svg>
  );
}

function PropertyLeasingThumbnail({ color, accent, className }: ThumbProps) {
  return (
    <svg viewBox="0 0 320 200" xmlns="http://www.w3.org/2000/svg" className={className} aria-hidden>
      <rect width="320" height="200" fill="#F5F4EF" />
      <rect width="320" height="20" fill="#1A1A17" />
      <rect x="14" y="7" width="46" height="6" rx="3" fill="rgba(255,255,255,0.84)" />
      <rect x="246" y="7" width="58" height="6" rx="3" fill={accent} />

      <rect y="20" width="320" height="62" fill={color} opacity="0.92" />
      <rect x="18" y="32" width="62" height="5" rx="2" fill="rgba(255,255,255,0.34)" />
      <rect x="18" y="43" width="168" height="14" rx="3" fill="#FFFFFF" />
      <rect x="18" y="63" width="120" height="5" rx="3" fill="rgba(255,255,255,0.54)" />

      <rect x="16" y="94" width="90" height="52" rx="8" fill="#FFFFFF" stroke="#E7E2D6" />
      <rect x="16" y="94" width="90" height="22" rx="8" fill="#D5D0C3" />
      <rect x="26" y="124" width="46" height="4" rx="2" fill="#EDE8DC" />
      <rect x="26" y="132" width="34" height="3" rx="2" fill="#EDE8DC" />

      <rect x="115" y="94" width="90" height="52" rx="8" fill="#FFFFFF" stroke="#E7E2D6" />
      <rect x="115" y="94" width="90" height="22" rx="8" fill="#C8C2B5" />
      <rect x="125" y="124" width="46" height="4" rx="2" fill="#EDE8DC" />
      <rect x="125" y="132" width="34" height="3" rx="2" fill="#EDE8DC" />

      <rect x="214" y="94" width="90" height="52" rx="8" fill="#FFFFFF" stroke="#E7E2D6" />
      <rect x="214" y="94" width="90" height="22" rx="8" fill="#B8B19F" />
      <rect x="224" y="124" width="46" height="4" rx="2" fill="#EDE8DC" />
      <rect x="224" y="132" width="34" height="3" rx="2" fill="#EDE8DC" />

      <rect x="16" y="158" width="288" height="24" rx="8" fill="#FFFFFF" stroke="#E7E2D6" />
      <rect x="26" y="167" width="68" height="4" rx="2" fill="#D6CFBF" />
      <rect x="228" y="163" width="64" height="12" rx="6" fill={accent} />
      <rect x="158" y="163" width="56" height="12" rx="6" fill={color} opacity="0.14" />
    </svg>
  );
}

function PropertyPortfolioThumbnail({ color, accent, className }: ThumbProps) {
  return (
    <svg viewBox="0 0 320 200" xmlns="http://www.w3.org/2000/svg" className={className} aria-hidden>
      <rect width="320" height="200" fill="#F5F2ED" />
      <rect width="320" height="20" fill={color} />
      <rect x="14" y="7" width="56" height="6" rx="3" fill="rgba(255,255,255,0.82)" />
      <rect x="246" y="7" width="56" height="6" rx="3" fill="rgba(255,255,255,0.34)" />

      <defs>
        <linearGradient id="property-portfolio-hero" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={color} />
          <stop offset="100%" stopColor="#2E251B" />
        </linearGradient>
      </defs>
      <rect y="20" width="320" height="68" fill="url(#property-portfolio-hero)" />
      <rect x="20" y="34" width="60" height="5" rx="2" fill="rgba(255,255,255,0.32)" />
      <rect x="20" y="45" width="178" height="14" rx="3" fill="#FFFFFF" />
      <rect x="20" y="64" width="132" height="5" rx="3" fill="rgba(255,255,255,0.58)" />

      <rect x="16" y="100" width="182" height="42" rx="8" fill="#FFFFFF" stroke="#E6E0D3" />
      <rect x="26" y="111" width="52" height="5" rx="2" fill="#D5CEBF" />
      <rect x="26" y="122" width="152" height="4" rx="2" fill="#ECE7DB" />
      <rect x="26" y="129" width="118" height="4" rx="2" fill="#ECE7DB" />

      <rect x="210" y="100" width="94" height="42" rx="8" fill="#FFFFFF" stroke="#E6E0D3" />
      <rect x="220" y="110" width="34" height="5" rx="2" fill="#D5CEBF" />
      <rect x="220" y="121" width="68" height="4" rx="2" fill="#ECE7DB" />
      <rect x="220" y="128" width="54" height="4" rx="2" fill="#ECE7DB" />

      <rect x="16" y="154" width="88" height="30" rx="8" fill="#D4CEC1" />
      <rect x="116" y="154" width="88" height="30" rx="8" fill="#C6BEAF" />
      <rect x="216" y="154" width="88" height="30" rx="8" fill="#B7AE9D" />
      <rect x="24" y="174" width="72" height="4" rx="2" fill="rgba(255,255,255,0.82)" />
      <rect x="124" y="174" width="72" height="4" rx="2" fill="rgba(255,255,255,0.82)" />
      <rect x="224" y="174" width="72" height="4" rx="2" fill="rgba(255,255,255,0.82)" />
      <rect x="236" y="110" width="54" height="10" rx="5" fill={accent} opacity="0.95" />
    </svg>
  );
}

function PropertyCorporateThumbnail({ color, accent, className }: ThumbProps) {
  return (
    <svg viewBox="0 0 320 200" xmlns="http://www.w3.org/2000/svg" className={className} aria-hidden>
      <rect width="320" height="200" fill="#F4F2EC" />
      <rect width="320" height="20" fill="#171512" />
      <rect x="14" y="7" width="52" height="6" rx="3" fill="rgba(255,255,255,0.84)" />
      <rect x="252" y="7" width="50" height="6" rx="3" fill={accent} />

      <rect y="20" width="320" height="58" fill="#FFFFFF" />
      <rect x="18" y="32" width="68" height="5" rx="2" fill="#D7CFBE" />
      <rect x="18" y="43" width="168" height="13" rx="3" fill="#1D1E1A" opacity="0.9" />
      <rect x="18" y="62" width="128" height="5" rx="3" fill="#ABA190" />
      <rect x="230" y="30" width="72" height="34" rx="10" fill={color} opacity="0.12" />
      <rect x="240" y="40" width="24" height="4" rx="2" fill={color} opacity="0.46" />
      <rect x="240" y="48" width="40" height="7" rx="3" fill={color} opacity="0.86" />

      <rect x="16" y="90" width="138" height="44" rx="8" fill="#FFFFFF" stroke="#E7E1D5" />
      <rect x="26" y="101" width="44" height="5" rx="2" fill="#D7CFBE" />
      <rect x="26" y="112" width="108" height="4" rx="2" fill="#ECE7DB" />
      <rect x="26" y="119" width="96" height="4" rx="2" fill="#ECE7DB" />
      <rect x="26" y="126" width="84" height="4" rx="2" fill="#ECE7DB" />

      <rect x="166" y="90" width="138" height="44" rx="8" fill="#FFFFFF" stroke="#E7E1D5" />
      <circle cx="188" cy="111" r="8" fill="#D7CFBE" />
      <circle cx="210" cy="111" r="8" fill="#C7BFAF" />
      <circle cx="232" cy="111" r="8" fill="#B8AE9D" />
      <rect x="248" y="105" width="38" height="5" rx="2" fill="#D7CFBE" />
      <rect x="248" y="114" width="24" height="4" rx="2" fill="#ECE7DB" />
      <rect x="176" y="124" width="110" height="4" rx="2" fill="#ECE7DB" />

      <rect x="16" y="146" width="288" height="36" rx="8" fill={color} opacity="0.1" />
      <rect x="26" y="157" width="86" height="4" rx="2" fill={color} opacity="0.58" />
      <rect x="26" y="165" width="64" height="4" rx="2" fill={color} opacity="0.38" />
      <rect x="230" y="154" width="62" height="14" rx="7" fill={accent} />
      <rect x="166" y="154" width="52" height="14" rx="7" fill="#FFFFFF" opacity="0.72" />
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
